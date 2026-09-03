---
v: 1
source: owner
raised: 2026-09-03
state: unstarted
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

It costs more than the calls. A run whose tools are all auto-denied still spends about 18 K input
tokens, and one `--print-timeout` overrun here cost 202 K input and 1.56 M cache reads for an empty
string. But the money is the smaller half.

**The larger half is that it blocks routing from improving at all.** The criteria for changing
routing doctrine, written on that branch, require a separate reading of the seven-in-eleven rate
after the known causes are fixed. Until a prompt defect is rare, every pool's numbers understate its
real quality by an unknown amount, and **the understatement is not uniform**: the two pools with the
most invocation failures are the two we have used least, so they are exactly the pools whose prompts
we know least well. We are measuring our own inexperience and filing it as their scores.

Fixing this is therefore a prerequisite for the routing evidence, not a tidy-up beside it.

## The five shapes, and what would catch each

Each row below is a measured failure, not a hypothesis. `agy` is the whole sample: all five happened
at Antigravity's door, so `scripts/agy-run.mjs` is where four of the five mechanisms belong.

### 1. Plan mode when the delegation had to write

Two `reclaim.mjs` draft attempts on `agy-claude-gpt` / `sonnet-4-6` returned a plan and zero usable
code. `--read-only` maps to `agy --mode plan`, and the wrapper's default posture is plan mode unless
`--write` is passed (`scripts/agy-run.mjs`, "AND ONE POSTURE"). Nothing in the call said which was
intended, so a writing task ran read-only and billed for prose.

**Mechanism: make the posture EXPLICIT at the door.** `npm run agy` refuses a call that passes
neither `--write` nor `--read-only`. `npm run agy:read` already passes `--read-only` itself, so the
readable path is unaffected and only the ambiguous one stops. This is a pure decision over
`parseArgs` output, exact, and it has no legitimate reading it would catch wrongly.

**Cheap.** One condition, one test.

### 2. Absolute paths naming the main checkout instead of the calling worktree

The second `reclaim.mjs` attempt again. The writer's own note: *"Two compounding setup errors on my
side"* - still plan mode, and paths naming the main checkout rather than the worktree. The wrapper's
header already warns that every path in the prompt must be absolute or the run reads an unknown
checkout, and session D measured `agy` reading the wrong checkout from inside a linked worktree,
returning wrong content rather than merely wrong links.

**Mechanism: scan the prompt for the PRIMARY CHECKOUT's root and refuse when the call runs from a
different worktree.** The wrapper already resolves the git context for `writeScopeRefusal`
(`worktreeKind(cwd)` and the branch reading beside it), so the primary root is one
`git rev-parse --git-common-dir` away and the comparison itself is pure. A prompt naming a checkout
the caller is not standing in is never what was meant.

**Cheap**, and it reuses machinery that is already there.

### 3. An undeclared tool set

The first attempt at `q-a1-jobrunner-ram-floor-dedup` (`agy-gemini` / `3.7-flash-high`) died to this;
so did a first call on `svg-growth-default-audit-r2`. Headless `agy` has no prompt to answer, so a
tool with no allow rule is refused silently, and the prompt must open by declaring the tool set and
saying there is no shell (`docs/HARNESS_ROUTING.md`, the "bounded artifact Antigravity WRITES"
row). Only `read_file`, `command` and `write_file` are real grant actions - `list_dir`,
`grep_search` and `codebase_search` are accepted into the settings file and then dropped as invalid,
which only agy's own log ever says.

This one splits in two, and the halves are not the same size.

**Mechanism a, the grant preflight: refuse a `--write` run when `write_file` is not granted in
`~/.gemini/antigravity-cli/settings.json`, and warn when `read_file` or `command` is missing.** That
is a file read and a set membership test. It catches the failure that reports nothing at all.

**Mechanism b, the prompt-shape check: warn when the prompt does not declare a tool set.** This one
is a guess about prose and cannot be exact, so by the refuse-or-warn rule in
`docs/MISTAKE_TRIGGERS.md` it warns and never refuses.

**Mechanism a is cheap. Mechanism b is the fuzzy one** and should ship only if the warning can be
written without false alarms on ordinary read questions.

### 4. `--effort` passed to a pool that takes none

Attempt 1 of `q-b-logo-fixtures-pool2-sonnet` was refused free, because we passed `--effort` to the
second Antigravity pool. `docs/HARNESS_ROUTING.md` states it plainly for that pool: it takes no
`--effort`, and the flag is refused before anything runs. `buildAgyArgs` forwards the flag to every
model regardless, and `poolForModel()` in the same file already knows which pool a model bills.

**Mechanism: refuse `--effort` when `poolForModel(model)` is `antigravity-claude-gpt`, naming the
pool in the message.** Both halves of the decision are already exported from that file.

**The cheapest of the five.** One condition over two existing pure functions.

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

**Not cheap, and the least valuable of the five.** The prose rule is already written in two places
and was still missed twice, which is an argument for a mechanism; but the mechanism here is a
phrase matcher, and a phrase matcher that cries wolf gets ignored faster than a doc does. Size this
one last, or leave it filed.

## What it would take

The evening row should take shapes 1, 2, 4 and mechanism 3a. Those four are exact refusals over
facts the wrapper already has, they live in one file, and they are testable without spending a
call. Shapes 3b and 5 are prose matchers and belong in a second decision, not bundled with the
cheap four.

**Where the mechanisms belong: `scripts/agy-run.mjs`, not a contract line.** The wrapper is the one
door every `agy` call goes through and it already refuses four things on the same reasoning: a
missing `--model`, a missing `--label`, `--dangerously-skip-permissions`, and a write outside a
linked worktree, on `main` or on a detached HEAD. `docs/MISTAKE_TRIGGERS.md` is the routing rule and
it puts a mistake visible in the ARGUMENTS of one call at the tool rather than in prose that only
fires when somebody reads it. Every one of these five is visible in the arguments. Two of them are
ALREADY written down as prose, in `HARNESS_ROUTING.md` and in `routing.md` step 3, and were made
anyway - which is the evidence that the contract layer is the wrong layer for them.

**The test that would prove it: `scripts/harness-usage.test.mjs`**, which is where the wrapper's
pure functions are already pinned, including every branch of `writeScopeRefusal`. It runs as
`npm run test:harness-usage`. A new refusal that is not a case in that file has not been proven.

**What is out of scope here.** All five were measured at `agy`'s door, so the wrapper covers the
whole sample. Whether `/rescue` and `scripts/codex-rescue.mjs` need the analogues of shapes 1 and 2
is unmeasured, and should not be assumed on this evidence.

## Acceptance condition

**A delegation whose invocation is wrong in any of these five ways fails BEFORE a call is spent, and
the failure names which shape it hit.** Not a warning in a log, not a note in a contract: the
wrapper exits non-zero with a message a session can act on, and the ledger records no spend because
none happened. For the two warn-only shapes the condition is weaker by design - the warning is
printed before the call, and it names the alternative.

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
- **The two empty-response causes** and the fact that only `read_file`, `command` and `write_file`
  are real grant actions: the header of `scripts/agy-run.mjs`, measured on this machine.
- **The second pool taking no `--effort`**, and the rule that a sweep is handed its files:
  `docs/HARNESS_ROUTING.md`.
- **The prose that already said most of this and did not fire**:
  `.agent-workflows/orchestrator/routing.md` step 3, and
  `.agent-workflows/orchestrator/incidents.md` under "the null delegation".
