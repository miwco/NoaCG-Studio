---
kind: walk
date: 2026-08-29
---
# The output readout only appears when there is an output

On the morning walk you read **"○ output not seen lately"** on a production's header with no
browser output configured anywhere, and it sounded like something had gone wrong. It had not:
that line is the browser-output renderer's heartbeat, and it was being asked on every published
production whether or not anybody wanted an output. Publishing mints the output URL either way,
so the URL's existence could never answer "is there an output here".

**Now it is asked only when there is something to ask about**: the operator has taken the output
URL for this production (copied the link, or downloaded the SPX/CasparCG template file), or a
renderer has reported in at some point. Otherwise the header says nothing about an output.

The words changed too, and each state has a hover that says what to do:

- **● output connected** - a browser source is loading the URL and reporting in.
- **○ output not answering** - it was loading, but nothing has reported in for over a minute.
  Hover: check the browser source (OBS, vMix, CasparCG) is still open on it.
- **○ output not loaded yet** - you took the URL, nobody has opened it. Hover says so.

Route, under a minute: **Home -> Productions -> open a show**, and look at the header.

- Unpublished: no output line at all (the ● NOT PUBLISHED chip already says everything).
- Published, output URL never taken: still no output line.
- Open **Links**, copy the **output URL** - the line appears, reading *output not loaded yet*.
  Hover it and read the sentence.
- Load that URL in a browser tab (or your browser source) and the line goes to
  **● output connected** within a few seconds. Close it, wait a minute, and it reads
  *output not answering*.

While you are on that header: the **+ New graphic** button has moved to the left, right after
the logo - that is the separate item
`2026-08-27-new-graphic-from-every-surface.md`, whose route ends on this same screen.

One thing to judge: unpublishing a production forgets that the output was ever set up, on
purpose - a re-publish mints a NEW slug, so the browser source pointed at the old URL will never
report in again and a heartbeat about it would be a lie. If you would rather it kept saying
something after an unpublish, say so.
