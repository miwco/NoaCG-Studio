# Behaviour state an operator must SEE belongs in a field, not only in machine state

**Filed:** 2026-08-30. **Source:** the control-panel research round
(`docs/CONTROL_PANEL_RESEARCH.md` §4d item 4, §5).

> **Update, 2026-08-30 (same day). The CONVENTION half is done** - written as a design that stands
> on its own, `docs/OGRAF_STATE_IN_FIELDS.md`, with the short form in `src/templates/types/AGENTS.md`
> where behaviour authors actually read it. It goes further than the rule stated below: the fact is
> owned by the CONTROLLER and obeyed by the graphic, which is what removes the need for a return
> channel entirely, and it adds the prohibition that falls out (no `timer` edge on operator-visible
> state). It is also honest about what the rule does NOT buy - legality has no expression in OGraf v1
> and no arrangement of fields creates one.
>
> **What is left in this file is the two ENFORCEMENTS**: the `validateMachine` warning (with the
> per-type opt-in list it needs) and the OGraf round-trip spec row. Those are what turn a paragraph
> into a test, and neither is built.
>
> One correction to the reasoning below: `result` is **undeclared** on the Server API's
> GraphicInstance responses rather than dropped - the reference server forwards it as vendor
> pass-through. Filed upstream as <https://github.com/ebu/ograf/issues/82>. The conclusion is
> unchanged: an undocumented channel is not one a design may rest on.
>
> **Second update, 2026-08-30. The IMPORTED poll now follows the rule properly** - a `Vote status`
> token field the controller writes and the runtime reads, replacing the regex over a localisable
> display sentence (`docs/OGRAF_STATE_IN_FIELDS.md` §5a, which carries the reproduction and the
> append-last shape). **The CATALOG board still does not.** It is not the same defect - its badge is
> a keyframe track on the machine's states, so it never read a status back and never had one to get
> wrong - it is the plain version of the gap this file was opened for: `close` / `result` / `call`
> are machine-only, so a controller that cannot dispatch our events cannot close a catalog vote at
> all. Giving it the same field means a runtime read that has to agree with those keyframes, which
> is why it is a slice of its own rather than a follow-on edit.

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
