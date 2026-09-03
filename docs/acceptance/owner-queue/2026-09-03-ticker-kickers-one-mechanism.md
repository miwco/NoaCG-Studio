---
kind: walk-p
date: 2026-09-03
---
# Tickers: the colon works on every strip now, and it is the only kicker rule

**Date:** 2026-09-03 · **Branch:** `claude/e-walked-remnants`

## What changed

You found that a colon after the index name broke the Market Board - raw markup showing in the
crawl - and said the kicker had to be consistent across the category. Both are done, and there is
a decision below for you to overrule if you disagree.

**The bug.** Every strip draws its own row, and the tag used to be glued onto the front of the
story before the strip's own drawing code got it. That works only while the drawing code treats
what it is handed as plain text, and six of the twenty-two do not: they read it to find a price
move, a score or a language break. The Market Board's reader took the tag's markup for an
instrument and cut it in half in the wrong place, so `class="ticker-kicker">OMXH25` scrolled
across the strip as words. Reproduced with the rundown `OMXH25: 4218.60 +1.24%`. Two more strips
broke identically and three others were one rundown away from it.

The tag is now placed into the row AFTER the strip has drawn it, so the drawing code only ever
sees the story. Nothing about the twenty-two designs changed; the mark simply works on all of
them instead of on the ones that happened not to look.

## The decision I took - one line reverses it

**The colon stays the one and only kicker mark, on every ticker.** Your dictation said
"semicolon" twice; a semicolon has always been accepted wherever a colon is, so both work, and I
wrote the rule around the colon because that is what was ratified and what the docs teach.

**The Market Board's bold first word is NOT a second kicker mechanism, and it stays.** That is
what I had to decide, and it is worth a sentence. The Market Board bolds the symbol because it
splits `OMXH25 4218.60 +1.24%` into symbol, level and move - that is a market board reading market
data, not a tag rule competing with the colon. Now that the colon works there too, the strip has
exactly what the others have: type `MARKETS: OMXH25 4218.60 +1.24%` and you get a MARKETS tag
ahead of a properly parsed instrument. So the category has one kicker mechanism, and each design
keeps its own reading of the content. Nothing was forked.

Your reason for preferring the colon holds: **a kicker can now be several words** - anything up to
32 characters before the colon - which the bold-first-word approach could never do.

## The edge cases, decided

- **A colon you want to keep.** Already safe, and it always was: the colon only ends a kicker when
  a space (or the end of the line) follows it, and only in the first 32 characters. `United 2:1
  City`, `Polling stations close at 20:00` and `Results from 21:00` all pass straight through.
- **Multi-word tags.** Supported - `MARKET REPORT: OMXH25 4218.60 +1.24%` tags with both words.
- **A design that wants to place the tag itself.** Still supported and unchanged: the Service
  Status strip gives it a column of its own.
- **Left open on purpose:** a line that genuinely begins with a short phrase, then a colon and a
  space, and wants NO tag. There is no escape for that, and I did not invent one - a second mark
  to learn costs every operator something, to rescue a line that can be rewritten. Say the word if
  you have hit it in real copy and it becomes worth the mark.

## The route, in under a minute

1. Make a **Market Board** (search *Market* in Browse) and open it.
2. In the items field, type these two lines:
   ```
   OMXH25: 4218.60 +1.24%
   MARKET REPORT: DAX 18422.15 -0.31%
   ```
3. Watch the crawl.

## What to look at

- **No markup anywhere in the strip.** What you must NOT see is `class="ticker-kicker">` scrolling
  past as text. That is the bug.
- The first line reads as a tag **OMXH25** followed by `4218.60` and a green up arrow.
- The second reads **MARKET REPORT** as a two-word tag, then DAX with a red down arrow.
- Then the same two lines on a **News Bar** and a **Sports Bar**. The tag should look and behave
  the same on all three - that is the consistency you asked for.
- Finally a rundown with **no colons at all**. It must look exactly as it did before.
