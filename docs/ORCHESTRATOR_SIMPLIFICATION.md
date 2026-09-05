# A simpler orchestrator - the review after the 2026-09-04 night

Written 2026-09-05 from the night of 2026-09-04, the first wave that landed everything without the
owner touching the landing path. This replaces the proposal row K wrote during that night: K's
numbers were double-counted (its own review legs said so, relayed in the wave-state file), and its
main recommendation, a separate watcher session, does not survive one fact checked below. What is
kept from K is its measurement of the contract and its table of what workers overrode.

The owner's target, verbatim in spirit: start the orchestrator with almost no instructions, walk
away, and come back to useful work landed on a green `main`, with capacity refilled all night and
no question asked that the machine could have answered.

Every number below was re-derived from the job store, `landed.jsonl`, `wave-tick-events.log`, the
wave-state file, the handoffs and `npm run harness:usage -- --wave`, or from two read-only tests
run today. Where a number is K's and could not be re-derived, it says so.

## 1. The night in numbers

**Landing.** Eleven rows, eleven landed, zero refusals, zero owner interventions. Eleven merge jobs,
94.9 gate-minutes, average 8.6, fastest 2.0 (A), slowest 12.8 (C). Two waited behind another
landing and both correctly (C 6.4 min, B 16.6 min). The 24 hours before the wave had been 50 merge
jobs for 23 landings, 27 refusals, 18 with no reason recorded. Row A's landing that evening gave
every refusal a kind and the queue a recovery for three of them.

**Rows.** Launch to queued, from the tick log: 40 to 177 minutes, median 105. Codex built the
delegated half of D, L, H and reviewed J; every repair traced to our brief, none to the worker.
Antigravity: 22 calls in the wave window, 7 failed, nearly all on invocation shape; when it ran,
row I's five sweep hits were all real.

**Idle capacity.** The window ran to 07:00 local. From 02:11 local only row J was still running;
from 04:40 nothing was. Against three worker slots that is about 40 percent of the night's worker
capacity unused, and the wave-state file's own "not started" list held eight items marked "no
capacity tonight". The loop stopped because its stopping rule says a wave ends when every planned
row has landed. Nothing in the contract lets it start unplanned work.

**The loop.** 103 ticks. Landings were seen 45 to 94 minutes after they happened (F 53 min; L, C
and B 44 to 68; J 94), so J launched 56 minutes after its trigger and K 46 minutes after its
threshold. The loop paced itself at 54 to 69 minutes when nobody was talking to it.

**The master.** After deduplication, 159 requests and 43.9 M tokens, 8.3 percent of the night's
Claude tokens (K's 93 M counted every response twice). Its context was 246 K when it launched the
first row and 418 K at its last wakeup (K's transcript reading, not disputed by the audit). Nine
stray review reports arrived at the master instead of at rows K and J because the relay rule's only
channel, peer messaging, was unavailable; K queued without them, so a document landed carrying
figures its own reviewers had refuted.

**The contract.** Twelve files, 112 KB. The always-loaded core is 198 of 200 lines and the
common path 640 of 640, zero headroom. Sixty-seven commits touched the contract between
2026-08-25 and 2026-09-04, fourteen on 2026-09-03 alone. The eleven prompts were 39 KB, of which
5.3 KB was the QUEUE block, identical in every prompt and already in the agent definition.

**Two facts that shape everything below.**
- `claude auth status` says the CLI is not logged in, so the headless launch path does not exist
  on this machine. Rows are subagents of the live session and die with it. Whatever plans and
  whatever watches, one session must stay alive for the whole window and must launch the rows.
- `claude agents --json` works, answers in under a second, and lists every live session with its
  worktree. The machine can count its own free slots.

## 2. Two tests run today, read-only

**A minimal brief is enough.** A fresh worker was given row H's assignment as four lines only:
goal, why, boundaries, verification. In 80 seconds and 118 K tokens it found the real files and
functions, took every design decision H took (import one, never in silence, no batch, no
`multiple` on the input, a narrow reason clause), and noticed that the work had already landed
that night. It reported one thing the brief lacked: the branch name and a pointer to current
state. It called the goal, the why and most boundaries unnecessary, because the backlog file and
the code carried them.

**Refill from the repository alone works, and says what is missing.** A fresh planner was given the
04:40 situation and only the frontier sources. In four minutes and 133 K tokens it picked a real
unit that serves the NOW push (`growth-target-defaults-to-the-frame`, left by row P because the
wizard was held), estimated it at 75 to 90 minutes with a basis, named two runners-up and why they
lost, and listed what would make the pick mechanical: backlog front matter has no `serves`,
`size`, `touches`, `covered-by` or `needs-owner`; owner receipts read `unstarted` for five items
that have landed; `handoff-drain` reports everything unclassified outside the orchestrator home;
`e2e-affected.mjs` maps no spec to `MapSvgFieldsStep.tsx`.

## 3. The ten questions, answered

**1. What the orchestrator truly owns.** Six things, all needing a view of more than one row:
choosing and refusing work against the frontier; partitioning ownership so rows stay independent
(files, covering specs, scarce slots, the gate-lands-alone rule); routing and slot count; launching
and refilling; the escalation test (what reaches the owner); the durable record and the morning
report. It owns nothing a row can decide about itself.

**2. What workers own end to end.** Everything from the brief to a queued SHA: reproducing,
choosing the implementation and the design defaults, writing the delegation brief, verifying by
re-deriving, taking `main` in and re-verifying, running the check chain, filing what they will not
fix, writing the handoff and the owner-queue item, queueing. Last night's rows already did all of
this; four overrode a wrong premise correctly and none overrode wrongly. Add one thing they do not
do yet: consult an expert themselves. A row that hits a hard design or architecture question
launches a blocking Fable subagent with the question and the evidence, gets the answer in the same
tool result, records `DECIDED` in its handoff, and continues. Blocking calls work in launched
sessions; background ones do not, which is the whole relay problem.

**3. What can disappear.** From every prompt: the QUEUE block, the `/remote-control` line, DO
steps beyond "reproduce or measure first", CORE and TAIL, READ lists longer than the two or three
sources of the WHY. From the plan: the seven-section chat output, the per-plan classification
essay over every handoff, the per-plan reason for every unstarted receipt (last night 50 lines),
the confirmation-pass grep over every path. From the live path: grounding, collisions, pushback,
prompts and routing prose, which are planning knowledge, and `incidents.md`, which is the archive.
From the check: letter grammar and prompt grammar; keep what protects landing.

**4. What made 11 of 11 land, and is protected.** The queue exactly as it is: serial, re-integrates
`main`, re-gates the merged tree, holds an order-blocked job, re-queues a stale pin, names its
refusal kind, refuses everything onto a red `main`. Every row queueing itself, enforced by the Stop
hook. `/check` in every row, which caught B's inverted conclusion and H's medium defect. One
worktree per row, a branch renamed before its first commit. The plan-time partition: disjoint
`TOUCHES`, allocated `MINTS`, the gate row landing last, chaining where the pass was unsure. The
`main` green precondition and the ten-run history read before launch. The wave-state file written
as things happen. Agent definitions carrying model and effort. Nothing here changes.

**5. Continuous refill.** The loop becomes finish, verify, land, pick, launch, until the horizon.
The mechanism is in section 4. The horizon is measured, not a percentage: a unit may launch while
`remaining > P90(row duration for its size class) + landing latency + one integration wait`, from
the job store's own history (today: about 3 hours for a standard unit, about 90 minutes for a small
one). A row that overruns is not a failure, it lands after the owner wakes; the failure is an
unlanded conflict, which the queue's re-gate already refuses.

**6. Stopping owner questions.** Three mechanisms, one of them already landed. The owner-queue
gate refuses an `owner-action` item without `needs: account | money | identity | harness`, so a
technical question cannot be filed as his. Second, the expert consult above, so a row never has a
question it cannot put to a model. Third, the master never diagnoses a worker from a transcript
again: last night's two false "needs you" lines came from reading a stopped turn as a dead
session, and both times the row was re-invoked by its own background task within eight minutes.
The tick's live-process line is the only stall instrument; a slot is free when the process is
gone, and nothing is ever reported as blocked on the owner unless an owner-queue item with a
`needs:` key exists.

**7. Context size under control.** The common path is cut to the loop (target under 200 lines
total, from 640 plus the night module), planning knowledge moves into the planner's own load, and
`check-shared-instructions` gets a headroom rule for the orchestrator like the one AGENTS.md
chains have: fail below a byte reserve, and ratchet the ceiling down as the file shrinks so it can
never sit at its maximum again. Two gates replace prose growth: a staleness check that every
backticked path and script named in a contract exists (the shrinking-mechanism item measured this
at twenty lines of code), and the existing rule that a lesson lands as a hook, script, test or
state change, now with teeth: a contract commit that adds net lines to the common path fails unless
it deletes as many. The memory store, 98 KB against a 40 KB ceiling, is drained under its own
charter as an ordinary row.

**8. Claude, Codex and Antigravity.** Route from the outcome ledger, never from a contract's
opinion of a model. Today's ledger says: Codex GPT Sol high builds correctly from a written spec
(4 of 4 rows, every repair ours), so every row whose build can be specified before the code is
written delegates that build and the Claude row is cheap while it waits. Antigravity Gemini passes
enumerated sweeps and comprehension when the invocation shape is right, so it takes sweeps,
fixture generation and doc edits with enumerated files, and it is worth one experiment as the
second reviewer for launched rows, via a blocking call. Opus stays the live orchestrator and the
owner of anything that lands. Fable plans and consults. Sonnet takes mechanical work with a written
recipe. The Codex weekly meter, not a rule, decides how many Codex builds run at once. Model ids
and versions stay in `harness-capabilities.json` and the ledgers, and leave the contract.

**9. Parallel branches that land.** Ownership is claimed at launch and checked against reality at
every refill: a candidate's files and their covering specs (`e2e-affected.mjs`) are intersected
with what the running rows have actually changed (`worktree-activity.mjs`), not with what they
forecast. Row C changed none of its three forecast files, which is why H and I sat chained for 79
minutes on a wrong forecast. Scarce slots stay allocated up front. A gate row still lands alone.
Fewer, larger, independent units are preferred to many small ones: a row is a numbered run of
tasks in one territory, one branch, one landing.

**10. The simplest architecture.** Three parts and a subordinate planner, section 4.

## 4. The architecture, in plain language

**One live session, thin.** The orchestrator is one Opus session that stays alive for the window
and does five things: wake on an event, read the delta, fill free slots from the candidate list,
launch, record. It never edits product code, never merges, never pushes, never touches another
worktree, and never plans from scratch inside its own context. Its always-loaded contract is the
loop, the escalation test, the never-acts rule and pointers, and nothing else.

**A planner that runs as a subagent, not as a predecessor.** Planning is the expensive read: the
frontier, the receipts, the handoffs, the programme register, the backlog. Last night the master
carried all of it through 103 ticks. Instead the live session launches a planner subagent with the
window and the current state, and gets back a file: an ordered candidate list of more units than
the slots can consume, each 8 to 12 lines (goal, why with its source, boundaries as files and
specs, verification, size class, pool, needs-owner none), with the ownership partition and the
scarce slots allocated across the whole list. `wave-plan-check` validates the file. The planner's
context dies with the planner; the list stays. When the list runs low and the horizon is still
open, the live session launches the planner again with what landed and what is running. Whether
the planner is Fable or Opus is an experiment, alternated by night, measured on rows landed per
row launched and on pushback correctness. Either way there is one live authority, and it is the
session that holds the loop.

**Workers that own the unit.** A row gets its 8 to 12 lines plus the branch name and one pointer
to the source of the why. The standing posture lives in the agent definition, not in the prompt:
reproduce or measure first, decide design defaults yourself and say what you decided, consult an
expert by blocking subagent when stuck, delegate a specifiable build to Codex through the rescue
workflow and verify by re-deriving, take `main` in and re-verify from the fork point, run the check
chain, file what you will not fix, write the handoff and the owner-queue item, queue as your last
action. The hooks and the queue enforce the parts that have a tool shape.

**The queue, unchanged.** Landing authority stays where it is. The one addition is a relay file:
anything addressed to a row that arrives elsewhere is written to
`<git-common-dir>/noacg-jobs/relay/<branch>.md`, and `/queue-merge` reads that path before pinning
and refuses to pin while it holds an unread review. That is the mechanism the relay rule never had.

**The ledger.** The wave-state file stays the durable record, trimmed to what the loop and the
morning both read: the window, the candidate list, the running rows with launch time and owned
files, the landed rows, decisions taken, escalations filed. The tick appends events to it and to
the events log as now. The morning report is produced by scripts from the ledger, the job store
and the handoffs.

**The loop's wake-up is an event, not a guess.** The harness's Monitor tool runs a persistent
background command that ticks `wave-tick.mjs` every few minutes and emits only event lines, so a
landing wakes the session within minutes instead of an hour, and a quiet night costs one line per
tick and no model turn at all. Subagent completions wake it as they already do. The self-paced loop
with its 20 to 40 minute guidance goes; the dead-man tick that `incidents.md` has proposed twice
is this same command.

## 5. What changes, concretely, and in what order

Four coherent changes. Each is one branch, each is measured against last night, and the landing
path is not in any of them.

1. **The refilling, event-driven loop.** `night.md` shrinks to the loop above; the stopping rule
   becomes the horizon; a `horizon` script reads row durations from the job store; a
   `collision-check` script intersects a candidate's files and covering specs with the running
   rows' real diffs; the Monitor command replaces `/loop`. Metrics: landing-seen lag (last night 45
   to 94 min), idle slot-hours (about 40 percent), time of last launch against the window end.
2. **Briefs, and the worker posture.** The prompt format becomes the 8 to 12 lines; the agent
   definitions carry the posture, including the expert consult and the Codex-by-default build;
   the relay file lands with its `/queue-merge` check. Metrics per row: landed or not, review
   findings, tokens, whether the handoff shows the same override behaviour as C, B, H and F.
3. **The planner as a subagent, and the thin common path.** The planning modules become the
   planner's load; the live path is cut to under 200 lines; `check-shared-instructions` gets the
   orchestrator headroom rule, the ratchet and the staleness check; the receipts advance when a
   branch lands (`/queue-merge` asks which receipt the branch serves, the item row F filed) so the
   frontier the planner reads is true. Fable and Opus alternate as planner. Metrics: master
   context at last wakeup (418 K), master tokens (43.9 M), candidate list quality.
4. **Structured frontier.** Backlog and handoff front matter gain `serves`, `size`, `touches`,
   `covered-by`, `needs-owner`, filled by the row that writes the item, so the planner's pick and
   the collision check become script output the model confirms rather than prose it derives.
   `handoff-drain` reads the ledger from the orchestrator home wherever it runs. Metric: the
   refill test in section 2 answered by a script with the same pick.

Each change deletes at least as many contract lines as it adds. What is not adopted: a separate
watcher session (rows would die with the planner and somebody would have to start the watcher,
which the owner ruled out), any daily token budget or pacing, a second scene of doctrine in a new
module, and any model name in a rule.

## 6. What the outside systems have learned that applies

Read for how they divide responsibility and keep context small, not for their features.

- **pstack (Cursor).** One agent definition carries the discipline and every subagent is launched
  as that agent, so no per-task prompt restates it. Playbook steps are copied into the task list
  verbatim so skipping one is visible. "Summaries in the main thread, not raw payloads" is their
  rule for the main context, and "verify against the real artifact, not a proxy" is ours already.
  Its bias toward deletion and the smallest change is the right instinct for our contract.
- **Matt Pocock's skills.** Small, composable, and split between what the human decides once up
  front (the grilling) and what the agent does on its own afterwards (TDD, debugging, review).
  Alignment happens once, then the agent owns the work. Our owner has already made that split with
  his rulings; the contract has not caught up.
- **Everything Claude Code.** "Optimize the context window, persist everything else", and an
  explicit warning that the collection has grown large enough to misconfigure itself, with hook
  profiles to dial it down. It is the cautionary case: a harness can outgrow the people using it.
  Its fresh-context review is what `/check` does; its memory-with-confidence is what our memory
  charter says memory may not be.

None of the three has a serialized landing queue with refusal kinds, a plan check, or an outcome
ledger. Those are ours and they are what carried the night.

## 7. Risks

- **The horizon is wrong at first.** Eleven rows is a thin sample; the first nights should use the
  P90 with a 30 minute buffer and the report should show every overrun.
- **A thin live session loses the replan.** Last night the master read C's diff and released H
  and I early. In the new shape the collision check does that from the real diffs, and the
  planner subagent is re-run for judgement calls the check cannot make.
- **Workers without a route explore and land nothing.** The refuting metric is a row that, given
  the short brief, spends its window and queues nothing where the long brief would have landed.
  Half the rows keep the long brief for one night so the comparison is real.
- **The relay file is a second inbox.** It is read at exactly one moment, before the pin, by a
  script; if that read is skipped the pin is refused. Nothing else reads it.
