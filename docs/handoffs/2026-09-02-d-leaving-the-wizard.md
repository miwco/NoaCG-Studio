# Leaving the wizard on purpose - the playout confirmation, and Back into the walk

Branch `claude/d-leaving-the-wizard`, cut from `origin/main` at `b0750116`. Six commits.
Both halves of the bad minute the owner walked into on 2026-09-02.

## What shipped

**The Finish step's primary door confirms, and the confirmation prints the rundown.** Pressing
"Add to the production - go live" raises a dialog naming the production the graphic is going
into, whether it is new or already holds a graphic under that name, what the press saves, and
where it lands. Cancel saves nothing and creates nothing. The whole value is the destination: the
dropdown above it can be walked past without being read, and that is exactly what the owner did.

**Back straight after creating returns to the wizard.** Every FinishStep door that closes the
wizard snapshots the walk (`FinishedWalk` in `CreationWizard.tsx`, taken in the three appliers).
Re-opening onto a `#/new/.../step/<name>` url - which is where browser Back off the production
page or the editor lands - restores the whole walk on the step it ENDED on, behind a warning
naming what re-entering resets. "Leave it as it is" returns to the surface the door had landed
them on, not to Home. The plain `#/new` (the "+ New graphic" door) still means a fresh wizard and
discards the walk, which is how the two are told apart.

**A second pass writes over what the first one made.** `saveBuiltGraphic` saves over the library
record the walk already made when the name is unchanged, instead of `saveGraphicAs` minting a
twin. The production pool needed no change - `addGraphicToShow` already replaced by name and kept
the pool entry's id, so its cues and its playout layer survive. Without this, a back button would
have littered the library on every use, which is worse than no back button.

Both dialogs are one component, `wizard/WizardConfirm.tsx`, wearing the SHARED DIALOG ANATOMY.

## The two decisions worth knowing about

**Why the confirmation and not just the back button.** The owner ruled that if only one fits, the
confirmation is the one to keep, and he is right about the mechanism: the trap was never the
missing dialog on its own, it was that the door BESIDE it opened a window and asked something.
Two doors side by side, one ceremonious and one silent, teach the reader that neither is final.

**Why `WizardConfirm` is portalled to `document.body`.** `.wz-wizard` steps its own type up a
notch for the student reading a full-screen surface (18px header -> 20px, 13px buttons -> 15px).
The playout confirmation renders from inside that subtree and the walk-back warning renders beside
it, so left in place the SAME dialog arrived in two sizes depending on which one raised it. This
was measured, not guessed - the header also sat 10px right of every line under it, because
`.wz-header`'s 28px gutter is the full-screen wizard's.

## What it deliberately does NOT do

**The kit and Pro-package doors are untouched.** `openKitProduction`, `exportKit`,
`openAiPackage` and `exportAiPackage` save a SET rather than one document and reach none of the
three appliers, so a whole kit still reaches a rundown in one silent click and Back off that
production page opens a wiped wizard. The confirmation is nearly free there; the walk-back needs a
snapshot of the KIT PLAN rather than of one draft, which is why it was not folded in. Recorded in
`docs/backlog/back-to-the-wizard.md` and stated in `src/components/wizard/AGENTS.md`, so the
contract does not claim coverage it does not have.

**Entry point 2 is scoped, not started** - opening a wizard-made graphic from Home and landing in
the wizard. It has no draft in memory: `WizardDraft` is the INPUT to `buildDraftTemplate` and a
saved `GraphicDoc` holds only the output. The backlog file carries the two ways to build it and
argues for persisting the draft with the graphic (versioned, absent for a graphic the wizard did
not make) over deriving it back out of the emitted code, which would work for a clean graphic and
start lying for a hand-edited one - the whole population the feature is for.

## Evidence

- `npm run build` green after every step; the branch stamp read `claude/d-leaving-the-wizard` each
  time, so nothing gated the wrong tree.
- **Walked in a real browser before the specs were believed**, on the worktree's own dev server
  (`npm run dev:worktree` - `preview_start` does not reach a linked worktree, which cost the first
  half hour: it served another checkout's files and every change looked like it had not applied).
  Both dialogs were driven at 1440x900, 1366x768 and 375x667; the body never scrolls, the footer
  stays inside the sheet, and the page never scrolls sideways. The header/body/footer left edges
  were measured, not eyeballed.
- **The whole loop was walked end to end, twice**: create into a new production, Back, decline,
  Back, accept, change the entrance on the Animation step, finish again. One library record, one
  pool entry still linked to it, one cue, and the new animation in the pooled template. The second
  walk had an OLDER production sitting in the list first, and the resumed picker still read
  "Friday Night Show (1 graphic)" while Old Show came out of it with zero graphics - which is the
  review finding below, confirmed live rather than by the spec alone.
- `e2e/wizard-finish.spec.ts` +2 tests covering both behaviours, including the duplicate check and
  an OLDER production created first so the picker's fallback cannot green the walk-back by
  accident.
- Six specs that only wanted to BE on the production page now go through
  `addToProductionFromFinish` in `e2e/_create.ts`, so the ceremony is stated once.
- Local `npm run test:e2e:focus` green, 674 passed (14.6m), before the check-phase fixes.
- **CI 33691105055 green on `367fa4d5`**, all 9 E2E shards in **full** mode plus the catalog
  calibration gate and Factory gates - job list read with `gh run view --json jobs`, not inferred
  from the run's colour. 33689169812 was green the same way on `70b16fea`. Both were DISPATCHED
  with `gh workflow run ci.yml` rather than left to the push run: an ordinary push plans only its
  own delta and cancels the run in flight, so a small follow-up commit would have skipped every
  shard while the run covering the real change never finished.
- The last two commits (`e47353ac`, `d4859153`) land after that run and are a redundant CSS colour
  declaration and a comment figure. The landing queue re-gates on the integrated sha, which is the
  binding verdict either way.

## /check

- **review: delegated** - the code-review skill at level `high` forked and handed its findings
  back here; scope-checked against this branch's 16 files before anything was acted on. 5
  findings, all confirmed against the surrounding code, all fixed in `367fa4d5`.
- **simplify: inline** - the simplify skill returned background fan-out instructions rather than a
  result, so per `.agent-workflows/check.md` the leg ran inline over its four angles. One edit (a
  redundant margin rule the body's own `p` rule already covered) and two reports below.
- **verify: inline** - build green, the browser walks above, the local focused suite (674 passed),
  and CI green on `367fa4d5` with the full suite.
- Verdict stamp at `<git-common-dir>/noacg-jobs/checks/claude-d-leaving-the-wizard.json`.

### What review caught that mattered

1. **The walk-back forgot where it had been.** Finish's picker falls back to the FIRST saved
   production when nothing points it anywhere, and `loadShows()` is creation order, so it is the
   OLDEST one. A reader with two productions would have been told "the copy in Friday Show is
   replaced" and then appended a second copy to some older show. A walk that ended in a production
   now comes back pointing at it, and the spec creates an older production first so the fallback
   cannot pass by accident.
2. **The editor door plus Save still duplicated.** That door saves nothing, so the walk recorded
   no record; if the reader pressed Save themselves before coming back, the second pass minted a
   twin. The walk now adopts the working document's record when the name matches.
3. **`--fg` has never been a token.** Three rules asked for it and rendered in whatever colour they
   inherited - two of them new here, and the "How did we do?" line in the feedback row, which has
   been wrong for a while. All three name `--text` now, and the portalled dialog states its own
   text colour rather than inheriting one.

### Reported, not fixed - they ripple outside this diff

- **The dialog body is a fourth near-copy.** `.wz-confirm-body`, `.save-dialog-body`, the storage
  alert's override and the export window's body are the same flex column with different padding.
  The SHARED DIALOG ANATOMY section is where a promoted `.dlg-body` belongs; doing it here would
  restyle three dialogs this branch does not touch. `WizardConfirm` is the first EXTRACTED version
  of the whole shape and is the obvious thing for the save guard to adopt when someone wants a
  third-button slot.
- **The backdrop press guard is written out four times** (wizard, export window, storage alert,
  and now this) with the same comment explaining the text-selection drag. Same argument.

## For the next session

- **UNVERIFIED**: nothing here has been seen by a human. `docs/acceptance/owner-queue/
  2026-09-02-leaving-the-wizard-on-purpose.md` carries the route and names the branch, so a walk
  taken before it lands knows why the live site still behaves the old way.
- **The AI, imported-file and imported-design modes get both behaviours** - they share FinishStep
  and the appliers - but only the CATALOG walk was driven in a browser. The mechanism is identical
  and the specs cover the catalog path; if something is off it will be in mode-specific state
  restored by the resume branch, not in the dialog.
- **The resume warning's "the copy in X is replaced" is what the walk DEFAULTED to.** Picking a
  different production on the way out is legal and the confirmation at the end tells the truth
  about it, but the older copy then stays where it was. That is honest rather than clever, and it
  is the kind of thing an owner walk would rule on.
- `src/components/wizard/AGENTS.md` is at **713 bytes of headroom (99.4%)** after this row's two
  additions, both deliberately terse. The byte-headroom row the owner asked for by name
  (`docs/backlog/agents-md-byte-headroom.md`) is now the next thing that has to happen before
  anything else adds prose to that chain.

## Landing

Queued via `/queue-merge` as the session's last action. Nothing was merged here.

---

# Carrying row C as well - the conflict, and how it was resolved

Added 2026-09-03. This branch now contains `claude/c-text-knows-its-box`, so landing it lands
both nights' work. The account above is unchanged; this section is what happened afterwards.

## Why one branch had to carry both

Both branches were finished, gated and green on their own, and NEITHER COULD LAND. Each was
refused by `merge-order` with the same verdict: `caution: [conflict] landing it first leaves 1
conflicted file(s) for other branches to resolve`. The file was `e2e/student-rehearsal.spec.ts`,
and the cause is that both rows put a confirmation dialog into the same student walk - row C an
"unticking a text field asks what to do" prompt in the SVG import step, this row a "you are
adding this to <production>" confirmation on Finish. Neither assignment named that spec, so the
plan called the two rows disjoint and they were not.

`--accept` would have overridden the verdict and was deliberately not used: it is for a person
who has weighed the collision, and overriding here would have left the OTHER branch holding a
conflict nobody had resolved. Absorbing C removes the conflict rather than suppressing it.

## The resolution

`origin/main` came in first (seven branches landed that night) and merged clean; `npm run build`
was green on it before C was added, so a failure afterwards could only be C's.

Merging C conflicted in exactly one place, and it was **the import line, not the walk**. Git
auto-merged both sides' bodies because they touch different tests: this row's change is in
`intoShow`, the helper the FIRST test uses twice, and C's is one line in the SECOND test.
Keeping both imports is the whole textual resolution.

**The judgement was whether that still tests what it claims**, and it needed checking rather than
assuming, because a keep-both merge can compile and prove nothing:

- The merged file is byte-for-byte this row's file plus C's one line, and C's file plus this
  row's one line. No assertion from either side was dropped.
- Both dialogs are still exercised, each in its own test - `addToProductionFromFinish` twice in
  the rehearsal walk, `untickTextRow` in the half-made-binding test - and both helpers ASSERT on
  their dialog, so either regressing fails the file.
- The two never coexist: the rehearsal walk unticks nothing, and the half-made-binding test
  never reaches Finish. There is no ordering to get wrong.
- Worth knowing for the next merge here: C's off-dialog and this row's confirmation are both
  `.wz-modal` (as are fifteen other dialogs), and the spec's `wizardNext` is scoped to that
  class. Neither dialog is open when it runs, so the strict-mode ambiguity does not arise - but a
  spec that opened one and then pressed Next would find it.

`e2e/catalog-baseline.json` came across as C's version unchanged: one line, svg01's js hash,
exactly as C's handoff predicted.

## What /check found on the merged branch

- **review: delegated** - the code-review skill at `high` returned its findings here and they
  were scope-checked against this branch's 30 files. Three findings, all verified against the
  code before anything was touched, and the outcome was not what the review said it was:
  1. **A real data-loss path, fixed** (`f9603a7c`). The header's rewind cleared the draft but
     left `madeThisOpen`, which is what tells `saveBuiltGraphic` it is looking at a second pass
     down one walk. The export door mints a record and leaves the wizard open, so building a
     second graphic from the same design after a rewind - no navigation needed, no rename - wrote
     over the first one's record. Before this row's `saveBuiltGraphic`, `saveGraphicAs` always
     minted, so this was new. Both refs now go through one `forgetWalk()` beside `resetKit`, for
     the reason that comment already gives: the halves have to be cleared together.
     `e2e/wizard-finish.spec.ts` walks it, and **the test was proved to bite** - it fails with
     the fix reverted.
  2. **A FALSE POSITIVE, and worth recording as one.** The review argued that `FinishStep` mounts
     one render before the effect that names the walk's production, so its `dest` initializer
     captures a stale `defaultProductionId` and a second finish would append to the OLDEST
     production. The reasoning was sound and the code reads that way. It is not what happens:
     with a candidate fix reverted, and again with it removed entirely, the picker already reads
     "Friday Show" on the FIRST walk-back. The step does not mount until after the effect has
     run. A ref-and-effect was written to fix this and then **taken back out** - a guard for a
     path that cannot occur is churn, and the house style prefers the obvious code.
  3. The walk-back spec asserted the picker only after pressing Back TWICE, where the first press
     has already left the value in place. That assertion moved to the FIRST press, which is the
     only one that measures the ordering. It passes today; it is now pinned rather than assumed.
- **simplify: inline** - the simplify skill returned background fan-out instructions rather than
  a result, so per `.agent-workflows/check.md` the leg ran inline over its four angles. One edit
  (the `forgetWalk` extraction above) and one report below.
- **verify: inline** - build green; `wizard-finish`, `student-rehearsal` and `import-svg` green
  locally; CI green.

### Reported, not fixed - it ripples outside this diff

**C's untick dialog and this row's confirmation are two dialogs written twice.** `WizardConfirm`
is the extracted shape and `MapSvgFieldsStep`'s off-dialog is an inline near-copy of it; neither
session could see the other's. They are not quite the same shape, though - `WizardConfirm` is
cancel-plus-primary, and the untick question is keep-or-remove, two actions with no cancel - so
adopting it means either a third-button slot or bending the question into a shape it is not.
That belongs with the `.dlg-body` promotion the earlier section already reports, not here.

## Evidence

- `npm run build` green at every step, branch stamp `claude/d-leaving-the-wizard` each time.
- **CI 33700195935 green on `1ddac42b`** (the merge resolution), **all nine E2E shards in
  `(full)` mode** plus Build, Factory gates and the catalog calibration gate - job list read with
  `gh run view --json jobs`, not inferred from the run's colour.
- CI dispatched again on `f9603a7c` for the check's fix; both runs were asked for with
  `gh workflow run` because a push run plans only its own delta and cancels the run in flight.
- Local: 86 tests green across `student-rehearsal`, `import-svg` and `wizard-finish` on the
  resolution, and 17 green on the final state.

## One thing that cost an hour, and is now a task chip

The local suite would not start: a Playwright run in the PRIMARY checkout had been holding the
machine-wide browser-job lock for 126 minutes. It had 1.7 CPU seconds to show for that and no
browser children - its dev server had bound `::1:5230` only, nothing on 127.0.0.1, so the
readiness probe could never succeed and nothing timed out. `e2e-runs.mjs --orphans` reported
nothing, because a LIVE but permanently stuck run is not an orphan by its definition. Killing the
tree released the lock. The fix - a webServer timeout, a stuck-job check that reads CPU time, and
pinning the dev server's host so it cannot bind IPv6-only - is filed as a task chip rather than
done here, because it is shared e2e infrastructure and nothing to do with this branch.
