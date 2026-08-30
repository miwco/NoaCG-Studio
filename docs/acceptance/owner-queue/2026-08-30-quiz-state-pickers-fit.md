---
kind: walk
date: 2026-08-30
---
# The quiz's picked / right / wrong dropdowns say what they are set to

Route, under a minute: `/app` -> + New graphic -> Import graphic -> drop
`docs/svg-samples/quiz-board.svg` -> Next -> scroll to "What it does" / BEHAVIOUR.

What to look at:

1. **Every value is readable.** All twelve state dropdowns used to be narrower than their own
   contents, so `A selected (hidden)` was painted as `A selected (hidde` - cut mid-word, on a
   control whose whole job is to say which layer it is bound to. Read a few of them; nothing
   should be cut.
2. **The three columns are the same width.** They lay out as a grid now, so however many fit
   across, they are equal: three on a wide window, two at 1280 with the preview beside them,
   one on a narrow one. The version before this fixed the clipping by wrapping and left two
   pickers half-width with the third alone across the whole row - worth a glance at a couple of
   window widths to check it never reads as a broken row.
3. **The same rows in a live vote.** Drop `e2e/fixtures/svg-corpus/illustrator-live-vote-band.svg`
   instead and the bar / figure / winner row is the same layout - one change, both behaviours.

The public docs picture of this step (`/docs`, the SVG guide) was photographing the clipped
version and has been regenerated.
