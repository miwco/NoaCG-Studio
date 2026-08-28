# Wizard door placement - the shared order, and the door inside the wizard

Branch `claude/goofy-chebyshev-a57857`. Executes the owner's 2026-08-28 walk feedback on
`docs/acceptance/owner-queue/2026-08-27-new-graphic-from-every-surface.md` (decision recorded
there): header order **logo -> Home -> + New graphic** everywhere the two controls sit adjacent,
and the wizard's own header mounts the same door.

---

## What changed

1. **Order swap on both editor shells** (`AppShell.tsx`, `VideoAppShell.tsx`): Home now leads
   the pair, the door follows. No testid changed; `e2e/project.spec.ts` pins the new order via
   `previousElementSibling`.

2. **The wizard header mounts the shared door** (`CreationWizard.tsx`, after `wz-home`,
   `data-testid="wz-new-graphic"`, class `wz-new` sharing `wz-home`'s sizing so the header's
   row height stays set by the brand lockup). Semantics, all inside `NewGraphicButton.tsx`:
   - **Mid-walk: a guarded start-over.** `requestSwitch` first (the dirty-document guard),
     then `navigate({view:'new'})` - the wizard's route-agreement effect rewinds to the front
     page WITHOUT clearing the draft, so browser Back returns to the step with everything in
     it. Nothing is silently lost; ✕ stays the door that discards.
   - **On the front page: a no-op.** Checked in the component before the guard runs, so a
     dirty document cannot raise the unsaved-changes dialog for a press that changes nothing.

3. **SaveDialogs moved to a single App-level mount** (`App.tsx`, after `CreationWizard`;
   removed from `AppShell` and `HomePage`). Two reasons, both structural:
   - The in-wizard door can raise the guard while the full-screen wizard is open. Every
     modal backdrop shares `z-index: 100`, so DOM order decides - the guard must mount AFTER
     the wizard or it paints underneath it (it did, when tried per-shell).
   - The per-shell mounts were a latent hole: the control page, the production dashboard, the
     video shell and a cold boot on `#/new` (which renders no under-surface) all had
     `requestSwitch` callers with NO dialog mounted - the guard could be requested and never
     rendered, a dead button. One mount covers every surface.

4. Contracts updated: `src/components/AGENTS.md` (NewGraphicButton order + wizard mount,
   SaveDialogs mount), `src/components/wizard/AGENTS.md` (header doors), mapping rows in
   `scripts/e2e-affected.mjs` (VideoAppShell and SaveDialogs now select project.spec.ts).

## Verification

- `npm run build` green.
- Queued spec run: `project.spec.ts` (extended - new order on both shells, the wizard mount,
  the Entry no-op under a dirty document, the guard clicking THROUGH over the wizard, Back
  restoring the step), plus `wizard-shell`, `wizard-entry-fit`, `storage-full`, `library`,
  `feedback` for the header geometry and the SaveDialogs move.
- Owner-queue item updated with the built note + re-look route; it stays open.

## Open edges

- The guard-over-wizard z-order is pinned by Playwright's actionability check (clicking
  `switch-discard` fails if covered) - if a future backdrop gains its own z-index, that spec
  is the tripwire.
- Not touched, per task: Browse/search files (another session), the import-step files (a
  second session).
