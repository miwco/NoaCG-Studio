import { expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { startNewProject } from './_create';

// THE SVG IMPORT WALK, shared by the offline spec and the live one.
//
// Written once because it is walked twice, and the two runs must not drift: the offline suite
// drives it against the local monitors, the configured suite drives the SAME steps against a
// published production and the real /output renderer. A divergence between them would read as
// "the hosted road is broken" when it was only the walk that differed.
//
// The fixtures are the SHIPPED SAMPLES rather than copies under e2e/fixtures — the files a
// designer is handed are the files the tests walk.

export const SCOREBUG_SVG = fileURLToPath(new URL('../docs/svg-samples/scorebug.svg', import.meta.url));
export const QUIZ_SVG = fileURLToPath(new URL('../docs/svg-samples/quiz-board.svg', import.meta.url));

/** The live-vote board (docs/GRAPHIC_BEHAVIOUR_PLAN.md §12). It sits in the EXPORTER CORPUS
 *  rather than beside the two samples above because that is what it is: a file carrying one
 *  exporter's byte idioms, with a sidecar stating what its designer expects
 *  (e2e/fixtures/svg-corpus/README.md). A shipped sample is a file a designer is HANDED, and the
 *  vote board is not offered as one yet. */
export const VOTE_SVG = fileURLToPath(
  new URL('./fixtures/svg-corpus/illustrator-live-vote-band.svg', import.meta.url),
);

/** The wizard's own Next. Scoped to the modal because the live walk runs with ADVANCED MODE on,
 *  which puts the editor's `» Next` verb on the page behind it — an unscoped role match then
 *  resolves to two buttons and the walk dies on the first step. */
function wizardNext(page: Page) {
  return page.locator('.wz-modal').getByRole('button', { name: 'Next' });
}

/**
 * Drop a file on the Import door and land on the SVG mapping step.
 *
 * OPENS THE WIZARD IF IT IS NOT ALREADY SHOWING, rather than requiring the caller to have
 * arrived on a surface that happens to auto-open it. A COLD `/app` opens the wizard by itself,
 * which is the offline walk's world; a SIGNED-IN load does not necessarily, because the account
 * syncs and the app can restore a previous project and land in the editor instead. That
 * difference is invisible until it bites: on the local-stack CI run 32795037259 this walk
 * inherited another spec's "Hairline" as the open project and failed on `.wz-modal` never
 * appearing - a message that sends the reader looking for a broken wizard rather than for two
 * specs sharing one account.
 *
 * `startNewProject` is the deterministic opener: it clicks + New graphic and answers the
 * discard-current-work guard when one appears. Wiping the library does NOT substitute for it -
 * the restored project reads "Not saved", so it is not a library row and there is nothing there
 * to delete.
 */
export async function dropSvg(page: Page, fixture: string): Promise<void> {
  const modal = page.locator('.wz-modal');
  // WAIT for the auto-open before deciding, never sample it. `isVisible()` answers about THIS
  // instant and does not retry, so called straight after a navigation it reports false while the
  // wizard is still mounting - on a cold /app that is the normal case, not the exception. The
  // first version of this helper did exactly that and opened a second wizard on every offline
  // run, where `+ New graphic` then matched both the topbar's and the wizard's own copy:
  // "strict mode violation: resolved to 2 elements" (CI run 32807175809).
  const autoOpened = await modal
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (!autoOpened) await startNewProject(page);
  await expect(modal).toBeVisible();
  await page.locator('[data-entry="import-graphic"]').click();
  await page.locator('.wz-drop input[type="file"]').setInputFiles(fixture);
  await expect(page.getByTestId('import-svg-card')).toBeVisible();
  await wizardNext(page).click();
  await expect(page.getByTestId('map-svg-fields')).toBeVisible();
}

/**
 * From the mapping step to a production page with the graphic in it as a cue.
 *
 * `production` names a NEW production; pass an existing name and the picker would still mint a
 * second one, which is deliberate — a walk that reused whatever was lying around would inherit
 * another run's cues.
 */
export async function intoProduction(page: Page, graphic: string, production: string): Promise<void> {
  // Waiting on the STEP COUNTER, not on the hash: the live walk arrives signed in and the wizard
  // it opens does not always carry a `#/new/step/…` route, so a URL assertion passes offline and
  // times out against a real backend on the same clicks. The counter is the same in both, and it
  // is also the settle the second click needs — clicking Next twice in a row without one lands
  // the second on a step that has not re-rendered.
  await wizardNext(page).click(); // Animation
  await expect(page.getByTestId('wz-stepcount')).toContainText('4');
  await wizardNext(page).click(); // Finish
  await expect(page.getByTestId('wz-stepcount')).toContainText('5');
  await page.getByTestId('wz-finish-name').fill(graphic);
  await page.getByTestId('wz-finish-production-pick').locator('select').selectOption('new');
  await page.getByTestId('wz-finish-production-name').fill(production);
  await page.getByTestId('wz-finish-production-go').click();
  // 20 s: landing on the page builds the graphic's document, and the cold Prettier format is the
  // same cost import-graphic.spec.ts documents.
  await expect(page.getByTestId('production-page')).toBeVisible({ timeout: 20_000 });
}

/**
 * UNTICK ONE TEXT ROW AND ANSWER THE QUESTION IT ASKS.
 *
 * Unticking is two clicks, not one (owner walk, 2026-09-02): the step asks what should happen to
 * the words the layer leaves behind, and the row stays ticked until that is answered - so a bare
 * `uncheck()` fails with "clicking the checkbox did not change its state", which is a true report
 * of a walk that has not finished. `'keep'` is the primary answer and what unticking always used
 * to mean; `'remove'` takes the layer off the artwork.
 *
 * One helper because three specs walk this and every one of them means the same thing by it.
 */
export async function untickTextRow(
  page: Page,
  candidateId: string,
  answer: 'keep' | 'remove' = 'keep',
): Promise<void> {
  await page.getByTestId(`map-svg-row-${candidateId}`).locator('input[type="checkbox"]').click();
  await expect(page.getByTestId('map-svg-off-dialog')).toBeVisible();
  await page.getByTestId(`map-svg-off-${answer}`).click();
  await expect(page.getByTestId('map-svg-off-dialog')).toBeHidden();
}

/** Tick every detected text layer. Every one of them arrives ticked, so this is a guard rather
 *  than a step of the walk: it keeps the two suites honest if a future default ever changes
 *  under them, without either of them silently binding half a board. */
export async function bindEveryTextLayer(page: Page): Promise<void> {
  const boxes = page.getByTestId('map-svg-fields').locator('input[type="checkbox"]');
  for (const box of await boxes.all()) if (!(await box.isChecked())) await box.check();
}
