# WYSIWYG editor — Era 6 plan (first slices)

The goal: direct manipulation ON the preview canvas — drag to position, resize, edit text in
place — without ever betraying the core principle: **code is the single source of truth**.
Every canvas gesture writes the SAME deterministic patch a panel would write. There is no
scene model, no hidden transform layer, nothing the code editor can't show.

## Why this is cheap now (the foundations already exist)

- **Position** is already a code contract: the 9-zone anchor + `nudge {x,y}` written by
  `zoneDecls()` into the root rule; the Style panel re-anchors via the same patch
  (`blocks/cssVars.ts` + `zoneDecls`). A drag is just "compute nearest zone + residual nudge
  → apply the existing patch."
- **Size** is one knob: `--scale` in the `:root` contract.
- **Text** is sample data: the Data panel's values drive `update()` — inline editing writes
  `setSampleValue`, not code.
- **Selection** is the structure contract: every category has a known root
  (`.l3/.card/.ticker/…`) and known line elements (`#fN`).

## Slices (each independently shippable)

### W1 — Drag to position (the first slice to build)
A "Move" toggle on the preview toolbar. When on: pointer-drag on the graphic's ROOT shows a
ghost outline + the 9-zone grid (CanvasGuides already draws safe areas); on release, compute
the nearest zone anchor and the pixel residual → emit the zone+nudge patch (identical to the
Style panel's position control), highlighted + undoable like every panel apply. Multi-root
designs don't exist (one root per template), so hit-testing is trivial.
- Guardrails: zone snap ALWAYS (freeform absolute positions stay out — wrapped-text growth
  and safe areas depend on anchoring); Escape cancels; the iframe stays pointer-transparent
  when the toggle is off (playout preview unchanged).

### W2 — Resize (scale) handle
A corner handle on the selected root; drag = live `--scale` preview, release = one
`patchCss` write of `--scale` (the Style panel's size control, continuous). Clamp 0.5–2.

### W3 — Edit text in place
Double-click a `#fN` element → an overlay input positioned over it; commit writes
`setSampleValue(fN, value)` (live-drives the preview exactly like the Control tab). This is
data, not code — the design never forks.

### W4 — Element nudges (later, carefully)
Per-element offsets (e.g. move the accent bar) require a new, honest contract — e.g. emitted
`--offset-*` vars per element with comments — designed with the same rigor as the zone
contract. NOT in the first wave; a wrong move here creates the hidden-scene-model problem.

## Non-goals (deliberate)

- No free-form canvas: anchoring + auto-fit are what make the graphics broadcast-safe.
- No WYSIWYG-only state: if the code editor can't show it, we don't do it.
- No per-element drag in W1–W3: the root is the unit, exactly like the Style panel today.

## Verification

Each slice: an E2E spec driving the real pointer gestures (Playwright mouse) + asserting the
emitted code patch (zone decls / --scale / sample value), plus the standard build gate. The
preview iframe pointer plumbing (a transparent overlay ABOVE the iframe while editing) keeps
Monaco/GSAP quirks out of the tests — assert on code and DOM, not screenshots.
