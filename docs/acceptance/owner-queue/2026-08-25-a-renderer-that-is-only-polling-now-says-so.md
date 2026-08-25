---
kind: walk
date: 2026-08-25
---
# A renderer that is only polling now SAYS so

(2026-08-25). Two on-air holes closed; only
the second has anything to look at. Route: open a production's browser-output URL with
`&debug=1` and read the `realtime:` line on the overlay. It should say `following
(SUBSCRIBED)` on a healthy box. What to look at: whether that line is legible against a
transparent stage and whether `NOT JOINED — polling every 30 s` would actually catch your
eye during a setup - it is the only warning a production running on a 30 s delay ever gets,
and the alternative it replaces was silence. The 30 s floor itself is a cost decision
(docs/CLOUD_PLAYOUT.md §3); say if you want it tighter for the 2026-09-12 show.
