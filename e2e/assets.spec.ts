import { test, expect, type Page } from '@playwright/test';

// The Assets panel: its own dock tab (desktop + mobile), row-based file list with folders,
// undoable imports, the derived info section, reference-safe moves, and the v2 -> v3
// layout migration that surfaces the new tab for existing users.

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

/** A minimal file that passes the Lottie signature gate (v + layers + numeric w/h). */
const TINY_LOTTIE = Buffer.from(
  JSON.stringify({ v: '5.7.0', fr: 30, ip: 0, op: 60, w: 512, h: 512, layers: [] }),
);

async function createHairline(page: Page) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Hairline' }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await page.waitForTimeout(650); // debounced preview rebuild
}

async function openAssetsTab(page: Page) {
  await page.getByTestId('dock-tab-assets').click();
  await expect(page.getByTestId('assets-panel')).toBeVisible();
}

test('import via the Assets tab: rows appear grouped, and a multi-file import is ONE undo step', async ({ page }) => {
  await createHairline(page);
  await openAssetsTab(page);

  await page.getByTestId('assets-import-input').setInputFiles([
    { name: 'team-logo.png', mimeType: 'image/png', buffer: TINY_PNG },
    { name: 'sponsor.png', mimeType: 'image/png', buffer: TINY_PNG },
  ]);
  await expect(page.getByTestId('asset-row')).toHaveCount(2);
  await expect(page.locator('.asset-folder-head').first()).toHaveText('images/');
  await expect(page.locator('[data-path="images/team-logo.png"]')).toBeVisible();

  // ONE Ctrl+Z reverts the whole import (addAssets batches into one history snapshot).
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('asset-row')).toHaveCount(0);
});

test('the info section derives name, format, dimensions, size, alpha, and usage', async ({ page }) => {
  await createHairline(page);
  await openAssetsTab(page);

  await page.getByTestId('assets-import-input').setInputFiles({
    name: 'team-logo.png', mimeType: 'image/png', buffer: TINY_PNG,
  });
  // Importing selects the new asset; the info section fills in as the probe lands.
  const info = page.getByTestId('asset-info');
  await expect(info).toBeVisible();
  await expect(info).toContainText('team-logo.png');
  await expect(info).toContainText('image/png');
  await expect(info).toContainText('1 × 1 px');
  await expect(info.locator('.asset-fact', { hasText: 'Transparency' })).toContainText(/yes|no/);
  await expect(info).toContainText('not referenced');
});

test('remove is undoable; a Lottie file imports with its badge; junk JSON is rejected', async ({ page }) => {
  await createHairline(page);
  await openAssetsTab(page);

  await page.getByTestId('assets-import-input').setInputFiles({
    name: 'burst.json', mimeType: 'application/json', buffer: TINY_LOTTIE,
  });
  await expect(page.locator('[data-path="lottie/burst.json"]')).toBeVisible();
  await expect(page.locator('.asset-badge-lottie')).toHaveText('LOTTIE');
  // The info section reads the animation's authored size and timing.
  await expect(page.getByTestId('asset-info')).toContainText('512 × 512 px');
  await expect(page.getByTestId('asset-info')).toContainText('2s · 30 fps');

  // A .json without the Lottie signature is rejected with an honest note.
  await page.getByTestId('assets-import-input').setInputFiles({
    name: 'random.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":"world"}'),
  });
  await expect(page.locator('.assets-panel .status-bad')).toContainText('not a Lottie animation');
  await expect(page.getByTestId('asset-row')).toHaveCount(1);

  // Remove, then undo restores it.
  await page.getByRole('button', { name: '✕ Remove' }).click();
  await expect(page.getByTestId('asset-row')).toHaveCount(0);
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-path="lottie/burst.json"]')).toBeVisible();
});

test('moving an asset into a new folder nests its path; undo restores it', async ({ page }) => {
  await createHairline(page);
  await openAssetsTab(page);

  await page.getByTestId('assets-import-input').setInputFiles({
    name: 'team-logo.png', mimeType: 'image/png', buffer: TINY_PNG,
  });
  await expect(page.locator('[data-path="images/team-logo.png"]')).toBeVisible();

  // "New folder…" in the Move select prompts for a name.
  page.once('dialog', (d) => void d.accept('logos'));
  await page.getByTestId('asset-info').locator('select').selectOption('__new__');
  await expect(page.locator('[data-path="images/logos/team-logo.png"]')).toBeVisible();
  await expect(page.locator('.asset-folder-head', { hasText: 'images/logos/' })).toBeVisible();

  // The move is one undoable apply.
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-path="images/team-logo.png"]')).toBeVisible();
});

test('a saved v2 layout gains the Assets tab once (v2 -> v3 migration)', async ({ page }) => {
  await createHairline(page);
  // Seed a hand-written v2 layout (no assets panel anywhere). NEVER via addInitScript —
  // it would also run inside the same-origin preview iframe on every rebuild.
  await page.evaluate(() => {
    localStorage.setItem(
      'spx-gfx-layout',
      JSON.stringify({
        version: 2,
        docks: {
          left: { panels: ['code'], active: 'code', size: 0.28 },
          right: { panels: ['inspector', 'data', 'control', 'style', 'ai', 'export'], active: 'inspector', size: 0.26 },
          bottom: { panels: [], active: null, size: 0.3 },
        },
        timelineSize: 0.4,
      }),
    );
  });
  await page.reload();
  await page.locator('.gallery-close').click();
  // The migration inserted Assets right after Style in the right dock.
  await expect(page.locator('[data-testid="dock-right"] .dock-tab-label')).toHaveText([
    'Inspector', 'Data', 'Control', 'Style', 'Assets', 'AI', 'Export',
  ]);
});

test('mobile: the Assets tab is in the side-panel strip', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await createHairline(page);
  const tab = page.locator('.panel-tabs .tab', { hasText: 'Assets' });
  await expect(tab).toBeVisible();
  await tab.click();
  await expect(page.getByTestId('assets-panel')).toBeVisible();
});
