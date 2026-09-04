---
kind: walk
date: 2026-09-04
serves: now
---
# The fit cannot be knocked out of shape by anything you do first

Your 2026-09-04 walk: *"when I removed the text and tried adding it again, it bugged out again, so
the text became small ... after switching around a few times from nothing to a quiz table, it got
it right again."* You were right that this was not a layout bug. It was a measurement.

**Route, under a minute:** `/app` -> **Import graphic** -> drop
`e2e/fixtures/svg-corpus/illustrator-owner-quiz-board-rotated.svg` -> **Next**. Type a long
question into the question row's **Text** box. Now try to break it, deliberately and in any order:
attach the **quiz** behaviour, clear the question and type it again, take the behaviour off, put
it back, retype the same words on top of themselves. Watch the question every time.

## What to look at

1. **Nothing you do first changes the answer.** Same words, same board: same size, same number of
   lines, same block, every time and in any order. That is now a gate rather than a hope - the
   spec asserts after each single step instead of setting everything up and asking once at the
   end, which is how the old ones stayed green through all of this.
2. **A graphic that loads out of sight comes out right too.** This is the one that was actually
   broken, and it is the half you cannot see from the wizard. When a graphic's document is built
   while it is not on screen - which is what a playout renderer does when it preloads, and what
   the control page does with its monitors while you are on another workspace - it used to measure
   nothing, record the nothing as its answer, and never be able to ask again. Your question then
   painted at its full drawn size on ONE line, straight across the board. Measured on your own
   board: 2018 px of text on one line where the same document on screen gives 796 px on three.

## What is not fixed, and what I could not reproduce

- **I could not reproduce the wizard being order-dependent by itself.** Six readings across four
  interaction orders on your board came back byte-identical before I changed anything. The
  hypothesis that the fit only recomputed when the BEHAVIOUR changed is dead - it recomputes on
  both. So the mechanism above is what I fixed, and I am not claiming it is every symptom you met.
- **I could not reproduce PREVIEW and PROGRAM disagreeing.** You saw the question large and
  correct in preview and small on air in the same instant. On this machine, offline, the two panes
  return identical numbers for the same question. The measurement bug above is the best candidate
  I have for it, because it is exactly a "same data, different surface" failure - but that is a
  candidate, not a diagnosis.
- **The answer text spilling out of its tan tags** is a separate defect and is untouched here.

**The most useful thing you could send back** is whether the on-air question is still wrong after
this lands, and if it is, which surface you were looking at and what you had clicked before.
Branch `claude/c-fit-recompute-order`.
