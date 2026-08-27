# The control-panel road plan - three decisions

**Date:** 2026-08-27

**What changed:** a decision-ready plan for how a user's own graphic gets its control panel and
playout behaviour - through the NoaCG CLI and through the SVG-import wizard. It builds nothing;
it exists because you asked that we understand what we are building before we build it.

**Route (under a minute):** open `docs/CONTROL_PANEL_ROAD.md`, read the last section first
("The decisions asked of the owner" - three questions), then the section behind whichever
question needs the reasoning.

**What to look at:** the three decisions -

1. Bless agent-authored machines under three named conditions (validate, inspect shown to the
   user, every event walked in the bench) - or keep the agent door type-only?
2. The wizard's behaviour step: offer only behaviours the artwork can carry, default to none,
   give "what I want doesn't exist" an honest exit?
3. Per-type playout intent as a short operator story, proven by driving the generated panel in
   cloud, dashboard and offline export - credits roll first?
