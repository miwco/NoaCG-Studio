import { test, expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// THE EXPORTER CORPUS - the SVG import road walked with files shaped the way Illustrator, Figma,
// Inkscape and Affinity really export, rather than the way this feature's own samples are written.
//
// Every case here was a WRONG ANSWER the importer gave on 2026-08-28, found by sweeping
// `e2e/fixtures/svg-corpus/` through the real door (`scripts/svg-import-sweep.mjs`) and scoring
// each file against what the designer who drew it expects (docs/SVG_AUTHORING.md), never against
// the importer's own code. The sweep is the instrument and reports; this spec is the gate.
//
// The fixtures and their `.expect.json` sidecars are documented in
// `e2e/fixtures/svg-corpus/README.md`. Files whose answer is still a FINDING stay in the corpus
// as the repro and are deliberately NOT pinned here - see
// `docs/backlog/svg-import-sweep-findings.md`.

const fixture = (slug: string) =>
  fileURLToPath(new URL(`fixtures/svg-corpus/${slug}.svg`, import.meta.url));

/** Drop a corpus file on the Import door and land on the mapping step. */
async function mapCorpusFile(page: Page, slug: string) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="import-graphic"]').click();
  await page.locator('.wz-drop input[type="file"]').setInputFiles(fixture(slug));
  await expect(page.getByTestId('import-svg-card')).toBeVisible();
  await page.locator('.wz-next').click();
  await expect(page.getByTestId('map-svg-fields')).toBeVisible();
}

/** Drop a corpus file on the Import door and stop on the card, which is where the size is
 *  reported - the mapping step is one click too far to read it. */
async function dropCorpusFile(page: Page, slug: string) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="import-graphic"]').click();
  await page.locator('.wz-drop input[type="file"]').setInputFiles(fixture(slug));
}

/** The labels the mapping step offers, in document order. */
async function labels(page: Page): Promise<string[]> {
  const rows = page.getByTestId('map-svg-fields').locator('[data-testid^="map-svg-row-"]');
  const out: string[] = [];
  for (const row of await rows.all()) {
    const id = ((await row.getAttribute('data-testid')) ?? '').replace('map-svg-row-', '');
    out.push(await row.locator(`[data-testid="map-svg-title-${id}"]`).inputValue());
  }
  return out;
}

/** Straight through Animation to Finish on the DEFAULTS, then out the export door: the gate's
 *  own verdict is the only proof that a corpus file really is playable, not merely readable. */
async function exportsClean(page: Page) {
  await page.locator('.wz-next').click(); // Animation
  await page.locator('.wz-next').click(); // Finish
  await page.getByTestId('wz-finish-export').click();
  const win = page.getByTestId('export-window');
  await expect(win).toBeVisible({ timeout: 30_000 });
  await expect(win.locator('.status-ok')).toContainText('valid and ready to export');
}

test('corpus: a KERNED Illustrator headline is one field, and the licensed face warns by name', async ({ page }) => {
  // Illustrator hand-kerns by splitting a line into <tspan> runs with their own x. They are one
  // line of type, not four fields, and the measured GAP is the only thing that says so.
  await mapCorpusFile(page, 'illustrator-kerned-headline');
  expect(await labels(page)).toEqual(['Headline', 'Subtitle']);
  await expect(page.getByTestId('map-svg-sample-t0')).toHaveValue('WORLD REPORT');

  // Gotham is neither bundled nor on Google, so it warns and continues - and the two PostScript
  // faces beside it resolve, rather than warning about a family this project ships.
  await expect(page.getByTestId('map-svg-font-warn-Gotham-Bold')).toBeVisible();
  await expect(page.getByTestId('map-svg-font-ok-Inter-Regular')).toBeVisible();
  await exportsClean(page);
});

test('corpus: a Figma board is labelled with the designer\'s names, not Figma\'s own', async ({ page }) => {
  // Figma auto-names a text layer after the words in it (`<text id="Amsterdam">`) and wraps
  // things in frames it names itself (`<g id="Frame 21">`). Both used to beat the name the
  // designer typed one level up, so an operator's field for the D answer read "Reykjavik" - the
  // very word they were about to replace - and another read "Frame 21".
  await mapCorpusFile(page, 'figma-nested-frames-quiz-board');
  expect(await labels(page)).toEqual(['Question', 'Answer A', 'Answer B', 'Answer C', 'Answer D']);
  await expect(page.getByTestId('map-svg-sample-t4')).toHaveValue('Reykjavik');
  await exportsClean(page);
});

test('corpus: Affinity\'s serif:id spells the label, and a shifted viewBox origin still imports', async ({ page }) => {
  // Affinity Designer sanitizes the layer name into `id` ("Answer-A") and keeps the spelling the
  // designer typed in `serif:id` ("Answer A") - the same trick as Illustrator's `data-name` and
  // Inkscape's `inkscape:label`. The artboard is drawn around 0,0 with viewBox="-960 -540 …".
  await mapCorpusFile(page, 'origin-shifted-quiz-board');
  expect(await labels(page)).toEqual(['Question', 'Answer A', 'Answer B', 'Answer C', 'Answer D']);
  await exportsClean(page);
});

test('corpus: text on an Inkscape path binds, labelled from its layer and not from a serial id', async ({ page }) => {
  // The run inside <textPath> is what binds (the <text> around it has no words of its own), and
  // Inkscape's generated `textPath6` is not a name - the labelled layer above it is.
  await mapCorpusFile(page, 'inkscape-text-on-path-bumper');
  expect(await labels(page)).toEqual(['Headline', 'Subtitle']);
  await expect(page.getByTestId('map-svg-sample-t0')).toHaveValue('CHAMPIONS');
  await expect(page.getByTestId('map-svg-font-warn-DejaVu Sans')).toBeVisible();
  await exportsClean(page);
});

test('corpus: a script and an internet reference are removed, said out loud, and the rest imports', async ({ page }) => {
  // Imported SVG is untrusted input entering previews and exports (plan §5). The file also has
  // two real text layers, and losing them along with the script would be its own failure.
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="import-graphic"]').click();
  await page.locator('.wz-drop input[type="file"]').setInputFiles(fixture('effects-external-ref-and-script'));

  const card = page.getByTestId('import-svg-card');
  await expect(card).toContainText('Script code inside the SVG was removed');
  await expect(card).toContainText('References to files on the internet were removed');
  await page.locator('.wz-next').click();
  await expect(page.getByTestId('map-svg-fields')).toBeVisible();
  expect(await labels(page)).toEqual(['Kicker', 'Sponsor']);
  await exportsClean(page);
});

test('corpus: a compound PostScript weight resolves, and symbol text says why it cannot be a field', async ({ page }) => {
  // `Archivo-SemiBold` is the bundled Archivo at 600. Read word by word the suffix splits into
  // "semi" + "bold", "semi" is not a weight, and the whole name stopped reading as a face - so
  // the import warned "not available" about a family this project ships. Illustrator writes
  // SemiBold, ExtraBold and UltraLight exactly this way.
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="import-graphic"]').click();
  await page.locator('.wz-drop input[type="file"]').setInputFiles(fixture('effects-symbol-library-ticker'));

  // A <use> paints a COPY of a symbol, so binding the original is a promise the import cannot
  // keep - and saying nothing would leave a designer hunting for a field that can never exist.
  await expect(page.getByTestId('import-svg-card')).toContainText('reusable symbol');
  await page.locator('.wz-next').click();
  await expect(page.getByTestId('map-svg-fields')).toBeVisible();
  await expect(page.getByTestId('map-svg-font-ok-Archivo-SemiBold')).toBeVisible();
  await expect(page.locator('[data-testid^="map-svg-font-warn-"]')).toHaveCount(0);
  expect(await labels(page)).toEqual(['Story', 'Source']);
  await exportsClean(page);
});

test('corpus: a quiz board\'s hidden state layers are drawn, and never offered as fields', async ({ page }) => {
  // §5b tells the student to draw each moment on its own layer and click the eye off, so which
  // hiding IDIOMS are understood is load-bearing for the quiz. The corpus proved exactly one:
  // Illustrator's class="st12" beside a .st12{display:none} rule. Inkscape - the free tool a
  // school installs - writes style="display:none" on the layer itself instead, and this board
  // has two hidden layers carrying WORDS ("LOCKED IN", "+1") plus one switched off the other
  // way the same attribute allows, visibility:hidden. Miss either form and the operator gets
  // seven fields, two of which type into a stamp nobody can see.
  await mapCorpusFile(page, 'inkscape-hidden-state-layers-quiz');
  expect(await labels(page)).toEqual(['Question', 'Answer A', 'Answer B', 'Answer C', 'Answer D']);
  await exportsClean(page);
});

test('corpus: a positioned embedded picture is a picture field', async ({ page }) => {
  // The control for sweep finding 2. Figma writes a placed raster as a <rect fill="url(#pattern)">
  // whose pattern <use>s an <image> parked in <defs>, and no picture row opens for it. Illustrator
  // writes the plain positioned <image> the spec describes, for the same design and the same
  // intent - so this case is what says the picture road WORKS and Figma's indirection is what
  // hides it, rather than pictures being broken everywhere.
  await mapCorpusFile(page, 'illustrator-embedded-image-card');
  expect(await labels(page)).toEqual(['Guest name', 'Guest role']);
  await expect(page.getByTestId('map-svg-images').locator('.map-svg-row')).toHaveCount(1);
  await exportsClean(page);
});

test('corpus: two exporter envelopes are stripped, said out loud, and the drawing survives', async ({ page }) => {
  // Both removals reach INSIDE the artwork rather than around it, which is what makes them
  // worth a gate: the SMIL elements are children of the circle and rect they animate and the
  // first child of the group holding everything, and the foreignObject is the first branch of
  // a <switch> whose SECOND branch is the whole drawing. Taking the artwork down with either
  // would be a silent loss.
  for (const [slug, says, fields] of [
    ['effects-smil-animated-bug', 'animation', ['Station', 'Strap']],
    ['illustrator-save-as-foreignobject', 'foreignObject', ['Name', 'Role']],
  ] as const) {
    await test.step(slug, async () => {
      await dropCorpusFile(page, slug);
      await expect(page.getByTestId('import-svg-card')).toContainText(says);
      await page.locator('.wz-next').click();
      await expect(page.getByTestId('map-svg-fields')).toBeVisible();
      expect(await labels(page)).toEqual([...fields]);
    });
  }
});

test('corpus: an internet reference hiding inside a <style> block is removed too', async ({ page }) => {
  // Every other external reference in the corpus is on an href, which an attribute scan sees.
  // A pasted @import and a url(https://) live in a declaration block instead, and an exported
  // graphic that fetches a stylesheet on air fails only on the playout machine and only when
  // the network is down - the worst possible place to find out.
  await dropCorpusFile(page, 'effects-css-import-webfont');
  await expect(page.getByTestId('import-svg-card')).toContainText('References to files on the internet were removed');
});

test('corpus: a file broken by one character is refused by a message that names the character', async ({ page }) => {
  // An SVG is XML, so a bare & from a pasted web address stops the document being readable.
  // The file really is unimportable and should stay refused; what is pinned here is the
  // SENTENCE. "Damaged, or not an SVG at all" points at the export and sends someone back to
  // re-make a file that was never the problem, when the parser already knows the line, the
  // column and the reason.
  await dropCorpusFile(page, 'geometry-unescaped-ampersand');
  const refusal = page.getByTestId('import-drop-error');
  await expect(refusal).toBeVisible();
  await expect(refusal).toContainText('&');
  await expect(refusal).toContainText('line');
});

test('corpus: a print-unit page arrives at its real pixel size, in millimetres and in points', async ({ page }) => {
  // Inkscape defaults new documents to MILLIMETRES and every print-first tool (Affinity,
  // CorelDRAW) defaults to millimetres or points, so a full 1280 × 720 page states itself as
  // width="338.66666mm" or width="960pt" with a viewBox carrying that same number - the user
  // unit IS the physical one. Read as pixels those are 339 × 191 and 960 × 540, and a whole
  // design lands on the frame as a postage stamp with nothing saying so (sweep finding 3).
  // Both units, because a conversion that knows only about mm passes the first and fails the
  // second while looking exactly as fixed.
  for (const slug of ['inkscape-millimetre-scorebug', 'affinity-point-sized-nameplate']) {
    await test.step(slug, async () => {
      await dropCorpusFile(page, slug);
      const card = page.getByTestId('import-svg-card');
      await expect(card).toBeVisible();
      await expect(card.locator('.mono').first()).toHaveText('1280 × 720');
    });
  }
});

test('corpus: a percentage is not a size, and a print size on a big drawing does not rescale it', async ({ page }) => {
  // The two guards on the conversion above, and the reason it tests the viewBox against the
  // stated number rather than simply preferring width/height. A "responsive SVG" edit leaves
  // width="100%", which parses as the number 100 and means nothing - reading it would put every
  // field position out by a factor of nineteen while reporting a plausible size.
  await dropCorpusFile(page, 'geometry-percent-viewport-strap');
  await expect(page.getByTestId('import-svg-card').locator('.mono').first()).toHaveText('1920 × 1080');
});

// ── THE LADDER ANSWER EVERY CORPUS FILE ARRIVES ON ─────────────────────────────────────────
// Each sidecar states the too-long answer its designer should be offered, written from
// docs/SVG_AUTHORING.md rather than from the importer. That column had only the SWEEP reading
// it, which is an instrument nobody runs on a commit - so the day the measured default changed,
// twenty-two stated expectations could go stale in silence. This is the gate for it.
//
// It stops at the mapping step on purpose: the answer is a reading of the ARTWORK, and creating
// and exporting each file is what the cases above already do.
// Sweep finding 5 (docs/backlog/svg-import-sweep-findings.md): four files read as banners to the
// measured default and are not. The owner ruled that growing is the right default where the
// geometry is unambiguous and the author changes it in one click, so the finding stands open and
// these four are the repro rather than a pinned answer - the same rule this file's header states.
// The list was FOUR until this gate ran: `inkscape-flowed-text-card` and
// `student-illustrator-quiz` default to growing too, and nothing was reading the column, so the
// finding under-counted its own repros. Both are the same shape as the four it did name.
const GROWTH_FINDINGS = [
  'effects-figma-masked-reveal',
  'figma-nested-frames-quiz-board',
  'inkscape-flowed-text-card',
  'nested-svg-sub-artboard',
  'student-illustrator-quiz',
  'ticker-strip-3840',
];

test('corpus: every file arrives on the too-long answer its sidecar states', async ({ page }) => {
  test.slow(); // fifteen walks through the import door
  const dir = fileURLToPath(new URL('fixtures/svg-corpus/', import.meta.url));
  const sidecars = readdirSync(dir)
    .filter((f) => f.endsWith('.expect.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as {
      name: string;
      expect: { accepted: boolean; textFields: number; growth?: string | null };
    })
    // A file with no bound text has no ladder to arrive on: an OUTLINED export lands on the
    // honest re-export answer instead of the checklist, and there is no control there to read.
    .filter(
      (s) =>
        s.expect.accepted &&
        s.expect.growth &&
        s.expect.textFields > 0 &&
        !GROWTH_FINDINGS.includes(s.name),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  expect(sidecars.length).toBeGreaterThan(12);

  const wrong: string[] = [];
  for (const s of sidecars) {
    // One step per file, so a walk that dies names the file it died on rather than a line in a
    // shared helper.
    await test.step(s.name, async () => {
      await mapCorpusFile(page, s.name);
      const got = await page.getByTestId('map-svg-stretch-mode').inputValue();
      if (got !== s.expect.growth) wrong.push(`${s.name}: stated ${s.expect.growth}, got ${got}`);
    });
  }
  expect(wrong).toEqual([]);
});
