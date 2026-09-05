# The mechanical refill pick and the structured frontier fields (change 4)

Branch `claude/orchestrator-candidates`, off `deb94436` (change 3's landing). The last of the four
changes in `docs/ORCHESTRATOR_SIMPLIFICATION.md` section 5.

## What landed

`scripts/candidates.mjs` (with `candidates.test.mjs`), in the build and `test:jobs`, and as
`npm run candidates`. It reads the `## Candidates` table the planner writes in the wave-state file
(columns `L | size | serves | TOUCHES | SPECS | goal`) and composes change 1's two instruments -
`collision-check` against the running rows' real diffs, `wave-horizon` against the window - into one
verdict list. It prints `LAUNCH <letter>` for the first candidate that is collision-clear and fits,
holds the rest with the reason, and falls through in the planner's order so a top unit that no
longer fits does not block a smaller one that does. `night.md` step 4 is now this one command.

The table columns are the structured frontier fields the review asked for. A backlog item can carry
them as optional front matter - `serves`, `size`, `touches`, `covered-by`, `needs-owner` - which the
planner copies into the table (`docs/backlog/README.md`). `needs-owner` other than `none` keeps an
item that needs a person off the unattended frontier.

## The four changes are done

1. Refilling, event-driven loop (`2953f590`).
2. Relay channel and worker posture (`39f8d9b2`).
3. Contract staleness gate (`deb94436`).
4. This - the mechanical refill pick and structured fields.

## What is deliberately left for the owner

- **The planner/watcher session split and the short-brief A/B.** The review frames both as measured
  experiments, not blind rewrites: the split changes how `/orchestrator` is invoked, and the prompt
  format is heavily pinned. The landed review lays out the one-variable A/B (who holds the watch).
  The common path is still 640/640; genuinely reducing it needs this split.
- **Receipt advancement on landing** (`docs/backlog/owner-receipts-do-not-advance-when-their-work-
  lands.md`): the planner's frontier still shows some landed asks as unstarted. Row F proposed an
  `answered` state and `/queue-merge` asking which receipt a branch serves. Filed, not forced - it
  is a receipt-vocabulary change worth its own row.

## The first real test

None of this has run in a live night wave yet. The acceptance is the next unattended night: the
planner writes a `## Candidates` table and a `Window ends:` line, arms `wave-watch` as a Monitor,
and the loop refills off `candidates.mjs` until the horizon closes. Read `wave-launch list` and
`candidates.mjs --plan <plan>` in the morning to see what it chose and why.

## Verification

- `node --test scripts/candidates.test.mjs`: 6 pass (table parse; pick respects order; collision and
  does-not-fit hold; fall-through to a fitting smaller unit; no pick when nothing fits).
- Live: evaluated a synthetic plan and named the next launch with its reason.
- `check-contract-freshness`, `check-shared-instructions` (common path 640/640), `owner-receipts
  --check`, eslint: all green.
- `npm run build`: see the commit's CI run, read job by job.
