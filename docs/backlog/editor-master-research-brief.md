# The NoaCG editor - master research and direction brief (owner, 2026-08-28, verbatim)

The owner answered the editor-research walk item with this brief. It supersedes
docs/EDITOR_RESEARCH.md's framing where they conflict and is the binding assignment for the
editor master-research round. Dictation intact; headings lightly normalized.

---

**Goal.** Define the long-term direction for the NoaCG graphics authoring system before we
commit to its architecture or implementation. NoaCG must eventually let people: design and edit
professional graphics; animate them; expose properties to operators; bind them to data; give
them broadcast behaviour and logic; generate useful control panels automatically; create
specialized control applications when the automatic panel is not enough; build and maintain
complete graphics packages for serious live productions. The target is not merely a nicer
version of the editor we have today. The long-term bar: someone producing graphics for an
NFL-level sports production, major esports event, election show, automated newsroom or
Eurovision-scale production could reasonably build and operate that package with NoaCG. At the
same time, a student or first-time user should be able to create a normal graphic without
learning the machinery underneath. Those two goals must coexist.

**Why.** This is difficult software. Do not treat this as another feature round solved by adding
controls to the existing editor. Ross, Vizrt, Chyron, Singular.live, MXMZ, Rive and other mature
systems have spent years or decades solving parts of this problem. Our first responsibility is
to understand the problem properly and learn from systems that already work in real productions.
We should not invent different abstractions simply to be different. First understand why mature
products work the way they do. Borrow proven ideas where appropriate. Remove unnecessary
complexity where NoaCG can genuinely improve the experience. Innovation comes after
understanding. Approach this with humility: nothing in the current architecture, research
document or the owner's suggestions is automatically correct.

**Critical current-state warning.** Do not infer editor capability from the NoaCG schemas,
runtime, tests or internal architecture. The current editor is not yet a usable professional
graphic-animation/logic authoring environment. The runtime may support state machines, animation
tracks, keyframes, transitions, groups, guards, timers, repeat/yoyo, generated controls - that
does not mean the editor successfully supports them. For every relevant capability distinguish:
(1) model/runtime capability - technically representable/executable; (2) AUTHORABLE capability -
a normal user can create and modify it through the editor; (3) PROVEN workflow - someone
successfully built a real graphic with it and operated the result. Only the latter two may be
described as editor capabilities. The existing research overstates NoaCG in places for exactly
this reason - correct that.

**Do not rush into an architecture.** Likely authoring concerns: graphic/design editing;
animation; property/control exposure; data binding; behaviour; logic/state machines; generated
operator controls; custom control applications; production-level automation; package-level
reuse. Do not assume these require one editor, two editors, tabs, modes, nodes, timelines or any
particular UI. Investigate first. A promising working hypothesis is ONE GRAPHIC MODEL WITH
SEVERAL AUTHORING SURFACES rather than separate incompatible editors - not yet a decision.
Distinguish three previously-mixed concepts: CONTROL EXPOSURE (what may an operator change -
e.g. expose a text property as "Guest name"; Singular.live's Control Node model is an important
reference); GRAPHIC BEHAVIOUR (what happens when an event occurs - Take plays entrance, Goal
Home increases score and animates, timer at zero holds); OPERATOR/CONTROL APPLICATION (how those
capabilities are presented to the person running a particular production - a football operator
thinks football, not internal properties). These may belong to different authoring surfaces even
though they share the same underlying contracts.

**Competitive research.** Expand and correct docs/EDITOR_RESEARCH.md. Do not rely on marketing
or feature matrices - research actual workflows and interfaces. At minimum: Ross XPression
(animation, Scene Directors, Visual Logic, Transition Logic, DataLinq, published controls,
DashBoard/custom panels); Viz Artist (Stage animation, Transition Logic, Logicmaker,
Master/Object scenes, shared package architecture, data and operator workflow); Chyron PRIME
(timeline animation, Actions, events/triggers, conditions, Conditional Manager, data and
template authoring); Singular.live (Composer, Control Nodes, Data Interface, generated control
applications, App SDK); MXMZ (SVG/import workflow, timeline, controls, packages, data,
versioning, sport-specific operator interfaces); Flowics (editor, data providers,
transitions/update animations, packages, rundown); Loopic (canvas, keyframes, actions, loop
workflow, template definitions); Rive (design/animate modes, state-machine authoring, listeners,
components, responsive layout, data binding); Unreal Motion Design (real-time design, animation,
logic/template/page/rundown architecture). Add other relevant professional systems if they carry
lessons we are missing.

**Use screenshots and actual interface evidence** where publicly available - do not conclude two
systems are equivalent because both claim "logic", "timeline", "controls" or "data binding". We
need what the user actually has to do. Document visually where possible: creating/editing an
element; layer/hierarchy workflow; adding/editing keyframes; editing easing; In/Update/Hold/Out
concepts; exposing a property to the operator; binding data; creating behaviour or logic;
creating/customizing an operator panel; previewing/testing; package/component reuse. The UX is
part of the architecture evidence.

**Questions the research must answer.**

- *Basic graphic editing*: the minimum professional baseline for canvas interaction, hierarchy,
  selection/transforms, typography, shape/image editing, grouping, alignment, snapping,
  guides/safe areas, undo/redo, keyboard operation, responsive/content-aware layout - and a
  HANDS-ON audit of NoaCG against that baseline.
- *Animation*: the professional authoring model we actually need - property keyframes, timeline
  editing, frame/time precision, easing, scrubbing, looping, In, Hold, Update, Out, custom
  action animations, interruption, transition timing. Do not design advanced behaviour on top of
  an animation workflow that is still unpleasant to use.
- *Controls*: the shortest workflow for select a property, expose it to the operator,
  immediately see/test the generated control. Singular's Control Nodes are a key reference, but
  reuse NoaCG's existing generated-control architecture rather than copying Singular's model
  blindly.
- *Behaviour and logic*: not WHETHER NoaCG supports logic - professional systems prove designers
  need it - but how NoaCG makes common broadcast behaviour dramatically easier to author than
  Ross/Viz/Chyron/Rive while retaining power. Investigate progressive levels: known/named
  broadcast behaviours; understandable event-to-action rules; advanced state-machine/graph
  editing. Do not assume the graph is the normal user's primary surface.
- *Content-aware layout*: a MAJOR authoring axis - real graphics must survive real content.
  Fixed, hug, grow, wrap, shrink, min/max, follow, pin, stretch, reflow. Rive is the UX
  reference; the solution must serve broadcast/SVG/HTML graphics.
- *Package-level authoring*: not hundreds of isolated templates. How professional systems build
  and maintain packages sharing typography, colors/tokens, components, team/sponsor/logo
  structures, data, animation language, transitions, behaviour, variants. A large
  sports/news/election package must be maintainable without fixing every graphic independently.
- *Custom control applications*: whether NoaCG should eventually support three levels -
  (1) generated controller, always automatic; (2) visual Control App Builder for task-specific
  operator surfaces; (3) Control App SDK/API for completely custom applications. Ross DashBoard
  and Singular's App SDK are the references. Protect one invariant: A CUSTOM CONTROLLER MUST NOT
  BECOME THE ONLY PLACE THAT KNOWS HOW A GRAPHIC BEHAVES - behaviour stays in the graphic's
  published contract so generated controls, custom apps, APIs and newsroom systems trigger the
  same capability. Production-level automation may orchestrate several graphics/devices;
  investigate where that boundary belongs.

**Likely sequencing - investigate, do not blindly adopt.** (1) Make basic graphic editing
genuinely reliable. (2) Build the smallest excellent property-to-operator-control workflow.
(3) Make professional animation authoring genuinely usable. (4) Prove the complete loop:
design, animate, expose, generated controller, real playout. (5) Finish content-aware layout
and data binding. (6) Add simple broadcast behaviours. (7) Add understandable event/action
authoring. (8) Expose deeper state-machine editing only when simpler surfaces cannot express
the requirement. (9) Package-level authoring. (10) Custom Control Apps/SDK and larger
production automation. A hypothesis to validate, not an approved order.

**Product principles.** The software is for a person, not for the schema. The operator/designer
thinks about the production, not NoaCG (goals, teams, clock - not state IDs). Complexity may
exist internally without becoming user-facing. Don't remove power merely to make the UI simple -
simple common workflows and deep professional capability must coexist. The real renderer is the
truth - editor preview, controls and exported/hosted playout must not develop separate
interpretations. Do not optimize for today's small examples at the expense of tomorrow's major
productions - and do not build NFL-scale complexity before users need it. Preserve the path
without prematurely constructing the destination.

**Agent responsibility.** Inspect the actual repository, current editor, runtime contracts,
tests and previous research before recommending changes. Use the existing architecture where
genuinely sound. Do not build parallel systems merely because a competitor has one. Challenge
both the existing NoaCG assumptions and the suggestions in this brief - if a proposed idea
conflicts with the underlying goal, identify the conflict and recommend the stronger solution.
Do not start implementing editor architecture from this brief. This round is research,
correction, product model and sequencing.

**Deliverable.** A revised master editor research/direction document that: honestly assesses
NoaCG's current editor BY ACTUALLY USING IT; separates runtime capability from usable authoring
capability; corrects inaccurate competitive assumptions; includes visual/interface evidence
where useful; explains what professional systems have already learned; identifies what NoaCG
should borrow and why; identifies complexity to deliberately avoid; defines the major authoring
problems and their boundaries; compares credible architecture/product directions rather than
prematurely choosing one; proposes a staged path toward a professional editor; names decisions
safe to make now versus decisions needing more evidence; explicitly identifies assumptions that
should not become permanent architectural invariants. End with a short set of recommended next
decisions for the owner. No large implementation plan yet - the purpose is that when we finally
commit to building the NoaCG editor, we are solving the right problem.
