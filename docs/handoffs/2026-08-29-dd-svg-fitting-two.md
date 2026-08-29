# SVG import: the wrap rung, round three

**Branch:** `claude/dd-svg-fitting-two` · **Owner item:** `docs/acceptance/owner-queue/2026-08-28-svg-import-against-real-exports.md` (stays open)

## What the owner saw, and what was actually broken

His words: *"The text does not go on new lines. But the panel does get longer. The panel doesn't
have a safe space, and the text gets smaller."*

Reproduced first, on the file he walked (`e2e/fixtures/svg-corpus/effects-gradient-shadow-lower-third.svg`),
by driving all four dropdown answers at four name lengths and recording what each rung did. The
name came out **one line in every mode at every length**, and the panel offered **zero** extra
height even under "the text wraps onto more lines". Four defects, all in
`src/templates/importedDesign/svg.ts`:

1. **Vertical growth was structurally impossible on a lower third.** `svgGrowCap` grew downward
   always and mirrored the inset from the frame's TOP onto the bottom. The sample plate sits
   130px above the frame's bottom and 760 below its top, so the cap landed 630px ABOVE the
   panel's own bottom edge - `most` came out 0, the wrap rung had nowhere to go, and the ladder
   fell straight through to shrinking, the one rung the 2026-08-26 order puts last.
2. **A wrapped line staircased out of the panel.** `svgPaintLines` set a tspan's `x` only when the
   text element carried one; Illustrator writes the position in a `transform` matrix instead, so
   the second tspan continued from where the first ended.
3. **The room downward had no margin rule.** Horizontally a line already stopped one drawn
   left-inset short of its bound; vertically the ceiling was the panel's raw bottom edge, so a
   wrapped block could paint onto it and sit hard against the line beneath.
4. **A wrapped value was read back wrong.** `textContent` concatenates tspans with nothing
   between, so the `document.fonts.ready` pass fitted "AlexandraKonstantinopolous" and settled
   somewhere the first pass never would. (Latent until the wrap actually fired.)

## What the ladder does now

- **Sideways is unchanged**: a start-anchored line gains room only to its right, so a panel still
  widens rightward, capped by the design's own left inset mirrored.
- **Downwards a panel grows AWAY from the frame edge it is anchored to** (`svgGrowDir`) - upwards
  for a lower third, so the edge the designer composed against never moves. The line stack is
  pinned to that anchored edge: each line travels by the extra height taken on the side the panel
  is not growing towards (`growSvgHeights`), so a wrapped name pushes nothing into the role below
  it and the drawn bottom padding survives.
- **Two margins, both measured off the rest pose the designer drew, neither a constant**: the whole
  gap drawn between a line and whatever is below it is kept (a name with a role under it therefore
  has no room of its own - a second line is bought by growing, never by eating the leading), and
  with nothing drawn below, the panel's bottom less the padding it keeps above its first line.
- **Furniture that spans the panel on the growing axis** (`svgCollectSpanners` - the sample's amber
  rail, drawn to the plate's own two edges) grows with it instead of leaving the gained strip
  bare; an end cap now hugs whichever edge actually moves.
- **The mapping step's measured default is the whole ladder** (`grow-xy`), not its first rung. The
  owner walked the file without touching the dropdown, and "wider" alone skips the wrap by
  definition. Where the artwork has no room to grow taller the runtime grants zero and the graphic
  behaves exactly as `grow-x` did. **This is the one decision he may want to reverse** - flagged in
  the owner-queue item.

Measured on the sample, name field, default mode: normal → nothing moves · long → plate widens at
56px · longer → **two lines at 56px**, plate taller upwards, plate bottom and the role beneath it
unmoved · absurd → smaller, and reported through `noacgTextOverflow()`.

## Gates

- `npm run build` green on this branch (`[write-version] … -> claude/dd-svg-fitting-two@…`).
- `e2e/import-svg.spec.ts` - three new cases pin the rungs (the order, the margins at every rung,
  and the value surviving a re-fit); five existing default assertions moved from `grow-x` to
  `grow-xy`, and two width-only cases now choose `grow-x` explicitly because under the new default
  their value reaches the cap and then wraps. Every spec reaching a growing panel by its stamp now
  matches it WORD-WISE (`~=`): a panel carrying both rows is stamped `g0 g1`, and an exact-value
  selector finds nothing.
- `e2e/import-svg-corpus.spec.ts` - a new case walks every corpus fixture that HAS a ladder answer
  and checks the one it arrives on against its own sidecar. That column previously had only the
  SWEEP reading it, so the day the measured default changed, twenty-two stated expectations could
  have gone stale in silence. Seven sidecars were updated to `grow-xy` with it. Two exclusions,
  both named in the spec with their reason: a file with no bound text has no ladder at all (an
  outlined export lands on the re-export answer, where there is no control to read), and the files
  sweep finding 5 names are the repro for an OPEN finding rather than a settled answer.
  **The gate's first run made that second list two longer.** Finding 5 said four files default to
  growing against their stated answer; `inkscape-flowed-text-card` and `student-illustrator-quiz`
  do it too - the second a quiz board, the archetype the finding is about. Pre-existing (the
  proposal itself is untouched here; only the axis it writes changed), recorded in the backlog,
  and still the owner's call rather than a rule change.
- **The sweep itself was NOT re-run.** `scripts/svg-import-sweep.mjs` requires a dev server
  already listening on this checkout's port, and a linked worktree cannot get one: the guard hook
  denies `npm run dev` and `preview_start` serves whichever checkout the session sits in (the same
  limitation `e2e/AGENTS.md` records for `pro-spike --control`). The corpus GATE above covers the
  column the sweep would have re-measured; the rest of the sweep's verdict is unchanged code.
- `/check`: **the code-review skill forked against the wrong branch** - it reviewed
  `claude/ee-catalog-gates` (another live worktree) and reported eight findings about the
  affected-slice catalog gating, none of them about this diff. Those findings were NOT acted on
  here and belong to that session. The review and simplify phases were done by hand over
  `git diff main...HEAD` instead; what they found is in the section below.

## What the review found (all fixed here)

Three real defects, each caught by writing the spec rather than by reading the code:

- A line left SQUEEZED from a floored value answers `getComputedTextLength` with the `textLength`
  it was given, and the width growth measured exactly that - so a short value arriving after one
  too long to fit measured as long as the long one, and the panel never came back to the size it
  was drawn. Pre-existing, and only reachable once a value could both squeeze and grow.
- Resting every line before measuring the room rewrote `textContent` on lines already holding
  what the designer drew, which flattens a kerned headline's per-glyph tspans.
- `room.height` could come out ZERO under the new mirrored bottom padding, which reads downstream
  as a line overflowing its room by its own height.

Simplify pass: the ceiling's neighbour bound is written as the plain comparison it is,
`svgGrowSet` uses the file's own `== null` idiom, and the follower collection reads its two
directions as named `beyond` / `straddles` rather than negated coordinates.

## The first landing was refused, and why

CI run 33241703477 was red on exactly one test - `catalog-baseline.spec.ts` "emits byte-identical
code". Correctly so: the fit ladder and the growth runtime are emitted into every imported-SVG
graphic's `template.js`, so rewriting them moves that design's emitted code. **This is the same
missed-re-record the first fitting session hit**, and it is worth saying plainly: any change to
`importedDesign/svg.ts` moves `svg01`'s baseline, and the re-record belongs in the same commit
range as the change.

Re-recorded through the queue and the diff read before committing. Scope: **1 of 504 designs moved
- `svg01` - and within it only the `js` hash**; its html and css are byte-identical, nothing was
added or removed, and nothing outside that chassis moved (the 21 clock-bearing designs CC's
re-record covered are untouched here). That is the shape a runtime-only change should have.

**The `student-rehearsal.spec.ts` quiz-state timeout does NOT reproduce against this tree** - both
its tests pass (32.6s). It appeared once in EE's integration run; on this branch the same spec is
green, and it was also green in this branch's own 930-test integration run. Nothing here points at
the svg.ts rewrite; treat it as a flake seen elsewhere unless it recurs.

## Worth knowing

`main` was taken in mid-session and brought a change to the same owner-queue item (its own
round-two note) plus a countdown hook in `importedDesign/svg.ts`. Both resolved here; the two
svg.ts changes are unrelated and sit side by side.

**A hole in the browser-work guard, found while enqueueing the re-record.** `enqueuesWork`
(`scripts/command-match.mjs`) tests only the FIRST shell segment, so a perfectly ordinary
`cd <worktree> && npm run queue -- "…"` is not recognised as an enqueue: the first segment is the
`cd`. It only bites when the QUEUED payload itself contains a separator - here `set VAR=1&& npx
playwright test …`, which the segmenter splits, leaving a bare `npx playwright test` segment that
reads as starting a suite. The guard then refuses the one action it exists to recommend. Worked
around by waiting for the slot before enqueueing; the honest fix is for `enqueuesWork` to look at
any segment, not just the first. (Related: the queue spawns through `cmd.exe`, so a `VAR=1 cmd`
env prefix silently does nothing there - `set VAR=1&& …` is the form that works.)

**The shared instruction chain ending at `src/components/wizard/AGENTS.md` is at 14 free bytes of
112,000.** It was already at 99.95% before this branch; the growth note here is one sentence for
that reason, and it failed the build once at a paragraph. The next edit to any file in that chain
will need to give something back first.

## What is NOT done

- The vertical rung is only exercised on lower-third-shaped artwork. A panel that is neither top-
  nor bottom-anchored (vertically centred) grows downward by the tie-break; nobody has walked one.
- `svgCollectSpanners` is a derivation, like the follower guess: it fires only on a shape drawn to
  the panel's own two edges on the growing axis. A declared follower list still wins outright.
- The multi-line case where TWO lines of one panel wrap at once clamps the cumulative travel at
  the cap rather than distributing it; it is the same corner the single grant always had.
