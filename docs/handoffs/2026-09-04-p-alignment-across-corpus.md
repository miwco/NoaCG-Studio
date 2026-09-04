# Row P: the alignment reaches every file, and the sweep covers the corpus

Branch `claude/p-alignment-across-corpus`, five commits on top of row A's seven (merged in before
any work started, because this row is the two things A reported and did not fix, plus one thing
row J reported and did not measure).

## What landed

1. **A stated `text-anchor` is the anchor, not an exemption.**
2. **The fit ladder is swept over the corpus**, not one file: `svg-import-sweep.mjs --ladder`.
3. **A screen pixel is measured the same way whether a plate was turned on its layer or on
   itself** - the 114x defect below, which is the sharpest thing on this page.
4. Five review findings and four cleanup findings closed; two contract sentences corrected.

## 1. The stated-anchor gap

`svgAlignOf` took the exporter's word for the anchor and returned before it measured the box, so
the SIDEWAYS half of the alignment - the anchor, the room read from the box, and the growth from
the middle that hangs off that room - was gated on having DERIVED it. (The vertical snap ran
either way; an earlier draft of this page overstated that, and the code review caught it.) Eight
of the 43 corpus files state one; every centre-aligned Figma export does.

**What it cost, measured on the mapping step** - `alignWidth` / room, before and after:

| file | field | before | after |
|---|---|---|---|
| student-illustrator-scoreboard | f3 "SUDET", stated `end` | w0 / room **123** | w600 / room **600** |
| illustrator-four-team-scoreboard | f0, stated `middle` | w0 / room 192 | w194 / room 194 |
| figma-centred-title-card | f0, f1, f2, stated `middle` | w0 / room 453, 701, 319 | w443, 668, 276 / room unchanged |

The away team's name was stuck at the width of the word standing in it: 123 units inside a
680-unit plate, so a longer name went straight to the shrink rung. **The title card, the file the
handoff I inherited pointed at, costs the least** - every line in it is drawn exactly on the
plate's midline, and for a line whose anchor is its box's own landmark the old mirrored-margin
room and the new anchor-spent room are the same number. Anybody re-checking this on the title card
alone will conclude nothing changed. Use the scoreboard.

**The rule now**: the anchor is believed, the placement is still read off the drawing. Agreeing,
the line is treated exactly as a derived one. Disagreeing - a centre-anchored line composed into a
plate's empty half - the anchor stays where it was drawn and the room is measured about it.
Nothing the designer placed moves. New fixture `figma-offset-centred-endboard` is the disagreeing
case, which the corpus had no file for.

## 3. The 114x one, because it is the biggest

Row J's review of row A's branch reported an unverified "43x overgrowth" in `svgUserScale`, which
reads only the parent CTM. The coordinator asked for a measurement. **It reproduces, and worse
than reported, and at a second site nobody had named.**

The runtime read "screen pixels per drawn unit" as the matrix entry `a` of the frame an element's
numbers live in. That entry is the frame's scale times the COSINE of its rotation. Illustrator
writes a shape's rotation on the shape, where the parent frame never sees it - so all 43 corpus
files agreed with the code by accident. Inkscape and Figma write it on the layer or frame group,
which is exactly the frame being measured.

New fixture `inkscape-layer-rotated-quiz-plate`: a plate drawn portrait and laid flat by
`rotate(-89.5)` on its Inkscape layer, the ordinary way anybody makes a band out of a tall box.

```
before   svgFitRoom.f0.width = 123,760 units   (in a plate 1,240 units wide)   shapes off frame: 1
after    svgFitRoom.f0.width =   1,080 units                                   shapes off frame: 0
```

**The room mattered more than the growth.** A budget nothing can overflow is the worst answer the
ladder has: it never wraps, never shrinks, and the words run out of the plate and off the frame.
The site J named (`svgUserScale`, growth) is real too; the site that bites first is
`measureSvgRoom`. Both now go through one `svgFrameScale`, the LENGTH of the frame's x basis
vector, which is exact for the uniform-scale-plus-rotation artwork carries and identical to the
old reading wherever nothing is turned - so no unrotated file moves.

## 2. The sweep, and the proof it is not decoration

Every bound field x four ladder options x six value lengths, on the composed document, asserting
the ladder's ORDER and its independence from history rather than a table of numbers. Findings
collapse to one line per DEFECT naming the fields, options and lengths that reproduce it.

With row A's four fixes reverted (`git checkout main -- src/templates/importedDesign/svg.ts`), the
sweep reports all four on his own board in one run - 166 findings against 68 on the fixed tree:

| His defect | What the sweep says | Cases |
|---|---|---|
| 4. a shrunk centred block sat 1.5 units low | `drifted 1.5 down its box (drawn at 0.0)` | 84 |
| 2. the growth rung was dead at every value | `"g0" stayed 1238 px wide` | 20 |
| 3. the wrap rung's room depended on history | `height offer moved to 0 (the design offers 384)` | 6 |
| 1. the rotated plate grew the wrong way | `"g0" got N px taller for M px wider` (its own rule) | - |

Defect 1's line cannot fire on the reverted tree because the plate never widens there at all;
defect 2's line is what shows instead. Both halves are checked, by two different rules.

The two new gate tests go **red on the pre-fix tree for the right reasons** and green after:
`alignWidth` 0 against `> 0`, and "the block paints off the plate" at 59 units further out than
the design draws it.

## What the sweep says now, and what is left

Ten files, 888 cases. The first run reported 308 findings across nine files; **62 survive, and 32
of those are one wizard defect.** Five of the ten files are clean, including the owner's own board.

| file | first run | now |
|---|---|---|
| effects-symbol-library-ticker | 12 | **0** |
| figma-centred-title-card | 20 | 12 |
| figma-duplicate-ids-scorebug | 54 | 12 |
| figma-offset-centred-endboard | new | 8 |
| illustrator-four-team-scoreboard | 48 | **0** |
| illustrator-live-vote-band | 28 | 30 |
| illustrator-owner-quiz-board-rotated | 52 | **0** |
| student-illustrator-quiz | 26 | **0** |
| student-illustrator-scoreboard | 68 | **0** |
| inkscape-layer-rotated-quiz-plate | new | **0** |

What is left, filed with the file, option and length that reproduce it:

- `docs/backlog/growth-target-defaults-to-the-frame.md` - 32 of the 62. "The panel gets wider"
  grows a shape that cannot widen: the artwork's own background rect on a full-frame export, a
  600 px shape on the scorebug. The wizard's fallback is `svg.shapes[0]`, widest-first. Wizard
  territory, which another session held tonight.
- `docs/backlog/ladder-sweep-first-corpus-findings.md` - the other 30, all on the vote band and
  all firing at the length the designer DREW, so they are a rest-pose defect rather than the
  ladder's: that file's bound line is offered a ceiling of zero and its alignment comes back as
  the default, which is what `svgAlignOf` returns when it could not measure a box at all. Plus the
  centred-room taste call, which is the owner's.

Row J's remaining finding - `svgApplyAnchor` writes an `x` that `svgLayoutRest` never restores -
now has a check in the sweep (`room moved to N (the design offers M)`) and **it did not fire on
any of the 888 cases**. Evidence against it on these files, not a disproof: none of them is a
panel that both grows sideways and holds an end-anchored line, which is the shape the argument
needs.

## A trap this row fell into first, so nobody repeats it

An earlier draft of the findings doc reported "a centred block that shrank sits 14.5 units low",
with the case that reproduced it. **It was not real.** The sweep was reading the composed document
before `document.fonts.ready`, so the rest datum and the value's reading could be taken in
different faces - which invented eight findings on the title card and two on the owner's board,
and every one of them read exactly like a defect. The reader now awaits the second fit pass. **Any
ladder measurement taken before the font swap is worthless.**

## Gates

- `npm run build`: green, `[write-version] dist/version.json -> claude/p-alignment-across-corpus`.
- `e2e/catalog-baseline.json` re-recorded three times: the emitted svg01 runtime changed in three
  commits. `check-catalog-emit` green.
- The four covering import specs, **103 tests, all passed** after the alignment work; re-run after
  the frame-scale fix and the two new gate tests - see the verdict line at the end of this file.
- Ladder sweep over the nine files this change can move, before and after, plus the reverted-tree
  mutation run. `--only` takes a comma list now; the whole corpus is about two hours and has never
  been run in one go - that is the obvious nightly job to schedule.
- `check`: `review: delegated` (five findings, all closed in `1905dced`); `simplify: inline` (four
  angles, findings applied in `1917964f`); `verify: inline`.

## What the next session should do

The four filed findings, in the order they are listed. And schedule the corpus-wide ladder sweep
nightly - it is two hours, it needs a dev server up, and it is the instrument that now stands
between this bug family and the owner finding it a fifth time.
