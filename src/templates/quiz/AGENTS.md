# src/templates/quiz - the answer boards

Loaded alongside the root `AGENTS.md` and `src/templates/AGENTS.md` when working in this
directory (Claude reads it via this directory's `CLAUDE.md` import; Codex reads it directly).
Keep it accurate.

Split out of `src/templates/AGENTS.md` on 2026-08-22, which keeps the catalog-wide rules and
the category index. Add a RULE here; leave the reasoning in the code's own comments.

## quiz/ - qz01…qz12

qz01…qz12 (prefix 'quiz'; f0 question, f1…fn options, hidden correct-answer and
selected-answer dropdowns after them).

DATA BLOCKS via convertToDataRegion + a refinement (docs/TIMELINE_V2_PLAN.md §3c): the
Continue reveal is a real middle step that CALLS revealAnswer() (adds
.quiz-correct/.quiz-dim + pops the winner;
update() clears the reveal). Each answer ROW carries `quiz-option` (the shared look) AND
`quiz-option-N` (its own animation identity) - the entrance staggers them, and a stagger
lives in the keyframe model as per-row start times, which one class matching several elements
cannot carry. The numbered rows are registry parts, labelled by their field ("Answer B").
**The ROW COUNT is a parameter** (`QuizContent.answers.length` - 2, 3 or 4): a true/false
board, a three-way and the classic four-answer board are the same graphic with a different
number of rows, so the letter alphabet, the two hidden field ids and the preset's row list all
derive from it, and n = 4 derives exactly the strings the four-answer board always emitted
(byte identity, pinned by the catalog baseline). `assertRowsMatchAnswers` throws when a design
draws the wrong number of rows - the one thing the assembler cannot derive from the design, and
silent in every other check. All three boards share ONE machine (types/answerBoard.ts): because
the pick is DATA, halving the rows changes no state at all.
