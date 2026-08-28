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
`docs/backlog/svg-import-sweep-findings.md`. Item stays open until the owner re-drops both files
and the ladder, the caps and the tracking hold.
