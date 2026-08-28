# Handoff - cr10 "Graduation Roll" retired into cr01 "Classic Roll"

2026-08-28, branch `claude/sleepy-payne-1b1111`. The owner's morning ruling on the catalog
duplicate ranking: "Classic Roll and Graduation Roll do look a bit too similar so we can remove
that. But let's keep the rest for now." Exactly that one removal is made; every other pair in the
ranking stays.

## What shipped

- **cr10 deleted, cr01 stays.** The pair was the end-credits category's closest rendered pair
  (card-pair-sweep 0.0187). cr10's one layout idea - the first half of a line set large, the
  second small beneath it - is already cr01's Emphasis style choice (`Name | Award` typed into
  cr01 with Emphasis on Role renders the graduate large, the award beneath). Nothing unique was
  lost:
  - its **credits-loop preset** moved onto cr01 (`animationPresets: ['credits-roll',
    'credits-loop']`; roll stays first, so an untouched build - and every baseline hash - is
    byte-identical to before).
  - its two kit references are re-pointed: the Classroom pack's extra became cr01, the
    Church & Ceremony pack already listed cr01 so cr10 was simply dropped (`packs.ts` +
    `docs/PACK_TAXONOMY.md` in the same change; `factory.mjs` validates the pair).
- **Retirement recorded where the next session reads**: `endCredits/index.ts` header (the id is
  never re-minted), `endCredits/AGENTS.md`, the category line in `src/templates/AGENTS.md`, and
  card58's sibling comment now points at cr01.
- **Baselines: removal-only hand edits**, per the additive-diff rule in `src/templates/AGENTS.md`
  (no full re-record): cr10's rows removed from `e2e/catalog-baseline.json`,
  `e2e/catalog-render-baseline.json`, `scripts/overflow-baseline.json` (`cr10` + `cr10@image`)
  and `scripts/copy-baseline.json`. cr01's hashes are untouched because its default emit is
  unchanged.
- **The owner-queue item `2026-08-28-catalog-duplicate-ranking.md` is deleted** in the same
  commit - the ruling answered it in full (one removal, the rest kept). NOTE: the
  h-github-storefront worktree had an uncommitted copy of that file at session start; if its
  session lands an edit to it, the deletion here wins the ruling but the merge may conflict
  trivially.

## Verification

- `npm run build` green.
- The five catalog gates + `catalog-baseline.spec.ts` + `end-credits.spec.ts` were enqueued
  (j-0140..j-0145); no e2e spec names cr10 or "Graduation Roll" (checked end-credits, images,
  package, holding-pack, full-frame-offering, flows, anim-engine - they pin cr01/cr06/cr08 by
  name, all of which stay).
- `l3-sweep end-credits` was deliberately skipped: the change is removal-only and cr01's
  rendered output is unchanged, so there is nothing new to measure.

## For a future credits proving round

This change was kept minimal on purpose - the credits pack's operator story (paste one list,
per the 2026-08-27 owner decisions) owns the pack more broadly. Things it may want to look at:
whether cr01's Emphasis default serves the ceremony use (cr10 defaulted to manrope + a ceremony
sample; cr01 keeps inter + the film-credits sample), and whether the ceremony packs want a
ceremony-flavoured sample as a kit-level concern rather than a separate design.
