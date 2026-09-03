---
kind: agent
date: 2026-09-02
---

> **Re-kinded 2026-09-03 - a claim, not an opinion.** Every line of "what to look at" is a fact about
> the deployed product: the stage paints, Play runs, Space plays. An agent drives it. The one line
> that is genuinely his - keep the 1920x1880 `headline` graphic if it still exists - is an ask
> against his own machine, and it is already recorded in `docs/backlog/editor-canvas-1920x1880.md`
> where the work is.
# The editor's stage and Play work on the deployed site again

You reported that Play runs the quiz board on a dev server and does nothing on
https://noacg.studio. It reproduced there in three minutes, on a plain catalog House Strap at an
ordinary 1920x1080: **stage blank, Play dead, no error anywhere.** Same cause as the blank-stage
report you filed on 2026-08-27 and re-confirmed on 2026-08-29. It was one bug.

## The route - under a minute

Once this is deployed:

1. https://noacg.studio/app → **Start from a template** → pick any design → **Skip to finish** →
   **Add to the production**.
2. Topbar **Home** → click the graphic under Recent graphics → **Edit graphic**.
3. **The stage must show the graphic**, not an empty checkerboard. Then press **▶ Play** and the
   entrance must run.
4. While you are there, tap **Space** with the pointer over the stage. It should play. That is the
   re-walk owed on `2026-08-29-space-over-the-stage-plays.md`, which stayed open waiting for this.

If step 3 shows a graphic, the whole 2026-08-27 report is closed.

## What was wrong

The editor builds its preview by writing three of the app's own functions into the iframe as text
(`.toString()`). Written-out text keeps whatever names the build gave those functions - and a
production build shortens them, while the dev server does not. So the copy that shipped called
helpers by their short names while the page defined them under their long ones, and every command
the editor sends the stage - settle, play, stop, next, scrub, snap - failed on its first line.

The failure was caught and thrown away by a `catch` block that said nothing, which is why there
was no console error, no badge, and nothing to read. The settle that runs after every rebuild is
the one that left the canvas blank.

Only the editor stage was affected. Everything else that shows a graphic - the wizard preview, the
control page, the production dashboard's preview pane, the card thumbnails - uses a different path
whose functions call no siblings, which is why those all kept working on the same site and made
the report so hard to place.

## What changed

- One door in `preview/composeDocument.ts` binds every written-out function under the name the
  build actually gave it.
- A stage command that fails now shows on the stage instead of disappearing.
- `npm run build` refuses the old pattern (`scripts/check-preview-serialization.mjs`).

## The one thing I could not explain

Your 2026-08-29 screenshot showed the canvas at **1920x1880**. That never reproduced and this bug
does not account for it - the blank stage happens at a perfectly ordinary 1920x1080. It is now
`docs/backlog/editor-canvas-1920x1880.md`, and it needs the actual graphic to go further. **If you
still have the `headline` graphic that showed 1880, that is the thing to keep.**
