#!/usr/bin/env node
// RE-JUDGE ALREADY-PAID ROUNDS AGAINST THE OWNER'S SIX TASTE RULES. FREE - it mounts saved
// code and measures it; no model is called and no token is spent.
//
//   node scripts/pro-taste-rejudge.mjs --control
//       The CALIBRATION sweep: every mark-capable design the catalog ships, rendered with a real
//       crest and measured. `src/ai/spike/tasteCheck.ts`'s thresholds are read off this
//       distribution - the same discipline the spacing, proportion and axis instruments follow.
//
//   node scripts/pro-taste-rejudge.mjs benchmarks/pro/evidence/round-2026-08-19-topiccard
//   node scripts/pro-taste-rejudge.mjs <roundA> <roundB> --sets
//       Re-judge one or more finished rounds. `--sets` additionally reproduces the two-round
//       blind gallery's S-NN ids (the same interleave-then-hash `pro-set-compare-gallery.mjs`
//       issues), so a measurement can be put beside the owner's own note for that row.
//
// WHY THIS EXISTS. The owner read four galleries on 2026-08-19 and named the same small set of
// composition faults roughly thirty times. Those rounds are PAID and their code is committed,
// so the whole corpus can be re-judged by any instrument written afterwards for nothing - which
// is the only affordable way to ask "would this instrument have caught what the owner caught?".
// A rule that fires on the frames the owner rejected and stays quiet on the ones the owner
// aired has earned its place; one that misses is the finding.
//
// WHAT IT MOUNTS. The saved `index.html` / `template.css` / `template.js` through
// `composeDocument` - the exact preview pipeline the paid round measured through, and the same
// path `pro-spike.mjs --alpha` and `--recompose` already take. The brand mark rides as a real
// asset, resolved from the committed brands fixture by the file name the saved markup asks for,
// because a mark that fails to load renders as a 0x0 box and every mark rule then reports
// nothing while looking like a pass.
//
// Requires the dev server on this checkout's port (node scripts/dev-port.mjs).

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { devPort } from './dev-port.mjs';
import { LITE_BRAND_MARKS_BY_ID } from './ai-lite-brand-fixtures.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? null;
const roundDirs = args.filter((a) => !a.startsWith('--'));

const CONTROL = flag('control');
const SETS = flag('sets');
const BRANDS = path.resolve('benchmarks/pro/v1/spike/brands.json');
const OUT = value('out');

if (!CONTROL && !roundDirs.length) {
  console.error('usage: node scripts/pro-taste-rejudge.mjs --control');
  console.error('       node scripts/pro-taste-rejudge.mjs <roundDir> [<roundDir>] [--sets] [--out=file.json]');
  process.exit(2);
}
if (SETS && roundDirs.length !== 2) {
  console.error('--sets reproduces the two-round blind gallery ids and needs exactly two round dirs.');
  process.exit(2);
}

const BASE = `http://localhost:${devPort()}`;
try {
  await fetch(`${BASE}/app`, { signal: AbortSignal.timeout(4000) });
} catch {
  console.error(`Dev server not reachable at ${BASE} - start it first (npm run dev).`);
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (error) => console.log('  pageerror:', error.message));
await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
await page.locator('.topbar').waitFor();
await page.locator('.wz-modal').waitFor({ state: 'visible', timeout: 20_000 }).catch(() => undefined);
await page.keyboard.press('Escape');
await page.locator('.wz-modal').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);

/** Percentiles of a numeric column, for a distribution a threshold can be read off. */
function spread(values) {
  const v = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!v.length) return null;
  const at = (p) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  return {
    n: v.length,
    min: Math.round(v[0] * 1000) / 1000,
    p50: Math.round(at(0.5) * 1000) / 1000,
    p90: Math.round(at(0.9) * 1000) / 1000,
    max: Math.round(v[v.length - 1] * 1000) / 1000,
  };
}

// ── CONTROL: the catalog's own answer to the six rules ────────────────────────────────
//
// The target set is the CATALOG's own capability, never a list kept here (the rule
// `spike-mark-clearance-sweep.mjs` and `ai-lite-brand-audit.mjs` both state). A square crest is
// the probe: it is the shape that FILLS a well, so a design that centres its mark and one that
// does not are furthest apart under it.
if (CONTROL) {
  const markId = value('mark') ?? 'badge-square';
  const mark = LITE_BRAND_MARKS_BY_ID.get(markId);
  if (!mark) {
    console.error(`Unknown mark "${markId}". Known: ${[...LITE_BRAND_MARKS_BY_ID.keys()].join(', ')}`);
    await browser.close();
    process.exit(2);
  }
  // The category is an argument because rule 5 is a claim about a graphic TYPE, not about a
  // strap: a sponsor bug that stacks its mark over a caption is that family's shipped idiom, and
  // the only honest way to say so is to measure the family (`--category=corner-bug`).
  const category = value('category') ?? 'lower-third';
  const ids = await page.evaluate(async (cat) => {
    const catalog = await import('/src/templates/catalog.ts?t=' + Date.now());
    return (catalog.CATALOG[cat] ?? []).filter((v) => v.logo !== 'none').map((v) => v.id);
  }, category);
  if (!ids.length) {
    console.error(`No mark-capable designs in category "${category}".`);
    await browser.close();
    process.exit(2);
  }
  console.log(`Control sweep: ${ids.length} mark-capable ${category}s with "${markId}".\n`);
  const rows = [];
  for (const id of ids) {
    const row = await page.evaluate(async ({ variantId, markSpec }) => {
      const bust = '?t=' + Date.now();
      const cat = await import('/src/templates/catalog.ts' + bust);
      const { composeDocument } = await import('/src/preview/composeDocument.ts' + bust);
      const { measureTaste } = await import('/src/ai/spike/tasteCheck.ts' + bust);
      const variant = cat.variantById(variantId);
      if (!variant) return { id: variantId, error: 'gone' };
      const lines = [
        { title: 'Name', sample: 'Alexandra Riva' },
        { title: 'Role', sample: 'Chief Political Correspondent' },
      ];
      const template = variant.create({
        lines,
        logoEnabled: true,
        logoAssetPath: markSpec.path,
        importedImages: [{ path: markSpec.path, data: markSpec.data }],
      });
      document.getElementById('taste-frame')?.remove();
      const frame = document.createElement('iframe');
      frame.id = 'taste-frame';
      frame.style.cssText = 'position:fixed;left:0;top:0;width:1920px;height:1080px;border:0;'
        + 'z-index:99999;background:#333;color-scheme:dark;';
      document.body.appendChild(frame);
      frame.srcdoc = composeDocument(template);
      await new Promise((resolve) => { frame.onload = resolve; });
      const win = frame.contentWindow;
      const payload = {};
      lines.forEach((line, i) => { payload[`f${i}`] = line.sample; });
      try {
        win.update(JSON.stringify(payload));
        win.play();
      } catch { /* a broken lifecycle still paints something - measure what is there */ }
      await win.document.fonts.ready;
      await new Promise((resolve) => setTimeout(resolve, 1800));
      // The mark's field id through the template's own DEFINITION rather than a guess about how
      // many fields a design carries - the rule `spike-mark-clearance-sweep.mjs` states.
      const markFieldId = (win.SPXGCTemplateDefinition?.DataFields ?? [])
        .find((f) => f.ftype === 'filelist')?.field ?? null;
      const taste = measureTaste(frame.contentDocument, { markFieldId });
      frame.remove();
      return { id: variantId, markFieldId, taste };
    }, { variantId: id, markSpec: { path: mark.path, data: mark.data } });
    rows.push(row);
    const c = row.taste?.markCentre;
    console.log(`  ${row.id.padEnd(6)} ${c
      ? `centre x ${String(c.offset.x).padStart(6)} y ${String(c.offset.y).padStart(6)}  in ${c.containerKind} ${c.container}`
      : 'no container - rule 1 does not apply'}`
      + `${row.taste?.findings.length ? `  [${row.taste.findings.map((f) => f.code).join(', ')}]` : ''}`);
  }
  const centred = rows.filter((r) => r.taste?.markCentre);
  console.log('\n── The distribution the thresholds are read off ──');
  console.log(`  rule 1 applies to ${centred.length} of ${rows.length} designs`
    + ` (the rest place their mark with no surface around it)`);
  console.log('  |offset x| ', JSON.stringify(spread(centred.map((r) => Math.abs(r.taste.markCentre.offset.x)))));
  console.log('  |offset y| ', JSON.stringify(spread(centred.map((r) => Math.abs(r.taste.markCentre.offset.y)))));
  console.log('  rule 2 balance ', JSON.stringify(spread(rows.map((r) => r.taste?.markBalance?.balance).filter((n) => n != null))));
  console.log('  rule 5 rowShare ', JSON.stringify(spread(rows.map((r) => r.taste?.markRow?.rowShare).filter((n) => n != null))));
  const owns = rows.filter((r) => r.taste?.markRow?.stacked);
  console.log(`  rule 5 stacks the mark on ${owns.length}: ${owns.map((r) => r.id).join(', ') || '-'}`);
  const off = rows.filter((r) => r.taste?.findings.some((f) => f.code === 'mark-off-centre'));
  console.log(`  rule 1 fires on ${off.length}: ${off.map((r) => r.id).join(', ') || '-'}`);
  const outFile = path.resolve(OUT ?? 'benchmarks/pro/v1/spike/taste-calibration.json');
  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, `${JSON.stringify({ mark: markId, rows }, null, 2)}\n`);
  console.log(`\nWritten ${path.relative(process.cwd(), outFile)}`);
  await browser.close();
  process.exit(0);
}

// ── RE-JUDGE: the archived rounds ─────────────────────────────────────────────────────

const brandsFixture = JSON.parse(await readFile(BRANDS, 'utf8'));
const bank = JSON.parse(await readFile(path.resolve('benchmarks/pro/v1/briefs.json'), 'utf8'));
/** Mark file name -> data URL, so a saved `src="images/<file>"` resolves to real artwork, and
 *  brand id -> the same mark, which is what a recomposed piece is handed. */
const markData = new Map();
const brandById = new Map();
for (const brand of brandsFixture.brands) {
  const file = path.resolve(path.dirname(BRANDS), brand.mark);
  const bytes = await readFile(file);
  const ext = path.extname(file).toLowerCase();
  const mime = ext === '.svg' ? 'image/svg+xml' : ext === '.png' ? 'image/png' : 'image/jpeg';
  const dataUrl = `data:${mime};base64,${bytes.toString('base64')}`;
  markData.set(path.basename(file), dataUrl);
  brandById.set(brand.id, { path: `images/${path.basename(file)}`, data: dataUrl });
}

/** The S-NN ids `pro-set-compare-gallery.mjs` issues: interleave the two rounds' set-carrying
 *  cells, then number them. The gallery additionally shuffles for DISPLAY, by a hash of the id
 *  it has already issued - so the shuffle moves rows on the page and never renames one, and
 *  reproducing the numbering alone is enough to put a measurement beside the owner's note.
 *  Reproduced rather than parsed out of the built page, because the page is the artefact and
 *  the assignment is the fact. */
function setIds(roundA, roundB) {
  const cells = (round, letter) => (round.results ?? [])
    .filter((r) => r.kind === 'candidate' && !r.skipped && !r.error && r.language)
    .map((r) => ({ letter, slug: r.slug, set: r.recomposedSet ?? [] }));
  const A = cells(roundA, 'A');
  const B = cells(roundB, 'B');
  const interleaved = [];
  for (let i = 0; i < Math.max(A.length, B.length); i += 1) {
    if (A[i]) interleaved.push(A[i]);
    if (B[i]) interleaved.push(B[i]);
  }
  const out = new Map();
  interleaved.forEach((cell, i) => {
    out.set(`${cell.letter}:${cell.slug}`, `S-${String(i + 1).padStart(2, '0')}`);
  });
  return out;
}

/**
 * Every piece of one candidate, and WHERE each one comes from.
 *
 * TWO SOURCES, and the difference between them is worth carrying on every row. A paid round
 * that composed a package saved each member's code beside the strap's, and that code is the
 * artefact the money bought - it is mounted as it was written. A round that predates the
 * package surface saved only the strap, and its members exist on disk as PNG frames alone
 * (`recomposedSet`, written by `pro-spike.mjs --recompose --set`).
 *
 * Judging only what is on disk would have made the two committed checkpoint rounds
 * incomparable - the first re-judge read 18 rows of three pieces against 18 rows of one and
 * reported the older round as CLEAN, which is what a corpus looks like when half of it was
 * never measured. So a missing member is REBUILT from the saved `language.json` through the
 * same `composeGraphic` the recompose path uses: deterministic, free, and the same platform
 * code both halves of the corpus now go through.
 */
async function piecesFor(roundDir, record) {
  const dir = path.resolve(roundDir, record.code);
  const out = [{ graphic: 'lower-third', dir, source: 'saved' }];
  const members = record.setMembers ?? record.recomposedSet ?? [];
  for (const member of members) {
    const memberDir = path.join(dir, member.graphic);
    try {
      await readdir(memberDir);
      out.push({ graphic: member.graphic, dir: memberDir, source: 'saved' });
    } catch {
      out.push({ graphic: member.graphic, dir: null, source: 'recomposed' });
    }
  }
  return out;
}

/** The saved design language a recomposed piece is rebuilt from, plus the brief's own words. */
async function languageFor(roundDir, record) {
  try {
    const saved = JSON.parse(
      await readFile(path.join(path.resolve(roundDir, record.code), 'language.json'), 'utf8'),
    );
    const entry = bank.briefs.find((b) => b.id === String(record.slug).split('.')[0]);
    if (!saved?.language || !entry) return null;
    return { language: saved.language, name: entry.brief.name, title: entry.brief.title };
  } catch {
    return null;
  }
}

/** Mount one piece - saved code, or the same graphic rebuilt from its language - and measure it. */
async function judgePiece(piece, context) {
  let html = null;
  let css = null;
  let js = null;
  const assets = [];
  const unresolved = [];
  if (piece.source === 'saved') {
    [html, css, js] = await Promise.all([
      readFile(path.join(piece.dir, 'index.html'), 'utf8'),
      readFile(path.join(piece.dir, 'template.css'), 'utf8'),
      readFile(path.join(piece.dir, 'template.js'), 'utf8'),
    ]);
    // The artwork the saved markup asks for, by file name. An unresolvable mark is REPORTED
    // rather than quietly rendered as a 0x0 box: every mark rule would then read as a clean pass.
    for (const assetPath of new Set([...html.matchAll(/src="(images\/[^"]+)"/g)].map((m) => m[1]))) {
      const data = markData.get(path.basename(assetPath));
      if (data) assets.push({ path: assetPath, data });
      else unresolved.push(assetPath);
    }
  } else if (!context?.language) {
    throw new Error(`${piece.graphic} has neither saved code nor a saved language to rebuild from`);
  }
  const measured = await page.evaluate(async (input) => {
    const bust = '?t=' + Date.now();
    const { composeDocument } = await import('/src/preview/composeDocument.ts' + bust);
    const { measureTaste } = await import('/src/ai/spike/tasteCheck.ts' + bust);
    let srcdoc;
    if (input.html !== null) {
      srcdoc = composeDocument({
        html: input.html,
        css: input.css,
        js: input.js,
        assets: input.assets,
        resolution: { width: 1920, height: 1080 },
        fields: [],
      });
    } else {
      // Mirrors `pro-spike.mjs --recompose --set` exactly - the same composer, the same
      // one-input show facts, a mark only where the type takes one. A second way of building a
      // package member is how a bench comes to measure a graphic the product never draws.
      const { composeGraphic, packageLines, PRO_GRAPHICS } = await import('/src/ai/pro/language/graphics.ts' + bust);
      const { probeMark } = await import('/src/assets/assetInfo.ts' + bust);
      const spec = PRO_GRAPHICS[input.graphic];
      const logo = input.mark
        ? {
          assetPath: input.mark.path,
          images: [{ path: input.mark.path, data: input.mark.data }],
          ...(await probeMark({ path: input.mark.path, data: input.mark.data })),
        }
        : null;
      const composed = composeGraphic(input.graphic, input.language, {
        lines: packageLines(input.graphic, { name: input.name, title: input.title, channel: null }),
        ...(spec.takesMark && logo ? { logo } : {}),
      });
      srcdoc = composeDocument(composed.template);
    }
    document.getElementById('taste-frame')?.remove();
    const frame = document.createElement('iframe');
    frame.id = 'taste-frame';
    frame.style.cssText = 'position:fixed;left:0;top:0;width:1920px;height:1080px;border:0;'
      + 'z-index:99999;background:#333;color-scheme:dark;';
    document.body.appendChild(frame);
    frame.srcdoc = srcdoc;
    await new Promise((resolve) => { frame.onload = resolve; });
    const win = frame.contentWindow;
    let playError = null;
    try {
      win.play();
    } catch (e) {
      playError = String(e?.message ?? e).slice(0, 200);
    }
    await win.document.fonts.ready;
    await new Promise((resolve) => setTimeout(resolve, 1800));
    const doc = frame.contentDocument;
    const markFieldId = (win.SPXGCTemplateDefinition?.DataFields ?? [])
      .find((f) => f.ftype === 'filelist')?.field ?? null;
    const markEl = markFieldId ? doc.getElementById(markFieldId) : null;
    const markRect = markEl?.getBoundingClientRect() ?? null;
    const taste = measureTaste(doc, { markFieldId });
    frame.remove();
    return {
      playError,
      markFieldId,
      // Rule 6's per-piece answer: the mark FIELD exists and paints something. A wordmark drawn
      // as text rather than placed as artwork is invisible to this and is stated as the limit it
      // is - the composer places every mark it places as a `filelist` field.
      markPresent: Boolean(markRect && markRect.width > 1 && markRect.height > 1),
      taste,
    };
  }, {
    html, css, js, assets,
    graphic: piece.graphic,
    language: context?.language ?? null,
    name: context?.name ?? null,
    title: context?.title ?? null,
    mark: context?.mark ?? null,
  });
  return { ...measured, source: piece.source, unresolvedAssets: unresolved };
}

const report = { capturedAt: new Date().toISOString(), rounds: [], rows: [] };
const loaded = [];
for (const dir of roundDirs) {
  loaded.push(JSON.parse(await readFile(path.resolve(dir, 'results.json'), 'utf8')));
}
const ids = SETS ? setIds(loaded[0], loaded[1]) : null;

for (let i = 0; i < roundDirs.length; i += 1) {
  const roundDir = roundDirs[i];
  const ledger = loaded[i];
  const letter = i === 0 ? 'A' : 'B';
  report.rounds.push({ dir: roundDir, route: ledger.route, capturedAt: ledger.capturedAt });
  console.log(`\n── ${roundDir} (${ledger.route}) ──`);
  for (const record of ledger.results ?? []) {
    if (record.skipped || record.error || !record.code) continue;
    const pieces = await piecesFor(roundDir, record);
    const saved = pieces.some((p) => p.source === 'recomposed')
      ? await languageFor(roundDir, record)
      : null;
    const context = saved
      ? { ...saved, mark: record.brand ? brandById.get(record.brand) ?? null : null }
      : null;
    const judged = [];
    for (const piece of pieces) {
      try {
        judged.push({ graphic: piece.graphic, ...(await judgePiece(piece, context)) });
      } catch (error) {
        judged.push({ graphic: piece.graphic, source: piece.source, error: String(error.message).slice(0, 200) });
      }
    }
    const usable = judged.filter((j) => !j.error);
    // Rule 6 is a property of a SET, so it is asked once per package and only when there IS a
    // package - a round that composed a single graphic has nothing to be inconsistent about.
    const packageMark = usable.length > 1
      ? await page.evaluate(async (pieceMarks) => {
        const { measurePackageMark } = await import('/src/ai/spike/tasteCheck.ts?t=' + Date.now());
        return measurePackageMark(pieceMarks);
      }, usable.map((j) => ({ graphic: j.graphic, present: j.markPresent })))
      : null;
    const row = {
      round: roundDir,
      blindId: record.blindId ?? null,
      setId: ids?.get(`${letter}:${record.slug}`) ?? null,
      slug: record.slug,
      brand: record.brand ?? null,
      languageName: record.language?.name ?? null,
      pieces: judged,
      packageMark,
    };
    report.rows.push(row);
    const codes = [
      ...judged.flatMap((j) => (j.taste?.findings ?? []).map((f) => `${j.graphic}:${f.code}`)),
      ...(packageMark?.findings ?? []).map((f) => f.code),
    ];
    const label = row.setId ?? row.blindId ?? row.slug;
    console.log(`  ${String(label).padEnd(8)} ${record.slug.padEnd(34)} ${codes.length ? codes.join(', ') : 'clean'}`);
  }
}

const outFile = path.resolve(OUT ?? path.join(roundDirs[0], 'taste.json'));
await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, `${JSON.stringify(report, null, 2)}\n`);

// ── The summary a reader can act on ───────────────────────────────────────────────────
const allPieces = report.rows.flatMap((r) => r.pieces.filter((p) => !p.error));
const count = (code) => report.rows.filter((r) => r.pieces
  .some((p) => (p.taste?.findings ?? []).some((f) => f.code === code))).length;
console.log(`\n── ${report.rows.length} rows, ${allPieces.length} pieces ──`);
console.log(`  rule 1 mark-off-centre    ${count('mark-off-centre')} rows`);
console.log(`  rule 4 legible-size-only  ${count('legible-size-only')} rows`);
// Rule 5 MINTS NO FINDING (owner, 2026-08-21: placement has no rule, it is a property of each
// design), so what it contributes is the arrangement and the width that allowed it - the numbers
// a PLACEMENT decision reads. `stacked` comes from the instrument rather than being re-derived
// against a floor this file would have to know.
const marked = allPieces.map((p) => p.taste?.markRow).filter(Boolean);
const stacked = marked.filter((m) => m.stacked);
if (marked.length) {
  console.log(`  rule 5 arrangement (reported, never judged): ${stacked.length} of ${marked.length}`
    + ' pieces stack the mark over the line, the rest stand it beside;'
    + ` band fill ${JSON.stringify(spread(stacked.map((m) => m.bandFill).filter((n) => n != null)))};`
    + ` ${stacked.filter((m) => (m.besideSlackPx ?? -1) >= 0).length} of the stacked ones had room beside`);
}
console.log(`  rule 6 package-mark-mixed ${report.rows.filter((r) => r.packageMark && !r.packageMark.consistent).length} rows`);
console.log('  rule 2 balance (reported, never judged) ',
  JSON.stringify(spread(allPieces.map((p) => p.taste?.markBalance?.balance).filter((n) => n != null))));
// Rule 3 reports and never judges, so what a reader needs is the DISTRIBUTION plus the one fact
// that decides whether this is a missing measurement or a disagreeing floor: was that smallest
// line already flagged on size alone?
const smallestReadings = allPieces.map((p) => p.taste?.secondaryType).filter(Boolean);
console.log('  rule 3 smallest informational px (reported, never judged) ',
  JSON.stringify(spread(smallestReadings.map((s) => s.smallestPx))));
console.log(`  rule 3 read on ${smallestReadings.length} of ${allPieces.length} pieces;`
  + ` ${smallestReadings.filter((s) => s.singleLine).length} carry a single informational size;`
  + ` ${smallestReadings.filter((s) => s.smallestFlaggedOnSize).length} already flagged on size alone`);
for (const role of ['primary', 'secondary']) {
  const rows = smallestReadings.filter((s) => s.smallestRole === role);
  if (!rows.length) continue;
  console.log(`    smallest line classed ${role}: ${rows.length} piece(s), `
    + JSON.stringify(spread(rows.map((s) => s.smallestPx)))
    + `, ${rows.filter((s) => s.smallestFlaggedOnSize).length} flagged`);
}
const broken = allPieces.filter((p) => p.unresolvedAssets?.length);
if (broken.length) console.log(`  ${broken.length} piece(s) had unresolvable artwork - mark rules under-report there.`);
const rebuilt = allPieces.filter((p) => p.source === 'recomposed').length;
if (rebuilt) {
  console.log(`  ${rebuilt} of ${allPieces.length} pieces were REBUILT from their saved language`
    + ' (that round predates the package surface, so its members were never saved as code).');
}
console.log(`\nWritten ${path.relative(process.cwd(), outFile)}`);

await browser.close();
