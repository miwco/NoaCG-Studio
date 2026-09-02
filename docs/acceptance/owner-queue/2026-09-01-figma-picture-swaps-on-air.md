---
kind: agent
date: 2026-09-01
---
# A picture you placed in Figma can be swapped on air

Sweep finding 2, and the last exporter shape on the picture road. Figma never writes a plain
picture element: a raster you drop in becomes a shape *filled* with the picture, and until now
the import treated that as artwork nobody could change. A student who draws a scoreboard in
Figma and wants to change the team badge could not.

Route, under a minute: `/app` -> Create -> Import graphic -> drop
`e2e/fixtures/svg-corpus/figma-embedded-raster-card.svg` (a guest card with a portrait square
and two lines beside it) -> Next.

What to look at:

1. **A Pictures section is there at all, and it is called what you called it.** One row, labelled
   **Guest photo** - the name on the square in the design, not the serial number Figma buries
   the picture under. Hover it and the square on the artwork lights up.
2. **It is off, and that is deliberate.** A picture inside a design is usually the design. Tick
   it and it becomes an operator field like any other; leave it and the portrait ships as drawn.
3. **The swap, and the clear.** Tick it, Create project, and in the Content panel put a picture
   in the Guest photo field: the square repaints, and it keeps the rounded corners you drew.
   Clear the field and your own portrait comes back. (That second half was quietly broken for
   *every* imported picture, Illustrator's included - clearing wiped the picture instead of
   restoring it. Worth a click on an Illustrator file too if you have one.)

The same walk on `illustrator-embedded-image-card.svg` is the control - same card, drawn in the
tool that writes the plain shape. Both should behave identically now; if they do not, the
difference is the finding.
