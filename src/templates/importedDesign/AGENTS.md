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
(owner ruling 2026-08-23, reasoning in docs/SVG_IMPORT_PLAN.md §3): **fill the
panel, grow it only where the author opted in, wrap into the room the design already has, shrink
to 55%, then report the field** (`noacgTextOverflow()`, read by every operator surface where a
value is typed - the warning rides the machine-state answer, `control/controlModel.ts`). Three
rules there are load-bearing and each was a measured defect: the budget is the ROOM the shape
behind the line offers, NOT the width of the text the designer typed (that left 588px of a
1040px banner permanently unused); wrapping uses only room already drawn - from the line to the
nearest thing below it inside its panel, re-asked at every size, dropping a LINE rather than
printing through the layer below; and the shrink is FLOORED, or a long value reaches 3.7px and
reads as text that vanished. The drawn text is still measured in the real face and never
re-taken from whatever is on screen, or a playout renderer's own first update becomes the budget
and nothing ever fits it (owner ruling 2026-08-22: shrink, never condense). The HUG is the
per-graphic alternative the mapping step ASKS for (`DesignSvg.stretch` -> one `-panel` class on
one `<rect>` + `stretchRuntimeJs`): the picked rectangle widens by the widest inside line's
deficit, whatever is drawn past its right edge travels by its transform ATTRIBUTE, the growth
caps at the frame's 4% safe margin and the shrink answers the rest. Default OFF and never
inferred - no geometry separates a lower third from a scorebug (docs/SVG_IMPORT_PLAN.md §3 says
why, and what v1 does not handle). DESIGN_PRESETS + `design-stagger`; `fieldPlan: fixed` (fields = the mapping
step's choices). Bound nodes + top-level named `<g>`s are registry parts, lines channel 'rise'.
E2E: e2e/import-svg.spec.ts.
**importedDesign/quizBehaviour.ts is the BEHAVIOUR pilot** - all reasoning and the
generic-vs-quiz-specific split in docs/GRAPHIC_BEHAVIOUR_PLAN.md §10. It reuses
`ANSWER_BOARD_MACHINE` (filtered, never copied) and `ANSWER_BOARD_CONTROLS` via `attachMachine`;
only the PAINT is new - the DESIGNER draws each moment as its own layer and the runtime toggles
it (`.imported-design-qstate` / `-qon`; ids `q-sel-N` / `q-cor-N` / `q-wrong-N` / `q-lock`).
**Classes, never inline styles:** a snap clears inline props, so the state would vanish while
the machine still held it. Binding is PICKERS (`DesignSvgQuizBehaviour`), layer names only an
accelerator. No registry until a third behaviour says what the abstraction is. Sample:
docs/svg-samples/quiz-board.svg; E2E: import-svg-behaviour + configured/imported-quiz-output.
