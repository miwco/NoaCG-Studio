# src/blocks - deterministic template transforms

Loaded alongside the root CLAUDE.md when working in this directory. Keep it accurate.

Everything here is a pure `(template) => template` transform that emits clean, commented code
(root non-negotiables 1, 2 and 5). The panels, canvas, and timeline are thin UIs over these
patchers.

## registry.ts - building blocks

BuildingBlock[] - there is no Blocks tab anymore; this is the offline AI stub's vocabulary. Pure
transforms grouped by a hierarchical `path` (e.g. `['Lower third']`, `['Animation','GSAP']`) with
a `primaryTab` (the tab to reveal after applying). Inserted elements are positioned in the
lower-left action-safe area via `positionForNewElement`, tagged `data-gfx`, and styled with
`textCssRule` (rich commented CSS). Animation is two tracks: **CSS** (`@keyframes` + class
applied to the element) and **GSAP** (tween injected into `play()/stop()`).

## edit.ts

Field/definition editing helpers: nextFieldId, addFieldToDefinition, setFieldDefault, …

## cssVars.ts

:root variable read/write helpers (the Style panel's patch layer).

## animPatch.ts - the marked ANIMATION region

The Motion panel and timeline only touch the marked region
(`/* == ANIMATION … == */ … /* == END ANIMATION == */`) and its three knob variables
(`animSpeed`, `easeIn`, `easeOut`); user code outside the markers is never modified.

- `readAnimationInfo` reads per-phase "// In preset:" / "// Out preset:" comments, falling back
  to "// Preset:".
- `swapAnimationPhase(js, id, cfg, 'in'|'out'|'both')` splices two emitted regions at the
  buildOutTimeline boundary - steps code travels with the IN phase.
- Presets are per-category (`presetsForType`); the root prefix is detected via
  model/structure.ts (hyphen-safe). Preset/steps swaps re-emit the region (undoable).
- The steps toggle only shows for line-based categories (lower thirds, info cards, scoreboards,
  corner bug) - continuous, clock, and data-driven formats hide it.

## stepAssign.ts - "appears on press"

`changePartPress` is the ONE appears-on-press transition, shared by the timeline gutter's menu
and the canvas chip: entrance->press and press->entrance re-emit the IN phase via
`applyStepChain`; press->press stays the tuning-preserving `patchStepRegroup` literal patch.
Blocks (`data-gfx` + id, OUTSIDE the root) are assignable too - the emitted outside gate hides
them from first paint (steps block, DOM-ready guarded) and `patchOutsideExit` keeps ONE surgical
buildOutTimeline fade line in sync at the animPatch swap choke points, so they leave with the
exit without resetting out-phase tuning.

## timelineModel.ts - the timeline's model + patchers

`buildOverview` builds the cue-segmented overview that TimelineView renders (see
src/components/CLAUDE.md), plus the surgical patchers the timeline edits with: `splitTween`,
`patchTweenEase`, `patchStepEase`, `patchTweenVars`, `insertPartTween`.
