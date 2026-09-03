---
v: 1
source: owner
raised: 2026-09-03
state: unstarted
asked: "we need to be able to make a simple score tracker with two or more teams, with quick ways to add scores from a custom SVG file"
---
# The scoreboard behaviour - the half of the September goal that does not exist

**Filed:** 2026-09-03, from the theme audit at the end of the owner's walk. **This is the first row
of the next wave.**

## Why, and why it is urgent

`docs/GOALS.md` NOW names two graphics that decide 2026-09-12: a **QUIZ** (lock / reveal) and a
**SCOREBOARD** (score plus and minus). On 2026-09-03 the owner confirmed the quiz half end to end
on his own artwork - drawn, imported, played out. **The scoreboard half does not exist.** There is
no behaviour module, no design, and no scheduled home: P2, which owns behaviour, is in DESIGN state
gated on research rounds, and the only mentions of a scoreboard sit inside two rows about
behaviours in general.

Nine days out from a real production with real students, that is the gap.

Asked whether 09-12 had become quiz-only, he widened the scope rather than narrowing it:

> File it and put it first in the next wave. Yes, we need to be able to make a simple score
> tracker with two or more teams, with quick ways to add scores from a custom SVG file.

**Two or more teams, not two.** The goal's "Goal A / Goal B" shorthand is the football case, not
the shape. A quiz show with four contestants, a class split into six groups, and a two-team match
are the same graphic with a different row count - the same lesson the poll already learned, where
a round carries up to eight option rows.

## What it needs

1. **A behaviour module beside the other two.** `src/templates/importedDesign/behaviour.ts` binds
   `quizBehaviour.ts` and `pollBehaviour.ts`; this is the third. `fieldCount` is DERIVED, never
   typed - see `docs/backlog/behaviour-fieldcount-derived-rule.md`, which was written because the
   poll got this wrong and predicted the scoreboard would be the third module to face it.
2. **N teams, discovered from the artwork.** A row is a team name plus a score, and the count comes
   from how many the designer drew. Cap it where the poll caps its options unless the artwork
   argues otherwise.
3. **Quick ways to add scores.** The control page is generated from the machine
   (`docs/CONTROL_LAYER.md`), so the verbs are the design: plus one is the common case and must be
   one press, a correction (minus one, or set an exact value) has to exist because operators
   mis-press, and a reset belongs to the graphic rather than to re-importing it. Survey how
   comparable products shape this before inventing it - that is the standing method
   (`docs/acceptance/OWNER_QUEUE.md`, "A design default is NOT a taste question").
4. **Recognised from layer names, like the others.** The poll reads `Bar 1`, `Percent 1`; the quiz
   reads `Answer A`. The scoreboard needs its own convention, documented for designers in the same
   breath - `docs/backlog/run-a-real-audience-vote.md` records that no page documents any of them
   today, which is the mistake not to repeat here.
5. **A fixture and a corpus sidecar**, so the road is gated rather than walked by the owner.

## What it must not wait for

P2's research rounds. The quiz and the poll were both built before that programme reached ACTIVE,
and this is the same shape of work. If the research later produces a better authoring surface, a
third module is what it will be refactored from.

## The one thing to check before designing

The imported-graphic growth rule ruled on 2026-09-03: a graphic that plays as one of a SEQUENCE
keeps its size. A scoreboard is on air continuously rather than played as a sequence, so its team
names are the case where growing MAY be right - and a long team name next to a two-digit score is
exactly the collision the fit ladder is currently getting wrong
(`docs/acceptance/owner-queue/2026-09-02-text-knows-its-box.md`). Land the ladder fixes first or
design around them knowingly.
