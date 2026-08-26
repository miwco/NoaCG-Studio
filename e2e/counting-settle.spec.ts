import { test, expect } from '@playwright/test';
import { enableAdvancedMode } from './_create';

// A SETTLED COUNTING GRAPHIC MUST SHOW ITS REAL FIGURE.
//
// Every surface that shows a graphic without a playback gesture - a Home card, a library
// thumbnail, the Browse grid, the operator's preview before the first take, the editor canvas -
// jumps the entrance to its end with GSAP's callbacks SUPPRESSED (preview/settleGraphic.ts,
// preview/simulatorRuntime.ts). A tween still writes its target under that jump; a callback does
// not. So a readout whose digits only ever reach the DOM from an `onUpdate` settles reading
// whatever the opening `set` wrote, which is 0.
//
// That shipped. Measured on main 2026-08-26: ig01 "Big Stat" rendered `0%` against its own
// `data-target="87%"`, and seventeen readouts across eleven infographics did the same - the first
// thing a browsing user sees on a stat card was a broken number. Nothing in the tree measured it,
// so nothing said so. The fix is one `tl.set` per readout in the emitted runtime
// (templates/infographics/igMotion.ts, "THE SETTLE RULE"); this is the gate that would have
// caught it, and the gate that stops the next readout shipping without one.
//
// THE DESIGN SET IS DISCOVERED, NEVER LISTED. `data-target` is the mark a counting readout
// already carries - it is where the count reads its true figure from, so a readout without one
// cannot count at all - and the composed document is scanned for it before the design is
// rendered. A new counting design in any category is covered the day it lands, and a category
// list nobody remembers to update is not what stands between a broken number and air.

/** One design's settled reading: what the DOM shows against what the data says. */
interface Reading {
  id: string;
  el: string;
  target: string;
  text: string;
}

/** Every catalog design whose composed document carries the counting mark, settled by `recipe`,
 *  reported as one row per marked element. Runs inside the page because both settle recipes are
 *  serialized into the preview document itself and drive live GSAP objects. */
const SWEEP = (recipe: 'thumbnail' | 'canvas') => `(async () => {
  const { CATALOG } = await import('/src/templates/catalog.ts');
  const { composeDocument } = await import('/src/preview/composeDocument.ts');
  const { postPreviewCmd } = await import('/src/preview/previewProtocol.ts');
  const recipe = ${JSON.stringify(recipe)};
  const designs = []; const readings = [];
  for (const cat of Object.keys(CATALOG)) {
    for (const variant of CATALOG[cat]) {
      // The REAL bootstrap in both cases: 'thumbnail' is composeDocument's settleWithData (the
      // shared settleGraphic recipe every card and thumbnail runs), 'canvas' is the editor's
      // simulate channel driven with the same sim-settle the PlayoutSimulator sends.
      const doc = composeDocument(variant.create({}), recipe === 'canvas'
        ? { simulate: true }
        : { settleWithData: '{}' });
      if (!doc.includes('data-target')) continue;   // not a counting design
      designs.push(variant.id);
      const f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;left:-4000px;top:0;width:1920px;height:1080px;';
      document.body.appendChild(f);
      await new Promise((res) => { f.onload = res; f.srcdoc = doc; });
      await new Promise((r) => setTimeout(r, 150));
      if (recipe === 'canvas') {
        postPreviewCmd(f.contentWindow, { cmd: 'sim-settle', data: '{}' });
        await new Promise((r) => setTimeout(r, 150));
      }
      for (const el of f.contentWindow.document.querySelectorAll('[data-target]')) {
        readings.push({
          id: variant.id,
          el: el.id || el.className || el.tagName,
          target: (el.getAttribute('data-target') || '').trim(),
          text: (el.textContent || '').trim(),
        });
      }
      f.remove();
    }
  }
  return { designs, readings };
})()`;

/** The rows where the graphic disagrees with its own data - a blank target is not a claim. */
const wrong = (readings: Reading[]) =>
  readings.filter((r) => r.target && r.text !== r.target)
    .map((r) => `${r.id} [${r.el}] shows "${r.text}" for data-target "${r.target}"`);

for (const recipe of ['thumbnail', 'canvas'] as const) {
  test(`every counting design settles on its real figure (${recipe})`, async ({ page }) => {
    test.setTimeout(180_000);
    await enableAdvancedMode(page);
    await page.goto('/app');
    await page.keyboard.press('Escape');

    const { designs, readings } = (await page.evaluate(SWEEP(recipe))) as {
      designs: string[];
      readings: Reading[];
    };

    // A discovery sweep that discovers nothing passes every assertion below it. These two bounds
    // are what makes the run a verdict: 44 designs carried the mark on 2026-08-27 (39
    // infographics, 5 vote boards) and 21 of them rendered a marked readout in the settled
    // entrance. Both are floors, not equalities - the catalog only grows.
    expect(designs.length, 'designs carrying the counting mark').toBeGreaterThan(30);
    expect(readings.length, 'marked readouts in the settled frame').toBeGreaterThan(15);

    // 0 is exactly the failure this exists for, and it is reported as the whole list rather than
    // one row: seventeen of these broke from a single change, and a gate that names one of them
    // sends the next reader looking for seventeen separate faults.
    expect(wrong(readings), 'readouts disagreeing with their own data').toEqual([]);
  });
}
