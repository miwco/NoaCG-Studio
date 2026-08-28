# Handoff: the SVG import road, measured against what design apps really export

Session U, 2026-08-28. Branch `claude/u-svg-import-sweep`.

## What is true now

The SVG import road had only ever been walked with Illustrator-shaped files written for the
feature. It has now been walked with **twenty files carrying the byte-idioms of Illustrator,
Figma, Inkscape and Affinity**, plus complex paint and awkward geometry, door to export gate.

**All twenty import, reach Finish and pass the export gate.** The road works. Eleven wrong answers
were found along the way: six were small and clear and are fixed here, five are structural and are
filed with the fixture that reproduces them.

Final measurement: **12 clean, 8 with a note, 0 failures.** Every remaining note is one of the five
findings. The table, the reasoning and the five findings are in
**`docs/backlog/svg-import-sweep-findings.md`** - read that before picking any of this up.

## The three artifacts

| | |
|---|---|
| `e2e/fixtures/svg-corpus/` | 20 fixtures, each with an `.expect.json` sidecar. `README.md` there is the contract |
| `scripts/svg-import-sweep.mjs` | the INSTRUMENT: walks every fixture through the real door in the app, scores it, prints a table. Reports, never gates |
| `e2e/import-svg-corpus.spec.ts` | the GATE over the six answers now judged correct |

**The rule that makes the corpus worth anything:** an expectation is written from the designer's
promise in `docs/SVG_AUTHORING.md`, never from `src/assets/svgImport.ts`. An expectation copied out
of the implementation proves only that the implementation does what it does - which is what every
source-level check of this feature already proved while the question stayed open. Three
expectations were corrected during the sweep and each one says in its own file why.

## Fixed here

All in `src/assets/svgImport.ts` except the last:

- **A compound PostScript weight never resolved.** `Archivo-SemiBold` split into "semi" + "bold",
  "semi" is not a weight, so the whole name stopped reading as a face and the import warned "not
  available" about a family this project ships. Illustrator writes SemiBold, ExtraBold and
  UltraLight exactly this way, so this was a whole class.
- **Figma names a text layer after its own copy.** A quiz board arrived with five fields labelled
  with the very words the operator was about to replace, while the designer's `Answer A`…`D` sat
  one level up unused.
- **Figma's own frame names beat the designer's.** `<g id="Frame 21">` inside `<g id="Answer D">`
  won, so `isDefaultObjectName` now reads a design app's default object names as unnamed.
- **Affinity Designer's `serif:id` was unread** - it holds the spelling the designer typed while
  `id` holds the sanitized one, the same trick as Illustrator's `data-name`.
- **Inkscape's `textPath6` counted as a name**, so a curved headline was labelled after the element
  rather than after its layer.
- **A refused file reported itself in a line no instrument could read** - `import-drop-error` on
  `ImportDesignStep.tsx`.

## What is worth doing next, in the order I would do it

1. **Figma's outlined text has no recovery road** (finding 1) - the biggest one, and the one the
   owner is asked to rule on in the owner-queue item. Figma flattens a whole text layer into ONE
   compound `<path>`; our outline rows only open for a group of two or more shapes. So the most
   common real-world SVG failure imports pixel-perfect with nothing editable, after a door message
   that promises "two ways to get editable text". **Do not start building it before the owner
   answers** - the cheap alternative (name the Figma checkbox in the message and tell them to
   re-export) may be the right answer, and the real fix changes what an outline candidate IS
   (a path, not a group: `outlineCandidates`, `MapSvgFieldsStep` `measureOutline`, the generator's
   hide rule).
2. **A Figma-placed picture is never a picture field** (finding 2). Figma never writes a positioned
   `<image>`; it writes a rect filled by a `<pattern>` that `<use>`s an image in `<defs>`. Bounded
   and mechanical - decide whether an image inside a pattern referenced by a rendered element is
   "offered".
3. **A millimetre Inkscape document lands at 18% size** (finding 3). The unit is on `width`/
   `height` and simply is not converted. First file shape a student is likely to bring.
4. **An Illustrator rounded rectangle cannot be the panel that grows** (finding 4). The advice in
   `docs/SVG_AUTHORING.md` ("draw the panel as a rectangle") is unfollowable in the tool most of
   these files come from, because Illustrator writes a rounded rect as a `<path>`.
5. Finding 5 (the growth default reading "banner" on four shapes that are not) is the lowest
   severity and should probably wait behind the four above.

## Things the next session should know

- **`scripts/command-match.mjs` will probably conflict.** `svg-import-clarity-554ecb`
  (`claude/s-catalog-taste-d782b9`) added `card-pair-sweep` to `SWEEP_SCRIPTS` in the same list
  this branch adds `svg-import-sweep` to. Both entries are wanted; the resolution is to keep both.
- **`docs/SVG_IMPORT_PLAN.md` was deliberately NOT edited** - `docs-graphics-shelf-786532` had it
  open. The findings therefore live in `docs/backlog/svg-import-sweep-findings.md`, and folding
  them into the plan's §6 is a small job for whoever lands after that branch.
- **`src/components/wizard/AGENTS.md` was not touched** (session R owns it). The one thing it might
  want to say: the mapping step's outline rows and picture rows are BOTH shaped around
  Illustrator's idioms, and findings 1 and 2 are the same mistake made twice.
- **Neither `import-svg.spec.ts` nor `import-svg-behaviour.spec.ts` is in the sprint FOCUS list**
  even though the SVG road is the NOW goal. `import-svg-corpus.spec.ts` was added there; its
  2180-line sibling was deliberately left out on merge-latency grounds. Worth an orchestrator
  decision rather than leaving it as an accident.
- **The sweep is browser work.** It is listed in `SWEEP_SCRIPTS`, so the guard hook and the process
  detector both know it - enqueue it (`npm run queue -- "node scripts/svg-import-sweep.mjs"`),
  never run it beside a suite. It writes its `--json` wherever it is told; do not let it land in
  the repo root.

## Verification

- `npm run build` green.
- `node --test scripts/e2e-affected.test.mjs` green (17 passing) after the mapping change.
- The sweep itself, through the queue: 20 fixtures, 12 clean, 8 noted, 0 failures.
- E2E, through the queue: `import-svg.spec.ts` alone 52 passed; `import-svg.spec.ts` +
  `import-svg-behaviour.spec.ts` 57 passed; the three SVG specs together re-run to confirm the one
  red run below.
- **One run to be honest about.** The first three-file run produced 4 failures in the EXISTING
  `import-svg.spec.ts` (59 passed). They were not a detection regression: every label assertion in
  the failing test passed, and the failures read the store's DEFAULT starter template
  (`Name`/`Title`/`Alexandra Riva`, and in one case a template with no `<svg>` at all) rather than
  the created one. That is the ghost-store symptom `e2e/AGENTS.md` documents for a dev server that
  has served many edits - and that server had just served every edit in this session. Isolated and
  paired re-runs on a fresh server are green. If it ever returns, the contract's own instruction
  applies: fault-inject it, do not repeat it harder, and fix the handler rather than the spec.
