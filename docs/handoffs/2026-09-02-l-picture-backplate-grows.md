# 2026-09-02 - session L - one element, two candidate roles

Branch `claude/l-picture-backplate-grows`, five commits off `7072febe`. Sweep finding 7 is closed:
a shape you filled with a photograph is offered as a picture field **and** as the panel that grows,
and a designer never has to choose between the two promises `docs/SVG_AUTHORING.md` makes them.

## What landed

**The fixture first, and it failed.** `e2e/fixtures/svg-corpus/figma-photo-strap-backplate.svg` is
a Figma name strap whose backplate IS the photograph (`<rect fill="url(#pattern0_51_204)">`), with
the name and role set on it and a 10px amber tab down its left edge. No corpus file drew that
shape - re-checked rather than assumed, since session E added fixtures after finding 7 was
written: only `figma-embedded-raster-card` and `illustrator-embedded-image-card` carry a pattern
fill at all, and in both the picture is a small square inside a much wider panel. Measured on this
branch's own build before the fix: one picture row, the ladder on `shrink`, and the single option
the growth picker could offer was **`Accent - 10 x 180`**. That is finding 7 verbatim.

**The fix: one element still carries one marker, but a marker may now name two roles.** The panel
inventory (`src/assets/svgImport.ts`) takes a rect or panel-shaped path that already carries an
`iN` picture marker and REUSES it rather than minting `sN`.

Finding 7 proposed exactly that, and I checked the alternative before taking it. The other design
is a second marker per element - and it fails on the thing every surface actually does: they all
address a candidate by its exact marker value (`[data-noacg-candidate="i3"]`, in six files), so a
second marker would have to be a space-separated list and would break every one of those
selectors. Reusing the id resolves to the same element in either role for free. Uniqueness is
unchanged, because an id is minted once per ELEMENT and never per role. And the two roles bind
different NODES anyway: growth stamps the rect (`data-noacg-el`), the picture field takes the id
of the `<image>` the pattern resolves to. The reasoning is written where the marker is assigned,
as the task asked.

**Three surfaces assumed a candidate id appears in exactly one inventory.** Found by grepping the
marker prefixes across `src/` rather than by guessing:

- `proposeFollowers` (MapSvgFieldsStep) - deduped. The code review found this was worse than a
  duplicate row: `hits.filter((h) => !hits.some((o) => o !== h && o.el.contains(h.el)))` drops an
  element that appears twice, because `Node.contains` is true for itself, so a dual-role follower
  would have vanished entirely.
- `svgPickable` (CreationWizard) - deduped, so the canvas hit-test is not handed two identical
  rects to break its depth tie-break on.
- `pickLayer` (MapSvgFieldsStep) - **a DRAG on a shape now means growth**, decided before the
  binding kinds. Without it a plain click on a dual-role backplate toggles the picture and the
  panel can never be picked on the artwork at all. A drag already carries an axis, which only
  growth has a use for; for every other shape this is exactly what happened before.
- `draft.ts`'s candidate lookups needed nothing - each is a `find`/`some` over the union.

**The gate.** A dedicated case in `e2e/import-svg-corpus.spec.ts` walks the file, asserts both rows
are offered, reads the growth answer BEFORE and AFTER the picture is ticked (the marker is assigned
at import, so the two were never a choice), exports it, then builds the project and asserts the
emitted graphic carries the growth stamp on the rect beside `id="f2"` on the `<image>` - and swaps
and clears the field, which is the path session E fixed tonight (`xlink:href` vs `href`) and which
is intact. The sidecar also gained a `growthShape` column, read by the whole-corpus loop: the
ladder answer alone cannot tell a real panel from a hairline, since both read `grow-x`.

## Verified

- `npm run build` green after every step.
- `node scripts/check-catalog-emit.mjs`: **504 designs still emit byte-identically**, twice.
- `npm run check:shared-instructions`: the wizard instruction chain went in at 110050 bytes and
  came out at **110048** - byte-neutral-or-smaller, paid for by tightening prose around the rule.
- **The whole corpus re-ran and no row moved.** CI run 33564304084 planned from the fork point,
  and its plan included `import-svg-corpus.spec.ts`, `import-svg.spec.ts` and
  `import-svg-behaviour.spec.ts`; all NINE E2E shards, the catalog calibration gate and the CI gate
  passed. Read job by job, not from the top-line colour: an ordinary push plans from the previous
  push, so a green run whose shards were skipped proves nothing.
  Two later pushes each planned and passed their own shards - the last, run **33566859920** on
  `45cb8836` (the `/check` commit, the final sha), planned `import-svg-corpus.spec.ts` again and
  passed all four shards plus Build, Factory gates, the catalog calibration gate and the CI gate.
- **In a browser, on this worktree's own build** (`npm run dev:worktree` on port 5270, confirmed
  against `node scripts/dev-port.mjs` - not the harness preview, which serves the wrong checkout):
  both rows offered, the growth control naming **Strap backplate** before and after the picture is
  ticked, the marker table reading `i0:rect#Strap backplate` / `s0:rect#Accent`, and the built
  graphic operated over its real runtime - a long name takes the strap from 980 to 1197 wide at
  full type size, and the picture swaps to a new PNG and restores the drawn one on an empty value.

## The check

- **review: delegated** - the code-review skill at level `high` returned findings on this branch
  and this file set (scope-checked against the phase-1 diff). Five findings, all verified against
  the surrounding code: four fixed, one recorded rather than fixed (below).
- **simplify: inline** - the skill returned fan-out instructions rather than a result, so the four
  angles were covered here. One change: a three-way ternary in the corpus loop became an if-chain.
  The reuse angle found a real observation left as a report - five places build the
  "every inventory" union (`proposeFollowers`, `labelOfCandidate`, `svgPickable`,
  `svgCandidateExists`, the poll bar picker) and three of them use a different ORDER, so a shared
  helper would silently change one of them for no correctness gain.
- **verify: inline** - build, the catalog emit gate, the instruction-chain check, CI, and the
  browser walk above, all re-run after the review's fixes.

What the review changed: the 12-slot cap on panel shapes now counts the two kinds separately (a
file with twelve photo tiles wider than its panel would otherwise have pushed that panel out of
the growth list silently); a dual-role shape now reads the same NAME in both lists (`numberRepeats`
numbers picture rows in place and skips shapes, so the same backplate could read "Backplate 2" in
Pictures and plain "Backplate" in the growth picker); the `growthShape` column moved out of the
ladder guard, where a fixture on the findings list would have passed green with it never running;
and `src/components/wizard/AGENTS.md` now states the exception to "picking the growing panel with
no drag turns it off", which is unreachable on a dual-role shape.

## Left open, deliberately - and the question for the owner

**The photograph STRETCHES when the panel grows.** Read off the emitted graphic:
`<pattern patternContentUnits="objectBoundingBox" width="1" height="1">` with `patternUnits`
defaulting to the same, so one tile IS the shape's bounding box and a wider rect paints a wider
photograph rather than more of it. Measured, not inferred: 980 -> 1197 wide at an unchanged 180
tall, with the picture spanning the whole of it.

That geometry is the exporter's, and `preserveAspectRatio` cannot reach it - the anisotropy is in
the bounding-box mapping, not in how the raster fits its own viewport - so covering instead of
stretching means rewriting the pattern every imported Figma picture is painted through, which
would move every existing picture too. It is a much larger change than this one and I did not make
it. What it replaces is worse: before this the panel could not grow at all and a long name shrank
instead. A texture, a gradient wash or a blurred backdrop takes the stretch invisibly; a face does
not, and the authoring guide now says so.

**The question, per the brief, is in this file rather than asked:** if the owner would rather a
grown photo panel CROPPED than stretched, that is its own piece of work and wants filing. The
owner-queue item names it as the one thing to judge rather than check.

Findings 1 and 5 in the backlog remain parked by owner ruling and were not touched.

## Landing

CI green on every push, jobs read individually. `main` moved several times while this ran, so this
branch has NOT taken it in - the landing job integrates and gates on the integrated sha, which is
the point of the queue. Queued with `/queue-merge`; nothing committed after queueing.

**One process note worth keeping.** This session stopped once with the branch green, five commits
ahead and NOT queued, because it was waiting on a CI run to finish - and a session cannot be woken
by the run it is waiting on, so waiting is the one thing that guarantees the work never lands. The
coordinator had to restart it. `gh run watch <id>` is bounded and is the thing to use; ending a
turn mid-wait is not.

The check verdict stamp is at
`<git-common-dir>/noacg-jobs/checks/claude-l-picture-backplate-grows.json` (per-machine state,
never committed). Its `reviewedSha` is `45cb8836` - the commit the check actually ran on. The only
commit after it is this handoff, which adds no code.
