# Handoff - the two measured editor defects, the countdown block, and the walk

Session J, branch `claude/j-editor-countdown-fixes`, 2026-08-29. Picks up
`docs/handoffs/2026-08-27-editor-stage-blank.md`, which found two real defects while failing to
reproduce the owner's blank stage and left both unfixed.

Both were **reproduced before being fixed** (the fixes stashed, the new specs run red, then
unstashed and run green), so what follows is measurement rather than reading.

---

## Fixed

### 1. A finished run is now reported as finished

`src/preview/simulatorRuntime.ts`. `window.__activeTl` was released only by `killAllTimelines` -
by the NEXT play or stop, never on completion - so the preview document kept pushing
`active=true` for a run whose motion had ended. Reproduced exactly as the 2026-08-27 session
measured it: `timelineState` still read `fresh` eight seconds after a 1.34 s entrance.

The three places that claim a run (`sim-play`, `sim-next`, `sim-stop`) now call a nested
`releaseWhenDone`, which hangs off the timeline's own completion. Two details worth keeping:

- **GSAP animations are thenable**, and `then()` resolves *beside* `onComplete` rather than
  replacing it (GSAP keeps its own `_prom`), so observing the end takes nothing from the design.
  A hand-written timeline from a foreign import need not be thenable, so there is a duration-based
  fallback behind it.
- The release is guarded by an **object-identity check** against `__activeTl`, so a callback that
  arrives after a newer run has claimed the slot does nothing. That is what makes it safe under
  every ordering, including a killed timeline resolving late.

A timeline that never completes (one `repeat: -1` child) correctly stays active, because it is.

Pinned: `e2e/timeline-v2.spec.ts`, *"a finished run reports itself FINISHED"*. It asserts the
strip returns to idle AND that the graphic keeps the pose the entrance left it in - a release
implemented as a kill-and-reset would pass the first half and blank the canvas, which is the more
expensive bug of the two.

The spec also covers the EXIT, because releasing a run opens a guard that used to be permanently
shut: `sim-settle` is gated on "is anything running", so if anything re-settled after a Stop, a
graphic the operator had taken off air would come back on the canvas. It does not - measured, the
root goes to opacity 0 and stays there - and it structurally cannot, because `__simSettled` is set
by the first settle and never reset within a document. Worth knowing anyway, since it is the one
consequence of this change that is not obvious from the diff.

**A trap for the next person writing an assertion like this**: idle is the state on BOTH sides of
a run, so polling straight for `'none'` after pressing Stop answers instantly from the idle that
preceded the click. The first version of this spec did exactly that and read opacity 1 on a
graphic that was mid-exit and perfectly healthy - a failure that looks like a regression and is
not. Wait for the run to START, then wait for it to end.

### 2. Space over the stage: a tap plays, a hold pans

`src/components/spaceKey.ts` + `src/components/PreviewFrame.tsx`. Reproduced: with the pointer
over the preview, a tap of Space produced **zero** plays. The canvas owns Space whenever the
pointer is over the stage, and a pan needs a drag, so a tap armed the pan and did nothing at all.

A tap and a hold cannot be told apart on the keydown, so the decision is deferred to the keyup and
read off two facts the gesture itself produces: **OS auto-repeat** (a held key repeats, a tap never
does) and **whether a pan drag actually started**. No timers, so nothing depends on machine
configuration beyond the repeat delay that already exists.

The flag lives at module scope in `spaceKey.ts` - the file that already owns "who owns this key" -
because the gesture spans two window listeners whose firing order is only their subscription
order. Only the release reads it, and reading consumes it, so no ordering can lose a tap or spend
one twice. The play is fired from `PreviewFrame`, not `StepTimeline`, because the facts that decide
it are PreviewFrame's and `sendControl` is the store's, which keeps listener ordering out of it
entirely.

Pinned in `e2e/keyboard.spec.ts`, written the hard way round in both directions per that file's
standing rule: the tap test fails if the pan ALSO answers (two plays, not one), and the hold test
uses real CDP auto-repeat and fails if play answers a gesture that belongs to the pan.

**One judgement call the owner may want to overturn**, and it is in the owner-queue item: a tap
over the stage now plays even while a button has focus. Elsewhere a focused button keeps Space (it
is the button key), but over the stage the canvas has always taken Space from focused buttons -
that was already the documented decision for the pan, and the tap follows it rather than inventing
a second rule.

### 3. The countdown block is deleted, not folded

`src/blocks/registry.ts`. The instruction was to fold it onto `templates/shared/clock.ts` **if
anything can reach it**, and delete it if nothing can. Nothing can:

- `BUILDING_BLOCKS` has exactly one importer in `src/`, `ai/stubProvider.ts`, which applies
  `block('fullscreen')` and nothing else.
- `BuildingBlockMenu`, named in the registry's own type comment, does not exist. There has been no
  Blocks tab for some time (`src/blocks/AGENTS.md` already said so).
- The only other reference anywhere is `e2e/canvas-selection.spec.ts` reaching for `block('logo')`
  through a page eval - a test, not a product surface.

So it was unreachable dead code that was also wrong three ways: it decremented per `setInterval`
tick instead of anchoring a deadline (drifts late under load, loses minutes in a background tab),
read its duration field once and ignored every later Update, and hid that field with an inline
`display:none` the editor's entrance reset clears. `templates/shared/clock.ts` is the countdown
that works, and it gained `clockDataUpdated()` on the same day. Folding an unreachable copy onto it
would have produced a second implementation of playout logic with no caller.

The why is recorded in `src/blocks/AGENTS.md` ("a block nothing can reach is deleted, not
repaired"), which is where the next session will be standing. Removing the block left `appendJs`
unused in that file; the import went with it. The stale `BuildingBlockMenu` reference is corrected.

### 4. The output-health ruling is backlogged

`docs/backlog/output-health-indicator.md`, filed and explicitly **not to be built now**. It carries
the ruling's intent: today's hidden-until-opened heartbeat is accepted, and the end state is a
simple always-visible green *healthy* light whenever an output is relevant, plus an expandable
technician view (connection/output state, latency/buffering, memory pressure, dropped
frames/errors) - the light for the operator's anxiety, the detail for the technician.

It records the thing a future session would otherwise re-derive and get wrong: the current
visibility gate exists for a real reason (publishing mints an output slug whether or not anybody
wants an output, which is why the owner read a false fault), so the end state needs a *better*
answer to "is an output relevant here", not a removed gate. It also notes that most of the
technician view is not measured anywhere today - the renderer reports a heartbeat and nothing else,
so this is an addition to `src/output/` reporting, not a UI change.

---

## What the walk found

The 2026-08-27 handoff's route 5 - the route a person actually takes - is now walked, and it is
**green end to end**: Home dashboard shelf -> the graphic's control page -> ✎ Edit graphic -> an
editor stage with the graphic on it, full size, `visibility: visible`, opacity 1. Added as a
permanent spec in `e2e/advanced-mode.spec.ts`.

**The handoff's suspicion about the seed was wrong.** It guessed that Home's shelf missed seeded
records because the seed calls `model/library.ts` directly instead of going through the store. It
does not: Home reads the library when it mounts, and the seed happens before that. The
`shelf-graphic` card is there. No seed fix was needed, and none was made.

So **the blank editor stage still does not reproduce** - not by deep link (2026-08-27), and now not
by the owner's own route either. Everything cheap has been tried. What is left is genuinely
environmental, and the next move is not more probing: it is the three questions in the owner-queue
item - is the stage **white, black, or empty**, does the same graphic also look wrong on its
**control page**, and does it have **uploaded assets** (the one shape neither session has tested,
since every probe used a freshly created catalog template).

---

## Also fixed, found in passing

`scripts/e2e-affected.mjs` had two **dead mapping rules**. The timeline dock's five components
moved into `src/components/timeline/` and both rules kept naming `src/components/<Name>`, so from
that move until now they matched nothing and every timeline change escalated to the full suite as
an unmapped path. Measured before the fix: `StepTimeline.tsx`, `Inspector.tsx` and
`MachineGraph.tsx` each planned `mode: full`, zero named specs. That direction is the safe one - it
ran more, never less - but it ran 100+ specs to verify a comment.

Fixed at the real path, `TimelineDock` (not a file at all) dropped, `keyboard.spec.ts` added
because StepTimeline owns half of a two-surface key contract. Pinned by DIRECTORY in
`scripts/e2e-affected.test.mjs` so the next move fails the test instead of going quiet.
`spaceKey.ts` is deliberately left escalating, and now says so in a comment: the set of specs it
can move is not a list anybody would keep correct.

---

## Verification

- `npm run build` green.
- The three new/changed specs run red before the fixes and green after
  (`keyboard.spec.ts` ×2, `timeline-v2.spec.ts` ×1), plus `advanced-mode.spec.ts` 5/5.
- `npm run test:e2e-affected` 19/19, including the new mapping pin.
- `node scripts/check-catalog-emit.mjs` PASS (504 designs).
- `npm run catalog:affected` returned FULL, which is its conservative fallback for shared
  machinery rather than a finding. `node scripts/catalog-specs.mjs` ran as job **j-0224, exit 0**,
  and its baseline is the direct evidence for the registry deletion: *every catalog variant emits
  byte-identical code* and *every catalog variant renders identically* both pass, so no baseline
  needed re-recording. (It also runs *no catalog variant hides a data holder with an inline
  style* - the very rule the deleted block was breaking.)
- The other four rendered sweeps were **not** run, and the reason is a measurement rather than a
  judgement: `type-floor`, `overflow-sweep`, `field-coverage` and `numerals` all call
  `composeDocument(template)` with **no options**, so `simulate` is falsy and the script this
  branch changed is not even emitted into the documents they measure. The registry deletion cannot
  reach a catalog design either, since no design imports `blocks/registry`.
- The branch's own pre-merge gate is the merge queue's, on the integrated sha.

## Left open

- The blank stage itself (above) - owner input is the cheapest next step, not more probing.
- Nothing else from this session's scope.
