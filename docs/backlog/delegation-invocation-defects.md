---
v: 1
source: owner
raised: 2026-09-03
state: active
branch: claude/orchestrator-review-optimize-5800db
asked: "Fix the delegation invocation defects in the evening wave. (Paraphrase - recorded by the session that heard it, not his own words.)"
---

# Seven of eleven delegations burned a call on how WE invoked them, and nothing refuses a bad invocation

**Filed:** 2026-09-03. **Source:** owner ask, on the measurement landed by `claude/h-first-pass-truth`
(commits `45ab7acf`..`a8541ded`).

## Why

Eleven rows are on the delegation ledger. **Seven of them burned at least one call on our own spec
or invocation, and three produced nothing at all.** That is the largest single source of wasted
delegation on the record, and none of it is the workers' fault. Every one of the seven is a shape we
could have caught before spending anything.

It costs more than the calls, though the calls are real: a run whose tools are all auto-denied still
spends about 18 K input tokens, and one `--print-timeout` overrun here cost 202 K input and 1.56 M
cache reads for an empty string.

**The larger half is that it blocks routing from improving at all.** The criteria for changing
routing doctrine, written on that branch, require a separate reading of the seven-in-eleven rate
after the known causes are fixed. Until a prompt defect is rare, every pool's numbers understate its
real quality by an unknown amount, and **the understatement is not uniform**: the two pools with the
most invocation failures are the two we have used least, so they are exactly the pools whose prompts
we know least well. We are measuring our own inexperience and filing it as their scores.

Fixing this is therefore a prerequisite for the routing evidence, not a tidy-up beside it.

## The five shapes, and what would catch each

Each row below is a measured failure, not a hypothesis. `agy` is the whole sample: all five happened
at Antigravity's door, so `scripts/agy-run.mjs` is where every mechanism below belongs. Five shapes
produce six mechanisms, because shape 3 splits into a grant check and a prompt check that are not
the same size. Each section ends with its own sizing; "What it would take" collects them.

### 1. A writing task launched read-only

Two `reclaim.mjs` draft attempts on `agy-claude-gpt` / `sonnet-4-6` produced nothing usable: the
first returned a plan, the second narration and then an empty response. Both were left in
`--read-only`, which is agy's plan mode, so nothing could be written
(`.agent-workflows/orchestrator/incidents.md`, "the null delegation").

**What will NOT work, and it is the obvious idea.** Requiring the posture to be stated explicitly
catches nothing: both calls stated it. `--read-only` was passed, and `.claude/settings.json`
allowlists only `npm run agy:read` and `npm run agy -- --write`, so a call carrying neither flag is
a shape the sanctioned doors barely produce. The refusal would fire on approximately nothing while
these two rows went through it unchanged.

**Mechanism: refuse a READ-ONLY call whose prompt declares the `write_file` tool.** That is not a
guess about intent, it is a contradiction between two arguments of the same call. The prompt
convention already requires a delegation to open by declaring its tool set
(`docs/HARNESS_ROUTING.md`), so a well-formed writing prompt names `write_file` in text the wrapper
already holds, while the plan mode it is being run under cannot use it. Anything looser - matching
write verbs in prose - is intent detection, fails test 1 of `docs/MISTAKE_TRIGGERS.md`, and can only
warn.

**Cheap, and it covers only well-formed prompts.** A writing prompt that never declares its tool
set trips shape 3 instead, which is the right place for it.

### 2. Absolute paths naming a checkout the caller is not standing in

The second `reclaim.mjs` attempt again: paths naming the main checkout rather than the worktree, on
top of the plan mode. The wrapper's header already warns that every path in the prompt must be
absolute or the run reads an unknown checkout, and session D measured `agy` reading the wrong
checkout from inside a linked worktree, returning wrong content rather than merely wrong links.

**Mechanism: refuse a prompt path that is inside the primary checkout but OUTSIDE the caller's own
worktree root.** The two halves both matter, and the naive version is wrong: **this repo's worktrees
live under `.claude/worktrees/` inside the primary checkout**, so every correct absolute worktree
path has the primary root as a prefix and a plain prefix scan would refuse every properly written
prompt. The test is containment in the caller's worktree, with the primary root only deciding which
paths are in scope to judge at all.

The wrapper already resolves the git context for `writeScopeRefusal` (`worktreeKind(cwd)` and the
branch reading beside it), so both roots are one `git rev-parse` away - note that `--git-common-dir`
returns the `.git` directory, and the checkout root is its parent. The comparison itself is pure.

**Cheap**, and it reuses machinery that is already there.

### 3. An undeclared tool set, and grants that were never there

The first attempt at `q-a1-jobrunner-ram-floor-dedup` (`agy-gemini` / `3.7-flash-high`) died to
this. So did a first call on `svg-growth-default-audit-r2`, which was a plan-mode read that needed
the `command` permission the headless mode cannot prompt for and returned an empty response
(`docs/backlog/svg-growth-default-across-exporters.md`, "The delegation that produced this").
Headless `agy` has no prompt to answer, so a tool with no allow rule is refused silently. Only
`read_file`, `command` and `write_file` are real grant actions - `list_dir`, `grep_search` and
`codebase_search` are accepted into the settings file and then dropped as invalid, which only agy's
own log ever says.

**Mechanism 3a, the grant preflight.** Refuse any run when `read_file` is absent from the grants,
refuse a `--write` run when `write_file` is absent, and warn when `command` is absent. The
asymmetry is honest rather than lazy: a run with no `read_file` grant can do nothing at all and a
write with no `write_file` grant cannot do the thing it was asked for, but whether a given prompt
needs a shell is a property of the prompt, and the `svg-growth` call is the proof that guessing it
wrong is possible in both directions.

**One limit worth writing into the implementation, not discovering in it.** The grants that count
are the EFFECTIVE list agy prints in its log, never the settings files - invalid entries are
accepted into the file and then dropped, and a headless session inherits none of the owner's
interactive approvals (`docs/HARNESS_ROUTING.md`). A preflight can only read the file, so it is a
LOWER BOUND: a grant missing from the file is certainly missing from the effective list, which makes
the refusal sound with no false refusals, and incomplete. It will not catch every case of this shape
and should not claim to.

**Mechanism 3b, the prompt-shape check: warn when the prompt declares no tool set.** A guess about
prose, so by the refuse-or-warn rule in `docs/MISTAKE_TRIGGERS.md` it warns and never refuses.

**3a is cheap and sound but partial. 3b is the fuzzy one**, and should ship only if the warning can
be written without false alarms on ordinary read questions.

### 4. `--effort` passed to a model that rejects it

Attempt 1 of `q-b-logo-fixtures-pool2-sonnet` died on
`--effort is not supported for model "claude-sonnet-4-6"`, with `status: ERROR`, 0 s and 0 tokens.
`buildAgyArgs` forwards the flag to every model regardless.

**Mechanism: refuse `--effort` for the two measured model ids, `claude-sonnet-4-6` and
`claude-opus-4-6-thinking`. Do NOT key it on the pool.** `poolForModel()` matches `/^(claude|gpt)/i`,
which puts `gpt-oss-120b-medium` in the same pool, and GPT-OSS carries its effort tier in the model
name exactly as the Gemini models do (`docs/HARNESS_ROUTING.md`). Keying on the pool would refuse a
flag on a model that has never been measured as rejecting it, which is the false refusal
`docs/MISTAKE_TRIGGERS.md` says is paid by every session on the machine.

**The cheapest of the six, and also the least valuable.** The rejection already costs nothing - it
is the one zero-cost failure any harness in this file has produced, and every other Antigravity
failure billed. This mechanism saves a round trip and a confused minute, not money. Take it because
it is two lines, not because it is urgent.

### 5. Asking for a directory walk, which headless agy auto-denies

Twice. `counting-mechanism-sweep` (`3.8-flash-high`) had every tool call auto-denied and the model
never read anything, because the question genuinely needed a traversal headless `agy` cannot do; the
first attempt at `ticker-kicker-sweep` was auto-denied the same way, and its retry then matched a
hand-derived answer on all 22 rows in 42.5 seconds. The rule already exists in prose, in
`docs/HARNESS_ROUTING.md` ("a sweep must be handed its FILES") and in
`.agent-workflows/orchestrator/routing.md` step 3.

**Mechanism: warn, never refuse, when the prompt asks for a traversal, and name the alternative -
enumerate the files, or pre-expand the list with `command`.** A prompt can mention a directory for
entirely legitimate reasons, so this fails the exactness test for a refusal.

**Not cheap, and the least valuable of the six.** The prose rule is already written in two places
and was still missed twice, which is an argument for a mechanism; but the mechanism here is a phrase
matcher, and a phrase matcher that cries wolf gets ignored faster than a doc does. Size this one
last, or leave it filed.

## What it would take

**The evening row should take shapes 1, 2, 4 and mechanism 3a.** Those four are exact refusals over
facts the wrapper already holds, they live in one file, and they are testable without spending a
call. 3b and shape 5 are prose matchers and belong in a second decision, not bundled with the four.

**Where the mechanisms belong: `scripts/agy-run.mjs`, not a contract line.** The wrapper is the one
door every `agy` call goes through and it already refuses four things on the same reasoning: a
missing `--model`, a missing `--label`, `--dangerously-skip-permissions`, and a write outside a
linked worktree, on `main` or on a detached HEAD. `docs/MISTAKE_TRIGGERS.md` is the routing rule and
it puts a mistake visible in the ARGUMENTS of one call at the tool rather than in prose that only
fires when somebody reads it. Two of these five were ALREADY written down as prose, in
`HARNESS_ROUTING.md` and in `routing.md` step 3, and were made anyway - which is the evidence that
the contract layer is the wrong layer for them.

**The test that would prove it: `scripts/harness-usage.test.mjs`**, which is where the wrapper's
pure functions are already pinned, including every branch of `writeScopeRefusal`. It runs as
`npm run test:harness-usage`. A new refusal that is not a case in that file has not been proven.
Shape 2 in particular needs a case for the path that must NOT be refused - a worktree path under the
primary root - because that is the one this file got wrong on its first pass.

**What is out of scope here.** All five were measured at `agy`'s door, so the wrapper covers the
whole sample. Whether `/rescue` and `scripts/codex-rescue.mjs` need the analogues of shapes 1 and 2
is unmeasured, and should not be assumed on this evidence.

## Acceptance condition

**A delegation whose invocation matches shape 1, 2 or 4, or whose grants are missing what shape 3a
can see, fails BEFORE a call is spent, and the failure names which shape it hit.** Not a warning in
a log: the wrapper exits non-zero with a message a session can act on, and the ledger records no
spend because none happened.

**Three shapes keep a warn-only remainder, and the condition says so rather than pretending
otherwise**: a writing prompt that declares no tool set at all (1 and 3b), a run that needed
`command` and had no grant for it (3a's `command` half), and a traversal request (5). For those the
condition is that the warning is printed before the call and names the alternative.

The second, later condition is the one the owner's ask is really for: **a re-reading of the
seven-in-eleven rate over waves run after these land.** It cannot be back-filled, and the number
means nothing until several waves have run under the fixed door.

## Evidence

- **The classification** of all eleven ledger rows, by outcome and cause, landed on
  `claude/h-first-pass-truth` (`45ab7acf`, `6754ded7`, `775e83b6`, `d14e42ab`, `a8541ded`). Totals:
  2 clean, 1 reviewed, 5 repaired, 3 unusable; eight attributable to a worker, three to our prompt.
- **The reader**: `npm run harness:usage` prints the four-way tally, an acceptance rate stated only
  over rows that are evidence about the worker, and an `ours` column counting every row a prompt
  defect touched. `scripts/delegation-outcome.mjs` is the one writer of those outcomes.
- **The two empty-response causes**, and the fact that only `read_file`, `command` and `write_file`
  are real grant actions: the header of `scripts/agy-run.mjs`, measured on this machine.
- **Which models reject `--effort` and at what cost**, the effective-grant-list rule, and the
  requirement that a sweep is handed its files: `docs/HARNESS_ROUTING.md`.
- **The prose that already said most of this and did not fire**:
  `.agent-workflows/orchestrator/routing.md` step 3, and
  `.agent-workflows/orchestrator/incidents.md` under "the null delegation".
