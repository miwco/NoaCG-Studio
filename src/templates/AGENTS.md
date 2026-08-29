# src/templates - the wizard catalog and template contracts

Loaded alongside the root AGENTS.md when working in this directory (Claude reads it via this directory's CLAUDE.md import; Codex reads it directly). Keep it accurate. Read
docs/DESIGN_LANGUAGE.md before generating or judging templates. After template changes, run the
catalog sweep for the affected category (root AGENTS.md, "Verifying changes").

**Thirteen subdirectories own their own contract** - `types/`, `pack4/` and the eleven categories
listed under "Categories" below - each an `AGENTS.md` with a thin `CLAUDE.md` importing it, loaded
only when you work in that directory. A section that describes ONE directory belongs there, not
here: this file is read in full by every session touching any template.

**START WITH `npm run catalog:affected`.** It reads the diff and says which designs the change can
move, then prints the exact battery - scoped with `--only <ids>` where it could attribute the
change to named designs, and the whole catalog where it could not (a category's `shared.ts`, a
preset bank, `types/`, fonts, the theme tokens, `src/blocks/`, a gate script, a baseline). Editing
one design should cost one design's worth of machine time. Nothing about WHAT is measured changes -
only how many designs it is measured over, and the NIGHTLY runs all five unscoped (CI carries the
emit gate and the calibration tripwire; the four sweeps are nightly-only, as they always were).
`npm run check:catalog-emit` is the three-second first answer (emitted code, hidden data holders,
name collisions) and needs no dev server. Details: docs/VERIFICATION.md.

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

**But `overflow-baseline.json` is the one file whose own updater breaks that rule.** Re-recording
it with `--update-baseline` on a clean tree produced **+12 / -98** (2026-08-23): the deletions were
`-mask:y` self-clip rows on designs nothing had touched - card05, card17, card18, card21, card33,
card44, ss05, ss10, ss18 and more. Those rows sit within a pixel or two of `CLIP_TOLERANCE` (2px),
so whether they appear depends on font loading and machine load rather than on the code. A full
re-record bakes one run's coin flips into the committed reference, and the NEXT run reports the
ones that came back as regressions. **Add only the new rows by hand and leave every existing one
alone**, then re-run `node scripts/overflow-sweep.mjs --baseline` to confirm PASS:

```bash
node -e "const fs=require('fs');const p='scripts/overflow-baseline.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));j.myNewId={off:[],clip:['.prefix-mask:y']};fs.writeFileSync(p,JSON.stringify(j,null,1))"
```

Editing `shared/matchClock.ts` moves about 25 catalog hashes on its own, because every board that
reads the clock re-serializes - re-record the catalog baselines in the same commit rather than
treating that diff as a regression.

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
Every choice is drawn as a CARD with a settled MiniPreview of the real design
(wizard/steps/KitPicker.tsx) — a kit's contents are looked at, not read off a list of names.
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
  (aliases may fan out across categories, and the table is ENGLISH + SWEDISH + FINNISH since
  2026-08-28 — measured, 38 of 40 Nordic terms returned zero before it), field-weighted token
  index, `mostRestrictiveFilter` for the zero-result escape.
  **A token that reaches NO design is dropped from the AND rather than allowed to empty the
  result**, and returned as `BrowseOutcome.ignored` so the step can name it: token-AND is
  exact, so "big title" answered with an empty grid while "title" answered with 71.
  `catalogVocabulary()` is the one place that knows what the catalog can be matched on.
  **The design's id is indexed at name weight** ("sb08" finds sb08), and matching is
  FORGIVING as a FALLBACK only (owner walk 2026-08-28): a token the catalog reaches exactly
  keeps the exact contract; one that reaches nothing may match one edit away or mid-word at
  half weight (`wordMatch`), and a one-edit miss on an alias key lands on that alias — never
  under `briefTerm`, which keeps the strict AND throughout. Facet values without catalog mass are
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

- **The lead dropdown carries BOTH LEVELS IN ONE LIST** (proposal §19 Option A, owner
  2026-08-27): the ten CATEGORY GROUPS (`browsableGroups` over `CATEGORY_GROUPS`,
  model/taxonomy.ts — user-facing shelves derived from the catalog's real composition) as
  SELECTABLE heading rows, and the member categories (`browsableCategories`) NBSP-indented
  under them, every row with its live count. No `<optgroup>` and no "All <shelf>" row: the
  heading itself is the whole-shelf answer (owner walk 2026-08-28 — the label+All pair read
  as a duplicate); a one-member shelf is a plain option. Values are `group:<id>` / `cat:<id>`. **The member-category chip row is gone** —
  a category is now a row a reader can SEE while scanning, which is the whole point: the owner
  could not find a credit roll because "Credits & thanks · 13" only existed after picking the
  right shelf. The categories themselves grew to 27 and stayed the machine vocabulary (search
  aliases, meta, AI retrieval, the factory) — 27 flat rows was the wall the original
  one-category-dropdown decision was already fleeing at 22, and nesting is what makes them
  readable. A group NEVER selects
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
  helpers `pickDesign` / `chooseType` (`e2e/_browse.ts`, one `selectOption` since Option A)
  encode, and why facet specs assert
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
  spec suite they hosted, which now runs against a SAVED legacy template instead (e2e/timeline-v2.spec.ts).
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
  **UPDATE RE-ARMS A RUNNING CLOCK** (owner walk, 2026-08-29). The length is DATA, so a new
  value takes effect the moment the operator presses Update - running, paused or idle - and the
  graphic does not change state to do it (`update()` writes fields; events move states). Until
  this, a running clock read its length once at `startClock()` and the only way to correct a
  countdown on air was to take it out and back in. The safety is that `clockDataUpdated()`
  re-arms **only when the clock's own fields changed**, so an Update carrying a new headline
  never restarts the count under it. Every design that emits `clockRuntimeJs` owes that call in
  its `update()`: `startingSoon/shared.ts` and `gameTimers/shared.ts` make it directly, and
  `importedDesign/svg.ts` adds it as an update hook when a layer is bound as a countdown. Pinned
  by the Update case in `e2e/holding-pack.spec.ts` and the paused case in
  `e2e/graphic-types.spec.ts`. The match clock and the debate clock have always re-derived on
  the wire (`matchClockUpdate` / `speakingClockUpdate`); this is what makes the countdown agree
  with them.
- **shared/textFit.ts** - the FIT-TO-SLOT runtime for placed text lines (the imported-design
  contract): `fitPlacedText()` condenses a `data-fit="shrink"` line to its wrapper's max-width
  by reducing font-size (never by distorting the chosen typeface), floored at 55%. Design-owned
  JS emitted OUTSIDE the marked region, injected idempotently by blocks/designLayout.ts
  `ensureTextFitRuntime`; the shared `update()` calls it via an optional hook (the
  `revealNextStep` idiom). It re-fits on `document.fonts.ready` as well as DOM-ready - a
  DOM-ready-only pass measures the FALLBACK face and overflows once the real one swaps in.
  **The RASTER import is its only caller now**: an imported SVG fits its placed lines with the
  FIT LADDER instead (importedDesign/svg.ts, docs/SVG_IMPORT_PLAN.md §6b), so `ensureTextFitRuntime`
  recognises that design by `SVG_TEXT_FIT_MARKER` and leaves it alone - one fit per graphic, and
  the ladder is the one that can report a too-long value to the operator.

## types/ - the GRAPHIC TYPE registry (docs/GRAPHIC_TYPES.md)

A **type** declares what a graphic IS - structure contract, fields, state groups and default
path, control events - independent of what it looks like; a **design** is one look. A type is a
DECLARATION, not a second way to build a template: `variantsFromType` compiles one into ordinary
TemplateVariants that go through the category assemblers, and **the rule is *persist a machine
only when the derived one is wrong***. The full contract - the field-list limit, the field plan,
`WizardOptions.content`, the timer trap and the neutral scaffold - moved to
**`src/templates/types/AGENTS.md`** (with its thin `CLAUDE.md`), which loads when you work in
that directory.

## pack4/ - the TITLE / TOPIC / INFORMATION pack

36 designs over nine graphic types; nothing in it is a new mechanism (the word-shaped ones build
on the info-card assembler, the two LIST boards on the infographic one). Its contract - the skin
vocabulary, the words, the markup rules and the three traps a parallel-group type pays - moved to
**`src/templates/pack4/AGENTS.md`** (with its thin `CLAUDE.md`). The design files themselves live
in `infoCards/pack4/` and `infographics/pack4/`.

## Categories

**A category whose contract outgrew a paragraph carries its own `AGENTS.md`** beside its
code (with the thin `CLAUDE.md`), loaded only when you work in that directory. A new design
writes its lesson there, never back into this file - which is what keeps every session's
instruction chain affordable (`npm run check:shared-instructions` prints the headroom).

- **lowerThirds/** - lt01…lt67 (six ids retired 2026-08-28, never re-minted) plus the
  ls01…ls41 SPECIALIST pack -> `lowerThirds/AGENTS.md`
- **infoCards/** - card01…card71, the standard contract's other line-based family ->
  `infoCards/AGENTS.md`
- **endCredits/** - cr01…cr13 (cr10 retired 2026-08-28, never re-minted), the LIST category
  (rolls, walls, boards) -> `endCredits/AGENTS.md`
- **startingSoon/** - ss01…ss20, every screen shown while the show is NOT happening ->
  `startingSoon/AGENTS.md`
- **scoreboards/** - sb01…sb25, the sports boards and `shared/matchClock.ts` ->
  `scoreboards/AGENTS.md`
- **cornerBug/** - bug01…bug36, the IDENTITY family -> `cornerBug/AGENTS.md`
- **infographics/** - ig01…ig39, where every motion is MEASURED -> `infographics/AGENTS.md`
- **importedDesign/** - imp01 + svg01, the user's own artwork and the BEHAVIOUR pilot ->
  `importedDesign/AGENTS.md`
- **audience/** - what the people watching sent in, five forms -> `audience/AGENTS.md`
- **quiz/** - qz01…qz12, the answer boards -> `quiz/AGENTS.md`
- **competition/** - the COMPETITION PACK, 38 designs over four sub-categories ->
  `competition/AGENTS.md`

The rest are a paragraph each and stay here:

- **tickers/** - tk01…tk22 (prefix 'ticker') + tickerPresets.ts (ticker-marquee / ticker-flip /
  ticker-rotate) + **tickerMotion.ts**; data-driven: #f0 lines -> #ticker-track items; marquee =
  items rendered twice, slide one set width, linear repeat:-1 (seamless loop). DATA BLOCKS via
  convertToDataRegion. f0 items + f1 label, plus an OPTIONAL f2 second cap (a topic, a source, a
  fixed top story) emitted only when the variant declares a third suggested line - so every
  two-line ticker emits byte-identically to before it existed. **A strip that neither travels
  nor rotates does not belong here** (docs/PUBLIC_SERVICE_PACK.md §1): the static notices live
  in alerts/ and publicInfo/.
  **THE TEXT FORMAT IS `docs/TICKERS.md`** - one mark, `A COLON ENDS A KICKER`, and everything
  else is the story. `parseTickerItems` emits `{ kicker, text }`; a kicker on its own line tags
  every story beneath it until a blank line or the next kicker. Two rules differ from
  end-credits, and both are earned by what ticker designs already do with those characters: the
  colon must be **followed by a space or end the line** (tk13 writes "United 2:1 City", tk17
  "close at 20:00" - a length guard alone made kickers of all of them), and **`|` is not a
  separator** (tk17 splits an item at it into two LANGUAGES). The shared treatment is
  `.ticker-kicker`, emitted before the design's CSS so a design can restate it; a design that
  PLACES the tag itself defines `renderTickerKicked(kicker, text)` and is handed both halves
  already escaped - tk18's service column is the worked example. `renderTickerItem(text)` is
  unchanged and still the only builder a design must provide. Pinned by
  `scripts/ticker-parser.test.mjs`, which runs the EMITTED JavaScript.
  **The value axis is still per-design and not portable**: tk04, tk06, tk14 and tk22 parse a
  price or a change out of the line by POSITION and tk13 an `n - n` score, each with its own
  rule. Leave them; folding a value into the kicker's grammar mints a second mark to learn.
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
- **gameTimers/** - gt01…gt04 (prefix 'game-timer', type 'countdown'; data blocks via
  convertToDataRegion; timer-run pop + timer-line-reveal; minutes in f1; .game-timer-done
  styles time-up). The preset's startClock()/stopClock() ride the conversion as step `calls`
  (§3b); the clock runtime (shared/clock.ts) stays outside the region. gt03/gt04 are the AI
  benchmark's kids-timer winners ported onto the contract: design-owned ring/tick runtimes
  via `GameTimerDesign.runtimeExtraJs` (outside the region, following the clock's globals)
  and `GameTimerDesign.autoEase` (a design's hand-tuned default ease pair, used only when
  the wizard easing is 'auto' - an explicit pick still wins).
- **versus/** - vs01…vs02 (prefix 'versus', type 'fullscreen', SELF-ASSEMBLED like scoreboards;
  fixed field contract f0/f1 team names, f2 event line, f3/f4 logo filelists with visible
  placeholder marks; steps '1' - the sides are simultaneous) + vsPresets.ts (vs-slam /
  vs-glide: edges-meet slides + a VS pop, real keyframes only, DATA BLOCKS via
  convertToDataRegion). Born from the AI benchmark's versus-card winners - the full-frame
  match-up that once misfitted the info-card contract (dropped card05) now owns its contract.
- **poll/** - the LIVE VOTE board (prefix 'poll'): the poll while it is happening, as against the
  `poll` graphic TYPE in the infographic category (ig02/ig11/ig12/ig13), which is the finished
  result chart. pl01…pl05 + pollPresets ('poll-open') + **pollMotion.ts**. Data-driven like
  tickers: a hidden #f1 textarea holds "Label | count" lines and the runtime renders the rows, so
  the bar widths AND the row count are the operator's content - measured motion, in
  `pollBarsGrow`. The result is a real middle step carrying that builder; the VOTE NOW badge
  leaving and the figures arriving are ordinary keyframes, so a snap straight to the result shows
  the result. Only the winner CALL is a lifecycle call (which row wins depends on the counts, so
  it has no fixed target - the quiz reveal's posture). A tie calls nobody and says so.
  **pl05 "Floor Vote" is the one that is NOT a card**, and its two overrides are worth knowing
  before drawing another band here: the assembler caps every poll panel's `max-width` at 46% of
  frame, which is right for a mid-left card and silently beat pl05's declared 1560px stage -
  leaving the chart column no width and no visible bars at all - and `.poll` sets
  `text-align: center`, which a band reading from its left edge does not want. Its rows are a
  three-column grid (label, track, figure) rather than the category's label-over-bar stack, so
  the label column is FIXED: a chart whose bars begin at different x cannot be compared at a
  glance, which is the only thing a vote board is for.
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
**A REVEAL MASK IN A FLEX ROW IS A LINE THAT CAN BE SQUEEZED TO NOTHING.** A flex item normally
refuses to shrink below its own content (`min-width: auto`), and that protection is switched OFF
for an item whose overflow is not visible - which every `.{prefix}-mask` is. So a masked line in a
flex row has no floor: ls07's label may not wrap (`white-space: nowrap`) and was squeezed under its
own width and CUT - "COMMENTARY" aired as "COMMENTAR" at text size L. A masked line that cannot
wrap states `flex: none`, and the lines that CAN wrap absorb the row instead.

## THE STAGE: which graphics may change size with the operator's text

`width: fit-content` (DESIGN_LANGUAGE §5) is the catalog default and only HALF right. On a
NAMEPLATE it is the convention - a strap cut to the guest's name. On a BOARD it is a defect: the
panel is back all evening with different content, and an audience reads a graphic that re-sizes
itself as a broken one. **Full contract, measurements and traps: `docs/FOOTPRINT_STABILITY.md`.**

- **HUG** (keeps `fit-content`): lower-third, corner-bug, end-credits, imported-design, ticker,
  and the full-frame frame / transition / versus. **FIXED** (declares a stage): every other
  category. Owner-ratified 2026-08-20, with the overflow answer - inside a stage text WRAPS, then
  SHRINKS to the type floor, never widens the box.
- **THE CATEGORY LIST IS A DEFAULT, NOT A PROHIBITION** (owner-ratified 2026-08-23): *a lower
  third may declare `stageWidth` when the composition genuinely needs a bounded stage; "leave it
  unset" remains the default, not an absolute.* The test is whether the SHAPE is the design's or
  the operator's. A strap cut to the guest's name is the convention and must keep hugging; a
  design whose silhouette IS the point cannot let a long name redraw it. **`lt64` "Portrait
  Column" and `lt66` "Top Corner" are the recorded exceptions** - a 380px portrait block and a
  380px corner block, each of which stops being its shape the moment a hugging box widens to fit
  a name, so both declare a stage and `e2e/catalog/footprint-stability.spec.ts` holds them there.
  A new exception argues itself in its own source and gets added here; it does not need a
  category flip.
- **The mechanism.** A design declares `stageWidth` (px at 1080p). `stageBoxCss`
  (shared/base.ts) emits the width, the `--stage-width` marker, `box-sizing` and where the slack
  goes; `stageExtraJs` (shared/stageFit.ts) emits the runtime that holds each line - and the panel
  itself - to the height it was drawn at. Omit it and the output is byte-identical to before.
- **The instrument** is `scripts/footprint-stability-sweep.mjs`; **the gate** is
  `e2e/catalog/footprint-stability.spec.ts`, which selects on the marker rather than a list, so a
  category is covered the day it flips. **Measure BOTH axes** - a `min-width` floor does not
  stabilise a board, it changes which dimension moves.
- **THE RESERVE IS A LAYOUT NUMBER, AND IT IS SHIPPED** - the runtime writes it into the template as
  an inline `height` / `min-height` that stays there, so a reserve measured wrong is what the graphic
  puts on air. Three ways it was a measurement of the MOMENT instead of the design, all found
  2026-08-24 by chasing `catalog-baseline` failing under load with a DIFFERENT element set each run
  (docs/FOOTPRINT_STABILITY.md, last section): read off the VISUAL rect, so an animated ancestor's
  transform landed in it (gt03 reserved 418px for a 400px clock); the `fonts.ready` recalibration
  keeping the panel `min-height` it was re-measuring, so the fallback face floored the real one; and
  that same pass re-measuring while the OTHER lines were still pinned from the previous one. **A rect
  is the visual box - never measure a reserve with one.** The gate is
  `e2e/stage-fit-determinism.spec.ts` (default suite, platform-free, mutation-tested): a reserve must
  come back the same across recalibrations and whatever the webfonts do.
- **A STAGED DESIGN SHIPS THE SIZE ITS CSS DECLARES - the shrink is the OPERATOR'S, never the
  design's own words.** The stage puts no floor under a `line-height` (**a LINE MASK still does** -
  `overflow: hidden` sized to the line box against a ~1.2em glyph box, so a tight leading clips
  letters instead of shrinking them; lt64 at 1.05 loses 4px off the name. Different mechanism,
  different instrument: `overflow-sweep`, not this one). That was
  not true until 2026-08-23: the reserve was a LINE BOX and the overflow test read a CONTENT box
  (the face's glyph box, ~1.2em whatever line-height says), so any line with the tighter
  line-height of the two shrank against its own default sample at load - 200 of 290 staged
  designs, worst -23%, one typing 103px and airing 79px. `scripts/stage-fit-sweep.mjs` is the
  instrument, `e2e/catalog/stage-fit-honesty.spec.ts` the gate. A MULTICOL block is the one line the
  reserve is never pinned on - a definite height makes it spill sideways into hidden overflow
  columns instead of reflowing (`e2e/catalog/multicol-containment.spec.ts`). **The TEXT-SIZE LADDER
  is an axis, not a constant**: `stage-fit-sweep`, `type-floor` and `overflow-sweep` all take
  `--type-scale s|m|l`, because only `font-size` reads `--type-scale` and a box sized off the other
  knob changes SHAPE as the operator moves it - measured 2026-08-23: ls07, card48 and lt51 cut a
  word sideways at L (ls07 by 32px) while nineteen more report a vertical clip that is proportional,
  present at every step and mostly empty leading. Measurements: `docs/FOOTPRINT_STABILITY.md`.

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
category must not depend on remembering the rule. Tickers escape in `tickerItemHtml()`, the one
place both `rebuildTicker()` and `tickerShowCurrent()` go through and the one place a design's
`renderTickerKicked()` is handed its two halves; credits in `parseCredits()` + the end block's
year and logo path (that
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

Four rules keep this from fighting the rest of the model:
- **A repeated structure stays ONE `lines` field**, never `f7`…`f26` (see the repeating-data
  system below). "Every value is editable" is about REACH, not about field count.
- **A state's WORD is a field; the state is not.** An operator event carries state, not copy -
  the machine says the graphic is live, the broadcaster says what "live" is called. The pattern
  is hidden word sources the runtime reads (`cornerBug/statusParts.ts`, the esports phase chip,
  the alert severity flag), so nothing about the wording lives in the machine.
- **A word source the operator can edit must repaint on `update()`**, not only when its state
  is next entered. An operator who retypes a word, sees nothing happen, and concludes the field
  is dead is the failure this costs one line to avoid (`paintPhase()` in the esports runtime).
- **Hide a data holder with a CSS RULE, never an inline `style="display: none"`**: the editor's
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

## Three traps that no gate here can see

- **`tabular-nums` is not `lining-nums`.** `font-variant-numeric: tabular-nums` holds a figure's
  WIDTH and says nothing about its HEIGHT. The bundled text serifs (source-serif-4,
  playfair-display) default to OLD-STYLE figures: 0, 1, 2 sit at x-height while 3, 4, 7, 9 hang
  below the baseline. In a stat column that puts "42" lower than "18,400" beside it and breaks the
  baseline each figure shares with its label; in a tracked all-caps label it makes "2026" read as
  lowercase inside its own line. **`scripts/numerals.mjs` cannot catch it** - it measures whether a
  number's box MOVES as digits change, and old-style figures are perfectly stable at the wrong
  height, so it passes. Any figure column or caps label on a serif face writes both:
  `font-variant-numeric: lining-nums tabular-nums;`. Found while drawing ig39 "Key Figures",
  visible only in a high-DPI crop.
- **A permanent `will-change` makes a settled capture unreproducible.** Chromium promotes the
  element to its own compositing layer for the life of the page, rasterises its texture DURING the
  entrance, and never redraws it once the tween settles - so a still of a finished graphic carries
  a texture rastered at whatever sub-pixel phase the last mid-flight raster caught. One cell
  produced 5 distinct PNGs in 5 runs, differing only on glyph and panel edges. It looks exactly
  like a composer or font bug and is neither: in the measured case (2026-08-17) the language, the
  composed html/css/js, the srcdoc and every element's rect to 4dp plus 19 computed paint styles
  were byte-identical across runs that disagreed. In a capture runner, after the graphic settles,
  drop the hint for one frame and restore it - `addStyleTag('*{will-change:auto !important}')`, two
  rAFs, remove, two rAFs - then shoot.
- **Never import from `src/blocks/**` inside `src/templates/**`.** `src/blocks/edit.ts` imports
  `templates/shared/standard.ts`, so any import back the other way closes a cycle - and because
  the catalog builds at module scope, the cycle throws no readable error: **the app simply never
  renders.** On 2026-08-09 reusing `setFieldDefault` inside `templates/types/graphicType.ts` made
  45 AI/wizard e2e tests time out waiting for the "Generate" button, with nothing in the console
  naming the cycle, while the same specs passed one at a time. The templates layer sits UNDER
  blocks in the allowed import edges (`docs/ARCHITECTURE.md`); the sanctioned
  `blocks/animData` / `blocks/animImport` seam reads like a precedent it is not. If a blocks helper
  looks reusable here, copy the few lines. **A wholesale wizard/AI spec failure with timeouts and
  no error message is the signature** - check the new import before debugging the UI.
