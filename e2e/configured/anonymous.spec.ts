import { test, expect } from '@playwright/test';
import { dismissWizard, SUPABASE_URL } from './_helpers';
import { enableAdvancedMode } from '../_create';
import { chooseType, pickDesign } from '../_browse';

// Era 5.6 — the open editor. With a backend CONFIGURED, an anonymous visitor can still do the whole
// core workflow (create → preview → export) with no account; only the account features (cloud sync,
// community, AI, show chat) prompt for sign-in. Needs the configured dev server but NO credentials,
// so it runs even when E2E_EMAIL/PASSWORD are unset.

test.describe('anonymous visitor (open editor)', () => {
  test.skip(!SUPABASE_URL, 'set VITE_SUPABASE_URL to run the configured-mode suite');

  test('creates a graphic and reaches export with no account', async ({ page }) => {
    // THE STUDENT'S OWN ROUTE, which is what this test is for: wizard → Finish → export, with
    // the editor never opening. It used to walk out through the Finish step's EDITOR door, which
    // the student release put behind Advanced mode (docs/GOALS_ARCHIVE.md "Student release"
    // step 4) - so signed out, with no Advanced mode to enable it, the door this waited for
    // cannot exist. Exporting is not a reward for opening the editor, and neither is proving
    // that it works without an account.
    await page.goto('/app');
    // No wall: the creation wizard opens straight away and no sign-in dialog is up.
    await expect(page.locator('.wz-modal')).toBeVisible();
    await expect(page.locator('.auth-card')).toHaveCount(0);

    await page.locator('[data-entry="template"]').click();
    await chooseType(page, 'Lower thirds');
    await pickDesign(page, 'Hairline');
    await page.getByTestId('wz-skip-to-finish').click();
    await expect(page.locator('.wz-finish-summary')).toContainText('Hairline');
    // Signed out, the editor door is absent and the export door is not.
    await expect(page.getByTestId('wz-finish-editor')).toHaveCount(0);
    await page.getByTestId('wz-finish-export').click();

    // Export works signed out: validation and the targets are core, not account features.
    await expect(page.getByTestId('export-window')).toBeVisible();
    await expect(page.getByTestId('export-window')).toContainText(/SPX/);
    await expect(page.getByTestId('signin-prompt')).toHaveCount(0);
  });

  test('the AI door offers a free account, not just a sign-in', async ({ page }) => {
    // Anonymous Lite stays OFF by decision, so this gate is the product's whole answer to a
    // student who has no account: it must name the free account and offer making one. A lone
    // "Sign in" told them to do something they cannot do.
    await page.goto('/app');
    // THE PRICE IS ON THE CARD, before the door is opened. "Create with AI" reads as a paid
    // feature to anyone who has met one, and the entry step is where a visitor decides whether
    // to open it at all - a student who reads "AI" as "costs money" never clicks, and the gate
    // below never gets to answer them. Offline builds say nothing (no backend, no accounts, no
    // Lite), which e2e/wizard-entry-fit.spec.ts pins from the other side.
    await expect(page.locator('[data-entry="ai"] .hint')).toContainText('Free with NoaCG Lite');
    await page.locator('[data-entry="ai"]').click();

    const prompt = page.getByTestId('signin-prompt');
    await expect(prompt).toBeVisible();
    await expect(prompt).toContainText(/free NoaCG account/);

    // Create-account leads, sign-in stays beside it, and the dialog opens ON the signup half.
    await prompt.getByTestId('signin-prompt-signup').click();
    await expect(page.locator('.auth-card')).toBeVisible();
    await expect(page.locator('.auth-submit')).toHaveText('Create account');
    const legal = page.locator('.auth-legal');
    await expect(legal).toHaveText(
      'By creating an account, you agree to the Terms and acknowledge the Privacy Policy.',
    );
    await expect(legal.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    await expect(legal.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
    // Closed with the dialog's OWN ✕, not Escape: Escape reaches the wizard behind it too, and
    // a closed wizard takes the gate under test off the page.
    await page.locator('.auth-card .gallery-close').click();
    await expect(page.locator('.auth-card')).toHaveCount(0);

    await prompt.getByTestId('signin-prompt-signin').click();
    await expect(page.locator('.auth-submit')).toHaveText('Sign in');
    await page.locator('.auth-card .gallery-close').click();

    // The IMPORT half stays outside the gate — its "Open as code (no AI)" door only appears
    // once a file is dropped, so what is assertable here is that the drop zone is still live.
    await expect(page.locator('.wz-drop')).toBeVisible();
  });

  test('account features prompt for sign-in instead of walling the app', async ({ page }) => {
    // An EDITOR subject (the AI panel, the Community button), so it needs the editor - which is
    // Advanced mode now. Signing in is what turns that on for the other specs here; signed out,
    // this has to ask for it itself.
    await enableAdvancedMode(page);
    await page.goto('/app');
    await dismissWizard(page); // reach the topbar + panels underneath

    // Topbar offers Sign in (and no signed-in account status).
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(page.locator('.auth-status')).toHaveCount(0);

    // AI is an account feature in hosted mode: the panel shows the sign-in prompt, not controls.
    await page.getByRole('button', { name: 'AI', exact: true }).click();
    await expect(page.getByTestId('signin-prompt')).toBeVisible();

    // Community opens the sign-in dialog, not an empty gallery.
    await page.getByRole('button', { name: /Community/ }).click();
    await expect(page.locator('.auth-card')).toBeVisible();
    await expect(page.locator('.auth-card')).toContainText('community');

    // Esc closes the dialog — signing in is always optional.
    await page.keyboard.press('Escape');
    await expect(page.locator('.auth-card')).toHaveCount(0);
  });
});
