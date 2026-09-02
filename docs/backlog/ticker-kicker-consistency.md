---
source: owner
raised: 2026-08-28
state: unstarted
asked: "a colon after the index breaks the Market Board ticker; the kicker mechanism must be consistent across tickers (paraphrase)"
---
# Ticker kickers: one consistent mechanism, and the Market Board break

Owner walk 2026-08-28 on the colon-ends-a-kicker rule (works on most tickers):

1. **BUG:** on the Market Board ticker, a colon after the index BREAKS the design - raw
   kicker markup/class leaks visibly into the output. Reproduce: Market Board, item text
   with a colon after the index name.
2. **CONSISTENCY RULING (direction):** Market Board bolds the FIRST WORD instead of using the
   separator rule - two mechanisms across one category. Owner: "we need to be consistent and
   use a style that works... I'm leaning towards the [colon separator] because there are
   probably many cases where you want to have the kicker be more than one word." (Dictation
   said semicolon twice; the ratified rule and the reasoning point at the colon - confirm
   with him before changing which character.)
3. **Edge cases to decide:** a literal colon wanted in the text (first-colon-only? escape?),
   multi-word emphasis, and designs that want no kicker at all.

Belongs with the ticker category proving round or a next-wave catalog session; universal rule
in the shared ticker runtime, never per-design forks.
