// The NUMERALS gate: a graphic must not change shape when a number changes.
//
// Why this exists: a clock, a countdown, a score, a vote tally and a count-up all repaint the
// same box several times a second. If the digits are proportional, "11:11" is narrower than
// "00:00" and the panel around them twitches on every tick - the single most obvious way an
// on-air graphic reads as amateur. `font-variant-numeric: tabular-nums` fixes it, but only on
// a typeface that actually carries the feature, and only where somebody remembered to write it.
//
// So this does not read the markup. It renders the graphic, substitutes every digit in turn,
// and measures - which is the defect itself, not a proxy for it. A declaration that no-ops on
// a face without `tnum` fails here exactly as a missing declaration does.
//
// Usage (dev server must be running for this checkout - scripts/dev-port.mjs):
//   node scripts/numerals.mjs                 # every category, exit 1 on any drift
//   node scripts/numerals.mjs scoreboard      # one category
//   node scripts/numerals.mjs --only sb01,sb02  # just these designs (scripts/catalog-scope.mjs)
//   node scripts/numerals.mjs --fonts         # measure the bundled fonts' figures instead
//   node scripts/numerals.mjs --json out.json
//
// This gate only covers categories where a number CHANGES on air (LIVE_NUMBER_CATEGORIES below),
// so a `--only` list from scripts/catalog-affected.mjs will often name designs it has nothing to
// say about. Those are reported and dropped, never treated as a typo.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { devPort } from './dev-port.mjs';
import { applyOnly, parseOnly, scopeNote } from './catalog-scope.mjs';

/** Sub-pixel noise from rounded layout is not a jiggle. Anything a viewer could see is. */
const TOLERANCE_PX = 0.5;

/**
 * Categories whose graphics carry a number that CHANGES on air. Everything else may hold a
 * static figure (a year in a credits block, a rank in a results row) that is typed once and
 * never repainted, and holding those to the rule would report churn nobody can see.
 *
 * A category is on this list because something inside it ticks, counts, tallies or is driven
 * by an operator mid-shot - not because it happens to contain digits.
 */
const LIVE_NUMBER_CATEGORIES = new Set([
  'scoreboard',
  'game-timer',
  'starting-soon',
  'ticker',
  'poll',
  'audience',
  'infographic',
  'lower-third',
  'corner-bug',
  'competition',
  'esports-score',
  'matchup',
  'results-board',
  'reveal',
]);

/**
 * Known, understood exceptions: `${variant} ${selector}` -> why this element is allowed to
 * change width with its digits. An entry here is a decision, not a snooze.
 */
const KNOWN = new Map();

const args = process.argv.slice(2);
const jsonAt = args.indexOf('--json');
const jsonOut = jsonAt >= 0 ? args[jsonAt + 1] : null;
const fontsMode = args.includes('--fonts');
const { ids: onlyIds, raw: onlyRaw } = parseOnly(args);
const only = args.find((a) => !a.startsWith('--') && a !== jsonOut && a !== onlyRaw) || null;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
await page.goto(`http://localhost:${devPort()}/app`, { waitUntil: 'domcontentloaded' });

// The digit-width probe, shared by both modes: render one string ten times, once per digit,
// and report how much the box moved. Equal widths mean the figures are tabular.
await page.evaluate(() => {
  window.__digitSpread = (setText, readWidth) => {
    const widths = [];
    for (let d = 0; d <= 9; d++) {
      setText(String(d));
      widths.push(readWidth());
    }
    return Math.round((Math.max(...widths) - Math.min(...widths)) * 100) / 100;
  };
});

if (fontsMode) {
  const fonts = await page.evaluate(async () => {
    const m = await import('/src/model/fonts.ts');
    return m.FONTS.map((f) => ({ id: f.id, family: f.family, file: f.file, weights: f.weights }));
  });
  const rows = await page.evaluate(async (fonts) => {
    const out = [];
    for (const f of fonts) {
      try {
        const face = new FontFace(f.family, `url(/fonts/${f.file})`, {
          weight: `${f.weights[0]} ${f.weights[1]}`,
        });
        await face.load();
        document.fonts.add(face);
      } catch (e) {
        out.push({ ...f, error: String((e && e.message) || e) });
        continue;
      }
      // ACROSS THE WEIGHT RANGE, not at one weight. A variable face's digits can be even at
      // 400 and uneven at 700 - Oswald is exactly that, and measuring only the default weight
      // declared it tabular while every catalog scoreboard using it at 700 still jiggled.
      const steps = [];
      const [lo, hi] = f.weights;
      for (let w = lo; w <= hi; w += 100) steps.push(w);
      if (steps[steps.length - 1] !== hi) steps.push(hi);

      const probe = (variant, weight) => {
        const el = document.createElement('div');
        el.style.cssText =
          `position:fixed;left:-9999px;top:0;font-size:200px;white-space:pre;` +
          `font-family:"${f.family}";font-weight:${weight};font-variant-numeric:${variant}`;
        document.body.appendChild(el);
        const spread = window.__digitSpread(
          (d) => (el.textContent = d),
          () => el.getBoundingClientRect().width,
        );
        el.remove();
        return spread;
      };
      const perWeight = steps.map((w) => ({
        weight: w,
        normal: probe('normal', w),
        tabular: probe('tabular-nums', w),
      }));
      out.push({
        ...f,
        perWeight,
        normalSpread: Math.max(...perWeight.map((p) => p.normal)),
        tabularSpread: Math.max(...perWeight.map((p) => p.tabular)),
        worstWeight: perWeight.reduce((a, b) => (b.tabular > a.tabular ? b : a)).weight,
      });
    }
    return out;
  }, fonts);
  await browser.close();
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify(rows, null, 1));

  console.log('\nBundled fonts - widest digit-width spread at 200 px, ACROSS each face\'s weight range\n');
  console.log(
    '  ' + 'font'.padEnd(20) + 'proportional'.padStart(13) + 'tabular-nums'.padStart(14) + '   verdict',
  );
  let bad = 0;
  for (const r of rows) {
    if (r.error) {
      console.log(`  ${r.id.padEnd(20)}  LOAD ERROR: ${r.error}`);
      bad++;
      continue;
    }
    const ok = r.tabularSpread <= TOLERANCE_PX;
    if (!ok) bad++;
    const note = ok
      ? r.normalSpread <= TOLERANCE_PX
        ? ' (already even)'
        : ' (tnum evens it)'
      : ` (worst at weight ${r.worstWeight})`;
    console.log(
      `  ${r.id.padEnd(20)}${String(r.normalSpread).padStart(13)}${String(r.tabularSpread).padStart(14)}   ` +
        (ok ? 'tabular' : 'NOT TABULAR') +
        note,
    );
  }
  console.log(
    `\n  ${rows.length - bad}/${rows.length} bundled fonts render equal-width digits at EVERY weight they offer.`,
  );
  console.log('  These are the values `tabularFigures` carries in src/model/fonts.ts.\n');
  process.exit(0);
}

await page.evaluate(async () => {
  window.__cat = await import('/src/templates/catalog.ts');
  window.__comp = await import('/src/preview/composeDocument.ts');
  window.__wiz = await import('/src/model/wizard.ts');
});

const allTargets = (
  await page.evaluate(
    (only) =>
      window.__wiz.CATEGORIES.filter((c) => !only || c.id === only).flatMap((c) =>
        (window.__cat.CATALOG[c.id] || []).map((v) => ({ id: v.id, cat: c.id, name: v.name })),
      ),
    only,
  )
).filter((t) => LIVE_NUMBER_CATEGORIES.has(t.cat));
const targets = await applyOnly(allTargets, onlyIds, 'numerals', page, () => browser.close());

if (!targets.length) {
  console.error(
    only
      ? `No live-number variants for category "${only}". Categories checked: ${[...LIVE_NUMBER_CATEGORIES].join(', ')}`
      : 'No variants found.',
  );
  await browser.close();
  process.exit(2);
}

// Render a batch off-screen at full size, settle it, then substitute digits and measure.
await page.evaluate(() => {
  window.__scan = async (ids) => {
    document.body.innerHTML = '';
    const frames = ids.map((id) => {
      const v = window.__cat.variantById(id);
      const f = document.createElement('iframe');
      f.style.cssText = 'width:1920px;height:1080px;border:0;position:fixed;left:-5000px;top:0';
      try {
        f.srcdoc = window.__comp.composeDocument(v.create({}));
      } catch (e) {
        f.dataset.err = String((e && e.message) || e);
      }
      document.body.appendChild(f);
      return { id, f };
    });
    await new Promise((r) => setTimeout(r, 900));
    for (const { f } of frames) {
      try {
        f.contentWindow.play && f.contentWindow.play();
      } catch { /* a template without play() has nothing to settle */ }
    }
    await new Promise((r) => setTimeout(r, 2400));

    return frames.map(({ id, f }) => {
      const out = { id, err: f.dataset.err || null, hits: [] };
      try {
        const w = f.contentWindow;
        for (const el of f.contentDocument.body.querySelectorAll('*')) {
          const cs = w.getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          if (!(parseFloat(cs.opacity) > 0.03)) continue;
          // The element's OWN text, and only text made of figures and their punctuation:
          // "12:04", "3", "87%", "1.5". A name or a headline is not a number, and a mixed
          // string ("Round 3") moves for reasons the numerals rule does not govern.
          const own = Array.from(el.childNodes)
            .filter((n) => n.nodeType === 3)
            .map((n) => n.textContent)
            .join('');
          const text = own.trim();
          if (!text || !/\d/.test(text) || !/^[\d\s:.,%+\-/'"]+$/.test(text)) continue;

          const before = el.textContent;
          const spread = window.__digitSpread(
            (d) => (el.textContent = text.replace(/\d/g, d)),
            () => el.getBoundingClientRect().width,
          );
          el.textContent = before;
          if (spread <= 0.5) continue;

          out.hits.push({
            spread,
            text: text.slice(0, 20),
            sel:
              el.id ? '#' + el.id
              : typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0]
              : el.tagName.toLowerCase(),
            font: cs.fontFamily.split(',')[0].replace(/"/g, ''),
            variant: cs.fontVariantNumeric,
          });
        }
      } catch (e) {
        out.err = (out.err || '') + ' READ:' + String((e && e.message) || e);
      }
      return out;
    });
  };
});

const rows = [];
for (let i = 0; i < targets.length; i += 12) {
  const slice = targets.slice(i, i + 12);
  const res = await page.evaluate((b) => window.__scan(b), slice.map((t) => t.id));
  res.forEach((r, k) => rows.push({ ...slice[k], ...r }));
}
await browser.close();

if (jsonOut) writeFileSync(jsonOut, JSON.stringify(rows, null, 1));

const excused = [];
for (const r of rows) {
  r.hits = r.hits.filter((h) => {
    const key = `${r.id} ${h.sel}`;
    if (!KNOWN.has(key)) return true;
    excused.push({ key, spread: h.spread, why: KNOWN.get(key) });
    return false;
  });
}

const bad = rows.filter((r) => r.hits.length);
const errored = rows.filter((r) => r.err);

console.log(
  `\nNumerals - ${rows.length} live-number variants checked${scopeNote(onlyIds, targets.length, allTargets.length)}${only ? ` (${only})` : ''}`,
);
console.log(`  a number's box may move at most ${TOLERANCE_PX} px as its digits change\n`);
if (excused.length) {
  console.log(`KNOWN EXCEPTIONS (${excused.length}) - allowed, but still true:`);
  for (const e of excused) console.log(`  ${e.key} moves ${e.spread} px - ${e.why}`);
  console.log('');
}
if (errored.length) {
  console.log(`RENDER ERRORS (${errored.length}):`);
  for (const e of errored) console.log(`  ${e.id}  ${e.err}`);
  console.log('');
}
if (!bad.length) {
  console.log('PASS - every live number holds its width as it changes.\n');
  process.exit(errored.length ? 1 : 0);
}

console.log(`FAIL - ${bad.length}/${rows.length} variants carry a number whose box moves.\n`);
// Group by rule: one shared class across many variants is one fix, not many.
const byRule = new Map();
for (const r of bad) {
  for (const h of r.hits) {
    const k = `${r.cat} ${h.sel}`;
    const e = byRule.get(k) || { n: 0, worst: 0, font: h.font, variant: h.variant, ids: [] };
    e.n++;
    e.worst = Math.max(e.worst, h.spread);
    if (e.ids.length < 6) e.ids.push(r.id);
    byRule.set(k, e);
  }
}
console.log('  By rule (fix these once, many variants clear):');
for (const [k, v] of [...byRule].sort((a, b) => b[1].n - a[1].n)) {
  console.log(
    `  ${String(v.n).padStart(4)}  ${k.padEnd(42)} up to ${String(v.worst).padStart(6)} px  ` +
      `${v.font} / ${v.variant}  e.g. ${v.ids.join(',')}`,
  );
}
process.exit(1);
