// One-off: capture the three new lower-third SILHOUETTES beside the shape they were drawn
// against, because every numeric conclusion in this programme has had to be settled by looking.
//
// `card-look-sweep.mjs` reports the footprint bucket, which is the axis that decides whether a
// shape is new. It cannot say whether the shape is any GOOD, and 99 of 103 lower thirds sharing
// one bucket is a defect precisely because a person reading the shelf saw it before any
// instrument did. So this writes the frames out and a person looks.
//
// Same render path as the sweep: the design composed exactly as the product composes it, played,
// settled, full-frame over black.
//
//   node scripts/spike-shape-look.mjs [out-dir]
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { devPort } from './dev-port.mjs';
import { outDir } from './out-dir.mjs';

// The three new shapes, then two incumbents: lt01 is the category's default silhouette (an inset
// hairline strap) and lt61 is the only shipped design that reaches even `strap/mid`.
const IDS = ['lt63', 'lt64', 'lt65', 'lt01', 'lt61'];

const OUT = outDir(process.argv[2], './shape-shots', 'Usage: node scripts/spike-shape-look.mjs [out-dir]');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
await page.goto(`http://localhost:${devPort()}/app`, { waitUntil: 'domcontentloaded' });
await page.keyboard.press('Escape');
await page.waitForTimeout(600);

for (const id of IDS) {
  const meta = await page.evaluate(async (variantId) => {
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
    const variant = variantById(variantId);
    await new Promise((r) => {
      f.onload = r;
      f.srcdoc = composeDocument(variant.create({}));
    });
    f.contentWindow.play?.();
    await new Promise((r) => setTimeout(r, 2200));
    // The ROOT's layout box, which is the same rectangle the footprint bucket is read off.
    const r = f.contentDocument.querySelector('.lower-third').getBoundingClientRect();
    const w = r.width / 1920;
    const h = r.height / 1080;
    return {
      name: variant.name,
      family: variant.styleTag,
      footprint: `${w > 0.8 ? 'full-width' : w > 0.5 ? 'wide' : 'strap'}/${h > 0.5 ? 'tall' : h > 0.22 ? 'mid' : 'thin'}`,
      w: +w.toFixed(3),
      h: +h.toFixed(3),
    };
  }, id);
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: 960, height: 540 } });
  writeFileSync(join(OUT, `${id}.png`), png);
  console.log(`${id.padEnd(6)} ${meta.footprint.padEnd(16)} ${String(meta.w).padStart(5)} x ${String(meta.h).padStart(5)}  ${meta.family.padEnd(10)} ${meta.name}`);
}

await browser.close();
console.log(`\nFrames in ${OUT}`);
