# Dynamic (measured) motion — scope for migrating tickers & credits

This is the design scope for the one gap that keeps **tickers** and **end credits** on the legacy
patchers (and therefore blocks Phase 8 of `docs/TIMELINE_V2_PLAN.md`). It is the follow-up the
loop/yoyo work named: loop/yoyo unblocked starting-soon, but explicitly **not** tickers/credits,
because their motion is computed from live DOM measurement, which the static keyframe model
deliberately cannot express (`docs/PRESET_MODEL_REVIEW.md` gap 6, and gap 3's spirit).

Status: **DESIGN / awaiting ratification.** Nothing here is built.

## 1. What these categories actually need (from the code)

The five loop presets (`src/templates/tickers/tickerPresets.ts`,
`src/templates/endCredits/creditsPresets.ts`) split into two hard requirements:

**a) Measured scalar values** — a keyframe value and/or a tween duration derived from a live DOM
measurement, not a literal:

- `ticker-marquee`: `oneSet = track.scrollWidth / 2; x → -oneSet; duration = oneSet / (140 * speed)`, `repeat: -1`.
- `credits-roll`: `endY = -(track.scrollHeight - box.clientHeight/2 - endBlock.offsetHeight/2); duration = (startY - endY) / (90 * speed)`.
- `credits-crawl`: `endX = -(track.scrollWidth - box.clientWidth); duration = distance / (160 * speed)`.

The magnitudes change with the operator's text, so **no static keyframe number can hold them** —
baking a measured pixel value into the data would be wrong the moment the content changes.

**b) Content-driven sequences** — the *number* of animation segments equals the number of DOM
children at runtime:

- `ticker-flip`: `gsap.timeline({repeat:-1})` with one flip-in / hold / flip-out per `.ticker-item`.
- `credits-pages`: one fade-in per `.credits-page`, with a per-page hold derived from the page's row count.

No fixed-length keyframe track can represent "one segment per child."

## 2. Approaches considered and why they lose

- **Measured-value keyframes** (a keyframe whose `value`/`time` is a `{ measure: el, of: "scrollWidth" }`
  descriptor the interpreter resolves at play time). Handles (a)'s simplest case, but credits-roll's
  three-measurement arithmetic needs a real expression, and it cannot express (b) at all (dynamic
  segment count). Two shapes to cover the five presets.
- **A restricted formula grammar** (named measurements + a safe `+ - * / ()` evaluator over them).
  Covers (a) including the arithmetic, still cannot express (b), and it introduces a mini-language —
  against the house rule of simple, obvious code, and adjacent to the no-`eval` posture the community
  bench guards.
- **Keep them fully hand-crafted (status quo).** They then never get the data-block surface, so the
  classic strip and legacy patchers can never be retired for them — Phase 8 stays blocked.

## 3. The proposed primitive: named dynamic motion segments

Mirror the §3b step-calls model exactly, but for **motion** instead of side effects. A step gains an
optional `dynamics` list; each entry names a **design-owned builder function** (a bare identifier,
resolved by `window[name]` at build time — no `eval`, no arguments-as-code) that **returns a GSAP
tween/timeline**, which the interpreter adds to the step timeline:

```json
{ "name": "Enter", "duration": 0.5, "ease": "power2.out",
  "dynamics": [ { "build": "marqueeLoop", "target": "#ticker-track", "time": 0.5 } ],
  "layers": { ".ticker-box": { "opacity": [ { "time": 0, "value": 0 }, { "time": 0.5, "value": 1 } ] } }
}
```

- `build` — a global function defined in the template's **own JS, OUTSIDE the marked region** (a
  design-owned runtime, exactly like the countdown clock engine `shared/clock.ts` that game-timers
  and starting-soon already ship). It reads the DOM, does whatever arithmetic it needs in plain
  readable JS, and returns a GSAP object (or `null`).
- `target` — an optional selector passed to the builder, so one builder can serve many targets.
- `time` — optional placement on the step's clock (the marquee starts after the entrance fade).
- Schema key order on the step becomes `name, duration, ease, reveals, hides, calls, dynamics, loops, layers`.

### Interpreter (additive to `animRuntime.ts`)

```js
// Dynamic motion: a design-owned builder measures the DOM and returns a GSAP tween/timeline
// (a marquee's width-derived travel, a credits roll). Resolved by name at build time — the
// timeline never owns this logic. A missing builder is a silent no-op.
for (var d = 0; d < (step.dynamics || []).length; d++) {
  (function (name, target, at) {
    var fn = window[name];
    if (typeof fn !== 'function') return;
    var seg = fn(target, { speed: speed });
    if (seg) tl.add(seg, (at || 0) / speed);
  })(step.dynamics[d].build, step.dynamics[d].target, step.dynamics[d].time);
}
```

### The design-owned builder (outside the region, ships in every export)

```js
// The marquee travel — measured at play() time. The track holds the items twice, so sliding
// exactly one set (-scrollWidth/2) and repeating looks seamless. Edit the speed here.
function marqueeLoop(target) {
  var el = document.querySelector(target);
  var oneSet = el.scrollWidth / 2;
  var pxPerSec = 140 * motionSpeed();        // motionSpeed(): NOACG_ANIM.speed, else 1
  return gsap.fromTo(el, { x: 0 },
    { x: -oneSet, duration: oneSet / pxPerSec, ease: 'none', repeat: -1 });
}
```

credits-roll's three-measurement formula and ticker-flip's/credits-pages' per-child sequences are
just ordinary JS inside their builders — the same code they are today, lifted out of `buildInTimeline`
into a named function the data references.

## 4. Why this is the right shape

- **It fits every one of the five presets uniformly** — measured scalars and content-driven
  sequences both reduce to "a builder returns a timeline," where two other approaches each cover only
  part.
- **It is the smallest possible addition** — one optional step field, ~7 interpreter lines, a direct
  copy of the ratified §3b calls pattern (`{ call }` side effects → `{ build }` motion).
- **It honors every pillar.** No `eval` (a `window[name]` lookup). Code is real and the source of
  truth — the measured logic stays readable JS where it belongs. The visual timeline **correctly
  steps aside** for a track it cannot meaningfully keyframe (you cannot visually keyframe "travel by
  measured width"); it renders the segment read-only ("measured motion — `marqueeLoop()` — edit in
  code"), which is honest, not a limitation. Preview/export parity is structural (the builder ships
  verbatim, one implementation). Offline-first is untouched.
- **It unblocks Phase 8 for these categories** — they gain the NOACG_ANIM data-block shape (static
  entrance/exit as keyframes + a dynamic segment for the travel), so they render on `StepTimeline` and
  no longer need the classic strip.

## 5. How each preset maps

| Preset | Static (keyframes) | Dynamic segment (builder) |
|---|---|---|
| ticker-marquee | `.ticker-box` opacity fade in/out | `marqueeLoop(#ticker-track)` — measured, `repeat:-1` |
| ticker-flip | box fade | `itemFlipCycle(#ticker-track)` — per-item `timeline({repeat:-1})` |
| credits-roll | box fade | `creditsRoll(#credits-track)` — three-measurement linear travel |
| credits-crawl | box fade | `creditsCrawl(#credits-track)` — measured horizontal travel |
| credits-pages | box fade | `creditsPages(#credits-track)` — per-page fade/hold sequence |

## 6. Validation & timeline UI

- **Validation** (`validateTemplate.ts`): `build` is a bare identifier and the named function is
  defined in `template.js` (warning if missing — same spirit as the dangling-selector and undefined-
  call checks); `target`, when present, should match an element.
- **Timeline** (`StepTimeline.tsx`): a read-only "measured motion" block on the target's row, naming
  the builder, with a tooltip that it is edited in code. This is the same read-only treatment the
  §3b calls glyph specifies (note: that glyph is itself still unbuilt — see §8).

## 7. Migration path

- **Catalog templates are regenerated** — the ticker/credits presets emit the new shape directly
  (data block + dynamic segment + the design-owned builder, emitted before the region like the clock
  engine). We own these; no importer round-trip is needed for them.
- **Preset swap for dynamic categories** — swapping marquee↔flip is swapping the builder reference and
  regenerating, not a keyframe edit. `presetApply` (or a category-specific regenerate path) must learn
  to carry a dynamic segment. **Open question** (§8).

## 8. Open questions to ratify before building

1. **Saved / community / AI legacy tickers.** The importer cannot reliably extract arbitrary measured
   JS from an old `buildInTimeline` into a named builder, so `importAnimData` will keep **refusing**
   legacy measured tickers — they render on the classic strip until regenerated. That means Phase 8
   cannot delete the classic strip outright while such saved templates exist; it needs either a
   one-time regenerate-to-new-shape path for them, or a minimal read-only legacy renderer retained as
   a fallback. **Decision needed:** which.
2. **Preset swap semantics** for dynamic categories (regenerate vs. a `presetApply` that swaps the
   `dynamics` entry). §7.
3. **Is the speed knob editable from the UI, or only in the builder?** v1 keeps `pixelsPerSecond` in
   the builder (code-owned). Surfacing it as a Style/Inspector knob is a possible later enhancement
   (it would read a `--motion-speed`-style var the builder honors).
4. **Builder naming & namespacing** — bare globals (`marqueeLoop`) vs a small namespace to avoid
   collisions across composed packets.

## 9. Explicitly NOT in this primitive

No expression language, no measured-value keyframe type, no arbitrary JS in the data (the data holds a
name and a target — the logic stays in code), no visual editing of measured travel, no attempt to make
the importer auto-convert arbitrary hand-written measured motion.

## 10. Recommendation

Build the `dynamics` primitive as the direct §3b twin (schema + interpreter + validation + the
read-only timeline block), regenerate the ticker/credits catalog onto it, and pin it with a parity
harness (legacy emit vs regenerated data → identical measured motion at sampled times, across a
matrix of content lengths). Resolve open question §8.1 before promising Phase 8 can retire the classic
strip. This is a Tier-3-sized effort comparable to the loop/yoyo work: contained, additive, and
philosophically clean — the visual timeline steps aside for motion that is honestly code-owned, which
is exactly what the "code is real, view optional" pillar intends.
