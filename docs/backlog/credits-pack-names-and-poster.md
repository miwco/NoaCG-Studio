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
- An owner-queue item filed 2026-08-26 routed the owner to "Classic Roll" BY NAME. It has since
  been walked and consumed, so that particular blocker is gone - but the shape of it is not:
  **before renaming a shipped design, grep `docs/acceptance/owner-queue/` for its current name**
  and update any route you find in the same commit, or the rename breaks a walk nobody has done
  yet.

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
is a taste question that went to the owner queue on 2026-08-26 as "a settled graphic is not
empty"; that item has since been walked, and the answer never came back here. Both
answers are one line. The poster-frame declaration above is the mechanism either answer would use.
