---
kind: walk-p
date: 2026-09-05
---
# Your asks and our bugs are two lists now, and a served ask stops asking

You asked for the first half by name on 2026-09-03:

> Also distinguish between things I explicitly asked for and bugs/findings that arose while
> pursuing those asks. Those can absolutely remain work, but don't turn them into owner
> requirements retroactively.

## The route, in under a minute

From any checkout:

    node scripts/owner-receipts.mjs

**What to look at.** Two headings instead of one. The first is **Owner asks** and counts what still
stands. The second is **Findings raised while serving them**, and its line says out loud that they
are real work and never your requirement. Each finding is quoted under `found:`, not `asked:` - the
word that made a bug you mentioned in passing read like an instruction you had issued.

Three rows are in the second list today: the editor that reported a 1920x1880 canvas, the live-vote
fields that did nothing, and the studio looking identical signed in and signed out. Each is work we
still intend to do. None of them is something you asked for, and none will be quoted back at you as
though it were.

## The count changed, and the old one was wrong

It read **34 unstarted** yesterday. Eight of those were already finished - the score tracker had
landed two days earlier, with a walk waiting for you in this very folder - and six more had real
work landed against them with the ask still open.

It now reads **27 standing asks**, of which 12 are marked `advanced`: work landed, the ask still
stands, and a one-line note names the commit that landed and what is still missing. The eight
finished ones are gone from the shelf, which is how a receipt closes; `node
scripts/owner-receipts.mjs --closed` reads them back out of git if you want to see them.

## What stops it drifting again

The session that lands work is the only one that knows which ask it served, and it has always ended
by the time anyone counts. So `/queue-merge` now asks before it queues, and the landing refuses a
branch that an ask names as its own and that the branch never touches.

**Nothing here needs a decision from you.** If a row in the findings list looks to you like
something you did ask for, say which - that is the only judgement in this that is yours.
