---
v: 1
source: measurement
raised: 2026-09-04
state: unstarted
found-by: node scripts/svg-import-sweep.mjs --ladder
---
# What the first corpus-wide fit-ladder sweep left standing

**Filed:** 2026-09-04, from `svg-import-sweep.mjs --ladder` over ten corpus files, 888 cases (every
bound field x four ladder options x six value lengths). None of these is visible at the length the
designer drew on the option the mapping step proposes, which is the only case the corpus gate
walks - so each sat behind a green build and a passing gate.

**Read the table before the entries.** The sweep's first run reported 308 findings across nine
files; most of them were one defect wearing nine costumes, and it was fixed on the branch that
wrote the sweep. What is below is what survived.

| file | first run | after the 2026-09-04 fixes |
|---|---|---|
| effects-symbol-library-ticker | 12 | **0** |
| figma-centred-title-card | 20 | 12 (all of §1) |
| figma-duplicate-ids-scorebug | 54 | 12 (all of §1) |
| figma-offset-centred-endboard | new file | 8 (all of §1) |
| illustrator-four-team-scoreboard | 48 | **0** |
| illustrator-live-vote-band | 28 | 30 (§2) |
| illustrator-owner-quiz-board-rotated | 52 | **0** |
| student-illustrator-quiz | 26 | **0** |
| student-illustrator-scoreboard | 68 | **0** |
| inkscape-layer-rotated-quiz-plate | new file | **0** |

The single fix behind most of that: the runtime measured "screen pixels per drawn unit" as the
matrix entry `a` of the frame an element's numbers live in, which is that frame's scale times the
COSINE of its rotation. Every drawn thing inside a rotated group was measured in a frame up to 114
times too small. See the commit "Measure a screen pixel the same way whether a plate was turned on
its layer or on itself".

## 1. "The panel gets wider" grows a shape that cannot widen (32 of the 62 remaining)

Its own file: `growth-target-defaults-to-the-frame.md`. On a full-frame export the shape the
control grows is the artwork's own background rect; on `figma-duplicate-ids-scorebug` it is a
600 px shape that never widens at any value. Both come from the mapping step's fallback
(`svg.shapes[0]`, widest-first) rather than from the runtime.

## 2. The vote band's line has a ceiling of ZERO at the length it was drawn (30 of the 62)

```
illustrator-live-vote-band  f0
24x  block 24 taller than ceiling 0    every option, EVERY length including `short`
 6x  spills 130 further out of its box than the design does    shrink, every length
```

It fires at the drawn value, which makes it a rest-pose defect rather than anything the ladder
did: the line is offered a height of zero and is already outside the box the runtime believes it
sits in. That file's bound line lives inside a behaviour state layer, and its alignment comes back
as the default (`h: 'start'`, `v: 'top'`, nothing derived), which is what `svgAlignOf` returns when
it could not measure a box at all. **So the first question is not about the ladder - it is why
`svgFitContainer`/`svgLocalBox` answer nothing for a line inside a drawn-state layer.** The vote
band is the poll behaviour's own fixture, so this is worth answering before the next behaviour
lands on it.

## 3. A CENTRED line's room is exactly the width it was drawn at, so rung 1 never fires for it

Not a defect - a taste call, and it is the owner's. The room rule is "the margin the design keeps
on its tighter side, kept on both, spent from the anchor", and for a line sitting on its box's
middle the two margins are equal, so the arithmetic gives back the line's own width. Measured on
`figma-centred-title-card` after every fix on this branch:

```
f0  room 453  block 453      f1  room 701  block 702      f2  room 319  block 319
```

"Fill the room" is therefore a no-op for every centred line in the corpus, and the first longer
value goes straight to wrapping - or, where it cannot wrap, to shrinking. That is the shipped rule
since 2026-09-02, it applies whether or not the file states its anchor, and it is the likeliest
remaining explanation for "when I add a longer text it gets smaller" on a centred design.

The question is what a centred line should be allowed to eat into: nothing, the plate down to a
small safety margin, or something between. On the owner's queue as call 2 of
`docs/acceptance/owner-queue/2026-09-04-a-stated-anchor-is-not-an-opt-out.md`. **Nothing in the
repo pins the current number**, so answering it breaks no gate.

## 4. Reported by another session, not measured: the anchor's `x` survives the rest

Row J's review found that `svgApplyAnchor` writes an `x` every pass while `svgLayoutRest` restores
the panel, the followers and the text transforms - but not that `x`. If true, pass N+1 measures a
line standing where pass N's growth left it, which is the history dependence the module forbids.

**The sweep now carries the check that answers it** - the room a line is offered may not move with
the value (`room moved to N (the design offers M)`) - and it did not fire on any of the 888 cases
above. That is evidence against the finding on these ten files rather than a disproof: none of
them is a panel that both grows sideways and holds an end-anchored line, which is the shape the
argument needs. A fixture drawn for that case would settle it.

## How to reproduce any of them

```bash
npm run dev:worktree                      # the sweep drives this checkout's own server
node scripts/svg-import-sweep.mjs --ladder --only illustrator-live-vote-band
```

The table names the field, the options and the lengths. To watch one by hand: `/app` -> Import
graphic -> the named file -> set the option on the mapping step -> type a value of that length.

## One thing the sweep learned about itself

Read before `document.fonts.ready`, a case is measured in a fallback face, and the rest datum and
the value's reading can land in different ones. That invented eight findings on the title card and
two on the owner's board - a drift of 14.5 units among them, which reads exactly like a real
defect and was written up as one before the re-measurement caught it. The reader now awaits the
second fit pass. **A ladder measurement taken before the font swap is worthless**, and that is the
trap this instrument fell into first.
