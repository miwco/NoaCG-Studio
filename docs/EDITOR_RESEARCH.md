# EDITOR_RESEARCH.md - how the others build a graphic, and where we go past them

**What this is.** The competitor-grounded reading the future cloud-editor and custom-logic plans
get written FROM. `docs/COMPETITORS.md` is the capability MATRIX and adds no new research; this
file is the research, on one axis - **authoring**. How does a person draw a graphic, give it
motion, give it behaviour, bind it to data, and hand it to an operator, in each of the products we
are measured against.

**Read 2026-08-28, from public product pages and public documentation only.** No demo account, no
trial, no sales call. Marketing copy is strong evidence about what a company SELLS and weak
evidence about what it ships. A row here that would change an architecture decision gets re-checked
against a live demo before it does. Refresh is TIME-driven: treat anything older than a quarter as
stale rather than wrong.

**Nothing in this document is authorized to be built by it.** `docs/CONTROL_PANEL_ROAD.md` §5 parks
the cloud editor, and `docs/GOALS.md` THEN items 1 and 2 park the WYSIWYG canvas and the node
editor as an authoring surface. This file exists so that when one of those is unparked, it is not
designed in a vacuum.

---

## The one-page summary

Five products, six axes. The short version:

1. **Nobody in broadcast authors LOGIC.** MXMZ, Singular.live, Loopic and Viz Flowics all stop at
   "a timeline with an In and an Out, plus fields an operator types into". Where behaviour is
   needed, every one of them drops to JavaScript: Loopic Actions, Singular composition scripting.
   The one product with real visual logic authoring, **Rive**, is not a broadcast product at all.
2. **So the competitive picture is a fork, not a race.** On the DRAWING axis (canvas, layers,
   inspector, frame-accurate keyframes, easing curves, SVG import) MXMZ and Loopic are ahead of
   what a non-technical NoaCG user meets today, and they are ahead by polish and teaching, not by
   model. On the BEHAVIOUR axis we are alone in the market with a structural state machine, and the
   only product to compare against is Rive.
3. **Rive is the bar, and it is a high one.** Parallel state-machine layers, transitions with
   duration / exit time / interruption, listeners that let a designer author interaction with no
   code, view-model data binding where the data drives the machine's conditions, and one graph
   surface that is genuinely the primary way people work. We match Rive on MODEL in several places.
   We do not match it on the FEEL of authoring.
4. **Looping is the sharpest single win available.** "Animate in, breathe until the operator takes
   me out" is among the most common things a broadcast graphic does, and every competitor makes it
   awkward. Loopic's documented answer is a nested composition with a `detachedPlayhead` checkbox
   and a hand-typed `this.goToAndPlay(0);` frame action. Singular has no loop concept in its
   In/Out timeline model at all. **We already have the better model in the data** - a per-track
   `{ repeat, yoyo, repeatDelay }` primitive, drawn truthfully in the timeline including a finite
   repeat ending where it really ends - **and it is READ-ONLY in the UI.** The whole gap is one
   editing affordance on a model that already shipped.
5. **The honest read on our own editor.** The machine graph (`docs/STATE_MACHINE_SCHEMA.md` §6a) is
   a more capable logic surface than anything in broadcast, and it lives behind a mode the owner
   steers people away from. Most gaps below are gaps of ROUTE and TEACHING, not of capability.

**The three candidates worth taking seriously**, from §5: a **behaviour library** (named behaviours
a person attaches to their own artwork, no graph reading required), **loop authoring in the
timeline** (small, and the market's weakest spot), and **broadcast listeners** (Rive's no-code
interaction door, pointed at operator events and timers instead of a mouse).

---

## 1. The products, one profile each

### Rive - the bar for authoring logic

Read 2026-08-28 from `rive.app/docs`. Not a broadcast product. It appears here because it is the
reference implementation of the idea our state machine is built on, and because "a designer authors
a state machine without a developer" is a solved problem there.

- **Canvas / layers / inspector.** A conventional design tool: hierarchy, artboards, an inspector
  of properties. Layouts are a first-class responsive system (layout parameters, component sizing,
  N-slicing) rather than absolute positioning.
- **Timeline and keyframes.** Animate mode gives per-property keyframes with four interpolation
  types - **hold, linear, cubic, elastic** - an Interpolation panel showing the curve on a
  time-versus-value graph, a full **Graph Editor**, and two distinct cubic modes: *cubic
  interpolation* stays inside the keyed values, *cubic value* lets bezier handles OVERSHOOT for
  bounce and anticipation. Defaults are settable ("Set as default").
- **Looping.** A property of the state, not a construction: a single animation state plays its
  timeline as **one-shot, loop, or ping-pong**, with a playback speed.
- **Logic authoring - the important part.**
  - **Layers.** A state-machine layer plays one state at a time; you add layers to run several at
    once, and lower layers take precedence when two touch the same property. This is exactly our
    parallel **groups**, and they solved the same state-explosion problem the same way.
  - **States.** Entry, Exit and **Any State** are built in. Custom states are single animations,
    **1D blend states** (mix timelines by one number - a loading bar, a health meter) or
    **additive blend states**. States carry Actions on start or end: set a property, report an
    event, align a target.
  - **Transitions.** Four parts: path, conditions, properties, actions. Conditions are
    source-value / operator / comparison-value triples over view-model properties, events or
    built-in artboard measurements, ANDed together. Properties are **Duration**, **Exit Time** (how
    much of the source must play, in time or percent), **Pause Source When Exiting**, **Allow Exit
    During Transition** (interruption), and an interpolation curve on the transition itself. There
    is a **Randomize Exit** with weighted probabilities, and transitions can be disabled without
    being deleted.
  - **Listeners.** Target + "listen to" + action. Pointer enter/exit/move, pointer down/up, click,
    plus **View Model Property Change** and Rive Events. Actions change a view-model property,
    align an object to the pointer, fire an event, or run a script. This is the no-code interaction
    door, and it is why Rive designers ship interactive work without a developer.
- **Data binding.** View Models define the shape, View Model Instances hold values, bindings
  connect a property to any design property. Data updates from the editor, runtime code, the state
  machine or scripts; listeners and scripts react. Their framing of the payoff: "the hierarchy no
  longer matters" - you can move, reorganise or rename without rewriting runtime code.
- **Operator handoff.** None. There is no operator. Inputs are "the contract between designers and
  developers", and the consumer is an application.

**Best:** transitions as a first-class object with real properties; listeners; the graph as the
primary surface. **Weak, for us:** no operator, no playout, no field model, nothing about a person
running a show.

### MXMZ - the one Yle named

Read 2026-08-28 from `mxmz.com`, `/products/cloud-editor` and `/products/operator`. Deeper account:
`docs/COMPETITOR_MXMZ.md` (read 2026-08-22).

- **Authoring is import-first.** "Design in your favorite tools - Illustrator, Figma, or any
  SVG-capable app", imported directly. They do not sell a drawing tool; they sell what happens to
  your SVG after it arrives. Graphics stay "pure SVG and HTML5, scriptable, scalable", and "one
  template, every resolution - SD to 8K".
- **Timeline.** The strongest claim in their material and the one to take seriously: "Timeline,
  keyframes, and full creative control", "frame-accurate timeline", "stack multiple animations, set
  precise in/out points", "fine-tune easing curves, and preview animations in real-time". Their
  pitch is that what you see in the editor is exactly what goes to air - no render queue.
- **Layers.** "Layered Composition" - "independent layers for clock, scores, and data".
- **Logic.** **Nothing public shows them authoring behaviour at all.** No states, no transitions,
  no conditions, no events. The vocabulary does not appear.
- **Data.** "Data-Driven via JSON", live bindings updating in real time, connectors named for Opta,
  Gracenote, Sportradar and custom APIs.
- **Operator handoff.** A separate product, **Operator**: unlimited channels each with its own
  library and playlists, drag-and-drop rundown sequencing, pre-loading, **auto-advance timers**, a
  purpose-built **match control** interface (clock, score, rosters, event logging), touchscreen
  support and "custom control panels". Those panels are hand-built per vertical.
- **Team.** Real-time collaboration with role-based permissions, multi-user editing, and **full
  version history with rollback**, side-by-side version compare.

**Best:** the import story, the frame-accurate timeline, versioning, and an operator surface built
for one sport at a time. **Weak:** no authored behaviour; every panel is bespoke work by them.

### Singular.live - the professional cloud class

Read 2026-08-28 from `developer.singular.live` and the public support portal. Their Composer UI
article returns 403 to an unauthenticated fetch, so the editor-layout detail below is thinner than
the rest and is flagged in the sources.

- **Composition tree.** The structure is a tree of Sub-Compositions, Groups and Widgets, with a
  Property Panel beside it and an output preview window.
- **Animation - and this is the notable finding.** There is no general keyframe timeline in the
  documented model. **Timeline Animations control the In and the Out** of a sub-composition, group
  or widget, and appear as **coloured bars** in the animation tab. You drag a bar horizontally to
  shift when it starts, drag its end to change duration, and open a settings popover for animation
  type, direction, duration and curve. By default one timeline serves both directions; you
  "Activate 2 timelines" to split In from Out. Nested pieces need **Link Timeline** (right-click,
  they turn green) to be driven from the root, and only root-level timelines are reachable from the
  REST API.
- **Looping.** Not present in the documented timeline model.
- **Logic.** Composition scripting, in JavaScript: `comp.find()`, `comp.getPayload()`,
  `comp.getPayload2()`, `comp.setPayload()`, running on an `init` lifecycle phase. That is the
  logic authoring surface. There is no visual one.
- **Data and operator handoff - their strongest idea.** **Control nodes.** You click an underlined
  property in the Property Panel, name it, and it becomes a control field. The **control app UI is
  generated from the control nodes** - text, textarea, image, table, JSON, and global control nodes
  spanning compositions. Scripts read and write the same payload the operator's form writes.

**Best:** control nodes. A designer promotes a property to an operator field with one click, and the
operator surface builds itself. That is the same instinct as our generated control pages, arrived at
from the property side instead of the machine side. **Weak:** In/Out bars are a poor motion model
next to real keyframes; behaviour is JavaScript; and there is no supported path for importing
third-party HTML - it is a closed cloud composer.

### Loopic - the closest positioning to ours

Read 2026-08-28 from `docs.loopic.io`. HTML5 template creation, integrated with the mediaTool
scheduling and playout system. This is the block `docs/COMPETITORS.md` calls its biggest hole.

- **Editor.** Six panels, and the vocabulary is almost ours: **Menubar**, **Resources**
  (compositions, images, image sequences, fonts), **Canvas** (drawing tools, zoom, rulers, snapping,
  playback controls), **Inspector** (properties of the selected layer - explicitly "a viewing tool
  rather than an animation interface"), **Export**, and **Timeline** (frame counter, an ACTION BAR,
  work area, and a layers section with keyframe controls).
- **Timeline and keyframes.** Park the playhead, click the keyframe symbol next to a property.
  Linear by default; a **Cubic Bezier curve in the Inspector** or presets for easing. Frames, not
  seconds.
- **Looping - read this one closely, it is the market's weak spot.** Loopic's documented method:
  put the loopable content in a **nested composition**; tick **Detach Playhead**
  (`detachedPlayhead: true`) so it no longer follows the main composition; on the nested
  composition's last frame add a **Frame action** containing `this.goToAndPlay(0);`. The main
  composition stays linear and pauses at its stop frame while the nested one runs forever. Their
  own documentation then names the resulting defect: without more work "loopable elements are just
  suddenly disappearing from the screen, without any out animation", and the fix is to keyframe the
  nested composition element itself inside the main composition so it can fade out.
- **Logic.** **Actions** - "pieces of code that are executed either once your template gets loaded
  or at any desired frame". Composition actions and frame actions, written in JavaScript against an
  API "specially designed to reduce the complexity of the code". Documented uses are setting text,
  restyling, repositioning. There is no non-code logic authoring.
- **Operator handoff.** A **Template Definition Builder** (marked experimental in the Export panel):
  a general section for name, description, layers and z-index, and **field definitions** for each
  dynamic element, each field bound to element or style properties by picking the element. It
  targets **CasparCG (GDD)**, **SPX Graphics** and **LiveOS**, and the option set changes to show
  only what the chosen target supports. Their own example is SPX building its operator UI from the
  definition.

**Best:** the panel model and the frame-accurate keyframe workflow are a genuine peer to ours, and
the Template Definition Builder is an honest multi-target field model. **Weak:** looping is a manual
construction with a documented defect; all behaviour is JavaScript; the definition builder is
experimental and per-target.

### Viz Flowics - secondary

Read 2026-08-28 from `support.flowics.com` and `flowics.com`. Cloud HTML5 graphics, Vizrt-owned.

- **Graphics Editor.** An **Elements tree** of four kinds: **Regions**, **Building Blocks** (the
  primitives), **Data Providers**, **Widgets** (predefined, customise the look). Canvas is a live
  preview; the Inspector shows position, size, typography, background and data bindings.
- **Data.** Data Providers are first-class TREE ELEMENTS, not a settings screen: any JSON API,
  Google Sheets, or Flowics' own Mechanics and Collections (their audience-interaction products).
- **Animation and logic.** Not documented in the public editor material. Their published "states"
  are **Unpublished / Published / Published with Changes** - a publishing lifecycle, not behaviour.
- **Operator handoff.** **Rundown Control**: Graphics Package Overlays organised into Playlists
  before the show and triggered one by one during it.

**Best:** data providers as elements in the tree - the data source is a thing you place, which is a
better mental model than a settings panel. **Weak:** no public evidence of authored motion or
behaviour at all.

---

## 2. The comparison, by axis

| Axis | Rive | MXMZ | Singular.live | Loopic | Viz Flowics | Us today |
|---|---|---|---|---|---|---|
| Canvas / layers / inspector | Full design tool + responsive layout system | Import-first; layered composition | Composition tree + property panel | Six-panel editor, close to ours | Elements tree, data providers as elements | Canvas + Inspector + layer tree, in Advanced mode |
| Timeline + keyframes | Per-property keys, graph editor | Frame-accurate, "full creative control" | **In/Out bars only** | Frame-accurate per-property keys | Not documented | Step timeline v2: per-property keys, canvas keying, per-keyframe ease |
| Easing | hold / linear / cubic / elastic, curve editor, overshoot mode | "fine-tune easing curves" | A curve on the In/Out bar | Cubic bezier + presets in the Inspector | Not documented | Per-step and per-keyframe ease menus, phase-correct vocabulary |
| **Looping** | **State loop / ping-pong, first-class** | Not documented | **Absent** | Nested comp + detached playhead + hand-typed `goToAndPlay(0)` | Not documented | **`{repeat, yoyo, repeatDelay}` per track - in the data, READ-ONLY in the UI** |
| Logic authoring | **Graph, layers, transitions, listeners** | **None public** | JavaScript scripting | JavaScript Actions | None public | **Machine graph: groups, structural guards, timers, snap, materialize-on-edit** |
| Data binding | View models; data drives machine conditions | JSON, sports feeds | Control nodes + payload API | Field definitions bound to element properties | Data providers as tree elements | SPX fields `fN` -> `id="fN"`, plus the production Data API |
| Operator handoff | None | Bespoke per-vertical panels, rundown, auto-advance | **Control app generated from control nodes** | Template Definition Builder -> CasparCG / SPX / LiveOS | Rundown Control + playlists | **Control page GENERATED from the machine**, legality mirrored as greying |
| Versioning | Editor history | **Full history, rollback, side-by-side compare** | Not read | Not read | Publish lifecycle | Undo + saved documents |

---

## 3. What "better than they do" means, per axis

Not "has the feature". A specific, checkable bar.

- **Canvas.** Better is: a person who has never opened the app places and restyles their own
  imported artwork without the code view, and the code that results is the code they would have
  written. Everyone has a canvas; nobody else has one whose output is a file you own. The bar is
  not the canvas, it is the canvas plus pillar four.
- **Timeline.** Better is: frame-accurate parity with MXMZ and Loopic, plus the thing neither has -
  the timeline is a view of the same machine the control page is generated from, so a keyframe edit
  and a behaviour edit are one document and cannot drift.
- **Easing.** We are already at the bar. Rive's overshoot-capable graph editor is the only thing
  above us, and it earns its cost only if people hand-tune curves, which `docs/DESIGN_LANGUAGE.md`
  says they should not have to.
- **Looping.** Better is: one control on a track that says "keep doing this until the Out", with a
  truthful drawing of where it ends, no nested construction and no typed code. Loopic's own docs
  describe their method's defect; matching them is not the target, deleting the construction is.
- **Logic authoring.** Better is: **a person who cannot read a graph still gets the behaviour**.
  Rive wins today because its user is a designer who will learn a graph. Ours is a student with a
  show on 2026-09-12. Beating Rive is not a nicer graph; it is not needing to open one.
- **Data binding.** Better is: the field an operator types into and the property it drives are the
  same object, promoted in one gesture. Singular's control node is the move to copy, and we already
  arrive at the same place from the other end because our control page is generated. Their gesture
  is better than ours; our source of truth is better than theirs.
- **Operator handoff.** We are ahead, and it is not close. Generated-from-the-machine with
  structural legality beats hand-built panels (MXMZ), a form built from promoted properties
  (Singular), and a per-target definition file (Loopic). The gap is that nobody outside can tell.

---

## 4. Mapping onto our model - what fits, what fights

**Fits, and could be lifted almost directly:**

- **Transition properties** (Rive). Duration, exit time, pause-source, allow-exit-during. We
  already carry `style` / `duration` / `ease` on a transition (`docs/STATE_MACHINE_SCHEMA.md` §2).
  **Exit time** in particular is a real absence: "do not let the operator's next event cut the
  entrance in half" is a broadcast problem, and today the answer is nothing.
- **Any State** (Rive). Our snap already covers the recovery case structurally, and an Any State
  edge is the authored version of the same idea. Additive, no version bump.
- **Loop as a state property** (Rive) versus loop as a track property (ours). Ours is finer grained
  and correct; theirs is easier to reach. The answer is both: expose the track primitive we have.
- **Control nodes as a gesture** (Singular). Promote a property to an operator field by clicking
  it. Our field model is `fN` -> `id="fN"`, a stricter contract than their payload, so the gesture
  is what we would borrow, not the model.
- **Data providers as tree elements** (Flowics). Our production Data API already delivers external
  data as update rows in the control log (`docs/DATA_API.md`); making the SOURCE a visible object
  the author places is a UI idea that costs no architecture.
- **Version history with compare** (MXMZ). Templates are versioned saved documents already; this is
  product surface over an existing invariant, and it is the one row where a competitor's story is
  plainly better than ours.

**Fights our model, and should be refused:**

- **Rive's condition expressions.** Source value / operator / comparison value is an expression
  language. `docs/STATE_MACHINE_SCHEMA.md` says "no expression language, ever", and the reason
  holds: a structural guard is checkable, explainable to an operator as a greyed button, and cannot
  be wrong in a way nobody can see. Data-driven conditions would also break the rule that **data
  updates never cause transitions**, which is what makes the SPX contract survivable.
- **Blend states** (Rive 1D and additive). They mix timelines by a continuous number. Our motion
  model is keyframes plus named measured `dynamics`; a blend state has no representation and would
  be a second motion model. The broadcast cases people reach for blends for (a bar to a percent, a
  count to a figure) are already covered by `dynamics`.
- **Detached playhead** (Loopic). A second clock inside the graphic. Our determinism argument is one
  serial event queue and one virtual clock; a detached playhead is exactly the thing that makes
  "the editor, an OBS overlay and SPX behave identically" stop being true.
- **JavaScript as the behaviour surface** (Loopic Actions, Singular scripting). We already generate
  real JS, so this is not a capability gap - it is that they have nothing ELSE. Adopting scripting
  as the ANSWER would concede the one axis where we are alone.
- **Import-only authoring** (MXMZ). Their model is that you draw elsewhere. Ours is SVG import AND a
  catalog AND a wizard. Do not let import become the only door.

**The uncomfortable finding.** Our machine graph is more capable than any authoring surface in
broadcast, and the owner steers people away from the mode it lives in. `docs/GOALS.md` THEN item 2
already records that the node editor "did not land as a way to AUTHOR logic". Nothing in this
research contradicts that. What the research adds is WHY: Rive's graph works because its user
accepts being taught a graph, and ours does not. The second attempt should not be a better graph.

---

## 5. Something of our own - candidates

Five, one line each, honest about cost. None is a commitment; each is a thing that exists in no
competitor's product.

1. **A behaviour library.** Named behaviours ("reveal on cue", "count up on goal", "loop until
   out") a person ATTACHES to their own artwork, each one a real machine fragment written into
   `NOACG_ANIM`. *Cost: large - it needs a fragment format, a merge that cannot corrupt an existing
   machine, and a picker; but it is the thing MXMZ's architecture has no place to put, and it is
   the north star's core question restated.*
2. **Loop authoring in the timeline.** A control on the track's loop tail that sets `repeat` /
   `yoyo` / `repeatDelay`, with "until the Out" as the default phrasing. *Cost: small - the data
   model, the serializer, the validator and the truthful drawing all shipped; this is one editing
   affordance and a spec.*
3. **Broadcast listeners.** Rive's listener shape (target, listen-to, action) with the trigger
   vocabulary swapped from pointer events to OPERATOR events, timers and data arrivals - authored
   as a sentence, not a graph. *Cost: medium - the dispatch and the trigger set exist; the surface
   and the sentence grammar do not, and the grammar is where it succeeds or fails.*
4. **The operator preview as the authoring surface.** Author behaviour by DOING it: press the
   generated control page's buttons on a graphic that has no machine yet, and the machine is
   written from what you did. *Cost: medium-large, and it is the genuinely novel one - it inverts
   the direction the control layer already runs in, and it is the only candidate that requires no
   graph literacy at all.*
5. **Exit time, borrowed properly.** A transition that refuses to fire until its source has played
   a stated fraction, so an operator cannot cut their own entrance in half. *Cost: small - one
   additive optional field on `AnimTransition` and one check in the dispatch loop, no version bump.*

Ranked by what the north star asks for: **1, then 2, then 4.** Candidate 2 is the one a single
session could finish, and it is the axis on which every competitor is weakest.

---

## Sources

Public material only, all read 2026-08-28.

- Rive: [state machine](https://rive.app/docs/editor/state-machine/state-machine),
  [states](https://rive.app/docs/editor/state-machine/states.md),
  [layers](https://rive.app/docs/editor/state-machine/layers.md),
  [transitions](https://rive.app/docs/editor/state-machine/transitions.md),
  [listeners](https://rive.app/docs/editor/state-machine/listeners.md),
  [interpolation and easing](https://rive.app/docs/editor/animate-mode/interpolation-easing.md),
  [data binding](https://rive.app/docs/editor/data-binding/overview.md),
  [data binding blog](https://rive.app/blog/data-binding-in-rive-a-shared-language-for-designers-and-developers)
- MXMZ: [home](https://mxmz.com/), [Cloud Editor](https://www.mxmz.com/products/cloud-editor),
  [Operator](https://www.mxmz.com/products/operator)
- Singular.live:
  [timeline animations](https://developer.singular.live/singular-basics/building-overlays-in-composer/animating-overlays/how-to-create-timeline-animations),
  [control nodes and scripting](https://developer.singular.live/composition-scripting/quick-start/read-and-update-control-nodes),
  [support portal](https://support.singular.live/hc/en-us)
- Loopic: [user interface](https://docs.loopic.io/user-guide/fundamentals/user-interface/),
  [animation](https://docs.loopic.io/user-guide/animation/),
  [looping](https://docs.loopic.io/user-guide/examples/looping/),
  [actions](https://docs.loopic.io/user-guide/actions/),
  [template definition builder](https://docs.loopic.io/user-guide/exporting/template-definition-builder/)
- Viz Flowics: [graphics editor](https://support.flowics.com/en/articles/8869060-introducing-the-graphics-editor),
  [rundown control](https://support.flowics.com/en/articles/8870302-rundown-control-for-graphics),
  [platform](https://www.flowics.com/platform-2/)

**Still unresearched, and it should make you uncomfortable:** Singular's Composer UI behind their
403, whether MXMZ's timeline keys per-property or per-layer, and whether Loopic's Actions API has
any declarative surface. Each is a demo account away, and each would change a row above.
