# Handoff - catalog verification becomes O(change)

Session EE of the 2026-08-29 day wave. Branch `claude/ee-catalog-gates`, seven commits, build
green, main integrated, `/check` run.

## The ask

The owner, 2026-08-28: any template change "takes a lot of effort from the computer and everything
else", and the catalog only grows. The Graduation Roll retirement burned hours re-measuring designs
it never touched. Make catalog verification cost what the CHANGE cost, not what the CATALOG costs -
while the full battery still runs somewhere on a schedule so drift cannot hide.

## The two numbers

A one-comment change to `src/templates/lowerThirds/lt01.ts`, every catalog gate, measured on this
laptop today against the same dev server:

| gate | full catalog | affected slice (lt01) |
|---|---|---|
| `check-catalog-emit` (new) | 3.4 s | 1.0 s |
| `type-floor` | 143 s | 7 s |
| `overflow-sweep --baseline` | 155 s | 6 s |
| `field-coverage` | 256 s | 5 s |
| `numerals` | 96 s | 7 s |
| `catalog-specs` (tripwire, 35 units + the baseline spec) | 252 s | 30 s |
| **total** | **905 s (15 min 5 s)** | **56 s** |

**16x.** Every full-catalog run above passed, which is the other half of the measurement: the
scoping did not change any verdict. Deriving the plan itself costs 0.2 s when the answer is "none"
or "the whole catalog", and about 3 s when it is a slice.

## What was built

**1. `scripts/catalog-emit.mjs` + `npm run check:catalog-emit`.** Three of the four gates in
`e2e/catalog-baseline.spec.ts` are about TEXT - each design's emitted html/css/js against the
committed fingerprints, the hidden-data-holder rule, the name collisions - and needed a Playwright
spec, a Vite dev server and an `/app` boot to ask. This bundles the catalog with Rolldown and
creates all 504 designs on a blank Chromium page: **3.4 s, matching `e2e/catalog-baseline.json`
byte for byte.**

**The step as briefed - "a node test inside npm run build" - is NOT achievable, and here is why.**
Creating a design applies its motion preset, and `blocks/presetRegistry.ts` resolves the design's
class prefix and SVG layers by PARSING the html it just emitted (`model/structure.ts`,
`new DOMParser()`) - deliberately, because a prefix is a DOM fact rather than a text pattern.
Measured: **all 504 designs fail in bare Node with `ReferenceError: DOMParser is not defined`.** The
options were a new HTML-parser dependency, a hand-rolled parser whose disagreements with Chromium
would be silent, or a real Chromium. A blank page is the honest minimum, and it costs three
seconds. It is therefore NOT in `npm run build` (CI's Build job installs no browser, and making the
repo's most-run command need one is a bad trade); it runs in CI's catalog job, in the nightly, and
as the first step of the local procedure.

It is also deliberately NOT on the machine-wide browser-job list (`SWEEP_SCRIPTS`): it holds one
blank tab for three seconds, and parking that behind a live suite for half an hour is exactly the
kind of guard people learn to route around.

**2. `scripts/catalog-affected.mjs` + `npm run catalog:affected`** - the scope filter and its
derivation, in two steps, both read off the source rather than curated:

- **declarations** - every design declares itself with a literal `id: 'lt01'` in one file under
  `src/templates`, so a design added, moved or renamed re-maps itself with no list to update;
- **importers** - and every design that IMPORTS it, because designs share bodies.

WHETHER the catalog is affected is still `e2e-affected`'s answer, asked per file, so there is no
second trigger list to drift.

**3. `scripts/catalog-specs.mjs` + `npm run catalog:specs`** - one door for the Playwright half.
Every gate now takes the same flag: `--only <ids>` on the four sweeps, the emit check and the specs.
The specs need the scope as an environment variable (a spec has no argv), but this script sets it,
so `NOACG_ONLY_DESIGNS` is transport rather than a second interface - and it is where the ids are
validated against the real catalog before any browser starts.

**4. The full battery on a schedule already existed** - verified rather than added, and the docs
now say it accurately (see "what I got wrong" below). The only additions are the new emit gate in
CI's catalog job and in the nightly, run first because it is cheap and specific.

## What escalates to the whole catalog

Anything that cannot be attributed to named designs, which is the safety property:

- a category's `shared.ts`, its `index.ts`, a preset bank, a motion or runtime module - any
  template file declaring no design id;
- `src/blocks/`, `src/assets/`, `src/model/fonts.ts`, `src/model/themeTokens.ts`,
  `src/validation/runtimeBench.ts`, `src/validation/occlusion.ts`, and every CORE path
  `e2e-affected` escalates on;
- **the gate scripts and their baselines themselves.** Editing the rule and never executing it over
  everything is how a gate quietly stops measuring what it claims to - so this branch's own runs
  report `FULL catalog`, correctly.

`scripts/catalog-affected.test.mjs` (14 cases, in `npm run build`) pins the DIRECTION rather than
the convenient answer: one shared file in a change poisons a slice that would otherwise be narrow.

## Nothing was weakened - and the four places that needed care

The guardrail was "only WHERE and HOW MUCH, never WHAT". Four checks could not survive naive
scoping. Each was handled rather than dropped, and **two of them were real defects in the first
implementation, found by the review round** - both are the "measures less and says nothing" class
the brief asked me to watch for:

1. **A slice built from declarations alone was WRONG, not merely narrow.** `tickers/tk07.ts` calls
   `houseWire` out of `tk05.ts` as its entire `create` body, so editing tk05 changes what EIGHT
   designs emit - and the first version named one, measured one, and passed. `mr01 -> mr04` and
   `rs03 -> rs04` have the same shape. The attribution follows importers now, which is complete
   rather than cautious: if a change can move a design, that design's code depends on it.
2. **The gate-file list was a hand-typed roster and already omitted `catalog-scope.mjs`** - the
   shared `--only` implementation every sweep imports. A change to the thing that decides the scope
   would have run no catalog gate at all. It is a pattern now.
3. **`mark-height.spec.ts`'s `MAY_GROW` allowlist, checked from the other side**, read every entry
   it did not measure as stale, so a one-design run reported the whole list. It went red on the
   first scoped run. Now asked only of entries the run measured - while a FULL run still asks it of
   every entry, which is what catches an entry whose design has left the catalog.
4. **The vacuity floors and the variant-SET comparison** are whole-catalog facts. Asserted only on
   a full run; a scoped run instead compares both directions WITHIN the slice, and the unknown-id
   refusal (`catalog-scope.mjs` for the scripts, `catalog-specs.mjs` for the specs) is what stops a
   stale scope reading as "swept, nothing wrong".

Baseline re-records refuse outright under a scope, in all three places that can write one: a
baseline is a claim about every row in it.

## What I got wrong, and corrected

**The docs claimed CI runs the full battery. It does not, and never did.** CI's catalog job runs
the emit gate and the calibration tripwire; `type-floor`, `overflow-sweep`, `field-coverage` and
`numerals` are NIGHTLY-only. I wrote "the full battery still runs nightly and on CI" in five
places before the review caught it. `docs/VERIFICATION.md` now carries a table saying exactly which
schedule covers which gate, and the other four sites point at it.

## What I could not make cheap

- **`l3-sweep` is untouched.** It takes two POSITIONAL arguments (out-dir, category), so `--only`
  would break its grammar, and it is a screenshot instrument for a human rather than a gate. It is
  already category-scoped; `catalog:affected` prints the per-category command.
- **Emission itself.** A DOM is genuinely required (above). Three seconds is the floor without
  taking a new dependency.
- **The per-spec vacuity floors are still nine `if (!ONLY_DESIGNS)` sites.** The review proposed one
  `expectMeasured` helper; each floor has a different universe ("mark-capable lower thirds",
  "staged designs", "multi-column containers") that only the spec knows, so a generic helper would
  need every spec to declare its universe anyway. Left as is, deliberately, and worth revisiting if
  a seventh catalog spec appears.
- **The 63 designs with no file of their own** (audience, some info-cards, frames, transitions,
  stream-notifications) are attributed anyway, because the map reads declarations rather than
  filenames. All 504 are attributable; 483 of the 599 template files yield a slice, median 8
  designs, max 47.

## Two things the next session should know

- **THE ROOT CONTRACT IS FULL, and this is now urgent rather than a note.** On `origin/main` the
  `src/components/wizard/AGENTS.md` chain has **49 bytes free** of its 112,000 - main trimmed it
  once today (`cf40d4fa`) and it is still that tight. My first attempt to add two lines to root
  rule 5 failed `check:shared-instructions` by 148 bytes, and no amount of trimming my own wording
  would have fit. What landed instead REWRITES rule 5 to be shorter than main's version: it points
  at `npm run catalog:affected`, which PRINTS the five gates, rather than listing their names - so
  the rule gained a command and lost a list, and the chain ends with **73 bytes free, 24 more than
  main had.** That is not a fix, it is one session's worth of slack. The next addition to the root
  contract of any size will fail before anything else does, and the real answer is somebody
  condensing `src/components/wizard/AGENTS.md`, which is another session's file.
- **`preview_start` served the MAIN checkout, not this worktree** (port 5174, not this worktree's
  5210), because the session's own directory was the main checkout. The sweep timings were taken
  against that server after proving the served bytes identical - `git diff` between the main
  checkout's HEAD and this branch over `src/` is one markdown file - which is the procedure
  `e2e/AGENTS.md` documents for this case. Worth knowing: a session started outside its worktree
  gets the wrong dev server silently.

## Landing

`npm run build` green on the integrated sha (main taken in twice - `dd-svg-fitting-two` and
`cc-playout-polish` both landed while this branch was in flight, and the second of those changed
`templates/shared/clock.ts`). The full catalog battery ran unscoped today and passed in every gate;
`npm run check:catalog-emit` passes on the final tree, which is the check for main's template
changes and takes three seconds.

**One integration run went red, and it is not this branch's:**
`e2e/student-rehearsal.spec.ts:110` failed in j-0212 on a quiz state class
(`imported-design-qon` not applied within 7 s, 17 retries seen), passed in j-0209 on the same
branch, and passes on its own in 17 s. **This branch changes no application code at all** - the
only file it touches under `src/` is `src/templates/AGENTS.md`, a doc - so it cannot be the cause.
It reads as a load flake in a spec that drives an imported SVG quiz through a production, and
`dd-svg-fitting-two` (which rewrote `templates/importedDesign/svg.ts`) landed the same afternoon.
**It is not re-run-until-green'd here**: it is reported, and the final integration run on the
twice-integrated sha is what the landing waits on. If it recurs on main it wants an owner, like
`anim-engine.spec.ts:656` before it.
