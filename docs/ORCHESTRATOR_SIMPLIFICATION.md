# A smaller orchestrator control plane

A proposal, written 2026-09-05 from the 2026-09-04 night wave, on whether the orchestrator can be
substantially simpler, cheaper in context and more reliable. The owner's words that night: *"I
think we might have over-engineered it, and the orchestrator is now too heavy. It's being
counterproductive, and it's difficult to find the right instructions to read."* The wave was the
first that ran end to end without him touching the landing path, so it is the fairest sample we
have. Every number below names where it came from; the transcripts are under the launching
session's project directory, the wave-state file is in the orchestrator home, and the contract is
`.agent-workflows/orchestrator.md` plus its module directory at commit `7082f007`.

The short verdict, argued below. The instructions are not where the weight is. The master's
contract costs it about a tenth of its context; the watch loop costs it three quarters of its
tokens, and its worst errors tonight came from one wrong belief about its workers, which it wrote
into five places before anyone measured it. The split that the numbers support is not "Fable
plans, Opus runs" but "one session plans, a fresh session watches", and that is the one-variable
experiment for tomorrow night.

## The measurements

**Context, in bytes (LF-normalised, the number `check:shared-instructions` uses).**

| what | bytes | note |
| --- | --- | --- |
| core `orchestrator.md` | 15,073 | 198 of 200 lines |
| common path (core + grounding, collisions, pushback, prompts, routing) | 50,082 | 640 of 640 lines, at its ceiling; about 8,300 words |
| night additions (launch, night, report) | 25,681 | |
| incidents | 23,962 | read once tonight |
| all twelve contract files | 112,063 | |
| read by the master tonight | 99,725 | ten of twelve files; `recovery.md` and `coherence.md` never opened |
| every session's baseline (AGENTS.md, CLAUDE.md, user rules, memory index) | 37,631 | AGENTS.md is 23,073 of it |
| a worker's own path (wave-row agent, queue-merge, check, handoff) | 36,387 | read by every row, re-read on every request |

The modular split saved 12,338 bytes tonight, 11%, because a night wave routes to ten modules
anyway. The routing table is a table of contents, not a context saving. The core was read twice
and `report.md` three times, which is what "difficult to find the right instructions" looks like
in a transcript.

**Prompts.** Eleven prompts, 39,448 bytes, average 3,586 bytes and 46 lines. By field: DO 13,906
(35%), QUEUE 5,333 (14%, identical in every prompt and already in `wave-row.md`), WHY 4,593, TRAPS
3,352, READ 3,088, GOAL 1,912, GATE 1,748. The wave-state file was 64,662 bytes and 811 lines.

**Master against workers, from the transcripts' own usage fields.** The master session ran
14:04Z to 22:33Z, 339 requests, 93.1 M tokens (89.9 M cache reads, 2.7 M cache writes, 457 K
output). Its context was 246 K tokens when it launched the first row, 355 K at the second cohort,
418 K at its last wakeup. Split at the first launch, 16:30Z: planning took 121 requests and 20.7 M
tokens; watching took 218 requests and 72.2 M tokens. **Watching cost 3.5 times planning**, at an
average of about 330 K tokens of context per request, over fifteen self-scheduled wakeups.

The nine worker rows that finished or nearly finished cost 695 M tokens between them (A 72 M,
D 91 M, E 40 M, B 142 M, C 91 M, F 40 M, L 73 M, H 53 M, I 94 M), their nine delegated review
subagents another 70 M, and each row's context ended between 231 K and 438 K. The master was
10.7% of the night's Claude tokens. Its output, 457 K tokens, was more than twice what all nine
workers wrote combined (207 K), and most of that output is thinking that never persists.

**What filled the master's context.** Tool results 271 KB (Bash 254 KB across 136 calls, of
which the contract was about 100 KB and the handoffs it consumed about 60 KB), the prompts and
plan it wrote as tool inputs 219 KB, its own prose 61 KB, the owner's and the loop's messages 77
KB. The contract is roughly a tenth of the context; the plan it authored is a fifth; the rest is
reads and the harness.

**The night.** Eight branches landed through the queue (A, D, E, F, L, C, B, H), zero refusals,
zero owner interventions on the landing path, per `node scripts/night-report.mjs` and
`landed.jsonl`. Row I is still working, J and K were launched at 22:31Z. Four of eight remaining
rows drew on Codex or Antigravity; all four Codex builds came back with zero worker defects and
every repair traced to our own brief.

## The coordination failures, each verified

The brief listed five. Four hold and one is refuted by the transcripts. Three more came out of the
measurement.

**(a) Three rows stopped one command short on a monitor wait, about forty minutes each. Refuted.**
Row A's transcript ends a turn at 17:23:13Z with *"I'll wait for the monitor rather than
polling"* and is re-invoked at 17:31:02Z by a `[SYSTEM NOTIFICATION]` background-task event, its
own `run_in_background` job finishing. It ends a turn the same way at 17:33:03Z and is re-invoked
at 17:34:05Z. It queued at 17:38:29Z. Fifteen minutes from first wait to queue, of which about
nine were the CI run it was waiting for. Row C did the same at about 21:07Z and 21:11Z, was woken
in three minutes and one minute, and queued at 21:15:46Z, eight minutes after its gate went
green. Both rows were woken by the thing they said would wake them. The forty minutes was the
master's reading of a session that had been running `/check` since 16:59Z as a session that had
stalled, which is the "seven-hour hang that was not one" from `incidents.md`, again. The master's
`SendMessage` nudge at 17:24:21Z appears nowhere in A's transcript.

**(b) The master escalated twice about a row that was never blocked. Verified.** 17:25:33Z
*"Needs you"* about A, withdrawn at 17:33:00Z; 17:34:46Z *"Needs you - 'queue A', one word"*,
withdrawn at 17:39:53Z with *"you were never the blocker"*. (a) and (b) are one failure: the
master believed a stopped turn was a dead session.

**(c) H and I chained behind C on an UNSURE call, released early. Verified.** C landed at
21:35:15Z. H and I were launched at 21:12Z on C's actual diff, 78 minutes before the chain would
have released them. C's commits touched `src/templates/importedDesign/{svg,drawnState}.ts`, the
corpus spec, docs and the catalog baseline, and none of the three files its `TOUCHES` named. The
collision instrument ran on a forecast that was wrong in both directions, and J stayed chained for
a reason the pass never had (`drawnState.ts` is J's neighbourhood, not `MapSvgFieldsStep.tsx`).

**(d) Row B's first cost measurement reported the opposite conclusion. Verified.** Commit
`376fcde3` corrects `docs/CATALOG_BY_PROGRAMME.md`, `docs/TEST_SELECTION.md`, the owner-queue
item and `scripts/catalog-cost.mjs`; B's handoff says the code-review leg caught it after two of
ten pages had been read.

**(e) Row A's `sharesCheckout` bug was theoretical. Verified.** `scripts/jobs-store.mjs:409`
lowercases both sides. Over 571 job records there are 146 distinct checkouts and zero with more
than one spelling. The master measured this and spent no row on it, which is the one clear case
tonight of the master earning its place as a filter.

**(f) The loop saw landings late.** F landed 20:14:41Z, seen at tick 82, 21:07Z. L, C and B
landed 21:22Z to 21:46Z, all seen at tick 88, 22:30Z. J, whose trigger was C landing, started
56 minutes late; K started 46 minutes after its threshold was met. The self-paced loop ran at
about 25 minutes when it was talking to the owner and at 54 to 69 minutes when it was not.

**(g) The master's claim became text before it was measured.** The forty minutes is in row F's
WHY, in `scripts/stop-wait.mjs`'s header, in a backlog file, in the wave-state heartbeat and in
this row's brief. F's fix, widening the Stop hook to refuse a wait on a "monitor", was designed
against that claim. Since the hook exits 2 (`scripts/hooks/lib.mjs`, `speak`), it now blocks a
stop that tonight's transcripts show to be harmless, and the session polls in the foreground
instead. Whether that is better is unmeasured; on this evidence it costs turns and buys nothing.

**(h) Dead prompt lines.** Five prompts told a subagent with no terminal to type
`/remote-control`. Two rows' MODEL lines named `opus medium`, a rung no agent definition carries;
the master caught it before launch, which is the `launch.md` rule working and also proof that
the plan format and the launch mechanism disagree by default.

**What carried the night.** The queue, which held C behind L and re-gated B on integration
without a word from anyone. The per-row chain: every row ran `/check`, and the review leg found
five to seven real findings in every row, including B's wrong number. The wave-state file, which
fed C's finding into J's prompt and survived the loop's dark hours. The measured replan. What did
not carry it: `recovery.md` and `coherence.md` (never loaded), continuations (none launched),
task chips (none), peer messaging (no effect), and the master's diagnosis of its workers.

## 1. Keep centrally

The master keeps what needs a view of more than one row and a view of the owner's direction, and
nothing that a row can decide about itself.

- **Choosing the work and refusing work.** The frontier order, the pushback section, the
  measure-before-minting filter that dropped (e). Tonight's plan declined the catalog cluster
  correctly and said so. No row can do this.
- **Collisions and scarce slots.** The rulings ("A owns the recovery, B owns the plan", "package.json
  is minted by A", "B lands last") were all honoured and cost nothing. Keep the pass, but demote
  `TOUCHES` from an instrument to a forecast with a stated confidence, and let the queue's
  merge-order verdict be the instrument it already is: L weighed a `caution` against B itself and
  was right.
- **Routing and capacity.** Four rows to non-Claude pools, all four clean. The `Pools at plan
  time` line and the effort-rung check earned their place tonight.
- **Launching on triggers and the replan.** The one thing a live master did tonight that no
  script could: read C's diff and release H and I.
- **The durable record.** The wave-state file, heartbeat, and the morning report. Keep the
  requirement that a decision taken on the owner's behalf is written as it happens.

Evidence that would refute a "keep": a wave where the queue's own verdicts, the rows' handoffs
and `wave-tick.mjs` produced the same launches and the same pushback with nobody holding the
table. Until then the master is the only place the whole wave is visible.

## 2. Push to workers

Hypothesis A says the worker gets GOAL, WHY, BOUNDARIES and VERIFICATION, investigates, chooses,
implements, tests, fixes and returns one verified SHA. Judged against the eleven real prompts:

| row | DO followed | DO overridden or moot | what the row needed from the master |
| --- | --- | --- | --- |
| A | all five | none | the measured WHY (50 jobs, 18 with `refusal: null`), the boundary "do not make sessions wait" |
| B | 2, 3, 4 | 1 (the red was already fixed; B found `443924df` itself) | "additive only", "designated last landing" |
| C | 1 (reproduce, confirm or KILL) | 2 partly, 3 moot, hypothesis dead | the fixture path, the browser-slot trap |
| D | all | 2 redesigned (fragment key, not the query) | "do not mint a public page", the offline pin |
| E | all | none | "do not edit ci.yml, B owns it" |
| F | 1, 3, 4, 5 | 2b (three stale receipts, actually one) | nothing beyond the reproduction step |
| L | all | design decided by L | the single-header-row contract pointer |
| H | all | found a second failure the backlog missed | "reproduce first", "do not edit MapSvgFieldsStep" |

Every row followed DO as a checklist where its premise held and dropped it where it did not, and
what let them tell the difference was always the first step, reproduce or measure first. Four rows
were right to override (C, B, H, F); none overrode wrongly. So the workers already own their
implementation. What DO adds is the planner's design sketch, followed about four times in five,
and a standing discipline that belongs in `wave-row.md` as one line, not in eleven prompts.

The rows also delegated on their own terms (D, L, H wrote their own Codex briefs; the defects came
from the briefs), took `main` in and re-verified from the fork point (B, H), weighed a merge-order
caution (L), and filed what they would not fix (L, H, C). That is hypothesis A in practice, and
it worked.

**Push to the worker:** the implementation route (DO beyond its first step), the choice of shape
where the backlog argues several (B, H, L all did this), the delegation brief, the re-verification
after integration, and the merge-order judgement the queue already hands it. **Keep in the
prompt:** GOAL as a testable claim, WHY with the measurement behind it, BOUNDARIES (the files it
must not touch, the slot it must not mint, the pin it must not break), VERIFICATION (the gate, and
which CI jobs must have run), and READ as pointers. That is roughly GOAL + WHY + TRAPS + TOUCHES +
MINTS + GATE + READ, about 1,700 bytes of today's 3,600.

**Evidence against, stated plainly.** B wrote a wrong number into three documents before its own
review caught it; a worker with more ownership and a lighter check chain ships that. A reported a
theoretical bug as real; the master's cheap measurement saved a row. C's `TOUCHES` was wrong, so
a worker choosing its own implementation makes the file forecast less reliable, and the collision
pass with it. The mitigation for all three is the same: the check chain stays mandatory, the
master keeps its measure-before-minting filter, and the collision pass leans on the queue's
integration verdict rather than on the forecast. **What would refute the push:** a row that,
without a DO route, spends its window exploring and lands nothing, where the routed version of the
same row would have landed. That is the metric for the second experiment in section 8.

## 3. Move to planning

The owner's eight questions on hypothesis B, Fable plans and Opus runs, in his order.

1. **Which instructions exist only to plan a wave and could leave the always-loaded runtime path?**
   `grounding.md` (6,086), `collisions.md` (7,428), `pushback.md` (3,378), `prompts.md` (10,470),
   `routing.md` (7,647) and about two thirds of the core (the frontier, the seven sections, the
   never-module-deep rules): roughly 45 KB of the 50 KB common path. What a live master needs is
   NEVER ACTS and its four exceptions (about 3 KB), `launch.md` (6,379), `night.md` (12,666),
   `recovery.md` (5,201) and `report.md` (6,636), about 34 KB. Today the live master carries both
   halves and the incidents file.
2. **How much context could Opus stop carrying once a plan is accepted?** The instruction bytes
   are the small part, about 11 K tokens. The large part is everything the planner read to plan:
   about 60 KB of handoffs, the receipts, the worktree activity, the harness snapshot, and the
   plan it wrote twice as tool input, plus its conversation with the owner. Measured, the master
   entered the watch at 246 K tokens and never got lighter. A watch session started fresh from the
   wave-state file would begin at roughly the baseline plus `night.md` plus the file, about 50 to
   60 K tokens. At 218 watch requests that is about 12 M tokens against the 72 M spent.
3. **Would Fable decompose and route materially better than Opus?** No evidence either way, and
   tonight's planning errors were not reasoning errors. The wrong chain was a call under
   uncertainty settled by C's diff; the wrong `TOUCHES` was a forecast no model can make before
   the investigation happens; the forty minutes was a misread of a transcript. A stronger planner
   with the same information makes the same errors. Where a stronger model does pay is the
   adversarial read of a plan, and the contract already prices that as one `so` row rather than a
   whole planning session. I am that row tonight and it cost 12 M tokens so far, against 21 M for
   the Opus planning phase.
4. **How often would live Opus need to overturn the plan?** Tonight: once outright (the C chain),
   once by amendment (C's finding folded into J's prompt before J launched), once before launch
   (the `opus medium` rungs), and once by the owner (rehearsal first, then the full night). Four
   touches across eleven rows, all improvements. A plan that could not be overturned would have
   cost H and I 78 minutes and J its first defect's context.
5. **The minimum durable handoff artifact between planner and live master.** The wave-state file
   as it already exists, minus what the loop never reads. The loop needs the wave table, the
   collision rulings, every prompt for a row not yet launched, and the heartbeat. It does not need
   the handoff classifications (4 KB), the receipts section (5 KB) or the prompts of rows already
   running. About 30 KB of tonight's 65.
6. **Does that artifact stay compact enough for the split to save context?** Yes, by a wide
   margin: 65 KB is about 16 K tokens against a 246 K planner context, and a fresh session reads
   it once as a cache write rather than dragging the planner's reads through every tick.
7. **Does involving Fable add more ceremony than it saves on a normal wave?** On a day wave, yes:
   there is no loop, the owner launches the rows, and a second session would only re-ground. On a
   night wave the ceremony is the split itself, not the model; a second session must be started
   by a person or a scheduled task, because a planner's subagents die with the planner. The model
   of the planner is a separate variable and should be tested separately, if at all.
8. **What threshold separates a direct Opus run from a Fable-planned wave?** I would not draw the
   line at the model. The line that the numbers support is between a wave with a watch and a wave
   without one. Section 5 draws it.

So the thing to move to planning is not a model but a session boundary: the plan is finished when
`wave-plan-check.mjs` passes, and the planning session ends there.

## 4. Delete or disclose later

Each cut names the evidence that would refute it. A deletion earns its place only by the same or
better behaviour, and the gate `check:shared-instructions` pins 44 sentences of this contract, so
every cut below is also an edit to that list.

- **The `/remote-control` reminder line in prompts.** Dead for every subagent launch (five of
  eleven prompts tonight carried it to a session with no terminal). Refuted by: a wave whose rows
  are user-started sessions and the reminder is what got the owner's phone connected.
- **The QUEUE boilerplate in every prompt** (5,333 bytes tonight). `wave-row.md` already carries
  it and the Stop hook enforces it. Keep one line naming the handoff file. Refuted by: a row
  launched without the agent definition (a plain model launch) that skips queueing.
- **Handoff continuations** (`night.md`, the wave that feeds itself): launched once in the record
  (2026-09-03), never tonight, and the report-is-the-checkpoint rule already bounds it. Disclose
  later rather than delete: move it out of `night.md` into its own module so the loop does not
  carry it. Refuted by: a night where a landed handoff's next step was on the frontier and the
  loop could not start it.
- **The rewind rules** (`recovery.md`): never loaded tonight, never applied in four wave-state
  files, zero abandoned branches. The owner ratified the principle; the mechanics can be two
  sentences in `night.md` with the file kept for the day a rewind is actually needed. Refuted by:
  a row that came back substantially wrong and the loop patched it for three rounds.
- **Letter rules, the target row count, "stay usable all day".** No incident behind any of them.
  Refuted by: a wave re-lettered mid-night whose morning report could not be read.
- **`incidents.md` on the always-read path.** It was read once tonight, 24 KB, and no rule in it
  changed a decision. It is the archive a change to a rule consults, so it belongs behind the
  coherence session, not in a night's context. Refuted by: a night where a rule was misapplied
  because its why was not to hand.
- **The forty-minute claim and the widened Stop hook.** Disclose, do not delete: the hook's own
  backlog item already says to measure the miss rate before designing. Add the other half to the
  measurement: waits that a live background task DID wake. Refuted by: a row cut after the fix
  that ended a turn on a background task and was never re-invoked.
- **Not deleted, and I looked:** the collision rulings, the gate-lands-alone rule, the plan
  check, the receipts, the pools line, the Stop hook itself, the queue's requeue verb. Every one
  either fired tonight or has a dated incident whose shape would recur.

## 5. Operating modes

Three modes, chosen by two facts the invocation already states: is anyone awake for the whole
window, and are there start triggers.

- **Direct run.** Owner awake, up to three rows, no follow-on and no cohort. One Opus session
  plans against the cheap set, writes the prompts, launches them, and stops; each row queues
  itself and the queue lands it. No loop, no heartbeat, no wave-state file beyond the table. This
  is most days, and today the same session would sit at 250 K tokens doing nothing.
- **Normal wave.** Owner awake at start and end, four to eight rows, at most one trigger. One
  Opus session plans and launches; it may watch, but the watch is a convenience and every row
  queues itself. The morning report is `npm run night:report` plus the handoffs.
- **Watched wave (night or substantial).** Unattended window over about four hours, cohorts or
  triggers, or any gate row. Two sessions in sequence, never two at once. The PLANNER grounds,
  writes the wave-state file, passes the check, and ends; it launches nothing, because its
  subagents would die with it. The WATCHER starts fresh from the wave-state file and `night.md`,
  launches cohort one, and holds the loop at a small context. Whether the planner is Fable or Opus
  is undecided and unmeasured; the split is the point.

Two rules bind every mode. There is never a second live master: a watcher starting writes its
session id and start time into the wave-state heartbeat, and a planner that has not ended does not
launch. And the plan is a hypothesis: the watcher re-plans on evidence, records the replan, and
the morning report carries it, exactly as tonight's 21:13Z entry does.

## 6. Expected savings and where they come from

Honest first: the master was 10.7% of tonight's Claude tokens. No orchestrator change can save
more than that, and nothing here touches the 80% that the rows and their reviews cost. The
savings are real but bounded, and the bigger one is the owner's attention.

- **The watch, 72 M tonight.** A fresh watcher at about 55 K context for the same 218 requests
  is about 12 M. Saving about 60 M, two thirds of the master, about 7% of the night. This is the
  only saving large enough to see on a meter.
- **Prompt boilerplate and dead lines.** About 7 KB of 39, written once and re-read by every row
  at every request: roughly 2 K tokens times about 350 requests times nine rows, about 6 M. Small.
- **Contract bytes on the live path.** Moving the plan-only 45 KB and the 24 KB of incidents off
  the watcher's path is about 17 K tokens per request; at 218 requests that is inside the watch
  saving above, not additional to it.
- **Wall clock.** The loop's lag cost J 56 minutes and K 46 minutes tonight. A watcher whose
  only job is the loop can tick on the queue's own events (`landed.jsonl` changes, a job
  finishing) rather than on a self-chosen cadence; that is a mechanism change, not a text change,
  and it is the second-largest saving on offer.
- **Reliability.** Failures (a), (b) and (g) were one belief held by a session with too much in
  its head; a watcher that reads the tick's `waiting` line and the harness's live-process signal,
  and nothing else, has less to believe.

## 7. Risks that could regress

- **The relay.** Tonight the master carried C's finding into J's prompt before J launched. A
  watcher with a small context has to do that from C's handoff file, not from memory; the rule
  "a trigger launch re-reads the trigger's handoff" must be in `night.md` before the split, or J's
  first hour is spent rediscovering the `p-*` rename.
- **Owner conversation.** The owner talked to the planner at 16:28Z, 19:08Z and 19:17Z, and the
  planner answered from its full grounding. A watcher cannot answer "what survives if the machine
  dies" the way the planner did at 19:09Z. Either the planner stays available as a read-only
  session with no launch rights, which is not a second master, or those questions wait for the
  report.
- **Two masters.** The failure mode of the split is a planner that keeps watching after the
  watcher starts. The heartbeat line and a refusal in `wave-tick.mjs` when a second session id
  appears are the mechanism; the rule alone will not hold at 03:00.
- **Losing the filter.** If "push to workers" is read as "the master reads fewer handoffs", the
  measure-before-minting step that dropped (e) goes with it. That step is cheap and it stays.
- **The check ratchet.** 44 pinned sentences and a 640-line common-path ceiling mean the
  contract cannot shrink without editing `scripts/check-shared-instructions.mjs`; a cut that
  forgets the gate lands red, and a gate edited carelessly stops pinning anything. Every
  deletion in section 4 is a paired edit.
- **The Stop hook argues with correct waits.** After F, a row that waits on its own background
  task is refused its stop and polls in the foreground. If the A/B watcher is Opus and the rows
  are unchanged, this costs turns in the rows, not the master, and it will show as more requests
  per row. Measure it before touching it.

## 8. The smallest A/B experiment for tomorrow, one variable

**Variable: who holds the watch.** Everything else identical to tonight: same contract, same
prompt format, same plan check, same rows shape, Opus planning as now.

- **Control:** tonight, already measured. Master 93.1 M tokens, 218 watch requests at about
  330 K context, four coordination events handled (two launches on trigger, one replan, one
  relay), two false escalations, landings seen 45 to 65 minutes late.
- **Treatment, tomorrow night:** the planner grounds, writes the wave-state file, passes
  `node scripts/wave-plan-check.mjs`, and ends its session without launching. The owner starts one
  fresh session in the orchestrator home and pastes this, and nothing else:

  ```
  You are the WATCHER for tonight's wave, not its planner. Read .agent-workflows/orchestrator.md
  section "THIS SESSION NEVER ACTS" and .agent-workflows/orchestrator/night.md and launch.md;
  load recovery.md and report.md only when a row comes back wrong or the wave ends. Then read
  docs/handoffs/2026-09-05-night-wave-plan.local.md in this directory. Append a heartbeat line
  "WATCHER <session id> started <time>" to it. Launch every START-now row with the Agent tool,
  naming the agent its MODEL line maps to, then enter the loop exactly as night.md describes.
  A trigger launch re-reads the trigger row's handoff file first. Never merge, never push, never
  read a contract module the loop does not need.
  ```

- **Metrics, all from instruments that already exist:** the watcher's tokens and context per
  request from its transcript (`harness:usage --wave` and the usage fields); the lag between a
  `landed.jsonl` timestamp and the tick that saw it; the number of launches, replans and relays
  in the heartbeat; the number of `Needs you` lines that were later withdrawn; and whether the
  morning report reads the same. Success is the watcher under 20 M tokens for a comparable night
  with no coordination event lost. Failure is a lost relay or a missed trigger, and that refutes
  the split as designed rather than the idea.

**The second experiment, the night after, if the first holds:** hypothesis A on the prompts.
Half the rows get today's full prompt, half get GOAL, WHY, BOUNDARIES, VERIFICATION and READ with
DO reduced to its first step. Metric per row: tokens, review findings, whether it landed, and
whether the handoff shows the same override behaviour as tonight's C, B, H and F. It is second
because its signal is noisier, five rows an arm, and because tonight already shows the workers
overriding a wrong DO correctly, so the expected effect is small in either direction.
