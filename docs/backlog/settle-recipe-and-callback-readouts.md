# A settled graphic loses every readout its runtime writes from a callback

**Filed:** 2026-08-26. **Source:** measured on main while landing
`claude/c-credits-tickers-roll`; mechanism confirmed by two sessions independently.

> **BEING DONE.** `claude/infographic-settle-semantics-848ec7` carries it as of 2026-08-27
> (`cd028bf2`): the trailing write in `igMotion.ts`, the same fix in `poll/pollMotion.ts` -
> which the "does this readout depend on a callback firing" audit found and this file did not -
> a new `e2e/counting-settle.spec.ts` gate, and the `simulatorRuntime.ts` divergence deleted.
> Do not re-plan it. Delete this file once that lands; it is kept until then so the defect is
> still recorded if the branch does not.

## Why

**Every counting infographic thumbnail on main reads zero.** ig01 "Big Stat" renders `0%`
against `data-target="87%"`, on every Home card, every library thumbnail and every operator
preview. It is user-visible, it is on the main line, and nothing in the tree measures it.

It is not a bad change: it is the cost of a fix that was itself correct. The settle recipe
(`preview/settleGraphic.ts`) now runs data, jump, data, jump, because a design whose `update()`
re-renders its rows throws the settled frame away with the elements it was written on - which is
what repaired the blank credits card. Ending on a jump is right for credits and wrong for a
counting readout, and no ordering of those three calls satisfies both.

## What it would take

**One line per readout, in the emitted runtime rather than in either recipe.** End the count-up
timeline with a `set` to the true value:

```js
tl.to(counter, { /* … onUpdate, onComplete … */ });
tl.set(el, { textContent: stat.text });   // add this
```

`suppressEvents` suppresses CALLBACKS, not rendering - which is exactly why the bug happens, and
the same property used the other way fixes it. Under normal playback `onComplete` already writes
`stat.text` and the trailing `set` writes the same thing, so nothing changes visually. Under a
jump it wins. Credits keep the jump last, infographics get their figure, neither recipe moves.

Three things belong in the same pass:

- **The audit is "does this readout depend on a callback firing", not "is it a number".**
  `igMotion.ts` has four count-up sites; `infographicBarsGrow`, and any ring or gauge deriving
  geometry in an `onUpdate`, have the same shape and none of them would turn up by grepping for
  counters.
- **The missing gate is what let it ship.** The credits equivalent exists -
  `e2e/end-credits.spec.ts` measures every design's settled viewport coverage - and the
  infographic one does not: "every counting design's thumbnail shows its figure, not zero". Add
  it in the SAME commit as the fix; alone it lands red.
- **Delete the divergence it forced.** `preview/simulatorRuntime.ts` currently ends its
  `sim-settle` on the DATA rather than on a jump, so the editor canvas keeps the figure honest
  (`e2e/wave2.spec.ts` reads `0%` where the stat says `87%` otherwise). Its comment says so and
  names this fix as the exit condition. Once the runtime writes its own value, take
  `settleGraphic.ts`'s jump/update/jump verbatim so the canvas and the thumbnails are one recipe
  again - which is the invariant `settleGraphic.ts` opens by stating.

## Evidence

Measured through composeDocument's real serialized bootstrap, viewport coverage of the settled
credits frame and the stat readout:

| recipe | cr06 | cr08 | cr01 (a roll) | ig01 readout |
|---|---|---|---|---|
| one jump, `progress(1)` | 0% | 0% | 69% | `0%` |
| one jump, the finite end | 51% | 69% | 69% | `0%` |
| two jumps, the finite end | 100% | 100% | 69% | `0%` |
| jump then data (editor today) | 51% | 69% | 69% | `87%` |

The zero comes from `src/templates/infographics/igMotion.ts:53`,
`tl.set(el, { textContent: '0' + stat.suffix })`, with the figure written only from an
`onUpdate`. The full account of the settle decision is `docs/DYNAMIC_MOTION_SCOPE.md` section 11.
