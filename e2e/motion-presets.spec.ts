import { test, expect, type Page } from '@playwright/test';
import { settleDurableWrites } from './_durable';
import { dropSvg, SCOREBUG_SVG } from './_svg-import';

// THE UNIVERSAL IN/OUT PRESET PICKER (blocks/motionPresets.ts, components/MotionPresetPicker.tsx):
// the no-code way to change how a graphic comes on and goes off air, for ANY graphic whose motion
// lives in the NOACG_ANIM data block. Two hosts, one engine: a saved graphic's CONTROL page and
// the wizard's Animation step for an imported design. These cases pin:
//   - the control page rewrites the entrance/exit as DATA on the graphic's unit(s), saves it, reads
//     the lit card back from the template (never from component state), and survives a reload;
//   - a phase can be picked alone (In only / Out only) and the speed knob writes NOACG_ANIM.speed;
//   - the engine KEEPS what it promised to keep - lifecycle calls, ambient loops, layers outside
//     the root - and clears a styled lifecycle arrow that would otherwise play instead;
//   - the wizard's imported-design Animation step offers the ten universal cards (plus the SVG
//     layer stagger), and a wizard pick lands as the same data the control page reads back.

/** Save one catalog design to the library and open its control page. */
async function openControlPage(page: Page, category: string, name: string): Promise<string> {
  await page.goto('/app');
  await expect(page.locator('.topbar')).toBeVisible();
  const id = await page.evaluate(async ([cat, gname]) => {
    const { variantsFor } = await import('/src/templates/catalog.ts');
    const { createGraphic } = await import('/src/model/library.ts');
    const { doc, error } = createGraphic(variantsFor(cat)[0].create({}), { name: gname });
    if (error) throw new Error(error);
    return doc.id;
  }, [category, name] as const);
  await settleDurableWrites(page);
  await page.goto(`/app#/control/${id}`);
  await expect(page.getByTestId('graphic-control-page')).toBeVisible();
  return id;
}

/** The saved graphic's animation data, read from the LIBRARY record (what the page persisted). */
async function savedAnim(page: Page, id: string) {
  return page.evaluate(async (gid) => {
    const { graphicById } = await import('/src/model/library.ts');
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    const doc = graphicById(gid);
    if (!doc) throw new Error('graphic gone');
    const d = parseAnimData(doc.template.js);
    if (!d) throw new Error('no data block');
    const step = (i: number) => d.steps[i < 0 ? d.steps.length + i : i];
    const tracks = (i: number, sel: string) => {
      const layer = step(i).layers[sel];
      return layer
        ? Object.fromEntries(Object.entries(layer).map(([prop, kfs]) => [prop, kfs.map((k) => [k.time, k.value])]))
        : null;
    };
    return {
      speed: d.speed,
      inLayers: Object.keys(step(0).layers),
      outLayers: Object.keys(step(-1).layers),
      inDuration: step(0).duration,
      outDuration: step(-1).duration,
      box: { in: tracks(0, '.lower-third-box'), out: tracks(-1, '.lower-third-box') },
      accent: { in: tracks(0, '.lower-third-accent'), out: tracks(-1, '.lower-third-accent') },
    };
  }, id);
}

test('control page: the Motion section rewrites the entrance and exit on the graphic as one unit, saves it, and lights the card it reads back', async ({ page }) => {
  const id = await openControlPage(page, 'lower-third', 'Motion strap');

  // Closed by default, naming what the graphic does now: a catalog strap arrives with its own
  // tuned choreography, which is none of these cards.
  const summary = page.getByTestId('control-motion-summary');
  await expect(summary).toContainText('In: its own');
  await expect(summary).toContainText('Out: its own');
  await summary.click();
  const cards = page.locator('.motion-card');
  await expect(cards).toHaveCount(10);
  await expect(page.locator('.motion-card[data-selected]')).toHaveCount(0);

  // Pick Rise for both phases (the default direction).
  await page.getByTestId('motion-rise').click();
  await expect(summary).toContainText('In: Rise · Out: Rise');
  await expect(page.locator('.motion-card[data-selected]')).toHaveText(/Rise/);
  await settleDurableWrites(page);
  let anim = await savedAnim(page, id);
  // The UNIT is the root's children - the accent beside the box and the box - moving together;
  // the strap's own line choreography (#f0, #f1 rising out of their masks) is gone from both
  // steps: a clean swap, so two picks never blend.
  expect(anim.inLayers.sort()).toEqual(['.lower-third-accent', '.lower-third-box']);
  expect(anim.outLayers.sort()).toEqual(['.lower-third-accent', '.lower-third-box']);
  expect(anim.box.in).toEqual({ opacity: [[0, 0], [0.55, 1]], y: [[0, 40], [0.55, 0]] });
  expect(anim.accent.in).toEqual(anim.box.in);
  expect(anim.box.out).toEqual({ opacity: [[0, 1], [0.35, 0]], y: [[0, 0], [0.35, 24]] });
  expect(anim.inDuration).toBe(0.55);
  expect(anim.outDuration).toBe(0.35);

  // Out only: the exit changes, the entrance keeps Rise - "rise in, fade out" without a timeline.
  await page.getByTestId('motion-direction-out').click();
  await page.getByTestId('motion-fade').click();
  await expect(summary).toContainText('In: Rise · Out: Fade');
  await settleDurableWrites(page);
  anim = await savedAnim(page, id);
  expect(anim.box.in).toEqual({ opacity: [[0, 0], [0.55, 1]], y: [[0, 40], [0.55, 0]] });
  expect(anim.box.out).toEqual({ opacity: [[0, 1], [0.38, 0]] });
  expect(anim.outDuration).toBe(0.38);

  // The speed knob is NOACG_ANIM.speed - one number, every phase.
  await page.getByTestId('control-speed-1.5').click();
  await expect(summary).toContainText('Faster');
  await settleDurableWrites(page);
  expect((await savedAnim(page, id)).speed).toBe(1.5);

  // A reload reads the cards back from the TEMPLATE: nothing here lived in component state.
  await page.reload();
  await expect(page.getByTestId('graphic-control-page')).toBeVisible();
  await expect(page.getByTestId('control-motion-summary')).toContainText('In: Rise · Out: Fade · Faster');
  await page.getByTestId('control-motion-summary').click();
  await page.getByTestId('motion-direction-in').click();
  await expect(page.locator('.motion-card[data-selected]')).toHaveText(/Rise/);
  await page.getByTestId('motion-direction-out').click();
  await expect(page.locator('.motion-card[data-selected]')).toHaveText(/Fade/);
});

test('engine: a motion rewrite keeps lifecycle calls, ambient loops and layers outside the root, and clears a styled lifecycle arrow', async ({ page }) => {
  await page.goto('/app');
  await expect(page.locator('.topbar')).toBeVisible();
  const r = await page.evaluate(async () => {
    const { variantsFor } = await import('/src/templates/catalog.ts');
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    const { applyMotionPreset, currentMotionPreset, motionTargets, MOTION_PRESETS } = await import('/src/blocks/motionPresets.ts');
    const { deriveMachine } = await import('/src/blocks/animMachine.ts');

    // A clock: its entrance fires startClock and breathes an ambient layer; both are behaviour,
    // not the entrance motion, so they ride through a Fade untouched.
    const clock = variantsFor('starting-soon')[0].create({});
    const clockData = parseAnimData(clock.js)!;
    const clockNext = applyMotionPreset(clock, clockData, { in: 'fade', out: 'fade' })!;
    const loopsBefore = Object.keys(clockData.steps[0].loops ?? {}).sort();
    const loopsAfter = Object.keys(clockNext.steps[0].loops ?? {}).sort();

    // A styled lifecycle arrow would play INSTEAD of the step's keyframes: the rewrite clears it.
    // The strap, with one element parked OUTSIDE its root - where an inserted graphic lives -
    // and its derived machine made explicit so the play arrow can carry a style.
    const plain = variantsFor('lower-third')[0].create({});
    const strap = { ...plain, html: plain.html.replace('</body>', '<div id="outside-part"></div></body>') };
    const base = parseAnimData(strap.js)!;
    const explicit = { ...base, machine: JSON.parse(JSON.stringify(deriveMachine(base))) };
    const play = explicit.machine!.groups[0].transitions.find((t) => t.trigger === 'lifecycle' && t.event === 'play')!;
    play.style = 'push-left';
    play.duration = 0.8;
    // ...and a layer OUTSIDE the root (an inserted graphic's part) keeps its own motion.
    explicit.steps[0].layers['#outside-part'] = { opacity: [{ time: 0, value: 0 }, { time: 1.2, value: 1 }] };
    const strapNext = applyMotionPreset(strap, explicit, { in: 'slide-left' })!;
    const playAfter = strapNext.machine!.groups[0].transitions.find((t) => t.trigger === 'lifecycle' && t.event === 'play')!;
    const stopAfter = strapNext.machine!.groups[0].transitions.find((t) => t.trigger === 'lifecycle' && t.event === 'stop')!;

    // Every preset is recognised back from what it wrote, on every catalog category that
    // carries a data block - the round trip the control page's lit card depends on.
    const misses: string[] = [];
    for (const cat of ['lower-third', 'info-card', 'scoreboard', 'quiz', 'ticker', 'end-credits', 'starting-soon', 'poll', 'audience', 'frame', 'transition', 'esports-score', 'infographic', 'corner-bug']) {
      const t = variantsFor(cat)[0]?.create({});
      const d = t && parseAnimData(t.js);
      if (!t || !d) { misses.push(`${cat}: no data block`); continue; }
      if (motionTargets(t, d).length === 0) misses.push(`${cat}: no unit`);
      for (const p of MOTION_PRESETS) {
        const n = applyMotionPreset(t, d, { in: p.id, out: p.id });
        if (!n) { misses.push(`${cat}/${p.id}: not applied`); continue; }
        if (currentMotionPreset(t, n, 'in') !== p.id) misses.push(`${cat}/${p.id}: in not read back`);
        if (currentMotionPreset(t, n, 'out') !== p.id) misses.push(`${cat}/${p.id}: out not read back`);
      }
      // Hidden data holders (the SPX sources a quiz, a ticker, a clock write into) are never a
      // unit: a motion on a display:none div is noise in the data and nothing on screen.
      const holders = [...new DOMParser().parseFromString(t.html, 'text/html').querySelectorAll('.noacg-data-source')].map((e) => `#${e.id}`);
      for (const h of holders) if (motionTargets(t, d).includes(h)) misses.push(`${cat}: ${h} is a holder, not a unit`);
    }
    return {
      clockCalls: clockNext.steps[0].calls?.map((c) => c.call),
      clockDuration: [clockData.steps[0].duration, clockNext.steps[0].duration],
      loopsBefore,
      loopsAfter,
      playStyle: playAfter.style ?? null,
      stopStyle: stopAfter.style ?? null,
      outsideKept: strapNext.steps[0].layers['#outside-part'],
      inDuration: strapNext.steps[0].duration,
      misses,
    };
  });
  expect(r.clockCalls).toContain('startClock');
  // The clock's entrance step is as long as its kept breath and call need - never truncated.
  expect(r.clockDuration[1]).toBe(r.clockDuration[0]);
  expect(r.loopsAfter).toEqual(r.loopsBefore);
  expect(r.loopsBefore.length).toBeGreaterThan(0);
  expect(r.playStyle).toBeNull();
  expect(r.outsideKept).toEqual({ opacity: [{ time: 0, value: 0 }, { time: 1.2, value: 1 }] });
  // The step stretches to the kept motion's reach (1.2 s) rather than the preset's 0.55 s.
  expect(r.inDuration).toBe(1.2);
  expect(r.misses).toEqual([]);
});

test('wizard: an imported SVG picks from the same ten motions on its Animation step, and the control page reads the pick back', async ({ page }) => {
  await page.goto('/app');
  await dropSvg(page, SCOREBUG_SVG);
  await page.locator('.wz-modal').getByRole('button', { name: 'Next' }).click(); // Animation
  await expect(page.getByTestId('wz-stepcount')).toContainText('4');

  // The universal bank replaces the category's four whole-unit cards; the SVG layer stagger -
  // the one card that knows this design's own layers - stays beside them.
  await expect(page.locator('.motion-card')).toHaveCount(11);
  await expect(page.getByTestId('wz-anim-design-stagger')).toBeVisible();
  await expect(page.locator('.wz-anim', { hasText: 'Pop' })).toHaveCount(1);
  // Fade is the default, lit for both phases before anything is picked.
  await expect(page.locator('.motion-card[data-selected]')).toHaveText(/Fade/);

  await page.getByTestId('motion-slide-left').click();
  await expect(page.locator('.motion-card[data-selected]')).toHaveText(/Slide left/);

  // Finish into a production, then find the saved graphic's control page.
  await page.locator('.wz-modal').getByRole('button', { name: 'Next' }).click(); // Finish
  await expect(page.getByTestId('wz-stepcount')).toContainText('5');
  await page.getByTestId('wz-finish-name').fill('Slid scorebug');
  await page.getByTestId('wz-finish-production-pick').locator('select').selectOption('new');
  await page.getByTestId('wz-finish-production-name').fill('Motion night');
  await page.getByTestId('wz-finish-production-go').click();
  await expect(page.getByTestId('production-page')).toBeVisible({ timeout: 20_000 });
  await settleDurableWrites(page);

  const id = await page.evaluate(async () => {
    const { loadGraphics } = await import('/src/model/library.ts');
    const g = loadGraphics().find((x) => x.name === 'Slid scorebug');
    if (!g) throw new Error('graphic not saved');
    return g.id;
  });
  await page.goto(`/app#/control/${id}`);
  await expect(page.getByTestId('graphic-control-page')).toBeVisible();
  // One engine: what the wizard wrote is what this page reads back.
  await expect(page.getByTestId('control-motion-summary')).toContainText('In: Slide left · Out: Slide left');
  const unit = await page.evaluate(async (gid) => {
    const { graphicById } = await import('/src/model/library.ts');
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    const d = parseAnimData(graphicById(gid)!.template.js)!;
    return { inLayers: Object.keys(d.steps[0].layers), x: d.steps[0].layers['.imported-design-box']?.x?.map((k) => k.value) };
  }, id);
  expect(unit.inLayers).toEqual(['.imported-design-box']);
  expect(unit.x).toEqual([60, 0]);
});
