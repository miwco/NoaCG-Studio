# The editor stage paints nothing, and Space over it still does nothing

**Status:** OPEN, unresolved. Reported by the owner 2026-08-27, re-confirmed with a screenshot
2026-08-29 after the Space-tap fix landed (`claude/j-editor-countdown-fixes`, on main).
**Why it matters:** opening a graphic in the editor is the first thing a person does. The design
view settles the graphic after every rebuild precisely so "the canvas is never blank"
(`PlayoutSimulator.tsx`, its own doc comment). It is blank.

## The 2026-08-29 evidence (this is the new part - use it first)

A screenshot of the failing editor, owner's machine. What it shows, in order of usefulness:

1. **The canvas is 1920x1880, not 1920x1080.** The header reads `headline · 1920x1880 · 25 fps`
   and the resolution chip repeats it. **This is the strongest lead in the whole report** and it
   was never visible before. Whether 1880 is a typo the user made, a persisted bad value, or a
   parse/roundtrip bug, a design composed for a 1080-tall frame inside an 1880-tall canvas is a
   layout the app has never been measured against. Reproduce THIS first: create or force a
   graphic at 1920x1880 and open it.
2. **The stage is TRANSPARENT-EMPTY, not white and not opaque.** The checkerboard shows through
   the whole frame and `Trans` is the selected backdrop. That rules out the `color-scheme`
   mismatch hypothesis (which would paint the iframe opaque white - root `AGENTS.md` gotcha) and
   rules out "an all-white graphic on a white stage". Nothing is being drawn at all.
3. **The template is NOT empty.** The timeline dock lists `Design`, `Artwork`, `Backdrop`,
   `Subtitle`, `Headline` rows with keyframes on the Design row, and Content shows two live
   fields (`f0` Subtitle "FULL TIME · HELSINKI", `f1` Headline). Enter 0.60s / Out 0.40s exist.
   So the document parsed, the fields parsed, the machine parsed - and the render is empty.
   The fault is between the parsed template and painted pixels, not in loading.
4. Zoom is 100%, the frame outline is centred and fully visible, so a stale pan/zoom parking the
   artwork off-screen is ruled out too (that was hypothesis 3 in the 2026-08-27 handoff).
5. The document is `Saved` and `Synced`, so this is a persisted record, not an unsaved draft.

## Space over the stage: still dead on the owner's machine

`claude/j-editor-countdown-fixes` landed a tap/hold split for Space over the stage (tap plays,
hold+drag pans) with specs. The owner tested after it landed and Space still does nothing.

Two candidate explanations, cheapest first, and NOBODY HAS CHECKED WHICH:

- **The build under test predates the fix.** The fix landed on main the same day it was tested.
  If the owner was on the deployed site, confirm the deployment includes the commit
  (`/version.json` carries branch@sha) before touching any code.
- **It is not a second bug at all.** A tap that starts a run on a stage that paints nothing looks
  exactly like a dead key. Do not treat "Space is broken" as independent until the stage paints.

## What was already ruled out (2026-08-27 session, all measured under Playwright)

- The play path is healthy: every press starts a real run, `runId` increments from the first
  press, opacity ramps 0 -> 1 over ~120 ms, Stop animates out, `previewError` is null.
- A graphic opened by deep link (`/app#/graphic/<id>`) renders VISIBLY - 477x147 at opacity 1.
- No page errors, no console errors.

So the fault needs something that environment did not have. The 1920x1880 canvas is the first
difference anyone has actually observed.

## How to work it

1. Reproduce at 1920x1880 - a graphic created or edited to that height, opened in the editor.
   If it reproduces, the whole report is one bug and the canvas size is the trigger.
2. If it does not, get the owner's actual record: which graphic, does it also come up blank in
   the WIZARD preview and on its CONTROL page. Blank in the editor but fine on the control page
   and blank everywhere point at completely different halves of the stack.
3. A saved graphic whose ASSETS did not rehydrate remains the one untested shape from 2026-08-27
   (every probe there used a freshly created catalog template with no uploads).

## Traps for whoever picks this up

- Do not judge motion through a Browser-pane tab that is not displayed: a hidden tab pauses
  `requestAnimationFrame`, the playhead loop posts nothing, and play looks dead when it is not.
- A polled probe misses the ~120 ms opacity ramp. Listen for the document's own
  `spx-preview-playhead` messages instead.
- `preview_start` serves the checkout the SESSION sits in, not necessarily the worktree being
  tested (still true for Agent-tool worktrees as of 2026-08-29). Verify which tree is served
  before believing any observation.
