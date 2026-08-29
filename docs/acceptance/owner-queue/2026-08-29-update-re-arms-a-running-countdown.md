---
kind: walk
date: 2026-08-29
---
# Update now re-arms a running countdown

You found this on the morning walk: with the **Doors Open** countdown on air, changing the
minutes and pressing **Update** did nothing. The clock read its length once, when it started,
and ignored every value after that - so the only way to correct a countdown was to take the
graphic out and back in, which is the one thing you cannot do to a screen the audience is
watching.

**The decision, and why.** A countdown's length is DATA, not a state. `update()` writes fields
and never causes a transition (`docs/STATE_MACHINE_SCHEMA.md`), and re-deriving the clock is not
a transition: the graphic stays in exactly the state it was in and repaints a number, the same
way a name field repaints a name. The idle preview already did this - the bug was a `!clockTimer`
gate around it, which is an accident rather than a design. The match clock and the debate clock
have always re-derived on the wire; the countdown now agrees with them.

**The safety.** The clock re-arms **only when its own fields changed**. An Update that carries a
new headline and the same duration leaves the count exactly where it is - that is asserted in
both directions in `e2e/holding-pack.spec.ts`, because the opposite failure (every text
correction restarting the clock) would be far worse on air than the bug being fixed.

Route, about a minute:

1. Open the production with the **Doors Open** countdown and take it on air.
2. Watch it count. Change **Countdown (minutes)** to something short and press **Update**.
   The clock jumps to the new length and keeps counting, with no re-take.
3. Now change the headline text only and press **Update** again. The count must NOT restart.
4. Optional, the same fact from the other side: fill in **Start time (HH:MM)** while it is
   running - the clock switches to counting to that wall-clock time.

What to look at: the graphic itself must not move at any point - no re-entrance, no flicker.
Only the digits change. If the countdown reaches zero and you then set a new length, the
"time's up" styling clears but the clock waits for the next Take rather than starting itself.

This holds identically in the editor preview, an exported overlay, the dashboard and under SPX,
because the fix is in the emitted template runtime (`src/templates/shared/clock.ts`), not in any
one surface. It covers every starting-soon countdown, every game timer, and a countdown bound
from an imported SVG.
