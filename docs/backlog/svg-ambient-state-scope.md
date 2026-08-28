# Ambient scope: a loop started in a state keeps running after the state is left

**Filed:** 2026-08-28. **Source:** design review, `docs/SVG_ANIMATION_DIRECTION.md` §8.1.

## Why

The runtime never kills a finished step's tweens - it seeks them and moves on - so an endless
`loops` track survives every later transition. For an ENTRANCE loop that is exactly right:
graphic-lifetime ambient falls out of the model for free. For a STATE's loop it is an
accident: a "Locked" state's pulsing highlight keeps pulsing after Reveal, and nothing in the
format can say "stop this when the state is left". Per-state ambient presets cannot ship until
this has a rule, or the first quiz with a pulsing lock ships a defect that looks like a
feature.

## What it would take

A rule, then a small runtime change. Candidate rule (from the direction doc): leaving a state
finishes its endless children at their REST POSE - the rest-pose-first contract makes that a
deterministic, phase-independent place, and snap already composes routes with suppressed
callbacks, so the two mechanisms agree. Needs: the interpreter tracking which sub-timelines a
state's entry started (it builds them, so it can), the finish-at-rest seek on transition,
snap/settle parity, and a spec with a state-scoped loop entered, left, and snapped. Decide the
rule with the owner before building; it changes what an authored loop MEANS.

## Evidence

- `docs/SVG_ANIMATION_DIRECTION.md` §8.1.
- `src/templates/shared/animRuntime.ts` `buildStepTimeline` - loops as sub-timelines the
  parent seeks but never kills; `noacgSnap` kills tweens wholesale, which is why snap and
  transition currently disagree about a departed state's loop.
