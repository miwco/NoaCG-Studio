# Session E - the live vote, and the round that overflows the board

Branch `claude/e-poll-live-update`, off `main` at `0463d42f`.

## What I SAW first, before touching anything

Both were reproduced at `origin/main` by driving the real walk in a browser (a throwaway spec on
top of `e2e/_svg-import.ts`, deleted once the real pins existed): drop
`illustrator-live-vote-band.svg`, into a production, Take, then type counts into the cue the way a
rehearsing operator does.

**(1) The percentages never run.** With the board in `voting`, the bars moved and
`#p-val-1` read `50%` under a class list of `st2 st10 imported-design-pstate` - present, correct,
and dark, because `imported-design-pon` only goes on at Show result. The board's fields were
`f0=Badge text, f1=Question, f2=Options, f3=Vote count, f4=Vote status`: **there was nowhere to ask
for anything else**, on the graphic or on the production surface.

**(2) The overflowing round is worse than the old handoff said.** Five options
(`1/1/1/1/9`, total 13) on the fixture's three drawn rows:

```
row 1: figure="7.7%"  winner=false
row 2: figure="7.7%"  winner=false
row 3: figure="7.7%"  winner=false
#p-opt-4 elements: 0
cue-overflow: null
```

So: three near-identical bars filling under a quarter of the board, every figure individually
TRUE, and **"Abolish the crest" with 69% of the vote nowhere on screen**. Pressing **Call the
winner** marked nothing - `pollLeader()` returned index 4 and the paint loop stops at 3 - and
nothing anywhere said why. On air it reads as a three-way dead heat on a landslide. The operator
was told nothing: the cue editor's overflow note was `null`.

## (1) The live-figures opt-in

A fifth wire field, **`Live figures`**, appended after `Vote status`. Vocabulary: `live`, empty
meaning "wait for Show result". A production ticks **"Update the percentages on air while
voting"** in the audience workspace; `Show.pollLiveFigures` holds it (additive optional, absent =
off), `tallyValues` writes the token on **every** stage so unticking takes the figures back off
air, and `pollApplyTally` shows them when `pollRevealed || pollLiveFigures()`. Writing the field
fires no transition - the board sits in `voting` throughout.

Two things worth carrying forward:

- **The two token fields resolve "not stated" in OPPOSITE directions, and that is the rule
  generalising rather than breaking.** `Vote status` unstated reads as *closed* (a board wrongly
  saying VOTE NOW invites votes nobody counts); `Live figures` unstated reads as *wait* (what
  every board did before the field existed). Written up as `docs/OGRAF_STATE_IN_FIELDS.md` §5b:
  **empty means the outcome you would defend to an operator who never touched this field.**
- **The checkbox is only offered where something can obey it.** A catalog vote board carries no
  such field, so `tallyValues` would write nothing and the control would promise an operator
  something that never happens. Gated on `pollFieldMap(...)?.live` over the production's pool.

## (2) The overflow: I chose REPORT, and why

The three honest options were refuse the round, air the drawn rows and mark the round truncated,
or collapse the remainder into a bucket row. **I chose to air what was drawn and report it.**

- **Refusing** loses a round mid-broadcast. The counts are real and the drawn rows are true; the
  answer to "this does not all fit" is not "then you get nothing".
- **Collapsing** relabels a row the designer drew - it puts our word ("Other") on their artwork,
  which is the one thing the whole import road refuses to do.
- **Reporting** keeps every figure true (each drawn row's share of the WHOLE vote, which is why
  the bars visibly fail to fill the board) and makes the shortfall an operator's decision.

Two mechanisms, and neither is new:

1. **The winner is never called on a row that was not drawn.** `lead >= POLL_OPTIONS` reads as no
   leader, and `pollCallWinner` returns. Silence beats a mark on the best of the rows that
   happened to fit.
2. **The operator is told through the channel that already exists** for a value the design cannot
   hold: the `Options` field is written into `svgFitOver`, so `noacgTextOverflow()` reports it and
   the cue editor, the hosted control page and the exported controller all show
   **"Options is too long for the design - shorten it"** - *before* the Take, because the preview
   monitor reports as soon as the values are staged. It is a report, not a latch: a round that
   fits again clears it and the winner is marked normally.

`OVERFLOW_FIELD_HINT` now covers both causes in one sentence, because to an operator they are one
fact: this value is bigger than the artwork drawn for it.

## What `/check` found, and it was a real one

`review: delegated` (findings came back, scope-checked against this branch), `simplify: inline`
(the skill returned fan-out instructions).

- **`behaviour.ts` `fieldCount` was still `4`.** That number reserves the behaviour's `fN` ids in
  the binder's `taken` set, which is what moves a designer's *colliding* layer id aside. With one
  artwork field the new field lands on `f5`, and `f5` was unreserved - so an Illustrator file
  carrying `id="f5"` would keep it, the hidden holder would be emitted with the same id, and
  `getElementById` would hand the runtime the designer's drawing: the token `live` PAINTS on air
  and `pollLiveFigures()` reads the designer's text back. **Fixed at altitude**: both modules now
  derive it (`pollBehaviourFields(0).length`), so it can never drift again. Session AG got away
  with it by hand; the next appended field would not have.
- The catalog-board gap above (LOW), fixed by gating the row.
- Simplify: one conversion (`asSpxItems`) written once instead of twice, and the new JSX
  re-indented under its guard. Nothing else needed changing.

## What is deliberately NOT built, and it is the one thing to ask the owner

**Ticking the box does not make the numbers move on air by themselves.** The operator still
stages and takes or updates the cue, exactly as before. Making an on-air board follow a running
tally with no operator press is a change to the rule that nothing from the audience reaches
Program without one (`src/audience/audienceTypes.ts`; the interface has no method that reaches the
command log), so it is the owner's call rather than a session's. It is asked in the owner-queue
item.

If he says yes, the mechanism is already there and does not need inventing: `ProductionPage`'s
bindings dispatch (`resolved` -> `diffResolved` -> `runVerb('update')`) is exactly "a value moved,
so send the change and nothing else", diffed because the log caps a production at 50 commands per
5 s. The poll would ride that rather than growing a second sender.

Also left: **no hosted walk** (offline is pinned end to end; the real `/output` renderer following
a command log is still the quiz pilot's §10 walk, unrepeated for the vote), and the **catalog**
vote board still cannot be closed or run live by data at all
(`docs/backlog/behaviour-state-as-fields.md` owns that, unchanged).

## A rule for whoever next edits `src/templates/importedDesign/AGENTS.md`

I did not touch that file - session AB condensed it today and its branch may still be landing.
The rule that belongs in it, when there is room:

> **A behaviour's `fieldCount` is DERIVED from the fields it emits, never typed.** It reserves the
> behaviour's `fN` ids against a designer's colliding layer id; a stale number is a silent on-air
> collision, not a lint error.

## Files

New: `docs/handoffs/2026-08-30-e-poll-live-update.md`,
`docs/acceptance/owner-queue/2026-08-30-e-live-percentages-and-a-round-that-does-not-fit.md`.
Changed: `src/templates/importedDesign/{pollBehaviour,behaviour}.ts`,
`src/components/home/ProductionAudienceWorkspace.tsx`, `src/model/shows.ts`,
`src/control/controlModel.ts`, `src/styles/playout-dashboard.css`,
`e2e/import-svg-behaviour.spec.ts`, `docs/GRAPHIC_BEHAVIOUR_PLAN.md` (§12),
`docs/INTERACTIVE_PLAYOUT_PLAN.md` (Phase 6), `docs/OGRAF_STATE_IN_FIELDS.md` (R6, §5b, §8).

`docs/GRAPHIC_TYPES.md` was in the brief's list and needed nothing: it is the CATALOG type
registry and carries no imported-behaviour field list. The poll's wire fields are documented in
the three files above.

## Verification

- `npm run build` green; branch stamp `claude/e-poll-live-update`, so it gated this branch.
- `import-svg-behaviour.spec.ts` in full, 6 passed - the vote walk now pins the checkbox off by
  default, `f5` staged empty, the figures coming up live while the vote is still open, going dark
  again when the field is cleared, and the overflowing round: no winner marked on any drawn row,
  the Options warning up, and both clearing when the round fits again.
- `npm run test:e2e:affected` - **started, verdict NOT read.** It ran over 40 minutes beside
  another checkout's full offline suite (this laptop is RAM-bound and the two overlapped), writing
  artifacts throughout but buffering its stdout, and the branch was queued rather than sat on. CI
  is the authority and does strictly more; this is the one gate in this session without a verdict,
  and it is named rather than implied.
- CI run **33312752636** on `2402cc19`: success, and every job actually ran (Build, E2E plan,
  Factory gates, Catalog calibration gate, all NINE E2E shards, Combined E2E report, CI gate).
  That sha carries the feature and the pins but NOT the `/check` fixes.
- CI run **33313754824** on `80514eb3` (the `/check` fixes) was still `in_progress` when the branch
  was queued. That is deliberate rather than sloppy: `auto-merge` gates the landing on CI for the
  sha it is actually landing, and mints a fresh run when `main` has moved, so a pre-queue run is
  only ever consumed if `main` has not moved by this branch's turn. **Read the run auto-merge
  reports, not this line.**
