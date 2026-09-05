---
v: 2
source: owner
kind: ask
raised: 2026-09-03
state: unstarted
asked: "Even though I wish that this could just be automated - the testing - and that it would try all the combinations until it works as intended."
---
# Sweep the fit ladder over every combination instead of walking one by hand

**Filed:** 2026-09-03, from the desktop walk of `2026-09-02-text-knows-its-box`.

## Why

He found four bugs in about three minutes of typing into one field, on a graphic that had a green
build, a passing corpus gate and a handoff claiming the behaviour was fixed. Then he said what the
real fix is:

> Even though I wish that this could just be automated - the testing - and that it would try all
> the combinations until it works as intended.

He is right, and the fit ladder is unusually well suited to it. The space is small and finite:
every bound field on a file, times the four ladder options, times a handful of value lengths
(drawn length, one word over, one line over, many lines over, absurd). That is hundreds of cases
per file, which is nothing for a machine and impossible for a person - and every one of them has a
checkable answer that needs no taste: the text is inside its box, the ladder's rungs were spent in
order, and shrink happened only after wrapping ran out.

The existing corpus gate walks each file ONCE, on its default option, at one length. That is why
all four of his bugs sat behind a green gate: none of them is visible at the default length on the
default option.

## What it would take

1. A property the sweep asserts rather than a list of expected values - the ladder's ORDER is the
   invariant (fill, grow where allowed, wrap, shrink last, report), so a case fails when a rung is
   skipped, not when a number changes.
2. Drive it over the real composed document the way `runtimeBench.ts` does, so it measures the
   graphic rather than the code that emits it.
3. Report the failures as a table of file x option x length, so a regression names the case.
4. Keep it out of the per-commit gate if it is slow; a nightly job that names the cases is worth
   more than a fast gate that walks one length.

## Evidence

The four bugs are verbatim in `docs/acceptance/owner-queue/2026-09-02-text-knows-its-box.md`. The
gate that missed them is `e2e/import-svg-corpus.spec.ts`; the per-file expectations it reads are
the sidecars in `e2e/fixtures/svg-corpus/`.
