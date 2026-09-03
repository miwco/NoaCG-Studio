---
kind: walk
date: 2026-09-01
serves: now
---
# The SVG import page explains itself

**Date:** 2026-09-01 · branch `claude/a-svg-import-clarity`

From your walk of the import flow: you missed the SVG export help entirely, "Which panel grows?"
asked a question your graphic had only one answer to, "What travels with it" named our model
rather than what happens on screen, and the editor flashed past on the way to the rundown.

## The route, in under a minute

`/app` → **Import graphic**.

1. **Before dropping anything**, look above the drop zone. There is now a compact
   **? Need help exporting SVG?** button with the three rules beside it. Press it: the per-app
   Illustrator / Figma / Inkscape menu paths open under it. It stays there after a file is in,
   which is when "no text layers, re-export" needs it.
2. Drop `e2e/fixtures/svg-corpus/inkscape-lower-third-layers.svg` (or any layered SVG of your
   own), then **Next**.
3. Scroll to **When the text is too long**. There is no "Which panel grows" picker any more.
   Instead: *"Palkki is the shape that grows: the only one your text sits in."* Hover that line -
   it still lights the shape up on the artwork beside you.
4. Drop a file with two panels that each hold a line and the picker comes back, labelled
   **"Which shape gets wider"** rather than "Which panel grows", and offering only the shapes a
   line actually sits in.
5. On a graphic where something is drawn past the growing edge, open **What else moves** (it was
   "What travels with it"). The ⓘ now gives a worked example in pixels, and the two choices read
   **Moves out of the way** / **Grows by the same amount**. Your text layers are no longer
   offered as travellers, and the section no longer appears at all on a graphic where nothing
   could travel.
6. Go to **Finish** and press **Add to the production - go live**. Watch the screen: it goes
   straight to the rundown. The editor never mounts.

## What to look at

- Is the help button loud enough to notice, and quiet enough not to compete with the drop zone?
  The amber is only the `?` mark, deliberately.
- Does "Palkki is the shape that grows: the only one your text sits in" answer the question you
  were asking, or does removing the control read as a missing feature?
- Read the **What else moves** ⓘ cold. Does the 40 px / 120 px example land?
- The route change: did the flash actually go?

## What is verified

`npm run build` green on the branch. 152 e2e specs re-run locally (`import-svg`,
`import-svg-corpus`, `import-graphic`, `storage-full`, `wizard-finish`, `motion-presets`,
`student-rehearsal`, `wizard-kit`, `import-svg-behaviour`), all passing. The editor flash was
reproduced before the fix by recording every route the door writes: it was
`["/app", "#/production/…"]` and is now `["#/production/…"]`, which is what the new spec asserts.

## Not done here

The third field of the Inkscape lower third not wrapping is a runtime question in
`src/templates/importedDesign/svg.ts`, which belongs to the parallel session on
`claude/b-svg-one-field-per-item`.
