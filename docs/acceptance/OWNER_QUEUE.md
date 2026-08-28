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
date: 2026-08-25    # what /walk expires against
---
# Short title

What changed, in one sentence a non-technical reader follows. Route: the URL, the branch or the
exact command - under a minute to reach, or it will not get walked. What to look at: the thing
that might be wrong, not a feature summary. The commit or branch it came from.
```

- `kind: walk` - five minutes at the desk. **Expires after 7 days** as presumed seen.
- `kind: owner-action` - only the owner can do it, because a later commit cannot take it back:
  `npm publish`, anything costing money. Never expires.
- `kind: hardware` - needs a CasparCG box, an SPX server or real people. Never expires, and is
  not "unseen".
- `done: true` - kept as a record rather than deleted, for an action whose outcome matters later.

## How this list stays honest

- **An item goes in when the work lands**, with what to look at and how to reach it in under a
  minute. No item without a route.
- **An item leaves when it is walked** - `/walk` deletes the file. Git holds the history, so
  nothing is lost by removing it.
- **Feedback keeps the item open**, captured verbatim in the file, until the feedback is addressed.
- **Anything `kind: walk` sitting open past 7 days is dropped as presumed seen**, with a line
  below. The owner tests most things within a couple of days, so an old unticked item is far more
  likely a stale claim than genuinely unseen work - and a list of stale claims is what this queue
  exists to replace. If a drop was wrong, normal use will surface it and it comes back.

Nothing here is a gate. It is a to-do list with an expiry date.

## Dropped as presumed seen

When `/walk` expires an item it lands here with its date, so a wrong drop is visible rather than
silent.

- 2026-08-20-ig39-key-figures - dropped 2026-08-28, presumed seen
