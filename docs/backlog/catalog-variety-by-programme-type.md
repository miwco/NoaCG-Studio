---
v: 1
source: owner
raised: 2026-09-03
state: unstarted
asked: "we need to have a strategy on how to create those so they don't end up looking the same ... research what kind of graphics different programs need ... the default color and default animations for different graphics should be different"
---
# A catalog strategy: research what each kind of show needs, then build packages that differ by default

**Filed:** 2026-09-03. **Source:** owner walk of the Style step.

## Why

The owner measures the catalog against competitors who have been at this for years and ship large
downloadable packages, and he does not think we are on that level:

> There is still a small problem. I think that we don't have the width of the template gallery that
> we need. Our competition has years in the business, and they have big catalogs with different
> kinds of packages that you can download. I feel like we're not on that level yet.

> We need more and different graphics, but right now we need to have a strategy on how to create
> those so they don't end up looking the same. Most of the graphics we have look like the house
> graphics; they are banners with an accent line.

`template-variety-and-dedup.md` already carries "add designs that look different, delete the
near-duplicates", and it is still right. **This row is the three things in his 2026-09-03 words
that it does not carry**, and they are what turn drawing more cards into a strategy.

### 1. Research what each kind of show actually needs, before drawing anything

> this could be added to the to-do list to research what kind of graphics different programs need.
> The variety is so big; there are so many different programs. We have to be able to do talk shows,
> game shows, podcasts, sports, film-type stuff.

Today the catalog is organised by graphic type (lower third, stat card, ticker). It is not
organised by the show that needs it, and nobody has written down what a game show needs that a
podcast does not. That survey is the input to every drawing session that follows, and without it
each session invents its own idea of what is missing.

### 2. Difference has to be what colour and animation CANNOT change

> They should be different, as I said, so that you can then modify the colors. Difference is not
> just different colors; those we can change. Animations we can change inside a wizard - that's how
> it's thought.

The wizard already changes colour and animation, so any two designs separated only by those are one
design. What is left is silhouette, layout, type and structure. `card-look-sweep.mjs` is the
instrument that reads this (rendered pixels, not CSS decisions) and the 96% `strap/thin` finding in
`template-variety-and-dedup.md` is what it measured.

### 3. The DEFAULTS have to differ too, or the shelf still looks like one designer

> also the default color and default animations for different graphics should be different so that
> we don't have the same colors on every thumbnail when you look through the graphics. You know
> that's also bad.

This is a distinct defect from sameness of design, and it is cheaper to fix. Two genuinely
different designs that both ship with the house amber and the same wipe-in read as a set on the
Browse page, which is the only page where the catalog is judged. A design's default palette and
default entrance should be chosen for that design, and the spread across defaults should be
measured on the first page the way `spreadFirstPage` already spreads hue and family.

## What it would take

1. **The survey.** One durable doc: for each show genre he named - talk show, game show, podcast,
   sports, film/entertainment - what graphics that genre runs, what each one has to say, and which
   of them the catalog has nothing for. Desk research against what comparable products ship, in the
   method `more-behaviours-than-poll-and-quiz.md` already establishes: derive the conventional
   answer rather than asking him.
2. **A gap table** off that survey, joined to what exists, so a drawing session is handed a named
   absence instead of "make something different".
3. **Per-design defaults.** Default palette and default entrance become a real design decision per
   design, with a first-page spread measurement that fails when the thumbnails converge.
4. **A cadence.** His words: *"We need to keep on adding templates; it could be once a week or each
   night we add something, so we end up with a catalog full of high-quality, different types of
   graphics, and they should be innovative and beautiful."* A recurring drawing slot, fed by the
   gap table, is what makes the catalog grow without a person deciding each time what is missing.

## Evidence

Owner walk 2026-09-03, verbatim above. He set the review point himself: *"let's see again after
this wave how I feel about it."*

Prior art: `template-variety-and-dedup.md` (variety and dedup, with the 96% `strap/thin`
measurement), `unique-first-catalog.md` (one unique card per design, skins behind it),
`docs/CATALOG_VARIETY.md`, `docs/LOWER_THIRD_SHAPES_BRIEF.md`, `docs/KIT_MATRIX_GAPS.md`.
The instrument is `scripts/card-look-sweep.mjs`; `catalog-sameness.mjs` cannot see this and rated a
page 11-distinct-of-12 that the owner called identical.
