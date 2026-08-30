# The shared logo slot - how it is drawn, and what measuring it cost

The reasoning behind `src/templates/shared/logoSlot.ts`. The BINDING rules are stated in
`src/templates/AGENTS.md` ("Fields & images"); this file is the evidence under them, so a rule
here is never re-litigated from memory. Where a mark is PERMITTED at all is a different question,
answered in `docs/MARK_CAPABILITY_AUDIT.md`.

## What the slot is

`TemplateVariant.logo: 'none' | 'optional' | 'built-in'` is the capability. A `'built-in'` design
(corner bugs, end credits' f2) always carries its slot; an `'optional'` design gets the wizard's
Fields-step logo toggle plus custom upload, and only emits the field when it is on
(`ResolvedOptions.logoEnabled`). A design either hand-authors its slot (lt07's badge, lt08's
docked square, card03) as design-owned `extraFields`, or opts in with zero code: `applyLogoSlot`
injects the standard slot from `assembleStandard` when `logoEnabled` and `designHasLogoSlot` says
the design has none.

**Two arrangements, decided by the CATEGORY, never per design.** Lower thirds place the mark
BESIDE the text; every other category keeps the stacked band above it, because a card is a
vertical composition and a mark above its heading reads as a header. The beside rule comes from
the 2026-08-13 Pro brand round's blind review, which made compactness a standing rule ("do not
place a logo above or below the lower third; prefer beside"), and from measurement: the
leading-row form grew straps up to **83% taller** (2026-08-14), and a strap's height is the one
dimension it cannot spend.

An EMPTY slot changes nothing in either arrangement: the hidden `<img>` stops being a grid item
and its margin - which is where the clear space lives, deliberately, rather than in a track gap -
goes with it. Pinned by `e2e/wizard-logo.spec.ts`.

## Injecting markup into a design you cannot see

- **Inject as the LAST child.** A first child renumbers every `nth-child` selector the design
  wrote about its own children - lt02 put the name under its underline.
- **Cap the mark's height, never fix it.** A fixed height hands a portrait crest the power to set
  the strap's height through its own aspect.
- **The clear space is the mark's own MARGIN, never the box's `column-gap`.** A track is charged
  its gap even when nothing is in it, so an empty slot shifted the words 26px.

## The lockup wrapper

**A strap gathers the design's own children into one `.{prefix}-lockup` div**, so the box holds
exactly two items in one row, and the lockup takes `row-gap: inherit` - which is what keeps a
design that spaced its lines from its own box spacing them identically.

That is not tidiness. The first version left the children loose and gave the mark
`grid-row: 1 / -1`, which is a NO-OP against a rule that declares columns only: a negative row
line counts back from the EXPLICIT grid, and with no row track `-1` resolves to line 1. There is
no count-free way to span an unknown number of implicit rows, so the wrapper removes the rows from
the question. With it, a crest costs a strap ZERO height and sits at offset 0 on all 24 designs.

## `designHasLogoSlot` misses nothing

Measured 2026-08-15 over all 24 mark-capable lower thirds with a real mark: only six (lt02, lt05,
lt11, lt15, lt25, lt32) take the shared slot, and only those six emit a `.{prefix}-lockup`. A
design's slot is conditional on the same `logoEnabled` the check is guarded by, so by the time it
runs, a design that has a slot has already emitted the `<img>` AND the filelist field.

**Do not add a `design.css` clause.** It changes 0 of the 24 answers and would later be wrong,
because a design may style `.{prefix}-logo` unconditionally (lt07's badge is an accent square with
or without a mark) and would then be denied the field entirely.

Two real things the sweep did find, both by design and both stated in each design's own source: a
slot drawn in a WELL reserves that well's width while EMPTY (97-188px across the nine designs that
draw one); and the `mark-crowded` readings that prompted the look are an INSTRUMENT artifact, not
a catalog defect - a mark that fills its well carries its clear space as the `<img>`'s own
padding, which `spacingCheck`'s border box swallowed. **That fix is made in
`src/ai/spike/spacingCheck.ts` and never in the catalog, because no design is at fault**
(`markContentRect`, 2026-08-15; `node scripts/spike-mark-clearance-sweep.mjs` re-runs the
measurement).

**ls18 and ls25 stay flagged and neither is a defect**: their clear space matches designs that
PASS, and they fail only because their marks are far taller - the unit is the mark's own height,
so a design that gives its mark room divides by its own generosity. ls25 is additionally a
`picture` well showing square cover art `object-fit: cover`, which is that design being right. A
sweep still compares against a BARE render rather than an absolute, because `findPanel` resolves
for only 10 of these 24 - and the ABSOLUTE ratios depend on which mark is rendered, while the set
that moves does not.

## "A strap spends width, never height" on the hand-authored slots

Settling this cost the sweep a new column, because a height figure cannot say WHY. Two rules came
out of measuring the four designs that grew.

- **A mark makes a strap taller in two opposite ways, and the fix for one is the fix for nothing
  else.** Either the mark's own furniture is taller than the words (bound the well), or the mark's
  column came out of a CAPPED text measure and the words needed more height (widen the cap -
  `sideBySideSizeCss`'s answer, and the owner's mark-size ruling: widen the strap's wrap cap,
  never the mark's cap alone). ls29 and ls17 were the second kind - each hit its own cap and a
  name row broke in two. Both now widen their cap by the mark's column when the slot is on, and
  both declare the width, the clear space and the measure as three consts, because the third is
  computed from the first two. Both now grow sideways only, and ls17's `mark-adrift` finding
  cleared with it.
- **Invisible furniture must never carry a fixed height, and bounding it needs the image OUT OF
  FLOW.** Both mark areas were fixed boxes (96px, 112px) drawing nothing but a placeholder
  hairline, commented "fixed, so the artwork never sets the strap's height" - true of the artwork
  and false of the box around it. They now `align-self: stretch` to the words' height with the
  `<img>` absolutely positioned inside, and that second half is load-bearing: an in-flow image
  contributes its own height to the flex line even under a `max-height`, and a stretched item's
  hypothetical cross size still counts, so stretch alone re-grows the strap through the back door.
  Marks got BIGGER, not smaller - ls17's crest 112 -> 146px on the four lines it draws for.
- **A SQUARE crest and a PORTRAIT one fail differently, and the sweep only ever rendered the
  square.** `e2e/catalog/mark-height.spec.ts` measures every mark-capable lower third against BOTH
  shapes, and found two more designs on its first run (lt07 and ls10, up to +71%), both clean with
  a square crest. Cause in both: an in-flow `<img>` at `width: 100%` + `height: 100%` inside a
  badge sized by `min-height`, so the percentage resolves against an INDEFINITE height and the
  artwork's own aspect at the badge's width becomes the badge's height. Both badges are drawn
  accent squares whose own source promises "roughly square", so a 1:1.75 badge is a defect rather
  than a composition: the image is absolute in both now. **The pattern to grep for is a
  definite-height well, not this list** - lt41, lt49, lt53, ls18 and ls25 carry the same in-flow
  `height: 100%` and do NOT grow, because their wells state a height.
- **lt49 and lt53 are RECORDED EXCEPTIONS, argued in their own source.** Their wells are drawn,
  tinted squares - real furniture - and at the four lines each board is built for, the words are
  157px and the well costs zero height (207 -> 207px on both). The growth appears only below their
  own line count, and both ways to remove it are worse: capping the height alone makes the square
  a rectangle, and shrinking the well shrinks the mark on the content it was drawn for.

The sweep reports the CAUSE (it measures the box's two children against each other, since a line
count misses a sibling row reflowing) and probes BOTH content shapes - the calibrated two lines
and the design's own - because a well sized against four lines is not a defect for costing height
at two, and reporting only one number reads a design's proportions as a fault. The GATE is
`e2e/catalog/mark-height.spec.ts` (both mark shapes, mutation-tested, exceptions checked from both
sides so a stale entry fails rather than excusing a design it no longer describes); the sweep
stays the diagnostic that says WHY.

## The mark's size is three measured numbers, and the third is the strap's own wrap cap

2026-08-14, the value-gate ballot's other finding - the logo was called too small on four of eight
briefs. The WIDTH cap used to bind before the height cap, so a 4:1 wordmark painted 33px beside a
54px name and a 13:1 rail painted TEN pixels at 1080p; only a 1:1 crest ever reached the height
cap.

**Raising the width cap alone is the obvious fix and is wrong.** Measured over all 23 mark-capable
lower thirds, 180px wrapped one design, 220px two and 260px three, and each wrapped line grew that
strap by up to 73% - the failure the beside-the-text rule exists to prevent, arriving through the
width.

So `applyLogoSlot` WIDENS the box's own `maxTextWidthCss` cap by the mark's column (260 + 26px)
instead: the words keep their whole measure and the graphic grows in the one dimension a strap may
spend. Measured result: marks roughly doubled, ZERO newly wrapped lines, ZERO height growth,
nothing outside the title-safe area. **84px is the height ceiling** because past it the mark
starts setting the row's height itself. The cap arithmetic reads `computeMaxTextWidth`, the same
function the assembler calls, so the two cannot disagree unless this category grows a
`CategorySpec.maxTextWidth` of its own - it has none. Pinned by `e2e/wizard-logo.spec.ts`,
mutation-tested.

## A mark is not a picture

The shared slot is a BAND sized by height with its width free. It was a 56px square until
2026-08-09, which held a crest and reduced a 4:1 wordmark to a 20px strip and a 10:1 sponsor rail
to about 8px - so "bring your logo" was true only for a shape most brands do not have.

It also carries NO radius and NO crop: `src/ai/assetIntegrity.ts` refuses both on a picture the
user marked "use it as it is", and the two contracts had simply never met. A slot that holds
CONTENT rather than a mark - ls25's release artwork, which is square by nature and correctly
cropped - says so with `TemplateVariant.imageSlot: 'picture'`. Measured by
`node scripts/ai-lite-brand-audit.mjs`; findings in `benchmarks/lite/BRAND-AUDIT-2026-08-09.md`.

## A phantom logo field is a lie on every control page

The capability is the whole answer, including for a category that used to hard-wire it. End
credits declared f2 for every design regardless of what the variant said, so a design with no
place for a mark still shipped the operator a Logo field it could never draw. The assembler now
gates the field, the hidden source AND the runtime's lookup on `logoEnabled` (cr13 is the first
credits design to declare anything but `'built-in'` - `'optional'`, so its colophon has no mark by
default and gains one when the toggle is on).

A phantom field is not cosmetic: it is a lie on every generated control page, and it moves every
baseline when it is removed. **A design gating a logo must gate its logo CSS on `logoEnabled`
too**, or the default build changes and every baseline moves for a slot nobody asked for.
