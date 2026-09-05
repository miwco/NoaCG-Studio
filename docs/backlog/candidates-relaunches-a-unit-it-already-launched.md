---
serves: NOW
size: small
touches: scripts/candidates.mjs, scripts/candidates.test.mjs
needs-owner: none
---
# The refill pick has no memory, and will launch the same candidate twice

**Filed:** 2026-09-05. **Source:** measurement, twice, during the first live run of the refilling
loop (`docs/handoffs/2026-09-05-day-wave-plan.local.md`, refills 1 and 2).

## Why

This is the one defect that would have cost a real unattended night, and nothing in the loop can
see it.

`scripts/candidates.mjs` picks the next unit to launch. It does not exclude a unit it has already
launched. At 11:39Z candidate W was launched and recorded with `wave-launch record`; the very next
pick still printed `LAUNCH W <- next`. At 12:07Z, an hour later and on a different freed slot, it
printed `LAUNCH W` again. Both times the planner had to apply the correction by hand.

`collision-check` does not save it either, and the reason is structural: it compares a candidate
against the running rows' REAL DIFFS, and a row that has been launched but has not committed yet
has no diff at all. So for the first several minutes of its life, a freshly launched candidate is
indistinguishable from an unstarted one.

Unattended, the loop refills whenever a slot frees. Two sessions would be started on one branch
name, in two worktrees, doing identical work - which is a new form of exactly the wasted capacity
the refilling loop was built to end.

## What it would take

`candidates.mjs` already imports `readLaunches` from `wave-launch.mjs` (line 28) and uses it only
for durations (line 119). The fix is to read the same ledger for identity: hold any letter that
already has a launch record for this plan, and say so in the hold line - `already launched at
<time>` - rather than silently skipping it, because a silent skip is how the planner stops
checking. A test pinning "a launched letter is held, and the pick falls through to the next one".

Worth deciding at the same time: whether a launch record should also be written when a REFILL is
launched by a person rather than by the loop. Today it is the launcher's discipline; if the record
is the memory, a missed record is a repeat launch.

## Evidence

- Two reproductions an hour apart, both with the `wave-launch` record present and the pick
  unchanged.
- `scripts/candidates.mjs:28` (the import) and `:119` (the only use, `statsBySize`), read directly
  rather than inferred.
