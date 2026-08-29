// THE PRACTICE LIBRARY CHECK - does every file in docs/svg-samples/ still import the way it
// teaches?
//
// The samples are the files a student is told to drop into the Import door, and a sample that
// silently stopped offering its fields is worse than no sample: it teaches the road is broken.
// This runs the REAL importer over the folder - `importSvgMarkup` from src/assets/svgImport.ts,
// no reimplementation - and prints one row per file: the size the door reports, the fields it
// offers, the drawn states it found, and anything the sanitizer had to remove.
//
// IT NEEDS A DOM, and that is not an oversight. `importSvgMarkup` parses with `DOMParser` on
// purpose (the module comment says why: the artwork is never redrawn, only marked), so bare Node
// answers `ReferenceError: DOMParser is not defined`. The cheap honest DOM is the one
// scripts/catalog-emit.mjs already uses: Rolldown bundles the module in about a second,
// Playwright's Chromium opens a blank page, and the whole folder answers in a few seconds. No
// dev server, no app, no fidelity trade - it is a real Chromium DOM.
//
// WHAT IT IS NOT. It is not the corpus sweep. `scripts/svg-import-sweep.mjs` drives the app
// door-to-export over `e2e/fixtures/svg-corpus/`, with an expectation sidecar per fixture; that
// is the measurement of whether the ROAD works. This is the measurement of whether the TEACHING
// FILES still walk it - parse and field detection - which is the part that rots when somebody
// edits a sample.
//
// It is an INSTRUMENT and exits 0. `--fail-on fail` (or `partial`) makes it a gate.
//
// Usage:
//   node scripts/svg-samples-check.mjs
//   node scripts/svg-samples-check.mjs --only alert,poll
//   node scripts/svg-samples-check.mjs --json out.json
//   node scripts/svg-samples-check.mjs --fail-on fail
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { rolldown } from 'rolldown';

const SAMPLES = fileURLToPath(new URL('../docs/svg-samples/', import.meta.url));
const IMPORTER = fileURLToPath(new URL('../src/assets/svgImport.ts', import.meta.url));

/** The families the app ships as woff2 (src/model/fonts.ts). A sample asking for anything else
 *  would warn on the Fonts step, which is not what a teaching file should demonstrate. */
const BUNDLED = new Set(
  [
    'Inter', 'Space Grotesk', 'JetBrains Mono', 'Manrope', 'Archivo', 'Oswald', 'Bebas Neue',
    'Playfair Display', 'Source Serif 4', 'IBM Plex Sans', 'Libre Franklin', 'Sora', 'Outfit',
    'Anton', 'Big Shoulders', 'Saira', 'DM Sans',
  ].map((f) => f.toLowerCase().replace(/[^a-z0-9]/g, '')),
);

const args = process.argv.slice(2);
const flag = (name) => {
  const at = args.indexOf(name);
  return at >= 0 ? (args[at + 1] ?? null) : null;
};
const only = flag('--only');
const jsonOut = flag('--json');
const failOn = flag('--fail-on'); // 'fail' | 'partial'

/** The importer as one self-contained browser script on `window.NOACG_SVG`. It imports nothing,
 *  so the bundle is the module and a TypeScript strip. */
async function bundleImporter() {
  const bundle = await rolldown({ input: IMPORTER, platform: 'browser', logLevel: 'silent' });
  const { output } = await bundle.generate({ format: 'iife', name: 'NOACG_SVG', codeSplitting: false });
  await bundle.close();
  return output[0].code;
}

/** Every sample, by file name, in the order a reader meets them in the README's table. */
function samples() {
  const wanted = only ? new Set(only.split(',').map((s) => s.trim())) : null;
  return readdirSync(SAMPLES)
    .filter((f) => f.endsWith('.svg'))
    .map((f) => ({ name: f.replace(/\.svg$/, ''), file: join(SAMPLES, f) }))
    .filter((s) => !wanted || wanted.has(s.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Run in the page: the real importer, with its throw turned into a row rather than a crash. */
const IMPORT_IN_PAGE = (source) => {
  try {
    const r = window.NOACG_SVG.importSvgMarkup(source);
    return {
      error: null,
      width: r.width,
      height: r.height,
      texts: r.candidates.map((c) => ({
        label: c.label, sample: c.sample, numeric: c.numeric, clock: c.clock, marked: c.marked,
      })),
      images: r.images.map((i) => i.label),
      outlines: r.outlines.map((o) => o.label),
      groups: r.groups.map((g) => ({ label: g.label, hidden: g.hidden })),
      shapes: r.shapes.map((s) => ({ label: s.label, width: s.width, height: s.height })),
      fonts: r.fonts.map((f) => ({ family: f.family, lookup: f.lookup })),
      notices: r.notices,
    };
  } catch (e) {
    return { error: String(e && e.message ? e.message : e) };
  }
};

/**
 * The verdict, and WHY - written from what a teaching file promises, not from what the importer
 * happens to do:
 *
 *   fail    - it does not parse, reports no size, or offers no field at all. A sample nobody can
 *             bind teaches that the road is broken.
 *   partial - it imports, but something a student would meet is off: the sanitizer had to strip
 *             something (a sample must be clean input), two editable layers share a label (the
 *             operator cannot tell them apart), or it asks for a font nothing here can supply.
 *   pass    - clean.
 */
function judge(row) {
  const notes = [];
  if (row.error) return { verdict: 'fail', notes: [row.error] };
  if (!(row.width > 0) || !(row.height > 0)) notes.push('no size reported');
  if (row.texts.length === 0) notes.push('no bindable text field');
  if (notes.length) return { verdict: 'fail', notes };

  for (const n of row.notices) notes.push(`stripped: ${n}`);
  const labels = row.texts.map((t) => t.label);
  const dupes = [...new Set(labels.filter((l, i) => labels.indexOf(l) !== i))];
  if (dupes.length) notes.push(`duplicate label: ${dupes.join(', ')}`);
  for (const f of row.fonts) {
    if (!BUNDLED.has(f.lookup.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
      notes.push(`font not bundled: ${f.family}`);
    }
  }
  return { verdict: notes.length ? 'partial' : 'pass', notes };
}

const wanted = samples();
// A `--only` that names nothing would otherwise print an empty table and exit 0, which reads
// exactly like a clean run - the one way an instrument is worse than none.
if (!wanted.length) {
  console.error(`No samples in ${SAMPLES}${only ? ` matching "${only}"` : ''}.`);
  process.exit(1);
}

const script = await bundleImporter();
const browser = await chromium.launch();
const rows = [];
try {
  const page = await browser.newPage();
  await page.addScriptTag({ content: script });
  for (const s of wanted) {
    const result = await page.evaluate(IMPORT_IN_PAGE, readFileSync(s.file, 'utf8'));
    rows.push({ name: s.name, ...result, ...judge(result) });
  }
} finally {
  await browser.close();
}

const MARK = { pass: 'pass   ', partial: 'PARTIAL', fail: 'FAIL   ' };
const width = Math.max(4, ...rows.map((r) => r.name.length));
console.log(`${'file'.padEnd(width)}  verdict  size        fields  num  clock  pics  outl  states  panels`);
console.log('-'.repeat(width + 64));
for (const r of rows) {
  if (r.error) {
    console.log(`${r.name.padEnd(width)}  ${MARK[r.verdict]}  ${r.error}`);
    continue;
  }
  const num = r.texts.filter((t) => t.numeric).length;
  const clock = r.texts.filter((t) => t.clock).length;
  console.log(
    `${r.name.padEnd(width)}  ${MARK[r.verdict]}  ${`${r.width}x${r.height}`.padEnd(10)}  ` +
      `${String(r.texts.length).padStart(6)}  ${String(num).padStart(3)}  ${String(clock).padStart(5)}  ` +
      `${String(r.images.length).padStart(4)}  ${String(r.outlines.length).padStart(4)}  ` +
      `${String(r.groups.length).padStart(6)}  ${String(r.shapes.length).padStart(6)}`,
  );
  for (const n of r.notes) console.log(`${' '.repeat(width)}    - ${n}`);
}

const tally = { pass: 0, partial: 0, fail: 0 };
for (const r of rows) tally[r.verdict] += 1;
console.log(`\n${rows.length} samples: ${tally.pass} pass, ${tally.partial} partial, ${tally.fail} fail.`);

if (jsonOut) {
  writeFileSync(jsonOut, `${JSON.stringify(rows, null, 1)}\n`, 'utf8');
  console.log(`Wrote ${jsonOut}`);
}

if (failOn === 'fail' && tally.fail > 0) process.exit(1);
if (failOn === 'partial' && tally.fail + tally.partial > 0) process.exit(1);
