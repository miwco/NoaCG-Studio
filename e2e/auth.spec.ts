import { test, expect } from '@playwright/test';
import { FAKE_JOIN_ROUTE, TEAM } from './_teams';

// Era 5.6: the editor is open to everyone — there is no login wall anywhere. And with no Supabase
// backend configured (the default, and always the case in this test's env) the app must grow NO
// auth UI at all: no sign-in button, no dialog, no account status. The hosted feature gates
// (AI / community / show chat prompting sign-in) are covered by e2e/configured/anonymous.spec.ts.

test('offline / no-backend: the app loads with no auth UI at all', async ({ page }) => {
  await page.goto('/app');
  // The creation wizard opens straight away — nothing intercepted the app.
  await expect(page.locator('.wz-modal')).toBeVisible();
  // No sign-in dialog, no account status, no Sign in button in offline mode.
  await expect(page.locator('.auth-gate')).toHaveCount(0);
  await expect(page.locator('.auth-status')).toHaveCount(0);
  await expect(page.locator('.auth-signin')).toHaveCount(0);
  // The password-recovery dialog (docs/GOALS_ARCHIVE.md "Student release" step 9) is auth UI too.
  await expect(page.getByTestId('password-recovery')).toHaveCount(0);
  // So is the account's state word, both halves of it (AuthStatus).
  await expect(page.locator('.auth-anon')).toHaveCount(0);
  await expect(page.getByTestId('auth-state')).toHaveCount(0);
});

// The password-reset ROUTE (docs/backlog/password-reset-link-lands-nowhere.md). It renders
// INSTEAD of the studio in hosted mode, which makes it the surface most likely to break the
// offline posture: a component that returned an empty card here would hand a self-hoster a black
// screen, and one that returned its form would grow auth UI on a build with no accounts. So both
// halves are asserted - the studio IS there, and nothing of recovery is.
//
// EVERY WAY IN IS COVERED, because App.tsx routes on two keys: the `?recovery=1` query, and a
// `type=recovery` fragment (what Supabase puts on links that predate the route).
test('offline / no-backend: the recovery route is inert and lands you in the studio', async ({ page }) => {
  for (const url of [
    '/app?recovery=1',
    '/app#access_token=not-a-real-token&type=recovery',
    '/app?recovery=1#error=access_denied&error_code=otp_expired',
  ]) {
    await page.goto(url);
    // The positive half: a real studio surface rendered, so the assertions below are not
    // answering for a blank page.
    await expect(page.locator('.topbar')).toBeVisible();
    await expect(page.getByTestId('password-recovery-page')).toHaveCount(0);
    await expect(page.getByTestId('recovery-expired')).toHaveCount(0);
    await expect(page.getByTestId('recovery-submit')).toHaveCount(0);
    await expect(page.locator('.auth-gate')).toHaveCount(0);
  }
});

test('offline / no-backend: Settings grows no Account section, and a session-expiry event is inert', async ({ page }) => {
  // Step 9 added an Account section to Settings and a session-expired prompt — both are
  // ACCOUNT features, so the offline posture must hold: zero auth UI, however Settings is
  // reached (Home's gear is the no-account door).
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.getByTestId('creation-wizard').locator('.gallery-close').click();
  await page.getByTestId('home-settings').click();
  await expect(page.getByTestId('settings')).toBeVisible();
  await expect(page.getByTestId('settings-account')).toHaveCount(0);

  // The expiry event exists for hosted builds; offline it must never conjure a sign-in dialog.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('spx-session-expired')));
  await expect(page.locator('.auth-gate')).toHaveCount(0);
});

// TEAMS (docs/TEAMS_PLAN.md §7 stage 3). A team is an ACCOUNT feature, so the same posture binds:
// with no backend configured the app must grow ZERO team UI - no menu item, no button, no dialog,
// no chip, and no surface behind the join route. A user who never opens the door never sees the
// word "team", and an offline build has no door to open.
//
// EVERY ABSENCE HERE IS PAIRED WITH A PRESENCE. `toHaveCount(0)` on a selector that never renders
// anywhere is a test that cannot fail, so each block first asserts the CONTAINER the door would
// live in really rendered - the production page's header cluster, the card's own head, Home under
// the join route. The other half of the pair is e2e/configured/teams.spec.ts, which asserts these
// same ids (imported from e2e/_teams.ts, so they cannot drift apart) are VISIBLE when signed in.

test('offline / no-backend: a production grows no team door, on its page or on its card', async ({ page }) => {
  await page.goto('/app#/home/productions');
  await page.getByTestId('new-production-name').fill('Election night');
  await page.getByTestId('new-production').click();

  // The production page: its header cluster rendered (Export is the door's neighbour), and the
  // team door is not in it.
  await expect(page.getByTestId('production-page')).toBeVisible();
  await expect(page.getByTestId('export-production')).toBeVisible();
  await expect(page.getByTestId(TEAM.door)).toHaveCount(0);
  await expect(page.getByTestId(TEAM.chip)).toHaveCount(0);
  await expect(page.getByTestId(TEAM.dialog)).toHaveCount(0);

  // The card on Home: the card and its head rendered, and it has no overflow menu at all -
  // offline the menu has nothing to hold, so it is not drawn.
  await page.goto('/app#/home/productions');
  const card = page.locator('[data-testid^="production-row-"]').first();
  await expect(card).toBeVisible();
  await expect(card.getByTestId('open-production-name')).toBeVisible();
  await expect(card.getByTestId(TEAM.cardMenu)).toHaveCount(0);
  await expect(page.getByTestId(TEAM.door)).toHaveCount(0);
  // The word itself, on the surface the plan singles out. Scoped to the productions grid so the
  // Data workspace's "Teams" table preset (a different sense of the word) cannot answer for it.
  await expect(page.locator('.prod-grid')).not.toContainText(/team/i);
});

test('offline / no-backend: a join-team link opens no dialog and lands on Home', async ({ page }) => {
  await page.goto(FAKE_JOIN_ROUTE);
  // The route resolved to a surface that exists - the productions section, wizard dismissed by
  // the deep-link boot path. That is the positive half.
  await expect(page.getByTestId('new-production-name')).toBeVisible();
  // And nothing of the join flow rendered: not the dialog, not a sign-in prompt conjured by it,
  // not the app-wide auth gate.
  await expect(page.getByTestId(TEAM.joinDialog)).toHaveCount(0);
  await expect(page.getByTestId('signin-prompt')).toHaveCount(0);
  await expect(page.locator('.auth-gate')).toHaveCount(0);
  await expect(page.locator('.team-dialog')).toHaveCount(0);
});
