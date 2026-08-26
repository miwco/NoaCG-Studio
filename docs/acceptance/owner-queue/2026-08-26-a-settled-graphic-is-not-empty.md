# A settled graphic is not an empty box

**Date:** 2026-08-26 · **Branch:** `claude/c-credits-tickers-roll`

## What changed

Every surface that shows a graphic without anybody pressing play - a Home card, the editor canvas
at rest, the operator's preview before the first take, the wizard's preview - parks it at the end
of its entrance. For a credit roll or a repeating reel there is no such place, and both recipes
were asking for one anyway. Two visible faults, one cause:

- **Two credits designs settled to a completely blank frame.** Every credits design carries a
  slow ambient background drift that repeats forever, which makes the animation library report
  the whole timeline's length as "forever" - so "jump to the end" jumped ten billion seconds in
  and landed at a random point of whatever was still looping. The two whose travel is itself
  endless (the repeating reels) landed with every name off-screen. Nothing in the tree measured
  it, so nothing said so. Two changes now stand between that and the cards: the jump is
  re-derived after the data is written (which landed on main from another branch, and is the
  half that carries it), and it goes to the end of the motion that HAS an end rather than to
  ten billion seconds. Coverage of the settled frame goes 0% to 100% on both designs.

- **The wizard played a roll from zero on every step.** A roll's entrance is eighteen seconds of
  travel that begins with every name below the frame: the box is empty for the first second and a
  half and is not recognisably a credit roll for about twelve. That is the exact moment somebody
  decides whether the template is any good. Off the Animation step the preview now settles a
  travelling graphic instead of playing it; the Animation step and ▶ Replay still play it.

## The route, in under a minute

1. `/app` → **New graphic** → **Templates** → search **Classic Roll** → **Next** (Fields).
   The preview should be **a screen full of names, immediately**. Press **▶ Replay** and watch
   the roll run from the bottom - the settle must not have cost that.
2. Back out, and do the same with a ticker (search **House Wire**): a ticker's marquee starts full
   already, so nothing there should have changed.
3. Now the blank-thumbnail half. Search **Repeating Reel**, **Finish** into the editor, save it,
   and go to **Home → Graphics**. Its card should show names. Before this it was an empty
   rectangle - as was the editor canvas the moment you opened it without pressing play.

## What to look at

- **The judgement call worth a second opinion is which frame a roll settles ON.** It parks on the
  roll's own designed rest pose - the logo and year centred, with the last credits above them -
  because that is where the travel genuinely ends. The alternative would be to park mid-roll,
  where the screen is fullest. The current answer is the honest one; the other might be the more
  useful thumbnail. Both are one line.
- On Home, compare a **Repeating Reel** card with a **Classic Roll** card. The reel parks at the
  natural top of its list, the roll at its ending. They should both look like credit rolls.

## Also worth a glance

The reasoning is written down in `docs/DYNAMIC_MOTION_SCOPE.md` §11, which is where the next
person meets this question. One thing was deliberately left alone: the emitted template's own
step-to-step settle still jumps to the end, because "is this step over" is a different question
from "where does this graphic rest", and changing it would change what every template emits.
