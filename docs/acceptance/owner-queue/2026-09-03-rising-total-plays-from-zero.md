---
kind: walk
date: 2026-09-03
---
# Rising Total plays from zero, and counts with its commas on

**Date:** 2026-09-03 · **Branch:** `claude/e-walked-remnants`

## What changed

On 2026-08-28 you said Rising Total still showed the full number on take, snapped to zero and
counted up, and asked for a sweep for siblings. Both halves are done, and the sweep found the
bug was never about Rising Total.

**The flash was one frame, and every graphic had it.** The August fix moved each figure's
emptying onto the entrance's FIRST frame. That was right and it was still a frame too late: an
animation timeline writes nothing until the browser's next frame, while `play()` runs and returns
in one go. So the browser paints once in between, showing the graphic exactly as it already was.
Off air that paints nothing, because the graphic is invisible until the entrance reveals it. On
air it paints everything - and a graphic is on air whenever you take it a second time, which is
what the canvas, the Rehearse panel and a dashboard re-take all do. Measured: a settled Rising
Total came back from `play()` still reading its real `124,213` at full brightness, and the zero
landed 14 ms later. The entrance now paints its own first frame during the take.

That is why the Poll Ring and Doors Open looked right to you and Rising Total did not. All three
had the same stale frame; only Rising Total's is a number the size of the panel.

**The count had a second fault, and it is the one your eye probably caught.** The big total
counted `8807`, `16041`, `124213` with no thousand separators and only put its commas back on
the very last frame, so the number changed width and read as a different order of magnitude every
few frames. The percentage ring beside it had grouped its digits all along - two builders
formatting independently. They now share one formatter, and whether to group is read off YOUR
figure rather than decided by the code: type `124,213` and it counts `8,807`, `16,041`, `124,213`;
type `1200` and it counts `537`, `1200`, untouched.

## The route, in under a minute

1. Make a **Rising Total** (search *Rising* or *Fundraising* in Browse) and open it.
2. Type a big grouped figure into the Total field, `124,213`.
3. Press **Take**. Let it finish. Then press **Take again**, without taking it out first.

## What to look at

- **The second take is the one that used to be wrong.** The number must be `0` from the first
  moment the panel appears. What you must NOT see is `124,213` sitting there for a blink before
  it drops to zero.
- **Watch the digits while it counts.** Commas the whole way up - `8,807`, `41,660`, `124,213` -
  never a bare run of digits that suddenly grows commas at the end.
- It still lands on exactly the text you typed.
- Then a **Poll Ring** and a **Doors Open** the same way, twice each. They were right before and
  must still be right.
- Then anything with a bar - search **Election** - taken twice. Bars empty on the take, and the
  figures at the bar tips read zero as the panel arrives.

## Also worth a glance

The cards on **Home** and **Browse** must still show the FINAL figure, not a zero. That is the
other end of the same mechanism and this change must not have undone it.

## What is not covered

The gate that would have caught this now exists (`e2e/counting-settle.spec.ts` grew a third pass
that plays a graphic out, takes it again, and reads the frame the browser is about to paint), so
the next one is caught by the tests rather than by you. What it cannot judge is whether the
grouped count LOOKS better than the bare one at speed. That is your call, and one line reverses
it.
