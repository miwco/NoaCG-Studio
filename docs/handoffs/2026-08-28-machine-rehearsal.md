# 2026-08-28 - The student rehearsal, pre-run by machine

Branch: `claude/youthful-darwin-526b6f`. Scope: walk `docs/GOALS.md` NOW step 3 machine-side
before the owner's human walk, on artwork drawn the way a student draws it, and fix what could be
fixed. The owner's walk (`docs/acceptance/owner-queue/2026-08-28-student-rehearsal-walk.md`, still
unmerged on `claude/agent-door-docs-feedback-588024`) remains the acceptance.

## The verdict table

| # | What a student hits | Verdict |
|---|---|---|
| 1 | A layer switched off in Illustrator was offered as an operator field, ticked on - "MAALI!" on the scoreboard, "LUKITTU" on the quiz, and the quiz's took `f0` | **FIXED.** Illustrator's default styling writes a hidden layer as a class plus `.stN{display:none;}`, never as the attribute the shipped samples carry; `isHiddenNode` read only the attribute and the inline style |
| 2 | The owner's finding: a scoreboard import offers only "Nothing / Quiz", which reads as "there is no scoreboard here" | **DIAGNOSED, and the WORDS fixed.** The offer is right - a scoreboard needs no machine - but nothing said its number layers already get ± steppers. The step now names them, and the no-behaviour option says so too |
| 3 | Picking Quiz and leaving the binding half-made dropped the behaviour silently | **FIXED.** `quizBindingGaps` is now the single decider; the step reads its answer out in an amber line |
| 4 | The quiz binding with NO proposal (layers called "Option 1", "Pick 1") | **HELD.** Fifteen clicks, entirely by picker, exactly as `docs/SVG_AUTHORING.md` §5b promises. Now measured for the first time |
| 5 | Both graphics in one production, driven from the dashboard, no code view anywhere | **HELD.** Scores +1/+1/−1, quiz select → lock → reveal, one entrance per take |
| 6 | Reload the dashboard mid-run | **HELD, with an honest limit.** Data survives (scores, answer key, both cues); LIVENESS does not, offline - the steppers come back disabled and say "not on air — Take the cue first". No shared command log offline to restore it from; the hosted road repaints a live layer on boot (`e2e/configured/hosted-control-recovery.spec.ts`) |
| 7 | An imported scoreboard has no **Goal press** - the student drew a goal flash and there is nowhere to bind it | **FILED, structural.** The only behaviour on this road is the quiz. This is the "third behaviour" question in `docs/GRAPHIC_BEHAVIOUR_PLAN.md` §6, now asked by a real drawing |
| 8 | A **direct reveal** (select → reveal, no lock) | **FILED, structural.** `ANSWER_BOARD_MACHINE` draws `judge` only from `locked`, so the button greys. This is the open question `docs/GOALS.md`'s north star names; changing the arc is the custom-machine road the owner opened 2026-08-27 as direction to build after the student release |

## What changed

- `src/assets/svgImport.ts` - `hiddenClasses()` reads the class form of `display:none` /
  `visibility:hidden` out of the file's own `<style>` blocks, the way `classFontSizes` reads sizes;
  `isHiddenNode` takes the root so it can ask. Cached per root in a `WeakMap`.
- `src/components/wizard/draft.ts` - `quizBindingGaps()` exported; `svgBehaviourOption` now defers
  to it, so the drop and the message cannot disagree.
- `src/components/wizard/steps/MapSvgFieldsStep.tsx` + `mapSvgFields.css` - the "What it does"
  section names the ± steppers the artwork already earned, and an incomplete quiz binding says
  what is still missing.
- `src/templates/importedDesign/quizBehaviour.ts` - the state's on-rule adds
  `visibility: visible`, so an exporter class that hides with `visibility` cannot outlive it. The
  `display` half already won on specificity (two classes beat one).
- `e2e/fixtures/svg-corpus/student-illustrator-{scoreboard,quiz}.svg` + sidecars - the two student
  fixtures, written from the promise in `docs/SVG_AUTHORING.md` and not from the importer.
- `e2e/student-rehearsal.spec.ts` - the whole chain, mapped in `scripts/e2e-affected.mjs` beside
  `import-svg-behaviour.spec.ts` and added to the sprint FOCUS list.
- `docs/GRAPHIC_BEHAVIOUR_PLAN.md` §11 - the findings, including the two that stay filed.

## Verification

- `npm run build` green.
- `e2e/student-rehearsal.spec.ts` - 2 passed.
- `e2e/import-svg.spec.ts` (52), `e2e/import-svg-corpus.spec.ts` + `e2e/import-svg-behaviour.spec.ts`
  (11) - all passed after the importer change. Run directly rather than through the queue: the
  runner had nine jobs held under its 4 GB RAM floor with 2.4 GB free, nothing was running, and a
  queued duplicate (j-0158) was cancelled once these had answered.
- NOT run: the catalog gates. Nothing here touches a catalog design.

## Two coordination notes

- **`src/assets/svgImport.ts` is also touched by `claude/kind-sutherland-79e83c`** (the import
  FITTING session, handoff `2026-08-28-import-fitting-fixes.md`, finished and awaiting its queued
  jobs). Different region - that branch works on `panelPathGeometry` and the growth inventory, this
  one on `isHiddenNode` - so a textual conflict is unlikely, but whichever lands second should
  re-run `e2e/import-svg.spec.ts`. `docs/SVG_IMPORT_PLAN.md` was deliberately NOT edited here for
  the same reason; §11 of the behaviour plan carries the findings instead.
- **The rehearsal walk item is not on `main` yet**, so the pointer this session owes it could not be
  added without minting an add/add conflict. Whoever lands
  `claude/agent-door-docs-feedback-588024` should add this line to
  `docs/acceptance/owner-queue/2026-08-28-student-rehearsal-walk.md`:

  > **Machine pre-run verdict (2026-08-28):** the same road was walked machine-side first -
  > `docs/GRAPHIC_BEHAVIOUR_PLAN.md` §11 and
  > `docs/acceptance/owner-queue/2026-08-28-rehearsal-machine-pre-run.md`. Two defects fixed
  > before your walk; the Goal press and the direct reveal are known gaps, not surprises.

  That branch is currently BLOCKED from landing by `claude/worktree-not-main-checkout`, which is
  ahead of main with no landing queued for it.

## Lesson learned

**An expectation written from the promise finds things a fixture written from the feature cannot.**
Every SVG that had walked the behaviour road was drawn for the behaviour road - with the layer
names the authoring page suggests and hidden layers written as an attribute, because that is what a
hand-authored sample carries. One export from a real dialog, with layers named for the drawing,
turned up both defects in the first two minutes.

## The `caution` verdict on landing, and why it was accepted

`auto-merge` refused this branch with `merge-order: caution [conflict] - landing it first leaves 5
conflicted file(s) for claude/agent-door-docs-feedback-588024`. Measured before accepting, and the
number is not this branch's:

- **This branch's own commits touch NONE of the files that branch touches.** `git diff --name-only
  origin/main...HEAD` against that branch's own diff intersects to nothing. The eight files
  merge-order names arrived here through the `origin/main` integration merge, from landings that
  had already happened.
- **`git merge-tree` says landing this changes nothing for them.** The conflict set merging
  `claude/agent-door-docs-feedback-588024` into current `origin/main` and into `origin/main` with
  this branch on it is IDENTICAL - the same five files, three content conflicts and two
  modify/delete. Those are owner-queue items the `/walk` workflow consumed while that branch was
  still editing them; they are that branch's to resolve either way.

So `--accept conflict` records a risk that was weighed and found to be pre-existing, not waved
through. The measurement is two `git merge-tree --write-tree` runs and is re-runnable.
