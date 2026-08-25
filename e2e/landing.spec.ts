import { test, expect } from '@playwright/test';
import { createProject } from './_create';

// The public landing page lives at "/" (static, no React); the editor lives at "/app"
// (dev/preview: the app-clean-url Vite plugin; production: Vercel cleanUrls). Old share
// links that pointed at the root with a query keep working via the landing's redirect shim.

test('root shows the landing page, not the editor', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Run the show');
  // Every "Start creating" call to action lands on the CREATION WIZARD (`#/new`), not on
  // whatever document happened to be open last. Arriving from the marketing page means
  // "I want to make something"; dropping a returning visitor straight into an old project
  // answers a question they did not ask. The wizard's own Entry step is where continuing
  // existing work is offered, so nothing is lost by starting there.
  const ctas = page.locator('a.btn-amber[href^="/app"]');
  await expect(ctas).not.toHaveCount(0);
  for (const cta of await ctas.all()) {
    await expect(cta).toHaveAttribute('href', '/app#/new');
  }
  // The editor itself did not mount here.
  await expect(page.locator('.wz-modal')).toHaveCount(0);
  await expect(page.locator('#root')).toHaveCount(0);
});

test('the editor lives at /app (clean URL, dev parity with production)', async ({ page }) => {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
});

test('the landing CTA opens the wizard even for a visitor with work in progress', async ({ page }) => {
  // A returning visitor: an autosaved project exists, so a bare /app would go straight to the
  // editor. The CTA route must still open the wizard — that is the whole point of the change.
  await createProject(page, 'Hairline');
  await expect(page.locator('.wz-modal')).toHaveCount(0);

  await page.goto('/app#/new');
  await expect(page.locator('.wz-modal')).toBeVisible();

  // And their work is still there to go back to: closing the wizard returns to the project
  // rather than discarding it.
  await page.locator('.gallery-close').click();
  await expect(page.locator('.wz-modal')).toHaveCount(0);
  await expect(page.locator('iframe.preview-frame')).toBeVisible();
});

test('the landing says the two things that used to be invisible', async ({ page }) => {
  // Two shipped capabilities the page previously never mentioned (a capability nobody can
  // discover does not exist): SVG import as THE way to bring your own graphic in, and the
  // agent door — coding agents making NoaCG graphics through the published @noacg/cli.
  await page.goto('/');

  // The import card leads with SVG and links to the authoring guide.
  const importCard = page.locator('.way', { hasText: 'Import your own graphic' });
  await expect(importCard).toContainText('SVG');
  await expect(importCard.locator('a[href="/docs#svg"]')).toHaveCount(1);

  // The agent-door section shows the real, installable command — never a mocked terminal.
  const agents = page.locator('#agents');
  await expect(agents).toContainText('Claude Code');
  await expect(agents).toContainText('npx @noacg/cli');
  await expect(agents.locator('a[href="/docs#claude-code"]')).toHaveCount(1);

  // And the docs home is reachable from the page chrome.
  await expect(page.locator('header nav a[href="/docs"]')).toHaveCount(1);
  await expect(page.locator('footer a[href="/docs"]')).toHaveCount(1);
});

test('old root share links redirect into the app with their query intact', async ({ page }) => {
  await page.goto('/?chat=my-show');
  await page.waitForURL('**/app?chat=my-show');
  await page.goto('/?template=some-slug');
  await page.waitForURL('**/app?template=some-slug');
});
