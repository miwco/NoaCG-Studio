---
kind: walk-p
date: 2026-09-05
---
# The docs now answer "how do you make it in Illustrator so it understands it's a livevote?"

You asked that on 2026-09-03, walking the live vote. No page answered it. The rules lived only
inside the detector, which is not a thing a designer can read.

## The route, in under a minute

Open <https://noacg.studio/docs#svg-vote>, or in a checkout: `npm run dev:worktree`, then
`/docs#svg-vote`.

It is a new subsection at the foot of **Import your own SVG graphic**, called **Draw a live vote**.

**What to look at.** The first paragraph is the whole answer, and it is two sentences long: name
the text layers `Option 1` and `Option 2`, name the bars `Bar 1` and `Bar 2`. Everything under it
is detail you only need when something goes wrong. Then the table of the seven layers, the
spellings that are and are not accepted, and a list called **Five things that quietly go wrong**.

That last list is the part I would read first. Each entry is a name a careful designer would
plausibly choose, and each one produces a wrong board rather than an error.

## Every rule on that page was measured, not described

The tempting way to write this was to read `proposePollBinding` and put it in English. Instead the
detector itself was built and run in Node against the live-vote board in the corpus, then run again
against copies of that board with one naming rule broken at a time. A rule that could not be
demonstrated did not get written down.

That is also how two defects turned up, both now filed on the shelf rather than fixed here:

- A heading layer named `Options` is read as a **fourth option** on a three-option board, silently.
  The audience's first option then writes into your heading. The score board has the same hole for
  a heading called `Teams`.
- `docs/SVG_AUTHORING.md` tells designers `Answer 1` works as a vote row name. It never does: the
  quiz reading is asked first and always wins. The new page says so out loud.

## What is still missing, and it is one thing

There is no vote board in the shipped practice library. The file everything above was measured
against lives in the test corpus, which is not somewhere a designer is sent. Someone following this
page has to draw their board from the description rather than open a working one and rename it.
That would be a good next hour of work.

**Nothing here needs a decision from you.** The judgement worth your eye is whether the first
paragraph actually answers the question you asked, in the words you would have used.
