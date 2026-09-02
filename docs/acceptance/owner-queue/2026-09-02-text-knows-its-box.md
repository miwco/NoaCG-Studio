---
kind: walk
date: 2026-09-02
---
# Text now knows the box it lives in

The answer to your 2026-09-02 walk: *"the system has no idea how the text should behave in
relation to the graphics behind it."* Every text layer now has an alignment, read off where you
drew it, and the room it gets is the box it sits in rather than the strip below where it happens
to start.

**Route, under a minute:** `/app` -> **Import graphic** -> drop
`e2e/fixtures/svg-corpus/illustrator-owner-quiz-board-rotated.svg` -> **Next** -> type into the
question row's **Text** box. Type something short, then something very long.

**What to look at:**

1. **The question stays at the size you drew it, whatever its length.** Short, two lines or three,
   it never shrinks. Before, a long question dropped to 62 percent of the drawn size on one line.
2. **It stays centred on its plate.** Measured at all three lengths, the block is exactly on the
   plate centre horizontally, and holds the height it was composed at rather than sliding down as
   it gains lines. You drew it 41 units left of the true centre; centring now snaps it, which is
   what you ruled.
3. **The four answers do not move at all.** At any question length. The plate no longer has to grow
   to hold the question, so nothing below it is pushed.
4. **Your tilt survives.** Everything is measured in each box's own rotated frame, so the board is
   never straightened.

**What to be picky about**, since it is your taste and not a gate: whether the wrap points read
well on a three-line question, and whether the block sitting a little above the plate's exact
vertical middle (12 units, the position you drew it at) looks right to you or should also snap.

**Not built yet, deliberately:** the step does not SHOW any of this. There is no alignment control,
no box grouping, no overlay - that is steps 2 and 3 of `docs/TEXT_BOX_BINDING.md`. Nothing is
stored either: the alignment is derived from your artwork every time, so no saved graphic changed
shape. The nudge you drew is measured and kept in memory, ready for the checkbox that hands it
back, and nothing reads it yet.

Branch `claude/text-alignment-and-box-room`. Build green; 82 import specs pass; catalog emit,
render and overflow gates green.

## Owner rulings on this, 2026-09-02 evening

Given after reading the result, before walking it. Both are captured in full in
`docs/TEXT_BOX_BINDING.md` under "Owner rulings"; the short of it:

1. **A centred block should snap VERTICALLY as well as horizontally.** What shipped keeps the
   drawn vertical position. Agreed, not yet built.
2. **Block alignment and LINE alignment are two questions, and only the first is built.** When a
   block wraps, its lines are currently all centred with it. His tentative default is flush left
   with a ragged right edge, changeable to centred - recorded as tentative because the three-line
   question he saw was centred line by line and he raised no objection to the look. **Put the two
   side by side on his own board and let him pick** before changing the default.

So when this item is walked, the extra thing to look at is the WRAP: on a two- and three-line
question, do you want the lines centred on each other, or flush left under a centred block?
