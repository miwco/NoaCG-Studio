# The delegation trial - what the cheap pools can actually do

Branch `claude/q-delegation-trial`, cut from `origin/main` at `04ecfdb5`. Seven commits.
The write-up that matters is the last section of `docs/HARNESS_ROUTING.md`; this file is the
session's own receipt, including what is UNVERIFIED.

## Why this existed

The 2026-09-01 night wave sent all ten rows to Claude Opus and used the cheap pools for nothing,
against a standing rule that makes delegation the default for work that is long to do and short to
specify. Nobody could say what the pools were good FOR, so every planner took the safe road. The
owner ruled it ends with evidence. Four delegations were graded, on three real pieces of work that
landed here as by-products.

## What landed

| Commit | What | Who wrote it |
|---|---|---|
| `f796282f` | `docs/JOB_RUNNER_PLAN.md` states the free-RAM floor once, not twice | Antigravity Gemini |
| `02a4f722` | `npm run jobs` says WHY a branch is not landable instead of claiming it has no local branch | Codex |
| `ef6f6c40` | a `logo` family in the SVG import corpus - six fixtures, six shapes | both Antigravity pools |
| `dfa8e320` | three of those fixtures' fit-ladder answers corrected | this session |
| `d731c266` | the trial write-up + two routing-table rows | this session |
| the last two | the owner-queue item, and the review pass's fixes | this session |

## The two findings a future wave should act on

**1. Mechanical conditions 100%, the judgement field 50% wrong.** Both pools passed every
mechanical acceptance condition on every file - XML parse, declared aspect, no external reference,
no script, payload byte-identical, every id, JSON schema - verified here rather than taken on
trust. Each was also asked for ONE field it had to derive from `docs/SVG_AUTHORING.md`: `growth`.
Three of six were wrong, and only `e2e/import-svg-corpus.spec.ts` - the gate that CONSUMES the
artifact - caught it. **A delegated artifact is not verified until the thing that reads it has read
it.** Re-deriving the file's own properties was necessary and nowhere near sufficient.

**2. A write delegation needs its prompt to declare the tool set.** The first attempt at the
trivial doc edit died with an empty response after 31 billed seconds because it reached for a
shell. One added paragraph - "you have exactly two tools, `read_file` and `write_file`, you have NO
SHELL" - and the same task succeeded. That paragraph is quoted verbatim in `HARNESS_ROUTING.md` and
is now the required preamble.

## Facts about the machine that were not true before

- **There is no `command` grant on this machine.** `~/.gemini/antigravity-cli/settings.json` holds
  `read_file(*)` and two `write_file` directories, nothing else. The `command(grep) command(rg) ...`
  list this repo recorded on 2026-08-30 is gone.
- **A second settings source exists and grants nothing.** The agy log opens with
  `allow=18 ... from C:\Users\ahonemi\.gemini\config\config.json` and then drops all eighteen as
  invalid grant strings - they are the owner's interactive "always allow" clicks stored as full
  literal command lines. Read the EFFECTIVE list the next log line prints, never the files.
- **The second pool takes no `--effort`.** `claude-sonnet-4-6` and `claude-opus-4-6-thinking`
  refuse it. The refusal costs 0 tokens and 0 seconds - the only free failure any harness here has
  produced.

## What is UNVERIFIED, stated as such

- **Every grade is one sample.** Two pools on one task class each. The Gemini-vs-Sonnet comparison
  (Sonnet better on exporter fidelity and on flagging a wrong spec, Gemini better on the judgement
  field 2/3 against 1/3) is a single head-to-head and is NOT a ranking.
- **Neither pool was measured on work needing the repo's judgement rather than its files** - the
  "short to do, long to specify" class. All three tasks were bounded artifacts written to a spec.
- **`gpt-oss-120b-medium` and `claude-opus-4-6-thinking` were never called.** The second pool's
  grade rests on `claude-sonnet-4-6` alone.
- **Concurrency was measured only for two non-browser harnesses.** Codex and two `agy` calls ran
  beside this session with no collision. That says NOTHING about running either beside a Playwright
  suite, which is what the RAM ceiling is actually about.
- **The trial did not pay for itself.** It spent roughly as much Opus on grading as it saved by
  delegating, plus ~350 K Antigravity input tokens and one point of a Codex weekly window. A wave
  reusing the tactics does not re-pay that; the trial does not claim a saving.

## Things noticed and deliberately NOT filed

`docs/backlog/` belongs to `claude/p-orchestrator-review` right now, so these are here instead:

- **`scripts/jobs.mjs` still has one residual false diagnosis**, now named in a comment beside the
  code and in the owner-queue item. `refsAheadOfMain()` counts `origin/main..<ref>` while
  `merge-order.mjs` enumerates with `git branch --no-merged main` against LOCAL main - so a branch
  merged locally but not yet pushed is in neither `order` nor `notReady` and still prints
  "NOT RANKED - no local branch". Narrow (it is the queue's own merge-to-push window) and it wants
  its own change, because the fix is to make the two sites agree on a ref rather than to add a
  third arm.
- **`scripts/agy-run.mjs` could refuse `--effort` for a `claude-*` model up front.** It currently
  pays a round trip to learn it. The round trip is free, so this is tidiness, not a defect.
- **`logo-small-favicon` is the only ACCEPTED corpus fixture with `growth: null`**, which the gate
  skips. The fact is recorded in the fixture's own `whyThisMatters`; if the mapping step ever
  renders a fit-ladder control for a file with no rectangle, that column stays silently green.

## Safe to archive?

Yes, once the branch lands. Nothing here is mid-conversation and nothing waits on the owner. The
only thing a person still has to do is the owner-queue item, which is filed under
`docs/acceptance/owner-queue/2026-09-02-jobs-says-why-a-branch-is-not-landable.md` and takes under
a minute.
