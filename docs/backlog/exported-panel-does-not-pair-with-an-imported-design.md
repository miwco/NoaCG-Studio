# The exported control panel does not pair with an imported design's graphic

**Filed:** 2026-09-04. **Source:** measurement, while gating the score behaviour's reset on all
three operator surfaces (branch `claude/b-scoreboard-behaviour`).

## Why

The CasparCG package's `controlpanel.html` is the surface a class falls back to when the network
dies - it is the whole reason `docs/CONTROL_PANEL_PARITY.md` exists. If it cannot drive an
IMPORTED graphic, then the two graphics the 2026-09-12 production runs are exactly the two it
cannot drive: both are imported SVG boards. The student release's promise is that a graphic a
student drew plays out anywhere, and this is one of the anywheres.

It is also invisible today. Nothing walks the panel against an imported design - every spec that
drives `controlpanel.html` uses a catalog variant (`e2e/control.spec.ts` drives a catalog quiz),
so a road that works for everything we drew and nothing they drew reports green.

## What was measured

Walking the standalone panel against an exported four-team score board:

1. Import `e2e/fixtures/svg-corpus/illustrator-four-team-scoreboard.svg`, Create project.
2. Export dock -> CasparCG export -> Validate & download.
3. Serve the unpacked package over one fake origin (the `e2e/control.spec.ts` recipe), open the
   graphic's own html, then `controlpanel.html` on the same origin.
4. **The graphic loads** - its bound fields are in the DOM, `#f2` is present.
5. **The panel never pairs.** `.state-chip` stays hidden and `#status` never reaches "connected"
   inside 20 s, so the panel is sitting in its own honest "nothing is answering" state.

The same recipe pairs immediately for a catalog quiz (`e2e/control.spec.ts`, "round-trip: the
exported panel fires machine events"), which is what makes this an imported-design difference
rather than a harness fault. It was NOT chased further: it is unrelated to the change that found
it, and pinning that change's behaviour behind a broken pairing would have been a red test
blaming the wrong code.

## What it would take

The channel name is derived from the template name on both sides and should match by
construction - `controlChannelName(template.name)` in `src/control/controlPanelHtml.ts` for the
panel, and the same call in `src/export/common.ts` `injectControlReceiver` for the graphic. So the
first thing to check is whether the receiver is injected at all into an imported design's html,
and whether it runs: an imported SVG graphic's html is assembled by
`src/templates/importedDesign/svg.ts` rather than by `assembleStandard`, which is the one
structural difference between it and every graphic this road is known to work for.

Then a walk, because the reason nobody noticed is that nobody walks it: one imported board driven
from `controlpanel.html`, beside the catalog one `e2e/control.spec.ts` already has.

## Evidence

The withdrawn walk is described in `e2e/import-svg-behaviour.spec.ts`, in the comment that closes
the "NEW GAME zeroes the scores on the EXPORTED controller too" test - the show package's
`controller.html` pairs and drives fine on the same artwork in the same run, which narrows this to
the panel/receiver pair rather than to exports in general.
