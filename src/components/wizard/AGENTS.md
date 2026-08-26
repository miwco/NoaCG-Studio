# src/components/wizard - the creation wizard

Loaded alongside the root `AGENTS.md` and `src/components/AGENTS.md` when working in this
directory (Claude reads it via this directory's `CLAUDE.md` import; Codex reads it directly).
Keep it accurate. This chain sits close to `project_doc_max_bytes` and
`npm run check:shared-instructions` refuses a careless addition: add a RULE here, leave the
reasoning in the code's own comments.

## Wizard (wizard/)

CreationWizard (Entry -> Browse -> Fields -> Style -> Animation -> **Finish**, persistent live
preview), draft.ts, WizardPreview, MiniPreview, steps/. Creating calls `variant.create(options)`
which generates the complete, commented template. THREE entry cards (template, Create with AI,
Import graphic) in a two-column grid, plus the separated video strip; Advanced mode adds blank.
An ODD LAST CARD spans the row (`.wz-entry-card:last-child:nth-child(odd)`) and sizes to its
OWN copy — the row-alignment reserves are two empty lines on a card with no row-mate. Create
with AI is the ONE AI door - NoaCG Pro is an execution TIER inside it, never a second card;
there is no kit card either (see the kit path below).

**THE ENTRY STEP'S CONTENT** (steps/EntryStep.tsx, handoff §2a; reasoning in that file's
comments). Hero = the LANDING PAGE's headline verbatim plus a subtitle naming BOTH routes to
air - the cloud control panel and EVERY export target, never a sample of three - no second
brand mark, no export-target chip row: the targets belong in the SENTENCE, and a new export
target updates this copy too. Home = a full-width ROW whose Graphics / Productions
shortcuts are SIBLINGS of the body button, shown only when there is saved work. The video strip
is ONE LINE, carries no label of its own, and is FLUSH with the card grid. Both AI doors
(Create with AI, video) wear the Beta tag INSIDE the title. **THREE DIVERGENCES ARE DELIBERATE**, pinned by `e2e/wizard-entry-fit.spec.ts`: no
kit card, cards act on CLICK not radio-plus-Continue, Blank stays behind Advanced mode.

**THE HEADER'S TWO DOORS ARE TWO DESTINATIONS**: the brand lockup is an `<a href="/">` to the
public FRONT PAGE (as on every topbar), and `wz-home` beside it is Home. Home must stay one press
from every step - ✕ only rewinds to the front page. Every wizard-shell control answers a hover in
amber like the entry cards, stated once over `.wz-header`/`.wz-dot` in styles.css, never per button.

**EVERY STEP IS ITS OWN HISTORY ENTRY** (`#/new/step/<name>`, src/app/router.ts): the step is
named, NEVER indexed, because import mode's extra step shifts every later index. Step 0 carries
no segment, so Back off the front page still leaves. Two rules follow. The open reset seeds its
step from the route, not from 0. And **nothing the wizard renders may navigate a live frame** -
WizardPreview mounts a NEW iframe per document (keyed on its generation) because replacing an
existing frame's `srcdoc` is a subframe navigation that joins the session history, which put one
dead Back press in the walk for every rebuild.

**THE FEEDBACK DOOR IS ON THE WIZARD HEADER** (`BetaFeedbackButton area="wizard"`; Home carries
`area="home"`). Two dependencies: the header's push is a
CHAIN (`.wz-stepcount ~ .fb-open`, `.fb-open ~ .gallery-close`), since the step counter is
absent on Entry and the button absent offline and whichever exists first takes the auto margin;
and the shell behind the wizard mounts a SECOND button, so a locator says which via `data-area`.

**LAYOUT AFTER ENTRY: rail | form column | preview** (handoff §2). Entry is a card menu - NO
creation-step navigation, the rail's 216px goes to the menu - and the rail appears the moment
a card is chosen. From then on, the steps are a 216px vertical RAIL
(`.wz-rail`, still `.wz-dots`/`.wz-dot` so every spec still addresses them): number-or-green-
tick, title, and a second line naming the decision the step asks for. The rail's foot reads the PROJECT
FORMAT back for the whole walk while the control stays in the step that owns it (Browse, AI,
blank) - one decision, one home. Under 768px the rail lies down as a scrolling chip strip and
that read-back stands down (it needed ~212px the row lacks). The FOOTER belongs to the form
column, so Next sits under the form it advances, not under the graphic beside it.

Two measured constraints:
- **After Entry, the rail's 216px leaves the row before either pane sees it.** A WORKING left
  pane (`.wz-body-working`, the Import flow's Text step) lifts the measure cap and clamps the
  preview, or the placement canvas drops under the 700px floor `e2e/import-graphic.spec.ts`
  holds. **Only a step whose left pane is a CANVAS may wear it.** The SVG mapping step did,
  from when it drew its own artwork; its left pane is a form, and the class was taking the
  preview down to ~275px wide - the one surface that can run the emitted fit, on the step where
  the reader decides whether their text fits (docs/SVG_IMPORT_PLAN.md §6a step 1). Dropping it
  puts the preview back at 614x345 on a 1366x768 laptop, four times the area.
- **The Entry step's HEIGHT budget still binds** (`e2e/wizard-entry-fit.spec.ts`, 1366x768):
  cards share the column, and the grid's 10px came off the hero's title margin. Grow one, pay
  from another.

**Deep-linked open** (`#/new/<variantId>`, docs/PRERENDER.md - a prerendered template page's
CTA): the router's `design` param rides through `openGallery(designId)` into templateStore's
`pendingDesignId`; the wizard's open effect resolves it via `variantById` and, on a hit,
applies the SAME patch `BrowseStep`'s card click does, jumping straight to Fields (mode
`'template'`, step 2) - never creating a project, Finish stays the only door that does. An
unresolved id (unknown, retired, `imported-design`) falls through to the ordinary Entry-step
open.

**Finish** (steps/FinishStep.tsx - the last step of every catalog-shaped mode, design included)
is the wizard's ONE branch. It carries the graphic's NAME (`draft.name`, applied inside
`buildDraftTemplate` so it reaches the topbar, the Save prefill and the export slug through one
path; blank falls back to the design's catalog name), a read-back of what was chosen, and two
doors:
- **Open in the editor** - the classic ending. Creates and hands over; saving stays the
  user's move.
- **Export it** - creates, SAVES to the library (not optional; reasoning on
  `createAndExport`, CreationWizard.tsx), and opens ExportWindow OVER the wizard
  (`applyTemplate`'s `keepGalleryOpen`); closing the window returns to the last creation
  step, so a follow-up tweak costs no re-walk. The editor is never revealed. A FAILED save
  deliberately stays in the editor instead, where the topbar's failed status is visible.
Both doors go through `applyDraftProject`, which is what keeps them byte-identical - the
editor path formats through Prettier (`applyGenerated`), so an export path skipping it would
ship different HTML for the same choices. The footer's quiet "Create project" shortcut stands
down ON Finish and works from every step before it. The graphic's name slugs the zip AND, for
the SPX and CasparCG targets, the template FOLDER inside it - the name the operator reads in
the playout server. Pinned by e2e/wizard-finish.spec.ts.

**A closed `<details>` needs an author rule here** - the UA's `display: none` on non-summary
children loses to ANY author `display` (the Style step's disclosures wrap `.row`, a flex),
hence styles.css's `details:not([open]) > *:not(summary) { display: none }`. `toBeVisible()`
is blind to it, so specs assert measured HEIGHT is 0, never `open`.

**Browse** (steps/BrowseStep.tsx, mode 'template' only) is the FACETED template storefront
(docs/TEMPLATE_TAXONOMY_PROPOSAL.md §12 for the facets, §4c for the groups;
re-design/handoff.md §2b and src/templates/AGENTS.md for what they are drawn as):
search (alias-aware, src/templates/search.ts), optional
programme family/format selects (RANKING — "Best for X" / "Also works" sections, never
exclusion), ONE category-GROUP dropdown with live counts (ten shelves over the 27 graphic
categories) whose selected group offers its member categories as chips (only when it has more
than one), field-count buckets (range-intersection over the reachable visible range),
style-family chips, and the specialist facets (structure / capabilities / placement-motion)
behind the Filters disclosure. Filter state lives in
CreationWizard (`browseFilters`) so Back returns with filters intact; the setter is passed as
a REACT DISPATCH so chip toggles compose as functional updates (two clicks in one batch must
never overwrite each other). Zero results name no template dishonestly: the empty state
offers "remove the most limiting filter" (computed: the chip whose removal restores the most
results) and a Create-with-AI hand-off. Cards carry the strict info budget (category ·
subtype, top families, field summary from semantics, ≤3 capability badges, style family,
complexity), with everything the budget excludes one ⓘ click away in the card's detail panel
(a SIBLING button of the card button, never nested; one panel open at a time). The footer's brand
toggle feeds `brandFamily` as browse CONTEXT, not a filter: the package's siblings rank
first, no chip appears, Clear-all leaves it alone, and a genuine programme match always
outranks it. MiniPreview mounts its iframe only when the card scrolls into view
(IntersectionObserver).

**IT SHOWS A PAGE, NOT THE CATALOG** (handoff §2b). `PAGE_SIZE` = 12 plus **"Show 12 more"**,
and the step states both numbers — `Showing 12 of 82`, `data-testid="wz-browse-count"`. Three
rules: `browseTemplates` still returns the WHOLE result and gains no limit argument (the total
is what the count line reports); the limit is spent on the RANKING then split into the two
sections, so "Show more" walks "Best for" into "Also works"; and the page resets on any result
change, derived during render off a signature, never in an effect (flash reasoning in
BrowseStep.tsx). For SPECS: search for a named design (`pickDesign`, `e2e/_browse.ts`) and assert
`resultTotal`, never a `.wz-variant` count.

**THE KIT PATH — one door, at the top of Browse** (docs/PACK_TAXONOMY.md, "The wizard
surface"). `.wz-buildmode` (ONE GRAPHIC / A WHOLE KIT) swaps the step body between the design
grid and **KitPicker** (genre preset, then checkboxes over `templates/kit.ts` `kitChoices`);
the format picker and the SEARCH sit above the branch — one box: designs on one side, shows and
the graphics a kit can hold on the other (facets stand down).
Filtering hides rows, never unticks them, and the count stays the whole SELECTION.
Picker state lives in CreationWizard like `browseFilters`. A kit then walks the SAME six steps
a single graphic does (`mode` stays `'template'`; `KitPlan`, wizard/kitPlan.ts, makes each step
one graphic OF A SET) plus **KitTray**, **KitLookStep** and **KitFinishStep**. What
they must not break: the tray is the second axis of progress, in the rail's vocabulary, its
done chips MiniPreview in `lazy` mode (its one caller), not navigation; the
look question is a bordered card, never a modal (it would cover the rail and tray), and its
yes is a deterministic transform over the `:root` contract and
NOTHING else (`kitLookPatch` — the motion preset carries only where the target design DECLARES
it, and the brand toggle reaches every graphic of the set); both Finish doors SAVE
FIRST, every write claimed (see "Save + Home"), export asking the production page for its
dialog via templateStore's one-shot `pendingProductionExport` and NAMING the production it
packages, which is the whole pool; and the kit's last rail entry is not a jump
target (the graphic in hand was BUILT), while re-finishing the tone-setter re-propagates.

**ONE disclosure, EVERY width, closed by default** (`.wz-browse-drawer-btn` +
`.wz-browse-filters`, handoff §2b; the cost of two is in BrowseStep.tsx's comments). LEADING
the step: search, the type select, the style families. Behind the toggle: programme, field
counts, structures, capabilities, motion — with the active count on it, so a narrowed catalog
never reads as an empty one. The LEAD ROW is a GRID of two lines (select + Filters, then the
chips), never one wrapping flex line - this step's column halves the moment a design is
picked, and a flex row degrades there into a chip stack beside a lone select.

The shared PROJECT FORMAT picker (`ProjectFormatPicker`, aspect / resolution / FPS,
`.wz-browse-format`) is not a facet — `browseTemplates` never reads it — so it never sits
inside the filter drawer. On Browse it is three bare selects in ONE row, since the rail
captions and reads back the format; each label's text is hidden via `.project-format-label`,
kept in the DOM for a screen reader — hide the WORDING, never the control, and every other
caller renders the picker unchanged. The same controlled picker appears before generation or
placement in AI/Lite, Import Graphic, blank, video AI, and the older import/catalog
continuation; draft selection survives route switches. Blank is a setup step, never an
immediate default-format create. The import-images
continuation (mode 'import') keeps the old ImportStep -> TemplateStep flow and indices; the
catalog flow's later steps sit one index earlier (`animStep`), and FINISH follows Animation
in every mode (`finishStep = animStep + 1`).

**Import graphic** (mode 'design': ImportDesignStep + PrepareDesignStep + PlaceFieldsStep +
the shared AnimationStep) is a SETUP flow, not a second editor:
Start -> Design (choose project format, then drop the image - any raster the browser decodes
with an intrinsic pixel size, the measurement every downstream number comes from; live preview
from the moment it lands; Create is available from here on - every later step is an optional
stop) -> Prepare -> Text -> Animation -> Create.
The **Text step** (PlaceFieldsStep) places editable fields ON the artwork: T = click point
text, ⬚ = drag a wrapping area box, 🖼 = drag a picture SLOT (a filelist field, both
dimensions the user's); move/resize/Delete; per-field name, preview text, and full typography
with a live styled render on the placement canvas. **It opens with the fields already placed** where the
artwork has an empty panel (`assets/suggestFields.ts` - deterministic, no model call), ONCE
and only into an empty step; `✨ Suggest fields` re-runs it. Artwork with no flat panel
refuses out loud and the manual tools stand unchanged. Specs live in `draft.designFields` (DESIGN px) and
become REAL placed fields at build - draft.ts `withDesignFieldSpecs` runs addPlacedLine +
setLineTextStyle + setLineFit, so wizard placement, editor, preview, and export agree by
construction (browser-verified pixel-exact). The **FontPicker** (wizard/FontPicker.tsx,
searchable): bundled OFL faces; the ~1,900 Google Fonts families (model/googleFonts.ts -
fetched at DESIGN time, emitted code never references Google, the panel names the IP
disclosure); upload (woff2/woff/ttf/otf -> CustomFont in template.assets + every export); Local
Font Access (Chromium, permission-gated). Every source EMBEDS, so playout never depends on the
machine's fonts. The **Animation step** is the standard one - with ONE difference for this category:
the UNIVERSAL in/out bank LEADS (`components/MotionPresetPicker.tsx` over
`blocks/motionPresets.ts` - ten unit motions drawn as SIX family cards) in place of the
category's four whole-unit presets, which the bank stands in for (`draft.ts`
`isWholeUnitPreset` hides their cards; the SVG layer stagger stays beside them); a pick lives
in `draft.animation.motionIn/motionOut` and is written AT BUILD by `withUniversalMotion` (the
default maps design-fade -> fade, so an undecided design lands on the same data the card it
shows lit would write), through the same engine the saved graphic's control page applies after
- so the wizard preview, the created graphic and the page that reads it back agree by
construction. Pinned by e2e/motion-presets.spec.ts.
The **Prepare step** carries the two artwork decisions: ERASE baked-in text (source-px rects
drawn on DesignPrepCanvas -> assets/eraseRegion flat-fill; flat verdicts apply immediately,
non-flat holds behind "Use it anyway"). **It OPENS with the box already drawn** -
`proposeEraseRect` scans the artwork on arrival, so the flow's strongest path is not opt-in;
the proposal is an OFFER (drag the box or its four grips, "Erase this", or dismiss to the
manual tools), never applied pixels, it re-runs on the CLEANED artwork after every accepted
erase, and under its confidence bar it proposes NOTHING and names the rule that refused
(`erase-scan-refusal`; reasoning in eraseRegion.ts).
Its overlay CSS is wizard-local (`prepProposal.css`), not styles.css. **"It's meant to be
there / no baked text" is DRAFT state** (`designKeepBakedText`): Prepare stops re-proposing
on return and the Text step's note stands down; "yes, mark it" clears it, a fresh drop
resets it. **The Text step re-scans the artwork and says so when detected text remains
un-erased** (`placefields-baked-note`: back-to-Prepare door + keep answer) - Next never
blocks, the fact travels. The pending non-flat fill offers hold-to-compare, its discard
says "keep the text", and an applied mark keeps `DesignEraseState.segments`.
Marks ACCUMULATE into `draft.designErases`, each run
against the artwork as it stands; removing one REPLAYS the survivors from
draft.designOriginal so fills never compound (a fill cannot be undone in place). The erase MEASURES the ink it removes, split into LINES, and every line seeds a real
field at create from that line's own bounds, cap height, top, and the edge it was set from,
never from the loose rectangle the user drew. The SCALING MODE is fixed default / horizontal
9-slice stretch with draggable guides + a content-width demo slider that pushes sample text
through WizardPreview's demoText prop into the real emitted runtime; with stretch and no erase
the PREVIEW build adds one demo line that Create strips. The create hands off to the editor
with the Data tab revealed
(setActivePanel('data') + the store's panelRevealNonce). Fields, styling, and motion all live
in the editor: the Data tab's placed add, the canvas gestures, the Inspector's Style/Animations
tabs. FieldsStep/StyleStep carry NO imported-design branches any more - design mode never
reaches them. **THE SAME DROP ZONE TAKES A LAYERED SVG** (mode **'svg'** - like 'file', Prepare/Text
cannot apply): ONE mapping step, MapSvgFieldsStep - text layers, pictures, and the OUTLINED-TEXT
rows (a ticked glyph group is hidden and a placed line stands in, its box MEASURED on the step's
own inline render, never the preview iframe; draft.ts `withSvgOutlineFields` via addPlacedLine).
What is OFFERED is decided in assets/svgImport.ts, and three rules there are load-bearing: a
`<tspan>` is a LINE or a KERNED RUN and only the measured GAP tells them apart (`groupRuns`);
hidden layers and `<defs>`/`<symbol>` text are never offered; outline rows are RANKED by whether
the measured shapes read as a line of type, and never filtered.
**EVERY detected text row starts ON** - the `f:` prefix names a field and guarantees it, and
never turns the unmarked rows off (only a PICTURE, which defaults off, is switched on by it).
The step has a measured HEIGHT BUDGET, e2e-pinned EXACTLY (the fold cases in
e2e/import-svg.spec.ts): a copy change that costs a checklist row fails, one that buys a row
must update the number. Editing a row's sample writes it into the PREVIEW the way `update()`
writes it on air, which is what makes a real length testable here.
The step also lets a reader **ADD A FIELD THE FILE NEVER DREW** (plan §6a step 3): "＋ Draw a
field on the artwork" arms a marquee on the PREVIEW (`WizardPreview` `drawIn`/`drawing`/
`onDraw`); the box comes back as FRACTIONS of the artwork's rect and the step converts to
design px (it holds the SVG), landing as an ordinary `DesignFieldSpec` in `draft.designFields`.
Three rules: the spec asks `fit: 'shrink'` (the ladder measures `data-fit="shrink"`; a wrapping
line would dodge the too-long warning - plan §6b); the drawn box IS the em box (`lineHeight: 1`)
and a CLICK gets a field-shaped default; `drawIn` is tracked for the WHOLE step, because the
rect arrives a frame late and arming at the gesture lost the first drag. The step reports its
drop HANDLER up, held in a REF with only a boolean in state - held as state, every re-report is
a render and React stops the wizard with "Maximum update depth exceeded" while every assertion
still passes.
**THE ARTWORK IS ALSO THE CONTROL SURFACE** (plan §6a step 5): every offered layer is tracked
(`WizardPreview` `pickable` + `onPick`) and the HIT-TEST RUNS APP-SIDE against the pushed rects -
the iframe has no allow-same-origin and nothing reaches in. Tie-break is the editor canvas's:
innermost by depth, then smallest box. The canvas answers WHICH layer; the step decides what a
pick means (text/picture/outline toggles its binding; a rectangle becomes the growing panel, and
a DRAG names the axis - dominant direction, 24 canvas-px threshold; picking the growing panel
with no drag turns it off). The handler is held in a REF, never state - see the draw handler
above for what state costs. **A pointer is a ONE-SHOT and the rects arrive a frame after the
document commits**, so anything driving this canvas must wait for a layer to ANSWER, not for the
surface to exist (`awaitPickable`).
**FOLLOWERS: geometry proposes, the author edits** (plan §6c). `proposeFollowers` measures the
same guess the runtime makes, but on the step's own render so the reader can see it, outermost-
first (a named group and its contents are never both offered). **An untouched proposal emits
NOTHING** - the runtime derives, as the hug always did; writing the guess down would freeze a
design-time measurement into every playout. **The first edit materializes the whole set**
(`svgStretch.followers`, the derived-machine idiom) and the label stops saying "proposed".
**The list renders only where there is something to decide** (non-empty proposal, declared set,
or authored growth): on the ordinary lower third's default nothing needs to move.
Arming `followArmed` makes a canvas pick toggle a FOLLOWER instead of a binding - a visible
mode, not a modifier key. **Every handler that patches `svgStretch` must SPREAD it**: rebuilt
fresh, it dropped the axis (a "grows taller" graphic silently went back to sideways).
THE HUG's DEFAULT IS MEASURED where the artwork is unambiguous (plan §3, GOALS goal 5,
`proposeBannerGrowth`): a banner rectangle holding stacked START-anchored bound text, with room
before the safe margin, defaults to grow-x with nothing chosen; side-by-side lines, non-start
anchors, a full-frame backplate or a quiz behaviour keep shrink and the step asks. Never
size-against-frame. Re-derives with the rows until a growth control is touched (`authored`).
Contract + reasoning: docs/SVG_IMPORT_PLAN.md + that file's comments; E2E: e2e/import-svg.spec.ts.

**THE SAME DROP ZONE TAKES A FINISHED TEMPLATE** (`.html`/`.zip` -> `importTemplateFile`),
which switches the wizard to mode **'file'**: a two-stop rail (Template file -> Finish), the
imported template as its own preview, and the ordinary Finish doors. A template declares its
own fields, canvas and motion, so it skips Prepare/Text/Animation by having a MODE rather
than a branch. Its code is applied BYTE-FAITHFULLY (`applyTemplate`, never
`applyGenerated`/Prettier) - the graphic's NAME is the only edit, because it slugs the zip and
the playout folder. Contract: docs/IMPORT_MVP.md; E2E: e2e/import-graphic.spec.ts +
e2e/import-prepare.spec.ts + e2e/import-stretch.spec.ts + e2e/google-fonts.spec.ts.

The steps are driven by each variant's declared CAPABILITIES (model/wizard.ts): the Fields step
offers up to `maxLines` text lines plus the logo toggle + custom upload on a `logo: 'optional'`
design (built-in slots show it checked and locked); it also offers a graphic TYPE's SETUP values
- which answer a quiz marks correct, the club colours, a countdown's duration - rendered through
the shared `fields/FieldControl` like every other editable field, and written to
`WizardOptions.content`. **What counts as setup is DERIVED, never declared twice:**
`setupFields` (templates/types/graphicType.ts) drops every field an operator event carries as
its PAYLOAD, because in this model a pick IS payload - so live state (the contestant's answer,
the highlighted row, the verdict) cannot be offered at build time, and image fields stay out
because their value is an asset path. A design with none shows no section at all. Its label is
a word, so it gets `.wz-setup-label`'s own column, never `.wz-fid` (styles.css says why).
Pinned by e2e/wizard-setup-fields.spec.ts,
including a registry-wide check that a setup value lands on the field it NAMES (the write is
positional - out-of-order emission would silently put the club colour in the period chip);
the Style step has TWO size knobs (Graphic
size -> --scale, Text size -> --type-scale); the Animation step renders the slide family as ONE
card with a direction-of-travel picker.

**THE ANIMATION STEP OFFERS THE UNIVERSAL BANK IN EVERY CATEGORY** - the switch
(`draft.ts` `usesUniversalMotion`) asks the BUILT TEMPLATE whether it has a unit to move, not
what category it is. Where the design has choreographies of its own they lead, in their own
grid, and the six universal families sit under a **"Simple motion"** `<details>` beneath them
(open from the start when the graphic already holds one). Where the design's own presets ARE
the whole-unit kind - the imported design - the bank leads and those cards stand down. The
reason it is an addition and not a replacement is measured: no catalog preset is a whole-unit
motion the bank duplicates (they all move a box AND stagger what is inside it), so cutting them
would remove taste, not duplication.

**ONE LINE PER THING, AND AN ⓘ FOR THE REST** (GOALS goal 4; `SectionHead.tsx`): title, one
muted line, and an ⓘ holding what it does AND why it exists. The mapping, Animation and Import
Design steps wear it; a new section starts with it, not a paragraph under an h3. **THE SPEED
BUTTONS WRITE 0.6 / 1 / 1.8** (`AnimSpeed`, GOALS goal 6: ±33% was real on the clock, invisible
across separate replays; 0.75/1.5 stay valid stored values).
**THE EASING DROPDOWN REACTS TO THE MOTION** (`blocks/motionPresets.ts` `easingsForMotions`) and
shows the no-code `plain` names. Picking a motion that cannot render the current curve drops the
choice to Auto rather than keeping a setting that does nothing. WizardPreview cancels pending lifecycle-demo timers when
a debounced srcdoc commits (a stale stop() must never blank the fresh document), pushes field
values from a latest-template ref, and gates the auto-entrance on `document.fonts.ready`
(capped) so a font choice shows on the entrance itself. Pinned by e2e/wizard-preview.spec.ts,
wizard-logo.spec.ts, and wizard-filters.spec.ts.

**THE LEGIBILITY SETTINGS ARE ONE SHARED CONTROL** (`ViewingControls.tsx`): the viewing-target
select and the two size-floor toggles ("Broadcast text sizes" OFF = relaxed, "Guaranteed
readable size" ON = safe - mirrors of ONE tri-state, interlock in the component). Rendered on
the Style step (catalog walk) and on AiStep; PROJECT METADATA riding `draft.legibility`, never
the `:root` contract - the create paths land it on the store, which persists it
(model/designRules.ts). Every AI generation resolves it into `GenerateContext.legibility`, and
the result card stamps what its request carried (`data-legibility`). Pinned by
e2e/design-rules-product.spec.ts.

**THE STYLE STEP WARNS WHEN THE PALETTE JUST ERASED THE LOGO** (`useMarkLegibility` ->
`validation/markLegibility.ts`, owner's value-gate ballot 2026-08-14). It measures its OWN
offscreen frame - WizardPreview's iframe deliberately carries no `allow-same-origin`, so the
live preview's pixels cannot be read from the app at all. Debounced past the
preview's own 220ms and skipped entirely unless the draft carries a logo - a graphic with no mark
cannot fail it and must not pay for the render. It reports; it never repairs (the two available
repairs are dropping the customer's mark or pasting a plate over the design, both refused in
`templates/shared/logoSlot.ts`). Pinned by e2e/mark-legibility.spec.ts.

**Create with AI** (Entry card -> steps/AiStep, mode 'ai') is the MERGED describe/import step.
One drop zone accepts images AND an existing .html/.zip template. A dropped template parses
deterministically (model/importTemplate.ts) into a card with two actions: **"Open as code (no
AI)"** — the byte-faithful import (applyTemplate + Export panel; it renders OUTSIDE the
`needsSignIn` gate and must stay there — only the AI actions are an account feature) — or
**Convert** (provider.convertImport, guided by the prompt). Each dropped
image becomes an **UploadCard** (steps/ai/UploadCard.tsx) carrying WHAT IT IS FOR - use it as
it is / make one like this / take the look and feel / make it work over this
(model/imagePurpose.ts, split into `images` + `references` by `splitByPurpose`). The purpose
is a property of the PICTURE, not of the gesture, so it lives on the card, never behind
separate drop zones. `guessPurpose` preselects (visibly, one click to correct) and only
ever guesses mark-or-not. An as-is card adds the fixed/swappable choice; VIDEO passes
`showBinding={false}`, since a composition reaches a picture through a declared image input.
The as-is paths are handed to `productionSpxValidator` so the as-is screen rides the injected
validator. The "Design around these with a catalog template" escape takes only the as-is assets
and continues into the mode-'import' images -> category -> TemplateStep flow. The step
injects the harness's validator (`validateTemplate` + `benchTemplateRuntime` merged) into
every provider call, streams `onProgress` stages into the busy line, shows the route badge
(catalog design system / +flourish / custom) on the result card, and passes a grounded
result's `spec` back on refine so spec-level refinement re-assembles deterministically
(src/ai/AGENTS.md).

**"More control"** (steps/ai/MoreControlPanel.tsx) is the OPTIONAL structured setup beside
the prompt: an accordion editing ONE `GenerationSpec` (model/generationSpec.ts) - category
(src/ai/spec/categories.ts, or "Let AI decide" with the inferred pick surfaced editable on the
result card), data fields (suggested per category from the GraphicType's own declarations),
look (style/mood/avoid, exact brand colours, plus a READ-ONLY count of what is attached -
uploading happens once, in the drop zone), fonts (primary through the shared FontPicker,
secondary/numeric uploads), and animation (presets filtered to the category, intensity,
transition style, speed/easing/steps). Collapsed sections show summary chips and keep their
values; the spec persists as a cross-session draft and, on Create, lands on the store's
`aiSpec` (saved with the project). A prompt-only user never touches it - an empty spec injects
nothing (pinned by e2e/ai-more-control.spec.ts).

**The step has THREE execution tiers** (`AiSettings.tier`, picked under ⚙ AI settings - the
one panel every tier can reach): **NoaCG Lite**, **NoaCG Pro** and **Bring your own key**
(stored id `custom` - the label changed, the id never can). The default resolves to Lite when
the server offers it, else BYO key. Lite and Pro are managed experiences of the SAME workflow -
no model picking and NO mechanism named in their copy; BYO key is the deliberate advanced
surface carrying `AiProviderSettings` with `allowManaged={false}`. A tier this build does not
offer is ABSENT rather than greyed: **Pro renders only where it can run** (see below). The
tier contract, the price targets and the price-book rule behind each model row are
src/ai/AGENTS.md's.

The PIPELINES behind Lite and Pro are src/ai/AGENTS.md's contract (and docs/NOACG_PRO_PLAN.md
§7); what belongs here is what each tier does to this STEP.

**Lite** is the smallest managed surface: one result, included/free-user copy, remaining
allowance, at most two fields, no image/logo input, no style reference. Provider and model
settings, brainstorm, raw mode, three alternatives, "more like this", custom/import conversion
and code repair are all hidden; an unsupported response shows the server's explanation and one
simplification. Creating or exporting records acceptance by generation id, which is transient
and never enters the template or the saved graphic. Lite disabled = the BYO surface unchanged.

**Pro makes a PACKAGE, and that is the one thing it asks the user** (docs/NOACG_PRO_PLAN.md
§15.9). The ⚙ panel's checkbox list (`AiSettings.proPackage`, `pro-package`) picks which graphic
types the design language is rendered as, **every box ticked by default** - the whole set costs
one model call, so there is no cost argument for hiding it, and the LAST tick cannot be removed.
The first member in package order is the PRIMARY: previewed, refined, and the one the
single-graphic ending still handles. Members are composed the moment the result lands, each
through the same gate the primary took; one the gate refuses is dropped and NAMED
(`pro-package-dropped`), never shipped. The result card renders the set (`pro-package-built`),
and a set of more than one FINISHES through `KitFinishStep` into a production - the branch is on
the SIZE of the set, never the tier, because the single-graphic door's "open in the editor" would
pick one member for the user and abandon the rest. Each member is renamed for its type ("<look>
lower third"), since that name is the export slug and the playout folder an operator reads.
**The two rules that are not about the door live OUTSIDE this step** - `namedPackage`
(ai/pro/language/graphics.ts) and the `proPackage` normalizer (ai/settings.ts) - because the
walk is pinned by `e2e/configured/pro-wizard.spec.ts`, a suite CI never runs, so anything
reachable only from here ships its regressions silently. Both are mutation-checked in
`e2e/pro-language.spec.ts`.

**Pro** spends ONE model call, for the design LANGUAGE the platform then composes the graphic in
(`src/ai/pro/language/pipeline.ts`; §15-16 of docs/NOACG_PRO_PLAN.md, and src/ai/AGENTS.md for the
engine's rules). The result card reports that language - its name, its rationale, its palette, and
every divergence the platform recorded - at `data-testid="pro-report"`, keyed to the template by
WeakMap so a restored past result shows its own. **There is no concept image**: the graphic
rendered above the card IS the answer. **The tier is OFFERED only where it can actually run**
(`proOffered = proHosted && isBackendConfigured()` - the `/api/ai/pro-status` answer AND the
metering backend). Where
that is false the tier is ABSENT, never a greyed row and never a key request: a NoaCG tier runs
on NoaCG's own service or it is not offered (owner, 2026-08-14). Its settings are therefore one
read-back with the remaining allowance (`ai-pro-hosted-note`) and no chooser of any kind - no
provider, no model, no key. **A hosted deployment is never reachable from the browser** - no
flag, no query parameter, no localStorage key - which is the property `e2e/pro.spec.ts` pins by
answering the status endpoint and nothing else. A generation opens ONE reservation before the
model call and reports its outcome after it (`src/ai/pro/session.ts`); the spend is
recorded server-side and is never a number this step sends. **The outcome carries rule codes for
the platform's own repairs, not just errors** (`proRuleCodes`; reasoning in
ai/pro/language/gate.ts). Categories
clamp to lower-third/auto, spec-field findings demote to warnings (`demoteSpecFields`: fixed
contract, no repair loop), and refine/fix stand down because regenerate is the honest move.
`e2e/pro.spec.ts` pins only the DOOR (whether the tier is offered), `e2e/pro-language.spec.ts`
pins offline what a Pro graphic IS against the composer the product runs, and the LIVE walk
`e2e/configured/pro-wizard.spec.ts` pins what the engine spends (one call, forcing
`emit_design_language`; an image request fails the spec). The step MEASURES the first "use it
as it is" upload with `probeMark` before generating: its shape and ink go into the brief in
content-free words, and the same probe lets the composer give the mark's column a field when
its ink cannot read on the chosen panel.

The harness is ON BY DEFAULT (`AiSettings.useHarness`; the **"Use NoaCG harness (3 options)"**
checkbox turns it off). On → `generateAlternatives`: three directions rendered as `[data-alt]` PICKER
CARDS — a live **MiniPreview** of each built template plus its design words (density,
heading weight, alignment, panel) and a pass/fail mark — a list of names showed none of the
real compositional differences. Off → `generateRaw`
(one-shot, static validation only, no bench). Conversion of an imported template always runs
the validated conversion flow regardless of the checkbox. The default is pinned by
e2e/ai.spec.ts ("the harness checkbox is on by default").

AI settings use the shared `AiProviderSettings` surface for provider, opaque model id, and
user-key submission (laid out on the shared `.dlg-row` grid, so its Store-key button can never
wrap under the field). The component may hold a key only in its unsaved password-field state
and must submit it to `/api/ai/credentials`; it must never pass a key through `AiSettings`,
localStorage, query parameters, telemetry, logs, or rendered error detail. Model lists are
provider-scoped suggestions, not an application-wide allowlist.

The ⚙ button carries a one-line read-back of what will actually run (the tier, plus the model
on the tier where models are the user's own), so the common case needs no click. **The panel is
NOT a popover**, though the reference draws one: it opens ITSELF whenever nothing is
configured, so a floating sheet would cover the controls it exists to make work (measured;
reasoning at the settings sheet in AiStep.tsx).

**The directions SURVIVE a refinement.** `alternatives` (the current state of each
direction) and `originals` (each as first generated) are parallel arrays; a refine replaces
only `alternatives[selected]`, so the other directions stay pickable and **↺ Undo
refinements** restores the proposed design without spending a generation. `stagePick` stages
the pick for src/ai/preferences.ts on selection AND after every refinement — CHOSEN facets
from the direction as it stands, SHOWN from the ORIGINALS, since that was the choice actually
faced; a lone result stages nothing (counting it would score every facet as picked 100% of the
times shown). CreationWizard's `createFromAi` COMMITS whatever is staged.

**The result names the PROVEN DESIGN it was adapted from, and shows what it was chosen
between** (docs/ADAPT_FIRST_PLAN.md §3 Stage U). "Adapted from a proven design" is a claim, so
the card carries the design's name (`data-testid="ai-adapted-from"`) and, under it, the
retrieved shortlist (`ai-shortlist`) as MiniPreview cards - the same card chassis as the three
directions and a Browse tile, because all three are "pick a design". Picking another one
REBUILDS on it deterministically: `assembleGroundedTemplate(spec, ctx, { keepChassisZone: true })`
with the same spec, no model call and no cost - the user overrules the AI's choice free of
charge. No structural KIND check is needed on that swap - every design on the
shortlist satisfies the brief's anchor by construction (src/ai/retrieval.ts).
The card's caption is the NAME ALONE (reasoning at the card in AiStep.tsx).

A failing non-Lite result carries **⟳ Fix these** (`data-testid="ai-fix"`): the exact validator
findings go back as the instruction, at CODE level (no spec — the findings are about emitted
code). It is a button, not an automatic loop: a grounded assembly failing its own bench is a
platform bug worth surfacing (src/ai/AGENTS.md), but leaving a non-technical user holding
raw findings is not a resolution. The per-card verdict uses `.wz-alt-mark.ok/.bad`, NOT
`.status-ok`/`.status-bad` — those name the verdict on the CURRENT result.
Lite instead labels the same failure as a NoaCG platform defect and spends no code-repair
call.

An **example brief is armed before it replaces a brief the user wrote** (two-step, like every
other destructive click here); typing disarms it. Pinned by e2e/ai.spec.ts.

**ONE thread, ONE composer.** `turns` is a single transcript (`.ai-thread`): talk turns plus
`past` turns, which are earlier generations kept whole (their directions, their originals,
which one was picked) with **↩ Bring back**; restoring archives whatever it displaces, so
exploring a second idea never costs the first. The one textarea generates, talks (**🗨 Talk it
through**) or refines — the primary button follows the state, and the "Refine it…" placeholder
is retained so the composer answers to the same locator either way. `conversation()` feeds the
bounded transcript into `GenerateContext` (src/ai/AGENTS.md), **📎 Attach** adds images to the
turn, and **✦ 3 more like this** re-runs the design stage seeded with the picked direction's
spec.

**The conversation TRAVELS with the created project.** AiStep reports its talk turns up via
`onThread` on every change (so talk added AFTER the last result, before Create, is caught);
`createFromAi` commits it to the store's `aiThread`, which persists exactly like `aiSpec`
(SavedProject + GraphicDoc, additive optional, model/aiThread.ts). Only the talk turns travel -
the `past` generation snapshots are heavy and the editor has no surface for them. The editor's
**AIPromptPanel** shows the carried conversation read-only under a "Created from this
conversation" `<details>` (`data-testid="ai-origin"`, reusing the `.ai-msg` bubbles). Pinned by
the reload case in e2e/ai.spec.ts.

**The result card reports what was MEASURED, not a verdict.** `validation/readiness.ts` groups
existing findings into six operator-facing rows; it adds no checks, which is what lets a row
read "not played, so not tested" on the raw one-shot path rather than claiming a bench that
never ran. Rules no row claims are shown verbatim, never swallowed. Cost comes from
`ai/runStats.ts` over the telemetry ring: a median expectation before Generate (null below two
matching runs) and actuals after, recorded on a RUN and never in `showChange`, since re-picking
an alternative costs nothing. **No money is ever shown** — prices are not in this codebase and
a stale one would be believed — and zero tokens prints as silence, because "0 tokens" is a
measurement claim rather than the absence of one.

**Brand is PROPOSED, never applied.** The strip (`.ai-brand`) offers colours read out of the
first uploaded image — `src/assets/paletteExtract.ts`, deterministic arithmetic, no model call
— and the install's saved looks (`loadLooks()`). Both write `spec.brandColors`, the lock
`applySpecLocks` already honours over anything the AI picks. The pick stays the user's on
purpose (paletteExtract.ts says why). A filename chip uses **`.wz-file-chip`**, never
`.wz-fid` (the fixed 24px field-id badge; styles.css says why).

Two ordering rules the transcript depends on: **archive the current result BEFORE recording
the new request** (it is chronological — the standing result happened first), and **record
the request even when the box was empty** and the brief came from the talk, or a generation
leaves no trace of what it was asked to make.

**Video mode** (Entry card "Video or animation with AI" -> steps/VideoStep): prompt + a
GENERATION-ENGINE picker (the VIDEO_ENGINES cards: Remotion preselected, HyperFrames tagged
Experimental) + duration/aspect/fps/transparency + asset upload -> an INSTANT create
(`createDefaultVideoProject`, the brief seeded as chat[0], the engine recorded on the
project); generation runs in the video shell's chat, not the wizard. Its reopen strip lists
saved videos plus a "Continue" chip for the autosaved current video project. Creating/opening a
video flips docKind to 'video'; every SPX create path flips it back to 'spx'.

**Sample data on create:** the wizard applies with
`applyTemplate(template, { resetSampleData: true })` so a new project starts from ITS field
defaults - plain applyTemplate (blocks, panels, AI) intentionally preserves typed sample values
for matching field ids. Don't drop the flag from the wizard path: the old template's values
would leak into the new graphic's fields.

