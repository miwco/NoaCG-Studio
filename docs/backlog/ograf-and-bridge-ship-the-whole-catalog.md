# /ograf and /bridge pull the whole catalog in their first payload

**Filed:** 2026-09-04. **Source:** measurement (`npm run check:catalog-cost`).

## Why

The owner's condition on the weekly drawing cadence was that a bigger gallery must not make the
site heavier. For most of the product it does not: `/` pulls no chunk carrying design ids, and
`/app` reaches its one through `await import(...)` after boot. Two pages are different.

`ograf.html`'s entry chunk statically imports **both** catalog chunks - `ograf-*.js` (2.27 MB, 299
design ids) and `frameGraphic-*.js` (1.41 MB, 203 design ids) - so opening `/ograf` downloads 3.7
MB of graphics catalog before anything renders, whether or not the visitor wants any of them.
`bridge.html` pulls the 2.27 MB one the same way. At roughly 7 KB per design, those two pages are
the only place in the product where every graphic drawn from now on is paid for by a visitor who
never asked to see it.

This is a chunking fault, not an argument for a smaller catalog: `src/templates/catalog.ts` holds
26 static imports, and the chunker splits them out of `/` and `/app` already. Something on the
`/ograf` and `/bridge` paths reaches the catalog eagerly.

## What it would take

1. Find the eager edge. `dist/assets/ograf-*.js` (the ENTRY chunk, not the catalog one) is where to
   start - it statically imports both. The question is which module on the OGraf export or bridge
   path pulls `catalog.ts` rather than a variant by id.
2. Make that edge dynamic, the way `/app` already does it, or narrow it to the one variant the page
   actually needs.
3. Re-measure with `npm run check:catalog-cost`, which now names the pages a chunk is eager on.
   The line to see is `bundle, on demand` for both chunks.

## What this does NOT gate

The weekly drawing cadence. It was capped while the cost was unmeasured
(`docs/CATALOG_BY_PROGRAMME.md` §10); the cost is measured now, and 7 KB per design on two
secondary pages is not a reason to draw fewer graphics. The owner has the finding in his walk
queue and can say otherwise.

## Evidence

- `npm run check:catalog-cost` against a build of `d56ffb4d`, which prints the carrying chunks,
  their size, their design-id count and the pages whose first payload holds them.
- `dist/ograf.html` -> `assets/ograf-CJcCs7EQ.js`, whose static imports are
  `composeDocument-*.js`, `frameGraphic-*.js` and `ograf-D3cFiBFE.js`.
