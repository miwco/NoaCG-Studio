---
v: 1
source: measurement
raised: 2026-09-05
state: unstarted
---
# A plural heading layer is read as an extra option or team row

**Filed:** 2026-09-05 by row X (`claude/x-live-vote-conventions`), measured while deriving the
docs page's live-vote naming rules from `proposePollBinding` rather than from prose.

## Why

A designer who labels the heading above their vote options `Options` gets a board with one option
more than they drew, and the extra row is the one the audience's FIRST option writes into. So the
heading on air is overwritten with an answer. Nothing warns them: `pollBindingGaps` only refuses a
row that has neither a label nor a bar, and this row has a label. It is the exact failure the
proposers were built to avoid, which is why both of them carry a comment saying it is prevented.
It is not.

`proposePollBinding`:

```ts
// The row's number or letter, and it must NOT be the tail of a longer word: `\b` alone matches
// the "s" of a heading layer called "Options", which would propose that heading as row 1 and
// shift every real option one row off its own bar.
const rowKey = (label: string): string | null => {
  const m = /^(?:option|choice|answer|vaihtoehto)\s*([0-9]+|[a-z])(?![a-z])/i.exec(label.trim());
  return m ? m[1].toUpperCase() : null;
};
```

`(?![a-z])` stops the key running into a longer word, but `Options` ends after its "s", so the
lookahead is satisfied at the end of the string and the heading is read as row **S**.
`proposeScoreBinding` carries the same regex shape and the same comment, and `Teams` is read as
team **S** the same way.

## What happens, measured

The real detector, run in Node over the live-vote corpus fixture's parsed shape with one heading
layer added:

```
### a heading layer called "Options" sits above the rows
    -> poll, 4 rows
    row 1: label=Options | bar=— | value=—
    row 2: label=Option 1 | bar=Bar 1 | value=Percent 1
    row 3: label=Option 2 | bar=Bar 2 | value=Percent 2
    row 4: label=Option 3 | bar=Bar 3 | value=Percent 3
```

Four rows, no gap reported, and the count picker says four options for a three-option board.

The score board's version is caught, but by the wrong message:

```
### score board with a "Teams" heading layer
    -> score, 3 rows
    row 1: name=Teams | score=—
    row 2: name=Team 1 | score=Score 1
    row 3: name=Team 2 | score=Score 2
```

`scoreBindingGaps` refuses that with "one team's score layer", which sends the author looking for a
missing score rather than at the heading that caused it.

## What it would take

The row key needs the number or letter to be a real one rather than the last letter of the row
word. Two shapes worth weighing:

1. Require a separator or a digit: accept `option 1`, `option A` and `optionA`, but never a letter
   that is simply the next character of the word itself. A negative lookbehind on the row word's
   own plural is narrow and cheap; a rule that a bare letter key needs a space before it is
   broader and probably truer, at the cost of `Option1`-style names losing letter keys (digits are
   unaffected).
2. Keep the key but drop a row that resolves nothing at all. Weaker: it would fix the vote board's
   silent case and leave the score board's misleading message.

Both proposers change together, and `e2e/import-svg-behaviour.spec.ts` is where the fixture-level
assertion belongs. Whichever shape wins, the comments in both functions need to stop claiming a
guard they do not have.

## Evidence

Measured 2026-09-05 by building `src/components/wizard/draft.ts` through Vite's SSR build and
calling `proposeSvgBehaviour` in Node against the parse of
`e2e/fixtures/svg-corpus/illustrator-live-vote-band.svg` (its shape pinned by that file's
`.expect.json` and by `e2e/import-svg-behaviour.spec.ts`). The docs page written on the same branch
tells designers not to name a heading `Options`, which is a workaround for this, not a fix.
