# src/components - the React app

Loaded alongside the root CLAUDE.md when working in this directory. Keep it accurate. The
store-side halves of these contracts are in src/store/CLAUDE.md; the code patchers they call are
in src/blocks/CLAUDE.md.

## Shell & editor

- **AppShell** - two-pane layout: code left; preview stacked over the tool tabs right - the
  stage's aspect-ratio comes from the template resolution. Binds global Ctrl/Cmd+Z to undo()
  (skipped when focus is in Monaco or a form field). Desktop layout modes + splitters persist
  via model/layout.ts; useIsMobile/useSplitter support the mobile and resizable layouts.
- **CodeEditor** - Monaco + change-highlight decorations + change dots on inactive tabs the last
  apply touched + hover explanations (the teach/ module registers its tooltips here; there is no
  Learn tab).
- **PreviewFrame**, **CanvasGuides**.

## Canvas direct manipulation (Era 6)

- **CanvasInteraction** - always-on direct manipulation: hover cursors; drag the root -> nearest
  zone + residual nudge -> the SAME zoneDecls patch the Style panel writes; dblclick a visible
  #fN -> inline edit -> sample value + definition default via blocks/edit.ts setFieldDefault;
  corner handle -> live --scale preview, diagonal-aware, clamped 0.25-4. Every gesture commits as
  ONE undoable applyTemplate and jumps the editor to the changed tab, highlighted; the root is
  detected via model/structure.ts detectPrefix.
  The SELECTION model: a click selects the innermost TemplatePart under the point
  (registry-driven closest-ancestor hit test, rect-containment fallback); clicking the selected
  part again climbs to its container; hover previews the name; Escape or empty canvas deselects;
  the corner handle stays anchored while the whole graphic is selected. Selection is editor UI
  state ONLY - the selector lives in store selectedPart so the timeline strip highlights the
  same element - never written into the template.
- **CanvasSelection** - the presentational selection/hover overlay: amber outline + a chip
  speaking part.label - the registry's words, same as the timeline strip. Chips hint only
  actions that already exist: dblclick-to-edit on text lines, corner resize on the root. An
  eligible selected part's chip carries the "appears on press" select - the timeline gutter's
  control from the canvas, same conditions, same blocks/stepAssign.ts patch - and swallows its
  own pointer events so the gesture layer under it never fires.

## Playout & timeline

- **PlayoutSimulator** - owns the running preview timeline `__activeTl`; settles the design view
  after every rebuild (progress(1, true) + a second update()); auto-replays on replayNonce;
  playNext owns each Continue's reveal tween as `__activeTl` step-N.
- **TimelineView** - the collapsible strip under the preview. MOMENT CARDS
  `▶In · »1 · »2 · »+Step · ●On air · ■Out` (step cards numbered by PRESS; cue subtitles
  aria-hidden - getByRole('▶ Play') must stay unique in specs) over the CUE-SEGMENTED OVERVIEW
  (blocks/timelineModel.ts buildOverview): ONE strip, all sections side by side, each on its own
  real local clock (widths = duration × zoom; zoom +/- buttons; fit once per template.name), the
  hold a fixed hatched break, registry-part rows spanning every section (multi-target tweens
  expand onto member rows at their stagger offsets; set()-only rows drop).
  Every bar edits in place AND independently: dragging a member of a joint multi-target tween
  SPLITS it per target first (splitTween) so only that layer retimes; bars resize from BOTH
  edges (left = start with the end pinned); dragging any eligible bar across sections moves WHEN
  the part appears (entrance bar -> » press = assign, reveal bar -> entrance = unassign - all
  through stepAssign.changePartPress; section bodies + cards are drop zones; dragged bars get
  pointer-events:none so hit-testing sees through).
  The gutter has each part's "appears on press" menu + the selected moment's ease chips
  (patchTweenEase/patchStepEase). Each part row's ▸ arrow opens the ENTERS-FROM drawer
  (X/Y/scale/opacity/rotation from-values settling to identity - patchTweenVars edits from/to
  literals, insertPartTween adds a tween to partless layers; press-assigned parts and the root
  have no drawer).
  ●On air = a pseudo-card (phaseId 'hold'); clicking it parks on the settled look. »+Step
  disables with a tooltip reason. An unparsable marked region gets an honest one-liner
  (blank/imported templates get no strip). One undoable apply + auto-replay per edit - the code
  always the truth. Row LABELS are the shared-selection handles: clicking one (or a bar, without
  dragging) selects that element on the canvas too (store selectedPart); the selected row washes
  amber.

## Panels (SidePanel: Data / Control / Style / Motion / AI / Export)

- **SampleDataPanel** - sample values + add-field.
- **ControlPanel** - operator view from the control/ engine; live-drives the preview via
  store.sendControl -> simulator; downloads controlpanel.html; adds the Google-Sheets live-data
  block.
- **StylePanel** - reads/writes the :root style contract (src/templates/CLAUDE.md): colors,
  font swap, zone re-anchoring, post-creation font import.
- **AnimationPanel** (the Motion tab) - In/Out/Both phase control over the marked ANIMATION
  region via blocks/animPatch.ts (src/blocks/CLAUDE.md has the region rules and the
  steps-toggle visibility rule).
- **AIPromptPanel**; **ExportPanel** (validation inline; remembers the last-picked target via
  model/prefs.ts).
- **PacketManager** (📦 topbar modal), **CommunityGallery** (🌐), **ModerationQueue** (🛡),
  **SyncStatus**, **Homebase** (signed-in dashboard: all saved graphics across packets, one
  store with 📦 Packets), **SettingsDialog** (AI key/model + workflow defaults from
  model/prefs.ts).

## Wizard (wizard/)

CreationWizard (Entry -> Category -> Template -> Fields -> Style -> Animation, persistent live
preview), draft.ts, WizardPreview, MiniPreview, steps/. Creating calls `variant.create(options)`
which generates the complete, commented template.

**Sample data on create:** the wizard applies with
`applyTemplate(template, { resetSampleData: true })` so a new project starts from ITS field
defaults - plain applyTemplate (blocks, panels, AI) intentionally preserves typed sample values
for matching field ids. Don't drop the flag from the wizard path: the old template's values
would leak into the new graphic's fields.

## Auth UI (auth/)

useAuthState hook + authUi store + SignInDialog + SignInPrompt + AuthStatus avatar menu
(-> Homebase / Settings / Sign out). The gating pattern: read `useAuthState().needsSignIn` (true
only when a backend is configured AND the visitor is signed out) and render `SignInPrompt` /
call `useAuthUi().openSignIn(reason)` - never block the app. Signup is OPEN (migration `0006`
made the Before-User-Created hook permissive; restore the 0002 function body to re-close it to
the allowlist). No login wall, ever - see the root CLAUDE.md "Auth posture".
