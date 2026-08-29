# src/templates/importedDesign - the user's own artwork

Loaded alongside the root `AGENTS.md` and `src/templates/AGENTS.md` when working in this
directory (Claude reads it via this directory's `CLAUDE.md` import; Codex reads it directly).
Keep it accurate.

Split out of `src/templates/AGENTS.md` on 2026-08-22, which keeps the catalog-wide rules and
the category index. Add a RULE here; leave the reasoning in the code's own comments.

## importedDesign/ - the user's own artwork

imp01 (prefix 'imported-design', NOT browsable - the wizard's "Import
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
(assets/svgImport.ts), re-checked by the gate (rules 'svg'/'svg-binding'); ONE FIT for the whole
graphic (§6b) - the ladder measures the PLACED lines too (an outlined-text stand-in, a field
added later), so `fitPlacedText` is never emitted here and update() calls one hook, not two. A
placed line's ROOM is its own SLOT, the width its wrapper declares: nothing was drawn behind it,
the slot is the authored statement (measured from the outlined group's box, dragged on the
canvas) and it beats any rectangle a container search might find under it - and being a width
alone, a placed line never wraps. The ladder itself is overflow-only
(owner rulings 2026-08-23 and 2026-08-26, reasoning in docs/SVG_IMPORT_PLAN.md §3): **fill the
room, grow the panel where the author opted in, wrap into the room the design already has, shrink
to 55%, squeeze what is still over, and report the field** (`noacgTextOverflow()`, read by every
operator surface where a value is typed - the warning rides the machine-state answer,
`control/controlModel.ts`). Five rules there are load-bearing and each was a measured defect: the
budget is the ROOM the shape behind the line offers, NOT the width of the text the designer typed
(that left 588px of a 1040px banner permanently unused); a line's room STOPS at whatever is drawn
beside it on its own rows (`svgFitNeighbour`) and such a PENNED line never drives the panel's
growth, because widening it would give that line nothing; wrapping uses only room already drawn -
from the line to the nearest thing below it inside its panel, re-asked at every size, dropping a
LINE rather than printing through the layer below; **the room downward keeps the designer's own
gaps** (the whole gap drawn under a line, so a name with a role beneath it has no room of its own
and buys a second line by GROWING; and with nothing below, the panel's bottom less the padding it
keeps above its first line, mirrored - both measured off the rest pose, never a constant); the
shrink is FLOORED, or a long value reaches
3.7px and reads as text that vanished; and past that floor the block is SQUEEZED to its budget
(`svgSqueeze` - `textLength` on a drawn layer, a horizontal scale on a placed one), because
"nothing may ever paint outside the panel" and stopping at the floor let a floored name run
127px across the artwork beside it. Screen px convert to the artwork's units through the
element's CTM, never through its own advance/ink ratio - that carried a per-typeface error into
the room. The drawn text is still measured in the real face and never
re-taken from whatever is on screen, or a playout renderer's own first update becomes the budget
and nothing ever fits it (owner ruling 2026-08-22: shrink, never condense). GROWTH is the
per-graphic alternative the mapping step ASKS for, and it is a VERSIONED TABLE
(`DesignSvg.growth` -> `NOACG_LAYOUT` version 1 + `growthRuntimeJs`, docs/SVG_IMPORT_PLAN.md §6c):
each row names one element by its `data-noacg-el` stamp, the axis it may grow on, its safe margin,
and optionally its FOLLOWERS. **The stamp is a LIST and the runtime matches word-wise**, because
one element may be named by TWO rows: the wider-THEN-wrap ladder is one panel with an 'x' row and
a 'y' row, which is how the combination the owner asked for needed no new format. Both rows read
who travels and which lines are inside while the artwork is still AT REST, before either grows -
a follower captured after the first row moved it would record the moved pose as its resting one.
`layoutRules` is the NORMALIZING read - the old one-rectangle
`stretch` becomes one axis-'x' row, so a saved option from before still builds what it described.
`followers` is ADDITIVE, so declared-vs-derived cost no second version: absent = "whatever is
drawn past the moving edge", a fair guess sideways and a poor one downwards. The table lives in
the design-owned JS, NEVER in `NOACG_ANIM` - the timeline rewrites that region.
**The two axes sit on opposite sides of the fit, and that is the point.** Sideways, growth is extra
BUDGET, so it happens BEFORE the fit and the shrink answers what the cap withheld. Downwards it
is somewhere to WRAP into, so the fit runs first against the MOST that rule could ever give
(measured at rest, `svgOfferHeights`), then the panel grows by what the settled block needed
(`growSvgHeights`). One measure, one fit, one apply - never iterated, because wrap and grow are
circular and an iterated answer would settle differently in the editor, in an export and under SPX.
**Every re-measure RESTS the layout first** (`refitSvgText`), or the last pass's growth becomes
this pass's room: the block reads as already fitting, the growth is dropped, and a graphic that
grew in the editor collapses on air the moment `document.fonts.ready` fires.
**THE CAP IS THE DESIGN'S OWN MARGIN, MIRRORED** (owner 2026-08-26: "we cannot have templates
outgrow the screen", and growth is symmetrical): `svgGrowCap` mirrors the inset the panel keeps
from the frame edge it is ANCHORED to onto the edge it grows towards, floored at the row's `safe`
fraction. An inset is never negative, so outgrowing the frame is structurally impossible rather
than a number somebody has to keep right; the flat 4% it replaced let a banner drawn 150px in
from the left run to 73px past its mirror.
**A PANEL GROWS AWAY FROM THE FRAME EDGE IT IS ANCHORED TO** (`svgGrowDir`, owner walk
2026-08-29). Sideways the TEXT answers it - a start-anchored line gains room only to its right -
so 'x' is unchanged. Downwards the panel grows towards the FARTHER frame edge, which for a lower
third (130px above the frame's bottom, 760 below its top) means UPWARDS, with the composed edge
staying put. Growth used to be downward always with the cap mirroring the TOP inset, so every
lower third measured ZERO room to grow taller, the wrap rung had nowhere to go, and the ladder
fell through to the shrink the owner ruled must come last. The line stack is pinned to the
anchored edge: a wrapped block travels by the height taken on the side the panel is not growing
towards (`growSvgHeights`), so the lowest line and the drawn bottom padding never move. Furniture
that SPANS the panel on the growing axis (`svgCollectSpanners` - an accent rail drawn to the
plate's own two edges) grows with it; an end CAP hugs whichever edge actually moves. A wrapped
line restarts at the text's own `x`, and a layer with NO `x` starts at 0 - SVG's own default and
where Illustrator puts it, since Illustrator writes the position in the transform; left off, the
wrap staircases out of the panel. A wrapped value is read back through `svgFitValue` (marked
tspans joined with a space), because `textContent` concatenates them with nothing between and the
`fonts.ready` pass then fitted a different value than the operator typed. The mapping step's
MEASURED DEFAULT is the whole ladder ('xy'), not its first rung.
A graphic with an EMPTY table never moves; a lower third's default row is measured at design time
by the wizard, never at play time (src/components/wizard/AGENTS.md). What v1 still does not handle:
rectangles only, and the wizard picks ONE element per graphic (on one or both axes) while the
format expresses several. DESIGN_PRESETS + `design-stagger`; `fieldPlan: fixed` (fields = the mapping
step's choices). Bound nodes + top-level named `<g>`s are registry parts, lines channel 'rise'.
E2E: e2e/import-svg.spec.ts.
**BEHAVIOUR is TWO modules behind ONE seam**, `behaviour.ts` (reasoning: GRAPHIC_BEHAVIOUR_PLAN
§10, §12). `boundBehaviour(svg.behaviour)` is all svg.ts asks for. Both reuse a CATALOG type's
machine + controls through `attachMachine`, FILTERED from the shipped declaration, never copied.
Binding is PICKERS; names are an accelerator, and a proposal needs evidence of ITS OWN behaviour
(a student quiz names answers "Option 1", so the poll's requires BARS). **Classes, never inline
styles** (`drawnState.ts`): a snap clears inline props. No registry - the varying part is the paint.
- **quizBehaviour.ts** (pilot): `ANSWER_BOARD_MACHINE` less its audience branch. The DESIGNER
  draws each moment as a layer, the runtime toggles it (`-qstate`/`-qon`; `q-sel-N`, `q-cor-N`,
  `q-wrong-N`, `q-lock`).
- **pollBehaviour.ts** (the THIRD behaviour): `LIVE_POLL_MACHINE` less its automatic voting window
  (a real audience votes over minutes). Badge/figures/winner marks are drawn states
  (`-pstate`/`-pon`); a BAR has none - drawn full length, INTERPOLATED to its share, measured once
  AT REST, `<rect>` tweening `width` and never a scale. **BARS MOVE ON DATA, NOT ON STATE**
  (`paintPollState` runs from update()): only close/result/call are transitions, and the TAKE
  opens the vote. **Its field titles `Question`/`Options`/`Vote count` ARE the join** to the
  audience plane (`pollFieldMap`); a layer it drives stops being a field (`draftToOptions`).
E2E: import-svg-behaviour (vote artwork: fixtures/svg-corpus/illustrator-live-vote-band.svg) +
configured/imported-quiz-output.
