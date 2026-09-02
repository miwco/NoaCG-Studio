---
kind: walk
date: 2026-08-29
---
# SVG animation direction - ambient motion on the one model

**Date:** 2026-08-29 · **Branch:** `claude/aa-svg-animation-review`

## What this is

Your brief - continuous on-air motion (pulses, glows, drifts, animated accents) for SVG-based
graphics, on the existing model, one format with wizard presets and agent freedom - is
answered as a direction document: `docs/SVG_ANIMATION_DIRECTION.md`. Docs only; nothing built.

## The route, in under a minute

1. Open **`docs/SVG_ANIMATION_DIRECTION.md`**.
2. Read **§0 "One-page summary"** - the three motion classes, and the one place your brief's
   framing is challenged: ambient needs no new machinery, it needs the runtime's notion of a
   timeline's END changed to the FINITE end.
3. Read **§9 "Recommended next decisions"** - four numbered items, that is the whole ask.

## What to look at

- **§9 decisions 1-2** are the substance: "end = finite end" as the model rule, and ambient =
  the existing `loops` tracks under a rest-pose-first preset contract - no second animation
  system.
- **§6** is the MVP: one branch, the finite-end runtime fix (a filed known bug) plus two
  ambient presets (breathe, glow-pulse) on imported SVG layers.
- **§8.1** is the one open question that needs your answer before the preset bank grows:
  is graphic-lifetime the only ambient scope for now?

Three backlog items filed (`svg-ambient-preset-bank`, `svg-ambient-state-scope`,
`svg-deep-layer-addressability`); the existing `settle-emitted-runtime-finite-end` item now
points at this doc as its trigger.
