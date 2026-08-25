# The job runner - one queue per machine for browser-driving work and merges

Status: **steps 1, 3 and 5 BUILT (2026-08-25); step 2 revised on contact; step 4 not started.**
It replaces the "merge lock" idea from the same session - the queue IS the lock, and building
both would be two mechanisms for one job.

- `scripts/jobs-store.mjs` - the state and the arithmetic, unit-tested in `jobs-store.test.mjs`
  (in the build gate).
- `scripts/jobs.mjs` - the CLI and the drain loop. `npm run queue -- "<command>"` to enqueue,
  `npm run jobs` to see the queue.
- `scripts/hooks/session-start.mjs` prints the queue and what finished since the last session.
- `scripts/e2e-runs.mjs --wait` now gives up after 30 minutes instead of never.

## The problem, measured

`scripts/e2e-runs.mjs` deliberately is **not** a lock: it reads the OS process table, so a killed
run stops counting the moment its process dies, and there is no ticket to go stale. That design is
sound and this plan keeps it. What fails is everything around the *waiting*.

Three defects, which compound into "I came back hours later and nothing had progressed":

1. **The `--wait` loop has no cap and no tie-break.** `test:e2e:affected:queued` expands to
   `node scripts/e2e-runs.mjs --wait && node scripts/e2e-affected.mjs`. That waiter polls
   `activeRuns()` every 5 s, forever, and yields to any active run. The *other* waiter - inside
   Playwright's `globalSetup` (`e2e/_offline-guard.ts`) - has both a 30-minute cap and a proper
   FIFO tie-break (`blockingRuns`, added 2026-08-21 after exactly this stall). The fix landed on
   one waiter and not the other.

2. **The agent's shell tool caps at 600 s.** A foreground `:queued` command waiting behind a
   twelve-minute suite is killed at ten minutes with the wait still running, so the run never
   starts at all. Nothing reports this: the session sees a timed-out tool call, and the queue sees
   a job that never existed. This is the likeliest cause of the daily loss.

3. **Every waiter wakes at once.** When the slot frees, all pollers notice within 5 s and all
   launch Playwright together - the exact collision the module exists to prevent. They then land
   in `globalSetup`'s FIFO, one proceeds, and the rest burn the 30-minute cap.

And nothing anywhere shows a *queue*. `activeRuns` reports what is RUNNING, never what is WAITING,
so "correctly queued behind a long suite" and "dead ten minutes ago" look identical from outside.
That is why diagnosing it currently needs a person.

The resource being protected is RAM, not CPU or GPU. Measured on the Ryzen 7 5800H / 16 GB laptop
with two suites at once: 34 live `chrome-headless-shell` processes, 93% CPU, under 2 GB free.

## The design

Sessions stop waiting. They **enqueue and return immediately**, which removes defect 2 by
construction - no shell command outlives the tool that started it. One runner process per machine
drains the queue, which removes defects 1 and 3 because there is no longer a race: one process
decides what starts.

### State

One directory beside the existing dev-port tickets, so every worktree of this repo - and only this
repo - shares it: `<git-common-dir>/noacg-jobs/`. One JSON file per job, named by id.

```jsonc
{
  "id": "j-0007",
  "kind": "gate",             // gate | merge | sweep
  "command": "npm run test:e2e:affected",   // exactly what the runner spawns
  "checkout": "C:/claude/NoaCG-Studio/.claude/worktrees/...",
  "branch": "claude/some-branch",
  "after": ["j-0006"],        // ids that must finish green first; [] for none
  "enqueuedAt": 1756100000000,
  "state": "waiting",         // waiting | running | done | failed | timed-out | cancelled
  "startedAt": null,
  "finishedAt": null,
  "exitCode": null,
  "logPath": "<git-common-dir>/noacg-jobs/logs/j-0007.log"
}
```

A file per job rather than one queue file: two sessions enqueuing in the same second cannot lose
each other's write, and a half-written file is one unreadable job rather than a corrupt queue. The
runner skips anything it cannot parse and reports it.

### CLI

```
node scripts/jobs.mjs add "npm run test:e2e:affected"   # prints a job id, exits at once
node scripts/jobs.mjs add "npm run build" --after j-0007
node scripts/jobs.mjs                                    # running + waiting, with positions
node scripts/jobs.mjs --json
node scripts/jobs.mjs log j-0007                         # tail that job's output
node scripts/jobs.mjs cancel j-0007
node scripts/jobs.mjs --runner                           # the drain loop itself
```

`add` starts the runner if it is not already alive. "Alive" is decided the way this repo already
decides such things - by looking for the process in the OS table, not by a lock file - so a
crashed runner leaves nothing behind to clean up.

### Capacity policy

Capacity is recomputed before every start, never cached:

- **Day (07:00-24:00 Helsinki): 1 job.** The owner needs the machine for email and the web.
- **Night (00:00-07:00 Helsinki): 2 jobs.** Nights are for agents; fans are allowed to be loud.
- **A free-RAM floor overrides the clock in both directions.** Below the floor nothing new starts,
  however many slots the schedule allows. Ship the floor at 4 GB and tune it from the log.
- **Work started outside the queue still counts.** Another coding agent - Codex, or a hand-run
  command - never touches `jobs.mjs` and is invisible to the queue, but it IS visible to
  `activeRuns()`. The runner subtracts that from its capacity before starting anything.
  Cooperation is an optimisation here; the process table stays the source of truth.

Night = 2 is a starting point, not a promise. 16 GB with 4 workers per run is tight, and the log
records per-job peak RAM so the number can be set from evidence rather than taste.

### Per-job cap

Every job carries a hard cap (default 45 min, `--cap` to override). On expiry the runner kills the
process **tree** - the whole tree, because killing only the shell is a documented way to orphan a
paid bench run that then holds a slot invisibly - records `timed-out`, keeps the log, and moves on.
Nothing sits forever, which is exactly the property the current `--wait` loop lacks.

### Visibility

- `node scripts/jobs.mjs` prints running jobs with elapsed time, and waiting jobs with their
  position and the reason they wait ("capacity 1/1", "waiting on j-0006", "RAM 3.1 GB free").
- **The SessionStart hook prints the same summary**, plus everything that finished since the last
  session: green, red, timed-out, and which spec failed. That is what turns "why has nothing
  progressed" into something answerable without asking an agent.
- If there are waiting jobs and no live runner, SessionStart says so and restarts it. A runner
  that dies is therefore a delay, never a stall.

## Auto-merge rides the same queue

This is the part that gets the mornings back. A branch that is ready to land enqueues two jobs:
the gate, then the merge that depends on it.

```
node scripts/jobs.mjs add "npm run test:e2e:integration" --branch <b>
node scripts/jobs.mjs add "safe-merge <b>" --after <that-id> --kind merge
```

Because `kind: merge` never runs two-wide, whatever the clock says, **merges are serialised by
construction**. No separate lock exists or is needed.

Guardrails, because nobody is watching at 03:00:

- Only a `clear` verdict from `scripts/merge-order.mjs` auto-merges. `caution` and `hold` stop and
  wait for the morning - those are exactly the cases the old collisions came from (a stacked branch
  jumping its ancestor, two branches minting one migration number).
- The gate must be green on the **integrated** SHA - main merged into the branch - never on the
  pre-integration commit. A clean `git merge main` is not proof the integration worked.
- `git merge --ff-only` stays the final arbiter. If anything landed while the gate ran, git
  refuses, the job records `failed`, and the branch re-queues itself behind the winner.
- Publishing past `main` is never enqueued. `npm publish`, production migrations and anything
  costing money stay owner-triggered.

Morning report: what merged, what did not, and why - in the SessionStart summary.

## Failure modes this must survive

| Failure | Behaviour |
|---|---|
| Runner killed mid-job | Job stays `running` with a dead pid; the next runner start reaps it to `failed` and logs it |
| Machine reboots | Queue survives on disk; `waiting` jobs run, `running` jobs are reaped as above |
| Two runners race to start | Both check the process table, the loser exits; a duplicate start wastes a process, never duplicates a job |
| Unparseable job file | Skipped and reported, never blocks the queue |
| A job that never exits | Killed at the cap, whole tree |
| Another agent hogs the box | Counted via `activeRuns()`; capacity drops and the queue waits rather than thrashing |

## Tests

Node's built-in runner, beside the existing `scripts/*.test.mjs`:

- capacity arithmetic at both clock windows, at the RAM floor, and with unqueued outside work
- dependency ordering (`--after`), including a dependency that fails
- reaping a `running` job whose pid is gone
- the cap killing a whole process tree, not just the shell
- two concurrent `add` calls producing two distinct jobs and exactly one runner
- `merge` jobs never running two-wide, even at night

The clock and the free-RAM reading are injected, so no test depends on wall time or on how much
memory the machine happens to have.

## Rollout

1. **DONE.** `jobs.mjs` + `jobs-store.mjs` + tests - `add`, list, `log`, `cancel`, the runner,
   capacity, dependencies, reaping, and the tree kill.
2. **REVISED - do NOT repoint the `:queued` scripts.** The original plan said to make
   `test:e2e:*:queued` enqueue and return. That is wrong on contact with the callers: safe-merge
   Phase 3 Route B runs `npm run test:e2e:integration:queued` **for its verdict**, and a command
   that returns a job id instead of a pass/fail silently turns the gate into a no-op. Two
   different needs, so two different commands:
   - **needs the answer now** (a gate, a human watching) -> the `:queued` scripts, unchanged
     except that they can no longer wait forever (step 5);
   - **will come back for it later** (an agent, an overnight sweep) -> `npm run queue -- "<cmd>"`.

   The guard hook already tells these apart correctly - `node scripts/jobs.mjs add "npm run
   test:e2e:affected"` is allowed while `npm run test:e2e:affected` is refused - so enqueuing
   needed no change to `command-match.mjs`.
3. **DONE.** SessionStart prints running/waiting with reasons, what finished since the last
   session, and a loud line when there are waiting jobs but no runner.
4. **BUILT, DELIBERATELY NOT AUTOMATIC.** `scripts/auto-merge.mjs --branch <b>` does the boring
   path of the safe-merge workflow as one command, and `npm run queue:merge -- <branch>` queues
   it as a `merge` job. Because a merge job never runs beside anything, queueing several drains
   them strictly one at a time - which is the "wake up and they are landed" case.

   **What it refuses**, changing nothing further, is the whole design: any verdict that is not
   `clear`; any failed preflight check in phase 1, 3 or 4; a dirty worktree either side; a branch
   with no worktree; a CONFLICT integrating main (aborted, tree restored); a red, missing,
   damaged or shard-skipping CI run; and main moving under it at any point. It never
   force-pushes, never resets, never deletes anything, and the only merge it makes into main is
   `--ff-only`. `--dry-run` stops before the first state change.

   **Nothing enqueues these on its own yet, on purpose.** A person still queues each landing, so
   the whole thing runs attended by construction. Lifting `disable-model-invocation: true` from
   the safe-merge adapter, and letting a session queue its own landing, is the step after this
   has run clean for a while.
5. **DONE.** `--wait` gives up after 30 minutes - matched to `QUEUE_TIMEOUT_MS` in
   `e2e/_offline-guard.ts`, which has capped the other waiter for the same resource since
   2026-08-21 - and points at the queue instead of stalling.

## Tuning

`NOACG_JOBS_FREE_MB` overrides the RAM floor for a runner. The 4 GB default is a starting point,
not a measurement; set it from what the logs say a run actually costs. A runner keeps the
environment it was started with, so change it and restart the runner.
