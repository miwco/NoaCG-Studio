# Interactive & Data-Driven Playout — plan and tracker

The durable tracker for the interactive-playout program: a controlled quiz workflow, a generic
sports controller, audience participation through a public production page, moderation of
audience material, polls and audience quiz answers, a minimal production-owned Data Hub, and
contextual per-cue controls inside the existing playout workflow. Update this file as phases
move; it is the cross-session source of truth for this program.

**Governing principle: data and audience activity may prepare or update graphics, but they
never bypass the operator or the normal Preview/Take/Update/Next/Out workflow.** The existing
playout dashboard (ProductionPage, HostedControlPage, the exported controller) stays the
central operational surface; nothing here replaces it or builds a parallel cue, control,
state, data, or playout system.

Reviewed at plan stage by an independent fresh-context pass (2026-08-05): AGREE WITH
CORRECTIONS; every corrected item is folded in below (G9 is the important one).

## Status board

States: Not started · Investigating · Planned · In progress · Blocked · **Implemented**
(code + automated verification complete) · **Verified** (visible behaviour demonstrated and
accepted by the owner) · Deferred.

| Phase | Scope | Status |
|---|---|---|
| 0 | Investigation + grounded plan + this tracker | Implemented |
| 1 | Control-panel truth for four pilots (production contextual controls) | Implemented |
| 2 | Shared data foundation (datasets on Show + Data workspace) | Implemented |
| 3 | Quiz pilot | Implemented |
| 4 | Generic sports pilot | Implemented |
| 5 | Audience questions/comments (join page, moderation → cue, presenter) | Implemented |
| 6 | Poll + audience quiz answers | Implemented |
| 7 | CSV/JSON import into the Data Hub | Implemented |

**No phase has reached Verified.** Implemented is as far as any row has got: the owner's
acceptance of a visual pack is still owed for every phase. The hands-on passes (real CasparCG
2026-08-06; the workspaces and vote-to-air 2026-08-08) drove the flows and fixed what they
found, but driving is not acceptance - the caveat stands until the owner signs a pack off.

## Verification contract (owner requirement, 2026-08-05)

A phase is never "working" because the code looks right, the build is green, tests pass,
internal state exists, or a control event was sent. **Implemented** requires code plus the
automated gates below. **Verified** requires a **visual acceptance pack**: screenshots or a
short recording of the REAL running app (never a mockup) at the important stages, with the
exact route, production, cue and action sequence written down so the owner can repeat it by
hand — and the owner's acceptance. Where the phase touches them, the pack covers: the selected
cue on the real ProductionPage; every intended editable control; Preview before Take; Program
after Take; Update while on air; graphic-specific actions and state changes; Next; reload/snap
recovery; cue switching without leaked values or state; the real `/output` renderer; the
exported controller / CasparCG path. If the visible result differs from intent, looks
incomplete, contains fake controls, or repaints wrongly, the phase stays unverified — green
tests notwithstanding.

Automated gates (supporting evidence): `npm run build`; `npm run test:e2e:focus` (or its
`:queued` form when another worktree is running a suite); a Playwright spec per new flow,
mapped in `scripts/e2e-lists.mjs` in the
same commit; `node scripts/l3-sweep.mjs <shots> quiz|poll|audience` after template changes;
the catalog gates (`type-floor`, `overflow-sweep --baseline`, `field-coverage`, `numerals`,
`test:e2e:catalog`) after catalog-affecting type edits — `numerals.mjs` specifically once
scores become live number fields; `npm run test:local-relay` + `e2e/exports.spec.ts` where
exports are touched.

## What exists (investigated 2026-08-05 — reuse, do not rebuild)

- **Production model** (`src/model/shows.ts`): pool + cues (a cue OWNS its `values`) + look +
  `hostedSlug`/`outputSlug`; `patchShow` envelope; sync kind `'show'`; additive-optional
  fields are the sanctioned extension pattern.
- **Verbs as data** (`src/control/hostedControl.ts` `takeCueItems` etc.), one decision point
  `runVerb` in ProductionPage; the one `control_events` log (0008/0029/0031/0033/0034) with
  slug-keyed SECURITY DEFINER RPCs and the `followControlLog` recovery discipline.
- **Contextual-controls architecture** (`docs/CONTROL_LAYER.md`): `machine.controls` travels
  inside the template; `eventButtons`/`eventLegality`/`isEventLegal` render identical,
  structurally-greyed buttons on five surfaces already.
- **State machines** (`docs/STATE_MACHINE_SCHEMA.md`) + graphic types compiling machines
  declaratively (`docs/GRAPHIC_TYPES.md`).
- **Pilot template mass**: quiz qz01–12 (`select`/`lock`/`judge`), scoreboards sb01–20 with
  the match clock (`clockStart/Stop/Reset`), audience pack (20 designs), poll pl01–04
  (`close`/`result`/`call`), competition-pack rosters/standings.
- **Audience send-in precedent**: `src/showchat/` + migration 0003 (anon submit with caps,
  rate limit, profanity mask; 4-state moderation).

### The gaps this program closes

| # | Gap |
|---|-----|
| G1 | ProductionPage renders no machine event buttons — quiz/sports/poll actions unreachable from the production dashboard (`ProductionPage.tsx` fields region; `docs/PLAYOUT_DASHBOARD.md` §8 reserves the region) |
| G2 | No production-scoped audience participation (showchat is a standalone `shows` row; no join page, poll votes, quiz answers, or tallies) |
| G3 | `chatGraphicBlock` airs content by REST-polling inside the graphic — bypasses the log, the operator, and Preview/Program |
| G4 | No Data Hub: no dataset concept, no CSV/JSON import, no grid editor |
| G5 | No presenter view; capability model is binary (control = write, output = render) |
| G6 | Quiz machine lacks an answers-open beat, a hidden-pick-then-reveal beat, and audience-result display |
| G7 | Moderation cannot edit a submission (status only); nothing converts a submission into a cue |
| G8 | Poll voting window is authored on the arrow, not per play; no re-open after reveal |
| G9 | **Recovery defect (found in plan review):** `noacgSnap` replays with suppressed callbacks, so the quiz's call-driven `selected`/`locked` visuals do not survive snap recovery; and the quiz runtime's `update()` unconditionally `clearReveal()`s, so a live ✎ Update mid-lock wipes the lock visual while the machine still reports Locked |

## Architecture decisions

- **D1 — Contextual controls complete the existing vocabulary.** ProductionPage's cue editor
  gains the machine event-button block (sections, payloads from the cue draft, structural
  greying, a state chip, a permitted-state snap select for recovery) rendered by the same
  `eventButtons`/`isEventLegal` as everywhere else. State source: `control_shows.live` when
  published; ProgramStage state replies when local (`src/output/stage.ts` already collects
  them — `PayloadStage` surfaces them). Events act ON AIR: legality follows ✎ Update's rule
  (live only while the selected cue's graphic is up on its layer) and the buttons sit under
  their own "acts on air" heading, outside the amber preview-editing frame.
- **D2 — Reusable presentation, not per-template controllers.** `FieldControl` upgrades:
  `select` with ≤5 short options renders as segmented buttons; `number` gets +/− steppers.
  Sports scores become `number` fields. The two deliberate vanilla-JS second renderers
  (`control/controlPanelHtml.ts`, `control/productionControllerHtml.ts`) are updated in step.
- **D3 — Data Hub = additive-optional `datasets` on `Show`.** `{ id, name, kind
  ('quiz'|'teams'|'roster'|'generic'), columns, rows }`, edited in the Data workspace, synced
  inside the show doc, offline-capable. Bindings are deterministic operator actions ("load
  row N into this cue"), never a live wire. *Known limit: doc sync is record-level LWW with
  conflict copies; concurrent multi-person editing of one production can mint a conflict copy
  (which drops the slugs). Acceptable at classroom scale; named, not hidden.*
- **D4 — Audience backend = production-scoped tables + slug-keyed RPCs** (§ Audience backend
  design). New capability slugs on `control_shows`: `join_slug` (public) + `presenter_slug`
  (read-only). `/join` is a new tiny MPA entry (the `/output` build shape).
- **D5 — Tallies never touch the renderer on their own.** Reveal = the operator writes counts
  into fields via normal `update` + fires the machine's `result` event; "auto refresh" is an
  operator-side toggle that resends updates through the log.
- **D6 — Workspaces are hash sub-routes**: `#/production/<id>` (Playout, unchanged),
  `#/production/<id>/audience`, `#/production/<id>/data`.
- **D7 — QR codes**: a tiny vendored MIT encoder, app-side only; generated templates stay
  dependency-free (the invitation graphic's QR arrives as an ordinary image-field data URL).
- **D8 — Pilot machine changes are TYPE changes** (`answerBoard.ts`, `livePoll.ts`); the
  default path stays intact so the SPX `next()` walk survives. No new state engine, no node
  editor.

**Conflict resolutions:** the shipped MachineGraph node editor stays what it is (Advanced
mode; no new logic-authoring surface is built). The quiz's instant-paint `select` is kept AND
a hidden path added (lock reachable from the entrance state; `revealChoice` paints later) —
both flows coexist structurally. The new audience backend supersedes showchat FOR PRODUCTIONS;
standalone showchat stays untouched until a separate owner decision. Concept translation: the
blueprint mock shows quiz beats as four rundown cues; a literal cue-per-beat would replay
`play()` per beat, so beats are EVENTS on one cue.

## Phases

### Phase 0 — Investigation + plan. Status: Implemented
Three deep read-only maps (playout/production/control; template controls + state machines;
audience/backend/data), the re-design concept review, an independent second-opinion pass, and
this tracker. Plan of record: the session plan of 2026-08-05 (owner-approved in principle);
this file carries everything durable from it.

### Phase 1 — Control-panel truth for four pilots. Status: Implemented (awaiting owner Verified)
**Goal:** the production dashboard renders honest, complete contextual controls for one
ordinary lower third, one quiz board, one scorebug, one audience Q&A card — and the whole
operator-to-output path is demonstrated visually.
**Why:** G1 blocks every later workflow; the quiz/sports/poll machines are already authored
but unreachable from the surface students use.
**Implemented (2026-08-05):** machine state surfaced through `PayloadStage`/`ProgramStage`
(`onState` prop over the stage's existing replies) and, when published, seeded from
`control_shows.live` + followed via the log's `{t:'live'}` rows; the GRAPHIC ACTIONS block on
ProductionPage (own panel outside the editor frame, "act on air" header, sections, structural
greying via `isEventLegal`, state chip naming the current state, payloads riding from the
edited cue); the "Snap to state…" recovery picker — the snap rides WITH an update of the cue's
values, because recovery is both halves and a lone snap suppresses call-painted looks;
`machineStateGroups` in `control/controlModel.ts`; the G9 fix (`paintQuizState()` in the quiz
runtime — `update()` repaints selection/lock/verdict from `noacgMachineState()` + fields
instead of the unconditional `clearReveal()`); segmented-select presentation for short
constrained choices in `FieldControl` AND both vanilla renderers (`controlPanelHtml.ts`,
`productionControllerHtml.ts` — kept in step per the one-control doctrine); number steppers
added to the exported controller (it was the one renderer without them). Three
`e2e/control.spec.ts` call sites updated for the segmented row.
**Adversarial review round (20-agent workflow over the diff, same day) — all confirmed
findings fixed before commit:** (1) reopening a published production replayed a bare `play()`
into the local monitor, whose state reply then clobbered the wire-seeded machine state — boot
recovery now replays the full recipe (data → snap to the reported state → data); (2) snap
recovery sourced its data half from the PREVIEWED cue, airing unprepared content when a
different cue was live — events and snaps now carry the ON-AIR cue's values only; (3) the quiz
repaint replayed its pop/shake tweens on every live keystroke — painters now stamp a paint
signature (state + the two letters) and a repeat paint is skipped; (4) the exported
controller's missing number steppers; (5) a third `control.spec.ts` call site and the
Millionaire spec still pinned the OLD update-clears-reveal behaviour — the Millionaire test
now pins the two-operation reset (data alone keeps the verdict; snap(null)+update cleans);
(6) the source catalog baseline re-recorded for the 12 quiz variants (render baseline held —
the rest look did not move); (7) the snap spec assertion was vacuous (snap fires the TARGET
state's own call) — it now proves the data half on `locked`, where the suppressed
intermediate selection can only repaint through the riding update; (8) a quiz-runtime
mapping row added to `e2e-affected.mjs`.
**Verification:** `e2e/production-controls.spec.ts` (3 specs), control.spec 16/16,
graphic-types + catalog-baseline green after the doctrine updates, sprint-focus affected
suite green post-fixes (first run had 2 failures the review round caught — initially
misread as green; corrected here), catalog tripwire 22 green, quiz l3-sweep 12/12, build
green. **Visual pack delivered 2026-08-05** (12 frames + reproducible steps; offline mode —
the local PROGRAM monitor is the same renderer as `/output`; live published `/output` proof
lands in the Phase 3 pack).
**Known cosmetic notes:** the quiz entrance state chip reads "Enter" (step name — Phase 3's
beat renaming makes it "Question"); after "Back to start" the layer stays ON AIR over an
empty program (correct visual-reset semantics; hint line if the owner wants one).

### Phase 2 — Shared data foundation. Status: Implemented (awaiting owner Verified)
**Goal:** a production owns editable structured data, and an operator can load a row into a
cue deliberately.
**Implemented (2026-08-05):** `ShowDataset` on the Show record (additive-optional `datasets`;
columns carry stable keys + operator-facing labels; kinds quiz/teams/roster/generic pick
starter columns only), the full mutator set through `patchShow`, and
`datasetValuesForFields` — THE binding: column LABELS match field TITLES (trimmed,
case-insensitive), deterministic and visible on both sides, no mapping UI. The Data workspace
(`ProductionDataWorkspace`, route `#/production/<id>/data` via the router's new `sub`
segment — unknown third segments degrade to Playout) edits tables inline: rename table/
columns, add/remove rows + columns, two-step table delete. The Playout cue editor gains
"Load data row" — rows from any table with ≥1 matching column, labelled by their first
non-empty cell; loading fills the edited cue's DRAFT (data prepares, Take airs). Header tabs
Playout | Data on the production shell.
**Out:** CSV/JSON import (Phase 7), any auto-updating binding, teams/roster load ergonomics
(Phase 4 — one row carries one team; a two-team scorebug needs an A/B load gesture).
**Verification:** `e2e/production-data.spec.ts` (2 specs: the quiz-bank walk — author on Data,
load into cue, preview updates, air only on Take, reload + deep-link persistence, row/table
deletion; and the binding-by-words walk — generic table matches nothing until a column is
renamed to a field title). Mapped in both runner lists. Focus suite 364/0 + tripwire 22/22
with exit codes read directly. **Visual pack delivered 2026-08-05** (3 frames + steps).
**Two defects the phase's own verification caught and fixed:** the quiz paint signature,
stamped by a PARTIAL painter during a snap, made the post-snap repaint a no-op and left the
stale verdict on air (partial painters no longer stamp; the spec's snap case now proves the
data half on `locked`); and the preview came back UNSCALED after a Data-tab round trip — the
scale measurement was keyed on the unchanged document, so the remounted frame was never
measured (DOM assertions passed while the picture showed an empty corner; caught by the
visual capture, fixed by measuring on node attach, pinned by a scale assertion).

### Phase 3 — Quiz pilot. Status: Implemented (awaiting owner Verified)
**Goal:** the controlled sequence runs deliberately from the production page — hidden pick,
lock, choice reveal, verdict, audience result, next question from the bank.
**Implemented (2026-08-05):** the `answerBoard` machine grew two states and stayed
history-independent: `sealed` ("Locked, choice hidden" — `lock` fires straight from the
Question state over a pick typed as DATA, nothing paints) with `revealChoice` → `locked`
(whose entry now paints selection AND lock, correct from both routes); and `audience`
("Audience result") off the Reveal waypoint — a third hidden field (`Audience results`,
"34 | 52 | 9 | 5") painted as tabular per-row chips by the state, the percentages riding the
`audience` event as payload. Five control buttons in sequence order. The TV-style flow
(select paints immediately → lock → judge) is untouched; the SPX `next()` walk unchanged
(both new states are branches; `settings.steps` stays 2). The entrance step is named
**Question** (the chip cosmetic from Phase 1). ↷ Next on the load-row picker walks the
question bank row by row into the PREVIEW draft; Take airs it clean (a fresh entrance is the
reset, both halves). Live percentage edits refresh chips without re-popping the verdict
(the paint signature carries the results text; partial painters never stamp).
**Deliberately deferred, with reasons:** the answers-open beat — it moves the row entrances
into a new walk step, which cascades into four catalog gates including a `field-coverage`
mechanism change (rows hidden at rest read as unreachable), and the binding first-version
criteria require the lock/reveal discipline, not that beat. Recorded as a follow-up; the
concept's "Open answers" button stays wanted.
**Verification:** `e2e/quiz-pilot.spec.ts` (2 specs: the full hidden-pick sequence + bank
walk; the TV-style flow with the wrong-pick verdict) and **`e2e/configured/quiz-output.spec.ts`
— a PERMANENT live spec**: published production, the REAL `/output` renderer over the real
hosted log, the sealed sequence, a renderer reboot mid-lock recovering the sealed board
(data → snap → data on the wire), audience chips, full cleanup. All five catalog gates exit 0
(field-coverage passes without excuses — the results field drives its hidden holder); source
baseline re-recorded (12 quiz variants); render baseline re-recorded once for the deliberate
hidden-holder DOM growth (the diff listed only `#count` + the new holder per variant) and
verified stable. Machine-shape consumers updated: exported-panel greying example,
machine-graph arrow indices/names, the OGraf action list (now five, `audienceResults` riding
`audience`), the Millionaire spec already on two-operation reset. **Visual pack delivered
2026-08-05** (8 live frames, dashboard + output pairs). **Two real defects this phase's
verification caught and fixed:** the links popover sat UNDER the shared menu backdrop
(z 89 vs 40) — Copy URL / Publish changes / Unpublish were unclickable on every published
production; and the live spec's first Take assertions were vacuous (markup defaults + a
locally-fed chip) — replaced with a renderer-side computed-opacity poll.

### Phase 4 — Generic sports pilot. Status: Implemented (awaiting owner Verified)
Score steppers, clock verbs from the production page, period/status/lineup coverage; verify
score + clock through the log on `/output` AND on the exported controller (local relay).
`numerals.mjs` after the score-field kind change. No sport-specific rules, stats, brackets,
hardware, or external APIs.

**Landed so far (2026-08-06), four commits:**
- **The field-type gate first** (`76330d71`). A type declares its fields and each design emits
  them, and NOTHING compared the two beyond counting — the count matched, every `id="fN"`
  existed, and a score declared as a number could still ship as a text box. So the gate went in
  before the change it had to see: `e2e/graphic-types.spec.ts` + `scripts/factory.mjs` now
  compare the emitted ftype against `typeFieldsToSpx`. Titles are deliberately excluded (a
  design may relabel for its own vocabulary — mr04, rs04). Mutation-tested both ways.
  It also found `sports.spec.ts` mapped to NO runner list at all: 13 tests over the match
  clock, the colour lift and the period rebuild only ever ran in the nightly. Now mapped.
- **Scores are `number` fields** (`218a773f`) across sb01–sb20 — the two sports types and both
  field-contract builders, which is the dual declaration the gate above now holds together.
  The CLOCK deliberately stays text (`matchClockUpdate` parses on `':'`). Accepted cost, written
  down: no composite score ("3 (4)", "241/6"). esports (`es01–es04`) is deliberately EXCLUDED —
  different pack, and it is the one path where `lineCount` uses a textfield count as a proxy for
  an fN index range.
- **The stress that would have gone missing, restored in the same commit.** `runtimeBench`
  doubles text to widen it, which cannot widen a number ("0" → "0 0"), so the calibration
  tripwire silently stopped stressing scores the moment they stopped being textfields — a gate
  getting GREENER while covering less, and nothing else covers it (type-floor measures font
  size, overflow-sweep runs at design defaults, `numerals.mjs` substitutes digits without
  changing how many there are). Calibrated to three digits: four trips sb10's doubled club name,
  but no sport produces a four-digit score. `template-escaping.spec.ts` and the fixed-strip test
  had the identical hole and are fixed with it.
- **Three scoreboard recovery defects** (`41e9a003`), all found by driving the drill rather than
  reasoning about it, each red independently before its fix and re-checked by disabling it:
  (1) the club-colour and period holders hid INLINE, and the entrance reset clears inline props
  off every descendant — so recovery itself printed `#f6a623` and `Q1 | 24 | 19` on air. They
  hide in the stylesheet now (the rule `cornerBug/statusParts.ts` already wrote down).
  (2) `.scoreboard-final` / `-break` are CLASSES, which the visual reset never touches and a
  snap skips for a group already at its initial — a board recovered mid-match came back wearing
  FULL TIME while the machine said live. `update()` repaints them from the machine (the quiz's
  `paintQuizState` precedent), so a genuinely finished board keeps its treatment.
  (3) sb01–sb04 draw no clock but their type declared a clock group and Start/Stop buttons; the
  count-direction guard is skipped when there is no element, so one press left a 1 s interval
  running for the life of the graphic. Group and buttons dropped; `startMatchClock` now refuses
  outright without a clock element.
- **Production-page reachability**: image fields were passed no picture list on the cockpit at
  all, so a match board's two crest slots were settable from the hosted page and NOT from the
  production page — the divergence `docs/PLAYOUT_DASHBOARD.md` forbids. Fixed, deriving the list
  exactly as `hostedControl.ts` does (no upload: that write path belongs to the editor). The
  state chip had no width bound because the quiz has ONE group and a scorebug has four
  (~65 characters), so a sports cue stretched the actions header.

**Verification so far:** build green; `graphic-types` (ftype gate, mutation-tested);
`sports` incl. the new recovery drill; `control`, `wave2`, `template-escaping`,
`production-controls` (incl. a new match-board test covering clockReset, the interval pair, the
four-group chip and the crest pickers), `production-data`, `snap-recovery`; catalog tripwire
22/22; `type-floor`, `field-coverage`, `numerals`, `overflow-sweep --baseline` and the scoreboard
`l3-sweep` all exit 0. Source catalog baseline re-recorded twice (16 boards for the ftype, all 20
for the CSS/JS); **the render baseline never moved**, which is the proof the holder fix is
invisible on screen.

- **The A/B-side team load gesture.** One dataset row is one team, but a two-team board titles
  its fields "Team A" / "Score A" / "Team B" / … — so a teams row matched none of them and the
  preset bound NOTHING. The fix is a side token dropped off the FIELD TITLE at the ProductionPage
  call site ("Team A colour" → "Team colour"), over an UNCHANGED `datasetValuesForFields`: that
  function already takes `{key,label}` pairs, so no model change, no persisted-format change and
  no migration. The other side's fields are excluded from the match entirely, so loading team A
  can never overwrite team B. The plain literal match still runs first (a column named exactly
  "Team A" keeps binding) and a graphic with no sides never grows the picker, which is what keeps
  the quiz binding untouched. The `teams` preset is reshaped to `Team · Score · Team colour ·
  Team logo` — every column now binds a real field; `Code` was dropped because a starter column
  that matches nothing teaches the wrong thing. Read only at creation, so existing tables keep
  their columns. `lastLoaded` is already per-cue, so ↷ Next walks the table with no new state.

- **Both end-to-end arms.** `e2e/local-relay.spec.ts` gains the OFFLINE half: a scorebug aired
  from the exported controller, a goal added with the stepper that STAGES and does not air (the
  prepared-vs-published rule holding on the third renderer too), and the clock verbs proven by
  two reads separated by real seconds — Start makes the number move, Stop leaves it identical,
  Reset returns it to the period start, and the score survives all three because a clock verb is
  a state change and a score is data. `e2e/configured/scorebug-output.spec.ts` is the LIVE half,
  a permanent spec like the quiz one: published production, the real `/output` renderer over the
  real hosted log, a score bump arriving, a renderer reboot at full time recovering the aired
  score with the colour holders still hidden, and a clock proven running on the renderer itself
  (the state chip cannot prove it — it is fed by the local monitor and would read "Clock running"
  over a dead wire). Ten live frames land in `test-results/signed-in/`.

**Visual pack delivered 2026-08-06** (12 frames + `PACK.md` with reproducible steps, in
`shots/phase4/`; frames 7-12 are the real published `/output` renderer). The recovery frame is the
one that matters: the board reloaded at full time comes back with its aired score and NO club
colour hex or period source on screen — that leak was live on every board before this branch.
One frame is deliberately absent and said so in the pack: the exported controller over the local
relay has no screenshot, because the capture stub served the package files but not the relay log
endpoint. Its BEHAVIOUR is proven by `e2e/local-relay.spec.ts` plus the conformance run.

**Deliberately NOT done, with reasons:** esports scores stay textfields (different pack, and the
one path where `lineCount` uses a textfield count as a proxy for an fN index range — fold it in
after that proxy is fixed); no sport-specific rules, stats, brackets, hardware or external feeds,
per the phase's own scope line.

**The follow-up this phase's new gate exposed — now CLOSED (2026-08-06).** `ftypeFor` mapped
`role: 'hidden'` straight to SPX ftype `hidden`, conflating two different things: the role means
"input-only, in a display:none holder" (the operator still TYPES a countdown's minutes), while
the ftype takes a field away from every operator surface. The ftype now comes from the field's
`kind` for every role, the conformance spec's skip is gone (removing it was the regression test),
and the two durations that were declared as numbers all along became numbers in practice — so the
countdown and holding-screen durations get +/− steppers on all four control surfaces, the same
argument that made the scores numbers. Landed with the rest of the field-declaration work: the
esports series score became a number, `visibleTextFields` replaced the `ftype === 'textfield'`
proxy the phase named as blocking esports, every hidden data holder in the catalog moved onto the
`.noacg-data-source` rule (the scoreboards included — the boards' own copy of that rule is gone),
and `e2e/catalog-baseline.spec.ts` gained the gate that fails on any inline-hidden holder.

**Live-arm behaviour to encode as correct rather than fight:** a reboot REWINDS the clock to the
last operator-typed value (the renderer reports what it forwarded, never what the clock ticked
to), and `clockReset` returns to the design's baked `data-start`, not the cue's clock value;
asserting otherwise in either case would encode a bug.

**One of those three was NOT a trap, and is now fixed (2026-08-06).** "Every Take/Update/Snap
re-seeds the running clock, so a score bump on air pulls the clock back" was filed here as
something to work around. It is an on-air fault on the primary sports surface — an operator adds
a goal in the 64th minute and the clock jumps back to whatever they last typed — and the phase
that exists to make that surface dependable is the wrong place to accept it. The runtime now
re-seeds only on a value the WIRE actually changed (`shared/matchClock.ts`); the element's own
text could never make that distinction, because it holds the ticked time and so differs from a
resend every second. Two write paths had to be closed, not one: the re-seed itself, and
`setFieldValue` painting the stale text into the clock element before `matchClockUpdate` ever
runs. Reproduced first, pinned by `e2e/sports.spec.ts` ("a score bump on air does not pull the
running clock back"), with the existing correction test proving the guard did not break the
thing it guards. The honest limit is written down in the runtime: re-sending an identical value
is a no-op, so returning to a known time belongs to `clockReset`.

### Phase 5 — Audience questions/comments. Status: Implemented (awaiting owner Verified)

**Built 2026-08-07 in two halves, both landed the same day: first the seam and the moderation
surface on the local provider, then the backend and the public page** (the status blocks under
"Audience backend design" below are the record of the second half).

- `src/audience/audienceTypes.ts` — THE one `AudienceBackend` interface, plus the caps
  (`AUDIENCE_LIMITS`, question body 500 per the owner's ratified number) and `broadcastValues`,
  the single answer to "what goes on air for this submission". **The interface has no method
  that reaches the command log**, which is how "nothing viewer-written airs without an operator"
  became structural rather than remembered: a provider is given nowhere to write.
- `src/audience/localAudience.ts` — the in-memory provider with a submission/vote simulator,
  enforcing the same caps, the same per-device rate limit, the same generic refusals and the
  same immutability of the original as a server trigger would, so it is a faithful stand-in
  rather than a more permissive one. `localAudienceFor(showId)` is a module-level registry, NOT
  component state: the workspace unmounts on every trip to Playout, and an inbox that emptied
  itself on a tab switch would be the PROGRAM monitor's round-trip defect wearing new clothes.
  Nothing is persisted, deliberately — a rehearsal's material is other people's words in shape,
  and a practice run has no business outliving the tab.
- The **Audience workspace** (`#/production/<id>/audience`, the third tab): inbox with
  inbox/approved/shortlist/all counts, the immutable original one click behind an editable
  broadcast version, anonymise, approve/reject, shortlist, mark-used, and **send-to-rundown,
  which creates an ordinary `ShowCue` and stops**. Field matching is by TITLE, the same
  by-the-words binding a dataset row uses — no per-template special case.
- Entitlement key **`audience`** — a new key, never a widening of `showchat`; in `FEATURE_KEYS`,
  `FEATURE_LABELS` and both built-in plans, and deliberately NOT in `ENFORCED_FEATURE_KEYS`,
  because nothing enforces it yet and that set's own contract says a key joins it in the same
  change as its call site.

**The second half is now BUILT and on `main`:** migration `0035_audience_participation.sql`
(plus `0036_audience_open_round_fix.sql`, forced by a runtime failure the live test caught),
the Supabase provider (`src/audience/audienceData.ts`), the public `/join` entry (`join.html`
→ `src/join/main.ts`) with the shared `joinSurface.ts` renderer, the presenter slug and its
read-only styled view, and `Show.joinSlug`/`presenterSlug` written by `publishControlShow`'s
read-back. Applied to the live Supabase project 2026-08-07 and tested against it with the anon
key — the detail lives in the status blocks under "Audience backend design" below. The
workspace did not change when the backend landed, which was the point of building the seam
first.

**Owner decisions taken as ASSUMPTIONS for the work above** (the plan's six open questions,
answered by the overnight brief and open to being overturned): standalone showchat kept
untouched; change-your-vote rather than first-vote-sticks (the `(round, device)` key IS the
dedupe, so an upsert while open is exactly that); presenter schema now, page later; the join
page NEVER shows tallies; **no per-IP abuse caps in v1** — device tokens, the trigger caps and
operator approval are the whole defence, which is a posture to ratify before a public join URL
is real; question length 500.

**Carried items, mostly closed since:** the `/join/<name>` path-form rewrite is DONE
(`vercel.json` rewrite; the 404 the owner's first pass hit was fixed on `main`); the
vanity-slug squatting window was closed by `0040_production_url_identity.sql` (a production
keeps its URLs across unpublish/republish); the stale `src/community/showchat/` path is gone
from root `AGENTS.md` and docs/PLAYOUT_DASHBOARD.md §8 (showchat lives at `src/showchat/`).
Still open: `presenterBySlug` has no e2e coverage.

### Phase 5 — original scope (design below)
Migration 0035 + `/join` page (ask/comment modes) + the Audience workspace (inbox, immutable
original vs editable broadcast version, anonymize, approve/reject, shortlist, mark
used/answered, send-to-rundown creating a normal `ShowCue`) + presenter view + rehearsal
(simulated submissions through the offline seam). Nothing viewer-written reaches Preview or
Program without explicit approval — enforced by construction (no audience write path into the
command log). Carried items to resolve at phase start: the open owner decisions below; the
`/join/<name>` path-form rewrite (vercel rewrite + dev middleware — `cleanUrls` alone serves
only `?p=`); vanity-slug lifecycle (unpublish deletes the `control_shows` row, freeing a
hand-picked name to squatting until republish); fix `docs/PLAYOUT_DASHBOARD.md` §8's and root
`AGENTS.md`'s stale `src/community/showchat/` path (showchat lives at `src/showchat/`).

### Phase 6 — Poll + audience quiz answers. Status: Implemented (awaiting owner Verified)
Scope: join-page poll/quiz modes, vote intake + tally, the operator poll module (open/close/
reveal/reset per D5), the audience-result feed into the quiz pilot. Results are never revealed
merely because responses arrived.

**Built 2026-08-07, alongside Phase 5's backend.** The join page renders a round in `poll` and
`quiz` mode; `audience_vote` upserts on the `(round, device)` PK (change-your-vote); the round
controls live in `ProductionAudienceWorkspace` — compose a poll or a quiz (with its correct
option), open it, watch the ~2 s tally, stage the counts onto a vote board's `Label | count`
fields matched BY TITLE (`pollFieldMap`), close to finalise before the reveal. The exit is an
ordinary cue per D5 — the renderer never learns votes exist — and a quiz round stages through
the same path; the quiz pilot's own audience-result chips still take their percentages as the
`audience` event's payload, typed by the operator or staged from a tally. `simulateVotes` on
the local provider lets the offline suite drive a vote all the way onto a cue
(`e2e/production-audience.spec.ts`). Detail: the "PHASE 6's vote half is BUILT" and presenter
blocks under "Audience backend design" below. The 2026-08-08 hands-on pass drove vote-to-air
(the aired board showed 50/25/25 from staged counts) — driven and fixed where broken, but not
owner-accepted.

### Phase 7 — CSV/JSON import. Status: Implemented (awaiting owner Verified)
**Implemented (2026-08-07).** `src/model/csv.ts` is the shared reader — no new dependency, RFC
4180 with the tolerances real exports need: quoted commas, quoted NEWLINES, doubled quotes,
CRLF or LF, a missing trailing newline, a UTF-8 BOM, and separator DETECTION (a European
spreadsheet writes semicolons, and a user who exported one is not going to be told their file
is malformed). JSON reads two real-world shapes — an array of objects (the union of keys, in
first-seen order) and an array of arrays — and REFUSES anything else with a reason instead of
coercing it. `importShowDataset` (model/shows.ts) lands the result as an ordinary editable
dataset with **no link back to the file**: a live file dependency would leave a production's
data somewhere the production does not travel.

**The import reports what BOUND, not what arrived.** A table whose columns match no field title
on any of this production's graphics imports perfectly and then does nothing, so the note names
the matching columns — or says plainly that none match and no cue can load a row yet. That is
the same by-the-words binding as everything else here (D3); nothing about it is new mechanism.

**Verification:** `scripts/csv.test.mjs` (15 cases, in the BUILD GATE — the parser is pure text
in, table out, and the cases that matter are the ones a `split(',')` gets silently wrong) plus
three `e2e/production-data.spec.ts` walks: a quiz bank CSV imported, loaded into a cue and
AIRED, with a quoted comma in the question so a split regression cannot pass; a semicolon file
whose columns bind nothing saying so; and a JSON file that is not a table being refused.

## Acceptance round 2 — the owner's hands-on pass against real CasparCG (2026-08-06)

The first time Phases 1–4 met real hardware and a real operator. What it found, and what was
done about it that night. **The passes are recorded too, because they are the parts nothing
needs to re-check:** the match-clock fix holds (a score bump no longer disturbs a running
clock), the state chip and button greying held with no drift over 30 s, "Reveal choice" was
correctly greyed on a template that does not support it, and recovery leaked no machinery onto
the CasparCG output — no colour hex, no period source line.

**P0 — "add to production" opened the canvas instead.** Every door that saves swallowed the
storage layer's error, so a full localStorage quota looked like the product ignoring the click.
Fixed by announcing a failed write from an app-level dialog (the wizard has already closed
itself by then), by measuring and naming what is taking up the room, and by guarding two
unguarded `localStorage.setItem` calls that were taking the whole React tree down under a full
quota. `e2e/storage-full.spec.ts` drives all three doors against a genuinely exhausted quota.

**P0 — two catalogue designs rendered wrong on CasparCG.** An older CEF drops a modern CSS
declaration in silence. The deliverable is the WARNING, and it is measured, not listed:
`src/validation/engineSupport.ts` scans a template's emitted code and reports per playout
engine; every export screen shows the verdict above the download button;
`scripts/engine-floor.mjs` sweeps the catalogue. Arena Quiz and Sunny Pop are fixed by hand,
and one shared fallback (the auto-fit cap's `min()`) lifts the whole catalogue over the
Chromium 79 bar. **Measured at the Chromium 88 bar: 422 of 430 designs affected before, 179
after — and every one of those 179 is `color-mix()`.** That remainder is deliberately NOT fixed
here: a fallback needs a resolved colour per use across 91 source files, which is its own pass
with the sweep as its gate. The engine table names CasparCG 2.3's early and late builds
separately, because this repo holds two observations from 2.3.x servers that cannot describe
one engine — and `/output?debug=1` now prints the engine it is actually rendering with, so the
question is answerable rather than argued.

**P1 — the PROGRAM monitor lost the graphic after a Data-tab round trip.** The workspace switch
unmounts the monitors and the replay of what is live was a one-shot on the page's own boot. Now
keyed on the STAGE being fresh; the page also remembers what it last SENT, since the wire report
is a resolve-time snapshot and an unpublished production has none.

**P1 — the quiz's correct answer could not be corrected while the audience result was up.** The
audience state repainted its verdict only when one was MISSING. Reproduced first; the reveal
state was already correct, so this is the case that was actually broken.

**P1 — nothing said an edit had not been sent.** The on-air cue's fate line now counts the
waiting changes and ✎ Update wears an amber dot, compared against what was last SENT.
**Staged-vs-take is unchanged: data still never airs by itself.**

**P1 — SPACE is a toggle** (on air / off air). `0` still means Out. Recorded in
docs/PLAYOUT_DASHBOARD.md §2. **Corrected 2026-08-07** after a production: the toggle was the
key only, while the button beside it re-took, so the same surface had two behaviours and the
button's label ("RE-TAKE") described neither the press nor what a hand on SPACE was about to
do. The BUTTON is now the toggle too, re-take moved to its own secondary button and key (`R`),
and `↑`/`↓` walk the rundown so the surface runs from the keyboard alone.

**P1 — the ⚡ actions and "Snap to state…" explain themselves on the surface** (§7b of the same
doc), including what the quiz's audience percentages are and why a snap re-sends the cue's
values.

**NOT REPRODUCED, carried forward: "I broke the link to CasparCG somehow — it showed an error
that the URL doesn't work or has changed."** No repro, no diagnosis, no fix attempted; guessing
at a fix for an unobserved fault is how a real one gets papered over. What is known: the output
URL is a capability slug on `control_shows`, and UNPUBLISHING deletes that row, which does kill
a live renderer's URL by design (docs/PLAYOUT_INTEGRATION.md §7 already says so). A republish
mints a NEW slug, so any URL loaded into CasparCG before it stops working — that is the one
mechanism in the product that matches the description, and it is worth confirming against the
owner's session before treating it as a defect. Anyone touching publish/unpublish should look
for a second way the slug can change under a live renderer.

## Acceptance pass — the contextual controls, the Data and Audience workspaces (2026-08-08)

The second half of the visual acceptance GOALS.md names as the release's largest unmeasured
risk: the production page's ⚡ GRAPHIC ACTIONS, the Data workspace and the vote-to-air walk,
driven as an operator drives them (a production carrying a quiz, a match board and a vote board)
rather than as a spec drives them.

> **READ BY THE OWNER 2026-08-21 AND ACCEPTED.** *"I think these screens look good."* The
> ⚡ contextual controls, the Data workspace, the vote-to-air walk, the presenter pointers and the
> audience join page all pass their first human look — the acceptance this plan has been carrying
> a caveat about since Phase 0. **Four things came out of the read**, none of them a rejection of
> what is built:
>
> 1. **The spreadsheet question is already answered and the owner did not know it.** *"you should
>    always be able to download a template so you don't have to create the fields yourself."*
>    `ProductionDataWorkspace` ships `⬆ Import CSV / JSON` beside `⬇ Blank CSV` as one cluster,
>    and the empty state names the column titles that would bind on this production. Nothing to
>    build; the finding is that a shipped door was invisible in a screenshot, which is a
>    discoverability note, not a feature request.
> 2. **TEAMS — the largest new ask, and it is a class requirement, not a nicety.** *"you should be
>    able to create a team so that a team can edit these together. For instance, someone can edit
>    the spreadsheet, someone can steer the queue, someone can attach an API… if we have many
>    students working on one project, it's never just one person doing this all."* The capability
>    model today is per-URL and per-device (control / output / join / presenter slugs), which
>    already splits WHAT a person may do; what it has no concept of is WHO, so two students cannot
>    hold the same production under their own accounts. This is a backend and entitlements change
>    (`src/backend/`, `src/entitlements/`, a migration), not a dashboard one. Not scoped here.
> 3. **Playout / Data / Audience should not be a swap.** *"the buttons that we have and the side
>    pages we have feel a bit dangerous to swap between. I think the play out should always be
>    open, so the data and audience could open in new tabs by default."* Cheap to honour: all
>    three are already REAL ROUTES with history (`#/production/<id>/data`, `/audience`), so the
>    tab controls can become anchors that open a second browser tab while Playout stays put. The
>    danger being named is real — Data and Audience are authoring surfaces, and authoring while
>    the thing you are steering is off-screen is how a live mistake happens.
>
>    **NOT cheap, and BLOCKED — attempted 2026-08-21 and reverted.** Two browser tabs on one
>    production LOSE EACH OTHER'S WORK today, and making the workspaces open in their own tab
>    would turn that from something a user has to go out of their way to do into the default
>    path. `patchShow` (`src/model/shows.ts`) is a whole-array read-modify-write:
>    `loadAllShows()` → mutate → `saveAll(all)`. It reads the SYNCHRONOUS MIRROR in
>    `model/durableStore.ts`, which is per-tab and has no cross-tab invalidation — no
>    `BroadcastChannel`, no `storage` listener. So a tab that has not seen another tab's write
>    still holds the old array, and its next write puts that array back.
>
>    Reproduced, not reasoned: open a production in tab A, open `#/production/<id>/data` in tab
>    B, add a table there, then make any cue edit in tab A. A THIRD, fresh tab then reports
>    `datasets: 0` with tab A's edit intact — the table is gone from the durable store, not
>    merely absent from tab A's view. (Reading it in tab A proves nothing: its mirror never saw
>    the table. That is what the first attempt at this probe got wrong.)
>
>    **The fix is cross-tab safety, and it comes first:** invalidate the mirror when another tab
>    writes (a `BroadcastChannel` message from `durableStore.setItem`, other tabs dropping the
>    affected key), or move off whole-array writes to per-record ones. Until then the workspaces
>    stay in-tab. This is ALSO a live defect on its own — anyone with two tabs on one production
>    is exposed right now, without any of this — and it is the same hazard class as
>    [teams](#) above: the moment two people hold one production, whole-record writes lose.
> 4. **The offline audience page needs a better answer than a sentence.** *"I don't really know
>    how the audience participation screen should look if the build is run offline."* Options are
>    in "The offline audience plane" below.
>
> The pack that carried this read, rebuilt 2026-08-21 on the merged tree:
> **`docs/acceptance/owner-pack/index.html` §3** (rebuild with `node scripts/acceptance-pack.mjs`).
> Fourteen frames of the real running app, one question each: the ⚡ actions off air, live, and a
> beat later; the Data workspace empty, filled, and a row loaded into a cue; a vote opened,
> counted, staged and aired; the presenter Now/Next pointers; and the audience join page in two
> modes, rendered by `joinSurface.ts` itself. What it deliberately CANNOT show, and says so on the
> frame rather than in a note somebody has to remember: the public `/join` page against a real
> backend, the presenter's own tablet page (`presenterBySlug` is server work), and the Links
> panel's four capability URLs — all three need a publish, and this checkout is offline by
> design. **That hosted walk stays owed on its own**, and it is the one part of this plane the
> 2026-08-21 read could not cover.
>
> **One divergence is visible in the pack and is recorded as an observation, not a verdict:**
> with nothing on air the EXPORTED controller offers all five ⚡ actions and shows no state chip,
> where the in-app production page at the same moment greys all five and says "not on air"
> (frames `controller-1536x814.png` and `interactive-actions-offair.png`); the HOSTED page shows
> the same shape from the other side — the ⚡ block offered for a cue whose layer is not the one
> up (`scroll-hosted-1536x814.png`). `docs/PLAYOUT_DASHBOARD.md` §7b says the ⚡ buttons fire beats
> "on the layer that is on air", and §7c states the greying rule explicitly for the ± pair beside
> them ("a control that acts on air has nothing to act on until the cue is taken") — but §7b's own
> parity sentence covers the two REACT surfaces, and the exported controller is a third
> implementation.
>
> **DELIBERATELY LEFT OPEN by the owner, 2026-08-21.** Asked to choose between greying them
> everywhere and offering them everywhere, the answer was to leave it and decide later. So this
> is a KNOWN, ACCEPTED divergence and not a bug anyone should quietly fix: do not "harmonise" the
> three surfaces on a hunch, because the decision that would justify it has not been made. Bring
> it back with the dashboard re-lay, when all three surfaces are open anyway.

### The offline audience plane — what `/join` should say when there is no backend

Owner question, 2026-08-21: *"I don't really know how the audience participation screen should
look if the build is run offline."* Today it says one sentence — *"Audience participation needs
the cloud backend. This build runs offline."* — and stops.

**Start from who actually reaches that page, because it is nearly nobody.** An offline build mints
no slug, so no link exists to hand out and no phone in a hall can arrive there. The only visitor
is someone on the self-hosted build who typed `/join` themselves, or a teacher demonstrating the
studio without an account. That reality caps how much this deserves; it does not make the dead end
acceptable.

Three answers, cheapest first. They compose — 1 is worth doing whatever else happens.

1. **Make the dead end a door.** Keep the honest sentence, add what to DO about it: this build has
   no backend configured, audience participation needs one, here is the page that explains
   self-hosting or signing in. One paragraph and a link. The rule it must not break is the one
   `nothing()` exists for: a viewer holding a guessed slug must not learn whether a production
   exists, so the offline message stays identical for every slug, valid or not.
2. **A REHEARSAL room on the same device.** The operator's Audience workspace already runs the
   whole plane offline on `localAudience` — that is what makes the walk in the pack drivable. The
   join page could mount the same provider so a teacher on one laptop can open `/join` in a second
   tab, send a question, and watch it arrive in the inbox. It must be unmistakably labelled as a
   rehearsal (the workspace's own `Simulate` button sets the precedent, and its rows read
   "(rehearsal)"), and it must never suggest other devices can join, because they cannot: the
   provider is in memory in ONE tab.
3. **Nothing, deliberately.** Defensible if teams (above) arrive first and the answer becomes
   "sign in" for every offline user anyway.

**Recommendation: 1 now, 2 only if a teacher actually asks to demo the plane without an account.**
2 is a second surface that can drift from the real one, and the pack already shows the join page
faithfully through the operator preview — which is a teaching artifact that costs nothing to keep
true.

**P0 — the first Take of a session aired the graphic and put it straight back off.** The boot
recovery was keyed on `liveCue` MOVING, and `liveCue` also moves when this operator takes a cue -
so the operator's own first Take was mistaken for a page opening onto a live production. It
replayed `snap` to the machine state last reported, which the local PROGRAM monitor reports once
a second and which was therefore "off", the reply to the play in flight not having landed. The
result: black PROGRAM monitor, the state chip reading Off, every ⚡ action greyed, the rundown
row still marked ON AIR, and nothing said. **Offline it was every take**, since with no wire
`liveCue` can only ever move locally - and offline is the door the class may run on.

It is now keyed on the wire's own answer (`bootLive`, written only by the resolve). Why the whole
suite was green over it: every spec took a cue and asserted immediately, inside the ~1 s window
before the first state poll. Pinned by a spec that WAITS first
(`e2e/production-controls.spec.ts`, "a Take pressed a moment after the page opens"). The published
path was hit by the same defect whenever a page opened with nothing live.

**Two control defects on the same surface, both in the shared `FieldControl`, so both were on
every operator surface at once:** a number field's operator STEP-SIZE box was styled exactly like
the value box and sat right beside it, so a match board's score read `− 1 + 1` - two identical
number boxes, one of which changes nothing on air (captioned now, and the value box no longer
shrinks to one visible digit); and a picture field's hint sat BESIDE the picker as a flex sibling,
squeezing a crest slot with no pictures yet down to a bare 20px chevron (the hint moved under it).
The exported control panel carries the same caption, per the one-control doctrine.

**Looked at and correct:** structural greying through the whole quiz sequence and the four-group
match-board chip; the clock running on air while a score bump is applied; multi-layer PROGRAM
(quiz over match board over vote board); the audience inbox, presenter Now/Next pointers, the live
tally (bars measured proportional), staging a vote to a cue and airing it - the aired board shows
50/25/25 from `Label | count`. **Recorded then FIXED 2026-08-12:** the Data workspace's empty
state was a header and one sentence over ~830px of nothing (measured again before the fix: 946px
below a 17px sentence at 1080p), and its "⬇ Blank CSV" button wrapped onto its own row away from
the sibling buttons it belongs to - because the three controls were loose children of the header
beside a `<div class="spacer" />`, and there is no global `.spacer { flex: 1 }` to push anything
(`src/components/AGENTS.md` says so about every dialog header). They are now ONE `.pd-data-actions`
cluster that holds together and wraps together, `margin-left: auto` doing the pushing, and it
renders in exactly one place at a time: in the header once tables exist, and INSIDE the empty state
before that, where the actions are the whole answer. The empty state also names the column names
that would bind on this production - its own graphics' field titles, the same words an imported
header is matched against - so the surface's one hard question is answered where it is asked.
Pinned by e2e/production-data.spec.ts ("the empty workspace carries the doors…"), whose layout half
is asserted as GEOMETRY, since `toBeVisible` is blind to a button that wrapped.

## Audience backend design (for Phases 5–6; designed 2026-08-05, BUILT 2026-08-07)

> **STATUS 2026-08-07 — built to this design, not a second one.** Migration
> `0035_audience_participation.sql`, the Supabase provider (`src/audience/audienceData.ts`), the
> public page (`join.html` → `src/join/main.ts`) and the shared renderer
> (`src/audience/joinSurface.ts`) are on the branch; `Show.joinSlug`/`presenterSlug` are written
> by `publishControlShow`'s read-back and stripped from sync conflict copies; `audience` joined
> `ENFORCED_FEATURE_KEYS` in the same change as its enforcing call site. Zero Vercel functions
> were added (api/ stayed at ten entries).
>
> **APPLIED to production 2026-08-07** (`supabase db push`, the CLI route, ledger verified before
> and after; advisors re-recorded — 25 new findings, all in already-accepted classes) and then
> TESTED against it with the anon key on a throwaway production. That test is the only reason
> `0036_audience_open_round_fix.sql` exists: opening a round failed at RUNTIME on an ambiguous
> `closed_at`, with every structural check green. What the live run proves — the join resolve
> returns the production name, the state, the brand and only THIS device's own submissions, with
> no show id, no other slug, no answer key and no tally; a join slug is refused as an operator
> capability and a presenter slug is refused as a join slug; the three tables answer an anon
> SELECT with nothing; the per-device cap bites on the fourth message inside thirty seconds;
> `audience_update` refuses `body` and accepts `broadcast_body`; and a second vote from one device
> REPLACES the first (tally `[0,1,0]`, total 1) while an out-of-range option is refused.
>
> **Resolved by the owner while building:** no per-IP caps in v1 — the defence is the device
> token, the trigger caps and operator approval, and no IP is stored or hashed, because a
> classroom NATs a whole room behind one address. Change-your-vote, the 500-character question
> and the presenter-slug-now design were taken as recommended.
>
> **PHASE 6's vote half is BUILT (2026-08-07)** — the round controls are in
> `ProductionAudienceWorkspace`: compose a poll or quiz, open it (the MODE travels with the
> round, and returns to what the room was asked for before it when the round closes), watch the
> tally poll at ~2 s while it is open, and stage the counts. Staging maps them onto the poll
> board's own `Label | count` idiom through `pollFieldMap`, matched BY TITLE like a dataset row
> and a moderated question — so the exit is an ordinary CUE and the renderer never learns votes
> exist. Re-staging updates that cue rather than adding a row per refresh, and CLOSING finalises
> it ("voting closed" plus the final counts), because closing is the moment before the reveal
> and staging needs an open round. A pool with no vote board is refused by name rather than
> having a question written into a presenter's name field. `simulateVotes` is the rehearsal
> counterpart of `simulate`, present only on the local provider, which is what lets the offline
> suite drive a vote all the way onto a cue (`e2e/production-audience.spec.ts`).
>
> **The PRESENTER POINTERS are BUILT (2026-08-07)** — `AudienceState.presenter` is now part of
> the interface, both providers carry it, and each inbox row has a 🎤 Now / ⇢ Next toggle.
> They are IDS, so what a presenter reads follows every later edit to the broadcast version; a
> copy would go stale in their hand. Both slots always travel together because 0035 replaces the
> whole `presenter` object on write, and the composing read is a REF, not the rendered value —
> two presses in one beat (queue Next, then move Now) otherwise blanked the slot a presenter was
> reading, the same hazard `GraphicControlPage`'s read-fresh `patch` exists for. The pointers
> reach no rundown and no command log: a producer queues three questions the show never gets to,
> and pointing at one must not put it in front of anyone. The join resolve hard-codes them empty
> — they are on the capability discipline's own list, so a server that one day sent them still
> could not reach a viewer.
>
> **The PRESENTER LINK and the VANITY NAME are BUILT (2026-08-07).** The production page's
> Links panel now carries all four capability URLs, each described by WHO IT IS FOR — the one
> mistake that matters is reading the wrong one out on air — and each appears only once a
> publish has minted its slug. Beside the audience link is the readable-name field:
> `claimJoinName` (control/hostedControl.ts) is an ordinary owner UPDATE under 0008's
> `control_shows_owner_all`, not an RPC and not a migration, because every rule that makes a
> name safe is already ON THE COLUMN in 0035 and that migration says in its own comment why a
> second copy in TypeScript would be wrong. It therefore validates nothing itself: it asks, and
> translates `23505` (taken) and `23514` (bad shape or a reserved word) into words. **There is
> deliberately no availability check** — the owner policy means a lookup could only see the
> caller's own rows, and a function that read everyone's would be an enumeration oracle over
> every production's public URL. Trying the claim IS the check.
>
> **Deliberately not built yet:** the presenter view beyond the read-only page the presenter
> slug already serves. The offline suite pins only what an offline build owns — the controls
> exist, an empty name is refused, the offline truth is reported, a verdict never outlives the
> name it was about — because both `presenterBySlug` and the claim itself are server work.
> That checklist is now a SPEC: **`e2e/configured/audience-live.spec.ts`** signs in against the
> real backend and walks publish → derived readable link → the link opening the join page → a
> hand-picked name winning over the derived one, then unpublishes. It skips without
> `E2E_EMAIL`/`E2E_PASSWORD`. `presenterBySlug` is still uncovered — the presenter view it
> serves is the part above that is unbuilt.

Audience participation is a sibling capability plane on the existing `control_shows` row.
Everything is browser → Supabase direct (zero Vercel functions), one migration
(`supabase/migrations/0035_audience_participation.sql` — re-verify the number at
implementation time; two branches minting the same number is a known trap), one new MPA entry.

- **Three tables, not one:** `audience_submissions` (moderated text; immutable original
  `author`/`body` + editable `broadcast_author`/`broadcast_body`; `anonymize`, `shortlisted`,
  `used_at`/`skipped_at`/`moderated_at`; status `new/approved/rejected`; `device_token`),
  `audience_rounds` (one opened poll or quiz question: `kind`, `question`, `options` jsonb
  ≤8, `correct_option` — never returned to the join page, `opened_at`/`closed_at`), and
  `audience_votes` (PK `(round_id, device_token)` — the PK IS the dedupe; upsert =
  change-your-vote while open). Votes and submissions share almost no columns, votes need the
  composite PK, and tallying needs its own index shape. Rounds are a table (not only jsonb)
  so `audience_vote` can validate round-exists/belongs/open server-side.
- **Guard triggers, 0003-style, defence in depth:** trim + hard truncate (author ≤40, body
  ≤500), per-show 20/10 s + per-device 3/30 s submission caps, profanity mask reusing the
  existing `chat_blocklist`; a vote guard bounding token length and per-show vote bursts.
  Trigger functions revoked from client roles.
- **`control_shows` grows the audience plane:** `join_slug` + `presenter_slug` (unique,
  URL-safe base64 defaults, backfilled per-row) + `audience_state` jsonb
  `{v, open, mode: waiting|question|comment|poll|quiz, round, presenter:{current,next},
  brand, rev}`. Mode/open/presenter change via `audience_set_join` (allowlisted keys);
  `round` changes only through `audience_open_round`/`audience_close_round` so the pointer
  and the table can never disagree. `brand` is written at publish from `Show.look` (owner
  RLS write inside `publishControlShow`).
- **Eleven slug-keyed SECURITY DEFINER RPCs, zero anon table policies:**
  `audience_join_by_slug`, `audience_submit`, `audience_vote` (join slug);
  `audience_list`, `audience_update` (allowlisted patch keys — author/body/kind are NOT in
  the allowlist, which is where immutability lives), `audience_set_join`,
  `audience_open_round`, `audience_close_round`, `audience_tally`, `audience_rounds_list`
  (control slug); `audience_presenter_by_slug` (presenter slug). Writes check
  `feature_denied_for(owner, 'audience')`; the join resolve folds a denial into
  `open = false`.
- **Join capability discipline** — `audience_join_by_slug` must never return: the show id
  (it is a log-reading capability under 0008's anon `using(true)` policy), any other slug,
  `panel`/`staged`/`live`/`output`, `correct_option`, tallies, presenter pointers, or any
  other submitter's anything. Errors stay generic.
- **Polling, no realtime.** Decisive: realtime `postgres_changes` filters rows by the
  SUBSCRIBER's RLS, and the anon hosted-operator page has (and must have) no SELECT policy
  on a moderation table — slug authorization cannot be expressed to realtime. Join page polls
  ~5 s with jitter + `visibilitychange` pause; operator inbox ~4 s; tally ~2 s while a round
  is open. A `{t:'audience'}` nudge row in `control_events` was considered and rejected for
  v1: every nudge counts against the shared 50-per-5-s burst budget and a submission storm
  could block the operator's own Take.
- **Tally = count-on-read** over the votes PK; no maintained counter column (hot-row
  conflicts, drift risk, no benefit at this scale).
- **Both operator surfaces use the control slug** (ProductionPage holds `hostedSlug`
  locally; the anon HostedControlPage gets moderation parity free). "Make cue"
  (submission → `addShowCue`) is cockpit-only; "stage tally to graphic" maps counts onto
  poll-template fields via ordinary `control_stage`/`control_send` — the renderer never
  learns votes exist.
- **`/join` = 5th MPA entry** (`join.html` → `src/join/main.ts`; the output.html pattern:
  vanilla TS, no React, code-split supabase client, noindex). `?pv=<presenter_slug>` on the
  same entry serves the presenter view. A shared framework-free `src/audience/joinSurface.ts`
  renderer is used by both the standalone page and the ProductionPage rehearsal preview, so
  preview and reality cannot drift.
- **Rehearsal/offline seam:** one `AudienceBackend` interface
  (`src/audience/audienceTypes.ts`), two providers — `audienceData.ts` (Supabase) and
  `localAudience.ts` (in-memory + a submission/vote simulator). Rehearse mode or an offline
  build uses the local provider, which makes the whole audience workflow drivable by the
  offline e2e suite.
- **Entitlement: new key `audience`** (not a widening of `showchat` — the 0022 kill-switch
  contract promises the admin page states exactly what a switch stops). One entry each in
  `FEATURE_KEYS`/`FEATURE_LABELS`/`ENFORCED_FEATURE_KEYS`/`FEATURE_ENFORCEMENT_NOTES`.
- **`Show` record:** additive-optional `joinSlug?`/`presenterSlug?` mirroring the existing
  slugs (stripped from conflict copies), written by `publishControlShow`'s read-back.
- **Vanity join names (owner decision):** `join_slug` defaults random at publish; the
  operator can claim a readable name (`noacg.app/join/friday-night-live`) — global
  uniqueness, reserved-word list, availability check, random fallback.

**Owner decisions, settled 2026-08-07:** change-your-vote (the votes PK is `(round, device)`
and a vote is an upsert); the question cap is 500; the join page never shows a tally, in v1 or
after — the reveal is a graphic, on air, at the operator's moment; NO per-IP caps, and no IP
stored or hashed at all (see the top of this section for the reasoning); the presenter slug and
its read-only page both ship, while everything that would DRIVE it is Phase 6. Still open:
retire-or-keep the standalone showchat surface, now that a production has its own audience
plane and its own `audience` kill switch.

## Backlog for the audience plane (owner-requested 2026-08-08, NOT built)

Both came out of the owner's first hands-on pass at the audience link. They are recorded here
rather than started, because the pass also found the link itself 404ing and the presenter view
rendering unstyled (both fixed since, on `main`), and the scope that was agreed was "a viewer opens the link on a phone and can
take part" - nothing per-show, nothing automatic.

- **Customising the audience page per show.** Today `joinSurface.ts` renders ONE layout for every
  production; a publish carries only the four brand values (`audienceBrandFor` - accent, text,
  panel, font family), and even those are partly a promise: the family NAME travels, but the join
  page declares no `@font-face`, so a production branded in a bundled face renders in the phone's
  default and nobody is told. So the first question is not "what should be customisable" but
  "which of the four values actually arrive". Beyond that: a logo or title card above the prompt,
  per-mode wording, a light theme for a daylit hall, and a QR/landing state for a link put on a
  slide. **The constraint that shapes all of it:** the join page is a capability URL, so anything
  customisable is something the RESOLVE has to return - and 0035's join resolve is deliberately
  the narrowest thing that works (no show id, no other slug, no answer key, no tally, no presenter
  pointers). Every new field is a new decision about what a stranger holding a guessed link may
  learn, not a styling question.
- **Automatic chat ingestion from YouTube, Twitch and other platforms into the audience plane -
  v1 BUILT (2026-08-17), server-side ingestion still future.** Pulling live chat in as
  submissions, so a production's inbox holds the room AND the stream. It is the connector
  doctrine (`docs/CLOUD_PLAYOUT.md` §7) pointed at the audience plane rather than at the Data
  Hub, and the structural rule survived it unchanged: a connector is a PRODUCER of submissions,
  and `AudienceBackend` still has no method that reaches the command log, so an ingested message
  goes on air the same way a phone's does - moderated, approved, taken.
  **What v1 is** (`src/audience/chatIntake.ts` + `twitchChat.ts` + `youtubeChat.ts`, the
  workspace's "Chat sources" strip, pinned by `e2e/production-chat-intake.spec.ts`):
  - **The pollers run in the OPERATOR'S BROWSER** - the `control/liveData.ts` precedent, a
    deliberate stopgap that keeps the zero-Vercel-function architecture. Ingestion lives and
    dies with the studio tab; the sources survive workspace tab trips (a per-production
    registry, the `localAudienceFor` pattern) but not a reload, and nothing is persisted -
    connecting a channel is a per-session act.
  - **Twitch is anonymous IRC-on-WebSocket** (a `justinfan` nick - no account, no OAuth, no
    quota). **YouTube is bring-your-key**: `liveChatMessages` costs ~5 units a poll, so at the
    5-second floor the free daily 10,000 covers roughly 2½ hours of continuous chat - stated
    in the UI, and pausing a YouTube source stops the spend. Per-platform OAuth remains the
    server-side shape's problem.
  - **Identity: a deterministic synthesized device token per chat AUTHOR** (`chat-tw-<login>`,
    `chat-yt-<channelId>`), so the existing 3-per-30-s device cap meters per chat user, not
    per connector. The platform travels as TEXT on the author line ("name · Twitch") - a
    submission has no platform column, deliberately: no migration for a stopgap.
  - **Volume: a local throttle + dedupe before any write**, sized at HALF the DB's per-show
    burst (10 per 10 s against the trigger's 20), so chat can never crowd the room's own
    phones out of the shared budget - and every refusal is counted on the source row, because
    a limiter that drops silently reads as a broken connector. The caps were measured, not
    changed: a human-moderated inbox cannot use more than ~60 lines a minute anyway.
  **What stays server-side-future:** always-on ingestion that survives the tab closing, OAuth
  the production owner grants, webhooks instead of polling, a real platform/author column on
  submissions, and remembered per-production source configuration.

## Sequencing and deliberate deferrals

- **What actually happened, and it is the opposite of what this bullet used to say.** The plan
  was written expecting Phase 1 to wait: GOALS "Student release" step 10's remaining half is the
  owner's hardware re-test of the ProductionPage, Phase 1 modifies exactly that surface, so the
  branch would land only after the verdict, keeping the acceptance target still. **Phases 1-4
  landed FIRST** (2026-08-05/06), before the re-test. Holding four finished phases behind one
  hardware session bought nothing the re-test itself does not give: the checklist's §1-§6 drive
  the export and playout DOORS, which none of these phases change. The consequence to carry
  forward is that the re-test is now also the first real-hardware sighting of the contextual
  controls, so it must be run against a production whose rundown includes a scorebug cue -
  recorded in GOALS step 10 so the next session cannot read the two docs and get opposite
  answers.
- Deferred by design (documented, not built): sport-specific controllers, external data
  providers (Liquipedia, YouTube/Twitch, X, Sheets, webhooks — the future-connector doctrine
  stays `docs/CLOUD_PLAYOUT.md` §7: connectors become producers into the one log, feeding the
  Data Hub, never controlling output directly), scoreboard hardware, game telemetry, multiple
  contestants, contestant answer devices, audience image/video uploads, automatic moderation,
  unmoderated chat overlays, and any visual state/node editor beyond the shipped MachineGraph.
