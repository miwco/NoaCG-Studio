---
source: owner
raised: 2026-08-28
state: unstarted
asked: "if the graphic doesn't have an accent, then it should not offer me to change a palette with an accent... That's a bug."
---
# Style step: palettes must match the graphic, and go a little deeper

Owner walk 2026-08-28. Two parts:

1. **BUG, next-wave core candidate:** a graphic with NO accent still offers accent-swapping
   palettes - picking them changes nothing. "If the graphic doesn't have an accent, then it
   should not offer me to change a palette with an accent... nothing happens in the graphic.
   That's a bug." The palette offer must reflect the elements the design actually declares
   (hasAccent is already in the contract).
2. **Backlog, keep simple:** palette options could be richer and MUST depend on what the
   graphic is built from; later maybe text treatments. "We need to keep this relatively
   simple and not start creating the editor already... I don't want everyone to go to the
   editor." The custom section is liked (typeface change "works really well") - candidates
   there: text outline/border, text color. Small chooseable things, never a second editor.
