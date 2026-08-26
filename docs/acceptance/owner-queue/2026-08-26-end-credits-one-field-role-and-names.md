# End credits: one field, a role over its people

**Date:** 2026-08-26 · **Branch:** `claude/noacg-end-credits-template-132d41`

## What changed

The end-credits field format now carries the one distinction a credit roll is made of, with one
mark: **a colon ends a role, everything else is a name.** A role with five people is typed once
with the five names under it, instead of five lines each repeating the job title. `# X` is a
department heading, TAB and `|` still separate a role from a name (a Google Doc table pastes as
TAB), `;` works wherever `:` does, and a list pasted with no marks at all reads as a clean column
of names.

Two things are genuinely different on screen, not just in the parser:

- **cr01 Classic Roll** draws a role over all of its names as one block, and its new **Emphasis**
  choice in the wizard's Style step decides which of the two is the loud one. It defaults to
  **Role** - role bold and bigger, names regular beneath it.
- **A heading is now marked or it is not a heading.** The old rule promoted whichever line opened
  a section, which set the sentence nearly every roll ends on - *"Special thanks to everyone who
  made this show possible"* - in accent capitals at kicker size. That is fixed, and every design's
  sample now marks its headings.

## The route, in under a minute

1. `/app` → **New graphic** → **Templates** → search **Classic Roll**.
2. **Next** to Fields, **Next** to Style. The **Emphasis** row is there: Role / Name. Leave it on
   Role, or click Name to see the film convention instead - the preview flips as you click.
3. **Next**, **Next**, **Finish** into the editor.
4. In the Content panel, replace the Credits field with a paste that has one role over several
   names, e.g.

```
# CREW
Sound: Ingrid Vasquez
Camera Operators:
Dara Nkemelu
Elin Kristiansen
Tomas Halvorsen

With thanks to everyone who gave a Saturday to this
```

## What to look at

- The three camera operators share **one** "CAMERA OPERATORS" heading, sitting closer to each
  other than the next role sits to them - that spacing is the only thing saying they share a
  credit.
- The last line is ordinary white text, **not** gold small caps.
- Then do the same in **Column Roll**: the identical text, with the role right-aligned in a left
  column beside its stack of names. Switching design never means retyping the credits.
- Emphasis is the one taste call worth a second opinion: Role-loud is what was asked for, and
  Name-loud is the film convention. Both ship; only the default is a decision.

## Also worth a glance

The public format guide at **`/docs#end-credits`** - that page is what an operator who never sees
this repo will read before pasting a roll into SPX or CasparCG.
