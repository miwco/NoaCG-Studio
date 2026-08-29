# Return `result` from an exported graphic - and propose the field the Server API is missing

**Filed:** 2026-08-30. **Source:** the control-panel research round
(`docs/CONTROL_PANEL_RESEARCH.md` §4c, §5).

## Why

An exported NoaCG graphic can tell a host that is not ours **nothing at all** about its own state.
Not the machine state. Not a tally. Not that a timer just closed a vote. Not that a value did not
fit. In our own transport all of that exists (`noacgMachineState()` → `control_report`, and the
overflow warning rides the same answer); across the OGraf boundary it evaporates.

There are two separate causes and they need separate fixes, which is why they share one file.

**Ours, and small.** The Graphics spec gives exactly one legal home for graphic-specific state:
`ReturnPayload.result`, returned in reply to an action the controller called. **Our exported
`graphic.mjs` does not use it** - `_customAction` returns `{statusCode: 200, currentStep}` and
`_updateAction` returns `{statusCode: 200}`, while `noacgMachineState` is bound in the runtime
object and used only internally for snap and step tracking. A host that embeds the Web Component
directly - the reference `ograf-server` renderer page, `src/bridge/ografHost.ts`, anyone's own
loader - would receive `result` today if we wrote it. We are leaving the only available channel
unused.

**Theirs, and a proposal.** Reading `v1/specification/open-api/server-api.yaml` line by line: the
**renderer**-level custom action returns `result` (*"CustomAction successfully executed, returning
result"*), and the **graphic-instance**-level custom action returns only `graphicInstanceId`,
`statusCode` and `statusMessage`. `playAction` adds `currentStep`. `RenderTargetInfo` lists which
graphic is loaded where and no state at all. So `ReturnPayload.result` exists in the Graphics spec
and is **dropped on the wire** by the Server API. That looks like an oversight rather than a
decision - the field is already modelled one endpoint away, in the same file, for the renderer's own
actions.

This matters beyond tidiness. `docs/OGRAF_FIRST_REVIEW.md` §6 puts a Server API facade on `/output`
on the ladder, and later a controller-side Server API client speaking outward to third-party
renderers. Every graphic driven that way is mute in both directions today, and the first production
that hits it will hit it during a show.

## What it would take

**Half one (ours, small, do it first).** Return `result` from the emitted `_customAction`,
`_updateAction` and `_playAction` when the graphic carries a machine: the group→state map from
`noacgMachineState()`, plus the overflow report. Additive and ignorable - a host that does not read
`result` is unaffected, and `statusCode` semantics do not change. Extend `src/bridge/ografHost.ts`
to surface it, and add a conformance case. Under a day.

**Half two (upstream, cheap to ask, slow to land).** An issue on `ebu/ograf` proposing `result` on
the `graphicInstance` action responses, with the renderer-level endpoint as the precedent and a
concrete use case (a live vote reporting its tally and whether the window closed itself). This is
also the moment to raise the adjacent one: nothing reports a loaded instance's current step or data,
so a controller that reconnects has no way to learn what is on air without asking the graphic. Being
the party that files a useful spec issue is worth something on its own -
`docs/COMPETITOR_MXMZ.md` §8.3 makes the case that presence in this ecosystem is a position we do
not currently hold.

**What NOT to do:** invent a NoaCG push channel inside an OGraf package. The command log is our
transport and stays ours (`docs/OGRAF_FIRST_REVIEW.md` §6); this item is only about using and
extending the standard's own reply.

## Evidence

`docs/CONTROL_PANEL_RESEARCH.md` §4c (the endpoint-by-endpoint response table), §5 (what a poll
cannot say).
`ebu/ograf` `v1/specification/open-api/server-api.yaml` at `main`, `RendererInfo` and
`RenderTargetInfo` schemas.
`src/export/targets/ograf.ts` (`machineState` bound at the runtime object and used only for snap and
the step walk; every action returns status and step only).
`docs/OGRAF_FIRST_REVIEW.md` §2 - and one correction to it: that section reads *"`GET
/renderers/{id}` reports renderer and instance status"*; the `status` object is on `RendererInfo`
and is the **renderer's**, while the instance listing carries no status field. The conclusion there
holds and is understated.
