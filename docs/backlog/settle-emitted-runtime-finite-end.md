# The emitted runtime settles with `progress(1)`, so one endless child snaps to a place nobody chose

**Filed:** 2026-08-27. **Source:** measurement, from the branch that fixed the counting readouts
(the settle rule in `src/templates/infographics/igMotion.ts`, landed as `4018768a`). Both
handoffs that carried the working notes have since been retired; the history has them.

## Why

`src/templates/shared/animRuntime.ts` seeks with `progress(1, true)` in three places: finishing
one step's timeline before the next begins (`prev.progress(1, true)`), and twice inside
`noacgSnap`, which replays a state's canonical route to enter it instantly.

GSAP reports a `repeat: -1` child's total duration as its "forever" sentinel, ~1e10 s, and a
timeline holding one inherits it. So a state whose entry timeline carries an endless child - a
`loops` track, or a `dynamic` builder returning an endless timeline - does not snap to its end. It
snaps to ten billion seconds in, which is an arbitrary phase of whatever is still looping.

This is the fault `preview/settleGraphic.ts` was fixed for on 2026-08-26, one runtime deeper - and
the preview recipes do not reach here. This one fires in an **export**, under **SPX**, in the
**browser-output renderer** and on a **generated control page**: every surface with no preview in
it.

It was left alone once with the argument that this is a different question - "is this step over"
rather than "where does this graphic rest". That argument does not survive contact with
`noacgSnap`, which is precisely "where does this graphic rest", stated in the state machine's own
vocabulary (`docs/STATE_MACHINE_SCHEMA.md`: every state is enterable by transition or by SNAP).

**Not on fire, and the trigger is a design review rather than a gate.** It is reachable today -
`src/templates/types/ticker.ts` persists a machine and a ticker's marquee is endless - and
currently harmless for the same reason the credits reels were harmless right up until they were
not: a marquee renders its items twice and covers the strip at ANY phase. `docs/DYNAMIC_MOTION_SCOPE.md`
§11 calls that luck about the preview side, in those words. **Do this the moment a machine-bearing
design carries an endless child in a state entrance whose coverage is not phase-independent.** No
gate can ask that question, which is why it is written here instead of left to one.

## What it would take

Give the emitted runtime the same finite-end helper the two preview recipes carry - the last
moment at which anything with an END is still moving:

```js
function noacgFiniteEnd(tl) {
  var end = 0, kids = tl.getChildren ? tl.getChildren(false) : [];
  for (var i = 0; i < kids.length; i++) {
    var total = kids[i].totalDuration();
    if (isFinite(total) && total < 1e9) end = Math.max(end, kids[i].startTime() + total);
  }
  return end;
}
```

…then seek with `tl.time(noacgFiniteEnd(tl), true)` at the three sites, keeping
`progress(1, true)` as the fallback where `getChildren` is absent (a hand-written
`buildInTimeline` from a foreign import may not be a GSAP timeline at all - `settleGraphic.ts`
guards the same way).

The change is small; the blast radius is that **every template in the catalog emits different
JavaScript**, so it needs:

- both catalog baselines re-recorded (`UPDATE_CATALOG_BASELINE=1 UPDATE_RENDER_BASELINE=1
  npx playwright test e2e/catalog-baseline.spec.ts`), with a healthy diff of one hash per variant
  and nothing else;
- the five catalog gates behind it;
- **a new spec, and a fixture to write it against**: a machine-bearing template with an endless
  child in a state entrance, snapped, must land where the finite motion put it. The catalog has no
  such design, and a gate written against the lucky case proves nothing - which is most of the
  work here.

That is its own branch. Riding it on a branch fixing a visible zero would mix a measured bug fix
with a whole-catalog byte churn.

## Evidence

- `docs/DYNAMIC_MOTION_SCOPE.md` §11 and §11b - the preview-side measurement (cr06/cr08 settling
  to 0% coverage) and the corrected reasoning for this side.
- `src/preview/settleGraphic.ts` - the finite-end argument in full, with the coverage table.
- `src/templates/types/ticker.ts` - the machine-bearing type whose motion is endless today.
