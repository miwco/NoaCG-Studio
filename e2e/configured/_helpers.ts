import { expect, type Page } from '@playwright/test';

// Shared setup for the configured-mode (authenticated) community specs. Credentials come from env so
// the public repo carries no secrets; `haveCreds` gates the whole suite off when they're unset.

export const E2E_EMAIL = process.env.E2E_EMAIL ?? '';
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? '';
export const haveCreds = Boolean(E2E_EMAIL && E2E_PASSWORD);

export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
export const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';

/** Sign in with email + password (fresh Playwright contexts have no persisted session, so the login
 *  gate is shown). Resolves once the app shell is up. */
export async function signIn(page: Page): Promise<void> {
  await page.goto('/');
  const email = page.locator('input[type="email"]');
  await email.waitFor({ state: 'visible', timeout: 15_000 });
  await email.fill(E2E_EMAIL);
  await page.locator('input[type="password"]').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  // The app shell (topbar) appears once auth completes.
  await expect(page.getByRole('button', { name: /Packets/ })).toBeVisible({ timeout: 20_000 });
}

/** Create a project through the wizard (which opens on load). */
export async function createGraphic(page: Page, category: string, variant: string): Promise<void> {
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: category }).click();
  await page.locator('.wz-variant', { hasText: variant }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await page.waitForTimeout(650);
}

/** Remove every community submission owned by the signed-in test account (bulletproof teardown for a
 *  throwaway account that should only ever hold test rows). */
export async function wipeMySubmissions(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const { listMySubmissions, unpublish } = await import('/src/community/communityData.ts');
    const subs = await listMySubmissions();
    for (const s of subs) await unpublish(s.id);
  });
}
