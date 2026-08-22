// Does a design's DECLARED palette predict what the card actually looks like?
//
// card-look-sweep.mjs measures the rendered pixels, which is the honest axis but needs a render.
// Browse has to order the first page WITHOUT one. A palette declares `accent` (a hex) and `panel`
// (an rgba), which are exactly the two axes that matter - so if the declaration predicts the
// measurement, browse can diversify from data it already has and no baseline has to ship.
//
// This checks that rather than assuming it. Reads the measured JSON from card-look-sweep.
//   node scripts/spike-declared-vs-measured.mjs <measured.json>
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { devPort } from './dev-port.mjs';

const measuredPath = process.argv[2];
if (!measuredPath) {
  console.error('Usage: node scripts/spike-declared-vs-measured.mjs <card-look json>');
  process.exit(2);
}
const measured = JSON.parse(readFileSync(measuredPath, 'utf8'));

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://localhost:${devPort()}/app`, { waitUntil: 'domcontentloaded' });
await page.keyboard.press('Escape');
await page.waitForTimeout(500);

const declared = await page.evaluate(async (category) => {
  const { CATALOG } = await import('/src/templates/catalog.ts');
  return (CATALOG[category] ?? []).map((v) => ({
    id: v.id,
    accent: v.defaultPalette?.accent ?? null,
    panel: v.defaultPalette?.panel ?? null,
    family: v.styleTag ?? null,
  }));
}, measured.category);
await browser.close();

const HUE_NAMES = ['red', 'orange', 'amber', 'yellow-green', 'green', 'spring', 'cyan', 'azure', 'blue', 'violet', 'magenta', 'rose'];
function hueOfHex(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? ''));
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return null; // a neutral accent has no hue to bucket
  let h;
  if (max === r) h = ((g - b) / (max - min) + 6) % 6;
  else if (max === g) h = (b - r) / (max - min) + 2;
  else h = (r - g) / (max - min) + 4;
  return HUE_NAMES[Math.floor((h * 60) / 30) % 12];
}
function panelLum(rgba) {
  const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(String(rgba ?? ''));
  if (!m) return null;
  return 0.2126 * Number(m[1]) + 0.7152 * Number(m[2]) + 0.0722 * Number(m[3]);
}

const measuredName = (h) => (h == null ? 'none' : HUE_NAMES[Math.round(h / 30) % 12]);
const measuredBackdrop = (r) => (r.density < 0.35 ? 'none' : r.meanLum > 120 ? 'light' : 'dark');
const byId = new Map(declared.map((d) => [d.id, d]));

let hueHit = 0, hueSeen = 0, backHit = 0, backSeen = 0;
const misses = [];
for (const r of measured.rows) {
  const d = byId.get(r.id);
  if (!d) continue;
  const dh = hueOfHex(d.accent);
  const mh = measuredName(r.accentHue);
  // Only compare where the design actually PAINTS an accent - a design whose accent never
  // reaches the pixels is not a disagreement about hue, it is a design with no accent.
  if (mh !== 'none' && dh) {
    hueSeen += 1;
    // Adjacent buckets count as agreement: 30 degrees is inside the noise of "which orange".
    const di = HUE_NAMES.indexOf(dh), mi = HUE_NAMES.indexOf(mh);
    const dist = Math.min((di - mi + 12) % 12, (mi - di + 12) % 12);
    if (dist <= 1) hueHit += 1;
    else misses.push(`${r.id} hue declared=${dh} measured=${mh}`);
  }
  const pl = panelLum(d.panel);
  const mb = measuredBackdrop(r);
  if (pl != null && mb !== 'none') {
    backSeen += 1;
    const db = pl > 120 ? 'light' : 'dark';
    if (db === mb) backHit += 1;
    else misses.push(`${r.id} backdrop declared=${db} measured=${mb}`);
  }
}
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : 'n/a');
console.log(`\nDECLARED vs MEASURED — ${measured.category}, ${measured.rows.length} designs`);
console.log(`  accent hue   ${hueHit}/${hueSeen}  ${pct(hueHit, hueSeen)} agree (adjacent bucket counts)`);
console.log(`  backdrop     ${backHit}/${backSeen}  ${pct(backHit, backSeen)} agree`);
if (misses.length) {
  console.log(`\n${misses.length} disagreements:`);
  for (const m of misses.slice(0, 25)) console.log(`  ${m}`);
  if (misses.length > 25) console.log(`  …and ${misses.length - 25} more`);
}
