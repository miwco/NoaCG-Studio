# Session AC - finish the citation rename

Branch: `claude/ac-stale-citations`. Goal: no comment anywhere in the repository still cites the
moved "Student release" section of `docs/GOALS.md` at its old address (it moved to
`docs/GOALS_ARCHIVE.md` in the 2026-08-22 pivot).

## What was found

Re-grepped the whole repository. The starting pattern (`GOALS\.md[^)]{0,120}[Ss]tudent release`)
found 38 files, but a second pass turned up 8 more sites the pattern missed because the words
"Student release" were split across a comment-continuation line break (e.g. `"Student` on one
line, `release"` on the next) or because the citation dropped the quoted section name entirely
(bare `docs/GOALS.md step N`). Every one of those extra sites was confirmed against
`docs/GOALS_ARCHIVE.md`'s "Student release" step list (steps 1-11) before editing.

**52 sites across 38 files edited, one commit:**

- `.github/workflows/nightly.yml` - lines 203, 296
- `.github/workflows/ci.yml` - line 189
- `e2e/_create.ts` - lines 31, 63
- `e2e/_preview.ts` - line 34
- `e2e/adapt-first.spec.ts` - line 105
- `e2e/advanced-mode.spec.ts` - line 3
- `e2e/ai-lite.spec.ts` - line 73
- `e2e/anim-engine.spec.ts` - line 13
- `e2e/audience-pack.spec.ts` - line 15
- `e2e/auth.spec.ts` - line 16
- `e2e/competition-pack.spec.ts` - line 37
- `e2e/configured/account.spec.ts` - line 12
- `e2e/configured/signed-in-ux.spec.ts` - line 142
- `e2e/control.spec.ts` - line 45
- `e2e/flows.spec.ts` - lines 9, 54
- `e2e/graphic-types.spec.ts` - line 13
- `e2e/image-purpose.spec.ts` - lines 148, 377
- `e2e/images.spec.ts` - line 60 (Form B: bare `step 5` gained `"Student release"`)
- `e2e/layout.spec.ts` - line 172
- `e2e/library.spec.ts` - lines 10, 22
- `e2e/machine-edit.spec.ts` - line 16
- `e2e/playout-drills.spec.ts` - line 6
- `e2e/production-persistence.spec.ts` - line 4
- `e2e/public-service.spec.ts` - line 21
- `e2e/shows.spec.ts` - lines 34, 489
- `e2e/sports.spec.ts` - line 22
- `e2e/state-machine.spec.ts` - line 16
- `e2e/wizard-entry-fit.spec.ts` - line 427
- `e2e/wizard-filters.spec.ts` - line 478
- `e2e/wizard-finish.spec.ts` - line 8
- `e2e/wizard-kit.spec.ts` - line 572 (Form B: bare `step 7` gained `"Student release"`)
- `e2e/wizard-preview.spec.ts` - line 85
- `src/components/wizard/CreationWizard.tsx` - lines 589, 650, 733, 1003, 1234, 1321, 1434
- `src/components/wizard/draft.ts` - line 403
- `src/components/wizard/steps/EntryStep.tsx` - lines 35, 215
- `src/components/wizard/steps/FieldsStep.tsx` - line 17
- `src/components/wizard/steps/FinishStep.tsx` - lines 48, 185
- `src/components/wizard/steps/StyleStep.tsx` - line 89

Every edit is Form A (`docs/GOALS.md` -> `docs/GOALS_ARCHIVE.md`, rest of the line untouched)
except the two marked Form B above, which also inserted `"Student release" ` before the step
number since the quoted section name was missing.

## Correctly left alone (checked, not stale)

- `AGENTS.md:31` - the root doc's own "NOW points at GOALS.md, history is in the archive" line.
- `docs/NATIVE_PLAYOUT_RESEARCH.md:213` - prose about timing, not a section citation.
- `docs/handoffs/**` - historical record, never rewritten.
- Every `docs/GOALS.md NOW ...` / `GOALS goal N` citation (goals 4/5/6 are current, not archived):
  `src/components/wizard/draft.ts:251`, `SectionHead.tsx:4`, `steps/AnimationStep.tsx:30,247`,
  `steps/MapSvgFieldsStep.tsx:88,416,783,1336,1440`, `steps/ImportDesignStep.tsx:191,234,251`,
  `steps/AiStep.tsx:1141`, `WizardPreview.tsx:179`, `wizard/AGENTS.md:314,360,363`,
  `steps/mapSvgFields.css:141`, `e2e/import-svg.spec.ts` (multiple), `e2e/wizard-preview.spec.ts:148`,
  `e2e/student-rehearsal.spec.ts:6,281` (cites `GOALS.md NOW` / the north star, not the archived
  section).
- `e2e/network-resilience.spec.ts:5` - cites "the SVG road" section, unrelated to Student release.
- `src/components/wizard/steps/KitLookStep.tsx:18` - cites a different section, "Kits, not one
  graphic at a time".

## Skipped - another worktree owns these files right now

Per `node scripts/worktree-activity.mjs`, worktree `agent-a438999e8becbd5b0`
(`claude/aa-svg-samples-followups`) has uncommitted/unmerged work touching `e2e/ai.spec.ts` and
`e2e/exports.spec.ts`, both of which still carry the stale citation:

- `e2e/ai.spec.ts:196` - `// since step 6 (docs/GOALS.md "Student release"; FinishStep
  \`showEditorDoor\`) - the same`
- `e2e/exports.spec.ts:708` - `// video, with nothing on screen to say so (docs/GOALS.md "Student
  release" step 10 — the`

Both are single-line Form A fixes (rename `docs/GOALS.md` -> `docs/GOALS_ARCHIVE.md`, nothing
else) once that session's branch has landed. Also note `e2e/import-svg.spec.ts` was in that
worktree's file list, but its own `GOALS.md` mentions are all `GOALS goal N` (current, not stale) -
nothing to do there once it's free.

## Flagged - does not fit either recipe form, needs a call

`e2e/configured/anonymous.spec.ts:17`:

```
    // the student release put behind Advanced mode (GOALS step 4) - so signed out, with no
```

This cites the section as bare `GOALS step 4` - no `docs/` prefix, no `.md` extension, so it
matches neither Form A (`docs/GOALS.md` -> `docs/GOALS_ARCHIVE.md`) nor Form B (`docs/GOALS.md
step N` -> `docs/GOALS_ARCHIVE.md "Student release" step N`) as literally specified. Content-wise
it's the same stale citation (step 4 = "editor behind Advanced mode, full-screen wizard" in the
archive), but fixing it means inventing a third form the task didn't authorize. Left untouched;
the mechanical fix, if wanted, is `(GOALS step 4)` -> `(docs/GOALS_ARCHIVE.md "Student release"
step 4)`.

## Verification (recipe from the task)

1. **Diff is a strict one-for-one line swap.** `git diff --stat`: 38 files changed, 52
   insertions(+), 52 deletions(-) - insertions equal deletions, no other lines touched.
2. **Every added line begins with a comment marker or is a markdown bullet.** Checked
   programmatically (`//`, `#`, `/*`, `{/*`, `*`, `-`). 51/52 pass directly; the one exception is
   `src/components/wizard/steps/EntryStep.tsx:215`, a JSX comment **continuation** line (`{/*` opens
   on line 214, `*/}` closes on line 215) - it has no per-line marker because the block comment
   itself has no leading `*` convention there, but it is still inside a comment, confirmed by
   reading lines 214-216 directly.
3. **Undoing the rename reproduces the removed line byte for byte.** Reverting
   `docs/GOALS_ARCHIVE.md` -> `docs/GOALS.md` (and, for the two Form B lines, also removing the
   inserted `"Student release" `) reproduces all 52 removed lines exactly. 52/52 pass.

## Gate

`npm run build` (typecheck + lint + vite build, includes `check:workflows` and
`check:vercel-config`) passed clean. `npm run check:workflows` passed explicitly (10 workflows
validated) since `.github/workflows/**` was touched.

## Next

Queueing this branch now via `/queue-merge`. Once `claude/aa-svg-samples-followups` lands, a
follow-up session should re-grep `e2e/ai.spec.ts` and `e2e/exports.spec.ts` for the two remaining
Form-A sites named above, and someone should decide on the `e2e/configured/feedback.spec.ts:17`
bare-citation case.
