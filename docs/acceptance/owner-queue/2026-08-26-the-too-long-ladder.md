---
kind: agent
date: 2026-08-26
---
# The too-long ladder: wider, then wrap, then smaller

Your ruling from the 2026-08-26 walk, built. Route, under a minute: `/app` -> Create -> Import
graphic -> drop `docs/svg-samples/illustrator-export.svg` -> Next.

What to look at, in order:

1. **It arrives GROWING.** "When the text is too long" now says *the panel gets wider — read from
   your artwork*. That file used to say "shrinks to fit", which is the bug you hit: HELSINKI and
   19:30 share one baseline, and that pair was vetoing growth for the three stacked lines above
   them. A pair like that now bounds those two lines and argues nothing about the rest.
2. **The list is your order.** Open the dropdown: *The panel gets wider* / *The panel gets wider,
   then the text wraps* / *The text wraps onto more lines* / *The text gets smaller*. Smaller is
   last and never first. The third option is the combination you asked for — it is one panel
   growing on both axes, so a graphic can have both without you choosing between them.
3. **Nothing outgrows the screen, and growth is symmetrical.** Type a very long name into the
   first row's Text box. The banner stops 150px from the right edge — exactly the margin the
   designer left on the left — instead of running out to a flat 4%. On this file that is 73px it
   used to take and no longer does.
4. **Nothing paints outside the panel.** Switch the dropdown to *The text gets smaller* and paste
   a 90-character name. It used to stop shrinking at the readability floor and keep painting,
   127px out across the artwork. It now squeezes the rest of the way and stays inside the banner.
   It still reports itself as too long to the operator, which is the honest half.
5. **Neighbours do not overlap.** Put a long value in the HELSINKI row. It stops short of 19:30
   now; it used to print straight through it.

Two things worth your judgement rather than mine:

- On item 3 I could not find the overshoot you described. Measured, the gap left at the banner's
  end after growing is exactly the margin the designer drew on the left — 50px on both shipped
  samples — so the text reaching "not quite the end" is the design's own symmetry, not slack. The
  only real slop was 1.4px, from a conversion that has been fixed. If what you saw was bigger than
  that, it was a different file and I need it.
- On item 2, wider-then-wrap does nothing extra on a lower third drawn hard against the bottom of
  the frame: there is no room below to wrap into, so it behaves exactly like "gets wider". That is
  correct, but it means the option is invisible there. Say if you want it hidden where it cannot
  do anything.
