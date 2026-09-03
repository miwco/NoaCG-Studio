---
kind: walk-p
date: 2026-08-26
done: true
---
> **Settled 2026-09-03 - the open decision in this item was already stale when it was filed.**
> "The one decision waiting on you" points at `docs/TEMPLATE_TAXONOMY_PROPOSAL.md` §19, which the
> owner answered on 2026-08-27 (Option A) and which shipped on 2026-08-28; that section's own
> heading records it. The label question is settled by his standing direction that plain single
> words replace the adjective pairs, which is what the six families now are.

# Browse: the style labels, and what each chip row is asking

**Date:** 2026-08-26 · **Branch:** `claude/browse-template-discovery-142aa1`

## What changed

You read the style row and said the names felt AI-generated - *"Bold & on-air, Sport &
energetic… I get the AI slop feeling with those names."* The tell was the shape rather than any
one word: in every pair the second half was an adjective doing no work, because the family was
already named by the first. Six of those in a row reads as copywriting.

The six families are now **one plain word each: Minimal, Editorial, Cinematic, Sport, Glass,
NoaCG.** That is not new vocabulary - it is what the older Template step has printed all along,
so the rename deleted a second copy of the table rather than inventing a third.

The style family also **stopped being a card title**. It used to sit opposite the design's name
in its own family colour - amber for the house look, lime for sport, ice blue for glass - which
made a *filter value* the second-loudest thing on every card in the catalog. It is now a dim tag
on the last line, next to Simple / Standard / Advanced.

Shortening the labels cost something, so it was paid for: **each chip row now says which question
it answers.** "Sport" and "Cinematic" alone could be read as kinds of programme. The row is
captioned **Style:**, and the row above it - the one you called "a third way of looking at
things" - is captioned **Inside &lt;shelf&gt;:**, because it is not a third way: it is the second
level of the type dropdown, and it disappears when you clear the dropdown. It only ever *looked*
like a parallel axis because it was drawn with the same pills as the style row and neither was
labelled.

## The route, in under a minute

1. `/app` → **New graphic** → **Templates**.
2. Look at the chip row under the dropdown: **Style:** Minimal · Editorial · Cinematic · Sport ·
   Glass · NoaCG.
3. Pick **Timers, breaks & credits** in the dropdown.

## What to look at

- **Does any label read as AI-made now?** That is the whole question. If "NoaCG" as a style name
  bothers you, it is one line in `src/model/taxonomy.ts` - the id `noacg` never changes.
- **Two captioned rows, in order:** "Inside Timers, breaks & credits:" with its three kinds, then
  "Style:" with the six families. They should now read as one question narrowing and a separate
  question, not as two menus.
- **Any card.** The name is alone on its line; the amber category line is under it; the style is a
  dim word at the bottom beside SIMPLE / STANDARD.
- The public template pages print the same labels (any `/templates/<name>` page).

## The one decision waiting on you

`docs/TEMPLATE_TAXONOMY_PROPOSAL.md` **§19** is a ruling request with a recommendation: fold the
member-category chips into the type dropdown as `<optgroup>` rows, so "Credits & thanks · 13" is
something you can *see* while scanning instead of a chip that only appears after picking the right
shelf. Three options, costed. Nothing is built for it.
