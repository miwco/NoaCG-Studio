# The control-panel road

**Status: a PLAN, written 2026-08-27. It builds nothing. All three decisions at the end were
answered by the owner the same evening, so the rounds it describes are unblocked.** The owner's brief: we
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
  gate.** The 2026-08-08 rule "AI never authors machines" was **superseded by the owner on
  2026-08-27**: custom control panels are open on every path, including Lite and Pro, and the
  safety model is the GATES rather than prohibition. The agent door is the first of those paths
  and the least funded by us - the user's own coding agent writing code the user asked for,
  standing exactly where a hand-written template stands, with `validateMachine`, the runtime
  bench and the export gate in front of it. The blessing carries **conditions**, and they are
  the same three wherever a machine is authored:
  1. `noacg validate` passes, machine checks included, before `save`.
  2. The agent runs `noacg inspect` and shows the user the derived panel - "these are your
     buttons" - so a human confirms the operator surface before it reaches a library. The
     inspect output IS the review surface; no new UI is needed.
  3. The bench walks every operator arrow at least once (a machine whose event was never fired
     is not validated; today the bench proves lifecycle, not events - this is the one real
     validation gap the blessing creates).

  **Lite and Pro inherit the same three conditions when their turn comes** (owner, 2026-08-27:
  *"we need to open custom controls for every model"*), with one difference that matters: on the
  AI door NoaCG runs the gates on the user's behalf, so condition 2 needs a surface inside the
  product where `noacg inspect` only needs a terminal. **That work is DIRECTION, not schedule** -
  the AI tiers are built after the 2026-09-12 student production, and this road advances only in
  spare capacity until then.
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
ones is the opposite of the one-line rule. **Drag a behaviour onto the artwork and configure it
there** (the owner's own sketch, 2026-08-27) - the same destination reached by a gesture instead
of a list; superseded by offer-by-predicate, which needs no pointing at all in the common case
and still leaves the bindings to the canvas picker where a layer genuinely has to be named.

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

### The stories, as the owner told them - owner direction, 2026-08-27

Given on the phone, per type. **Direction, not specification** - the owner's framing was "not too
strict", and *"many of these things already work well"*, so a proving round confirms or corrects
each story rather than building to it blind. The WHY binds; the mechanism is the round's to
design. Anything not listed here has no story yet and needs one before it can be proven.

- **Credits** - the whole list is pasted as ONE text. A separator splits role from name (a colon
  or something like it; the exact character is still open). Short and long credits both. Roles
  are styled differently from names, side by side or stacked. **The system handles the per-name
  structure, not the user.**
- **Ticker / crawl** - one pasted list, one item per line, looping until Out. The list stays
  editable mid-show and new items enter on the next pass.
- **Scoreboard** - the current model is right: Goal A is flag plus score in one press, +/- are
  for corrections, and Full time is independent.
- **Quiz** - lock then reveal stays the taught default path, but revealing directly without
  locking is allowed.
- **Poll / vote** - the audience votes live through `/join`, bars fill from real votes, and the
  operator decides only WHEN the results show. (Manual or offline entry was not ruled on; the
  option the owner took was audience-first.)
- **Timer / countdown** - the duration is set beforehand, it starts on TAKE, and at zero it HOLDS
  at 0:00 until it is taken out.
- **Stat readouts** - play counts from 0 up to the value; an UPDATE while on air animates old to
  new. Never a snap, and never a recount from zero.
- **Lists** (agenda, lineup, standings) - rows pasted as one field, NEXT reveals them row by row.
  A show-all option is acceptable.
- **Alerts / notifications** - two stories, chosen per design: a breaking-news strap stays up
  until Out; a follower or donation pop plays, holds briefly and takes itself out.
- **Results boards** - also two, per design: award-style steps to the winner on Next,
  standings-style enters whole.
- **Reveal cards** - staged. Taken on air hidden or teased, and ONE Reveal press fires the moment.
- **Holding** - an ambient loop until Out. **Transition / stinger** - fires once, completes
  itself, no Out.
- **Simple graphics** (lower third, title, topic, info, question, quote, caption, bug, sponsor,
  CTA, product, map) - type, Take, Update as a clean swap, Out. That is the standard story, and
  the standing instruction is to **stay open**: any of them may grow behaviour later (a bug
  cycling logo, clock and sponsor; a map moving on cue; sponsor rotation; rapid caption or
  question stepping), and shipping a richer one as its own type under its own name is fine. The
  owner's guardrail on all of it: *"let's not make this too difficult for us"* - openness over
  machinery.

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

## The decisions asked of the owner - all three answered 2026-08-27

The owner answered on the phone the evening this plan was written. **The proving rounds are
unblocked**; each one still starts from its own session, and the 2026-09-12 production still owns
the calendar.

1. **§2 - blessed, and wider than asked.** Agent-authored machines are blessed under the three
   conditions, and the owner opened the same door on *every* path: *"We need to open custom
   controls for every model... we need to update it so we can do any graphic, have any control
   panel, and ensure it will always work."* The 2026-08-08 "AI never authors machines" stance is
   retired - in the owner's words, old thinking - and the safety model is the gates. Lite and Pro
   are DIRECTION ONLY: built after the student release, when AI work resumes.
2. **§3 - ratified as planned.** Offer-by-predicate, default to no behaviour, never interrogate,
   and an honest "something else" exit that points at the node editor and the agent door and
   records the ask as feedback.
3. **§4 - ratified, credits first.** Intent is a per-type operator story in prose, proven on all
   three planes, and credits is the first type. The stories themselves are in §4 above; the
   owner will answer further per-category questions in chat as the rounds reach them.
