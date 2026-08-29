# Behaviour state an operator must SEE belongs in a field, not only in machine state

**Filed:** 2026-08-30. **Source:** the control-panel research round
(`docs/CONTROL_PANEL_RESEARCH.md` §4d item 4, §5).

## Why

A NoaCG graphic holds two kinds of state and they have wildly different reach.

- A **field** is in the SPX definition, in the OGraf manifest's `schema`, in every generated form
  on every surface, and in `load()`/`updateAction()`. It crosses every boundary the product has.
- **Machine state** - what `noacgMachineState()` answers - is rich in-house (the chip, the greying,
  the overflow warning all ride it) and **crosses nothing**. OGraf v1 has no push, no subscription
  and no event; the one legal polled home, `ReturnPayload.result`, is dropped by the Server API on
  a graphic's custom action, and `RenderTargetInfo` reports only which graphic is loaded where. So
  outside our own transport, machine state does not exist.

This is not a defect to fix - it is a fact to design under. Every behaviour authored from here on
makes an implicit choice about which of the two it puts an operator-visible fact in, and today
nothing tells the author that one choice reaches a third-party renderer and the other reaches
nothing. The poll being built now is the first case where it bites: "voting is open" and "the
counts so far" are exactly the facts an operator needs to see, and if they live only in the machine
then an exported poll is mute everywhere except inside NoaCG.

The rule is cheap, and it is cheapest before the behaviours exist rather than after.

## What it would take

Not a build. A stated convention plus two small enforcements:

- Write the rule where behaviour authors read it - `docs/GRAPHIC_TYPES.md` and
  `src/templates/types/AGENTS.md`: *if an operator has to SEE it, it is a field; the machine holds
  what the operator DOES, not what they read.* A `hidden` input-only field is the normal shape for
  a fact the graphic owns and the operator only reads back.
- A `validateMachine` warning (not an error) when a `machine.controls` entry's state is
  operator-meaningful and no field mirrors it - which needs a way for a type to say so; the honest
  cheap version is a per-type opt-in list rather than inference.
- A row in the OGraf round-trip spec that asserts an exported behaviour's visible state comes back
  through `schema`, so the rule has a test rather than a paragraph.

Half a day for the convention and the docs; the validator warning is a separate, later slice.

## Evidence

`docs/CONTROL_PANEL_RESEARCH.md` §4b (the two silences), §4c (the Server API drops `result` -
read out of `v1/specification/open-api/server-api.yaml`), §5 (the poll, concretely).
`docs/CONTROL_LAYER.md` (machine state is what every surface polls; the overflow warning rides it).
`src/templates/types/livePoll.ts` (the shipped poll: `close`/`result`/`call` are controls, and the
open/closed fact is machine-only).
