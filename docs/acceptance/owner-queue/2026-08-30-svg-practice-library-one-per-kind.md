# A practice SVG for every kind of graphic

**Date:** 2026-08-30 · **Branch:** `claude/v-svg-samples`

`docs/svg-samples/` went from five files (four of them lower thirds) to twenty-three - one per
kind of graphic the catalog has, minus transitions. They are layered, named, live-text SVGs a
student can open in Illustrator and keep working on.

## The route, under a minute

1. Open the repo folder `docs/svg-samples/` and pick a file - `alert.svg`, `poll.svg`,
   `results-board.svg` and `versus.svg` are the ones that show the range fastest.
2. `/app` → **New graphic** → **Import graphic** → drop it.
3. Next through the mapping step, then Next twice to Finish.

## What to look at

- **Does the artwork look like a real graphic of that kind?** These are teaching files a student
  is meant to admire and then change, not fixtures.
- **Do the field rows read the way an operator would say them** - "Home crest", "Row 3 points",
  "Heading FI"?
- **The too-long-text answer.** `alert.svg` and `audience.svg` should arrive with growth already
  on and nobody asked; every other file should be on shrink, because its layout is the design.
- **`docs/svg-samples/README.md`** - one line per file saying which kind it stands for and what it
  teaches. Is that the list you wanted, and is `transition` right to be missing?

Measured the same day: all 23 import, bind, preview and pass the export gate, both through the
real app and through the new `node scripts/svg-samples-check.mjs`.
