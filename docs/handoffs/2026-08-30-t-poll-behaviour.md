# Session T - poll behaviour on a drawn graphic

Branch `claude/t-poll-behaviour`, 6 commits. Build green; the offline walk is green end to end;
the full CI suite (9/9 shards) ran green on this branch.

## What now works

A student drops in their own poll artwork, points at which layers are the question, the option
rows, the bars and the figures, and runs a live audience vote from the production dashboard.
Votes arrive at the join page, the counts are staged onto the graphic as an ordinary cue, the
operator takes it, and the bars the designer drew move with the tally. No code.

Pinned by `e2e/import-svg-behaviour.spec.ts`, "imported vote board: a real audience round moves
the bars the designer drew" - drop, bind, into a production, open a vote, drive votes through the
offline provider's `simulateVotes`, stage, take, close, result, winner. 17 s, passes.

## The deliverable question: what is generic, and is poll the third case?

**Poll IS the third case, not the quiz with different words.** Taking the pilot's own split:

| Piece | Quiz | Poll | Verdict |
|---|---|---|---|
| Machine | `ANSWER_BOARD_MACHINE`, filtered | `LIVE_POLL_MACHINE`, filtered | **generic**, free twice |
| Buttons | `ANSWER_BOARD_CONTROLS` | `LIVE_POLL_CONTROLS` | **generic**, free twice |
| Attach | `attachMachine` | `attachMachine` | **generic**, untouched |
| Binding | pickers over the candidate inventory | same | **generic** |
| Field emission | fields after the artwork's, order mirrored in a type shim | same | **generic** |
| Extra machine step | a `Reveal` step spliced before Out | a `Result` step, same shape | **generic** |
| **Paint** | show one drawn moment | **interpolate a bar between poses nobody drew** | **NEW IN KIND** |

The first six rows a SECOND case would also have shown. The seventh is what only a third could:
the quiz's answer to "what does a state look like on somebody else's artwork" is L2 - the designer
draws each moment, NoaCG picks one - and **a bar has no moments**. One pose per share, nothing to
draw, nothing to pick. The designer draws it at FULL length and the runtime reads that as a range.
Call it L4: *draw the extreme, and NoaCG interpolates*. Both models sit in the one behaviour, and
which one a layer uses is a property of the LAYER, not the behaviour: badge and winner marks are
L2, bars are L4, labels and figures are neither (text the runtime writes).

**So: a registry is still wrong, and now for a measured reason rather than a cautious one.** What
I built instead is `src/templates/importedDesign/behaviour.ts` - ONE module interface naming
everything `assembleImportedSvg` needs, two implementations, a two-entry dispatch. `svg.ts` asks
for a bound module; the `quiz ? ... : ''` ternaries in six places are gone. Plus `drawnState.ts`,
the one mechanism both genuinely share, extracted from the pilot rather than designed for it. Class
names stay per-behaviour (`-qstate` / `-pstate`) because an exported board carries them.

Still deferred, unchanged: no behaviour declared from data, no two on one graphic, no arc
customization. Those are the north-star questions and three cases is not enough.

## The join needed no new plumbing, and that is the good news

`tallyValues` already writes `Label | count` lines; `pollFieldMap` already decides which graphic
can hold a vote by looking for fields titled **`Question`**, **`Options`**, **`Vote count`**. So the
join is a FIELD NAMING CONTRACT and the behaviour keeps its half by owning those three fields
itself (hidden holders, like the quiz's two letters). `ProductionAudienceWorkspace` is untouched.

**The operator gate stays structural.** Staging writes a CUE; the operator Takes it;
`AudienceBackend` still has no method that reaches the command log.

Consequence, deliberate: **a layer the vote drives stops being an operator field.** Two writers on
one node is a graphic whose operator watches their typing be overwritten. Dropped in
`draftToOptions` (the one place field numbering is decided), and the mapping step says which went.

## Animation - how a bar grows when a vote lands

- **On DATA, never on state.** `update()` runs `paintPollState()`, which tweens each bar from where
  it is to its new share. No transition fires; the board can sit in `voting` for the whole vote.
- **Three things are transitions**: Close voting (the badge goes), Show result (the figures land),
  Call the winner. **Taking the cue is what opens the vote** - the entrance step IS the voting
  state, which is why there is no "Open vote" button. (The wave brief's Closed/Open/Revealed sketch
  is answered that way: the graphic's presence on air is the vote being open.)
- **The motion is the catalog board's, imported not re-chosen**: `BAR_GROW` (0.9s), `BAR_STAGGER`
  (0.12s) and `power3.out` are now exported from `poll/pollMotion.ts`, along with the `Label|count`
  parser (`pollWireJs`), so there is one vote-bar vocabulary. No overshoot ease ever touches a vote
  bar - it would read as the wrong figure.
- **A `<rect>` has its `width` tweened, never a scale** (a scale squashes a rounded cap); anything
  else scales about its own left edge via `svgOrigin`.
- **The drawn length is 100%, measured once at rest.** Re-reading it makes the last pass's length
  this pass's full length, so a bar that ever showed 40% could never show more.

Two filters off the catalog arc, both stated in code: no automatic 20-second voting window (a real
audience votes over minutes; that arrow would close the vote under the operator), and the badge's
keyframes become a call, because they name an element only the catalog board draws.

## Two findings relayed from other rows, both folded in

**OGraf: the status had to move into a FIELD.** Session X's read of the OGraf Server API found that
a GRAPHIC's custom action returns no `result` payload and `RenderTargetInfo` reports no instance
state, so a foreign controller can read `currentStep` and a status string and nothing else -
machine state does not cross that boundary. The COUNTS were already in a field (`Options`). The
open/closed status was machine-only, which would have made this a board that works in our dashboard
and nowhere else. It now rides the `Vote count` line the dashboard already writes ("4 votes ·
voting open"), and the runtime reads it back: **editing that one field closes the VOTE NOW badge
with no event dispatched**, pinned in the walk. The two closers do not fight, because they are not
equals - pressing Close voting leaves the `voting` state and is therefore sticky, while a data
close follows the data.

Two spec gaps from the same read, noted rather than worked around: a tally has **no standard
widget** (GDD has ten scalar types and no array presentation), and neither "which button is legal
right now" nor "the vote window closed itself" is expressible anywhere in the standard. Our
generated control page has both; OGraf cannot carry them. Detail: `docs/CONTROL_PANEL_RESEARCH.md`.
Open / Close / Reveal as OGraf actions needs nothing new, so the event vocabulary is safe.

**The state pickers were clipping.** Session U's documentation screenshot caught the Fields step's
picked / right / wrong dropdowns rendering "A selected (hidde" - a control that cannot say what it
is set to, on the step a student uses to attach behaviour. Fixed in `steps/mapSvgFields.css` (the
step's own part; not the two files U owns): the three states now wrap among themselves rather than
being squeezed. **That reverses half of an earlier decision in that file**, and the comment says so
with the measurement - this panel is ~447px wide, which left each picker ~142px, and a `<select>`
cannot ellipsize its own value. Ragged and readable beats tidy and clipped. I photographed both the
quiz and the vote sections before and after rather than reasoning about it; every value now reads
in full, and the answer letter still spans the block so the three still read as one row's set.

## Something the corpus caught, worth knowing

The first poll proposal keyed on layers named "Option N" - and the student's QUIZ fixture names its
four answers "Option 1..4", so it claimed a quiz as a vote. `student-rehearsal.spec.ts` failed and
was right to. **A proposal now needs evidence of its OWN behaviour**: two rows must resolve a BAR
before a vote is proposed at all. A confident wrong answer in front of somebody who came to be
helped is worse than proposing nothing.

## Needs the owner

- **`docs/acceptance/owner-queue/2026-08-30-a-live-vote-on-your-own-artwork.md`** - the 10-minute
  route. The one decision I would most like answered: **should the percentages run live while the
  vote is open, or wait for Show result?** I matched the catalog board (they wait). It is a one-line
  change (`pollRevealed`) and it is a taste call, not an engineering one.

## Open, and not done here

- **No hosted walk.** Offline is pinned end to end; the real `/output` renderer following a command
  log is the quiz pilot's §10 walk repeated for the vote, and nobody has repeated it.
- **One vote per graphic.** A round with more options than the board has rows counts them all and
  shows what was drawn. The board says nothing about it.
- **`src/templates/importedDesign/AGENTS.md` is at 99.7% of the instruction-chain byte cap**
  (293 bytes free). The next person who needs a rule in that area has to condense first. That is
  not caused by this work so much as revealed by it.
- The vote artwork is `e2e/fixtures/svg-corpus/illustrator-live-vote-band.svg` with its sidecar.
  It is deliberately NOT in `docs/svg-samples/` (session V owns that directory tonight, and it is
  not offered to designers as a sample yet). If it should become one, it is a copy and a line in
  `_svg-import.ts`.

## Files

New: `src/templates/importedDesign/{pollBehaviour,behaviour,drawnState}.ts`,
`e2e/fixtures/svg-corpus/illustrator-live-vote-band.{svg,expect.json}`,
`docs/acceptance/owner-queue/2026-08-30-a-live-vote-on-your-own-artwork.md`.
Changed: `svg.ts`, `quizBehaviour.ts`, `types/livePoll.ts`, `poll/pollMotion.ts`,
`model/wizard.ts`, `wizard/draft.ts`, `wizard/CreationWizard.tsx`, `steps/MapSvgFieldsStep.tsx`,
`e2e/import-svg-behaviour.spec.ts`, `e2e/_svg-import.ts`,
`docs/GRAPHIC_BEHAVIOUR_PLAN.md` (§12), `docs/INTERACTIVE_PLAYOUT_PLAN.md` (Phase 6),
`src/templates/importedDesign/AGENTS.md`, `steps/mapSvgFields.css`, `scripts/copy-baseline.json`.

## Verification

`npm run build` green on the final tree. Locally, queued and green: `import-svg-behaviour` (6),
`student-rehearsal` (2), `import-svg-corpus` (14, including the growth sweep that reads the new
fixture's sidecar), `import-svg`, `production-audience` - 83 tests, all passing. Pushed; read the
CI run before queueing the merge.
