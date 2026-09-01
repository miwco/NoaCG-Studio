# 2026-09-01 - B: one semantic item, one field (SVG import)

Branch `claude/b-svg-one-field-per-item`, eight commits, integrated with `origin/main` at
`3190d61b` (session A's SVG import clarity work) and gated on the integrated sha `ef766f44`.

## What landed

**The rule.** A `<text>` you pressed Return inside is ONE operator field, and NoaCG wraps it into
the room the design drew. Across a baseline the GAP still decides - two labels placed apart are
two fields, a kerned line's runs are one - and two separate `<text>` objects are two fields
whatever they look like. A `<text>` that has both (several baselines and a gapped one among them)
is a composed block and falls back to the old per-segment reading. Stated in
`docs/SVG_AUTHORING.md` §3 with its condition, and in the RUN PROBLEM comment in
`src/assets/svgImport.ts`.

The drawn lines are stamped with `data-noacg-line`, the same marker the fit runtime already puts
on lines it paints, so the artwork stays exactly as drawn while the value reads back whole. That
forced three measurement corrections in `src/templates/importedDesign/svg.ts`:

- a block's drawn width is its widest line, not the sum of its lines (the old reading produced a
  budget floor three lines wide, which nothing could overflow);
- the room is re-measured from the drawn lines every pass - measured from the previous pass's
  painted block, a question drawn on three lines and first fitted onto two reported two lines'
  worth of height as its room, and each pass shrank it again;
- the line-count ceiling counted a block of n lines as n line steps rather than (n-1) steps plus
  one line's own box, so a block drawn to fill its space was offered one line fewer than it needed.

### The two defects nobody knew about, found chasing the third field

Session A handed over, and the owner asked by name, that the third text field of
`inkscape-lower-third-layers.svg` "does not wrap". Chasing it turned up two defects that had
nothing to do with wrapping and everything to do with why that file looked wrong. Both are real,
both are fixed, and neither had ever been seen because **the exporter sweep passed this file as
clean**: it measured what the importer READ, and nothing had ever looked at the type the graphic
RENDERED.

**1. An Inkscape design lost its entire typography the moment the editor parked it.** Inkscape
keeps every declaration inline - `style="font-size:56px;font-family:Archivo;fill:#ffffff;..."` on
each `<text>`, and nothing in a `<style>` block. A graphic returns to its CSS rest by clearing its
inline styles (`noacgResetGraphic`, `clearProps: 'all'` over the whole root subtree), and that
cannot tell an animation's leftover transform from a declaration the designer wrote. Measured: all
three layers, drawn at 56, 30 and 22px, painting at the browser's default 16 in the fallback face.
This area's own contract already says "classes, never inline styles" for the drawn states - the
import was the thing violating it - so every inline declaration now moves onto a class at import,
in a stylesheet appended last.

**2. `xml:space="preserve"` made the emitted template's own indentation into text the ladder
measured.** Inkscape writes it on every text it has ever saved; the template is emitted and
FORMATTED, which re-indents the inlined artwork, and a `<text>` that held "OPPILAS-TV" then held a
newline, fourteen spaces, the word and a newline more - every one of them real. Measured: the 22px
strap reported 624 user units of drawn width against its real 152, and the 56px name reported more
than its panel is wide, so no shape contained it, it measured NO ROOM AT ALL, the panel grew to
its cap at rest and the name shrank to the readability floor before anybody typed a character.
The attribute is now dropped exactly where it does nothing - an element whose text already
collapses to itself. A file that really did space something out keeps it, and keeps its literal
sample value with it.

**And the answer on the third field.** It is CORRECT that it does not wrap for the values that
made the owner look. Verified on the live graphic, at the drawn 22px, with the fixed file: the
ladder's ratified order is fill the room, grow the panel, wrap, shrink - so a strap the widened
panel can still hold stays on one line, by design. Past the width the frame's safe margin allows,
it does wrap, at the size the designer drew and without being reported as too long. That is pinned
in `e2e/import-svg.spec.ts` ("an Inkscape design keeps the type it was drawn in"), which walks
both rungs. What the owner was actually seeing was defect 2 above: a strap in the wrong face at
16px on a panel stretched to four times its drawn height. Nothing about the wrap rule needed
changing; the room it was measuring was wrong.

**The sample library.** `audience.svg`, `info-card.svg` and `public-info.svg` each drew a
paragraph as one text layer PER LINE - the structure the authoring page now tells designers not to
draw. Each is one object now. The quiz-board fixture's question was broken at two thirds of the
card's width, leaving the card half empty; it is broken where it reaches the width. `scorebug.svg`
described its two side-by-side notes as "stacked lines", which is the wrong idiom for what it
draws.

**`scripts/svg-samples-check.mjs`** now also reads each file the way a design app opens it: the
artboard it states, whether every row its Layers panel will show is named from the file, whether
its pictures are embedded, and whether it carries markup Illustrator or Inkscape warns about. The
authoring page promises these files open for a student to take apart, and nothing measured that.
It found two unnamed text objects (`scorebug`, `illustrator-export`); both are named, 23/23 pass.

## What is NOT done

- **No way to JOIN two separate text objects into one field.** The owner asked what the right
  workflow would be; nothing was built (the brief forbade a second mechanism this session).
  **Recommendation:** do not build a join. Two objects is the designer's own statement that they
  are two things, and a join in the mapping step would make the operator's field list depend on a
  choice nobody can see in the artwork afterwards. What the case needs is the mapping step SAYING
  so - "these three layers look like one paragraph; that is three fields, and here is how to draw
  it as one" - pointing at the file, which is where the fix belongs and where it survives a
  re-export. That is a wizard-step change and belongs to whoever owns `MapSvgFieldsStep.tsx`.
- **The 2026-09-01 sample edits have not been walked through the app**, only re-measured by
  `svg-samples-check` and covered where a spec touches them (`info-card` now has one). Said out
  loud in `docs/svg-samples/README.md` rather than left implied.
- **The reset is still the shallower fix.** `noacgResetGraphic` clears every inline property on
  the subtree rather than the ones the animation wrote; hoisting inline styles at import works
  around that for imported artwork only. The deeper fix is in `templates/shared/animRuntime.ts`
  and serves every template family. Not attempted here - it is the shared runtime.
- **The grow-vs-shrink audit produced a finding, not a change**:
  `docs/backlog/svg-growth-default-across-exporters.md`.

## Verification

- `npm run build` green.
- `e2e/import-svg.spec.ts` + `import-svg-corpus.spec.ts` + `import-svg-behaviour.spec.ts`: **82
  passed** locally.
- `e2e/catalog-baseline.spec.ts`: **4 passed** after re-recording. The emit really did move and had
  to: exactly one hash, `svg01`'s `js`, with its `html` and `css` byte-identical and no other
  design in the catalog touched. That failure is what the first affected run was reporting, with
  its suite log already rotated away - found afterwards in `test-results/`, which is why it is
  worth saying: a background run whose summary line survives and whose log does not tells you
  nothing until you go and look at the artifacts.
- **Integrated with `origin/main` at `3190d61b` and re-gated on the integrated sha `ef766f44`.**
  `e2e/import-svg.spec.ts` is the one file both sessions touched; the merge was read rather than
  trusted (both sides' tests present, no duplicate titles, typecheck clean) and then **89 passed**
  on the integrated tree - `import-svg`, `import-svg-corpus`, `import-svg-behaviour` and
  `catalog-baseline` together, covering A's new mapping-step tests and this branch's four.
- The full local affected plan is **54 spec files**, and the machine had two other checkouts'
  suites (92 and 54 specs) queued ahead of it. It was enqueued twice, never reached a slot, and
  was stopped rather than left to occupy the machine for an hour - CI does strictly more on a
  clean checkout in about ten minutes, which is the repo's own rule for this. **So the specs
  outside the four run locally are verified by CI and by the landing job's gate on the integrated
  sha, not on this laptop.**
- **Two CI runs on this branch are NOT verdicts and must not be read as ones.** `33525272787` (the
  full dispatch) was CANCELLED by a later docs-only push, and `33525427089` is green with every
  E2E shard SKIPPED - an ordinary push plans from the previous push, so a small second push plans
  only itself. The run that covers the real change is **`33526038272`**, a `workflow_dispatch` on
  `ef766f44` asking for the full suite. Read its JOB LIST, not its colour.
- `/check` verdict stamp written to
  `.git/noacg-jobs/checks/claude-b-svg-one-field-per-item.json`: review `delegated` (9 findings,
  9 fixed), simplify `inline` (the skill returned fan-out instructions, so by the workflow's own
  rule the pass had not run and was done by hand), verify as above.
- Three new specs in `e2e/import-svg.spec.ts`: the one-field rule and its wrap, the Inkscape
  design keeping its type, and a wrapping block keeping its leading. No new spec FILE (session A
  owns `scripts/e2e-lists.mjs` this wave).
- Owner queue: `docs/acceptance/owner-queue/2026-09-01-b-one-question-one-field.md`.

## Cost, and the delegation grade

The wave leg cost one Antigravity call that returned nothing and one that returned a wrong answer.

`gemini-3.7-flash-high`, `--mode plan`, task class comprehension, two calls:

- **Call 1 (32 s, empty response, billed).** It needed the `command` permission headless mode
  cannot prompt for, and the harness auto-denied it. The wrapper's own error text names the fix;
  the cheaper fix was to enumerate every file by absolute path in the prompt so only `read_file`
  was needed. Worth knowing before delegating a read that starts with "look in this directory".
- **Call 2 (222 s, 299 K in / 35 K out / 5.3 M cache read).** It returned a complete, confident
  20-row table deriving what `proposeBannerGrowth` would answer from the markup - and it is wrong
  on at least four rows, because it reconciled its geometry with each sidecar by ASSUMING the quiz
  behaviour veto fires wherever a quiz is drawn. The repo already holds the measured answer for
  exactly those rows (`GROWTH_FINDINGS` in `e2e/import-svg-corpus.spec.ts`) and it disagrees. One
  finding survived re-derivation: `illustrator-rotated-sidebar-strip` is rejected only by its
  right edge landing at 95.2% of the frame against a 94% rule, so the same block composed 25px
  further in would be proposed as a growing banner.

**Grade: poor for this task class.** The failure is instructive rather than random: the question
had a measured answer in the repo and the worker was asked to derive it from source instead, so it
produced a plausible derivation and reconciled every disagreement away. Recorded with
`scripts/delegation-outcome.mjs` as `first-pass=no`, 4 defects, 1 retry, redone by the parent. The
routing lesson: **when the repo already measures the thing, delegate reading the MEASUREMENT, not
re-deriving it** - a worker asked to derive will always produce a derivation, and its confidence
carries no information about whether it matches the product.

## Where to pick it up

Nothing is half-done. The two open threads are the join-workflow recommendation above (a wizard
change, not this branch's) and the deeper reset fix in the shared animation runtime.
