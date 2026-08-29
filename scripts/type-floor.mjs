// The TYPE FLOOR gate: renders every catalog variant at 1920x1080, settles it, and reports
// any on-screen text rendering below its category's minimum size.
//
// Why this exists: the July 2026 catalog audit (docs/TEMPLATE_CATALOG_AUDIT.md) measured 285
// of 387 variants carrying text under 20 px at 1080p, some as low as 11 px. That is invisible
// on a phone-sized stream window and smears through broadcast compression. A floor that is not
// machine-checked drifts back the moment a new pack lands, so the floor lives here.
//
// Usage (dev server must be running for this checkout — scripts/dev-port.mjs):
//   node scripts/type-floor.mjs                    # check every category, exit 1 on any violation
//   node scripts/type-floor.mjs lower-third        # check one category
//   node scripts/type-floor.mjs --only lt01,lt02   # check just these designs (scripts/catalog-scope.mjs)
//   node scripts/type-floor.mjs --json out.json
//   node scripts/type-floor.mjs --type-scale s     # REPORT the ladder's other steps (never a gate)
//
// `--only` is how a change that touched one design stops paying for all 500+; derive the list
// with `node scripts/catalog-affected.mjs --ids`. It narrows WHICH designs are measured and
// nothing else - same floors, same exemptions, same verdict.
//
// The floor is measured on COMPUTED font-size, so it is the real rendered size and not the
// authored literal.
//
// THE GATE IS THE DEFAULT STEP, and only that one. The catalog ships a text-size ladder of
// S/M/L = 0.85/1/1.2 (`TYPE_SIZE_STEPS`, src/model/styleVocabulary.ts), so a line authored at
// the floor renders at 17 px the moment somebody picks S. That is the operator's own choice,
// exactly like typing a longer name, and holding the catalog to a 20 px floor at S would mean
// authoring every line at 24 - so `--type-scale s|m|l` REPORTS and exits 0 (a render error
// still fails). What it is for is the other question: which lines sit so close to the floor
// that one step down puts them under it, and whether any design's type moves with the ladder
// in a way its author did not intend.
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { devPort } from './dev-port.mjs';
import { ALL_CATALOG_IDS, applyOnly, parseOnly } from './catalog-scope.mjs';

/**
 * Minimum rendered px at 1080p, per wizard category.
 *
 * 20 px is the working floor for on-air secondary text — below that, text stops surviving
 * both compression and a phone-sized viewport. Corner bugs are the one honest exception:
 * a persistent station mark is small by construction, so it gets 16, which still reads.
 */
// The floors come from src/validation/typeFloor.ts, read through the dev server this script
// already drives, so this gate and the live bench that re-measures the ADJUSTED result cannot
// hold two different numbers. Parsed rather than imported because this is .mjs and that is .ts:
// one regex over one tiny declaration, and it fails loudly if the shape ever moves.
const FLOOR = (() => {
  const source = readFileSync(new URL('../src/validation/typeFloor.ts', import.meta.url), 'utf8');
  const body = source.match(/TYPE_FLOOR_PX[^=]*=\s*{([^}]*)}/)?.[1];
  const table = {};
  for (const [, key, value] of (body ?? '').matchAll(/'?([a-z-]+)'?\s*:\s*(\d+)/g)) table[key] = Number(value);
  if (!table.default) {
    throw new Error('could not read TYPE_FLOOR_PX from src/validation/typeFloor.ts - has its shape changed?');
  }
  return table;
})();
const floorFor = (cat) => FLOOR[cat] ?? FLOOR.default;

/**
 * Categories the floor cannot speak for. `imported-design` renders the USER'S artwork with
 * their own placed text — we do not author its type, so we cannot hold it to our floor.
 */
const EXEMPT_CATEGORIES = new Set(['imported-design']);

/**
 * Known, understood exceptions: `${variant} ${selector}` -> why it is allowed to sit low.
 * An entry here is a decision, not a snooze — delete it when the underlying cause is fixed.
 */
const KNOWN = new Map([
  [
    'cr09 .credits-logo-slot',
    'the board shrinks to fit its content, and the fit routine has no lower bound — the ' +
      'authored size is already 20px. Fixing this means giving shrink-to-fit a floor of its own.',
  ],
]);

const args = process.argv.slice(2);
const jsonAt = args.indexOf('--json');
const jsonOut = jsonAt >= 0 ? args[jsonAt + 1] : null;
const stepAt = args.indexOf('--type-scale');
// The LABEL is validated here; the NUMBER is resolved in the page from `TYPE_SIZE_STEPS` itself,
// so this script cannot hold a stale copy of the ladder the catalog actually ships.
const STEP = stepAt >= 0 ? String(args[stepAt + 1] || '').toUpperCase() : null;
if (stepAt >= 0 && !/^[SML]$/.test(STEP)) {
  console.error(`--type-scale takes one of s, m, l (got "${args[stepAt + 1] ?? ''}").`);
  process.exit(2);
}
const stepArg = stepAt >= 0 ? args[stepAt + 1] : null;
const { ids: onlyIds, raw: onlyRaw } = parseOnly(args);
const only = args.find((a) => !a.startsWith('--') && a !== jsonOut && a !== stepArg && a !== onlyRaw) || null;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
await page.goto(`http://localhost:${devPort()}/app`, { waitUntil: 'domcontentloaded' });

await page.evaluate(async () => {
  window.__cat = await import('/src/templates/catalog.ts');
  window.__comp = await import('/src/preview/composeDocument.ts');
  window.__wiz = await import('/src/model/wizard.ts');
  window.__style = await import('/src/model/styleVocabulary.ts');
});

// The step, read off the ladder the wizard offers rather than typed in again here. `null` means
// "no option passed at all", so the gate run composes exactly the document it always did.
const typeScale = STEP
  ? await page.evaluate((label) => {
      const step = window.__style.TYPE_SIZE_STEPS.find((s) => s.l === label);
      if (!step) throw new Error(`TYPE_SIZE_STEPS has no step "${label}" - has the ladder changed?`);
      return step.s;
    }, STEP)
  : null;

const allTargets = (
  await page.evaluate(
    (only) =>
      window.__wiz.CATEGORIES.filter((c) => !only || c.id === only).flatMap((c) =>
        (window.__cat.CATALOG[c.id] || []).map((v) => ({ id: v.id, cat: c.id, name: v.name })),
      ),
    only,
  )
).filter((t) => !EXEMPT_CATEGORIES.has(t.cat));
const targets = await applyOnly(allTargets, onlyIds, 'type-floor', () => browser.close(), {
  known: onlyIds ? await page.evaluate(ALL_CATALOG_IDS) : [],
});
if (!targets.length) {
  console.error(only ? `No variants for category "${only}".` : 'No variants found.');
  await browser.close();
  process.exit(2);
}

// Renders a batch of variants off-screen at full size, plays them, then reads back every
// text-bearing element whose computed size is under the floor.
await page.evaluate(() => {
  window.__scan = async (batch, typeScale) => {
    document.body.innerHTML = '';
    // The step goes through `create`, the wizard's own path - not a CSS override on the finished
    // document, which would also move type in a design that declares no `--type-scale` at all.
    const opts = typeScale == null ? {} : { typeScale };
    const frames = batch.map(({ id, floor }) => {
      const v = window.__cat.variantById(id);
      const f = document.createElement('iframe');
      f.style.cssText = 'width:1920px;height:1080px;border:0;position:fixed;left:-5000px;top:0';
      try {
        f.srcdoc = window.__comp.composeDocument(v.create(opts));
      } catch (e) {
        f.dataset.err = String((e && e.message) || e);
      }
      document.body.appendChild(f);
      return { id, floor, f };
    });
    await new Promise((r) => setTimeout(r, 900));
    for (const { f } of frames) {
      try {
        f.contentWindow.play && f.contentWindow.play();
      } catch { /* a template without play() is not a floor problem */ }
    }
    // Settle: presets run ~1.2 s, steps and loops a little longer.
    await new Promise((r) => setTimeout(r, 2400));

    return frames.map(({ id, floor, f }) => {
      const out = { id, err: f.dataset.err || null, hits: [] };
      try {
        const w = f.contentWindow;
        for (const el of f.contentDocument.body.querySelectorAll('*')) {
          const cs = w.getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          if (!(parseFloat(cs.opacity) > 0.03)) continue;
          // Only elements that render their OWN text — a wrapper inherits a size it never paints.
          const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
          if (!own) continue;
          const px = parseFloat(cs.fontSize);
          if (!(px < floor)) continue;
          out.hits.push({
            px: Math.round(px * 10) / 10,
            sel: typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : '#' + el.id,
            text: el.textContent.trim().slice(0, 28),
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
  const res = await page.evaluate(
    ({ batch, ts }) => window.__scan(batch, ts),
    { batch: slice.map((t) => ({ id: t.id, floor: floorFor(t.cat) })), ts: typeScale },
  );
  res.forEach((r, k) => rows.push({ ...slice[k], floor: floorFor(slice[k].cat), ...r }));
}
await browser.close();

if (jsonOut) writeFileSync(jsonOut, JSON.stringify(rows, null, 1));

// Split the hits into ones the floor governs and ones we have already decided about.
const excused = [];
for (const r of rows) {
  r.hits = r.hits.filter((h) => {
    const key = `${r.id} ${h.sel}`;
    if (!KNOWN.has(key)) return true;
    excused.push({ key, px: h.px, why: KNOWN.get(key) });
    return false;
  });
}

const bad = rows.filter((r) => r.hits.length);
const errored = rows.filter((r) => r.err);

// Group by the offending rule: a class that appears across many variants is one shared fix.
const byRule = new Map();
for (const r of bad) {
  for (const h of r.hits) {
    const k = `${r.cat} ${h.sel}`;
    const e = byRule.get(k) || { n: 0, px: new Set(), ids: [] };
    e.n++;
    e.px.add(h.px);
    if (e.ids.length < 6) e.ids.push(r.id);
    byRule.set(k, e);
  }
}

const scopeNote = onlyIds ? ` of ${allTargets.length} — SCOPED to --only` : '';
console.log(`\nType floor — ${rows.length} variants checked${scopeNote}${only ? ` (${only})` : ''}`);
console.log(`  floors: corner-bug ${FLOOR['corner-bug']} px · everything else ${FLOOR.default} px`);
console.log(`  text size: ${STEP ?? 'M'}${STEP ? ` (--type-scale ${typeScale}) — REPORT ONLY, the gate is M` : ' (the default) — this is the gate'}`);
console.log(`  exempt categories: ${[...EXEMPT_CATEGORIES].join(', ') || 'none'}\n`);
if (excused.length) {
  console.log(`KNOWN EXCEPTIONS (${excused.length}) — allowed, but still true:`);
  for (const e of excused) console.log(`  ${e.key} @ ${e.px} px — ${e.why}`);
  console.log('');
}
if (errored.length) {
  console.log(`RENDER ERRORS (${errored.length}):`);
  for (const e of errored) console.log(`  ${e.id}  ${e.err}`);
  console.log('');
}
if (!bad.length) {
  console.log('PASS — no text renders under its category floor.\n');
  process.exit(errored.length ? 1 : 0);
}

console.log(
  STEP
    ? `${bad.length}/${rows.length} variants carry text under the floor at text size ${STEP}.` +
        ` REPORT, not a verdict — the gate is the default step.\n`
    : `FAIL — ${bad.length}/${rows.length} variants carry text under the floor.\n`,
);
console.log('  By rule (fix these once, many variants clear):');
for (const [k, v] of [...byRule].sort((a, b) => b[1].n - a[1].n).slice(0, 30)) {
  const px = [...v.px].sort((a, b) => a - b).join('/');
  console.log(`  ${String(v.n).padStart(4)}  ${k.padEnd(46)} ${px.padEnd(20)} e.g. ${v.ids.join(',')}`);
}
console.log('\n  By variant:');
for (const r of bad) {
  const worst = Math.min(...r.hits.map((h) => h.px));
  console.log(`  ${r.id.padEnd(9)} ${r.cat.padEnd(15)} worst ${String(worst).padStart(5)} px (floor ${r.floor})  ${r.hits.length} element(s)`);
}
console.log('');
// A non-default step never fails the build: it reports what the ladder does to type the catalog
// authored at the floor. A RENDER ERROR still fails, at every step - that is a broken design.
process.exit(STEP ? (errored.length ? 1 : 0) : 1);
