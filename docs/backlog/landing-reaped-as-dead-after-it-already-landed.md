# A landing reaped as dead after it already landed reports FAILED and gets retried

**Filed:** 2026-09-04. **Source:** measured.

## Why

Job j-0533 (`<git-common-dir>/noacg-jobs/j-0533.json`) reads `state="failed" exitCode=null
reapedAsDead=true`, and its own log ends with "auto-merge: landed claude/f-contracts-point on
main as 6f7efcfd". The landing succeeded; the runner just never observed the process exit, so the
reaper marked it dead and failed. Tick 67 went further: it reported LANDED and LANDING GAVE UP for
the same branch in the same tick, and offered a re-queue command for a branch that was already in
`main`.

The orchestrator re-queued on this signal five times this morning, and at least one of those
retries was already contained - work that landed cleanly got queued again on a false negative. A
landing takes 12-45 minutes through the serialized queue, so each false retry delays every branch
behind it, not just the one being retried.

`retryLandingFor` in `scripts/jobs-store.mjs:860` already treats `job.reapedAsDead === true`
(line 863) as no-verdict, alongside a timeout and `NO_VERDICT_EXIT`. It has no way to distinguish
"the process died before landing" from "the process died after landing and losing its receipt" -
both produce the identical `reapedAsDead` shape.

## What it would take

Add the check the tick already makes for its own LANDED events before treating a reaped job as
no-verdict: `git merge-base --is-ancestor <branch> origin/main`. If the branch's tip is an
ancestor of `origin/main`, the landing was contained and the job should be reclassified as
succeeded (or at least excluded from retry) rather than fed back into `retryLandingFor`. If it is
not an ancestor, the reap really is no-verdict and the existing retry path is correct. The check is
cheap (one git call) and the ancestry answer does not change once `main` has moved past the branch,
so it is safe to run at reap time or at retry time.

## Evidence

- `<git-common-dir>/noacg-jobs/j-0533.json` - `state`, `exitCode`, `reapedAsDead`, and the log tail
  quoted above.
- `scripts/jobs-store.mjs:860-864` (`retryLandingFor`) and its no-verdict predicate.
- Tick 67's own output: LANDED and LANDING GAVE UP reported for the same branch in the same tick,
  with a re-queue command offered for a branch already merged into `main`.
