# Row J: the live-vote board stops destroying itself

Branch `claude/j-live-vote-defects`, from `main` at `7082f007`. The row's goal was that a too-long
badge value never leaves a dead layer in the graphic, and that every field on the board either
accepts what you type or says why it cannot.

## Which world I found myself in — the answer to row C's step 0b

Row C left two possibilities and neither is what happened.

**The vote board's badge text IS on the fit ladder.** `markPollLayers` renames the question, the
option labels, the figures and the total to `p-*`, which does take them out of `svgFitNodes`
entirely. It does NOT rename the badge TEXT: the poll's `badge` picker binds the `Vote badge`
GROUP, and the `Badge text` layer inside it stays an ordinary `fN` field. So on his board exactly
one artwork layer is a field, it is the one he was typing into, and it is fitted like any other.

**It is also the case row C called "unreachable today"** - a bound `fN` layer inside a drawn state.
The badge group is `display: none` until the vote opens, so the text inside it has no box at load,
which is precisely the condition row C's `svgFitLaidOut` / `svgFitOwed` work was built for. That
work runs, and it works: measured, the badge is owed at load, pays the debt the instant `pShow`
reveals it, and comes back with a real room.

**And row C did fix half of defect 1.** The half where the badge never comes back does not
reproduce on this tree, before or after my change - shortening the value takes the shrink, the
squeeze and the overflow report back off, on the cue editor and on the program stage. I could not
prove that row C's landing is what removed it, because I did not rebuild the pre-C runtime; what I
can say is that a room cached as zero is exactly a state no later value could correct, and there is
no other latch in the path. The recovery is now gated either way.

**What I did NOT find is a fit rung that hides anything.** There is none. Nothing in the ladder
writes `display`, and the badge group stayed lit at every value length I drove.

## What was actually wrong

**A CENTRED line is given exactly the width of the words the designer typed.** The room rule reads
the gap beside a line as MARGIN and mirrors the tighter side. For a line composed against one edge
of its box that is a true reading. For a line the designer centred it is empty: both gaps are half
the leftover by construction, so the mirror hands the line back its own drawn width and the box
around it is invisible to the ladder.

Measured on his own board, before:

| value | room | size | painted |
| --- | --- | --- | --- |
| `VOTE NOW` (as drawn) | **143.2** in a 260-unit pill | 22px | 142 |
| `PLEASE VOTE` | 143.2 | **16.25px** | 183 |
| `PLEASE VOTE NOW` | 143.2 | **12.1px**, squeezed to 143 | 143 |
| anything longer | 143.2 | 12.1px, squeezed to 143 | 143 |

The last row is why "even longer" made no difference: past the floor every value looks identical,
and 61 characters crammed into 143 units at 12.1px is a grey smear. He read that as the badge
having disappeared, which is a fair reading of what is on screen.

And on a stripped fixture the arithmetic is naked: a 600-unit plate with a centred word 104 units
wide measured **104.1 units of room**. The plate is not visible to the ladder at all.

## The change

`svgAlignOf` in `src/templates/importedDesign/svg.ts`. For a line whose alignment is `middle`, the
room is measured symmetrically about the anchor with a TYPOGRAPHIC margin kept from each edge -
half the drawn type, which is the same side bearing `measureSvgRoom` already keeps between a line
and a neighbour drawn beside it - and **it may only ever ADD room**, so a composition the mirror
already served keeps exactly what it had.

This is the sideways half of the argument settled downwards on 2026-09-02, where the space above a
centred line stopped being read as margin. Same rule, same shape, same "may only add" guard. Only
`middle` is touched: an `end`-anchored line's smaller gap really is the margin the designer kept,
and `start` never reaches this code.

After, on his board: 238 units of room, `PLEASE VOTE` at the drawn 22px, `PLEASE VOTE NOW` at
20.5px unsqueezed and unreported. A value the pill genuinely cannot hold still floors at 55%, is
still squeezed INTO the pill rather than painted over the artwork, is still reported to the
operator, and still comes back the moment a shorter value arrives. No rung below this one moved.

**This reaches every imported design, not only the vote board** - any centred line in any plate.
It can only ever grant more room, so nothing gets tighter; what it does change is that a panel with
GROWTH turned on now grows less, because less text overflows. Worth knowing when reading the
corpus and catalog gates.

## Defect 2, decided

**The refusal is deliberate and stays.** `paintPollState` writes every figure from the tally on
each `update()`, so a typed percentage would be overwritten by the next vote; `pollDrivenLayers`
therefore drops the question, the labels, the figures and the total from the field list. The built
graphic has ONE artwork field on it, `Badge text`, and I verified that from the emitted
`SPXGCTemplateDefinition` rather than inferring it.

The defect was that the mapping step still offered a **Field name box and a Text box** on all eight
driven rows. They looked exactly like the live row above them, they highlighted the layer in the
preview on hover, and nothing typed into them reached anything at all - which is what he hit. Those
two boxes are gone (`MapSvgFieldsStep.tsx`); the row states the layer's name and that the vote
fills it, and the section's count stops claiming "9 of 9 editable on air" about a graphic with one
editable field.

I deliberately did NOT add a rehearsal value. The percentages are the one thing on this board that
must never disagree with the tally, and a typed 40% surviving until the next vote lands is a worse
failure than not being able to type one. Simulate votes on the Audience tab drives the real path.

The first pass at this put the whole reason on every row, which turned his nine-row checklist into
eight copies of one paragraph in the on-air amber - worse than the dead box, and the same reading
problem he raised about this step in the same walk. Second commit fixes that: the layer's name at
full contrast, a short muted tag, the reason once in the section note.

## Defect 3

Same cause, and his own words diagnosed it: *"it doesn't fill the whole shape. It could."* It could,
and now it does. What remains is that a value the pill genuinely cannot hold takes one ratio jump
down to the floor rather than easing there, which is the ladder's ruled behaviour and not a defect
of this board.

## Step 4, the shape question

Not started, and filed rather than rushed. Giving each vote option its own field changes a
persisted format - `pollBehaviourFields` appends and `fieldIdFor` resolves a control's payload key
by INDEX - so it needs its migration in the same commit. The decision itself (do it, keep the
multi-line input as a paste shortcut) stands as written in
`docs/backlog/live-vote-fields-that-do-not-work.md`.

## Gates

- `npm run build`: green on every commit and on the final tree.
- **Reproduced before writing any code**, in a real browser on this branch's own dev server: the
  wizard walked, the composed document mounted un-sandboxed so it could be driven, and every number
  in the tables above read off the running graphic. The defect-2 half was read off the mapping
  step's own DOM.
- **The spec was written red and watched go red.** `svg import: a word CENTRED in its plate gets
  the plate as its room, not its own width` fails on the previous runtime with 104.1 units of room
  against the 500 it asserts, and with the size dropping on a value the plate plainly holds.
- Two more gates on the owner's own artwork in `import-svg-behaviour.spec.ts`: the badge walk from
  the CUE EDITOR read off the PROGRAM stage (his surface, his sequence, including the recovery he
  could not get), and the mapping row that offers no box to type in.
- `e2e/import-svg-corpus.spec.ts`'s `labels()` helper now reads a driven row's own sentence when it
  has no title box, so the corpus sweep answers for a poll board instead of timing out on one.
- `npm run test:e2e:focus`: see the verdict at the end of this file.
- `check`: see the verdict at the end of this file.

## Two things worth knowing

- **A dev server started for browser work will be adopted by the suite.** My first focused run died
  with "Refusing to run the offline e2e suite against a server that is not offline-pinned" because
  `npm run dev:worktree` was still listening on this checkout's port. Stop it before gating. The
  guard hook warns about exactly this when you start a server the wrong way; it does not warn when
  you start it the right way and then forget.
- **The editor preview iframe is `sandbox="allow-scripts"`**, so a page script cannot reach into it.
  Re-mounting its `srcdoc` in an iframe of your own with no sandbox attribute gives a fully
  reachable copy of the same composed document, which is what every measurement here was taken
  through. Cheaper than a Playwright run when you are still hunting rather than gating.
