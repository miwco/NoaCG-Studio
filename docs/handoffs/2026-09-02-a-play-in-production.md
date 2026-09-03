# Play in production - the editor simulator was dead on every minified build

**Branch:** `claude/a-play-in-production`, cut from `b0750116` (the commit deployed at
https://noacg.studio, so the branch and production started from the same code).
**State:** fixed, gated, walked into `docs/acceptance/owner-queue/2026-09-02-a-play-in-production.md`.

## What the row asked and what came back

The owner said Play runs the quiz board on a dev server driven from Claude Code and does nothing
on https://noacg.studio. It does more than nothing wrong: on the deployed site the editor's
**whole simulator was dead** - settle, play, stop, next, scrub and snap - and had been since the
2026-08-27 blank-stage report. Those were never two bugs.

`preview/composeDocument.ts` serializes `runSimCommand` into the preview document with
`.toString()`, plus the two helpers it calls. `.toString()` returns the source the BUNDLER left.
Dev keeps the identifiers; `vite build` renames `killAllTimelines` to `Q` and `resetGraphicInline`
to `$`, so the emitted body called names the document never bound, and each command's own
`try { … } catch (e) {}` ate the `ReferenceError`.

## The evidence, in the order it was taken

Kept here because most of it cannot be re-derived from the repo:

1. **Live reproduction.** A plain catalog House Strap, made through the wizard on
   https://noacg.studio, opened via Home → the graphic → Edit graphic: stage blank (transparency
   checkerboard through the whole frame), timeline dock full of real layers, canvas an ordinary
   **1920x1080**. Clicking ▶ Play produced **zero** `spx-preview-playhead` frames with
   `active: true` over 1.5 s, and zero `spx-preview-error` messages.
2. **The srcdoc of that running editor**, read from the parent page (the iframe attribute is
   readable even though the sandbox blocks `contentDocument`): the document bound
   `var killAllTimelines =`, and the emitted `runSimCommand` body called `Q(e)` four times, `$(e)`
   twice, and `killAllTimelines(` **zero** times.
3. **The half.** A local `npm run build` produced the same shape byte for byte, so it is the
   BUNDLE, not the host. No CSP, no COEP, no 404, no font, no color-scheme meta - all dead ends,
   none of them worth re-checking.
4. **Blast radius.** `settleGraphic`'s minified body references none of its siblings (checked in
   the shipped chunk), and `simulate: true` has exactly one caller, `components/PreviewFrame.tsx`.
   That is why the wizard preview, the control page, the dashboard preview pane and the card
   thumbnails all rendered correctly on the same site while the editor stage stayed empty.
5. **The fix, proved on the artifact.** The shipped chunk was loaded in Node, an editor document
   composed, and its `spx-simulate` script run against a fake window: `sim-play` reached
   `killTweensOf -> update -> buildInTimeline -> CLEAR`. The same harness with the old emission
   restored (alias binding only) reported `sim-play: Z is not defined` - which is now what the
   stage would say, in as many seconds as it takes to press Play.

## What landed

- `serializeHelper(fn, alias)` in `composeDocument.ts` - the one door, binding `fn.name` and
  aliasing the readable name.
- **Every** command in the `spx-simulate` tag now runs through `sim(name, run)`, which reports a
  throw on its own `spx-preview-cmd-error` channel and CLEARS on the next press that works. The
  silence is what made this a week-old bug instead of a five-minute one. `update` and `dispatch`
  are in it too - an `update()` that throws is the commonest failure in generated code and used to
  produce this same symptom, stale content and nothing said.
- `scripts/check-preview-serialization.mjs` + its test, wired into `npm run build`.
- `e2e/preview-error.spec.ts` gains the loudness case: a throwing `sim-settle`, then `sim-play`,
  then a working Stop that clears the badge. No new spec file, so `scripts/e2e-lists.mjs` was NOT
  touched - see below.
- `vite.config.ts` carries a DO-NOT-ENABLE note on `keepNames`, which the gate cannot see.
- `docs/VERIFICATION.md` gains "Every gate here runs a DEV SERVER, so minification is unmeasured".
- `docs/backlog/editor-blank-stage.md` deleted (the backlog README's rule: landed is not a state),
  and the one thing in it that did not reproduce split out as
  `docs/backlog/editor-canvas-1920x1880.md` with the owner receipt carried over.

## Why command errors got their own channel

The first version of this posted them on `spx-preview-error`, the load-time channel. `/check`
caught what that costs: `PreviewFrame` writes that into the store, `ExportPanel` hands it to
`ExportSurface` as `runtimeError`, and `validateTemplate.ts` pushes it as an **error**, so export
is refused - and nothing clears it but a rebuild. One scrub that threw would have stood between a
student and their download until they edited code. `spx-preview-cmd-error` is visible on the stage,
self-clearing, and invisible to the export gate. A failed press is not "this graphic cannot ship".

## Traps that exist in no repo file

- **`scripts/e2e-lists.mjs` deliberately untouched.** The row minted permission to add a spec
  file; the honest answer is that no spec can reach this bug. Both Playwright configs and the
  catalog config run `npm run dev` (`webServer.command`), and Vite dev does not minify. Editor
  Play is ALREADY covered - `e2e/flows.spec.ts` clicks ▶ Play and asserts opacity 1 - and it
  passed throughout. Adding a second dev-server spec for Play would have bought nothing but
  confidence in the wrong place. The gate is a source check for that reason.
- **The Browser pane's coordinate frame is 800x450 while the page viewport is 1280x720.** Every
  click coordinate is scaled by 1.6, and `resize_window` to anything larger than the pane makes
  the page CSS-transformed, after which `computer` refuses clicks outright ("frame owner is
  CSS-transformed"). Use `find` → `ref_N` and let the tool resolve coordinates; only fall back to
  raw coordinates for elements `find` cannot name.
- **Clicking a wizard template CARD hits its live-preview iframe**, which is CSS-scaled, so the
  click is refused. Click the card's title text (`find` returns it as a separate ref) instead.
- **The wizard's Finish step has no "open in the editor" door** - only "Add to the production" and
  "Export it". The editor is reached Home → the graphic card → **Edit graphic** on the control
  page. Worth knowing before you spend ten minutes looking for a button that is not there.
- **`npm run build 2>&1 | tail -N` shows nothing until it exits**, because `tail` buffers. A
  background build looks hung for its full ~15 minutes. Not a fault; do not go looking for one.
- Reading a production chunk is a one-minute measurement and it is the one that ends these:
  `curl -s https://noacg.studio/app` names `/assets/app-*.js`, whose `__vite__mapDeps` array names
  every lazy chunk, including `composeDocument-*.js`.

## What is left

- **Nothing blocking.** The owner-queue item is a re-walk on the deployed site once this lands.
- `docs/acceptance/owner-queue/2026-08-29-space-over-the-stage-plays.md` was updated in place
  rather than closed: its Space half is explained by this bug (a tap that starts a run on a stage
  that paints nothing is indistinguishable from a dead key) but it still owes a re-walk, and only
  the owner can give it.
- `docs/backlog/editor-canvas-1920x1880.md` is unstarted and needs the owner's actual graphic. The
  owner-queue item asks him to keep it if he still has it. It is not a lead on anything today.

## Pointers

- `src/preview/composeDocument.ts` - `serializeHelper` and its comment carry the whole account.
- `src/preview/simulatorRuntime.ts` - the STRINGIFICATION HAZARD comment, corrected: the
  discipline is `fn.name`, not "embed under these exact names".
- `scripts/check-preview-serialization.mjs` - the gate, and its header is the short version.
- `docs/VERIFICATION.md`, "Every gate here runs a DEV SERVER" - the generalizable lesson.
