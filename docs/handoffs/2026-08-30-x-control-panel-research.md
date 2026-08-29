# Handoff - Session X: from a drawing to a control panel (2026-08-30)

**Branch:** `claude/x-control-panel-research`. **Gate:** `npm run build` green locally, stamp
`[write-version] dist/version.json -> claude/x-control-panel-research@a6b7aaaec3` (it gated this
branch, not `main`). CI green on `f883dffc` (run 33276148477): `Build`, `E2E plan`, `Factory gates`
and `CI gate` all success; the E2E shards, the Vercel job and the catalog-calibration gate skipped,
which is the correct plan for a diff that touches only `docs/`. `check:line-endings`,
`check:client-neutral` and `check:copy` also run clean.

**Diff:** five new files, all documentation. **No product code was changed.** Nothing outside
`docs/CONTROL_PANEL_RESEARCH.md` and `docs/backlog/` was touched.

## What landed

**`docs/CONTROL_PANEL_RESEARCH.md`** - the capability bar the owner asked for, on one axis: what a
user does between *"here is my drawing"* and *"here is my control panel"*, in MXMZ, in
Singular.Live, and under the OGraf v1 specification.

It uses one ruler - six links in that chain (get the artwork in; address a layer; promote it to a
control; declare what happens on a press; assemble the surface; tell the operator what is legal and
what state it is in) - so three very different systems become comparable. Every claim carries an
evidence grade, and **[blank] is used wherever no public material exists** rather than filled with
a plausible guess. Two blanks are load-bearing: who builds MXMZ's per-sport Match Control panels,
and what Singular's App SDK can do (its documentation is behind an email request, quoted).

It deliberately does not re-run work that already exists. `docs/COMPETITOR_MXMZ.md` owns the MXMZ
dossier, `docs/EDITOR_RESEARCH.md` the authoring axis, `docs/CONTROL_PANEL_ROAD.md` our own road,
`docs/OGRAF_FIRST_REVIEW.md` §4-5 the full NoaCG-to-OGraf mapping. This file is narrower than all
four and cites rather than repeats them.

### The three findings worth the owner's minute

1. **Singular's road does not start at a drawing.** Asked directly, their own documentation answers
   that an imported SVG *"is treated as one widget (an image widget) unless you manually split the
   SVG artwork into multiple widgets/sub-compositions"*, and that it *"does not describe automatic
   layer extraction from Illustrator or Figma SVGs."* On links 1-3 the competitor to measure
   ourselves against is MXMZ, not Singular. Where Singular is genuinely ahead is link 3's gesture -
   click an underlined property, name it, it becomes a control node - and link 4, where their
   answer is a JavaScript editor with four scopes and five listener types.

2. **Nobody in this market lets a customer author behaviour.** MXMZ solves link 4 with services (a
   panel somebody builds per sport). Singular solves it with code. OGraf declines to solve it and
   leaves state inside the graphic. **Our generated-from-the-machine panel is the only generated
   surface in the field with structural legality, and it currently has one behaviour attachable to
   somebody else's artwork.** The advantage is entirely in the mechanism and almost not at all in
   the content - which is the uncomfortable half of the verdict table and points straight at
   `docs/backlog/playout-logic-for-all-common-graphics.md`.

3. **The OGraf Server API drops `ReturnPayload.result`** - new this round, read line by line out of
   `v1/specification/open-api/server-api.yaml`. A **renderer's** own custom action returns `result`
   (*"CustomAction successfully executed, returning result"*); a **graphic's** custom action returns
   only `graphicInstanceId`, `statusCode`, `statusMessage`. `RenderTargetInfo` lists which graphic
   is loaded where and no state at all. So over the standard wire, the total state a controller can
   learn about a loaded graphic is: which graphic is where, the last `currentStep` a playAction
   returned, and a status string. Our own exporter does not even use the one home that exists - the
   emitted `_customAction` returns `{statusCode, currentStep}` and never a `result`.

### The poll answer (Session T has a customer for it)

*Open / Close / Reveal is fully expressible in OGraf v1 today and needs nothing new; the live tally
crosses as data but has no standard control widget (GDD has ten scalar `gddType`s and no array
presentation); and the two things a poll panel actually needs - "which button is legal now" and
"the window just closed the vote by itself" - have no expression anywhere in the standard, only
inside the graphic's private runtime.*

**The instruction that falls out of it, and it constrains work in flight:** put the poll's
open/closed status and its counts in **fields**, not only in machine state. A field is in the OGraf
`schema`, travels through `load`/`updateAction`, and every generated form in the ecosystem draws
it. Machine state crosses no boundary at all.

### Four backlog rows filed

Each with its own Why, per `docs/backlog/README.md`:

- `behaviour-state-as-fields.md` - the convention above, plus where to write it and a
  `validateMachine` warning shape. Cheapest item here and the only one that constrains tonight.
- `tally-field-shape.md` - a list-with-values field kind (poll counts, standings, medal tables).
  The storage stays the pipe-line string; only the editor changes, which is what keeps it additive.
- `ograf-legality-vendor-block.md` - carry the precomputed legality table in `v_noacg` so our best
  property survives an export/import round trip. Small: the table, the vendor block and the reader
  all already exist.
- `ograf-graphic-state-return.md` - return `result` from the emitted graphic (ours, under a day),
  and file the missing-field proposal upstream with `ebu/ograf` (theirs, slow).

Deliberately **not** filed, because something already holds them: the behaviour library, rundown
auto-advance, the production control profile, version history / locked masters / team fonts, and
touch-target sizing. Section 7 of the research file lists each with its holder.

## Needs the owner

Nothing blocking. One decision is worth having, and it is not urgent:

**Row 5 of the verdict table wants a spec issue filed on `ebu/ograf`.** That is a public act in our
own name on the EBU's repository, which is not a landing and is not something a session should do
unasked. `docs/COMPETITOR_MXMZ.md` §8.3 makes the case that presence in this ecosystem is a
position we do not hold; filing a well-argued issue is the cheapest possible entry into it. The
argument and the concrete use case are written up in
`docs/backlog/ograf-graphic-state-return.md` and would need no further research.

## Two things a later session should tidy

Both are outside this branch's allowed touch list, so they were recorded rather than done:

1. **One line in `docs/OGRAF_FIRST_REVIEW.md` §2 is imprecise.** It reads *"status is poll-only -
   `GET /renderers/{id}` reports renderer and instance status"*. The `status` object lives on
   `RendererInfo` and is the **renderer's**; the instance listing (`RenderTargetInfo`) carries no
   status field at all. The section's conclusion ("no durable or push graphic-state stream") holds
   and is, if anything, understated. Worth a one-sentence correction next time that file is open.
2. **Cross-links.** `docs/CONTROL_PANEL_ROAD.md` §1 and `docs/COMPETITOR_MXMZ.md` §3 both now have
   a sibling worth pointing at, and `docs/GRAPHIC_BEHAVIOUR_PLAN.md`'s Related list is the third
   natural place. Nothing breaks without them; a reader arriving from those files simply will not
   find this one.

## How the diff was reviewed

`/check`'s code-review leg spawns subagents, which this session was told not to do, so **the diff
was reviewed by hand**. It is five new markdown files and no code, so the review that mattered was
factual rather than structural: every claim tagged `[code]` was re-read against the source this
round - `src/export/targets/ograf.ts` (`customActions()`, `_customAction`, `_updateAction`,
`_playAction`, the `machineState` binding), `src/templates/types/livePoll.ts` (its controls, the
authored 20 s window, `pathEvents: ['result']` and therefore the board → result → out walk),
`src/audience/audienceTypes.ts` (`AudienceRound`, `AudienceTally`), and `docs/GRAPHIC_TYPES.md` for
`pathEvents` semantics. Every `[spec]` claim was read out of the EBU's published files, not out of
our implementation. One weakness is flagged in the file itself: the Singular node-type list came
from their documentation-query endpoint, which said "14 types" and enumerated 13, and there is no
public page to check it against.

## Safe to archive

Yes, once the branch lands. It ships no product code, nothing is half-built, and everything it
found is written into the tree rather than into this conversation.
