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

---

## What it actually is (measured 2026-09-04, branch `claude/n-panel-pairs-with-import`)

**The imported design is not the variable. The CasparCG export target is.** The repro above was
run again as four cells - both decisive designs against both targets - and the answer flips on the
target every time, never on the design:

| design | target | package carries `controlpanel.html` | graphic carries the receiver | pairs |
|---|---|---|---|---|
| imported four-team score board | SPX (the dock's default) | yes | yes | **yes** - `connected: spx-control-imported_svg_design`, state chip up, and every verb on the page: four `+1`, four `−1`, Clear flash, Full time, New game |
| imported quiz board | SPX (the dock's default) | yes | yes | **yes** - Select answer, Lock it in, Reveal choice, Reveal correct |
| imported four-team score board | CasparCG | **no** | **no** | impossible |
| catalog Arena Quiz | CasparCG | **no** | **no** | impossible |

An imported design's exported panel pairs, and it carries every verb. A CasparCG package has never
contained a panel at all: `src/export/targets/casparcg.ts` writes exactly four files
(`<name>.html`, `README.md`, `FIELDS.md`, `GETTING-ON-AIR.md`) and calls neither
`injectControlReceiver` nor `addControlPanel`, which the SPX folder package and the HTML-overlay
package both do. So the `controlpanel.html` the repro opened was a 404 served as a plain body:
there was no `#status` element to reach "connected" and no `.state-chip` to become visible. Both
symptoms the first measurement recorded are what a missing file looks like through those two
locators.

The comparison that produced "an imported-design difference" was confounded. The imported board
was exported to **CasparCG**; the catalog quiz it was measured against
(`e2e/control.spec.ts`, "round-trip: the exported panel fires machine events") exports to the
dock's **default** target, which is SPX. The design and the target moved together, so the
difference could be attributed to either.

`MachineControl.set` is exonerated by the same run. The standalone panel already implements it -
`sendEvent` in `src/control/controlPanelHtml.ts` stages `e.set` through the same writer as
`e.adjust`, so the figure lands in the graphic and in the operator's own box together - and the
New game button is present and enabled on the paired panel in cell 1. The defect was never the
mechanism added that night.

**Fixed on that branch**: the CasparCG target now injects the receiver and bundles the panel, the
receiver's state watcher arms after the template's own JS has run (it could not before, in any
single-file package), and a walk drives a CasparCG-exported imported board from that panel through
every verb.
