// THE SVG IMPORT SWEEP - does the SVG road work as advertised, on files designers really export?
//
// Why this exists: every SVG that had ever walked the import door was Illustrator-shaped and
// written for the feature. `docs/SVG_IMPORT_PLAN.md` §6 records the hardening measured against
// three exporters, but nothing in the repo WALKED a corpus door-to-export and printed a verdict.
// A feature the whole "students make their own graphics" goal stands on was therefore proven by
// two fixtures and a reading of the code.
//
// This is an INSTRUMENT, not a gate: it prints a scored table and exits 0 unless `--fail-on`
// says otherwise. The gate is `e2e/import-svg-corpus.spec.ts`, which pins the fixtures whose
// answers we have decided are correct. The sweep is where a new fixture is measured BEFORE
// anybody decides what its right answer is.
//
// WHAT IS MEASURED, per fixture, on the real app (no mocks, no direct module calls until the
// template exists):
//   door      - accepted, or refused with a message that teaches the fix
//   inventory - the size and text-layer count the door reports
//   mapping   - the rows offered, their labels, their samples, what is ticked
//   ladder    - which too-long-text answer the step defaults to (the owner's fit ladder)
//   fonts     - every family resolved, or warned about by name
//   create    - the project builds and the live preview paints without a console error
//   fidelity  - the inlined artwork still carries the source's drawn elements
//   export    - the export window opens and the gate calls the template valid
//
// Each fixture states its OWN expectation in a `.expect.json` sidecar written from the designer's
// promise (docs/SVG_AUTHORING.md), never from the importer's code - so a disagreement is a
// finding rather than a tautology.
//
// Usage (a dev server for THIS checkout must be running - `npm run dev:worktree`):
//   node scripts/svg-import-sweep.mjs                     # sweep the whole corpus
//   node scripts/svg-import-sweep.mjs --only figma        # one family, or one slug
//   node scripts/svg-import-sweep.mjs --json out.json     # every row, for diffing
//   node scripts/svg-import-sweep.mjs --shots dir         # a PNG of each created graphic
//   node scripts/svg-import-sweep.mjs --fail-on fail      # exit 1 on any FAIL row
//   node scripts/svg-import-sweep.mjs --base http://localhost:5186
//
// THE DEFAULT IS NOW THE RIGHT ANSWER, INCLUDING IN A WORKTREE. It used not to be: the only
// sanctioned way to get a server was the Claude preview harness, which does not serve a linked
// worktree at all, so `devPort()` (which reads this checkout's RESERVATION) and whatever was
// listening disagreed. That is how the 2026-08-29 run measured main's importer and reported it
// as the branch's. `npm run dev:worktree` closes it: the server it starts is bound to exactly
// the port `devPort()` returns here, so starting one and running this with no flags measures the
// tree you are editing. `--base` remains for a server somewhere else - another checkout, a
// preview deployment - and the run prints which of the two it used, so a report never again has
// to be reasoned about after the fact to find out what it measured.
//
// It drives Chromium over the app, so it is BROWSER WORK: run it through `npm run queue` like a
// suite, never beside one (AGENTS.md "Verifying changes" rule 3, scripts/command-match.mjs).
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, basename, dirname, resolve } from 'node:path';
import { devPort } from './dev-port.mjs';

const CORPUS = fileURLToPath(new URL('../e2e/fixtures/svg-corpus/', import.meta.url));
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..').replaceAll('\\', '/');

/** Is anything serving at `base`? A HEAD is enough: we only need "somebody is listening". */
async function answers(url) {
  try {
    await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
    return true;
  } catch {
    return false;
  }
}

const args = process.argv.slice(2);
const flag = (name) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] ?? null : null;
};
const only = flag('--only');
const jsonOut = flag('--json');
const shotsDir = flag('--shots');
const failOn = flag('--fail-on'); // 'fail' | 'partial'
const baseFlag = flag('--base');

/** Every fixture with a sidecar, in a stable order: family first, then slug. */
function corpus() {
  const files = readdirSync(CORPUS).filter((f) => f.endsWith('.expect.json'));
  const rows = files.map((f) => {
    const spec = JSON.parse(readFileSync(join(CORPUS, f), 'utf8'));
    return { ...spec, svg: join(CORPUS, `${spec.name}.svg`), sidecar: f };
  });
  rows.sort((a, b) => (a.family + a.name).localeCompare(b.family + b.name));
  return only ? rows.filter((r) => r.family === only || r.name === only) : rows;
}

/** Count the drawn elements of a source file, so the inlined copy can be checked against it.
 *  Regex rather than a parser on purpose: this counts what the FILE says, with no DOM in the
 *  way, and the inlined side is counted by the browser - two independent measurements. */
function drawnTags(markup) {
  // COMMENTS FIRST. Every fixture opens with a comment saying what the designer drew, and those
  // sentences name elements ("there is no <text> anywhere in this file"). Counted as markup they
  // invent losses that never happened, which is the one way an instrument is worse than none.
  const body = markup.replace(/<!--[\s\S]*?-->/g, '');
  const counts = {};
  for (const tag of ['text', 'rect', 'path', 'circle', 'ellipse', 'polygon', 'line', 'image', 'use']) {
    const m = body.match(new RegExp(`<${tag}[\\s/>]`, 'g'));
    if (m) counts[tag] = m.length;
  }
  return counts;
}

const NEXT = '.wz-modal .wz-next, .wz-modal button:has-text("Next")';

/** One fixture, door to export. Returns the measured row; never throws for a product failure -
 *  a crash IS a result and is recorded as one. */
async function walk(page, fixture, base) {
  const seen = { errors: [], notices: [] };
  const onConsole = (m) => {
    if (m.type() === 'error') seen.errors.push(m.text().slice(0, 300));
  };
  page.on('console', onConsole);
  page.on('pageerror', (e) => seen.errors.push(`pageerror: ${String(e).slice(0, 300)}`));

  const got = {
    name: fixture.name,
    family: fixture.family,
    exporter: fixture.exporter,
    accepted: null,
    refusal: null,
    size: null,
    textLayers: null,
    rows: [],
    ticked: 0,
    images: 0,
    outlines: 0,
    ladder: null,
    fonts: [],
    fontWarnings: [],
    notices: [],
    created: null,
    fidelity: null,
    exported: null,
    validation: null,
    consoleErrors: [],
  };

  try {
    await page.goto(`${base}/app`, { waitUntil: 'domcontentloaded' });
    await page.locator('.wz-modal').waitFor({ state: 'visible', timeout: 20_000 });
    await page.locator('[data-entry="import-graphic"]').click();
    await page.locator('.wz-drop input[type="file"]').setInputFiles(fixture.svg);

    // The door answers one of two ways, and both are a result.
    const card = page.getByTestId('import-svg-card');
    const refusal = page.getByTestId('import-drop-error');
    await Promise.race([
      card.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {}),
      refusal.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {}),
    ]);

    if (await refusal.isVisible().catch(() => false)) {
      got.accepted = false;
      got.refusal = (await refusal.textContent())?.replace(/^✗\s*/, '').trim() ?? '';
      return got;
    }
    if (!(await card.isVisible().catch(() => false))) {
      got.accepted = false;
      got.refusal = '(the door neither accepted nor refused it - nothing appeared)';
      return got;
    }

    got.accepted = true;
    const sizeText = (await card.locator('.mono').first().textContent()) ?? '';
    got.size = sizeText.trim();
    const layers = page.getByTestId('import-svg-layers');
    got.textLayers = (await layers.isVisible().catch(() => false))
      ? Number((((await layers.textContent()) ?? '').match(/(\d+) text layer/) ?? [])[1] ?? 0)
      : 0;
    const fontsLine = page.getByTestId('import-svg-fonts');
    if (await fontsLine.isVisible().catch(() => false)) {
      got.fonts = (((await fontsLine.textContent()) ?? '').split(':')[1] ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    // The importer's NOTICES: the sanitizer's removals, the flowed-text warning, the symbol note.
    // Told apart from the card's own lines by having NO testid - matching on words instead once
    // swallowed the outlined-text warning, because "No text layers here" contains "text layer".
    for (const p of await card.locator('p.hint:not([data-testid]), p.status-warn:not([data-testid])').all()) {
      const t = ((await p.textContent()) ?? '').trim();
      if (t) got.notices.push(t);
    }
    // The outlined-export answer is a card line WITH a testid, and it is a notice by every
    // measure that matters: it is the only thing said to a designer whose type came out as paths.
    const noLayers = page.getByTestId('import-svg-nolayers');
    if (await noLayers.isVisible().catch(() => false)) {
      got.notices.push(((await noLayers.textContent()) ?? '').trim());
    }

    await page.locator(NEXT).first().click();
    const map = page.getByTestId('map-svg-fields');
    const mapped = await map
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);

    if (mapped) {
      for (const row of await map.locator('[data-testid^="map-svg-row-"]').all()) {
        const id = ((await row.getAttribute('data-testid')) ?? '').replace('map-svg-row-', '');
        const on = await row.locator('input[type="checkbox"]').first().isChecked().catch(() => false);
        got.rows.push({
          id,
          label: (await row.locator(`[data-testid="map-svg-title-${id}"]`).inputValue().catch(() => '')) || '',
          sample: (await row.locator(`[data-testid="map-svg-sample-${id}"]`).inputValue().catch(() => '')) || '',
          on,
        });
        if (on) got.ticked += 1;
      }
      got.images = await page
        .getByTestId('map-svg-images')
        .locator('.map-svg-row')
        .count()
        .catch(() => 0);
      got.outlines = await page
        .getByTestId('map-svg-outlines')
        .locator('.map-svg-row')
        .count()
        .catch(() => 0);

      const mode = page.getByTestId('map-svg-stretch-mode');
      got.ladder = (await mode.isVisible().catch(() => false)) ? await mode.inputValue() : null;

      for (const warn of await page.locator('[data-testid^="map-svg-font-warn-"]').all()) {
        got.fontWarnings.push(((await warn.getAttribute('data-testid')) ?? '').replace('map-svg-font-warn-', ''));
      }
    }

    // Straight through Animation to Finish on the DEFAULTS - the defaults are the promise.
    await page.locator(NEXT).first().click();
    await page.locator(NEXT).first().click();
    const exportDoor = page.getByTestId('wz-finish-export');
    got.created = await exportDoor
      .waitFor({ state: 'visible', timeout: 30_000 })
      .then(() => true)
      .catch(() => false);

    if (got.created) {
      // FIDELITY: the artwork inlined into the built template still holds what the file drew.
      // Measured on the wizard's own live preview, which is the same document the export ships.
      const frame = page.frameLocator('.wz-side iframe');
      got.fidelity = await frame
        .locator('svg')
        .first()
        .evaluate((svg) => {
          const counts = {};
          for (const el of svg.querySelectorAll('*')) {
            const t = el.tagName.toLowerCase();
            counts[t] = (counts[t] ?? 0) + 1;
          }
          return counts;
        })
        .catch(() => null);

      if (shotsDir) {
        mkdirSync(shotsDir, { recursive: true });
        await page
          .locator('.wz-side iframe')
          .screenshot({ path: join(shotsDir, `${fixture.name}.png`) })
          .catch(() => {});
      }

      await exportDoor.click();
      const win = page.getByTestId('export-window');
      got.exported = await win
        .waitFor({ state: 'visible', timeout: 30_000 })
        .then(() => true)
        .catch(() => false);
      if (got.exported) {
        const ok = win.locator('.status-ok');
        got.validation = (await ok.isVisible().catch(() => false))
          ? ((await ok.first().textContent()) ?? '').trim()
          : ((await win.locator('.status-bad').first().textContent().catch(() => '')) ?? '').trim() ||
            '(no verdict shown)';
      }
    }
  } catch (e) {
    seen.errors.push(`walk: ${String(e).slice(0, 300)}`);
  } finally {
    page.off('console', onConsole);
  }

  got.consoleErrors = seen.errors.slice(0, 5);
  return got;
}

/** Score one measured row against what its designer expected. */
function score(fixture, got) {
  const want = fixture.expect ?? {};
  const problems = [];
  const soft = [];

  if (want.accepted === false) {
    if (got.accepted !== false) problems.push('imported a file it should have refused');
    else if (fixture.refusalAbout && !new RegExp(fixture.refusalAbout, 'i').test(got.refusal ?? '')) {
      soft.push(`refused, but the message never names "${fixture.refusalAbout}": ${got.refusal}`);
    }
    return { verdict: problems.length ? 'FAIL' : soft.length ? 'PARTIAL' : 'PASS', problems, soft };
  }

  if (got.accepted !== true) {
    problems.push(`refused a file that should import: ${got.refusal ?? '(no message)'}`);
    return { verdict: 'FAIL', problems, soft };
  }

  if (want.width && want.height) {
    const wantSize = `${want.width} × ${want.height}`;
    if (got.size !== wantSize) soft.push(`size read as "${got.size}", drawn as ${wantSize}`);
  }

  if (typeof want.textFields === 'number' && got.ticked !== want.textFields) {
    const line = `${got.ticked} text field${got.ticked === 1 ? '' : 's'} offered ON, designer expected ${want.textFields}`;
    (got.ticked === 0 && want.textFields > 0 ? problems : soft).push(line);
  }
  for (const [i, label] of (want.textLabels ?? []).entries()) {
    const actual = got.rows[i]?.label;
    if (actual !== label) soft.push(`row ${i + 1} labelled "${actual ?? '(none)'}", expected "${label}"`);
  }
  if (typeof want.imageFields === 'number' && got.images !== want.imageFields) {
    soft.push(`${got.images} picture rows, expected ${want.imageFields}`);
  }
  if (typeof want.outlineRows === 'number' && got.outlines !== want.outlineRows) {
    soft.push(`${got.outlines} outline rows, expected ${want.outlineRows}`);
  }
  if (want.growth !== undefined && want.growth !== null && got.ladder !== want.growth) {
    soft.push(`fit ladder defaults to "${got.ladder}", expected "${want.growth}"`);
  }
  for (const topic of want.noticeAbout ?? []) {
    const said = [...got.notices, ...got.fontWarnings].some((n) => new RegExp(topic, 'i').test(n));
    if (!said) soft.push(`no warning about "${topic}"`);
  }
  if ((want.noticeAbout ?? []).length === 0 && got.notices.length) {
    soft.push(`warned about something the designer expected no warning for: ${got.notices[0]}`);
  }

  if (got.created !== true) problems.push('the wizard never reached Finish - the project did not build');
  if (got.created && got.exported !== true) problems.push('the export door never opened');
  if (got.validation && !/valid and ready/i.test(got.validation)) {
    problems.push(`the export gate refused it: ${got.validation}`);
  }
  if (got.fidelity) {
    const src = drawnTags(readFileSync(fixture.svg, 'utf8'));
    for (const [tag, n] of Object.entries(src)) {
      // <use>/<image> are legitimately removed by the sanitizer, and a fixture that expects
      // that says so. TSPANS are not counted at all (neither side): binding a kerned headline
      // means `update()` writes the whole <text>'s textContent, which is exactly what the plan's
      // merged-field case specifies - the runs go, the line stays. Every other drawn tag
      // surviving is the verbatim promise.
      if (tag === 'use' || tag === 'image') continue;
      const kept = got.fidelity[tag] ?? 0;
      if (kept < n) soft.push(`${n - kept} of ${n} <${tag}> lost between the file and the artwork`);
    }
  }
  if (got.consoleErrors.length) soft.push(`console: ${got.consoleErrors[0]}`);

  return { verdict: problems.length ? 'FAIL' : soft.length ? 'PARTIAL' : 'PASS', problems, soft };
}

const base = (baseFlag ?? `http://localhost:${devPort()}`).replace(/\/+$/, '');
const rows = corpus();
if (!rows.length) {
  console.error(`No fixtures in ${CORPUS}${only ? ` matching "${only}"` : ''}.`);
  process.exit(1);
}

// SAY WHICH BUILD THIS MEASURES, before measuring it. A sweep against the wrong server produces
// a full, confident, well-formatted report of somebody else's importer, and every row in it looks
// exactly like a row about yours - which is what happened on 2026-08-29 and was only caught
// afterwards by reasoning about the harness (docs/backlog/svg-import-sweep-findings.md). One line
// of provenance at the top turns that from an inference into something the log records.
console.log(
  `Driving ${base}${baseFlag ? ' (--base)' : ` (this checkout's reserved port, ${repoRoot})`}`,
);

// And refuse when nothing is there. Without this the run spends its whole slot collecting
// ERR_CONNECTION_REFUSED and then reports every fixture as broken, which reads like the product
// failing rather than a missing server - a slot burned and a morning spent on a false alarm.
if (!(await answers(base))) {
  console.error(
    `Nothing is answering at ${base}, so there is no build to measure.\n` +
      'Start this checkout\'s server first: `npm run dev:worktree` (it prints the URL it serves, ' +
      'and refuses if that port is already taken), or pass `--base <url>` to drive one elsewhere. ' +
      '`node scripts/dev-port.mjs --base` prints this checkout\'s URL on its own.',
  );
  process.exit(1);
}

const browser = await chromium.launch();
const results = [];
for (const fixture of rows) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  const got = await walk(page, fixture, base);
  const scored = score(fixture, got);
  results.push({ ...fixture, svg: basename(fixture.svg), got, ...scored });
  const mark = scored.verdict === 'PASS' ? '✓' : scored.verdict === 'PARTIAL' ? '~' : '✗';
  console.log(`${mark} ${fixture.family.padEnd(11)} ${fixture.name}`);
  for (const p of scored.problems) console.log(`    FAIL    ${p}`);
  for (const s of scored.soft) console.log(`    note    ${s}`);
  await ctx.close();
}
await browser.close();

const tally = { PASS: 0, PARTIAL: 0, FAIL: 0 };
for (const r of results) tally[r.verdict] += 1;
console.log(
  `\n${results.length} fixtures — ${tally.PASS} pass, ${tally.PARTIAL} partial, ${tally.FAIL} fail`,
);

if (jsonOut) {
  writeFileSync(jsonOut, `${JSON.stringify(results, null, 2)}\n`);
  console.log(`Rows written to ${jsonOut}`);
}

if (failOn === 'fail' && tally.FAIL) process.exit(1);
if (failOn === 'partial' && (tally.FAIL || tally.PARTIAL)) process.exit(1);
