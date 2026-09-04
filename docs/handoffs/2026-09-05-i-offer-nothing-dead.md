# Row I: offer nothing that cannot work

Branch `claude/i-offer-nothing-dead`. The row's goal was that a control which cannot change the
graphic in front of the user is not offered, and that the rule holds in more than the one place
the owner happened to notice.

## The named instance was the layer STAGGER, not a layer tagger

The dictation lost a letter and it sent the row's TOUCHES line to the wrong file. The owner's
words were "I can do the layer stagger because everything probably is in one layer, but this is
not a big deal that it offers it", read back in
`docs/acceptance/owner-queue/2026-08-28-svg-import-against-real-exports.md` as "layers tagger".
The sentence before it is about adding animations, which is the clue.

The mapping step (`MapSvgFieldsStep`) already offers nothing it cannot do on that file: its
outline rows and its "Add a field" section are both conditional, and `figma-outline-text-title-card.svg`
gets neither - walked it, the step shows one honest paragraph and a re-export instruction. Nothing
to fix there. `PrepareDesignStep.tsx`, which the row's TOUCHES named, is not even on the `svg`
walk: that mode goes Start -> Design -> Fields -> Animation -> Finish.

**The Animation step is where the dead control was.** Its "Layer stagger" card reads "the design's
layers rise into place one after another". The preset targets the artwork's named top-level `<g>`
groups (`svgLayerSelectors`); a Figma frame export wraps everything in one unnamed group, so the
list is empty and the emitter falls back - correctly, at play time - to a whole-unit fade.
Reproduced end to end before touching anything: picked the card, created the project, and the
graphic's `NOACG_ANIM` was a single `.imported-design-box` opacity track, in and out.

## What landed

`presetMovesSomething(html, presetId)` in `src/blocks/presetRegistry.ts` answers "can this preset
move THIS design", reading the same `svgLayerSelectors` that `emitPresetRegion` hands the emitter,
so the offer and the choreography cannot disagree. Conservative like `cssPaintsWith`: unknown
answers yes.

Three surfaces ask it, because the sweep found the same option offered after creation too:

| surface | before | after |
| --- | --- | --- |
| wizard Animation step | card offered on every SVG import | offered only where layers exist |
| Inspector motion-style dropdown | "Layer stagger" listed; applying it wrote a box fade (verified) | not listed |
| legacy timeline "start over" | same list | same filter |

The Inspector case was verified by applying it and reading the resulting data; the legacy timeline
takes the same one-line filter but I did not reach that surface live - it needs a template whose
animation region the parser cannot read.

## Hiding versus disabling: hidden, and why

The backlog file asked for hiding and I agree with it at these five surfaces, for a reason worth
recording rather than inheriting: in every case something that works sits immediately beside what
vanished. The layer stagger's neighbours are six universal motion cards; the typeface roles keep
"All Text"; the footer keeps its other buttons. There is nothing left unexplained, so a greyed
control would only add a question.

The one place a sentence would have taught something is the layer stagger, where "export with your
layers named" is real advice - but that belongs on the import DOOR beside the re-export advice
already there, not on a disabled card two steps later. If the owner wants it, that is where to put
it.

## The sweep

Delegated to Antigravity `gemini-3.7-flash-high` at high effort, read-only, 260 s, one turn.

**The first run returned nothing** because the prompt declared no tool set - `agy-run` warns about
exactly this, and headless mode auto-denies silently, so an empty answer reads like "nothing
found". The second run led with "TOOLS: read_file ONLY" and enumerated all 23 paths. Both attempts
are on the ledger; the outcome is recorded with `scripts/delegation-outcome.mjs` as `reviewed`
(retries 1, five findings, no repair needed).

It reported five hits. **All five are real**, each re-derived by me in the running product rather
than accepted from the report - three of them are one control in three modes:

1. **"Reveal in steps"** offered on categories that ignore it. Verified on House Match-up: ticked
   the box, the built template came back byte-identical. The exclusion list named seven categories
   while twenty ignore the flag - every create outside `standardTemplate` passes a fixed `steps` to
   `baseSettings` and `steps: false` to its preset config. So it was dead on scoreboards, versus
   cards, the whole competition pack, polls, audience graphics, frames, transitions and stream
   notifications. Now stated the positive way (`STEP_CATEGORIES`, five entries), which cannot drift
   the same way; re-verified in both directions, gone on the versus card, still adding "Step 2" on
   a lower third.
2. **"Apply to: Heading / Body / Numeric / Label"** in the Style step's typeface panel. This one is
   bigger than a dead control - it was a BUG. The override was keyed `--font-label` while every
   other override on that step is keyed by the bare name, and `draft.ts` prefixes the dashes
   itself, so it searched for `----font-label`, found nothing, and dropped the pick. Measured on
   House Strap: Apply to Label, pick Bebas Neue, `--font-label` unchanged. Repaired (bare keys),
   and after the repair a per-role pick lands and its `@font-face` is embedded - verified live.
   The role list is now read off the design as well; nothing in the catalog declares `--font-body`,
   so that row was dead on every graphic we ship.
3. **"Colors & typeface from this project"** offered in the video, dropped-file and blank walks.
   Verified the offer live in video mode; the consumers say the rest - `createDefaultVideoProject`
   takes prompt, engine, size, assets and no styling, a dropped file is applied byte-faithfully,
   and `createBlankTemplate(resolution, fps)` takes no draft at all.

**One finding was filed rather than fixed:** the typeface panel's search, upload and installed
roads ignore "Apply to" and write the global face -
`docs/backlog/typeface-search-ignores-apply-to.md`. It needs the custom font's bytes to travel
with the per-role override or playout falls back silently, which is more than a tail item.

## Gates

- `npm run build` green, before and after taking `main` in (row C and row L landed in between;
  neither touches these files).
- `npm run test:e2e:integration` after the merge: **1017 passed**, 15.4 min. Its catalog leg then
  reported nine failures which were MINE, not the code's - I killed the dev server on port 5198
  while that leg was starting, and every one of them is a navigation timeout to
  `http://localhost:5198/app`. Re-run clean below rather than argued away.
- `npm run test:e2e:affected` on the final state (the check phases edited code mid-run, so the
  first run's verdict did not cover it): **1240 passed**, 19.6 min, plus the catalog gate's
  **35 passed**. `e2e-affected: suite passed; catalog gate passed. Overall: passed.`
- `node scripts/check-catalog-emit.mjs`: PASS, 504 designs - nothing this branch touches moves a
  catalog design's emitted code, which is why the rendered sweeps were not queued.
- `/check`: `review: delegated` (five findings, four fixed - the fifth, a stale font override
  left under a role no longer listed, is inert by construction and clearing it would fight the
  case where returning to a design that reads the role should reapply it), `simplify: inline`
  (fan-out instructions came back rather than a result; one finding, the duplicated filter in the
  two timeline surfaces, now `swappablePresetsForTemplate`), `verify: inline`,
  `taste: not applicable` - no graphic's pixels move, and the emit gate over 504 designs is the
  evidence.

## What the review caught, which is worth its own paragraph

The rule can fail in the other direction, and it did. Hiding a card does not un-pick it: choose
the layer stagger, go back to the mapping step and turn the named groups into live fields, and
the design has no layers left - the card goes, nothing renders as chosen, and the summary and the
created graphic still said "Layer stagger" while a fade played. A filter alone would have
replaced one dishonest surface with another. The draft is what `create` reads, so the draft is
what is corrected now, in an effect that only ever touches a pick this design offers but cannot
perform.

Two smaller ones from the same pass: asking the question parses the whole document (an imported
SVG's artwork is inlined in it), and the Inspector asked on every playhead tick and every
keystroke in a sample field - all three surfaces memoize now. And `svgLayerElements` skipped the
`-outlined` class but not `-removed`, so an SVG whose named groups had all been taken off the
artwork still answered "this design has layers".

## What is worth knowing next

- The rule now has a home: `src/components/wizard/AGENTS.md` carries it as a contract line naming
  the four instruments (`cssPaintsWith`, `presetMovesSomething`, `STEP_CATEGORIES`, `BRAND_MODES`),
  so the next control gets asked the question at the offer site.
- `src/ai/spec/specDesign.ts` gates an AI-proposed preset through `swappablePresetsForType` and is
  NOT filtered by `presetMovesSomething`. It is not a control anyone is offered, so it is out of
  this row's scope, but an AI that proposes the layer stagger for a layerless design still gets a
  silent fade.
- Nobody re-recorded `e2e/catalog-baseline.json` here, and nothing in this row changes emitted
  catalog code - the three fixes are all offer-site filters plus one override key.
