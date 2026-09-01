# Owner queue - what is built and not yet confirmed by a human

The one thing about shipped work that no file in the repo can know: whether the owner has actually
LOOKED at it. Git knows what landed; only a person knows whether it was any good.

**The items are not in this file.** Each one is its own file in [`owner-queue/`](owner-queue/),
named `<date>-<slug>.md`. This file holds the rules they follow and the log of what was dropped.

Run **`/walk`** to go through them in one pass. It reads that directory, takes the owner to each
thing, and records the tick or the feedback. No open `walk` item IS the confirmation that nothing
is waiting.

## Why one file per item

Every session that lands observable work adds an item, and several sessions land in one night. A
shared list means N sessions appending at the same offset, which is a git conflict - and
`auto-merge.mjs` aborts on a conflict and stops, so the branch sits unlanded until a person looks
at it. One file per session cannot collide, so the queue costs a night wave nothing.

## The shape of an item

```markdown
---
kind: walk          # walk | owner-action | hardware
date: 2026-08-25    # when it was filed, so /walk can present newest first
---
# Short title

What changed, in one sentence a non-technical reader follows. Route: the URL, the branch or the
exact command - under a minute to reach, or it will not get walked. What to look at: the thing
that might be wrong, not a feature summary. The commit or branch it came from.
```

- `kind: walk` - five minutes at the desk.
- `kind: owner-action` - only the owner can do it, because a later commit cannot take it back:
  `npm publish`, anything costing money.
- `kind: hardware` - needs a CasparCG box, an SPX server or real people, and is not "unseen".
- `done: true` - kept as a record rather than deleted, for an action whose outcome matters later.

## How this list stays honest

- **An item goes in when the work lands**, with what to look at and how to reach it in under a
  minute. No item without a route.
- **An item leaves when it is walked** - `/walk` deletes the file. Git holds the history, so
  nothing is lost by removing it.
- **Feedback keeps the item open**, captured verbatim in the file, until the feedback is addressed.
- **Nothing is dropped for being old.** An item waits until the owner walks it, however long that
  takes.

Nothing here is a gate. It is a to-do list.

## Why age no longer drops an item

Until 2026-08-30 a `kind: walk` item older than 7 days was deleted as presumed seen, on the
reasoning that the owner tests most things within a couple of days. **Owner ruling, 2026-08-30:
nothing expires - he will get to all of them** (39 open at the time).

The expiry was solving queue LENGTH by discarding the one thing this queue exists to hold: a
deleted item and a walked item look identical afterwards, so the mechanism quietly biased the
record towards "all confirmed". Length belongs to the owner to pace. He ruled the same day that a
deep queue must not hold other work back either (*"nothing should block stuff"*), so **the queue
neither blocks nor evaporates - it is a list, not a dependency, and it may grow.** Anyone
re-enabling an expiry is turning that trade back on and should have an answer better than
"presumed".

## Dropped

The log of items removed without being walked, kept so a wrong drop is visible rather than silent.
The 7-day expiry that wrote the entry below no longer exists, so nothing is added here except by
an explicit decision to drop something.

- 2026-08-20-ig39-key-figures - dropped 2026-08-28, presumed seen
- 2026-08-30-b-antigravity-write-rule - dropped 2026-08-30, ALREADY DONE. It asked the owner to
  rewrite two `write_file` rules in his Antigravity settings so headless writes would stop being
  denied; he made that change the same afternoon and it was verified working (a write inside the
  granted directory succeeds, one above it is denied). Recorded in `docs/HARNESS_ROUTING.md`. Not a
  presumption - the thing it asked for was checked and found done.
