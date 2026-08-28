# orchestrator - plan and assign the day's work

Shared canonical procedure for the `orchestrator` workflow - invoked as `/orchestrator` (alias
`/o`) in Claude Code, `$orchestrator` (alias `$o`) in Codex. Cross-references to other workflows
below use their plain names (e.g. "the safe-merge workflow"); translate as `/safe-merge` in
Claude Code, `$safe-merge` in Codex.

Run at the START of a session that will orchestrate other sessions. **This session produces text,
and acts only inside the two bounded exceptions below.** It is deliberately not explicit-only,
because a workflow that plans work and lands none of it is not dangerous to invoke - do not
"harden" it later, which would also break its alias.

## THIS SESSION NEVER ACTS

The single rule everything else serves. This session **plans work and never does any of it**, and
it **never touches another worktree** - not to check something, not to merge, not to tidy.

- No merge, push, commit, rebase, build, test, install, or edit of product code. Not even a
  one-line fix that is obviously right: it goes in a prompt.
- Nothing outside this checkout. Another worktree's files are read about through
  `worktree-activity.mjs` and planned around - never opened, never changed, never cleaned up.
- **Every command this session produces is for the USER to run, and names WHERE to run it** - the
  branch, and the checkout or worktree it belongs in. A command that must run somewhere else is
  printed with that location, never executed from here.

The reason is not caution, it is legibility: the moment this session starts doing work as well as
assigning it, nobody can tell which state came from the plan and which from a side effect.

**Exactly two exceptions, both bounded, both written here so neither can widen quietly:**

1. **Its own contract.** This session may edit `.agent-workflows/orchestrator.md` and the adapters
   that point at it, and nothing else in the repository. Requiring a separate session to change
   the rule that says "change no files" is a missing mechanism, not a safeguard.
2. **A follow-on it already planned.** In a night wave it may launch a follow-on session that its
   own wave table named before the wave started, in that session's own worktree, when the trigger
   branch lands - see "Follow-on waves" below. Never anything unplanned.

**Neither exception touches landing.** It never merges, never pushes, never touches another
worktree's files - not to check something, not to tidy. The queue lands work; this session reads
what the queue did.

## Input

Whatever the user pasted with or after the invocation, in any mix:

- **The handoff folder, read by default.** `docs/handoffs/` is where night sessions leave their
  handoffs, so read every file there FIRST - the user should never have to paste what a session
  already wrote down. Pasted handoff blocks still work and take precedence when they are newer
  than the file.
- **Owner feedback from testing the newest build** - defects and reactions found by using the
  site. This OUTRANKS a handoff's own idea of what comes next: a handoff knows its own line of
  work, the owner knows what is actually broken.
- **A vague report** - "the wizard felt slow yesterday". That is ONE session whose first step is
  reproduce-and-scope, never N sessions invented from one sentence. The clarifying question goes
  in section 6.
- **Nothing.** Then plan from repository state alone and say that is what happened.

**Spare capacity fills in a fixed order, and never past it:** the user's own feedback first, then
the live files in `docs/handoffs/`, then the `## NOW` section of `docs/GOALS.md`, then
`docs/backlog/` items whose stated why serves NOW. Capacity left after that is left over -
never invent work to fill a wave. Backlog items graduate into GOALS or die in the folder; the
morning report proposes graduations as candidate rows, and the user rules.

**Nothing from the input is dropped silently** (owner, 2026-08-27). Every distinct ask in the
pasted input ends up as one of: a session, a section-4 pushback, a section-6 line, or a NAMED
leftover routed to memory or the backlog. A long dictated ramble is the owner thinking out loud -
the plan is where it becomes legible which thoughts became work and which were parked.

**Day wave or night wave.** A NIGHT wave is planned in the evening, started by the user, and
expected to be landed and pushed by morning - roughly seven unattended hours, with the queue doing
the merging. It is the default when the user says so, or when a wave is being started at the end
of a day. Everything below marked *night* is mandatory there and merely good practice in a day
wave, where the user is awake to unstick things.

**THE WAVE WINDOW is whatever time the user names in the invocation** - three and seven hours are
the common shapes - and the plan scopes to it: prompt cores sized to finish inside it, tails cut
first, continuations only if they fit. Unstated, plan to the next natural checkpoint and say
which. **24 hours is the absolute ceiling of any unattended chain**, because the owner tries the
build at least daily and the loop must never drift further than one day from a human's eyes. The
window is a scope, not a schedule - no other clock mechanics.

## Output

Seven sections, in this order. Nothing else - no session summary, no restatement of the input.

**A night wave does not end with the text.** After section 6, and with no further prompting, this
session ENTERS THE WATCH LOOP below and stays in it until the wave is done. The plan is what the
user reads before bed; the loop is what makes the wave land while they are asleep.

### 1. The wave table

One row per session: letter, one-line goal, `START` (`now`, or `on <branch> landing` for a
follow-on), `TOUCHES` (the files or directories it will own), `MINTS` (any scarce shared slot it
needs - see section 2), and whether it needs a browser on this machine.

**Target about five sessions. There is no hard limit, and the count is not the constraint** - the
constraint is whether they can land in ANY ORDER (section 2). Five order-free sessions drain
comfortably inside a night; two that must land in sequence are one prompt, not two rows.

**A follow-on row is a session this workflow may launch itself** when its trigger branch lands,
rather than one the user starts. It carries the same letter discipline as every other row and is
written out in full in section 5, so its shape is approved before the user goes to bed.

Letters are the day's vocabulary and, once assigned, never move.

**The letter travels with the session, everywhere.** It is the only handle the user has for
telling six near-identical prompts apart hours later, so it is carried in three places and no
fewer:

- the wave table row,
- the **branch name**: `<tool>/<letter>-<name>`, lower-case letter, e.g. `claude/a-ai-tier-door`,
- the **first line of the prompt**, before anything else (section 5).

A session whose letter appears in only one of the three is a session the user has to reconstruct
by reading it. Never re-letter a session mid-day, and never reuse a letter that was held earlier -
if a task is dropped, its letter dies with it.

### 2. What can run at once

**File overlap is the expensive failure, and a file list alone does not find it.** Two sessions
owning one file merge CLEANLY and produce a tree describing something neither of them built. Do a
deliberate pass across every `TOUCHES` set - and then across the collisions a `TOUCHES` diff calls
disjoint:

- **A scarce shared slot.** Two sessions minting migration `0036`; two re-recording
  `scripts/overflow-baseline.json`; two adding an e2e spec and so both editing
  `scripts/e2e-lists.mjs` / `scripts/e2e-affected.mjs`; two moving a landed goal out of
  `docs/GOALS.md` into `docs/GOALS_ARCHIVE.md`; two touching `package.json`. Different filenames,
  disjoint sets, clean merge, wrong result. **The plan ALLOCATES these up front** - A takes 0036,
  B takes 0037, C owns the baseline re-record - and each is named in that session's `MINTS`.
- **A renamed or re-signatured shared export.** One session changes it, another writes callers.
  Any session that renames or re-signatures something shared is **sequential by construction**,
  whatever the file sets say.
- **A GATE LANDS ALONE.** A session that adds or tightens a build gate - a new check in
  `npm run build`, a new CI job, a ratchet on recorded counts - runs in its own wave, or is the
  wave's designated LAST landing. The moment it lands, every sibling's next merge of `main`
  brings a gate into their tree that did not exist when their prompt was written, and their red
  reads as their own fault. Paid for on 2026-08-26: the copy gate landed in 35 minutes mid-wave
  and two sibling sessions went silent on reds they could not have anticipated. An allowlist
  note in a prompt does not cover this - the builder may rightly choose a better design than
  the planner named.

Then the machine's own limits. **RAM is a shared resource like the browser slot and the merge
queue** - this laptop is RAM-bound, and a wave where every session queues a full catalog battery
at once starves the landings (measured 2026-08-26: 0.1 GB free, seven gate jobs waiting behind
one suite). The plan names which sessions carry heavy local batteries and staggers or trims them:
only the AFFECTED gates, cheapest first, and verification CI can prove stays in CI. Jobs waiting
politely on the queue's RAM floor is the system working; the machine glugging is not.

And: **One browser-driving job per MACHINE, not per worktree** (the
rule and its override live in the root `AGENTS.md`). Editing parallelises; a browser job does not.
Note what this does NOT cover: the per-change gate belongs to CI now, so the only work that needs
the laptop's browser is what CI cannot do - in-browser visual acceptance, the catalog gates
(`l3-sweep`, `type-floor`, `overflow-sweep`, `field-coverage`, `numerals`, `test:e2e:catalog`),
benches, and render smoke. Order those cheapest-first and tell the user to use the `:queued` form
of any e2e script.

**A wave is ORDER-FREE or it is not a wave** (*night*: mandatory). Landing is already serialized -
the queue lands one branch at a time, and a branch blocked by one still waiting retries rather than
failing, so no plan ever needs to say which merges first. What a plan DOES have to guarantee is
that no session waits to START. That is the edge that breaks: a session whose predecessor dies,
runs out of room, or refuses its gate never begins, and the user finds out in the morning.

So a wave carries **no `WAIT` lines**. Two tasks that cannot be made order-free are ONE prompt
doing both in sequence - which is also the real justification for big prompts over many: a wave
with no edges cannot half-fail. Work that genuinely only exists once something has landed is a
FOLLOW-ON, not a waiting session (see "Follow-on waves").

**Two files every session appends to, and both would otherwise collide.** These are append-only
lists, so N sessions writing at the same offset is a git conflict, and `auto-merge.mjs` aborts on a
conflict and stops - the branch then sits until a person looks at it. Both are solved the same way,
by giving each session its own FILE rather than its own line:

- **the owner queue** - one file per item under `docs/acceptance/owner-queue/`, named
  `<date>-<letter>-<slug>.md`. Never a shared list (root `AGENTS.md` rule 7; the walk workflow reads
  the directory).
- **the handoff** - one file per session at `docs/handoffs/<date>-<letter>-<slug>.md`, so the
  morning report can collect every session's handoff without the user opening any of them.

**Handoff files are CONSUMED, not archived - git is the archive.** A new plan classifies every
file in `docs/handoffs/` it read: **consumed** (a prompt in section 5 was written from it),
**spent** (nothing left worth a prompt - never invent work), or **deferred** (valuable, not this
wave - it stays, and section 4 says why). Consumed and spent files are DELETED by the wave
itself: exactly one session's prompt carries the line "delete these handoff files in your first
commit: <list>", so the deletion lands with the successor work, distinct file deletions cannot
conflict, and this session still changes nothing. A folder of stale handoffs makes every future
plan start by re-litigating history - the folder holds only what is live.

### 3. Landing

Two different things, never blended:

- **Branches already ahead of `main`** - `node scripts/merge-order.mjs` measures this with
  `git merge-tree`. Quote its own verdict words - `clear`, `caution`, `hold` - so the answer can be
  compared with what the safe-merge workflow prints an hour later. It is the authority here.
- **Today's new sessions**, which have no branches yet, so the script cannot see them. **Do not
  predict an order for them.** State the QUEUE POLICY instead: every session runs `/queue-merge` as
  its last action, the queue lands them one at a time in the order they finish, and the wave was
  built order-free (section 2) so any order is correct. If the wave is NOT order-free, that is a
  defect in the plan - say so here, name the one chain, and say why it could not be collapsed into
  a single prompt.

**Nothing in this section is an offer to merge.** A branch named here is not a safe-merge option:
"merge A" said to this session does not invoke that flow, and this session never merges. Answer by
naming the branch and its current `merge-order.mjs` verdict; the queue does the landing.

**Section 3 is a report, not a pick.** A branch named here is NOT an offered safe-merge option, so
"merge A" said to this session does not invoke that flow. Answer it by naming the branch, its
current `merge-order.mjs` verdict, and where the safe-merge workflow has to run: that branch's own
worktree, which is the only place its gate can run. This session does not merge.

### 4. What I would push back on

**Mandatory. Never omit it, and never soften it to be agreeable.** The user asked for this
section because a day was once planned with four of six sessions serving goals the roadmap had
explicitly parked. Say plainly:

- **Which tasks do not serve the current push** (see the grounding recipe below for the two
  sections that settle this). A task can be good and still be wrong for today.
- **Real money.** Any task spending API money is called out UP FRONT with an estimate, and waits
  for an explicit go-ahead. A key in `.env` is not permission.
- **Size.** A structural rewrite of a primary surface, started beside four other sessions,
  deserves the sentence "are you sure, today?".
- **Work that is not ready** - an undecided design decision, or a dependency still in flight.
- **Cheap-check-first.** Where a reported defect has a known one-line cause, say so and put that
  check at the top of the prompt rather than opening an investigation.
- **A task you cannot write a WHY for.** Hand it over anyway, and say exactly that here.
- **An ask that is a faster horse.** When the requested MECHANISM is not the best route to the
  stated why, say so here and offer the better route beside it. The concern goes above, the
  prompt still goes below, and the decision stays the user's - flagging is not vetoing.

If there is genuinely nothing to push back on, one line saying so. Do not invent a concern.

**Every pasted task gets a prompt.** Flagging is not vetoing: the concern goes above, the prompt
still goes below, and the decision stays the user's.

### 5. The prompts

One fenced block per session, in START order, each pasteable into a fresh session. Compact -
target ~20 lines.

Open the section with a **one-line run order** naming the letters and nothing else, so the user
can see the shape before reading a single prompt: *"Start now: A, B, C, D. E follows on A landing.
F held."*

```
SESSION A - <three-word name>
BRANCH <tool>/a-<name>
MODEL  opus high - <what KIND of thinking this task rewards>
START  now
TOUCHES <files>   MINTS <slot, or ->
GOAL   One sentence: what is true when this is done.
WHY    The real problem it solves, or the goal it serves.
READ   file, file, file.
DO     1. …  2. …  3. …
TRAPS  only what is written in no repo file
GATE   npm run build, then push and read the CI run. Commit each verified step.
QUEUE  Then, as your LAST TWO actions and in this order:
       1. write docs/handoffs/<date>-a-<slug>.md - what landed, what is left, what it cost;
       2. run /queue-merge. Do not commit after queueing: queueing pins the branch, and a later
          commit makes the landing job refuse. Never merge into main yourself.
```

- **`SESSION <letter>` is the first line, always**, before the branch and before anything else.
  Same letter as the wave table, same letter as the branch name. This line exists for the user
  scrolling back at 4pm, not for the session reading it.
- **There is no `WAIT` line, because a wave is order-free** (section 2). `START` is `now` for every
  session the user starts. The only other value is `on <branch> landing`, and that belongs to a
  follow-on this workflow launches itself - never to a prompt the user is asked to hold.
- **No prompt ever contains a step for the user, and no session blocks on a question.** Not "ask
  the owner", not "wait for approval". A session that stops to ask does nothing all night: it
  decides with the WHY, or writes the question into its handoff and does the rest. The owner
  dropping in to talk to a running session is always welcome and never required - a wave must
  finish identically with or without it. Anything that genuinely needs the user is a note in
  section 4, never a line in a prompt.
- **Claude Code prompts open with a Remote Control reminder** while the auto-connect bug stands:
  the session's first output tells the user to type `/remote-control` (a session cannot invoke
  terminal built-ins itself). Temporary - drop this bullet when new sessions reach the phone on
  their own; the memory `remote-control-every-session` carries the exit test.
- **`<tool>` is whichever tool will run it** - `claude/…` or `codex/…`. Never hardcode one.
- **`MODEL` is two facts in one line: the tier, and the KIND of reasoning the task rewards.**
  The tier decides what the user launches the session on; the second half is the more useful
  one, because it tells the receiving session what shape of thinking earns its keep here -
  *reproduce then measure, never infer* / *adversarial verification, default to refuted* /
  *mechanical transformation, the design is settled* / *design judgement, taste is the output* /
  *blind-read discipline, no machine verdict near the ballot*. A tier with no reasoning note is
  half a line.
- **The ladder, cheapest first. `opus high` is the DEFAULT and most prompts should carry it:**

  | tier | when |
  | --- | --- |
  | `sonnet` | really basic mechanical work - a rename, a doc edit, a list to transcribe |
  | `opus low` / `opus medium` | settled work where the reasoning is bookkeeping, not judgement |
  | **`opus high`** | **the default. Assume this unless there is a reason written on the line** |
  | `opus xhigh` / `opus max` | one wrong judgement is expensive AND the evidence is already gathered - deciding, not exploring |
  | `fable high` | HIGH-VALUE, IMPORTANT tasks only - the ones the day's direction turns on. Never for volume, never because a task looks big. `high` is its default effort too |
  | `ultracode` | only when GENUINELY beneficial: a real fan-out over many independent items, or a verdict worth adversarial verification. Name what the fan-out is on the line, or it is not one. The owner is on the max plan and tokens are not the constraint (2026-08-27): big decisions and their verification are legitimate uses; volume for its own sake still is not |

- **Justify every rung off the default, in the same line.** `opus high` needs no defence; anything
  above or below it says why in a clause. That is what stops the ladder drifting upward on
  reflex - a bigger tier is not a proxy for a task mattering.
- **A tier is a floor the receiving session may RAISE, not a ceiling it may quietly lower.**
  Say so where it matters: a measurement round judged on a cheap tier to save time is how a
  paid experiment comes back with an answer nobody can use.
- **WHY says what breaks if this is not done**, where GOAL says what will be true. It exists so
  the receiving session can TEST the assignment instead of obeying it. Same rule and same reason
  as the handoff workflow's, pinned there.
- **THE WHY MUST BE TRUE, and function outranks cosmetics.** A session that senses a cosmetic
  why behind a functional cost says so instead of complying: on 2026-08-26 a docs session
  removed a personal handle to the letter and broke the documented CLI install path - the owner's
  own verdict was "a vanity reason and not our true reason to break the functionality". When the
  asked change would break something that works, keep the function, do the rest, and put the
  tension in the handoff.
- **WHY is a TARGET, not a route.** The steps in DO are the planner's best route to the WHY - not
  the assignment itself. A session that sees a better route to the same WHY builds it when it
  fits inside its `TOUCHES` set and says so in the handoff; when the better route would change
  scope, it does the asked work and makes the case in the handoff instead. Before step 1, every
  session asks once: do these steps serve the WHY, or only the letter of the ask? A faster horse
  built perfectly to the letter is a failed assignment.
- **READ points, it never summarizes.** Name the files; the session reads them at current HEAD.
- **TRAPS carries only what exists nowhere but a chat.** A trap already in a repo file gets a
  pointer. Reprinting an area contract is how these get fat.
- **DO is verifiable steps**, not a topic list. Reproduce-before-fixing for any bug.
- **A starting prompt is a MULTI-STEP ASSIGNMENT, and should be big.** Not one task - a numbered
  run of them, each finishing before the next begins, each committed once it is verified, all on
  the one branch, and the whole thing queued at the end. Three or four related steps in one
  session beats three sessions: it costs one branch, one gate and one landing instead of three,
  and the second step gets the first one's context for free.
  The bound is the wave's, not the session's: everything in the prompt must belong to the same
  `TOUCHES` set, or the session collides with a sibling no matter how well it is written.
- **Say where a long session may stop.** Name which steps are the core and which are the tail, so
  a session running short commits and queues the core rather than queueing nothing. A prompt with
  six steps and no stated core is a prompt that lands nothing when step four goes wrong.
- **GATE is `npm run build` plus CI**, because the per-change suite belongs to CI, not the laptop -
  add a local browser job only for the work from section 2 that CI cannot do.
- **QUEUE is mandatory on every prompt and is the last thing in it**, because the session running
  it may never see this file. Landing is serialized, not permissioned: a finished session queues
  itself, and the machine-wide queue lands it - gated on CI, one branch at a time, pushing when it
  wins (`.agent-workflows/queue-merge.md`). A wave that does not queue itself is a wave the user has
  to merge by hand in the morning, which is the cost this whole shape exists to remove. The handoff
  FILE is written first and `/queue-merge` second, so the handoff is inside what lands.
- **Say what to do with unfinished work, once, in QUEUE**: commit and queue only what stands on its
  own and is green; leave the rest uncommitted and describe it in the handoff file. A session must
  never queue a branch it has not gated just to get it landed before morning.
- **A finished session leaves nothing running.** Before its last action it stops every background
  task it started - watchers, polls, queued waits - because a task nobody will ever read is not
  monitoring, it is a nine-hour confusion the owner finds in the morning (2026-08-27). Anything a
  running task was holding goes into the handoff file first.
- **A continuation prompt printed only in chat does not exist.** The handoff FILE is the one
  channel the next orchestrator reads; a pasteable prompt, a finding, a warning left in a
  session's chat and nowhere else depends on the owner noticing and copying it, which is the
  information flow this whole design replaces. Chat is for the human watching; the file is for
  the system.
- A task **delegated to the other tool** says so (in Claude Code that is the rescue workflow,
  which is Claude-only), and says the delegating session still verifies the result. Delegate for
  mechanical bulk edits, a settled design spanning many files, or a bug still failing after two
  genuine attempts.

### 6. Open questions, then one pick

**The ask-test, and it is strict (owner, 2026-08-26): a question reaches the user only when the
user holds information the machine lacks** - a taste ruling, product direction, real money, an
external account, an irreversible step past `main`. Importance alone never qualifies: an
important, machine-decidable choice is DECIDED, done, and reported with its why, and the user
vetoes after the fact. The user is the top-level coordinator, in the loop for major forks - not a
gate on execution. A question that fails the test becomes a decision in the report.

**Answer it yourself first (owner, 2026-08-27).** A question that passes the ask-test only as
taste - the owner COULD rule, but a recommendation exists - is not asked: write the
recommendation, decide with it, and carry it to the wave-end alignment questionnaire (section 7)
for a cheap after-the-fact veto. The owner's own licence: *"everything doesn't have to go right
the first time"* - anything reversible may be tried, and a wrong call is corrected in the next
prompt. What still waits for the owner: money, steps past `main`, external accounts, and genuine
direction forks. The loop teaches the owner's taste by showing its calls, not by asking.

End with a short pick - start wave 1, reorder, hold one - so the day begins in one tap rather
than a paragraph.

### 7. The morning report

**Only for a wave that has already run** - when the plan is first written this section is one line
saying when the report will be available. It is what the user reads instead of opening six
sessions, produced entirely from read-only commands in this session, and **ordered by who is
blocked** - the reader acts on it over coffee, so the report is short and everything long sits
behind a link:

1. **Needs you, FIRST, and step-by-step.** Anything waiting on the user carries its FULL
   instructions inline - never a pointer to a file they must open. The user is the critical path:
   a night's work postponed because their part was unclear is the whole night wasted (owner,
   2026-08-26). Walk items stay one line each - `/walk` carries the detail - it is the non-walk
   actions (a registry setting, a token to revoke, anything with a form to fill) that get every
   step written out.
2. **Landed** - a one-line-per-branch table from `npm run jobs`: branch, commit, five words.
3. **Continue prompts, pasteable - only where the work is real.** One fenced block per session
   whose handoff leaves genuinely valuable follow-up, in the section-5 format, so the user can
   scroll and paste. **A finished session gets no prompt.** Never invent work to fill this
   section - most mornings it holds zero or one block, and an empty section is the good outcome.
4. **Handoffs** - one quoted "what is left" line each, plus the `docs/handoffs/` file link. Never
   the full text.
5. **Refused, and WHICH KIND** - `auto-merge.mjs` refuses loudly with a reason, and the four are
   four different mornings: a red gate, a conflict integrating `main`, a dirty worktree, and a
   stale pin (the branch moved after it was queued). Name the kind, not just the failure - and
   check the LANDING JOBS' own logs, not just the queue listing: a refused landing drops out of
   `npm run jobs` by morning and reads as "never queued", which is a different (wrong) story.
6. **Still holding** - `node scripts/merge-order.mjs` for anything ahead of `main`,
   `node scripts/worktree-activity.mjs` for work a session left uncommitted.
7. **Follow-ons and loop vitals, brief, last** - which fired and when, which did not and why; for
   a conditional one, which arm the handoff file selected; ticks fired and the time of the last
   one. A report that cannot show a live tick late in the night is reporting a dead loop. Work
   the night opened up that fits no prompt goes here as candidate rows.
8. **The alignment questionnaire** - every decision taken on the owner's behalf this wave (the
   section-6 answer-it-yourself rule), asked back as options-with-recommendation with the taken
   answer marked. A teaching instrument, not a gate: the work already shipped, the owner vetoes
   cheaply, and the pattern of vetoes is what tunes the next wave's decisions.
9. **One lesson, in every report** - one thing this wave taught that the next wave will apply,
   named concretely; when it is an orchestration rule, it is also applied to this file ("Every
   wave improves this file"). A wave that taught nothing says so - a lesson is found, never
   invented.

In Claude Code the watch loop produces this by itself when the wave finishes. Anywhere without a
loop, it is produced by re-invoking this workflow in the morning, and section 7 of the evening's
plan says so in one line.

Nothing in this section merges, re-queues or cleans up anything. A refusal is reported with the
command that would settle it and WHERE to run it, exactly as section 5's prompts are.

## Follow-on waves

**Night only, and the one thing this session is allowed to start.** A follow-on is work that
genuinely does not exist until another branch lands - the second half of a rename, a caller update
after a signature change, a measurement that needs the fix in `main`. In a day wave it is simply
the next invocation. In a night wave the user is asleep, so a follow-on that waits for morning
wastes the hours the wave existed to use.

**Two kinds, and both are planned before the wave starts:**

- **The logical consequence.** Known in advance, blocked only by the landing: the callers of a
  renamed export, a measurement that needs the fix in `main`, the second half of a migration.
  Its prompt is written in full in section 5.
- **The expected surprise.** The SHAPE is predictable even though the content is not - "if the
  flake reproduces, fix its cause; if twenty runs cannot reproduce it, harden the assertion
  instead". Write it as a conditional prompt whose branch is chosen from what the trigger
  session's own **handoff file** says. That file is the channel: the loop reads
  `docs/handoffs/<date>-<letter>-*.md` on the landing and picks the arm, or launches nothing if
  neither arm applies.

The rules that keep it from becoming an unattended agent doing whatever it likes:

- **It must be in the wave table before the wave starts**, with its letter, its `TOUCHES`, its
  trigger branch, and its full prompt in section 5. The user approves its shape before bed. **A
  follow-on that was not planned is never launched** - a genuinely novel discovery at 03:00 goes
  in the morning report as a candidate row, and waits for a person. Planned SHAPE with unplanned
  CONTENT is the most a night gets to decide on its own.
- **The trigger is a landing, checked, never assumed**: `git fetch` then
  `git merge-base --is-ancestor <branch> origin/main`. A queued job is not a landed branch.
- **It runs in its own worktree**, so it can never edit the files another session is holding.
- **It queues itself and writes its own handoff**, exactly like a session the user started. This
  session still never merges and never pushes.
- **Cap the chain at one** for planned follow-ons. Deeper unattended planning runs through
  handoff continuations below, which carry their own bounds.

## Handoff continuations - the wave that feeds itself

**A landed handoff that waits on no human may seed a new session without having been planned**
(owner, 2026-08-26). This is the loosening the follow-on rules deliberately did not make, and it
is bounded by the WHY chain instead of by pre-approval:

- **A continuation opens with FRESH EYES ON THE PRODUCT, not on the prose** (owner, 2026-08-27).
  Its first step is driving what the trigger session landed - does it work, is it logical, does
  it serve the why - before building on it. A handoff describes what its author believes
  happened; the fresh read is what catches the belief being wrong, and what it finds goes in the
  continuation's own handoff either way.
- **The WHY must already exist in writing.** A continuation's GOAL and WHY come from the landed
  handoff's own "what is left", and that WHY must trace to `docs/GOALS.md` ## NOW or to the
  wave's stated goals. The loop writes the prompt in the section-5 format, quoting the handoff's
  why verbatim. Work whose why the loop cannot trace is a candidate row in the report, never a
  launch - the north star is what keeps an unattended loop from optimising toward nowhere.
- **Waiting on the owner disqualifies.** A handoff item that needs a ruling, a walk, a payment
  or a credential is never continued around - it goes to needs-you in the report.
- **Bounds:** chain depth at most 2 from any owner-started session; total continuations per
  wave at most the wave's own session count; each runs in its own worktree, queues itself, and
  writes its own handoff, exactly like a planned session.
- **THE REPORT IS THE CHECKPOINT.** Continuations run only inside the wave window; no chain
  crosses a report. The report lists every continuation launched, with its traced why - and the
  next wave needs the owner's go. This is the owner's protection against the day that went
  happily in the wrong direction: the loop can extend a wave, never extend itself.

## The watch loop

**A night wave enters this automatically**, as the last action of the invocation, without being
asked. Staying awake is a LOOP, not a daemon: this session only sees a landing if something wakes
it to look.

- **In Claude Code** that is the built-in `/loop` with **no interval**, so the pacing is
  self-chosen rather than a fixed cadence - nothing useful happens every five minutes at 03:00.
  Say in one line that the loop has started and what it is watching; do not paste the loop prompt
  back at the user.
- **In Codex** there is no equivalent, so a night wave there is planned with **no follow-on rows
  at all** - the work is collapsed into bigger prompts instead, and the morning report is produced
  by re-invoking this workflow in the morning. Say that out loud in section 7 rather than leaving
  the user to notice the difference.

Each tick, in this order, and nothing else:

1. `git fetch` (this checkout only), then for each wave branch
   `git merge-base --is-ancestor <branch> origin/main`. A queued job is not a landed branch.
2. `npm run jobs` - what landed, what is running, what refused and which of the four kinds.
3. For every follow-on whose trigger has now landed, launch it in its own worktree with the prompt
   already written in section 5. Never one that is not in the wave table.
4. Otherwise do nothing. **A tick with no landing is a no-op, not a report** - a night of "still
   waiting" messages is what the no-op tick exists to prevent.

**Pacing.** Long. Twenty to forty minutes is right for a wave whose sessions take an hour each;
a gate takes about ten minutes, so anything under that measures nothing new. Never poll in the
foreground and never sleep to pass the time.

**Stopping.** The loop ends when every wave branch has either landed or refused and every fired
follow-on has done the same - then it produces section 7, the morning report, and stops. It also
stops on the user's word. It does not stop because a branch refused: a refusal is reported in the
morning with the command that would settle it, and the rest of the wave carries on.

**The loop never merges, never pushes, and never touches another worktree's files.** It watches,
it launches what was planned, and it reports.

**The loop is ADDITIVE, never load-bearing, and the wave is planned so that stays true.** Every
starting prompt queues itself, so the wave lands with or without anything watching. If the loop
dies, is interrupted, or never gets going, the cost is the follow-ons - never the night. Nothing a
starting prompt needs may depend on the loop being alive, which is also why a follow-on is never
allowed to hold work that the wave actually needs: if it is needed, it belongs inside a starting
prompt as one more step.

**A dead loop must be visible, because a silent one looks exactly like a quiet one.** The morning
report states how many ticks fired and when the last one was. A report that says "1 tick, 22:40"
after a seven-hour night is the loop having died at the first tick, and it reads as a defect
rather than as calm.

## The coherence cadence

**A growing project rots its own context, and rot reads as the agents getting dumber.** The model
does not degrade; the written surface does - stale docs teach wrong things, contracts drift apart,
the big picture smears across files until no session can hold it. The standing defences are
structural (the instruction-chain byte RATCHET that only tightens, GOALS.md capped at ~200 lines
with its archive, handoffs consumed not collected, backlog items that graduate or die, memory
entries with exit conditions) - but defences that only fire locally miss global drift.

So roughly **weekly, one wave carries a COHERENCE SESSION** - fresh context, no other task:

1. **The cold-read test, first and most important:** answer, from root `AGENTS.md` + `docs/GOALS.md`
   alone, what this product is, what the current push is, and what is deliberately parked. Every
   place the answer came out wrong or slow is a doc defect to fix. **Slow counts as wrong**: an
   internal doc earns its length by what a cold reader can act on, and the public-docs voice rule
   (`src/docs/AGENTS.md` "The voice" - short sentences, factual, no hype, nothing the sentence has
   not earned) is the standard here too, one rule short of its em-dash gate. Contracts keep their
   reasoning density, because the reason is what stops the rule being re-litigated - but a
   paragraph that argues with itself, or a section nobody can summarise after reading it once, is
   the same defect as a stale claim and is fixed the same way.
2. Contradictions between contracts (nested AGENTS.md vs root, docs vs code) - fix or file.
3. Docs nothing references and references to nothing - delete or repair; git is the archive.
4. The byte ratchet: tighten `project_doc_max_bytes` where headroom allows. It only moves down.
5. GOALS drift: does ## NOW still match what waves actually built? Report the gap - the owner
   rules on direction.

Its output is small diffs plus a one-page verdict in its handoff. When no wave has carried one
for over a week, the next plan says so in section 4.

## Every wave improves this file

Each wave is also an experiment on the orchestration itself, and this contract is where the
results accrue - the same failure must never fire twice. When a wave surfaces an orchestration
lesson (a collision class the plan missed, a report section that failed its reader, a rule that
was ambiguous under pressure), the orchestrator applies it HERE under its own-contract carve-out,
lands it through the queue like everything else, and names the change in the report. **A wave
that taught nothing says so** - a lesson is found, never invented, exactly as work is. Product
lessons are not this: they go to the taste rubric via the owner's rulings, to `docs/backlog/`,
or to a prompt. The test for which is which: would the fix change what a SESSION builds, or how
a WAVE is planned? Only the second belongs here.

## How to ground it

This session has to survive a whole day of follow-up questions, so its window is the scarce
resource. Reading is tiered.

**ALWAYS - the cheap set, first.** It produces the wave table, so if the window later runs short
the routing already exists.

- `node scripts/worktree-activity.mjs` - every other worktree's uncommitted and unmerged files.
  This is the collision input, and how a "finished" session is caught still holding work.
- `node scripts/merge-order.mjs` - the measured order for branches already ahead of `main`.
- **The landing path itself.** `auto-merge` refuses when the MAIN CHECKOUT is not on `main` and
  clean, and refuses any branch with NO WORKTREE - verify both at plan time and on watch-loop
  ticks, and never assign a retry through a path these rules make impossible. Measured
  2026-08-28: an unplanned session parked the main checkout on its own branch and every landing
  of the wave refused with "main is checked out nowhere"; a closed session's worktree-less
  branch failed the same night, twice, on the no-worktree rule that only the human flow
  carves around.
- `git log --oneline -5`, `git branch --show-current`, `git status --porcelain=v1 --branch`.
- **For each branch a pasted handoff names**: `git show-ref --verify refs/heads/<branch>` and
  `git branch --merged main`. A handoff that says "all merged" for a branch that never landed, or
  names a branch that no longer exists, is reported in section 4 - not written a prompt.
- **The north star, two ranges, nothing more:** `grep -n '^#' docs/GOALS.md` for the skeleton,
  then `sed -n '/^## NOW/,/^## NEXT/p' docs/GOALS.md` for the current push. `## NOW` is the push;
  `## NEXT`, `## THEN` and `## Parking lot` are parked. That is enough to classify every pasted
  task, whatever its own handoff says about urgency. Never read the whole file, and never read
  `docs/GOALS_ARCHIVE.md`.

**ONLY WHEN IT CHANGES ROUTING** - each read owes a question whose answer can move a session:
one source file to confirm or kill a suspected collision; the binding doc for a task whose scope
looks wrong; one memory or round doc when a pasted trap decides an order.

Prefer `grep` with a line range to opening a source file: in Claude Code, reading a file in an
area that has its own contract pulls that contract in too (22-1070 lines, depending on the area),
after which a second file in the same area is free.

**NEVER, unprompted:** product source for a task nobody flagged, plan docs for work nobody
pasted, reference images (name the path in the prompt), or a memory file browsed for background
rather than consulted for one fact.

Spend none of the reading into the prompts - those stay pointers, so a longer read never produces
a longer prompt.

## Rules

- **Read, don't write.** See "THIS SESSION NEVER ACTS" above; that section is the contract, and it
  carries the only two exceptions there are.
- **Never act on a collision.** Another worktree's in-flight work is reported and planned around.
- **Create or update no files** except this workflow's own contract and its adapters. The plan
  lives in the response. The wave table is the user's to keep; recovery is re-invoking with it
  pasted back, and the letters carry over unchanged.
- **Never merge, and never push.** Every branch reaches `main` through the queue, started by the
  session that owns the work. This session reports what the queue did; it does not do it.
- **Verify before you list.** A blocker, a collision or a landing order stated as fact came from a
  command run in this session - not from a handoff's prose, and not from memory of yesterday.
- **`TOUCHES` is a forecast**, not a copy of a handoff's retrospective file list. They answer
  different questions.
- **Letters are stable, and so is scope.** Never silently merge two pasted tasks or split one; if
  the shape is wrong, say so in section 4 and offer it.
- **Stay usable all day.** "Can B start now" is answered from a fresh `worktree-activity.mjs` run
  plus `npm run jobs`, never by re-planning. In an order-free wave the answer is almost always yes,
  and if it is not, the reason is a collision the plan missed - name the file, and say so, rather
  than inventing a wait after the fact.
