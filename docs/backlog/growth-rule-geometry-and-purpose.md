---
v: 1
source: owner
raised: 2026-08-30
state: unstarted
asked: "the growth rule shouldn't depend only on a category. It should depend on the geometry and what is the why of the graphic and how it works with other graphics - in Who Wants To Be A Millionaire the question box does not resize with the question"
---
# The growth rule: geometry AND purpose, never category - and a sequence keeps its size

**Filed:** 2026-09-02, from the 2026-08-30 owner rulings (memory `owner-decisions-2026-08-30`,
ruling 4). **Source:** owner ruling, 2026-08-30 morning.

## Why

The importer proposes how an imported graphic's panel grows with its text (the fit ladder,
`docs/SVG_AUTHORING.md` section 4), and the proposal today reasons from the artwork's geometry
and, in places, from the graphic's category. The owner ruled that category is never the reason:
*"We should have real-life examples and logic being used here."* His worked example is the useful
part - a quiz or text box played one item after another keeps the SAME size between items, because
in Who Wants To Be A Millionaire the question box does not resize with the question, and that is
right by design taste. So a graphic in a SEQUENCE is a case for constant size even where its
geometry alone would argue for growing. This is a taste rule with a mechanism under it, and it
needs design work, not a heuristic tweak. The 2026-09-02 delegation trial found the growth field
is exactly where every delegate went wrong, so the rule's clarity is also what makes that field
checkable.

## What it would take

1. Write the rule as the owner stated it, with the sequence case, into `docs/SVG_AUTHORING.md`
   section 4 and the corpus README's schema comment - the promise a fixture's expectation is
   written from.
2. Decide how "played in a sequence" is known: from the behaviour attached (quiz, poll), from a
   production's rundown, or from a field on the graphic. Design it; a heuristic on the category is
   the thing ruled out.
3. Re-derive the affected corpus expectations and run `e2e/import-svg-corpus.spec.ts`.

## Evidence

The ruling is verbatim in memory `owner-decisions-2026-08-30` and its worked example in the
2026-08-30 wave plan. `docs/GRAPHIC_TYPES.md` already uses the Millionaire example for quiz
STATES (one selected state plus a field), which is a different rule; the growth half is unwritten.
