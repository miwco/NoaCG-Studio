# S - an ordering block is a wait, not a death

Branch `claude/s-ordering-block-is-a-wait`, two commits, off `09be5a75`.

The row's goal: a branch whose session declared it finished reaches `main` without a human typing
anything. Three gaps were named and all three are closed, though gap 3 is closed by a narrower
door than the prompt proposed, and that is the one decision worth reading before anything else.

## Gap 1, the whole row: the queue could not tell "not yet" from "never"

`auto-merge.mjs` refuses a branch whose blocker is still ahead of `main` with no landing queued for
it. **The refusal is right** - deferring is a bet the queue will land that blocker, and with nothing
queued the bet cannot pay, so it would only burn the deferral budget. What was wrong is what
happened afterwards: the job went `failed` and nothing ever put it back.

Reproduced before changing anything, against the pre-change code, with the blocker queued twenty
minutes later - the fact that should have changed everything:

    landing state : gave-up
    retried?      : NO
    adopted?      : NO
    orderHold?    : NO - nothing keyed on the blocker

Now the landing script names its blockers in one machine-readable line
(`auto-merge REFUSAL-KIND: order-blocked <a>,<b>`), the runner parks the job on those names, and the
scheduler releases it when re-running could come out **differently** - which is exactly two facts: a
blocker landed, or a blocker's own session queued it. Anything else and re-running prints the same
refusal at the price of a CI wait.

Three things about that design worth keeping:

- **The release condition is deliberately weaker than "can this land now".** The landing script owns
  that question, and answering it in two places is how two answers drift apart.
- **A held job does not count as a landing that is coming.** Two landings parked behind each other
  would otherwise read as queued to one another, both release, both refuse in seconds and both spend
  their deferrals - the busy-spin the hold replaces. A genuine mutual block waits out its clock.
- **Twelve hours, then it surfaces.** The number is about the owner's day, not about git: the hold
  only has to outlast the unattended night, and past that a person is there to read it. A hold that
  runs out is written off with the reason on it, and is not adopted straight back.

The sweep also adopts an ordering block that was **already** failed, reborn already held with the
clock running from when it first refused. That matters for the transition: a landing runs the copy
of `auto-merge.mjs` in its own branch's checkout, so for a fortnight most branches will still refuse
the old way, in prose. `classifyRefusal` matches that prose too, and `auto-merge.test.mjs` asserts
the live script still says it - a fallback nobody checks is one that has already rotted.

## Gap 2: a budget spent by a bug is not a budget

A retry refused by the stale pin no longer counts against the branch's one automatic try. Narrow in
the way that matters: `retryOf` must be set. A stale pin on a landing a **session** queued means
that session pushed after declaring the work finished, which is the pin doing exactly its job, and
that refusal stands however often it is asked.

Honest about its reach: 67374b59 made this refusal impossible for a retry the queue mints today, so
the rule fires on records made under the old bug - which is the fourteen days of retained jobs, and
the three branches named in the prompt had already landed by hand before I started. It is bounded to
one free re-run per chain; without that bound the arithmetic handed the successor the same
`retryCount` and the budget check could never have tripped.

## Gap 3: I did NOT allowlist `add-merge`, and built the narrower verb instead

The prompt asked me to argue `node scripts/jobs.mjs add-merge` against `docs/AGENT_WORKFLOWS.md`'s
own test, and to say so if I concluded it should not be allowlisted. I concluded it should not, on
two grounds the prompt's argument does not cover:

1. **`add-merge` takes `--accept <kind>` and `--onto-red-main`.** Each is documented in the landing
   script as a flag a person types rather than a condition it infers - one waives a named
   merge-order collision, the other lands onto a `main` whose own CI is red. No prefix pattern can
   exclude a trailing argument; that file says so itself about `git push`. So "everything it
   triggers is the fully gated landing path" stops being true the moment it is allowlisted.
2. **`add-merge` DECLARES.** It says a branch at whatever commit it is at now is finished, which
   only that branch's own session may say. The permission prompt was, de facto, the mechanism
   enforcing that.

So gap 3 is closed by a wrapper, as the prompt's fallback instructed: **`node scripts/jobs.mjs
requeue <branch>`**, allowlisted paired Bash and PowerShell, plus `npm run requeue`. It takes a
branch name and refuses every flag outright rather than dropping one silently; it refuses a branch
with no landing to re-run, so it cannot invent a declaration; it copies the dead job's own command,
so a judgement a person once weighed carries forward and none can be added; and it re-pins by the
same rule an automatic retry uses, so a commit that arrived after the work was declared finished
refuses and is sent back to `add-merge`. **It can only ever re-run work already declared.** The
reasoning is written into `docs/AGENT_WORKFLOWS.md` beside the existing entries.

The listing now hands back `requeue` wherever a landing gave up, so the command a session reads is
the one it can run.

**Nothing refused my edits.** The settings change went through without a permission prompt, and no
part of this row was blocked by the safety classifier.

## The doctrine half, added at the coordinator's request

Two contract edits arrived mid-row from the session that launched me, to be added verbatim. I
applied both, with two corrections I am flagging because they are changes to what I was handed.

**`.agent-workflows/orchestrator.md`** (line-neutral, 198/200 core, common path 640/640 - verified
with `npm run check:shared-instructions`). Before:

    **Landing authority belongs to the queue.** No exception touches landing: **Never merge, and never
    push.** Every branch reaches `main` through the queue, started by the session that owns the work;
    this session reads what the queue did.

After:

    **Landing authority belongs to the queue.** Never merge, and never push. A branch reaches `main`
    declared finished by its own session - but **RE-QUEUEING a landing already declared is neither, so
    this session DOES it** rather than reporting a refusal the branch never made (owner, 2026-09-04).

*Correction:* the coordinator's wording opened `**Landing authority belongs to the queue: never
merge, never push.**`, which drops the pinned contract marker `Never merge, and never push.` and
fails `check:shared-instructions`. The marker is restored; the meaning is unchanged.

**`.agent-workflows/orchestrator/night.md`**, the "Stopping" paragraph, carries the new rule that a
refusal the branch did not cause is repaired by the loop rather than reported. Two corrections:

- The command is **`node scripts/jobs.mjs requeue <branch>`**, not `add-merge` - see gap 3. This is
  what makes the rule executable at all, and it is the point the coordinator asked me to flag
  loudly: the loop is now instructed to do something it *can* do.
- **I did not transcribe "queueing every blocker too."** That instructs the loop to queue branches
  whose sessions never declared them finished, which is this session declaring another session's
  work done - the one rule landing has (root `AGENTS.md`, "Git"), and this row's own trap. It is
  also unnecessary now: a held landing releases itself when a blocker lands or is queued, so the
  only thing to name in the morning is the blocker. The paragraph says that instead.

`incidents.md` carries the evidence as "the five commands the owner had to paste" - the three-step
trap, the owner's words, and the mechanism each gap got.

## Verification

- `npm run build` green on `966f6b96`. `[write-version] dist/version.json ->
  claude/s-ordering-block-is-a-wait@c583115819` on the first commit, so it gated this branch.
- `node --test scripts/jobs-store.test.mjs scripts/auto-merge.test.mjs` - 125 pass. Both files are
  in the build's own `node --test` list, so the gate covers them too.
- The new tests were run against the **pre-change sources** (stashed) and fail there.
- `requeue`'s refusal paths and the outstanding listing were exercised live against the real queue.
- No e2e: nothing in this change reaches the browser. Owner-queue item filed at
  `docs/acceptance/owner-queue/2026-09-04-ordering-block-is-a-wait.md`.

`check: review delegated (8 findings, 8 fixed) · simplify inline (the skill returned fan-out
instructions) · verify inline · taste: not applicable`. The verdict stamp is at
`<git-common-dir>/noacg-jobs/checks/claude-s-ordering-block-is-a-wait.json`.

The review's eight findings were all real and all fixed in the second commit - the worst was reading
the refusal inside `child.on('exit')`, which fires while the log is still draining, so the read
could have missed exactly the marker this row is built on. A standalone probe could not reproduce
that race on this machine; it is fixed by contract rather than by measurement, and `close` costs
nothing.

## What is left

- **The runner is the transition's limit.** The parking happens in whichever checkout's
  `jobs.mjs --runner` is draining, and a runner started from a checkout without this change behaves
  exactly as before. The sweep's adoption of already-failed ordering blocks is what covers that gap
  once a current runner takes over.
- **`aheadOfMain` is memoized for one poll**, so a blocker landing is seen up to five seconds late.
  Deliberate.
- Nothing is running. Nothing is waiting on anything.
