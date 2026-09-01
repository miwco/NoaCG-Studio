# 2026-09-01 - B: one semantic item, one field (SVG import)

Branch `claude/b-svg-one-field-per-item`, four commits off `6887d527`.

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

**Two defects found while verifying, both real, both fixed.** An Inkscape design lost its entire
typography the moment the editor parked it - three layers drawn at 56, 30 and 22px all painting at
the browser's default 16 in the fallback face, because Inkscape keeps every declaration inline and
a graphic resets by clearing its inline styles. And `xml:space="preserve"`, which Inkscape writes
on every text it saves, turned the emitted template's own indentation into text the ladder
measured: a 22px strap reported 624 units of drawn width against its real 152 and a 56px name
reported more than its panel is wide, so nothing contained it, it measured no room, the panel grew
to its cap at rest and the name shrank to the floor before anybody typed. Inline declarations now
move onto classes at import, and the idle attribute is dropped where it does nothing.

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

- `npm run build` green on `df659298`.
- `e2e/import-svg.spec.ts` + `import-svg-corpus.spec.ts` + `import-svg-behaviour.spec.ts`: 82
  passed, run on the code as committed at `df659298` minus the two cosmetic simplifications made
  after it (a helper extraction in `dropIdleSpacePreserve` and a comment). The affected plan
  (`npm run test:e2e:affected --focus`) was still queued behind another checkout's suite when this
  was written - **UNVERIFIED at the time of writing**; the branch is queued for landing, and the
  landing job runs the gate on the integrated sha itself.
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
