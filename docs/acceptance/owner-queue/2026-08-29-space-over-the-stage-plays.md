---
kind: walk
date: 2026-08-29
---

> **Re-kinded to `agent` on 2026-09-03 and BACK to `walk` on 2026-09-04, which is the interesting
> part.** The 2026-09-03 reasoning was that whether a key plays a graphic is a fact about the
> product, so an agent can press it. An agent then tried, and could not: a night session drives a
> hidden browser pane, Chromium throttles `requestAnimationFrame` there to about a frame a second,
> and a 1.34 s entrance becomes indistinguishable from an out. The rest of that walk is below and
> most of it succeeded - only the KEY is unsettleable this way.
>
> So the kind goes back, because `kind: agent` is presented to an agent and never to him, and an
> item no agent can finish would have sat on a list nobody reads. **The queue's question is not
> "is this a claim or an opinion", it is WHO CAN SETTLE IT** - and for this one the answer is
> whoever has a browser on a screen. That is him, in under a minute.
# Space over the stage plays, and the timeline strip admits when a run has ended

Two editor faults, both found while chasing the blank-stage report and both left unfixed by that
session. Neither is the blank stage; both are worth a minute of your time.

**1. Space over the preview was a dead key.** Space belongs to the canvas whenever the pointer is
over the stage - that is how hold-Space-and-drag pans, the gesture every graphics editor shares.
But a pan needs a DRAG, so a plain TAP of Space over the preview did nothing at all: no play, no
movement, no feedback. The preview is exactly where you are looking when you reach for play, so
the key read as broken. It now splits by gesture rather than by where the pointer is: **a tap
plays, a hold still pans.**

**2. A finished run never said it was finished.** The preview document reports its playhead to the
timeline strip every frame, and it kept reporting "still running" forever after the motion had
ended - measured four seconds after a 1.34 s entrance. So the strip never returned to idle and the
playhead stayed pinned at the end of the run instead of parking back at the settled entrance.

Route, under a minute: **open any graphic in the editor** (Advanced mode, or a graphic's control
page -> ✎ Edit graphic).

- Move the mouse **over the preview** and tap **Space**: the graphic plays. Tap it again: it plays
  again.
- **Hold** Space over the preview and drag: it still pans the view, and does not play.
- Press **▶ Play** and watch the timeline strip: while the entrance runs the playhead follows it,
  and when the motion ends the playhead settles instead of staying stuck at the far end.

One thing to judge: a tap of Space over the stage now plays even when a button somewhere still has
focus. Over the rest of the editor a focused button keeps Space (it is the button key), but over
the stage the canvas has always taken Space from focused buttons - that was already true for the
pan, and the tap follows the same rule rather than inventing a second one. Say if that feels wrong.

Not fixed, and still open: **the blank editor stage you reported on 2026-08-27.** It still does not
reproduce here. This session walked the exact route you take - Home -> a graphic's card -> control
page -> ✎ Edit graphic - and the graphic was there, full size and fully opaque, every time. That
walk is now a permanent test.

---

## WALKED 2026-08-29 - FAILED. Owner's words, verbatim:

> "the space of the editor still doesn't work. Here's a screenshot of the situation if it helps.
> We can add it to the backlog as an issue which is not resolved. There's something wrong with
> the editor. And it might be something small and silly with the play button, but anyway, we need
> to start working on it at some point."

**The screenshot answered the question this item asked** (white, black or empty): the stage is
**EMPTY** - the transparency checkerboard shows through the whole frame, `Trans` backdrop
selected - while the timeline dock lists real layers (Design, Artwork, Backdrop, Subtitle,
Headline) and Content holds two live field values. So the document parsed and nothing painted.
The graphic is `headline` at **1920x1880**, an unusual canvas height nobody has tested against.

Both faults were treated as ONE issue - a tap that starts a run on a stage that paints nothing is
indistinguishable from a dead key, so "Space is broken" was not assumed to be separate until the
stage painted. **That guess was right, and the cause was found on 2026-09-02**
(`claude/a-play-in-production`): `preview/composeDocument.ts` serialized `runSimCommand` into the
preview document with `.toString()` and bound the two helpers it calls under their SOURCE names.
A production build renames them, so the emitted body called names the document never bound, and
the `ReferenceError` died inside composeDocument's own `try/catch`. Settle, Play, Stop, Next,
scrub and snap were all dead on https://noacg.studio and all fine under `npm run dev` - which is
why the Space fix measured green here and failed on the owner's machine. Fixed, with
`scripts/check-preview-serialization.mjs` in `npm run build` as the gate.

This item stays OPEN for one reason only: **re-walk Space over the stage on the deployed site**
once the fix is live. The 1920x1880 canvas is unexplained and unrelated - it is now
`docs/backlog/editor-canvas-1920x1880.md`.

## Agent attempt 2026-09-04 - the stage is fixed, the KEY could not be settled here

Driven on https://noacg.studio, which is serving `332e8b56`, so the fix is live.

**The half that is settled: the stage paints and the editor's commands run.** Home, the graphic's
card, its control page, then Open this graphic in the editor - and the House Strap is on the
canvas at full size and full opacity, not an empty checkerboard. Press Play and the canvas clears
and the entrance draws in, with the timeline playhead advancing across the Enter block. That is
the 2026-08-27 blank-stage report closed, and the item that carried it was walked and deleted on
the same pass (its commit message holds what was seen).

**The half that could not be settled: whether a TAP of Space over the stage plays.** Space does
reach the canvas - the timeline responds to it with a button focused, which is the rule the item
asks about - but what it started could not be told apart from what the previous press had already
started. The reason is the environment, not the product: the browser pane this session drives is
HIDDEN, so Chromium throttles `requestAnimationFrame` to roughly one frame a second. A 1.34 s
entrance takes minutes, and an entrance and an out are indistinguishable from two screenshots of a
graphic that has barely moved. A probe that waits one second for frames timed out after 45.

So this needs a walk in a browser somebody can see - a minute, and the first person at a real
screen gets it for free. **What to press:** with the graphic settled, put the pointer over the
stage and TAP Space. The entrance should re-run. Then HOLD Space and drag: it should pan and not
play.
