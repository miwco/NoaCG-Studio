---
kind: walk-p
date: 2026-09-02
serves: now
---
# The Style step stops offering things it cannot change

**Date:** 2026-09-02 · branch `claude/h-no-dead-controls`

Your two receipts from the 2026-08-28 walk. The palette one you called a bug, and it was: on a
graphic with no accent, three of the fourteen packages built the byte-identical graphic. The
size questionnaire you asked me to explain or remove, and I removed it from the template path.
The reasoning for that is one page you can veto in one read.

## The route, in under a minute

`/app` → **+ New graphic** → **Start from a template**.

1. Search **Frosted Panel**, take it, then click **Style** in the left rail.
2. Look at the packages. There is no accent bar on any swatch, the subtitle says **"neutrals
   only, this design paints no accent"**, and **Orchid** and **Mint** are gone - they differed
   from Frost in nothing this design paints with. Press **Custom**: the rows are Text, Text dim
   and Panel, with no Accent picker.
3. Scroll to the bottom of the step. The **Viewing** section (Watched on / Minimum text size)
   is not there any more.
4. Now go back and take **Frosted Card** instead (same glass family, but it does paint an
   accent). All fourteen packages are offered, every swatch has its accent bar, and the subtitle
   reads as it always did. Nothing was taken away where the control works.

## What to look at

- **The chips, now that the bar shows text instead of an accent.** Nine of the twelve on Frosted
  Panel are still a dark panel with a white bar, and you cannot tell those nine apart by eye.
  They are not dead - each builds a measurably different graphic - but they differ by two or
  three units of 255 and a percent of alpha. Collapsing those too needs a perceptual threshold,
  which is a taste call I did not want to make for you. It is written up as the start of part 2
  in `docs/backlog/style-step-palettes-match-graphic.md`.
- **The removal.** `docs/DESIGN_RULES_PLAN.md` §8 carries the measurement (moving the target from
  TV to Mobile leaves the composed document byte-identical) and the reason I did not instead make
  it warn: 312 of the catalog's designs already warn under the default TV profile, so six of ten
  picks would arrive on the colour step carrying a legibility warning. The setting still exists
  on the AI step, in the editor's Style panel, and the warnings it governs still appear on the
  export panel. If you want it back on the walk, that note says Finish is the right home, not
  Style, and names it as a one-component move.

## What is verified

`npm run build` green on the branch. The palette bug was reproduced in the browser before the
fix by reading the wizard's own composed preview document across a package change (identical
apart from the inert `--accent` line), and the fix verified the same way: all twelve remaining
packages now build twelve different documents. Four new pins in
`e2e/wizard-setup-fields.spec.ts`; `e2e/design-rules-product.spec.ts` moved its wizard-side
legibility pin to the AI step, which is the wizard surface that still asks.

## Not done here

Part 2 of the palette item - richer options, text outline and text colour in the Custom section.
Still backlog, and still bounded by your "keep this relatively simple and not start creating the
editor already".

---

## Owner ruling, 2026-09-03 (walked on his phone)

Asked whether the nine look-alike chips on Frosted Panel should be collapsed too: **"Collaps
them."**

Part 2's perceptual-threshold half is authorized. The richer-options half (text outline, text
colour) is not, and stays where it was. He asked for the measured count per design before it
ships. The prompt is row B in `docs/handoffs/2026-09-03-next-wave-svg-and-style-rulings.md`.

**This item stays open until that work lands.**
