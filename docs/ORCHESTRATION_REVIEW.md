# The orchestrator reviewed with fresh eyes - 2026-09-02

An independent read of the modular orchestrator contract (`.agent-workflows/orchestrator.md` and
its nine modules), one day after the split landed. Written by a session that did not perform the
split. Phase A below was written BEFORE the comparative study in Phase B and before any edit, and
it is not revised afterwards; later phases append to this file rather than amend it.

The two false statements that motivated this review were already known when it started: a landing
check that returns true for a branch with no commits (`night.md`, fixed by row K), and a line count
that was stale on the day it was written (`coherence.md`, fixed by row M). Both are prose restating
what a mechanism or a measurement already knows. Phase A hunts for more of that class.

## Phase A - the verdict, before anything else

### The cold-read test, from the core alone

Answered from `orchestrator.md` (170 lines) without opening a module:

| Question | Answer from the core | Verdict |
|---|---|---|
| What may the master do | plan; edit its own contract; write the wave-state file; keep its home; launch a follow-on it planned | clear (lines 13-47) |
| What may it never do | merge, push, commit, build, test, edit product code, touch another worktree | clear, and stated three times (the opening section, "No exception touches landing", and four bullets of the closing "Rules") |
| What an invocation produces | seven sections in order | clear |
| How a wave is built | fill order for capacity, one row per session, order-free, big multi-step prompts | adequate; cohorts and sizing are a module away, correctly |
| Collisions and resources | five one-line rules plus a pointer to `collisions.md` | clear |
| How workers and models are routed | **not answerable.** The word appears once, inside the routing-table row for `prompts.md` ("the model ladder, delegation and harness routing"). No rule in the core says routing is a decision the plan makes | **defect** - a plan can omit it without breaking any stated rule, which is what the 2026-09-01 night wave did (ten rows, all Opus) |
| Verification and landing | QUEUE is mandatory and last; `check` is a named specialist workflow; section 3 reports the queue's verdict words | clear |
| An unattended night | enter the watch loop after section 6; 24-hour ceiling; "everything marked *night* is mandatory" | clear as a pointer; only one thing is actually marked *night* |
| Where to go for a branch | the routing table | clear, with two weak rows (below) |

Slow counts as wrong, and two things are slow. Section numbers are used as vocabulary across the
whole system ("a section-4 pushback, a section-6 line", "section 2's collision instrument"), so a
reader inside any module has to hold the core's numbering to decode a sentence. And the closing
"Rules" section is the opening section again in different words; a reader checks whether it adds
an exception and it does not.

Two routing rows have weak triggers. `coherence.md` is reached by three unrelated events
("phasing a big project; the weekly coherence session; applying a wave's lesson to this system"),
so a session applying a lesson does not know it is the same module as project phasing.
`prompts.md` is loaded to write section 5, but the routing decision it contains is not named as a
step in the core, so nothing tells the planner that writing prompts includes choosing pools.

### The modularization, judged by path context rather than corpus size

Line counts measured today (`wc -l`): core 170; `grounding` 66, `collisions` 138, `pushback` 28,
`prompts` 188, `night` 146, `report` 51, `recovery` 82, `coherence` 91, `incidents` 173. Total
1133, against 924 before the split.

What a real run actually loads:

| Path | Files the contract itself requires | Lines |
|---|---|---|
| any plan (sections 1-6) | core + grounding + collisions + pushback + prompts, and report.md for its one-line placeholder | 590 (641 with report) |
| night wave | the above + night + report | 787 |
| night wave with one recovery and one incident lookup | + recovery + incidents | 1042 |
| a worker-routing decision | prompts (188) -> `docs/ORCHESTRATION_NEXT.md` section 4 (~60) -> `docs/HARNESS_ROUTING.md`, whose table says "read with the last two entries" (~270 of 1285 lines) | ~520 for one decision |
| a follow-on or continuation | night.md alone | 146 |
| a stale or contradictory handoff | the show-ref check in grounding, "Consuming the handoff folder" in collisions, and the consumed/spent/deferred rule in the core | ~40 relevant lines across three files |
| a landing refusal | report.md section 5, then the `queue-merge` workflow | 5 + 164, correctly specialist |

So the verdict on progressive disclosure is split. **The rare half of the system is disclosed
well**: `night`, `recovery`, `coherence` and `incidents` (492 lines, 43% of the corpus) are read
only when their branch fires, and `incidents.md` is a genuine improvement - evidence left the rules
and the rules got shorter. **The common half is not disclosed at all**: every invocation writes
sections 1-5, so `grounding`, `collisions`, `pushback` and `prompts` (420 lines) load every time.
The always-loaded context of a plan is about 590 lines, not 170. That is a 36% cut against 924,
which is real, but the modularization handoff's "82% cut" measures the core and calls it the
always-loaded context, which it is not.

Splitting the common path into four files also cost something: they cross-reference each other
(`collisions` cites `prompts`' confirmation pass, `prompts` cites section 2, `pushback` cites
`grounding` and `collisions`), and two rules live in two of them because each half thought the
other might not be loaded (the handoff classification in core and `collisions`; the confirmation
pass in `collisions` and `prompts`).

The core restates more than the two rules the handoff admits to. Counted: order-free/no WAIT, no
user step, WHY is a target, THE WHY MUST BE TRUE, multi-step assignment, every pasted task gets a
prompt, a finished session leaves nothing running, a chat-only continuation does not exist,
handoffs are consumed, one browser job, the owner queue is a record, and the four closing Rules -
each also stated in the module that owns it. The gate does not force this: a pinned marker is
satisfied anywhere across core and modules. They were kept on the reasoning that they "fire while
writing sections 1-5", but `prompts.md` is loaded to write section 5 anyway, so the copies buy
nothing and cost the core about 35 lines of its 200.

### False and cached facts, beyond the two already known

Every claim below was checked against the repository or a command run today.

1. **`incidents.md`, "the file that reached 924 lines": "gated all three properties in
   `npm run check:workflows`".** Wrong script. `check:workflows` validates GitHub Actions YAML;
   the modular gate is `check:shared-instructions`. Same class as the stale line count: written
   from memory the day the gate was built.
2. **`grounding.md`, the landing path: "`auto-merge` ... refuses any branch with NO WORKTREE -
   verify both at plan time".** False since the temporary-worktree carve-out landed
   (`scripts/auto-merge.mjs` line 245, "NO WORKTREE IS NOT A REFUSAL ANY MORE").
   `queue-merge.md` says the opposite and is right. A planner following `grounding.md` would hold
   a closed session's branch for no reason. `docs/backlog/auto-merge-needs-the-temporary-worktree.md`
   is the same fact one step staler: it asks for what already exists.
3. **The wave-state file is not what the core says it is.** Exception 3 says it holds "the wave
   table and every prompt verbatim at wave start, one heartbeat line per watch tick, nothing
   else". Both 2026-09-01 files hold candidate rows, an unplanned-row justification, corrections
   to what the owner was told, and standing rulings, and `wave-tick.mjs` writes the heartbeat
   itself. The practice is better than the rule (that free text is the only receipt of the night)
   and the rule should follow it. Worse, the file's ADDRESS is ambiguous: the day wave and the
   night wave of 2026-09-01 both used `2026-09-01-wave-plan.local.md`, in two different checkouts,
   and the plan handed to a fresh session was named `2026-09-01-night-wave.local.md`, which
   `wave-tick.mjs`'s `newestWavePlan` filter (`includes('wave-plan')`) would never find.
4. **The home is not where the state lives.** Exception 4 and `grounding.md` say every later
   command runs from `.claude/worktrees/orchestrator`. The night session that used the rebuilt
   contract ran from a branch worktree, its wave-state file and tick heartbeats went there, and
   the home sits at a commit behind `origin/main` between invocations. Not a false sentence, but
   a rule the first real run did not follow, which is the same failure as a false sentence.
5. **`night.md`, the watch loop: "the built-in `/loop` with no interval".** In both observed
   night waves the loop died: 2026-08-30 after tick 8 (about six hours dark), 2026-09-01 between
   ticks 22 and 23 (4h57m dark, the 02:18 wakeup never fired). The contract's "additive, never
   load-bearing" rule is what saved both nights, and it is right. But the assumption that a
   self-paced loop stays awake is empirically wrong half the time, and each morning reports it as
   a defect rather than the system having a fallback.
6. **`prompts.md` carries provider economics as contract text**: which Codex model the
   subscription exposes, which Antigravity model is the default, that two pools exist. True today;
   all three changed within the last four days; none of them is a judgement the master needs, and
   `docs/HARNESS_ROUTING.md` plus the ledgers are the source.
7. **`grounding.md`, "The foreground-wait guard can false-positive on a loop shape beside a queue
   read".** The matcher was rewritten to test per shell segment (`scripts/command-match.mjs`,
   `pollsQueue`) after that report; whether the exact shape still fires is untested either way.
   A contract sentence about a guard's behaviour is a cache of the guard's tests. Cite the test.
8. **`orchestrator.md` line 51: "A `*.local.md` there was written by a machine (the morning CI
   verdict)".** `docs/ROUTINES.md` lists three routines and none writes a morning CI verdict;
   `docs/ORCHESTRATION_NEXT.md` section 3 lists the verdict as already external. Whether such a
   scheduled task exists on this machine is checked in Phase C; either the sentence or the
   routines doc is wrong.

Four of the eight are the same shape as the two known ones: prose describing what a script does or
what a number was. The environment answered every one of them in under a minute.

### What improved

- Evidence separated from rules (`incidents.md`); the rules read faster and a rule-changer can
  still find the story.
- `recovery.md` is new, correct in its split on "has it landed", and safe inside the contract.
- The gate is real and was negative-tested: core over limit, orphan module, dead link.
- The routing table is an honest index of the rare half.
- The rare half (night, recovery, coherence, incidents) is only read when it fires.

### What worsened

- Total contract text grew by 209 lines, and the always-loaded path is about 590 lines, not 170.
- The core spends about 35 lines restating module rules, and its closing Rules section restates
  its own opening.
- Four common-path modules cross-reference each other and hold two rules twice.
- A routing decision runs a three-file pointer chain ending in an append-only file that asks to
  be read from the end.

### What is overcomplicated

- Section numbers as system-wide vocabulary.
- The wave-state file rule versus its practice, and its ambiguous name.
- `prompts.md` holds three different phases (writing, routing, confirming) with routing buried at
  line 146 of 188.

### What I would undo

Nothing structurally. Re-merging the files would cost churn for no context gain, and the rare half
is well placed. What I would stop is the accounting: the core is not the always-loaded context, and
gating 200 lines of core while 420 lines load beside it every time is measuring the wrong thing.
The number to gate is the common path. The number to shrink is the same.

### The one architectural sentence

The modularization is a real improvement to the rare half and an accounting change to the common
half, with four more cached facts of the known class found in one afternoon. The design is right;
the measurement and the fact discipline are not yet.

## Phase B - Pocock's skills as a second lens

Read after Phase A was written: `writing-for-agents` and its mechanics file, `wayfinder`,
`to-tickets`, `code-review`, `handoff`, `diagnosing-bugs`, `implement`, and the README's split
between user-invoked orchestration and model-invoked discipline. The question was never "how do
we copy this"; it was which of his findings about agent attention expose variance or waste here.

### Where the modules sit on his information hierarchy

His ladder is in-file step, in-file reference, disclosed reference; his disclosure test is
branching (inline what every branch needs, push behind a pointer what only some branches reach);
his other cut is by sequence, keeping later steps out of view so the current one gets its legwork.

| Module | Every branch needs it? | His verdict | Ours |
|---|---|---|---|
| `grounding`, `collisions`, `pushback`, `prompts` | yes, every plan | not disclosure by branch; but a legitimate split BY SEQUENCE - the plan is a recipe (ground, form, check, push back, write, confirm) and keeping the later steps out of view is his cure for premature completion | keep the split, stop calling it disclosure, gate the SUM as the honest always-loaded number |
| `night`, `report`, `recovery` | no - a branch | disclosed reference behind a pointer, correctly | keep |
| `coherence` | no | disclosed, but its pointer names three unrelated triggers | sharpen the pointer |
| `incidents` | no | disclosed reference; exactly his "the reason behind a choice" that a cache is allowed to hold | keep, append-only |
| provider facts in `prompts` | no | a cache of the environment (`agy models`, `harness:usage`, the ledgers) - stale by construction | move to the evidence file and the meter |

So Phase A's accounting stands and gains one nuance: the four-way split of the common path is a
sequence split, whose benefit is attention per step rather than tokens, and the total still needs
gating.

### Context pointers

Audited every row of the routing table against his three rules (front-load the leading word, one
trigger per branch, cut identity the body carries):

- `grounding` "first, before any other read" - good.
- `collisions` "writing section 2: TOUCHES overlap, scarce slots, cohorts, RAM, launch paths and
  classifier refusals, the two append-only files" - a table of contents, not a trigger; the
  trigger is "writing the collision pass". Trim.
- `prompts` "writing section 5: the prompt block, the model ladder, delegation and harness
  routing, the confirmation pass" - hides the routing decision inside a list. Routing needs its own
  row and its own leading word, because it is the step that was skipped.
- `night` - good. `report` - good. `recovery` - good.
- `coherence` "phasing a big project; the weekly coherence session; applying a wave's lesson to
  this system" - three triggers, only the second is what the module is for. The first belongs to
  `docs/PROGRAMMES.md`, which the module already says; the third is the self-improvement rule and
  belongs in the core as one sentence.
- `incidents` - good.

Chains: a routing decision walks `prompts` -> `ORCHESTRATION_NEXT` section 4 -> `HARNESS_ROUTING`
from the end. Replace with one module that states the judgement and points at the meter and the
ledger for the numbers.

### Index, not store

The core is already close to his map: destination (the push), the fill order, the seven outputs,
the routing table. What it also is, and should not be, is a second store of module rules. The
control plane reads: authority -> ground -> form the wave -> route -> supervise -> verify and land
-> report, and every rule that is not needed before its module loads leaves the core.

### Frontier and fog

Tested against the existing rules. **Frontier** ("actionable now") retires three statements of the
same triple - a row's why traces to the push or an active programme or an owner ask, its files are
free, and it waits on no human - which today appear as the fill order in the core, "waiting on the
owner disqualifies" in `night.md`, and the backlog README's drain order. Adopted, defined once in
the core, used in `night.md` for continuations. **Fog** is not adopted: `docs/PROGRAMMES.md`
already names IDEA and DESIGN states, and a synonym beside them is jargon.

### Positive rules and leading words

The authority boundary keeps its negatives; they are the hard guardrail. Elsewhere the closing
Rules section (four negatives restating the opening) goes, and "Landing authority belongs to the
queue" replaces the scattered "never merge" clauses. Section numbers as vocabulary are replaced by
the sections' names where the modules are edited anyway.

### Completion criteria

| Phase | Today | Observable definition of done after this pass |
|---|---|---|
| grounding | "then always - the cheap set" | every listed command has been run this invocation and the plan-time state is written into the wave-state file |
| collision pass | "do a deliberate pass" | every pair of rows is either disjoint in TOUCHES and MINTS or carries a ruling; `wave-plan-check` refuses a duplicate MINT |
| routing | absent | every row carries a POOL with a one-clause reason; a non-Claude pool names its fallback and its verification; `wave-plan-check` refuses a row without one |
| wave readiness | the confirmation pass, prose | `node scripts/wave-plan-check.mjs` passes on the wave-state file |
| worker completion | QUEUE last | a check stamp for the reviewed sha, a handoff file, one queue job; the Stop hook refuses a turn that ends on a wait |
| handoff draining | consumed/spent/deferred, prose | `node scripts/handoff-drain.mjs` names nothing unclassified |
| watch loop | tick, read, launch, no-op | unchanged; `wave-tick.mjs` is the criterion |
| report | nine items | nine items plus the spend and receipt lines, each from a named command |

### Sediment and no-ops

Sentence by sentence over the core: the closing Rules; "the reason is legibility, not caution";
the second half of exception 4 (why the main checkout is unsafe, already the incident and the
hook's message); "Nothing pasted is dropped silently" (a no-op given the fill order plus the
pushback rule). Over `prompts.md`: the provider facts, the Codex-is-not-a-peer paragraph (true,
but a fact about a harness, so it moves to the routing module as one line).

### Handoffs

His rule is that a handoff carries only what canonical artifacts cannot. Our wave handoffs run
7-13 KB with "what landed" narrative that git and the check stamp already hold. The template a
wave prompt asks for becomes: what is left and why; new evidence and traps that exist in no repo
file; owner action; pointers to commits, the stamp and the owner-queue item; "what landed" as one
line of commit pointers. Recovery when the session disappears is unchanged, because the why and
the pointers are what a fresh session needs and the diff is in git.

### The two-axis review

His `code-review` separates standards (built safely and well) from spec (built the right thing)
and never reranks across them. Our `check` reviews for bugs, simplifies, verifies; the spec axis is
delegated to the worker's own self-check against GOAL. Evidence of a gap, three times: the vanity
rename (spec followed to the letter, function broken), the 2026-09-02 delegation trial (every
mechanical acceptance condition passed, the one judgement field half wrong, caught only by the gate
that consumes the artifact), and row C's review on 2026-09-01 finding two false claims in a design
doc that a bug review has no reason to look for. The proportionate change is one angle added to the
review leg of `check`, not a second agent: does the diff make the GOAL true and serve the WHY, what
was asked and not built, what was built and not asked, and for a delegated artifact, has the thing
that consumes it read it.

### Bug discipline

His `diagnosing-bugs` makes the feedback loop the deliverable, with a completion criterion a reader
can test (one command that goes red). Ours is one clause, "reproduce before fixing", plus the
owner's global rule, and sessions do reproduce first (the poll, the pin-stale hook and the
`jobs.mjs` defect all opened with a reproduction). What is missing is the minimise step and the
regression seam. Recommendation, not built here: a reusable `diagnose` workflow whose definition
of done is a red-capable command, which the orchestrator names in the DO line of any bug row.
It is a specialist discipline, so it belongs beside `check` and `so`, never in the core.

### The three lessons taken

1. The environment is the source of truth and a document that restates it is a cache. Four of the
   six false facts found this week were caches.
2. Every phase ends on a completion criterion a reader can test. "Consider", "do a pass" and
   "check" are where the 2026-09-01 planner errors lived.
3. A pointer's wording, not its target, decides whether the material is reached. Routing was a
   perfect module behind a pointer that never named it.

### The three NoaCG-specific ideas kept against his design

1. **A persistent authoritative master with a written boundary.** His skills are one-session
   tools with a human at the keyboard; ours runs eight hours unattended, so the authority boundary
   and its four exceptions stay in the always-loaded core, negatives and all.
2. **Durable state outside the session.** His handoff lives in the OS temp directory; ours is the
   wave-state file, the handoff files, the job store, the ledgers and the tick log, because the
   session that planned the night is routinely dead by morning.
3. **Mechanisms before prose.** His repository is prose all the way down. Ours converts a recurring
   failure into a hook, a script or a test, and the contract only keeps the judgement.

## Phase C - the supporting workflows

`check`: one angle added (above). The stamp shape is unchanged.

`handoff`: the wave-handoff template asked for in a prompt's QUEUE line is now delta-oriented
(above). The `handoff` workflow itself already says "point, don't reprint" and needs no change.

The morning CI verdict: the core says a machine writes it into `docs/handoffs/`. The scheduled task
exists (`nightly-ci-morning-report`) and writes `ci-morning-report.local.md` into the PRIMARY
checkout's `docs/handoffs/`, which is gitignored, so the orchestrator's home never contains it.
`docs/ROUTINES.md` also omits that task and two others on this machine. Both fixed in this pass:
the grounding module names where the file actually is, and the routines doc lists what runs.

The watch loop: dead in both observed nights. The wave lands anyway by design. A dead-man tick (a
scheduled task running `wave-tick.mjs` every half hour while a fresh wave plan exists, observation
only, no authority) would keep the event log complete through a dead loop. Recommended, not built:
it is a per-machine scheduled task, and the owner installs those.
