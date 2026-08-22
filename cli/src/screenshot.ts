// Screenshots: one transparent frame of a composed document - the agent's eyes.
//
// The bridge composes the document (the studio's own preview composition, parked at the settled
// on-air state, or the stress frame, or nothing at all for "off"). This renders it in a page of
// its own at the APP ORIGIN - `setContent` keeps the page's URL, so the document's relative
// `/fonts/...` references resolve against the deployment exactly as they do in the studio - waits
// for fonts and two frames, then re-rasterises the settled frame before the shutter: a graphic's
// panel is a promoted compositor layer (`will-change`), rasterised mid-entrance and never again,
// so a frame taken without that step carries a texture from half a second earlier
// (scripts/pro-spike.mjs `rasterSettledFrame`, measured 2026-08-16). `omitBackground` keeps every
// unpainted pixel transparent, which is the only honest picture of a graphic composited over video.

import type { Page } from 'playwright-core';
import type { BenchContext } from './browser.js';

export interface ShotOptions {
  width?: number;
  height?: number;
  /** How long to let the document settle after fonts are ready (ms). */
  settleMs?: number;
}

async function rasterSettledFrame(page: Page): Promise<void> {
  const hintOff = await page.addStyleTag({ content: '*{will-change:auto !important}' });
  const twoFrames = () =>
    page.evaluate(async () => {
      document.body.getBoundingClientRect();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
  await twoFrames();
  await hintOff.evaluate((el) => (el as Element).remove());
  await twoFrames();
}

/** Render `html` at the app origin and return the PNG bytes (also written to `outPath` when given). */
export async function shoot(bench: BenchContext, appOrigin: string, html: string, outPath: string | undefined, opts: ShotOptions = {}): Promise<Uint8Array> {
  const page = await bench.newPage();
  try {
    await page.setViewportSize({ width: opts.width ?? 1920, height: opts.height ?? 1080 });
    await page.goto(`${appOrigin}/bridge`, { waitUntil: 'domcontentloaded' });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(async (settleMs) => {
      try {
        await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]);
      } catch {
        /* no fonts */
      }
      await new Promise((resolve) => setTimeout(resolve, settleMs));
    }, opts.settleMs ?? 1500);
    await rasterSettledFrame(page);
    const buffer = await page.screenshot({ ...(outPath ? { path: outPath } : {}), omitBackground: true, type: 'png' });
    return new Uint8Array(buffer);
  } finally {
    await page.close().catch(() => undefined);
  }
}
