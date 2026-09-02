---
kind: agent
date: 2026-08-29
---
# Checking a template change now takes about a minute instead of a quarter of an hour

Date: 2026-08-29

## What changed

You said a template change "takes a lot of effort from the computer and everything else", and that
the catalog only grows. It did: every safety check we run after touching a graphic re-checked all
504 of them, one at a time, in a browser. Change one lower third, wait for 503 designs you did not
touch.

Now the checks work out which graphics your change could actually have affected, and check those.
If the change touches something shared - a whole category's common code, the fonts, the colour
system, the checking tools themselves - it still checks everything, because then everything really
could have moved.

## The two numbers

A one-line change to a single lower third, checked end to end on this laptop:

- **Before: 15 minutes 5 seconds.**
- **After: 56 seconds.**

Same checks, same strictness, same verdicts - the only difference is how many graphics each one
looks at. Both were run for real today, and the full run passed, so nothing was traded away for
the speed.

## What did NOT change

The complete check over all 504 graphics still runs every night, and the two quickest of the checks
also run on the build server for every change that touches the graphics. So if anything ever drifts
in a graphic nobody edited, it is found by morning at the latest. The short run is what your laptop
does; the long run still happens, just not while you are waiting for it.

## Route (under a minute)

Nothing to look at on screen - this is machine time, not a product surface. If you want to see it:

1. Open a terminal in the repo.
2. Change any single template file (add a blank line to `src/templates/lowerThirds/lt01.ts`).
3. Run `npm run catalog:affected`.

It prints the one graphic your change can move, and the exact commands to check it - each already
narrowed to that graphic. Add a line to `src/templates/lowerThirds/shared.ts` instead and it prints
the whole-catalog version, because that file is shared.

## What to look at

Whether the answer reads plainly: it should say which graphics, why, and what to run - without
needing anything explained.
