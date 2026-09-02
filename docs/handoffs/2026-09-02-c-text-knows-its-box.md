# 2026-09-02 - row C: text knows its box

Branch `claude/c-text-knows-its-box`, cut from `b0750116`, `origin/main` taken in at `576eb96d`.
The brief was the owner's 2026-09-02 walk of his own quiz board
(`e2e/fixtures/svg-corpus/illustrator-owner-quiz-board-rotated.svg`) and the three rulings he gave
after it. Step 1 was "reproduce before changing anything", and the reproduction is the headline.

## What did not reproduce

**Two of the three claims the walk filed are false.** The walk reported that in the wizard's Fields
step a short question sat about 120 px left of the plate centre in an 800 px view, and that a
120-character question ran one line straight off the board. I re-walked the same fixture on the same
surface - the Fields step, typing into the question row's Text box - and measured inside the composed
document rather than reading it off the screen:

| Question | Lines | Size | Off the plate centre (x, y) |
|---|---|---|---|
| as dropped (49 chars) | 1 | drawn 36 px | 0, 0 |
| "Who won?" | 1 | drawn 36 px | 0, 0 |
| 49 characters | 1 | drawn 36 px | 0, 0 |
| 147 characters | 3 | drawn 36 px | 0, 0 |

The text's screen centre and the plate's screen centre are the same number, 423 of 800, at every
length. Measured again 400 ms after the keystroke as well as after the entrance settled, and again
typing character by character: same answer every time. Screenshots at each length confirm it by eye.

So the answer to the brief's three-way question is the third one - **the claim was measured somewhere
the user never looks, or through an instrument that had stopped.** The walk's own note says the stage
froze mid-entrance, which is the likeliest explanation.

What that bought is a TEST, not a fix. The claim was filed about a surface nothing was measuring: the
existing three-length regression runs in the EDITOR through `update()`, and the wizard preview is a
different document built by a different path. `e2e/import-svg.spec.ts` now measures the wizard preview
at three lengths on the same fixture, so a claim about it can only be filed against a measurement.

## What shipped

**1. A graphic the audience sees again keeps a fixed box.** The doctrine's rule 3. The board says so
itself, before anybody picks a behaviour: a REPEATED ROW - two or more plates of one size, standing
apart, each holding its own editable line - is a quiz, a poll or a scoreboard; a lower third draws one
band and stacks its lines inside it. Never the category (owner, 2026-08-30). Sizes are read off each
shape's own untransformed box, because every plate on his board carries its own rotation and the
screen rectangle is not the plate: four plates all drawn 76x520 have axis-aligned boxes 114, 171, 131
and 111 units tall. Which shapes hold a line is asked through `panelsHoldingText`, the predicate the
shape picker already offers from, so an outlined-answer export is still recognised as a board.

WHICH shape and WHETHER it grows are now separate questions. A board still proposes its question's own
plate, so a reader who overrides the ladder lands on the right plate rather than the board's backplate.

Measured across all 43 corpus files: **one file moves** (his), and the nine that grow still grow.

**2. A centred block snaps vertically as well as horizontally.** `svgAlignOf` measures `align.snapY`,
`svgPaintLines` adds it to the first line's `dy` beside the rise that was already there. On his board
that is 9 units, and the block now sits on the plate's middle at one, two and three lines. Three
consequences: a one-line value that is being centred now carries a tspan (plain text has no `dy` to
ride, and the snap is floored at half a unit so nothing invisible costs a node); the room is measured
about the box's middle rather than the drawn height, which is 216 units on his plate rather than 198;
and only a MIDDLE line snaps - top- and bottom-composed text is left where it was drawn, with the
offset kept as `align.nudgeY` for the same checkbox `align.nudge` is waiting on.

**3. Unticking a text layer asks what should happen to the words.** "Keep it as drawn" is the primary
answer, "Remove the text" the secondary; removal is never automatic. A removed layer is hidden by one
CSS rule (`.imported-design-removed`), so the shapes stay in the file. Picking a bound layer on the
ARTWORK asks the same question - the canvas and the checklist are two views of one decision, and the
canvas was the door that quietly picked an answer.

## What to know before touching this

- **The e2e helper `untickTextRow`** (`e2e/_svg-import.ts`) is now how a spec unticks a text row.
  A bare `uncheck()` fails with "clicking the checkbox did not change its state", which is a true
  report of a walk that has not finished. Three specs were caught by this, all on the first CI run.
- **The wizard preview now stamps `data-doc-rev` / `data-doc-pending` on its `.wz-stage`**, the same
  contract `PreviewFrame` carries. The stamp is on the STAGE and not the frame because a rebuild
  replaces the frame. It took 6.5 s of sleeps out of one spec.
- **`svg.ts` is a template literal.** A backtick in a comment closes the string and the syntax error
  points at the wrong line. Paid for once here.
- **The corpus sidecar for the owner's board changed its `growth` claim** from `grow-y` to `shrink`,
  and the file came OFF `GROWTH_FINDINGS` in `e2e/import-svg-corpus.spec.ts`. The superseded claim
  and why it changed are written into the sidecar's own `whyThisMatters`. It no longer states a
  `growthShape` - nothing grows, so the step names no shape; which shape it WOULD offer is pinned in
  `e2e/import-svg.spec.ts` instead, where the ladder is turned on by hand.

## Verification

**CI run 33688563234 is green on `bf2a28b0`, and all nine E2E shards ran as `(full)`** - asked for
with `gh workflow run` rather than left to a push, because the handoff commit would otherwise have
cancelled the run that covered the real change and planned only itself. Factory gates, Build, the
catalog calibration gate and the CI gate all green with it.

Locally: `npm run build` green; `check:catalog-emit` green after re-recording
`e2e/catalog-baseline.json` (one line, svg01's js hash, as predicted); the five owner-board specs
pass; the catalog calibration tripwire passed all 35 of its cases. The first CI run failed exactly
three specs, every one of them the untick walk, and nothing else - they are fixed.

The four rendered catalog sweeps `catalog:affected` names (`type-floor`, `overflow-sweep`,
`field-coverage`, `numerals`) were enqueued four times and refused each time - three for want of a
dev server on this checkout's port, once on the free-RAM floor while other sessions held the
machine. They are queued as j-0371..j-0374 for the runner to drain. The gap they leave is small and
worth naming: they measure the rendered CATALOG, the only source file of it this branch touched is
`src/model/wizard.ts` (one optional field on a type), and the catalog calibration gate that CI runs
covers the same rendered designs.

## Still open

- **The owner has to LOOK at the vertical snap**, and the queue item says so in bold. Every board he
  approved in the 2026-09-02 wrap side-by-side was rendered at the OLD vertical position. Building the
  snap changes the thing he just said looked best. It is 9 units on a plate 259 tall, so he may prefer
  either; if he prefers the old one, the snap is one line to take back out.
- Steps 2 and 3 of `docs/TEXT_BOX_BINDING.md` - the box grouping, the swatch, the overlay, the nine-dot
  alignment control - are untouched and still DESIGN, deliberately.
- Line alignment inside a wrapped block stays CLOSED (he picked today's behaviour in the side-by-side).
- The second of the walk's two smaller questions is still open: re-entering the wizard for a graphic
  that has since been hand-edited.
