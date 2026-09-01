# The grow-vs-shrink default, audited across real-exporter files

**Status:** open finding, no code change. Recorded 2026-09-01 from the branch
`claude/b-svg-one-field-per-item`, which was doing something else - this was the audit leg beside
it. Owner's ask: "continue validating that the automatic grow vs. shrink defaults make sense
across SVGs from real exporters".

## What decides the default

`proposeBannerGrowth` in `src/components/wizard/steps/MapSvgFieldsStep.tsx` measures the mapping
step's rendered artwork and answers with the rectangle that should grow, or null - and null means
the default stays "the text gets smaller". Four conditions, all geometric: a rectangle wider than
tall (ratio >= 1.5), its right edge inside 94% of the frame, holding at least one bound line with
a baseline to itself, and every such line start-anchored. The caller stands the whole proposal
down when a BEHAVIOUR is bound - a board that selects and reveals declares a stage.

## What is already measured, and is the authority here

`e2e/import-svg-corpus.spec.ts` walks every sidecar's `expect.growth` through the real door and
fails on a disagreement. Its `GROWTH_FINDINGS` list is the set of corpus files it has to EXCLUDE
because the measured default disagrees with what the file's designer should be offered:

    effects-figma-masked-reveal
    figma-nested-frames-quiz-board
    inkscape-flowed-text-card
    nested-svg-sub-artboard
    student-illustrator-quiz
    ticker-strip-3840

Six files, of which four are real-exporter families. That list IS the answer to the owner's
question as far as the corpus can give one: the default over-proposes growth on boards, cards and
strips whose layout is the design, and the owner's 2026-08-23 ruling is that growing is right
where the geometry is unambiguous and the author changes it in one click - so the finding stands
open rather than being fixed by tightening the geometry until it fits this corpus.

Two things worth saying that the list does not:

- **The behaviour veto is doing real work, and unevenly.** `illustrator-quiz-board-multiline` and
  `inkscape-hidden-state-layers-quiz` are quiz boards whose question card passes all four
  geometric conditions, and both arrive on `shrink` - the quiz binding is proposed, so the growth
  proposal stands down. `figma-nested-frames-quiz-board` is the same kind of file and does NOT
  arrive on shrink. Whatever separates them is the thing to look at first: it is the difference
  between a board that keeps its layout and one that grows its question card on air.
- **One file passes for a reason 25 pixels wide.** `illustrator-rotated-sidebar-strip`'s clock
  block is a 440x200 rectangle in a group carrying `matrix(0.7 0 0 0.7 1520 96)`, so its right
  edge lands at 1828 against the 1804.8 that 94% of a 1920 frame allows. Ratio 2.2, two stacked
  start-anchored lines inside it: every other condition passes. The same block composed 25px
  further from the frame edge would be proposed as a growing banner. Verified from the markup on
  2026-09-01.

## What to do next

Nothing until somebody decides whether the veto should be broader than "a behaviour is bound".
The shape the four wrong files share is that they are STAGES - a card or a board whose layout is
the design - and the geometry cannot see the difference from a banner. If a signal is wanted, the
candidates are: more than one rectangle holding bound lines (a board has several), or bound lines
in more than one horizontal band. Both are guesses until measured against this corpus.

## The delegation that produced this

The read was delegated to Antigravity `gemini-3.7-flash-high` (`--mode plan`, label
`svg-growth-default-audit-r2`, 222 s, one turn). It returned a complete 20-row table derived from
the markup - and it is wrong on at least four rows, because it derived what the heuristic WOULD
return and then reconciled it with the sidecar by assuming the behaviour veto fires wherever a
quiz is drawn. The repo already had the measured answer for exactly those rows, and it disagrees:
`figma-nested-frames-quiz-board`, `effects-figma-masked-reveal`, `nested-svg-sub-artboard`,
`ticker-strip-3840` and `student-illustrator-quiz` are all in `GROWTH_FINDINGS`, and the worker
marked four of those as agreeing. The one contribution kept above - the 25-pixel accident - was
re-derived from the file before it was written down. A first call was lost entirely: it needed the
`command` permission the headless mode cannot prompt for, and returned an empty response after
32 s while still billing.
