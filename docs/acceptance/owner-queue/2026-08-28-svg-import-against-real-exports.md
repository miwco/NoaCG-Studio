---
kind: walk
date: 2026-08-28
---
# SVG import, measured against real exports

Twenty files shaped the way Illustrator, Figma, Inkscape and Affinity really export were walked
through the Import door, door to export gate. **All 20 imported, reached Finish and passed the
export gate.** Six wrong answers were small enough to fix on the spot; five are filed.

Verdict table and the full reasoning: `docs/backlog/svg-import-sweep-findings.md`. The corpus and
the instrument: `e2e/fixtures/svg-corpus/README.md`, `scripts/svg-import-sweep.mjs`.

Fixed: a compound PostScript weight (`Archivo-SemiBold`) warned "not available" about a family we
ship · Figma labels every field with the copy it contains ("Amsterdam" instead of "Answer A") ·
Figma's own `Frame 21` beat the designer's name · Affinity's `serif:id` unread · Inkscape's
`textPath6` counted as a name.

## The one worth your eyes

Route, under a minute: `/app` → **New graphic** → **Import graphic** → drop
`e2e/fixtures/svg-corpus/figma-outline-text-title-card.svg`.

That is a Figma export with **Outline text** left ticked - the checkbox a designer leaves on
because it makes the file look identical everywhere. Look at what happens: the artwork arrives
pixel-perfect, the door says the type was turned into outlines and "the next step shows two ways
to get editable text", and the next step then shows **one**. Figma flattens a whole text layer
into one compound `<path>`, and our outline-recovery road only opens for a group of two or more
shapes, which is Illustrator's habit. So the most common real-world SVG failure has no recovery.

The question for you: is that road worth building now (it changes what an outline candidate IS -
three files), or does the door just name the checkbox and tell them to re-export?

Second, if you have another minute - drop `e2e/fixtures/svg-corpus/effects-gradient-shadow-lower-third.svg`
and look at "when the text is too long". It answers **the text gets smaller** on an ordinary
premium lower third, against your 2026-08-26 ruling, because Illustrator writes a rounded
rectangle as a `<path>` and only `<rect>` can be the panel that grows. The advice in
`docs/SVG_AUTHORING.md` ("draw the panel as a rectangle") is unfollowable in the tool the file
came from.

## Owner walked both files, 2026-08-28 - question answered, four defects found

**Outline road: ANSWERED, do not build it now.** The door's detection is right - *"NoaCG rightly
identifies that there's no editable text here and asks to re-import... that's working well"* -
but the offered next step *"doesn't work at all right now: you can only select where to add the
text, and then it adds the text on top of it - it doesn't remove the text underneath."* His
ruling: *"this is exactly the same case we had with the PNGs... we should just fall back to that
workflow"* (erase the area, add text over) *"if they really want to use the design they have and
not export it again. However, this should not be the main way... I wouldn't want to put a lot of
time on this right now but we could offer it as a fallback just in case."* Re-export stays the
recommended path.

**The gradient lower third, verbatim defects:**
1. *"The dropdown where you can choose what should happen to the text doesn't seem to be working
   on the preview... I put a long text, and I changed the input from the dropdown... and it
   doesn't change the graphic at all."*
2. *"The banner on the right side has another gradient... we don't want the text to go on top of
   that - we need to be mindful if the graphic has a start and a finish. The text itself should
   stay in between the start and finish."*
3. *"The text got smaller even though I have the panel gets wider chosen."* (The sweep's
   path-vs-rect finding, confirmed live - against the 2026-08-26 ladder ruling.)
4. *"The tracking or the kerning between letters became smaller, which is a very big offense to
   the designer. We should not change the design; the designer has had a vision, and we should
   follow that."*

Defects 1-4 became a task (spawned 2026-08-28); the outline-fallback ruling was recorded in
`docs/backlog/svg-import-sweep-findings.md`.

## Fixed 2026-08-28, awaiting your re-walk

Your four walk findings on the fitting path are fixed. Same route, under a minute: `/app` →
**New graphic** → **Import graphic** → drop
`e2e/fixtures/svg-corpus/effects-gradient-shadow-lower-third.svg` → Next. What to look at:

- The file now arrives with **"The panel gets wider"** already chosen, read from the artwork -
  the Illustrator rounded-rectangle `<path>` counts as the panel now, and it leads the
  "Which panel grows" list as **Plate - 1040 × 190**.
- Type a long name into the Name row: the plate widens at your drawn 56px, corner radii intact.
  Switch the too-long options - each one now visibly changes the preview (smaller shrinks,
  wider grows; wrap has no room on this artwork below the lines, so it shrinks, honestly).
- The programme strap keeps your `letter-spacing: 2` - it was silently dropping to normal the
  moment the SVG entered the product.
- An end-cap drawn at a panel's far edge now bounds the text (never painted over) and travels
  with the edge when the panel grows.
- The outlined-file door no longer claims two ways forward, recommends re-export by the exact
  export checkbox, and no longer offers drawing a field on top of drawn type.

Gates: build green; four new cases in `e2e/import-svg.spec.ts`; sweep re-run queued. The item
stays open for your re-walk.

## Round three, 2026-08-29 - the wrap rung was unreachable

You re-walked it: *"The text does not go on new lines. But the panel does get longer. The panel
doesn't have a safe space, and the text gets smaller."* All three were the same file, and the
measurements agreed with you exactly: on `effects-gradient-shadow-lower-third.svg` the name came
out at **one line in every one of the four dropdown answers, at every length**, and the panel
offered **zero** extra height even when "the text wraps onto more lines" was chosen.

Why: vertical growth was always DOWNWARD, and its cap mirrored the inset from the frame's TOP.
Your lower third sits 130px above the frame's bottom and 760 below its top, so the mirror put the
ceiling 630px ABOVE the panel's own bottom edge - no room, ever. Every lower third fell straight
past the wrap rung onto the shrink you ruled must come last. Two more things were hiding behind
it: a wrapped line was painted with no x, so on any Illustrator export (which carries the
position in a transform) it staircased out of the panel; and the room downward had no margin rule
at all, so a wrapped block sat hard against the line beneath it.

Route, under a minute: `/app` → **New graphic** → **Import graphic** → drop
`e2e/fixtures/svg-corpus/effects-gradient-shadow-lower-third.svg` → **Next** → **Create project**.
Type into the Name field and watch it climb, in your order:

- a normal name: nothing moves;
- longer: **the plate gets wider** at the size you drew, out to the margin that mirrors the 140px
  you left on the left;
- longer still: **the name goes onto a second line, still at 56px** - the plate gets taller
  UPWARDS, so the edge you composed against the bottom of the frame never moves, the role and the
  programme strap under it never move, and the amber rail grows with the plate instead of leaving
  the new strip bare;
- absurd: only then does it get smaller, and the field is reported as too long.

What to look at: the space around the text at every step - the name should never touch the
plate's right edge or the role beneath it. Both margins are now measured off YOUR rest pose (the
inset you drew on the left, the gap you drew between the lines) rather than a number we picked.

One decision worth your eyes: the dropdown's measured default is now **"The panel gets wider,
then the text wraps"** rather than "The panel gets wider". You walked this file without touching
that control, and "wider" alone skips the wrap rung by definition. Say if you would rather it
opened on the narrower answer.

The item stays open.
