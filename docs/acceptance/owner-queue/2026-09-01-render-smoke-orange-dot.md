# The render smoke's image check now proves something (2026-09-01)

**What changed.** `scripts/render-smoke.mjs` used to say PASS as long as the render jobs
finished. Its image fixture had been a malformed PNG that every reader in the chain drew
leniently, so the "a user's picture reaches the rendered frame" leg had been green while proving
nothing. It now renders a still and reads the actual pixels, and a free test in `npm run build`
checks the fixture's bytes on every commit.

Two real defects turned up on the way:

- The smoke was RED at its first job on `main` — a hardcoded 2 s total against a design whose
  animation had grown to 2.1 s — so nothing after it had been running at all. The duration is
  now derived from the measurement.
- `preview_start` starts the dev server in the MAIN checkout when a session is working in a
  worktree. Nothing broke here, but that is how a green gate lands on the wrong tree.

**The answer to the question that started this: yes, the orange dot arrives.**

## The route, under a minute

Look at the archived frame — no build, no render, no terminal:

    C:\claude\render-smoke-evidence-2026-09-01\orange-dot-still.png

Open it in any image viewer.

## What to look at

A 1280x720 dark frame with **FIELDS OK f20** in white, a **blue** bar under it, and — the point
of the whole thing — a small **orange square** below the bar, dead centre. That square is the
2x2 orange PNG the manifest carried, drawn 48x48. Measured, not eyeballed: 2304 of 2304 pixels
at `#bc8120` in a 48x48 block at (616,417).

The bar is blue on purpose. It used to be the same orange as the dot, which made "is that the
image or just the bar?" un-answerable by a machine.

Beside it, `render-smoke.log` is the run that produced the frame.

Nothing to approve — this is a "does the evidence convince you" look.
