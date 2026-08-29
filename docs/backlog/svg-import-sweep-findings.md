# SVG import: what the exporter sweep found

Measured 2026-08-28 by walking 20 files through the real Import door in the app
(`scripts/svg-import-sweep.mjs`, corpus and method in `e2e/fixtures/svg-corpus/README.md`). Every
file is shaped the way Illustrator, Figma, Inkscape or Affinity really export, and every
expectation is written from the designer-facing promise in `docs/SVG_AUTHORING.md`, never from
`src/assets/svgImport.ts` - so a disagreement here is a finding rather than a tautology.

**Nothing crashed and nothing was refused that should have imported.** Every one of the 20 files
reached Finish and passed the export gate ("valid and ready to export"). The road works. What
follows is where it does not work *as advertised*.

Six defects were small and clear and are fixed on this branch. Five are structural and are filed
below with the fixture that reproduces them.

## The table

After the fixes: **12 clean, 8 with a note, 0 failures.** Every note left is one of the five
findings below - re-run `node scripts/svg-import-sweep.mjs` and the notes should be exactly these.

| Family | Fixture | Verdict |
|---|---|---|
| illustrator | `illustrator-internal-css-lower-third` | clean |
| illustrator | `illustrator-kerned-headline` | clean - kerned runs bind as ONE field |
| illustrator | `illustrator-quiz-board-multiline` | clean - stacked tspans bind one field per line |
| illustrator | `illustrator-mixed-outlines` | clean - live text beside an outline row |
| figma | `figma-frame-export-lower-third` | clean |
| figma | `figma-nested-frames-quiz-board` | clean |
| figma | `figma-outline-text-title-card` | **finding 1** - no outline rows, no recovery |
| figma | `figma-embedded-raster-card` | **finding 2** - no picture field |
| inkscape | `inkscape-lower-third-layers` | clean |
| inkscape | `inkscape-text-on-path-bumper` | clean |
| inkscape | `inkscape-flowed-text-card` | finding 5 - growth default |
| inkscape | `inkscape-millimetre-scorebug` | **finding 3** - lands at 339 × 191 |
| effects | `effects-external-ref-and-script` | clean - both removals reported |
| effects | `effects-symbol-library-ticker` | clean - symbol text explained |
| effects | `effects-gradient-shadow-lower-third` | **finding 4** - silently shrinks |
| effects | `effects-figma-masked-reveal` | finding 5 - growth default |
| geometry | `origin-shifted-quiz-board` | clean - viewBox origin at -960,-540 |
| geometry | `no-viewbox-px-and-pt` | clean |
| geometry | `nested-svg-sub-artboard` | finding 5 - growth default |
| geometry | `ticker-strip-3840` | finding 5 - growth default |

## Fixed here

| What was wrong | Where | Reproduced by |
|---|---|---|
| A compound PostScript weight never resolved: `Archivo-SemiBold` split into "semi"+"bold", "semi" is not a weight, so the whole name stopped reading as a face and the import warned "not available" about a family this project **ships**. Illustrator writes SemiBold, ExtraBold and UltraLight exactly this way. | `svgImport.ts` `fontLookup` | `effects-symbol-library-ticker` |
| Figma names a text layer after **its own copy** (`<text id="Amsterdam">`), so five quiz fields were labelled with the very words the operator was about to replace, while the designer's `Answer A`…`D` sat one level up unused. | `svgImport.ts` `candidateName` / `namesItsOwnCopy` | `figma-nested-frames-quiz-board` |
| Figma's auto-layout wraps things in frames it names itself (`<g id="Frame 21">`), and that beat the name the designer typed on the group above it. | `svgImport.ts` `isDefaultObjectName` | `figma-nested-frames-quiz-board` |
| Affinity Designer's `serif:id` was unread, so a label spelled "Answer-A" instead of the "Answer A" the designer typed - the same trick as Illustrator's `data-name` and Inkscape's `inkscape:label`. | `svgImport.ts` `layerName` | `origin-shifted-quiz-board` |
| Inkscape's `textPath6` counted as a name, so a curved headline arrived labelled `textPath6` instead of taking the labelled layer above it. | `svgImport.ts` `isGeneratedId` | `inkscape-text-on-path-bumper` |
| A file the door REFUSED said so in a `.status-bad` line with no test id, so no instrument could read the refusal. | `ImportDesignStep.tsx` | the whole corpus |

## Filed - structural

### 1. Figma's outlined text has no recovery road (the biggest one)

`docs/SVG_AUTHORING.md` §5 promises that outlined type is offered back as an **outline row** you
tick to get an editable line over it. That road opens for "a group of two or more path/polygon
shapes" - which is Illustrator's shape, one `<path>` per glyph.

**Figma flattens a whole text layer into ONE compound `<path>`**, every glyph a subpath of the
same `d`. So a Figma export with "Outline text" left ticked - the checkbox a designer leaves on
because it makes the file look identical everywhere - imports pixel-perfect with **nothing
editable and no outline rows at all**. The door says "the type was probably turned into outlines…
The next step shows two ways to get editable text", and the next step then shows one way.

Repro: `figma-outline-text-title-card`. Sweep row: 0 outline rows, 0 fields, exports clean.

The fix is to also offer a lone `<path>` whose `d` has many subpaths, which changes what an outline
candidate IS (a path, not a group) and therefore touches `outlineCandidates`, `MapSvgFieldsStep`'s
`measureOutline`, and the generator's hide rule - three files, hence filed rather than fixed here.
Until it exists the honest interim is to name the Figma checkbox in the no-layers message.

**Interim shipped 2026-08-28** (the owner's walk ruling): the door's no-layers message now names
both export checkboxes and recommends re-export, and an all-outlined file no longer offers "Draw
a field on the artwork" - a drawn box could only land ON TOP of the outlined type with nothing
removing the shapes under it. The lone-compound-path recovery road itself stays filed.

### 2. A Figma-placed picture is never a picture field

Figma never writes a positioned `<image>`. A placed raster is a `<rect fill="url(#pattern0)">`
whose `<pattern>` `<use>`s an `<image>` parked in `<defs>`. `<pattern>` is in `NON_RENDERED_TAGS`,
so `isOffered` rejects it and the picture road never opens for the shape Figma actually produces.

Repro: `figma-embedded-raster-card` - 0 picture rows where the designer expects 1. The image does
ride into the graphic verbatim; it just cannot be swapped by an operator.

### 3. A millimetre Inkscape document lands at 18% size

Inkscape defaults new documents to millimetres. `inkscape-millimetre-scorebug` is
`width="338.66666mm" height="190.5mm" viewBox="0 0 338.66666 190.5"` - a full 1280 × 720 page at
the 96dpi the SVG spec fixes. `measureSvg` reads the viewBox's user units as pixels, so the door
reports **339 × 191** and a full-page design is placed as a postage stamp on a 1920 × 1080 frame.

The unit is on `width`/`height` and is simply not converted. This is the first file shape a
student is likely to bring.

### 4. An Illustrator rounded rectangle cannot be the panel that grows - FIXED 2026-08-28

**Fixed on the owner's walk feedback, same day**: `panelPathGeometry` (assets/svgImport.ts)
reads a `<path>`'s data and admits a single closed axis-aligned rectangle - rounded corners
included - to the growth inventory beside `<rect>`; the runtime grows one by shifting the far
half of its points past its middle (`svgShiftPathD`), so the drawn radii survive verbatim. The
same walk fixed three siblings: the ladder dropdown reading as dead on this file (it was this
finding - every option degraded to shrink), unitless `letter-spacing` dropping to `normal` when
the SVG is inlined into HTML (normalized to px at import), and decorative END CAPS - a narrow
shape hugging the panel's far edge bounds the text without penning the line, and travels with
the growing edge. Pinned by four new cases in `e2e/import-svg.spec.ts`. The original finding:



`docs/SVG_AUTHORING.md` §4 says "Draw the panel as a **rectangle** if you want it to grow: a
freeform shape has no width to change." A designer who does exactly that, in Illustrator, with
rounded corners, gets a `<path>` - Illustrator does not write `rx`. The growth inventory collects
`<rect>` only, so the widest thing left is the 10px accent bar, and the fit ladder silently falls
back to **shrink** on the archetypal premium lower third.

Repro: `effects-gradient-shadow-lower-third` - the ladder defaults to "the text gets smaller" on a
banner the owner's own 2026-08-26 ruling says should get wider. The advice in the doc is
unfollowable in the tool most of these files come from.

### 5. The growth default reads "banner" on four shapes that are not banners

The measured default (plan §3, THE HUG) proposes growth wherever a wide-enough rectangle holds
stacked start-anchored text - `grow-xy`, the whole ladder, since 2026-08-29. That is right for a
lower third and wrong for these, all of which default to growing:

- `effects-figma-masked-reveal` - the text is inside a `<mask>`; widening the panel past the mask
  buys nothing, and the mask is not in the measurement.
- `figma-nested-frames-quiz-board` - a board's layout IS the design (plan: "a quiz BEHAVIOUR
  refuses the default") but no behaviour is declared by the time the default is measured.
- `ticker-strip-3840` - a strip already as wide as the frame.
- `nested-svg-sub-artboard` - a sub-artboard with its own coordinate system.

Lowest severity of the five: the owner ruled that growing is the right default where geometry is
unambiguous, and the author can change it in one click. Worth measuring against, not worth a rule
that makes the ordinary case worse.

## Also observed, not a defect

- The **fit-to-frame** rule is undocumented for the oversize case: a 3840 × 120 ticker is reported
  at its fitted 1920 × 60. `docs/SVG_AUTHORING.md` §2 covers a *smaller* artboard and says
  "NoaCG never rescales your geometry behind your back", which reads as contradicting it. The
  behaviour is right (vector, nothing lost); the page should say so.
- Neither `import-svg.spec.ts` nor `import-svg-behaviour.spec.ts` is in the sprint FOCUS list
  (`scripts/e2e-lists.mjs`) even though the SVG road is the NOW goal. `import-svg-corpus.spec.ts`
  was added there; the 2180-line sibling was deliberately left out on merge-latency grounds.

## Owner ruling, 2026-08-28 (walk): the outline road

Do not build outline-text recovery now. The door's detection and re-export advice are right and
stay the recommended path. As a FALLBACK ONLY - for a designer who will not re-export - reuse the
raster workflow (erase the area under the flattened text, place an editable field over it), with
honest words that the result may not satisfy. Low priority, owner's words: "I wouldn't want to
put a lot of time on this right now but we could offer it as a fallback just in case." The
current half-built offer (adds text ON TOP without removing the drawn text) is worse than no
offer and is part of the fitting-defects task spawned the same day.
