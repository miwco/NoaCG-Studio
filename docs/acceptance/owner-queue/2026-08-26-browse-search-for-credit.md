# Browse: searching "credit", and what the first row looks like

**Date:** 2026-08-26 · **Branch:** `claude/browse-template-discovery-142aa1`

## What changed

You typed **credit** and got "reels and crawls". Measured: the search was already returning all
thirteen credits designs and nothing else - no ticker, no crawl from another category. The
ranking was never the fault. Two other things were.

**The card never said what the graphic was.** The caption read *Crawl*, *Pager*, *Column Roll*
with the style family opposite it in a bright accent colour, and the word "Credits" sat in the
dim block underneath. The caption is now the design's **name alone**, and the line directly under
it - the category - is the second thing the eye lands on.

**Three of the thumbnails were lying.** A picker card settles a graphic by writing the data,
jumping its entrance to the end, and writing the data again. A design whose `update()` re-renders
its own rows - which every credits design does - threw the settled frame away with the elements it
had been written on. So:

- **Pager** came back with all six of its pages at full opacity, drawn on top of each other. That
  is the "just looks like a mess with a lot of graphics in the middle" card, and you were right
  that it does not look like that in reality.
- **Credit Reel** and **Donor Wall** came back **blank** - the track kept its travel transform
  while its content was replaced, parking the whole list off screen.

Settling now re-derives the jump over whatever `update()` built. Every preview surface gets it:
Browse cards, the Home library, the operator panel's first frame.

**The alias table learned the rest of the vocabulary.** "crew", "special thanks", "end titles" and
"supporters" reached **no template at all**; "closing credits" and "rolling credits" reached
exactly one each, by accident. All six now reach the credits shelf.

## The route, in under a minute

1. `/app` → **New graphic** → **Templates**.
2. Type **credit** in the search box. Wait for the previews to paint (a couple of seconds).

## What to look at

- **The first row.** Four cards: Credit Reel, Classic Roll, Column Roll, Pager. Every one of them
  says **Credits & thanks · end credits** on the line under its name, in amber.
- **Credit Reel's preview** is a full readable list of names. It was an empty black rectangle.
- **Pager's preview** is a clean end block. It was six overlapping pages of text.
- **Donor Wall** (second row, far right) shows its donor list. It was a blank grey panel.
- Then try **crew**, **special thanks** and **supporters**. Each returns the same thirteen.

## Still not right, and deliberately not fixed here

- **The names.** *Classic Roll*, *Column Roll*, *Pager*, *Crawl* are still what a stranger reads
  as "reels and crawls". Renaming them is the honest fix, and it is not a Browse change: the name
  slugs the design's public page URL and four e2e specs reach designs by it. Raised in
  `docs/TEMPLATE_TAXONOMY_PROPOSAL.md` §19 for whoever owns the credits pack next.
- **Classic Roll's and Pager's previews are sparse** - a logo and a year, which is honestly where
  their entrance ends. A travelling graphic has no settled frame; the readable frame is the START
  of the travel, not the end. That is a real change to what "settled" means for every rolling
  design, so it is written up as a plan in the handoff rather than guessed at tonight.
