// The HyperFrames engine flow, end to end on the offline stub provider: pick the engine
// in the wizard, auto-generate a composition document, LIVE preview through the sandboxed
// srcdoc driver (clip windows + the paused GSAP timeline seeked by the driver), Content
// edits applying live through set-vars, deterministic scrubbing, manual code edits with
// last-good protection, reload restore, and the engine-aware export. The Remotion flow
// next door (video-project.spec.ts) must stay untouched by all of this.

import { test, expect, type Page } from '@playwright/test';

/** The preview iframe's content (Playwright reaches into sandboxed srcdoc frames). */
function player(page: Page) {
  return page.frameLocator('.video-player-frame');
}

async function waitForGeneration(page: Page) {
  await expect(page.locator('.ai-msg.assistant').first()).toBeVisible({ timeout: 10_000 });
}

/** Create a HyperFrames project from the wizard (the stinger example -> the HF stinger sample). */
async function createHyperframesProject(page: Page, useExample = true): Promise<void> {
  await page.goto('/app');
  await page.getByRole('button', { name: 'Video or animation with AI' }).click();
  await expect(page.getByTestId('video-step')).toBeVisible();
  // The engine selector: Remotion is preselected; HyperFrames is the experimental card.
  await expect(page.getByTestId('video-engine-remotion')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('video-engine-hyperframes').click();
  await expect(page.getByTestId('video-engine-hyperframes')).toHaveAttribute('aria-checked', 'true');
  if (useExample) {
    await page.getByRole('button', { name: 'Sports stinger', exact: true }).click();
  } else {
    await page.getByTestId('video-prompt').fill('a nice clean opener for my channel');
  }
  await page.getByTestId('video-create').click();
  await expect(page.getByTestId('video-shell')).toBeVisible();
}

test('create with the HyperFrames engine -> stub generation -> live preview renders', async ({ page }) => {
  await createHyperframesProject(page);
  await waitForGeneration(page);

  // The stub's stinger sample renders inside the driver iframe.
  await expect(player(page).getByText('GAME ON')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('video-ai-done')).toBeVisible();
  await expect(page.getByTestId('video-stage-busy')).toHaveCount(0);
  await expect(page.getByTestId('video-code-error')).toHaveCount(0);
  await expect(page.getByTestId('video-preview-error')).toHaveCount(0);

  // The code pane shows the HTML source under its engine-appropriate tab name.
  await expect(page.getByRole('button', { name: 'composition.html' })).toBeVisible();

  // The project records the engine and holds the composition in `html`.
  const stored = await page.evaluate(async () => {
    const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
    const p = useVideoProjectStore.getState().project;
    return { engine: p.engine, hasHtml: p.html.includes('data-composition-id'), tsx: p.tsx };
  });
  expect(stored.engine).toBe('hyperframes');
  expect(stored.hasHtml).toBe(true);
  expect(stored.tsx).toBe('');
});

test('clip windows are framework-owned: a late clip is hidden at frame 0 and shown inside its window', async ({ page }) => {
  await createHyperframesProject(page);
  await waitForGeneration(page);
  await expect(player(page).getByText('GAME ON')).toBeVisible({ timeout: 10_000 });

  // Replace the document with one where a second clip starts at 2s (frame 60 at 30fps).
  await page.evaluate(async () => {
    const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
    const s = useVideoProjectStore.getState();
    const secs = s.project.durationInFrames / s.project.fps;
    s.setSource(`<!doctype html>
<html lang="en">
<head><meta charset="UTF-8" /><title>t</title>
<style>
  body { margin: 0; }
  #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #101319; color: #fff; font: 700 90px Arial; }
  .clip { position: absolute; inset: 0; display: grid; place-items: center; }
</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="${secs}">
  <section id="first" class="clip" data-start="0" data-duration="2" data-track-index="1"><div>EARLY CLIP</div></section>
  <section id="second" class="clip" data-start="2" data-duration="${secs - 2}" data-track-index="1"><div>LATE CLIP</div></section>
</div>
<script>
  window.__timelines = window.__timelines || {};
  var tl = gsap.timeline({ paused: true });
  tl.to('#root', { opacity: 1, duration: 0.1 }, 0);
  window.__timelines['main'] = tl;
</script>
</body>
</html>`);
  });

  // At frame 0 only the early clip is visible…
  const scrub = async (frame: number) => {
    await page.getByTestId('video-scrubber').evaluate((el: HTMLInputElement, f) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(el, String(f));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, frame);
  };
  await expect(player(page).getByText('EARLY CLIP')).toBeVisible({ timeout: 10_000 });
  await scrub(0);
  await expect(player(page).getByText('EARLY CLIP')).toBeVisible();
  await expect(player(page).getByText('LATE CLIP')).toBeHidden();

  // …and inside the late window the driver swaps them (visibility, not motion).
  await scrub(75);
  await expect(player(page).getByText('LATE CLIP')).toBeVisible({ timeout: 5_000 });
  await expect(player(page).getByText('EARLY CLIP')).toBeHidden();
  // Deterministic: scrubbing back restores the first state.
  await scrub(10);
  await expect(player(page).getByText('EARLY CLIP')).toBeVisible({ timeout: 5_000 });
});

test('composition variables edit live in the Content panel (set-vars, no reload)', async ({ page }) => {
  await createHyperframesProject(page);
  await waitForGeneration(page);
  await expect(player(page).getByText('GAME ON')).toBeVisible({ timeout: 10_000 });

  // The Content tab exposes the variables the DOCUMENT declares (title + accent).
  await page.getByTestId('video-tab-content').click();
  await expect(page.getByTestId('video-content-panel')).toBeVisible();
  const titleField = page.getByTestId('video-input-title');
  await expect(titleField).toHaveValue('GAME ON');
  await expect(page.getByTestId('video-input-accent')).toBeVisible();

  // Editing flows into the mounted document immediately (data-var-text substitution).
  await titleField.fill('PLAYOFFS');
  await expect(player(page).getByText('PLAYOFFS')).toBeVisible({ timeout: 10_000 });
  await expect(player(page).getByText('GAME ON')).toHaveCount(0);

  // The value lives on the project (it rides into the composed render document too).
  const stored = await page.evaluate(async () => {
    const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
    return useVideoProjectStore.getState().project.inputs.find((i) => i.key === 'title')?.value;
  });
  expect(stored).toBe('PLAYOFFS');
});

test('manual code edits update the preview; a broken document keeps the last good version', async ({ page }) => {
  await createHyperframesProject(page, false);
  await waitForGeneration(page);
  await expect(player(page).getByText('MAIN TITLE')).toBeVisible({ timeout: 10_000 });

  // A hand-written valid document replaces the sample.
  await page.evaluate(async () => {
    const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
    const s = useVideoProjectStore.getState();
    const secs = s.project.durationInFrames / s.project.fps;
    s.setSource(`<!doctype html>
<html lang="en"><head><meta charset="UTF-8" /><title>m</title>
<style>body{margin:0}#root{position:relative;width:1920px;height:1080px;background:#000;color:#fff;font:700 90px Arial}.clip{position:absolute;inset:0;display:grid;place-items:center}</style>
</head><body>
<div id="root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="${secs}">
  <section class="clip" data-start="0" data-duration="${secs}" data-track-index="1"><div>MANUAL EDIT OK</div></section>
</div>
<script>
  window.__timelines = window.__timelines || {};
  var tl = gsap.timeline({ paused: true });
  tl.to('#root', { opacity: 1, duration: 0.1 }, 0);
  window.__timelines['main'] = tl;
</script>
</body></html>`);
  });
  await expect(player(page).getByText('MANUAL EDIT OK')).toBeVisible({ timeout: 10_000 });

  // Break the contract (no timeline registration): the error banner appears with the
  // teaching message, and the last good document keeps rendering.
  await page.evaluate(async () => {
    const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
    useVideoProjectStore.getState().setSource('<html><body><div>broken</div></body></html>');
  });
  await expect(page.getByTestId('video-code-error')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('video-code-error')).toContainText('composition root');
  await expect(player(page).getByText('MANUAL EDIT OK')).toBeVisible();
});

test('chat refinement applies an undoable change to the document', async ({ page }) => {
  await createHyperframesProject(page);
  await waitForGeneration(page);

  const before = await page.evaluate(async () => {
    const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
    return useVideoProjectStore.getState().project.html;
  });

  // "faster" hits the stub's deterministic tween-shortening rule for this engine.
  await page.getByTestId('video-chat-field').fill('make it faster');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByTestId('video-chat')).toContainText('snappier', { timeout: 10_000 });

  const after = await page.evaluate(async () => {
    const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
    return useVideoProjectStore.getState().project.html;
  });
  expect(after).not.toBe(before);

  // Undo reverts BOTH the code and the chat turn (one snapshot).
  await page.keyboard.press('Control+z');
  const reverted = await page.evaluate(async () => {
    const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
    return useVideoProjectStore.getState().project.html;
  });
  expect(reverted).toBe(before);
});

test('reload restores the HyperFrames project; export offers composition.html', async ({ page }) => {
  await createHyperframesProject(page);
  await waitForGeneration(page);
  await expect(player(page).getByText('GAME ON')).toBeVisible({ timeout: 10_000 });

  // Reload: the engine, the document, and the preview all come back.
  await page.reload();
  await page.locator('.gallery-close').click();
  await expect(page.getByTestId('video-shell')).toBeVisible();
  await expect(player(page).getByText('GAME ON')).toBeVisible({ timeout: 10_000 });
  const engine = await page.evaluate(async () => {
    const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
    return useVideoProjectStore.getState().project.engine;
  });
  expect(engine).toBe('hyperframes');

  // The export tab offers the engine's source download (and the standalone file carries
  // its own GSAP so it is plug-and-play).
  await page.getByTestId('video-tab-export').click();
  const downloadButton = page.getByRole('button', { name: /Download composition\.html/ });
  await expect(downloadButton).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await downloadButton.click();
  const download = await downloadPromise;
  const path = await download.path();
  const fs = await import('node:fs');
  const contents = fs.readFileSync(path, 'utf8');
  expect(contents).toContain('data-composition-id');
  expect(contents).toContain('GSAP (bundled)');
});
