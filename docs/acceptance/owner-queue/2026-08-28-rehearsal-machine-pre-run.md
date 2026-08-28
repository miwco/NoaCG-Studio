---
kind: change
date: 2026-08-28
---
# The rehearsal, pre-run by machine: what a student hits before you walk it

Your walk (`2026-08-28-student-rehearsal-walk.md`) is still the acceptance. This is what a machine
found walking the same road first, on artwork drawn the way a student draws it - an Illustrator
export with the dialog untouched, layers named for the drawing, none of our naming conventions
honoured - so your 30 minutes are spent on judgement rather than on defects.

**Route (2 minutes):** `/app` -> New graphic -> **Import graphic** -> drop
`e2e/fixtures/svg-corpus/student-illustrator-scoreboard.svg`, press Next.

**What to look at:**

1. **The door says 5 text layers, not 6.** The student's goal flash is switched off in the layers
   panel and its MAALI! is no longer offered as a field. Your finding was that only "quiz" was
   offered on a scoreboard - that half is unchanged and correct (a scoreboard needs no behaviour),
   but the words were lying about it.
2. **"What it does" now reads "2 numbers, each with + and −"**, and the no-behaviour option reads
   "Nothing extra. The number layers already get + and −." The question to answer: does that make
   it obvious your scores are already drivable, or does the section still read as "there is no
   scoreboard here"?
3. **Then drop `student-illustrator-quiz.svg`** and pick Quiz. Nothing is filled in - the
   student's layers are called "Option 1" and "Pick 1", which our accelerator does not recognise -
   so the whole binding is made by hand from the pickers. It takes about fifteen clicks. The
   question: is that acceptable for a student, or does the naming convention need to be TAUGHT
   somewhere they will actually meet it?
4. **Pick Quiz and then untick one answer's row.** An amber line names what is missing instead of
   the behaviour vanishing silently.

**Two things that are NOT fixed, and are your call, not ours:**

- **An imported scoreboard has no Goal press.** The student drew a goal flash and there is nowhere
  to bind it: the only behaviour on this road is the quiz. A catalog scoreboard's Goal bumps the
  score and shows the flag in one press; on somebody else's artwork it cannot.
- **A direct reveal is not reachable** - the quiz's arc is lock-then-reveal, and Reveal greys until
  the lock. That is the exact alternative `docs/GOALS.md` names as the open question.

Both are the "third behaviour" question in `docs/GRAPHIC_BEHAVIOUR_PLAN.md` §6, now asked by a real
drawing rather than by a plan.
