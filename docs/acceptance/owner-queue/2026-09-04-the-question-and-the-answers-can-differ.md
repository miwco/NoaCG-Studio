---
kind: walk
date: 2026-09-04
serves: now
---
# The question and the answers can behave differently, and the step is shorter

Two of your 2026-09-03 quiz-board findings, plus the reading-length complaint that came with
them. Findings 5 and 6 from `2026-09-02-text-knows-its-box.md`.

**Route, under a minute:** `/app` -> **Import graphic** -> drop
`e2e/fixtures/svg-corpus/illustrator-owner-quiz-board-rotated.svg` -> **Next**.

## What to look at

1. **The behaviour opens with four answers.** In **What it does**, pick **Quiz**. It says
   *4 answers* and all four are already bound to your four answer layers, with the question on
   its own. It used to say two and leave you to add the rest. Your board draws five text boxes,
   one of them the question, so four is what it should have said all along.

2. **One part of the graphic can answer the too-long question on its own.** Under
   **When the text is too long** there is now a line reading *Give one part of the graphic its
   own answer*. Open it and there is a row per plate: the question's, and one per answer plate.
   Leave them on **Same as above** and nothing changes. Set the question's to
   **The panel gets wider**, type a long question, and the question plate widens while the four
   answer plates hold the width you drew.

   That is the answer to *"What if you want it to react differently between the question and the
   answer?"* The dropdown at the top is still the whole control if you do not care - the list is
   closed when you arrive, and a graphic with one plate under all its text never shows the line
   at all.

3. **The explanations are shorter.** Press the ⓘ beside **When the text is too long**. Three
   short lines, where it used to be four paragraphs about banners, boards, margins and last
   resorts. The ⓘ beside **What it does** is two lines, and no longer reads the three behaviours
   out loud when the list below it already names them one line each.

## What to be picky about, because it is taste and not a gate

**The row labels.** A row is named by the text layers sitting on that plate, so on your board
they read *Question*, *Text 2*, *Text 3*, *Text 4*, *Text 5* - the field names the step gave
them. Rename a field and the row follows. If you would rather see the plate's own name ("q bg",
"a1 bg"), say so and it is one line.

**One row per PLATE, not per field.** Two lines drawn on the same plate share a row and share an
answer, because a rectangle cannot grow two ways at once for the two lines inside it. On your
board every text has its own plate, so it reads as one row per answer. On a board where two
lines share a plate you will see both names on one row, which is the honest version of it.

**The wording of the line itself.** *"Give one part of the graphic its own answer"* is the best
I had. *Part* is vague on purpose - the thing it governs is the plate, and *plate* is our word,
not yours.

## Not built, deliberately

The choice governs a PLATE. It cannot make one line on a plate wrap while another on the same
plate shrinks, because growth is something the rectangle does for everything inside it. If you
ever want that, the two lines need two plates in the artwork.

Branch `claude/j-fields-step-per-field`. Build green; the four covering import specs (104 tests)
pass, including three new ones for the answer count, the per-plate override and the step's
reading length.
