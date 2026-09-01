# 2026-09-01 - session E - SVG picture road

Branch `claude/e-svg-picture-road`, off `40a0b81f`. Sweep finding 2 is closed: a raster placed in
Figma is now a bindable picture field an operator can swap on air, and clearing the field puts the
designer's own picture back.

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
- Taking the id moves the references with it (`setIdKeepingRefs`, `templates/importedDesign/svg.ts`):
  the pattern's `<use>` points at the picture by id, so a bare rename would leave the rect painting
  nothing.
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
picture filling a shape is a picture field too), and an owner-queue item at
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

Four browser runs of the corpus spec plus two throwaway probe specs (deleted). No paid API calls.
The one real friction was the harness gap the findings doc already names.

**`preview_start` served the wrong checkout, and the guard hook has no substitute for a worktree.**
`preview_start {name:"dev"}` reported port 5174 and actually started vite on **5240**, which the
port registry says belongs to `.claude/worktrees/new-session-64a3f6` - the session's original
checkout, not this worktree (5218, per `node scripts/dev-port.mjs` and `.claude/dev-port.json`).
Every observation there would have been of another branch's build. Starting a server in this
worktree by hand is refused by `scripts/hooks/guard-command.mjs`, for a good reason, and its
recommended alternative is the tool that just did the wrong thing. So all browser observation in
this session went through Playwright instead, which starts its own server from the checkout the
spec lives in - self-serialized with `node scripts/e2e-runs.mjs --wait && npx playwright test …`.
That works and it is what proved everything below, but it means **`preview_start` cannot be
trusted from a worktree session and nothing says so at the point of use**. Worth fixing in the
harness; the sweep's own note about this is a year of sessions old and still true.

## Verified

- `npm run build` green after every step, on this branch's own tree (the `[write-version]` stamp
  names `claude/e-svg-picture-road`, which is how the wrong-tree failure would have shown).
- `node scripts/check-catalog-emit.mjs` - PASS, 504 designs, byte-identical emit. This is the
  argument for not running the five rendered catalog sweeps `catalog:affected` proposes: it flags
  the FULL catalog only because it cannot attribute `src/assets/svgImport.ts` to designs, and the
  emit gate proves no design's code moved.
- `e2e/import-svg-corpus.spec.ts` - 15/15, including the full sidecar sweep over every accepted
  corpus file, both columns. Every row reconciles against its sidecar.
- `e2e/import-svg.spec.ts` and `e2e/import-svg-behaviour.spec.ts` - green alongside it (84 passed
  in the combined run).
- CI on `d8491e4f` - **green, and all nine E2E shards actually ran** plus Factory gates, Build,
  Catalog calibration and the CI gate.
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
  duplicates an image id.

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
- `verify:` see the Verified section above.
