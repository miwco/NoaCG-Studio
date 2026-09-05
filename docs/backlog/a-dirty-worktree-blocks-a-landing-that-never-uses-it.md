---
serves: H0
size: small
touches: scripts/safe-merge-preflight.mjs, scripts/auto-merge.mjs, scripts/merge-order.mjs
needs-owner: none
---
# A branch is refused for dirt in a worktree its landing would never touch

**Filed:** 2026-09-05. **Source:** measurement during the first live run of the refilling loop.

## Why

The landing path refuses a branch whose worktree has uncommitted files, and `merge-order` reports
it as `NOT LANDABLE: 1 uncommitted file(s)`. For a branch whose session is still working, that is
right - the dirt is work in progress and landing under it would be wrong.

For a branch whose session has ENDED, it is a deadlock with no owner. The landing does not need
that worktree: a branch with no worktree at all lands through a temporary one the flow creates and
removes. So the refusal is reading dirt in a tree the landing would never use, and the only ways
out are for a person to classify someone else's uncommitted edit, or for the work to sit.

It cost an hour on 2026-09-05 and would have cost the branch entirely if the row had not woken up
and committed the file itself. The uncommitted file turned out to be a 29-line spec covering a real
on-air trap, so neither discarding it nor committing it blind was safe - which is the point: the
refusal is correct to want a decision, and wrong to have nobody who can make one.

## What it would take

Land from the branch's committed tip, through a temporary worktree, when no live session holds the
branch - leaving the dirt exactly where it lies. The branch's gated state is what CI verified and
what the queue promotes; the uncommitted file was never part of it either way.

The liveness test to use is the corrected one in `.agent-workflows/orchestrator/night.md`: the
harness inventory, the branch tip's age and the transcript mtime, with any one of them speaking
meaning alive. **Do not use the inventory alone** - it fails open for subagents, and on the same
day it reported a row idle while that row was committing every four minutes.

Two things this must NOT do: touch the dirty worktree, and report the branch as fully landed
without saying that uncommitted work stayed behind. The report line matters - the next reader has
to know something was left.

## Evidence

- `merge-order --json`: `claude/s-more-behaviours`, `reason: "1 uncommitted file(s)"`, while the
  branch was eight commits ahead, CI-green, and carrying a completed `/check`.
- The landing flow already makes a temporary worktree for a branch that has none - `auto-merge`
  says so in its own dry-run output.
