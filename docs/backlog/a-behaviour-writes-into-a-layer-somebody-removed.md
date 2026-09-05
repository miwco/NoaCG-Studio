---
v: 1
source: measurement
raised: 2026-09-05
state: unstarted
---
# A bound behaviour still writes into a layer that was taken off the artwork

**Filed:** 2026-09-05 by row J (`claude/j-live-vote-defects`), found by the review pass on that
branch. The common path is closed on the same branch; the residual one is not, and closing it
properly costs more than that row had.

## What happens

`hiddenSvgLayers` (`src/components/wizard/draft.ts`) stamps every layer that is unticked with the
answer "take it off the artwork", and the emitted CSS hides it. `svgBehaviourOption` goes on
emitting the binding for that same layer, because nothing compares the two. So a vote round's
counts arrive, the runtime writes an option's label and its percentage, and the words land inside
a layer with `display: none`. On air the row is simply blank, and no gap, warning or export check
says a word.

The quiz path does not have this: `behaviourBindingGaps` tests `bound()`, which is a lookup in the
layers that are still ON. `pollBindingGaps` and `scoreBindingGaps` never ask.

## Why it is only half closed

Row J took the checkbox off the reach of a vote-driven row, which closes the path a person
actually walks: detection binds the layers at import, so by the time the checklist is on screen
those rows are already driven and their tick is disabled. What is still reachable is the other
order - untick a layer with "remove" FIRST, then point a vote picker at it, since the pickers offer
the whole inventory including removed layers.

## Why the obvious fix is wrong

Adding the condition to `behaviourBindingGaps` looks like a two-line change and is not:
`svgBehaviourOption` returns `null` for ANY gap, so one removed label would silently drop the whole
vote binding and leave a board that just comes on and off. Losing the behaviour is a worse answer
than losing one label. Row J wrote that fix, measured what it did, and reverted it.

## What it probably wants

Either a second class of report - something that is wrong without being a reason to drop the
binding - or the pickers refusing to offer a layer that has been taken off the artwork, which is
the same "offer nothing that cannot work" rule applied one surface earlier. The second is smaller
and closes the order that is still open; the first is the one that also catches a layer removed
after the picker was filled.
