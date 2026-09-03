---
kind: walk
date: 2026-09-04
serves: now
---
# A line whose exporter wrote its anchor now gets the alignment work too

Branch `claude/p-alignment-across-corpus`.

## What changed

Eight of the 43 corpus files write an explicit `text-anchor` - every centre-aligned Figma export
does, and that is how a title card and most scoreboards are built. Until tonight, a file that
wrote one got **none of the sideways alignment work** from 2026-09-02: no box-measured room, no
horizontal snap, no growth from the middle. The measurement that says it plainest is
`student-illustrator-scoreboard`: the away team's name is drawn against the right of a 680-unit
plate, and its room to fill was **123 units - the width of the word "SUDET" itself**. A longer
team name had nowhere to go and went straight to the shrink rung.

Now the stated anchor is believed about the ANCHOR (which point of the line a longer value cannot
move) and the placement is still read off the drawing. Where the two agree, the line is treated
exactly as one whose anchor we worked out ourselves. Where they disagree - a centre-anchored line
composed away from its box's middle, which is ordinary use of negative space - the anchor stays
where it was drawn and the room is measured about it. **Nothing the designer placed is moved.**

## The route (under a minute)

1. `/app` -> **Import graphic** -> drop `e2e/fixtures/svg-corpus/student-illustrator-scoreboard.svg`.
2. On the mapping step, type a long name into the row labelled **SUDET** - "Kiekkoreipas Juniorit"
   is long enough.
3. Watch the away name in the live preview on the right.

**What to look at:** it fills leftwards across its own plate at the size it was drawn, instead of
shrinking the moment it passes the width of the word that was there. Then do the same on the home
team's name (drawn against the LEFT) and check it still behaves as it always did - that half was
never broken and must not have moved.

Second file, thirty seconds more: drop `figma-offset-centred-endboard.svg` and lengthen the sign
off. Both lines are centre-anchored but composed over the LEFT of a nearly full-width plate,
because the right of it is meant to stay empty. The line should grow both ways from where it was
drawn and stay off the plate's edges - it should NOT jump onto the plate's middle.

## The two calls that are yours

1. **Where a stated anchor and the drawing disagree, we keep the drawing.** A designer who
   centre-anchors a line and then composes it left of its plate gets exactly that, forever. The
   alternative reading - "they asked for centred, so centre it in the box" - is defensible and
   would move their artwork. I chose not to move artwork.
2. **How much room a centred line gets.** It is still the margin the design keeps on its tighter
   side, kept on both. On a title card drawn with generous margins that means a longer title
   wraps rather than eating into the white space the designer left. If you would rather a centred
   line be allowed to fill more of its plate before wrapping, that is a number, and it is yours.

## What is NOT fixed, and was measured tonight

On any full-frame export - which is most of what a student draws - the shape the "the panel gets
wider" control grows is the artwork's own **background rect**, so it can never widen and nothing
happens at any value. Measured on `figma-centred-title-card` and filed as
`docs/backlog/growth-target-defaults-to-the-frame.md`. It is in the wizard's mapping step, which
another session held tonight.
