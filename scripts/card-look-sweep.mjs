// THE CARD LOOK: what an eye reads off a design at storefront size.
//
// Why this exists, and why it is not catalog-sameness.mjs. That instrument scores a design on
// fourteen CSS DECISIONS - radius, blur, skew, clip, tracking, weight counts - and on 2026-08-21
// it called the lower-thirds first page 11 distinct looks out of 12, while the owner looking at
// the same page said the graphics "all look the same". The owner was right. At card size nobody
// reads a border radius: they read COLOUR and SHAPE, and that vector has no axis for either.
//
// So this one measures the RENDERED PIXELS. Each design is drawn full-frame over black, settled,
// screenshotted, and read back through a canvas - a data: URL never taints one, which is what
// makes the read possible at all, since the preview iframe is sandboxed without
// allow-same-origin and cannot be sampled directly.
//
// Four axes, chosen because they are what separates the two shelves the owner compared:
//   BACKDROP   dark / light / none - the stats shelf carries cream and lime panels; every lower
//              third on the first page is a dark slab. This is the loudest axis.
//   ACCENT     the dominant saturated hue, in twelve buckets. "Amber everywhere" is the
//              complaint in one word.
//   FOOTPRINT  the ink's bounding box as a share of the frame - a strap across the lower left is
//              a different SHAPE from a full-width band, and an eye reads that before anything.
//   DENSITY    how much of that box is actually painted. A hairline rule and a filled slab
//              occupy the same box and do not look remotely alike.
//
// It REPORTS; it gates nothing. Variety is a design judgement and this is the evidence under it.
//   node scripts/card-look-sweep.mjs [category] [--json out.json]
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { devPort } from './dev-port.mjs';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const CATEGORY = args[0] || 'lower-third';
const jsonAt = process.argv.indexOf('--json');
const jsonOut = jsonAt >= 0 ? process.argv[jsonAt + 1] : null;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
await page.goto(`http://localhost:${devPort()}/app`, { waitUntil: 'domcontentloaded' });
await page.keyboard.press('Escape');
await page.waitForTimeout(600);

const ids = await page.evaluate(async (category) => {
  const { CATALOG } = await import('/src/templates/catalog.ts');
  return (CATALOG[category] ?? []).map((v) => ({ id: v.id, name: v.name, family: v.styleTag }));
}, CATEGORY);
if (ids.length === 0) {
  console.error(`No designs in category "${CATEGORY}".`);
  await browser.close();
  process.exit(2);
}

/** Render one design full-frame over BLACK, settled, and screenshot it. */
async function shoot(id) {
  await page.evaluate(async (variantId) => {
    const { variantById } = await import('/src/templates/catalog.ts');
    const { composeDocument } = await import('/src/preview/composeDocument.ts');
    document.getElementById('look-stage')?.remove();
    const host = document.createElement('div');
    host.id = 'look-stage';
    host.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#000;overflow:hidden';
    const f = document.createElement('iframe');
    f.style.cssText = 'width:1920px;height:1080px;border:0;display:block;transform:scale(0.5);transform-origin:0 0';
    host.appendChild(f);
    document.body.appendChild(host);
    await new Promise((r) => {
      f.onload = r;
      f.srcdoc = composeDocument(variantById(variantId).create({}));
    });
    f.contentWindow.play?.();
    await new Promise((r) => setTimeout(r, 2200));
  }, id);
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 960, height: 540 } });
  return `data:image/png;base64,${buf.toString('base64')}`;
}

/** Read the axes off the pixels, in the page: a data: URL does not taint a canvas. */
const READ = (dataUrl) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
      let minX = width, minY = height, maxX = -1, maxY = -1, ink = 0, lumSum = 0;
      const hues = new Array(12).fill(0);
      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
          const i = (y * width + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          // The bed is pure black, so anything above it is the design.
          if (r + g + b < 24) continue;
          ink += 1;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          lumSum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          // Only a genuinely saturated pixel votes for a hue - grey text is not an accent.
          if (sat > 0.45 && max > 60) {
            let h;
            if (max === min) h = 0;
            else if (max === r) h = ((g - b) / (max - min) + 6) % 6;
            else if (max === g) h = (b - r) / (max - min) + 2;
            else h = (r - g) / (max - min) + 4;
            hues[Math.floor((h * 60) / 30) % 12] += 1;
          }
        }
      }
      if (maxX < 0) {
        resolve(null);
        return;
      }
      const sampled = ink || 1;
      const boxW = (maxX - minX + 2) / width;
      const boxH = (maxY - minY + 2) / height;
      const coverage = (ink * 4) / (width * height);
      const peak = Math.max(...hues);
      resolve({
        box: {
          x: Number((minX / width).toFixed(3)),
          y: Number((minY / height).toFixed(3)),
          w: Number(boxW.toFixed(3)),
          h: Number(boxH.toFixed(3)),
        },
        coverage: Number(coverage.toFixed(3)),
        density: Number((coverage / Math.max(0.001, boxW * boxH)).toFixed(3)),
        meanLum: Math.round(lumSum / sampled),
        accentHue: peak > 40 ? hues.indexOf(peak) * 30 : null,
      });
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });

const rows = [];
for (const v of ids) {
  const url = await shoot(v.id);
  const look = await page.evaluate(READ, url);
  await page.evaluate(() => document.getElementById('look-stage')?.remove());
  if (!look) {
    console.error(`  ! ${v.id} rendered nothing`);
    continue;
  }
  rows.push({ ...v, ...look });
  process.stdout.write('.');
}
process.stdout.write('\n');
await browser.close();

// ── The report ───────────────────────────────────────────────────────────────────────────
const HUE_NAMES = ['red', 'orange', 'amber', 'yellow-green', 'green', 'spring', 'cyan', 'azure', 'blue', 'violet', 'magenta', 'rose'];
const hueName = (h) => (h == null ? 'none' : HUE_NAMES[Math.round(h / 30) % 12]);
// A design either paints a filled PLATE or writes on the frame itself; density tells them apart.
const backdrop = (r) => (r.density < 0.35 ? 'none' : r.meanLum > 120 ? 'light' : 'dark');
// Band vs strap is what an eye reads first; three percent of width is not.
const shape = (r) =>
  `${r.box.w > 0.8 ? 'full-width' : r.box.w > 0.5 ? 'wide' : 'strap'}/` +
  `${r.box.h > 0.5 ? 'tall' : r.box.h > 0.22 ? 'mid' : 'thin'}`;

const tally = (xs) => {
  const m = new Map();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
const pct = (n) => `${Math.round((100 * n) / rows.length)}%`;

console.log(`\n=== CARD LOOK - ${CATEGORY}, ${rows.length} designs ===`);
for (const [axis, values] of [
  ['BACKDROP', rows.map(backdrop)],
  ['ACCENT', rows.map((r) => hueName(r.accentHue))],
  ['FOOTPRINT', rows.map(shape)],
]) {
  console.log(`\n${axis}`);
  for (const [val, n] of tally(values)) {
    console.log(`  ${String(val).padEnd(14)} ${String(n).padStart(3)}  ${pct(n)}`);
  }
}

const combos = tally(rows.map((r) => `${backdrop(r)} · ${hueName(r.accentHue)} · ${shape(r)}`));
console.log('\nMOST COMMON CARD LOOKS');
for (const [val, n] of combos.slice(0, 6)) console.log(`  ${String(n).padStart(3)}  ${pct(n).padStart(4)}  ${val}`);
console.log(`\n${combos.length} distinct card looks across ${rows.length} designs.`);
console.log(`The single most common accounts for ${pct(combos[0][1])} of the category.`);

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({ category: CATEGORY, rows, combos }, null, 1));
  console.log(`\nwrote ${jsonOut}`);
}
