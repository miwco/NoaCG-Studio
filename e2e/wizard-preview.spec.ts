import { test, expect, type Page, type FrameLocator } from '@playwright/test';
import { chooseType, pickDesign } from './_browse';

// The wizard's live preview must FEEL live: every choice lands in the composed iframe,
// rapid changes settle on the LAST choice, and the lifecycle demo on the Animation step
// never strands the preview hidden after a mid-demo change (a stop() timer scheduled
// against the previous document must not blank the fresh one).

async function openWizardTo(page: Page, step: 'fields' | 'style' | 'animation') {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await chooseType(page, 'Lower thirds');
  await pickDesign(page, 'Hairline');
  const hops = { fields: 1, style: 2, animation: 3 }[step];
  for (let i = 0; i < hops; i++) await page.getByRole('button', { name: 'Next →' }).click();
}

function preview(page: Page): FrameLocator {
  return page.frameLocator('.wz-side iframe');
}

/** The graphic root inside the preview — visible only after the entrance played. */
function root(page: Page) {
  return preview(page).locator('.lower-third');
}

// These readers run inside the wizard's live iframe, which the debounced rebuild replaces
// wholesale (srcdoc). A read caught mid-swap throws "execution context destroyed" — return
// null instead so an expect.poll retries against the fresh document rather than aborting.
//
// ONLY that class of error. A bare `catch { return null }` turns a mistake in the reader itself
// into a poll that quietly never satisfies, and then reports a timeout instead of naming the
// fault: `expect.poll(reader)` calls the reader with NO arguments, so one written to take
// `page` threw a TypeError on every attempt for fifteen seconds and blamed the product.
const isMidSwap = (err: unknown): boolean =>
  /execution context (?:was )?destroyed|Target (?:page |)closed|frame (?:was )?detached|not attached/i.test(
    String((err as { message?: string })?.message ?? err),
  );

async function rootOpacity(page: Page): Promise<string | null> {
  try {
    return await root(page).evaluate((el) => getComputedStyle(el).opacity);
  } catch (err) {
    if (!isMidSwap(err)) throw err;
    return null;
  }
}

async function previewVar(page: Page, prop: string): Promise<string | null> {
  try {
    return await preview(page)
      .locator(':root')
      .evaluate((el, p) => getComputedStyle(el).getPropertyValue(p).trim(), prop);
  } catch (err) {
    if (!isMidSwap(err)) throw err;
    return null;
  }
}

test('style step: rapid palette clicks settle on the LAST palette, entrance replayed', async ({ page }) => {
  await openWizardTo(page, 'style');
  // Click through several palettes quickly; the debounced rebuild must coalesce
  // to the final choice and the entrance must still play (no blank preview).
  for (const name of ['Mint', 'Royal', 'Frost', 'Inferno']) {
    await page.locator('.wz-palette', { hasText: name }).click();
    await page.waitForTimeout(80);
  }
  const inferno = await page.evaluate(async () => {
    const { paletteById } = await import('/src/model/wizard.ts');
    return paletteById('inferno').accent;
  });
  await expect.poll(() => previewVar(page, '--accent')).toBe(inferno);
  await expect.poll(() => rootOpacity(page)).toBe('1');
});

test('style step: font and size choices land in the rebuilt preview', async ({ page }) => {
  await openWizardTo(page, 'style');
  // Typeface sits behind a disclosure now (re-design/handoff.md §2d) — the collapsed row
  // names the face in use, and the picker opens on ask. Same idiom as Size & position below.
  await page.getByTestId('wz-typeface').locator('summary').click();
  await page.getByTestId('font-select').first().selectOption({ label: 'Space Grotesk' });
  await expect.poll(() => previewVar(page, '--font-heading')).toContain('Space Grotesk');
  // A growth-set face flows through the same path: the first serif the catalog ever had
  // (docs/GOALS_ARCHIVE.md "Student release" step 5) - pick it via search, land it in the build.
  await page.getByTestId('font-select').first().selectOption({ label: 'Playfair Display' });
  await expect.poll(() => previewVar(page, '--font-heading')).toContain('Playfair Display');
  await page.getByTestId('font-select').first().selectOption({ label: 'Space Grotesk' });
  await expect.poll(() => previewVar(page, '--font-heading')).toContain('Space Grotesk');
  // Size and position are TUNING and sit behind a disclosure too. The PALETTE is what this
  // step now leads with alone: every other decision here has a good per-design default and a
  // collapsed row naming it. Open it to reach the knobs (see components/CLAUDE.md).
  await page.getByTestId('wz-size-position').locator('summary').click();
  // Graphic size L scales the WHOLE graphic (the --scale contract), not just the text.
  // 1.25 / 1.2 are StyleStep's SIZES/TYPE_SIZES ladders (widened with the corpus review).
  await page.locator('.panel-section', { hasText: 'Graphic size' }).getByRole('button', { name: 'L', exact: true }).click();
  await expect.poll(() => previewVar(page, '--scale')).toBe('1.25');
  // Text size L scales ONLY the type (the --type-scale contract): the name line's
  // font grows while the graphic's --scale stays where the size knob put it.
  const fontPx = () =>
    preview(page).locator('#f0').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  const before = await fontPx();
  await page.locator('.panel-section', { hasText: 'Text size' }).getByRole('button', { name: 'L', exact: true }).click();
  await expect.poll(() => previewVar(page, '--type-scale')).toBe('1.2');
  expect(await fontPx()).toBeCloseTo(before * 1.2, 0);
  await expect.poll(() => previewVar(page, '--scale')).toBe('1.25');
  await expect.poll(() => rootOpacity(page)).toBe('1');
});

test('fields step: quick typing settles into the preview text', async ({ page }) => {
  await openWizardTo(page, 'fields');
  const sample = page.locator('.wz-line-row input').nth(1); // line 1's sample text
  await sample.fill('Dana Meridian');
  await expect(preview(page).locator('#f0')).toHaveText('Dana Meridian', { timeout: 5000 });
  await expect.poll(() => rootOpacity(page)).toBe('1');
});

test('zoom to graphic: the preview reframes onto a small graphic and back', async ({ page }) => {
  // A corner bug is ~150px of a 1920px canvas — the case the zoom exists for.
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await chooseType(page, 'corner logos');
  await pickDesign(page, 'Glass Mark');

  const iframe = page.locator('.wz-side iframe');
  const scaleOf = async () =>
    Number(((await iframe.getAttribute('style'))!.match(/scale\(([\d.]+)\)/) ?? [])[1]);

  // Wait for the debounced srcdoc + the stage fit, then record the full-canvas scale.
  await expect.poll(scaleOf).toBeGreaterThan(0.2);
  const fullCanvas = await scaleOf();

  const zoomBtn = page.getByRole('button', { name: 'Zoom to graphic' });
  await expect(zoomBtn).toBeEnabled();
  await zoomBtn.click();
  // The reframed view is dramatically closer than the full canvas, and off-centered
  // toward the graphic (the content translate appears in the transform).
  await expect.poll(scaleOf).toBeGreaterThan(fullCanvas * 2);
  expect(await iframe.getAttribute('style')).toMatch(/scale\([\d.]+\) translate\(-?\d/);

  // Toggling back restores the whole-canvas fit.
  await page.getByRole('button', { name: 'Whole canvas' }).click();
  await expect.poll(scaleOf).toBeCloseTo(fullCanvas, 2);
});

test('animation step: the lifecycle demo runs on the GRAPHIC’s clock, not a fixed beat', async ({ page }) => {
  // WHY THE SPEED KNOB LOOKED DEAD ON A FADE (owner, 2026-08-26; GOALS goal 6). Both controls
  // reach the render — measured, the emitted NOACG_ANIM carries speed 0.6/1/1.8, the built
  // entrance lasts 1.333/0.800/0.444s, and a fade's four offered curves produce four different
  // opacity ramps. What hid all of it was this demo loop: stop at 1700ms and replay at 2800ms
  // whatever the graphic did, so every setting played inside ONE fixed 2.8s beat — and the
  // faster the setting, the LONGER the graphic then sat still (367ms of hold at Slower against
  // 1256ms at Faster: the cadence moved the wrong way). A slide survived it because travel is a
  // second cue; a fade has no second cue, which is why it was the one that read as broken.
  //
  // So the beat is derived from the template's own durations. Measured here as the property
  // that makes the knob visible: Slower's cycle is materially longer than Faster's.
  await openWizardTo(page, 'animation');
  const speed = (label: string) =>
    page.locator('.panel-section', { hasText: 'Speed' }).getByRole('button', { name: label, exact: true }).first();

  // Sampled INSIDE the document at animation rate: the off-air window is under a second at the
  // fast setting, which an expect.poll with a growing interval can step straight over.
  const cycleMs = async () => {
    await expect.poll(() => rootOpacity(page), { timeout: 8000 }).toBe('1');
    return root(page).evaluate(
      (el) =>
        new Promise<number>((res) => {
          const t0 = performance.now();
          let left: number | null = null;
          const tick = () => {
            const on = getComputedStyle(el).opacity === '1';
            if (left === null && !on) left = performance.now() - t0;
            // The whole cycle: on air, off air, and back on again.
            if (left !== null && on) return res(performance.now() - t0);
            if (performance.now() - t0 > 7000) return res(-1);
            requestAnimationFrame(tick);
          };
          tick();
        }),
    );
  };

  await speed('Faster').click();
  await page.waitForTimeout(900); // past the srcdoc debounce, so the reading is the new document's
  const fast = await cycleMs();

  await speed('Slower').click();
  await page.waitForTimeout(900);
  const slow = await cycleMs();
  expect(fast).toBeGreaterThan(0);
  expect(slow).toBeGreaterThan(0);

  // A ±80% speed step now changes the loop's own rhythm by most of a second. The old fixed pair
  // made this difference ZERO by construction, which no assertion on the emitted data could see.
  expect(slow).toBeGreaterThan(fast + 400);
});

test('animation step: a mid-demo preset change never leaves the preview hidden', async ({ page }) => {
  await openWizardTo(page, 'animation');
  // The lifecycle demo is running (in, then out, then in again — on the graphic's own clock).
  // Change the preset right around the exit so a stale stop()/play() timer would target the
  // rebuilt document if it survived the rebuild.
  await page.waitForTimeout(1500);
  await page.locator('.wz-anim', { hasText: 'Mask wipe' }).click();
  // Wait past the full demo cycle of the NEW document, then the graphic must be on air.
  await page.waitForTimeout(4500);
  await expect.poll(() => rootOpacity(page), { timeout: 5000 }).toBe('1');
});

test('template cards frame onto the graphic, not the empty canvas around it', async ({ page }) => {
  // A lower third occupies a band of a 1920x1080 frame, so a card that scaled the whole canvas
  // was mostly empty and the designs were hard to tell apart at picking size. Each card now
  // measures its graphic and frames onto it (MiniPreview) — the same reframe "Zoom to graphic"
  // performs. Assert the framing is real (zoomed past the whole-canvas fit) and that the
  // graphic sits INSIDE its card rather than being cropped by the zoom.
  await page.goto('/app');
  // MiniPreview's iframe carries no allow-same-origin (it renders unvetted designs), so its
  // settled box arrives over postMessage rather than a contentDocument read — the listener must
  // be live before any card mounts, since postMessage is a one-shot event, not readable state.
  await page.evaluate(() => {
    (window as unknown as { __miniBoxes: Map<MessageEventSource, unknown> }).__miniBoxes =
      new Map();
    window.addEventListener('message', (ev) => {
      const data = ev.data as { type?: string } | undefined;
      if (data?.type === 'spx-preview-box' && ev.source) {
        (
          window as unknown as { __miniBoxes: Map<MessageEventSource, unknown> }
        ).__miniBoxes.set(ev.source, ev.data);
      }
    });
  });
  await expect(page.getByTestId('creation-wizard')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await chooseType(page, 'Lower thirds');
  await expect(page.locator('.wz-variant').first()).toBeVisible();

  const framing = await page.evaluate(async () => {
    // MiniPreview mounts its iframe only once the card scrolls into view — bring the
    // measured cards on-screen first, then let them settle + measure.
    const cards = [...document.querySelectorAll('.wz-variant')].slice(0, 5);
    cards[0]?.scrollIntoView();
    await new Promise((r) => setTimeout(r, 2500));
    const boxes = (window as unknown as { __miniBoxes: Map<Window, { x: number; y: number; w: number; h: number }> })
      .__miniBoxes;
    const out: { zoom: number; insideL: boolean; insideR: boolean }[] = [];
    cards.forEach((card) => {
      const mini = card.querySelector('.wz-mini')!.getBoundingClientRect();
      const f = card.querySelector('iframe') as HTMLIFrameElement | null;
      const inner = f?.contentWindow ? boxes.get(f.contentWindow) : undefined;
      if (!f || !inner) return;
      const fr = f.getBoundingClientRect();
      const scale = fr.width / f.offsetWidth;         // rendered scale of the canvas
      const fit = mini.width / f.offsetWidth;          // the whole-canvas fit it replaces
      const gx = fr.left + inner.x * scale;
      out.push({
        zoom: scale / fit,
        insideL: gx >= mini.left - 1,
        insideR: gx + inner.w * scale <= mini.right + 1,
      });
    });
    return out;
  });

  expect(framing.length).toBeGreaterThanOrEqual(4);
  for (const f of framing) {
    expect(f.zoom).toBeGreaterThan(1.5); // genuinely reframed, not the old whole-canvas scale
    expect(f.insideL && f.insideR).toBe(true); // and the zoom never crops the design away
  }
});

// ── MEASURED MOTION IN THE PREVIEW (preview/settleGraphic.ts, blocks/animData.ts
// `hasMeasuredMotion`). A credit roll's entrance is not an entrance: it is eighteen seconds of
// travel that starts with every name below the frame. Played from zero on the Fields step it
// answers "what does this design look like" with an empty box for the first second and a half,
// and is not recognisably a credit roll until about twelve. So off the Animation step a graphic
// with measured motion SETTLES, and ▶ Replay is what plays it.

/** How much of the credits viewport the travelling track actually covers, 0-100. */
async function trackCoverage(page: Page): Promise<number | null> {
  try {
    return await preview(page)
      .locator('.credits-box')
      .evaluate((box) => {
        const track = box.ownerDocument.querySelector('#credits-track');
        if (!track) return 0;
        const b = box.getBoundingClientRect();
        const t = track.getBoundingClientRect();
        const overlap = Math.max(0, Math.min(b.bottom, t.bottom) - Math.max(b.top, t.top));
        return b.height > 0 ? Math.round((overlap / b.height) * 100) : 0;
      });
  } catch (err) {
    if (!isMidSwap(err)) throw err;
    return null; // caught mid-swap: let expect.poll retry against the fresh document
  }
}

test('a credit roll is SETTLED in the preview, and Replay is what plays it', async ({ page }) => {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await chooseType(page, 'Credits & thanks');
  await pickDesign(page, 'Classic Roll');
  await page.getByRole('button', { name: 'Next →' }).click(); // Fields

  // Settled: the names are ON SCREEN as soon as the step renders, not on their way there.
  await expect.poll(() => trackCoverage(page), { timeout: 15_000 }).toBeGreaterThan(30);

  // …and the settle is a first frame, never a trap: Replay still runs the roll from the
  // bottom, so the step where somebody wants to watch it has lost nothing.
  await page.getByRole('button', { name: '▶ Replay' }).click();
  await expect.poll(() => trackCoverage(page), { timeout: 8_000 }).toBeLessThan(30);
});
