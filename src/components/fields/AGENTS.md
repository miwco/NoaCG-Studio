# src/components/fields - the one editable-field control

Loaded alongside the root `AGENTS.md` and `src/components/AGENTS.md` when working in this
directory (Claude reads it via this directory's `CLAUDE.md` import; Codex reads it directly).
Keep it accurate.

Split out of `src/components/AGENTS.md` on 2026-08-09. Add a RULE here; leave the reasoning in
the code's own comments.

## Field controls (fields/) - ONE control, every surface

**FieldControl.tsx** is THE editable-field control. Every surface where a human changes a field's
value renders it: the SPX Data panel, the SPX Control panel, and the video Content panel. They
differ only in the DESCRIPTORS they pass (model/fieldModel.ts `FieldDescriptor`) and where the
value lives - never in what a number/colour/image control looks like or how it behaves. `FieldRow`
adds the label, the optional id badge, the per-field **Reset** to the descriptor's
`defaultValue` (shown only once the value differs), and the **TOO LONG** mark (`overflow`) a
control surface sets when the graphic reports that value as unfittable
(`control/controlModel.ts`, docs/CONTROL_PANEL_PARITY.md §4). Controls emit their kind's natural
type - a number for `number`, a string otherwise.
**SpxFieldRow.tsx** is the SPX binding both SPX panels share (sampleData + asset upload; values
stringify at that boundary because SPX sample data is a flat string map); the video panel binds
its own store the same way.
**Do not hand-roll a field control.** A new kind is added to `FieldKind`, mapped in the two
adapters (control/controlModel.ts `fieldDescriptors`, model/videoTypes.ts `videoInputDescriptor`),
and rendered once here. The exported standalone controlpanel.html (control/controlPanelHtml.ts)
renders the SAME descriptors in dependency-free vanilla JS because it ships without React - it is
the one deliberate second renderer; keep it in step.
