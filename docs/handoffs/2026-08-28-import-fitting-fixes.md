# 2026-08-28 - SVG import fitting fixes (owner walk feedback)

Branch: `claude/kind-sutherland-79e83c`. Scope: the four fitting defects the owner found walking
`e2e/fixtures/svg-corpus/effects-gradient-shadow-lower-third.svg` through the Import door, plus
the outline-door offer from the same walk. Reproduced first (all four, with numbers, in the live
preview), then fixed.

## What was wrong, and what changed

1. **The too-long dropdown did not change the preview.** Root cause was defect 2: on this file
   the only growable shape was the 10px accent bar, so every ladder option degraded to shrink
   and the dropdown read as dead. With the panel in the inventory the options now visibly
   differ (measured: grow-x keeps 56px and widens the plate; shrink drops to 43.8px).
2. **A rounded Illustrator panel could not grow.** Illustrator writes a rounded rectangle as a
   `<path>` (never `rx`), and the growth inventory was `<rect>`-only. New: `panelPathGeometry`
   (`src/assets/svgImport.ts`) admits a single closed axis-aligned rectangle path - rounded
   corners included - to `shapes`; the emitted runtime grows one by shifting the far half of its
   points past its middle (`svgShiftPathD`, `src/templates/importedDesign/svg.ts`), so the drawn
   radii survive verbatim. Rest restores the drawn `d`. The measured grow-x default now fires on
   the fixture ("Plate - 1040 × 190" leads the picker).
3. **End caps.** A narrow shape hugging the panel's far edge (`svgIsEndCap`: within 2% of the
   edge, ≤25% of the panel's width, not text) bounds a line's room with the design's left inset
   mirrored before it, does NOT pen the line, and always rides the growing edge as a mover -
   declared follower list or not. Text stays between the caps; the cap travels on growth
   (measured: cap translate(35.9) alongside a 36px panel growth, text one inset short of it).
4. **Tracking was tightened.** Not the ladder - the import itself: unitless SVG lengths
   (`letter-spacing:2`, Illustrator's Character-panel tracking) are valid in a standalone .svg
   and silently dropped by the HTML CSS parser once inlined, so the strap's tracking computed
   `normal`. `normalizeSpacingUnits` rewrites the bare number to `px` in style blocks, inline
   styles and presentation attributes at import. The squeeze rung (`textLength`) is untouched -
   it is an explicit, owner-ruled last rung.

Small, same walk: an all-outlined file no longer offers "Draw a field on the artwork" (a drawn
box could only land on top of the drawn type), and the door's no-layers message names the exact
export checkboxes and recommends re-export. The lone-compound-path recovery road stays filed
(`docs/backlog/svg-import-sweep-findings.md` finding 1).

## Verification

- `npm run build` green.
- Four new cases in `e2e/import-svg.spec.ts` (path panel grows + ladder options differ;
  tracking survives; end cap bounds and travels; outlined file withdraws the draw offer) -
  queued as j-0146 with `import-svg-behaviour` + `import-svg-corpus`.
- `scripts/svg-import-sweep.mjs` re-run queued as j-0147; expected drift: the
  `effects-gradient-shadow-lower-third` row loses its finding-4 note (its sidecar already
  expected `grow-x`). Read the drift for any fixture whose shrink default flips because a
  panel-shaped path is now growable.

## Docs

`docs/SVG_IMPORT_PLAN.md` §3 (path panels, end-cap rule) and §5 (the spacing normalization),
`docs/SVG_AUTHORING.md` §4, `docs/backlog/svg-import-sweep-findings.md` (finding 4 fixed,
finding 1 interim), and the owner-queue item
`docs/acceptance/owner-queue/2026-08-28-svg-import-against-real-exports.md` (re-walk section
appended; the item stays OPEN for the owner).

## Collisions to know about

`docs/backlog/svg-import-sweep-findings.md` and the owner-queue item are also uncommitted in
worktree `h-github-storefront-0d1336` (the docs-feedback session) - expect a docs-level merge
there; merge-order will see it.
