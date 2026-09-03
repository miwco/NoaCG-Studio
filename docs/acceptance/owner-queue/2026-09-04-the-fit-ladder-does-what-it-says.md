---
kind: walk
date: 2026-09-04
serves: now
---
# The fit ladder does what it says, and the plate finally gets wider

Your 2026-09-03 desktop walk of the quiz board, answered by measurement rather than by another
reading. Four bugs found, four fixed. One of your claims did not reproduce anywhere, and that
matters as much as the fixes, so it is stated plainly below rather than buried.

**Route, under a minute:** `/app` -> **Import graphic** -> drop
`e2e/fixtures/svg-corpus/illustrator-owner-quiz-board-rotated.svg` -> **Next**. Type a long
question into the question row's **Text** box, then change **When the text is too long** to
**The panel gets wider** and watch the tan question plate.

## What to look at

1. **The plate gets wider now.** Set "The panel gets wider" and type a question long enough to
   need the room. It widens from its MIDDLE, both ways at once, and it stays as wide as its
   nearer margin allows. Before, it did nothing at all at any length on any option - which is
   exactly what you said.
2. **It gets wider, not taller.** You drew every plate as a tall rectangle turned on its side, so
   "width" runs DOWN the painted band rather than across it. The old code grew that width: 114 px
   taller, 2 px wider, for a control that says "gets wider".
3. **The question wraps the same way every time.** Type a long question, change the dropdown,
   change it back, retype. The answer no longer depends on what was typed before it.
4. **A long question stays centred on its plate**, at one, two, three and four lines, and also
   when a value that cannot wrap at all is shrunk.

## What is picky and yours to judge

- **Which way the plate widens.** A plate holding text you CENTRED now widens from its middle,
  because centred text fills both ways and a plate that slid one way would leave your own
  composition behind. A plate holding text set against its left edge still widens to the right.
  Nobody chose this in a control - it is read off where you put the type. If you would rather a
  centred plate grew one way and kept its left edge where you drew it, say so and it is one line.
- **How much wider it gets.** It is capped by the NEARER of its two margins, so your plate gains
  about 57 px on each side before it stops. That keeps the offset you drew. A more generous rule
  would let it run out to the safe margin on the far side and shift the composition.

## The claim that did NOT reproduce

You wrote *"when I add a longer question, the text gets smaller"*, and the item has carried that
as its headline since 2026-09-02. **It does not happen.** Measured on your own board across all
four ladder options and six question lengths, on the wizard's Fields step AND on the editor
canvas after Create project: the question wraps onto two, three and four lines at the 36 px you
drew it at, and never shrinks.

The one case where it does get smaller is a question with **no spaces in it** - a single unbroken
run has nowhere to break, so shrinking is genuinely the right next rung. That is your own clue
from the second walk: *"I make spaces in a word, and it sometimes understands that it should be
big and go to new rows."* It is not random. It is word-breaking, and it looked random from the
keyboard, which is a fair thing to be annoyed by even though the graphic is behaving.

So one of two things is true, and only you can tell me which: either the walk was against a
checkout that did not yet have the 2026-09-03 fixes in it, or there is a condition on your machine
the sweep does not create - a font that resolves there and not here is the likeliest. **If you can
still make it shrink before it wraps, that is the single most useful thing you could send back**,
with the exact question text you typed.

## What is now tested, so this cannot come back quietly

The reason three of your walks found this and no gate did: the corpus gate walked each file once,
at the length its designer drew, on the option its artwork proposes. None of the four bugs is
visible there. There is now a sweep over your board x four options x six lengths, asserting the
ladder's ORDER rather than a table of numbers - the text is inside its box, it wrapped before it
shrank, the room a panel offers comes from the design rather than from the last thing typed, and
a panel told to get wider gets wider. That is the automated testing you asked for
(*"I wish that this could just be automated"*), on one file so far.

## Not done, deliberately

**One dropdown still governs the whole graphic**, so the question and the answers cannot differ.
That is your finding 5 and it is a design question, not a bug -
`docs/backlog/growth-rule-geometry-and-purpose.md` carries it. **The answer count still defaults
to 2** on a board with five text boxes (your finding 6); that belongs to the behaviour work, not
here.

Branch `claude/a-fit-ladder-truth`. Build green; the new sweep green and mutation-tested; 99 SVG
import specs pass; catalog emit re-recorded for the one design that moved, and all five catalog
gates for it green.
