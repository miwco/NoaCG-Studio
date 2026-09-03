# A `kind: agent` owner-queue item is visible only to `/walk`, so nothing schedules it

**Filed:** 2026-09-02. **Source:** measurement - the `/check` review of `claude/b-queue-walks-itself`

## Why

The 2026-09-02 vocabulary widening added `kind: agent` to `docs/acceptance/owner-queue/`: an item
whose remaining question is a claim about the product, which an agent settles by driving it. That
is the key that stops the owner's list filling up with work that was never his.

**But nothing outside `/walk` reads it.** `.agent-workflows/walk.md` presents the count and walks
the list on `/walk agent`, and that is the whole of it - the orchestrator's fill order does not
consider agent items when it plans a wave, `npm run jobs` does not mention them, and the
SessionStart report does not. So an `agent` item is only ever seen by somebody who runs `/walk`
for the owner and then reads past the part addressed to him.

That is the worst shape for a queue to have, because it fails in the flattering direction: the
owner's own lists show zero and read as finished, while the work sits in a bucket with no reader.
The pre-2026-09-02 version of this bug is what let the queue reach 62 files - an item nobody could
route stayed on his list forever. The new version would let one leave every list at once.

The hole is currently masked: `claude/b-queue-walks-itself` walked all 22 agent items it created,
so the count is zero. The first session to file one re-opens it.

## What it would take

A reporter, on the pattern of `scripts/owner-receipts.mjs` - which exists for exactly this reason,
so a backlog ask survives a forgetful planner. Roughly:

1. `scripts/agent-queue.mjs` listing every open `kind: agent` item, oldest first, with its route
   line - reusing `parseFrontmatter` from `owner-receipts.mjs` and `QUEUE_DIR` / `KINDS` from
   `scripts/check-owner-queue.mjs` rather than re-deriving either.
2. Wire it where a planner will meet it: the orchestrator's grounding set
   (`.agent-workflows/orchestrator.md`), and the SessionStart report beside the finished-jobs
   lines.
3. Decide whether it should ever be a gate. Probably not - the owner ruled on 2026-08-30 that a
   deep queue must not block work (*"nothing should block stuff"*), and an agent queue that reds a
   build is that ruling turned back on for a different list.

Deliberately NOT part of the widening branch: that branch's own contract was to widen the
vocabulary without adding a failing rule, since sibling sessions were filing items against the
older vocabulary while it landed.

## Evidence

`grep -rn 'kind: agent' .agent-workflows/ scripts/ docs/` on 2026-09-02 returns matches only in
`.agent-workflows/walk.md` and `docs/acceptance/OWNER_QUEUE.md` - no script, no gate, no report.
The routing rule the key serves is in `OWNER_QUEUE.md`, "Which kind does an item get".
