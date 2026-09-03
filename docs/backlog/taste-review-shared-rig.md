---
v: 1
source: check
raised: 2026-09-04
state: unstarted
asked: "the tail of the taste-review /check: one import-road flag, one settle recipe, one iframe rig, one long-text recipe"
---
# The taste review's tail - four copies that should be one each

Filed by the session that landed `docs/VISUAL_TASTE_REVIEW.md` and `scripts/taste-frame-review.mjs`,
from its own `/check` (eight review legs, 2026-09-04).

## Why

None of these change what the instrument answers today; each is a second copy of a fact that
already lives somewhere else, and a second copy drifts. The evening it was written, the script
joined one of the two guard lists and not the other, and a run queued with no dev server burned
its slot reporting a failed review - that is what a copy costs, and the instrument exists to stop
sessions shipping what they did not look at, so its own machinery should not be the thing that
quietly disagrees with itself.

1. **Which files change what an IMPORTED graphic looks like** is not a question
   `scripts/catalog-affected.mjs` can answer. `src/assets/svg*` escalates to a full run,
   `src/templates/importedDesign/svg.ts` attributes to the placeholder id `svg01`, and
   `draft.ts`'s `withSvgOutlineFields`, `model/wizard.ts`'s layout rules, `stretch.ts` and
   `quizBehaviour.ts` match nothing. The taste script therefore does not try to name imports on
   `--affected` and points at `svg-import-sweep --shots` instead. The right home is an
   `importRoad` flag in `planFor`, tested in `catalog-affected.test.mjs`, that the taste script
   and the affected mapper both read.
2. **The settle-and-raster recipe** (will-change off, two frames, back on, two frames) now has
   three copies: `cli/src/screenshot.ts`, `scripts/pro-spike.mjs` and the taste script. One
   browser-evaluable helper under `scripts/` that all three call.
3. **The in-page iframe rig** (host div, grey bed, `color-scheme: dark`, compose, mount) is the
   third copy beside `card-look-sweep.mjs` and `pro-taste-rejudge.mjs`, and `card-look-sweep`
   does not set the colour scheme, so it paints white (root `AGENTS.md` gotcha).
4. **The long-text recipe** (`FILL`, `max(len + 8, len * 1.7)`) is now a sixth copy beside
   `text-containment-sweep.mjs`, `footprint-stability-sweep.mjs`, two catalog specs and
   `multicol-containment.spec.ts`. One helper, six callers.
5. `SWEEP_SCRIPTS` and `DEV_SERVER_DEPENDENT_SCRIPTS` in `scripts/command-match.mjs` are two lists
   a browser script has to join separately; the taste script joined one and missed the other
   for an evening. A single registry row per script (name, needs a server, cost) would make that
   impossible.

Also unrendered: the owner's quiz board at a LONG question through the real door.
`svg-import-sweep --shots` writes its hold frame only; the wizard preview at three lengths is
measured by `e2e/import-svg.spec.ts` but photographed by nothing.
