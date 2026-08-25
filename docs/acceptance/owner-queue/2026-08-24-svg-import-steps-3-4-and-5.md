---
kind: walk
date: 2026-08-24
---
# SVG import steps 3, 4 and 5

`b41533bf`, `80b9185e`, `7af9ca7b` (2026-08-24/25). One
fitting system, draw a field on the canvas, versioned `NOACG_LAYOUT` with vertical growth.
**None of the three has been seen** - the Browser pane would not composite during the build
sessions. Route: `/app` -> Create -> Import graphic, bring in any SVG, add a field on the
canvas, then type past the box and watch it grow. What to look at: whether growth happens
where you expect it, and whether the field you drew lands where you drew it.
**Updated 2026-08-25**: a box drawn before the artwork had been measured used to be thrown
away silently - the marquee vanished on release and no field appeared, with no error anywhere.
The drop is now held and placed as soon as the artwork reports its box.
Worth one deliberate try: arm '+ Draw a field on the artwork' and drag IMMEDIATELY, without
waiting for the preview to settle. The field should still land where you dragged.
