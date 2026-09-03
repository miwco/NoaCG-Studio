---
kind: agent
date: 2026-08-26
---

> **Re-kinded 2026-09-03 - a claim, not an opinion.** Nothing in this item is still a question for
> him. Its own last section says the fix landed and names `2026-09-03-ticker-kickers-one-mechanism.md`
> as the item to walk, so what is left here is one claim about the product - the colon mark works on
> all twenty-two strips - which an agent drives.
# Tickers: a colon ends a kicker

**Date:** 2026-08-26 · **Branch:** `claude/c-credits-tickers-roll`

## What changed

A ticker's one field held a flat list of stories, so the only structure an item could carry was
whatever a design happened to guess from position - and four of them guessed differently. Move a
rundown from Status Rotator to a crawl and the service names vanished; move a headline into a
market strip and its last two words were set as a price.

A ticker item now carries a **kicker** - the tag a story is filed under - with the same mark end
credits use: **a colon ends a kicker, everything else is the story.** A kicker typed on its own
line tags every story beneath it until a blank line or the next kicker. Nothing is required: a
rundown with no marks reads exactly as it did before.

Every design draws a kicker in the accent colour ahead of its story for free. **Status Rotator**
places it itself, in its fixed-width service column.

Two rules differ from the credit roll, both earned by what ticker designs already do:

- The colon must be **followed by a space** (or end the line), so `UNITED 2:1 CITY`, `close at
  20:00` and a link are not kickers.
- A `|` is **not** a separator here: Bilingual Crawl already splits an item at it into two
  languages.

## The route, in under a minute

1. `/app` → **New graphic** → **Templates** → search **House Wire**.
2. **Next** to Fields. Under the rows the step now states the format. Type into the rows:

```
SPORT: United win 3-0
WEATHER:
Storm warning issued for the coast
Ferries cancelled until Thursday
```

3. **Next**, **Next**, **Finish** into the editor.

## What to look at

- **SPORT** and **WEATHER** in the amber accent ahead of their stories, travelling with them.
- **Both** storm lines carry WEATHER - the tag was typed once. That is the whole point of the
  grouped form, and it is what a developing story looks like in a real rundown.
- Now the portability claim: open **Status Rotator** and paste the same four lines. The tag lands
  in its **name column** instead of inline, and nothing was retyped. That is the thing that was
  impossible before - its service name used to be an em dash no other design could read.
- **The taste call worth a second opinion:** the shared kicker is accent-coloured, bold, tracked
  uppercase, with 10px of air after it. On a busy strip (try **Market Rail**, whose items are
  already dense) does it read as a tag, or as noise? A per-design treatment is one line of CSS in
  that design if the shared one is wrong for it.

## Also worth a glance

- **Breaking Crawl**'s sample now ships in the grouped form (`RAIL INCIDENT:` over three updates),
  which is the shape a developing story actually arrives in. Worth a look at whether that reads
  better than four independent headlines.
- The public format guide at **`/docs#tickers`**, and the "Scores, clocks and links are safe"
  section in it - that is the paragraph that stops somebody's fixture list turning into tags.

## What is deliberately NOT done

The other axis of a ticker item is a **value** - a price, a percentage change, a score. Market
Rail, Market Ribbon, Index Crawl and Fixture Crawl still each parse one out of the line by
position, with their own rule, and none of it is portable. Folding a value into the kicker's
grammar would mint a second mark to learn, and the two are genuinely different questions. Say if
that is worth doing next.

## Owner walked it, 2026-08-28 - works broadly, Market Board breaks

Colon-kicker good on most tickers; on Market Board a colon after the index leaks raw kicker
markup into the design (bug), and that design bolds the first word instead - two mechanisms.
Ruling direction + edge cases: docs/backlog/ticker-kicker-consistency.md. Open until the
Market Board break is fixed and one mechanism holds category-wide.

## Landed, 2026-09-03 - walk the new item instead

Fixed on `claude/e-walked-remnants`. The break was not the Market Board's: the tag was glued to
the front of the story before each strip's own drawing code read it, and six of the twenty-two
strips read what they are handed. Three broke outright, three were one rundown away. The tag is
now placed after the strip has drawn its row, so the mark works on all twenty-two.

The consistency ruling is written up with its reasoning in
`2026-09-03-ticker-kickers-one-mechanism.md`, which is the item to walk - **including the one
decision to overrule if you disagree**: the Market Board's bold symbol is its market-data reading,
not a rival tag rule, so it stays and the colon is the only kicker mark.
