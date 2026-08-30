# Template variety, and deleting the near-duplicates

**Filed:** 2026-08-26. **Source:** owner feedback on the shipped catalog.

The owner, looking at the catalog:

> *"too much of the yellow, white, dark house theme... many look too similar... concentrate on
> adding a variety of designs that look different... delete, remove or duplicate graphics because
> they just clutter"*

Two halves, and they pull in opposite directions on purpose: **add designs that look genuinely
different, and remove the ones that are somebody else's design wearing a different accent.**

## Why

A catalog is the first thing a new user meets, and a shelf of near-duplicates makes a promise it
then breaks: it looks like 500 choices and reads like nine. The owner already ruled on this once, in
stronger words, and the ruling is binding on all catalog work:

> *"Let's not keep the house designs first. No one wants to use a design that other people also use.
> It's better to have a unique variety, and if we don't have a lot of graphics that are unique and
> very good, then we are doing something wrong."* (2026-08-21, ratified)

**Sameness is a defect, not a house style.** The count is not the asset; the spread is. And the
clutter half matters as much as the variety half - every near-duplicate costs a row in Browse, a
line in every sweep, and a slice of the reader's patience, while adding no choice at all.

## What it would take

Design work, not a script. This is the one thing on the shelf that cannot be generated:

- **Draw the silhouettes the catalog does not contain.** The brief already exists and is
  self-contained: `docs/LOWER_THIRD_SHAPES_BRIEF.md`, six named shapes with the reason each one
  is new. It stays on the shelf as a handoff rather than being folded in here.
- **Break the house palette.** "Yellow, white, dark" is the studio's own brand reading back at the
  user from the shelf. A catalog that came from different broadcasters, shows and designers does not
  share one accent.
- **Then dedup, with the measurement in hand.** Removing a design is cheap to do and expensive to do
  wrong - a kit that reaches it loses a slot. `docs/KIT_MATRIX_GAPS.md` is what says whether a
  design is anyone's only route to a (type x family) cell.

Sequencing note: **add before you subtract.** Deleting duplicates out of a shelf that has no new
shapes yet just makes it smaller.

## Evidence

- **Shape is genuinely absent: 99 of 103 lower thirds are `strap/thin`. 96%.** No full-width band,
  no tall panel, no side column, no corner block, no full-frame name card. Measured with
  `node scripts/card-look-sweep.mjs lower-third`, which reads RENDERED pixels.
- **Colour was BURIED, not absent, and that half is FIXED.** Nine accent hues, 31 designs with no
  coloured accent, 7 light backdrops - invisible because Browse showed the fold in registry order.
  `spreadFirstPage` (`src/templates/search.ts`) now spreads the first page across hue and family.
  So the owner's "too much of the yellow, white, dark" is now a statement about the DESIGNS rather
  than about the ordering, which makes it drawing work.
- **The old instrument cannot see this.** `catalog-sameness.mjs` scores fourteen CSS decisions and
  rated the same page 11-distinct-of-12 while the owner said they all looked the same. An eye reads
  PALETTE and SILHOUETTE. Use `card-look-sweep.mjs` for anything about look.
- **Every category except lower-third and stats is unmeasured on the card-look axis**, so the size
  of the problem outside lower thirds is currently unknown.

Prior art and the full queue: `docs/CATALOG_WORK_QUEUE.md`, `docs/CATALOG_VARIETY.md`,
`docs/LOWER_THIRD_SHAPES_BRIEF.md`.
