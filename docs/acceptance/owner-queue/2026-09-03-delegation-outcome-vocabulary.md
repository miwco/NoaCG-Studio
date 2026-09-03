---
kind: agent
date: 2026-09-03
---

> **Re-kinded 2026-09-03 - a claim, not an opinion.** "The judgement I would like checked" is a
> classification of eleven ledger rows against a written vocabulary, re-derivable from the evidence
> in the ledger itself. That is a second opinion an agent gives. Nothing in it is money, direction
> or taste.
# The delegation ledger stops reading zero out of six

Added 2026-09-03, branch `claude/h-first-pass-truth`.

## What changed

You asked why the delegation ledger showed 0 first-pass across every pool including our own Opus.
The answer is that `--first-pass` was a yes/no defined nowhere, so three unrelated results collapsed
into "no" - the delegation never ran, the artifact had to be fixed, and review noticed a typo. The
third alone guaranteed a zero, because `/check` runs on every row and finding something is what it
is for.

It is now `--outcome` (clean / reviewed / repaired / unusable) plus `--cause` (worker / prompt /
capacity), defined in writing at the one script that writes the ledger. The reader states an
acceptance rate only over rows that are evidence about the worker, names what it excluded, and
calls a fraction over fewer than three rows an anecdote.

## The route, under a minute

    npm run harness:usage -- --hours 72

Look at the `DELEGATION OUTCOMES` block at the bottom.

## What to look at

- The first line now sums: tasks split into accepted, repaired, unusable and not classified.
  Nothing reads as a bare `0/6` any more.
- Ten of the eleven older lines say **not classified** rather than being back-fitted into a
  vocabulary that did not exist when they were written. The ledger is append-only and none were
  edited.
- The `ours` column, and the line naming what was excluded from the rate. Seven of the eleven
  historical rows burned a call on our own prompt or invocation - that number is the finding, and
  it is about us rather than about any pool.

## The judgement I would like checked

`docs/HARNESS_ROUTING.md` ends with the classification of all eleven rows. Two calls in it are
mine and you may disagree:

1. **The split is five to five**, not "the metric was wrong and the work was fine". Five of the ten
   scored failures were real worker defects, and one of those five is our own Opus row.
2. **My first pass at that table was too kind to us** - it excused the Opus row because it fixed its
   own defects in session, a standard I had not extended to any Antigravity row. That is why
   `repaired` now turns on whether the artifact changed rather than on who changed it.

No routing doctrine moved. The doc records what evidence a real routing change would need first.
