# Handoff - the lower-third taste round: shapes drawn, duplicates gone, the rest ranked

Session S (catalog taste), 2026-08-28. Everything here is on `claude/s-catalog-taste-d782b9` -
pushed, CI green on the integrated sha (all nine shards + the catalog calibration gate ran).
`docs/handoffs/lower-third-shapes.md` was the assignment and is consumed.

**Queueing was BLOCKED at the end of the session**: the main checkout was sitting on the live
`claude/quality-review-2026-08-28` branch with uncommitted files, so `main` was checked out
nowhere and `auto-merge` fails closed on that precondition. The branch is finished - run
`npm run queue:merge` from this worktree once the main checkout is back on `main`.

## What shipped

- **Two new silhouettes.** `lt66` "Top Corner" (the corner block: sport slab in the top-right
  corner, staged at 380px, Royal azure) and `lt67` "Matte Window" (the framed cut-out: a paper
  mat with a window of live picture, the name inside, captions printed on the mat). The
  **full-frame card is DECLINED, not deferred** - the owner's own scoring called it the likeliest
  variation of the title-card compositions we already have, and the standing rule is "93% is
  enough" for variations. The side column stays closed (lt65's lesson).
- **Six measured duplicates retired**: lt10, lt21, lt23, lt29, lt36, lt47. The reasoning is in
  `src/templates/lowerThirds/index.ts`'s header; the durable rule ("a dedicated mark variant of a
  slot-capable sibling is the same card twice at defaults") is in the category AGENTS.md.
- **A new instrument**: `scripts/card-pair-sweep.mjs [category|all]` ranks every same-category
  pair by rendered-card structural distance plus a hue distance - the pairwise complement to
  card-look-sweep's distributions. Registered in SWEEP_SCRIPTS.
- **One legibility fix bought by the gates**: Oswald at weight 800 paints 4.4px past a 1.2em
  line box (measured ink), so lt66's name/role run at 1.3 - an Å keeps its ring.

## The measured state of the shelf

`card-look-sweep lower-third` after the round: 101 designs, strap/thin 93% (was 96%), four
footprint buckets, light backdrops 9 (was 7), nine accent hues, 21 distinct card looks, the
most common look at 24%. The shelf image was looked at by a person this session: page one
carries two light cards, six hues and pill/card/block variety, no two cards read as twins.

## For the owner (both in `docs/acceptance/owner-queue/`)

- **2026-08-28-catalog-duplicate-ranking.md** - the catalog-wide near-duplicate ranking in three
  classes: true duplicates (candidates listed), family-matrix skins (a KIT-MODEL decision, not a
  cleanup), and same-skin-different-words siblings. Removals outside lower-third are the owner's
  call.
- **2026-08-28-plainer-style-names.md** - plainer names proposed for BOTH readings of the
  "sounds AI generated" note (the six style families, the fourteen palettes). Nothing renamed.

## Open threads for a next session

- **Footprint as a first-page spread axis** (docs/CATALOG_WORK_QUEUE.md §2): there are now four
  shapes to spread, but the axis has to be MEASURED and shipped as a baseline (the
  `tabularFigures` pattern) - the new silhouettes are reachable but not on page one.
- The kit picker's Look dropdown renders raw lowercase family ids (`minimal`, not "Minimal") -
  a one-line fix waiting on the names decision above.
- The transition category cannot be measured by the card instruments (it covers the frame then
  clears itself); a settle-at-cover hook would fix both sweeps.
- `card-pairs` raw data is re-derivable: `node scripts/card-pair-sweep.mjs all --json out.json`
  (~35 min, queued form).
