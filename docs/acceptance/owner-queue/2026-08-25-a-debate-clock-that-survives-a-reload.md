---
kind: walk
date: 2026-08-25
---
# A debate clock that survives a reload

(2026-08-25). The speaking-timer board (dc01) carries an origin stamp on whichever clock is
running, so a renderer that reboots mid-speech comes back at the real remaining time instead of
the allowance the cue stores. Verified by spec and by mutation; never watched by a person.

Route, about a minute: publish a production with the **dc01 debate board**, open its `/output`
URL, press **Switch** to give the floor to one side, wait long enough to be able to read the
difference (twenty seconds is plenty), then reload the output page.

What to look at: the clock that was running comes back where it should be — not reset to the
allowance, not jumped forward by the reload — and the other side's clock is still banked at the
value it stopped on. The floor indicator points at the same speaker.
