import { test, expect } from '@playwright/test';

// Era 5.1: auth is invite-only and HOSTED-only. With no Supabase backend configured (the default,
// and always the case in this test's env) the AuthGate must be a complete no-op: no login screen,
// no sign-in status, the app loads exactly as before. The gated/allowlist path requires a live
// Supabase and is maintainer-verified per docs/ERA5_PLAN.md (code-first posture).

test('offline / no-backend: the app loads with no login gate', async ({ page }) => {
  await page.goto('/');
  // The creation wizard opens straight away — the gate did not intercept the app.
  await expect(page.locator('.wz-modal')).toBeVisible();
  // No login screen and no sign-in status anywhere in offline mode.
  await expect(page.locator('.auth-gate')).toHaveCount(0);
  await expect(page.locator('.auth-status')).toHaveCount(0);
});
