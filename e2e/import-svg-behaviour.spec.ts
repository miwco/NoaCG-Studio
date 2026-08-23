import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import nodePath from 'node:path';
import JSZip from 'jszip';
import { settleDurableWrites } from './_durable';
import { relayServe, routeOrigin } from './_relay';
import { bindEveryTextLayer, dropSvg, intoProduction, QUIZ_SVG, SCOREBUG_SVG } from './_svg-import';

// IMPORTED ARTWORK THAT BEHAVES (docs/GRAPHIC_BEHAVIOUR_PLAN.md).
//
// The two September cases, each walked the way a person walks it: drop the SVG on the Import
// door, map it, add it to a production, and drive it from the operator's own controls.
//
//  1. THE SCOREBOARD needs no behaviour at all, and this spec exists partly to keep that true.
//     A numeric SVG layer becomes an `ftype: number` field, and every control surface renders a
//     number field as a ± stepper with no per-template code (src/control/controlModel.ts). The
//     assertions below are therefore about the GENERIC pipeline: the stepper reaches the live
//     cue, a bump is a partial single-field update (so the entrance never replays), and the
//     figure survives a reload.
//  2. THE QUIZ is the pilot. Its machine and its buttons are the catalog answer board's, reused;
//     what is new is that the drawn STATES are the designer's own layers, shown and hidden by
//     the machine. The assertions reach inside the on-air renderer and read which of those
//     layers is actually lit.
//
// Both fixtures are the SHIPPED SAMPLES (docs/svg-samples/) rather than copies: the files a
// designer is handed are the files the tests walk, so the two cannot drift.


/**
 * FRAMES FOR A HUMAN, off by default.
 *
 * `NOACG_SHOTS=<dir> npx playwright test import-svg-behaviour` writes one PNG per beat of the
 * walk there. A green assertion says the class is on the right layer; it does not say the board
 * LOOKS right, and this pilot's whole question is what a state looks like on somebody else's
 * artwork — so the frames exist to be looked at, and the suite stays fast when nobody is.
 */
const SHOTS = process.env.NOACG_SHOTS ?? '';
async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
}

/** The offline walk starts from a cold /app; the live one arrives already signed in, which is
 *  why the shared helper does not navigate. */
async function openImportDoor(page: Page, fixture: string) {
  await page.goto('/app');
  await dropSvg(page, fixture);
}

test('imported scoreboard: a numeric layer is a ± stepper that acts on air, and survives a reload', async ({ page }) => {
  await openImportDoor(page, SCOREBUG_SVG);

  await bindEveryTextLayer(page);
  await expect(page.getByTestId('map-svg-fields')).toContainText('7 of 7');

  await shot(page, '1-scoreboard-mapping');
  await intoProduction(page, 'Match scorebug', 'Saturday Match');
  await settleDurableWrites(page);

  // The scores arrived as NUMBER fields, so the panel offers them as steppers — the generic
  // control model doing it, with nothing in this template asking for it.
  const live = page.getByTestId('live-numbers');
  await expect(live).toContainText('Home score');
  await expect(live).toContainText('Away score');

  await page.getByTestId('verb-take').click();
  await expect(page.getByTestId('action-log')).toContainText('Took');

  // Two up, one down, from the LIVE controls.
  const homePlus = live.getByTestId('live-number-f1-up');
  const awayMinus = live.getByTestId('live-number-f2-down');
  await homePlus.click();
  await homePlus.click();
  await awayMinus.click();

  const home = page.getByTestId('cue-field-f1');
  const away = page.getByTestId('cue-field-f2');
  await shot(page, '2-scoreboard-bumped');
  await expect(home).toHaveValue('4'); // drawn as 2
  await expect(away).toHaveValue('0'); // drawn as 1

  // THE ENTRANCE MUST NOT REPLAY. A bump is a partial update carrying one field, so the log
  // records updates and nothing else — one "Played in" for the take, and no second one.
  // Scoped to the ROWS: the collapsed summary repeats the newest line, so an unscoped text
  // match counts the latest entry twice.
  const log = page.getByTestId('action-log-row');
  await expect(log.filter({ hasText: 'Updated 1 field' })).toHaveCount(3);
  await expect(log.filter({ hasText: 'Played in' })).toHaveCount(1);

  // And the figures are the production's, not the session's. A bump edits the cue DRAFT, which
  // flushes into the Show record on a 300 ms idle (ProductionPage `editDraft`) — so the wait is
  // for the debounce first and the disk second, exactly as production-persistence.spec.ts does.
  // Reloading inside that window is what a dropped laptop does, and the score would be the
  // aired one rather than the stored one.
  await page.waitForTimeout(300);
  await settleDurableWrites(page);
  await page.reload();
  await expect(page.getByTestId('cue-field-f1')).toHaveValue('4');
  await expect(page.getByTestId('cue-field-f2')).toHaveValue('0');
});

test('imported quiz: drawn layers are proposed from their names, and the operator drives select → lock → reveal', async ({ page }) => {
  await openImportDoor(page, QUIZ_SVG);

  // THE PROPOSAL (draft.ts proposeQuizBinding): a designer who named layers the obvious way
  // opens this step with every picker already filled. It is an accelerator, never a gate —
  // each of these is a select the author can change.
  const behaviour = page.getByTestId('map-svg-behaviour');
  await expect(behaviour).toBeVisible();
  await expect(page.getByTestId('map-svg-behaviour-kind')).toHaveValue('quiz');
  await expect(page.getByTestId('map-svg-quiz-count')).toHaveValue('4');
  for (const [at, letter] of ['A', 'B', 'C', 'D'].entries()) {
    await expect(page.getByTestId(`map-svg-quiz-answer-${at}`)).toContainText(`Answer ${letter}`);
    // The drawn states, matched by letter and state word off the layer NAMES.
    for (const state of ['selected', 'correct', 'wrong']) {
      const picker = page.getByTestId(`map-svg-quiz-${state}-${at}`);
      await expect(picker.locator('option:checked')).toContainText(`${letter} ${state === 'selected' ? 'selected' : state}`);
    }
  }
  await expect(page.getByTestId('map-svg-quiz-locked').locator('option:checked')).toContainText('Locked in');

  await shot(page, '3-quiz-mapping');
  await intoProduction(page, 'Olympics quiz', 'Quiz Night');
  await settleDurableWrites(page);

  // THE BUTTONS ARE THE MACHINE'S. Nothing here is declared per template: every operator event
  // an arrow carries became a button, and the audience event — whose branch this pilot drops —
  // is simply absent rather than dead.
  const actions = page.getByTestId('cue-actions');
  await expect(actions).toContainText('Select answer');
  await expect(actions).toContainText('Lock it in');
  await expect(actions).toContainText('Reveal correct');
  await expect(actions).not.toContainText('audience');

  // Set the answer key and the pick, then take it to air.
  // Few enough options that the control model renders a segmented picker rather than a select.
  await page.getByTestId('cue-field-f5-opt-C').click();
  await page.getByTestId('cue-field-f6-opt-B').click();
  await page.getByTestId('verb-take').click();
  await expect(page.getByTestId('action-log')).toContainText('Took');

  // The PROGRAM renderer is what the audience sees. `frameLocator` reaches into it through CDP
  // even though the iframe carries no allow-same-origin (see e2e/_frame.ts).
  const air = page.frameLocator('[data-testid="program-stage"] iframe');
  const lit = () => air.locator('.imported-design-qstate.imported-design-qon');

  await page.getByRole('button', { name: /Select answer/ }).click();
  await expect(lit()).toHaveCount(1);
  await expect(air.locator('#q-sel-2')).toHaveClass(/imported-design-qon/);
  await shot(page, '4-quiz-selected');

  await page.getByRole('button', { name: /Lock it in/ }).click();
  await expect(air.locator('#q-lock')).toHaveClass(/imported-design-qon/);
  // The pick stays up through the lock — two states showing, which is the moment itself.
  await expect(air.locator('#q-sel-2')).toHaveClass(/imported-design-qon/);
  await shot(page, '5-quiz-locked');

  await page.getByRole('button', { name: /Reveal correct/ }).click();
  // C is the key: its row lights, the other three take the wrong treatment.
  await expect(air.locator('#q-cor-3')).toHaveClass(/imported-design-qon/);
  for (const row of [1, 2, 4]) {
    await expect(air.locator(`#q-wrong-${row}`)).toHaveClass(/imported-design-qon/);
  }
  await expect(air.locator('#q-cor-1')).not.toHaveClass(/imported-design-qon/);
  await shot(page, '6-quiz-revealed');
});

test('imported quiz: the behaviour survives the export and runs standalone from a file', async ({ page }, testInfo) => {
  // EXPORT IS WHERE AN IMPORTED GRAPHIC STOPS BEING OURS. Everything above runs inside the app;
  // this asserts the same board works as a folder on a playout machine, with no NoaCG around it.
  // Driven over file:// on purpose — the trap this catches is a reference that silently resolves
  // in the dev server and dangles on disk (docs/VERIFICATION.md).
  await openImportDoor(page, QUIZ_SVG);
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden({ timeout: 20_000 });

  await page.getByTestId('dock-tab-export').click();
  await page.locator('.issue', { hasText: 'CasparCG export' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Validate & download/ }).click(),
  ]);
  const zip = await JSZip.loadAsync(readFileSync(await download.path()));

  // The graphic's own HTML, whatever the package called the folder.
  const htmlPath = Object.keys(zip.files).find((n) => n.endsWith('.html') && !n.includes('controlpanel'))!;
  expect(htmlPath).toBeTruthy();
  const html = await zip.file(htmlPath)!.async('string');

  // THE DRAWN STATES TRAVELLED: the designer's layers, our ids, the rules that hide them, and
  // the paint that shows them — all inside the one file.
  for (const id of ['q-sel-1', 'q-sel-2', 'q-sel-3', 'q-sel-4', 'q-cor-3', 'q-wrong-1', 'q-lock']) {
    expect(html).toContain(`id="${id}"`);
  }
  expect(html).toContain('.imported-design-qstate');
  expect(html).toContain('function revealAnswer');
  // THE MACHINE TRAVELLED: it lives in the template's own data block, so the arcs and their
  // operator events are in the file rather than in a registry the playout machine cannot ask.
  expect(html).toContain('"machine"');
  for (const event of ['select', 'lock', 'judge']) expect(html).toContain(`"event": "${event}"`);

  // Unpack the whole package and run the graphic the way CasparCG does: as a local file.
  const dir = testInfo.outputPath('caspar');
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const target = nodePath.join(dir, name);
    mkdirSync(nodePath.dirname(target), { recursive: true });
    writeFileSync(target, await entry.async('nodebuffer'));
  }
  // Listening BEFORE the navigation, or the check could never fire — which is the shape of a
  // guard that passes for the wrong reason.
  const missing: string[] = [];
  page.on('requestfailed', (r) => missing.push(r.url()));
  await page.goto(pathToFileURL(nodePath.join(dir, htmlPath)).href);

  const lit = () => page.locator('.imported-design-qstate.imported-design-qon');
  await page.evaluate(() => {
    const w = window as unknown as { play?: () => void; update?: (d: string) => void };
    w.play?.();
    w.update?.(JSON.stringify({ f5: 'C', f6: 'B' }));
  });
  // Nothing is lit until a state says so — the entrance is not a verdict.
  await expect(lit()).toHaveCount(0);

  const fire = (event: string) =>
    page.evaluate((e) => {
      (window as unknown as { noacgDispatch?: (n: string) => void }).noacgDispatch?.(e);
    }, event);

  await fire('select');
  await expect(page.locator('#q-sel-2')).toHaveClass(/imported-design-qon/);
  await fire('lock');
  await expect(page.locator('#q-lock')).toHaveClass(/imported-design-qon/);
  await fire('judge');
  await expect(page.locator('#q-cor-3')).toHaveClass(/imported-design-qon/);
  await expect(page.locator('#q-wrong-1')).toHaveClass(/imported-design-qon/);
  await shot(page, '7-quiz-exported-standalone');

  // Nothing reached for the network or for a file the package does not carry.
  expect(missing).toEqual([]);
});

test('imported board: copy the design cannot hold is WARNED about on the cue editor, never clipped', async ({ page }) => {
  // THE SECOND HALF OF THE OWNER'S FIT RULING (2026-08-23, docs/SVG_IMPORT_PLAN.md §3): a value
  // longer than the design was drawn for fills the panel, wraps into the room the artwork has
  // and shrinks to the readability floor - and past that it is WARNED ABOUT, never cut and never
  // allowed to reshape the artwork. The ladder shipped with only the first half built: the
  // runtime knew (noacgTextOverflow()) and no operator surface read it, so a too-long title
  // floored at 55% and ran off the board with nothing said before air.
  //
  // The warning is measured on the CUE EDITOR because that is where the value is typed. It comes
  // from the PREVIEW monitor's own report - the rendered graphic is the only thing that can
  // answer whether copy fits, which is why no source check stands in for this.
  await openImportDoor(page, QUIZ_SVG);
  await intoProduction(page, 'Overflow quiz', 'Warning Night');
  await settleDurableWrites(page);

  const question = page.getByTestId('cue-field-f0');
  const note = page.getByTestId('cue-overflow');

  // A question the board holds says nothing. The guard has to be verified quiet before it is
  // verified loud, or "it warns" would also be true of a surface that always warns.
  await question.fill('Which city hosted the first modern Olympics?');
  await expect(note).toHaveCount(0);
  await expect(page.getByTestId('cue-field-over-f0')).toHaveCount(0);

  // …and one no size can hold does. 400 characters is the value the ladder floors at 55% of the
  // drawn size (e2e/import-svg.spec.ts measures that end of it); here the claim is that the
  // operator is TOLD, in the box they are typing into and once at the top of the editor.
  await question.fill('A'.repeat(400));
  await expect(note).toContainText('too long for the design');
  await expect(note).toContainText('Question');
  await expect(page.getByTestId('cue-field-over-f0')).toBeVisible();
  await shot(page, '8-overflow-warned');

  // The copy is whole in the graphic - warned about, not trimmed to make the warning go away.
  const air = page.frameLocator('[data-testid="production-preview"] iframe');
  await expect(air.locator('#f0')).toHaveText('A'.repeat(400));

  // Shortening it clears the warning, so it tracks the value rather than latching on the cue.
  await question.fill('Which city?');
  await expect(note).toHaveCount(0);
  await expect(page.getByTestId('cue-field-over-f0')).toHaveCount(0);
});

test('imported board: the EXPORTED CONTROLLER carries the same warning, in the same words', async ({ page, context }) => {
  test.setTimeout(180_000);
  // PARITY IS THE POINT (docs/CONTROL_PANEL_PARITY.md §4): a warning only the in-app cockpit
  // shows is a warning a class operating from the exported package never sees, and the package
  // is the surface a show drops to when the network dies. This page ships without React, so its
  // copy of the sentence is BAKED from the same constants (controlModel.ts) rather than written
  // again - and only a driven controller can prove the baked half actually paints.
  //
  // It reads its own PREVIEW monitor: those frames are ordinary same-origin pages the controller
  // built, so the answer comes from the running graphic exactly as it does in the app.
  await openImportDoor(page, QUIZ_SVG);
  await intoProduction(page, 'Overflow quiz', 'Relay Night');
  await page.getByTestId('cue-field-f0').fill('A'.repeat(400));
  await expect(page.getByTestId('cue-overflow')).toContainText('too long for the design');
  await settleDurableWrites(page);

  const b64 = await page.evaluate(async (production) => {
    const shows = await import('/src/model/shows.ts');
    const { buildShowZipFor } = await import('/src/export/showExport.ts');
    const fresh = shows.loadShows().find((s) => s.name === production)!;
    const zip = await buildShowZipFor(fresh, 'html-overlay');
    return zip.generateAsync({ type: 'base64' });
  }, 'Relay Night');

  const zip = await JSZip.loadAsync(b64, { base64: true });
  const files = new Map<string, string>();
  for (const n of Object.keys(zip.files)) {
    // The package folder is named after the production, not a fixed slug. Text files only -
    // the relay helper serves strings, and a single-file overlay carries its assets inline.
    if (!zip.files[n].dir && /\.(html|json)$/.test(n)) {
      files.set(n.replace(/^[^/]+\//, ''), await zip.file(n)!.async('string'));
    }
  }
  const { serve } = relayServe(files);
  const origin = 'http://relay-overflow.local';

  const ctl = await context.newPage();
  await routeOrigin(ctl, origin, serve);
  await ctl.goto(`${origin}/controller.html`, { waitUntil: 'load' });

  // Nothing is on PREVIEW yet, so nothing is claimed. Quiet before loud, here too.
  await expect(ctl.locator('#ed-over')).toBeHidden();

  await ctl.locator('.cue').first().click();
  await ctl.locator('#v-preview').click();
  await expect(ctl.frameLocator('#stage-pvw iframe').locator('#f0')).toHaveText('A'.repeat(400), {
    timeout: 10_000,
  });

  // …and once the graphic is up with the copy it cannot hold, the operator is told - by the
  // summary and by the box, the same two places the app says it.
  await expect(ctl.locator('#ed-over')).toContainText('too long for the design', { timeout: 10_000 });
  await expect(ctl.locator('.field-over .over-mark')).toBeVisible();
  await shot(ctl, '9-overflow-warned-controller');
});
