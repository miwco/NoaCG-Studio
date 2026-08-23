// DOES A STAGED DESIGN SHIP THE FONT SIZE ITS AUTHOR TYPED? - measured, not grepped.
//
// `fitStagedText` (src/templates/shared/stageFit.ts) holds every line inside a staged panel to
// the room the design gave it, shrinking the font when the operator types past it. That is the
// contract and it is right. The question this instrument answers is narrower and is about the
// CALIBRATION pass rather than the operator: does a design get shrunk at its OWN default sample,
// before anyone has typed anything?
//
// It can, and the mechanism is arithmetic. The reserve is `getBoundingClientRect().height`, the
// LINE BOX (font-size x line-height). The shrink test is `scrollHeight / room`, and scrollHeight
// reports the face's own CONTENT box, which for most typefaces is about 1.2em whatever
// line-height says. So any line whose declared line-height is BELOW its face's content ratio
// reports `tallBy > 1` against its own sample and is shrunk by `sqrt(1/tallBy)` - permanently,
// at load, with no operator input. `grep line-height` is a suspect list, not a finding: the
// cliff sits at the FACE's content ratio, which differs per typeface.
//
// So this renders every staged design at its own default content, lets the runtime settle, and
// compares the size each line ACTUALLY ships at against the size its CSS declares (resolved
// through --scale and --type-scale - it reads the computed value with the runtime's inline
// override lifted, so no CSS parsing is involved and every cascade rule still applies).
//
// It REPORTS; it gates nothing.
//   node scripts/stage-fit-sweep.mjs [category] [--json out.json] [--all] [--ids a,b,c]
// `--all` lists every shrunk line rather than the worst one per design; `--ids` narrows to a
// handful, for reading the raw per-line arithmetic out of the JSON.
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { devPort } from './dev-port.mjs';

const argv = process.argv.slice(2);
const jsonAt = argv.indexOf('--json');
const jsonOut = jsonAt >= 0 ? argv[jsonAt + 1] : null;
const ALL = argv.includes('--all');
const idsAt = argv.indexOf('--ids');
const IDS = idsAt >= 0 ? argv[idsAt + 1].split(',') : null;
const only = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--json' && argv[i - 1] !== '--ids') || null;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
await page.goto(`http://localhost:${devPort()}/app`, { waitUntil: 'domcontentloaded' });

await page.evaluate(async () => {
  window.__cat = await import('/src/templates/catalog.ts');
  window.__comp = await import('/src/preview/composeDocument.ts');
  window.__wiz = await import('/src/model/wizard.ts');
});

// STAGED IS ASKED OF THE EMITTED CODE, never of the source. A design is staged when the
// assembler actually emitted the runtime - the same marker `stageExtraJs` tests for - so a
// category that flips is covered the day it flips and a `stageWidth:` that never reached the
// output cannot show up here as a false suspect.
const targets = await page.evaluate(
  ({ only, ids }) =>
    window.__wiz.CATEGORIES.filter((c) => !only || c.id === only)
      .flatMap((c) => (window.__cat.CATALOG[c.id] || []).map((v) => ({ id: v.id, cat: c.id, name: v.name })))
      .filter((t) => !ids || ids.indexOf(t.id) >= 0)
      .filter((t) => {
        try {
          return String(window.__cat.variantById(t.id).create({}).js || '').includes('function fitStagedText');
        } catch {
          return false;
        }
      }),
  { only, ids: IDS },
);
if (!targets.length) {
  console.error(only ? `No staged variants in category "${only}".` : 'No staged variants found.');
  await browser.close();
  process.exit(2);
}

await page.evaluate(() => {
  window.__scanStageFit = async (ids) => {
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
    // No update() and no play(): the point is the design's OWN sample, exactly as it sits in the
    // emitted HTML. The runtime calibrates on DOMContentLoaded and re-calibrates on fonts.ready,
    // so the settle has to outlast the webfont swap - a reading taken before it is the fallback
    // face's, not this design's.
    await new Promise((r) => setTimeout(r, 2200));

    const out = [];
    for (const { id, f } of frames) {
      if (f.dataset.err) {
        out.push({ id, error: f.dataset.err });
        continue;
      }
      let doc;
      try {
        doc = f.contentDocument;
      } catch {
        out.push({ id, error: 'cross-origin' });
        continue;
      }
      if (!doc) {
        out.push({ id, error: 'no document' });
        continue;
      }
      const boxSel = (f.contentWindow.__noacgStageFitBoxes || []).slice();
      const els = [];
      for (const sel of boxSel) for (const box of doc.querySelectorAll(sel)) els.push(...box.querySelectorAll('*'));

      // TWO PASSES, because the second one MUTATES. Reading a line's shipped size is passive;
      // working out what the runtime compared means clearing the height the runtime pinned, and
      // that reflows the siblings whose shipped size has not been read yet.
      const seen = [];
      for (const el of els) {
        if (el.children.length) continue;
        const text = (el.textContent || '').trim();
        if (!text) continue;
        // The size the runtime SHIPPED. It writes the shrink as an inline font-size and nothing
        // else does, so an empty inline value is the runtime saying "this line was left alone".
        const inline = el.style.fontSize;
        seen.push({ el, text, inline, shipped: parseFloat(inline || window.getComputedStyle(el).fontSize) });
      }

      const lines = [];
      for (const { el, text, shipped } of seen) {
        // The size the CSS DECLARES, read by lifting the override and letting the cascade answer
        // - so --scale, --type-scale, media rules and specificity are all already folded in.
        el.style.fontSize = '';
        const room = parseFloat(el.getAttribute('data-stage-room') || '') || null;
        const cs = window.getComputedStyle(el);
        const declared = parseFloat(cs.fontSize);
        const lh = parseFloat(cs.lineHeight);
        const family = (cs.fontFamily || '').split(',')[0].replace(/["']/g, '').trim();
        if (!declared || !shipped) continue;
        // THE TWO BOXES, side by side at the design's own size - this is the whole arithmetic.
        // `rect` is the LINE BOX the reserve is taken from; `scrollH` is the CONTENT box the
        // shrink test reads. Where the second is bigger, the line was shrunk against itself.
        el.style.height = '';
        const rectH = el.getBoundingClientRect().height;
        const scrollH = el.scrollHeight;
        // The OTHER axis. `fitOneStagedLine` shrinks on whichever of the two is worse, so a
        // report that only carried the height would name the wrong cause on a line that ran out
        // of its box sideways - and the two want opposite fixes.
        const scrollW = el.scrollWidth;
        const clientW = el.clientWidth;
        lines.push({
          text: text.slice(0, 40),
          cls: String(el.className || '').slice(0, 40),
          declared: Number(declared.toFixed(2)),
          shipped: Number(shipped.toFixed(2)),
          lhRatio: lh && !isNaN(lh) ? Number((lh / declared).toFixed(3)) : null,
          family,
          room,
          rectH: Number(rectH.toFixed(2)),
          scrollH,
          scrollW,
          clientW,
          // WHICH AXIS RAN OUT, named rather than inferred later: `height` is the line box vs
          // content box mismatch this instrument was written for, `width` is a line that does not
          // fit its own drawn box sideways, and the two want opposite fixes.
          axis: clientW && scrollW > clientW + 2 ? 'width' : scrollH > Math.max(room || 0, rectH) + 1 ? 'height' : 'unclear',
          display: cs.display,
        });
      }
      out.push({ id, lines });
    }
    document.body.innerHTML = '';
    return out;
  };
});

const BATCH = 6;
const rows = [];
for (let i = 0; i < targets.length; i += BATCH) {
  const slice = targets.slice(i, i + BATCH);
  const res = await page.evaluate(
    (ids) => window.__scanStageFit(ids),
    slice.map((t) => t.id),
  );
  for (const r of res) {
    const t = slice.find((x) => x.id === r.id);
    rows.push({ ...t, ...r });
  }
  process.stdout.write('.');
}
process.stdout.write('\n');
await browser.close();

// The report. A line counts as SHRUNK when it ships more than half a percent under its declared
// size: the runtime's own fit test tolerates 0.5%, so anything inside that was never a decision
// it made.
const SHRUNK = 0.995;
const errored = rows.filter((r) => r.error);
const scanned = rows.filter((r) => !r.error);
let shrunkLines = 0;
let totalLines = 0;
const bad = [];
for (const r of scanned) {
  totalLines += r.lines.length;
  const hits = r.lines
    .filter((l) => l.shipped / l.declared < SHRUNK)
    .sort((a, b) => a.shipped / a.declared - b.shipped / b.declared);
  shrunkLines += hits.length;
  if (hits.length) bad.push({ ...r, hits });
}

console.log(`\n=== STAGE FIT AT THE DESIGN'S OWN SAMPLE${only ? ` - ${only}` : ''} ===`);
console.log(`${scanned.length} staged designs scanned, ${totalLines} staged lines.`);
if (errored.length) {
  console.log(`${errored.length} failed to render: ${errored.map((e) => `${e.id} (${e.error})`).join(', ')}`);
}
console.log(`${bad.length} design(s) ship a smaller font than they declare, on ${shrunkLines} line(s).\n`);

for (const r of bad.sort((a, b) => a.hits[0].shipped / a.hits[0].declared - b.hits[0].shipped / b.hits[0].declared)) {
  const show = ALL ? r.hits : r.hits.slice(0, 1);
  for (const h of show) {
    const pct = (100 * (1 - h.shipped / h.declared)).toFixed(1);
    console.log(
      `  ${r.id.padEnd(7)} ${r.cat.padEnd(16)} ${String(h.declared).padStart(6)}px -> ${String(h.shipped).padStart(6)}px  -${pct.padStart(4)}%` +
        `  ${String(h.axis).padEnd(7)} lh ${String(h.lhRatio ?? '?').padStart(5)}  ${h.family.padEnd(14)} "${h.text}"` +
        (ALL || r.hits.length === 1 ? '' : `  (+${r.hits.length - 1} more)`),
    );
  }
}

// The hypothesis under all of this: the cliff is the FACE's content ratio, so a shrunk line
// should almost always be one whose declared line-height sits below it. Tally it rather than
// assert it - a shrunk line with a generous line-height would mean a second mechanism.
const byLh = { 'under 1.2': 0, '1.2 or over': 0, unknown: 0 };
const byAxis = { height: 0, width: 0, unclear: 0 };
for (const r of bad) {
  for (const h of r.hits) {
    byLh[h.lhRatio == null ? 'unknown' : h.lhRatio < 1.2 ? 'under 1.2' : '1.2 or over'] += 1;
    byAxis[h.axis] += 1;
  }
}
console.log('\nSHRUNK LINES BY DECLARED LINE-HEIGHT');
for (const [k, n] of Object.entries(byLh)) console.log(`  ${k.padEnd(12)} ${String(n).padStart(4)}`);
console.log('\nSHRUNK LINES BY AXIS');
for (const [k, n] of Object.entries(byAxis)) console.log(`  ${k.padEnd(12)} ${String(n).padStart(4)}`);

const byCat = new Map();
for (const r of bad) byCat.set(r.cat, (byCat.get(r.cat) ?? 0) + 1);
const catTotal = new Map();
for (const r of scanned) catTotal.set(r.cat, (catTotal.get(r.cat) ?? 0) + 1);
console.log('\nAFFECTED DESIGNS BY CATEGORY');
for (const [cat, n] of [...byCat.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat.padEnd(20)} ${String(n).padStart(3)} / ${catTotal.get(cat)}`);
}

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({ category: only, rows }, null, 1));
  console.log(`\nwrote ${jsonOut}`);
}
