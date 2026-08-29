# The SVG words, and moving the help to where the file gets dropped

**Branch:** `claude/u-svg-words` · **Date:** 2026-08-30 · **Gate:** `npm run build` green;
full CI suite requested on the branch (see "Gates" below).

## What the owner asked for

Two things, both about the same page, both from the 2026-08-29 read:

> "the text is too difficult ... it reads a bit like AI."

> "people are not going to go into the documentation to get this information. They need it when
> they are about to upload their SVG."

The first is a re-ruling. On 2026-08-26 he had already said it once, about a different surface:
*"it just needs to be more caveman style and not an epic drama."* The rule stands, and
`docs/SVG_AUTHORING.md` had never been put through it: it was written for a reader who enjoys
subordinate clauses, and the reader it is for is a first-year student who has never exported an
SVG in their life.

The second is the bigger one, because it is not a copy problem at all. Correct advice filed
where nobody goes is the same as no advice.

## What changed

### 1. `docs/SVG_AUTHORING.md`, rewritten sentence by sentence

Short words, short sentences, no hedging, no throat-clearing. **Every fact was kept.** Three
constraints shaped it:

- **The section numbers do not move.** `docs/backlog/svg-import-sweep-findings.md`,
  `e2e/student-rehearsal.spec.ts` and `scripts/svg-import-sweep.mjs` all cite this file by
  section (`§2`, `§3`, `§4`, `§5`, `§5b`), and the sweep reads its PROMISE from here rather than
  from `src/assets/svgImport.ts`. A restructure would have quietly broken every one of those
  citations.
- **The app-by-app export sections stay whole.** They are the part people actually use.
- **One stale fact was corrected while rewriting**: the too-long ladder now names the SQUEEZE
  rung (`SVG_FIT_FLOOR = 0.55`, then `svgUnsqueeze` in `src/templates/importedDesign/svg.ts`),
  which was added after the doc was last written. The doc had been promising that a value past
  the floor is merely reported.

Jargon that a designer does not have to know came out: "furniture", "renderer", "untrusted
input", `@font-face`. The facts under them did not.

### 2. `docs.html` `#svg`, the same voice

Same rewrite, same anchors (`#svg-rules`, `#svg-layers`, `#svg-fonts`, `#svg-export`), same
markup shape. `npm run check:copy` still passes, and its em-dash baseline for this page is
still empty.

### 3. The essential version, on the drop step

`src/components/wizard/steps/ImportDesignStep.tsx` grows one section under the drop zone:

> **Exporting the SVG**  named layers, live text, one artboard  ⓘ

Under the ⓘ: four rules (name your layers, keep text as text, one artboard at the size you want
on air, embed your pictures) and **where Export lives** in Illustrator, Figma and Inkscape, with
the two checkboxes that decide the outcome.

Four decisions worth knowing:

- **It obeys the one-line rule.** `SectionHead`, like every other section on the step. The
  summary IS the three rules, three words each; the menu paths are behind the dot. Nothing new
  is automatically visible except one line.
- **It stays while an SVG is loaded** (`!art && !templateFile`, not `&& !svg`). A file whose
  type was outlined on export is exactly the person who needs "Outline text OFF" named, and
  that person is standing on this step reading the card that just told them so. A raster or an
  `.html`/`.zip` drop hides it: there is nothing to re-export.
- **The old link to `/docs#svg` moved** out of the "Your design" ⓘ and into this one, where the
  reader who wants more is already looking. The "Your design" ⓘ lost a paragraph and got
  shorter in the same pass.
- **`.wz-why ul` is new** in `src/styles/wizard-and-dialogs.css`, four lines beside the existing
  `.wz-why p` rules. It is the first list inside an ⓘ, because this is the first ⓘ whose answer
  is per-app rather than prose.

### 4. Screenshots, generated rather than captured

`scripts/docs-shots.mjs`, modelled on `scripts/landing-shots.mjs`, drives the running app and
writes `public/docs/{svg-drop,svg-fields,svg-behaviour}.png`. Three pictures on the docs page:
the drop step with the export rules open, your layer names sitting in the field list, and quiz
behaviour picked on artwork nobody here drew. It reads the shipped samples in
`docs/svg-samples/`, so it photographs the road the reader is told to take.

Two things decided while making them:

- **Capture width is chosen for the PAGE, not for the picture.** The docs column is 780px, so a
  1440 pane produces a beautiful screenshot whose labels are 6px tall where anyone reads them.
  1120 is the narrowest that keeps the wizard's desktop layout (breakpoint 768) with its live
  preview; the drop step goes to 1040 because it is all type.
- **The behaviour shot is the whole step, not the panel element.** The panel is wider than its
  pane, so an element grab returns every dropdown sliced down the right edge - a picture of a
  broken product.

## Gates

- `npm run build` green on the final tree; `check:copy` green.
- `e2e/import-svg.spec.ts` gains one spec for the new section: one line visible, body closed
  by default, the Illustrator/Figma/Inkscape paths behind the dot, and still present after an
  SVG is dropped.
- `e2e/docs.spec.ts` gains one spec that all three screenshots decode and carry alt text. That
  is the failure mode worth pinning: a renamed PNG leaves a page that still reads perfectly
  with three empty frames in it.
- The full CI suite was requested with `gh workflow run ci.yml --ref claude/u-svg-words` rather
  than left to the push, because a second small push plans only its own files.

## For the next session

- **The owner walk is the point**: `docs/acceptance/owner-queue/2026-08-30-u-svg-words.md`. The
  test is whether three paragraphs read cold sound written or generated. Nothing in the repo
  can answer that.
- **One defect seen and not fixed**, filed as a task chip: on the Fields step the quiz
  picked/right/wrong dropdowns are narrower than their own values, so `A selected (hidden)`
  renders as `A selected (hidde`. It is visible in `public/docs/svg-behaviour.png`. It belongs
  to `MapSvgFieldsStep.tsx`, which another session owned tonight, so it was left alone.
- **`scripts/docs-shots.mjs` and `scripts/landing-shots.mjs` now share a `shot()` helper by
  copy.** Worth folding into one module the third time somebody needs it, not before.
- **The screenshots photograph `docs/svg-samples/`, which `claude/v-svg-samples` was editing the
  same night.** If those files change shape, re-run `node scripts/docs-shots.mjs` and commit the
  three PNGs. Nothing breaks if nobody does - the pictures just show an older sample - which is
  precisely why the harness exists rather than a hand-captured file.
- The wizard's other steps still have no pictures anywhere. If the docs page wants more, the
  harness is the place to add them, one `shot()` call each.

## Safe to archive

Yes, once the branch has landed. Everything is on the branch and in the two files above.
