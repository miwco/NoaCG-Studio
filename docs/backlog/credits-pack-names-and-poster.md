# The credits pack: its names, and the frame a card shows of it

Two things a session that owns the credits pack should take together. Both were measured on
2026-08-26 and deliberately left undone; the reasons are as good now as they were then.

## 1. The designs' names

The owner tried to find a credit roll and read the shelf as "reels and crawls" - which is
literally what those five designs are called: *Classic Roll*, *Column Roll*, *Pager*, *Crawl*,
*Credit Reel*. The search ranking was never at fault (a query for `credit` returns exactly the
thirteen credits designs, in a sensible order); the NAMES are.

Renaming is the honest fix and it is not free:

- A design's name **slugs its public template page URL** (`scripts/prerender.mjs` `pageSlug`), so
  a rename retires a shipped, indexed URL. Answer the redirect question first.
- `e2e/end-credits.spec.ts`, `images.spec.ts`, `package.spec.ts` and `holding-pack.spec.ts` all
  reach these designs BY NAME.
- `docs/acceptance/owner-queue/2026-08-26-end-credits-one-field-role-and-names.md` routes the
  owner to "Classic Roll" by name and has not been walked yet. Renaming before that walk breaks
  the route in an unwalked item - so walk it first, or update the route in the same commit.

A design's name is also unique across the whole catalog (`src/templates/AGENTS.md`), and renaming
a shipped design moves its catalog baseline.

## 2. A picker card wants a POSTER frame, not the settled frame

The two coincide for a lower third and diverge for anything that travels. With the settle recipe
fixed, Classic Roll and Pager now show what their entrance genuinely ends on - a logo and a year,
centred. Honest, and a poor identity card. `e2e/catalog-baseline.spec.ts` already wrote the
general form of it down: an endless marquee has no settled state to reach.

The cheapest honest version: let a design DECLARE its poster progress - a number the entrance is
jumped to, defaulting to 1 - and have the credits presets declare something like 0.15: far enough
in to be past the fade, not far enough to have scrolled away. A per-design declaration degrades to
today's behaviour everywhere it is absent.

The alternative - detecting travel and picking a frame heuristically - was considered and is
worse: it makes a card's look depend on a measurement, which is the class of flake
`catalog-baseline.spec.ts` removed on purpose.

**A second, separate problem in the same area, worth doing on its own:** `reportGraphicBox`
measures `body > div`, which for a full-screen design is the whole canvas, so `frameGraphic` can
never zoom onto the ink - a crawl's card is a hairline strip for exactly that reason. Fixing it
means measuring the ink rather than the container, and it changes framing for every
`coverage: 'full'` design.

## The related taste call, still open

Which frame a roll settles ON - its designed rest pose, or mid-roll where the screen is fullest -
is a taste question the owner queue already holds
(`docs/acceptance/owner-queue/2026-08-26-a-settled-graphic-is-not-empty.md`). Both answers are one
line. The poster-frame declaration above is the mechanism either answer would use.
