# The night wave - follow-ons, continuations, and the watch loop

## Follow-on waves

**Night only, and the one thing this session is allowed to start.** A follow-on is work that
genuinely does not exist until another branch lands - the second half of a rename, a caller update
after a signature change, a measurement that needs the fix in `main`. In a day wave it is simply
the next invocation. In a night wave the user is asleep, so a follow-on that waits for morning
wastes the hours the wave existed to use.

**Two kinds, and both are planned before the wave starts:**

- **The logical consequence.** Known in advance, blocked only by the landing. Its prompt is
  written in full in section 5.
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
- **Cap the chain at one** for planned follow-ons. Deeper unattended planning runs through handoff
  continuations below, which carry their own bounds.

## Handoff continuations - the wave that feeds itself

**A landed handoff that waits on no human may seed a new session without having been planned.**
This is the loosening the follow-on rules deliberately did not make, and it is bounded by the WHY
chain instead of by pre-approval:

- **A continuation opens with FRESH EYES ON THE PRODUCT, not on the prose.** Its first step is
  driving what the trigger session landed - does it work, is it logical, does it serve the why -
  before building on it. A handoff describes what its author believes happened; the fresh read is
  what catches the belief being wrong, and what it finds goes in the continuation's own handoff
  either way.
- **The WHY must already exist in writing.** A continuation's GOAL and WHY come from the landed
  handoff's own "what is left", and that WHY must trace to `docs/GOALS.md` ## NOW or to the wave's
  stated goals. The loop writes the prompt in the section-5 format, quoting the handoff's why
  verbatim. Work whose why the loop cannot trace is a candidate row in the report, never a launch
  - the north star is what keeps an unattended loop from optimising toward nowhere.
- **Waiting on the owner disqualifies.** A handoff item that needs a ruling, a walk, a payment or
  a credential is never continued around - it goes to needs-you in the report.
- **Bounds:** chain depth at most 2 from any owner-started session; total continuations per wave
  at most the wave's own session count; each runs in its own worktree, queues itself, and writes
  its own handoff, exactly like a planned session.
- **THE REPORT IS THE CHECKPOINT.** Continuations run only inside the wave window; no chain
  crosses a report. The report lists every continuation launched, with its traced why - and the
  next wave needs the owner's go. This is the owner's protection against the day that went happily
  in the wrong direction: the loop can extend a wave, never extend itself.

## The watch loop

**A night wave enters this automatically**, as the last action of the invocation, without being
asked. Staying awake is a LOOP, not a daemon: this session only sees a landing if something wakes
it to look.

- **In Claude Code** that is the built-in `/loop` with **no interval**, so the pacing is
  self-chosen rather than a fixed cadence - nothing useful happens every five minutes at 03:00.
  Say in one line that the loop has started and what it is watching; do not paste the loop prompt
  back at the user.
- **In Codex** there is no equivalent, so a night wave there is planned with **no follow-on rows
  at all** - the work is collapsed into bigger prompts instead, and its morning report comes from
  re-invoking this workflow. Say that out loud in section 7 rather than leaving the user to notice
  the difference.

Each tick, in this order, and nothing else:

1. `node scripts/wave-tick.mjs` - ONE command that does the whole observation leg: `git fetch`,
   the per-branch `merge-base --is-ancestor` landing checks (a queued job is not a landed branch),
   the queue and landings, `blocked-sessions.mjs`, the green-but-unqueued check (a branch ahead of
   main, clean tree, session idle, nothing queued - the ended-expecting-a-watcher failure, seen
   from outside), and the heartbeat append to the wave-state file. It prints only the DELTA since
   the last tick; a no-event tick prints one line. Every event is ALSO appended to
   `<git-common-dir>/noacg-jobs/wave-tick-events.log`, because an event is announced exactly once
   and stdout can be lost to compaction - the morning report reads that log, not the loop's
   memory. The script observes and never acts - launching, holding and every judgement stay in
   this session.
2. Read the delta. What refused, and which of the four kinds; what landed; who is waiting. A
   stalled worker is REPORTED, never killed - but its slot counts as free when launching cohort
   rows, so one hung session cannot park the rest of the night behind it.
   **A branch tip that has stopped moving is NOT the stall signal**, and reading it as one has
   already produced a wrong diagnosis (`incidents.md` "the seven-hour hang that was not one"). The
   transcript is the instrument that actually fits - Claude Code writes the tool CALL when it is
   made and the RESULT when it returns, so a call still carrying no result is a session waiting,
   at that instant, on that call. A session grinding through a suite has results arriving; a stuck
   one does not.
   **What it cannot tell you is WHY**, and it does not pretend to: a wait is a permission prompt
   nobody has answered, a session that died mid-call, or a call still running. The 30-minute
   threshold clears every shell command (the Bash tool is killed at 600 s) but NOT a blocking
   agent fork or a slow MCP call, so a long review leg can still surface - correctly, as
   "waiting", never as "stuck". The remaining two want the same action from this loop anyway.
   Nothing available separates them; do not invent a check that would claim to.
3. For every follow-on whose trigger has now landed, launch it in its own worktree with the prompt
   already written in section 5. Never one that is not in the wave table.
4. A row that came back substantially wrong is judged against `recovery.md` - repaired, or
   rewound and re-launched with a corrected assignment. A rewind is a NEW row in a NEW worktree;
   this session still never touches the old one.
5. Otherwise do nothing. **A tick with no landing is a no-op, not a report** - a night of "still
   waiting" messages is what the no-op tick exists to prevent.

**Pacing.** Long. Twenty to forty minutes is right for a wave whose sessions take an hour each; a
gate takes about ten minutes, so anything under that measures nothing new. Never poll in the
foreground and never sleep to pass the time.

**Stopping.** The loop ends when every wave branch has either landed or refused and every fired
follow-on has done the same - then it produces section 7, the morning report, and stops. It also
stops on the user's word. It does not stop because a branch refused: a refusal is reported in the
morning with the command that would settle it, and the rest of the wave carries on.

**The loop never merges, never pushes, and never touches another worktree's files.** It watches,
it launches what was planned, and it reports.

**The loop is ADDITIVE, never load-bearing, and the wave is planned so that stays true.** Every
starting prompt queues itself, so the wave lands with or without anything watching. Nothing a
starting prompt needs may depend on the loop being alive, which is also why a follow-on is never
allowed to hold work that the wave actually needs: if it is needed, it belongs inside a starting
prompt as one more step. **Subagent launches raised the stakes without changing the rule:** a
background subagent dies with this session, so what now rides the loop is not just the follow-ons
but every in-flight subagent worker and every unlaunched cohort row. Plan accordingly - the wave's
CORE goes into the sessions started at wave start, and the loop only ever carries work the night
can afford to lose.

**A dead loop must be visible, because a silent one looks exactly like a quiet one.** The morning
report states how many ticks fired and when the last one was - read from the wave-state file's
heartbeat, so the death is timestamped rather than inferred. A report that says "1 tick, 22:40"
after a seven-hour night is the loop having died at the first tick, and it reads as a defect
rather than as calm.
