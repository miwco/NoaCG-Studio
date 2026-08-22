import { expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

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

/** Drop a file on the Import door and land on the SVG mapping step. */
export async function dropSvg(page: Page, fixture: string): Promise<void> {
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="import-graphic"]').click();
  await page.locator('.wz-drop input[type="file"]').setInputFiles(fixture);
  await expect(page.getByTestId('import-svg-card')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
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
  await page.getByRole('button', { name: 'Next' }).click(); // Animation
  await expect(page).toHaveURL(/#\/new\/step\/animation/);
  await page.getByRole('button', { name: 'Next' }).click(); // Finish
  await expect(page).toHaveURL(/#\/new\/step\/finish/);
  await page.getByTestId('wz-finish-name').fill(graphic);
  await page.getByTestId('wz-finish-production-pick').locator('select').selectOption('new');
  await page.getByTestId('wz-finish-production-name').fill(production);
  await page.getByTestId('wz-finish-production-go').click();
  await expect(page).toHaveURL(/#\/production\//);
  // 20 s: landing on the page builds the graphic's document, and the cold Prettier format is the
  // same cost import-graphic.spec.ts documents.
  await expect(page.getByTestId('production-page')).toBeVisible({ timeout: 20_000 });
}

/** Tick every detected text layer. The scorebug marks one layer by name (`f:Competition`), and
 *  the prefix rule then defaults the REST off — right for the rule, wrong for a walk that wants
 *  the whole board editable. */
export async function bindEveryTextLayer(page: Page): Promise<void> {
  const boxes = page.getByTestId('map-svg-fields').locator('input[type="checkbox"]');
  for (const box of await boxes.all()) if (!(await box.isChecked())) await box.check();
}
