# Row C: the fit stops depending on order

Branch `claude/c-fit-recompute-order`. The row's goal was that the same text in the same graphic
fits the same way whatever was toggled beforehand, and that a spec fails when it stops being true.

## The headline, for the three rows chained behind this one

**The hypothesis in the backlog file is dead, and the real defect is somewhere else entirely.**

`docs/backlog/wizard-text-fit-is-order-dependent.md` proposed that the fit recomputes when the
BEHAVIOUR changes and not when the TEXT changes, from a reading of `MapSvgFieldsStep.tsx:669`'s
dependency array. Instrumented on the owner's own board, that is wrong twice over. `draft.svgFields`
IS in the array and a keystroke patches it, so the effect re-runs on every character. And the
measured output does not move: six readings of `#f0` across four interaction orders - behaviour
then text, text then behaviour, toggled back to none, toggled to quiz again, cleared and retyped -
came back byte-identical on the unmodified tree, at two value lengths, with and without the quiz
behaviour attached.

**What IS broken is that the fit records a measurement nobody could take.** Every number the ladder
uses is read off the laid-out design, and the design is not always laid out when the document runs.
A node with no box measures 0 for everything, and the 0 was written into `svgFitRoom` as the
answer - which made `svgFitRoom[id] == null` false forever, so no later pass could ask again. The
line was then skipped for the life of the graphic (`budget = 0` hits the `continue`) and painted at
its drawn size, on one line, straight across the artwork.

Measured on `illustrator-owner-quiz-board-rotated`, one composed document mounted twice:

| mount | lines | size | block width | room |
| --- | --- | --- | --- | --- |
| visible from the start | 3 | 36 px | 796 px | 820 x 216 |
| `display:none`, then revealed | 1 | 36 px | **2018 px** | **0 x 0** |

The plate is 1239 px wide. That is the whole failure, in one table.

## Who is in that condition, and why no gate saw it

Three real ways a graphic's document exists before it has a box:

1. **A playout renderer preloads.** `createOutputStage` builds every graphic's iframe at load,
   before anything is on air. That is the shape of an SPX/CasparCG load-then-play too.
2. **`.pd-main.pd-offstage { display: none; }`** (`src/styles/playout-dashboard.css:163`). The
   production page keeps its monitors mounted-but-hidden behind another workspace. The React side
   recovers through a ResizeObserver and its own comment says so; the graphic inside the iframe had
   no such thing.
3. **Every drawn state.** `drawnState.ts` emits `display: none` for a state layer until its state
   fires - so a bound text layer inside one has no box at load BY DESIGN, from the first frame.

And the reason every existing ladder gate was green throughout: **all of them build their document
on a surface that is on screen.** Row A's four-option x six-length sweep, the corpus walk, the
behaviour specs - none of them had ever asked what the ladder answers for a graphic that loaded out
of sight. A gate can be exhaustive over the inputs it varies and blind to the one it holds fixed.

## What changed in the fit path, and what did NOT

Changed, in `src/templates/importedDesign/svg.ts` (the emitted runtime, not the app):

- **`svgFitLaidOut(el)`** - does this line have a box to read? An empty value has no box of its own
  and is measurable all the same, so its parent answers for it: inside a `display:none` subtree
  nothing has a box at all.
- **`svgFitOwed`, per LINE.** Two `continue`s in the measuring passes and one in the ladder, so a
  line nobody can measure records nothing, is never fitted against nothing, and is marked owed.
  Per line rather than per document because the condition is chronic: every quiz board has a state
  that is off, so one flag for the graphic would be raised for the life of it.
- **`svgFitDue(within)`** - is any owed line NOW measurable? One statement of it, read by the
  ladder, by the drawn states and by the load-time recovery. `within` scopes the question to one
  layer, which is what keeps a behaviour turning on several layers of one state from re-measuring
  the whole design once per layer.
- **`fitSvgText` rests and re-measures ONCE per pass**, and does it BEFORE `growSvgLayout` - the
  order `refitSvgText` documents and the previous commit got wrong. Measured after growth, the
  room already contains the grant that `svgFitExtra` then adds to it, and the value is fitted
  against its budget twice over.
- **Two null guards in `growOneRule`**, matching the ones `svgBlockExtras` and `svgGrowDir` already
  carry. It read `.penned` straight off a room this change can legitimately leave unrecorded, which
  threw and aborted the whole fit pass for every line on the board.
- **A `ResizeObserver` on `.imported-design-art`**, guarded on the debt, so a hide-and-show cycle on
  a design that already has its answers costs nothing and the panel growth this ladder performs can
  never re-enter it. This is the half for a cue taken to air with no `update()` to prompt anything.

And in `src/templates/importedDesign/drawnState.ts`: the emitted `qShow`/`pShow`/`sShow` pays the
debt for the layer it is showing. It has to be there rather than in the update hook, because
`SVG_FIT_HOOK` runs BEFORE the behaviour's own hook - the update that reveals a state fits before
the state is drawn, so waiting for the next update would air one value at the wrong size.

**The drawn-state half is a HAZARD REMOVED, not a defect measured.** No behaviour currently puts a
bound `fN` layer inside a drawn state: the poll renames its question, options and figures to `p-*`
(`markPollLayers`), which takes them out of `svgFitNodes` entirely, and the quiz's and score's
drawn states are artwork. So it is unreachable today and correct for the moment somebody draws a
board where it is not - which is the shape row J's vote board is closest to.

**NOT changed - read this before you build on it:**

- **No rung of the ladder.** Order, floor, squeeze, growth, wrap, alignment, recentring: untouched.
  Row A's four fixes stand exactly as they were.
- **`MapSvgFieldsStep.tsx` is untouched.** The proposal effect at line 669 does re-run on every
  keystroke and its measured output was stable, so there was nothing to fix there. Its OTHER two
  properties from the backlog file are still true and still unexamined: it stops permanently once
  `draft.svgStretch.authored` is set, and attaching any behaviour forces `{ on: false }`.
- **`stretch.ts` and `behaviour.ts` are untouched.**
- **The owner's own suggestion is untouched** - putting the behaviour choice ABOVE the text fields.
  Still a good idea, still nobody's row.

## Two things I could not reproduce, stated plainly

- **PREVIEW and PROGRAM disagreeing.** The backlog file calls this the decisive evidence and it is
  the strongest single clue in the whole item. I walked his exact route - wizard, into a production,
  type the long question into `cue-field-f0`, read the preview monitor, TAKE, read the program
  monitor, Update, read both again - and the two panes returned identical readings at every step,
  with and without the quiz behaviour, at 70/89/136/219-character questions. Both iframes are
  full-resolution documents with the scale applied OUTSIDE them, so nothing inside either measures
  differently. The measurement bug above is my best candidate for it, since it is exactly a "same
  data, different surface" failure and the program stage is a preload - but I did not prove it, and
  the next person should not treat it as proved.
- **The validator and the renderer disagreeing** (the control page saying "too long" while the
  preview renders it fine). Not chased. The warning rides `noacgTextOverflow()`, which is the
  renderer's own report, so if they disagree it is because two documents answered.

## One thing I DID reproduce and could not explain

Filed with its numbers as `docs/backlog/fit-loses-a-value-that-arrived-while-the-board-was-away.md`.
A board mounted on screen and measured, then hidden, then given a long question by `update()`, then
shown again, comes back holding its ORIGINAL text. The write lands - read straight after the update
the node holds the long question - and the window identity is the same object throughout, so the
iframe is not reloading. After the reveal the ladder has run and fitted every line: it fitted the
wrong value. It is a restore path in `measureSvgBudgets` or `measureSvgRoom` writing the drawn value
back where it should write the live one.

**It is deliberately not gated.** A red spec is not a finding, and I could not tell within this row
whether it is reachable through the product at all - `update()` was called on the document directly
here, where the real surfaces post a message that may simply not be drained while the document is
not rendered. The backlog file carries the four-line reproduction against the harness this branch
already added.

## For the rows chained behind this one

- **H (multi-file import)** - nothing here constrains you. The fit's caches are per-document
  globals in the emitted runtime; a second imported file is a second document.
- **I (dead controls)** - the "the panel gets wider" control was Row A's, and it works. If you find
  another control that appears dead on a board, check whether the artwork it acts on was measurable
  when the document loaded before concluding the control is wired wrong. That is the shape this row
  turned out to be.
- **J (the live-vote board)** - **your first defect is most likely in this path.** The vote board's
  percentage figures and its VOTE NOW badge are DRAWN STATES (`pollBehaviour.ts`), which means every
  bound text inside one was `display:none` at load and had a room of zero recorded for it before
  this branch. It now measures on reveal. If a vote figure still comes out unfitted, the thing to
  read is `svgFitUnmeasured()` in the composed document, not the ladder.

## Gates

- `npm run build`: green on every commit, and on the final tree.
- **Mutation-tested.** Both new specs were written first. Against the previous runtime the
  out-of-sight one fails with the table above (2018 px on one line against 796 on three). The
  one-input-at-a-time one passes on both trees - stated honestly: it did NOT catch this bug, and it
  is there because the backlog asked for a gate that changes one input and asserts after each, and
  because the property it pins is the row's own goal.
- The four covering spec files - `import-svg`, `import-svg-corpus`, `import-stretch`,
  `import-svg-behaviour` - plus `catalog-baseline`: **115 tests, all pass** on the final tree,
  including every drawn-state behaviour walk, which is what exercises the `drawnState.ts` change.
- **CI run 33919339941 on `f3b10de1`: green, and the jobs it actually ran were all of them** -
  Factory gates, Build, E2E plan, the catalog calibration gate, all NINE E2E shards, the combined
  report and the CI gate. Nothing was skipped except the Vercel acceptance step. The only commit
  after it is this handoff.
- `npm run test:e2e:focus:queued`: **522 passed, 1 failed** on the first run - `catalog-baseline`,
  "every catalog variant emits byte-identical code", which is the expected consequence of changing
  an emitted runtime. Re-recorded; the diff is ONE hash, `svg01`'s `js`, and nothing else in 504
  variants. The catalog gate the same run also triggers passed, 35 tests. Re-run after the review
  fixes: see the verdict at the end of this file.
- **A defect fixed in passing:** `e2e/catalog-baseline.spec.ts` and `scripts/check-catalog-emit.mjs`
  wrote DIFFERENT `$comment` strings into `catalog-baseline.json`, so the comment flipped depending
  on which recorder ran last and every second recording carried a diff about nothing. The spec now
  writes the script's sentence, which is the one that names both readers.
- `check`: **`review: delegated`** - the code-review skill returned seven findings into this
  conversation, scope-checked against this branch and this worktree. Six were confirmed against the
  code and fixed in `054ed3e1`, including one that would have THROWN out of `growSvgLayout` and
  aborted the fit for every line on the board. The seventh (the observer never being disconnected)
  is answered by the debt guard rather than by a disconnect, and is noted as such in the code.
  **`simplify: inline`** - the skill returned fan-out instructions, so the four angles were done
  here: one genuine duplication removed (`svgRestAndMeasure`, the three lines `refitSvgText` and the
  ladder had both grown), and the rest judged clean, with the reasons on each. **`verify: inline`**,
  full.

## Owner queue

`docs/acceptance/owner-queue/2026-09-04-the-fit-cannot-be-made-to-forget.md` - the route, both
things to look at, and both things I could not reproduce, since a walk item that only lists wins is
not a walk item.
