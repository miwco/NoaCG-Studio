# The quiz-states design picture - your imported-board finding, answered

**Date:** 2026-09-01. **Branch:** claude/c-svg-state-workflow.

**What changed.** Your "pressed the quiz controls and nothing happened" import is now a design
picture: `docs/SVG_STATES_FROM_ARTWORK.md`. Both corpus quiz boards were driven end to end
first - the finding reproduces exactly, and the fix is one missing rung, not a new system.

**The route, under a minute:**

1. Open `docs/design/svg-states/moment-ladder.html` in a browser. Press Select / Lock / Reveal
   on rung 0 (today), then on rung 1 (the recommended default treatment), then rung 2 (mixed
   with drawn layers). That is the whole argument, felt.
2. Skim §3 and §7 of `docs/SVG_STATES_FROM_ARTWORK.md` (the recommendation and your decisions).
   `docs/design/svg-states/assign-step.html` shows the wizard moment if you want it.

**What to look at.** Whether the ladder is right: your three routes (default overlays, wizard-
assigned layers, layer naming) as rungs of one thing, with a platform default look under every
moment nobody drew - so an untouched export is generic-but-alive instead of silent, and a drawn
layer still replaces the default per moment.

**The decision is yours (doc §7):** ratify the ladder; accept one neutral default look with no
knobs; and rule on the vocabulary (the UI says PICKED/RIGHT/WRONG, the naming shortcut wants
"selected"/"correct" - our own fixture's "A picked" defeats it). P2 stays in DESIGN; nothing
here is scheduled or built.
