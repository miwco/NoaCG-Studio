# 2026-09-01 - session E - SVG picture road

Branch `claude/e-svg-picture-road`, four commits off `40a0b81f`. Sweep finding 2 is closed: a
raster placed in Figma is now a bindable picture field an operator can swap on air, and clearing
the field puts the designer's own picture back.

## What landed

**Finding 2, fixed by resolving the reference rather than widening the exclusion set.** Figma
never writes a positioned `<image>`: a placed raster is `<rect fill="url(#pattern0)">` whose
`<pattern>` `<use>`s an `<image>` parked in `<defs>`. `<pattern>` and `<defs>` are both in
`NON_RENDERED_TAGS`, which is correct - widening it would offer every unused symbol and clip shape
in a file as a layer - so `patternFillImage` / `svgPictureTarget` (`src/assets/svgImport.ts`)
follow the chain instead, and the candidate collection now offers a pattern-filled shape beside a
plain `<image>`.

**The candidate and the binding target are deliberately different nodes**, which is the decision
the task asked to be made explicitly and written where the code lives:

- The mapping row is offered on the **RECT**. It carries the layer name ("Guest photo") and it is
  what the step's hover highlight can measure; the `<image>` in `<defs>` is named `image0_44_612`
  and has an empty bounding box.
- The field id binds the **`<image>`**. It is the only node whose href changing repaints the
  shape, and stamping `id="fN"` there makes the existing `setFieldValue` picture branch
  (`templates/shared/base.ts`) swap and restore it with **no new runtime** - which matters because
  that helper is emitted into every template, and `check-catalog-emit` confirms all 504 designs
  still emit byte-identically.
- Taking the id moves the references with it (`setIdKeepingRefs` in
  `templates/importedDesign/svg.ts`): the pattern's `<use>` points at the picture by id, so a
  bare rename would leave the rect painting nothing.
- One row per PICTURE, not per shape. Two shapes filled from one pattern paint one `<image>`, and
  only one node can hold the field id, so a second row would promise a swap that moved the first
  row's picture too.

**A second defect fell out of measuring the restore, and it was never Figma-specific.**
Illustrator and Figma both write the picture reference as SVG 1.1 `xlink:href`, while `update()`
remembers and rewrites the SVG 2 `href`. Measured over that runtime verbatim in the browser:
`data-orig-href` is remembered as `""`, so the swap paints (a browser prefers `href`) and CLEARING
the field writes `href=""`. The row's own promise - "an empty swap field keeps the picture you
drew" - was failing on the second click for **every** SVG picture field in the product, not only
the new Figma ones. `normalizePictureHref` moves the bound picture node to one spelling at bind
time, which also leaves one base64 payload in the export instead of two.

**The gate.** `e2e/import-svg-corpus.spec.ts` walks both exporters (the Figma file and the
Illustrator control) to the export door with the picture ticked on, then builds the project and
OPERATES the field - swap, then clear. The per-file sidecar loop now reads each file's
`imageFields` column as well as its growth answer, on the same walk; that column had only the
sweep reading it, which is how finding 2 sat unpinned while two sidecars stated the answer.

**Finding 5 lost a repro.** `figma-nested-frames-quiz-board` had been named in it since the first
sweep and was excluded from the gate on that basis. Walked by hand it arrives on `shrink`, exactly
what its sidecar states - so it was never a repro, and the exclusion was costing the gate a row it
should have been checking. Struck from the finding, from the doc's open "may be one shorter" note,
and from `GROWTH_FINDINGS`.

Docs: `docs/backlog/svg-import-sweep-findings.md` (finding 2 rewritten as fixed, the hand walk
recorded, finding 7 filed - see below), `docs/SVG_AUTHORING.md` (the layer-kind table now says a
picture filling a shape is a picture field too), `src/templates/importedDesign/AGENTS.md` (its
list of the markup edits an SVG import makes was missing two of them, and the candidate-is-not-
the-bound-node rule is now stated where that area's contract lives), and an owner-queue item at
`docs/acceptance/owner-queue/2026-09-01-figma-picture-swaps-on-air.md`.

## What is left

**Finding 7, filed not built** (`docs/backlog/svg-import-sweep-findings.md`): one element carries
one candidate marker, so a shape that becomes a picture leaves the panel-growth inventory. A Figma
card whose backplate is a photo-filled `<rect>` therefore offers its picture row and can no longer
be picked as the shape that widens. It is not a regression for anything drawn today - before this
change that shape was not offered as a picture at all - and **no corpus file draws it**, which is
why it is filed: the fix is to let one element hold two candidate roles, which changes the marker
contract every surface reads, and it wants a fixture that draws the shape first.

The two deliberately parked findings were not touched: finding 1 (Figma outlined-text recovery,
the owner's 2026-08-28 ruling) and finding 5's remaining five repros.

## What it cost

Six browser runs of the corpus spec, one 53-file affected run, and two throwaway probe specs
(deleted). No paid API calls. The one real friction is already fixed on `main`, just not on this
branch's fork point - worth recording as an independent repro rather than as an open gap.

**`preview_start` served the wrong checkout.** It reported port 5174 and actually started vite on
**5240**, which the port registry says belongs to `.claude/worktrees/new-session-64a3f6` - the
session's original checkout, not this worktree (5218, per `node scripts/dev-port.mjs` and
`.claude/dev-port.json`). Every observation there would have been of another branch's build, which
is exactly the failure the 2026-08-29 sweep recorded in its own report. Starting a server here by
hand was refused by `scripts/hooks/guard-command.mjs`, whose message at this fork point recommends
the tool that had just done the wrong thing.

So all browser observation in this session went through Playwright instead, which starts its own
server from the checkout the spec lives in - self-serialized as `node scripts/e2e-runs.mjs --wait
&& npx playwright test …`. That is what proved everything below.

**Session F landed the real fix while this was running** (`9eafa189`, on `main` since `e9cc60d8`):
`npm run dev:worktree` serves the checkout its own file sits in, on that checkout's reserved port,
and the guard's refusal now names it. This branch forked at `40a0b81f`, before that landed, which
is the only reason it was hit here. Nothing to do about it; the second, independent measurement of
the same numbers is the useful part.

## Verified

- `npm run build` green after every step, on this branch's own tree (the `[write-version]` stamp
  names `claude/e-svg-picture-road`, which is how the wrong-tree failure would have shown).
- `node scripts/check-catalog-emit.mjs` - PASS, 504 designs, byte-identical emit. This is the
  argument for not running the five rendered catalog sweeps `catalog:affected` proposes: it flags
  the FULL catalog only because it cannot attribute `src/assets/svgImport.ts` to designs, and the
  emit gate proves no design's code moved.
- `e2e/import-svg-corpus.spec.ts` - 15/15 on the final state, including the sidecar sweep over
  every corpus file that reaches the mapping step, both columns. Every row reconciles.
- `e2e/import-svg.spec.ts` and `e2e/import-svg-behaviour.spec.ts` - green alongside it (84 passed
  in the combined run).
- `npm run test:e2e:affected` - the change escalates to the 53-file sprint focus set: **578
  passed, 1 failed**, and the failure was mine and is fixed. Broadening the sidecar sweep to
  every accepted file walked `figma-outline-text-title-card`, which has no bound text and so
  lands on the re-export answer rather than the mapping step. The walk filter now keeps
  `textFields > 0` (what makes the step reachable) and only the COLUMNS carry their own
  exclusions, which is what the finding was about.
- CI on `d8491e4f` - green, **all nine E2E shards actually ran**, plus Factory gates, Build,
  Catalog calibration and the CI gate. CI on `d13871a1` - green, E2E 1/1 subset (that commit
  touched only the spec and docs, so the plan was one shard and the catalog gate was skipped).
- CI on `0f6b461f`, the review-and-simplify commit and the one that matters most here -
  **completed green, every job: Build, Factory gates, E2E plan, the Catalog calibration gate, all
  nine E2E shards, the CI gate and the combined report.** The landing job re-gates on the
  integrated sha in any case, and it will have to: `main` has moved fifteen commits since this
  branch forked, though `git merge-tree` integrates them cleanly.
- The picture really PAINTS, measured rather than inferred: the Figma rect renders a 41 x 41 box
  in the preview, the swap repaints it, and clearing restores the drawn picture pixel for pixel
  (screenshot comparison, in a probe spec that was deleted - a screenshot compare is the wrong
  thing to keep in a focus spec).
- The `xlink:href` restore defect was measured, not reasoned: `setFieldValue`'s exact runtime run
  over both spellings in a browser reported `origRemembered: ""` and `restored: ""` for the legacy
  one.

## UNVERIFIED

- **The Figma path under a real playout client.** Everything here is the studio preview and the
  export gate's verdict. Nobody has aired a swapped Figma picture through CasparCG, OBS or SPX.
- **A picture swapped from the operator UI rather than from `update()`.** The e2e drives the
  emitted `update()` directly, which is the SPX contract; the Content panel's filelist control
  was not clicked. The owner-queue item asks for exactly that.
- **A picture of a different aspect ratio.** Both fixtures embed a tiny square PNG. Figma's
  pattern maps the source into the shape's bounding box, so a 16:9 photo should letterbox inside
  a square slot the same way a plain `<image>` does - reasoned from the geometry, not measured.
- **`figma-duplicate-ids-scorebug` with a duplicated PICTURE.** The duplicate-id guard added to
  `setIdKeepingRefs` is reasoned from that fixture's shape and covered by no fixture that actually
  duplicates an image id. Same for the quote-in-an-id crash the escaping removes: the reasoning is
  Figma's documented naming, and no corpus file carries a quoted id.

Not unverified, but worth recording: the LOCAL catalog calibration gate never produced a verdict.
The `test:e2e:affected` run's second process died with Windows exit `3221225794`
(`STATUS_DLL_INIT_FAILED`) right after a 578-test suite on a RAM-bound laptop - a process that
never started rather than a failure. It was not re-run locally (a 25-minute job); the same gate
ran GREEN on CI for `0f6b461f`, which is where it belongs.

## Check

- `review: delegated` - the code-review skill, level `high`, returned six findings on this branch
  and this worktree's files (scope-checked against the phase-1 diff). Five were confirmed and
  fixed: an unescaped designer id interpolated into a CSS selector (a crash on Create project for
  a layer named with a quote, newly reachable because the rename now runs for every bound field,
  not only for colliding ids); a document-wide reference rewrite that would repoint the wrong node
  when an exporter duplicates an id; inverted `fill` precedence between the inline style and the
  presentation attribute; the picture-count gate silently inheriting the growth column's exclusion
  list; and two long tests missing `test.slow()`. The sixth is finding 7 above - the false comment
  it named was corrected, the behaviour was filed rather than changed.
- `simplify: inline` - the simplify skill returned fan-out instructions rather than a result, so
  per `.agent-workflows/check.md` the leg ran here. Three changes: `patternFillImage` was being
  followed twice per shape (once to filter, once to resolve) and now resolves once through
  `pictureNode`; the picture branch of the bind loop tested its own index twice; and the spec's
  local `createProject` was renamed `createFromWizard`, because `e2e/_create.ts` exports a
  `createProject` that builds a CATALOG design from a spec and never drives the wizard.
  `cssEscapeId` was left as its own two-character helper rather than reusing `CSS.escape` or
  `blocks/motionPresets.ts`'s `cssEscape` - the context is a quoted attribute selector, and
  `assets/` importing from `blocks/` would add a layer edge; the reasoning is now in its comment.
- `verify: inline` - see the Verified section. The one gate that did not produce a verdict is the
  local catalog calibration run, under UNVERIFIED above with what to read instead.

## One thing worth a decision

The picture field is a `filelist` pointing at `./images/`, like every other picture field. For a
Figma import that is the right SPX contract, but it means the operator's swap arrives as a PATH,
and the drawn picture it replaces is an embedded data URI. Nothing here is wrong - clearing the
field restores the data URI - but nobody has walked what an exported package does when the
operator's chosen file has to travel beside it. `docs/AGENT_SAVE.md`'s packaging conventions are
the place that answer lives, and it was out of scope tonight.
