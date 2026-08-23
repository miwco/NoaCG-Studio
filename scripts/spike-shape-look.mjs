// Capture the new lower-third SILHOUETTES beside the shape they were drawn against, because
// every conclusion in this programme has had to be settled by looking - including the one that
// ended a design. lt65 "Edge Rail" measured correctly on every axis the instruments carry and
// was withdrawn on sight: its type was turned, and nobody turns their head to read a name.
//
// `card-look-sweep.mjs` reports the footprint bucket, which is the axis that decides whether a
// shape is new. It cannot say whether the shape is any GOOD, and 99 of 103 lower thirds sharing
// one bucket is a defect precisely because a person reading the shelf saw it before any
// instrument did. So this writes the frames out and a person looks.
//
// EACH CASE MAY OVERRIDE THE OPERATOR'S SIDE - a long name, a different anchor zone, a vertical
// resolution - because a design's own sample is the one input guaranteed to flatter it. The
// withdrawn lt65 held its shape at its 17-character sample and ran off the top AND bottom of the
// frame at 51, with every gate in the repo green throughout. A capture rig that can only
// photograph the default reproduces that blind spot rather than catching it.
//
// Same render path as the sweep either way: the design composed exactly as the product composes
// it, played, settled, full-frame over black.
//
//   node scripts/spike-shape-look.mjs [out-dir]
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { devPort } from './dev-port.mjs';
import { outDir } from './out-dir.mjs';

const VERTICAL = { width: 1080, height: 1920, label: 'Vertical (1080x1920)' };

// The two new shapes and two incumbents (lt01 is the category's default silhouette, an inset
// hairline strap; lt61 is the only shipped design reaching even `strap/mid`), then the two cases
// a default-only capture cannot show: the band under a name long enough to test its measure, and
// the column at 9:16.
const CASES = [
  { file: 'lt63', id: 'lt63' },
  { file: 'lt64', id: 'lt64' },
  { file: 'lt01', id: 'lt01' },
  { file: 'lt61', id: 'lt61' },
  {
    file: 'lt63-long-name',
    id: 'lt63',
    note: '51-character name - the band under the value that found its trailing-letter-space overhang',
    lines: [
      { title: 'Name', sample: 'BARTHOLOMEW RAVENSWORTH-FITZGERALD OF NORTHUMBERLAND' },
      { title: 'Role', sample: 'Political Editor' },
      { title: 'Location', sample: 'Helsinki' },
    ],
  },
  { file: 'lt64-vertical', id: 'lt64', note: '9:16, the crop its header claims it suits', resolution: VERTICAL },
];

const OUT = outDir(process.argv[2], './shape-shots', 'Usage: node scripts/spike-shape-look.mjs [out-dir]');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 960 }, deviceScaleFactor: 2 });
await page.goto(`http://localhost:${devPort()}/app`, { waitUntil: 'domcontentloaded' });
await page.keyboard.press('Escape');
await page.waitForTimeout(600);

for (const testCase of CASES) {
  const frameW = testCase.resolution?.width ?? 1920;
  const frameH = testCase.resolution?.height ?? 1080;
  // Fit the frame into a 960-wide shot whatever its aspect, so a vertical capture is not cropped.
  const shot = Math.min(960 / frameW, 960 / frameH);
  const meta = await page.evaluate(async ({ id, lines, resolution, scale }) => {
    const { variantById } = await import('/src/templates/catalog.ts');
    const { composeDocument } = await import('/src/preview/composeDocument.ts');
    document.getElementById('look-stage')?.remove();
    const host = document.createElement('div');
    host.id = 'look-stage';
    host.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#000;overflow:hidden';
    const f = document.createElement('iframe');
    const w = resolution?.width ?? 1920;
    const h = resolution?.height ?? 1080;
    f.style.cssText = `width:${w}px;height:${h}px;border:0;display:block;transform:scale(${scale});transform-origin:0 0`;
    host.appendChild(f);
    document.body.appendChild(host);
    const variant = variantById(id);
    const options = {};
    if (lines) options.lines = lines;
    if (resolution) options.resolution = resolution;
    await new Promise((r) => {
      f.onload = r;
      f.srcdoc = composeDocument(variant.create(options));
    });
    f.contentWindow.play?.();
    await new Promise((r) => setTimeout(r, 2200));
    const d = f.contentDocument;
    // The ROOT's layout box, which is the same rectangle the footprint bucket is read off.
    const r = d.querySelector('.lower-third').getBoundingClientRect();
    // The TEXT's extent, read separately: the ratified safe-area rule bounds essential
    // information, and lets a decorative bar or panel bleed past it (docs/DESIGN_LANGUAGE.md).
    const spans = [...d.querySelectorAll('.lower-third-mask > span')].map((s) => s.getBoundingClientRect());
    const hIn = w * 0.0625;
    const safe = spans.length === 0 ? true : (
      Math.min(...spans.map((s) => s.y)) >= h * 0.08
      && Math.max(...spans.map((s) => s.y + s.height)) <= h - h * 0.11
      && Math.min(...spans.map((s) => s.x)) >= hIn
      && Math.max(...spans.map((s) => s.x + s.width)) <= w - hIn
    );
    const bw = r.width / w;
    const bh = r.height / h;
    return {
      name: variant.name,
      family: variant.styleTag,
      footprint: `${bw > 0.8 ? 'full-width' : bw > 0.5 ? 'wide' : 'strap'}/${bh > 0.5 ? 'tall' : bh > 0.22 ? 'mid' : 'thin'}`,
      w: +bw.toFixed(3),
      h: +bh.toFixed(3),
      textSafe: safe,
    };
  }, { id: testCase.id, lines: testCase.lines, resolution: testCase.resolution, scale: shot });
  const png = await page.screenshot({
    clip: { x: 0, y: 0, width: Math.round(frameW * shot), height: Math.round(frameH * shot) },
  });
  writeFileSync(join(OUT, `${testCase.file}.png`), png);
  const flag = meta.textSafe ? '' : '  ** TEXT OUTSIDE THE SAFE AREA **';
  console.log(
    `${testCase.file.padEnd(16)} ${meta.footprint.padEnd(16)} ${String(meta.w).padStart(5)} x ${String(meta.h).padStart(5)}`
    + `  ${meta.family.padEnd(10)} ${meta.name}${testCase.note ? ` (${testCase.note})` : ''}${flag}`,
  );
}

await browser.close();
console.log(`\nFrames in ${OUT}`);
