import { test, expect, type Page } from '@playwright/test';
import { pickDesign } from './_browse';

// THE LAYER SCALE (src/styles/base.css): what is allowed to paint over what.
//
// A modal claims the whole app, so nothing the user did not ask for may sit on top of one.
// That held by luck until 2026-09-03, when the analytics consent banner's bare `z-index: 1200`
// was measured against the dialog layer's bare 140 and won over all sixteen of the app's
// dialogs. An undecided visitor could not press the wizard's "Add it and go there" at all, and
// the scheduled configured suite failed on that exact click (issue #50). Six configured specs
// had already been taught to answer the banner before driving anything, each recording the
// overlap as somebody else's problem.
//
// This file is why the fix is not just a smaller number. The first test reads the app's LIVE
// stylesheet and fails on any floating surface that outranks the modal layer, so the next bare
// number fails here rather than in a nightly run against a backend most branches never build.
// The second walks the click from the report.

/** Everything allowed at or above the modal layer, and why each one has earned it. */
const ABOVE_MODAL_IS_INTENDED = [
  '.gallery-backdrop', // the modal layer itself - every dialog in the app wears it
  '.auth-gate', // the sign-in card, which the dialog under it is usually what asked for
];

interface LayerRule {
  selector: string;
  raw: string;
  value: number;
}

/**
 * Every z-index the app's own stylesheet declares, resolved through the scale's tokens.
 *
 * Scoped to OUR css: Vite tags each imported file's <style> with `data-vite-dev-id`, so a
 * dependency's sheet (Monaco ships its own high layers) can never be read as our finding.
 */
async function declaredLayers(page: Page): Promise<LayerRule[]> {
  return page.evaluate(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    const out: { selector: string; raw: string; value: number }[] = [];

    const resolve = (raw: string): number | null => {
      const token = raw.match(/^var\((--[\w-]+)\)$/);
      const literal = token ? rootStyle.getPropertyValue(token[1]).trim() : raw.trim();
      const n = Number.parseInt(literal, 10);
      return Number.isNaN(n) ? null : n;
    };

    const walk = (rules: CSSRuleList) => {
      for (const rule of Array.from(rules)) {
        const grouping = rule as CSSRule & { cssRules?: CSSRuleList };
        if (grouping.cssRules) walk(grouping.cssRules);
        const style = (rule as CSSStyleRule).style;
        if (!style) continue;
        const raw = style.getPropertyValue('z-index').trim();
        if (!raw || raw === 'auto') continue;
        const value = resolve(raw);
        if (value === null) continue;
        out.push({ selector: (rule as CSSStyleRule).selectorText ?? '', raw, value });
      }
    };

    for (const sheet of Array.from(document.styleSheets)) {
      const id = (sheet.ownerNode as HTMLElement | null)?.getAttribute?.('data-vite-dev-id') ?? '';
      const href = sheet.href ?? '';
      const ours = (id || href).includes('/src/') || (id || href).includes('\\src\\');
      const vendored = (id || href).includes('node_modules');
      if (!ours || vendored) continue;
      try {
        walk(sheet.cssRules);
      } catch {
        // A cross-origin sheet cannot be read; ours always can.
      }
    }
    return out;
  });
}

test('the layer scale: nothing the user did not ask for outranks a dialog', async ({ page }) => {
  await page.goto('/app');
  await expect(page.getByTestId('creation-wizard')).toBeVisible();

  // The scale is defined and ordered. Read from the live document rather than the file, so a
  // token deleted or shadowed further down the cascade fails here too.
  const scale = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    const read = (n: string) => Number.parseInt(s.getPropertyValue(n).trim(), 10);
    return {
      notice: read('--z-notice'),
      popover: read('--z-popover'),
      modal: read('--z-modal'),
      modalOver: read('--z-modal-over'),
      authGate: read('--z-auth-gate'),
    };
  });
  expect(Object.values(scale).every(Number.isFinite)).toBe(true);
  expect(scale.notice).toBeLessThan(scale.popover);
  expect(scale.popover).toBeLessThan(scale.modal);
  expect(scale.modal).toBeLessThan(scale.modalOver);
  expect(scale.modalOver).toBeLessThan(scale.authGate);

  const layers = await declaredLayers(page);
  // The sweep that found the 1200 read ~40 declarations; a run that finds a handful has
  // filtered away the stylesheet rather than proved it clean.
  expect(layers.length).toBeGreaterThan(20);

  const trespassers = layers
    .filter((l) => l.value >= scale.modal)
    .filter((l) => !ABOVE_MODAL_IS_INTENDED.some((allowed) => l.selector.includes(allowed)));
  expect(
    trespassers.map((l) => `${l.selector} { z-index: ${l.raw} }`),
    'a floating surface may not outrank the modal layer - put it on the scale in src/styles/base.css',
  ).toEqual([]);

  // And no floating surface writes a bare number: the scale only holds if things join it.
  const bareNumbers = layers
    .filter((l) => !l.raw.startsWith('var('))
    .filter((l) => l.value >= scale.notice);
  expect(
    bareNumbers.map((l) => `${l.selector} { z-index: ${l.raw} }`),
    'a surface at or above the notice layer must read its z-index from the scale, not a literal',
  ).toEqual([]);
});

test('a corner notice cannot take a dialog button click away from the dialog', async ({ page }) => {
  // The walk from issue #50, up to the click that failed.
  await page.goto('/app');
  await expect(page.getByTestId('creation-wizard')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await pickDesign(page, 'Hairline');
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Next →' }).click();
  await expect(page.getByTestId('wz-finish-name')).toBeVisible();
  await page.getByTestId('wz-finish-name').fill('Guest Strap');
  await page.getByTestId('wz-finish-production-name').fill('Friday Show');
  await page.getByTestId('wz-finish-production-go').click();
  await expect(page.getByTestId('wz-finish-production-confirm')).toBeVisible();

  const go = page.getByTestId('wz-finish-production-confirm-go');
  const box = (await go.boundingBox())!;

  // Both notices are mounted here rather than driven, because neither can be: the consent
  // banner only exists on a configured deployment (components/AnalyticsConsentBanner.tsx
  // returns null offline) and the storage-health notice needs a failed durable store. They are
  // real markup wearing the real classes, and the CSS under test is the same CSS.
  //
  // They are also parked ON the button on purpose. Whether the corner they normally sit in
  // happens to reach a given dialog's footer is a question about viewport height, and pinning
  // THAT would pass on a tall runner while a laptop still lost the click. Overlap is the
  // premise of this test, not its subject: what is being measured is who wins one.
  await page.evaluate(
    ({ x, y }) => {
      for (const cls of ['analytics-consent', 'storage-health-notice']) {
        const el = document.createElement('aside');
        el.className = cls;
        el.dataset.testid = cls;
        el.style.left = `${x - 40}px`;
        el.style.top = `${y - 40}px`;
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        el.innerHTML = '<div><strong>Notice</strong></div>';
        document.body.appendChild(el);
      }
    },
    { x: box.x, y: box.y },
  );
  await expect(page.getByTestId('analytics-consent')).toBeVisible();
  await expect(page.getByTestId('storage-health-notice')).toBeVisible();

  // The dialog's own primary still takes the click, and the walk completes.
  await go.click({ timeout: 5_000 });
  await expect(page.getByTestId('production-page')).toBeVisible({ timeout: 20_000 });
});
