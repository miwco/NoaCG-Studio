# Section 5 - the prompts

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
QUEUE  Then, as your LAST THREE actions and in this order:
       1. run /check (review, simplify, verify) on the branch - name each leg's mode;
       2. write docs/handoffs/<date>-a-<slug>.md - what landed, what is left, what it cost;
       3. run /queue-merge. Do not commit after queueing: queueing pins the branch, and a later
          commit makes the landing job refuse. Never merge into main yourself.
```

## The line rules

- **`SESSION <letter>` is the first line, always**, before the branch and before anything else.
  Same letter as the wave table, same letter as the branch name. This line exists for the user
  scrolling back at 4pm, not for the session reading it.
- **There is no `WAIT` line, because a wave is order-free.** `START` is `now` for every session
  the user starts. The only other value is `on <branch> landing`, and that belongs to a follow-on
  this workflow launches itself - never to a prompt the user is asked to hold.
- **No prompt ever contains a step for the user, and no session blocks on a question.** Not "ask
  the owner", not "wait for approval". A session that stops to ask does nothing all night: it
  decides with the WHY, or writes the question into its handoff and does the rest. The owner
  dropping in to talk to a running session is always welcome and never required - a wave must
  finish identically with or without it. Anything that genuinely needs the user is a note in
  section 4, never a line in a prompt.
- **Claude Code prompts the USER starts open with a Remote Control reminder** while the
  auto-connect bug stands: the session's first output tells the user to type `/remote-control` (a
  session cannot invoke terminal built-ins itself). An auto-launched subagent has no terminal, so
  it gets no reminder. Temporary - drop this bullet when new sessions reach the phone on their
  own; the memory `remote-control-every-session` carries the exit test.
- **`<tool>` is whichever tool will run it** - `claude/…` or `codex/…`. Never hardcode one.
  **Codex is not an autonomous wave peer**: it has no watch loop and no auto-launch path, so a
  `codex/` row is always user-started (or reached via the rescue workflow from inside a Claude
  session) - never a follow-on, a continuation, or a cohort row. That asymmetry is deliberate; do
  not build a parallel Codex loop to remove it.
- **GOAL is a DEFINITION OF DONE, and the session self-checks against it before the handoff.**
  Write GOAL as a claim a reader could test by observation - never "improve X". Before writing the
  handoff, the session checks every claim it is about to make against the evidence it actually
  holds: a number against the measurement it came from, "works" against a run that showed it
  working. Anything it cannot back is written as UNVERIFIED, never rounded up to done - a wave
  whose handoffs overclaim costs the owner a morning of re-checking. A green build alone is never
  "done" for observable work (root `AGENTS.md`, verification rules 1 and 7).
- **WHY says what breaks if this is not done**, where GOAL says what will be true. It exists so
  the receiving session can TEST the assignment instead of obeying it.
- **THE WHY MUST BE TRUE, and function outranks cosmetics.** A session that senses a cosmetic why
  behind a functional cost says so instead of complying. When the asked change would break
  something that works, keep the function, do the rest, and put the tension in the handoff.
  Evidence: `incidents.md` "the vanity rename".
- **WHY is a TARGET, not a route.** The steps in DO are the planner's best route to the WHY - not
  the assignment itself. A session that sees a better route to the same WHY builds it when it fits
  inside its `TOUCHES` set and says so in the handoff; when the better route would change scope,
  it does the asked work and makes the case in the handoff instead. Before step 1, every session
  asks once: do these steps serve the WHY, or only the letter of the ask? A faster horse built
  perfectly to the letter is a failed assignment.
  **The prompt's FACTS get the same treatment: the repo outranks the plan.** A named file that
  does not do what its row says is wrong, never authoritative - the session finds the real one,
  does the work against it, and names both in its handoff, so the planner's error is visible
  rather than absorbed.
- **READ points, it never summarizes.** Name the files; the session reads them at current HEAD.
- **TRAPS carries only what exists nowhere but a chat.** A trap already in a repo file gets a
  pointer. Reprinting an area contract is how these get fat.
- **DO is verifiable steps**, not a topic list. Reproduce-before-fixing for any bug.
- **A starting prompt is a MULTI-STEP ASSIGNMENT, and should be big.** Not one task - a numbered
  run of them, each finishing before the next begins, each committed once it is verified, all on
  the one branch, and the whole thing queued at the end. Three or four related steps in one
  session beats three sessions: it costs one branch, one gate and one landing instead of three,
  and the second step gets the first one's context for free. The bound is the wave's, not the
  session's: everything in the prompt must belong to the same `TOUCHES` set.
- **Say where a long session may stop.** Name which steps are the core and which are the tail, so
  a session running short commits and queues the core rather than queueing nothing. A prompt with
  six steps and no stated core is a prompt that lands nothing when step four goes wrong.
- **GATE is `npm run build` plus CI**, because the per-change suite belongs to CI, not the laptop
  - add a local browser job only for the work from section 2 that CI cannot do.
- **QUEUE is mandatory on every prompt and is the last thing in it**, because the session running
  it may never see this file. Landing is serialized, not permissioned: a finished session queues
  itself, and the machine-wide queue lands it - gated on CI, one branch at a time, pushing when it
  wins (`.agent-workflows/queue-merge.md`). The handoff FILE is written first and `/queue-merge`
  second, so the handoff is inside what lands.
- **Say what to do with unfinished work, once, in QUEUE**: commit and queue only what stands on
  its own and is green; leave the rest uncommitted and describe it in the handoff file. A session
  must never queue a branch it has not gated just to get it landed before morning.
- **/check runs in EVERY wave session, day or night.** Every wave prompt's QUEUE step runs the
  check workflow (review, simplify, verify) on its branch before queueing. The one carve-out stays
  honest rather than silent: a session out of time queues without it and its handoff says
  `check: not run`. The second-opinion workflow (`so`) is for big calls: an independent read of a
  plan or verdict before it becomes expensive - and it runs in a fresh session by design, so a
  wave session can never get one on its own work; plan it as its own row.
- **Queue ONCE, at the true end.** Queueing pins the branch's commit, so a session that queues,
  then commits more, then queues again turns every earlier job into a stale-pin refusal. Batch the
  commits; the last action of the session is the one queue call.
- **Landing friction is a first-class defect.** The owner's measure of a good wave is hours spent
  building versus hours spent shepherding merges. Section 7 reports refusals and re-queues as
  vitals, and every recurring refusal kind becomes a mechanism fix, never a habit.
- **A finished session leaves nothing running.** Before its last action it stops every background
  task it started - watchers, polls, queued waits - because a task nobody will ever read is not
  monitoring, it is a nine-hour confusion the owner finds in the morning. Anything a running task
  was holding goes into the handoff file first.
- **A continuation prompt printed only in chat does not exist.** The handoff FILE is the one
  channel the next orchestrator reads. Chat is for the human watching; the file is for the system.
- A row that **delegates** says so in the prompt, and says the delegating session still verifies
  the result by re-deriving it.

## The MODEL line

**Two facts in one line: the tier, and the KIND of reasoning the task rewards.** The tier decides
what the user launches the session on; the second half tells the receiving session what shape of
thinking earns its keep here - *reproduce then measure, never infer* / *adversarial verification,
default to refuted* / *mechanical transformation, the design is settled* / *design judgement,
taste is the output* / *blind-read discipline, no machine verdict near the ballot*. A tier with no
reasoning note is half a line.

**The ladder, cheapest first. `opus high` is the DEFAULT and most prompts should carry it:**

| tier | when |
| --- | --- |
| `sonnet` | really basic mechanical work - a rename, a doc edit, a list to transcribe |
| `opus low` / `opus medium` | settled work where the reasoning is bookkeeping, not judgement |
| **`opus high`** | **the default. Assume this unless there is a reason written on the line** |
| `opus xhigh` / `opus max` | one wrong judgement is expensive AND the evidence is already gathered - deciding, not exploring |
| `fable high` | HIGH-VALUE, IMPORTANT tasks only - the ones the day's direction turns on. Never for volume, never because a task looks big. `high` is its default effort too |
| `ultracode` | only when GENUINELY beneficial: a real fan-out over many independent items, or a verdict worth adversarial verification. Name what the fan-out is on the line, or it is not one. The owner is on the max plan and tokens are not the constraint: big decisions and their verification are legitimate uses; volume for its own sake still is not |

- **Justify every rung off the default, in the same line.** `opus high` needs no defence; anything
  above or below it says why in a clause. That is what stops the ladder drifting upward on reflex.
- **A tier is a floor the receiving session may RAISE, not a ceiling it may quietly lower.** Say so
  where it matters: a measurement round judged on a cheap tier to save time is how a paid
  experiment comes back with an answer nobody can use.

## Delegation and harness routing

**Delegation inside a Claude row is the DEFAULT for work that is long to do and short to specify.**
Both worker harnesses are verified working: Codex (`gpt-5.6-sol`, ChatGPT subscription) and Google
Antigravity (`agy`, `gemini-3.7-flash-high`).

**Owner ruling 2026-09-01: ROUTE BY AVAILABLE POOL CAPACITY AS WELL AS CAPABILITY**
(`docs/ORCHESTRATION_NEXT.md` §4 is the ratified detail). Antigravity carries TWO largely-unused
pools - Gemini, and a separate Claude/GPT pool (`agy models` lists both; the same wrapper reaches
both) - and suitable work prefers them over scarce native Codex capacity, which the owner spends
heavily outside NoaCG. A Codex row needs the plan-time snapshot (`npm run harness:usage`) to show
headroom - availability is three-valued (headroom / low / UNKNOWN, and unknown routes like low) -
and names a fallback pool; no wave structurally depends on Codex, and no percentage pacing target
exists in either direction. Opus is a major implementation pool as well as the master: never push
work off it merely because a cheaper model exists.

**The bound on all delegation is no longer a COUNT, it is VERIFICATION:** the delegating session
re-derives every result from scratch rather than checking the worker did as told (relaxing per
pair only on ledger evidence, `docs/ORCHESTRATION_NEXT.md` §5), and the report grades every
delegated row into the outcome ledger - what was delegated, to which harness, pool and model, did
it come back right, what it cost on that harness's own meter. `docs/HARNESS_ROUTING.md` is where
the judgement accumulates; a routing claim with no measurement behind it is an opinion. What stays
on Claude: judgement about this product, and anything that must be landed, gated or merged.

## The confirmation pass - one sweep, before the plan ships

**Every prompt is a PLAN, not a dispatch**, and a plan's facts are CHECKED, never recalled.
Starting many sessions at once never excuses a thin prompt: each one is written with plan-mode
care - the why stated so the session can test the assignment, the route reasoned rather than
guessed, the traps named. **Then ONE PASS over the finished prompts CONFIRMS every fact in them:**

- every path in a `TOUCHES` or `READ` line grepped and seen doing the thing its row is about (a
  grep with a line range, never an open);
- every command it names found where its kind lives - `package.json`, `scripts/`, or
  `.agent-workflows/` for a slash command;
- every rule it quotes copied from the file rather than from memory.

Neither a directory listing nor a plausible name is confirmation. It is a PASS not a virtue
because care is exactly what runs out at the end of a long grounding read. And the cost is not a
wasted lookup: `TOUCHES` is section 2's collision instrument, so two rows called disjoint on paths
nobody confirmed are not disjoint, they are unanalysed. A guessed path is a defective section 2
wearing the costume of a typo - **so a correction here sends the rows it touches back through
section 2 before the plan ships.**
