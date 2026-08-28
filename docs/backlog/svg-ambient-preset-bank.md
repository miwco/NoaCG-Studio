# Ambient preset bank beyond breathe and glow-pulse

**Filed:** 2026-08-28. **Source:** design review, `docs/SVG_ANIMATION_DIRECTION.md` (§4, §8.5).

## Why

The direction doc's MVP ships two ambient presets (breathe, glow-pulse) on imported SVG. A
professional live graphic's continuous motion is wider than that - drift, sheen, spin,
dash-travel, and eventually gradient and mask animation. The owner's brief names them
explicitly; the market read (`docs/EDITOR_RESEARCH.md`) shows every competitor making looping
awkward, so each preset added here is directly visible differentiation. Presets are the wizard
ceiling: without them, ambient motion exists only for coding agents.

## What it would take

Each preset is a deterministic `(template) => template` emitting rest-pose-first `loops`
tracks (the §2 contract), offered per layer where `design-stagger` is offered. Drift, sheen
and spin are keyframe-only - cheap once the MVP's plumbing exists. Dash-travel needs
`stroke-dasharray` detection; gradient/mask presets need per-file geometry detection (which
stop, which mask) and are the expensive tail - evidence first, via agent-ceiling usage showing
which ones people actually write by hand. A generic MEASURED drift builder (the first
design-agnostic `dynamics` builder) is its own decision and stays out until asked for.

## Evidence

- `docs/SVG_ANIMATION_DIRECTION.md` §4 (the two ceilings), §8.3/§8.5 (what is deferred and why).
- `docs/EDITOR_RESEARCH.md` - looping is "the market's weakest spot"; our model is already
  right and one affordance short.
- `src/templates/importedDesign/designPresets.ts` `design-stagger` - the offering pattern to
  extend.
