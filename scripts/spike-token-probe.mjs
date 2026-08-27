// Does a single word reach anything in the catalog, and what does a query resolve to?
//   node scripts/spike-token-probe.mjs "big title" "big" ...
import { chromium } from '@playwright/test';
import { devPort } from './dev-port.mjs';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://localhost:${devPort()}/app`, { waitUntil: 'domcontentloaded' });
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
const out = await page.evaluate(async (queries) => {
  const { browseTemplates, NO_BROWSE_FILTERS } = await import('/src/templates/search.ts');
  return queries.map((q) => {
    const r = browseTemplates({ ...NO_BROWSE_FILTERS, query: q });
    return { q, total: r.total, ignored: r.ignored, top: [...r.best, ...r.also].slice(0, 3).map((x) => x.variant.name) };
  });
}, process.argv.slice(2));
await browser.close();
for (const r of out) console.log(`"${r.q}" → ${r.total}  ignored=${JSON.stringify(r.ignored)}  ${r.top.join(' | ')}`);
