# Offer named SVG layers at any depth as animation targets, not only top-level groups

**Filed:** 2026-08-28. **Source:** design review, `docs/SVG_ANIMATION_DIRECTION.md` §3.

## Why

Ambient motion binds to the layer the designer named, and the layer worth animating - a glow
shape, an accent line, a pattern group - usually lives INSIDE a top-level group.
`svgLayerSelectors` (model/structure.ts) offers top-level named `<g>`s only, which was a
stagger decision (per-layer entrance offsets read top to bottom), not an identity limit: the
ids are already in the file, import ships them verbatim, and sanitization never strips them.
Until the inventory offers depth, the wizard ceiling can only breathe whole groups while an
agent can address anything - a gap between the two ceilings that is pure surfacing, not
format.

## What it would take

Extend the layer inventory to named groups and named shapes at any depth, ranked
outermost-first (the canvas hit-test's existing tie-break), hidden outlined groups still
excluded, editor-serial ids ("layer1", "g27") still counting as unnamed. The ambient preset
picker consumes it; `design-stagger` deliberately keeps its top-level list. One spec against
an Illustrator-shaped fixture with nested named layers. Binding stays by id selector - never
structural position (the logo-slot `nth-child` lesson).

## Evidence

- `docs/SVG_ANIMATION_DIRECTION.md` §3.
- `src/templates/importedDesign/svg.ts` / `src/model/structure.ts` `svgLayerSelectors` -
  the current top-level-only offer.
- `docs/SVG_IMPORT_PLAN.md` §2 - the name inventory (id / data-name / inkscape:label) already
  reads every depth for labelling.
