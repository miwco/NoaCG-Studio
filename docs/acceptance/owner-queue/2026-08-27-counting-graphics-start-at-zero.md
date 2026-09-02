---
kind: agent
date: 2026-08-27
---
# A counting graphic played out starts at zero

**Date:** 2026-08-27 · **Branch:** `claude/counting-zero-animation`

## What changed

You played a stat card from the playout dashboard and it showed the final count, snapped to zero,
and then counted up to the number it had just been showing. That is fixed.

The cause is the order a playout server does things in. SPX, CasparCG and our own dashboard all
send the data first and take the graphic second - `update()`, then `play()`. The entrance revealed
the panel at once but did not empty the figure until the count itself began, four tenths of a
second later, so for those four tenths the real number was already on screen. The bars, the rings
and the progress lines were emptied on the first frame all along; only the FIGURES were left out
of that opening.

Every counting readout in the catalog did it - twelve of them, across ten designs: the big stats,
the election seat caps, the fundraising totals, the percentage rings. Settling a graphic never
showed it, because parking a graphic at its end draws the zero and the figure in the same frame.
Only real playback has a gap to see.

A readout now empties on the entrance's first frame, while the panel is still transparent. The
count itself starts and lands exactly where it always did - nothing about the motion moved.

## Owner walked it, 2026-08-28 - two of three right, one class member missed

Verbatim: *"Rising Total still shows the full number and then goes to zero and starts. It didn't
fix that one. The poll ring works as intended... Doors Open is just a countdown... also works
fine. This is a small issue. We can put it in the backlog... I do not know if there are some
other graphics that also have this same bug left."* Routed to
`docs/backlog/counting-playout-remnants.md`: fix Rising Total's mechanism, and extend the
played-path sweep so it discovers counts the data-target scan misses. Item stays open until
Rising Total plays from zero.

## The route, in under a minute

1. Open a production's **playout dashboard** and put a stat graphic on it - any of the big-number
   designs (search **stat**, **Election** or **Fundraising** in Browse when you make one).
2. Type a figure into its Value field, so the graphic is holding real data before you take it.
3. Press **Take**. Watch the number as the panel arrives.

## What to look at

- **The number is zero the whole time the panel is fading in**, and then counts up. What you must
  NOT see is your own figure sitting there and then jumping back to zero.
- It still lands on the exact text you typed - decimals and thousands separators intact
  (`124,213`, not `124213`).
- Take it out and take it again. Same thing every time, not just the first.
- Then the same on a bar chart with figures at the bar tips (search **Election**): every cap
  should read zero as the panel arrives, not just the first one.

## Also worth a glance

The cards and thumbnails on **Home** and **Browse** still show the FINAL figure, not a zero -
that was the other half of this, fixed last night, and this change must not have undone it. A
card showing 0% again would be a regression.
