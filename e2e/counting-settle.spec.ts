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

// A PLAYED COUNTING GRAPHIC MUST COUNT UP FROM ZERO - it may never show its figure first.
//
// The other end of the same timeline, and the defect the owner hit playing a stat card from the
// playout dashboard: the final count, then a snap to zero, then the count up to the number that
// had just been on screen. A playout server writes the data BEFORE it takes the graphic - SPX,
// CasparCG and the dashboard all call update() and then play() - while the entrance empties each
// readout when its own count begins, a few tenths after the panel is already visible. Measured on
// main 2026-08-27 in that order: twelve readouts across ten designs, every counted readout in the
// catalog.
//
// THE ORDER IS THE TEST. Settling a graphic (above) never showed this, because a jump renders the
// zero and the figure in the same frame; only real playback has a gap to see. So this drives the
// real thing: update() with the design's own field defaults, play(), then a reading on every
// animation frame.
//
// WHICH READOUTS COUNT IS DISCOVERED, not listed - and not assumed from the mark either. update()
// writes data-target onto EVERY field, so the mark alone catches a static "94% COUNTED" caption
// that no builder ever touches. A readout COUNTS if its text changes at all while the entrance
// runs; that is the same claim the defect is about, measured rather than declared.

/** One design's played reading: what the readout showed the first frame it was visible. */
interface Played {
  id: string;
  el: string;
  target: string;
  first: string;
  frame: number;
  ended: string;
}

/** Every catalog design carrying the counting mark, driven in the PLAYOUT order and reported as
 *  one row per readout the entrance actually counts. Runs inside the page: the graphic has to be
 *  a live document with a live GSAP clock, which is the whole point of this pass. */
const PLAYED = `(async () => {
  const { CATALOG } = await import('/src/templates/catalog.ts');
  const { composeDocument } = await import('/src/preview/composeDocument.ts');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const designs = []; const readings = [];
  for (const cat of Object.keys(CATALOG)) {
    for (const variant of CATALOG[cat]) {
      const tpl = variant.create({});
      const doc = composeDocument(tpl, {});      // no settle, no simulator - a plain playout document
      if (!doc.includes('data-target')) continue;
      designs.push(variant.id);
      const f = document.createElement('iframe');
      // ON SCREEN, deliberately: Chromium does not tick rAF in an iframe parked off the viewport,
      // so an off-screen play measures a graphic that never moved.
      f.style.cssText = 'position:fixed;left:0;top:0;width:1920px;height:1080px;z-index:99999;border:0;';
      document.body.appendChild(f);
      await new Promise((res) => { f.onload = res; f.srcdoc = doc; });
      await sleep(250);
      const w = f.contentWindow, d = w.document;
      // The operator's own defaults, in the shape a playout server sends them.
      const data = {};
      for (const fl of tpl.fields) if (fl.field) data[fl.field] = fl.value == null ? '' : fl.value;
      try { w.update(JSON.stringify(data)); } catch (e) { /* a broken template fails elsewhere */ }
      await sleep(40);
      // Visible means visible TO THE VIEWER: the root is hidden by its own opacity until the
      // entrance reveals it, and any ancestor may be mid-fade, so the whole chain is multiplied.
      const visible = (el) => {
        let o = 1, n = el;
        while (n && n.nodeType === 1) {
          const s = w.getComputedStyle(n);
          if (s.visibility === 'hidden' || s.display === 'none') return 0;
          o *= parseFloat(s.opacity);
          n = n.parentElement;
        }
        return o;
      };
      const marks = [];
      for (const el of d.querySelectorAll('[data-target]')) {
        const target = (el.getAttribute('data-target') || '').trim();
        const value = parseFloat(target.replace(/,/g, ''));
        // A readout counting to zero has no zero form to tell apart from its target.
        if (!isFinite(value) || value === 0) continue;
        marks.push({ el, target, name: el.id || el.className || el.tagName, first: null, counts: false });
      }
      if (!marks.length) { f.remove(); continue; }
      try { w.play(); } catch (e) { /* a broken template fails elsewhere */ }
      for (let i = 0; i < 45; i++) {
        await new Promise((r) => w.requestAnimationFrame(r));
        for (const m of marks) {
          const text = (m.el.textContent || '').trim();
          if (text !== m.target) m.counts = true;   // it moved - a builder owns this readout
          if (!m.first && visible(m.el) > 0.02) m.first = { text: text, frame: i };
        }
      }
      // Run the rest of the entrance out on a fast clock rather than in real time: this is real
      // playback with real callbacks, just 25x, which keeps the whole sweep inside one minute.
      w.gsap.globalTimeline.timeScale(25);
      await sleep(250);
      for (const m of marks) {
        if (!m.counts || !m.first) continue;
        readings.push({
          id: variant.id,
          el: m.name,
          target: m.target,
          first: m.first.text,
          frame: m.first.frame,
          ended: (m.el.textContent || '').trim(),
        });
      }
      f.remove();
    }
  }
  return { designs, readings };
})()`;

test('every counting design plays its figure up from zero', async ({ page }) => {
  test.setTimeout(240_000);
  await enableAdvancedMode(page);
  await page.goto('/app');
  await page.keyboard.press('Escape');

  const { designs, readings } = (await page.evaluate(PLAYED)) as {
    designs: string[];
    readings: Played[];
  };

  // The same reason the settle sweep states its floors: a discovery pass that discovers nothing
  // passes every assertion under it. 44 designs carried the mark on 2026-08-27 and 12 readouts
  // across ten of them are counted by an entrance. Floors, not equalities.
  expect(designs.length, 'designs carrying the counting mark').toBeGreaterThan(30);
  expect(readings.length, 'readouts an entrance counts').toBeGreaterThan(8);

  // THE DEFECT: the operator's real figure on screen before the count that is about to zero it.
  expect(
    readings.filter((r) => r.first === r.target)
      .map((r) => `${r.id} [${r.el}] shows its final "${r.target}" on frame ${r.frame}, its first visible one`),
    'readouts showing their figure before counting to it',
  ).toEqual([]);

  // The other half of the claim, and the one that stops "never show the figure" being satisfied
  // by never showing it: the entrance still ends on the real number.
  expect(
    readings.filter((r) => r.ended !== r.target)
      .map((r) => `${r.id} [${r.el}] ends the entrance on "${r.ended}", not "${r.target}"`),
    'readouts not landing on their own data',
  ).toEqual([]);
});

// A GRAPHIC TAKEN WHILE IT IS ALREADY ON AIR MUST NOT PAINT WHAT IT WAS SHOWING.
//
// The third order, and the one neither pass above could see. Both of them start from a document
// that has never played: the root sits at opacity 0, so the frame before the entrance paints
// nothing and there is no stale pose to catch. Real graphics are re-entered from a VISIBLE state
// all day - the editor canvas and the Rehearse panel settle a graphic and then take it, and a
// dashboard, SPX or CasparCG take of a graphic that is still up does the same.
//
// WHAT GOES WRONG THERE IS ONE FRAME EARLIER THAN THE ZERO RULE CAN REACH. The zero rule
// (templates/infographics/igMotion.ts) moved each readout's emptying onto the entrance's first
// frame; the interpreter writes every opening value as a set() ON the timeline, and a GSAP
// timeline renders nothing until the ticker next runs. play() is one synchronous task, so the
// browser paints once between play() returning and the entrance's first tick - showing the
// graphic exactly as it was, at full opacity. Measured on main 2026-09-03: a settled ig05
// "Rising Total" returned from play() reading its real 124,213 at opacity 1 and was zeroed 14 ms
// later, which is the owner's 2026-08-28 walk report word for word. The fix renders frame 0
// during the take (templates/shared/animRuntime.ts, noacgEntranceTimeline).
//
// SO THE MEASUREMENT IS THE FRAME THE BROWSER WILL PAINT, read synchronously after play()
// returns - not an animation frame later, which is exactly when the evidence is gone.
//
// The second claim here is about the digits themselves: a count that renders a NOTATION its
// figure never lands in changes shape as it arrives. ig05 counted 8807, 16041, 124213 and put
// its commas back on the final frame while ig04 "Poll Ring" beside it was right, because the
// two builders formatted independently. Discovered the same way as everything else in this
// file: a reading is compared against its OWN target's grouping, so a design that groups and a
// design that does not are both held to what their operator typed.

/** One design's re-take: what the graphic painted on the take, and how its count was written. */
interface Retaken {
  id: string;
  el: string;
  target: string;
  /** The readout's text and effective opacity in the frame the browser paints after play(). */
  painted: string;
  paintedOpacity: number;
  /** An intermediate reading whose thousand separators disagree with the target's, if any. */
  notation: string | null;
}

/** Every catalog design carrying the counting mark, played out ONCE so it is on air, then taken
 *  again - which is the order every re-take in the product uses. Runs inside the page for the
 *  same reason the passes above do: it needs a live document and a live GSAP clock. */
const RETAKEN = `(async () => {
  const { CATALOG } = await import('/src/templates/catalog.ts');
  const { composeDocument } = await import('/src/preview/composeDocument.ts');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const designs = []; const readings = [];
  for (const cat of Object.keys(CATALOG)) {
    for (const variant of CATALOG[cat]) {
      const tpl = variant.create({});
      const doc = composeDocument(tpl, {});
      if (!doc.includes('data-target')) continue;
      designs.push(variant.id);
      const f = document.createElement('iframe');
      // ON SCREEN for the same reason the played pass says: Chromium does not tick rAF for an
      // iframe parked off the viewport, so an off-screen graphic never reaches its on-air state.
      f.style.cssText = 'position:fixed;left:0;top:0;width:1920px;height:1080px;z-index:99999;border:0;';
      document.body.appendChild(f);
      await new Promise((res) => { f.onload = res; f.srcdoc = doc; });
      await sleep(250);
      const w = f.contentWindow, d = w.document;
      const data = {};
      for (const fl of tpl.fields) if (fl.field) data[fl.field] = fl.value == null ? '' : fl.value;
      const json = JSON.stringify(data);
      try { w.update(json); } catch (e) { /* a broken template fails elsewhere */ }
      await sleep(40);
      const opacity = (el) => {
        let o = 1, n = el;
        while (n && n.nodeType === 1) {
          const s = w.getComputedStyle(n);
          if (s.visibility === 'hidden' || s.display === 'none') return 0;
          o *= parseFloat(s.opacity);
          n = n.parentElement;
        }
        return o;
      };
      const marks = [];
      for (const el of d.querySelectorAll('[data-target]')) {
        const target = (el.getAttribute('data-target') || '').trim();
        const value = parseFloat(target.replace(/,/g, ''));
        if (!isFinite(value) || value === 0) continue;
        marks.push({ el, target, name: el.id || el.className || el.tagName });
      }
      if (!marks.length) { f.remove(); continue; }
      // ON AIR: run the whole entrance out fast, so the graphic ends settled and VISIBLE showing
      // the operator's data. That is the state every re-take in the product starts from.
      try { w.play(); } catch (e) { /* a broken template fails elsewhere */ }
      w.gsap.globalTimeline.timeScale(40);
      await sleep(300);
      w.gsap.globalTimeline.timeScale(1);
      await new Promise((r) => w.requestAnimationFrame(r));
      const settled = marks.map((m) => (m.el.textContent || '').trim());
      // THE RE-TAKE, and the reading taken in the same synchronous task: play() has returned and
      // the ticker has not run, so this is the DOM the browser is about to paint.
      try { w.play(); } catch (e) { /* a broken template fails elsewhere */ }
      const painted = marks.map((m) => ({ text: (m.el.textContent || '').trim(), op: opacity(m.el) }));
      // Then the count itself, on a fast clock, for the notation half.
      const seen = marks.map(() => []);
      w.gsap.globalTimeline.timeScale(12);
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => w.requestAnimationFrame(r));
        marks.forEach((m, k) => seen[k].push((m.el.textContent || '').trim()));
      }
      w.gsap.globalTimeline.timeScale(1);
      marks.forEach((m, k) => {
        // Only a readout the entrance actually counts: the mark alone rides on every field.
        if (!seen[k].some((t) => t !== m.target)) return;
        const grouped = m.target.indexOf(',') >= 0;
        // A reading only disagrees once it is long enough to carry a separator at all.
        const odd = seen[k].find((t) => /^[0-9,]{4,}$/.test(t) && (t.indexOf(',') >= 0) !== grouped);
        readings.push({
          id: variant.id,
          el: m.name,
          target: m.target,
          painted: painted[k].text,
          paintedOpacity: painted[k].op,
          notation: odd === undefined ? null : odd,
        });
      });
      f.remove();
    }
  }
  return { designs, readings };
})()`;

test('a counting graphic taken again on air never paints its old figure', async ({ page }) => {
  test.setTimeout(300_000);
  await enableAdvancedMode(page);
  await page.goto('/app');
  await page.keyboard.press('Escape');

  const { designs, readings } = (await page.evaluate(RETAKEN)) as {
    designs: string[];
    readings: Retaken[];
  };

  // The floors this file states everywhere, for the reason it states everywhere: a discovery
  // pass that discovers nothing passes every assertion under it.
  expect(designs.length, 'designs carrying the counting mark').toBeGreaterThan(30);
  expect(readings.length, 'readouts an entrance counts').toBeGreaterThan(8);

  // THE DEFECT: the graphic as it WAS, visible, in the frame the take paints.
  expect(
    readings.filter((r) => r.painted === r.target && r.paintedOpacity > 0.02)
      .map((r) => `${r.id} [${r.el}] paints its settled "${r.target}" at opacity ${r.paintedOpacity.toFixed(2)} on the re-take`),
    'readouts painting their old figure when the graphic is taken again',
  ).toEqual([]);

  // The count reads in the notation its figure lands in, whichever one the operator typed.
  expect(
    readings.filter((r) => r.notation !== null)
      .map((r) => `${r.id} [${r.el}] counts through "${r.notation}" on the way to "${r.target}"`),
    'counts written in a notation their figure never lands in',
  ).toEqual([]);
});
