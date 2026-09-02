---
kind: walk
date: 2026-09-02
---
# Opening the studio no longer flashes the canvas editor on its way somewhere else

**What you said (2026-08-28).** "Going to the Playout client flashes the canvas editor in the
background. This is the same effect when I go from the landing page to the Wizard: it flashes some
other screen underneath... It's a small visual thing, but we need to fix it. It's very annoying."

**What it was.** One cause, in `src/App.tsx`. The app decided which surface a page load lands on
inside a `useEffect`, and an effect runs *after* the first frame has already been painted. So the
first render drew whatever the raw URL said - a bare `/app` still parses as the editor - the
browser painted the whole canvas editor, and only then did the app rewrite the route to Home. The
same one-frame gap put the startup wizard over a production page opened by link.

**What it is now.** The landing surface is decided at module load, before React's first render, so
the first frame is already the right one. There is no second frame to correct.

## See it in under a minute

1. Open the studio at `/app` (just the plain address, no `#` on the end) in a browser where you
   have made something before. It should go straight to Home - no flash of the canvas editor.
2. Open a production's page from a bookmark or a fresh tab (`/app#/production/<id>`, or just paste
   the URL you get when you are on a production). It should show the production immediately - the
   creation wizard must never appear over it first.
3. Reload each of those a few times. A one-frame flash is easiest to catch on a reload, so if it
   were still there this is where you would see it.

**Worth knowing it is not fixed.** Two things I measured and left alone, both written up:

- Moving between screens *inside* the app (editor to a production, Home to the wizard) was already
  clean before this change - I measured it at 6x slowed-down CPU and the swap happens in a single
  frame. If it still feels wrong to you when you walk it, that is a different problem from the one
  I fixed, and I want to know.
- Opening the wizard on a *deep link to a named step* (a template page's "use this design" link)
  still shows the wizard's first page for one frame before jumping to the right step. Same kind of
  mistake, different file - filed as `docs/backlog/wizard-step-deep-link-flash.md`.
