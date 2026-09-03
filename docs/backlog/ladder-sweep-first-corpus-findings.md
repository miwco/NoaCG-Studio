---
v: 1
source: measurement
raised: 2026-09-04
state: unstarted
found-by: node scripts/svg-import-sweep.mjs --ladder
---
# Five fit-ladder findings the first corpus-wide sweep produced

**Filed:** 2026-09-04, from the first runs of `svg-import-sweep.mjs --ladder` over nine corpus
files (2,928 cases). None of them is visible at the length the designer drew, on the option the
mapping step proposes, which is the only case the corpus gate walks - so each sat behind a
green build and a passing gate. Each is reproducible by naming its file, option and length.

The growth-target defect the same run found has its own file
(`growth-target-defaults-to-the-frame.md`); it is the biggest of them and belongs to the
wizard rather than to the runtime.

## 1. A centred block that SHRANK stays low, by up to 14.5 units

```
figma-centred-title-card   f1 (Title, 92 px Archivo)
4x  drifted 14.5 down its box (drawn at -0.2)
    shrink grow-x grow-xy grow-y · unbroken
```

`svgRecentre` puts a centred block back on its box's middle after the ladder settles, and it can
only do that through the first line's `dy` - so it returns early when the block is painted as
plain text rather than as marked lines. `svgPaintLines` paints a single line that neither wrapped
nor snapped as plain text on purpose, to keep a graphic that does neither byte-identical to the
artwork the designer exported.

Its own doc comment prices that at "under two units on the boards measured". On a 92 px display
face shrunk to the floor it is **14.5 units**, because the correction scales with the cap height
the shrink removed. Visible: the title sits low in its plate.

The fix is probably in `svgRecentre` rather than in `svgPaintLines` - promote the line to one
marked tspan at the moment a correction of half a unit or more is actually needed, so a block that
needs nothing still emits nothing.

## 2. The wrap rung is skipped on some lines at some lengths

```
figma-centred-title-card        f2 (Credit)     4x  shrank to 23.4 of 26.0 with room for another line
figma-offset-centred-endboard   f1 (Next time)  4x  shrank to 25.2 of 28.0 with room for another line
illustrator-owner-quiz-board-rotated  f1, f4    8x  shrank to 19.8 of 36.0 with room for another line
```

Shrink is the LAST rung (owner, 2026-08-26, re-ruled 2026-09-03) and these values had the height
for another line at the size they were shrunk to. The owner board's two are on ANSWER plates - the
fields row A's one-field sweep never typed into, which is exactly why extending the sweep across
every bound field was worth doing.

## 3. A line can spill hundreds of units out of its box on `grow-y`

```
effects-symbol-library-ticker  f0  2x  spills 771 further out of its box than the design does
                                        grow-xy grow-y · absurd
figma-duplicate-ids-scorebug   f0-f3  32x  spills 145 further out of its box than the design does
                                        grow-xy grow-y · over1 over2 over3 absurd
figma-duplicate-ids-scorebug   f0-f3  32x  1 more shapes painted outside the frame
```

Spill is measured as how far the painted block hangs out of its box BEYOND what the artwork does
at rest, so a headline drawn wider than the rule under it is not counted. 771 units is not a
rounding error - it is the block leaving the strip it was drawn in. The scorebug's two lines
travel together, which points at the growth applying to a panel while the block inside it is
measured against the panel's resting box.

## 4. A CENTRED line's room is exactly the width it was drawn at, so rung 1 never fires for it

The room rule is "the margin the design keeps on its tighter side, kept on both, spent from the
anchor". For a line sitting on its box's middle the two margins are equal, and the arithmetic
gives back the line's own width. Measured on `figma-centred-title-card`: rooms of 453, 701 and 319
units against drawn widths of 453, 702 and 319. Same for a centred line drawn OFF the middle - the
near-side margin is the binding one and the answer is the drawn width again.

So "fill the room" is a no-op for every centred line in the corpus, and the first longer value
goes straight to wrapping (or, where it cannot wrap, to shrinking). This is the shipped rule since
2026-09-02 and applies whether or not the file states its anchor - it is not something the
2026-09-04 change introduced, and it is the likeliest remaining explanation for "when I add a
longer text it gets smaller" on a centred design.

It is a TASTE call rather than a defect, which is why it is filed rather than fixed: what should a
centred line be allowed to eat into - nothing, the plate down to a small safety margin, or
something between? On the owner's queue as call 2 of
`docs/acceptance/owner-queue/2026-09-04-a-stated-anchor-is-not-an-opt-out.md`. Nothing in the repo
pins the current number, so answering it breaks no gate.

## 5. The wrap ceiling is read at rest while the height grant is capped after the sideways growth

Not from the sweep - from the code review of the branch that wrote it, and unmeasured, which is
why it is last. `growSvgLayout` now calls `svgOfferHeights()` before the grow loop (correctly: an
offer read after the sideways rules had run moved with the value). `growSvgHeights` still measures
its own cap with `svgGrowRoom(rule, el, frame, rest.dir)` AFTER those rules have run. On a
straight panel the two agree, because widening does not move a straight panel's vertical box. **On
a TILTED panel it does**: the screen bounding box grows in both axes, so the post-growth cap can
be smaller than the ceiling the block was allowed to wrap into, and the block settles at a line
count the panel is then refused the height for.

The owner's board is the tilted case and shows `spills 37 further out of its box` at 48 of its 120
cases - **the same 48 with the 2026-09-04 fixes applied and with them reverted**, so it is not one
of those four and this is the first hypothesis worth testing against it.

## How to reproduce any of them

```bash
npm run dev:worktree                      # the sweep drives this checkout's own server
node scripts/svg-import-sweep.mjs --ladder --only figma-centred-title-card
```

The table names the field, the options and the lengths. To watch one by hand, `/app` -> Import
graphic -> the named file -> set the option on the mapping step -> type a value of that length.
