# The authenticated E2E tier is red on main and nothing gates it

**Filed:** 2026-09-04. **Source:** measured.

## Why

`e2e/configured/imported-quiz-output.spec.ts` times out clicking
`getByTestId('wz-finish-production-confirm-go')`: the button resolves in the DOM but Playwright
never judges it visible, enabled and stable, so it retries 426 times to a 4-minute timeout,
identical on every retry, failing inside `intoProduction()` at `e2e/_create.ts:175`. It has been
red since 2026-09-03.

Nothing catches this before it ships. `scripts/e2e-affected.mjs` ignores `e2e/configured/**` on
purpose, `ci.yml` plans its runs from that script's output, and `auto-merge` gates landings only on
`ci.yml` runs - so no branch and no landing ever executes this tier. It runs once a day on a
drifting cron against whatever `main` happens to be at that moment. Naming a suspect for the break
required diffing roughly 130 commits, because nothing narrower ever ran against the change that
caused it.

## What it would take

The decision is between two shapes, and it is not this file's job to make it:

- **Pack it into the ordinary plan** when a branch touches the surfaces it covers (wizard finish,
  SVG import, publish/production), the same way other affected-test selection works.
- **Run it on `main` after every landing**, closer to what happens today but synchronous instead
  of a drifting daily cron.

The orchestrator's view going in is that ATTRIBUTION is the stronger argument for the second shape:
a break arriving from a branch that does not touch the covered surfaces is exactly what packing by
touched-surface would miss, and that is the shape of this break - `imported-quiz-output.spec.ts`
broke without anyone touching SVG import, wizard finish, or publish/production in an obvious way,
which is why the diffing took 130 commits.

The tier's own duration has never been measured, and that number decides it: packing it into every
matching branch's plan is only affordable if the tier is cheap, and running it after every landing
only avoids delaying landings if it runs fast enough to report before the next one starts. Measure
it before choosing.

`docs/TEST_SELECTION.md` is the contract this belongs in.

## Evidence

- `e2e/configured/imported-quiz-output.spec.ts`, failing at `intoProduction()` in
  `e2e/_create.ts:175` on `getByTestId('wz-finish-production-confirm-go')`, 426 retries to a
  4-minute timeout.
- `scripts/e2e-affected.mjs` excludes `e2e/configured/**`; `ci.yml` plans from its output;
  `auto-merge` gates on `ci.yml` runs only.
- Red since 2026-09-03; the daily cron is the only job that runs this tier at all.
