// One-off: capture a category's FIRST PAGE as the storefront draws it, because the sameness
// instrument scores lower thirds at 11 distinct looks out of 12 and the owner reading the same
// shelf said "all the graphics there look the same". One of the two is wrong about what a
// person sees, and the cheap way to find out is to look at the cards.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { devPort } from './dev-port.mjs';
import { outDir } from './out-dir.mjs';

const OUT = outDir(process.argv[2], './shelf-shots', 'Usage: node scripts/spike-shelf-look.mjs [out-dir]');
mkdirSync(OUT, { recursive: true });
const base = `http://localhost:${devPort()}`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1400 }, deviceScaleFactor: 1 });

for (const category of ['lower-third', 'stats', 'bug', 'topic']) {
  const page = await ctx.newPage();
  await page.goto(`${base}/app`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.wz-modal', { timeout: 30_000 });
  await page.locator('[data-entry="template"]').click();
  await page.waitForSelector('.wz-browse-search', { timeout: 20_000 });
  const target = await page.evaluate(async (id) => {
    const { GRAPHIC_CATEGORIES, CATEGORY_GROUPS, CATEGORY_GROUP_OF } = await import('/src/model/taxonomy.ts');
    const cat = GRAPHIC_CATEGORIES.find((c) => c.id === id);
    const group = CATEGORY_GROUPS.find((g) => g.id === CATEGORY_GROUP_OF[cat.id]);
    return { group: group.id, chip: group.categories.length > 1 ? cat.name : null };
  }, category);
  await page.getByTestId('wz-browse-type').selectOption(target.group);
  if (target.chip) await page.locator('.wz-browse-cats .wz-filter', { hasText: target.chip }).click();
  await page.waitForTimeout(3_500);
  await page.screenshot({ path: join(OUT, `shelf-${category}.png`), fullPage: true });
  console.log(`shelf-${category}.png`);
  await page.close();
}
await browser.close();
