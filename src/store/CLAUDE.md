# src/store - templateStore contracts

Loaded alongside the root CLAUDE.md when working in this directory. Keep it accurate.

templateStore.ts (zustand) holds the template plus editor UI state.

- **applyTemplate(next, opts)** - THE mutation choke point: snapshots the previous template for
  undo. Blocks, AI, panels, gallery, and canvas gestures all flow through it.
  `opts.resetSampleData` (used by the wizard on Create) starts sample data from the NEW
  template's field defaults; plain applyTemplate intentionally preserves typed sample values for
  matching field ids. Don't drop the flag from the wizard path: the old template's values would
  leak into the new graphic's fields.
- **undo()** - restores the snapshot. Global Ctrl/Cmd+Z (bound in AppShell) calls undo() unless
  focus is in Monaco or a form field.
- **setHtml/setCss/setJs** - editor edits; editing HTML re-parses the definition so
  `fields`/`settings` stay in sync. The preview rebuilds on a ~350 ms debounce.
- **lastChange** - per-tab changed-line ranges from every apply (drives the editor's
  change-highlight decorations).
- **replayNonce** - Motion applies auto-replay via PlayoutSimulator.
- **patchCss** - Style-panel patches: highlight without history spam.
- **sendScrub** - timeline view -> simulator pauses the preview's in/out timeline at a time.
- **sendControl** - the Control panel live-drives the preview through the simulator.
- **selectedPart** - the SHARED SELECTION (Era 6): one TemplatePart selector that the canvas and
  the timeline strip both highlight. UI state only - no history, never written into the template.
