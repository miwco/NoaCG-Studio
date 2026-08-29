---
kind: walk
date: 2026-08-29
---
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

Both faults are now treated as ONE open issue, written up with all the evidence in
**`docs/backlog/editor-blank-stage.md`** - a tap that starts a run on a stage that paints
nothing is indistinguishable from a dead key, so "Space is broken" is not assumed to be separate
until the stage paints. This item stays OPEN until that issue is fixed and re-walked.
