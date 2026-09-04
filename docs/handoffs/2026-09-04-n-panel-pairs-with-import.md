# 2026-09-04 - row N: the exported panel pairs with an imported design

Branch `claude/n-panel-pairs-with-import`, cut from `97168655` (row B's landing) with `main`
already in - nothing to merge, so both sides of the integration are the same tree. The brief was
`docs/backlog/exported-panel-does-not-pair-with-an-imported-design.md`, filed by row B while
gating the score reset: the standalone `controlpanel.html` never pairs with an exported imported
design, on both graphics the 2026-09-12 production runs.

## The finding, which is not what was filed

**The imported design is not the variable. The CasparCG export target is.**

The repro was re-run as four cells before a line was changed - both decisive boards against both
targets - and the answer flips on the target every time:

| design | target | package has `controlpanel.html` | graphic has the receiver | pairs |
|---|---|---|---|---|
| imported four-team score board | SPX (the dock's default) | yes | yes | **yes** |
| imported quiz board | SPX (the dock's default) | yes | yes | **yes** |
| imported four-team score board | CasparCG | **no** | **no** | impossible |
| catalog Arena Quiz | CasparCG | **no** | **no** | impossible |

Cell 1 came back `connected: spx-control-imported_svg_design`, the state chip up, and every verb
on the page: four `+1`, four `−1`, Clear flash, Full time, **New game**. Cell 2 the same for the
quiz. So an exported imported design supplies everything pairing requires; **nothing was missing
from it.**

`src/export/targets/casparcg.ts` wrote exactly four files - `<name>.html`, `README.md`,
`FIELDS.md`, `GETTING-ON-AIR.md` - and called neither `injectControlReceiver` nor
`addControlPanel`. The `controlpanel.html` the original repro opened was a 404 served as a plain
body, so there was no `#status` to reach "connected" and no `.state-chip` to become visible.
**Both recorded symptoms are what a missing file looks like through those two locators.**

The comparison was confounded, and it is worth naming the shape rather than the mistake: the
imported board was exported to **CasparCG**, and the catalog quiz it was measured against
(`e2e/control.spec.ts`) exports to the dock's **default**, which is SPX. The design and the
target moved together, so the difference could be attributed to either. B's own note called it
"the panel/receiver pair rather than exports in general", which was right; it was one export
target rather than one kind of design.

**`MachineControl.set` is exonerated.** The standalone panel already implements it - `sendEvent`
in `src/control/controlPanelHtml.ts` stages `e.set` through the same writer as `e.adjust`, so the
figure moves in the graphic and in the operator's box together - and New game is present and
enabled on the paired panel in cell 1. The mechanism added the night before was never involved.
The row asked me to decide whether the defect was the panel or the new mechanism: **it was
neither. It was the package.**

The measurement is written into `docs/backlog/exported-panel-does-not-pair-with-an-imported-design.md`
under "What it actually is", committed in `580e7078` before anything was fixed.

## What shipped

- **`src/export/targets/casparcg.ts`** - injects the control receiver into the single file and
  bundles `controlpanel.html` beside it (`inlineAssets`, because there is no images/ folder), with
  the graphic's saved entries. The same pairing the HTML-overlay target has always had.
- **`src/export/common.ts` `appendToBody`** - one helper, used by the receiver injection and by
  the single-file composer, appending at the **last** closing body tag. See the incident below.
- **`src/control/receiverScript.ts`** - the state watcher re-arms on the first message it handles.
  In ANY single-file package the receiver runs before the template's own JS, so at load neither
  `noacgMachineState` nor `noacgTextOverflow` existed and the watcher stayed disarmed for the life
  of the page: the panel paired, answered every press, and silently never reported a timer-driven
  change. That was true of the HTML overlay too, since it shipped.
- **`src/export/onAirGuide.ts`** - the control-panel section is now behind a `controlPanel` option
  carrying the path the reader would type, in the same shape as `localController`. Callers name
  what they actually wrote, and `buildShowZipFor` reads which case it is off the files it just
  wrote rather than off the target id.
- **Two walks** in `e2e/import-svg-behaviour.spec.ts` driving a CasparCG-exported imported board
  from its own panel: the score board through `+1`, `−1` and New game (with the panel's own box
  and a following Take), the quiz board through select, lock and Reveal correct, with the
  structural guard asserted by what it REFUSES as well as by what it fires.
- **`docs/acceptance/owner-queue/2026-09-04-caspar-package-has-an-operator-page.md`**.

## The thing to review hardest

**A comment took nine specs red, and the fix is the mechanism rather than the comment.** The note
I added to the receiver mentioned the closing body tag in prose. Both `injectControlReceiver` and
`composeSelfContainedHtml` found their insertion point with `/<\/body>/i` and replaced the FIRST
match, so the composer put the whole of a template's JS inside that comment. Every exported
graphic lost `update()`, `play()` and the rest; the only visible symptom was
`window.update is not a function`, and nine specs across four files went red at once - including
tests that have nothing to do with this change.

Both now append at the LAST one, through `appendToBody`. That is what "the end of the body" means
anyway, so it is the honest reading as well as the safe one, and it removes the trap instead of
stepping around it. **`src/blocks/edit.ts` `insertGraphicHtml` is a third copy of the same idiom**
and was deliberately left: it works on the authored template, never on one an exporter has already
injected into, and folding it in would put a new import edge between two domains for a cleanup.
If that file ever starts seeing exporter output, it needs the same treatment.

## The judgement worth arguing with

The CasparCG package still carries **no relay and no launcher**. The playout host is the
controller there, and the HTML-overlay target is the flavour built for hosts with none of their
own; `src/export/AGENTS.md` states that as deliberate. This change adds only the panel and the
receiver that answers it - so the fallback works from a browser served over one address, and not
from inside CasparCG's own engine. The guide and the README say exactly that, including where it
does not work. If what the classroom actually wants is a CasparCG package you can operate by
double-clicking one file, that is a different and larger change, and the owner-queue item names it
as the thing to say out loud on the walk.

## Verification

`check: review delegated · simplify inline · verify green · taste not applicable.`

- **`npm run build`** - green, on `claude/n-panel-pairs-with-import`.
- **Review**: `delegated`, high. Five findings, all confirmed against the code, all fixed:
  the show export's graphic-file count broken by the extra panel; the guide naming a panel in
  packages that have none (OGraf, LiveOS, H2R, and a show root pointing a folder down); the new
  walks not mapped in `scripts/e2e-affected.mjs`, so editing the export files they guard would
  never schedule them; the AGENTS.md note claiming every caller bundles a panel, which was false;
  and a `toBeHidden` assertion that also passes for an element that is not on the page at all.
  It did NOT find the `</body>` defect - the e2e run did, which is the argument for running it.
- **Simplify**: `inline` - the skill returned fan-out instructions, which the check contract
  counts as not run, so the four angles were covered here. One fix (`withControlReceiver`, the
  receiver-plus-template shape that both single-file targets were writing out by hand); one
  finding reported and not taken (`blocks/edit.ts`, above).
- **Taste**: `not applicable`, and here is why rather than an assertion. Nothing in the diff can
  reach a rendered graphic: the receiver is injected only by export targets, and `appendToBody`
  produces byte-identical output to what it replaced for any document with one closing body tag.
  `npm run catalog:affected` says FULL catalog, but only because it cannot attribute
  `scripts/e2e-affected.mjs` to any design - a false positive on the spec MAPPING file. The cheap
  gate was run anyway: `node scripts/check-catalog-emit.mjs` - PASS, 504 designs.

## What is left

Nothing on this branch. Two things worth someone's time later:

1. **`e2e/control.spec.ts` still only walks the SPX package.** The CasparCG walks live in
   `import-svg-behaviour.spec.ts` because that is where the boards they drive are. If a third
   package flavour ever grows a panel, the pattern to copy is `casparPackageOnAir` there.
2. **The confounded-comparison shape is the lesson worth keeping**, more than this defect is: a
   measurement that moves two variables at once names whichever one the reader was already
   thinking about. Row B's repro was careful and honest and still landed on the wrong one.
