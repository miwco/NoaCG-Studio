# Handoff - session C, SVG import clarity (goals 4/5/6)

Branch `claude/svg-import-clarity-554ecb`. Queued for merge at end of session.

## Goal 6 - THE MEASURED VERDICT, stated explicitly

**The Speed knob was never broken, and the owner's hypothesis ("do I need an ease on it?") was
half right.** Measured 2026-08-26 by building templates at each speed and reading the emitted
NOACG_ANIM back:

- Universal-bank motions (what the imported design and every bank-led step play): the data
  carries `speed` and the interpreter divides every duration by it - the 0.8 s entrance
  genuinely ran **1.07 / 0.80 / 0.53 s** across Slower/Normal/Faster. Mechanically working,
  at every ease, everywhere.
- Why he could not see it: two replays of a smooth power-curve entrance are compared from
  MEMORY seconds apart, and a ±33% duration step is below the noticing threshold there. Bounce
  reads because its bounce COUNT changes - a rhythm, not a duration. So "you need an ease" was
  the perception half of the truth; the mechanics half was always fine.
- Fix shipped: the buttons write **0.6 / 1 / 1.8** (≈1.33 / 0.80 / 0.44 s on the same
  entrance) - wizard Animation step, saved graphic's control page, AI More-control panel; the
  timeline's Advanced select offers old + new values. `AnimSpeed` keeps 0.75/1.5 so saved
  specs/projects stay valid. History written into model/wizard.ts and blocks/motionPresets.ts.
- **Found in passing, not fixed** (blast radius = every catalog baseline): catalog presets
  DOUBLE-scale their stagger offsets - the emitter bakes delay/speed into the legacy region and
  the converted data's `speed` divides again, so lt01's entrance spans 2.04 / 1.34 / 0.64 s
  (superlinear). Visually it makes Speed MORE visible on catalog presets, and speed-1 emits
  (all baselines) are untouched. Worth a deliberate fix with a baseline re-record some morning.

## Goal 5 - the ordinary lower third works with nothing chosen

`MapSvgFieldsStep` `proposeBannerGrowth` measures the rendered artwork: a banner-shaped rect
(wider than tall, room before the 4% margin) holding stacked, start-anchored bound text
defaults to **grow-x with nothing chosen**; side-by-side lines on one plate, end/middle
anchors, full-frame backplates and quiz behaviour keep shrink. Never size-against-frame (the
2026-08-23 ruling stands). Unauthored defaults re-derive as rows change; any touched growth
control sets `SvgStretchDraft.authored` and freezes the answer. The "What travels with it"
list renders only where something would actually move; named groups joined the canvas pickable
set ("I can only click the fields" - fixed). Verified live in the Browser pane (ladder-shaped
file -> grow-x + NOACG_LAYOUT emitted with nothing chosen; scorebug -> shrink) and pinned in
e2e/import-svg.spec.ts (new: nothing-chosen growth on air; scorebug + quiz refusals; the
default-vs-authored read-back). The four shrink-ladder tests now select shrink explicitly.

## Goal 4 - one line + ⓘ

`SectionHead.tsx` (title + one muted line + ⓘ carrying what-and-why). Applied to every
mapping-step section, the Animation step (Direction/Style/Speed/Easing) and the Import Design
step; Finish/Entry/Fields/Style already read one-line-per-thing. NOT yet swept: raster
Prepare/PlaceFields and the AI step - noted on the GOALS tick.

## Flawed-human corpus (tail)

Findings in docs/SVG_IMPORT_PLAN.md §6 P2 already covered most modes (outlines, unnamed
layers, Inkscape, flowRoot, symbols, hidden layers, external refs). This session's pass:
no-size files, parse errors and clipPath text refuse with teaching messages (verified in
source + probe); see the plan's detection-hardening list for what each new case landed as.

## Loose ends for the morning

- e2e/motion-presets.spec.ts updated for 1.8 (outside this session's TOUCHES list, required by
  the speed change).
- The wizard AGENTS.md chain sits at 47 bytes under `project_doc_max_bytes` - the next
  addition there must move a section out.
- Owner-queue: `2026-08-26-svg-mapping-grows-by-itself.md` + `2026-08-26-speed-verdict.md`.
