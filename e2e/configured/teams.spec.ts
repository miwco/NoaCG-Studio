import { test, expect } from '@playwright/test';
import { dismissWizard, haveCreds, shot, signIn, SUPABASE_URL } from './_helpers';
import { FAKE_JOIN_ROUTE, TEAM } from '../_teams';

// Teams, stage 3 (docs/TEAMS_PLAN.md §7): the DOOR, in both of its shapes.
//
// This spec is the other half of the offline pin in e2e/auth.spec.ts. That one asserts the team
// ids have count 0 with no backend; this one asserts the SAME ids (both import e2e/_teams.ts) are
// really rendered by a real session against the real RPCs from migrations 0053/0054. Without this
// half, the offline assertions could be green because the selectors were never right.
//
// IT WRITES TO THE BACKEND AND CLEANS UP AFTER ITSELF. Creating a team is the verb under test, so
// there is no way to prove it without a row; the walk deletes the team it made as its last act,
// and the team cascades its membership rows with it. Names carry a timestamp so a run that dies
// mid-way leaves something identifiable rather than something ambiguous.

const TEAM_NAME = () => `E2E team ${new Date().toISOString().slice(11, 19)}`;

test.describe('teams: the share door', () => {
  test.skip(!SUPABASE_URL, 'set VITE_SUPABASE_URL to run the configured-mode suite');

  // ── Signed out ───────────────────────────────────────────────────────────────────────────────
  // A backend IS configured here, so this is the shape the offline suite cannot produce: the
  // door is absent because there is no session, not because there is no server. Teams render
  // nothing rather than a sign-in prompt (TEAMS_PLAN §6) - the one exception is the join link,
  // asserted below.
  test('signed out: a production has no team door anywhere', async ({ page }) => {
    await page.goto('/app#/home/productions');
    await page.getByTestId('new-production-name').fill('Signed-out show');
    await page.getByTestId('new-production').click();
    await expect(page.getByTestId('production-page')).toBeVisible();
    await expect(page.getByTestId('export-production')).toBeVisible();
    await expect(page.getByTestId(TEAM.door)).toHaveCount(0);

    await page.goto('/app#/home/productions');
    const card = page.locator('[data-testid^="production-row-"]').first();
    await expect(card.getByTestId('open-production-name')).toBeVisible();
    await expect(card.getByTestId(TEAM.cardMenu)).toHaveCount(0);
  });

  // A join LINK is the one team surface a signed-out visitor may see, because they arrived on it
  // and have already been told teams exist. It offers the ACCOUNT, leading: a student opening
  // their teacher's link usually has none yet.
  test('signed out: a join link offers an account rather than a wall', async ({ page }) => {
    await page.goto(FAKE_JOIN_ROUTE);
    await expect(page.getByTestId(TEAM.joinDialog)).toBeVisible();
    await expect(page.getByTestId('signin-prompt')).toBeVisible();
    await expect(page.getByTestId('signin-prompt-signup')).toBeVisible();
    // Joining is not offered until there is an account to join with.
    await expect(page.getByTestId(TEAM.join)).toBeDisabled();
    await shot(page, 'teams-join-signed-out');
  });

  // ── Signed in ────────────────────────────────────────────────────────────────────────────────
  test.describe('signed in', () => {
    test.skip(!haveCreds, 'set E2E_EMAIL and E2E_PASSWORD to run the authenticated walk');
    // The walk creates a team, rotates its code, re-joins through the link and deletes the team.
    test.setTimeout(180_000);

    test('creates a team, hands out its code, re-joins by link, and leaves nothing behind', async ({ page }) => {
      await signIn(page);
      await dismissWizard(page);
      await page.goto('/app#/home/productions');
      await page.getByTestId('new-production-name').fill('Teams walk');
      await page.getByTestId('new-production').click();
      await expect(page.getByTestId('production-page')).toBeVisible();

      // THE POSITIVE HALF the offline pin depends on: the door is really rendered, on the
      // production page's header, by this exact test id.
      const door = page.getByTestId(TEAM.door);
      await expect(door).toBeVisible();
      await door.click();
      await expect(page.getByTestId(TEAM.dialog)).toBeVisible();
      // The dialog is honest about what stage 3 does not do: moving is off, and says why.
      await expect(page.getByTestId('move-to-team')).toBeDisabled();
      await shot(page, 'teams-share-pick');

      // Make one.
      const name = TEAM_NAME();
      await page.getByTestId(TEAM.newTeam).click();
      await page.getByTestId(TEAM.newTeamName).fill(name);
      await page.getByTestId(TEAM.newTeamDisplayName).fill('E2E Runner');
      await page.getByTestId(TEAM.createTeam).click();

      // The code screen: 8 URL-safe characters (the 0053 recipe), a link built from it, and the
      // creator in the member list as the owner.
      const code = page.getByTestId(TEAM.joinCode);
      await expect(code).toBeVisible({ timeout: 20_000 });
      const first = (await code.textContent())?.trim() ?? '';
      expect(first).toMatch(/^[A-Za-z0-9_-]{8}$/);
      await expect(page.getByTestId(TEAM.joinLink)).toHaveValue(new RegExp(`#/join-team/${first}$`));
      await expect(page.getByTestId(TEAM.members)).toContainText('E2E Runner');
      await expect(page.getByTestId(TEAM.members)).toContainText('You');
      await shot(page, 'teams-share-code');

      // Rotation is the owner's answer to a leaked code, and it really mints a different one.
      await page.getByTestId(TEAM.rotate).click();
      await expect(code).not.toHaveText(first, { timeout: 20_000 });
      const rotated = (await code.textContent())?.trim() ?? '';
      expect(rotated).toMatch(/^[A-Za-z0-9_-]{8}$/);

      // The link works: re-joining with the same account through the code updates the display
      // name, which is how a member renames themselves (0053 team_join's on-conflict branch).
      await page.goto(`/app#/join-team/${rotated}`);
      await expect(page.getByTestId(TEAM.joinDialog)).toBeVisible();
      await expect(page.getByTestId(TEAM.joinCodeField)).toHaveValue(rotated);
      await page.getByTestId(TEAM.joinDisplayName).fill('E2E Runner II');
      await page.getByTestId(TEAM.join).click();
      await expect(page.getByTestId(TEAM.joinDone)).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId(TEAM.joinDone)).toContainText(name);
      await shot(page, 'teams-join-done');

      // A code nothing matches is refused BY NAME. "Nothing happened" and "that code is wrong"
      // are different answers to a student staring at a class chat, and 0053 distinguishes them.
      await page.goto(FAKE_JOIN_ROUTE);
      await expect(page.getByTestId(TEAM.joinDisplayName)).toBeVisible({ timeout: 20_000 });
      await page.getByTestId(TEAM.joinDisplayName).fill('E2E Runner');
      await page.getByTestId(TEAM.join).click();
      await expect(page.getByTestId('join-team-error')).toContainText(/join code/i);

      // Teardown: the team goes, and its membership rows cascade with it. Two-step, like every
      // destructive control in the app.
      await page.goto('/app#/home/productions');
      const card = page.locator('[data-testid^="production-row-"]').first();
      await card.getByTestId(TEAM.cardMenu).click();
      await page.getByTestId(TEAM.door).click();
      await expect(page.getByTestId(TEAM.dialog)).toBeVisible();
      const row = page.locator('.team-pickrow', { hasText: name });
      // The chip is real, and it is what names a team in the list.
      await expect(row.getByTestId(TEAM.chip)).toBeVisible({ timeout: 20_000 });
      await row.click();
      await page.getByTestId('open-team-details').click();
      await expect(page.getByTestId(TEAM.joinCode)).toBeVisible({ timeout: 20_000 });
      await page.getByTestId(TEAM.deleteTeam).click();
      await page.getByTestId(TEAM.deleteTeam).click();
      await expect(page.locator('.team-pickrow', { hasText: name })).toHaveCount(0, { timeout: 20_000 });
    });
  });
});
