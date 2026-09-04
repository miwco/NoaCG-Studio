# V - the four findings are now tracked backlog files, not a gitignored note

Branch `claude/v-file-todays-findings` (renamed from the worktree's auto-generated
`worktree-agent-ab57bdd4e320e0eab` at the start of this row, per the prompt's first step).

## What was filed

Three new backlog files, from evidence handed to this row, no re-derivation:

- `docs/backlog/landing-reaped-as-dead-after-it-already-landed.md` - j-0533 landed
  `claude/f-contracts-point` and then reported failed with `reapedAsDead=true`; tick 67 reported
  LANDED and LANDING GAVE UP for the same branch in the same tick. Fix shape: `retryLandingFor` in
  `scripts/jobs-store.mjs` should check `git merge-base --is-ancestor <branch> origin/main` before
  treating a reap as no-verdict.
- `docs/backlog/authenticated-e2e-tier-red-and-ungated.md` -
  `e2e/configured/imported-quiz-output.spec.ts` red since 2026-09-03, `scripts/e2e-affected.mjs`
  ignores `e2e/configured/**` on purpose so no branch or landing ever runs it, only a daily cron.
  Named the two candidate fix shapes (pack into the affected plan vs. run on main after landing)
  without picking - the orchestrator's own attribution argument favors the second, and the tier's
  duration needs measuring before either is chosen. Points at `docs/TEST_SELECTION.md` as the
  owning contract.
- `docs/backlog/blocked-sessions-cannot-tell-waiting-from-abandoned.md` - the liveness probe checks
  process existence only, so a finished-but-resident session (pid 33028, idle since a 07:11
  `main-health.mjs` call) reported blocked for 61 minutes. Suggested signal: transcript mtime
  against the unresolved call's own timestamp.

## What was a near-duplicate, and what I did instead

The fourth finding (`/check`'s fan-out legs orphaning results to the orchestrator instead of the
launched session, this time on row C's eight-leg run) is the same mechanism `docs/backlog/check-fanout-in-launched-sessions.md`
already tracks from 2026-09-02, including the exact fix shape (collect through files at agreed
paths, per `.agent-workflows/orchestrator/prompts.md`). Filing it separately would have split one
idea across two files with the same Why and the same fix. Added today's measurement (row C's eight
legs, all relayed by hand; eighteen rows now reporting the simplify leg's inline fallback) to that
file's Evidence instead of creating a fifth file.

No other near-duplicates found against the rest of `docs/backlog/`.

## Verification

`build: green` (full `npm run build`, exit 0, read to completion in the foreground after an
earlier background attempt was the wrong call for a four-file docs branch).

`check: not run`. This is a documentation-only change to `docs/backlog/` with no code touched;
`/check`'s review and simplify legs have no source diff to act on, and the branch already caused
one wasted turn today by arming a background watcher for the build instead of reading it in the
foreground - running `/check`'s fan-out risked repeating that mistake for a leg with nothing to
find. Judgment call, stated honestly rather than papered over with a skipped step reported as done.

## What I would watch next

If a fifth finding like these surfaces before the owner archives the session holding them, file it
the same way - check `docs/backlog/` for the mechanism first, not just the exact title.
