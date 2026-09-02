# Every owner-queue item carries the front matter `/walk` reads, and a check keeps it so

**Filed:** 2026-09-02, from the 2026-09-01 night-wave plan (row I, never launched).
**Source:** a measurement - on 2026-09-02, 30 of 56 files under `docs/acceptance/owner-queue/`
have no `kind:` front matter at all.

## Why

`.agent-workflows/walk.md` step 1 reads `kind:` and `date:` to sort newest-first, filter
(`/walk hardware`) and honour `done: true`. More than half the owner's queue cannot be sorted or
filtered by the mechanism the contract describes, so the documented shape is untrue and the next
tool written against it breaks on these files. The owner's walks are the one fact about shipped
work no gate can give, and a queue that cannot be walked in order wastes the minutes he has.

## What it would take

1. Add `kind:` and `date:` to every item missing them. The date comes from the filename or the
   body - never invented. `kind:` is `walk` unless the item plainly asks the owner to DO something
   (`owner-action`) or needs hardware.
2. Leave the prose alone where it carries the date for a human reader.
3. A check that a file in that directory has both keys, wired where the other doc checks run, so
   the drift cannot return.
4. An ambiguous item is `walk`, listed in the handoff; the owner reclassifies in seconds, and a
   wrong kind is visible to him where a missing one is not.

This is the canonical delegation shape - long to do, short to specify - and the routing module says
which pool it goes to and how the result is re-derived.

## Evidence

`docs/acceptance/OWNER_QUEUE.md`, "The shape of an item"; the count above, from
`for f in docs/acceptance/owner-queue/*.md; do grep -q '^kind:' "$f" || echo "$f"; done | wc -l`.
