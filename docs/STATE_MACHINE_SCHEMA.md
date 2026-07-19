# The state-machine model (NOACG_ANIM version 2)

The contract for how a graphic's STATES live in the code. Phase 1 of the template-library /
state-machine / control-layer stage: the model exists in the schema, the runtime, the
serializer and the validator; the node editor (Phase 4) and the generated control pages
(Phase 5) are built on top of it later.

Companion docs: `TIMELINE_V2_PLAN.md` (the step/keyframe model this extends),
`TIMELINE_INTERACTION_MODEL.md` (the timeline's interaction contract),
`DYNAMIC_MOTION_SCOPE.md` (measured motion, which stays outside the machine).

---

## 1. Vocabulary

One word per idea, in code, schema, docs and UI:

| Term | What it is | Where it lives |
|---|---|---|
| **Data** | Values an operator types (names, scores, answers). | The SPX field model (`f0`, `f1`, …) - unchanged. |
| **State** | What the graphic currently looks like. Its content is a timeline. | `AnimState` |
| **Transition** | An animated change from one state to another. | `AnimTransition` |
| **Event** | Something that happened: an operator pressed a button, a timer elapsed. | `noacgDispatch(event)` / the built-ins |
| **Action** | What an operator may do RIGHT NOW - the legal events from the current state. | `animMachine.ts operatorEvents()` |
| **Guard** | Whether a transition is legal. **Structural only**: it fires if the author drew that arrow from the current state. No expression language, ever. | The dispatch loop |
| **Effect** | What entering a state does: play its timeline, arm its timer. | The interpreter |
| **Group** | One small independent graph. Several run in PARALLEL - this is what prevents state explosion. | `AnimGroup` |
| **Default path** | The ordered walk `next` follows. The SPX/CasparCG compatibility contract. | `AnimGroup.defaultPath` |

---

## 2. The shape

`src/blocks/animData.ts` is the contract. Version 2 is version 1 **plus an optional
`machine`**:

```jsonc
{
  "version": 2,
  "root": ".lower-third",
  "speed": 1,
  "steps": [ /* … unchanged: the default path's state timelines, IN WALK ORDER … */ ],
  "machine": {
    "groups": [
      {
        "id": "main",
        "initial": "off",
        "defaultPath": ["on", "out"],
        "states": [
          { "id": "off", "name": "Off" },
          { "id": "on", "name": "On" },
          { "id": "out", "name": "Out" }
        ],
        "transitions": [
          { "from": "on", "to": "out", "trigger": "operator", "event": "next" }
        ]
      }
    ]
  }
}
```

**The positional binding is the load-bearing decision.** `defaultPath[i]`'s timeline IS
`steps[i]`. No stored indices, nothing to go stale - and every existing surface (the step
timeline, `animEdit`, `animEval`, `presetApply`, the interpreter's index walk) keeps working
unchanged, because `steps` still means exactly what it always meant. Invariant, enforced by
the shape gate: `defaultPath.length === steps.length`, waypoints unique, and a path state
never carries an inline `timeline`.

Where a state's timeline lives:

- **default-path state** - positionally, in `steps`.
- **off-path (branch) state, or any state of a non-main group** - inline, as
  `state.timeline` (a full `AnimStep`).
- **neither** - a POSE-ONLY state. Entering it plays nothing: `Off`, `Paused`, a hold.

`reveals` / `hides` are the ordered walk's pre-hide and early-exit mechanics, so they are
confined to `steps`; an inline timeline carrying either is off-shape. A branch state's
visibility is its own keyframes' business.

**Triggers.** `operator` (an `event` name) and `timer` (`after`, speed-relative seconds from
the state's entry timeline settling). `data-condition` is RESERVED: it parses, is round-tripped
canonically, warns in validation, and never fires. At most one timer transition per from-state,
so auto-advance is deterministic; one `(from, event)` pair per group, so dispatch is never
ambiguous.

**`style` / `duration` / `ease` on a transition** are reserved for the node editor's transition
styles (fade, push, wipe). They are type-checked and round-tripped; nothing consumes them yet.

**Reserved events.** `play` and `stop` are built-in and never authorable. `next` is NOT
reserved - it is an ordinary event name, conventionally the default path's arrows, and a branch
state may author its own `next` edge as the rejoin arrow.

---

## 3. Semantics

**Data never transitions.** `update(data)` writes fields and returns. State changes happen only
through events. A payload may RIDE an accepted event (`noacgDispatch('select', { f5: 'B' })` -
applied through the same `setFieldValue` path, and only when the guard accepts), which is what
makes a multi-part change atomic. A bare `update()` still moves nothing.

**Entering a state plays its timeline.** Re-entry replays it - including a SELF-transition,
which is how a ticker's cycle beat works without duplicating a state.

**The built-ins** (what SPX, CasparCG, OGraf, OBS overlays and the editor all call):

| Global | Machine meaning |
|---|---|
| `play()` | Reset every group to its initial state, clear the queue, play the entrance, arm the first waypoint's timer. |
| `next()` | Advance the default path: fire the arrow toward the next waypoint (whatever event name it carries). Off-path, fire an authored `next` rejoin arrow if the author drew one, else a deterministic no-op. Exhausted, or off air: `null`. |
| `stop()` | The reserved out - legal from EVERY state. Cancel timers, flush the queue, play the exit, rest every group at its initial state. |
| `update(data)` | Fields only. Stays outside the queue (it is already synchronous and atomic); Phase 5's event log is the seam where that changes. |

**Guarding is structural.** An event with no arrow from any group's current state is dropped
silently, payload and all. "Reveal cannot fire before Lock" is true because the author never
drew a Reveal arrow from anywhere but Locked - not because an expression said so.

**The serial queue.** One event at a time, FIFO, one queue per graphic. A dispatch that arrives
during a drain (from a `tl.call`, say) queues behind it. Several groups may answer one event -
they fire in declaration order. Pointers move SYNCHRONOUSLY at dispatch; animations play
asynchronously, so an event arriving mid-transition evaluates against the NEW state and
interrupts by finishing the previous group timeline instantly with suppressed callbacks.

**Timers** are `gsap.delayedCall`, armed by a `tl.call` at the end of the entry timeline - never
`setTimeout`. That one choice buys three things at once: the bench's `timeScale` accelerates
timer states for free, the render pipeline's virtual clock drives them deterministically, and
GSAP's own callback suppression means a settled or scrubbed graphic **never arms a timer** and
so can never auto-advance under the user.

**Snap** (`noacgSnap(assignments, opts)`) enters states INSTANTLY: kill timelines/timers/tweens,
flush the queue, `clearProps` the root subtree, re-arm the reveal pre-hides, then replay each
group's canonical path with `progress(1, true)` (suppressed callbacks - clocks and loops stay
silent). `null` assignments means every group to its initial: that is **reset visual state**, the
counterpart of resetting DATA (`resetSampleData` / `update`). The two are never conflated.
Timers arm afterwards by default (recovery semantics: a snapped-into ticker resumes cycling);
the editor's preview passes `{ timers: false }` so a parked design view stays parked.

The **canonical path** to a state: for a main-group waypoint, the default-path prefix; otherwise
BFS shortest path from the group's initial over the walk's own edges plus authored transitions,
ties broken by declaration order. Deterministic by construction. A state whose pose genuinely
depends on the arrival route is a Phase 1 limitation, not a promise - the node editor can
surface it later. `blocks/animMachine.ts canonicalPath` and the interpreter's
`noacgCanonicalPath` implement the same rule and must stay in agreement (the `animEval`
precedent).

**Reset is two operations.** Visual: `noacgSnap(null)`. Data: the field values. Never one call.

**Parameterize with data, not states.** A quiz's "answer B selected" is ONE `Selected` state plus
a `selectedAnswer` field - never four near-identical states. State counts stay small; data
carries the variation. The acceptance suite pins this.

---

## 4. The implicit machine

A template with no `machine` key IS a one-group linear machine, derived on read and **never
persisted**: states named after the steps, a synthesized pose-only `off` as initial, an operator
`next` arrow along the path, and - for exact version-1 parity - NO arrow into the final Out
(`next()` no-ops when only Out remains; `stop()` takes the graphic out). An explicit machine MAY
author that last arrow, which is how a hand-written template opts into "next alone drives it
end to end".

Two implementations, one rule: `blocks/animMachine.ts deriveMachine` (editor side) and the
interpreter's `noacgMachine` IIFE (runtime side). They must name the same states.

The whole existing catalog therefore gained `noacgDispatch` / `noacgSnap` / `noacgMachineState`
without a single template file changing.

---

## 5. Format versioning (the doctrine)

- The `version` field states which schema the block speaks.
- **Additive optional fields never bump it.** A strict validator lists what it checks, not what
  it forbids.
- **A breaking shape change bumps it and ships its migration in `parseAnimData` the same
  commit.** With a large catalog this is non-negotiable.
- **`parseAnimData` is a NORMALIZING parse**: a valid version-1 block migrates on read
  (`migrateAnimData`), so everything downstream sees only the current shape.
- **Serialization always writes the current version.** One canonical shape, one fixed-point
  proof. A saved version-1 document flips on its first edit - a one-line diff, and that IS its
  migration moment.
- **An unknown version degrades to hand-crafted**, read-only, never a crash. An older build
  reading a newer synced document loses no data.

**The frozen-interpreter pairing rule.** `spliceAnimData` replaces only the data literal, so a
saved template keeps whatever interpreter it was emitted with. Machine-bearing data must never
land under an interpreter that predates the machine engine: check
`animRuntime.ts hasMachineRuntime(js)` first and re-emit the whole region
(`replaceRegionWithAnimData`) when it is false. The `hides` early-exit shipped the same way.
`validateTemplate` treats a mismatch as an export-blocking error.

---

## 6. What Phase 1 deliberately does not do

- **No node editor.** The only machine UI is the simulator's event strip (one button per
  authored operator event + a state chip), shown only for explicit machines.
- **No control-layer generation.** All three transports still speak `update|play|stop|next` and
  funnel into the four globals - which is exactly why the queue lives INSIDE the template: the
  serial guarantee holds identically in the editor, in an exported overlay, and under SPX.
- **No machine-aware structural mutators.** Under an explicit machine, the step-adding /
  -deleting / activation edits return `null` (the positional binding would desync) and the
  timeline hides those affordances. Phase 2 ships the machine-aware versions before any wizard
  template carries an explicit machine.
- **Dynamic collections, data-condition triggers, interruption priorities, external feeds,
  operator permissions, nested machines** - all consciously deferred. The schema does not block
  any of them.

---

## 7. Where things live

| File | Role |
|---|---|
| `src/blocks/animData.ts` | The contract: types, normalizing parse + `migrateAnimData`, shape gate, canonical serializer. |
| `src/blocks/animMachine.ts` | The graph seam: `deriveMachine`, `spxSteps`, `canonicalPath`, `operatorEvents`, `validateMachine`. |
| `src/templates/shared/animRuntime.ts` | The emitted ES5 interpreter: the version-1 statements verbatim + the machine engine (queue, dispatch, timers, snap, introspection) + `hasMachineRuntime`. |
| `src/validation/validateTemplate.ts` | Semantic machine errors/warnings + the pairing-rule error. |
| `src/components/PlayoutSimulator.tsx` | `event` / `snap` commands, the event strip. |
| `src/store/templateStore.ts` | `sendEvent` / `sendSnap`. |
| `e2e/_machines.ts` + `e2e/state-machine.spec.ts` | The five acceptance criteria, hand-written. |

`settings.steps` stays DERIVED, through one function: `animMachine.ts spxSteps(data)`.
