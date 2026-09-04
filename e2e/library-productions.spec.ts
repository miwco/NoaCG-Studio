import { test, expect, type Page } from '@playwright/test';
import { settleDurableWrites } from './_durable';

interface SeededLibrary {
  productionAId: string;
  productionBId: string;
  onlyAId: string;
  onlyBId: string;
  bothId: string;
  neitherId: string;
}

/** Seed through the real local-first model. The reload waits for IndexedDB so this spec tests
 *  the durable library a returning user sees, not the synchronous mirror used during writes. */
async function seedLibrary(page: Page): Promise<SeededLibrary> {
  await page.goto('/app#/home/graphics');
  await page.keyboard.press('Escape');
  const seeded = await page.evaluate(async () => {
    const { CATALOG } = await import('/src/templates/catalog.ts');
    const { createGraphic } = await import('/src/model/library.ts');
    const { createShowNamedChecked, addGraphicToShow } = await import('/src/model/shows.ts');
    const variant = CATALOG['lower-third']?.[0];
    if (!variant) throw new Error('The lower-third catalog fixture is missing.');

    const makeGraphic = (name: string) => {
      const template = variant.create({});
      // The production stores a template copy, so its name must be final before pooling it.
      template.name = name;
      return createGraphic(template, { name }).doc;
    };

    const onlyA = makeGraphic('Only Friday');
    const onlyB = makeGraphic('Only Saturday');
    const both = makeGraphic('Weekend shared');
    const neither = makeGraphic('Unassigned');
    const productionA = createShowNamedChecked('Friday Quiz Night').show;
    const productionB = createShowNamedChecked('Saturday Finals').show;

    addGraphicToShow(productionA.id, onlyA.template, { graphicId: onlyA.id });
    addGraphicToShow(productionA.id, both.template, { graphicId: both.id });
    addGraphicToShow(productionB.id, onlyB.template, { graphicId: onlyB.id });
    addGraphicToShow(productionB.id, both.template, { graphicId: both.id });

    return {
      productionAId: productionA.id,
      productionBId: productionB.id,
      onlyAId: onlyA.id,
      onlyBId: onlyB.id,
      bothId: both.id,
      neitherId: neither.id,
    };
  });
  await settleDurableWrites(page);
  await page.reload();
  await expect(page.getByTestId('home-page')).toBeVisible();
  return seeded;
}

test('production memberships are visible, filterable, and reachable from production cards', async ({ page }) => {
  const seeded = await seedLibrary(page);
  await page.getByTestId('library-view-grid').click();
  // Desktop Chrome is 1280px in the shared config. The production control must not turn the
  // binding one-row library header into two bands at that width.
  const headerHeight = await page.locator('.lib-viewbar').evaluate((header) => header.getBoundingClientRect().height);
  expect(headerHeight).toBeLessThan(44);

  const onlyA = page.getByTestId(`graphic-row-${seeded.onlyAId}`);
  const both = page.getByTestId(`graphic-row-${seeded.bothId}`);
  const neither = page.getByTestId(`graphic-row-${seeded.neitherId}`);
  await expect(onlyA.getByTestId('row-productions')).toContainText('Friday Quiz Night');
  await expect(neither.getByTestId('row-productions')).toHaveCount(0);
  await expect(both.getByTestId('row-productions')).toContainText('Friday Quiz Night');
  await expect(both.getByTestId('row-productions')).toContainText('Saturday Finals');

  const productionFilter = page.getByTestId('library-production');
  await onlyA.getByRole('button', { name: 'Friday Quiz Night' }).click();
  await expect(productionFilter).toHaveValue(seeded.productionAId);
  await expect(page.locator('.lib-grid > .lib-row')).toHaveCount(2);

  await productionFilter.selectOption('');
  await productionFilter.selectOption(seeded.productionAId);
  await expect(page.locator('.lib-grid > .lib-row')).toHaveCount(2);
  await expect(onlyA).toBeVisible();
  await expect(both).toBeVisible();
  await expect(page.getByTestId(`graphic-row-${seeded.onlyBId}`)).toHaveCount(0);

  // The unassigned option is the escape hatch that keeps a production filter from making
  // library graphics unreachable.
  await productionFilter.selectOption('none');
  await expect(page.locator('.lib-grid > .lib-row')).toHaveCount(1);
  await expect(neither).toBeVisible();

  await productionFilter.selectOption('');
  await page.getByTestId('library-view-list').click();
  await expect(page.getByTestId('library-thead')).toContainText('Productions');
  await expect(neither.getByTestId('row-productions')).toHaveText('—');

  await page.goto('/app#/home');
  const productionCard = page.getByTestId(`production-row-${seeded.productionAId}`);
  await productionCard.getByTestId('browse-production-graphics').click();
  await expect(page).toHaveURL(/#\/home\/graphics$/);
  await expect(page.getByTestId('library-production')).toHaveValue(seeded.productionAId);
  await expect(page.locator('.lib-row')).toHaveCount(2);
  await expect(page.getByTestId(`graphic-row-${seeded.onlyAId}`)).toBeVisible();
  await expect(page.getByTestId(`graphic-row-${seeded.bothId}`)).toBeVisible();
});
