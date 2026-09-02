# Grounding - what to read, in what order

Load this FIRST, before any other read. This session has to survive a whole day of follow-up
questions, so its window is the scarce resource. Reading is tiered, and grounding is done when
every command in the cheap set has been run in this invocation and the plan-time state is written
into the wave-state file - a plan grounded in yesterday's numbers is grounded in nothing.

## Before any read: the home

**`node scripts/orchestrator-home.mjs`.** It fetches and puts this session in its permanent home -
`.claude/worktrees/orchestrator`, detached at `origin/main`, created if absent and fast-forwarded
if behind (exception 4). Everything below is then read from the path it prints, so the plan is
made against what actually landed rather than against whatever commit this session started from.
Run every later command of the session from that directory, and write the wave-state file there:
the tick, the drain and the plan check all read the checkout they run in, so a session that plans
from a branch worktree leaves its state where the next orchestrator will not look.

It is idempotent and it refuses rather than clobbers: a dirty home is left alone and reported
(reads there are stale - say so in the plan), and a path git does not know as a worktree, a home
holding a branch, or any git refusal exits 1 with the real error. On a refusal, continue in the
current checkout and say in section 4 that its reads may be stale. Never create, move or delete
that worktree by hand, and never run a dev server in it: creating it reserves no dev port, and the
SessionStart hook exempts it from the 5180-5298 block (`docs/DEV_PORTS.md`).

## Then always - the cheap set

It produces the wave table, so if the window later runs short the routing already exists.

- `node scripts/worktree-activity.mjs` - every other worktree's uncommitted and unmerged files.
  This is the collision input, and how a "finished" session is caught still holding work.
- `node scripts/merge-order.mjs` - the measured order for branches already ahead of `main`.
- **The landing path's preconditions are whatever `node scripts/auto-merge.mjs --branch <b>
  --dry-run` refuses** - run it for any branch a retry or a landing is being planned for, and never
  recall the preconditions from memory: they have changed twice in a week (a branch with no
  worktree now lands through a temporary one; a red `main` refuses everything). Evidence:
  `incidents.md` "the landing path's two refusals".
- `git log --oneline -5`, `git branch --show-current`, `git status --porcelain=v1 --branch`.
- `node scripts/owner-receipts.mjs` - every owner-raised task with its state and age. An unstarted
  receipt is on the frontier above the backlog, and the plan check refuses a plan that does not
  mention it.
- `node scripts/handoff-drain.mjs` - every handoff file, classified or not, with its age. The
  classification the plan owes each one is written under `## Handoffs` in the wave-state file
  (`collisions.md`, "Consuming the handoff folder").
- `npm run harness:usage` - the capacity snapshot the routing is decided on (`routing.md`).
- The unwalked count - `ls docs/acceptance/owner-queue/` - because it is a capacity input, and any
  live `docs/handoffs/*-wave-plan.local.md` from a wave that never reported. **The morning CI
  verdict is written by a scheduled task into the PRIMARY checkout's
  `docs/handoffs/ci-morning-report.local.md`** - gitignored, so the home never has it; read it
  there, and it exists only on a morning with something wrong.
- **For each branch a pasted handoff names**: `git show-ref --verify refs/heads/<branch>` and
  `git branch --merged main`. A handoff that says "all merged" for a branch that never landed, or
  names a branch that no longer exists, is reported in section 4 - not written a prompt. **And
  for each pasted ASK, `git log -i --grep=<its key words> -5`**: an ask already landed is reported
  in section 4, never planned again - both contracts wrote a row for a landed change on
  2026-09-02 before this line existed.
- **The north star, two ranges, nothing more:** `grep -n '^#' docs/GOALS.md` for the skeleton, then
  `sed -n '/^## NOW/,/^## NEXT/p' docs/GOALS.md` for the current push. `## NOW` is the push;
  `## NEXT`, `## THEN` and `## Parking lot` are parked. That is enough to classify every pasted
  task, whatever its own handoff says about urgency. Never read the whole file, and never read
  `docs/GOALS_ARCHIVE.md`.
- **The register, one read:** the state table at the top of `docs/PROGRAMMES.md` (and a
  programme's own section only when planning a row from it). It answers which programmes are
  ACTIVE, what their next stages are, and which entry condition may have just become true - a flip
  is recorded in the same commit as the first work it permits.

## Only when it changes routing

Each read owes a question whose answer can move a session: one source file to confirm or kill a
suspected collision; the binding doc for a task whose scope looks wrong; one memory or round doc
when a pasted trap decides an order. **The confirmation pass in `prompts.md` is such a read and is
never the one trimmed for window** - a grep per named path answers the routing question `TOUCHES`
exists to ask.

Prefer `grep` with a line range to opening a source file: in Claude Code, reading a file in an
area that has its own contract pulls that contract in too, after which a second file in the same
area is free.

**NEVER, unprompted:** product source for a task nobody flagged, plan docs for work nobody pasted,
reference images (name the path in the prompt), or a memory file browsed for background rather
than consulted for one fact.

Spend none of the reading into the prompts - those stay pointers, so a longer read never produces
a longer prompt.
