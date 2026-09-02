# SVG import: what the exporter sweep found

Measured by walking the corpus through the real Import door in the app
(`scripts/svg-import-sweep.mjs`, corpus and method in `e2e/fixtures/svg-corpus/README.md`). Every
file is shaped the way Illustrator, Figma, Inkscape, Affinity, Sketch, CorelDRAW or an SVGO run
really export, and every expectation is written from the designer-facing promise in
`docs/SVG_AUTHORING.md`, never from `src/assets/svgImport.ts` - so a disagreement here is a
finding rather than a tautology.

**2026-08-28, 20 files.** Nothing crashed and nothing was refused that should have imported; all
20 reached Finish and passed the export gate. Six defects were small and clear and were fixed
that day; five were structural and are filed below.

**2026-08-29, 34 files** - twelve added to cover exporter envelopes, removal promises, print
units, optimizer output, centred text, group transforms, duplicate ids, hidden-layer idioms and
the picture control. **23 pass, 11 partial, 0 fail.** Again nothing crashed, and again nothing
was refused that should have imported. Nine of the twelve new files were clean on their first
walk, which is the useful headline: the road holds on a much wider spread than it had been shown
to. The other three produced one new defect (finding 6), one repro of finding 3 in a second unit,
and one expectation of mine that was wrong and was corrected in its sidecar with the reasoning.

> **Which build that sweep drove.** It ran from a worktree, and `preview_start` serves the
> session's ORIGINAL checkout rather than the isolated worktree - so the app under test was
> main's importer, not the branch's. That makes the run a clean BEFORE baseline (which is what
> it is used for above, and why finding 3 reproduces in it) and no test of the fixes on the
> branch; those are proven by `e2e/import-svg-corpus.spec.ts`, which starts its own server from
> the checkout it lives in. The sweep now takes `--base` so it can be pointed at the right
> server, but the guard hook still refuses a hand-started dev server, so a worktree session
> could not then produce an AFTER sweep.
>
> **Fixed 2026-09-01.** `npm run dev:worktree` serves the checkout it ships in, on that
> checkout's reserved port, which is the number this sweep's default `--base` already derived -
> so a worktree session produces an AFTER sweep by starting one and running the sweep with no
> flags. The sweep now also prints the server it drove on its first line, so no later run has to
> be reasoned about afterwards to find out which build it measured. Recipe in docs/DEV_PORTS.md,
> "Starting a dev server".

## The table

Every note left is one of the findings below - re-run the sweep and the notes should be exactly
these.

| Family | Fixture | Verdict |
|---|---|---|
| illustrator | `illustrator-internal-css-lower-third` | clean |
| illustrator | `illustrator-kerned-headline` | clean - kerned runs bind as ONE field |
| illustrator | `illustrator-quiz-board-multiline` | clean - stacked tspans bind one field per line |
| illustrator | `illustrator-mixed-outlines` | clean - live text beside an outline row |
| figma | `figma-frame-export-lower-third` | clean |
| figma | `figma-nested-frames-quiz-board` | clean |
| figma | `figma-outline-text-title-card` | **finding 1** - no outline rows, no recovery |
| figma | `figma-embedded-raster-card` | **finding 2** - no picture field (FIXED 2026-09-01) |
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

Added 2026-08-29:

| Family | Fixture | Verdict |
|---|---|---|
| illustrator | `illustrator-save-as-foreignobject` | clean - Save As imports; the DTD entities parse and the switch's drawing survives its foreignObject |
| illustrator | `illustrator-rotated-sidebar-strip` | clean - a quarter-turn matrix and a 70% group both bind |
| illustrator | `illustrator-embedded-image-card` | clean - **1 picture row**, the control for finding 2 |
| figma | `figma-centred-title-card` | clean - text-anchor:middle throughout |
| figma | `figma-duplicate-ids-scorebug` | clean - four fields, the repeat numbered |
| inkscape | `inkscape-hidden-state-layers-quiz` | clean - inline-style hidden layers skipped, including the two carrying words |
| effects | `effects-smil-animated-bug` | clean - SMIL removed, both text layers survive |
| effects | `effects-css-import-webfont` | clean - the @import and the url() are removed and reported |
| geometry | `geometry-optimized-no-ids` | clean - three fields, honestly numbered, from a file with no names at all |
| geometry | `geometry-percent-viewport-strap` | clean - a percentage is not a size |
| affinity | `affinity-point-sized-nameplate` | **finding 3** in points - lands at 960 × 540 |
| geometry | `geometry-unescaped-ampersand` | **finding 6** - refused, correctly, by a message that teaches nothing |

Added 2026-09-02:

| Family | Fixture | Verdict |
|---|---|---|
| figma | `figma-photo-strap-backplate` | the repro for **finding 7**, minted with its fix - one picture row AND the same shape offered as the panel that grows |

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

### 2. A Figma-placed picture is never a picture field - FIXED 2026-09-01

Figma never writes a positioned `<image>`. A placed raster is a `<rect fill="url(#pattern0)">`
whose `<pattern>` `<use>`s an `<image>` parked in `<defs>`. `<pattern>` is in `NON_RENDERED_TAGS`,
so `isOffered` rejected it and the picture road never opened for the shape Figma actually
produces. Re-measured on 2026-09-01 before the fix, on the branch's own build: **0 picture rows**
for `figma-embedded-raster-card`, 1 for the `illustrator-embedded-image-card` control.

**Fixed by RESOLVING the reference, not by widening `NON_RENDERED_TAGS`** - that set is right,
and widening it would offer every unused symbol and clip shape in a file as a layer.
`patternFillImage` / `svgPictureTarget` (`svgImport.ts`) follow `fill="url(#patternN)"` ->
`<pattern>` -> `<use>` -> `<image>`, and the candidate collection now offers a shape painted that
way beside a plain `<image>`.

**The candidate and the binding target are deliberately different nodes.** The row is offered on
the RECT - it carries the layer name ("Guest photo") and it is what the mapping step's hover
highlight can measure; the `<image>` in `<defs>` is named `image0_44_612` and has an empty box.
The field then binds that `<image>`, because it is the only node whose href changing repaints the
shape, and stamping `id="fN"` there makes the existing `setFieldValue` picture branch swap and
restore it with no new runtime and no churn in the emitted code of every shipped template. Taking
the id keeps the references (`setIdKeepingRefs` in `templates/importedDesign/svg.ts`): the
pattern's `<use>` points at the picture by id, so a bare rename would leave the rect painting
nothing. One row per PICTURE, not per shape - two shapes filled from one pattern paint one
`<image>`, and a second row would promise a swap that moved the first row's picture too.

**A second defect fell out of measuring the restore, and it was never Figma-specific.** Both
exporters write the picture reference as SVG 1.1 `xlink:href`, and `update()` remembers and
rewrites the SVG 2 `href`. Measured over that runtime verbatim: `data-orig-href` is remembered as
`""`, so the swap paints (a browser prefers `href`) and CLEARING the field writes `href=""` -
the row's own promise, "an empty swap field keeps the picture you drew", failing only on the
second click, on **every** SVG picture field in the product. The bound picture node is now
normalized to one spelling at bind time (`normalizePictureHref`), which also keeps one base64
payload in the export instead of two.

Pinned by two cases in `e2e/import-svg-corpus.spec.ts` - the Figma file and the Illustrator
control, each walked to the export gate and then operated (swap, then clear) on the emitted
template. Measured on top of that, and not pinned because a screenshot comparison is the wrong
thing to keep in a focus spec: the rect really PAINTS (a 41 × 41 box in the preview), the swap
repaints it, and clearing restores the drawn picture pixel for pixel.

### 3. A millimetre Inkscape document lands at 18% size - FIXED 2026-08-29

Inkscape defaults new documents to millimetres. `inkscape-millimetre-scorebug` is
`width="338.66666mm" height="190.5mm" viewBox="0 0 338.66666 190.5"` - a full 1280 × 720 page at
the 96dpi the SVG spec fixes. `measureSvg` read the viewBox's user units as pixels, so the door
reported **339 × 191** and a full-page design was placed as a postage stamp on a 1920 × 1080
frame. The unit was on `width`/`height` and was simply not converted.

**Fixed in `svgImport.ts` `measureSvg`**, with `svgLength` reading the unit and
`PHYSICAL_UNIT_PX` carrying the 96dpi table (pt, pc, in, cm, mm, q). The conversion is
deliberately narrow: it fires only when the viewBox's extent MATCHES the number stated on
width/height, which is what says *one user unit is one millimetre*. Three cases stay exactly as
they were, and each has a fixture:

| File | Says | Reads as | Why |
|---|---|---|---|
| `inkscape-millimetre-scorebug` | `338.66666mm`, viewBox `338.66666` | **1280 × 720** | the user unit IS the millimetre |
| `affinity-point-sized-nameplate` | `960pt`, viewBox `960` | **1280 × 720** | the same, in the other print unit |
| `geometry-percent-viewport-strap` | `100%`, viewBox `1920` | 1920 × 1080 | a percentage is not a length |
| a design drawn big, output small | `10cm`, viewBox `1920` | 1920 × 1080 | the numbers disagree, so the 1920 was meant |

The point file exists so the answer cannot be a millimetre special case - a hardcoded mm factor
passes the first row and fails the second while looking exactly as fixed. Pinned by
`e2e/import-svg-corpus.spec.ts` ("a print-unit page arrives at its real pixel size" and its
guard case).

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

### 5. The growth default reads "banner" on shapes that are not banners

The measured default (plan §3, THE HUG) proposes growth wherever a wide-enough rectangle holds
stacked start-anchored text - `grow-xy`, the whole ladder, since 2026-08-29. That is right for a
lower third and wrong for these, all of which default to growing:

- `effects-figma-masked-reveal` - the text is inside a `<mask>`; widening the panel past the mask
  buys nothing, and the mask is not in the measurement.
- ~~`figma-nested-frames-quiz-board`~~ - **struck 2026-09-01.** Walked by hand it arrives on
  `shrink`, which is what its sidecar states, so it is not a repro of anything. It is now an
  ordinary pinned row; while it sat in the gate's exclusion list the gate was silently not
  checking it.
- `ticker-strip-3840` - a strip already as wide as the frame.
- `nested-svg-sub-artboard` - a sub-artboard with its own coordinate system.

**The list was four until 2026-08-29, and it was two short.** `e2e/import-svg-corpus.spec.ts`
now walks every corpus file and checks the answer it arrives on against its own sidecar - until
then only this sweep read that column, and a sweep nobody runs on a commit cannot keep a count
honest. The gate found `inkscape-flowed-text-card` and `student-illustrator-quiz` doing the same
thing, the second of them a quiz board, which is the archetype this finding is about. It also
struck one: `figma-nested-frames-quiz-board` had been named here since the first sweep and does
not do it. **Five repros**, same finding, same severity.

Lowest severity of the five: the owner ruled that growing is the right default where geometry is
unambiguous, and the author can change it in one click. Worth measuring against, not worth a rule
that makes the ordinary case worse.

### 6. A file broken by one character was refused by a message that teaches nothing - FIXED 2026-08-29

`geometry-unescaped-ampersand` is an ordinary Illustrator export with a Google Fonts `@import`
pasted into its `<style>` block, ampersand and all. An SVG is XML and a bare `&` opens an entity
reference, so the document stops being well-formed at that character - correctly refused, and no
browser would open it either.

What was wrong is the sentence. The door said *"That file could not be read as SVG - it may be
damaged or not an SVG at all"*, while the browser's own parser had already reported `error on
line 20 at column 73: EntityRef: expecting ';'` and that was thrown away. The message points at
the EXPORT, so it sends a student back to Illustrator to re-make a file that was never the
problem, and the re-export will contain the same paste.

**Fixed in `svgImport.ts`** (`svgParseMessage`): the refusal now quotes the line, the column and
the parser's reason, and when the reason is an entity error it names the ampersand and the
`&amp;` that fixes it. Pinned by `e2e/import-svg-corpus.spec.ts`.

This was also the first time the corpus exercised the refusal road at all - the sidecar format
has carried an `"accepted": false` branch and a `refusalAbout` field since it was written, and
until this fixture not one file used them.

## Also observed, not a defect

- The **fit-to-frame** rule is undocumented for the oversize case: a 3840 × 120 ticker is reported
  at its fitted 1920 × 60. `docs/SVG_AUTHORING.md` §2 covers a *smaller* artboard and says
  "NoaCG never rescales your geometry behind your back", which reads as contradicting it. The
  behaviour is right (vector, nothing lost); the page should say so.
- **Finding 2 had a control, and the control is what made the fix small.**
  `illustrator-embedded-image-card` is the same guest card as `figma-embedded-raster-card`, drawn
  in the tool that writes a plain positioned `<image>`, and it offered its picture row all along.
  So the picture road was never broken - Figma's `<rect fill="url(#pattern)">` indirection was
  what hid it. The pair also earned its keep a second time: operating BOTH files is what exposed
  the `xlink:href` restore defect, which the Figma file alone would have made look Figma-specific.
- **The sidecars' `imageFields` column is a gate as of 2026-09-01.** It had been read only by the
  sweep, which is exactly how finding 2 sat unpinned while two sidecars stated the answer. The
  per-file walk that already checks the growth column now checks this one on the same pass, in
  both directions - a picture that stops being offered, and a shape wrongly offered as one (a
  gradient fill is also `url(#…)`, and half the corpus carries one).
- ~~**Finding 5's repro list may be one shorter.**~~ **Settled 2026-09-01**, by walking
  `figma-nested-frames-quiz-board` by hand: it arrives on `shrink`, matching its sidecar. It was
  never a repro. The exclusion was NOT harmless the way this note assumed - an excluded row is a
  row the gate does not check, so the file with the most interesting label logic in the corpus
  had its ladder answer unpinned. Struck from the finding and from `GROWTH_FINDINGS`.
- **A quiz board defaulting to growth is not universal.** `inkscape-hidden-state-layers-quiz` is
  a five-field board and arrives on `shrink`, while `student-illustrator-quiz` arrives on
  `grow-xy`. Whatever separates them is geometry, not category, which is worth knowing before
  finding 5 is answered with a rule about boards.
- Neither `import-svg.spec.ts` nor `import-svg-behaviour.spec.ts` is in the sprint FOCUS list
  (`scripts/e2e-lists.mjs`) even though the SVG road is the NOW goal. `import-svg-corpus.spec.ts`
  was added there; the 2180-line sibling was deliberately left out on merge-latency grounds.

### 7. A picture-filled backplate cannot also be the panel that grows - FIXED 2026-09-02

Filed 2026-09-01, out of the review of finding 2's fix, with no repro in the corpus - which is
why it was filed rather than built.

One element carries one candidate marker, and the picture candidates are tagged before the panel
shapes. So the moment a shape painted with a pattern was offered as a picture (finding 2), it
left the growth inventory: a Figma card whose backplate is a photo-filled `<rect>` - a
full-bleed guest card, a photo strap - offered its picture row and could no longer be picked as
the shape that widens, and the measured default was taken from whatever rectangle was left. It
applied whether or not the author ticked the picture on, because the marker is assigned at import.

**It was not a regression for anything drawn before that**: until finding 2 the shape was not
offered as a picture at all, so nobody could swap it; and no corpus file drew one,
`figma-embedded-raster-card` included (its portrait is a small square inside a much wider panel,
and the panel still wins).

**The repro was minted with the fix**: `figma-photo-strap-backplate` draws a name strap whose
backplate IS the photograph, with a 10px accent tab down its left edge. Measured on the branch's
own build before the fix: one picture row, the ladder on `shrink`, and the single shape the
growth picker could offer was `Accent — 10 × 180`.

**Fixed by letting one element hold two candidate roles** - the shape inventory takes a rect or
panel-shaped path that already carries an `iN` picture marker and REUSES it rather than minting
`sN`. One element still carries one marker; a marker may now name two roles. That is the cheap
half of the two available designs: every surface addresses a candidate by its exact marker value
(`[data-noacg-candidate="i3"]`), so the reused id resolves to the same element in either role,
while a second marker would have to be a list and would break all of those selectors. Uniqueness
is unchanged - an id is minted once per ELEMENT, never per role - and the two roles bind
different nodes anyway: growth stamps the rect (`data-noacg-el`), the picture field takes the id
of the `<image>` the pattern resolves to.

Three surfaces assumed a candidate id appears in exactly one inventory and were corrected:
`proposeFollowers` and `CreationWizard`'s pickable list dedupe by marker, and a DRAG on a shape
now means growth rather than falling through to the picture toggle a plain click still means -
without that, a dual-role backplate could never be picked as the panel on the artwork at all.
`draft.ts`'s lookups needed nothing: each is a `find`/`some` over the union.

Pinned by a dedicated case in `e2e/import-svg-corpus.spec.ts` (both rows offered, the growth
answer read before AND after the picture is ticked, and the built graphic carrying the growth
stamp on the rect beside the field id on the `<image>`), and the sidecar column `growthShape` -
which the ladder answer alone cannot cover, since a real panel and a hairline that can never grow
both read `grow-x` on the control.

**Left open, deliberately: the picture STRETCHES when the panel grows.** Read off the emitted
graphic - `<pattern patternContentUnits="objectBoundingBox" width="1" height="1">`, with
`patternUnits` defaulting to the same - one tile IS the shape's bounding box, so a wider rect
paints a wider photograph rather than more of it. Measured on the strap: a long name takes it
from 980 to 1197 wide at an unchanged 180 tall, and the picture spans the whole of it. That
geometry is the exporter's, not ours, and `preserveAspectRatio` cannot reach it (the anisotropy is
in the bounding-box mapping, not in how the raster fits its own viewport), so covering instead of
stretching would mean rewriting the pattern every imported Figma picture is painted through - a
much larger change than this one, and one that would move every existing picture too. The honest
position for now is that it is stated where a designer meets it (`docs/SVG_AUTHORING.md` §4: a
texture takes the stretch, a face does not) rather than silently traded away. The alternative it
replaces is worse: before this, that panel could not grow at all and a long name shrank instead.

## Hand walk, 2026-09-01: three Figma files, door to rendered graphic

`figma-frame-export-lower-third`, `figma-nested-frames-quiz-board` and
`figma-duplicate-ids-scorebug`, each dropped on the door, read on the mapping step and then
BUILT and looked at as a picture - which is the part no column in the table covers. All three
came out clean, and the rendered graphic matched the drawn geometry in each case. What the walk
produced:

- The one finding above: the quiz board is not a finding-5 repro, and the exclusion that assumed
  it might be was costing the gate a row.
- **The scorebug's two scores sit together on the right**, not one beside each team - and that is
  the ARTWORK. The fixture draws the score plates at x=1012 and x=1100 with the away team's name
  anchored `end` at x=1000, so the graphic renders exactly what was exported. Worth writing down
  because it reads as an import defect at a glance and is not; a real defect on this file would
  have to be a difference from the SVG, not a difference from what a scorebug usually looks like.
- **Both boards arrive on `shrink` and the lower third on `grow-xy`**, with no behaviour declared
  on any of them - which is the geometry-not-category reading the note above already suspected,
  now with a third data point.

Nothing here is a new defect, so nothing was fixed on this walk beyond the exclusion.

## Owner ruling, 2026-08-28 (walk): the outline road

Do not build outline-text recovery now. The door's detection and re-export advice are right and
stay the recommended path. As a FALLBACK ONLY - for a designer who will not re-export - reuse the
raster workflow (erase the area under the flattened text, place an editable field over it), with
honest words that the result may not satisfy. Low priority, owner's words: "I wouldn't want to
put a lot of time on this right now but we could offer it as a fallback just in case." The
current half-built offer (adds text ON TOP without removing the drawn text) is worse than no
offer and is part of the fitting-defects task spawned the same day.

## Finding, 2026-09-02: a quiz board's growth default argues with its author

The owner's own board (`illustrator-owner-quiz-board-rotated`) arrives on `grow-xy` - widen, then
wrap. His ruling for a quiz board is the opposite of the first half: *"in a quiz board, I want the
horizontal axis to be fixed, and it should grow only in the vertical axis."* A lower third wants
exactly the reverse, which is why the default cannot be right for both from one control.

It is the sixth entry on `GROWTH_FINDINGS` and the same shape as the other five: a measured
default arguing with a stated intent, kept as a repro rather than pinned as an answer. The design
that resolves it is `docs/TEXT_BOX_BINDING.md` - growth becomes a per-BOX choice on the box's own
row, so the question plate and the answer plates can differ, and the question "which shape grows?"
is never asked because the control sits on the shape.

What was FIXED on the same walk is separate and now pinned: the shape offered to grow is the
question's own plate, because a rotated rectangle is measured where it is painted
(`src/assets/svgGeometry.ts`). That is this fixture's `growthShape` column, which is deliberately
not excluded.
