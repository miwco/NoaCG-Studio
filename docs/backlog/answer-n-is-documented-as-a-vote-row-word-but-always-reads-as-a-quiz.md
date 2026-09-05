---
v: 1
source: measurement
raised: 2026-09-05
state: unstarted
---
# `Answer 1` is documented as a live-vote row name, and it always reads as a quiz

**Filed:** 2026-09-05 by row X (`claude/x-live-vote-conventions`), measured while deriving the
docs page's live-vote naming rules from the detector.

## Why

`docs/SVG_AUTHORING.md` section 5b tells designers, under the live vote:

> `Choice 1`, `Answer 1` and `Vaihtoehto 1` work as well as `Option 1`

`Answer 1` does not. A designer who follows that line draws a vote board, exports it, and gets a
quiz binding with Select answer, Lock it in and Reveal, which is not the graphic they drew. It is a
small line in a designer-facing doc, and it is the kind of wrong instruction that costs somebody an
afternoon before they suspect the doc rather than themselves.

## What happens, measured

`proposeSvgBehaviour` asks the quiz first:

```ts
return proposeQuizBinding(svg) ?? proposeScoreBinding(svg) ?? proposePollBinding(svg);
```

The quiz's condition is two candidates matching `/^answer\b/i`. The poll's is strictly stronger for
the same word: two candidates matching `^answer\s*([0-9]+|[a-z])(?![a-z])` **and** two bars. So any
board the poll would claim through `answer`, the quiz has already claimed, with one exception, the
no-space spelling, where `\b` does not fire between "r" and a digit:

```
### rows named Answer 1, Answer 2, Answer 3
    -> QUIZ proposed
    (poll reading alone: poll, 3 rows)

### rows named Answer1, Answer2, Answer3
    -> poll, 3 rows
```

So `answer` in `proposePollBinding`'s row words reaches a vote board only when the designer omits
the space, which nobody does on purpose.

## What it would take

A choice between two, and it is a judgement call rather than a bug fix:

1. **Correct the doc.** Drop `Answer 1` from the live-vote alternatives in
   `docs/SVG_AUTHORING.md` section 5b, and drop `answer` from `proposePollBinding`'s row words so
   the code stops implying an alternative it cannot deliver. One line each. Safe.
2. **Make the word decide by the bars.** A file with two `Answer N` rows AND two bars is far more
   likely a vote than a quiz, since a quiz board has no bars. Reordering the proposers on that
   evidence would honour the doc, at the cost of a rule that is no longer "strictest first" and a
   quiz board that happens to draw two bars changing behaviour.

Option 1 is the smaller and probably the right one: the vote board's own signature is the bar, and
`Option`/`Choice` already name the row without ambiguity.

Note that `docs/SVG_AUTHORING.md` was in flight on another branch when this was filed, so this was
not corrected in place.

## Evidence

Measured 2026-09-05 by building `src/components/wizard/draft.ts` through Vite's SSR build and
calling `proposeSvgBehaviour` in Node. The public docs page written on the same branch
(`docs.html`, "Draw a live vote") already tells designers that `Answer 1` gives them a quiz.
