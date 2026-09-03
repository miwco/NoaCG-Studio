---
v: 1
source: walk
raised: 2026-09-04
state: unstarted
asked: "a Rising Total taken to Program airs 0 and never counts, until an operator presses Update"
---
# A counting graphic taken to air lands on zero, not on its figure

**Filed:** 2026-09-04, walking `docs/acceptance/owner-queue/2026-09-03-rising-total-plays-from-zero.md`
on a local dev server. That item's own check - *"It still lands on exactly the text you typed"* -
fails, and the failure is worse than the flash the item fixed: the old bug showed the right number
for one frame, this one shows the wrong number for the whole time the graphic is on air.

## What was seen

Route as walked, on `npm run dev`:

1. New graphic, Templates, **Rising Total**, Skip to finish, production **Walk Night**,
   Add it and go there.
2. The cue's fields read `F0 · Total = 124213`, `F1 · Goal = 250000`, `F2 · Kicker = TOTAL RAISED`.
3. Press **Take**.

The panel animates in correctly - three screenshots across the entrance show it scaling and
fading up, so `play()` is running and the entrance timeline is advancing. `TOTAL RAISED` and
`Goal €250,000` both arrive, so the text fields reach the graphic.

**The total reads `€0`, and it stays `€0`.** It does not count. Waiting ten seconds changes
nothing. Taking it out and taking it again reproduces it exactly, every time.

Pressing **✎ Update** repairs it immediately: `€124,213` with the progress bar filled. Take it
out and take it again after that, and it is back to `€0`. So it is deterministic on the take
path and not a race.

The good half of the item is confirmed at the same time, and should not be lost: there is **no
flash of `124,213` before the zero**, on a first take or a second. The 2026-09-03 change did what
it says. It also introduced this.

## The mechanism, as far as reading gets it

`976a96ba` added `tl.render(0, true, true)` to `noacgEntranceTimeline()`
(`src/templates/shared/animRuntime.ts`), so the entrance's opening values - including the zero
rule's `tl.set(el, { textContent: '0' + suffix }, 0)` - reach the DOM synchronously during the
take rather than on the next animation frame. That is the fix, and it is right.

The infographic rebuild reads its figure like this
(`src/templates/infographics/dataRuntimes.ts`, `rebuildInfographic`):

    var raised = parseIgNumber(raisedEl.getAttribute('data-target') || raisedEl.textContent);
    ...
    raisedEl.textContent = raisedText;
    raisedEl.setAttribute('data-target', raisedText);

The `|| raisedEl.textContent` fallback exists for the first play, before any `update()` has
seeded `data-target`. A take builds a fresh document, so `data-target` is absent - and the
element's `textContent` is now already `"0"`, because the entrance wrote it one frame earlier
than it used to. The rebuild therefore reads its own opening zero as the operator's figure,
writes `data-target="0"`, and every count downstream runs `0 -> 0` and lands on `0`.

`infographicStat()` in `src/templates/infographics/igMotion.ts` has the same
`data-target`-or-seed-from-`textContent` shape and the same exposure. Its comment already states
the invariant that has just been broken: *"never from the live textContent: mid-count that reads
'43%' and an interrupted replay would then count up to the wrong number."* Mid-count now starts
during the take.

**This is a guess from reading, not a measurement** - the Program iframe is sandboxed without
`allow-same-origin`, so it could not be instrumented from the page. Whoever fixes it should
confirm the order before changing anything.

## Why this is probably not one design

Every readout that reaches its figure through `data-target` with a `textContent` fallback is
exposed the same way. `dataRuntimes.ts` alone has that pattern at the fundraising total, the
seat count, the majority and total caps, and the turnout ring; `pl01`-`pl04`, `ig05`, `ig07` and
`igMotion` all reference `data-target`. The walk only drove Rising Total. **A sweep is part of
the work, not a follow-up to it** - the last two rounds of this same bug were each filed as one
design and each turned out to be the whole class.

## The shape of the fix

The operator's figure has to be captured before the entrance can overwrite it. Two honest
options:

- **Seed `data-target` at composition time**, from the field value, so no runtime read ever needs
  a `textContent` fallback. This removes the fallback rather than defending it, which is the
  reason to prefer it: a fallback that is only correct before the first frame will keep breaking
  every time the first frame moves.
- **Capture before rendering**: have `noacgEntranceTimeline()` seed every readout's `data-target`
  from its live text before `tl.render(0, true, true)` runs. Cheaper, and it leaves the trap in
  place for the next person who moves a frame.

## The gate

`e2e/counting-settle.spec.ts` grew a third pass in `976a96ba` that plays a graphic out, takes it
again and reads the frame the browser is about to paint. It did not catch this, so whatever it
asserts is about the FIRST frame and not about where the count LANDS. The gate this needs is the
boring one: take a counting graphic on a production dashboard, wait for the entrance to finish,
and assert the readout equals the operator's figure.
