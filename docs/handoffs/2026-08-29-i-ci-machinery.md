# Session I - CI stability machinery

Branch `claude/i-ci-machinery`, 2026-08-29. Six commits, `npm run build` green on
`claude/i-ci-machinery@fb7aa7a9`.

The brief was one defect class (tools resolving paths and ports from the session's directory
instead of the checkout they target) plus a classification of what actually makes CI go red.

## What is fixed

### The cwd-resolution class, at its shared root

All four reported members were reproduced first. Three are fixed in code, one is fixed by telling
the session, because it cannot be fixed anywhere else.

**The guard hook judged commands against the wrong checkout** (`scripts/hooks/guard-command.mjs`).
It read `devPort()` from its own module location and `process.cwd()` for everything else, so a
session whose own directory is the main checkout was refused four integration runs against port
5174 - the main checkout's busy port - while the port those runs would have used sat free. It now
resolves the checkout the command **targets**: the session directory from the hook event's `cwd`
field, then the command's own `cd`/`pushd`/`Set-Location` chain, then any absolute path it names
for what it runs. The port, the "is anyone else running?" exclusion and the commit guards' `git`
calls all come from that root. Resolved lazily and once - the hook runs before every shell command
and the git call costs ~50 ms, which is not worth paying on `ls`.

Proven with a before/after probe, port 5276 (this worktree's) occupied and the hook file living in
this worktree:

| Simulated event | Before | After |
|---|---|---|
| session in MAIN, command `cd`s into the worktree (5276 busy) | DENY | DENY (correct) |
| session in the WORKTREE, command `cd`s into main (5174 free) | DENY | ALLOW |
| session in MAIN, command `cd`s into the worktree and ENQUEUES | ALLOW | ALLOW |
| session in MAIN, plain command, worktree hook file (5174 free) | DENY | ALLOW |

The last row is the isolating one: the tool lives in a checkout whose port is busy, and the command
belongs to a checkout whose port is free.

**`enqueuesWork` tested only the first shell segment** (`scripts/command-match.mjs`), so an ordinary
`cd <worktree> && npm run queue -- "…"` was not recognised as queueing - the first segment is the
`cd` - and the queued payload's own pieces then read as a live Playwright run. The guard refused the
one action it exists to recommend, at the moment queueing is most obviously right. An enqueue is now
recognised in any segment, and everything from it onwards is treated as the argument it is. What the
first-segment rule was really protecting is stated directly instead: **an enqueue exempts a command
only when nothing before it already starts heavy work**, so `npx playwright test x && npm run queue`
is still a run. This also made the guard's two rules agree - mutual exclusion consulted
`enqueuesWork` and the port check did not, so a queued suite was exempt from one and refused by the
other.

**The review phase reviewed other worktrees' branches** three times on 2026-08-29.
`.agent-workflows/check.md` now requires phase 1 to run inside the worktree with absolute paths and
to record the branch and merge-base, and phase 2 to **check the review's output against that scope
before acting on any of it** - a review naming another branch is discarded whole and its findings
are reported to the session that owns them, never fixed here. The same rule is applied to a
delegated simplify pass. Both adapters (`.claude/commands/check.md`, `.agents/skills/check/`) are
thin, so this was the one place it needed saying.

**A worktree cannot get a dev server when the session sits elsewhere.** This one has no code fix:
`preview_start` serves the checkout the session sits in, which is a harness fact. Session start now
says so once, in the primary checkout, with the command that makes a worktree. It is information,
not a warning - being on `main` there is what that checkout is for.

New: `scripts/command-target.mjs` (the resolution) and `scripts/command-target.test.mjs` (6 tests),
registered in `build` and in `npm run test:command-match`. `portsFor(root)` in `scripts/dev-port.mjs`
answers for any checkout by loading that checkout's own copy rather than re-implementing the rules
against a foreign path. `docs/DEV_PORTS.md` gains the rule and the three ways it goes wrong.

### The queue and the ranking

**Retention.** 222 job files and 205 logs accumulated in the queue's first four days at ~55 jobs a
day, which reaches the 9999-id ceiling inside six months. Terminal jobs older than 14 days are now
pruned with their logs, opportunistically from `jobs.mjs`'s entry points - one directory read on
work somebody already asked for, rather than a daemon whose only job is tidying another process's
files. Ids continue from the highest on disk so a pruned id is not handed straight back to a fresh
job that old logs refer to, and the scan wraps instead of throwing. `readJobs` no longer returns
sidecar files as jobs - `last-seen.json` was reaching every consumer as an entry with no id.

**merge-order** now names the branches ahead of `main` that exist only on origin instead of omitting
them silently. They are **named, not ranked**: the landing flow needs a local branch in a worktree,
so ranking `origin/x` would recommend something nobody can act on. The asymmetry against
`jobs.mjs`'s outstanding-work list is now commented at both sites with the reason each answers
differently about the same refs.

## The CI-failure classification

Full detail in **`docs/CI_STABILITY.md`**; `docs/VERIFICATION.md` gains a pointer and the corrected
framing. 1245 runs, 2026-08-15 to 2026-08-29, 204 non-green.

| Class | Runs | On `main` | Status |
|---|---:|---:|---|
| CANCELLED-BY-PUSH | 99 | 6 | by design, emails nothing |
| REAL-REGRESSION | 55 | 34 | see below |
| MISSED-BASELINE | 17 | **0** | never reaches main; `catalog:affected` made the pre-push check a minute |
| SHARD-TIMEOUT | 12 | 9 | **already closed** - all 12 hung in `playwright install-deps`, gone once the Chromium cache landed. Never a timeout-budget problem |
| SELF-REQUESTED / CONFIG-GAP | 10 | 2 | correct - the run is the reply to a typed question |
| INFRA | 6 | 4 | re-run once, then look; includes one damaged run with no verdict |
| FLAKY-SPEC | 4 | 2 | ledger with owners, below |
| BY-DESIGN-ALARM | 1 | 1 | correct |

**The finding that reframes the owner's question.** `main` went red 40 times for **14 distinct
reasons**, and one deterministic failure - `e2e/anim-engine.spec.ts:656`, red for ~35 hours across
25 CI runs and 2 nightlies - accounts for **27 of the 40**. It was re-reported on every landing,
because `main` alone runs with `cancel-in-progress: false` and the queue kept merging onto a red
tree. The daily email is one bug reported 27 times, not 27 bugs. The other 148 non-green runs cannot
email about `main` at all: 93 are silent cancels and 52 are an author's own push.

**Flake ledger** (only entries with a re-run-green receipt on the same SHA):
`e2e/local-relay.spec.ts:330` (6, plus single failures at `:389`, `:396`, `:413` that read as one
instability), `e2e/flows.spec.ts:81` (4, all inside one 40-minute window across three branches -
re-confirm before rewriting it), `e2e/production-controls.spec.ts:262` (1). **All three specs the
brief named as suspects are cleared**: `anim-engine.spec.ts:656` is the deterministic regression
above, and `student-rehearsal.spec.ts:110` and `video-project.spec.ts:314` have zero appearances in
the window.

## Proposed gates for the night wave - NOT landed here

Each is a new or tightened gate, so each lands alone.

1. **The landing queue refuses to merge onto a red `main`.** `scripts/auto-merge.mjs` gates on the
   integrated sha but never asks whether `main` is currently green. Holding with "`main` is red on
   <spec> since <time>" would have turned 27 emails into 1 - **two thirds of the owner's CI email,
   with no test changed.** Highest leverage item in this handoff.
2. **A red-main run withholds its rolling-issue comment when the failing spec set is unchanged**,
   the way `nightly-triage.mjs` already withholds by failure-set hash.
3. **`configured-suite.yml` is missing the `github.ref == 'refs/heads/main'` guard on its issue
   steps** that `ci.yml` has. That gap is how one feature branch put seven identical comments on
   issue #38.
4. **A pre-push baseline reminder** (not a gate - a refusal would block the legitimate case where
   the baseline move IS the change) when the staged diff touches a file that owns a baseline.
5. **`scripts/`-only changes select the FULL e2e suite**, because `e2e-affected.mjs` treats them as
   core/unmapped. Defensible for `e2e-affected.mjs` and `e2e-workers.mjs`, which really can change
   how the suite runs; wrong for `jobs*.mjs` and `merge-order.mjs`, which cannot touch a spec.
   Worth a narrow mapping rule, and it is a gate change.

## The headless-effort finding (item 5, report only)

**`claude -p` does carry a reasoning-effort flag.** CLI 2.1.240:

```
--effort <level>   Effort level for the current session (low, medium, high, xhigh, max)
--model <model>    fable | opus | sonnet | full model name
```

So the orchestrator **can** auto-launch high-effort rows - `claude -p --model opus --effort high …`.
I changed no orchestrator files; the orchestrator owns its own contract, and this is input to that
decision rather than a change to it.

## What is NOT done

- The two real flakes have a ledger entry and no owner. Neither was reproduced here, deliberately:
  the brief's own trap says a spec fix without a reproduction is the recurring-breakage pattern.
- `enqueuesWork` remains a mis-typing guard, not an adversarial one. `npm run queue -- "…" &&
  playwright test x` is still exempt, because nothing here can tell that trailing half from the
  quoted payload without a quote-aware splitter.
- `targetDir` follows `cd`, `--prefix`, an absolute script path and an absolute `--config`. A
  command that changes directory some other way (a shell function, a variable) falls back to the
  session directory, which is the old behaviour rather than a wrong answer.
- The owner-queue item `2026-08-29-ci-email-is-one-bug-27-times.md` asks for a GitHub notification
  decision. Note that turning Actions email off **requires** watching the repo for Issues in the
  same sitting: `gh api repos/{owner}/{repo}/subscription` is a 404 today, so the rolling red-main
  issue currently notifies nobody.

## Gates

`npm run build` green on `fb7aa7a9` (includes `check:workflows`, `check:shared-instructions` -
untouched, the wizard chain still has 25 free bytes - and the whole `node --test` battery).
`test:worktree-safety` 36/36, `test:ports` 19/19, `command-match` 24/24, `command-target` 6/6,
`jobs-store` 35/35, `merge-order` 19/19. eslint clean across `scripts/`. No product code changed:
the diff is `scripts/`, `docs/`, `.agent-workflows/` and `package.json`.
