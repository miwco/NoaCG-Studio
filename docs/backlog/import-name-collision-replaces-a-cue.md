# Importing a graphic under an existing name must not silently replace a production's cue

**Filed:** 2026-09-02, from the 2026-09-01 night-wave plan (row L, never launched).
**Source:** a task chip filed by the states-from-artwork session on 2026-09-01 while walking the
imported quiz boards; the owner ruled the same day that a chip is only for his own decisions, so a
defect goes here instead.

## Why

It is a DATA-LOSS shape: a student importing a second version of their own graphic, under the name
they naturally reuse, loses the cue in the production they are about to run. The 2026-09-12 class
is exactly that scenario - students iterating on their own artwork, importing repeatedly, with a
production already built.

## What it would take

1. Reproduce in the product: build a production with a cue, import a graphic with the same name,
   show the cue being replaced, and write down which code path does it (the planner's guess was
   the import/save path - `src/model/importTemplate.ts`, `src/store/saveActions.ts`, the wizard
   Finish doors - and an unconfirmed path is not a path).
2. Decide the correct behaviour and say why: a silent overwrite is wrong; a blocking dialog on
   every re-import is also wrong for a student iterating on artwork.
3. Fix it, with an e2e case that fails on the pre-fix code.
4. If the same collision exists elsewhere in the save path, name it; do not widen the fix beyond
   what is proved and tested.

## Evidence

The chip's own text (task_5a035a66) and the 2026-09-01 night-wave plan. `docs/SAVED_CONTENT_MODEL.md`
for what a cue is, `docs/PLAYOUT_DASHBOARD.md` for how it is played.
