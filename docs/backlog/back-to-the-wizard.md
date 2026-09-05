---
v: 2
source: owner
kind: ask
raised: 2026-09-02
state: unstarted
asked: "If you're home and you press a graphic and want to edit it, I actually think that we should also go back to the wizard if it's made in a wizard."
---
# Opening a wizard-made graphic from home should reopen the wizard

Raised on the 2026-09-02 walk. **The first half of this ask landed on 2026-09-02**
(`claude/d-leaving-the-wizard`): pressing Back straight after creating now returns to the wizard
on the step the walk ended on, with every answer intact, behind a warning naming what
re-entering resets. What is left is the bigger half.

## The two entry points, and why only one is done

1. **Back, straight after creating.** DONE. The draft was still in React state, so the wizard
   keeps a snapshot when a door closes it and offers it back when the reader returns to a
   `#/new/.../step/<name>` url. `CreationWizard.tsx`'s `FinishedWalk` is the snapshot;
   `e2e/wizard-finish.spec.ts` pins it.
2. **Open a wizard-made graphic from home and land in the wizard.** NOT DONE, and much bigger:
   there is no draft to restore. It has to be RECONSTRUCTED from the saved template.

> If you're home and you press a graphic and want to edit it, I actually think that we should
> also go back to the wizard if it's made in a wizard, and have all the things that you usually
> have there.

## What entry point 2 would take

The wizard's answers are not persisted anywhere. `WizardDraft` (`src/components/wizard/draft.ts`)
carries the variant id, the field lines, the palette, the typeface, the animation presets, the
zone, the logo, the legibility settings and the project format, and `buildDraftTemplate` turns
them into code. A saved `GraphicDoc` holds the OUTPUT of that, not the input. So the work is one
of:

- **Persist the draft with the graphic.** A new optional field on the library record, written by
  every wizard door and read back when a saved graphic is opened. Versioned like every other
  persisted shape (root `AGENTS.md` principle 6), and honest about a record that has none: a
  graphic made before this, imported, or written by hand simply has no wizard to go back to, and
  the door must not appear for it. This is the small, truthful option, and it is the one that
  matches how the first half works.
- **Derive the draft from the template.** Parse the `:root` contract back into a palette and a
  typeface, read the `NOACG_ANIM` region back into presets, guess the variant from the markup.
  It would work for a graphic the wizard made and start lying the moment anything was hand
  edited, which is the whole population this feature is for. Rejected unless the first option is
  shown impossible.

Then the surfaces: which door on Home opens the wizard rather than the editor, what a graphic
with no stored draft offers instead, and what happens when the stored draft's VARIANT has since
been retired from the catalog.

## The warning is already built

Re-entry regenerates, so it cannot preserve hand-written code. That is settled and shipped:
`WizardConfirm` is the shared dialog, and the wizard's own copy names what will be written over,
saying more when the working document is dirty. Entry point 2 raises the SAME warning with a
stronger claim behind it, because a graphic opened from Home has had time to be edited.

## Why it is worth doing at all

The owner's reasons are all recovery from a decision made one screen too fast, and the editor is
not the answer he wants:

> I don't know what the purpose of the editor right now is, because it's like a third editor that
> you can open. I think the wizard is a good place and what most people want to edit.

Until the editor is real, the wizard is where a student changes a graphic. A graphic that can
only be changed once is a graphic they make again from scratch.

## Still open beside this: the kit and Pro-package doors

`steps/KitFinishStep.tsx` and the Pro-package endings (`openKitProduction`, `exportKit`,
`openAiPackage`, `exportAiPackage`) save a SET rather than one document, so they reach none of
the three appliers and got NEITHER half of the 2026-09-02 work: a whole set still reaches a
rundown in one silent click, and Back off that production page opens a wiped wizard. Same
argument as above, smaller blast radius. The confirmation is nearly free there (`WizardConfirm`
already exists, and the destination is picked the same way); the walk-back needs a snapshot of
the KIT plan, not of one draft, which is why it was not folded in.
