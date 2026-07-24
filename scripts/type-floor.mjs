// The TYPE FLOOR gate: renders every catalog variant at 1920x1080, settles it, and reports
// any on-screen text rendering below its category's minimum size.
//
// Why this exists: the July 2026 catalog audit (docs/TEMPLATE_CATALOG_AUDIT.md) measured 285
// of 387 variants carrying text under 20 px at 1080p, some as low as 11 px. That is invisible
// on a phone-sized stream window and smears through broadcast compression. A floor that is not
// machine-checked drifts back the moment a new pack lands, so the floor lives here.
//
// Usage (dev server must be running for this checkout — scripts/dev-port.mjs):
//   node scripts/type-floor.mjs              # check every category, exit 1 on any violation
//   node scripts/type-floor.mjs lower-third  # check one category
//   node scripts/type-floor.mjs --json out.json
//
// The floor is measured on COMPUTED font-size with --scale and --type-scale at their defaults,
// so it is the real rendered size, not the authored literal.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { devPort } from './dev-port.mjs';

/**
 * Minimum rendered px at 1080p, per wizard category.
 *
 * 20 px is the working floor for on-air secondary text — below that, text stops surviving
 * both compression and a phone-sized viewport. Corner bugs are the one honest exception:
 * a persistent station mark is small by construction, so it gets 16, which still reads.
 */
const FLOOR = { 'corner-bug': 16, default: 20 };
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
const only = args.find((a) => !a.startsWith('--') && a !== jsonOut) || null;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
await page.goto(`http://localhost:${devPort()}/app`, { waitUntil: 'domcontentloaded' });

await page.evaluate(async () => {
  window.__cat = await import('/src/templates/catalog.ts');
  window.__comp = await import('/src/preview/composeDocument.ts');
  window.__wiz = await import('/src/model/wizard.ts');
});

const targets = (
  await page.evaluate(
    (only) =>
      window.__wiz.CATEGORIES.filter((c) => !only || c.id === only).flatMap((c) =>
        (window.__cat.CATALOG[c.id] || []).map((v) => ({ id: v.id, cat: c.id, name: v.name })),
      ),
    only,
  )
).filter((t) => !EXEMPT_CATEGORIES.has(t.cat));
if (!targets.length) {
  console.error(only ? `No variants for category "${only}".` : 'No variants found.');
  await browser.close();
  process.exit(2);
}

// Renders a batch of variants off-screen at full size, plays them, then reads back every
// text-bearing element whose computed size is under the floor.
await page.evaluate(() => {
  window.__scan = async (batch) => {
    document.body.innerHTML = '';
    const frames = batch.map(({ id, floor }) => {
      const v = window.__cat.variantById(id);
      const f = document.createElement('iframe');
      f.style.cssText = 'width:1920px;height:1080px;border:0;position:fixed;left:-5000px;top:0';
      try {
        f.srcdoc = window.__comp.composeDocument(v.create({}));
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
    (b) => window.__scan(b),
    slice.map((t) => ({ id: t.id, floor: floorFor(t.cat) })),
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

console.log(`\nType floor — ${rows.length} variants checked${only ? ` (${only})` : ''}`);
console.log(`  floors: corner-bug ${FLOOR['corner-bug']} px · everything else ${FLOOR.default} px`);
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

console.log(`FAIL — ${bad.length}/${rows.length} variants carry text under the floor.\n`);
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
process.exit(1);
