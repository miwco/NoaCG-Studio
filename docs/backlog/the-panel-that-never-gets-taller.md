---
v: 1
source: owner
raised: 2026-09-05
state: unstarted
asked: "when I play it out, it breaks down and the text becomes small, and it doesn't follow the
  rules. The answer texts don't get contained in their boxes"
---
# "The panel gets taller" never grows the panel, and the words stand outside it

**Found by measurement 2026-09-05**, while gating the owner's "the option should do exactly what it
says" standard. This is a defect on the board the 2026-09-12 production depends on.

## The measurement

`e2e/fixtures/svg-corpus/illustrator-owner-quiz-board-rotated.svg`, one question of 591 characters,
each of the four too-long options, read off the wizard's own preview. `spill` is how far the words
stand outside the plate they were drawn in, on the worst edge.

| option | text | plate | spill |
|---|---|---|---|
| the panel gets wider | 6 lines @ 29.2px | 1353 × 262 | **0** |
| the panel gets taller | 8 lines @ 36px | 1238 × **259** | **40px** |
| the panel gets wider, then taller | 8 lines @ 36px | 1353 × 262 | **38px** |
| the panel stays the size you drew | 6 lines @ 26.2px | 1238 × 259 | **0** |

259px is the height the plate was DRAWN at. So under both options that promise a taller panel, the
panel does not move at all, while the fit wraps to eight lines at full size on the strength of room
it never gets. The two options that keep their height are correct: they shrink, and nothing spills.

## What this is, and what it is not

**It is not the ladder shrinking too eagerly.** The shrink rung works - see rows 1 and 4.

**It is the OFFER and the APPLY disagreeing.** Vertical growth is deliberately split
(`templates/importedDesign/svg.ts`): `svgOfferHeights()` measures, at rest, the most the rule could
ever give, the fit wraps and shrinks inside that fixed ceiling, and `growSvgHeights()` then grows
the panel by what the settled block actually needed. One measure, one fit, one apply, never
iterated - and it is right to be. The failure is that the ceiling offered here is real to the fit
and worth nothing at apply time, so the block is sized for a panel that never arrives.

**A cap of zero may itself be correct.** The question's plate has the answer plates directly below
it, so there may be genuinely nowhere to grow without covering them - `svgGrowCap` mirrors the
design's own margin and floors at the row's `safe`. If that is the answer, the defect is not the
cap but everything downstream of it: **an offer the apply cannot honour must not be offered to the
fit.** The block would then wrap into the room that actually exists and shrink, exactly as the
fixed-panel option does, and nothing would spill.

That also settles what the option should DO on a board with no room: the same thing as "the panel
stays the size you drew", and the step should say so rather than offering a choice that cannot be
kept (the owner's twice-given rule - offer nothing that cannot do anything on the graphic in front
of you).

## Where to start

1. Instrument `svgOfferHeights` and `growSvgHeights` on this fixture: what height does the offer
   promise, what does the apply grant, and which of the two is wrong.
2. If the apply is right and the offer is not, the fix is to measure the offer through the SAME cap
   the apply uses, so the two can never disagree.
3. Re-run the gate. `e2e/import-svg.spec.ts`, "the too-long mode answers the same however the
   reader got there", currently PINS the broken behaviour on purpose - `expect(tall.h).toBe(
   fixed.h)` and `expect(tall.spill).toBeGreaterThan(0)`. When this is fixed those two lines
   become the same assertions the wider and fixed options already carry, and the pin is how you
   will know the fix landed rather than moved.

## Why it was not found before

Every existing test sets the controls once and asserts once, on copy that fits. These four rows
only diverge past about 450 characters on this board - below that all four options produce
byte-identical text, which is its own finding
(`docs/backlog/the-text-step-breaks-when-you-play-with-it.md`).

This is very likely the same defect as the PREVIEW/PROGRAM disagreement recorded in
`docs/backlog/wizard-text-fit-is-order-dependent.md` - *"the answer texts don't get contained in
their boxes"* - and that row should be re-read against this table before it is worked.
