---
v: 1
source: walk
raised: 2026-09-04
state: unstarted
asked: "a ticker story tagged inline also tags every untagged line beneath it, which is not what docs/TICKERS.md says it does"
---
# An inline ticker kicker tags the lines below it as well

**Filed:** 2026-09-04, walking
`docs/acceptance/owner-queue/2026-09-03-ticker-kickers-one-mechanism.md`. That item's own claim -
no markup on the strips that broke, one mechanism across the category - is confirmed and its file
is closed. This is a different fault in the same format, found by typing a rundown the item's
route does not produce.

## What happens

On an **Index Strip**, four rows:

    OMXH25: 4218.60 +1.24%
    MARKET REPORT: DAX 18422.15 -0.31%
    DOW JONES 39112 +0.7
    NASDAQ 17442 -0.3

The crawl reads:

    MARKETS | OMXH25 4218.60 +1.24% | MARKET REPORT DAX 18422.15 -0.31% |
    MARKET REPORT DOW JONES 39112 +0.7 | ...

`DOW JONES` and `NASDAQ` are untagged rows and they come out tagged **MARKET REPORT**.

## Why that is a defect and not a preference

`docs/TICKERS.md` publishes the complete set as a table, and its first two rows are different
promises:

| You type | You get |
|---|---|
| `SPORT: United win 3-0` | **one story, tagged `SPORT`** |
| `SPORT:` | a kicker; every line under it carries it |

The parser makes them the same thing. `parseTickerItems` in
`src/templates/tickers/shared.ts` has one branch for the colon:

    var mark = tickerKickerMark(line);
    if (mark > 0) {
      open = line.slice(0, mark).trim();          // <- set for the lines BELOW, in both forms
      var inline = line.slice(mark + 1).trim();
      if (inline) items.push({ kicker: open, text: inline });
      return;
    }

`open` is assigned before the inline story is checked, so a line that carries its own story still
leaves the kicker open. The tab form two branches up does the same, and the docs call that form
*"the same as the first"* - one story - so it is wrong in the same way.

The comment above that branch says the one-branch shape is deliberate: *"'SPORT:' simply has
nothing after it, which is what leaves the kicker open for the lines beneath."* That sentence is
true about the own-line form and it silently also describes the inline form, which is how the two
readings drifted apart without anybody noticing.

## Which way it should go, and why

**The documentation is right and the code should follow it: an inline tag tags its own story and
nothing else.** Three reasons, and I would not send this one to the owner:

1. If the inline form opened a run, the own-line form would be pure sugar for it. Two spellings
   earn their keep only when one means *tag this story* and the other means *open a run*. That is
   exactly what the published table says they mean.
2. The failure is asymmetric. A tag that fails to appear is visible to the operator typing the
   rundown and costs one more line. A tag that appears where nobody put it airs as a false
   attribution - a market number filed under a desk that did not file it - and the operator has no
   reason to look for it.
3. Every rundown that relies on the current behaviour can be written in the documented form by
   moving the tag to its own line, and it reads better that way. Nothing is lost.

## The fix

Assign `open` only where the line has no inline story:

    var mark = tickerKickerMark(line);
    if (mark > 0) {
      var label = line.slice(0, mark).trim();
      var inline = line.slice(mark + 1).trim();
      if (inline) { items.push({ kicker: label, text: inline }); }   // tags one story
      else { open = label; }                                          // opens a run
      return;
    }

and the same split in the tab branch. The gate is a parse test with a bare line under an
inline-tagged one, asserting the bare line's kicker is `''`.

**Check the shipped samples before changing it.** `2026-08-26-tickers-a-colon-ends-a-kicker.md`
records that Breaking Crawl's sample was rewritten into the grouped form; if any sample leans on
the inherited-inline reading it will change on air, and that is worth seeing rather than
discovering.
