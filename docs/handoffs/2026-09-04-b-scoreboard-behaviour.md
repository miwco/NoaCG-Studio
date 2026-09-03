# 2026-09-04 - row B: the score tracker, the other half of 2026-09-12

Branch `claude/b-scoreboard-behaviour`, cut from `332e8b56` and with `main` taken in at
`826fefba` (row C). The brief was `docs/backlog/scoreboard-behaviour.md` - the owner's
2026-09-03 ask, *"we need to be able to make a simple score tracker with two or more teams, with
quick ways to add scores from a custom SVG file"* - filed the same evening he confirmed the quiz
half end to end on his own artwork.

## What shipped

- **`src/templates/importedDesign/scoreBehaviour.ts`** - the fourth behaviour, behind the same
  seam as the other three. A student draws a board, says which layers are each team's name and
  figure, and gets three verbs: `+1` per team (which also plays the flash they drew), `−1` per
  team, and New game. Plus Full time and Clear flash for the board.
- **`docs/SCORE_CONTROL_SURVEY.md`** - the derivation behind those verbs, and the thing to read
  before the next behaviour. See the warning below about how it was produced.
- **`MachineControl.set`** (`src/blocks/animData.ts`) - the third member of the payload family,
  and the only one that can express a reset. Wired through every surface that fires an event.
- **Numbered cue bands** (`src/control/cueFieldGroups.ts`) - the field editor bands by row number
  as well as by A/B, so a four-team board reads as four small groups.
- **`docs/SVG_AUTHORING.md` §5b** rewritten to document the layer-name convention for all three
  behaviours. It described only the quiz; the vote board's was written down nowhere.
- A four-team corpus fixture and sidecar, and three e2e walks (the cockpit, the exported show
  controller, the standalone CasparCG panel).

## The three decisions worth arguing with

**1. The row count comes from the artwork, capped at eight.** `Team 1` / `Score 1` / `Flash 1`,
matched by a row key that must stand as its own word - the poll's rule, for the poll's reason.
**`Home` and `Away` are deliberately NOT proposed for**: they say a board has two sides and
nothing about what it does, and a versus card and a head-to-head stat panel name their halves the
same way. Such a board is two clicks in the picker. That also leaves the shipped `scorebug.svg`
sample and its "a scoreboard needs no behaviour" test untouched, which was not the reason but is
a fair sanity check on the rule.

**2. The scores stay the artwork's own operator fields.** This is the load-bearing choice and
everything else follows from it. The `+1` carries `current + 1` with the event (`adjust`, the
catalog scoreboard's own mechanism), so the figure and the flash land together or neither does;
the operator can still type a score, which the survey says is the correction every professional
console has and the one a minus cannot replace; and the behaviour owns **zero** fields, which is
a finding rather than an omission - a shadow copy would give the operator two boxes for one
number and let them disagree.

**3. Which row flashed is DATA.** One `Flash` state, and the row is the one whose figure went up,
read after the payload lands and before the state's timeline calls run. Four `scored-1..4` states
is exactly what `docs/STATE_MACHINE_SCHEMA.md` forbids.

## The one thing I added outside my own module, and why

**A reset could not be expressed.** `payload` rides a field at whatever it reads; `adjust` rides
it moved by a fixed delta; neither can say "make it zero". Written instead as a runtime call, New
game would have zeroed the graphic and left the operator's boxes reading 2 - so the next ✎ Update
would put the finished game straight back on air. That is the exact drift `adjust` was added to
prevent, arriving by a different door.

So `MachineControl.set` is `Record<fieldId, value>`, additive optional (no version bump), refused
by the shape gate if a field also appears in `payload` or `adjust` - one road per field. It is
applied by `controlModel.eventPayload` and hand-written again in the two vanilla surfaces that
ship without that module, and `movedKeys()` now names the write-back set for all four React
surfaces so a fifth member cannot arrive and be forgotten by one of them.

**Ten files outside `importedDesign/` were touched for it.** That is more than the row's TOUCHES
line named, and it is the part to review hardest. The alternative was a reset that only worked on
one of three operator surfaces, or no reset at all.

## A warning about the survey, and it is not a small one

`docs/SCORE_CONTROL_SURVEY.md` was produced by a delegated research agent. **Its first report was
partly fabricated** - it opened "both research agents are back" when neither had returned, and
wrote up their areas with quotations, URLs and version numbers that were constructed rather than
retrieved. The agent caught this itself, retracted, and re-stated the survey from the sources it
had actually read. The committed page is the re-stated one, its "How to read this" section says so
in the open, and its "Not surveyed" list names every product the retraction removed.

**Two consequences.** The five conclusions did not move when the fabricated half went, which is
why they are stated separately from the evidence - but the professional control rooms (Ross,
Chyron, Vizrt) and the classroom scorekeepers (ClassDojo, Kahoot, Flippity) are genuinely
unsurveyed, and the classroom half is the closer analogue to a class quiz board. If anyone
reopens the verb defaults, that is the gap to fill first.

And the method lesson, which is worth more than this row: **a delegated research result is not
evidence until its own sources have been opened.** The same rule the check workflow already
states about a delegated review turns out to apply to a delegated survey.

## Verification

- `npm run build` - green, on `0f511a54`.
- `npm run test:e2e:integration` (j-0424, from the fork point, so it covers row C's changes too):
  **1012 passed, 6 failed.** One was mine and is fixed (below). The other five are re-running
  isolated as j-0432 and **the verdict is not in as I write this** - see "Needs picking up".
- Targeted runs, all green: j-0419 (import-svg-behaviour + corpus + import-svg, 93 passed - the
  new four-team fixture through the corpus sweep, and the score walk end to end), j-0420
  (production-controls, control, control-panel-types, hosted-control, exports, snap-recovery, 66
  passed - the `set` fan-out and the numbered bands).
- `check: review delegated, simplify inline, verify partial` - see the report below.

## Needs picking up

1. **j-0432's verdict.** Five integration failures re-running isolated:
   `student-rehearsal.spec.ts` (two: a 20 s wait for the production page, and a 60 s timeout) and
   `stage-fit-determinism` / `stream-notification` / `template-escaping`, all three failing with
   *"Execution context was destroyed, most likely because of a navigation"* inside a
   `page.evaluate` that loops the catalog. My read is load rather than regression - the run was
   1012 tests with the machine under 4 GB free, `catalog-baseline.spec.ts` passed (which is the
   gate that would notice an emitted-code change), and no catalog type declares a `set` so the
   serializer's output is byte-identical for every existing template. **That is a read, not a
   verdict.** If j-0432 is red, `student-rehearsal` is the one to look at first: it walks the SVG
   import road with a two-team board, and it is the spec my proposal rule most nearly touches.
2. **j-0430 / j-0431** re-run `import-svg-behaviour` after the review fixes; j-0431 carries
   `NOACG_SHOTS` so there are frames to look at.
3. **The row A merge.** Row A owns the fit ladder and `SVG_AUTHORING.md` §4. It had not landed
   when this branch took `main` in, so **the new fixture's `growth: "shrink"` was derived against
   the pre-row-A ladder**. The corpus gate reads that field, so if row A moves the measured
   default this fixture is one of the ones that has to be re-derived. It is a fixed-layout board,
   which is the case the ladder leaves alone, so I expect it to stand.

## Deliberately not done

- **No amount other than +1.** Every product surveyed offers a row of amounts and every one makes
  the set author-configurable, because the amounts are the sport's own rules. That is the
  customization surface the owner ruled out on 2026-08-22, so it ships as one and the survey is
  where a second gets argued from. It is question 1 in the walk item.
- **No clamp at zero.** `−1` at zero shows `-1`. Nothing surveyed documents a clamp either way,
  and clamping would mean the graphic disagreeing with the box the operator is typing in.
  Question 2 in the walk item.
- **No timer on the flash.** Clear flash is a press, exactly as the catalog scoreboard's Clear
  flag is. An arrow nobody drew closing a moment under the operator is the hazard the vote board
  had to remove.
- **No leader mark, no clock, no period.** Not asked for, and each is another row of pickers.

## Safe to archive?

Yes, once the branch has landed through the queue and j-0432's verdict is recorded. Nothing here
is waiting on a person except the owner's walk
(`docs/acceptance/owner-queue/2026-09-04-a-score-tracker-on-your-own-artwork.md`), which is
transient by design and does not hold a session open.
