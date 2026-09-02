# Text and its box

**Status: DESIGN, not built.** The owner's brief is the 2026-09-02 walk of his own quiz board;
the verbatim words are in `docs/acceptance/owner-queue/2026-08-28-student-rehearsal-walk.md` and
they are the authority here, not this summary of them.

His sentence for the whole thing:

> We need to establish a system where the text appears as if it is designed on the graphic,
> regardless of whether the text is short or long.

The fixture this was measured on is `e2e/fixtures/svg-corpus/home-made/quizbgchess2.svg` - a
chess-themed quiz board he drew in Illustrator: a tan question plate holding `<text id="question">`,
and four orange answer plates each holding one unnamed text. Every plate is rotated a few degrees,
which is what a hand-drawn board looks like and what broke both defects below.

## What is broken today, measured

Three defects, all reproduced on 2026-09-02 by importing that file at `/app` -> Import graphic and
measuring inside the composed document. **D3 is the one that makes his board look wrong**; D1 is
what moves his answers about; D2 is a real bug that happens not to bite this particular file.

### D1. Shape geometry ignores `transform`

`assets/svgImport.ts` builds its panel inventory from the raw `x`/`y`/`width`/`height` attributes
of each `rect` (and from `panelPathGeometry` for a path), with no ancestor transform applied. The
quiz board's question plate is a portrait rect turned 88.68 degrees, so:

- it is **1238 x 259** on screen, and the step's own picker prints it as **231 x 1233**;
- the inventory is sorted widest-first, so the ordering, `proposeBannerGrowth`'s auto-pick and
  the follower derivation all run on rectangles that are not where the shapes are. On the fixture
  the growth default landed on an ANSWER plate, and named two answer texts as its followers -
  which is exactly the owner's "more rows in the question affected the placement of the answers";
- the wizard's hover highlight is drawn from the same numbers, so the amber box on the preview
  sits outside the artwork entirely.

The runtime is not affected the same way: `svg.ts` measures through `getBoundingClientRect` and
the element's CTM, so it sees the real geometry. The corruption is design-time, and it reaches the
runtime through the growth table the wizard writes.

### D2. Anything below a line collapses its wrap room, even from outside its box

`svgFitCeiling` (svg.ts) walks every drawn element, keeps the ones that overlap the line
horizontally and sit below it, and sets the ceiling to the line's OWN bottom - correct in intent
(the designer's gap is kept whole), but the candidate set is the whole artwork rather than the
line's own box. On the fixture the answer plates sit below the question and overlap it
horizontally, so the question gets **zero** room to wrap inside a plate drawn 259 px tall, and the
ladder goes straight to shrinking. That is the owner's "it immediately shrinks, which doesn't make
any sense because we have room in the box".

The rule this needs, and the rule the design below promises: **the inside of the box is the room,
and only things inside the box bound it.** A neighbour inside the same box (a role drawn under a
name in one banner) still bounds the block with its drawn gap kept whole, which is the 2026-08-29
ruling and stays exactly as it is.

FIXED 2026-09-02 (`svgInsidePanel`, applied to `svgFitCeiling` and `svgFitNeighbour`). It changes
nothing on this fixture, because D3 below binds first; it is the same rule stated once, and it is
what stops a plate standing beside another plate from bounding text it has nothing to do with.

### D3. A block can only grow DOWNWARD, so text centred in a tall box gets one line

This is the defect the owner walked into. The wrap ceiling is the panel's bottom less the panel's
own TOP padding mirrored (`svgPanelTopPad`, bought by the 2026-08-29 walk so a wrapped name would
stop sitting hard against the panel edge). On a line the designer drew in the vertical MIDDLE of a
tall plate, that mirror eats almost the whole plate: the question's drawn top leaves about 91 px
above it, mirrored to 91 px below, leaving 64 px of room in a plate 259 px tall - one line.

Measured inside the composed document, with a real long question and "the text wraps onto more
lines":

| | Room the block gets | Result |
|---|---|---|
| Today | 820 x **64** | 1 line, shrunk to **22.44 px against a drawn 36** (62%) |
| With the block free to use the plate | 820 x **149** | 2 lines, **at the drawn 36 px**, block 816 x 83 in a plate 259 tall |

So the plate has room for the question at full size and the ladder cannot reach it. The mirror
itself is right where something is drawn below the line INSIDE the box - that case keeps its whole
gap, unchanged. What is missing is the other half: **where nothing inside the box sits below it, a
block should grow about the drawn line rather than only downward from it**, which is the vertical
half of the alignment model below. Fixing it before alignment exists would drop a two-line question
low in its plate instead of centred, so it is step 3 of the plan and not a patch.

### The gap that is not a defect

Fixing both still leaves what the owner is really asking for. Today the binding is DERIVED and
never declared, never shown, and never correctable; there is no alignment answer at all, so text
fills rightwards from where it was drawn whatever the box says; and growth is ONE choice for the
whole graphic naming ONE shape, which cannot express "the question plate grows down, the answer
plates stay". The rest of this document is that system.

## The model

Every text field lives in a **box**: the shape drawn under it. **The text owns its alignment, the
box owns its growth.** That split is the whole model.

Vocabulary, fixed for anything the user reads: box, aligned (left / centre / right, top / middle /
bottom), and what the box does - stays as drawn, gets wider, gets taller, gets wider then taller.
Never "panel", "container", "bounding box", "room", "ladder", "fit" or "follower".

What the fixture derives to with no interaction, in the artwork's own px:

| Field | Box | Left / right inset | Alignment read off the drawing |
|---|---|---|---|
| Question | tan plate, 1238 x 259 | 209 / 280, centres 36 px apart (3%) | centred, middle |
| Answer 1-4 | orange plates, ~524 x ~120 | 31-36 / ~250 | left, middle |

A human reads the same thing off the board in one glance. The step's job is to show that it read
the same thing.

## The step, redesigned

### Rows grouped by box

The flat Editable text list becomes one group per box, the box as a header row and its fields
indented under it. Text with no shape under it sits in a final "On the artwork" group. The
grouping IS the binding.

```
Editable text                              5 of 5 editable on air

* Tan plate                                       stays as drawn v
  [x] Question  [Question 1: Who is the best at chess in the world?]
      centred - fits - 1 more line fits, then smaller            >

* Orange plate 1                                  stays as drawn v
  [x] Answer 1  [2. Magnus Carlsen                               ]
      left - fits - room for about 14 more characters            >
```

The bullet is a swatch in the shape's own fill colour - the cheapest trust device there is, and it
works for a reader who has never heard the word binding. A machine-looking layer id (`q_bg`) is
replaced by colour and kind ("Tan plate"); a designer who named the layer "Question plate" sees
that.

### The preview overlay

Drawn only while a row is hovered or its strip is open, and it replaces the axis-aligned amber
rectangle, which reads as a box around the wrong thing on rotated artwork:

- **the box**, tinted 12% amber on the shape ITSELF (a class carried in through the canvas
  protocol), so rotation is free;
- **the inside**, a dashed line at the drawn insets mirrored, with the two figures. This is the
  room, made visible;
- **the text bounds**, a thin line around the current block. The gap between it and the dashed
  line is how much room is left;
- **the alignment caret** under the block at its anchor, with the word.

### Correcting a wrong box

The field's strip opens with the box: a dropdown of every shape that contains or touches the
text, plus "None. The text sits on the artwork.", and a "point at it on the artwork" button that
arms the existing pick mode. Dragging a row between groups was rejected - undiscoverable, and
awful to drive from a spec.

### Alignment

A nine-dot reference-point grid, the widget every Illustrator user has already used, in the fit
strip. One click sets both axes. Horizontal decides which edge the text fills from; vertical
decides where a wrapped block sits in a fixed box and which edge stays put when the box grows.

The default is read from the drawing: compare the drawn insets on the two sides; centred if the
two centres are within 5% of the box on that axis, otherwise aligned to the smaller inset. It is
emitted as real `text-anchor` plus an `x` at the box's inside edge or centre, and wrapped tspans
restart there - which is what answers "even if we have room to the right, we can't have that
because then we have too much room on the left".

### Growth, per box

Growth sits on the box header row as one select: stays as drawn / gets wider / gets taller / gets
wider, then taller. The values are today's ladder; what changes is that the shape is never asked
for, because the row is the shape. Per box, so one plate may grow while its neighbours stay.

The limit is a dashed cap line on the preview, defaulting to the design's own margin mirrored
(`svgGrowCap` today) and labelled in the reader's terms ("same margin as the top"). It can be
dragged, but never past the frame's safe margin and never inside the box as drawn, so a wrong
value is unreachable rather than warned about. For a taller box the label also says how many
lines the cap buys at the drawn size - the owner's "we shouldn't be able to put one page of text",
derived from the cap rather than asked as a second question.

Today's "What else moves" list is kept, unchanged in mechanism, nested under the box that grows.

### The guardrail, said once

**Text never paints outside its box, and a box that stays as drawn moves nothing.** A box that
grows moves exactly the layers listed under it, by exactly the amount it grew. That is a stronger
promise than a warning, and it is the whole of what a student needs to know.

What of the ladder is visible: the gap to the dashed line (fill), the moving box with a ghost of
the drawn one and the cap (grow), a live fit line under the Text input counting lines and the
size ratio (wrap, shrink), and an amber "too long, cut about 20 characters" tag (report). The
squeeze stays invisible machinery.

### Zero interaction

A student who ticks nothing gets: every text in the smallest drawn shape that holds it, aligned
the way they drew it, room = the box's inside less their own margins mirrored, every box staying
as drawn except the existing measured lower-third default, and text that wraps inside its box
before it shrinks. Nothing outside a fixed box ever moves. On the fixture that is a long question
wrapping to two or three lines in the tan plate with the answers exactly where he drew them.

## What it costs the formats

`NOACG_LAYOUT` gains an alignment pair per line and a cap per rule, and the growth rows become
per-box rather than one per graphic - all additive, so version 1 survives (root principle 6). The
draft holds, per field, a box id or none plus alignment with an `authored` flag; per box, growth,
cap and followers.

`docs/SVG_IMPORT_PLAN.md` §6b's "ONE FIT for the whole graphic" survives as a MEASUREMENT rule
(one measure, one fit, one apply, never iterated). What ends is one ANSWER for the whole graphic.

## Plan

1. **D1**, with the fixture as the regression - the design-time geometry has to be where the
   shapes are before anything built on it can be trusted. D2 is done.
2. The derived box binding, shown: grouping, the swatch, the overlay. No new controls - just the
   step admitting what it already decided.
3. Alignment: derive, emit, show, allow the override - **and D3 with it**, because a block that
   grows about its drawn line is the vertical half of the same answer.
4. Growth per box, with the cap line.
5. The fit line and the too-long tag.

## Open, the owner's to answer

- **Does the alignment default MOVE text he drew off-centre?** Deriving "centred" and emitting a
  real centre anchor snaps a question drawn 36 px off centre onto the box's true centre. That is
  what makes long and short values both look designed, and it also silently edits his artwork at
  the rest pose. The alternative keeps the drawn position as the anchor and only fills outward
  from it, which never moves anything but leaves a board that was drawn slightly off looking
  slightly off at every length.
- **Two smaller ones from the same walk** are in the queue item rather than here: what unticking a
  field should do to the text it leaves behind, and re-entering the wizard for a graphic that has
  since been hand-edited.

The full UX write-up this is condensed from was produced by Fable on 2026-09-02 at the owner's
request ("here we should use Fable to really think about a UX/UI that would make it intuitive").
