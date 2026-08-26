# The landing gate picks the wrong CI run, three ways, and gives up too early

**Filed:** 2026-08-26. **Source:** two landings refused on it the same evening
(`claude/b-docs-polish`, `claude/c-credits-tickers-roll`); each fault read directly out of the
source rather than inferred.

## Why

**A refusal that is not about the tree costs a full re-verification and reads like a defect.**
Every fault below produces the same outcome for the person watching: the landing dies saying CI
was not green, when CI was fine and the gate looked at the wrong thing or stopped looking too
soon. One of them refused a real landing tonight and the session spent two attempts on it.

None of these can let a bad merge through - the preflight re-selects with `--workflow ci.yml` and
`classifyCiRun:171` blocks on any conclusion that is not `success`, which an in-flight run answers
with `null`. The cost is entirely in wasted landings and in a wrong first diagnosis. That matters
because the whole point of the queue is that landing does not need a person.

## What it would take

All four are in `scripts/auto-merge.mjs` `waitForCi` and its neighbours, so it is ONE pass.

- **The wait cannot cause what it waits for.** It polls sixty times at ten seconds, so a run has
  ten minutes to APPEAR on the commit the job just pushed. GitHub webhooks ran 28 to 40 minutes
  late on 2026-08-26. After a short grace period the wait could dispatch the run itself -
  `gh workflow run ci.yml --ref <branch>` targets the tip, which after the job's own push IS the
  sha being waited on, and a dispatch needs no webhook. **The grace period is load-bearing**:
  dispatching immediately would double every normal landing's CI cost to fix a case that only
  bites when webhooks are late, which turns the fix for congestion into the congestion.
- **The selector takes whatever ran last.** `gh run list --limit 1` with NO `--workflow` filter,
  so on a commit that also carries a deploy-verify run it can watch that one and return in
  seconds. Those runs are real on branch shas and conclude `success` even where the job-level
  `if:` skips the work. `scripts/safe-merge-preflight.mjs:454` fixed exactly this for its own
  selector, with a comment saying why; this one was missed.
- **`--limit 1` ties, and the tie breaks toward the CANCELLED run.** This is the one that actually
  refused a landing. Push and dispatch in one command chain and both runs are created in the same
  second; `ci.yml` cancels in-progress runs per ref, so the dispatch kills the push run - and the
  selector then returns the cancelled one, because a `createdAt` sort with a tie is decided
  deterministically toward the older row. **`--workflow ci.yml` does not fix this one**: both rows
  are ci.yml. The selector needs to prefer a conclusive run over a cancelled one, or break the tie
  on `databaseId`.
- **Every refusal prints the same line.** "no run appeared", "the run was cancelled" and "the run
  was red" are three different facts and one message, which is the whole reason any of this reads
  as a fault in the tree. CANCELLED is a third outcome meaning look again, never a red.

Adjacent, same file family, same pass: **preflight phase 1 counts merge-tree's log lines as
conflicted paths.** It reported "8 conflicted path(s)" for one conflicted import line, listing the
real path followed by four `Auto-merging <file>` lines. Take the lines after the OID up to the
first BLANK line - the blank is the section separator between real paths and git's informational
log - rather than `filter(Boolean)`. Harmless in itself, but it inflates the number a person reads
when deciding whether a refusal is worth chasing.

**Do it when the queue is quiet.** This is the machinery that lands everyone's work; both sessions
that hit it deliberately left it alone while three branches were queueing through it, because
fixing what lands everyone's work in order to land your own is a trade that looks rational
per-branch and is wrong from above.

## Evidence

Two runs created in the same second on one sha, the gate refusing with `run concluded "cancelled"`
and `5 job(s) look DAMAGED` while the live dispatch ran beside it:

```
32996042118  push               cancelled    ba0ce3d8  17:46:22Z   <- returned by --limit 1
32996042332  workflow_dispatch  in_progress  ba0ce3d8  17:46:22Z
```

The ten-minute bound is `for (let attempt = 0; attempt < 60; attempt += 1)` with a 10s sleep in
`waitForCi`. The selector comparison is `auto-merge.mjs` against `safe-merge-preflight.mjs:454`.
`.agent-workflows/queue-merge.md` now tells sessions not to hand-push at all, which removes the
same-second tie for anyone who follows it - but not for anyone who dispatches a pre-check.
