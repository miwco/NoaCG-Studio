---
v: 1
source: owner
raised: 2026-08-28
state: unstarted
asked: "it flashes some other screen underneath... It's a small visual thing, but we need to fix it. It's very annoying."
---
# Route transitions flash the underlying screen

Owner walk 2026-08-28, verbatim: going to the Playout client *"flashes the canvas editor in
the background. This is the same effect when I go from the landing page to the Wizard: it
flashes some other screen underneath... It's a small visual thing, but we need to fix it.
It's very annoying."* Two named routes: editor -> playout, landing -> wizard. Likely a mount/
z-order or route-swap ordering defect in the shell - reproduce on both routes, find the one
cause, fix everywhere. Next-wave candidate (owner annoyance, small).
