# Tickers: the one field

A ticker is a rundown of stories, and a rundown is not a list of FIELDS. Every NoaCG ticker
design has exactly **one** field for the whole rundown - a multi-line `textarea` (`f0`) the
operator types or pastes into, in the studio or later in SPX, CasparCG, the NoaCG control page,
or whatever else is driving the graphic. Adding a story never adds a field.

Which means the format has to carry the one distinction a ticker item is made of: **which part
of a line is the KICKER - the tag the story is filed under - and which part is the STORY.**

## The rules

There is one mark to learn. **A colon ends a kicker. Everything else is the story.**

```
SPORT: United win 3-0
```

A desk with several stories puts the colon at the end of its own line, and the stories follow
beneath it:

```
SPORT:
United win 3-0
City held at home
Rovers sign a goalkeeper
```

The kicker heads its stories until a blank line or the next kicker, which is why a run of
stories from one desk is typed once rather than once per line.

The complete set:

| You type | You get |
|---|---|
| `SPORT: United win 3-0` | one story, tagged `SPORT` |
| `SPORT:` | a kicker; every line under it carries it |
| `SPORT` `<TAB>` `United win 3-0` | the same as the first - what a paste from a spreadsheet column gives you |
| `Storm warning issued` | a plain story, with no tag at all |
| *(blank line)* | closes the open kicker |

A **semicolon works everywhere a colon does**, for the same reason it does in end credits: the
mark other template systems use should not cost anybody an evening.

**Nothing is required.** A rundown typed with no marks at all is a plain list of stories,
exactly as every ticker read before kickers existed - which is why no template's sample had to
change and no saved graphic reads differently than it did.

## Two differences from the credit roll, both of them earned

The two formats are deliberately the same shape, because learning one should teach you the
other. They differ in exactly two places, and both differences come from what a ticker's own
designs already do with those characters.

**The colon must be followed by a space, or by nothing.** End credits guard the mark by length
alone - a role is short, a sentence is not. A ticker cannot, because a ticker writes numbers:

```
NORTHERN UNITED 2:1 CITY ROVERS      a score (Fixture Crawl lifts it into a chip)
Polling stations close at 20:00      a clock
Full results at https://example.org  a link
```

Each of those has a short colon-terminated head, and a length guard alone would have made each
one a kicker. A tag is written with a space after its colon; a score, a clock and a link are
not. `TRAVEL: the 20:45 service is cancelled` is therefore read the way you meant it - the
first colon is prose punctuation, the second is a clock.

**A pipe is not a separator here.** End credits accept `Role | Name`. In a ticker, `|` already
belongs to **Bilingual Crawl**, which splits an item at it into its two languages and ships
with bilingual samples. A mark a design has already spoken for cannot be given a second meaning
by the parser above it.

## The same rundown in any design

The format says what the content *is*, never how it is arranged - so switching design never
means retyping the rundown. Every ticker draws a kicker in the accent colour ahead of its
story, and a design that wants it somewhere else places it itself: **Status Rotator** puts it
in a fixed-width name column, which is what makes a service status scannable.

That portability is the whole point of having a mark at all. Before it, four designs each
invented their own way to say "this part of the line is the label" - a dash in Status Rotator,
a trailing signed token in the market strips, an `n - n` in the middle of a fixture - and every
one of them was silently lost the moment the show switched design.

## What is NOT here yet

A ticker item's other axis is a **value**: a price, a percentage change, a score. Market Rail,
Market Ribbon, Index Crawl and Fixture Crawl each parse one out of the line by POSITION, and
those rules are still per-design and still not portable. They are left alone deliberately -
folding a value into the kicker's grammar would mint a second mark to learn, and the two are
genuinely different questions. A rundown that needs both today should carry the value in the
story text, where every design at least renders it.

## For contributors

The parser is `parseTickerItems` in `src/templates/tickers/shared.ts`, emitted into every
generated ticker. `scripts/ticker-parser.test.mjs` runs the emitted JavaScript itself - it cuts
the block out of the template literal and executes it - so a rule that reads correctly in the
`.ts` file but ships broken fails the build. A design that draws the kicker itself defines
`renderTickerKicked(kicker, text)` and is handed both halves, already escaped;
`renderTickerItem(text)` is unchanged and still the only thing a design has to provide.
