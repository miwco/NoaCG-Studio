# Timeline v2 — the step timeline

**Status: PLAN, awaiting ratification. No implementation has started.**

The direction: a basic, intuitive, CapCut-style animation timeline adapted for broadcast
graphics. A video editor has clips; NoaCG Studio has **steps**. Everything else should feel
like a familiar timeline. The interaction philosophy is *select it to affect it*, and the
result must feel simpler than what we have now, not more complicated.

This document is the audit + refactor plan: what the current architecture is, why it is
fighting this interaction model, what replaces it, the data model, answers to the twelve
design questions, the risks, and the phased path that keeps the editor usable throughout.

---

## 1. The verdict: the architecture IS fighting this model

Being direct, as asked: **the current editing architecture cannot carry a keyframe timeline,
and patching it further would be malpractice.** The evidence is recent and concrete.

The current model is *parse-by-construction*: presets emit hand-shaped GSAP choreography
into the marked `/* == ANIMATION == */` region, and the editor regex-parses that code back
into a model (`blocks/timelineModel.ts`), then edits it with surgical literal patchers.
Every editing affordance costs one parser shape plus one patcher:

- Retiming a bar → `patchTweenTiming` (rewrites `duration:`/position literals).
- Retiming independently → `splitTween` first (rewrites a joint call into member calls).
- Per-tween ease → `patchTweenEase`. Per-step ease → `patchStepEase`.
- Regrouping presses → `patchStepRegroup` (rewrites three parallel arrays consistently).
- Enters-from values → `patchTweenVars` (+ `insertPartTween` for layers with no tween).
- Leaves-to values → `patchTweenToVars` (+ `insertPartOutTween`).
- Blur → its own reader AND its own writer (`setObjBlur`), because `filter: 'blur(8px)'`
  is a string, not a number.
- Mixing In/Out presets → `splitRegion` splices two emitted regions at the literal text
  `function buildOutTimeline` — and we fixed a stale-tag bug in exactly that splice days
  after shipping it.
- Steps living outside the root → `patchOutsideExit` keeps ONE recognizable `tl.to` line in
  sync at every "swap choke point".

That is ~15 hand-maintained code-shape contracts, each a place where a hand edit can
silently disable an affordance. The tax is linear per feature and the features ahead
(keyframes per property, draggable diamonds, interpolation editing, step duplication) would
make it combinatorial. A keyframe model **cannot** be represented as "readable free-form
GSAP calls we regex back" without the parser becoming a JavaScript interpreter.

**What is NOT broken** — and this matters just as much:

- **The semantic model is right.** The current strip's cue-segmented view (every section on
  its own local clock, because steps wait for operator presses) is the *truthful* model of
  broadcast playout. The new "steps as clips" presentation sits perfectly on top of it:
  steps laid end-to-end for editing, with the understanding that on air, waits happen
  between them. A naive single-global-clock video timeline would be semantically wrong —
  a step's absolute start time does not exist until the operator presses Next.
- **The layer model exists.** `model/structure.ts` (`getTemplateParts`) is exactly the
  layer registry the new timeline rows need, and `selectedPart` in the store is exactly the
  shared selection ("select it to affect it" already works canvas ↔ strip ↔ chip).
- **The runtime contract is solid and everything external depends only on it** (audited
  below): global `play()/stop()/next()/update()` plus the builder globals
  `buildInTimeline()/buildOutTimeline()/revealNextStep()`.
- **Code as the single source of truth stays.** That pillar is not negotiable. What changes
  is *what the code is*.

## 2. The one architectural decision

> The marked ANIMATION region stops carrying free-form choreography and starts carrying
> **a declarative animation data literal plus a small fixed interpreter** — both still
> plain, readable, editable JS inside the template.

Concretely, the region becomes:

```js
/* == ANIMATION (generated — the timeline edits the data block below) == */
// The graphic's animation as data: steps play in order (step 1 on ▶ Play, each next
// step on » Next, the last on ■ Stop). Each layer's properties are keyframe lists
// [{ "t": seconds, "v": value, "ease": gsap-ease }] on the step's local clock.
// Edit numbers freely — the timeline reads and writes this block.
var NOACG_ANIM = {
  "v": 1,
  "root": ".lower-third",
  "speed": 1,
  "steps": [
    { "name": "Enter", "duration": 0.9, "ease": "expo.out",
      "tracks": {
        ".lower-third-accent": { "scaleX": [ { "t": 0, "v": 0 }, { "t": 0.45, "v": 1 } ] },
        "#f0": { "yPercent": [ { "t": 0.3, "v": 110 }, { "t": 0.85, "v": 0 } ] },
        "#f1": { "yPercent": [ { "t": 0.4, "v": 110 }, { "t": 0.95, "v": 0 } ] }
      }
    },
    { "name": "Out", "duration": 0.6, "ease": "power3.in",
      "tracks": {
        "#f0": { "yPercent": [ { "t": 0, "v": 0 }, { "t": 0.35, "v": 110 } ] },
        ".lower-third-accent": { "scaleX": [ { "t": 0.25, "v": 1 }, { "t": 0.55, "v": 0 } ] }
      }
    }
  ]
};

// buildInTimeline()/buildOutTimeline()/revealNextStep(): build GSAP timelines from the
// data above. This interpreter is the same in every template — replace it entirely if
// you want hand-written choreography (the timeline UI then steps aside).
function buildStepTimeline(step) { /* ~60 lines, commented, ES5 */ }
function buildInTimeline() { ... }
function revealNextStep() { ... }
function buildOutTimeline() { ... }
/* == END ANIMATION == */
```

Why this preserves every pillar:

- **Code is real and always available.** The data block ships in the template, is
  hand-editable (change `0.45` to `0.9`, it works), and the interpreter is readable,
  commented, dependency-free ES5 (~2-3 KB). A pro can delete it all and write raw GSAP —
  the timeline UI then steps aside exactly as it does today for unparsable regions.
  Honestly, `{ "t": 0.5, "v": 0 }` is *easier* for a professional to edit than today's
  GSAP position-arg semantics (`'-=0.3'` overlap math).
- **The editor's parse/patch tax drops to zero.** The editor extracts the `{...}` literal
  and `JSON.parse`s it (strict JSON inside the braces — the emit guarantees it). Every edit
  is: mutate the object, re-serialize, one `applyTemplate`. Keyframes, step resizing,
  duplication, presets, In/Out/Both — all become data operations. The ~15 literal patchers
  are deleted.
- **Presets and keyframes are one system by construction.** A preset is a pure function
  `(layers, direction, params) → keyframes` written into the same structure. No black-box
  second engine — the "Slide In, from left, 500 ms" example becomes literally
  `x: [{t:0, v:-300}, {t:0.5, v:0}]`, visible and editable.
- **Preview/export parity is structural.** The same JS (data + interpreter) is inlined
  verbatim into the preview iframe (`composeDocument`) and shipped verbatim by all six
  export targets. There is no second implementation to drift.
- **No `eval` anywhere.** The runtime never parses anything — `NOACG_ANIM` is already a JS
  object. Only the editor parses (JSON.parse on extracted text). This matters: the
  community bench (`templateBench.ts`) flags `eval(`/`new Function(` as suspicious.

### The preserved contract (verified by audit)

Everything outside the timeline UI depends on one of two contracts, and both survive:

1. **SPX globals** `play()/stop()/next()/update(data)` — untouched (the category scaffolds
   in `templates/*/shared.ts` keep calling the builders exactly as today).
2. **Builder globals** `buildInTimeline()`, `buildOutTimeline()`, `revealNextStep()`
   (returning a GSAP timeline; `revealNextStep` returns `null` when exhausted). These are
   called directly by `PlayoutSimulator` (play/settle/scrub/auto-out), `MiniPreview`
   (wizard thumbnails), and indirectly by the OGraf export's `playAction` step loop.
   **The interpreter defines the same globals with the same semantics** — so the
   simulator, wizard, control engine, receiver script, and every export work unmodified.

## 3. The animation data model

### Steps (the clips)

```
steps: [ step1, step2, ..., out ]
```

- `steps[0]` plays on ▶ Play. `steps[1..n-2]` each play on one » Next press (SPX Continue).
  `steps[n-1]` plays on ■ Stop — **Out is just the last step**, editable like any other
  (resize, scrub, keyframes, presets), not a hidden special case. The In/Hold/Out
  hardcoding dissolves; the generic model is `Step 1 → ... → Out` exactly as requested.
- A step has `name` (rename-able, defaulting to "Enter"/"Step N"/"Out"), `duration`
  (seconds, snapped to 0.05), `ease` (the step's default GSAP ease — the old
  easeIn/easeOut knobs become per-step defaults), and `tracks`.
- `settings.steps` (the SPX definition) stays derived: `steps.length - 1` states
  (entrance + Continue presses). The `withStepsSetting` invariant survives as a one-line
  derivation. `settings.out` stays the SPX truth for the hold (`manual` / N ms / `none`)
  — it is not duplicated into the data block.
- **The hold is not a step.** It is the wait between the last content step and Out. On the
  ribbon it renders as a slim fixed break glyph (like today's hatch) when `out` is
  manual/none — because it truly has no duration — and as a real, resizable segment when
  `out` is N ms (auto-out gives it one). This is the one honest deviation from a video
  editor, and it is exactly where broadcast differs from video.

### Layers (the rows)

Rows are the `TemplatePart` registry (kept as-is): root, panel, accent, lines, images,
blocks. Track keys are part selectors (single-token, the registry's existing rule). A
selector in the data that no longer matches the HTML degrades gracefully (row shows a
warning; validation warns — replacing today's `stepGroups` dangling-selector check).

### Keyframes

`{ "t": seconds-on-the-step's-local-clock, "v": number | string, "ease": "gsap-ease"? }`

- `v` is a number for transforms/opacity and a string for filter/clipPath (GSAP
  interpolates those natively) — blur stops being a special case forever.
- `ease` is per-keyframe (the ease INTO that keyframe), defaulting to the step's `ease`.
  Bounce/back ARE true GSAP eases — they stay in the easing vocabulary
  (`model/easings.ts`, already tagged playful), not fake presets. The user-facing easing
  list stays the existing curated vocabulary.
- Value resolution: a property's value at (step k, t) = interpolation between surrounding
  keyframes in step k; before step k's first keyframe = the last keyframe value from any
  earlier step; before ANY keyframe = the layer's design (CSS) state. **Unchanged state
  persists automatically** — nobody keyframes "stays put".
- Pre-hiding is DERIVED: a layer whose first appearance is in step k > 0 is hidden by the
  interpreter from Play until step k (replacing `hidePendingSteps` + `stepOutsideParts` +
  `patchOutsideExit` — outside-the-root containment is checked at runtime with
  `root.contains(el)`, more robust than today's emitted static list).

### The twelve design questions, answered

1. **Keyframes global or step-relative?** Step-relative. Global time is a fiction in
   broadcast (steps wait for cues); step-local storage makes resize/duplicate/reorder
   trivial (keyframes travel with their step), matches SPX/OGraf step semantics, and
   matches the current proven local-clock model. The RULER still displays concatenated
   time (sum of prior durations + local t) so it *looks* like one CapCut timeline; the
   playhead is internally `(stepIndex, localT)`.
2. **How do values persist between steps?** By evaluation, not materialization (see value
   resolution above). No auto-keyframes at boundaries; the design state is the implicit
   base. Simplest robust model, and it makes "Title enters in step 1, sits still in step 2,
   moves in step 3, fades in Out" work with zero bookkeeping.
3. **Resizing a step?** Keyframe times scale proportionally (resize = "make this step
   faster/slower", which is what users mean, and what the current duration-drag does).
   Dragging an individual keyframe sets exact timing. No orphaned keyframes possible.
4. **Duplicating a step?** Keyframes copy verbatim in local time. The duplicated step's
   *resolved* starting state comes from its new predecessor — correct by construction, and
   exactly what the quiz workflow wants (duplicate "reveal A", retarget the track from
   answer A's selector to answer B's).
5. **Reordering steps?** Supported by the model for free (keyframes travel with the step),
   but **deferred out of v1**. Duplication + moving a layer's segment between steps cover
   the real broadcast cases; reorder UI adds drag complexity with little payoff now. Out is
   pinned last regardless.
6. **Out internally?** `steps[steps.length - 1]`, played by `stop()`. A step like any
   other. A layer may have no Out tracks (it just vanishes with the root's hide), its own
   keyframes, or a preset-written exit. The root hide at the end of Out is the
   interpreter's job, not emitted per-preset.
7. **Migrating In/Hold/Out templates?** Three tiers. (a) *Catalog presets* — we own all of
   them; they are rewritten as keyframe generators, category by category, with the
   l3-sweep harness pinning taste parity. (b) *Saved/community/AI templates in the old
   shape* — the current parser (`parseTimeline`) is retained as a one-time **importer**:
   the new timeline renders them read-only via conversion, and the first motion edit
   converts the region (one undoable apply — the same contract as today, where any preset
   swap already re-emits the region wholesale). (c) *Unparsable hand-written regions* —
   exactly today's behavior: honest banner, "start over with a preset", code rules.
   Nothing silently breaks; unconverted templates play and export forever unchanged.
8. **Presets → editable data?** A preset is `(layers, direction, params) → keyframes`
   written into the step's tracks. Direction-aware: In writes enter-from keyframes into
   step 1 (or the layer's step), Out writes exit-to keyframes into the Out step, Both
   writes both — and after application they are ordinary keyframes, independently
   editable. Changing In can never overwrite Out because they are disjoint data.
   "Slide left" resolves per direction (In: from the left; Out: to the left).
9. **Automatic keyframes?** The standard armed-property convention. A property with ≥ 1
   keyframe on the selected layer is *armed*; editing its value in the Inspector writes or
   updates the keyframe at the playhead. An un-armed property edit changes the design/base
   value (a Style-panel-style patch, no keyframe). The diamond toggles arming: first click
   stamps the current value at the playhead; deleting the last keyframe disarms.
   Predictable, no accidental keyframe spam.
10. **Preview/export parity?** Structural: the identical JS runs in the preview iframe and
    in every export (all six targets ship `template.js` verbatim — audited). The simulator
    drives the same builder globals the exports' hosts do. Two known divergences, both
    addressed in Phase 7: (a) the editor's "play full animation" needs a stand-in duration
    for a manual hold (real N ms when auto-out; a labeled preview default otherwise —
    on air the operator owns it, documented); (b) **the OBS/vMix overlay export ignores
    auto-out today** (the editor now honors it after T6.1) — the overlay's autoplay block
    gains the same scheduled stop, closing an existing parity gap.
11. **Backward compatible?** The SPX globals, the builder globals, the field→DOM contract,
    `settings.steps`/`settings.out` semantics, the validation gate, all export targets,
    the registry/selection model, the Style panel contracts, offline-first (no new deps).
12. **Removed, not preserved?** The entire literal-patch layer: `patchTweenTiming`,
    `patchTweenEase`, `patchStepTiming/Ease/Regroup`, `splitTween`, `patchTweenVars`,
    `patchTweenToVars`, `insertPartTween`, `insertPartOutTween`, `setObjProp`, `setObjBlur`,
    `patchOutsideExit`, the phase splicing (`splitRegion`/`tagInPhase`/`tagOutPhase` and
    the `// In preset:`/`// Out preset:` tag comments), `currentStepChain` round-tripping,
    `stepAssign.changePartPress`'s three-path re-emit logic (becomes a data move), the
    per-row enters-from/leaves-to drawer (superseded by the Inspector), and most of
    `TimelineView`'s drag-state machinery. Much of this shipped THIS WEEK — sunk cost is
    not a reason to keep an architecture that fights the product.

## 4. Keep / Refactor / Replace / Remove

**Keep (unchanged or near-unchanged):**
- `model/structure.ts` — the TemplatePart registry IS the layer model.
- Store `selectedPart` + `CanvasInteraction`/`CanvasSelection` — selection sync exists and
  works in both directions; the Inspector becomes its third consumer.
- `PlayoutSimulator` ownership model — `__activeTl`, settle-on-rebuild, the T6.1 reset and
  auto-out, the replay-on-nonce; scrub generalizes to `(stepIndex, localT)`.
- `composeDocument`, all `src/export/targets/*`, `src/control/*`, `spxDefinition`,
  validation gate structure, `model/easings.ts` vocabulary, brand/style contracts, prefs,
  the undo-history mechanism (gains redo).
- The preset library's *taste* — every preset's designed motion is re-expressed as
  keyframe data; DESIGN_LANGUAGE doctrine, autoEase pairs, and category sweeps all apply.

**Refactor:**
- `templates/*/animPresets.ts` + category preset modules — emitters become keyframe
  generators; `shared/base.ts runtimeJs()` unchanged (it calls the builders).
- `validateTemplate.ts` — replace the `stepGroups` regex warning with data-block checks
  (valid JSON, known version, selectors exist, durations positive, Out present).
- `ai/claudeProvider.ts` — prompt prose (markers, knobs, builder rules) rewritten for the
  data block; the live lt01 example re-teaches automatically once lt01's emitter flips.
- `scripts/l3-sweep.mjs` — marker/`var easeIn` assertions updated to the data shape.
- Steps-on detection (`js.includes('function revealNextStep')` in `CanvasInteraction` and
  the timeline) — becomes model-driven (`steps.length > 1`).
- The store — add a redo stack (`future[]`, cleared on new apply) + Ctrl/Cmd+Shift+Z.
  **Today there is no redo at all**; the spec requires it.
- `wizard/draft.ts` `buildDraftTemplate` — the out-preset mix stops splicing JS and writes
  Out keyframes via the preset generator.
- `stepAssign.changePartPress` — same public shape (canvas chip keeps working), internals
  become "move this layer's tracks to another step" data edits.

**Replace:**
- `TimelineView.tsx` → the new `Timeline` component: time ruler, draggable playhead,
  contiguous step segments (clips), layer rows, keyframe diamonds, zoom
  (buttons + Ctrl/wheel), gentle snapping (0.05 s grid + step boundaries + playhead;
  Alt bypasses), horizontal/vertical scroll, context menus (step: Duplicate/Rename/Delete;
  keyframe: Delete/Duplicate), Space play/pause, Delete on selected keyframe.
- `blocks/timelineModel.ts` → `blocks/animData.ts` (extract/parse/serialize/mutate the
  data literal; pure functions: `resizeStep`, `duplicateStep`, `setKeyframe`,
  `moveKeyframe`, `deleteKeyframe`, `moveLayerToStep`, `applyPreset`) + `blocks/animEval.ts`
  (a TS evaluator mirroring the runtime interpreter for editor-side value resolution —
  same semantics, unit-tested against the interpreter via the parity harness).
- The per-row drawer + the In/Out card inspector row → the **Inspector** panel (right of
  the preview): Properties tab (X/Y/scale/opacity/rotation/blur + width/height where
  relevant, number fields + diamonds, readable labels, no low-contrast dropdowns) and
  Animations tab (preset, apply-to In/Out/Both, duration, easing, direction). The speed
  knob and per-step ease move here too. AI Help tab explicitly deferred.
- Layout: on wide screens `code | preview | Inspector` (a third column in the existing
  splitter system — `AppShell` already has persisted layout prefs and drag dividers; the
  Inspector becomes a fourth region with its own ratio, collapsible). The preview stays a
  true 16:9 stage, never covered, never distorted. `SidePanel` (Data/Control/Style/AI/
  Export) stays under the preview for now — Style's per-element pieces may migrate into
  the Inspector later, not in this refactor. Mobile: Inspector collapses to a sheet;
  desktop-first explicitly.

**Remove** (Phase 8, after the last category flips): everything in question 12's list,
plus the old strip's CSS and its e2e specs (rewritten, not deleted — same behavioral
coverage on the new surface, per house rule).

## 5. Risks

**Existing templates.** Catalog templates: regenerated (we own them); risk is taste
regressions — mitigated by the per-category l3-sweep + sibling judging + a golden parity
harness in Phase 1 (old emit vs converted data must produce identical settled states and
phase durations before any UI flips). Saved/community/AI templates: zero silent change —
they run in legacy mode (read-only timeline via the importer, or the honest banner) until
the user's first motion edit converts them, undoably. Building-block tweens injected into
`play()` by `blocks/registry.ts` live OUTSIDE the region; they keep working (they are
invisible to the timeline, same as today's unregistered rows).

**Preview.** The simulator is the deepest non-UI consumer of the builder globals (audited:
play/settle/scrub/auto-out and MiniPreview all call them directly) — preserved contract,
so the risk concentrates in the new scrub math `(stepIndex, localT)` and the full-play
chaining. Both get dedicated specs. The settle/reset semantics from T6.1 carry over
unchanged.

**SPX + exports.** Lowest risk of the three: all six targets ship `template.js` verbatim
(audited file-by-file); OGraf's `stepCount` derives from `settings.steps`, which the data
model keeps in sync via the same derivation as today. Two real items: the overlay auto-out
parity fix (a gap that exists TODAY, fixed in Phase 7), and validation's step-selector
warning (updated in Phase 7). The community publish gate is static analysis only and the
interpreter uses no `eval`, so nothing new trips it.

## 6. Phases

Each phase lands green (build + full e2e), committed, editor fully usable. The new stack
grows alongside the old one; categories flip only when the new surface can edit them; the
old surface is deleted only at the end.

- **Phase 0 — ratify this plan.** Especially: data-in-code decision, step-relative
  keyframes, hold-is-not-a-step, deferred reorder.
- **Phase 1 — the engine, no UI.** `NOACG_ANIM` schema + the runtime interpreter + the TS
  evaluator + the old-region importer (`parseTimeline`-based converter) + the golden
  parity harness (every catalog variant × preset: converted data vs old emit → identical
  durations/settled states). Nothing user-visible changes.
- **Phase 2 — Inspector shell + layout + redo.** Third column, selection-driven, showing
  the selected layer's resolved values (read-only until Phase 4 arms editing); store gains
  redo; keyboard undo/redo wired. The current strip still runs everything.
- **Phase 3 — the new timeline, read-first.** Ruler, playhead, scrubbing (via the
  generalized simulator scrub), step segments, layer rows, zoom, scroll — rendering BOTH
  new-format templates and legacy ones (through the importer, read-only). Ships alongside
  the old strip behind a toggle for one phase; playhead/scrub/selection create no history.
- **Phase 4 — keyframes + the flip (lower thirds).** Diamonds in the Inspector, keyframe
  rendering/drag/delete on the timeline, armed-property auto-key, interpolation live in
  the preview. Lower-thirds presets emit the new format; the new timeline becomes the
  default surface; the old strip is retired (legacy templates: read-only + convert-on-edit).
- **Phase 5 — presets, In/Out/Both.** Animations tab; presets as keyframe generators with
  direction; wizard draft path rewired; remaining categories flip (credits/tickers/
  infographics/clock templates keep their design-owned runtimes — only their region
  contents change shape).
- **Phase 6 — steps as clips, fully.** Boundary drag (adjacent-step trade, no gaps/
  overlaps), resize from both edges, Duplicate/Rename/Delete via context menu, »+ step,
  snapping, `settings.steps` sync, Space/Delete/arrow-nudge shortcuts.
- **Phase 7 — parity + migration polish.** Overlay auto-out fix; validation data checks;
  AI prompt update; l3-sweep update; convert-on-edit UX for saved templates; full-play
  hold semantics documented in-product.
- **Phase 8 — deletion + tests.** Remove the patcher layer, old strip, old specs; rewrite
  e2e coverage (the 20-point checklist below); update CLAUDE.md/GOALS/DESIGN_LANGUAGE.

## 7. Test plan (mapping the required 20)

Unit (Phase 1, runs in the browser harness like today's logic checks): interpreter ↔
evaluator parity, value resolution across steps, resize scaling, duplication, importer
round-trips for every catalog variant × preset.

E2E (rewritten per phase, final sweep in Phase 8): canvas↔timeline↔Inspector selection
sync (both directions); add/move/delete keyframe (timing changes, diamonds sync);
playhead/scrub updates preview and creates no history; armed-property auto-key at the
playhead; step resize changes duration + scales keyframes; duplicate preserves state;
In preset does not touch Out and vice versa; Both writes both, independently editable
after; undo/redo across keyframe + step-duration edits; preview playback matches timeline
timing; legacy template loads read-only and converts on first edit, undoably; every export
target still validates and ships; dropdown/control readability (the explicit-option-colors
pin stays).

## 8. What we are explicitly NOT building

Graph editor, expressions, motion paths, bezier handles, nested comps, parenting, masking,
frame-based display (seconds/ms only — nobody should need the show's frame rate to animate
a lower third; frames can become a display mode later), multi-selection, step reordering
(v1), gaps between steps, an AI tab in the Inspector. Steps + layers + playhead + selection
+ Inspector + keyframes + presets + In/Out/Both + easing + preview parity is the whole v1.
