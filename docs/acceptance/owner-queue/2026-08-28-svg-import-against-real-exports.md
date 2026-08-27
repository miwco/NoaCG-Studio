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
