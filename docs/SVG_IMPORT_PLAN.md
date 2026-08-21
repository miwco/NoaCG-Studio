# SVG import - your own graphic, playable

**Status: binding plan, owner-directed 2026-08-20 (north-star material, wanted working in weeks).**
Origin: the Yle demo. Their designer insight - **SVG is code** - names the gap our raster Import
Graphic cannot close: erase fails on textured art, and AI recreation produces "inspired by", never
the user's exact graphic. A layered SVG imported *verbatim* IS the exact graphic; binding its text
layers to data fields makes it a playable NoaCG template that exports to SPX, CasparCG, OGraf,
OBS, vMix like anything else. MXMZ (mxmz.com) sells precisely this workflow to 200+ channels
(Illustrator/Figma -> import -> layers auto-exposed -> JSON data bindings); we do it free, open,
and export-anywhere. See `docs/GOALS.md` ("the SVG road") and the competitor entry there.

**The user promise:** design in Illustrator, Figma, Inkscape or any SVG app; drop the file into
the Import door; your text becomes operator fields; the pixel-exact graphic goes on air.

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
  `f:`/`field:` prefix on a layer name auto-marks it editable (optional power-user/org sugar,
  documented for Illustrator workflows).
- **Mapping UI** (new wizard step in the import door, replacing Prepare/Text for SVG files): a
  checklist of detected layers with live highlight-on-hover in the preview; toggle which become
  operator fields, edit labels, set sample values. Default: all detected text ON - the graphic
  should work with zero clicks.
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
- **Text fitting:** SVG text neither wraps nor clips. The generated JS records each bound node's
  original bbox width at load; when a new value overflows it, apply `textLength` +
  `lengthAdjust="spacingAndGlyphs"` capped at that width (comment-documented, deterministic,
  removable). Never distort by default - only on overflow, mirroring the raster flow's
  shrink-not-condense taste rule.
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
- **P3 (opt-in):** AI label proposals; Figma-specific niceties; SVG *export* of a NoaCG graphic
  is explicitly out of scope.

## 7. What this is NOT

- Not a replacement for the raster import - photographs and flattened PNGs keep the erase flow.
- Not an SVG animation editor - motion stays NoaCG's (presets/timeline), the SVG is the look.
- Not SMIL support - `<animate>` elements are stripped with a note (deterministic playout owns
  time; a wall-clock SMIL loop would also fail the OGraf post-production gate).
