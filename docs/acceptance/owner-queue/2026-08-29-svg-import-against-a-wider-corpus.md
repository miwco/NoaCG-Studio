---
kind: walk-p
date: 2026-08-29
serves: now
---
# The SVG import, walked against twelve more kinds of real file

Your bar for the student release, verbatim: *"I should actually test all different kinds of SVGs
before I can say I'm satisfied about the process."* The corpus went from 22 files to 34 - twelve
new shapes real exporters produce that nothing had ever walked - and every one of them now has a
written answer saying what the designer who drew it expects, so the next person can tell a change
from a regression. **Nine of the twelve were right on the first walk. Two were bugs and are
fixed. One is a taste call and is below for you.**

Route, under a minute. `/app` -> Create -> **Import graphic** -> drop the file named, from
`e2e/fixtures/svg-corpus/`:

1. **`inkscape-millimetre-scorebug.svg`** - the card reads **1280 × 720**. It used to say
   *339 × 191* and place a full-page design on the frame as a postage stamp. Inkscape starts
   every new document in millimetres, so this is the first file shape a student is likely to
   bring, and it was silently 18% size. (`affinity-point-sized-nameplate.svg` is the same page in
   points and also reads 1280 × 720 - there so the fix cannot be a millimetre special case.)
2. **`geometry-unescaped-ampersand.svg`** - it is refused, correctly, but read the sentence. It
   now names the **line, the column and the "&"**, and says to write `&amp;`. It used to say
   *"damaged, or not an SVG at all"*, which points at the export and sends someone back to
   Illustrator to re-make a file that was never the problem. This one is an ordinary export with a
   Google Fonts address pasted into it - one character, and nothing said which.
3. **`inkscape-hidden-state-layers-quiz.svg`** -> Next. **Five fields, not seven.** The two
   hidden layers carrying words ("LOCKED IN", "+1") are drawn but never offered, which is what
   §5b promises. Worth a look because the quiz is one of the two graphics 09-12 is decided by,
   and the only hidden-layer idiom ever proved before was Illustrator's; Inkscape - the free tool
   a school installs - writes a different one, and nothing had tested it.

**The taste call, and the only thing here that needs you.** The fit ladder proposes *growing* on
six corpus files whose sidecars say a board's layout is the design and it should not - the
open finding 5. What is new is that it is **not a property of being a board**:
`inkscape-hidden-state-layers-quiz` is a five-answer quiz board and correctly arrives on
*shrink*, while `student-illustrator-quiz` is a five-answer quiz board and arrives on *grow*.
So whatever decides it is the geometry, not the category. Your 2026-08-28 ruling was that growing
is the right default where the geometry is unambiguous and the author changes it in one click,
and nothing here contradicts that - but if you want the two boards to agree with each other, say
so and it becomes a real piece of work rather than a default nobody can predict.

Not done, and deliberately: the **outlined-text** recovery road (your "wouldn't want to put a lot
of time on this right now"), the **Figma picture** case - a placed photo in Figma is a pattern
fill, not an `<image>`, so no picture row opens; it is now proven that the picture road itself
works, because the same card drawn in Illustrator offers its row, so this is a Figma-shaped fix
rather than a broken feature.

---

## Owner ruling, 2026-09-03 (walked on his phone)

The taste call is answered. **A quiz or poll board is FIXED - the artwork does not move and the
text adapts inside it. A lower third or a standalone text box is the opposite: the graphic scales
with the text.** Verbatim, with the reasoning and the second half that loosens "unified", in
`docs/handoffs/2026-09-03-next-wave-svg-and-style-rulings.md`. The short form:

> in quiz boards, the graphic is fixed, and the text adapts in another way

> When the question gets longer, it fills out until the box but stays inside the box, drawing new
> lines and keeping the whole text centered all the time.

> we will only change the font size when we absolutely need to do it

He also ruled the general principle it rests on: *"we should mimic the original design as closely
as possible. We don't want to break it."*

**This item stays open until the work lands.** The prompt is row A in that handoff. It carries one
constraint from his 2026-08-30 ruling: the rule may never read a CATEGORY, so "plays as a
sequence" has to be known from the behaviour attached to the graphic.
