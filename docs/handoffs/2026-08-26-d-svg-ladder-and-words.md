# Handoff - SVG import: the words, the ladder, and fade

Session D, branch `claude/svg-import-words-ladder-fade-c0d9e8`. Everything below was measured
before it was changed; the numbers are from the shipped samples and the commands to re-measure
are named.

---

## What landed

Two commits on the branch:

- `1ab6feb8` Grow the panel before shrinking the type, and keep every value inside the artwork
- `dee41d56` Say where a placed line's squeeze can lose to its own animation

All six items of the brief are done. Three owner-queue files, one per observable change:
`2026-08-26-the-too-long-ladder.md`, `2026-08-26-import-words-shortened.md`,
`2026-08-26-fade-speed-verdict.md`.

### 1. The words

Every user-facing string on the import path rewritten short and plain - the mapping step's
summaries and every ⓘ body, the drop-zone copy, the row tooltips, the warnings, the Design step's
ⓘ. No em dashes, no rhetorical build-up, mostly one sentence where there were two.
`"Shrinks to fit the space you drew"` is gone: nobody drew a space, the importer found the text
layers. It reads `The text gets smaller`.

Scope held to PRODUCT copy. Code comments, `AGENTS.md` and `docs/` keep their reasoning density -
standing repo rule, a different reader.

### 2. The ladder is an order, and the default was wrong

Reproduced first: the shipped `docs/svg-samples/illustrator-export.svg` defaulted to `shrink`.
Cause was the diagnosis the brief handed over, confirmed - `proposeBannerGrowth` refused the whole
file on any side-by-side pair, and Location (x=200) / Slot (x=700) share y=932. Fixed: the
question is asked of the STACKED lines only (a line with its own baseline). A pair sharing one
argues neither way; a file with NO stacked line is a composed row (the scorebug) and still
refuses. The scorebug and quiz-board defaults are unchanged and still E2E-pinned.

The select is now the owner's order, shrink last:

    The panel gets wider
    The panel gets wider, then the text wraps
    The text wraps onto more lines
    The text gets smaller

**The combination needed no format change.** `DesignSvg.growth` was already a LIST, and the
runtime already spends width BEFORE the fit and height after it - so `axis: 'xy'` emits two
ordinary rows naming one panel (`draft.ts svgGrowthOptions`). One thing had to give: the
`data-noacg-el` stamp became a space-separated LIST matched with `~=`, because a single value let
the second row erase the first. And both rows now read their followers while the artwork is at
REST, before either grows - a follower captured after the first row moved it recorded the moved
pose as its resting one, which would have stopped the artwork ever coming back.

Verified on a board with room both ways: 900x110 at rest, widens to the cap on a longer value at
the drawn size, then wraps to 10 lines on a huge one, footer travelling, and returns to exactly
900x110.

### 3. The cap, and the "overshoot"

`svgGrowCap` mirrors the inset the panel keeps from the frame edge it is ANCHORED to onto the edge
it grows towards, floored at the row's `safe` fraction. Measured on the Illustrator sample: the
banner used to run to x=1843 on a 1920 frame (the flat 4%), 73px past the 150px margin drawn on
its left. It now stops at exactly 1770. An inset is never negative, so outgrowing the frame is
structurally impossible rather than a number to keep right.

**The overshoot he described, I could not find, and this is the one thing worth his judgement.**
Measured on both shipped samples, the gap left at the banner's end after growing is 50px - exactly
the inset the designer drew on the left. That is the symmetry item 3 itself demands, not slack.
The only genuine slop was **1.4px**, and it had a real cause: `measureSvgRoom` converted screen px
to artwork units through the line's own advance-length / ink-box ratio, which differs by a glyph's
side bearings and so carried a per-typeface error into every room measurement. It reads the
element's CTM now, and the E2E asserts the residual gap equals the drawn inset to the pixel.

If what he saw was bigger than 1.4px it was a different file - the owner-queue item asks for it.

### 4. Nothing paints outside the panel

Reproduced: shrink mode, a 90-character name, floored at 29.7px (= 54 x 0.55) and still painting
to x=1277 with the panel ending at 1150. So the 55% floor was what stopped it, `noacgTextOverflow`
was correct, and neither was a containment rule.

Fixed with a fourth rung rather than a third mechanism: `svgSqueeze` fits the floored block to its
budget - `textLength` + `lengthAdjust="spacingAndGlyphs"` on a drawn layer, a horizontal scale
from its own start edge on a placed one. Still reported as too long. Comes off the moment a
shorter value arrives (E2E asserts the exact return to 54px and the original right edge).

This does not reopen the 2026-08-22 shrink-never-condense ruling: condensing is not a default, it
is the last rung under a value no size and no line count could hold.

### 5. Neighbours

Same root as item 2, fixed in the runtime: `svgFitNeighbour` bounds a line at the nearest thing
drawn to its right on its own rows, less half its drawn type. A long HELSINKI used to run to x=860
straight through the 19:30 at x=700; it now stops at 681. And a line bounded that way is marked
`penned` and never drives the panel's growth - widening the panel would give it nothing, which is
exactly the ruling in the brief.

### 6. FADE - the verdict, stated

**Both controls work on a fade. The surface they were judged on was lying.** Measured before
touching anything:

- emitted `NOACG_ANIM` carries speed 0.6 / 1 / 1.8, same as every other motion;
- the BUILT entrance timeline measures **1.333 / 0.800 / 0.444 s** - identical to a slide's;
- the four curves offered on a fade give four different opacity ramps. At the entrance's halfway
  point: Soft 0.71, Smooth 0.88, Sharp 0.98, Steady 0.50.

What hid all of it: `WizardPreview`'s lifecycle demo took the graphic off at a hard-coded 1700ms
and replayed at 2800ms **whatever the animation did**. Every setting therefore played inside one
fixed 2.8s beat - and the faster the setting, the LONGER the graphic then sat still (367ms of hold
at Slower against 1256ms at Faster: the cadence moved the opposite way to the knob). A slide
survived it because travel is a second cue, a distance covered in a time. A fade has no second
cue, which is why it was the one that read as broken - and it is why his Slide-at-Auto note fits
the same explanation, since `power3.out` puts most of its travel in the first third.

`demoCycle` now derives the two moments from the template's own durations (entrance + 900ms hold,
exit + 350ms gap). The hold and gap stay FIXED deliberately: they are viewing rhythm, and a hold
that scaled with speed would cancel the knob out again.

**So the buttons were NOT stood down for fade.** "We can't show buttons if they're not working"
does not fire when they are working. Nothing in `motionPresets.ts` or `easings.ts` was touched.
Pinned by a new spec in `e2e/wizard-preview.spec.ts`, mutation-tested: putting the fixed pair
back turns it red.

## Verification

- `npm run build` green.
- `e2e/import-svg.spec.ts` - 52 passed, including four new specs for the items above.
- `e2e/wizard-preview.spec.ts` + `e2e/motion-presets.spec.ts` - 13 passed.
- `npm run test:e2e:affected` queued as **j-0055** (67 spec files); it was RAM-blocked behind
  another session's job at hand-off time. **Read `npm run jobs` before landing.**

## The landing, and a gap in the runner

The branch is finished and pinned at `3247c1d7` - clean tree, `npm run build` green,
`npm run check:copy` green, catalog baselines re-recorded. **It is not landed**, and cannot be
until `claude/b-docs-polish-ca8fde` lands: `merge-order` ranks that branch #1 and this one #2, so
`auto-merge` refuses to touch main while it is ahead. Re-queue with `npm run queue:merge` once it
is on main.

**A landing job that can only fail on ORDERING spends its whole retry budget and then vanishes.**
j-0067 requeued itself seven times, every time printing `waiting its turn -
claude/b-docs-polish-ca8fde is still ahead of main`, exhausted its retries and left the queue. The
requeue loop is built for "main moved under me", where retrying is exactly right; against "a
cheaper branch is ahead and its session has not queued it yet", retrying fixes nothing and the
job dies quietly. The state it leaves behind is the problem: `npm run jobs` shows an empty queue
and the branch reads `not queued`, which is indistinguishable from work nobody finished. Worth a
distinct outcome ("blocked by <branch>", held rather than retried) - not touched from this
session, since the runner belongs to no branch in flight.

## Open, and deliberately left

- **`docs/GOALS.md` is 431 lines** against the root contract's "~200". It was already ~400 before
  this session; I added roughly 30 to goals 4/5/6 and did not start a trim that would fight the
  other sessions editing that file tonight. Somebody should archive the landed goals.
- **`src/components/wizard/AGENTS.md` is +100 bytes net.** The brief asked for displace-only; I
  displaced ~400 bytes (the followers paragraph, the `.wz-body-working` bullet) to pay for ~500 of
  new binding rules, one of which was a correction - the old text said side-by-side lines keep
  shrink, which is now false. The chain measures 15.4 KB free, so nothing is at risk.
- **Wider-then-wrap is invisible on a bottom-anchored lower third**, because the mirrored top
  inset leaves no room below to wrap into. That is correct behaviour and a confusing option; the
  owner-queue item asks whether to hide a rung that cannot do anything on the file in hand.
- **A placed line's squeeze loses to its own GSAP tween** if the timeline animates that line
  directly - same caveat a growth follower's transform already carries. Written where it happens.
