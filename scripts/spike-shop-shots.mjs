// THE TWO GRAPHICS-SHOP ROUTES, CAPTURED - the pictures behind the 2026-08-28 owner-queue items.
//   node scripts/spike-shop-shots.mjs <port> <out-dir>
//
// Browse with the two-level type dropdown, the same step narrowed to one member category, and
// the kit picker showing a 33-graphic kit's contents as real previews. It prints the dropdown's
// options too, which is the cheapest way to check that every category is a row a reader can see.
import { chromium } from '@playwright/test';
const [port, out] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
await page.goto(`http://localhost:${port}/app`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.wz-modal');
await page.locator('[data-entry="template"]').click();
await page.waitForSelector('.wz-browse-search');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/01-browse.png` });
// open the type dropdown options text
const opts = await page.locator('[data-testid="wz-browse-type"] option').allInnerTexts();
console.log('TYPE OPTIONS:', JSON.stringify(opts));
// select the breaks shelf
await page.getByTestId('wz-browse-type').selectOption('cat:credits');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/02-breaks.png` });
// kit mode
await page.getByTestId('wz-browse-type').selectOption('');
const kitBtn = page.locator('.wz-buildmode button', { hasText: /kit/i });
console.log('kit buttons:', await page.locator('.wz-buildmode button').allInnerTexts());
await kitBtn.first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/03-kit.png` });
const first = page.locator('.wz-kit-card').first();
await first.click();
await page.waitForTimeout(2000);
await page.screenshot({ path: `${out}/04-kit-detail.png`, fullPage: true });
await browser.close();
