# orchestrator - plan and assign the day's work

Shared canonical procedure, invoked as `/orchestrator` (alias `/o`) in Claude Code,
`$orchestrator` (alias `$o`) in Codex. Cross-references use plain names ("the safe-merge
workflow"); translate as `/safe-merge` or `$safe-merge`.

**This file is the always-loaded core and is capped at 200 lines** (gated by
`npm run check:shared-instructions`). Everything else lives in `.agent-workflows/orchestrator/` and is
loaded only when the routing table below sends you there. A rule that belongs in a module and
gets restated here is a defect, not thoroughness.

## THIS SESSION NEVER ACTS

The single rule everything else serves. This session **plans work and never does any of it**, and
it **never touches another worktree** - not to check something, not to merge, not to tidy.

- No merge, push, commit, rebase, build, test, install, or edit of product code. Not even a
  one-line fix that is obviously right: it goes in a prompt.
- Nothing outside this checkout. Another worktree's files are read about through
  `worktree-activity.mjs` and planned around - never opened, never changed, never cleaned up.
- **Every command this session produces is for the USER to run, and names WHERE to run it** - the
  branch, and the checkout or worktree it belongs in.

The reason is legibility, not caution: the moment this session does work as well as assigning it,
nobody can tell which state came from the plan and which from a side effect.

**Exactly four exceptions, all bounded, all written here so none can widen quietly:**

1. **Its own contract.** This session may edit `.agent-workflows/orchestrator.md`, its module
   directory, the adapters that point at them, and the part of
   `scripts/check-shared-instructions.mjs` that pins them - and nothing else in the repository.
   Requiring a separate session to change the rule that says "change no files" is a missing
   mechanism, not a safeguard.
2. **A follow-on it already planned**, when the trigger branch lands, in that session's own
   worktree, named in the wave table before the wave started (`orchestrator/night.md`).
3. **The wave-state file** - `docs/handoffs/<date>-wave-plan.local.md`, gitignored: the wave table
   and every prompt verbatim at wave start, one heartbeat line per watch tick, nothing else. A
   plan printed only in chat dies with this session while the user is asleep.
4. **Its own home** - `node scripts/orchestrator-home.mjs` creates or fast-forwards ONE permanent
   worktree, `.claude/worktrees/orchestrator`, detached at `origin/main`. Infrastructure: never a
   branch, never a commit, never deleted. It exists because **the main checkout belongs to the
   landing queue** - every integration rewrites that tree, so a read taken there mid-landing can be
   wrong with nothing to say so - and because a throwaway worktree is pinned at the commit it was
   cut from, so the plan would be made from a stale repo.

**No exception touches landing.** The queue lands work; this session reads what the queue did.

## Input

Whatever the user pasted, in any mix - and **`docs/handoffs/` is read by default**, so the user
never pastes what a session already wrote down. A `*.local.md` there was written by a machine (the
morning CI verdict); read it like a handoff, re-check the run it names, delete it the same way.
**Owner feedback from testing the newest build OUTRANKS a handoff's own idea of what comes next.**
A vague report is ONE session whose first step is reproduce-and-scope. Nothing pasted is dropped
silently: every distinct ask becomes a session, a section-4 pushback, a section-6 line, or a NAMED
leftover routed to memory or the backlog.

**Spare capacity fills in a fixed order, and never past it:** the user's own feedback, then live
files in `docs/handoffs/`, then `## NOW` in `docs/GOALS.md`, then the next stages of ACTIVE
programmes in `docs/PROGRAMMES.md`, then `docs/backlog/` items whose stated why serves NOW or an
ACTIVE programme. Capacity left after that is left over - **never invent work to fill a wave**.

**Day wave or night wave.** A NIGHT wave is planned in the evening, started by the user, landed
and pushed by morning with the queue doing the merging. Everything marked *night* is mandatory
there. **THE WAVE WINDOW is whatever time the user names in the invocation** and the plan scopes
to it - prompt cores sized to finish inside it, tails cut first. Unstated, plan to the next
natural checkpoint and say which. **24 hours is the absolute ceiling of any unattended chain.**

## Output - seven sections, in this order, nothing else

1. **The wave table.** One row per session: letter, one-line goal, `START` (`now`, or
   `on <branch> landing`), `TOUCHES` (files it will own), `MINTS` (scarce shared slots), browser
   yes/no. Target about five; the constraint is not the count but whether they can land in ANY
   ORDER. **The letter travels in three places and no fewer** - the table row, the branch name
   `<tool>/<letter>-<name>`, and the prompt's first line. Never re-letter, never reuse a letter.
2. **What can run at once.** The collision pass. -> `orchestrator/collisions.md`
3. **Landing.** Two things, never blended: branches already ahead of `main`, quoting
   `node scripts/merge-order.mjs`'s own verdict words (`clear`, `caution`, `hold`); and today's
   new sessions, which have no branches yet - **do not predict an order for them**, state the
   queue policy instead. **Section 3 is a report, not a pick.** A branch named here is not an
   offered safe-merge option, and this session does not merge.
4. **What I would push back on.** -> `orchestrator/pushback.md`
5. **The prompts.** -> `orchestrator/prompts.md`
6. **Open questions, then one pick.** **The ask-test is strict: a question reaches the user only
   when the user holds information the machine lacks** - a taste ruling, product direction, real
   money, an external account, an irreversible step past `main`. Importance alone never qualifies;
   an important machine-decidable choice is DECIDED, reported with its why, and vetoed after the
   fact. **Answer it yourself first**: a question that passes only as taste is not asked - write
   the recommendation, decide with it, carry it to the wave-end questionnaire. End with a short
   pick so the day begins in one tap.
7. **The morning report.** -> `orchestrator/report.md`

**A night wave does not end with the text.** After section 6, with no further prompting, this
session enters the watch loop (`orchestrator/night.md`) and stays there until the wave is done.

## The rules that are never module-deep

These fire while you are writing sections 1-5, so they are here rather than one read away.

- **A wave is ORDER-FREE or it is not a wave** (*night*: mandatory). Landing is already
  serialized; what a plan must guarantee is that no session waits to START. So a wave carries
  **no `WAIT` lines** - two tasks that cannot be made order-free are ONE prompt doing both.
- **A GATE LANDS ALONE.** A session adding or tightening a build gate runs in its own wave or is
  the wave's designated LAST landing. Otherwise every sibling's next merge of `main` brings in a
  gate their prompt never saw, and their red reads as their own fault.
- **The plan ALLOCATES these up front** - the scarce shared slots: migration numbers, a
  re-recorded baseline, `package.json` - each named in that session's `MINTS`. Different
  filenames, disjoint sets, clean merge, wrong result is the failure a file diff cannot see.
- **QUEUE is mandatory on every prompt and is the last thing in it**, because the session running
  it may never see this file.
- **No prompt ever contains a step for the user, and no session blocks on a question.** A session
  that stops to ask does nothing all night: it decides with the WHY, or writes the question into
  its handoff and does the rest.
- **WHY is a TARGET, not a route**, and **THE WHY MUST BE TRUE, and function outranks cosmetics.**
  A faster horse built perfectly to the letter is a failed assignment.
- **A starting prompt is a MULTI-STEP ASSIGNMENT, and should be big.** Three or four related
  steps in one session costs one branch, one gate and one landing instead of three.
- **Every pasted task gets a prompt.** Flagging is not vetoing.
- **A finished session leaves nothing running**, and **a continuation prompt printed only in chat
  does not exist** - the handoff FILE is the channel.
- **Handoff files are CONSUMED, not archived - git is the archive.** Every file read is classified
  consumed / spent / deferred; exactly one prompt carries the deletion. **SPENT is a claim about
  each open ITEM, not about the file**: spent only when every open item has been traced to where
  it now lives, and the plan records that trace.
- **One browser-driving job per MACHINE, not per worktree** (root `AGENTS.md`). Editing
  parallelises; a browser job does not. Tell sessions to use the `:queued` form.
- **The owner queue is a RECORD of what is waiting to be seen, NEVER a gate on what can be
  started.** Report its depth in section 4 and plan the row anyway.

## Routing - load a module when its phase starts, not before

| Load | When |
| --- | --- |
| [`orchestrator/grounding.md`](orchestrator/grounding.md) | **first, before any other read** - the home bootstrap and the tiered read recipe |
| [`orchestrator/collisions.md`](orchestrator/collisions.md) | writing section 2: `TOUCHES` overlap, scarce slots, cohorts, RAM, launch paths and classifier refusals, the two append-only files |
| [`orchestrator/pushback.md`](orchestrator/pushback.md) | writing section 4 |
| [`orchestrator/prompts.md`](orchestrator/prompts.md) | writing section 5: the prompt block, the model ladder, delegation and harness routing, the confirmation pass |
| [`orchestrator/night.md`](orchestrator/night.md) | a night wave: follow-ons, handoff continuations, the watch loop |
| [`orchestrator/report.md`](orchestrator/report.md) | producing section 7 after a wave has run |
| [`orchestrator/recovery.md`](orchestrator/recovery.md) | a launched row came back substantially wrong: repair it, or rewind and redo |
| [`orchestrator/coherence.md`](orchestrator/coherence.md) | phasing a big project; the weekly coherence session; applying a wave's lesson to this system |
| [`orchestrator/incidents.md`](orchestrator/incidents.md) | you want the evidence behind a rule, or you are recording new evidence |

**Specialist workflows this one routes to and never re-implements:** `queue-merge` (how work
reaches `main`), `safe-merge` (the mechanical landing path), `check` (review, simplify, verify),
`so` (an independent second opinion on a big call), `handoff`, `walk`, `cleanup-worktrees`,
`rescue` (delegation to Codex). Name the workflow in a prompt; never paste its procedure.

## Rules

- **Read, don't write.** "THIS SESSION NEVER ACTS" is the contract and carries every exception.
- **Never act on a collision.** Another worktree's in-flight work is reported and planned around.
- **Create or update no files** except this workflow's own contract, its modules, its adapters,
  its gate, and the wave-state file.
- **Never merge, and never push.** Every branch reaches `main` through the queue, started by the
  session that owns the work.
- **Verify before you list.** A blocker, a collision or a landing order stated as fact came from a
  command run in this session - not from a handoff's prose, not from memory of yesterday.
- **`TOUCHES` is a forecast**, not a copy of a handoff's retrospective file list.
- **Letters are stable, and so is scope.** Never silently merge two pasted tasks or split one; if
  the shape is wrong, say so in section 4 and offer it.
- **Stay usable all day.** "Can B start now" is answered from a fresh `worktree-activity.mjs` plus
  `npm run jobs`, never by re-planning.
- **This system improves by MOVING text, not by adding it.** A wave's lesson edits the module that
  owns the rule; its evidence goes to `orchestrator/incidents.md`, never into the rule's own
  paragraph. Level 1 changes only for a rule that must always be loaded, and only against the
  200-line gate. See `orchestrator/coherence.md`.
