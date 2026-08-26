---
kind: walk
date: 2026-08-26
---
# Fade: the verdict, and what was actually lying

You reported that on a fade, speed and easing both do nothing — while slide, pop, zoom, blur,
wipe and stagger all showed speed correctly. Measured before touching anything, and the honest
answer is that **both controls work on a fade** and the surface you judged them on did not.

What the measurement says:

- The emitted data carries the speed: 0.6 / 1 / 1.8, same as every other motion.
- The BUILT entrance timeline measures 1.333 / 0.800 / 0.444 s. Identical to a slide's.
- The four curves offered on a fade produce four different opacity ramps — at the halfway point
  of the entrance: Soft 0.71, Smooth 0.88, Sharp 0.98, Steady 0.50. Not subtle in the numbers.

What was lying: the wizard's preview loop. It took the graphic off at 1700 ms and put it back at
2800 ms **no matter what the animation did** — so every speed setting played inside one fixed
2.8-second beat. Worse, the faster the setting the LONGER the graphic then sat still: 367 ms of
hold at Slower against 1256 ms at Faster. The cadence moved the opposite way to the knob.

A slide survived that because travel is a second cue — you can see a distance covered in a time.
A fade has no second cue, which is exactly why it was the one that read as broken. It is also why
you saw Slide-at-Auto hide it too: `power3.out` puts most of its travel in the first third.

The loop now runs on the template's own durations, so a Slower cycle is visibly longer than a
Faster one. Mutation-tested: with the old fixed pair put back, the new test goes red.

**So I did not stand the buttons down for fade.** Your rule — *"we can't show buttons if they're
not working"* — does not fire here, because they were working; the preview was the fault. If you
still cannot see it after this, that is a different verdict and the buttons should go.

Route, under a minute: `/app` -> Create -> any lower third -> Animation step -> pick **Fade** ->
click **Slower**, watch two loops, click **Faster**, watch two loops. What to look at: whether the
whole rhythm (on, hold, off, back) is now obviously slower on Slower — not just the dissolve.
