# Giving an imported graphic its BEHAVIOUR

**Status: the PLAN (§1-§9) was written 2026-08-22 for review; §10 records what was then BUILT the
same day.** §1-§9 are left as written, deliberately - a plan edited after its own result can no
longer be read back against what it promised. Read §10 for what stands today.

**The goal it serves** (`docs/GOALS.md` NOW): by **2026-09-12**, a student draws their own graphic,
gets the behaviour their show needs onto it, and plays it out - without writing a line of code. The
two graphics that decide it are a **QUIZ** (lock the answer, reveal it) and a **SCOREBOARD**
(score + / -). The autumn's productions are quizzes and keeping score, which is what makes those
two the right pair rather than an arbitrary one.

**The larger question behind it** is the north star's: how does a non-programmer give a graphic
logic, and then CHANGE that logic. This plan is a first probe at it, not an answer to it.

---

## 1. What this is not

- **Not a new editor.** The state engine, the step timeline and the node graph all exist and all
  work on an imported SVG (measured, §2). A fourth authoring surface is not the missing piece.
- **Not a category feature.** Owner, 2026-08-22: every imported graphic must be able to carry
  whatever behaviour it needs. Nothing here may key off a category.
- **Not AI authoring a state machine.** Standing owner rule. AI may PROPOSE a binding a person
  confirms; it never writes the machine.

## 2. What already works, measured 2026-08-22

Walked in the browser on `docs/svg-samples/scorebug.svg` and `outlined-title.svg`.

- **SVG import is real and good.** Drop an SVG and the wizard rewires itself: Prepare/Text become
  one **Fields - map text layers** step. From the scorebug it read `Home team`, `Home score`,
  `Away score`, `Away team`, `Match clock`, `Competition`, `Stage`, `Home crest` - decoding
  Illustrator's `_x20_`, splitting tspans, typing figures as `number`, offering `12:00` as Text or
  Countdown, offering the `<image>` as swappable, resolving all three typefaces to bundled faces.
  The outlined file correctly found no bindable text and offered the glyph group as an outline row.
- **The generated template already carries the whole state engine.** `noacgDispatch`, `noacgSnap`
  and the serial queue are emitted into the imported SVG. `NOACG_ANIM` is version 2 with
  `steps: [Enter, Out]` and **no `machine` key**. The runtime is there; only the data is absent.
- **The editor gives it a per-layer timeline and a state graph.** The timeline dock lists the SVG's
  own groups; the **◇ States** tab shows `○ Off → ▶ Enter → ■ Out` ("derived from the steps") with
  `+ state` and `+ parallel group`, and `+ state` offers a pose state, a step on the path, or a
  timeline seeded from any layer.
- **`attachMachine(type, template)` is already a generic transform.** It compiles a type's
  declaration onto any template's anim data and writes it in; `missingParts(type, template)`
  already checks whether a template carries the selectors a type requires
  (`src/templates/types/graphicType.ts`).

**And the surprise: the SCOREBOARD may need no behaviour work at all.** A `number` field becomes a
**stepper with + / -** in every control surface, with no per-template code
(`src/control/controlModel.ts`, `src/control/controlPanelHtml.ts`). The imported scorebug already
typed both scores as `number`. So "score + / -" is a data field, not a machine.
**This is unverified end to end** - nobody has taken that imported scorebug to a production and
pressed the buttons - but if it holds, half the September goal is a walk, not a build.

## 3. What a "behaviour" actually is, taken apart

From the shipped quiz (`src/templates/types/answerBoard.ts`, `src/templates/quiz/shared.ts`),
lock-and-reveal is four separable things:

| Piece | What it is | Can it move to someone else's artwork? |
|---|---|---|
| **1. The machine** | States `selected` / `locked` / `sealed` / `audience`, operator events `select`, `lock`, `revealChoice`, `judge`, `audience`, structural guards | **Yes, free.** Pure data. `attachMachine` writes it onto any template today. |
| **2. The controls** | `TypeControlEvent[]` - the buttons, labels, sections, payload fields | **Yes, free.** Generated from the machine; travels in the template. |
| **3. The structure** | `.quiz` root, an ordered `.quiz-option` list, three hidden holders (picked letter, correct letter, audience results) | **This is the binding problem.** Someone must say which SVG layers these are. |
| **4. The look of a state** | CSS + a GSAP tween: `.quiz-sel` on the picked row, `.quiz-locked` on the root, right/wrong treatments | **This is the hard problem.** Our CSS assumes our design tokens; the artwork is theirs. |

Pieces 1 and 2 are the parts that sound hard and are not. Pieces 3 and 4 are the work.

## 4. The hard piece, stated plainly

`applySelection()` adds a class to a row. On a catalog quiz that class means something because we
drew the design. On a student's Illustrator artboard, `.quiz-sel` means nothing until somebody
decides what "this answer is selected" LOOKS like on their drawing.

Three ways out, and they are not exclusive:

- **L1 - we supply a generic treatment.** A neutral overlay the platform draws: dim the board, ring
  the picked row, tick and cross on the verdict. Works on any artwork with zero effort; will not
  match the design, and on a busy graphic it will look bolted on.
- **L2 - the designer draws the states.** They draw a "selected" version of the row on its own
  layer in Illustrator; we hide and show. Pixel-exact, no taste risk, and it is how a designer
  already thinks. Costs them drawing work and needs a naming or picking convention.
- **L3 - a few knobs.** Pick the highlight colour and one of three styles. Cheap middle ground,
  and the smallest thing that stops L1 looking foreign.

**L2 is the one that makes "category agnostic" real**, because it puts the look where the artwork
is. It is also the closest thing to how MXMZ works (`docs/COMPETITOR_MXMZ.md`): layers and
timelines, with the designer trained for a day.

## 5. Three shapes for the authoring step - to choose between, later

**A. Pick a behaviour, then point at layers.** After the Fields step: *"What does this graphic do?
[Nothing] [Quiz] [Scoreboard]"*, then *"Which layers are the answer rows?"* with hover highlight,
exactly like the Fields step already does. Closest to what exists; `missingParts` already models
the check.

**B. Name your layers and we recognise it.** `answer1`, `answer2`, `question`. The `f:` prefix sugar
already proves the mechanism works. Zero UI - and it is a **renaming ritual**, the precise thing
the MXMZ lesson says not to require. Good as a power-user escape hatch, bad as the only road.

**C. AI proposes the binding; the person confirms.** One cheap text call over the layer inventory:
*"These four look like answer rows - bind them?"* Lite measures **$0.00032 per generation**, so this
is affordable inside free. Never authoring - a proposal, applied by a human, matching both the
standing rule and the `AnalyzeProposalPanel` pattern the raster import already uses.

They compose: **C proposes, A confirms, B is the escape hatch.** That is probably the answer, but it
should be decided after §6, not before.

## 6. NOW vs LATER - the double-work question

The owner's concern, and it is the right one: only the quiz and the scoreboard are thought through.
If we build a general behaviour system for two known cases, we design the abstraction against a
sample of two and get it wrong.

**The proposal: build ONE instance, not a system. Abstract after the third case, not the second.**

**Do now (serves September, and none of it is throwaway):**

1. **Verify the scoreboard end to end.** Import the scorebug, add it to a production, press + and -
   from the control panel, watch it on air. If it holds, half the goal is done and we know it.
   *Cost: an afternoon. Risk of waste: zero - it is a test, not a build.*
2. **Bind the quiz behaviour to an imported SVG, hard-coded to that one type.** No registry, no
   generic "behaviour" concept, no plugin shape. Just: mark the layers, attach the answer-board
   machine, make the states visible. Ugly in the right way - one concrete case, working.
3. **Answer the LOOK question for that one case** (§4). Whichever of L1/L2/L3 wins here is the
   decision that carries forward, because every future behaviour meets the same wall.

**Defer (and say out loud why):**

- **A behaviour REGISTRY / library UI.** The shape of behaviour number three is what tells us
  whether behaviours are types, presets, or something else. We do not have behaviour number three,
  and inventing one to design against is how you get an abstraction nobody fits.
- **Customizing a behaviour** - reveal with no lock. Explicitly out of the three weeks in GOALS,
  and it is the north-star question, not a September one.
- **AI proposal (§5C).** Cheap and attractive, but it proposes a binding whose shape is not settled.
  Build it once the binding exists and has been used by a person.

**What is durable regardless of which way §5 goes** - so it cannot be double work:

- The **layer-pointing interaction** (hover-highlight, tick a layer, name what it is). Every option
  needs it, and the Fields step already contains most of it.
- The **answer to §4**. Whatever "a state looks like on somebody else's artwork" turns out to be, it
  is the same answer for behaviour two and behaviour twenty.
- The **machine and controls** (§3, pieces 1-2). Already generic, already shipped.

**What would be thrown away if we guess wrong:** the hard-coded quiz binding in step 2. That is
deliberate, it is small, and paying it is cheaper than designing a registry blind.

**The thing that would make this all fine even if the students want something totally different:**
the autumn is quizzes and keeping score. Owner, 2026-08-22 - *"That is already actually good
enough."* A third format arriving in November is not a failure of this plan; it is the input the
deferred registry has been waiting for.

## 7. What locks us in, and what does not

- **Reversible:** the hard-coded quiz binding, the layer-pointing UI, an AI proposal step, the
  wizard copy.
- **Hard to reverse:** the answer to §4 (people will draw artwork against it), and anything
  persisted into `NOACG_ANIM`. A new persisted shape needs a version bump and a migration in the
  same commit - non-negotiable, `docs/STATE_MACHINE_SCHEMA.md` §5.
- **Not affected either way:** exports. An imported SVG with a machine is an ordinary
  `SpxTemplate`, so all six targets and the OGraf gate apply unchanged.

## 8. Open questions for the owner

1. **§4 - the look.** Do we supply a treatment (L1), ask the designer to draw the states (L2), or
   ship knobs (L3)? This is the decision that carries furthest and the one a second opinion should
   be pointed at first.
2. **§5 - the door.** Is "pick a behaviour, then point at layers" the shape, or is there a better
   one? Is the AI proposal wanted at all, given the standing no-AI-machines rule?
3. **Trained designer, or zero training?** MXMZ's whole answer is a one-day course. Is a taught
   path acceptable for the person who AUTHORS behaviour, as long as the OPERATOR needs none?
4. **Is the scoreboard actually done?** §2's finding needs one walk to confirm or kill.

## 9. How we would know it worked

The acceptance walk from `docs/GOALS.md` NOW item 3, unchanged: draw a quiz and a scoreboard in
Illustrator, import both, bind the behaviour, put them in one production, and run them from the
dashboard - lock, reveal, +1, -1 - with the operator never seeing code. Timed, and walked by
somebody who did not build it.

---

## 10. THE PILOT, AS BUILT (2026-08-22)

Both September cases are proven end to end, in a browser, and pinned by
`e2e/import-svg-behaviour.spec.ts`. What follows is the answer to §8's questions as the build
actually settled them, and the honest split the owner asked for.

### The scoreboard needed no code at all

Verified, not implemented. `docs/svg-samples/scorebug.svg` imports, its `2` and `1` become
`ftype: number` fields, the production page renders them as **± steppers** with no per-template
code, and both scores change on air. Three things the walk pinned beyond "the buttons exist":

- **The entrance never replays.** A bump is a partial update carrying ONE field, so the log reads
  one `Played in` for the take and `Updated 1 field` per press.
- **The figures persist** across a reload, once the cue draft's 300 ms idle has flushed.
- **A bump inside that 300 ms window is aired but not yet stored.** Pre-existing behaviour of the
  whole cue editor, not of this work, and narrow enough to leave alone — but now written down.

### The quiz: what was already generic

Everything except the paint, which is more than expected going in:

| Reused unchanged | How |
|---|---|
| The machine | `ANSWER_BOARD_MACHINE`, filtered to drop the audience branch — filtered from the shipped declaration, never copied, so the surviving arcs cannot drift |
| The buttons | `ANSWER_BOARD_CONTROLS` verbatim. `compileControls` drops a control whose event no arrow carries, so removing the branch removed its button with no second list to maintain |
| The attach | `attachMachine(type, template)`, already a `(type, template) => template` transform |
| Legality | The structural guard mirrors as greying on the imported graphic exactly as it does on a catalog board — Reveal is grey until a pick exists |
| The field pipeline | The dropdowns, the hidden holders, the control surfaces: all the ordinary SPX field contract |

### What had to be quiz-specific, and why

- **The paint** (`src/templates/importedDesign/quizBehaviour.ts`). The catalog's `applySelection`
  adds a class to a row it drew; on artwork we did not draw, the answer is the designer's own
  layers shown and hidden. This is the L2 model from §4, and it is the piece that would have to be
  rethought for a behaviour that is not row-shaped.
- **The binding UI** (the Behaviour section of `MapSvgFieldsStep`). Pickers, not naming: which
  layer is the question, which are the answers, which drawings are the picked/right/wrong/locked
  moments. `proposeQuizBinding` fills every one of them from the layer names when a designer used
  the obvious ones, so the accelerator is door B behind door A — never a renaming ritual
  (`docs/COMPETITOR_MXMZ.md` §3).
- **The type shim** `importedQuizType`, whose only real job is mirroring the field ORDER so a
  control's payload resolves to the right `fN`.

### §8's questions, answered by the build

1. **The look: L2, with L1/L3 unused.** The designer draws the states. It is the only answer that
   keeps the artwork theirs, and every drawn layer is optional — a board with none still selects,
   locks and reveals, which is what keeps the beginner path real.
2. **The door: pick-then-point, with naming as the accelerator.** No AI. The deterministic path
   works with zero model calls, which is what the owner asked for.
3. **Trained designer?** Not required. The one thing a designer must LEARN is not a tool, it is a
   drawing habit: hidden layers for states, and the words last in the file, because SVG paints in
   document order (`docs/SVG_AUTHORING.md` §5b). That was found by looking at a frame — the first
   run drew the verdict over the answer it was judging.
4. **Was the scoreboard done?** Yes. Half the September goal cost an afternoon of verification.

### The one road still unwalked

**The hosted one.** Everything above happens either in a document the app built or in an exported
folder opened from disk; the `/output` renderer following the hosted log has not seen this graphic.
Two things only that run can answer: whether the drawn states cross the wire, and whether BOOT
RECOVERY repaints them — a snap replays states with callbacks suppressed, so the layers come back
only because `paintQuizState()` repaints from the machine on the trailing `update()`. It is
prepared and waiting for the owner: `docs/acceptance/IMPORTED_QUIZ_HOSTED_WALK.md`, whose
automated half is `e2e/configured/imported-quiz-output.spec.ts`. It needs the main checkout's
`.env` and writes real rows, which is why it is written down rather than run.

### What stays deferred, unchanged

No behaviour registry, no plugin shape, no customizing the arc, no AI proposal. §6's reasoning
stands and the build did nothing to weaken it: the third behaviour is still what would tell us the
right abstraction, and there is still no third behaviour. The seams that would carry one — the
`DesignSvgBehaviour` union, the `SvgQuizDraft` discriminant, this module's shape — exist and
nothing else pretends to be general.

---

**Related:** `docs/SVG_IMPORT_PLAN.md` (how the artwork gets in), `docs/STATE_MACHINE_SCHEMA.md`
(what a graphic is), `docs/CONTROL_LAYER.md` (where the buttons come from),
`docs/GRAPHIC_TYPES.md` (how a type declares a machine), `docs/COMPETITOR_MXMZ.md` (what the
competitor does instead).
