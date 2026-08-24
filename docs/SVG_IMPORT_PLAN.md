# SVG import - your own graphic, playable

**Status: binding plan, owner-directed 2026-08-20 (north-star material, wanted working in weeks).**
Origin: the Yle demo. Their designer insight - **SVG is code** - names the gap our raster Import
Graphic cannot close: erase fails on textured art, and AI recreation produces "inspired by", never
the user's exact graphic. A layered SVG imported *verbatim* IS the exact graphic; binding its text
layers to data fields makes it a playable NoaCG template that exports to SPX, CasparCG, OGraf,
OBS, vMix like anything else. MXMZ (mxmz.com) sells precisely this workflow to 200+ channels
(Illustrator/Figma -> import -> layers auto-exposed -> JSON data bindings); we do it free, open,
and export-anywhere. See `docs/GOALS.md` ("the SVG road") and **`docs/COMPETITOR_MXMZ.md`** for
what they actually ship and where they stop.

**The user promise:** design in Illustrator, Figma, Inkscape or any SVG app; drop the file into
the Import door; your text becomes operator fields; the pixel-exact graphic goes on air.

**The designer-facing half is `docs/SVG_AUTHORING.md`** - how to draw and export a file that
imports well, per app, plus three ready-to-drop samples in `docs/svg-samples/` (live text, number
/ countdown / picture fields, and an outlined-text file). This plan is the engineering contract;
that page is what you hand somebody holding Illustrator.

---

## 1. Decision: inline the SVG verbatim, bind text nodes IN PLACE

Two architectures were weighed:

- **A. SVG as background + HTML overlay fields** (reuse the raster flow's placed-lines machinery,
  delete SVG text nodes instead of pixel-erasing). Robust text handling (wrap/fit/fonts all
  existing), but the replaced text is *re-rendered*, not the designer's - font metrics, kerning
  and effects drift, which breaks the exactness promise the feature exists for.
- **B. Bind the SVG's own `<text>` nodes** - give a chosen node `id="fN"` and let the standard
  `update()` write its textContent. The typography IS the designer's; nothing is redrawn.

**B is the architecture; A survives as the fallback for outlined text** (an SVG whose type was
converted to paths has nothing to bind - the recovery is: hide/delete that path group, place an
HTML field over its bounding box, exactly the raster flow's field machinery). This honors the
pillars: the SVG source is real code in `template.html`, visible in Advanced mode, no hidden
model.

**What stays verbatim:** everything. The SVG is inlined into the template HTML unchanged except
for (a) `id="fN"` added to bound nodes, (b) sanitization (§5), (c) a wrapper div for
position/scale in the 1920x1080 frame. No re-serialization through a DOM prettifier that reorders
attributes - byte-preserving edits, the way `blocks/` transforms already work.

## 2. Detection and mapping (no renaming ritual - the MXMZ lesson)

On drop, parse with `DOMParser` (`image/svg+xml`) and build the layer inventory:

- **Candidate text fields:** every `<text>` element. One `<text>` with multiple positioned
  `<tspan>`s (Illustrator multi-line) offers each tspan as its own candidate (ids are legal on
  tspans and `getElementById` finds them). Sample value = current textContent; numeric-looking
  sample proposes `ftype: number`.
- **Candidate image fields:** `<image>` elements (bind by swapping `href`).
- **Labels prefill from layer names.** Illustrator writes layer names as `id` (original in
  `data-name` when uniquified); Figma writes frame/layer names as `id` on groups. Nearest named
  ancestor group labels the candidate. **No naming convention is required** - but a
  `f:`/`field:` prefix on a layer name names the field and guarantees it is offered ON
  (optional power-user/org sugar, documented for Illustrator workflows). **The prefix is a
  guarantee, never a filter:** it used to mean "and nothing else", so a scorebug with one
  `f:Competition` layer arrived with six of its seven rows unticked and read as detection
  having failed. A picture, which defaults OFF because inside a design a picture is usually
  the artwork, is the one thing the prefix switches on.
- **Mapping UI** (new wizard step in the import door, replacing Prepare/Text for SVG files): a
  checklist of detected layers with live highlight-on-hover in the preview; toggle which become
  operator fields, edit labels, set sample values. Default: all detected text ON - the graphic
  should work with zero clicks. **The checklist is what the step is for, so it owns the fold**:
  the artwork is capped to a share of the window and made sticky beside the instruction rather
  than stacked above it (a full-frame design at the column's width is 435px tall and left one
  of seven rows inside a 1366x768 scrollport). Editing a sample writes it into that artwork the
  way `update()` writes it on air - the one place a real value can be tried at design size.
- **Zero text nodes detected** = outlined export. Say so honestly ("This SVG's text was converted
  to outlines...") with the two roads: re-export with real text (Illustrator: Type > SVG, not
  Outlines - the teaching moment), or the overlay fallback (§1.A).

**AI's role: none in v1, proposal-only later.** The raster import measured AI as unnecessary
(`scripts/import-suggest-audit.mjs`, 2026-08-16) and SVG is *more* structured, not less. If a
later phase wants semantic labels (mapping `id="Rectangle_3"` text to "Home team"), it is a cheap
text call proposing labels/ftypes through the existing `AnalyzeProposalPanel` pattern - a
proposal the user applies, never an authoring step. AI never authors state machines (owner rule).

## 3. The generated template

A new generator beside `src/templates/importedDesign/` (registered like `imp01`; the SVG variant
is its own graphic type so the derived machine/timeline stays the standard linear one):

- **HTML:** stage wrapper + the inlined `<svg>` (viewBox preserved; wrapper sized/positioned by
  the same fit-to-frame rule the raster import uses - full-frame art fills the frame, a lower
  third sits where its viewBox geometry puts it).
- **Fields:** standard `SPXGCTemplateDefinition` DataFields; `fN` -> the bound node, our one
  contract. `update()` is the shared runtime - `getElementById('fN').textContent = value` works
  identically on SVG nodes under SPX, CasparCG, OGraf and the browser output.
- **Text fitting:** SVG text neither wraps nor clips. The generated JS gives each bound node a
  BUDGET - the width of the text the DESIGNER drew - and a value wider than that is SHRUNK
  until it fits (comment-documented, deterministic, removable). Nothing is applied to a value
  that fits. **Shrink, never condense** (owner ruling, 2026-08-22): holding the drawn width
  with `textLength` + `lengthAdjust="spacingAndGlyphs"` distorts tracking AND glyph shapes, so
  one extra letter visibly broke the typeface - which is exactly the taste rule this section
  always claimed and the code did not follow.
  **The budget is measured from the drawn text, never from whatever is on screen.** A playout
  renderer replays its control log the moment the page exists, so the first value measured
  there is usually the operator's - and a budget taken from that can never be overflowed, which
  is how one file came to squish in the editor and run clean past the artwork on air. The drawn
  text is remembered as the page parses (before `update()` can be called) and the budget is
  re-MEASURED, not re-taken, once the real typeface has loaded.
- **THE FIT LADDER** (owner-ruled 2026-08-23, shipped, after the owner walked the hug): a value
  longer than the design was drawn for is answered in ONE fixed order - **fill the panel, grow it
  only where the author opted in, wrap into the room the design already has, shrink to the
  readability floor, then report the field.** The artwork is never reshaped to make copy fit and
  the copy is never cut to hide that it does not.
  Each rung was a measured defect on the owner's own walk:
  - **The budget was the DRAWN TEXT'S width, not the room.** A name drawn 402px wide inside a
    1040px banner began shrinking at its 403rd pixel with 588px of banner standing empty - and
    that same 588px gap survived every value, at every length, because it was never in the sum.
    The budget is now the shape drawn behind the line, out to a right margin mirroring the left
    inset. A line with no shape behind it keeps the drawn width, which is the honest fallback.
  - **The same wrong budget was what the HUG grew against**, so a banner started widening at the
    fourth character of a three-letter name - spending the growth before any of the design's own
    space. Growth now measures against the room.
  - **There was no floor**: a 400-character value shrank to 3.7px, which reads on air as the text
    having disappeared. It stops at 55% of the drawn size, the raster import's floor
    (`shared/textFit.ts` `FIT_MIN_RATIO`), and sets `noacgTextOverflow()` instead.
  - **Wrapping** uses only room the artwork already has: from the line down to the nearest thing
    drawn below it inside its panel. How many lines that is depends on the SIZE (a 112px board
    panel holds one 44px line and three 24px ones), so the ladder re-asks on every pass, and a
    block that does not fit loses a LINE rather than printing through the layer below it. A name
    with a role under it can never wrap; a question alone on a board wraps as it shrinks.
  - **`noacgTextOverflow()`** returns the field ids that could not be made to fit, and every
    operator surface where a value is typed reads it - see THE OVERFLOW WARNING below.
- **THE HUG** (owner-directed 2026-08-22, shipped): shrinking is right for a graphic that
  declares a STAGE (a quiz board, a scoreboard - `src/templates/AGENTS.md` "THE STAGE") and
  wrong for a lower third, where "the text should decide how big the banner is". An imported SVG
  has no category to read that from, so **the mapping step ASKS** - "when the text is too long",
  shrink (default) or grow, plus WHICH RECTANGLE grows, proposed as the widest one.
  **The default is fixed, and the question is not answered from geometry**, which was the shape
  of the original instruction: no measurement separates the two cases, and our own samples prove
  it - the lower third is drawn on a FULL-FRAME artboard while the scorebug is a small floating
  object, so "smaller than the frame = a banner" mislabels both.
  The runtime (`stretchRuntimeJs` in importedDesign/svg.ts) keeps the raster stretch's doctrine
  (`importedDesign/stretch.ts`): ONE measured deficit - how far the widest bound line inside the
  panel runs past the width it was drawn at - widens the picked rectangle, everything drawn past
  its right edge travels with it, the growth stops at the frame's 4% safe margin, and the shrink
  above answers only what the cap could not give.
  **What v1 handles, said out loud:** a RECTANGLE (a panel drawn as a freeform path has no width
  to change), growing RIGHTWARD, with start-anchored text inside it - the lower third everybody
  draws. Everything is measured in screen px and converted back through each element's own CTM,
  so a transformed group between the root and a layer is handled; a rotated or skewed one is
  left alone rather than moved wrongly. A follower travels by its transform ATTRIBUTE, so a
  layer the timeline animates in its own right (a per-layer stagger) stays where its animation
  puts it.
- **THE OVERFLOW WARNING** (shipped 2026-08-23) - the second half of the owner's ruling: copy
  past the floor is **warned about, never clipped and never allowed to reshape the artwork**.
  The runtime names the fields (`noacgTextOverflow()`); the surfaces where a value is TYPED say
  so, in one vocabulary (`control/controlModel.ts` `overflowNote` + `OVERFLOW_FIELD_MARK` /
  `OVERFLOW_FIELD_HINT`): one summary line at the top of the cue editor and a mark on the box
  itself, because a summary alone does not say which of six inputs to shorten.
  - **It rides the machine-state answer**, not a channel of its own. Every operator surface
    already asks its graphic for state once or twice a second, so the reply carries `overflow`
    beside `state` (`preview/previewProtocol.ts`, `output/stage.ts`, and the exported graphic's
    BroadcastChannel reply in `control/receiverScript.ts`). A template that answers one of the
    two questions and not the other still answers the one it has.
  - **The monitor showing the cue is the one asked.** The in-app cockpit and the hosted page
    both keep PREVIEW's report apart from PROGRAM's: an editor pointed at the live cue must warn
    about what is on air, one pointed at a staged cue about what a TAKE would put up. Reading one
    for both would warn about a cue nobody is typing into.
  - **All five surfaces in the same change** (docs/CONTROL_PANEL_PARITY.md §4): the in-app
    production page, the hosted control page, the exported production controller, the exported
    standalone `controlpanel.html`, and `#/control/<id>`. The exported controller asks its own
    monitor frames directly - they are same-origin pages it built, and the relay log is a COMMAND
    log with no report direction. Opened over `file://` the frames are opaque and no warning is
    available, which is where that surface stood before.
  - Pinned by `e2e/import-svg-behaviour.spec.ts` ("copy the design cannot hold is WARNED about"),
    verified red first by making the document report nothing.
- **Animation:** the standard marked ANIMATION region animating the wrapper (entrance/exit
  presets work day one; the timeline dock reads the CODE as always). Phase 2: per-layer stagger -
  top-level named `<g>`s offered as animation units.
- **Fonts (the hard part, §4).**
- **Exports:** free. The template is an ordinary `SpxTemplate`, so all six targets + whole-show
  export + the OGraf conformance gate apply unchanged. The SVG travels inline in the HTML - no
  asset-path question, single-file targets (CasparCG) stay single-file.

## 4. Fonts - the exactness risk that needs honesty

An SVG references families by name (`font-family="Gotham"`). If the playout machine lacks the
font, the exact graphic silently isn't. The import must:

1. Inventory every `font-family` in the SVG.
2. Match against bundled faces (`src/model/fonts.ts`) and offer the existing Google Fonts
   design-time fetch (`src/model/googleFonts.ts` - embeds as an asset, no CDN in emitted code)
   or a font-file upload for licensed faces.
3. Emit `@font-face` for every resolved family exactly as the raster import's custom-font path
   does; **warn, per family, when unresolved** ("previews may differ on air") - never block, the
   designer may know the renderer has it.

Outlined text has no font problem - which is why the fallback road (§1.A) must exist rather than
being treated as a defect.

## 5. Sanitization and validation

Imported SVG is untrusted input entering srcdoc previews, exports, and (later) community
sharing. On import, strip: `<script>`, event-handler attributes, `<foreignObject>`, external
`href`/`xlink:href` (external images offered for inline-fetch at design time or dropped with a
message - emitted code never references the network, pillar 3). `validation/validateTemplate.ts`
stays the export gate; add SVG-shaped checks there (bound ids present, no external refs) so the
gate - not the importer - is authoritative.

## 6. Phases

- **P1 (the promise, ~1-2 weeks):** .svg accepted at the Import door (today it dies at the
  raster size check with an honest message - `ImportDesignStep.tsx`); parse + inventory; mapping
  step with live highlight; generator with in-place binding, font inventory/matching, overflow
  fit; entrance/exit presets; Finish -> production/export. E2E: an Illustrator-shaped fixture
  SVG (layers, tspans, data-names) walks door-to-export; ograf-conformance covers the new shape.
  Acceptance: a student takes a layered SVG to air, unchanged pixels, in one session.
- **P2:** outlined-text fallback (delete group + overlay field), `<image>` binding, per-layer
  animation stagger, number/clock ftypes, org boilerplate story (an SVG imported once, saved as
  a shared base others restyle - couples with `docs/WYSIWYG_PLAN.md`).
  **Status 2026-08-21 - shipped:** `<image>` binding (filelist fields, empty restores the
  drawing); a numeric-looking sample proposes `ftype: number`; the OUTLINED-TEXT fallback -
  `assets/svgImport.ts` inventories every `<g>` of two-plus glyph shapes (path/polygon only)
  as an outline candidate, offered OFF in the mapping step, whose box/cap-height/fill are
  MEASURED on the step's own inline render (`MapSvgFieldsStep` `measureOutline`: the most
  populated cluster of shape bottoms is the baseline); the generator HIDES a ticked group
  (`imported-design-outlined` class + one `display: none` rule - kept in the file, never
  deleted) and `draft.ts withSvgOutlineFields` places the stand-in through the raster flow's
  `addPlacedLine` (same sizing rules as the erase seed). The SVG's own text fit is
  `fitSvgText` with its own update() hook, so the placed line's `fitPlacedText` shrink runtime
  can coexist; `addPlacedLine` inserts after `</svg>`, never inside it. The per-layer stagger
  is `design-stagger` (designPresets.ts), offered by svg01 only, emitting an ARRAY of the
  top-level named groups (`PresetConfig.layers`, `structure.ts svgLayerSelectors` - a hidden
  outlined group is not a layer) with `stagger:` - the shape the data importer turns into
  per-layer keyframe offsets. The CLOCK ftype is a per-row "Binds as" choice on any
  clock-shaped layer (`looksClock`: M:SS / H:MM:SS) - Text (default; "22:40" may be the time of
  day) or COUNTDOWN: the node takes the `imported-design-clock` class (never the field id - update()
  would overwrite the readout), the field becomes the length in minutes (`clockSampleMinutes`,
  "22:40" = 22.67) in a hidden `noacg-data-source` holder, the shared `templates/shared/clock.ts`
  runtime rides outside the region, and the data gains `startClock`/`stopClock` step calls (a
  `convertToDataRegion` refine - the design presets know nothing of clocks). One countdown per
  graphic (one shared runtime, one display). **Open:** the org boilerplate story.
- **Detection hardening (2026-08-21/22)**, measured against files shaped the way Illustrator,
  Figma and Inkscape really export - every item below was a wrong answer the importer gave, and
  each one now has its own case in `e2e/import-svg.spec.ts` (mutation-tested):
  a MERGED field keeps its place - Illustrator puts the position on the RUNS, so the `<text>` a
  kerned headline binds has no `x`/`y` of its own and the first `update()` (which replaces the
  runs) sent the line to the SVG origin, reading as a field that changed nothing; the first
  run's position is hoisted onto the text at import (`hoistRunPosition`);
  a `<tspan>` is a LINE or a KERNED RUN and only the measured GAP tells them apart (`groupRuns`,
  with `fontSizeResolver` reading attribute / inline style / class rules, CSS-initial 16 when
  nothing says); Inkscape's `inkscape:label` is read and an editor-generated serial id
  ("text123", "layer1") counts as unnamed; hidden layers and `<defs>`/`<symbol>` text are not
  offered (and a PAINTED symbol says why); `<flowRoot>` is called out as invisible; outline rows
  are RANKED by whether the measured shapes read as a line of type, never filtered; a PostScript
  font name resolves to its family and weight (`fontLookup`) and the bundled or fetched face is
  declared under the name the artwork asks for; `<textPath>` binds the path run, not the `<text>`
  around it; samples collapse source whitespace unless `xml:space="preserve"`; repeated layer
  names are numbered. The designer-facing half of all of it is `docs/SVG_AUTHORING.md`.
- **P3 (opt-in):** AI label proposals; Figma-specific niceties; SVG *export* of a NoaCG graphic
  is explicitly out of scope.

## 6a. The imported SVG is a STARTING DESIGN, not a binding step (owner, 2026-08-23)

The step ships as a binding form: tick the layers the file already has. That framing assumes the
file contains a layer for everything the show needs, and it is the assumption the owner broke.
**The imported SVG is a fixed 1920x1080 STAGE, not immutable artwork** - elements inside it may
resize and reposition, and the walk is: bind what exists, replace what was outlined, ADD what was
never drawn, and progressively declare LAYOUT RELATIONSHIPS between them.

**Never universally elastic.** The author says which element may grow, in which direction, how
far, and what travels with it. A board and any deliberately fixed composition stay fixed. AI may
later PROPOSE a relationship ("this rectangle is probably the text background"); it is never
required for the feature and never participates in the runtime fit.

### The ordered road (owner-ruled 2026-08-23; the order is the ruling, not a preference)

1. **ONE CANVAS.** Two canvases on the mapping step were two answers to one question and only the
   preview could answer it: the inline render has no runtime, so it showed a value the ladder had
   already wrapped and shrunk as clipped and running off the artwork - at three times the area of
   the truthful preview beside it (measured, 1366x768). The inline render survives as a HIDDEN
   node for `measureOutline` (that code needs the artwork RENDERED, not VISIBLE); the hover
   highlight moves onto the preview through the rect channel the editor canvas already uses
   (`preview/canvasControlProtocol.ts`). No canvas EDITOR is committed to by this.
   **Status 2026-08-23 - shipped.** The markup renders off screen at its own width (so
   `measureOutline`'s k is 1); the preview keeps the import-time `data-noacg-candidate` markers
   under ONE preview-only build flag (`WizardOptions.previewMarkers`, the precedent being
   `buildDraftTemplate`'s `stretchDemo`), scoped to the mapping step so the Finish step's preview
   is still byte-for-byte the created code; a REPLACED outline group gives its marker up to the
   live stand-in that replaces it, so exactly one node ever answers a hover. The step also stops
   wearing `.wz-body-working` - its left pane is a form, and the class was clamping the preview
   to ~275px. Measured at 1366x768: the preview goes 260x146 -> 614x345, and all seven of the
   scorebug's rows are on screen at once (three before). The step's copy is unchanged: the
   markup still ships verbatim, so "airs exactly as drawn" is still true - it gets reworded at
   step 4, where a declared element can move.
2. **ONE FITTING SYSTEM** - the enabling refactor, and **deliberately scoped small** (owner:
   "keep step 2 tightly scoped as an enabling refactor rather than allowing it to become a larger
   field-system cleanup"). See §6b.
3. **ADD FIELD** - drag on the canvas, a real editable field where the file drew nothing. Cheap
   once 2 lands: `addPlacedLine` already emits it; this is the gesture plus the canvas from 1.
   **Status 2026-08-24 - shipped.** "＋ Draw a field on the artwork" arms a marquee on the
   preview; the box comes back as FRACTIONS of the artwork's own rect (`WizardPreview` never
   learns what a design px is) and the mapping step turns it into a `DesignFieldSpec`, which
   `buildDraftTemplate` already applied for this category - so the drawn line is an ordinary
   placed field from birth and the preview, the editor and every export agree by construction.
   Three decisions worth keeping:
   - **A drawn field is a `shrink` line, never a `wrap` one.** `applyPlacedFieldSpecs` gives a
     dragged box CSS wrap, which is right on RASTER artwork and wrong here: the ladder measures
     `data-fit="shrink"` (§6b), so a wrapping line would be the one field the operator's
     too-long warning cannot see - the defect step 2 just removed, re-entering by a new door.
     `DesignFieldSpec.fit` carries the answer and raster keeps its default.
   - **The drawn box IS the type's em box** (`lineHeight: 1`), so the numbers dragged are the
     numbers in the emitted rule. A CLICK is a drag of no size and reads as "put a field here",
     with a field-shaped default - never a two-pixel field nobody can see or select.
   - **The artwork is tracked for the whole step, not only while armed.** Its rect arrives on
     the document's next FRAME, so arming the channel at the moment of the gesture left the
     first drag after the button with nothing to measure against, and the field silently did
     not appear.
   The step reports its drop HANDLER up rather than a flag, because only it holds the SVG - and
   that handler's identity changes with every keystroke, so it lives in a REF with a boolean in
   state. Held as state it made every report a render and React stopped the wizard with
   "Maximum update depth exceeded" **while every assertion still passed**, which is why the
   loop has an assertion of its own in `e2e/import-svg.spec.ts`.
4. **VERTICAL GROWTH** - the rung the owner values most. See §6c.
5. **THE CANVAS AS A CONTROL SURFACE** - click a layer to bind it, click a rectangle to make it
   the growing panel, drag its direction. The relationship set from 4 stops being
   dropdown-authored. This is the canvas-editor question proper and is taken deliberately.

**Why 2 before 4, though 4 is the higher-value feature** (owner: "I don't want vertical growth
implemented against a field distinction we're about to remove"): the growth half - moving a panel
and reflowing followers - is DOM rects and does not care what kind an element is, but the
*wrap-into-the-new-height-then-shrink* half is the FIT, and the fit is exactly where the two kinds
diverge today. Built before 2, it ships twice and one copy is thrown away.

## 6b. Step 2 - ONE FITTING SYSTEM, and where its line is

**The defect.** An imported SVG can carry TWO fit runtimes at once, and `svg.ts` says so out loud
("both can coexist"):

- **bound SVG text** (a `<text>`/`<tspan>` in the file) -> `fitSvgText`, THE LADDER: room
  measured from the shape behind the line, wrapping into the drawn height, the 55% floor, and
  `noacgTextOverflow()`;
- **placed text** (an outlined-text stand-in today, a newly added field tomorrow - `addPlacedLine`
  emits an HTML layer AFTER `</svg>`, never inside it) -> `fitPlacedText`
  (`templates/shared/textFit.ts`): modes `overflow`/`wrap`/`shrink` and the same 55% floor, but
  **no room measurement, no height check, and no overflow report**.

It is latent on a plain import and bites exactly on the graphics this road extends. It is already
costing something real: **the operator overflow warning covers bound SVG text and goes silent on
an outlined-text field**, because `fitPlacedText` has no report to ride.

**IN scope.** One fit per imported-SVG graphic: placed lines in an SVG design are measured and
fitted by the ladder, one hook in `update()` instead of two, and the warning consequently covers
all three text origins. The real design work is the ladder's ROOM rule for a placed line - it has
no shape drawn behind it (it was placed on empty artwork, or over shapes now hidden), so the
honest fallback is its own slot, the way a bound line with no shape behind it keeps its drawn
width.

**THE ROOM RULE FOR A PLACED LINE** (settled 2026-08-24, before the refactor was written - it is
the one decision in step 2 that is design and not mechanics):

> **A placed line's room is its own SLOT: the width its wrapper declares.** Nothing was drawn
> behind it - it sits on empty artwork, or over shapes the template now hides - so there is no
> shape to measure a margin from, and the slot is the only statement anybody actually made about
> how much room the line gets.

Three things make the slot the honest answer rather than merely the available one:

- **It is AUTHORED, not inferred.** The slot is measured at placement from the outlined group's
  own box (`components/wizard/draft.ts`), or from the artwork's edge for a field added on empty
  design, and the canvas resize handle re-states it (`blocks/designLayout.ts` `setLineFit`).
  Everywhere else in this ladder an authored value beats a found one - the panel that grows is
  PICKED, never guessed (§3) - and a container search that overrode a slot the author had just
  dragged would break the resize handle to obey a rectangle nobody pointed at.
- **It mirrors the bound line's fallback exactly.** A bound line with no shape behind it keeps
  the width it was DRAWN at; a placed line keeps the width it was PLACED at. Same sentence, same
  reason: measure what the design said, never what happens to be on screen.
- **The slot is a WIDTH, so a placed line does not wrap.** Wrapping in this ladder is only ever
  allowed into room the artwork already drew - from the line down to the nearest thing below it
  inside its panel. Nothing under a placed line was drawn for it, so there is no such room to
  claim, and reflowing into it would print through somebody else's layer. A placed line fills its
  slot, shrinks to the 55% floor, and is then REPORTED - which is the half that was missing.

The ladder therefore takes over exactly the lines `fitPlacedText` had (`data-fit="shrink"`, the
mode every placed line is born in). A line the author switched to `overflow` still runs free and
a `wrap` line still reflows in CSS, both unreported, because both are the author saying the cap
does not apply - that vocabulary is out of scope below and unchanged.

**OUT of scope, deliberately** - each of these is the "larger field-system cleanup" the owner
refused, and none of them blocks step 4:

- the RASTER import path keeps `fitPlacedText`. It has no SVG, no `svgFitRoom` and no panel;
- the `lineFit` vocabulary (`overflow`/`wrap`/`shrink`) as an editor-facing control;
- moving placed lines INSIDE the `<svg>`. Tempting - it would make them literally the same kind -
  but it changes the emitted markup shape, the registry parts, `addPlacedLine`'s insertion
  contract and every saved template;
- any canvas gesture, any relationship model, any growth.

The FIELD contract needs no work and never did: all three origins are already `id="fN"` plus an
SPX DataField, so `update()` binds them identically. The split is *where the element lives* and
*which runtime measures it* - a smaller gap than "one field model" sounds.

## 6c. Step 4 - VERTICAL GROWTH, and what it has to be

**Wrapping may increase the height of a designated container and reflow what is attached to it,
before the type shrinks.** Deterministic layout, never AI.

- **The relationship set is DATA, versioned.** Today's `svg.stretch` is a degenerate one-row
  version and is not even data: it marks exactly ONE element `.imported-design-panel`
  (`querySelector`, singular), hard-codes the direction rightward, caps at a constant
  `PANEL_SAFE = 0.04`, and DERIVES its followers at runtime. What the owner described - element,
  direction, distance, followers, more than one of them - is a persisted format, so principle 6
  applies: it carries a version and a breaking change ships its migration in the same commit. It
  is emitted as a readable, commented table the runtime loops over. Emitted as a HIDDEN model it
  would be the second scene model the architecture forbids; emitted as data the code reads, with
  the code still the truth, it is not.
- **Followers are DECLARED, geometry only PROPOSES.** Horizontal growth gets away with deriving
  them ("anything past the right edge") because that guess is usually right. Vertical does not:
  growing a panel down moves everything below it, and "below it" contains things that should stay
  (a strap pinned to the frame bottom) and things that should stretch rather than move. No
  geometry rule separates those - the same shape of problem as the shrink-vs-grow default, which
  §3 already decided not to infer. So the derived set becomes the PROPOSAL the author edits.
- **ACCEPTANCE CRITERION, explicit (owner): deterministic convergence across editor, export and
  SPX.** Wrap and grow are circular - line count depends on type size, available height depends
  on growth, growth depends on line count - and the fit runs INSIDE the template, so the same
  values must settle on the same geometry in the app preview, in an exported package, and in the
  `/output` renderer. Testable as: identical measured geometry (panel box, per-field size, line
  count, overflow set) on all three; the fit IDEMPOTENT (running it twice changes nothing); and
  independent of arrival order, which is the trap §3 already paid for once - the first value
  measured must never become the budget.

**One copy change rides along:** the mapping step promises "Your artwork airs exactly as drawn."
The markup does stay verbatim, but the sentence becomes a half-truth the moment a declared
element can move, and it needs rewording in the same change.

## 7. What this is NOT

- Not a replacement for the raster import - photographs and flattened PNGs keep the erase flow.
- Not an SVG animation editor - motion stays NoaCG's (presets/timeline), the SVG is the look.
- Not SMIL support - `<animate>` elements are stripped with a note (deterministic playout owns
  time; a wall-clock SMIL loop would also fail the OGraf post-production gate).
