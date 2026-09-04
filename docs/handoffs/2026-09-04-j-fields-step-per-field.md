# Row J: the fields step answers per field, and reads like a kid can read it

Branch `claude/j-fields-step-per-field`, four commits on top of row A's seven. The row's goal was
that a board's question and its answers can be given different overflow behaviour, that the quiz
behaviour offered on a five-text-box board defaults to four answers, and that every sentence on the
step is one line saying what the control does.

**All three are done.** The interesting one, and the one to argue with, is how the per-field choice
is modelled.

## The headline: "per field" had to become "per plate", and the UI still reads per field

The prompt asked for the overflow choice to be per FIELD. It cannot be, and that is a fact about
the runtime rather than a shortcut. The fit ladder is uniform for every text node - it always wraps
into the room its box offers and always shrinks last - so the ONLY thing a choice can change is
whether the rectangle behind the text may grow, and which way. Growth is something a rectangle does
for everything inside it. Two lines drawn on one plate therefore cannot be given opposite answers,
and a map keyed by the field would have let a reader ask for exactly that and then silently picked
one of the two.

So `svgStretch.perPanel` is keyed by the PLATE, and the step lists one row per plate, named by the
text layers sitting on it. On the owner's board every text has its own plate, so it reads as one
row per answer, which is what he asked for. On a board where two lines share a plate, both names
appear on one row - the honest version of a shared answer rather than a hidden one.

**The runtime needed no change at all.** `NOACG_LAYOUT.rules` has always been a list, and
`data-noacg-el` has always been a space-separated stamp precisely so one element can be named by
two rows (`src/templates/importedDesign/AGENTS.md`, the growth-table tripwires). Several plates
each with their own rows is what that format already meant; `svgGrowthOptions` in
`src/components/wizard/draft.ts` now builds a plate -> axes map instead of one row, the graphic-wide
answer writing first and overrides writing over it. **With no override the emitted bytes are
identical to before**, which is why the catalog emit gate did not move.

## What the reader sees

`src/components/wizard/steps/MapSvgFieldsStep.tsx`, in the "When the text is too long" section:
one extra line, `Give one part of the graphic its own answer`, CLOSED on arrival, and absent
entirely on a graphic with one plate under all its text. Opening it shows a row per plate with
`Same as above` selected. The trap in the prompt - a per-field override on every field turning a
two-click step into a twenty-click one - is answered by the plate grouping as much as by the
disclosure: the list is two to five rows on a real board, not one per field.

## The other two

**The answer count** is read off the ticked text rows: one question, the rest are answers, bounded
by the count picker's own range. His five-layer board now opens with four answers already bound to
four different layers rather than two empty rows. Only the HAND-ATTACHED path changed - a file
whose layers are named "Answer A" already went through `proposeQuizBinding`, which is why the
shipped `quiz-board.svg` sample is untouched by this.

**The copy.** The too-long section went from four paragraphs to three short lines; the behaviour
box from a paragraph naming all three behaviours (which the list under it already names one line
each) to one line; "What else moves" from three paragraphs to two. `e2e/import-svg.spec.ts` pins
the LINE COUNTS rather than the sentences - the words will keep changing and a test spelling them
out would make every future copy edit a two-file edit, but the length coming back is the
regression.

## Three review findings that are ROW A's, not mine

This branch merged `claude/a-fit-ladder-truth` before starting, because A rewrote the growth rung
and the wrap rung's room in the same files and my copy had to be true of what the ladder now does.
The `/check` review therefore saw A's diff as well, and found three things in it. **A had queued
before this; these are reported, not fixed, and they are the most valuable thing on this page.**

1. **`svgApplyAnchor` writes a pass-dependent `x` that `svgLayoutRest` never restores** (`svg.ts`
   ~1206). `svgLayoutRest` clears `svgFitShift` and restores the panel's growth attributes, the
   followers' transforms and the text base transforms - but not the text node's `x`. So pass N+1
   starts with the node at `anchor + grant(N)/2` while the panel is back at its drawn width, and
   `measureSvgRoom`, `svgFitNeighbour` and `svgFitCeiling` all read geometry the drawn artwork
   never had. Before A's change `x` was the constant `align.anchor`, so the two passes always
   measured the same thing. The module's own doctrine says `svgLayoutRest` may only ever put the
   artwork back exactly as drawn.
2. **`svgFitShift` assumes every anchored line rides the panel's CENTRE** (~2000). For
   `align.h === 'end'` the anchor should move by the WHOLE grant when `dir === 1` and by zero when
   `dir === -1`, while `svgFitExtra` grows that line's budget by the full grant either way - so a
   long value can run half the grant past the margin the designer drew.
3. **`svgGrowAxis` reads the element's own CTM while `svgUserScale` reads only the parent's**
   (~1426). For a plate whose rotation lives on an ancestor `<g>` rather than on the rect,
   `ctm.a` is about 0.023 - truthy, so the `ctm.a ? ctm.a : 1` guard does not catch it - and the
   panel grows by roughly 43x the intended amount. The owner's board puts the rotation on the rect,
   so it is not hit there; Figma and Inkscape commonly put it on the group.

I did not verify any of the three by measurement - they are outside this row and inside a branch
whose session had finished. **Do not treat them as confirmed**; treat them as three specific places
to point a measurement at, and note that finding 3 is the same class of bug A was written to fix.

## One defect found and fixed on the way

A growth rule's only statement of WHICH plate it grows is the comment above it, because the row
itself names its element by a positional stamp. `candidateLabel` read only the marked element's own
`id`/`data-name`, and Illustrator writes the layer name on the GROUP and leaves the rect inside it
anonymous - so on the owner's board every rule emitted `// "Layer" grows wider`. It now walks up,
stopping at the first ancestor that wraps more than one marked layer, so an exporter's own wrapper
group ("Frame 1", "layer1") can never stand in for a plate either. Pinned in `import-svg.spec.ts`.

## Gates

- `npm run build`: green on the final commit.
- **`check`: `review: delegated`** - the skill forked and handed five findings plus two notes back
  into the conversation; scope-checked against this worktree's branch and merge-base; three
  attributed to row A and reported above, two fixed here with both notes.
  **`simplify: inline`** - the skill returned fan-out instructions, so the four angles were worked
  here; one real duplication fixed (the line-in-shape test, now one `lineSitsIn`).
  **`verify: inline`.** Stamp at
  `<git-common-dir>/noacg-jobs/checks/claude-j-fields-step-per-field.json`, reviewedSha `6fab364f`.
- **`taste: answered`**, on rendered frames of the owner's board at a 147-character question, with
  and without an override on the question's plate. No NOs on the five axes or the four text
  questions. T4 in particular passes the exact failure it names: with no override the quiz plate
  does not grow, and with one the plate grows while all four answer plates stay exactly where they
  were. **One taste call is his, not ours**: an overridden question plate ends up wider than the
  span of the four answer plates, which changes the board's proportion. It is in the owner-queue
  item, next to the same open question row A left him.
- The four covering import specs, **104 tests, all passed** before the check fixes. Re-run after
  them: **103 passed, 1 failed** - `import-svg-behaviour`'s EXPORTED CONTROLLER test, whose value
  came back as the sample default instead of the 400 characters it typed. **It passed in the
  integration run twenty minutes later**, so it was a flake on a machine that was at 2.4 GB free
  with a landing job live, not a regression. It could not have been one either way: that spec is
  main's code, untouched here, and it drives `quiz-board.svg`, whose named "Answer A" layers go
  through `proposeQuizBinding` - the path this row did not change.
- All five catalog gates green: `check-catalog-emit` (504 designs), `type-floor`, `overflow-sweep`,
  `field-coverage`, `numerals`, `catalog-specs`.
- **`npm run test:e2e:integration`: 743 + 35 passed, one failure that was my own doing** - a
  throwaway spec I had written to render the taste frames and deleted while Playwright was
  planning the run, so it planned a file that no longer existed. Nothing else failed. The plan is
  the right one for this branch, which took row A in. All 73 `import-svg` tests ran in it,
  including this row's three new ones, and so did the EXPORTED CONTROLLER test above.

## A measurement worth keeping

The prompt warned that `catalog:affected` names sweeps that need a dev server and do not start one.
The opposite bit me: four of the five ran fine queued, and `catalog-specs` failed with
`reuseExistingServer` because I had a dev server up for my own screenshots. So the advice is
symmetric - **`catalog-specs` brings its own server and needs the port FREE**, while the other four
need one running. Running them together means stopping the dev server between step 1 and step 2.
That belongs with row D's queue work, beside the note row A left.

## Owner queue

`docs/acceptance/owner-queue/2026-09-04-the-question-and-the-answers-can-differ.md` - the route,
what to look at, and the three taste calls that are his: the row labels, the proportion of a
widened question plate, and the wording of the line that opens the list.
