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

Five readings, binding on anyone extending this:

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

