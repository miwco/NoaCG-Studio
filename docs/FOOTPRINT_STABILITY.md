# Footprint stability: the STAGE contract

Which graphics may change size with the operator's text, and which may not. The binding summary
lives in `src/templates/AGENTS.md`; this file carries the reasoning and the measurements behind
it, so the area contract stays inside its size budget.


`width: fit-content` (DESIGN_LANGUAGE §5) is the catalog's default and is only HALF right. On a
NAMEPLATE it is the broadcast convention - a strap cut to the guest's name. On a BOARD it is a
defect: the same panel is back all evening with different content, and an audience reads a
graphic that re-sizes itself as a broken one, however correct each frame is.

**The families.** HUG keeps `fit-content`: lower-third, corner-bug, end-credits,
imported-design, and the already-full-frame frame / transition / versus. Ticker too - its strip
is `width: 100%` and what grows is the scrolling track, which is the crawl working. FIXED
declares a stage: every other category. Ratified by the owner 2026-08-20, with the overflow
answer - inside a stage text WRAPS first, then SHRINKS to the type floor, never widens the box.

**The mechanism.** `stageBoxCss` (shared/base.ts) emits the width, the `--stage-width` marker,
`box-sizing` and where the slack goes; `stageExtraJs` (shared/stageFit.ts) emits the runtime that
holds each line to the rows its design was drawn for. A design declares `stageWidth` (px at
1080p) and gets both; omit it and the output is byte-identical to before.
`scripts/footprint-stability-sweep.mjs` is the instrument, `e2e/catalog/footprint-stability.spec.ts`
the gate - it selects on the marker, never a list, so a category is covered the day it flips.

**The stage fit is the OPERATOR's, never the design's own words.** A designer picks whatever
`line-height` a design wants and it costs nothing: the size in the CSS is the size that airs at
the design's own sample, and only text typed PAST that sample shrinks.
`scripts/stage-fit-sweep.mjs` renders every staged design at its default content and compares each
line's declared size (computed, so `--scale` and `--type-scale` are already folded in) against the
size it actually ships at; `e2e/catalog/stage-fit-honesty.spec.ts` is the gate, at 1% tolerance.

That was NOT true until 2026-08-23, and the two ways it failed are both worth knowing, because
neither is visible in the source and every gate here was green through both.

- **A LINE BOX IS NOT A CONTENT BOX.** The reserve was `getBoundingClientRect().height`
  (font-size x line-height); the shrink test read `scrollHeight`, which is the face's own glyph
  box - about 1.2em whatever line-height says, and per face: Archivo 1.03, Inter 1.14, Space
  Grotesk 1.17, Manrope 1.24, Oswald 1.29, Saira 1.35. Comparing the two meant any line whose
  declared line-height sat under its face's content ratio reported `tallBy > 1` at the design's
  OWN default text and was shrunk by `sqrt(1/tallBy)`, permanently, at load, with no operator
  input. Measured over the registry: **200 of 290 staged designs, 457 of 459 shrunk lines, worst
  -23%** - ig31 declaring 103px and airing 79px. The cliff is the FACE's ratio, so `grep
  line-height` is a suspect list and never a finding. **The fix is a second calibrated number:**
  `data-stage-fill` records what the design's own sample actually filled, the reserve stays the
  line box (that is what holds the panel, and it is still a `height`), and the excess is measured
  against the larger of the two. A sample fits itself by definition; only the operator's text
  past it shrinks. A row the design never showed us gets one row's CONTENT height from a cached
  per-face probe, so a rebuilt standings row does not shrink for a wrap that never happened.
- **A PAINTED BACKDROP IS NOT THE TEXT.** The width axis read `scrollWidth`, and a design's slab
  is often a pseudo-element that overhangs on purpose - ss02's chip and headline both lean
  `skewX(-8deg)`, which counts towards scrollable overflow. So a 16px lean on a 920px row read as
  the headline running out of its box: **92px shipped at 66px** at the design's own words. The
  width test now measures a `Range` over the element's own text nodes against its content box, so
  the widest ROW is compared and painted decoration is not. Take the content box from the RECT,
  not `clientWidth`: the latter is rounded to whole pixels and the text width beside it is not,
  which is half a pixel of phantom overflow and left seventeen designs just past the fit's 0.5%
  tolerance on nothing at all.

Five more readings, binding on anyone extending this:

- **THE RESERVE IS A HEIGHT, NEVER A MAX-HEIGHT.** A cap stops a line growing and lets it
  SHRINK, so a short value still moves the panel - the same defect wearing the opposite sign
  (alert 16px, public-info 27px, entirely at the short end).
- **A LINE THE DESIGN NEVER SHOWED US IS ONE ROW.** A poll's options, a standings row and a
  queue entry are BUILT by the design's runtime and replaced wholesale on every update, so
  anything remembered on them is gone and re-measuring takes the reserve from the operator's
  value instead of the design's. After calibration, a new leaf gets one row - which is what a
  board does with a long club name: keep the row, shrink the name. The panel also holds its own
  measured height, so a reflow the line fit never saw cannot move it either.

- **MEASURE BOTH AXES.** A `min-width` floor does not stabilise a board, it changes which
  dimension moves. qz01 is pinned at 1080px wide at every length - the floor makes the abspos
  root shrink-wrap to exactly the floor, so `fit-content` has no room to grow into - and the text
  wraps and makes it 26% TALLER. A width-only sweep called it clean.
- **A NULL BOX IS NOT A STABLE BOX.** A full-frame design has no plate under the sweep's 95% rule
  and often no `-box`, so the verdict must come from the boxes actually MEASURED. And a rect is
  LAYOUT, not paint: a clipped row still returns its full box, so the sweep cuts every rect by its
  clipping ancestors or a panel holding its height perfectly reads as still growing.
- **THE STAGE IS THE DESIGN'S NUMBER, NEVER THE CATEGORY CAP** (identical slabs), **and never its
  own SAMPLE either** - tried: at 505px sb03 clipped "MANCHESTER UNITED" to "MANC". Size it for
  the longest content it will really carry; short content leaves reserved void, the strap floor
  one level up.
- **WHERE THE SLACK GOES IS PART OF THE FIX.** It falls where the anchor already reads, so panel
  edges stop moving without the words moving instead. **A box that paints edge-to-edge furniture
  needs its text cells to absorb the slack too**: sb23's accent rule is `left:0;right:0`, so a
  stage wider than its cells left a hairline in empty space until the club cells took `flex: 1 1 0`.

Nine categories are stable on both axes; what remains is an inner element growing inside a fixed
panel, which is this same fix one level down.

