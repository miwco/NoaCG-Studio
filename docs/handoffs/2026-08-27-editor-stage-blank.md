# Handoff - the editor stage shows NO GRAPHIC when you open one

For an orchestrator run to pick up. Owner-reported 2026-08-27, not reproduced here - the negative
results below matter as much as the positive ones.

---

## The report

> *"There is no graphic when I open it up... the problem is that I can't see any graphic at all."*

He first read this as a broken play button. It is not the play button - it is that **the stage is
already empty before he presses anything**. Opening a graphic in the editor should never show an
empty canvas: the design view settles the graphic after every rebuild precisely so that "the canvas
is never blank" and dragging always has something to grab (`PlayoutSimulator.tsx`, its own doc
comment).

So: **the graphic is invisible on his screen from the moment the editor opens.** That is the bug to
find.

## What was measured, and what it rules out

All on `claude/n-wizard-anywhere` at `5abb89e1`, Playwright/Chromium, a seeded catalog lower third.

**The play path is healthy - do not start there.**

- Every Play press starts a real run: the preview document reports `active=true phase=in` with
  `runId` incrementing 1, 2, 3. The FIRST press included.
- Opacity on `.lower-third` goes 0 -> 1 over about 120 ms; the whole entrance is 1.34 s.
- Stop animates out over ~800 ms. Next behaves.
- `previewError` is `null`; no page errors, no console errors.

**A graphic opened by deep link is VISIBLE, not blank.** At `/app#/graphic/<id>`, 3.5 s after load:

    iframeBox=618x348  previewError=none
    bodyChildren=1 :: DIV.lower-third op=1 vis=visible disp=block rect=477x147

A settled, visible graphic filling most of the frame. So either the deep-link route is not the
broken one, or the fault needs something this environment does not have.

## Two findings that came out of the same session

Both are real; neither explains a blank stage on its own. Worth fixing regardless.

**1. Space over the stage is silently swallowed.** `src/components/spaceKey.ts` hands Space to the
canvas PAN whenever the canvas is the active surface and the pointer is over the preview. A pan
needs a DRAG, so a plain tap of Space there does nothing at all - no run, no feedback. Measured:
pointer over the timeline strip, `runId` increments; pointer over the preview, no playhead frames
at all. The preview is exactly where somebody is looking when they reach for play, so it reads as a
dead key. Decide what a TAP (as opposed to a hold) of Space over the stage should do.

**2. A finished run is never reported as finished.** `window.__activeTl` is cleared only by
`killAllTimelines` - that is, by the NEXT play or stop, never on completion
(`src/preview/simulatorRuntime.ts`, the `sim-play` branch). Measured 4 s after the entrance had
ended, the document was still pushing this every frame:

    active=true phase=in t=1.34 dur=1.34 run=1

So `StepTimeline`'s live-follow never returns to idle, and the branch that parks the playhead back
at the settled entrance end (`src/components/timeline/StepTimeline.tsx`, the playhead message
handler) is dead after the first play - the playhead sits pinned at the run's end. The fix is
small: release `__activeTl` on the timeline's own completion.

## Where to look next

The environment difference is the whole question: visible under Playwright, blank on his screen.
Candidates, cheapest first.

1. **Ask for the graphic.** Which one, and does it also come up blank in the WIZARD's live preview
   and on its control page? The control page settles the same document through a different surface,
   so "blank in the editor, fine on the control page" and "blank everywhere" point at completely
   different halves of the stack.
2. **Colour scheme.** `styles.css` `:root` declares `color-scheme: dark` and `composeDocument`
   injects the matching `<meta name="color-scheme" content="dark">` into the srcdoc. The root
   `AGENTS.md` lists it as a gotcha: Chromium paints the iframe OPAQUE when the two disagree,
   giving a white stage. A graphic drawn in white on transparent would then be invisible rather
   than absent. Establish what his stage actually is - white, black, or empty - because those are
   three different faults.
3. **Zoom and pan.** `PreviewFrame` translates the `.canvas-world` by `pan` and scales it by
   fit x `zoom`, both persisted. A stale pan can park the frame off-screen: the graphic is present
   in the DOM and invisible on the display. Ask him to press the `%` readout, which resets to fit.
4. **A saved graphic with ASSETS.** Every probe here used a freshly created catalog template - no
   uploads, no picked Google family. A record whose assets did not rehydrate is a plausible blank,
   and it is the one shape this session never tested.
5. **The route he actually takes.** In the default studio a saved graphic opens onto its CONTROL
   page, and the editor is reached from there via the Edit graphic button. This session could not
   walk that route end to end: the seeded record did not appear on Home's graphics shelf, most
   likely because the seed called `model/library.ts` directly instead of going through the store,
   but that was not chased down. Walk it as a person does, from Home.

## Reproducing cheaply

A scratch spec under `e2e/` (deleted, never committed) did all of the above. The shape that worked:
seed a graphic with `createGraphic`, `goto('/app#/graphic/<id>')`, then read the preview through
`page.frameLocator('iframe.preview-frame')` - and for anything about PLAY, listen for the
document's own `spx-preview-playhead` messages rather than sampling pixels. The entrance's opacity
ramp is ~120 ms, and a polled probe misses it: that is how this session first talked itself into
believing the button was dead.

**Do not judge motion through a Browser-pane tab that is not displayed.** A hidden pane pauses
`requestAnimationFrame` for the whole tab, so the playhead loop posts nothing and GSAP never
advances. Play looks dead and is not.
