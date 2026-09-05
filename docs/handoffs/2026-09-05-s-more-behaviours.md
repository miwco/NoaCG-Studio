# Session S - a fourth behaviour: the countdown

**Branch:** `claude/s-more-behaviours` (from `1765fcfe`). **Date:** 2026-09-05.
**State:** finished, checked, queued for landing.

## What landed

A **countdown** attaches to imported artwork beside the quiz, the live vote and the score tracker.
The student drops their own timer card, says which drawings are the bar, the last-stretch look, the
held mark and the time-up plate, and runs it from the dashboard with Start, Pause and Reset.

- `src/templates/importedDesign/timerBehaviour.ts` - the module (new).
- `docs/BEHAVIOUR_SURVEY.md` - seventeen products, a frequency table, the gaps, and §6 records what
  was passed over so the fifth behaviour is not argued from scratch (new).
- `docs/GRAPHIC_BEHAVIOUR_PLAN.md` §13 - what the build settled, and the finding.
- `docs/SVG_AUTHORING.md` §5b - the designer's layer-naming table for a countdown.
- `e2e/import-svg-behaviour.spec.ts` - "imported countdown: the take starts it …", on the new
  fixture `e2e/fixtures/svg-corpus/illustrator-question-timer-board.svg`.
- Two backlog items and one owner-queue walk (below).

**Why a countdown, of everything still missing.** The survey ranks it second across the seventeen
products it reads, behind only "it comes on and off"; score plus/minus ranks first and had shipped
two days earlier. It is also the first item on the owner's own list in
`docs/backlog/playout-logic-for-all-common-graphics.md`. Half of it already existed and was
unreachable: the shared clock runtime, the countdown field kind and a catalog type with a
running/paused machine all shipped long ago, and none of it could be put on artwork somebody drew.

## The three decisions somebody may want to re-open

1. **The take starts the count.** Not a call this session made - `docs/OWNER_RULINGS.md`,
   operator-stories-2026-08-27: *"duration set beforehand, starts on TAKE, at zero HOLDS at 0:00
   until taken out."* A blocking design consult found that ruling; I verified it in the file before
   building on it, and I recommend the next session does the same with any quoted ruling.
2. **One `Start`, not a Start and a Resume.** Both mean go, and the structural guard greys it while
   the clock runs. Reset is the "3, 2, 1, go" road.
3. **The warning threshold defaults to TEN seconds, and is an operator field.** A class quiz runs
   thirty-second questions, so a thirty-second warning is on from the first tick and warns about
   nothing. It is deliberately NOT part of the clock's field signature, so editing it on air never
   re-arms the count.

## The finding worth carrying forward

`docs/GRAPHIC_BEHAVIOUR_PLAN.md` §12 said the paint is different in kind every time; the score
board weakened that to "not always". The countdown adds a different axis - **what DRIVES the
repaint**. A quiz repaints because a state changed, a vote because `update()` wrote new counts, and
a clock because of a runtime tick with neither. The seam's `updateHook` cannot reach that, so the
module defines `clockPainted(secondsLeft, totalSeconds)`, the shared clock runtime's own hook. **The
seam needed nothing added** - `js()` emits whatever the graphic's own runtime needs. That is the
second case in a row supporting §6's refusal to build a behaviour registry.

## Traps that exist in no repo file

- **The prompt said "a third behaviour"; this is the fifth.** The score tracker landed at `84cd2e47`
  the same morning, and `src/templates/importedDesign/AGENTS.md` still said "two modules" until this
  branch. The repo's count is quiz(1), the plain stepper scoreboard(2), the vote(3), the score
  tracker(4), the countdown(5) - `scoreBehaviour.ts` calls itself the fourth, and §12 the third.
- **The score tracker has NO section in the behaviour plan.** Its record is its own module header
  plus `docs/SCORE_CONTROL_SURVEY.md`. I wrote references to a "§12b" that does not exist, caught
  it, and fixed them; the plan's status header now says so out loud. Do not invent a §12b.
- **`docs/SVG_AUTHORING.md` §5b already documented the layer conventions** for all three earlier
  behaviours, so the prompt's step 4 ("nothing documents that today") was stale - the score session
  had fixed it. Only the countdown's table was missing.
- **I had to touch `src/components/wizard/steps/MapSvgFieldsStep.tsx`, which the prompt told me not
  to.** It is unavoidable and it is forced by the type system: `BEHAVIOUR_NOUN` and
  `BEHAVIOUR_SUMMARY` are exhaustive `Record<SvgBehaviourDraft['kind'], string>`, so adding a union
  member fails the build until both are filled in - and with no `<option>` there is no way to
  attach the behaviour, which the row's own acceptance requires. I kept the edits additive and
  inside the behaviour region, and extracted the four repeated pickers into one `DrawnPicker`
  component so the footprint is smaller rather than larger. **I did NOT touch `svg.ts` or
  `stretch.ts`** - the fit-ladder session (`new-session-a06227`) is live in `svg.ts`, and the
  behaviour seam meant I never needed to.
- **`scoreDrawnPool` in `draft.ts` is now read by two behaviours and is misnamed** - it is "every
  drawing in the file", not a score-board question. I left the name alone and said why in its own
  comment: renaming touches the mapping step in a dozen places while another session holds it.
  Rename it when that file is free.
- **A green class assertion hid a visibly broken graphic, and only a frame caught it.** The
  fixture's first version drew the red last-stretch panel ABOVE the text with its own copy of
  "5:00" inside it. Every assertion passed while the board on air showed a frozen five minutes over
  a clock counting down underneath. The spec now asserts the readout still matches `/^0:0\d$/`
  while the warning is lit. This is the taste rule earning its keep - run the spec with
  `NOACG_SHOTS=<dir>` and look.

## What is left, and why

- **No hosted walk.** The offline road is pinned end to end; the real `/output` renderer following a
  command log has not been walked for the countdown. The vote board still owes the same walk, so
  this is not a new debt - `e2e/configured/imported-quiz-output.spec.ts` is the shape to copy.
- **`docs/backlog/adjust-a-running-clock.md`** - add and remove time on a running clock. vMix and
  H2R both ship it and it is a real need; both cheap versions put a wrong number on air (an
  `adjust` on the minutes field re-arms the whole count; moving the deadline airs a count the
  operator's own box no longer describes). Needs a mechanism, not a button.
- **`docs/backlog/a-finished-clock-refills-on-an-unrelated-update.md`** - found by the review pass,
  and it is **a defect in `src/templates/shared/clock.ts` that reaches every catalog countdown**,
  not only this behaviour. At zero, `stopClock()` clears `clockPaused` as well as the interval, so
  the next `clockDataUpdated()` re-derives the full length whatever the operator changed: correct a
  caption while a board holds at 0:00 and five minutes go back on screen with the time-up styling
  still painted over it. The countdown behaviour works around it locally (`timerRanOut`) and the
  comment says to remove that when the runtime is fixed. **Nothing yet covers the catalog side,
  where the digits themselves are still wrong.**
- **The behaviour section is gated on `textLayers.length >= 3`** in the mapping step - quiz-shaped
  reasoning that is now wrong for a countdown, which needs one text layer. My fixture has three so
  nothing is blocked, but a two-line timer card cannot reach the behaviour at all. Related:
  `docs/backlog/offer-nothing-that-cannot-work.md`.
- **A board whose designer drew no held mark shows nothing when paused**, where the catalog
  countdown dims its own clock. That is the L2 answer and there is no fix that does not paint on
  somebody else's artwork; it is in the owner-queue item so he can judge it.

## Needs the owner

Nothing blocking. One walk is queued: `docs/acceptance/owner-queue/2026-09-05-a-countdown-on-your-own-artwork.md`,
with the route, what to look at, and four picky judgements that are his (one Start button, the
ten-second default, the missing held mark, and Pause staying legal at 0:00).

## Verification

- `npm run build` green.
- E2E: `import-svg-behaviour`, `import-svg-corpus`, `import-svg`, `student-rehearsal`, `quiz-pilot`
  (111 passed), then `import-svg-behaviour` + `import-svg-corpus` re-run after the check's fixes
  (33 passed).
- CI: **run 33966191595 on `ccc6a2d0` is green with all nine E2E shards in FULL mode plus the
  catalog calibration gate** (only "Vercel accepted the commit" skipped, as it does on a feature
  branch). It was asked for with `gh workflow run ci.yml`, deliberately: the handoff push would
  otherwise have planned from the previous push, seen a docs-only diff, and skipped every shard
  while cancelling the run that covered the real change - the trap the root `AGENTS.md` names.
  Run 33964442643 on `60cd47e2` was also green across all nine.
- **One commit lands after that run**: `a85c8eba`, which adds only the disarm spec (both countdown
  tests pass locally, 2 passed). Nothing else changed, and the queue's own integration gate covers
  it - but it is stated here rather than left for somebody to notice.
- `/check`: **review: delegated** (5 findings, all confirmed against the code and all fixed) -
  **simplify: inline** (the skill returned fan-out instructions, which in a launched session means
  the pass did not run, so I did the four angles here; 2 fixed) - **verify: inline**, green -
  **taste: answered** (frames rendered and looked at; one NO, the warning panel hiding the clock,
  found and fixed). Verdict stamp written for `150a2ff3`.

## Pointers

`src/templates/importedDesign/timerBehaviour.ts` (the module and every decision's reasoning),
`src/templates/importedDesign/AGENTS.md` (the four modules behind one seam),
`docs/BEHAVIOUR_SURVEY.md` §4 and §5 (the remaining gaps, and which are reachable with no
expression language - the best-argued candidates for the fifth behaviour are a paged results board,
which needs a bounded-counter field kind first, and a credits roll, which is the shipped ticker's
shape).
