# 2026-09-02 - session M - a stale line count in the coherence cadence

Branch `claude/m-goals-line-count`, one commit. Third and last branch from the orchestrator
session that ran the 2026-09-01 night wave (after O, the modular split, and K, the follow-on
trigger). Same carve-out: this workflow's own contract.

## The defect

`.agent-workflows/orchestrator/coherence.md` argued that GOALS.md's ~200-line budget is enforced
by nothing, and evidenced it with a number: *"the file stood at 419 lines on 2026-09-01"*. The
number was already old when the prose I inherited stated it - the coherence round that cut the
file to **261 lines** merged that same morning (`e60989f6`, merged `22542a33`) - and it then
survived the split into a second day unchallenged, because I copied it forward without measuring.

The argument is unaffected: the file is over its stated budget in both readings. Only the number
was wrong.

## What changed

The passage names both readings with their dates and adds the rule the incident actually teaches:
**quote the measurement, never the number.** A line count written into prose is stale within days,
which that sentence proved by carrying 419 into 2026-09-02.

## How it was found

Not by a gate - by trying to USE the contract. Planning a possible coherence row, this session
checked the two facts behind its own section-4 line and found both wrong: no coherence session was
owed (one landed 2026-08-30), and the file was 261 lines rather than 419. The section-4 claim was
withdrawn to the owner in the same message.

This is the second time in one night that using the rebuilt contract found a false statement in it
(the first was K, containment-is-not-a-landing), and both were prose rather than mechanism. It is
the weakness K's handoff already named: the contract's size and linkage are gated by
`check-shared-instructions.mjs`, and its factual claims are not. Two instances is not yet an
argument for a mechanism, but it is worth a third data point before deciding there is nothing to
build.

## `/check` result

- **review: `inline`.** The replacement's own facts were measured rather than recalled:
  `wc -l docs/GOALS.md` = 261, and the cutting round's commit and merge dates read from
  `git log`. The 419 figure was left in place as a dated historical reading rather than deleted,
  because `docs/backlog/goals-over-its-own-budget.md` was filed against it.
- **simplify: `inline`.** One paragraph in one file.
- **verify: `inline`.** `npm run build` green, `dist/version.json` confirming it gated
  `claude/m-goals-line-count`. Modular gate still 171/200 lines, 9 modules, all linked.
  `auto-merge --dry-run`: `clear`, preflight 9/9.

## What is left

Nothing on this branch. The open question above - whether a contract's factual claims can be
gated at all - is a candidate row, not a filed one.
