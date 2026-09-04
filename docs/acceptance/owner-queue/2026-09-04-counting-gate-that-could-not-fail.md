---
kind: agent
date: 2026-09-04
---
# The counting gate could not fail, and the on-air zero did not reproduce

**Date:** 2026-09-04 · **Branch:** `claude/m-counting-graphic-airs-zero`

Two records disagreed about the same graphic, so this settles both. It corrects
`docs/acceptance/owner-queue/2026-09-03-rising-total-plays-from-zero.md` and the walk note
appended to it, and it is filed as its OWN item rather than as an edit to that one because the
branch carrying the walk note had not landed yet - one file per item is exactly what stops two
sessions writing over each other here.

## The zero did not reproduce. Three routes, all measured.

The 2026-09-04 walk reported a Rising Total taken to Program reading `€0` forever until an
operator pressed Update. Driven again on this branch (`826fefba`, the same code the walk ran),
reading the PROGRAM iframe's own DOM rather than a screenshot of it:

1. **The Program bootstrap on its own** - the sandboxed document the monitor really builds
   (`composeDocument(..., { liveControl: true })`), driven with `update` then `play` over
   postMessage, exactly as `takeCueItems` sends them. Cold take, play with no update, and a
   re-take.
2. **The production page** - a real graphic, a real production, the real ⟳ Take button.
3. **The literal walk route** - the wizard's Templates entry, Rising Total, Skip to finish, a new
   production named Walk Night, Add it and go there, Take, press nothing.

Every one of them: `0` while the panel rises, the count runs, and the graphic lands on `124,213`
and stays there through ten seconds. The item's claim - *"It still lands on exactly the text you
typed"* - holds. Nothing was changed to make that true; it already was.

The walk's suspected mechanism cannot apply to the design it was reported on either: Rising Total
(ig05) has **no rebuild function at all**, so the rebuild-reads-its-own-zero story is about four
other designs, not this one.

## The gate really could not fail, and that half was true

`e2e/counting-settle.spec.ts` read both halves of its claim off the same live `data-target`: the
expected figure AND the reading compared with it. A take that rewrites a readout's target to `"0"`
therefore produces a count of 0 -> 0 that lands on its target perfectly, and the zero-figure
exclusion each sweep carries then drops the row before any assertion sees it. The worse the fault,
the more completely the gate excluded it.

Measured, not argued. Putting two lines of `play()` the other way round makes ig22, ig23, ig30 and
ig31 stamp `data-target="0"` on their own totals and air a zero:

- **the old gate: green.** Its play-out pass passed with four graphics airing a zero. Its re-take
  pass went red only on a population count - "readouts an entrance counts: expected > 8, received
  8" - which names nothing about a wrong number on air.
- **the fixed gate: red, on the fault, naming all four designs.**

The expected figure now comes from the value the test typed into the field, which the template
cannot reach, and a take may not rewrite a readout's own figure. A fourth pass covers the COLD
take - a document played with no `update()` ever, which is what an exported overlay or an OBS
browser source does, and the only order in which a readout's target genuinely starts absent.

## The route, in under a minute

1. Make a **Rising Total** (search *Rising* or *Fundraising* in Browse), put it in a production,
   and press **Take**.
2. Watch the big figure: `0` as the panel arrives, then digits climbing with their commas on the
   whole way, landing on `124,213`.
3. Take it out, take it again. Same thing.
4. Then search **Fundraising** or **Appeal** in Browse and do the same with one of the four goal
   designs beside it - they share the rebuild the injected fault broke, so they are the ones worth
   a second look.

## What to look at

- The figure must never sit at `0` after the count has finished. That is the whole point.
- No flash of `124,213` before the zero, on a first take or a second.

## What is not covered

Whether the walk saw something real that three instrumented routes cannot reach - a slower
machine, the deployed site behaving unlike the dev server. If you ever see a counting graphic air
a zero again, that is new evidence and the gate above will now have something to say about it.
