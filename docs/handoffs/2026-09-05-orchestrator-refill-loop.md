# The refilling, event-driven night loop (change 1 of the orchestrator review)

Branch `claude/orchestrator-refill-loop`, off `d7a4171b` (the review landing). This is the first of
the four changes `docs/ORCHESTRATOR_SIMPLIFICATION.md` section 5 proposes. It makes the night loop
finish, land, and REFILL a free slot from a measured horizon instead of stopping when the planned
rows run out - the failure that left two hours and about 40 percent of worker capacity unused on
2026-09-04.

## What landed

Four scripts, each with a test pinning its decision, all in the build and `test:jobs`:

- `scripts/wave-launch.mjs` - records when each row starts (`record`), joins it to the merge job's
  queueing and the landing, and reports launch-to-queued minutes per size. The one duration the
  queue never recorded.
- `scripts/wave-horizon.mjs` - does a unit of a given size still fit? Remaining window against the
  p90 launch-to-queued for that size plus gate and queue-wait p90 from the job store plus a 30-min
  integration buffer. Below `MIN_SAMPLES` it uses a labelled seed from the 2026-09-04 night.
- `scripts/collision-check.mjs` - a candidate against the running rows' REAL diffs (worktrees and
  branches ahead of main) on files and covering e2e specs. A full-coverage side is a caution, not a
  false collision. This is what would have spared rows H and I their 79-minute phantom chain.
- `scripts/wave-watch.mjs` - runs the tick on an interval and prints one line per event, to be armed
  as a Monitor so a landing wakes the session in minutes, not the hour a self-chosen nap cost.

Contract:

- `orchestrator/night.md` - the watch loop now refills (step 4) under the WHY chain, bounded by the
  horizon and the report checkpoint rather than a count; stops on the horizon, not a percentage;
  wakes on `wave-watch` as a Monitor, not `/loop`.
- `orchestrator.md` core - the wave-state file gains a `Window ends: <iso>` line and a
  `## Candidates` list; the plan check refuses a night plan with no window. Core stays 198/200,
  common path 640/640.
- `orchestrator/launch.md` - every launch records with `wave-launch`, so the horizon learns.
- `scripts/wave-plan-check.mjs` - enforces the `Window ends:` line on night plans (test added).

## Provenance note, important

When I cut this worktree, four untracked scripts (`wave-horizon`, `collision-check`, `wave-launch`,
`wave-watch`) were already present, written earlier the same morning by a prior session that had
since exited - a parallel, better-factored implementation of this exact change. I read every line,
found it cleaner and more complete than my own first attempt (it records real launch durations,
which mine only estimated), discarded mine, and adopted this set after adding the tests it lacked.
Nothing in them does anything but read the job store, scan git activity, append a ledger line, and
run the tick. If that prior session is still tracked somewhere, this branch supersedes its work.

## What is left (the other three changes)

- **Change 2 - short briefs and the worker posture**, plus the relay file that `/queue-merge` reads
  before pinning. Independent branch.
- **Change 3 - the planner as a subagent and the thin common path**: move the plan-only modules off
  the live path, add the headroom ratchet and staleness gate, advance receipts when a branch lands.
- **Change 4 - structured frontier fields** (`serves`, `size`, `touches`, `covered-by`,
  `needs-owner`) so the candidate list and collision check become script output the model confirms.

The candidate list format `night.md` now names has no generator yet - the planner writes it by hand
until change 4 gives backlog/handoff items the structured fields a `backlog-pick` script would read.

## Acceptance

Not product-observable, so no owner-queue item. The real test is the next night wave: watch it
refill after the planned rows land, and read the launch ledger (`node scripts/wave-launch.mjs
list`) and the horizon (`node scripts/wave-horizon.mjs --plan <wave-state file>`) in the morning
report. The A/B the review proposes (who holds the watch) is unaffected by this change.

## Verification

- `node --test` over the five affected suites (wave-launch, wave-horizon, collision-check,
  wave-watch, wave-plan-check) and wave-tick: green.
- `npx eslint` over all new and changed scripts: clean.
- `node scripts/check-shared-instructions.mjs`: OK, core 198/200, common path 640/640, markers
  intact.
- `npm run build`: see the commit's CI run, read job by job.
