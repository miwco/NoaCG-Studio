import { test, expect } from '@playwright/test';

// The public docs home lives at /docs (docs.html - static, indexed, no React; the tenth MPA
// entry). Dev/preview serve the clean URL through the app-clean-url Vite plugin, production
// through Vercel cleanUrls, so this spec walking `/docs` is what keeps the route real in
// both worlds. Content assertions pin the load-bearing lines of each guide: the page's whole
// job is that a beginner can follow them cold, and a guide that silently lost its command or
// its honesty note is a broken promise, not a styling bug.

test('/docs serves the static docs home, not the app', async ({ page }) => {
  await page.goto('/docs');
  await expect(page.locator('h1')).toContainText('Guides');
  // Static page: no React mount points, no wizard.
  await expect(page.locator('#root')).toHaveCount(0);
  await expect(page.locator('.wz-modal')).toHaveCount(0);
  // Public and indexed: a noindex here would silently delist the whole surface.
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test('every section-nav link points at a section that exists', async ({ page }) => {
  await page.goto('/docs');
  const links = page.locator('.doc-nav a[href^="#"]');
  const count = await links.count();
  expect(count).toBeGreaterThanOrEqual(8);
  for (let i = 0; i < count; i++) {
    const href = await links.nth(i).getAttribute('href');
    await expect(page.locator(`section[id="${href!.slice(1)}"]`)).toHaveCount(1);
  }
});

test('the four guides carry their load-bearing content', async ({ page }) => {
  await page.goto('/docs');

  // (a) Coding agents: the one install command that has to work when copied cold, plus the
  // loop's verbs.
  const agents = page.locator('#claude-code');
  await expect(agents).toContainText('claude mcp add noacg -- npx -y @noacg/cli mcp');
  await expect(agents).toContainText('npm i -g @noacg/cli');
  await expect(agents).toContainText('scaffold');
  await expect(agents).toContainText('validate');
  await expect(agents).toContainText('save');
  await expect(agents).toContainText('Claude Code');

  // (b) CasparCG: the live-link command, and the honesty note. The connect feature has not
  // yet driven a real server, and the docs must stay true on the day someone tries it.
  const caspar = page.locator('#casparcg');
  await expect(caspar).toContainText('CG 1-20 ADD 1');
  await expect(caspar).toContainText('not yet driven a real CasparCG server');

  // (c) Browser sources: the rules that make or break an OBS/vMix setup.
  const browser = page.locator('#browser-source');
  await expect(browser).toContainText('Shutdown source when not visible');
  await expect(browser).toContainText('vMix');

  // (d) SVG authoring: the rule the whole feature turns on.
  const svg = page.locator('#svg');
  await expect(svg).toContainText('Keep text as text');
  await expect(svg).toContainText('Illustrator');
});

test('every command block is one copy-paste, with a copy button', async ({ page }) => {
  await page.goto('/docs');
  const blocks = page.locator('.doc-body pre');
  const count = await blocks.count();
  expect(count).toBeGreaterThanOrEqual(10);
  // src/docs/docs.ts wraps each <pre> and adds the button; the page is complete without it,
  // so a broken module shows up here rather than as a silently unhelpful page.
  await expect(page.locator('.doc-body .cmd')).toHaveCount(count);
  await expect(page.locator('.doc-body .cmd-copy')).toHaveCount(count);

  // The install block is the one a beginner copies first, so prove that button really writes
  // the command to the clipboard.
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  const install = page.locator('#claude-code .cmd').first();
  await install.locator('.cmd-copy').click();
  await expect(install.locator('.cmd-copy')).toHaveText('Copied');
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard.trim()).toBe('claude mcp add noacg -- npx -y @noacg/cli mcp');
});

test('the docs carry no personal GitHub handle in their visible copy', async ({ page }) => {
  await page.goto('/docs');
  // The repository still lives under a personal account, so its URL is what a Source link
  // has to point at. Nobody should have to READ or TYPE that handle: the install path is
  // npm-only on purpose, and a marketplace command carrying it would put it back on screen.
  const visible = await page.locator('body').innerText();
  expect(visible).not.toMatch(/miwco/i);
});

test('the docs page routes back into the product', async ({ page }) => {
  await page.goto('/docs');
  // At least one door into the studio, and it opens the creation wizard like the landing's CTAs.
  await expect(page.locator('a[href="/app#/new"]').first()).toBeVisible();
});
