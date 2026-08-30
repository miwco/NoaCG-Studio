import { test, expect } from '@playwright/test';

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
