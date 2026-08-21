# src/components - the React app

Loaded alongside the root AGENTS.md when working in this directory (Claude reads it via this directory's CLAUDE.md import; Codex reads it directly). Keep it accurate. The
store-side halves of these contracts are in src/store/AGENTS.md; the code patchers they call are
in src/blocks/AGENTS.md.

**Five subdirectories own their own contract** - `wizard/`, `video/`, `home/`, `fields/` and
`style/`, each an `AGENTS.md` with a thin `CLAUDE.md` importing it, loaded only when you work in
that directory. A section that describes ONE directory belongs there, not here: this file is read
in full by every session touching any component, and the chain through it sits close to
`project_doc_max_bytes` (`npm run check:shared-instructions` prints the remaining headroom).

## Dialog anatomy (EVERY dialog, defined once in styles.css)

re-design/handoff.md §6. Here rather than per sheet: these defects are what happens when six
dialogs each invent a header and a checkbox row.

- **HEADER** - one flex row, ✕ last: a 32px bordered square, hard right (`.gallery-close`).
  The eye finds it by CORNER, so one that follows the title moves whenever the title's length
  does. `.wz-header`/`.gallery-header` push it with `margin-left: auto`, cancelled when a
  cluster before it (the wizard's step counter, a gallery's settings) already took the space -
  two auto margins SPLIT it. The subtitle truncates; the button never shrinks. Never
  absolutely-position it: out of flow it overlaps whatever grows under it.
- **CHECKBOX ROW** (`.dlg-check`) - box first, title over description, whole label clickable,
  cap-aligned to the first line. Checkboxes and radios are sized GLOBALLY: the "inputs are
  100% wide" rule was written for fields you type into and caught them too. Do not re-add a
  per-dialog `style={{ width: 'auto' }}`.
- **FORM ROW** (`.dlg-row`) - `110px label | 1fr control`; an input+button pair nests a
  `.dlg-pair` grid so the button never wraps under the field, and a hint indents to the
  control column because it belongs to the control.
- **FOOTER** (`.dlg-foot`) - one row, secondary left, primary right, never stacked.

**A `.spacer` div is not a push.** There is no global `.spacer { flex: 1 }`, only scoped ones,
so a header pushing its ✕ with a bare `<div className="spacer" />` pushes nothing and the button
sits one gap after the title - the §6 defect exactly.
Use `.gallery-close`; `.wz-header` already parks it.

Settings is the worked example: 820x620, a section nav that JUMPS rather than switches, so
every section stays mounted and no preference is reachable only by clicking the right tab.

## Shell & editor

- **AppShell** - the workspace layout: a flexible DOCKABLE-PANEL model (model/layout.ts). The
  centre is fixed - the canvas (stage + transport) over the timeline, split by a draggable
  divider - and three docks (LEFT, RIGHT, BOTTOM) flank it, each hosting any panels
  (`code`, `inspector`, `data`, `control`, `style`, `ai`, `export`) as tabs. Default: code left,
  Inspector + the tool panels right, timeline roomy in the centre, bottom empty. Each dock renders
  only when it holds panels; the splitters resize the adjacent region. A tab can be MOVED to
  another dock or CLOSED via its ▾ menu; a dock's "+" re-adds any hidden panel (a closed panel
  stays closed across reloads). The DockState (panels/active/size) + timelineSize persist via
  model/layout.ts (loadLayout migrates any non-v2 layout to the default).
  The dock component is **WorkspaceDock**; the panel bodies come from AppShell's `renderPanel`
  (the tool panels wrapped in `.panel-body`); MOBILE keeps the fused preview column + SidePanel.
  A NEW selection (any surface) reveals the Inspector - activates its tab, or re-docks it if it
  was closed - DEFERRED half a second past the double-click window: any new pointer press cancels
  the pending reveal and a live canvas gesture (store canvasGestureActive) skips it at fire time,
  so the workspace never resizes between the two clicks of a text double-click or under a drag
  (e2e/inline-edit.spec.ts pins this). The store's `activePanel` is a "reveal this panel" signal
  (the wizard shows Export after an import, Data after an Import Graphic create) - the docks key
  the reveal on `panelRevealNonce` (bumped by every setActivePanel call), so re-requesting the
  stored default still reveals, and mount never does. The topbar
  ◨/code toggles close-or-reveal those panels. Binds global Ctrl/Cmd+Z to undo() and
  Ctrl/Cmd+Shift+Z (+ Ctrl+Y) to redo() (skipped when focus is in Monaco or a form field).
  useIsMobile/useSplitter support the mobile and resizable layouts.
- **CodeEditor** - Monaco + change-highlight decorations + change dots on inactive tabs the last
  apply touched + hover explanations (the teach/ module registers its tooltips here; there is no
  Learn tab). Its toolbar also carries the **Comments** control (src/editor/, shared with the
  video shell's VideoCodeEditor): Normal / Dimmed / Hidden is a VIEW preference - comment spans
  come from Monaco's own tokenizer and are painted with DECORATIONS, so the code, the undo stack,
  the cursor and every export stay untouched, and hidden comments leave their blank line where it
  was. It reapplies on every model swap (a language's tokenizer loads lazily - hence the bounded
  retry) and, in Hidden, temporarily reveals any comment holding the selection, a diagnostic
  marker, or a find match. Persisted in model/prefs.ts. Pinned by e2e/comments.spec.ts.
- **PreviewFrame** - the stage: the iframe + overlays live in a `.canvas-world` centred in the
  stage and translated by `pan`, scaled by fit × `zoom`. Zoom: the toolbar −/%/+ (the % resets
  to fit), Ctrl/Cmd+wheel (and trackpad pinch) toward the cursor, clamped 0.2–8×. Pan: HOLD
  SPACE and drag, a middle-mouse drag, or a plain wheel when zoomed in - all captured before
  the overlay, so a pan can only ever move the VIEW, never a document element. Space arms only
  while the pointer is over the stage (off it, Space stays the timeline's Play key) and never
  while a text field/Monaco has focus. Releasing Space restores the previous tool at once (as
  does losing window focus mid-drag). **spaceKey.ts owns who gets the key** — see below; the
  pan does not claim it and the timeline does not stand down, they both just ask. Because the overlay
  is sized `stageW × (fit×zoom)` and CanvasInteraction reads its live bounding rect, zoom and pan
  need NO coordinate changes there — the gesture math follows automatically (pinned by the zoom
  case in e2e/multi-select.spec.ts). Off-canvas VISIBILITY (a pasteboard so elements that start
  off-screen render) is a separate step — it needs the iframe to render past the canvas bounds.
  **pasteboard.ts owns HOW MUCH** margin: derived from the graphic's own authored motion (the
  largest px `x`/`y` keyframe), rounded up in steps so authoring doesn't re-fit the stage on
  every commit. Margin is not free (pasteboard.ts says why).
  Where the reach is unknowable the old flat pad stands: a legacy/unparsable region, MEASURED
  motion, or PERCENT travel (the data carries no size to resolve it against). Pinned by
  e2e/pasteboard.spec.ts.
  A template RUNTIME ERROR is worn on the stage itself (`.preview-runtime-error`, from the
  store's previewError - the same fact the Export gate reports): before it, a template whose JS
  threw at load was a silently broken canvas unless the Export panel happened to be open. The
  badge is pointer-events: none (a label, never a control) and clears itself because every
  rebuild starts by resetting previewError. Pinned by e2e/preview-error.spec.ts.
- **CanvasGuides** - the alignment guides drawn over the stage.
- **spaceKey.ts - WHO OWNS A KEY.** Several components listen on `window` for the same keys.
  They are SIBLINGS ON ONE NODE, so `stopPropagation` cannot reach across and the order they
  fire in is only the order they subscribed - which an unrelated `useEffect` dep can change.
  So no surface CLAIMS a contested key; each asks this module and acts only if the answer is
  its own. `spacePansCanvas()` is true when the CANVAS is the active surface, the pointer is
  over the stage, and nothing is being typed into; PreviewFrame arms the pan on it and
  StepTimeline plays when it is false. `activeSurface` (store) flips on a pointerdown on the
  stage or the timeline strip - panels and dialogs leave it alone, so a trip to the Inspector
  keeps whichever of the two you were in; it defaults to 'canvas'.
  `editorShortcutsLive()` gates every document-editing shortcut on "no modal, not typing", and
  `useModalGate(open)` is how a modal declares itself - **pass `open` explicitly for a surface
  that stays mounted and renders null when closed** (the wizard and the sign-in dialog both
  do), or the gate holds down for the whole session and silently kills every shortcut.
  Two rules worth keeping: a guard must answer on EVERY keydown including OS auto-repeat (a
  claim-based design covers only the first one, and a held key is the real gesture); and Space
  belongs to a focused button - the pan takes it anyway on purpose (clicking a stage tool
  leaves that button focused), play never does. Pinned by e2e/keyboard.spec.ts + the Space
  cases in e2e/import-canvas.spec.ts, which assert what did NOT happen.

## Canvas direct manipulation (Era 6)

- **CanvasInteraction** - always-on direct manipulation: drag the root -> nearest
  zone + residual nudge -> the SAME zoneDecls patch the Style panel writes; dblclick a visible
  #fN -> inline edit -> sample value + definition default via blocks/edit.ts setFieldDefault;
  corner handle -> live --scale preview, diagonal-aware, clamped 0.25-4. Every gesture commits as
  ONE undoable applyTemplate and jumps the editor to the changed tab, highlighted; the root is
  detected via model/structure.ts detectPrefix.
  CURSORS name the gesture IN PROGRESS, never one that is merely possible: hover is the plain
  arrow, an active move reads `move`, handles keep their resize arrows, an armed tool its own,
  and the HAND belongs to panning alone (PreviewFrame's `.panning` / `.panning-active` on the
  stage outrank everything while a pan is armed). The rotate handle therefore carries an
  inline-SVG rotate cursor, percent-encoded with `charset=utf-8` and single-quoted attributes;
  the raw `;utf8,<svg …>` form does NOT decode in Chromium, and a bad data URI falls back
  SILENTLY, which is why e2e/import-canvas.spec.ts loads the URI as an image rather than
  trusting the computed value.
  THE DESIGN UNIT (imported designs): `.{prefix}-art` and `.{prefix}-box` swap the keyframe
  scale/rotate handles for the ROOT's --scale handle. The artwork's size IS the composition's
  size - every placed field is `calc(Npx * var(--scale))` against it - so one --scale patch
  moves artwork and fields together, where a scale KEYFRAME on the artwork alone would leave
  every field behind.
  LAYER SCALE/ROTATE HANDLES (data-block, a single selected non-root layer): a corner scale
  handle + a top rotate handle on the selection box; dragging previews live via GSAP and, on
  release, keys `scale` / `rotation` at the playhead (ONE undoable apply, re-parked), pivoting
  around the layer's transform-origin. The root keeps its own --scale corner handle.
  THROUGH THE LENS: this file keyframes at the PLAYHEAD, and the playhead belongs to whichever
  timeline is open - so its `dataModel` is `lensRead(…, timelineTarget)` and every write folds
  back through `projectedJs` (blocks/timelineLens.ts), never raw `parseAnimData`/`writeAnimData`
  (the drift a raw read caused is described at the lens read in CanvasInteraction.tsx).
  CANVAS POSITION KEYFRAMING (docs/TIMELINE_INTERACTION_MODEL.md, amendment 3): on a
  data-block template, dragging any SELECTED non-root layer moves the WHOLE selection (layers
  contained in another dragged layer are excluded - the parent's transform carries them) and,
  on release, ONE undoable apply writes each layer's x/y keyframes at the parked playhead,
  through the same animEdit + spliceAnimData path the Inspector edits through. The root keeps
  the zone drag, unselected layers don't drag on their own, and legacy templates keep the
  classic gestures exactly. Pinned by e2e/canvas-keyframe.spec.ts.
  PLACEMENT DRAG (imported designs): a selected PLACED line - one whose wrapper id has a CSS
  rule with left/top px values (blocks/designLayout.ts placedLines, code-derived, never
  category) - drags as PLACEMENT, not motion: live inline left/top preview in the rule's own
  idiom, ONE undoable placeLine CSS patch on release. Placed lines are excluded from the
  keyframe drag entirely, so a multi-select drag never keys motion for them. A single
  selected placed FIELD swaps the keyframe scale/rotate handles for a SIZE corner handle - a
  text line's font-size, or an image slot's wrapper box (aspect preserved) - one CSS patch on
  release (design, never a scale keyframe). A placed field whose element is HIDDEN (an empty
  image slot - setFieldValue display:none's the img) stays selectable/outlined/draggable: the
  rendered wrapper stands in via partScreenEl. KEYBOARD NUDGE (arrows, 1 px, Shift = 10) moves
  every selected layer: placed fields as placement CSS, other non-root layers on the keyframe
  channel (GSAP preview, x+y keyframes at the playhead); a burst commits as ONE undoable apply
  once the keys go quiet, Esc cancels. The timeline's keyframe-set arrows listen in the
  CAPTURE phase and preventDefault, so a selected keyframe set always beats the layer nudge
  (a diamond click usually leaves its layer selected too — only one may act). Pinned by
  e2e/import-graphic.spec.ts + e2e/canvas-keyframe.spec.ts.
  DIRECT GRAB + LOCKS (imported designs): a press on a PLACED field grabs it - selects it and
  starts its placement drag in ONE gesture, no select-then-drag round trip. Scoped to placed
  fields on purpose: their drag is a design decision costing one undo, while a keyframe layer's
  drag WRITES MOTION, so selection stays the deliberate step there and catalog templates are
  untouched. **partLocks.ts** owns what "locked" MEANS and which parts start that way, so the
  overlay and the Inspector can never disagree: store `partLocks` + `setPartLock` hold only
  EXPLICIT toggles, `partLocked()` falls back to `defaultPartLock()` for everything else. A
  locked part takes no drag, handle, or lasso but stays selectable by click and from the
  timeline - locking is about the POINTER, never editability. Exactly one part has a default:
  an imported design's ARTWORK (a full-bleed image UNDER every field, so unlocked it swallows
  every press meant for the text) - a press on BARE artwork then falls through to the root's
  zone drag. A locked ROOT gives up that zone drag too, so the press marquees instead. Two
  surfaces toggle it: the **Inspector's identity header** (any part) and the **selection chip's
  padlock** (the artwork only, where the default is the surprising one). Locks are UI state,
  cleared on a whole-project swap.
  The SELECTION model is docs/TIMELINE_INTERACTION_MODEL.md's: a click selects the innermost
  TemplatePart under the point (registry-driven closest-ancestor hit test, rect-containment
  fallback), clicking the sole selected part climbs to its container, SHIFT-click toggles, and
  a drag on EMPTY canvas lassos every rendered non-root part it touches. Selection is editor
  UI state ONLY - it lives in store selectedParts (ordered, first = primary in selectedPart) so
  the timeline and the Inspector track the same elements - never written into the template.
  Pinned by e2e/multi-select.spec.ts.
- **CanvasSelection** - the presentational selection/hover overlay: amber outline + a chip
  speaking part.label - the registry's words, same as the timeline strip. Chips hint only
  actions that already exist: dblclick-to-edit on text lines, corner resize on the root. On
  MOBILE (useIsMobile) the chip shows the label ONLY - every hint describes a pointer/keyboard
  gesture a touch screen doesn't have, and less guidance beats a wrong instruction. The chip
  is width-capped to the stage (maxWidth + a left clamp; label/hint ellipsize in CSS), so it
  can never overflow a narrow canvas. An
  eligible selected part's chip carries the "appears" select - offered on ANY editable data
  block, even one with no middle steps yet: existing steps are listed BY NAME and "appears in
  a new step »" creates and names the step itself (blocks/layerTimeline.ts createStepFromLayer,
  the same transform the Inspector and states graph use), which is how a freshly dropped asset
  becomes the graphic's next step in one click; moves between existing steps stay the
  blocks/stepAssign.ts patch. The chip swallows its own pointer events so the gesture layer
  under it never fires. The canvas also owns a CONTEXT MENU (right-click; the right button
  never starts a gesture): one action for now - "Add template graphic…", opening the same
  InsertTemplateDialog the Assets panel's button does (its open flag is the shared
  useInsertTemplateUi store; the dialog itself mounts once in AppShell).
- **TEXT TOOLS** (the stage toolbar's ↖ / T / boxed-T switch, PreviewFrame; placed-design
  templates only - the designBoxInfo gate, code-derived): store `canvasTool` arms them
  ('select' | 'text' | 'area-text'; T is the keyboard shortcut, Escape disarms). The T tool
  clicks POINT TEXT onto the artwork: one addPlacedLine at the click (born empty, shifted a
  line-height up so the click is the insertion point) + the inline editor opened on it
  immediately - committing empty (or Escape untyped) undoes the creation; Escape after typing
  commits (the Illustrator rule). The area tool DRAGS a rectangle that becomes a wrapping
  text box: addPlacedLine at the rect origin + setLineFit 'wrap' with the dragged width; its
  corner handle then resizes the BOX width (kind 'area'), not the font-size. Both create real
  fields through the Data tab's exact transform and disarm back to Select after creating.
  While the inline editor is open, typing MIRRORS live into the preview element; cancel
  restores the template's text. Pinned by e2e/text-tools.spec.ts.

## Playout & timeline

- **PlayoutSimulator** - owns the running preview timeline `__activeTl`; settles the design view
  after every rebuild (progress(1, true) + a second update()); auto-replays on replayNonce;
  resolves the SCRUB phases, including `state:<group>:<state>` for a BRANCH timeline
  (blocks/timelineLens.ts `scrubPhase`): snap the group to the state's canonical predecessor
  (`branchRoute`, off animMachine's `canonicalPath`, which the interpreter's own
  `noacgCanonicalPath` mirrors) so the segment animates FROM the right look, then hold the
  runtime's `noacgEnterTimeline` paused. A branch used to send no scrub at all, so its timeline
  was authored blind - the playhead moved and the picture did not;
  handles the store's `event`/`snap` commands against the template's STATE MACHINE
  (docs/STATE_MACHINE_SCHEMA.md) - snapping with `{ timers: false }`, because a parked design
  view must never auto-advance - and, ONLY for a template carrying an EXPLICIT machine, renders
  the **event strip**: one button per authored operator event plus a current-state chip, each
  button DISABLED where the machine would drop the press (controlModel `isEventLegal`). It owns
  the iframe, so it runs the ONE 500ms poll of `noacgMachineState()` and publishes the pointers
  to store.machineGroups - the Control panel greys its own copy of the same buttons from there,
  and the rule lives once for the editor, the hosted page and the exported panel. An ordinary
  template shows nothing new. The four cue buttons stay THE lifecycle surface for both kinds of template;
  playNext owns each Continue's reveal tween as `__activeTl` step-N. resetGraphic clears GSAP
  inline props on the root subtree before every entrance so a prior exit never leaks its end
  state (e.g. a Blur exit's filter into a Slide entrance that never resets it). Honors the SPX
  `out` = N ms setting by scheduling the exit after the entrance settles + the hold - cancelled
  by any manual play/stop/next/scrub.
- **MachineGraph** - the NODE EDITOR (Phase 4, docs/STATE_MACHINE_SCHEMA.md §6a): the machine
  graph surface toggling with the step timeline in the bottom dock (the SEGMENTED
  `≡ Timeline | ◇ States` switch - both surfaces always visible, active highlighted;
  data-block templates only). Boxes carry the ▤ layer / ◇ graphic timeline badge
  (animMachine `timelineKind`, derived never stored - a timeline that only fires a lifecycle
  `call` counts as ◇, since its effect has no one layer to attribute it to; a POSE is a state
  that does nothing at all on entry). The card's description composes TWO facts through
  `stateContent` - what entering does, and where the timeline lives - and names a transition's
  ends the way the BOXES do, with the ids (which never follow a rename) one hover away. The main lane's "+ state" is a
  three-way menu (pose / step on the path / ▤ timeline from layer via
  blocks/layerTimeline.ts, shared with the Inspector's Animations-tab button); Delete
  removes the selection (arrow / branch state / middle waypoint through the step mutators +
  the SPX `steps` sync) and a press on empty canvas (incl. the wires SVG) clears it;
  transition styles now include **Cut — instant** (duration/ease hidden for it). The play and
  final-stop edges are MATERIALISED lifecycle transitions (deriveMachine emits them,
  parseAnimData injects them into older explicit machines), so even a default two-step lower
  third has selectable entrance/exit arrows; their card shows the style rows only (trigger,
  event and Delete stand down — machineEdit refuses those edits), and an authored operator
  arrow into the final waypoint keeps the spine while the stop edge bows beside it, dashed.
  States as boxes (default path = the amber spine, badges match
  the timeline's cue markers, ▶ » ■ · ○ rest), transitions as labelled arrows, parallel groups
  as lanes, the preview's live state highlighted via the simulator chip's poll. Click a state
  = snap the preview there, parked; cards edit names (a path state renames through
  `renameStep` so the bound step label can never fork), trigger/event/timer, and TRANSITION
  STYLES (fade/push/wipe + duration/ease); port-drag draws arrows (same group only, minted
  unique event, selected for renaming — the persisted index is found via a serialize→parse
  round trip because the canonical serializer SORTS transitions); boxes drag to positions
  persisted as the additive `at` field. A machine-less template shows its DERIVED machine
  ("derived from the steps" chip) and the first edit materializes it in the same undoable
  apply. Waypoints stay the timeline's to add/delete (positional binding); the card links
  there ("Open its timeline" parks the playhead at the step) - and a BRANCH state's card
  offers "+ Add a timeline" (machineEdit `setStateTimeline`) or opens the one it has, swinging
  the dock onto it through store `timelineTarget` (blocks/timelineLens.ts). The step timeline
  then shows that ONE clip under a bar naming the state, with the path-only affordances
  (add/duplicate a step, the hold, the Play/Next/Stop cue) stood down. Every write is a
  blocks/machineEdit.ts mutator → `writeAnimData` → ONE applyTemplate; illegal edits (reserved
  or duplicate event, deleting the walk's only edge) return null and the control reverts.
  STRUCTURE: `.machine-graph` is a FRAME that fills the dock (`.timeline-dock` grows into the
  splitter's room via `flex: 1 0 auto`, so the surface is sized by the DOCK, never by the
  diagram); `.mg-viewport` inside it scrolls the `.mg-canvas`, and the OVERLAYS — the detail
  card, the foot chips, and the "+ state" menu (placed in frame coordinates by `framePoint`)
  — are siblings of the viewport, so they size against the dock and panning can't drag them
  away from what they describe. That is not cosmetic (the measured failure is at the frame in
  MachineGraph.tsx).
  PROBLEM MARKS: a box whose state `validateMachine` has something to say about (animMachine
  `stateProblems` — unreachable, or a timer on a timeline that never ends) wears a coloured
  dot, and its card carries the finding phrased as the NEXT MOVE rather than the export
  report's verdict (`problemAdvice`) — the finding otherwise reaches only the Export panel,
  a long way from where the machine was authored. `boxWidth` takes an allowance for the dot,
  or a two-word state ellipsizes exactly when its name matters most. An off-path POSE wears ○
  like the rest state.
  Gotchas: the box button must NOT have `overflow: hidden` — it would clip the connect port
  half off the right edge and eat its pointerdown (the name span does its own ellipsis); and
  `toBeVisible()` is blind to overflow clipping, so anything about reaching a control is
  pinned by comparing rects (`boxInside` in e2e/machine-graph.spec.ts), never by visibility.
  Pinned by e2e/machine-graph.spec.ts.
- **TimelineDock / StepTimeline** (Timeline v2, both in StepTimeline.tsx) - the dock picks the
  timeline surface from the CODE, never from the category (which is what lets a template saved
  years ago still open correctly): a NOACG_ANIM data region gets the clip-style STEP TIMELINE,
  editable - every category creates this way, so it is the normal case; a LEGACY region the
  importer can read gets the SAME step timeline, READ-ONLY, with an undoable '◆ use keyframes'
  conversion one click away (blocks/animImport.ts + the animRuntime writer) - it shows the real
  choreography, converted, rather than a lesser second editor; a legacy region it CANNOT read gets
  **LegacyTimeline** (below).
  The step timeline's vocabulary: a time ruler with the operator's cue markers (▶ » ● ■) at
  every boundary; step CLIPS - right-edge resize (default PRESERVES keyframe timing; Alt-drag
  STRETCHES times proportionally), context menu Duplicate/Rename/Delete + the step's default
  ease, »+ adds a step, a hold popover edits the SPX `out` setting, a speed select; LAYER
  ROWS - every registry part gets a row - with aggregate keyframe diamonds, a ▸ caret that
  EXPANDS the layer into per-property sub-rows (drag/Delete/ease scoped to that property via
  moveKeyframe/deleteKeyframe/setKeyframeEase's prop arg), and a LAYER STATE BLOCK: the
  existence span (activation step -> the step it LEAVES: its `hides` step, else the end of Out)
  with the keyframed entering/exiting phases emphasized - its LEFT edge drags between step
  boundaries as the same activation move the gutter/chip make, and its RIGHT edge drags to set
  an EARLY EXIT (blocks/animEdit setLayerHide writes the step's `hides`; dragging to Out clears
  it). Setting a hide on a template whose interpreter predates the feature re-emits the whole
  region so the exit actually plays.
  THE THREE READ-ONLY SURFACES. Three things in the data are NOT keyframes you can grab, and each
  is SURFACED (so the timeline never silently hides motion) but never draggable (so it never
  implies an affordance it lacks). All three are code-owned; the tooltips say so.
  MEASURED MOTION (`dynamics`, docs/DYNAMIC_MOTION_SCOPE.md) draws its own rows below the layer
  rows as hatched OPEN-ENDED bars naming the builder - its real length is measured from the
  operator's content at play time, so any fixed width would be a lie, and its target is
  deliberately not a registry part. LOOPS (`loops[selector][prop]`) draw a repeat TAIL from the
  looping track's LAST keyframe - the keyframes ARE the pass and stay editable; a finite repeat
  ends where the data says and caps, an endless one clamps to the canvas without a cap.
  LIFECYCLE CALLS (`calls`, TIMELINE_V2_PLAN §3b) get a `lifecycle` row of PINS naming the
  function: a side effect has no duration, so it is drawn unlike a diamond.
  KEYFRAME SETS (the gestures are docs/TIMELINE_INTERACTION_MODEL.md's): click and shift-click
  build a set, a drag moves the whole set with magnetic snap, and Delete / ←→ / Ctrl+C,V,D act
  on it. A drag on the empty rows area draws the SAME amber marquee the canvas lasso uses
  (.tlv2-lasso) and boxes every diamond it touches; the ruler/clips band keeps its scrub. A
  draggable playhead with a grab cap + auto-follow scroll and deep zoom (up to 1000 px/s);
  Space plays (never while typing).
  Every edit is a pure data mutation (blocks/animEdit.ts) spliced back by
  blocks/animData.ts - ONE undoable apply each (a group drag/delete/paste chains mutations
  into one apply); playhead/scrub/selection never write history.
  Parity between editor and runtime is pinned by e2e/anim-engine.spec.ts; the interaction
  contract lives in docs/TIMELINE_INTERACTION_MODEL.md.
- **Inspector** (Timeline v2) - the persistent panel RIGHT of the preview and the shared
  selection's third consumer (canvas <-> timeline <-> Inspector): identity + resolved property
  values at the settled state (parseAnimData -> importAnimData -> animEval resolveValue). On a
  data-block template the Properties tab EDITS: each property carries a ◇/◆ diamond - arm it
  to stamp a keyframe at the store playhead, edit an armed value to auto-key there, click a
  diamond sitting ON a keyframe to remove it; ‹ › navigate the layer's keyframes, labels
  drag-scrub the value, and arming BOTH Position X and Y also unlocks the canvas position-keyframe
  drag (see CanvasInteraction). The vocabulary (PROP_ROWS) is x/y/yPercent/scale/opacity/
  rotation, a **Filter** group - blur/brightness/saturate/hueRotate/glow, which are NOT separate
  tracks: they share the ONE composed `filter` track (blocks/filterTrack.ts), so a row edits one
  function of the string and a keyframe there carries them ALL (the row hint says so). A filter
  row carries `filter: <key>` in PROP_ROWS and writes through animEdit's `setFilterComponent` -
  plus a **3D transform** group - `rotationX`/`rotationY`/`z` and `perspective`
  (`transformPerspective`), ordinary numeric tracks the interpreter tweens with no special-casing
  (perspective enables the 3D look; they pivot around the Pivot's transform-origin). Adding a
  numeric prop needs only a PROP_ROWS entry - no runtime/resolver/validation change; a new FILTER
  function needs only a FILTER_FUNCS entry in blocks/filterTrack.ts plus its PROP_ROWS row.
  A selected PLACED FIELD (an imported design's line or slot - blocks/designLayout.ts
  placedLines, code-derived) additionally offers a **Style tab**: CONTENT rows (the operator
  label via blocks/edit.ts setFieldTitle, and for text lines the shown text through
  setFieldDefault + the live sample value), numeric X/Y placement, the full typography set for
  a text line plus a FIT group (Shrink / Wrap / Free + the slot width - what a long operator
  value does to the line), and an image slot's box. Every control is a deterministic patch of
  the field's OWN rules via designLayout (setLineFit, setLineTextStyle, placeLine,
  setSlotSize), one undoable apply per edit. The tab exists only while a placed field is
  selected (a non-placed selection falls back to Properties without clobbering the stored
  choice). A placed field's look is DESIGN, never keyframes - the same doctrine as its drag.
  The Animations tab leads with the layer's LIFECYCLE rows - **Appears** (▶ Play / an existing
  step by name / "in a new step »" via createStepFromLayer) and **Disappears** (■ Out / an
  early exit via animEdit setLayerHide) - the same transforms the canvas chip and the timeline
  block edges write, shown for the default path only. Below them it names which steps move the
  layer and holds the preset picker (preset + In/Out/Both + easing + per-direction duration and
  DELAY - a hold before the motion, written as shifted keyframes so no keyframe knowledge is
  needed - blocks/presetApply.ts). Apply is a CLEAN SWAP of the targeted direction's motion (it
  never blends with the previous preset), re-parks the preview at the playhead, and a target
  line under it names WHICH step each direction will actually edit. On an imported
  design (the placed-design shape, code-derived) Animations is the DEFAULT tab - the artwork
  brought its look, so per-layer motion is what the Inspector is for there; a manual tab
  choice afterwards sticks. Legacy templates get a
  read-only shell (the timeline's convert chip arms editing). It is a dockable panel (default:
  the active tab of the RIGHT dock); any NEW selection reveals it, and an explicit close holds
  while the selection is unchanged (see AppShell).
- **LegacyTimeline** (Phase 8) - the READ-ONLY chart of a legacy region the importer REFUSES:
  measured motion written inline (`x: -track.scrollWidth`), or a loop it would have to guess at.
  Such a template can never be auto-converted, and regenerating it would discard its owner's
  tuning - so it must still RENDER truthfully (DYNAMIC_MOTION_SCOPE §8.1). It draws the
  CUE-SEGMENTED OVERVIEW (blocks/timelineModel.ts buildOverview): ONE strip, all sections side by
  side (▶ In · » presses · ● hold · ■ Out), each on its own real local clock, the hold a hatched
  break, registry-part rows spanning every section. A live playhead follows the simulator; clicking
  a section or dragging the scrub parks the preview there - reading the code, never writing it. Row
  LABELS are shared-selection handles, as everywhere.
  It offers NO editing affordance (Phase 8 deleted the patchers) - the note says why and the JS
  tab is where you edit it. Its ONE write is **"start over with a preset"**, which emits that
  preset as DATA (presetRegistry.emitPresetRegion -> importer -> data block): the way out of
  unconvertible code leads FORWARD, never to another legacy region, and undo restores the
  hand-written version. An unparsable region gets an honest one-liner plus that same select;
  blank/imported templates get no strip at all.

## Field controls (fields/) - ONE control, every surface

**FieldControl.tsx** is THE editable-field control - the SPX Data panel, the SPX Control panel and
the video Content panel all render it, differing only in the descriptors they pass. **Do not
hand-roll a field control.** The full contract moved to **`src/components/fields/AGENTS.md`** (with
its thin `CLAUDE.md`), which loads when you work in that directory.

## Style controls (style/) - ONE set, both surfaces

**StyleControls.tsx** renders the `:root` style contract wherever a human edits it: the wizard's
Style step and the editor's Style panel. Its contract - the no-dead-knobs doctrine, complete CSS
values, alpha-preserving colours, ColorField and the bundled-typeface rule - moved to
**`src/components/style/AGENTS.md`** (with its thin `CLAUDE.md`), which loads when you work in
that directory.

## Panels (the six tool panels - Data / Control / Style / Assets / AI / Export)

On DESKTOP each is a dockable panel (AppShell renders them into the docks; see WorkspaceDock).
**SidePanel** is now the MOBILE surface only: a SEVEN-tab strip - **Inspector** leads, then the
six tool panels. The Inspector belongs there because the mobile stack has no docks, so the strip
is the only route to the surface where a layer is styled and animated. It renders RAW
(it brings its own padding + scrolling, like the desktop dock's
renderPanel); the tool panels keep the shared `.panel-body`. A new selection does NOT auto-switch
the mobile tab (AppShell's reveal effect is desktop-only: on a phone a tab swap under the fold
would be a surprise, not a reveal). There is no Motion tab: motion editing lives on the timeline
(StepTimeline via TimelineDock) plus the Inspector. Pinned by the mobile cases in
e2e/layout.spec.ts.

- **SampleDataPanel** - sample values (shared field rows, `includeHidden`: a hidden field carries
  a real input value like a countdown's duration, so it must be testable here) + add-field. On a
  placed-design template (designBoxInfo, code-derived) a text/number add goes through
  blocks/designLayout.ts addPlacedLine and an Image add through addPlacedImageSlot - a REAL
  placed field on the artwork; on a standard-contract CATALOG template a text/number add goes
  through blocks/edit.ts addCatalogLine - a real line in the assembler's own mask idiom. Both
  gates are code-derived, and both select the new layer on arrival so the Inspector reveals.
  Long text, images off-design, and off-shape templates keep the definition-only add.
- **ControlPanel** - operator view from the control/ engine (the same shared field rows, `live`
  on, hidden fields skipped as SPX skips them); live-drives the preview via store.sendControl ->
  simulator; renders the state machine's EVENT BUTTONS (controlModel eventButtons - labels/
  sections/payloads from `machine.controls`, payload values from sampleData via
  store.sendEvent), GREYED by `isEventLegal` against store.machineGroups exactly as a hosted
  control page greys them; downloads controlpanel.html; hosts a SLIM Productions block
  (docs/GOALS.md "Student release" step 8: create/pick a production + "+ Add current" + the
  link to its page - the layer stack, export, publishing and links all live on
  ProductionPage, so two surfaces cannot drift); adds the Google-Sheets live-data block.
- **HostedControlPage** - the `?control=<slug>` operator page (routed in App.tsx like ?chat=).
  It renders **THE PLAYOUT DASHBOARD** (docs/PLAYOUT_DASHBOARD.md), the one design the in-app
  production page and the exported controller also render: PVW + PGM monitors, the verb bar,
  the selected-cue editor, the cue rundown with its layer badges.
  **Both monitors are real and cost the backend nothing**: the published payload already
  carries every graphic's code, so PREVIEW is a local `PayloadStage` this page drives itself
  and PROGRAM is a second one driven by the shared LOG - which is what makes it show a take
  from somebody else's device. On boot it replays each live layer's last REPORTED data into
  the PROGRAM stage, or a production that has been on air all afternoon opens with an empty
  monitor beside a row marked ON AIR. That replay is safe HERE and was not in an exported
  package: this stage drives nothing but itself.
  **PARITY IS THE POINT HERE** (docs/CONTROL_PANEL_PARITY.md §4): this page and the in-app one
  render the same dashboard, so a control added to either belongs on both in the same commit.
  Since 2026-08-19 it also carries the ⚡ block whole (section grouping via `controlSections`,
  the recovery `.pd-snap`, the help line), the operator ACTIVITY log, the "N changes not on air
  yet" warning - judged against what the WIRE says was last sent, so another operator's update
  clears it - and the production DATA-ROW picker, whose rows are published by `buildPanelSpec`
  from the shared `control/cueData.ts` matcher.
  **The VERB KEYS come from `components/playoutKeys.ts`**, the one keymap the in-app page reads
  too (the exported controller keeps its own copy - it ships without React). A key belongs in
  that module, never in a surface; the bar is `HostedVerbs`, a component of its own only because
  the hooks rule forbids binding a key while the page is still resolving its show.
  **They bind while playout is the surface ON SCREEN, never merely while it is mounted.** The
  in-app shell renders on Data and Audience too, with the playout column hidden behind them
  rather than unmounted - so bound-while-mounted meant SPACE ran Take from a screen with no
  monitors on it, and a cue went to air with nothing saying so (measured 2026-08-21: nine rows
  on the wire). Hence `usePlayoutVerbKeys(onKey, sub === null)`; this page has no workspaces and
  passes nothing. A verb acts on what the operator can SEE.
  Field edits still go to the SHARED staging buffer (local echo + debounced control_stage) and
  air only on an explicit take; event buttons still grey by structural guard; the graphic's
  saved ENTRIES stay a READ-ONLY picker in the editor head (authoring stays in
  GraphicControlPage). Login-optional by design (the slug is the capability); offline builds
  answer the route honestly, which is also why the page's UI cannot be pinned by the offline
  suite (e2e/hosted-control.spec.ts covers the publish-side spec build only).
  **e2e/configured/hosted-control-recovery.spec.ts** is the live half: a capability URL
  resolves signed-out, a first take reaches the durable log and comes back round the follower,
  the layer is still on air with the monitor holding it, and the PROGRAM monitor has played
  exactly ONE entrance. That last one is the gate on the round-1 bug (the boot replay re-firing
  when the returning cue row moved `liveCue`), and it is arithmetic because it cannot be
  visual: a replayed `play` settles on the picture that was already there. Asserting on the
  picture passed the bug when it was mutation-tested; asserting on `data-plays` reads
  `Expected "1" Received "2"`. Mutation-test both halves when touching either.
- **home/PayloadStage** - ONE monitor component: `createOutputStage` over an `OutputPayload`,
  the same two functions the published output URL is built from, fed the same
  `ControlSendItem[]` the verbs send. Both monitors on both surfaces are one of these, which
  is what makes a monitor unable to disagree with air without the renderer itself being wrong.
  **It RE-ASKS for machine state once a second**, as `/output` always has (src/output/main.ts;
  the staleness it prevents is in PayloadStage.tsx's own comments - the ⚡ buttons grey against
  this state via `isEventLegal`). The guard is the SUBSCRIBER (`onState`), not mount-time
  config, so a preview monitor nobody reads state from costs one boolean per second. Pinned by
  e2e/production-controls.spec.ts.
  It also publishes **`data-plays`** on its root - entrances applied since this stage came up,
  reset per rebuild and counted only when a stage actually took the command. A DUPLICATE
  renderer command is the one fault that leaves no trace (a second `play` settles on the picture
  already showing), so this is the only handle a test has on it; see the mutation-test note
  under HostedControlPage.
  **home/ProgramStage** is the app-side wrapper that builds the payload from the local show
  first (it was the rehearsal stage; rehearsal is retired - docs/PLAYOUT_DASHBOARD.md §6).
- **StylePanel** - reads/writes the :root style contract (src/templates/AGENTS.md): colours,
  SHAPE, typeface swap, zone re-anchoring, post-creation typeface import (an imported face
  still lands in template.assets and shows in the Assets panel's list). The controls
  themselves are **style/StyleControls**, shared with the wizard's Style step - see below;
  this panel is the store adapter around them. It renders the SAME `wizard/FontPicker` the
  wizard does, so both surfaces search the same library and reach the same installed faces.
- **AssetsPanel** - the template's bundled files as folder-grouped ROWS (images, video loops
  .webm/.mp4 - hard-capped at MAX_VIDEO_ASSET_BYTES since assets ride the saved template as
  data URLs - Lottie .json gated by looksLikeLottie, fonts): DnD file import (one addAssets =
  one undo step), rows are drag SOURCES (`application/x-noacg-asset`, exported as
  ASSET_DRAG_TYPE) for the canvas drop (CanvasInteraction) and for folder-header drops; folders
  are path segments (one level inside the bucket) - moving/renaming goes through
  blocks/assetOps.ts moveAsset, which rewrites every code reference in the SAME undoable apply,
  then patches stale sampleData values. Empty user-created folders are ephemeral component
  state on purpose (assets sync as template JSON). Each row carries a USAGE mark (reference
  count > 0: ✓ / n×) - re-dragging a used asset adds another element instance, never a
  duplicate file. The Information section derives name/format/dimensions/aspect/size/alpha/
  Lottie timing/video duration + reference count per selection via src/assets/assetInfo.ts
  (async probe, cached) - the model stays { path, data }. The header's **"✚ Template
  graphic…"** opens InsertTemplateDialog - the catalog browser in INSERT mode over
  blocks/templateInsert.ts (whose merge contract is src/blocks/AGENTS.md's) - offering two
  choices: PLACEMENT (from the start / as a new next step) and "Its lines" (reveal together /
  step by step). Both are code-derived from one donor build per card, so a template needing its
  own runtime is greyed with the reason. Pinned by e2e/assets.spec.ts,
  e2e/asset-workflow.spec.ts + e2e/template-insert.spec.ts.
- **AIPromptPanel**; **ExportSurface** + its two hosts. The surface holds everything export
  DOES - the six zip targets, the validation gate, and (when `isRenderConfigured()`) the render
  section - and reads NO store: template, sampleData and `graphicId` arrive as props, because
  the same screen has to serve a graphic that is not the open project.
  **ExportPanel** is the dock panel, a thin store adapter that also feeds the verdict back via
  `setValidation`. **ExportWindow** is the standalone modal (`useExportUi.openExport(request)`,
  the store co-located with the component like InsertTemplateDialog's): export is not a reward
  for opening the editor, so the wizard's Finish step ends there and so does a saved graphic's
  ⬇ button on Home. It mounts ONCE in **App.tsx**, beside the routed surface - Home is a
  SIBLING of AppShell, not a child, and both open it, so mounting per shell would put two
  modals on screen. It closes on a route change (the request is a SNAPSHOT of one graphic and
  must not outlive its surface), recording the opening route on the effect's first run for a
  request so the wizard's batched close→navigate→open hop is not mistaken for navigating away.
  Sample data for a non-open graphic goes through templateStore's
  exported `syncSampleData`, so what a target bakes never depends on which door was used.
  **render/RenderPanel** takes the same three props; ProRes/sequence gate on `needsSignIn` like
  AI does, its measured In/Hold/Out breakdown re-runs when the template or sample data changes,
  and job state lives in src/render/renderJobStore.ts. Contracts in src/render/AGENTS.md;
  specs in e2e/render.spec.ts (stubbed API) + e2e/wizard-finish.spec.ts.
- **CommunityGallery** (🌐), **ModerationQueue** (🛡), **SyncStatus**, **SettingsDialog**.
  Hosted analytics is explicit opt-in: AnalyticsConsentBanner is non-blocking and mounts once
  in App; Settings owns the reversible preference. Undecided, declined, DNT/GPC, and offline
  states create no identifier and send no events.

## Save + Home (docs/SAVED_CONTENT_MODEL.md)

PACKAGES are fully RETIRED (docs/GOALS.md "Student release" step 3): every save is standalone
in the flat library and the one grouping is a PRODUCTION (model/shows.ts). Save and Home are
both routed (src/app/router.ts) so browser Back/Forward walk between surfaces.

**NEVER REPORT A SAVE THE STORAGE LAYER HAS NOT AGREED TO.** The saved documents live in
IndexedDB behind a synchronous mirror (model/durableStore.ts), which ACCEPTS a write and
confirms it a moment later - so the value a model mutator returns means accepted, not landed.
A surface that tells the user anything about the outcome must `await commitDurableWrites()`
first; it resolves to the failure message, or null, and CLAIMING it is what puts this
surface's own wording in front of the user instead of the generic app-level dialog. An e2e
SEED that reloads after writing owes the same await. Every surface that reports one does it
today (grep `commitDurableWrites`). Two rules follow from it: a flow
that CONTINUES on success (create the graphic,
then the production, then navigate) must await BEFORE the next step, or it builds half a thing
on a save that did not happen; and a background autosave that reports nothing may skip the
await entirely, because the app-level dialog already announces unclaimed failures.

- **save/SaveControls** - the topbar Save button + honest status (Not saved / Unsaved
  changes / Saving… / Saved / Save failed) + the ▾ menu (Save As, open saved) + global
  Ctrl/Cmd+S (capture phase, works inside Monaco, stands down under modals).
- **save/SaveDialogs** - the first-save/Save-As dialog (name only - every save is standalone)
  and the unsaved-changes guard (Save & continue / Save first… / Discard /
  Cancel), mounted once per shell; both declare useModalGate.
- **home/** - HomePage (`#/home[/<section>]`), the productions/graphics/videos/looks sections,
  GraphicThumb and GraphicControlPage moved to **`src/components/home/AGENTS.md`** (with its thin
  `CLAUDE.md`), which loads when you work in that directory.
- **AuthStatus** now routes 🏠 Home from the account menu (initials avatar fallback); the
  topbar's always-visible 🏠 Home button is the no-account door to the same place.

## Video editor shell (video/)

Moved to **`src/components/video/AGENTS.md`** (with its thin `CLAUDE.md`), which loads when you
work in that directory. It holds the video shell's full contract: VideoAppShell, the per-ENGINE
branching, the code pane and player bridges, and the chat / content / settings / assets / export
panels.

## Wizard (wizard/)

Moved to **`src/components/wizard/AGENTS.md`** (with its thin `CLAUDE.md`), which loads when you
work in that directory. It holds the wizard's full contract: the entry modes, the rail / form /
preview layout, Browse's faceted storefront, Import graphic, Create with AI and its three
execution tiers, Finish's two doors, and the video strip.

## Auth UI (auth/)

useAuthState hook + authUi store + SignInDialog + SignInPrompt + AuthStatus avatar menu
(-> Home / Settings / Sign out). The gating pattern: read `useAuthState().needsSignIn` (true
only when a backend is configured AND the visitor is signed out) and render `SignInPrompt` /
call `useAuthUi().openSignIn(reason)` - never block the app. Signup is OPEN (migration `0006`
made the Before-User-Created hook permissive; restore the 0002 function body to re-close it to
the allowlist). The signup half links the public `/terms` and `/privacy` pages and states that
creating an account agrees to the Terms and acknowledges the Privacy Policy. This is an
acknowledgement, not a separate consent checkbox. No login wall, ever - see the root AGENTS.md
"Auth posture".

ACCOUNT ESSENTIALS (docs/GOALS.md "Student release" step 9): SignInDialog carries a third
'reset' mode ("Forgot your password?" - email only, backend/auth `requestPasswordReset`);
the reset link's return trip is **PasswordRecoveryDialog** (mounted ONCE in App.tsx - the
link can land on any route), which answers the PASSWORD_RECOVERY event backend/auth
`onPasswordRecovery` now surfaces. SettingsDialog's Account section (email + password change
via `updatePassword` + sign out) renders nothing offline and waits through 'loading'. An
EXPIRED session (a signed-in to signed-out transition that was not the user's own Sign out -
backend/auth's consume-once deliberate-sign-out flag, checked in syncController) dispatches
`spx-session-expired`; App.tsx answers with openSignIn + a reason naming that local work is
safe. Offline pins in e2e/auth.spec.ts; the real flows in e2e/configured/account.spec.ts.
