import { test, expect } from '@playwright/test';
import { toApp, HELPERS } from '../_bench';
import { ONLY_DESIGNS, SCOPE_NOTE, categoryOutOfScope } from '../_catalogScope';

// The CALIBRATION TRIPWIRE: every catalog variant's create() output must pass its own runtime
// bench (src/validation/runtimeBench.ts) - the house catalog is the ground truth the thresholds
// are tuned against, so a bench change that fails the catalog is a bench bug, not a catalog bug.
// This is a CATALOG-WIDE quality gate, not a feature-flow test: it does not run as part of the
// default `npm run test:e2e` merge-gate suite (excluded via playwright.config.ts's testIgnore,
// same as e2e/configured/). Run it explicitly with `npm run test:e2e:catalog` after any change to
// the catalog itself or to the bench, same as `node scripts/type-floor.mjs` and
// `node scripts/overflow-sweep.mjs` - see AGENTS.md's "Catalog quality gates" section.

const CATEGORIES = [
  'lower-third',
  'info-card',
  'end-credits',
  'ticker',
  'starting-soon',
  'game-timer',
  'scoreboard',
  'corner-bug',
  'infographic',
  'versus',
  'quiz',
  'frame',
  'transition',
  'alert',
  'public-info',
  'esports-score',
  'matchup',
  'results-board',
  'reveal',
  'poll',
  'audience',
  'stream-notification',
] as const;

// Slice budgets: a large category benches as SLICES[category] parallel test units (variant i
// belongs to slice i % slices, so every variant is covered by construction). At ~1-1.5 s per
// variant a single test's 120 s timeout caps a category near 80 designs - lower-third reached
// 90 - and slicing turns growth into more parallel units instead of one longer test. Bump a
// category's number when a slice nears ~40 variants; a category not named here runs whole.
const SLICES: Partial<Record<(typeof CATEGORIES)[number], number>> = {
  'lower-third': 4,
  'info-card': 4,
  'corner-bug': 2,
  'infographic': 2,
};

test.describe('catalog calibration tripwire', () => {
  for (const category of CATEGORIES) {
    const slices = SLICES[category] ?? 1;
    for (let slice = 0; slice < slices; slice++) {
      const label = slices === 1 ? category : `${category} slice ${slice + 1} of ${slices}`;
      test(`every ${label} variant passes the bench${SCOPE_NOTE}`, async ({ page }) => {
        // BEFORE THE APP BOOTS, not after. The in-page filter below decides which designs are
        // benched; this decides whether the unit runs at all. Without it a run scoped to one lower
        // third still paid 30 app boots and 30 catalog imports to bench one design, which is most
        // of the cost this scoping exists to remove. The category list only ever arrives from
        // scripts/catalog-affected.mjs, and e2e/catalog/scope-guard.spec.ts fails the run if it
        // leaves out a category the scoped designs live in.
        test.skip(categoryOutOfScope(category), `${category} holds none of the scoped designs`);
        test.setTimeout(120_000);
        await toApp(page);
        // The SLICE ASSIGNMENT is unchanged by scoping - variant i still belongs to slice
        // i % slices - so a scoped run measures exactly the designs a full run would, in the
        // same units. Only the ones nobody asked for are dropped.
        const rows = await page.evaluate(`(async (category, slice, slices, only) => { ${HELPERS}
          const { CATALOG } = await import('/src/templates/catalog.ts');
          const out = [];
          const all = CATALOG[category] || [];
          for (let i = 0; i < all.length; i++) {
            if (i % slices !== slice) continue;
            const v = all[i];
            if (only && only.indexOf(v.id) < 0) continue;
            const res = await bench(v.create());
            out.push({ id: v.id, ok: res.ok, errors: res.errors.map((e) => e.rule + ': ' + e.message) });
          }
          return out;
        })(${JSON.stringify(category)}, ${slice}, ${slices}, ${JSON.stringify(ONLY_DESIGNS)})`);
        const measured = rows as { id: string; ok: boolean; errors: string[] }[];
        // An empty unit is only ever legitimate under an explicit scope. Unscoped, it means the
        // category vanished or the slice arithmetic broke - a gate measuring nothing and saying
        // it passed is the failure mode this whole file exists to avoid.
        if (!ONLY_DESIGNS) expect(measured.length, `${label} benched no variants`).toBeGreaterThan(0);
        const failed = measured.filter((r) => !r.ok);
        expect(failed, JSON.stringify(failed, null, 2)).toEqual([]);
      });
    }
  }
});
