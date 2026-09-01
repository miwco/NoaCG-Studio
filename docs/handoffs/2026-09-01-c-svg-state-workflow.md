# Handoff: the states-from-artwork design picture (session C)

**Branch:** `claude/c-svg-state-workflow`. **Date:** 2026-09-01. **Programme:** P2 (DESIGN -
research and design only; no product code was written, deliberately).

## What landed

1. **The owner's finding, driven fresh before any prose.** Both corpus quiz boards were
   imported and every quiz control pressed in the browser (offline dev server, the shared tree
   at the fork point 6887d527). The Illustrator multiline board: quiz auto-proposed, machine
   walks Question -> selected -> locked -> Reveal with correct structural greying, activity log
   records every event, and the Program monitor never changes a pixel - no warning at any step,
   because drawn moments are not binding gaps and the Finish summary never mentions the
   behaviour. The Inkscape board: RIGHT/WRONG/lock auto-filled from names, "A picked" MISSED
   (the matcher wants "select", the UI column says PICKED); bound by hand, the drawn states
   work on air exactly as the pilot promised, and undrawn moments fail silently per layer.
2. **`docs/SVG_STATES_FROM_ARTWORK.md`** - the design picture: the three owner-named routes
   judged against the structural doctrine (none touches the machine; all three are paint),
   the verdict that they are ONE LADDER with the default treatment as the missing rung, the
   student-facing artwork contract (do nothing / draw some / name them), three small repairs
   the drive exposed, and §7 naming the owner's three decisions. Status line says the rulings
   are open; indexed in `docs/README.md`; recorded as a P2 round-2 input in
   `docs/PROGRAMMES.md` (state untouched - only the owner writes AUTHORIZED).
3. **Mockups** `docs/design/svg-states/moment-ladder.html` (the three rungs driven from the
   operator's own buttons) and `assign-step.html` (the wizard moment, where an unassigned
   moment reads "NoaCG's default look" instead of "- not drawn -"). Both verified interactively
   in the browser, including the owner-queue route walked exactly as written.
4. **Owner-queue item** `docs/acceptance/owner-queue/2026-09-01-c-quiz-states-design-picture.md`
   (kind: walk, with front matter).
5. **Handoff cleanup, corrected mid-flight.** Twelve spent 2026-08-30/09-01 handoffs deleted.
   The original thirteen-file list was WRONG: review traced every open item against main and
   found four not spent. `2026-08-30-n-ograf-checker.md` is RESTORED (its OGraf host-body CSS
   leak finding is still unfixed on main and is cited from `docs/backlog/ograf-checker-83-rules.md`);
   the other three had exactly one unrecorded item each, now captured as
   `docs/backlog/cleanup-worktrees-dedup-and-speed.md`,
   `docs/backlog/behaviour-fieldcount-derived-rule.md` and
   `docs/backlog/control-panel-research-owed-links.md` before their handoffs stayed deleted.

## /check - legs and modes

- **review: delegated + inline.** The code-review skill forked and returned only a promise of
  notifications (per the workflow that means the leg had not run), so the diff was reviewed
  inline; the coordinator then relayed the fan-out's findings (review 6, tracer 2, altitude 3,
  conventions 0, handoff-classification 1). Every relayed finding was verified here before
  acting. All applied; the notable ones: the inverted L2/L4 vocabulary, the "3 of 9" example
  contradicting the fixture (now 4 of 13), the three-way lock-layer contradiction between doc
  and mockups (settled: the fixture's lock IS drawn and pre-selected everywhere), the
  assign-step mockup presenting the proposed wider matcher as shipped (now explicitly marked as
  depicting the post-ruling future), and the owner-queue route that dead-ended on disabled
  buttons (rewritten with the Take-again presses, then walked to prove it).
- **simplify: delegated (relayed).** Six findings, all applied: single-assignment row build,
  the extracted verdict helper (now using the --ok/--bad tokens instead of duplicated hexes),
  dead ids and the static summary line removed.
- **verify: done.** `npm run build` green on the integrated sha (branch stamp
  `claude/c-svg-state-workflow@390c85a563`); CI green TWICE with jobs read - the docs-only push
  (shards legitimately skipped by the plan) and the post-merge push (9/9 subset shards ran,
  covering session A's landed wizard changes from the fork point). Both mockups re-verified in
  the browser after every edit; the real product drive is §1's evidence.

## Rejected / deferred, with reasons

- **§5b forward pointer in `docs/SVG_AUTHORING.md`** (altitude finding): NOT added - that file
  is held by live sessions A/B and is outside this branch's touch list. The doc's §4 records
  that §5b gains the pointer in the change that ships the ladder.
- **`src/templates/importedDesign/AGENTS.md` fieldCount rule**: not edited for the same reason;
  captured in `docs/backlog/behaviour-fieldcount-derived-rule.md`.
- **Front-matter drift on three OTHER 2026-09-01 owner-queue items**: real, not mine to fix
  here; the coordinator recorded it as a night-wave row.

## Observations left for other owners

- A chip was filed (task_5a035a66): adding a second imported graphic that kept the default name
  "Imported SVG design" appeared to replace the first graphic's production cue, with the old
  cue's values applied positionally to the new field list. Observed once; hypothesis, not a
  verified mechanism.
- "Select answer" fires with the cue's empty Selected-answer field on first press (doc §5.3) -
  a design recommendation, not filed as a defect.
- UNVERIFIED: nothing in this handoff claims the default treatment works anywhere - it does not
  exist; the mockups are pictures of a proposal.

## What it cost

One session, docs and mockups only; two temporary local static-server runs and one dev-server
drive; no real-money spend; no product code, no migrations, no new URLs.

## What is next

The owner walks the queue item and rules on §7 (ladder / default look / vocabulary). If
ratified, the build slice is: geometry plumbing from the import measurements, default-paint
per moment on the drawnState seam, wizard copy, the Finish behaviour row, the widened matcher,
and export parity - under P2's ACTIVE gate, not before.
