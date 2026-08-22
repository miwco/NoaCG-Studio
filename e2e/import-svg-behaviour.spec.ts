import { test, expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { settleDurableWrites } from './_durable';

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

const SCOREBUG = fileURLToPath(new URL('../docs/svg-samples/scorebug.svg', import.meta.url));
const QUIZ = fileURLToPath(new URL('../docs/svg-samples/quiz-board.svg', import.meta.url));

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

/** Drop a file on the Import door and land on the SVG mapping step. */
async function dropSvg(page: Page, fixture: string) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="import-graphic"]').click();
  await page.locator('.wz-drop input[type="file"]').setInputFiles(fixture);
  await expect(page.getByTestId('import-svg-card')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByTestId('map-svg-fields')).toBeVisible();
}

/** From the mapping step to a production page with the graphic in it as a cue. */
async function intoProduction(page: Page, graphic: string, production: string) {
  await page.getByRole('button', { name: 'Next' }).click(); // Animation
  await expect(page).toHaveURL(/#\/new\/step\/animation/);
  await page.getByRole('button', { name: 'Next' }).click(); // Finish
  await expect(page).toHaveURL(/#\/new\/step\/finish/);
  await page.getByTestId('wz-finish-name').fill(graphic);
  // The picker only lists existing productions, so a fresh library has none to choose from.
  await page.getByTestId('wz-finish-production-pick').locator('select').selectOption('new');
  await page.getByTestId('wz-finish-production-name').fill(production);
  await page.getByTestId('wz-finish-production-go').click();
  await expect(page).toHaveURL(/#\/production\//);
  // 20 s: landing on the page builds the graphic's document, and the cold Prettier format is
  // the same cost import-graphic.spec.ts documents.
  await expect(page.getByTestId('production-page')).toBeVisible({ timeout: 20_000 });
  await settleDurableWrites(page);
}

test('imported scoreboard: a numeric layer is a ± stepper that acts on air, and survives a reload', async ({ page }) => {
  await dropSvg(page, SCOREBUG);

  // Every layer on: this file marks one by name (`f:Competition`), and the prefix rule then
  // defaults the REST off — which is right for the rule and wrong for this walk.
  const boxes = page.getByTestId('map-svg-fields').locator('input[type="checkbox"]');
  for (const box of await boxes.all()) if (!(await box.isChecked())) await box.check();
  await expect(page.getByTestId('map-svg-fields')).toContainText('7 of 7');

  await shot(page, '1-scoreboard-mapping');
  await intoProduction(page, 'Match scorebug', 'Saturday Match');

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
  await dropSvg(page, QUIZ);

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
