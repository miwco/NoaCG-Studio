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

**The stage fit is the OPERATOR's, never the design's own words.** The size in the CSS is the size
that airs at the design's own sample, and only text typed PAST that sample shrinks - so the STAGE
puts no floor under a design's `line-height`.

**A LINE MASK still does, and that is a different mechanism.** Every masked line sits in a
`.<prefix>-mask` with `overflow: hidden` sized to the line box, while the face's glyph box is
~1.2em whatever line-height says - so a tighter leading pushes letters out of the MASK even though
nothing pushes the panel. Measured on lt64 at 1.05: the name is clipped 4px on y, and
`scripts/overflow-sweep.mjs` reports it as a regression while `stage-fit-sweep` reports it clean.
Two instruments, two mechanisms; a design whose line-height is pinned should say which one pins it.
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

- **…AND NEVER A HEIGHT ON A MULTI-COLUMN BLOCK.** A definite height is what tells a multicol
  container to stop balancing: it fills column one to that height, then column two, then lays the
  rest out in OVERFLOW COLUMNS to the RIGHT, past its own box - where the design's reveal mask
  (`overflow: hidden`) hides them. The words do not bleed a hair past the bottom where somebody
  would see it; they vanish, with the graphic looking finished. Both of the fit's probes call it
  a fit while it happens: `scrollHeight` sees no vertical overflow because there genuinely is
  none, and the Range it measures the width with returns LINE BOXES, each one sitting inside a
  column and so narrower than the box it is spilling out of. So the height is simply not pinned
  there - which is also what the shrink lever needs, because an indefinite height makes the
  overflow vertical again and the ordinary square-root pass handles it. card80's two-column
  standfirst is the catalog's only multicol today; it settled 0.25px inside its reserve at its own
  sample, so one renderer opened a third column where another did not (issue #36) and the nightly
  overflow sweep reported `.info-card-mask:x`. The gate is
  `e2e/catalog/multicol-containment.spec.ts`, and it calibrates BEFORE it types: drive `update()`
  before the webfont swap and the runtime takes its reserve from the long copy instead, everything
  fits by construction, and the gate passes on a build that is losing words.
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


## The text-size ladder is an AXIS, and every instrument measured one step of it

`--type-scale` is the operator's text-size knob (S/M/L = 0.85/1/1.2, `TYPE_SIZE_STEPS` in
`src/model/styleVocabulary.ts`), and **only `font-size` consumes it**. So a design that sizes a BOX
off the same variable while its padding stays fixed - or the reverse, a box on `--scale` alone
holding text that grows with `--type-scale` - changes SHAPE as the operator moves that knob, and it
can fit at M and clip at S or L. The alerts flag was the first one caught, by arithmetic rather than
by measurement: its `min-width` followed `--type-scale` and its padding did not, so it sat ~2px over
its box at M and ~7px at S, and nothing could see the S half because every instrument rendered M.

`scripts/stage-fit-sweep.mjs`, `scripts/type-floor.mjs` and `scripts/overflow-sweep.mjs` all take
`--type-scale s|m|l` now. The step goes through `create()`, the wizard's own path - not a CSS
override on the finished document, which would also move type in an imported design that declares no
`--type-scale` at all. The number is read from `TYPE_SIZE_STEPS` in the page, so no script holds a
copy of the ladder. Two rules keep the gates honest: `overflow-sweep` REFUSES `--update-baseline` at
a non-default step (a baseline recorded off-axis blesses that step's shape changes for every step),
and `type-floor` at a non-default step REPORTS and exits 0 - a line authored at the 20px floor
renders at 17px the moment somebody picks S, which is the operator's choice, not a catalog defect.

**First reading, 2026-08-23** (291 staged designs, 505 variants):

- **Stage fit is clean at every step.** Zero shrunk lines at S, M and L - the reserve/excess fix
  holds across the ladder, not only at the step it was measured on.
- **Type floor at S: 435 of 505 variants dip under it**, almost all of them exactly `floor x 0.85`.
  That is the ladder's arithmetic, not a defect list - but it says the catalog is authored AT the
  floor with no headroom, so picking S puts most of it under 20px. Whether S should be allowed to,
  or the floor should ride the ladder, is a product decision nobody has taken.
- **Containment at L: 22 designs clip 3-10px that do not clip at M**, across nine categories, and
  they are ONE mechanism - a reveal mask or name box whose height is `calc(Npx * var(--scale))`
  while the glyph box inside it grows with `--type-scale` (`.lower-third-mask` on lt03/lt14/lt51/
  lt55/ls07/ls11/ls14/ls17/ls19, `.info-card-mask` on card25/card48/card51, `.corner-bug-mask` on
  bug03/bug30/bug31/bug35, plus `.scoreboard-team` sb05, `.scoreboard-mask`/`.scoreboard-name` sb18,
  `.frame-mask` fr11, `.matchup-mask` h203, `.results-board-mask` tt02, `.reveal-mask` nm03). This is
  lt64's line-mask clip one level out: the fit routine is not involved, so `stage-fit-sweep` reads
  clean while text loses its descenders.
- **Containment at S: cr03 clips `.credits-box:y`** - a fixed 950px stage that paginates, packing one
  row too many once the type shrinks.
- **A CRAWL IS MEASURED MID-TRAVEL, so read ticker and credit-reel rows twice before believing
  them.** tk01, tk12 and cr06 report new escapes at S and tk05 at L purely because narrower items
  cover a different distance inside the sweep's fixed settle - reproducible, and not a defect.
