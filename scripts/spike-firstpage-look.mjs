// What the first page LOOKS like now, on the axis that verified.
//   node scripts/spike-firstpage-look.mjs <card-look json> [category]
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { devPort } from './dev-port.mjs';

const measured = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const category = process.argv[3] || measured.category;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://localhost:${devPort()}/app`, { waitUntil: 'domcontentloaded' });
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
const ids = await page.evaluate(async (cat) => {
  const { browseTemplates, NO_BROWSE_FILTERS } = await import('/src/templates/search.ts');
  const out = browseTemplates({ ...NO_BROWSE_FILTERS, category: cat });
  return [...(out.best ?? []), ...(out.also ?? [])].slice(0, 12).map((r) => r.variant.id);
}, category);
await browser.close();

const HUE = ['red', 'orange', 'amber', 'yellow-green', 'green', 'spring', 'cyan', 'azure', 'blue', 'violet', 'magenta', 'rose'];
const byId = new Map(measured.rows.map((r) => [r.id, r]));
const hue = (r) => (r.accentHue == null ? 'none' : HUE[Math.round(r.accentHue / 30) % 12]);
const backdrop = (r) => (r.density < 0.35 ? 'none' : r.meanLum > 120 ? 'light' : 'dark');
const tally = (xs) => {
  const m = new Map();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
const rows = ids.map((id) => byId.get(id)).filter(Boolean);
console.log(`\nFIRST PAGE NOW — ${category}, ${rows.length} of 12 measured`);
console.log('  ids     ', ids.join(' '));
console.log('  accent  ', JSON.stringify(tally(rows.map(hue))));
console.log('  backdrop', JSON.stringify(tally(rows.map(backdrop))));
