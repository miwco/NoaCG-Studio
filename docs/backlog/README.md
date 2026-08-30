# docs/backlog/ - the shelf

Ideas queue here instead of jumping the line. **One file per idea**, named by a stable slug
(`copy-tells-drain.md`), so anything else in the repo can point at it and keep pointing at it.

This folder exists because a good idea arriving mid-sprint has exactly two honest destinations:
the roadmap, or a shelf. Without the shelf it takes the third one, which is derailing whatever is
in flight. Nothing here is scheduled. Nothing here is a commitment.

## What a backlog file must contain

```markdown
# <what it is, in one line>

**Filed:** <date>. **Source:** <owner ruling / handoff / measurement / build feedback>

## Why
<Why this is worth doing AT ALL. Mandatory. An item with no Why is deleted, not filed.>

## What it would take
<Rough shape. Enough that a fresh session can judge the size without re-deriving it.>

## Evidence
<Numbers, quotes, the doc that measured it. Link rather than re-argue.>
```

**`## Why` is mandatory and it is the whole point.** An idea without a stated reason cannot be
compared against anything, so it never wins a slot and never gets deleted either - it just sits
there making the folder look like work. If you cannot write the Why, the idea is not ready to be
filed.

## Graduate or die

An item leaves this folder one of two ways:

- **It graduates** into `docs/GOALS.md` "NOW" (or into a handoff that a session picks up), and the
  file is deleted in the same commit that schedules it. The backlog never holds a copy of live work.
- **It dies.** Anything that has sat here through a full push without being picked is re-read and
  either re-argued or deleted. A shelf that only accumulates is a landfill, and a landfill gets
  ignored, which costs exactly as much as never writing the idea down.

Nothing is kept for sentiment. Git remembers deleted files.

## Never cite a file that is designed to disappear

**An item here outlives `docs/handoffs/` and `docs/acceptance/owner-queue/`, both of which are
consumed on purpose** - handoffs are swept once acted on, owner-queue items are emptied by
`/walk` and expire after 7 days. An item that leans on one of those paths for a fact stops making
sense the week after it is filed, silently: the sentence still reads fine, and the thing it
promises to explain is gone. Measured 2026-08-30 - four dead citations in this folder and in
`docs/`, all of them into those two directories.

So **state the fact, then cite the durable thing**: the doc, the script, the commit, the code.
Naming a swept file as history ("filed to the owner queue on 2026-08-26 as …") is fine; making a
reader open it is not.

## Drain order

When a session asks "what should I do next", the order is:

1. **Owner feedback** - something the owner said, that is not yet true in the product.
2. **`docs/handoffs/`** - work a finished session handed over, already scoped.
3. **`docs/GOALS.md` "NOW"** - the binding roadmap of the current push.
4. **This folder.**

The backlog is LAST on purpose. It is where an idea waits for the day the first three are empty, or
for the day it becomes the answer to something above it.
