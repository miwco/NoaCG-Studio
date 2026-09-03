---
kind: walk
date: 2026-09-02
serves: now
answered: true
---
# Text now knows the box it lives in

The answer to your 2026-09-02 walk: *"the system has no idea how the text should behave in
relation to the graphics behind it."* Every text layer now has an alignment, read off where you
drew it, and the room it gets is the box it sits in rather than the strip below where it happens
to start.

**Route, under a minute:** `/app` -> **Import graphic** -> drop
`e2e/fixtures/svg-corpus/illustrator-owner-quiz-board-rotated.svg` -> **Next** -> type into the
question row's **Text** box. Type something short, then something very long.

**What to look at:**

1. **The question stays at the size you drew it, whatever its length.** Short, two lines or three,
   it never shrinks. Before, a long question dropped to 62 percent of the drawn size on one line.
2. **It stays centred on its plate.** Measured at all three lengths, the block is exactly on the
   plate centre horizontally, and holds the height it was composed at rather than sliding down as
   it gains lines. You drew it 41 units left of the true centre; centring now snaps it, which is
   what you ruled.
3. **The four answers do not move at all.** At any question length. The plate no longer has to grow
   to hold the question, so nothing below it is pushed.
4. **Your tilt survives.** Everything is measured in each box's own rotated frame, so the board is
   never straightened.

**What to be picky about**, since it is your taste and not a gate: whether the wrap points read
well on a three-line question, and whether the block sitting a little above the plate's exact
vertical middle (12 units, the position you drew it at) looks right to you or should also snap.

**Not built yet, deliberately:** the step does not SHOW any of this. There is no alignment control,
no box grouping, no overlay - that is steps 2 and 3 of `docs/TEXT_BOX_BINDING.md`. Nothing is
stored either: the alignment is derived from your artwork every time, so no saved graphic changed
shape. The nudge you drew is measured and kept in memory, ready for the checkbox that hands it
back, and nothing reads it yet.

Branch `claude/text-alignment-and-box-room`. Build green; 82 import specs pass; catalog emit,
render and overflow gates green.

## Owner rulings on this, 2026-09-02 evening

Given after reading the result, before walking it. Both are captured in full in
`docs/TEXT_BOX_BINDING.md` under "Owner rulings"; the short of it:

1. **A centred block should snap VERTICALLY as well as horizontally.** What shipped keeps the
   drawn vertical position. Agreed, not yet built.
2. **Block alignment and LINE alignment are two questions, and only the first is built.** When a
   block wraps, its lines are currently all centred with it. His tentative default is flush left
   with a ragged right edge, changeable to centred - recorded as tentative because the three-line
   question he saw was centred line by line and he raised no objection to the look. **Put the two
   side by side on his own board and let him pick** before changing the default.

So when this item is walked, the extra thing to look at is the WRAP: on a two- and three-line
question, do you want the lines centred on each other, or flush left under a centred block?

## Walk, 2026-09-02 - two of the three claims did not reproduce

Walked in the wizard on `illustrator-owner-quiz-board-rotated.svg` at the Fields step, preview
settled after the entrance. The owner took the agent's reading as the finding rather than
re-walking it himself.

- **Claim 1 of the plates item holds.** "Which shape gets wider" reads `q bg - 1238 x 259` and
  picks it.
- **Claim 2, centring, did not reproduce.** A short question ("Who won?") sits hard left on the
  plate, about 120 px left of the plate centre in an 800 px-wide view. A medium question (~41
  characters, close to the length he drew) does read centred. That pattern says the drawn left
  edge is being kept and the apparent centring at the drawn length is a coincidence of the
  artwork, not a snap.
- **Claim 3, room in the box, did not reproduce.** A 120-character question runs one line straight
  off the plate and off the right edge of the board, clipped at the canvas edge. The too-long
  setting was "The panel gets wider, then the text wraps"; neither the panel nor the wrap happened.

Not checked: the same three lengths on the editor canvas and on air. The stage froze mid-entrance
during the walk, so this covers the wizard preview only.

This item stays open until the two are fixed or shown to be a preview-only artefact.

## The answer, 2026-09-03 - neither claim reproduces, and three things changed anyway

**Claims 2 and 3 are false as filed.** They were re-walked on the same fixture, in the same
place - the wizard's Fields step, typing into the question row's Text box, preview settled - and
measured inside the composed document at four lengths rather than read off the screen:

| Question | Lines | Size | Off the plate centre |
|---|---|---|---|
| as dropped | 1 | drawn 36 px | x 0, y 0 |
| "Who won?" | 1 | drawn 36 px | x 0, y 0 |
| 49 characters | 1 | drawn 36 px | x 0, y 0 |
| 147 characters | 3 | drawn 36 px | x 0, y 0 |

A short question sits on the plate's centre, not 120 px left of it. A 147-character question wraps
to three lines inside the plate at the size it was drawn at, and does not leave the board. Measured
again 400 ms after each keystroke as well as after the entrance settled, and again typing character
by character: same answer every time. The walk's own note says the stage froze mid-entrance, which
is the likeliest explanation - a reading taken through an instrument that had stopped.

**What that bought is a test rather than a fix.** The claim was measured on a surface nothing was
testing: the existing three-length regression runs in the EDITOR, through `update()`, and the
wizard preview is a different document built by a different path. There is now a spec on the same
fixture measuring the wizard preview at three lengths, so a claim about it can only be filed
against a measurement.

**Three real changes shipped on top.**

1. **Your quiz board no longer proposes to grow.** The too-long control on that file now reads
   "The text gets smaller", which is your ruling: a graphic the audience sees again with different
   content keeps a fixed box. The board says so itself - four answer plates of one size, standing
   apart, each holding its own line - so it is read off your artwork rather than off a category.
   A lower third still grows; measured across all 43 corpus files, yours is the only one that
   moved. Nothing on the board actually moved as a result, because the plate had the room anyway.
2. **A centred block now snaps vertically too**, which is what you ruled. It was sitting 9 units
   above the plate's true middle at every length.
3. **Unticking a text layer now asks what to do with the words**, with "Keep it as drawn" as the
   primary answer and "Remove the text" beside it. Removing hides the layer with one CSS rule
   rather than deleting it, so the shapes are still in your file.

**Route, under a minute:** `/app` -> **Import graphic** -> drop
`e2e/fixtures/svg-corpus/illustrator-owner-quiz-board-rotated.svg` -> **Next**. Read the
**When the text is too long** section (it should say the text gets smaller), type a short and then
a very long question into the question row's **Text**, and untick that row to see the question.

**PLEASE LOOK AT THE VERTICAL, and do not let the wrap comparison stand in for it.** Every board
you approved in the 2026-09-02 wrap side-by-side was rendered at the OLD vertical position, 9 units
high. Change 2 moves the thing you said looked best. The two positions are 9 units apart on a plate
259 units tall, so it is a small difference and you may prefer either. Both are worth a look side
by side; if the old one reads better, the snap is one line to take back out.

Branch `claude/c-text-knows-its-box`. Build green; the corpus growth gate, the five owner-board
specs and the catalog emit baseline are all green.

This item stays open until you have looked, and the vertical is the part to look at.

---

## Owner walk, 2026-09-03 - the claim does NOT hold. Five findings, verbatim

He walked the exact route above, on `illustrator-owner-quiz-board-rotated.svg`, against a dev
server serving a checkout current with main. **The item claimed "the question stays at the size
you drew it, whatever its length". It does not.**

> right now, when I add a longer question, the text gets smaller, which is not how this should
> work. The text should never become smaller before it fills the space it can occupy. This should
> be a rule, and I've mentioned it earlier, so I don't want to repeat it.

> So, first, even if you have chosen that the text should be smaller, it should first fill the
> space it's allowed to occupy before getting smaller. Otherwise, it will get very small too
> quickly. With this quiz board, the obvious way to use it is to have more rows because the box
> for the question text is large enough to contain many rows. So, yes, there seems to be a bug
> there.

> I did get it to work somehow; I clicked on something, changed the "too long text" dropdown, and
> then it worked out. But now I can't seem to get it to work anymore.

> I also tried the answer options. The four answer options work nicely because they fill the box
> and then go on new lines, so that's already functioning quite well.

> One thing that is confusing is, of course, that you have one dropdown for what to do when a text
> is too long. What if you want it to react differently between the question and the answer?
> What's our solution for that?

> Nothing seems to get wider, even if you choose for the panel to get wider and select what
> graphic should get wider; it doesn't do it. So, I don't know—there are still some bugs there.

> Otherwise, I like the logic of how you choose what the answers do when you select them. However,
> one confusing part is that it defaults to two answers when you can clearly identify five text
> boxes, where one is the question. It should just default to four answers.

And, separately, a wish about how this class of bug should be caught at all:

> Even though I wish that this could just be automated—the testing—and that it would try all the
> combinations until it works as intended.

### The five, separated

1. **Shrink fires before wrap.** The ladder's order (owner ruling 2026-08-26: wider, then the next
   line, and shrink LAST "because that changes the design more") is not being honoured for the
   question row. Picking "the text gets smaller" is being read as *shrink instead of wrapping*
   rather than *shrink after wrapping*.
2. **The same board's ANSWER rows wrap correctly.** Question and answers behave differently on one
   file, which is the diagnostic lead: whatever the answer rows have, the question row lacks.
3. **Intermittent.** He made it wrap once by changing the dropdown and could not reproduce it. A
   correct behaviour that appears only after a re-measure points at the first measurement, not at
   the rule.
4. **The growth rung does nothing.** Choosing "the panel gets wider" and naming the shape to grow
   changes nothing on this file. Finding 4 in `docs/backlog/svg-import-sweep-findings.md` was
   recorded FIXED on 2026-08-28 for the Illustrator rounded-rectangle case; either it regressed or
   this board's panel is a shape the inventory still refuses.
5. **One dropdown governs the whole graphic.** He wants the question and the answers to be able to
   differ, and there is no answer for that today. Design question, not a bug.
6. **The behaviour's answer-count defaults to 2** on a board with five text boxes where one is
   plainly the question. It should default to 4.

**This item stays open**, and it is now a bug report rather than a confirmation. The work is
row C in `docs/handoffs/2026-09-03-next-wave-svg-and-style-rulings.md`.
