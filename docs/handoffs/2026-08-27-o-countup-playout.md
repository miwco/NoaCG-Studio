# Handoff - O: a counting graphic played out starts at zero

**Branch:** `claude/counting-zero-animation-3710ec` (the worktree's own branch; the session brief
called it `claude/o-countup-playout` - same work, and the worktree tooling keys off the name it
was created with, so it was not renamed). Two commits plus the integration merge, on top of
`origin/main` at `5abb89e1`.

Everything below is measured, and the commands to re-measure are in it.

---

## ⚠ THE DYNAMIC-MOTION PRIMITIVE GREW AN OPTION. Read this before writing a builder.

`docs/DYNAMIC_MOTION_SCOPE.md` §11a-ii is the full account; the short form:

- A step's `dynamics[].time` is now handed to the builder as **`opts.lead`** as well as being used
  as a position.
- A builder that positions its own contents from that lead marks the timeline it returns
  **`noacgLeadApplied`**, and `animRuntime.ts` adds that timeline at **0** instead of at the
  offset.
- A builder that owns no readout ignores the lead, returns an unmarked timeline and is added
  exactly where it always was. That is every measured motion in every category except
  infographics.

**Nothing in the DATA model changed and no preset's emitted region changed** - see "The
constraint that decided the shape" below, because it is the part most likely to be undone by
someone doing the obvious thing.

---

## What landed

### 1. The defect: the played figure appeared, then snapped to zero

Reproduced first, in the real playout order (`update(data)` then `play()`, which is what SPX,
CasparCG and our own dashboard do), against a plain composed document with no settle and no
simulator. **ig01 "Big Stat" faded in reading `87%` and stayed on it for the first ~200 ms of its
600 ms panel rise, then dropped to `5%` and counted back up to 87%:**

```
rest            | text="87%" opacity=0
after update()  | text="87%" opacity=0
play() sync     | text="87%" opacity=0
frame1  t=14ms  | text="87%" opacity=0.139
frame10 t=163ms | text="87%" opacity=0.849
t=415ms         | text="5%"  opacity=0.997
t=1669ms        | text="87%" opacity=1
```

Sweeping the whole catalog the same way found the class: **twelve readouts across ten designs -
ig01, ig04, ig05, ig07 (three bar caps), ig22, ig23, ig30, ig31, ig35, ig36 - every counted
readout in the catalog, 12 of 12.**

The cause is one line of choreography. Every preset opens by revealing the graphic and emptying
what the entrance is about to fill (`tl.set('.infographic-bar-fill', { width: '0%' })`,
`tl.set('.infographic-ring-fill', { strokeDashoffset: 100 })`) and then adds the measured builder
a few tenths later, so the motion starts once the panel has settled. **The FIGURES were not in
that opening** - each count emptied its own readout at the moment the count began, which on a
played graphic is a few tenths after the operator's real number is already on screen.

**The settle sweep could never have seen this.** A jump renders the zero and the figure in the
same frame; only real playback has a gap.

### 2. The fix: the lead is an OPTION, not only a position

`src/templates/shared/animRuntime.ts`, in the `dynamics` loop:

```js
var lead = (at || 0) / speed;
var segment = build(target, { speed: speed, ease: step.ease, lead: lead });
if (segment) tl.add(segment, segment.noacgLeadApplied ? 0 : lead);
```

and the four counting builders in `igMotion.ts` (`infographicCountUp`, `infographicBarsGrow`,
`infographicRingFill`, `infographicGoalRing`) each take `opts.lead`, put their opening zero at
their own 0, their motion at `lead`, their settle `set` at `lead + duration`, and mark the
timeline they return.

**Absolute timings are unchanged and that was checked rather than assumed** - the count starts and
lands where it did, and `settleGraphic`'s `finiteEnd` (which takes `max(startTime + totalDuration)`
over the entrance's direct children) reads the same number, because the segment moved from
`start 0.4, duration D` to `start 0, duration 0.4 + D`.

Two positions inside the builders moved on purpose beyond the lead: a bar cap's zero now sits at
the sub-timeline's 0 rather than at that bar's own stagger slot (a cap emptied at its turn shows
its real figure until then - that is ig07's three rows), and `infographicCountUp` hands its nested
bar growth `lead + count` and adds it at 0 for the same reason.

### 3. The constraint that decided the shape - do not "fix" the preset

The obvious fix is to write `tl.add(infographicCountUp('#f0', { lead: 0.4 / animSpeed }), 0)` in
`igPresets.ts`. **That silently breaks every infographic**, and it fails quietly rather than
loudly:

- `blocks/timelineModel.ts` `parseAddSegment` accepts exactly `builderName('#target')` with an
  optional position, and returns `null` for anything else;
- a `null` there sets `dynamicsConvertible: false`, which makes `importAnimData` return `null`;
- `convertToDataRegion` then keeps the LEGACY region rather than failing, so every infographic
  ships with the old emit and a read-only timeline dock, and the only visible symptom is a very
  large baseline diff.

It was written that way, caught, and reverted. **The catalog's infographics ship the DATA region -
the preset's `tl.add` text is only the conversion source and never reaches a shipped template** -
so the head start already lives in the data as the dynamic's `time`, and the runtime re-derives
the lead from it. No data-model field, no parser change, no version bump, no migration.

The trade taken deliberately: the lead is **opt-in per builder** rather than honoured by all of
them. Making every builder lead-aware (credits x4, tickers x2, competition x2, poll) would move
the emitted bytes of categories with no readout to fix, for no benefit, and would risk the
delicate measured travel in credits and tickers.

### 4. The missing gate

`e2e/counting-settle.spec.ts` gains **"every counting design plays its figure up from zero"**,
beside the two settle tests. It composes a plain playout document, calls `update()` with the
design's own field defaults, calls `play()`, and takes a reading on every animation frame.

- **The design set is discovered** by the same `data-target` mark the settle sweep uses.
- **Which readouts COUNT is measured, not declared.** `update()` writes `data-target` onto every
  field, so the mark alone also catches static captions - ig34's `94% COUNTED` and ig37's
  `3-DAY FORECAST` both parse as numbers and neither is ever counted. A readout counts if its
  text MOVES during the entrance. Without that rule the sweep reported 20 rows, 8 of them
  fictional.
- **The iframe is ON SCREEN.** Chromium does not tick rAF in an iframe parked off the viewport, so
  an off-screen play measures a graphic that never moved - the first attempt read `opacity=0` for
  two seconds and looked like the entrance was broken.
- It asserts **both halves**: no readout shows its figure on the first frame it is visible, and
  every one still ends the entrance on its own data. The second is what stops "never show the
  figure" being satisfied by never showing it.
- Floors of 30 designs and 8 counted readouts, because a discovery pass that discovers nothing
  passes every assertion under it.

**The gate was proved against the defect before the fix, not only after it**: the identical
discovery and assertion logic, run on the pre-fix tree, reported all twelve rows.

`counting-settle.spec.ts` is already mapped under `^src/templates/` in `scripts/e2e-affected.mjs`,
so no mapping change was needed.

---

## The TAIL: end credits already take one field

**Nothing was built for it, because it is already built.** The session brief asked for end credits
to take one multiline field instead of a field per name. That landed on 2026-08-26 and is sitting
in the queue **unwalked**, which is a different thing from undone:

- `docs/acceptance/owner-queue/2026-08-26-end-credits-one-field-role-and-names.md` describes it as
  shipped, with the route.
- `src/components/wizard/steps/FieldsStep.tsx` renders the list line as ONE `textarea`
  (`data-testid="list-paste-editor"`) when the field plan says `editor === 'paste'`, with the
  copy "This is ONE field, not a field per person".
- `src/templates/endCredits/AGENTS.md` carries the format contract: a colon ends a ROLE, `# X` is
  a heading, everything else is a name, and a list pasted with no marks at all is a clean column
  of names.

So the owner-queue item was left exactly as it is - it is the walk that is owed, not the work.
**Do not duplicate it.** The related open work is now in
`docs/backlog/credits-pack-names-and-poster.md`: the credits designs' NAMES (the owner read the
shelf as "reels and crawls", which is literally what they are called) and the POSTER FRAME a
picker card wants for a travelling graphic, each with the reason it was not done and what it
costs. Both were extracted out of the A handoff before it was retired.

---

## Verification state

- **`npm run build` GREEN** on the integrated tree (typecheck, api typecheck, lint, dep-cruiser,
  the node test suites, the instruction ratchet, `check:copy`, vite build, prerender of 507
  template pages, the secret scan, line endings).
  - Two traps paid for here: **`igMotion.ts` and `animRuntime.ts` are TEMPLATE LITERALS**, so a
    backtick in a comment inside them ends the string - the first draft of the new comments used
    `` `opts.lead` `` and would not parse. And a blanket "strip backticks from `//` lines" repair
    is worse than the disease: it also stripped the backtick that CLOSES `DATA_HEADER`, and edited
    76 unrelated comment lines. Both files were restored and the edits re-applied by exact anchor.
- **`e2e/counting-settle.spec.ts` - all three tests PASS**, run together
  (`npx playwright test counting-settle`): the new played path (43 s), and both settle recipes,
  thumbnail and canvas. **F's settle fix is intact** - that was the thing this change could most
  easily have undone, and it is checked from the other side rather than assumed.
- **ONE baseline moved, the drift was READ first, and it is exactly the healthy shape.** The
  read-only run reported **509 changed fingerprints, every one of them `js`** - no `html`, no
  `css`, no other key. 509 is the whole catalog, which is right: `animRuntime.ts`'s interpreter is
  emitted into every data-driven template, and every category now creates as a data block. The
  committed diff is **509 insertions, 509 deletions, every line a `"js"` line**.
  Re-recorded with `UPDATE_CATALOG_BASELINE=1 npx playwright test e2e/catalog-baseline.spec.ts`.
- **`e2e/catalog-render-baseline.json` did NOT move**, and its own test passed in both runs -
  before the re-record and after it. That is the load-bearing negative result: the render baseline
  is computed style and geometry of the SETTLED graphic, and a settle jumps past the whole lead,
  so nothing about the settled frame could change. **`UPDATE_RENDER_BASELINE=1` was NOT passed**
  (`src/templates/AGENTS.md` warns that a full re-record bakes one loaded run's coin flips into
  the committed reference).
- **The integration is real.** `origin/main` had moved 7 commits, so it was taken in (`3f70c212`,
  a clean merge with **zero overlap** - nothing on main had touched `src/templates/`,
  `src/preview/` or either baseline) and the build re-run on the integrated tree.
- **GREEN END TO END on the INTEGRATED sha, which is the one that counts: run `33053324970` on
  `3f70c212`.** The jobs were listed by name rather than inferred from a green tick
  (`gh run view 33053324970 --json jobs -q '.jobs[] | "\(.conclusion)\t\(.name)"'`), because an
  ordinary push plans from the PREVIOUS push and a shard that was planned but skipped reads
  exactly like a passing one. **All nine E2E shards ran and passed**, plus Build, Factory gates,
  E2E plan, Catalog calibration gate, Combined E2E report and the CI gate. The only non-success is
  `skipped  Vercel accepted the commit`.

## What is left

Nothing on this branch. It is queued to land.

- `docs/backlog/credits-pack-names-and-poster.md` - the credits names and the poster frame.
- `docs/backlog/settle-emitted-runtime-finite-end.md` - unchanged and still open; its reference to
  the two retired handoffs was repointed at the commit that carried the settle rule.
- Owner queue: `docs/acceptance/owner-queue/2026-08-27-counting-graphics-start-at-zero.md`. Route
  is the playout dashboard - put a stat graphic on it, type a figure, press Take, and watch the
  number as the panel arrives. Also still owed a walk:
  `2026-08-26-end-credits-one-field-role-and-names.md` and
  `2026-08-27-stat-cards-show-their-real-number.md`, which is this fix's other half.
