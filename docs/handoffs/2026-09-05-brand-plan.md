# Brand plan - two rows for the night wave

**Branch:** `claude/new-session-7e3ffb`. **Date:** 2026-09-05.
**Receipt:** the owner's ask and his three answers, verbatim in `docs/OWNER_RULINGS.md`
("Brands", under owner-decisions-2026-09-05).

## The short version

A planning session, no feature code. The owner asked for brands you make once and choose in the
wizard, with the logo landing wherever a design has a slot. The plan is `docs/BRAND_PLAN.md`; its
§10 holds two draft rows in the prompts.md shape, letters and pools left for the orchestrator.
`docs/GOALS.md` NOW carries the item so the rows are not a raid on parked work.

## What the orchestrator should know before it letters the rows

- Row 1 (model + wizard chooser + apply-to-existing) owns `src/model/brand.ts`, `packets.ts`,
  `shows.ts`, `wizard/draft.ts`, `CreationWizard.tsx`, `logoSlot.ts`. Row 2 (the Home creator)
  starts on row 1 landing, because both need the model and it belongs to one branch.
- Session `new-session-a06227` (branch `claude/new-session-54bf87`) has uncommitted edits in
  `docs/GOALS.md` and `docs/OWNER_RULINGS.md`. This branch touched both. The landing queue
  resolves it; the additions here are one item and one appended block, each at a place that
  section would not otherwise change.
- The reading that would be re-derived otherwise: the footer checkbox is not inert. It copies the
  anonymous `spx-gfx-brand` record that every Create overwrites (`CreationWizard.tsx`, the
  `saveBrand` after `applyDraftProject`). BRAND_PLAN.md §1 lists all four existing pieces.

## Needs the owner

Nothing. The three alignment questions were answered before the plan was written.

## Pointers

- `docs/BRAND_PLAN.md` - the plan; §2 decisions, §3 model, §10 rows.
- `docs/GOALS.md` NOW - the item.
- `docs/OWNER_RULINGS.md` - the verbatim answers.
