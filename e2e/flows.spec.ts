import { test, expect, type Page } from '@playwright/test';

// Core UI flows. These drive the real app (dev server) end-to-end.

/** Open the app and create a project from the named starter template. */
async function createProject(page: Page, templateName: string) {
  await page.goto('/');
  await expect(page.locator('.gallery-backdrop')).toBeVisible();
  await page.locator('.gallery-card', { hasText: templateName }).first().click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.gallery-backdrop')).toBeHidden();
}

/** Switch the right-hand side panel to a given tab (Data, Blocks, Brand, Learn, …). */
function sidePanelTab(page: Page, label: string) {
  return page.locator('.panel-tabs .tab', { hasText: label });
}

test('gallery: choose a template and create a project', async ({ page }) => {
  await createProject(page, 'Lower Third');
  await expect(page.locator('.topbar .tpl-name')).toHaveText('Lower Third');
});

test('blocks: search, apply, tab-jump, toast + undo', async ({ page }) => {
  await createProject(page, 'Blank');
  await sidePanelTab(page, 'Blocks').click();

  // Search flattens the tree.
  await page.locator('.block-search').fill('name');
  const nameTitle = page.locator('.block-btn', { hasText: 'Name + title' });
  await expect(nameTitle).toBeVisible();

  await nameTitle.click();

  // Applying jumps the code editor to the CSS tab and shows an undo toast.
  await expect(page.locator('.block-toast')).toContainText('Name + title');
  await expect(page.locator('.tabs .tab.active')).toHaveText('CSS');

  // The inserted element appears in the live preview.
  const preview = page.frameLocator('iframe.preview-frame');
  await expect(preview.locator('#f0')).toBeVisible();

  // Undo removes it again.
  await page.locator('.block-toast').getByText('Undo').click();
  await expect(page.locator('.block-toast')).toBeHidden();
  await expect(preview.locator('#f0')).toHaveCount(0);
});

test('preview: safe-area guide toggle draws overlay rects', async ({ page }) => {
  await createProject(page, 'Lower Third');
  const svg = page.locator('svg.canvas-guides');
  await expect(svg).toBeVisible();
  const rectsBefore = await svg.locator('rect').count(); // outline only
  await page.locator('.preview-toolbar .guide-switch button', { hasText: 'Safe' }).click();
  await expect.poll(() => svg.locator('rect').count()).toBeGreaterThan(rectsBefore);
});

test('export: downloads a plug-and-play SPX zip', async ({ page }) => {
  await createProject(page, 'Lower Third');
  await sidePanelTab(page, 'Export').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Validate & download/ }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.zip$/);
});
