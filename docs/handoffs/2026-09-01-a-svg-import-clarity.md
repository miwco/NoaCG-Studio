# 2026-09-01 - A: the SVG import page explains itself

Branch `claude/a-svg-import-clarity`, worktree
`.claude/worktrees/agent-ac9bf6915bbe1d413`. Three commits off `6887d527`.

The owner walked the import flow and named four things a student meeting it cold cannot work
out. All four are addressed.

## What landed

**1. The SVG export help leads the step.** It was a `SectionHead` ⓘ *under* the drop zone, and
he walked straight past it - dragged a file in and continued. It is now a compact
`? Need help exporting SVG?` button *above* the zone (`.wz-help-strip`,
`src/styles/wizard-and-dialogs.css`), sized to its own words rather than spanning the column,
with the one-line summary beside it and the per-app Illustrator/Figma/Inkscape menu paths
opening underneath. The amber is the `?` mark only - the drop zone stays the loud thing on the
step. Position is e2e-pinned by geometry, not DOM order.

**2. "Which panel grows" is not asked when there is one answer.** The picker offered every
rectangle, including the shipped Inkscape lower third's 10px amber tab. That was not only
confusing, it was a control with no effect: growth is driven by the bound lines *inside* an
element, so `growOneRule` grants a shape holding none exactly zero, every time. The picker now
offers only the shapes a bound line sits in (`panelsHoldingText`, using the runtime's own
`svgLinesInside` predicate); where that leaves one, the shape is named -
*"Palkki is the shape that grows: the only one your text sits in"* - and the line still lights
the shape up on hover. Its label names the visible result: "Which shape gets wider" /
"gets taller".

**3. "What travels with it" is now "What else moves".** The ⓘ gives a worked example in pixels
("your banner grows 120 px wider… a logo you drew after it would end up behind the banner"), and
the two behaviours read **Moves out of the way** / **Grows by the same amount** instead of naming
our transforms. Text layers are no longer rows with controls on them - a bound line's size is
already owned by the too-long rule, and "should this line stretch?" is the question that made the
concept unreadable. **They still travel**: a declared list replaces the runtime's derivation
outright, so the step states them in one sentence and commits them with the set. The section also
stopped rendering merely because growth was authored - on a graphic where nothing is drawn past
the edge its only content was a button for adding a mistake.

**4. The editor no longer flashes on the way to the rundown.** All three production doors
(catalog, imported file, AI) apply with `skipNavigation` + `keepGalleryOpen`, exactly as the
export door does. Reproduced before the fix by recording every route the door writes: it was
`["/app", "#/production/…"]` and is now `["#/production/…"]`.

Contract updated in `src/components/wizard/AGENTS.md` (four rules, net +894 bytes; that chain is
now at 110050 / 112000).

## `/check` result

- **review: `delegated`** - the code-review skill ran at `high` and handed its findings back in
  this conversation; scope-checked against the branch's own merge base. Seven findings, all
  seven confirmed against the surrounding code and fixed (commit `99129876`). Two were real
  runtime-parity bugs the first pass introduced:
  - dropping text from the *committed* follower set (not just the offered one) would have
    stopped a caption below the panel from moving the moment an author touched any row;
  - `panelsHoldingText` counted only live `<text>`, while `svgFitNodes` also walks placed lines
    (an outlined-glyph stand-in, a drawn field), so a plate whose headline is outlined type would
    have been declared a no-op and hidden from the picker.
  The rest: an armed traveller pick landing on text used to fall through and un-tick that field
  (now a no-op), the sole-shape sentence could claim "the only one your text sits in" when
  nothing had been measured, a dead ternary arm, and two storage-failure messages still sending
  the reader to Home.
- **simplify: `inline`** - the skill returned fan-out instructions rather than a result, so the
  four angles were covered here. Two dedups applied: `markerEl` (the marker lookup was written
  six times) and `isTextLayer` (three spellings of the same test, which is exactly how the
  offered set and the committed set drift apart). Nothing else in the diff earned an edit.
- **verify: `inline`** - `npm run build` green. 129 e2e specs re-run locally after the review
  fixes (`import-svg`, `import-svg-corpus`, `import-graphic`, `storage-full`, `wizard-finish`,
  `import-svg-behaviour`), all passing; the other production-door specs (`motion-presets`,
  `student-rehearsal`, `wizard-kit`) ran green on the pre-check commit. Every changed surface was
  looked at in a browser on this worktree's own Vite, at 1366x768.

Verdict stamp: `.git/noacg-jobs/checks/claude-a-svg-import-clarity.json`, `reviewedSha`
`99129876`.

CI is green on `99129876`, run `33523432663`, with Build, Factory gates and **all nine E2E shards
run** (`gh run view 33523432663 --json jobs`) - not a plan that skipped them. `a9407e80` was
green the same way, run `33518533967`.

## What is UNVERIFIED

- The full local suite was never run - `src/styles/` is CORE in `scripts/e2e-affected.mjs`, so any
  style change escalates to the whole 1182-test suite, and the repo's rule is that the pre-merge
  gate belongs to CI. The specs above were chosen by hand from the changed surfaces.
- Nothing here was tested against a real Illustrator or Figma export beyond the corpus fixtures.

## Deliberate trade-offs, for the record

- **A follower can no longer be declared where geometry proposes nothing.** Every control that
  writes `svgStretch.followers` lives inside the section, and the section now needs a non-empty
  proposal or an existing declared set. That is the owner's own rule ("if an option is not
  meaningful for a particular imported SVG, ideally do not show it") applied literally; the cost
  is that a layer the heuristic misses - one straddling the edge, a rotated one - cannot be added
  by hand. The runtime still derives its own set in that case, so nothing silently stops moving.
- **The text-traveller union is a wizard-level answer to a runtime rule.** The deeper fix is in
  `svgFollowersOf` (`src/templates/importedDesign/svg.ts`), which could keep deriving text even
  when a declared list exists. That file belongs to session B, so it was left alone.

## Not done here, for whoever picks it up

- The third field of `inkscape-lower-third-layers.svg` not wrapping is a runtime question in
  `src/templates/importedDesign/svg.ts` - session B's territory (`claude/b-svg-one-field-per-item`).
  I did not look into it beyond confirming it is not a mapping-step problem.
- The "When the text is too long" section head's summary still truncates with an ellipsis at the
  default panel width ("the panel gets wider, then the text wraps - read fr…"). Pre-existing
  `.wz-sec-head` behaviour, not touched.
- The ladder's own option list still says "panel" ("The panel gets wider"). That wording was
  ratified by the owner on 2026-08-26, so it was left alone rather than churned.

## Cost

One session, roughly three hours wall clock. Local: two full `npm run build` runs plus a third
after the check fixes, and about 12 minutes of e2e across four batches. No paid API spend, no
subagent fan-out beyond the one blocking code-review call.
