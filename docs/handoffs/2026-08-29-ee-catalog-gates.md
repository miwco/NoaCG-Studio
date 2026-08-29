# Handoff - catalog verification becomes O(change)

Session EE of the 2026-08-29 day wave. Branch `claude/ee-catalog-gates`, four commits, build green,
main integrated.

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
| `check-catalog-emit` (new) | 2.6 s | 0.7 s |
| `type-floor` | 143 s | 7 s |
| `overflow-sweep --baseline` | 155 s | 6 s |
| `field-coverage` | 256 s | 5 s |
| `numerals` | 96 s | 7 s |
| `test:e2e:catalog` (35 units) | 217 s | 33 s |
| `catalog-baseline.spec.ts` | 43 s | 15 s |
| **total** | **913 s (15 min 13 s)** | **74 s (1 min 14 s)** |

**12x.** Every full-catalog run above passed, which is the other half of the measurement: the
scoping edits did not change any verdict.

## What was built

**1. `scripts/catalog-emit.mjs` + `npm run check:catalog-emit`.** Three of the four gates in
`e2e/catalog-baseline.spec.ts` are about TEXT - each design's emitted html/css/js against the
committed fingerprints, the hidden-data-holder rule, the name collisions - and needed a Playwright
spec, a Vite dev server and an `/app` boot to ask. This bundles the catalog with Rolldown and
creates all 504 designs on a blank Chromium page: **2.6 s, and it matches
`e2e/catalog-baseline.json` byte for byte.**

**The step as briefed - "a node test inside npm run build" - is NOT achievable, and here is why.**
Creating a design applies its motion preset, and `blocks/presetRegistry.ts` resolves the design's
class prefix and SVG layers by PARSING the html it just emitted (`model/structure.ts`,
`new DOMParser()`) - deliberately, because a prefix is a DOM fact rather than a text pattern.
Measured: **all 504 designs fail in bare Node with `ReferenceError: DOMParser is not defined`.** The
options were a new HTML-parser dependency, a hand-rolled parser whose disagreements with Chromium
would be silent, or a real Chromium. A blank page is the honest minimum, and it costs 2.5 s. It is
therefore NOT in `npm run build` (CI's Build job installs no browser, and making the repo's
most-run command need one is a bad trade); it runs in CI's catalog job, in the nightly, and as the
first step of the local procedure.

It is also deliberately NOT on the machine-wide browser-job list (`SWEEP_SCRIPTS`): it holds one
blank tab for three seconds, and parking that behind a live suite for half an hour is exactly the
kind of guard people learn to route around.

**2. `scripts/catalog-affected.mjs` + `npm run catalog:affected`** - the scope filter and its
derivation. Every design declares itself with a literal `id: 'lt01'` in one file under
`src/templates`, so the id-to-file map is read off the source rather than curated: a design added,
moved or renamed re-maps itself with no list to update. WHETHER the catalog is affected is still
`e2e-affected`'s answer, asked per file, so there is no second list to drift.

Every gate takes the scope: `--only <ids>` on the four sweeps and the emit check,
`NOACG_ONLY_DESIGNS=<ids>` for the catalog specs (`e2e/_catalogScope.ts`).

**3. The full battery on a schedule already existed** - verified rather than added.
`.github/workflows/nightly.yml` runs the tripwire plus all four sweeps plus `engine-floor`
unconditionally; `ci.yml` runs the tripwire whenever the plan raises the catalog flag. Neither sets
a scope, so both still measure everything. The only additions are the new emit gate in both, run
first because it is cheap and specific.

## What escalates to the whole catalog

Anything that cannot be attributed to named designs, which is the safety property:

- a category's `shared.ts`, its `index.ts`, a preset bank, a motion or runtime module - any
  template file declaring no design id;
- `src/blocks/`, `src/assets/`, `src/model/fonts.ts`, `src/model/themeTokens.ts`,
  `src/validation/runtimeBench.ts`, `src/validation/occlusion.ts`, and every CORE path
  `e2e-affected` escalates on (`src/model/`, `src/store/`, `src/preview/`, `src/styles/`, …);
- **the gate scripts and their baselines themselves.** Editing the rule and never executing it over
  everything is how a gate quietly stops measuring what it claims to - so this branch's own runs
  report `FULL catalog`, correctly.

`scripts/catalog-affected.test.mjs` (11 cases, in `npm run build`) pins the DIRECTION rather than
the convenient answer: one shared file in a change poisons a slice that would otherwise be narrow.

## Nothing was weakened - the three places that needed care

The guardrail was "only WHERE and HOW MUCH, never WHAT". Three checks genuinely could not survive
naive scoping, and each was handled rather than dropped:

1. **The variant-SET comparison** (a design added or removed) is a fact about the whole catalog. It
   runs only unscoped. A scoped run instead checks both directions WITHIN the slice, and any change
   that adds or removes a design file escalates anyway.
2. **The vacuity floors** (`STAGED_FLOOR`, `MULTICOL_FLOOR`, "at least 20 mark-capable lower
   thirds", "at least 90 lower thirds") exist because an empty result reads like a perfect catalog.
   Asserted only on a full run - under an explicit scope, a slice with no multi-column design in it
   is the ordinary case.
3. **`mark-height.spec.ts`'s `MAY_GROW` allowlist, checked from the other side.** This one actually
   went red on the first scoped run, and it is the most interesting finding here: an allowlist
   checked in reverse reads every entry it did not measure as stale, so a one-design run reported
   the whole list. Fixed to ask the question only of entries the run measured - while a FULL run
   still asks it of every entry, which is what catches an entry whose design has left the catalog.
   **This is the class the brief asked me to look for, and it is the only one found.**

Baseline re-records refuse outright under a scope, in all three places that can write one
(`check-catalog-emit`, `overflow-sweep --update-baseline`, `UPDATE_*_BASELINE` in the spec): a
baseline is a claim about every row in it.

## What I could not make cheap

- **`l3-sweep` is untouched.** It takes two POSITIONAL arguments (out-dir, category), so `--only`
  would break its grammar, and it is a screenshot instrument for a human to look at rather than a
  gate. It is already category-scoped, which is what rule 5 asked of it; `catalog:affected` prints
  the per-category command.
- **Emission itself.** See above - a DOM is genuinely required. 2.5 s is the floor without taking a
  new dependency.
- **The 63 designs with no file of their own** (audience, some info-cards, frames, transitions,
  stream-notifications) are attributed anyway, because the id-to-file map reads declarations rather
  than filenames - `structuralLayouts.ts` maps to fr05..fr08 correctly. 441 of 504 have their own
  file; all 504 are attributable.

## Two things the next session should know

- **`src/components/wizard/AGENTS.md`'s instruction chain is at 111,875 of 112,000 bytes** - 125
  free. My two-line addition to the root `AGENTS.md` nearly tipped it, and I trimmed my own wording
  three times to fit. The next root-contract addition of any size will fail `check:shared-instructions`
  before it fails anything else. That budget wants reclaiming by somebody willing to condense
  `src/components/wizard/AGENTS.md`, which was not this session's business.
- **`preview_start` served the MAIN checkout, not this worktree** (port 5174, not this worktree's
  5210), because the session's own directory was the main checkout. The sweep timings above were
  taken against that server after proving the served bytes identical - `git diff` between the main
  checkout's HEAD and this branch's over `src/` is one markdown file - which is the procedure
  `e2e/AGENTS.md` documents for exactly this case. Worth knowing: a session started outside its
  worktree gets the wrong dev server silently.

## Landing

`npm run build` green on the integrated sha. `npm run test:e2e:integration` queued (j-0209).
No conflict risk seen with the branches in flight, but note **`cc-playout-polish` has
`e2e/catalog-baseline.json` modified** - this branch does not touch that file, so git will merge
both cleanly; whichever lands second should re-run `npm run check:catalog-emit` (three seconds) to
confirm the fingerprints still hold.
