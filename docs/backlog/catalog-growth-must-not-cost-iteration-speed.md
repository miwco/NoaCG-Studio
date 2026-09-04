---
v: 1
source: owner
raised: 2026-09-04
state: unstarted
asked: "one thing I want to make sure of before we implement more graphics is that it won't make our site heavier. It won't make our CI and E2E tests take even longer, because right now iteration speed is still more important than a broad template gallery. If this does affect CI and E2E runs, then we first need to figure out how we can implement graphics so it doesn't affect those. Or then just codely cut all graphic templates from all the runs, so we can add to them and then, at some point, run them all together"
---
# What a bigger catalog actually costs, and the two places it is not yet free

**Filed:** 2026-09-04. **Source:** owner, ratifying the weekly drawing cadence and attaching this
as the condition on it.

## Why

He agreed to a weekly package of three or four designs and then named the thing that would make
that agreement a mistake: iteration speed matters more right now than a broad gallery. The
cadence should not be run until someone can say what it costs per design.

Half the answer already exists and half does not.

**Already safe: ordinary CI.** `scripts/catalog-affected.mjs` maps a change to the designs it can
move, from the source rather than a curated list, and every catalog gate takes `--only <ids>`. It
was built after his 2026-08-28 complaint that a template change "takes a lot of effort from the
computer". So a normal run's cost tracks the change, not the catalog, and the 514th design adds
nothing to it. His fallback suggestion - cut templates from the runs and sweep them together
later - is what this already does.

**Not measured, three of them:**

1. **The full sweep is O(designs) by construction.** When a SHARED file changes, every design is
   re-measured, and that is correct - it is the only thing that catches a broadly broken catalog.
   But it means the worst case grows every week, and nobody has said what it is today or what it
   would be at 600 designs.
2. **Prerender runs in every build.** 513 HTML pages on 2026-09-04, one more per design, forever,
   on every build including the ones gating an unrelated one-line fix.
3. **The catalog looks statically bundled.** `src/templates/catalog.ts` carries 26 static imports
   and no dynamic ones, so designs appear to reach the client whether or not anyone opens them.
   That is the "heavier site" half of his question and the one with a user-visible cost.

## What it would take

Measure first, in this order, because the answer may be that there is nothing to do:

1. Time the full catalog sweep today, and divide by the design count. If a design costs a second,
   the weekly cadence is inside the noise for a year and items 1 and 2 can be left alone with a
   number written down.
2. Time the prerender step alone within a build, same arithmetic.
3. Find which chunk the designs land in and how large it is. If they are in the app chunk, code
   splitting the catalog is the fix, and it is worth doing for page weight regardless of cadence.

Only then decide whether anything needs changing. The trap here is doing the interesting
engineering before the boring measurement.

## What this does NOT gate

The weekly row is capped rather than stopped while this is open (`docs/CATALOG_BY_PROGRAMME.md`
§10). Three or four designs a week against a 513-page prerender is not the thing that will slow
CI, and halting the cadence to protect an unmeasured cost is the same mistake in the other
direction.

## Evidence

- Owner, 2026-09-04, verbatim in the receipt above.
- `scripts/catalog-affected.mjs` header, which records the 2026-08-28 complaint it was built for.
- Build of `c5606a330f`: 513 HTML files in `dist/`.
- `src/templates/catalog.ts`: 26 static imports, no dynamic imports.
