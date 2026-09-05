---
v: 1
source: owner
raised: 2026-09-05
state: unstarted
asked: "it should be very simple: what it does, and it always works... when I just mess around and
  change a lot of things, it breaks. And it should be allowed to test and try to mess with it, and
  it shouldn't break. This is a good test, and this wizard step doesn't pass it yet."
---
# The wizard's text step does not survive being played with

Owner, 2026-09-05, after importing the sample quiz board and working the text-fit controls for a
while. Verbatim, the part that is the standard rather than the symptom:

> At this stage I can change how the text should react, but nothing happens in the preview, so it
> breaks down after I work with this for a longer time. It's somehow kind of fragile, this whole
> wizard step, and it shouldn't be like that. It should be very simple: what it does, and it always
> works, right? Still, I think that when I just mess around and change a lot of things, it breaks.
> And it should be allowed to test and try to mess with it, and it shouldn't break. This is a good
> test, and this wizard step doesn't pass it yet.

**This is an acceptance test, not a bug report**, and it is the one that matters: a student will do
exactly what he did. The two symptoms he named are evidence, and fixing only them would miss it.

## The two symptoms he could name

1. **A control stops moving the preview.** He changes how the text should react and nothing happens
   on screen. It works early in a session and stops after enough changes, which points at state
   that accumulates across changes rather than at any one control being wrong.
2. **The panel stopped growing on a second attempt.** *"now, on my second try, I don't even get the
   box to become taller with more rows. It made two rows and no more."* Same file, same controls, a
   different answer the second time - which is the shape of a fit whose starting point is the
   previous pass rather than the artwork at rest. `svg.ts` already carries that hazard's twin in
   its own comment ("THE ROOM IS THE DESIGN'S, NEVER THE LAST PASS'S"), and
   `docs/backlog/wizard-text-fit-is-order-dependent.md` is the same family.

## Where to start

Not with a fix. **Reproduce it as he did it**: import `docs/svg-samples/quiz-board.svg`, then work
the text controls the way somebody exploring would - every growth option, back and forth, long
values and short ones, the behaviour attached and removed - and find the sequence after which a
control stops answering. `e2e/wizard-entry-fit.spec.ts` and `e2e/stage-fit-determinism.spec.ts` are
the existing ground; what is missing is a spec that does something LONG and disorderly rather than
one clean pass, which is the only kind of test that could have caught this.

The determinism rule it should end up pinning: the same file plus the same settings gives the same
result, whatever route was taken to those settings. That is testable without any judgement about
what the right typography is.
