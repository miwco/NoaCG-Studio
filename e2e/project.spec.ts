import { test, expect } from '@playwright/test';
import { awaitPreviewAfterReload, awaitPreviewRebuild } from './_preview';
import { showCode } from './_code';
import { finishIntoEditor, enableAdvancedMode } from './_create';
import { durableValue } from './_storage';
import { chooseType, pickDesign } from './_browse';
import { settleDurableWrites } from './_durable';

// Era 5.2b: the working graphic autosaves locally and survives a reload. Startup follows
// from it - in ADVANCED mode, whose '' route boots into the restored editor (the default
// studio boots to Home/wizard instead; advanced-mode.spec.ts pins that split). Only a
// first-ever visit (no autosaved project) opens the wizard; a returning user lands straight
// back in the restored graphic, and "+ New graphic" / #/new open the wizard on demand.

test('project autosave: the working graphic survives a reload', async ({ page }) => {
  await enableAdvancedMode(page);
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await chooseType(page, 'Lower thirds');
  await pickDesign(page, 'Hairline');
  await awaitPreviewRebuild(page, async () => {
    await finishIntoEditor(page);
  });

  // A distinctive edit into the code (the pane ships closed — open it as a user would).
  await showCode(page);
  await page.locator('.editor-host .monaco-editor').click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('<!-- autosave-marker-42 -->');
  await page.waitForTimeout(1200); // let the 800ms autosave debounce fire

  // It persisted to the durable store (IndexedDB), and the test that follows is a RELOAD - so
  // what has to be true is that the DATABASE holds it, not that the app's mirror does
  // (e2e/_storage.ts durableValue).
  await expect
    .poll(async () => (await durableValue(page, 'spx-gfx-project'))?.includes('autosave-marker-42') ?? false)
    .toBe(true);

  // Reload → the working template is restored, and the user lands STRAIGHT in it: no wizard
  // over a returning user's work (the wizard auto-opens only when there is no project).
  await page.reload();
  await awaitPreviewAfterReload(page);
  await expect(page.locator('.wz-modal')).toBeHidden();
  const restored = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.html;
  });
  expect(restored).toContain('autosave-marker-42');

  // The wizard stays one step away: the routed #/new opens it, and leaving the route (the
  // in-app ✕) rewinds cleanly back to the editor.
  await page.goto('/app#/new');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('.gallery-close').click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await expect(page).toHaveURL(/\/app$/);
});

test('the wizard door is on every /app surface, beside Home', async ({ page }) => {
  // Owner, 2026-08-27: "I don't get there fast enough from other views." The bar's model is
  // logo = the public front page, Home = your work, + New graphic = make something - and it
  // only held on Home and in the editor. The production DASHBOARD, the surface a show is run
  // from, had no door at all, and the video shell's opened the wizard through the store flag
  // rather than the ROUTE, so Back could not close it. One component now (components/
  // NewGraphicButton.tsx), so the five cannot drift apart again.
  await page.goto('/app');
  const ids = await page.evaluate(async () => {
    const { variantsFor } = await import('/src/templates/catalog.ts');
    const { createGraphic } = await import('/src/model/library.ts');
    const { createShowNamed, addGraphicToShow } = await import('/src/model/shows.ts');
    const template = variantsFor('lower-third')[0].create({});
    const { doc, error } = createGraphic(template, { name: 'Door test', packageId: null });
    if (error || !doc) throw new Error(error ?? 'seed failed');
    const show = createShowNamed('Door test show');
    addGraphicToShow(show.id, doc.template, { graphicId: doc.id });
    return { graphicId: doc.id, showId: show.id };
  });
  await settleDurableWrites(page);

  /** Walk the door on one surface: it is visible, it routes to #/new, and Back returns. */
  const walkDoor = async (hash: string, door: string) => {
    await page.goto(`/app${hash}`);
    const button = page.locator(door);
    await expect(button).toBeVisible();
    await button.click();
    // Creating REPLACES the working document, so every door routes through the
    // unsaved-changes guard (store/saveActions.ts). Discard, the choice e2e/_create.ts
    // makes for the same reason: the guard's own behaviour is library.spec.ts's subject.
    const guard = page.getByTestId('confirm-switch');
    if (await guard.isVisible()) await guard.getByTestId('switch-discard').click();
    await expect(page).toHaveURL(/#\/new/);
    await expect(page.getByTestId('creation-wizard')).toBeVisible();
    // ROUTED, not a store flag: Back closes it and lands on the surface it was opened from.
    await page.goBack();
    await expect(page.getByTestId('creation-wizard')).toBeHidden();
  };

  await walkDoor('#/home', '[data-testid="home-new-project"]');
  await walkDoor(`#/control/${ids.graphicId}`, '[data-testid="control-new-project"]');
  await walkDoor(`#/production/${ids.showId}`, '.pd-header [data-testid="new-graphic"]');
  await walkDoor(`#/graphic/${ids.graphicId}`, '.topbar [data-testid="new-graphic"]');
  await walkDoor('#/video', '.topbar [data-testid="new-graphic"]');

  // BESIDE HOME, not merely present: on both editor shells the door is the control
  // immediately before the Home button, so the same reach works in either one.
  for (const hash of [`#/graphic/${ids.graphicId}`, '#/video']) {
    await page.goto(`/app${hash}`);
    await expect(page.locator('.topbar [data-testid="open-home"]')).toBeVisible();
    const adjacent = await page.evaluate(() => {
      const door = document.querySelector('.topbar [data-testid="new-graphic"]');
      return door?.nextElementSibling?.getAttribute('data-testid') ?? null;
    });
    expect(adjacent).toBe('open-home');
  }
});
