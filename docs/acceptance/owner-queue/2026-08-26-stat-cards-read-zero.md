---
kind: walk
date: 2026-08-26
---
# Every counting stat card on Home reads zero

Not a change to look at - a defect to confirm, and one decision. A graphic that counts a figure
up (a big stat, a growing bar, a drawing ring) shows **0** on its card instead of its number.
The graphic itself is fine: play it and the figure is there. It is only the parked picture that
every card, thumbnail and operator preview shows.

## The route, in under a minute

1. `/app` -> **New graphic** -> **Templates** -> search **Big Stat** -> **Finish** into the
   editor, then save it.
2. **Home** -> **Graphics**. Its card reads `0%`. The design's figure is 87%.
3. Open it. The editor canvas reads **87%**, correctly - that surface was fixed. The card was not.

## What to look at, and the one call

It arrived with a fix that was itself right: a credits roll used to settle to a blank card, and
repairing that meant re-deriving the settled frame after the data is written. That is correct for
a credit roll and wrong for a counting readout, and no ordering of those steps suits both. So
until the real fix lands, one of two defects is on screen:

- **today:** counting stat cards read zero;
- **the alternative:** the blank credits card comes back.

**The real fix makes the choice go away** and is one line per readout - end the count-up with a
write of the true value, which lands under a settle where the callback does not. It is filed at
`docs/backlog/settle-recipe-and-callback-readouts.md` with the audit and the missing gate.

So the only thing wanted here is a look and a preference for the gap: leave it as it is, or swap
back to the credits defect while the fix is scheduled. Landed on main in `14485693`; the mechanism
and the numbers are `docs/DYNAMIC_MOTION_SCOPE.md` section 11.
