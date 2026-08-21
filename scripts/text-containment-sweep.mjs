// The TEXT CONTAINMENT SWEEP: does every line stay inside the box it is DRAWN in?
//
// Why this exists: on 2026-08-21 the owner reviewed a catalogue pack and found a longer level
// label running straight out of the blue severity tile on the alert strip - words hanging in open
// programme on both sides of the colour they belong to. Measured afterwards, THIRTY-SEVEN designs
// carried the same defect.
//
// Nothing in this repo could see it. `overflow-sweep` asks whether a box escapes the FRAME or
// clips its own content; `footprint-stability-sweep` asks whether a PANEL changes size;
// `type-floor` asks whether text is legible; `catalog-bench` stresses the layout but judges
// overlap and clipping, not paint. A line sitting outside its own background is none of those, so
// the whole class was invisible until somebody looked at a picture. That is the gap this closes.
//
// TWO WAYS A LINE ESCAPES ITS PAINT, and a check that knows only one is worse than none:
//   - it overflows an ANCESTOR that paints - a tile, a chip, a coloured cell;
//   - it overflows ITSELF, when the element's own background IS the box. That is the alert
//     strip's severity square, and it is why the first version of this check reported "contained"
//     while the screenshot plainly showed otherwise.
//
// A REPORT, NOT A GATE - the same doctrine as overflow-sweep, and for the same reason. Some of
// what it finds is by design: a credit roll and a news crawl carry their content past their own
// frame on purpose, because that is the motion. So it is a DIFF tool. Capture a baseline on a
// known-good tree, then fail only on rows that got worse.
//
// MOTION IS FROZEN BEFORE MEASURING. A crawl is mid-travel when the sweep looks at it, so its
// leaves sit somewhere different on every run and the same design reports a different overflow
// each time. Pausing GSAP's global timeline after the settle makes the reading deterministic,
// which is what lets a baseline mean anything at all.
//
// Usage (dev server must be running for this checkout - scripts/dev-port.mjs):
//   node scripts/text-containment-sweep.mjs                  # sweep every category
//   node scripts/text-containment-sweep.mjs alert            # one category
//   node scripts/text-containment-sweep.mjs --json out.json  # dump every row
//   node scripts/text-containment-sweep.mjs --update-baseline
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { devPort } from './dev-port.mjs';

// A couple of pixels of sub-pixel rounding is not a word hanging out of a box.
const TOLERANCE = 2;

// The committed reference of what is outside its box TODAY, including everything that is there by
// design. Regenerate with --update-baseline after a deliberate look change.
const DEFAULT_BASELINE = new URL('./text-containment-baseline.json', import.meta.url);

const args = process.argv.slice(2);
const flagVal = (name) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] ?? null : null;
};
const jsonOut = flagVal('--json');
const baselineArg = flagVal('--baseline');
const updateBaseline = args.includes('--update-baseline');
const only = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--json' && args[i - 1] !== '--baseline') || null;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
await page.goto(`http://localhost:${devPort()}/app`, { waitUntil: 'domcontentloaded' });
await page.evaluate(async () => {
  window.__cat = await import('/src/templates/catalog.ts');
  window.__comp = await import('/src/preview/composeDocument.ts');
  window.__wiz = await import('/src/model/wizard.ts');
});

const targets = await page.evaluate(
  (only) =>
    window.__wiz.CATEGORIES.filter((c) => !only || c.id === only).flatMap((c) =>
      (window.__cat.CATALOG[c.id] || []).map((v) => ({ id: v.id, cat: c.id, name: v.name })),
    ),
  only,
);
if (!targets.length) {
  console.error(only ? `No variants for category "${only}".` : 'No variants found.');
  await browser.close();
  process.exit(2);
}

await page.evaluate((TOLERANCE) => {
  window.__scanContainment = async (batch) => {
    const FILL = ['Wisniewska', 'district', 'provisional', 'afternoon', 'coverage', 'regional'];
    const out = [];
    for (const { id } of batch) {
      document.body.innerHTML = '';
      const frame = document.createElement('iframe');
      frame.style.cssText = 'width:1920px;height:1080px;border:0;position:fixed;left:-5000px;top:0';
      let err = null;
      try {
        frame.srcdoc = window.__comp.composeDocument(window.__cat.variantById(id).create({}));
      } catch (e) {
        err = String((e && e.message) || e);
      }
      document.body.appendChild(frame);
      await new Promise((r) => setTimeout(r, 1000));
      const w = frame.contentWindow;
      if (!w || err) { out.push({ id, err, escapes: [] }); continue; }

      // The operator's worst realistic case: each field lengthened against its OWN sample, so a
      // name stays name-shaped. A box that holds this holds a rundown.
      try {
        const fields = (w.SPXGCTemplateDefinition || {}).DataFields || [];
        const data = {};
        for (const fd of fields) {
          if (fd.ftype !== 'textfield' && fd.ftype !== 'textarea') continue;
          const t = String(fd.value || '').trim();
          if (!t) continue;
          let value = t;
          const target = Math.max(t.length + 8, Math.round(t.length * 1.7));
          for (let i = 0; value.length < target; i++) value += ' ' + FILL[i % FILL.length];
          data[fd.field] = value;
        }
        if (Object.keys(data).length) w.update(JSON.stringify(data));
      } catch { /* a template that cannot take text is not a containment problem */ }
      await new Promise((r) => setTimeout(r, 250));
      try { w.play && w.play(); } catch { /* no lifecycle is not a containment problem */ }
      await new Promise((r) => setTimeout(r, 2400));
      // FREEZE. A crawl is mid-travel and would otherwise report a different number every run.
      try { if (w.gsap && w.gsap.globalTimeline) w.gsap.globalTimeline.pause(); } catch { /* no gsap */ }
      await new Promise((r) => setTimeout(r, 60));

      const paints = (cs) => {
        const bg = cs.backgroundColor;
        if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return true;
        return parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0;
      };
      const label = (el) => {
        const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '';
        return cls ? '.' + cls : el.id ? '#' + el.id : el.tagName.toLowerCase();
      };

      const escapes = [];
      for (const el of Array.from(w.document.body.querySelectorAll('*'))) {
        if (el.children.length) continue;                    // not a leaf: its children carry the text
        const text = (el.textContent || '').trim();
        if (text.length < 3) continue;                       // a glyph or a letter chip cannot wrap
        const cs = w.getComputedStyle(el);
        // Only what the viewer can SEE. A hidden data source - a colour value, a period list, an
        // anonymised-name stand-in - has no paint to escape from.
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        if (!(parseFloat(cs.opacity) > 0.03)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;

        // Its own box, when the element is what paints. An auto-width box grows with its text and
        // never reports an overflow, so only a box with a width of its own is ever caught here.
        if (paints(cs) && el.clientWidth && el.scrollWidth > el.clientWidth + TOLERANCE) {
          escapes.push({ el: label(el), by: Math.round(el.scrollWidth - el.clientWidth), box: 'itself' });
          continue;
        }
        // …or the nearest ancestor that paints.
        let box = null;
        for (let p = el.parentElement; p && p !== w.document.body; p = p.parentElement) {
          if (paints(w.getComputedStyle(p))) { box = p; break; }
        }
        if (!box) continue;
        const br = box.getBoundingClientRect();
        const bcs = w.getComputedStyle(box);
        const by = Math.round(Math.max(
          br.left + (parseFloat(bcs.paddingLeft) || 0) - r.left,
          r.right - (br.right - (parseFloat(bcs.paddingRight) || 0)),
        ));
        if (by > TOLERANCE) escapes.push({ el: label(el), by, box: label(box) });
      }
      escapes.sort((a, b) => b.by - a.by);
      out.push({ id, err: null, escapes });
    }
    return out;
  };
}, TOLERANCE);

const rows = [];
for (let i = 0; i < targets.length; i += 6) {
  const slice = targets.slice(i, i + 6);
  const res = await page.evaluate((batch) => window.__scanContainment(batch), slice);
  for (const r of res) {
    const t = targets.find((x) => x.id === r.id);
    rows.push({ ...r, cat: t?.cat ?? '?', name: t?.name ?? '' });
  }
  process.stderr.write(`\r  ${Math.min(i + 6, targets.length)}/${targets.length}   `);
}
process.stderr.write('\n');
await browser.close();

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify(rows, null, 1));
  console.log(`Wrote ${rows.length} rows to ${jsonOut}`);
}

// The baseline is worst-overflow-per-design: enough to catch a design getting worse, small enough
// to read in a diff.
const worst = (r) => (r.escapes.length ? r.escapes[0].by : 0);
const current = {};
for (const r of rows) if (worst(r)) current[r.id] = worst(r);

if (updateBaseline) {
  writeFileSync(DEFAULT_BASELINE, `${JSON.stringify(current, null, 1)}\n`);
  console.log(`Baseline updated: ${Object.keys(current).length} designs with text outside a box.`);
  process.exit(0);
}

const flagged = rows.filter((r) => r.escapes.length);
console.log(`Text containment - ${rows.length} designs${only ? ` (${only})` : ''}`);
console.log(`  each field lengthened against its own sample · motion frozen · tolerance ${TOLERANCE}px`);
console.log(`  ${flagged.length} design(s) put text outside the box it is drawn in\n`);
for (const r of flagged.slice(0, 25)) {
  const first = r.escapes.slice(0, 3).map((e) => `${e.el} +${e.by}px (${e.box})`).join(' · ');
  console.log(`  ${r.id.padEnd(9)} ${r.cat.padEnd(16)} ${first}${r.escapes.length > 3 ? ` …+${r.escapes.length - 3}` : ''}`);
}
if (flagged.length > 25) console.log(`  …and ${flagged.length - 25} more (use --json for all)`);

let baseline = null;
try {
  baseline = JSON.parse(readFileSync(baselineArg ? new URL(baselineArg, `file://${process.cwd()}/`) : DEFAULT_BASELINE, 'utf8'));
} catch { /* no baseline yet - report only */ }

if (!baseline) {
  console.log('\nNo baseline found - reporting only. Record one with --update-baseline.');
  process.exit(0);
}
const regressed = Object.keys(current).filter((id) => current[id] > (baseline[id] ?? 0) + TOLERANCE);
console.log('');
if (regressed.length) {
  console.log(`REGRESSED vs baseline (${regressed.length}) - text further outside its box than before:`);
  for (const id of regressed) console.log(`  ${id.padEnd(9)} ${baseline[id] ?? 0}px -> ${current[id]}px`);
  process.exit(1);
}
console.log('PASS - no design puts text further outside its box than the baseline.');
