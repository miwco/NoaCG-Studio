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

test('the graphics shelf holds one guide per kind', async ({ page }) => {
  await page.goto('/docs');
  const graphics = page.locator('#graphics');
  // The kinds are guides INSIDE one section now, because the left nav carries main topics only
  // (owner, 2026-08-26: end credits and tickers as top-level entries confused it). Their
  // anchors are what the rest of the repo links to, so they have to survive the nesting.
  for (const id of ['scoreboards', 'quiz', 'end-credits', 'tickers']) {
    await expect(graphics.locator(`[id="${id}"]`)).toHaveCount(1);
  }
  // Quizzes and game shows are what the 2026-09-12 student production runs on, so the buttons
  // an operator presses are named here or the guide is decoration.
  await expect(graphics).toContainText('Lock it in');
  await expect(graphics).toContainText('Reveal correct');
  // The scoreboard's one non-obvious behaviour: the goal press moves the score with it.
  await expect(graphics).toContainText('Goal A');
  // And the two text-box formats keep the rule each of them turns on.
  await expect(graphics).toContainText('A colon ends a role');
  await expect(graphics).toContainText('A colon ends a kicker');
});

test('the four guides carry their load-bearing content', async ({ page }) => {
  await page.goto('/docs');

  // (a) Coding agents: the one install command that has to work when copied cold, plus the
  // loop's verbs.
  const agents = page.locator('#claude-code');
  // The lead is one paste-to-agent prompt, and the warning that the user approves the installs
  // it runs belongs beside it rather than only inside the pasted text.
  await expect(agents).toContainText('Paste this to your agent');
  await expect(agents).toContainText('install commands that you have to approve');
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

  // The bootstrap prompt is the block a beginner copies first, so prove that button really
  // writes the whole prompt to the clipboard - all four steps, not a truncated first line.
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  const bootstrap = page.locator('#claude-code .cmd').first();
  await expect(bootstrap.locator('pre')).toHaveClass(/prompt/);
  await bootstrap.locator('.cmd-copy').click();
  await expect(bootstrap.locator('.cmd-copy')).toHaveText('Copied');
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toContain('Set up NoaCG Studio');
  expect(clipboard).toContain('claude plugin install noacg@noacg-studio');
  expect(clipboard).toContain('codex plugin add noacg@noacg-studio');
  // The npx fallback is the reason the prompt exists: a freshly installed plugin only loads in
  // the next session, so the current one has to work without it.
  expect(clipboard).toContain('npx -y @noacg/cli doctor');
  // The angle brackets are written as entities in the markup; the clipboard must carry the
  // characters, or the pasted prompt tells the agent to type "&lt;dir&gt;".
  expect(clipboard).toContain('npx -y @noacg/cli save <dir>');
});

test('the agent guide offers both install routes, and they are the real ones', async ({ page }) => {
  await page.goto('/docs');
  const agents = page.locator('#claude-code');
  // The plugin route is the one that carries the skill and the /noacg:graphic command, so it
  // leads. `owner/repo` is the documented GitHub shorthand and the marketplace name comes from
  // the `name` field in .claude-plugin/marketplace.json - if either half drifts the command
  // silently installs nothing (owner, 2026-08-26: a personal handle here is fine, it is normal
  // practice; what is not fine is the guide not working).
  await expect(agents).toContainText('claude plugin marketplace add miwco/NoaCG-Studio');
  await expect(agents).toContainText('claude plugin install noacg@noacg-studio');
  // Codex installs the same plugin from the same root marketplace manifest, which is what
  // replaced the manual `~/.codex/skills/` copy and the separate `codex mcp add`. Both halves
  // are pinned for the same reason as the Claude pair: a drift here installs nothing, silently.
  await expect(agents).toContainText('codex plugin marketplace add miwco/NoaCG-Studio');
  await expect(agents).toContainText('codex plugin add noacg@noacg-studio');
  // The server on its own stays documented for people who do not want the skill.
  await expect(agents).toContainText('claude mcp add noacg -- npx -y @noacg/cli mcp');
  // Owner, 2026-08-28: the one bootstrap prompt leads and the per-agent commands move down into
  // Reference, deleted nowhere. Both halves are pinned, because the value of the move is that
  // nothing was lost - a reader who wants to run the commands by hand still finds them.
  const reference = page.locator('#claude-code h3#agent-setup');
  await expect(reference).toHaveText('Reference');
  await expect(page.locator('#claude-code .cmd').first().locator('pre')).toHaveClass(/prompt/);
});

test('the docs page routes back into the product', async ({ page }) => {
  await page.goto('/docs');
  // At least one door into the studio, and it opens the creation wizard like the landing's CTAs.
  await expect(page.locator('a[href="/app#/new"]').first()).toBeVisible();
});
