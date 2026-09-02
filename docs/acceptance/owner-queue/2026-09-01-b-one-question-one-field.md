---
kind: agent
date: 2026-09-01
---
# One question is one field, and an Inkscape design keeps its type

**Date:** 2026-09-01. Branch `claude/b-svg-one-field-per-item`.

## What changed

You imported `e2e/fixtures/svg-corpus/illustrator-quiz-board-multiline.svg` and got three question
fields, one per visual line. A text object you pressed Return inside is now ONE field, and NoaCG
wraps it into the room the design drew. Two labels placed apart on one baseline are still two
fields, and two separate text objects are still two fields whatever they look like - that rule is
stated in `docs/SVG_AUTHORING.md` section 3 with its condition.

Three sample files were drawing a paragraph as one layer PER LINE, which is the shape the page now
tells designers not to draw: `audience.svg`, `info-card.svg` and `public-info.svg` each lost that
split and now offer one field for the whole thing.

Two things found while verifying the fix, both real and both now fixed:

- an **Inkscape** design lost its entire typography the moment the editor parked it - three layers
  drawn at 56, 30 and 22px all painting at the browser's default 16 in the fallback face, because
  Inkscape keeps every declaration inline and a graphic resets by clearing its inline styles;
- and `xml:space="preserve"`, which Inkscape writes on every text it saves, made the emitted
  template's own indentation into text the fit ladder measured, so a lower third grew its panel to
  the cap and shrank its name to the floor before anybody typed anything.

## The route, in under a minute

1. `/app` -> **New graphic** -> **Import graphic**.
2. Drop `e2e/fixtures/svg-corpus/illustrator-quiz-board-multiline.svg`.
3. On the Fields step: **five rows**, one of them "Question" holding the whole question.
4. **Create project.** Look at the board.
5. Then start again and drop `e2e/fixtures/svg-corpus/inkscape-lower-third-layers.svg`.

## What to look at

- **Step 3.** One Question row, not three. Its value is the whole question, with the line break the
  designer typed read as a space.
- **Step 4.** The question fills the card rather than sitting in a narrow column with the card
  empty beside it, and it is at the size the designer set - it should not have shrunk. Type a
  longer question into the Question field and watch it re-wrap.
- **Step 5.** The lower third should look like a lower third: a big bold white name, a grey role
  under it, a small spaced-out strap under that. Before this it was three lines of identical
  16px text in the wrong face, and the dark panel behind them was stretched to four times the
  height it was drawn at.

## What is NOT done

The mapping step still offers no way to JOIN two separate text objects into one field, which is
the other half of the same question - a designer who did draw a paragraph as three layers has to
go back to their design app. Recorded in the handoff with a recommendation, not built.
