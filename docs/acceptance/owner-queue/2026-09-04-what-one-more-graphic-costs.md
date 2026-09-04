---
kind: walk
date: 2026-09-04
---
# The answer to "will more graphics slow us down" is a number now, and you can run it

You made the weekly drawing cadence conditional on this today: *"it won't make our CI and E2E
tests take even longer, because right now iteration speed is still more important than a broad
template gallery."* Here is what a design actually costs, measured rather than argued.

## The route, under a minute

```bash
npm run build            # only for the bundle half - it reads dist/
npm run check:catalog-cost
```

The prerender half is measured live each time you run it; the CI half comes from two real runs of
`catalog-gates.yml` that differ only in scope, one design against the whole catalog, on the same
workflow and the same runner class (33898338599 against 33896869659).

## What to look at

At 502 designs today:

- **Every build pays about 1 ms per design** for its prerendered page. Design 503 adds a millisecond.
- **An ordinary catalog change pays nothing per design.** It is scoped by `catalog-affected.mjs`
  to the designs the change can move, so it is half a minute whether the catalog holds 500 or
  5000. This is your own proposed remedy, already built.
- **A FULL sweep pays 1.25 s per design**, and it only happens when a SHARED file changes. It is
  10.9 minutes today and would be 13.0 at 600 designs.
- **The site half found something.** The landing page pulls no catalog chunk at all and the
  studio fetches its one (1.7 MB, 93 design ids) on demand after `/app` boots - but **`/ograf`
  pulls both big chunks straight from its own script tag, 3.7 MB, and `/bridge` pulls one, 2.3 MB.**
  At about 7 KB per design those two pages do get heavier with every graphic drawn. It is a
  chunking fault on two pages, not an argument for a smaller gallery, and it is filed as
  `docs/backlog/ograf-and-bridge-ship-the-whole-catalog.md`.

**The judgement I would like yours on:** on these numbers the weekly cadence of three or four
designs is inside the noise for years, so I lifted the cap `docs/CATALOG_BY_PROGRAMME.md` §10 put
on it while the cost was unmeasured. Say if you would rather it stayed capped until `/ograf` is
fixed. The number to watch afterwards is the FULL sweep, not the per-change one - it is the only
line that grows.

## What this does NOT change

No design was added, removed or altered, and no gate got weaker. The check reports and never
gates: a build cannot go red on it, which is deliberate, because a number nobody reads is worse
than no number.
