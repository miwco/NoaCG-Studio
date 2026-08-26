# Handoff: the queue heals itself - four landing-machinery defects fixed

**Branch:** `claude/l-landing-machinery`, one commit (`e6b2bc3c`) plus this handoff.
**Gate:** `npm run build` green (it runs all three touched test suites); dry-run landing of this
very branch through the changed code passed 9/9 preflight checks with a `clear` verdict.
**Queued:** through `npm run queue:merge` at the end of this session - `npm run jobs` shows the
outcome; this landing is itself the first through the new gate code.

## What is true now

Four defects filed by the docs-polish session after three real refusals on 2026-08-26, each fixed
with a test that fails on the old behaviour (verified by stashing the source fixes and running the
suites: all three go red).

1. **Ordering spin-out** (`scripts/auto-merge.mjs`, `scripts/jobs-store.mjs`, `scripts/jobs.mjs`).
   A landing blocked by a branch nobody queued used to defer through its whole budget in minutes
   and then vanish - queue empty, branch "not queued", indistinguishable from unfinished work.
   `planOrderDecision` now takes `isQueuedForLanding`: it defers only while a still-waiting
   blocker has a live merge job (the queue itself will free it), and refuses immediately - naming
   the blocker and the way out - when nobody queued it. `landingStateFor` (jobs-store, unit
   tested) keeps a dead landing visible: the outstanding listing now prints
   `LANDING FAILED j-xxxx (state) - node scripts/jobs.mjs log j-xxxx` instead of "not queued".
   Tests: "a blocker NOBODY queued refuses at once instead of burning deferrals",
   "one queued blocker among several is enough to keep waiting" (auto-merge.test.mjs);
   the queued / gave-up / not-queued split (jobs-store.test.mjs).

2. **Passive waitForCi** (`scripts/auto-merge.mjs`). The gate gave the push webhook ten minutes
   to create the run for the just-pushed merge commit; webhooks ran 28-40 minutes late on
   2026-08-26. `waitForCi` is now exported and dependency-injected: after ~30 seconds of grace it
   dispatches the run itself (`gh workflow run ci.yml --ref <branch>` - the move commit 9063928b
   documented as a manual rescue), exactly once per landing. It still refuses when nothing
   conclusive arrives inside the budget - the fix changes how it waits, never whether it gates.
   The j-0088 trap is closed too: the LISTING decides when the wait ends, never `gh run watch`'s
   exit, and every tick sleeps, so a run stuck `pending` with zero jobs costs the full ten
   minutes of patience rather than a seconds-long spin.
   Tests: "no run appearing gets one DISPATCHED after the grace period, exactly once",
   "a run appearing within the grace period means no dispatch at all",
   "a watch returning instantly still costs a tick".

3. **Run selection** (`scripts/safe-merge-preflight.mjs`, used by both `waitForCi` and phase 3).
   The old `--limit 1` with no workflow filter could watch a deploy-verify run, and a
   same-second createdAt tie broke toward the CANCELLED push run. `selectCiRun` is the one
   selector now: ci.yml runs only, newest first by `databaseId` (strict creation order), a live
   run is watched, the newest conclusive non-cancelled run is judged, cancelled shells count as
   "no run yet". A red run newer than a green one is still the one judged - pinned by
   "a red run NEWER than a green one is the one judged - refusals never weaken".
   Tests: the selectCiRun suite in safe-merge-preflight.test.mjs, the tie test in
   auto-merge.test.mjs ("a same-second tie ... watches the LIVE run, not the shell").

4. **Inflated conflict counts** (`scripts/safe-merge-preflight.mjs` `previewConflicts`).
   merge-tree's output is OID, conflicted paths, a BLANK line, then informational messages;
   filtering blanks instead of stopping at the separator counted "Auto-merging x" and
   "CONFLICT (content): ..." as paths - one real conflict read as eight. The parse now stops at
   the separator (format verified against a real `git merge-tree --write-tree --name-only` run).
   Test: "informational messages after the blank separator are never counted as conflicted paths".

`.agent-workflows/queue-merge.md`'s webhook section is rewritten to match: the gate hands itself
a run now, and the manual dispatch remains documented only as the old-runner fallback.

## The runner-restart caveat (read before trusting tonight's queue)

Which code actually runs is three different answers:

- **This branch's own landing runs the NEW gate code** - merge jobs spawn
  `node scripts/auto-merge.mjs` fresh from the branch's own checkout, and this is that checkout.
- **The live runner keeps its OLD `jobs.mjs`** until it exits and the next `add` starts a fresh
  one: the BLOCKED_EXIT deferral handling and the outstanding listing it prints are stale until
  then. A runner was live when this session queued (draining three RAM-blocked suites).
- **Other branches cut before this landed** carry the old `auto-merge.mjs` in their own
  checkouts, so their landings keep the old gate behaviour until they integrate main (or are cut
  from the new main). The night wave benefits fully only for branches created after this lands.

## What is left

- Nothing in the four fixes is unfinished. The landing outcome of this very branch is the first
  live datum on the new code - if it refused, `node scripts/jobs.mjs log <job>` says why in the
  new vocabulary (a named blocker, a dispatched run, or a real verdict), and the task brief's
  fallback was one re-queue with `node scripts/jobs.mjs add-merge claude/l-landing-machinery
  --attempts 3`.
- Phase 3 still lists at most 10 runs and `waitForCi` 20; a commit carrying more ci.yml runs
  than that has never been seen and would only widen a listing, not change the selection rule.
