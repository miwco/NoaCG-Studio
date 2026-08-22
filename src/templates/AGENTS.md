# src/templates - the wizard catalog and template contracts

Loaded alongside the root AGENTS.md when working in this directory (Claude reads it via this directory's CLAUDE.md import; Codex reads it directly). Keep it accurate. Read
docs/DESIGN_LANGUAGE.md before generating or judging templates. After template changes, run the
catalog sweep for the affected category (root AGENTS.md, "Verifying changes").

**ADDING A DESIGN MOVES THREE BASELINES, and the five catalog gates only cover one of them.**
`scripts/overflow-baseline.json` is re-recorded by the overflow sweep; `e2e/catalog-baseline.json`
and `e2e/catalog-render-baseline.json` are re-recorded by their own spec:

```bash
UPDATE_CATALOG_BASELINE=1 UPDATE_RENDER_BASELINE=1 npx playwright test e2e/catalog-baseline.spec.ts
```

**`e2e/catalog-baseline.spec.ts` is not in `playwright.catalog.config.ts`**, so every local
catalog gate can pass while CI's full plan goes red on it - which is exactly what happened on
2026-08-19 to a nine-design branch with four green catalog runs behind it. The healthy diff is
purely additive: ids added, nothing existing changed. Details: docs/VERIFICATION.md.

**A DESIGN'S NAME IS ITS OWN - no two may share one**, and the same spec holds that (both names:
the variant's, which is the Browse card, and the created template's, which is what a production,
a rundown and an export folder carry). Export already survived a collision by suffixing the
second graphic; the user never did - Browse offered two identical cards with nothing to choose
between. Five pairs had drifted together by 2026-08-19 (bug05/lt54, card30/pi01, ig38/tk13,
tt01/ig03, fr03/qz05), every one of them a later design landing on an earlier one's name. When
a new design's name is taken, rename the NEW one; renaming a shipped design moves its baseline.

blank.ts + the catalog, resolved through catalog.ts (CATALOG, variantsFor/variantById).

**structuralAnchor.ts** - the one table answering "does a catalog structure carry this intent,
and which one": the family words, `resolveAnchor`, `structuralFit`, and `anchorsSatisfiedBy` /
`variantSatisfiesAnchor` (what a VARIANT is, for the satisfaction check). It lives here, not in
src/ai, because TWO layers need the same answer and neither may import the other - the AI's
ROUTER asks before the design call (adapt vs create) and `validation/structuralIntentCheck.ts`
asks afterwards (is this the graphic that was asked for). A second copy is how those two come to
disagree. Everything resolves LIVE against the registry and catalog, so catalog growth updates
routing and satisfaction by itself: adding a design can CHANGE a route, which is why
e2e/creative-routing.spec.ts runs on changes here.

**kit.ts** - what a kit CONTAINS, resolved once for every consumer: the pack's types through
the (type x family) matrix PLUS its `extras`. Both halves are the kit - a caller reading only
`resolvePack` builds a kit missing its extras while still counting them, which is exactly the
bug the wizard's kit step shipped with. It lives here rather than in packs.ts because that
module deliberately does not import the catalog it is a view over.
`kitChoices(pack, family)` widens that into what the picker OFFERS - the pack's contents, then
every other graphic type whose cell resolves ("start from a genre preset, then edit the set") -
and `kitSelection` resolves a ticked set back to `KitItem[]`. Every offered row is asked
through `resolvePack`, the same resolver create runs, because the matrix is not full and the
widening is exactly where a row that throws on Create could appear. A choice's KEY is the
graphic TYPE id (or `extra:<designId>`), never the resolved design id and never an index: the
design changes when the look does, so either of those would silently re-tick the set the
moment the user changed the look.

**packs.ts** - the PACK taxonomy (docs/PACK_TAXONOMY.md): a pack is a curated type-subset in a
default family, PURE CONFIG over the types x families matrix; the 60 reference formats each map
to exactly one pack. `scripts/factory.mjs` validates the config on every run (cells resolve,
extras exist, formats covered exactly once) - edit packs.ts and the doc together.
**The matrix is full across FOUR families, not six** - and since 2026-08-08 those four are
COMPLETE, so every pack resolves in every one of them (docs/KIT_MATRIX_GAPS.md; before that day
four packs were stuck in two looks each). Editorial covers 6 types and cinematic 5: real style
families with focused information systems and Browse chips, but BROWSE families rather than KIT
ones - no pack resolves into either, and filling them for kits is ~118 designs apiece. The cell
gate only tests a pack's OWN declared family, so it cannot catch a hole in the other five:
anything re-resolving a pack must MEASURE which families work (`familiesFor` in
wizard/steps/KitPicker.tsx), never assume.
`docs/KIT_MATRIX_GAPS.md` is the standing gap report - the core six a kit owes a show, which
designs no kit can reach, and why that last number is a kit-model question rather than a
drawing one.
**Before adding a design, read `docs/CATALOG_VARIETY.md`.** It measures what the catalog already
repeats, off the EMITTED code rather than the declared axes: the style family predicts three of
the fourteen decisions a viewer can see (blur, skew, radius) and the graphic CATEGORY predicts the
rest, so a design that varies only its family is a re-skin. `node scripts/catalog-sameness.mjs`
prints a design's distance to its nearest catalog neighbour; under 0.25 is a near-duplicate.
`node scripts/palette-freedom.mjs` answers the other half - whether a design can take a palette it
was not drawn in.

## Discovery metadata (the Browse step's facets — docs/TEMPLATE_TAXONOMY_PROPOSAL.md)

- **meta.ts** - the DECLARED sliver: per-type and per-variant graphic category / subtype /
  structures / field semantics, with a SINGLE-VALUED per-old-category fallback. Resolution
  order: `VARIANT_META[id]` → `TYPE_META[typeId]` → `CATEGORY_DEFAULT_META[category]`.
  `AssemblerId` (model/wizard.ts, renamed from `TemplateCategory` 2026-08-11) stays the
  ASSEMBLER/routing id, never rendered in UI; the graphic category is presentation metadata
  on top — no file moves, no value renames.
- **templateMeta.ts** - the DERIVED bulk, memoized per variant: field counts off the compiled
  schema (`visible` excludes `HIDDEN_CONFIG_FIELDS`; buckets match the reachable range by
  INTERSECTION), capabilities (declared extras ∪ schema/preset derivation), placement
  (coverage class → placements), motion (the per-preset table in model/taxonomy.ts),
  complexity, and pack-derived programme relevance (a format's pack contains any type whose
  graphic CATEGORY matches — category-level so unclaimed classics rank like their typed
  siblings; `relevance: 'all'` categories match everything, ranked below genuine hits).
- **search.ts** - the Browse engine: strict facets AND, choices within a facet OR, programme
  format RANKS ("Best for" / "Also works") and never hides, phrase-first alias expansion
  (aliases may fan out across categories), field-weighted token index,
  `mostRestrictiveFilter` for the zero-result escape. Facet values without catalog mass are
  not offered (`offered*` helpers). `BrowseContext` is the second argument - ambient
  RANKING input the user never chose (today: the saved brand's family, a deliberately small
  boost that a genuine programme match always outranks), kept out of `BrowseFilters` so it
  can never grow a chip or be cleared by Clear-all.
  **It returns the WHOLE result and the step renders a PAGE of it.** `browseTemplates` has no
  limit argument and must not grow one - the total is what the step reports ("Showing 12 of
  82"), and a filter's honest effect is a number the engine has to know in full to produce.
  Paging is `BrowseStep`'s, over `best` then `also`, reset by any change to the filters or the
  sort.

**THE STOREFRONT'S SHAPE** (re-design/handoff.md §2b, the binding description of what these
facets are DRAWN as - the taxonomy proposal §12 describes the same facets in their original
tile-wall presentation, which no longer ships):

- **The lead dropdown offers the TEN CATEGORY GROUPS** (`browsableGroups` over
  `CATEGORY_GROUPS`, model/taxonomy.ts — user-facing shelves derived from the catalog's real
  composition), each with its live count; the selected group's MEMBER CATEGORIES render as a
  chips row (`.wz-browse-cats`) below it, at most four, only when the group has more than one.
  The categories themselves grew to 27 and stayed the machine vocabulary (search aliases, meta,
  AI retrieval, the factory) — 27 rows was the wall the original one-category-dropdown decision
  was already fleeing at 22, so the user-facing list is the group now. A group NEVER selects
  behaviour — playout controls generate from the machine + fields inside the template
  (docs/CONTROL_LAYER.md), and nothing at playout reads a category or group.
- **The style families stay CHIPS** and stay in the lead row - six short answers picked by
  feel and re-picked often. Everything else (programme, field counts, structures,
  capabilities, motion) is behind ONE Filters disclosure, closed by default, with the active
  count on it.
- **The results are a first page plus "Show 12 more"**, and the step states both numbers.
  Rendering all 429 matches was 30,215px of scroll; lazy iframes made that cheap to paint and
  no easier to read.
- **A named design is reached by SEARCHING**, not by scrolling to it - which is what the e2e
  helpers `pickDesign` / `chooseType` (`e2e/_browse.ts`) encode, and why facet specs assert
  the count line (`data-testid="wz-browse-count"`) rather than counting cards: a card count
  measures the page size and would read 12 for every filter leaving twelve or more.
- The id registries (families/formats with verbatim sheet names, the 27 graphic categories
  and their ten groups, structures, semantics, capabilities, placements, motion
  intensity/styles, style aliases) live in **src/model/taxonomy.ts**; display labels there,
  never in stored ids.

## Shared assemblers (every category builds on these)

- **shared/base.ts** - generic assembler pieces: :root vars, zones, auto-fit, runtime scaffold.
- **shared/logoSlot.ts** - the shared OPTIONAL logo slot every `logo: 'optional'` design inherits
  unless it hand-authors its own (`designHasLogoSlot`). **On a LOWER THIRD it places the mark
  BESIDE the words, never above them**: measured 2026-08-14, the leading-row form grew straps up
  to 83% taller - and a strap's height is the one dimension it cannot spend. Cards keep the
  leading row, where a mark above a heading is ordinary. Two rules the fix bought, both binding on
  anything that injects markup into a design it cannot see: **inject as the LAST child** (a first
  child renumbers every `nth-child` selector the design wrote about its own children - lt02 put
  the name under its underline), and **cap the mark's height rather than fixing it** (a fixed
  height hands a portrait crest the power to set the strap's height through its own aspect).
  **A strap gathers the design's own children into one `.{prefix}-lockup` div**, so the box holds
  exactly two items in one row. That is not tidiness: the first version left them loose and gave
  the mark `grid-row: 1 / -1`, which is a NO-OP against a rule that declares columns only (a
  negative row line counts back from the EXPLICIT grid, and with no row track `-1` resolves to
  line 1). There is no count-free way to span an unknown number of implicit
  rows, so the wrapper removes the rows from the question; with it, a crest costs a strap ZERO
  height and sits at offset 0 on all 24 designs. Two rules from the same measurement: **the clear
  space is the mark's own MARGIN, never the box's `column-gap`** (a track is charged its gap even
  when nothing is in it, so an empty slot shifted the words 26px), and the lockup takes
  `row-gap: inherit`, which is what keeps a design that spaced its lines from its own box spacing
  them identically. **`designHasLogoSlot` MISSES NOTHING** - measured 2026-08-15 over all 24
  mark-capable lower thirds with a real mark: only six (lt02, lt05, lt11, lt15, lt25,
  lt32) take the shared slot, and only those six emit a `.{prefix}-lockup`. A design's slot is
  conditional on the same `logoEnabled` the check is guarded by, so by the time it runs a design
  that has a slot has already emitted the `<img>` AND the filelist field. **Do not add a
  `design.css` clause**: it changes 0 of the 24 answers and would later be wrong, because a
  design may style `.{prefix}-logo` unconditionally (lt07's badge is an accent square with or
  without a mark) and would then be denied the field entirely. Two real things the sweep did
  find, both by design and both stated in each design's own source: a slot drawn in a WELL
  reserves that well's width while EMPTY (97-188px across the nine designs that draw one);
  and the `mark-crowded` readings that prompted this look
  are an INSTRUMENT artifact, not a catalog defect - a mark that fills its well carries its clear
  space as the `<img>`'s own padding, which `spacingCheck`'s border box swallowed. **That fix is
  made in `src/ai/spike/spacingCheck.ts` and never here, because no design is at fault**
  (`markContentRect`, 2026-08-15; `node scripts/spike-mark-clearance-sweep.mjs` is the
  re-runnable measurement). **ls18 and ls25 stay flagged and
  neither is a defect**: their clear space matches designs that PASS, and they fail only
  because their marks are far taller - the unit is the mark's own height, so a design that
  gives its mark room divides by its own generosity. ls25 is additionally a `picture` well showing square cover
  art `object-fit: cover`, which is that design being right. A sweep still compares against a BARE
  render rather than an absolute, because `findPanel` resolves for only 10 of these 24 - and the
  ABSOLUTE ratios depend on which mark is rendered, while the set that moves does not.
  **"A strap spends width, never height" now holds on the hand-authored slots too, and settling it
  cost the sweep a new column - because a height figure cannot say WHY.** Two rules came out of
  measuring the four designs that grew per design:
  - **A mark makes a strap taller in two opposite ways, and the fix for one is the fix for
    nothing else.** Either the mark's own furniture is taller than the words (bound the well), or
    the mark's column came out of a CAPPED text measure and the words needed more height (widen the
    cap - `sideBySideSizeCss`'s answer, and the owner's mark-size ruling: widen the strap's wrap
    cap, never the mark's cap alone). ls29 and ls17 were the second kind - each hit its own cap
    and a name row broke in two. Both now widen their cap by the mark's column when the slot is on,
    and both declare the width, the clear space and the measure as three consts, because the third
    is computed from the first two. Both now grow sideways only, and ls17's `mark-adrift`
    finding cleared with it.
  - **Invisible furniture must never carry a fixed height, and bounding it needs the image OUT OF
    FLOW.** Both mark areas were fixed boxes (96px, 112px) drawing nothing but a placeholder
    hairline, commented "fixed, so the artwork never sets the strap's height" - true of the artwork
    and false of the box around it. They now `align-self: stretch` to the words' height with the
    `<img>` absolutely positioned inside, and that second half is load-bearing: an in-flow image
    contributes its own height to the flex line even under a `max-height`, and a stretched item's
    hypothetical cross size still counts, so stretch alone re-grows the strap through the back
    door. Marks got BIGGER, not smaller - ls17's crest 112 -> 146px on the four lines it draws for.
  - **A SQUARE crest and a PORTRAIT one fail differently, and the sweep only ever rendered the
    square.** `e2e/catalog/mark-height.spec.ts` - the gate this rule now has, in the catalog suite,
    so `test:e2e:catalog` runs it - measures every mark-capable lower third against BOTH shapes,
    and found two more designs on its first run (lt07 and ls10, up to +71%),
    both clean with a square crest. Cause in both: an in-flow `<img>` at `width: 100%` +
    `height: 100%` inside a badge sized by `min-height`, so the percentage resolves against an
    INDEFINITE height and the artwork's own aspect at the badge's width becomes the badge's
    height. Both badges are
    drawn accent squares whose own source promises "roughly square", so a 1:1.75 badge is a defect
    rather than a composition: the image is absolute in both now. **The pattern to grep for is a
    definite-height well, not this list** - lt41, lt49, lt53, ls18 and ls25 carry the same in-flow
    `height: 100%` and do NOT grow, because their wells state a height.
  - **lt49 and lt53 are RECORDED EXCEPTIONS, argued in their own source.** Their wells are drawn,
    tinted squares - real furniture - and at the four lines each board is built for the words are
    157px and the well costs zero height (207 -> 207px on both). The growth appears only below
    their own line count, and both ways to remove it are worse: capping the height alone makes the
    square a rectangle, and shrinking the well shrinks the mark on the content it was drawn for.
  The sweep now reports the cause (it measures the box's two children against each other, since a
  line count misses a sibling row reflowing) and probes BOTH content shapes - the calibrated two
  lines and the design's own - because a well sized against four lines is not a defect for costing
  height at two, and reporting only one number reads a design's proportions as a fault. The GATE is
  `e2e/catalog/mark-height.spec.ts` (both mark shapes, mutation-tested, exceptions checked from
  both sides so a stale entry fails rather than excusing a design it no longer describes); the
  sweep stays the diagnostic that says WHY.
  **THE MARK'S SIZE IS THREE MEASURED NUMBERS, and the third is the strap's own wrap cap**
  (2026-08-14, the value-gate ballot's other finding - the logo was called too small on four of
  eight briefs). The WIDTH cap used to bind before the height cap, so a 4:1 wordmark painted 33px
  beside a 54px name and a 13:1 rail painted TEN pixels at 1080p; only a 1:1 crest ever reached
  the height cap. **Raising the width cap alone is the obvious fix and is wrong**: measured over
  all 23 mark-capable lower thirds, 180px wrapped one design, 220px two and 260px three, and each
  wrapped line grew that strap by up to 73% - the failure the beside-the-text rule exists to
  prevent, arriving through the width. So `applyLogoSlot` WIDENS the box's own `maxTextWidthCss`
  cap by the mark's column (260 + 26px) instead: the words keep their whole measure and the
  graphic grows in the one dimension a strap may spend. Measured result: marks roughly doubled,
  ZERO newly wrapped lines, ZERO height growth, nothing outside the title-safe area. 84px is
  the height ceiling because past it the mark starts setting the row's height itself. The cap
  arithmetic reads `computeMaxTextWidth`, the same function the assembler calls, so the two
  cannot disagree unless this category grows a `CategorySpec.maxTextWidth` of its own - it has
  none. Pinned by `e2e/wizard-logo.spec.ts`, mutation-tested.
- **shared/standard.ts** - CategorySpec, assembleStandard, makeDefineVariant, and
  `convertToDataRegion` - the Timeline v2 flip: convert a freshly assembled template's legacy
  ANIMATION region into the NOACG_ANIM data block + interpreter through the parity-proven
  importer (blocks/animImport.ts) at create. The preset still authors the motion; only the
  marked region converts (category-owned runtime around it - score pops, clock painters -
  stays); a conversion failure keeps the legacy emit, never a broken template.
  `CategorySpec.dataRegion` triggers it inside assembleStandard; self-assembled categories
  (scoreboards, game timers, starting soon, quiz, infographics) call it directly. **EVERY category
  now creates as a data block** - the legacy region survives only in SAVED templates (see
  src/blocks/AGENTS.md). The step-calls model
  (docs/TIMELINE_V2_PLAN.md §3b)
  carries `tl.call(startClock/stopClock)` through the conversion as step `calls`, so a countdown
  survives the flip (the clock runtime itself lives OUTSIDE the region and is untouched), and the
  loop model (gap 6) carries the ambient breath as a step `loop` (a repeating scale track) - this
  is what let STARTING SOON flip. The MEASURED-MOTION model (docs/DYNAMIC_MOTION_SCOPE.md) carries a
  `tl.add(builderName(target))` across as a step `dynamic` - this is what let TICKERS and END
  CREDITS flip (see their motion runtimes below).
  `convertToDataRegion(template, refine?)` takes an optional refinement of the imported data -
  the seam for a step the LEGACY region has no shape for, so a category can author it directly
  instead of growing a legacy step kind Phase 8 will delete. QUIZ is the one user
  (docs/TIMELINE_V2_PLAN.md §3c): its Continue reveal is a lifecycle CALL, not a reveal group,
  so it inserts a middle step `{ calls: [revealAnswer] }` before Out - which makes SPX's
  `steps: '2'` DERIVED (three steps -> one press) instead of a hard-coded value the timeline's
  steps re-sync would overwrite with '1' on the first edit, killing the reveal. The LIVE VOTE
  board (poll/) uses the same seam for the same reason: its result step carries the measured bar
  growth, which the keyframe model deliberately cannot express, and the AUDIENCE category's Q&A
  card uses it for an ordinary `reveals` step the legacy region simply has no shape for.
  INFO CARDS flipped last (`dataRegion: true`) - they are the standard contract's other line-based
  family, so they convert exactly like lower thirds, steps and all. Nothing blocked them but the
  spec suite they hosted, which now runs against a SAVED legacy template instead (e2e/timeline.spec.ts).
  A wrapper that needs the motion speed must read it via the shared `motionSpeed()` helper
  (base.ts `motionSpeedJs`: NOACG_ANIM.speed, else legacy animSpeed, else 1) - never the bare
  animSpeed global, which only exists inside a legacy region.
- **shared/animRuntime.ts** - the emitted ES5 interpreter (Timeline v2), identical in every
  data-driven template: reads the NOACG_ANIM literal and defines the SAME builder globals the
  whole platform depends on (buildInTimeline / buildOutTimeline / revealNextStep), so the
  simulator, wizard thumbnails, control engine, and every export work unchanged. It pre-hides
  press-revealed layers (their reveal step's first keyframe values; plain opacity 0 fallback),
  shows/hides the CSS-hidden root, fades press-revealed layers OUTSIDE the root with the exit
  (unless the Out step animates them itself), runs a `loops` track in its own repeating
  sub-timeline (repeat/yoyo/repeatDelay - the ambient breath), and divides every duration and
  keyframe time by `speed`. `emitAnimRegion` emits the full marked region (data header + literal +
  interpreter); `replaceRegionWithAnimData` swaps a template's region for the data-driven
  emit (the converter's writer).
  It also carries the **STATE MACHINE engine** (docs/STATE_MACHINE_SCHEMA.md): the version-1
  statements stay VERBATIM as the machine-less path (a template with no `machine` key runs the
  identical code it always did), and the engine adds three globals - `noacgDispatch(event,
  payload?)` (one operator event through the SERIAL queue; the flat {field: value} payload is
  applied only if the guard accepts), `noacgSnap(assignments, opts?)` (enter states INSTANTLY
  by replaying the canonical path with suppressed callbacks; `null` = every group to its
  initial, the VISUAL half of reset - the data half stays update()'s job), and
  `noacgMachineState()`. The four SPX globals stay THE lifecycle surface and become
  machine-aware INSIDE (play = reset-and-enter, next = the default-path walk, stop = the
  built-in out legal from every state), which is why no export target, transport or preview
  path changed. Timers are `gsap.delayedCall` armed by a `tl.call` at the entry timeline's end,
  never setTimeout: GSAP's callback suppression then means a settled/scrubbed graphic never
  arms one, and the bench's timeScale + the render virtual clock drive them for free.
  **THE PAIRING RULE:** `spliceAnimData` replaces only the literal, so a saved template keeps
  its FROZEN interpreter - machine-bearing data must never land under one that predates the
  engine. Check `hasMachineRuntime(js)` first and re-emit the whole region when false (the
  `hides` precedent); validateTemplate treats a mismatch as an export-blocking error.
- **shared/clock.ts** - countdown engine: hidden minutes field -> M:SS (H:MM:SS past an hour) +
  `{prefix}-done` at zero; DOM-ready-safe, and null-safe about both the clock element and the
  duration field (a design with no clock simply has nothing to paint). The count is anchored to a
  DEADLINE timestamp and recomputed every tick, not decremented: a holding screen can sit on air
  for an hour and `setInterval` drifts (throttled tabs, coalesced timers), so a late tick has to be
  self-correcting or the clock and the wall disagree at 0:00. `Date.now()` is virtualized by the
  render runtime, so a rendered countdown stays a pure function of the frame.
  An optional THIRD field id opts a design into a wall-clock START TIME ("19:30"): filled in it
  wins over the duration, empty it is ignored. That is the difference between "count five minutes
  from whenever the operator hit play" and "count to when the show actually starts" - only the
  second survives a re-take.
- **shared/textFit.ts** - the FIT-TO-SLOT runtime for placed text lines (the imported-design
  contract): `fitPlacedText()` condenses a `data-fit="shrink"` line to its wrapper's max-width
  by reducing font-size (never by distorting the chosen typeface), floored at 55%. Design-owned
  JS emitted OUTSIDE the marked region, injected idempotently by blocks/designLayout.ts
  `ensureTextFitRuntime`; the shared `update()` calls it via an optional hook (the
  `revealNextStep` idiom). It re-fits on `document.fonts.ready` as well as DOM-ready - a
  DOM-ready-only pass measures the FALLBACK face and overflows once the real one swaps in.

## types/ - the GRAPHIC TYPE registry (docs/GRAPHIC_TYPES.md)

A **type** declares what a graphic IS - structure contract, fields, state groups and default
path, control events - independent of what it looks like; a **design** is one look. A type is a
DECLARATION, not a second way to build a template: `variantsFromType` compiles one into
ordinary TemplateVariants that go through the category assemblers below, so
`variant.create(options)` stays the single contract the wizard, the AI, the sweeps and every
spec speak. `catalog.ts` merges them with `mergeCatalog`, REPLACING BY ID, so a type that
promotes an existing variant keeps that variant's id and its slot in the browse grid.

**THE RULE:** *persist a machine only when the derived one is wrong.* `deriveMachine` already
gives every template a correct one-group linear machine, so a type with no branches, parallel
groups or event overrides compiles to NO `machine` key and emits byte-identical output. Nine
of the twenty types are in that class - including two of the five AUDIENCE types
(`viewer-question`, `community-request`), which is the rule showing its work at the point where
modelling for its own sake would be most tempting: they are different GRAPHICS from each other
(different fields, different meaning, different control page) with genuinely the same two beats
on air. `e2e/audience-pack.spec.ts` pins exactly which two, so a later edit that quietly adds a
machine has to say why.

`TypeMachine.main.edges` is for arrows that belong to the GRAPHIC rather than to any one branch
state - the chat highlight's self-dismiss timer from the entrance to the exit. Declaring them
there keeps a branch's `edges` meaning "the ways in and out of THIS state".

**A type declares ONE field list, which is a real limit worth knowing before reaching for one.**
A family whose field COUNT varies across its designs cannot be a single type: the factory's
fields gate compares each design's emitted count against the declaration, and rightly. Three
families in the catalog are in that class and stay hand-written variants - camera frames (2-4
fields), the sponsor strips (4 vs 6 slots) and the location cards (one has a picture slot). That
is a legitimate state, not debt to pay off in a hurry: `card04`, `vs01` and `ig01`-`ig07` have
always lived there. Optional type fields would fix it and are a change to this contract, not to
a design (docs/PACK_TAXONOMY.md, "Known limitations").

Fields are declared with LOGICAL keys and a `role` (`line` first, `logo` last - both enforced
with a throw, because the order is what keeps the compiled `fN` ids in step with the assembler
that emits them). The main group's default path is DERIVED, never declared: its length must
equal the step count, which depends on the preset and the line count. `attachMachine` puts the
compiled machine on after assembly and THROWS if it is off-shape - unlike `convertToDataRegion`
it is compiling our own declaration, so degrading would ship a control page whose buttons do
nothing. One clamp sits BEFORE that gate: a caller passing FEWER lines than the type declares
(an AI/Lite spec asking for a one-line lower third) gets the missing lines filled in - the
declared field still exists and stays editable, and the missing-parts throw stays reserved for a
design that genuinely fails to emit a declared part (found by the Lite benchmark's one-line
challenge brief). **WITH WHAT is decided by the FIELD PLAN, and the two answers are opposites:**
a `lines` plan pads with EMPTY text (an empty value collapses via the `:empty` mask rule - a
shorter lower third), a `fixed` plan keeps the design's OWN default, because a quiz board with
two of its four answers blanked is not a smaller quiz, it is a broken one.

**A type's line CAPACITY is derived, never below its own count of `line` fields, and the
caller's lines are written into those fields after assembly** (`variantsFromType`,
`withLineValues`). Both halves were load-bearing, measured 2026-08-09: nine types - the three
answer boards and every sports board - declared 3 to 6 line fields against a hand-authored
`capabilities.maxLines` of 1, so `specToTemplate`'s `slice(0, variant.maxLines)` threw the rest
away before `create()` saw them; and those same fixed-contract assemblers build their fields
from a baked content declaration rather than from `o.lines`, so they carried NONE of what a
caller asked for. A generated quiz came back as the catalog's own planets question with four
planets for answers. The post-pass writes value and static text together (`setFieldDefault`), so
the control page and the pre-play frame cannot disagree; TITLES stay the type's, because a fixed
contract's labels are what its own row dropdowns are declared against. Pinned by
`e2e/lite-line-content.spec.ts`, registry-wide and mutation-tested.

**`WizardOptions.content` is the channel for everything a LINE cannot carry** - which answer a
quiz marks correct, how long a countdown runs, a live poll's options: all `role: 'data'` or
`'hidden'`, none of them reachable through `lines`. It is keyed by the type's own LOGICAL keys
(`{ correctAnswer: 'C' }`), never by `fN`, and only a type-compiled variant honours it, because
only a type declares those keys and the kind to clamp each value against; a hand-written variant
ignores it rather than guessing what its ids mean. **Every value is clamped to what the field
declares and an illegal one is DROPPED** - a `select` takes only an option it offers, so a
correct-answer field can never name a row that does not exist (which would reveal nothing, with
no error anywhere). `DesignSpec.content` is the same data as a LIST of pairs, because a JSON
Schema with `additionalProperties: false` cannot describe an open key set; `specToTemplate` folds
it into the map.

**The trap to know:** a timer never arms on a timeline that never ends (the arming call is
scheduled at the timeline's end). A `repeat: -1` loop or a measured `dynamics` builder makes
that unreachable, so `validateMachine` errors on it. This is why the ticker type is a rotator
with its own `ticker-rotate` preset rather than the endless marquee - and, from the other side,
why the TRANSITION type's self-clear is legal: its cover is a short finite entrance.

`TypeMachine.main.edges` is the one arrow shape branches cannot express - an arrow BETWEEN two
waypoints of the default path, since a branch's edges always have the branch at one end. The
transition type is its only user (`{ waypoint: 0 } → { waypoint: -1 }`, trigger `timer`);
modelling that as a branch would have meant inventing an off-path "cleared" state duplicating
the exit, i.e. a second way to be off air.

## pack4/ - the TITLE / TOPIC / INFORMATION pack

36 designs over nine graphic types - openers (title-card), topic and chapter cards (topic-card),
and the seven types `types/briefings.ts` + `types/lists.ts` add: now/next, headline + body,
process/checklist, public notice, statement (long text + a second language), key facts, and
recap/actions. NOTHING here is a new mechanism: the word-shaped ones build on the info-card
assembler, the two LIST boards build on the infographic one (their content is a textarea the
runtime renders and their motion is measured), and both go through the ordinary graphic-type
registry.

- **pack4/skin.ts** - the pack's shared style vocabulary: four `Pack4Skin` records (clean =
  minimal, frost = glass, volt = sport, house = noacg) plus the emitters every design composes -
  `panelCss` (the family's panel treatment), `accentCss` (its leading motif: hairline rule /
  short stroke / top rail / glowing amber bar), `labelCss`, `dividerCss`, `measureCss` (a
  design's own text measure, overriding the category cap - running text wants a narrower one
  than a headline), `textLegibilityCss` (the panel-less family's halo over live video) and
  `readableTextCss`. `decl(prop, value, comment)` is the aligned declaration formatter every
  emitter uses - the first draft hand-padded and silently ate the semicolon of every long value.
- **pack4/content.ts** - the pack's WORDS: each type's `TypeField[]` and every design's sample
  text, declared ONCE. The variant reads it through `typeLines(FIELDS, SAMPLES)` and the type
  declares the same `SAMPLES`, so the two sides the factory's samples gate compares cannot
  drift. title-card's and topic-card's field arrays moved here for the same reason.
- **pack4/markup.ts** - `maskLine` (index-safe, so a design handed fewer lines than it draws for
  emits fewer), `emptyLineCss`, and `maskScoped`. TWO RULES the whole pack follows: every
  vertical margin sits on the line's SPAN (never its mask) and every span carries `:empty {
  display: none }`, so a field the operator clears takes NO space - that is what makes "half the
  fields filled" a supported state and, in the process card, what keeps the CSS step counters
  contiguous (a display:none box is skipped by counters). `maskScoped` exists because the
  category already styles `.{prefix}-mask > span` including `text-wrap: balance`; a design that
  wants a paragraph's wrapping has to say so at the same specificity.
- **infoCards/pack4/*.ts** - one builder per type (titles, topics, nowNext, headline, process,
  notice, statement); **infographics/pack4/** - `boards.ts` (facts + recap) and `listRuntimes.ts`
  (their `rebuildInfographic()`, the dataRuntimes.ts pattern). Unlike the schedule board, a line
  with NO pipe still renders here: a fact with no term and an action with no owner are real
  content, not malformed rows.

Two things in the pack are worth knowing before touching it:

- **process-steps is the catalog's first STEPPED-by-default type** (`TemplateVariant.defaultSteps`
  / `TypeCapabilities.defaultSteps`, honoured in `resolveOptions`). The wizard draft's steps flag
  is tri-state now (`null` = the design decides) - a hard `false` there had been overriding every
  design that knows better. `scripts/factory.mjs` gates steps drift alongside motion and position.
- **notice-card is the pack's one state machine**: a PARALLEL `level` group (standard / urgent)
  with `escalate` / `standDown` operator events fading a `.info-card-alert` wash. Parallel, not a
  branch on the main path, because escalating must not disturb where the operator's walk has got
  to - and because a group entered by transition or by snap restores with the rest after a
  control-page refresh.

**The second trap:** a state's entry timeline applies each track's FIRST keyframe as a hard
`set` at time 0 (animRuntime `buildStepTimeline`), so a state can only CROSS-FADE when every
route into it leaves the layers at the same starting pose. `alertLevelType` has four levels and
three possible predecessors each, so its level change is a CUT plus an acknowledgement dip;
`publicNoticeType` has two languages, exactly one predecessor per state, and a graph authored to
keep it that way - so it fades honestly. Full reasoning in docs/PUBLIC_SERVICE_PACK.md §4.

**The third trap:** a PARALLEL group resting at its initial state replays nothing (that is what
"initial" means), so the resting pose must be established in CSS *and* in the entrance step or a
replay keeps whatever was last on air. `alertLevelRestRefine` / `piLanguageRestRefine` are that,
and a new parallel-group type needs its own - nothing mechanical will remind you.

## Categories

- **lowerThirds/specialist/** - ls01…ls41, the SPECIALIST pack: lower thirds drawn for ONE
  production rather than for any show (interview duos, host-and-guest, commentary booths,
  athletes, esports, worship, academic, politics, analysis, music, live-and-location, creator,
  and the BROADCAST-JOURNALISM group ls33-ls40, whose subject is the words or their status
  rather than the person: a quotation, an interpreted line with a language tag per line, a
  caller on the line, a location slate with a computed hour, breaking and developing marks, a
  fact-check ruling, and the parliamentary register).
  Mechanically ordinary - same category, assembler, preset bank, export path - and they carry NO
  discovery metadata of their own: browse/search facets come from the ONE taxonomy
  (model/taxonomy.ts + templates/templateMeta.ts), so a design is declared there like any other.
  `specialist/shared.ts` holds what the pack cannot repeat per file:
  - `slot`/`slots`/`hasLine` - place a line BY INDEX into a named slot. An absent line emits
    NOTHING (the operator can delete any row, not just the last), so a design closes over the
    gap instead of reserving a hole. This is what makes the pack survive missing optional roles.
  - **The two-person contract.** `duoSplitBalanced` for PEERS (the interview straps: fewer
    lines drop the ROLES first, so both people stay named - "two names, no titles" is a real
    broadcast format) and `duoSplitLed` for a LEAD + SUPPORT pair (host-and-guest: the lead is
    completed BEFORE the second person appears, so dropping to two lines never re-reads the
    guest's own role as the host's name). Picking the wrong one is a silent content bug, not a
    layout one. `duoGridCss` writes the structural half once: content-sized `auto` columns
    (a symmetric grid pads a short name out to a long one's width), `min-width: 0` on each
    column (a grid item refuses to shrink by default - that is what pushes long names off the
    safe area), a per-column cap so an extreme value wraps in its OWN column, and
    `align-items: start`. Browser-verified with a 55-character name beside a two-character one.
  - `liveClockJs` / `zoneClockJs` - design-owned clock runtime (emitted OUTSIDE the marked
    region via `runtimeExtraJs`, DOM-ready guarded, the corner-bug doctrine). The zone clock
    reads a UTC offset from a HIDDEN input-only field on every tick, so one template is any
    city's clock.
  **THE ACCENT RULE this pack pinned:** a design declaring `hasAccent: true` must emit its
  `.lower-third-accent` node UNCONDITIONALLY. The animation data keyframes it by selector, so an
  accent that comes and goes with a field leaves the timeline addressing an element that is not
  there - `validateTemplate`'s `anim-data-target` warning catches it, and it caught six designs
  here. Make the CONTENT conditional, never the node.
  **AND THE CLIP RULE:** bounding an atomic token cell (a squad number, a party tag) needs the
  bound on the SPAN - `max-width` + `white-space: nowrap` + `text-overflow: ellipsis`.
  `overflow: hidden` on the WRAPPER clips the PAINT but not the layout box, and the runtime
  bench measures layout - so the token still collided with the name beside it.
- **lowerThirds/** - lt01…lt62 on shared.ts (prefix 'lower-third', `dataRegion: true` - the
  first category to create as NOACG_ANIM data blocks) + animPresets.ts (the shared marked-region
  GSAP preset bank, prefix-parameterized - it animates any category's `.{prefix}-box` structure;
  on a data category the preset's emit is converted at create, and blocks/presetApply.ts derives
  keyframes from the same emitters after). The bank leads with the **Slide family**
  (`makeSlidePreset`: slide-up/-down/-left/-right - one choreography, four directions of travel,
  ids adjacent + `SLIDE_FAMILY`/`isSlidePreset` so pickers group them: the wizard renders ONE
  Slide card with a direction picker, the Inspector one optgroup), then line-reveal, mask-wipe,
  pop-spring, snap-stinger, blur-in, fade, flip-3d.
- **infoCards/** - card01…card71 (prefix 'info-card', `dataRegion: true`). The standard contract's
  other line-based family: they use the same 9-preset bank as lower thirds and convert exactly like
  them, steps and all (a » press per body line becomes a middle step with its `reveals`).
  Four jobs in one category: card01…card09 are INFORMATION cards (a heading with lines under it);
  card10-card37 are the TITLE / TOPIC / INFORMATION pack (see pack4/ below), each a thin variant
  record over a shared per-type builder in `infoCards/pack4/`; card38-card49 are the COMMERCE
  cards (product / offer / listing / QR / location / sponsor strips), which is why
  `shared/standard.ts` exports **`maskLine`/`maskLines`** beside `lineMasksFor` - the generic
  name/title/extra ladder gives every line past the second the same class, and a card whose lines
  are a product name, a price and a struck-through was-price needs to name each one for what it
  is; and card50…card58 are SET-PIECE cards whose layout carries a convention older than
  television - a reading, a lyric (now + next), a quotation, a translation, an order of service,
  and the ceremony cards; card59…card71 are the editorial/cinematic information-system siblings
  (typed title, now/next, headline, notice and statement designs plus hand-authored results,
  sponsor, caption and location shapes). On the commerce cards, values that could vary by shop, currency or
  format are FIELDS and vanish with `:empty` when blank (the savings chip, the promo code, the
  deadline, the status line, the unit mark) - no state, nothing for a replay to leak.
  **The grid trap:** `cardLineMasks` wraps every line in a `.info-card-mask` div, so on a design
  that lays the box out as a grid or flex container the ITEMS are the masks, not the `#fN` spans.
  Placement rules target the masks (`.info-card-mask:nth-child(N)`), type rules target the spans -
  see card57.
  **The rail trap:** `.info-card-accent` is absolutely positioned at the root's left edge and the
  box is painted AFTER it, so a design whose box has a BACKGROUND must reserve the strip
  (`margin-left: var(--accent-weight)`) or the panel covers the rail completely (card56, card58).
  A panel-less design (card01) needs only padding.
- **endCredits/** - cr01…cr12 (prefix 'credits') + creditsPresets.ts (credits-roll /
  credits-loop / credits-board / credits-pages / credits-crawl) + **creditsMotion.ts**;
  data-driven: a hidden #f0 textarea holds "Role | Name" lines, template JS parses and rebuilds
  #credits-track, ends with logo + year (.credits-end). DATA BLOCKS via convertToDataRegion.
  **The category is LISTS, not just credits** - the same data model at a different speed is a
  credit roll, a name wall, a donor board, a sponsor acknowledgement, a graduation roll or a
  schedule. Choosing a design is choosing that speed, which is what the index groups by.
  **Three line kinds, one rule each** (parseCredits): `Role | Name` is a credit; a pipe-less line
  that OPENS a section is that section's heading; any other pipe-less line is a plain `entry`
  (a name on a wall, a thank-you, an untimed note). The heading rule is POSITIONAL on purpose -
  a wall is one heading followed by names, a roll's sections already open with theirs, so both
  read correctly from the same text with nothing to mark up. **A row builder must answer all
  three kinds**; a design that only handles 'heading' and 'credit' renders `undefined` for a
  bare name.
  `credits-board` is the one format with NO motion: the list fades up and holds. It exists
  because rolling a schedule or a wall past the audience means the line they need is the one
  that just left, and it is the reason a board design lays `.credits-page` out in normal flow
  where a paged design stacks them absolutely.
  `credits-loop` is the seamless repeat, for the long tail after a show. `creditsLoop()` wraps
  the track's content in one `.credits-loop-run`, appends as many `.credits-loop-clone` copies as
  the viewport needs, and travels exactly one run's height - a bare `repeat: -1` would snap the
  list back to the top, which everyone watching a wall of names is watching closely enough to see.
- **tickers/** - tk01…tk22 (prefix 'ticker') + tickerPresets.ts (ticker-marquee / ticker-flip /
  ticker-rotate) + **tickerMotion.ts**; data-driven: #f0 lines -> #ticker-track items; marquee =
  items rendered twice, slide one set width, linear repeat:-1 (seamless loop). DATA BLOCKS via
  convertToDataRegion. f0 items + f1 label, plus an OPTIONAL f2 second cap (a topic, a source, a
  fixed top story) emitted only when the variant declares a third suggested line - so every
  two-line ticker emits byte-identically to before it existed. **A strip that neither travels
  nor rotates does not belong here** (docs/PUBLIC_SERVICE_PACK.md §1): the static notices live
  in alerts/ and publicInfo/.
- **alerts/** - al01…al13 (prefix 'alert', `TemplateType 'alert'`), a STANDARD-CONTRACT category:
  assembleStandard + the shared preset bank + line masks + steps, nothing category-specific in the
  runtime. What it adds is the SEVERITY FLAG - four stacked `.alert-level-N` blocks
  (ALERT_LEVELS: advisory/watch/warning/emergency, fixed semantic colours, every pair ≥5:1) that
  the `alert-level` type's parallel group cross-cuts, plus `alertLevelRestRefine`, which writes
  the resting pose into step 0 because a parallel group resting at its initial state replays
  nothing. Seven designs carry the machine; five (al07-al11) carry no flag and claim no states.
  Numbered like the quiz's answer rows, so each level is a real registry part.
- **publicInfo/** - pi01…pi10 (prefix 'public-info', `TemplateType 'public-info'`), the other
  standard-contract addition: official notices, numbered instructions, source labels,
  disclaimers, municipal/health panels and two-language panels. `piMask`/`piMasks` let a design
  name its own line classes (the shared positional `-name`/`-title`/`-extra` means nothing for a
  numbered instruction or a second language's body); PI_LANG_STACK_CSS + `piLanguageRestRefine`
  carry the two-language block the `public-notice` type's machine alternates.

### The category MOTION RUNTIMES (tickerMotion.ts / creditsMotion.ts / igMotion.ts)

These categories move by magnitudes that only exist once the operator's DATA is in the DOM: a
marquee slides exactly one track-width, a roll covers its own content height, a flip runs one
segment per item, a stat counts to the figure they typed, a bar grows to its own `data-value`, a
list cascades one row per line they wrote. No static keyframe can hold a number that changes the
moment the data does - which is why these were the last categories on the legacy patchers.

The fix (docs/DYNAMIC_MOTION_SCOPE.md): each measured motion is a named BUILDER - a plain function
that measures the DOM and RETURNS a GSAP object - emitted OUTSIDE the marked ANIMATION region, in
the design-owned runtime, exactly like shared/clock.ts. The preset's region does not inline the
math; it just calls it: `tl.add(tickerMarquee('#ticker-track'))`. Consequences, all load-bearing:

- the region stays fully PARSEABLE, so the ordinary importer converts it (the segment becomes a step
  `dynamic`) - ONE choreography source, no second code path;
- the builders survive the conversion and the export untouched (they're outside the markers);
- **every builder of a category ships in every template of it**, so swapping the motion preset is a
  pure data edit (one `build` name) with nothing outside the markers rewritten;
- the speed knob is read through `motionSpeed()`, never the region's `animSpeed`;
- a builder takes `(target, opts)` - `opts` is `{speed, ease}` from the interpreter (absent when the
  LEGACY emit calls it, so always default), and it may compose other builders (igMotion's count-up
  adds the bar growth once the figure lands). Give a `tl.add()` an EXPLICIT position when the phase
  has more than one: a segment is zero-advance in the importer's clock but a real child in GSAP's,
  so a bare `'-=N'` after one would resolve differently in the two.

Adding a measured motion to another category = add a builder to its runtime + have the preset
`tl.add()` it. Do NOT inline measured math in a region: it makes the template unconvertible.

### The canonical REPEATING-DATA system (dataRuntimes.ts + sportsRuntimes.ts)

A graphic whose content is a LIST the operator types - a running order, a poll's options, a
starting eleven, a league table, a results column - keeps that list in ONE hidden textarea
field, one item per line, with `|` between an item's parts, and a `rebuildInfographic()` the
assembler calls after every update(). **Nothing about the list is ever expressed as more
fields**: a template does not grow `f7`…`f26` because a weekend has twenty fixtures. The SPX
definition stays small (so a control page shows one multi-line editor, and adding a substitute
is typing a line), the motion is MEASURED from the rendered rows, and the rebuild is per TYPE
rather than per design. `dataRuntimes.ts` holds the agenda, STAT-LIST, poll, goal, milestone and
ELECTION shapes; **sportsRuntimes.ts** holds the sports pack's fixtures shape. Both escape operator
text before it reaches innerHTML and SKIP a malformed line rather than rendering an empty row, and
both render into `#infographic-rows` with one direct child per item - exactly what `rows-cascade`
measures.
**Which pipe splits a line is a per-shape decision, not a convention** - the schedule board takes
the FIRST (a show name may contain a pipe, the time cannot), the stat list takes the LAST (the
figure is the short final part, so the label is what may contain one). Say which, in the runtime.
- **startingSoon/** - ss01…ss20, the HOLDING SCREEN set (prefix 'starting-soon'; hold-loop preset:
  entrance + calm .starting-soon-pulse breathing + clock via shared/clock.ts). DATA BLOCKS via
  convertToDataRegion (self-assembled, calls it directly): the breath imports as a looping scale
  track (gap 6) and startClock/stopClock ride the step calls (§3b); the clock runtime stays
  outside the region.
  **The category is every screen shown while the show is NOT happening** - before it starts,
  between its parts, when it breaks, after it ends. A design declares three things and the
  assembler does the rest: `lineCount` (how many #fN spans its markup carries, default 2),
  `clock` (`minutes` | `start-time` | `none`), and any `extraFields`. The clock fields land AFTER
  the lines, so a 2-line minutes design is f0/f1/f2 exactly as before and every existing variant
  emits byte-identically.
  **`clock: 'none'` is a design decision, not a gap.** A technical pause cannot promise a time
  and a sign-off card is not waiting for anything, so those screens emit no clock fields, no
  clock element and no clock runtime, and ship on the `hold-still` preset (the hold loop with the
  countdown calls removed). Swapping a clock preset onto one after creation degrades to "no
  countdown" rather than throwing: the interpreter resolves a step's `calls` by NAME and treats a
  missing function as a no-op.
- **gameTimers/** - gt01…gt04 (prefix 'game-timer', type 'countdown'; data blocks via
  convertToDataRegion; timer-run pop + timer-line-reveal; minutes in f1; .game-timer-done
  styles time-up). The preset's startClock()/stopClock() ride the conversion as step `calls`
  (§3b); the clock runtime (shared/clock.ts) stays outside the region. gt03/gt04 are the AI
  benchmark's kids-timer winners ported onto the contract: design-owned ring/tick runtimes
  via `GameTimerDesign.runtimeExtraJs` (outside the region, following the clock's globals)
  and `GameTimerDesign.autoEase` (a design's hand-tuned default ease pair, used only when
  the wizard easing is 'auto' - an explicit pick still wins).
- **scoreboards/** - sb01…sb25 (prefix 'scoreboard', data blocks via convertToDataRegion;
  the fixed 4-field contract f0-f3 as scoreboard-masks so the standard presets drive them;
  update() pops a score's mask when it changes on air - speed via motionSpeed()).
  **A design may OWN its fields instead** (`SbDesign.fields`), plus `.popFields` (which fields
  pop), `.lineCount` (how many masks the presets choreograph) and `.runtimeExtraJs`
  (design-owned JS outside the marked region) - all optional, and a design declaring none emits
  byte-identically to before they existed. That is what lets the SPORTS PACK's bigger boards
  (docs/SPORTS_PACK.md) share this assembler: a match board adds a clock, a period, crests and
  club colours, and a match-event card is not a two-team graphic at all, but all of them are
  still scoreboards. Field contracts + the fragments that carry machinery live in
  **scorebugShared.ts**; the team-colour lift and the period-breakdown rebuild in
  **boardRuntimes.ts**. `clipOneLineCss()` documents a real trap: the assembler's own
  `.scoreboard-mask > span { text-wrap: balance }` resolves to `text-wrap-mode: wrap` and
  OUTRANKS a plain `white-space: nowrap`, so a long club name wraps and grows a fixed strip
  mid-match while looking as though the nowrap was never written.
  sb23-sb25 are the reference-set boards: **sb23 "Wire Bug" fills the scorebug type's EDITORIAL
  cell** (a row of flat cells whose ground is the club colour, with the three kinds of number
  told apart by grounds MIXED from the palette rather than written as hex - which is what keeps
  it legible in a palette it was not drawn in), sb24 "Arena Board" draws the venue's own
  hardware, and **sb25 "Court Board" is the one to read before inventing a field**: its
  fouls-and-timeouts strip is the match board's existing `periods` breakdown, because
  "FOULS | 4 | 2" already IS "label | home | away". A tally that fits the repeating field is
  never a reason to grow the contract.
- **shared/matchClock.ts** - the SPORTS CLOCK, design-owned JS outside the marked region (the
  shared/clock.ts rule: playout, not motion). Counts UP or DOWN per the design's
  `data-count`, stops itself at zero when counting down, resets to the element's own
  `data-start` (never zero-by-assumption), and re-seeds from the clock FIELD when an operator
  types a correction - a live clock drifts from the stadium's, and one that cannot be corrected
  stops being trusted. **It re-seeds only on a CHANGED value**: the wire resends the cue's whole
  value set on every Take/Update/Snap, so an unguarded re-seed pulled a running clock back to
  its typed time on every score bump. The element's text is the PAINTED time and so differs from
  a resend every second - the discriminator is the last value RECEIVED, which the runtime
  remembers.
  **TICKING IS DISPLAY, NOT STATE** (2026-08-19, docs/SPORTS_PACK.md): the clock's truth is a
  value plus the instant it was true, and a tick is a repaint of `value ± elapsed` rather than
  an increment. The origin rides the clock FIELD as an `@<epoch ms>` suffix
  (`"45:00@1755600000000"`), stamped from the `clockStart` row's own server time by
  `src/control/matchClockWire.ts`, so every renderer agrees and a browser source reopened at 67
  minutes comes back at 67 minutes instead of at the seed. A plain value with no `@` is a HELD
  time - which is what every existing template, export and typed correction already sends.
  `markInPlay`/`markBreak`/`markFinal`/`markLive` are the state markers the
- **cornerBug/** - bug01…bug36, the IDENTITY family (prefix 'corner-bug', standard assembler,
  `dataRegion: true`, logo slot + placeholder mark). bug01-04 are the general logo bug; bug05-36
  are the eight identity types x four families (types/identityBugs.ts): station ident, live
  status, logo-only mark, sponsor strip, sponsor rotation, event ident, award mark, location
  chip. Shared authoring parts live beside them - **parts.ts** (the logo slot's field, markup and
  CSS, with a per-family placeholder mark: bars / diamond / slab / keyline / ring),
  **statusParts.ts** (the live bug's three word sources + the class-driven look of its states),
  **rotationParts.ts** (the one-stage stacking a rotation needs) and **bugRuntimes.ts** (the
  design-owned JS the two machine-bearing types call by name: `bugStatusLive/Replay/Standby` and
  `sponsorShowNext`). bug02 = house live clock via StandardDesign.runtimeExtraJs - design-owned
  JS emitted BEFORE the marked ANIMATION region, DOM-ready guarded, survives the data conversion
  untouched; the identity runtimes ride the same seam.
  **Hide a data holder with a CSS RULE, never an inline `style="display: none"`**: the editor's
  entrance reset clears inline props on the whole root subtree (PlayoutSimulator `resetGraphic`),
  so an inline-hidden holder comes back VISIBLE on the canvas. `STATUS_SOURCE_CSS` is the pattern.
  The general form is `DATA_SOURCE_CLASS`/`dataSourceCss` (shared/base.ts) - the `.noacg-data-source`
  class every category's assembler emits when its markup carries one. This is a CATALOG-WIDE
  rule, not a corner-bug one: measured 2026-08-06, the fundraiser meters leaked their goal, the
  milestone boards leaked the whole target list, the poll board leaked its options, every
  audience queue leaked its pending questions and sixteen match boards leaked their club-colour
  hex - all from the same inline `display: none`. `e2e/catalog-baseline.spec.ts` now fails on
  any `<div id="fN" style="…display: none">` in the emitted HTML. An `<img id="fN">` is the one
  exception and is excluded there: an empty image slot hides itself inline through
  `setFieldValue`, and `resetGraphicInline` restates that after clearing.
- **infographics/** - ig01…ig39 (prefix 'infographic'; design owns fields + runtimeExtraJs) +
  igPresets (count-up / bars-grow / ring-fill / rows-cascade / **goal-ring** / **milestone-run**)
  + **igMotion.ts** + **dataRuntimes.ts** (the rebuilds several designs of a type share:
  schedule rows, bar rows, the GOAL meter in its two drawn shapes, the MILESTONE track).
  `goal-ring` is its own preset and `infographicGoalRing` its own builder for a reason: on a
  poll ring the middle figure IS the percent, so one number drives both; on a goal meter the
  figure is money and the ring is raised/goal, and feeding the raised total to `ring-fill`
  would clamp it and draw a full ring at 3 % raised. The milestone track spaces its nodes
  EVENLY and interpolates the line BETWEEN them rather than plotting current/max - a rail
  drawn "1 → 2 → 3 → 4" has to have its line mean a position on that rail, and even spacing is
  what keeps four labels readable when a stretch goal is ten times the first. DATA BLOCKS via
  convertToDataRegion. EVERY infographic's motion is MEASURED - the stat counts to the figure the
  operator typed, each bar grows to its own `data-value`, the ring draws to that percent, and the
  cascade runs one row per line they wrote - so none of it is a number a keyframe can hold, and it
  all lives in the category motion runtime (see below). The region keeps only the panel entrance
  (real, editable keyframes) and NAMES the measured part. A count-up design may or may not pair a
  progress bar with its figure, so `PresetConfig.hasBars` tells the preset - without it a bar-less
  design (ig01) would carry a phantom timeline layer for an element it doesn't have.
  **ig38 "Results Rail" is the category's first SIDE PANEL** - a fixed-width column at the frame's
  edge that stays up while an anchor talks, rather than a centre-frame board that is shown and
  cleared - and it reuses `seatBarsRuntimeJs` for its rows. **The trap it paid for, binding on
  anything else that reuses a repeating runtime with a different composition in mind:** that
  runtime nests the figure's cap INSIDE the bar's fill (so the readout rides a growing tip), so a
  design that wants the figure pinned at one edge cannot express that as a grid column - the fill
  is the cap's containing block, not the row. The rail takes the whole TRACK out of flow across
  the row (the wash) and pins the cap against it, and reserves the figure's lane with the row's
  own padding, because an out-of-flow cap reserves no width. The first draft laid the row out as
  `label | figure` and rendered every figure on top of its district's name.
  **ig39 "Key Figures" is the other half of that lesson** - the catalog's first TWO-COLUMN STAT
  LIST (a header band, `label | figure` rows, a footer rule with the source and the date). It is
  what a design gets when the runtime is written for the composition instead of borrowed: label
  and figure are SIBLINGS in `statListRuntimeJs`, so the row is a real grid and the figures share
  an edge because they share a column. Two rules it holds beyond that, both stated in its source:
  a figure is rendered exactly as typed (nothing parses it, because nothing derives a share from
  it, so "€4.21bn" and "12.4 %" survive intact), and a stat column asks for **lining** numerals as
  well as tabular ones - the editorial text serif defaults to old-style figures that ride at
  x-height with 3, 4, 7 and 9 below the line, which put "42" lower than "18,400" beside it and
  broke the baseline every figure shares with its label. `tabular-nums` alone does not catch that,
  and neither does the numerals gate: it measures whether a figure's box MOVES, and old-style
  digits are perfectly stable at the wrong height.
  **The ELECTION NIGHT mini-pack is ig34-ig36** (the catalog's first EDITORIAL infographics, all
  siblings of lt25 "Masthead"): a seat board whose parties are one "Party | seats" textarea, a
  coalition majority meter, and a turnout dial. Three rules they hold, each written into the
  runtime that owns it (dataRuntimes.ts):
  - **A seat board's bars are scaled against the BIGGEST PARTY, not the chamber.** Chamber-scaled
    bars are stubs (76 of 200 is a 38% bar) and the party-against-party comparison the board
    exists to make is exactly what the stubs stop showing. The scale is a DRAWING choice: the
    figure at each tip is the seat count they typed, never a share.
  - **The majority is a LINE ACROSS the track, not the track's end.** Running the meter to the
    majority would draw a full bar the moment a government is formed and have nothing left to
    say about the seats won past it, which on a count night is most of the story. That is why
    `majorityMeterRuntimeJs` takes THREE numbers where the goal meter takes two.
  - **The comparison figure is optional by construction.** Clear the turnout dial's hidden
    previous-turnout source and the swing line empties, which `:empty` removes - a first
    election costs the operator one deletion, not a different graphic.
  The one that builds markup (ig34) escapes operator text at the data boundary like the rest of
  the category; the two that only DERIVE text (ig35, ig36) write `textContent`, so their operator
  text is inert by construction rather than by escaping - each says so in its own source, because
  "no escaping here" has to read as a decision rather than as an omission.
- **versus/** - vs01…vs02 (prefix 'versus', type 'fullscreen', SELF-ASSEMBLED like scoreboards;
  fixed field contract f0/f1 team names, f2 event line, f3/f4 logo filelists with visible
  placeholder marks; steps '1' - the sides are simultaneous) + vsPresets.ts (vs-slam /
  vs-glide: edges-meet slides + a VS pop, real keyframes only, DATA BLOCKS via
  convertToDataRegion). Born from the AI benchmark's versus-card winners - the full-frame
  match-up that once misfitted the info-card contract (dropped card05) now owns its contract.
- **importedDesign/** - imp01 (prefix 'imported-design', NOT browsable - the wizard's "Import
  graphic" entry is its only way in; CategoryInfo.group 'imported'). The wizard creates it
  BARE (an explicitly empty `lines` array, honoured by resolveOptions; the HTML/CSS carry
  teaching comments where fields will land) and hands off to the editor's Data tab - the
  assembler still renders explicit lines for a caller that passes them. The user's own flat artwork
  IS the design: `.imported-design-box` holds the `<img>` art + per-line `#fwN` mask wrappers
  (position, in the artwork's own px) around `#fN` spans (per-line type: font/size/weight/color -
  LineSpec.style). Self-assembled from shared/base.ts, NOT assembleStandard: the auto-fit
  `width: fit-content` cap would shrink frame-sized artwork (the box takes the artwork's width;
  frame-sized art anchors at 0,0, cropped art gets a zone). designPresets.ts (design-fade/
  slide/pop/blur) animates ONLY the box - artwork and text as one unit; the line presets would
  tear text out of artwork drawn around it. Steps forced off. The `#fwN` rules are the canvas
  placement drag's contract (blocks/designLayout.ts, which also owns addPlacedLine - the Data
  panel's add-field emitting a new line in this exact shape); `.imported-design-art` is its own
  registry part ("Artwork"), so the PNG and each line animate independently after creation
  (per-layer presets retarget the box motion - blocks/presetApply.ts). SCALING MODE is
  per-graphic (DesignArt.stretch, chosen in the wizard's Prepare step): fixed (default -
  byte-identical emit to before the mode existed) or horizontal 9-SLICE stretch, where the art
  becomes a border-image div - source/slice/cap-widths all in the `.imported-design-art` RULE
  (the image ref must stay a CSS declaration, never an inline style: the editor's entrance
  reset clears inline styles) - plus the stretch runtime (importedDesign/stretch.ts,
  design-owned JS outside the marked region): ONE `--stretch-x` custom property drives the box
  width, the middle band, and every [data-stretch] slot; the ladder is stretch to 4% inside
  the frame edge, then textFit shrink, then clip. The packaged SPX css hops bucket urls to ../
  (spxStarter cssForSubfolder; zip import strips the hop back). Contract + diagnosis:
  docs/IMPORT_MVP.md; E2E: e2e/import-graphic.spec.ts + e2e/import-prepare.spec.ts +
  e2e/import-stretch.spec.ts.
  **svg01 (importedDesign/svg.ts) is the same category's SVG variant** (docs/SVG_IMPORT_PLAN.md,
  the binding contract + reasoning): the SVG inlined VERBATIM, its own text/image nodes bound
  as `id="fN"` (markup edits: bound ids, `-art`, hidden `-outlined`); sanitized at import
  (assets/svgImport.ts), re-checked by the gate (rules 'svg'/'svg-binding'); overflow-only
  `textLength` fit; DESIGN_PRESETS + `design-stagger`; `fieldPlan: fixed` (fields = the mapping
  step's choices). Bound nodes + top-level named `<g>`s are registry parts, lines channel 'rise'.
  E2E: e2e/import-svg.spec.ts.
  **importedDesign/quizBehaviour.ts is the BEHAVIOUR pilot** (docs/GRAPHIC_BEHAVIOUR_PLAN.md §10):
  imported artwork driven by the answer board's own arc - select, lock, reveal. It REUSES
  `ANSWER_BOARD_MACHINE` (filtered to drop the audience branch, never copied) and
  `ANSWER_BOARD_CONTROLS` verbatim, attached with the ordinary `attachMachine`. What is new is only
  the PAINT: the catalog quiz adds a class to a row it drew, and on artwork we did not draw there
  is nothing to infer - so the DESIGNER draws each moment as its own layer and the runtime shows
  and hides it (`.imported-design-qstate` / `-qon`, ids `q-sel-N` / `q-cor-N` / `q-wrong-N` /
  `q-lock`). **Classes, never inline styles** - a snap clears inline props and the state would
  vanish while the machine still held it. Every drawn layer is OPTIONAL: a board with none still
  selects, locks and reveals. The binding is pickers in the mapping step
  (`DesignSvgQuizBehaviour`), prefilled from layer names by `proposeQuizBinding` - an accelerator,
  never a renaming ritual. **Deliberately not generalised:** no behaviour registry until a third
  behaviour says what the abstraction should be. Sample: docs/svg-samples/quiz-board.svg;
  E2E: e2e/import-svg-behaviour.spec.ts (in-app, and the export run from disk).
- **audience/** - the AUDIENCE graphics (prefix 'audience'): what the people watching sent in.
  ONE assembler, FIVE forms (`AudienceForm` in shared.ts - viewer question, Q&A card, chat
  highlight, question queue, community/prayer request), 20 designs in five per-form files
  (`viewerQuestion.ts`, `qaCard.ts`, …), four style families each. A form declares its FIELDS and
  the runtime it needs; everything else - the attribution rules, the long-message clamp, the
  style contract, the export path - is written once. Deliberate deviations from the
  one-file-per-design convention, both documented in the files: the four designs of a form live
  together (they are one object in four skins, and side by side a drift between them is
  reviewable), and the blocks they share come from **familyCss.ts** (panel / kicker / byline per
  family). DATA BLOCKS via convertToDataRegion; the Q&A card's answer is a real middle step with
  `reveals` (keyframes, not a call - so a SNAP to the answered state shows the answer).
  Two rules the category exists to hold: **the platform is TEXT, never a logo** (one operator
  field, so the same card serves YouTube, Zoom, a church app or slips of paper handed up from the
  room), and **a missing name or source renders cleanly** - `audienceRuntime.ts`'s
  `audienceAttribution()` marks the root and the CSS swaps in an `.audience-anon` element whose
  WORD lives in the markup, so it can be translated. The queue's live row is an INDEX in runtime
  data, never a state per question.
- **poll/** - the LIVE VOTE board (prefix 'poll'): the poll while it is happening, as against the
  `poll` graphic TYPE in the infographic category (ig02/ig11/ig12/ig13), which is the finished
  result chart. pl01…pl04 + pollPresets ('poll-open') + **pollMotion.ts**. Data-driven like
  tickers: a hidden #f1 textarea holds "Label | count" lines and the runtime renders the rows, so
  the bar widths AND the row count are the operator's content - measured motion, in
  `pollBarsGrow`. The result is a real middle step carrying that builder; the VOTE NOW badge
  leaving and the figures arriving are ordinary keyframes, so a snap straight to the result shows
  the result. Only the winner CALL is a lifecycle call (which row wins depends on the counts, so
  it has no fixed target - the quiz reveal's posture). A tie calls nobody and says so.
- **quiz/** - qz01…qz12 (prefix 'quiz'; f0 question, f1…fn options, hidden correct-answer and
  selected-answer dropdowns after them).
- **frames/** - fr01…fr15 (prefix 'frame', type 'frame', SELF-ASSEMBLED like infographics: the
  DESIGN owns its fields, because a frame's field count follows its camera count - 2 lines for
  one camera, 4 for a two-up) + framePresets.ts (frame-draw / frame-fade / frame-slide). The one
  category that is not a panel of words: it is chrome around a HOLE, so `.frame-window`
  interiors stay transparent, the stage is `pointer-events: none`, and every design states its
  window rectangles in 1080p design px in its own header (that geometry IS the contract with the
  switcher). A split design repeats `.frame-window` / `.frame-plate` so ONE preset drives one
  camera or four - the trade is that a repeated class is not a unique selector, so an individual
  window is not a registry part (root, stage and every text line are).
- **transitions/** - tr01…tr04 (prefix 'transition', type 'transition', self-assembled) +
  transitionPresets.ts (transition-slam / -wipe / -sweep). **THE ENTRANCE COVERS THE FRAME AND
  HOLDS THERE** - that hold is the cut point, so every preset's entrance ends at full cover and
  every exit takes the cover off the OTHER side (a transition that faded up and down in place
  would expose the cut). The panels are authored AT their covering position in CSS, so a
  thumbnail or a baseline still captures the cover moment. What clears it is the transition
  TYPE's machine (types/transitions.ts): a `timer` arrow from the entrance waypoint straight to
  the exit plus `exitOnNext`. **No preset schedules anything** - a setTimeout in a template is
  motion the timeline cannot see, the control page cannot pause and the render clock cannot
  drive.
- **competition/** - the COMPETITION PACK (docs/COMPETITION_PACK.md): 38 designs, 12 graphic
  types, FOUR categories over ONE self-assembler (`competition/shared.ts`) - esports/ (prefix
  'esports-score': es01-es04 series scorebugs + mr01-mr03 map/round indicators), matchup/
  (prefix 'matchup', full-frame: mu01-mu04 match-ups with a winner pick, h201-h203 head-to-head
  comparisons, pc01-pc03 player cards), results/ (prefix 'results-board': rs01-rs03 rosters,
  st01-st04 standings/leaderboards/result tables, br01-br02 brackets), reveal/ (prefix
  'reveal', full-frame: nm01-nm03 nominee reveals, vd01-vd03 verdicts, wn01-wn03 winner cards,
  aw01-aw03 award/launch reveals). Like infographics the DESIGN owns its fields + runtime; the
  TYPE owns the machine. Contract: `.{prefix}-box` > `-head` + `-accent` + `-body`, which is
  exactly what compPresets.ts tweens (comp-rise / comp-impact / comp-bloom / comp-cascade - one
  prefix-parameterized bank for all four categories, cascade STRUCTURAL because it names a
  measured builder). compMotion.ts holds those builders (compCascade composes compBarsGrow).
  **THE PACK'S RULE:** the moment is a state, what it is about is DATA - one `selected` state
  plus a `winner` field, one `judged` state plus a `verdict`, one `spotlight` plus a row number.
  A design whose Continue press fires a runtime call declares `revealSteps`, which is what keeps
  SPX's `steps` DERIVED (the quiz precedent).
  **What counts as a LINE is `visibleTextFields`, not the ftype**: a `number` field is a line
  when it is drawn in a mask (the series score) and is not one when its element is a
  `.noacg-data-source` holder (the map index, the highlighted row, the phase words). Filtering
  on `ftype === 'textfield'` conflated the two and dropped a field from the layer list the
  moment it stopped being typed as text.
  DATA BLOCKS via convertToDataRegion + a refinement (§3c above): the Continue reveal is a real
  middle step that CALLS revealAnswer() (adds .quiz-correct/.quiz-dim + pops the winner;
  update() clears the reveal). Each answer ROW carries `quiz-option` (the shared look) AND
  `quiz-option-N` (its own animation identity) - the entrance staggers them, and a stagger
  lives in the keyframe model as per-row start times, which one class matching several elements
  cannot carry. The numbered rows are registry parts, labelled by their field ("Answer B").
  **The ROW COUNT is a parameter** (`QuizContent.answers.length` - 2, 3 or 4): a true/false
  board, a three-way and the classic four-answer board are the same graphic with a different
  number of rows, so the letter alphabet, the two hidden field ids and the preset's row list all
  derive from it, and n = 4 derives exactly the strings the four-answer board always emitted
  (byte identity, pinned by the catalog baseline). `assertRowsMatchAnswers` throws when a design
  draws the wrong number of rows - the one thing the assembler cannot derive from the design, and
  silent in every other check. All three boards share ONE machine (types/answerBoard.ts): because
  the pick is DATA, halving the rows changes no state at all.

## THE STAGE: which graphics may change size with the operator's text

`width: fit-content` (DESIGN_LANGUAGE §5) is the catalog default and only HALF right. On a
NAMEPLATE it is the convention - a strap cut to the guest's name. On a BOARD it is a defect: the
panel is back all evening with different content, and an audience reads a graphic that re-sizes
itself as a broken one. **Full contract, measurements and traps: `docs/FOOTPRINT_STABILITY.md`.**

- **HUG** (keeps `fit-content`): lower-third, corner-bug, end-credits, imported-design, ticker,
  and the full-frame frame / transition / versus. **FIXED** (declares a stage): every other
  category. Owner-ratified 2026-08-20, with the overflow answer - inside a stage text WRAPS, then
  SHRINKS to the type floor, never widens the box.
- **The mechanism.** A design declares `stageWidth` (px at 1080p). `stageBoxCss`
  (shared/base.ts) emits the width, the `--stage-width` marker, `box-sizing` and where the slack
  goes; `stageExtraJs` (shared/stageFit.ts) emits the runtime that holds each line - and the panel
  itself - to the height it was drawn at. Omit it and the output is byte-identical to before.
- **The instrument** is `scripts/footprint-stability-sweep.mjs`; **the gate** is
  `e2e/catalog/footprint-stability.spec.ts`, which selects on the marker rather than a list, so a
  category is covered the day it flips. **Measure BOTH axes** - a `min-width` floor does not
  stabilise a board, it changes which dimension moves.

## The :root style contract

Every template exposes `--accent`, `--text-color`, `--text-dim`, `--panel-bg`, `--font-heading`,
`--scale`, `--type-scale`, plus whichever SHAPE tokens its stylesheet reads
(`src/model/themeTokens.ts`). Both style surfaces read/write exactly these through the ONE
shared control set (`src/components/style/StyleControls.tsx` — see src/components/AGENTS.md),
swap the marked `@font-face` block (bundled or imported), re-anchor the root element via
`zoneDecls`, and can import a typeface post-creation. **Two size knobs:** every dimension is
authored as `calc(Npx * var(--scale))` (whole-graphic size; resolution is folded into `--scale`
by `computeScale`), and font sizes additionally multiply by `var(--type-scale)` (text-only
size, a raw multiplier — **S 0.85 · M 1 · L 1.2**, declared once in
`model/styleVocabulary.ts` `TYPE_SIZE_STEPS`; the graphic-size ladder beside it is
0.8 · 1 · 1.25). Nothing but `font-size` consumes `--type-scale`.

**`--font-numeric` is the one token that follows the CHOSEN typeface rather than the family**
(`src/templates/shared/numerals.ts`, DESIGN_LANGUAGE §1), so a live number never changes width
as its digits change: the heading face where its digits are even, that face's paired bundled
SIBLING where they are not, a monospaced stack only when there is no pairing. Every site that
writes `--font-heading` must write this too — `model/fonts.ts` `numericFontStack` is the one
resolver and `scripts/numerals.mjs` is the gate.

A sibling means a SECOND bundled `@font-face`, like a family's label face. `rootVarsCss` emits
it, and only when the token was actually declared — a design that shows no live number gets
neither the variable nor the extra font file (measured: sb01 bundles saira + oswald, gt01
bundles inter alone). The export writers need no change: they collect fonts by scanning the CSS
for `url("fonts/…")`.
EXCEPTION: an imported design declares NO `--type-scale` (`rootVarsCss(..., { typeScale:
false })`) — each placed line sizes itself from its own rule, and the Style panel keys its
"Text size" section on the var's presence, so declaring it would show a dead knob.

## Template runtime rule

Generated template.js loads in `<head>` in exported packages - any load-time DOM work (initial
rebuild/paint) must use the DOM-ready guard pattern (see shared/clock.ts or the rebuild calls in
the credits/tickers/infographics runtimes).

**Operator text reaching `innerHTML` is ESCAPED at the data boundary** - `escapeHtml()` (emitted
from `shared/base.ts` `ESCAPE_HTML_JS`), applied where the runtime READS the field, not inside
each design's row builder: the builder is the part a design rewrites, so the safety of the
category must not depend on remembering the rule. Tickers escape in `rebuildTicker()` +
`tickerShowCurrent()`, credits in `parseCredits()` + the end block's year and logo path (that
one lands inside an `src="..."` attribute), the repeating-data and competition runtimes at
their own rebuilds. **A field value is not always typed by the operator** - the show-chat block
writes what an anonymous audience member sent in, and the control layer writes staged data - so
an unescaped field is a way for someone outside the studio to run code inside the graphic. A new
category that builds rows with `innerHTML` inherits this rule; `e2e/template-escaping.spec.ts`
drives every catalog variant with a markup payload and fails if any of it executes.

## Fields & images (the broadcast field policy)

**EVERY meaningful visible string is a field.** A template exists to be re-used by people who
never open the code, so a word baked into the markup is a word nobody downstream can change -
and in practice the ones that get baked in are exactly the ones a second broadcaster needs
different: a countdown's "BEGINS IN", a poll's "VOTE NOW", a phase chip's "LIVE", a severity
flag's "Warning", a sponsor rail's "PARTNERS". Language is the obvious case, but house style
is the common one. `node scripts/field-coverage.mjs` is the gate (root AGENTS.md); it drives
every field and reports whatever did not move.

Three rules keep this from fighting the rest of the model:
- **A repeated structure stays ONE `lines` field**, never `f7`…`f26` (see the repeating-data
  system below). "Every value is editable" is about REACH, not about field count.
- **A state's WORD is a field; the state is not.** An operator event carries state, not copy -
  the machine says the graphic is live, the broadcaster says what "live" is called. The pattern
  is hidden word sources the runtime reads (`cornerBug/statusParts.ts`, the esports phase chip,
  the alert severity flag), so nothing about the wording lives in the machine.
- **A word source the operator can edit must repaint on `update()`**, not only when its state
  is next entered. An operator who retypes a word, sees nothing happen, and concludes the field
  is dead is the failure this costs one line to avoid (`paintPhase()` in the esports runtime).

The deliberate exceptions are small and argued in the gate: the versus mark (it IS the graphic),
and an image field's empty-slot placeholder (that text is the field's own empty state and the
picked file replaces it).

- Field types offered to users are the ones live graphics actually use: `textfield`, `textarea`,
  `number`, and **`filelist` = the image field** (SPX lists files from
  `assetfolder: './images/'`). `dropdown`/`checkbox`/`color` exist in the SPX format but are
  reserved for genuinely constrained design choices (e.g. the quiz's correct-answer dropdown) -
  don't offer them in generic field UIs.
- Every runtime writes fields through the shared `setFieldValue` helper (base.ts
  `setFieldValueJs`): text -> textContent, `<img id="fN">` -> src (an empty value hides the img
  and toggles `.has-image` on its parent so CSS can show a placeholder). Data-driven categories
  may instead keep the path in a hidden source div (credits' #f2 logo).
- Logo slots are real SPX fields, declared as a VARIANT CAPABILITY
  (`TemplateVariant.logo: 'none' | 'optional' | 'built-in'`): built-in designs (corner bugs,
  credits' f2) always carry their slot; 'optional' designs get the wizard's Fields-step logo
  toggle + custom upload and only emit the field when it's on (`ResolvedOptions.logoEnabled`).
  **The capability is the whole answer, including for a category that used to hard-wire it.**
  End credits declared f2 for every design regardless of what the variant said, so a design
  with no place for a mark still shipped the operator a Logo field it could never draw; the
  assembler now gates the field, the hidden source AND the runtime's lookup on `logoEnabled`
  (cr13 is the first credits design to declare anything but `'built-in'` - `'optional'`, so its
  colophon has no mark by default and gains one when the toggle is on). A phantom field is not
  cosmetic - it is a lie on every generated control page, and it moves every baseline when it
  is removed. **A design gating a logo must gate its logo CSS on `logoEnabled` too**, or the
  default build changes and every baseline moves for a slot nobody asked for.
  A design either hand-authors its slot (lt07's badge, lt08's docked square, card03) as
  design-owned `extraFields` (id computed after all user fields), or opts in with zero code:
  `shared/logoSlot.ts` `applyLogoSlot` injects the standard slot (filelist field +
  `<img id="fN" class="{prefix}-logo">` leading the box + placeholder CSS) from
  `assembleStandard` when `logoEnabled` and `designHasLogoSlot` says the design has none.
  **The shared slot has TWO arrangements, decided by the category, never per design:** lower
  thirds place the mark BESIDE the text - the box becomes a two-column, ONE-ROW grid, the
  design's own children gathered into a `.{prefix}-lockup` beside it and the mark vertically
  centred on that whole stack - because the 2026-08-13 Pro brand round's blind review made
  compactness a standing rule ("do not place a logo above or below the lower third; prefer
  beside"); every other category keeps the stacked band above the text, because a card is a
  vertical composition and a mark above its heading reads as a header. An EMPTY slot changes
  nothing in either arrangement: the hidden `<img>` stops being a grid item and its margin -
  which is where the clear space lives, deliberately, rather than in a track gap - goes with
  it. Pinned by `e2e/wizard-logo.spec.ts`.
  **A MARK IS NOT A PICTURE, and the slot has to be drawn for that.** The shared slot is a BAND
  sized by height with its width free - it was a 56px square until 2026-08-09, which held a crest
  and reduced a 4:1 wordmark to a 20px strip and a 10:1 sponsor rail to about 8px, so "bring your
  logo" was true only for a shape most brands do not have. It also carries NO radius and NO crop:
  `src/ai/assetIntegrity.ts` refuses both on a picture the user marked "use it as it is", and the
  two contracts had simply never met. A slot that holds CONTENT rather than a mark - ls25's
  release artwork, which is square by nature and correctly cropped - says so with
  `TemplateVariant.imageSlot: 'picture'`. Measured by `node scripts/ai-lite-brand-audit.mjs`;
  findings in `benchmarks/lite/BRAND-AUDIT-2026-08-09.md`.
- The preview iframe can't resolve `images/...` paths set at runtime - preview/composeDocument.ts
  injects a MutationObserver shim that swaps known relative paths for their in-memory data URLs.
  Exported packages never include the shim.
- Asset path convention (uploads at `images/<file>`, fonts at `fonts/<file>`, one-folder zip
  layout): see src/export/AGENTS.md.

## Easing doctrine

model/easings.ts + DESIGN_LANGUAGE §4: entrances use Out-direction curves, exits use In-direction
and run faster; Back Out for pops; Bounce/Elastic playful-only; Linear only for continuous motion
(credits rolls, ticker marquees - strictly `ease: 'none'`).

## Broadcast packages (siblings)

Graphics made in one project must read as siblings - DESIGN_LANGUAGE §8 holds the per-family
cross-category tokens (minimal / sport / glass / **noacg house** shape, type, and motion values;
noacg is the product's own on-air look, rebuilt from the brand-kit overlays). Two mechanisms
enforce it: the **project brand** (model/brand.ts, captured on every wizard Create; the wizard's
"Use current project's colors & typeface" toggle - off by default - re-applies palette + font via
`brandPatch`) and **sibling judging** (every new category variant is judged against its
lower-third counterpart). Custom colors enter through the wizard's Custom palette (hex/rgba +
picker); imported fonts become template assets (`fonts/<file>` data-URL) with a visible
`@font-face`, are registered via the FontFace API for the builder UI, and ship as real binaries
in the export.
