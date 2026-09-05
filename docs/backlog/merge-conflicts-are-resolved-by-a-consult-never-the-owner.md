---
v: 2
source: owner
kind: ask
raised: 2026-09-05
state: unstarted
asked: "the agent and the orchestrator should always resolve any merge conflicts on their own. Never ask me - the agent can ask a super intelligent AI what to do in that case, so ask it instead of me"
serves: H0
size: standard
touches: scripts/auto-merge.mjs, scripts/jobs-store.mjs, .agent-workflows/orchestrator/night.md, .agent-workflows/queue-merge.md, .claude/agents/
covered-by: scripts/auto-merge.test.mjs, scripts/jobs-store.test.mjs
needs-owner: none
---
# A landing refused for a conflict is resolved by a consult, never by the owner

**Filed:** 2026-09-05. **Source:** owner ruling (`docs/OWNER_RULINGS.md`, owner-decisions-2026-09-05),
after `npm run landing:latency` showed the week's slow tail.

## Why

The queue's refusal kinds still have a class labelled "a person decides": `merge-conflict`,
`dirty-tree`, `preflight-1`, `ci-red`, and the `hold` half of `order-caution`. When the branch's
session has already closed, "a person" was the owner, and he cannot resolve a conflict - he said so
on 2026-09-04 and again on 2026-09-05, this time as a hard rule. Every hour a branch waited on
that class this week was an hour nobody could have used, because the only party being asked was
the one party with no way to answer.

## What it would take

- A **resolver row**: when a landing is refused for one of those kinds and no live session holds
  the branch (the same three measurements `wave-tick` uses to let the loop queue an orphan), the
  loop launches a worker in a fresh worktree on that branch whose brief is exactly: integrate
  `origin/main`, resolve what conflicts with a consult to the strongest model available (the
  expert-consult posture in `wave-row.md`), run the build and the affected specs, commit, and
  re-queue. It writes a handoff naming every resolution so the owner can revert one later.
- `night.md` step 5 gains that arm, and "only a RED GATE, a real conflict or a dirty tree reaches
  the user" loses the conflict and the dirty tree; a red gate on a feature branch is that branch's
  own session's work, or the resolver's when the session is gone.
- `queue-merge.md` "Look before you queue" stops telling the reader that a person weighs a caution.
- The `hold` refusal stays a refusal, and its route is the resolver, not the queue.

## Evidence

`npm run landing:latency --days 7` on 2026-09-05: 143 branches, median 8 minutes, 15 over an
hour; refusals behind the slow ones: 11 blocked by an unqueued branch (fixed 2026-09-05, commit
0bd2263e), 9 merge-order caution waiting for a person (plain caution now lands in queue order,
same day), 8 killed at the landing cap, 3 red CI on the integrated commit.
