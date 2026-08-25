---
kind: walk
date: 2026-08-26
---
# Speed: your hypothesis tested, and the knob widened

Goal 6. Your hypothesis was *"is it actually like that I need to have an ease on the animation
to be able to adjust the speed?"* — measured 2026-08-26, it was half right:

- The knob was never broken. The emitted data carried it and the runtime genuinely time-scaled:
  a slide entrance ran 1.07 / 0.80 / 0.53 s across Slower / Normal / Faster.
- What failed is perception: two replays of a smooth entrance, seconds apart, are compared from
  memory — and a ±33% step is below what anyone notices there. Bounce showed the difference
  because its bounce COUNT changes: a rhythm, not a duration.

So the buttons stay (they were working) and now write **0.6 / 1 / 1.8** — the same entrance
spans ≈ 1.33 / 0.80 / 0.44 s, which is unmistakable even at the default ease. The same steps
landed on the saved graphic's control page and the AI panel; the timeline's Advanced select
offers both old and new values.

Route, under a minute: `/app` -> Create -> any category -> Animation step -> click Slower, then
Faster, at the default (Auto) easing. What to look at: whether you can now SEE the difference
without picking bounce first. If you still cannot, the next honest move is the one you named —
"we can't show buttons if they're not working" — and the button goes.
