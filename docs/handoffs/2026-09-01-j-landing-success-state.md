# Session J - a successful landing reads as a refusal (2026-09-01)

Branch `claude/j-landing-success-state`, forked from `b84fd883` - which is, fittingly, the commit
the landing that exposed this bug produced.

## The defect, before and after

`landingStateFor` returned `gave-up` for every terminal non-cancelled merge job. A job that exited
0 therefore fell through to `giveUpReason`, whose `typeof job.exitCode === 'number'` arm rendered
success as a refusal. Both call sites then repeated it.

Measured against the real job store on this machine, for the branch named in the row
(`claude/orchestrator-skill-redesign-a416a6`, job `j-0298`, `state: done`, `exitCode: 0`):

**Before** - `landingRow`, printed by `npm run jobs`:

    LANDING FAILED j-0298 (done) - auto-merge refused it (exit 0)
            log: node scripts/jobs.mjs log j-0298   ·   re-queue: node scripts/jobs.mjs add-merge claude/orchestrator-skill-redesign-a416a6

Note it printed `FAILED ... (done)` in one breath. And the watch tick, from the same classification:

    LANDED claude/orchestrator-skill-redesign-a416a6
    LANDING GAVE UP claude/orchestrator-skill-redesign-a416a6 - auto-merge refused it (exit 0) (re-queue: node scripts/jobs.mjs add-merge claude/orchestrator-skill-redesign-a416a6)

**After** - the tick emits `LANDED` and nothing else, and the listing row reads:

    LANDED j-0298, and this branch is ahead of main AGAIN - commits arrived after it landed
            log: node scripts/jobs.mjs log j-0298   ·   queue the new work: node scripts/jobs.mjs add-merge claude/orchestrator-skill-redesign-a416a6

Both quotes are real output, produced by running the pre-fix and post-fix modules against the live
job store - not reconstructed.

**Blast radius, measured:** the retained store holds 216 merge jobs, 152 of them `done`. Every one
of those 152 successful landings was described as a refusal wherever it was read.

## What landed

Two commits, both green in CI, both scripts-only.

1. `053ef8ab` - the fix. `landingStateFor` gains a `landed` state carrying `reason: null` and
   `requeue: null`; the null requeue is what makes callers structurally unable to offer a command
   for a branch on main, rather than merely remembering not to. `giveUpReason` refuses to render a
   zero exit as a refusal at all, since it is exported and a lie shaped exactly like every real
   refusal is worse than a loud one. `deltaBetween` deliberately emits NOTHING for the transition:
   the `merge-base --is-ancestor` check is the authoritative landing signal, it already fires once,
   and `night.md` promises an event is announced exactly once.
2. `716fbade` - two gaps the review and the simplify pass found in that new state (below).

Tests were written first and watched fail at both call sites before anything was fixed. The
wave-tick one initially passed vacuously because it hand-fed `landingState`; it was rewritten to
derive the branch through `landingStateFor` the way the tick itself does, which is where the defect
actually lived, and only then did it fail. 60 tests now pass across the two suites, both of which
were already in the `npm run build` chain - `package.json` was not touched.

## What the check found (its two real findings)

- **The `LANDED` row was unreachable when true.** `landingRow`'s only caller enumerates branches
  *ahead of main*, so a branch whose landing left it on main never reaches that row. "already on
  main" would have been false every single time it could be read - the same confidently-wrong
  shape, one state along. The row now says the branch is ahead AGAIN, and hands back the queue
  command, which is correct there because that branch really does have unlanded commits.
  `landingStateFor` still withholds it: the classifier knows only what the job did, the listing
  knows its subject is ahead of main, and only the second justifies asking for an action.
- **A landed-but-moved branch went silent in the watch tick.** It raised no `LANDING GAVE UP`
  (correctly), but `looksFinishedUnqueued` required `not-queued`, so it could not raise
  `FINISHED-LOOKING AND UNQUEUED` either. Worse, the `git status` gate that decides whether `clean`
  is ever measured spelled the same condition out separately - so widening only the classifier
  would have left `clean` at `null` and the classifier structurally unable to fire, with nothing
  anywhere saying so. Both now share one exported `nothingQueuedFor` predicate, pinned by a test.

## Left undone, and the adjacent question I was asked to answer

- **`NOT RANKED - no local branch` is wrong, and it is not in this row's files.** Diagnosed
  precisely: `scripts/merge-order.mjs` puts a branch into `order` only when `readiness(b) === null`
  (line 180) and everything else into a separate `notReady` array carrying `{ branch, worktree,
  reason }` - which it *does* emit in `--json` (line 789). `scripts/jobs.mjs:292` reads only
  `order` and falls through to a hardcoded `'NOT RANKED - no local branch'`, so a branch that is
  merely not ready (uncommitted files) is reported as not existing locally. The fix is ~4 lines in
  `scripts/jobs.mjs`: build a second map from `notReady` and print its real `reason`, reserving
  "no local branch" for a branch in neither map. It is the same defect class as this row - a
  confidently wrong status line - but it is a different code path in a file outside this row's
  TOUCHES, so I left it. **It is a clean, small, well-specified next row.**
- **`cmdCancel` overwrites an already-terminal job** (`scripts/jobs.mjs:386-394`). It writes
  `state: 'cancelled'` with a fresh `finishedAt` over any job id including a finished, successful
  one; because `finishedAt` sorts newest, `landingStateFor` then picks it, hits the `cancelled` arm
  before the new `done` arm, and reports `LANDING WITHDRAWN ... re-queue: ...` for a branch on main
  - the very shape this row removed, surviving one line up. Pre-existing and outside this diff, so
  reported rather than fixed per `check.md`. The cheap fix is in `cmdCancel`: refuse or no-op when
  `job.state` is already terminal. **UNVERIFIED** - I confirmed the code path by reading it and did
  not reproduce it, because doing so would have meant writing to the live job store while a landing
  was running on this machine.

## Cost and verification

- Two CI runs, both green, both read by job rather than by top-level conclusion:
  `33556003525` (053ef8ab) and `33557410347` (716fbade). In both, Build / Factory gates / E2E plan
  / CI gate succeeded and every E2E shard was **skipped** - correct here, because the branch
  changes no product code, only `scripts/*.mjs` and two docs. For the same reason no local e2e was
  run, which also kept this session off the shared browser slot while a landing was in flight.
- `npm run build` green locally on the final state.
- `/check` leg modes: **review: `delegated`** (code-review returned its findings into this
  conversation and named this worktree's branch and files, so the phase-1 scope check passed);
  **simplify: `inline`** (the skill returned fan-out instructions rather than a result, which by
  `check.md`'s four-branch rule means the pass did not run, so the four angles were worked here);
  **verify: `inline`**. Verdict stamp written to
  `.git/noacg-jobs/checks/claude-j-landing-success-state.json`.

## One judgement worth knowing

I widened the row's TOUCHES by two files, deliberately. `.agent-workflows/queue-merge.md`
enumerated exactly what `npm run jobs` prints and would otherwise have been left describing output
I had just changed, and `docs/acceptance/owner-queue/` has direct precedent for a jobs-listing
change (`2026-08-29-jobs-listing-loud-landings.md`) under the root AGENTS.md rule that observable
work files its own route. Both are additive; neither touches `package.json`, which another session
owns this wave. I did **not** widen it to `scripts/jobs.mjs`, which is where both deferred items
live, so those stay clean rows for whoever takes them.
