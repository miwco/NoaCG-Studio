---
kind: agent
date: 2026-09-04
---
# A landing nobody judged puts itself back

**This is the difference between hours building and hours shepherding merges.** On the night of
2026-09-03 two landings were killed at their 45-minute cap - `claude/d-queue-walks-itself` and
`claude/f-contracts-point`, the first two to time out in 213. Both owning sessions had already
finished, and since only a branch's own session may queue it, two green branches became
unlandable. Then it spread: a branch ahead of main with no landing queued makes `merge-order`
refuse everything that collides with it, so `claude/j-fields-step-per-field` was refused outright
for touching the same files as F, and three more rows queued behind that. Four branches stuck by
one dead job.

## The route, in under a minute

1. `npm run jobs`.
2. Read the **Ahead of main** list at the bottom.

That is the whole route. What changed is what those rows can say.

## What to look at

- **A row that reads `QUEUED j-0500 (automatic retry of j-0438, which reached no verdict)`.**
  That is the new behaviour: the queue noticed a landing that nobody ever judged and put it back
  by itself, once. It names the job it revives so it never looks like another session queued your
  branch behind your back.
- **`LANDING FAILED ... - CI gave no verdict on the integrated commit - not this branch's fault`**,
  where it used to say `auto-merge refused it (exit 1)`. A refusal and the absence of a verdict are
  different facts and now read differently. Only the second is ever retried.
- **What still needs you.** A red gate, a conflict, a dirty tree, a red main - anything CI or the
  preflight actually decided - is never retried, and its row still hands you the command. That is
  the safety of the whole thing: retrying a verdict is how a queue lands work that was refused.

## The judgement I would like checked

The rule "only the owning session queues it" exists so a session declares its own work finished.
I read a retry of an already-declared landing as re-running that declaration rather than making a
second one, so it needs no session - and the retry re-runs the command verbatim, `--expect-sha`
and all, so a session that woke up and pushed gets a refusal instead of a landing. If you disagree
with that reading, the mechanism should become a prompt in the morning report instead, and it is a
one-line change to make it one.

The cap stays at 45 minutes. Over the 211 landings this queue has completed the median is 7.6
minutes, p90 is 12.3 and the slowest ever was 21.3, so raising it would have hidden the defect
behind an hour of waiting per landing rather than fixing it.
