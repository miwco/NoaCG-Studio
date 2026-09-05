---
v: 1
source: measurement
raised: 2026-09-05
state: unstarted
---
# The shipped `poll.svg` sample is listed as a live vote and cannot be bound as one

**Filed:** 2026-09-05 by row X (`claude/x-live-vote-conventions`), found while looking for a
working vote board to point the new docs section at.

## Why

`docs/svg-samples/README.md` lists it as the live-vote sample:

| `poll.svg` | Live vote | percentages are number fields and the bars are artwork |

The practice library is the one place a designer is actually sent, and the new `/docs#svg-vote`
section tells them how to draw a vote board without being able to hand them a file that is one. A
designer who opens the sample named after the thing they are building, and finds it cannot do the
thing, learns the wrong lesson about the product rather than about their own file.

Note the README's own words: "the bars are artwork". That was true when the file was written and
the poll behaviour did not exist. It is the description that needs to change now, or the file.

## What is wrong with it

Two things, and the second matters more than the first.

1. **The bars are unnamed.** Inside `<g data-name="Vote bars">` sit eight bare `<rect>`s, four
   tracks and four fills, none carrying a name. `proposePollBinding` finds four `Option N` rows and
   zero bars, so it proposes nothing, and the Bar picker offers the reader eight rows all reading
   "Rectangle N" to choose between by eye.
2. **The bars are drawn at their sample shares, not at full length.** The track is `width="560"`
   and the fills are 213, 151, 118 and 78. A bar's DRAWN length is what the runtime treats as 100%
   (`pollBarLength` in `src/templates/importedDesign/pollBehaviour.ts`), so naming these four
   `Bar 1..4` as they stand would make 213px mean a unanimous vote, and every share would air
   wrong while looking entirely plausible. This is the failure that cannot be caught by looking at
   the board.

Everything else about the file is already right: `Option 1..4` and `Percent 1..4` are named, and
`Voting open` / `Voting closed` are hidden groups of exactly the kind the badge picker wants.

## What it would take

Redraw the four fill bars at the full 560, rename them `Bar 1` to `Bar 4`, and let the sample carry
its sample shares through the field values rather than through the geometry. Add a `Question` and a
`Total votes` layer while there, since both are one text layer each and the section documents them.
Then update the README row to say what the file now teaches, and consider walking it in
`e2e/_svg-import.ts` the way `quiz-board.svg` and `scorebug.svg` are walked, so it cannot rot again.

That is also the missing half of the docs work: the new section describes a board rather than
handing one over, because the only board that binds today
(`e2e/fixtures/svg-corpus/illustrator-live-vote-band.svg`) lives in the test corpus, which
`e2e/_svg-import.ts` deliberately keeps out of the designer's path.

## Evidence

Read on 2026-09-05: `docs/svg-samples/poll.svg` (its `Vote bars` group), `docs/svg-samples/README.md`
line 39, and `proposePollBinding` in `src/components/wizard/draft.ts`, whose row proposal requires
two rows to resolve a bar before it returns anything at all.
