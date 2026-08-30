# src/templates/importedDesign - the user's own artwork

Loaded alongside the root `AGENTS.md` and `src/templates/AGENTS.md`. Add a RULE here; leave its
reasoning in the code's own comments, and the measured defect that bought it in the docs below.
This is the tightest instruction chain in the repo, so a paragraph restating one of them is a
defect, not thoroughness.

Two graphic types, one category (prefix 'imported-design', `CategoryInfo.group` 'imported', NOT
browsable - the wizard's "Import graphic" entry is its only way in): **imp01**, raster artwork
(`shared.ts` + `stretch.ts`), and **svg01** (`svg.ts`). Read the relevant contract before changing
any rule here: **docs/IMPORT_MVP.md** (raster, plus diagnosis), **docs/SVG_IMPORT_PLAN.md** (SVG -
§3 the fit ladder and the hug, §6b one fit per graphic, §6c vertical growth),
**docs/GRAPHIC_BEHAVIOUR_PLAN.md** §10 and §12 (behaviour).

## What both variants share

- **The user's own flat artwork IS the design.** Nothing regenerates or redraws it; the only
  reshaping that ever happens is the one the author opted into (imp01's 9-slice stretch, svg01's
  growth table), and even that never rewrites the artwork itself.
- Self-assembled from `shared/base.ts`, **never `assembleStandard`**: that auto-fit's
  `width: fit-content` cap would shrink frame-sized artwork.
- Steps forced off. `designPresets.ts` (design-fade/slide/pop/blur) animates ONLY the box - artwork
  and text as one unit, because the per-line presets would tear text out of artwork drawn around it.

## imp01 - raster artwork

The wizard creates it BARE - an explicitly empty `lines` array, honoured by resolveOptions, with
teaching comments where fields will land - then hands off to the editor's Data tab; the assembler
still renders explicit lines for a caller that passes them. svg01 does not work this way - its
fields are the mapping step's.

The DOM is IMPORT_MVP's "structure contract" diagram - `#fwN` mask wrapper carries the POSITION (in
the artwork's own px), the `#fN` span inside it the TYPE (`LineSpec.style`) - and those `#fwN` rules
are the canvas drag's contract (`blocks/designLayout.ts`, which also owns `addPlacedLine`, the Data
panel's add-field, emitting a new line in exactly that shape). `.imported-design-art` is its own
registry part, so the art and each line animate independently after creation
(`blocks/presetApply.ts`).

SCALING MODE is per-graphic (`DesignArt.stretch`, picked in the wizard's Prepare step): fixed
(default - byte-identical emit to before the mode existed), or horizontal 9-SLICE stretch, where the
art becomes a border-image div. Three tripwires there: **the image ref must stay a CSS declaration,
never an inline style**, because the editor's entrance reset clears inline styles; the runtime
(`stretch.ts`) is design-owned JS OUTSIDE the marked region and drives everything from ONE
`--stretch-x`, its ladder being stretch to 4% inside the frame edge, then textFit shrink, then clip;
and the packaged SPX css hops bucket urls to `../` (`spxStarter cssForSubfolder`; zip import strips
it back).

E2E: `e2e/import-graphic.spec.ts`, `e2e/import-prepare.spec.ts`, `e2e/import-stretch.spec.ts`.

## svg01 - the SVG variant

The SVG is inlined VERBATIM, its own text/image nodes bound as `id="fN"` (markup edits: bound ids,
`-art`, hidden `-outlined`); sanitized at import (`assets/svgImport.ts`), re-checked by the gate
(rules 'svg'/'svg-binding'). Bound nodes and top-level named `<g>`s are registry parts, lines
channel 'rise'; `fieldPlan: fixed` (the fields ARE the mapping step's choices); DESIGN_PRESETS plus
`design-stagger`. E2E: `e2e/import-svg.spec.ts`.

**ONE FIT for the whole graphic** (§6b): the ladder measures the PLACED lines too, so `update()`
calls one hook, not two. A placed line's ROOM is its own SLOT - the width its wrapper declares,
AUTHORED rather than found, so it beats any rectangle a container search might turn up under it;
and being a width alone, it never wraps.

**THE LADDER is overflow-only, and its ORDER is the ruling** (owner 2026-08-23 and 2026-08-26):
**fill the room, grow the panel where the author opted in, wrap into the room the design already
has, shrink to 55%, squeeze what is still over, and report the field.** Copy that cannot be made to
fit is warned about, never cut - `noacgTextOverflow()` names the fields, and the warning rides the
machine-state answer rather than a channel of its own (`control/controlModel.ts`). Each rung cost a
measured defect; §3 holds the evidence:

- **Room, not drawn width.** The budget is what the shape behind the line offers, and it STOPS at
  whatever is drawn beside the line on its own rows (`svgFitNeighbour`); such a PENNED line never
  drives the panel's growth, because widening gives it nothing.
- **Wrap only into room already drawn**, keeping the designer's own gaps: line to the nearest thing
  below it inside its panel, re-asked at every size, dropping a LINE rather than printing through
  the layer below. Every bound is measured off the rest pose, never a constant.
- **The shrink is FLOORED at 55%**, and past the floor the block is SQUEEZED to its budget
  (`svgSqueeze`), because nothing may ever paint outside the panel.
- **Measure exactly, and from the DESIGN**: screen px convert through the element's CTM, never an
  advance/ink ratio; the drawn text is read in the real face and never re-taken from what is on
  screen, or a playout renderer's first `update()` becomes a budget nothing can overflow (owner
  2026-08-22: shrink, never condense).

**GROWTH is the alternative the mapping step ASKS for, and it is a VERSIONED TABLE**
(`DesignSvg.growth` -> `NOACG_LAYOUT` v1, emitted by `layoutDataJs` and read by `growthRuntimeJs`):
each row names one element
by its `data-noacg-el` stamp, its axis, its safe margin, and optionally its FOLLOWERS. §6c carries
the mechanism; these are the tripwires.

- The table lives in the design-owned JS, **never in `NOACG_ANIM`** - the timeline rewrites that
  region. `layoutRules` NORMALIZES the pre-format one-rectangle `stretch` into an axis-'x' row, and
  `followers` is ADDITIVE, so declared-vs-derived cost no second version.
- **The stamp is a LIST, matched word-wise** - one element may be named by TWO rows, which is how
  wider-THEN-wrap ('xy', and the mapping step's measured default) needed no new format. Every row
  reads its followers and its lines while the artwork is AT REST, or it records a pose an earlier
  row already moved.
- **The axes sit on opposite sides of the fit.** Sideways, growth is extra BUDGET, so it runs BEFORE
  the fit and the shrink answers what the cap withheld; downwards it is somewhere to WRAP into, so
  the fit runs first against the most that rule could give (`svgOfferHeights`, at rest) and the
  panel then grows by what the settled block needed (`growSvgHeights`). One measure, one fit, one
  apply, **never iterated** - wrap and grow are circular, and an iterated answer settles differently
  in the editor, in an export and under SPX. **Every re-measure RESTS the layout first**
  (`refitSvgText`), or the last pass's growth reads as this pass's room and a graphic that grew in
  the editor collapses on air at `document.fonts.ready`.
- **The cap is the DESIGN'S OWN MARGIN, MIRRORED** (`svgGrowCap`), never a constant: the inset the
  panel keeps from the frame edge it is ANCHORED to, mirrored onto the edge it grows towards,
  floored at the row's `safe`. An inset is never negative, so outgrowing the frame is impossible by
  construction rather than by a number somebody has to keep right. **And a panel grows AWAY from the
  edge it is anchored to** (`svgGrowDir`), so a lower third gets taller UPWARDS with its composed
  edge staying put; 'x' is unchanged, because sideways the TEXT answers it. The stack is pinned to
  the anchored edge, so the drawn bottom padding never moves; furniture SPANNING the growing axis
  travels with it (`svgCollectSpanners`), and an end CAP hugs whichever edge moves.
- **A wrapped line restarts at the text's own `x`, and a layer with NO `x` starts at 0** - SVG's
  default, and where Illustrator puts it since it writes the position in the transform. The value is
  read back through `svgFitValue`, because `textContent` joins tspans with nothing between.

A graphic with an EMPTY table never moves, and a lower third's default row is measured at design
time by the wizard, never at play time (`src/components/wizard/AGENTS.md`).

## BEHAVIOUR - two modules behind ONE seam

`behaviour.ts` is the seam; `boundBehaviour(svg.behaviour)` is all `svg.ts` asks for (§10, §12).
Both reuse a CATALOG type's machine + controls through `attachMachine`, FILTERED from the shipped
declaration, never copied. Binding is PICKERS; names are only an accelerator, and a proposal needs
evidence of ITS OWN behaviour (a student quiz names answers "Option 1", so the poll's requires
BARS). **Classes, never inline styles** (`drawnState.ts`): a snap clears inline props. No registry -
the varying part is the paint.

- **quizBehaviour.ts** (pilot): `ANSWER_BOARD_MACHINE` less its audience branch. The DESIGNER draws
  each moment as a layer and the runtime toggles it (`-qstate`/`-qon`).
- **pollBehaviour.ts**: `LIVE_POLL_MACHINE` less its automatic voting window (a real audience votes
  over minutes). Badge/figures/winner marks are drawn states (`-pstate`/`-pon`); a BAR has none -
  drawn full length, measured once AT REST, tweened as `<rect>` `width` and never a scale. **BARS
  MOVE ON DATA, NOT ON STATE** (`paintPollState` runs from update()): only close/result/call are
  transitions, and the TAKE opens the vote. **Its field titles `Question`/`Options`/`Vote count`
  ARE the join** to the audience plane (`pollFieldMap`); a layer it drives stops being a field
  (`draftToOptions`).

E2E: import-svg-behaviour (vote artwork: fixtures/svg-corpus/illustrator-live-vote-band.svg) +
configured/imported-quiz-output.
