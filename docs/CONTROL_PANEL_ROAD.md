# The control-panel road

**Status: a decision-ready PLAN, written 2026-08-27. It builds nothing.** The owner's brief: we
can make custom control panels for our graphics, and we should not start building before we
understand what we are building and why. A wrong shape here becomes a wizard step and a CLI
contract we live with for years, so each section below makes ONE recommendation and names the
alternatives in a line each. The decisions the owner is asked to make are listed at the end.

What this covers: how a user's OWN graphic - drawn in Illustrator and imported, or authored by
their coding agent through the NoaCG CLI - gets the control panel and playout behaviour its show
needs. Binding background: `docs/CONTROL_LAYER.md` (panels are generated), `docs/GRAPHIC_TYPES.md`
(types declare machines), `docs/GRAPHIC_BEHAVIOUR_PLAN.md` (the import pilot, built and walked),
`docs/backlog/playout-logic-for-all-common-graphics.md` (the coverage goal).

---

## 1. The default follows the graphic

**Recommendation: keep the one invariant, and define "custom panel" against it.** Every control
surface is GENERATED from the graphic's own contract - fields become inputs, the machine's
operator events become buttons, `machine.controls` metadata supplies labels, sections, payloads
and ± adjusts, legality is the structural guard mirrored as greying. So *customizing a control
panel* means **editing the graphic** - its machine and its controls metadata - never authoring
panel markup. A graphic with no machine already gets the derived linear machine's honest panel
(all fields, the lifecycle verbs, no event buttons), which is the correct default for every plain
field-driven graphic. Customizing is optional; nothing ever requires it.

This is not a constraint we pay for - it is the property that makes the rest of this document
possible: five renderers stay in parity because none of them holds per-graphic code, exported and
hosted panels keep working because everything travels inside the template, and a stranger's OGraf
package gets the same treatment as our catalog.

Alternatives, each a line: **per-graphic panel HTML** - forks the five-renderer parity and rots
the moment the graphic changes; rejected. **A panel layout editor** - a second scene model, for
panels; rejected on the same grounds the product refuses hidden scene models. **Category-keyed
panels** - already banned by the client-agnostic rule and the control layer's own contract.

## 2. The NoaCG CLI road - an agent attaches behaviour

The agent door already carries most of this: `noacg types` lists every type's fields, events and
designs; `scaffold --type` emits the machine and controls compiled in; `noacg inspect` prints the
operator surface NoaCG will derive; the bench drives the result. The 2026-08-22 measured round
showed both edges of the road: scaffold arms carried the machine every time, free-authoring arms
shipped state as fields on 4 of 7 typed-action cells - and all five novel-brief cells authored a
WORKING machine from scratch.

**Recommendation: type-first, with authored machines as a blessed, gated fallback.**

- **The default rule the skill states: behaviour comes from a type.** The agent reads the user's
  description, matches it against `noacg types`, and scaffolds or attaches that type's machine.
  When the user states no behaviour at all, the sane default is NO machine - fields plus the
  derived lifecycle machine, which plays honestly on every target and never claims buttons it
  cannot back.
- **When no type fits, the agent may author a machine - as an explicit step, under the full
  gate.** This must be reconciled with the standing rule "AI never authors machines"
  (owner, 2026-08-08), and the reconciliation is about WHICH paths the rule protects: it binds
  NoaCG's own generation paths - Lite and Pro must never silently invent operator behaviour
  behind the one AI door, and that stays absolute. The agent door is different in kind: the
  user's own coding agent writing code the user asked for, standing exactly where a hand-written
  template stands - `validateMachine`, the runtime bench and the export gate in front of it, and
  nothing NoaCG-funded behind it. `docs/GOALS.md` holds this as the armed owner gate; the
  recommendation is to bless it **with conditions**:
  1. `noacg validate` passes, machine checks included, before `save`.
  2. The agent runs `noacg inspect` and shows the user the derived panel - "these are your
     buttons" - so a human confirms the operator surface before it reaches a library. The
     inspect output IS the review surface; no new UI is needed.
  3. The bench walks every operator arrow at least once (a machine whose event was never fired
     is not validated; today the bench proves lifecycle, not events - this is the one real
     validation gap the blessing creates).
- **What the skill must additionally teach** (all exist, none is currently in the contract text
  as a rule): `machine.controls` metadata - label, section, `payload`, `adjust`, `destructive` -
  because a machine without it produces a working but unlabelled panel; *parameterize with data,
  not states* (the quiz rule); and the default-path contract - however rich the machine,
  `update/play/next/stop` alone must still walk the graphic, because that is what a playout
  server has.

Alternatives, each a line: **type-only, authored machines refused** - honest but leaves the five
proven novel-brief cells on the table and pushes users back to fields-as-state, the measured
failure mode. **Agent authors the panel itself** - never; panels are derived (§1). **A dedicated
`noacg behaviour attach` verb** for putting a type's machine onto existing artwork from the
terminal - real, but deferred until a third behaviour exists; `attachMachine` is already generic
and the wizard road covers the current cases.

## 3. The SVG-import wizard's behaviour step

The pilot answered the hard questions (`docs/GRAPHIC_BEHAVIOUR_PLAN.md` §10): pick-then-point,
the designer draws the states (L2), naming as the accelerator, no AI. What is not yet designed is
the step's shape once there are more behaviours than quiz.

**Recommendation: offer only what the artwork can carry, default to nothing, and give "what I
want doesn't exist" an honest exit.**

- **The offer list is computed, not fixed.** Each behaviour declares the artwork shape it needs -
  an ordered row list for quiz boards, a numeric figure for scores, a text layer for a clock, a
  long list for a roll - the `missingParts` pattern the type system already uses. The step shows
  only behaviours whose predicate the imported layers satisfy. No category is consulted, ever.
- **The default is no behaviour, and it is a good default, not a shrug.** Fields plus the derived
  machine is a fully playable graphic. Nothing asks a question when nothing is ambiguous - the
  owner's bar from the import walks ("if I can't automatically understand what it is, it's
  probably not good enough yet") and the one-line-per-thing + ⓘ rule both apply to this step.
- **"Something else" is a real row, not an apology.** It says the truth (the graphic works now,
  with every field operable), points at the two real roads for behaviour we do not have - the
  node editor in Advanced mode, and the agent door - and records the ask through the feedback
  vocabulary (`src/feedback/`), so behaviour coverage grows from demand rather than guesses.
- **Ask vs default:** never interrogate. Behaviours are offered when valid and skippable always;
  the only questions inside a chosen behaviour are its bindings (which layers are the rows),
  pre-filled by the deterministic layer-name proposal wherever the names allow.

Alternatives, each a line: **naming-only** (recognise `answer1..4`) - the renaming ritual the
MXMZ lesson warns against; stays the accelerator, never the door. **AI proposes the binding** -
still deferred (`GRAPHIC_BEHAVIOUR_PLAN` §6): the deterministic proposal covers the obvious case
and the binding shape should not be frozen by a model's habits. **A flat list of all behaviours
with most greyed out** - honest but noisy; showing thirty invalid options to offer two valid
ones is the opposite of the one-line rule.

## 4. Playout intent, per type - and proving against it

"Operable" is a judgement per type, and today it lives in heads. The exemplar the owner named:
**end credits = paste a list.** The whole operator story is: paste the names, take it, it rolls
at a readable speed, pause and resume, out. Note where everything comes from - the "backend" is
one `textarea` field (the rows editor already renders it), the roll and its pause are the
machine, the speed nudge is a control. **The panel and the data entry come FROM the graphic; the
owner rules out one backend for all.** There is no universal list-manager service to build - a
credits roll, a ticker and a standings table each carry their own fields and machine, and later
feeds arrive as ordinary `update` rows through the data API, changing nothing about the panel.

**Recommendation: intent is a declared OPERATOR STORY per type, and proving is driving the
generated panel through that story.**

- Each type with real playout behaviour gets a short operator story - one paragraph, in verbs,
  start to finish, written where the type lives. It is owner-confirmable prose, not a DSL: the
  sample size (quiz, scoreboard) is far too small to freeze a schema, the same reasoning that
  deferred the behaviour registry.
- **The proving round a session runs, one type at a time** (the shape, per the standing rule that
  a category is proven in cloud, dashboard AND offline export):
  1. Write the operator story and get it confirmed - this is the design work, and the part that
     must not be guessed.
  2. Author or verify the type's machine and controls against it; persist a machine only where
     the derived one is wrong.
  3. Create the graphic through the wizard AND the import road where the type is import-shaped.
  4. Drive the story on all three planes: the hosted control page, the production dashboard, the
     offline exported panel.
  5. Pin the walk as a spec, and file the owner-queue item - "operable" is a judgement a person
     makes by operating it.
- Order comes from `docs/backlog/playout-logic-for-all-common-graphics.md`: clock/countdown
  correction mid-run, ticker item management on air, standings pages, poll open/close/reveal,
  the limit timer, credits. Credits first - it is the exemplar, and a credits/roll branch is
  already in flight.

Alternatives, each a line: **one shared data backend** - ruled out by the owner; each graphic
carries its own. **A machine-checkable intent format** - deferred until the story count shows a
pattern worth encoding; a schema designed against two examples is the registry mistake again.

## 5. Non-goals

**The cloud editor stays parked.** Editing a graphic's design or code on the hosted surfaces -
anything beyond staging values and publishing entries - is deliberately not on this road. Panels
and outputs are published artifacts; editing stays in the app, one re-publish away from air
(`docs/CONTROL_LAYER.md`). This paragraph exists so the idea is tracked, not forgotten; it gets
no more than this until the owner pulls it up.

**Nothing in this document is authorized to be built by it.** The 2026-09-12 production owns the
calendar; every section above is sequenced after it, and each build starts from its own session
with this doc as the brief.

---

## The decisions asked of the owner

1. **§2:** bless agent-authored machines under the three named conditions - or keep the door
   type-only for now? (This is the gate `docs/GOALS.md` calls armed.)
2. **§3:** is offer-by-predicate + default-none + a "Something else" exit the right shape for the
   wizard's behaviour step?
3. **§4:** is intent-as-operator-story with the five-step proving round the right instrument -
   and is credits the right first type?
