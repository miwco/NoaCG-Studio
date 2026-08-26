---
kind: walk
date: 2026-08-26
---
# End credits: one field, a role over its people

**Date:** 2026-08-26 · **Branches:** `claude/noacg-end-credits-template-132d41`,
`claude/noacg-credits-paste-field`, `claude/c-credits-tickers-roll`

Supersedes the first version of this item, which described the text format alone. Three things
have landed on the same field since it was written - the wizard's paste box, the optional logo,
and a settle fix that decides what a roll looks like at rest - and they are all one walk.

## What changed

The end-credits field format carries the one distinction a credit roll is made of, with one mark:
**a colon ends a role, everything else is a name.** A role with five people is typed once with the
five names under it, instead of five lines each repeating the job title. `# X` is a department
heading, TAB and `|` still separate a role from a name (a Google Doc table pastes as TAB), `;`
works wherever `:` does, and a list pasted with no marks at all reads as a clean column of names.

Four things are genuinely different on screen, not just in the parser:

- **cr01 Classic Roll** draws a role over all of its names as one block, and its new **Emphasis**
  choice in the wizard's Style step decides which of the two is the loud one. It defaults to
  **Role** - role bold and bigger, names regular beneath it.
- **A heading is now marked or it is not a heading.** The old rule promoted whichever line opened
  a section, which set the sentence nearly every roll ends on - *"Special thanks to everyone who
  made this show possible"* - in accent capitals at kicker size. That is fixed, and every design's
  sample now marks its headings.
- **The wizard's Fields step is ONE paste box**, not an input per person. It used to render the
  list category's rows grid: one single-line input per name, and no way to paste a sixty-line roll
  in at all - the exact "a field per person" shape this category exists to avoid.
- **The logo at the end of the roll is OPTIONAL.** A design that takes one offers it; a design
  that declares `logo: 'none'` builds its end block without a mark rather than reserving a hole
  for one.

## The route, in under a minute

1. `/app` → **New graphic** → **Templates** → search **Classic Roll**.
2. **Next** to Fields. It is one big box - paste the whole roll in:

```
# CREW
Sound: Ingrid Vasquez
Camera Operators:
Dara Nkemelu
Elin Kristiansen
Tomas Halvorsen

With thanks to everyone who gave a Saturday to this
```

3. **Next** to Style. The **Emphasis** row is there: Role / Name. Leave it on Role, or click Name
   to see the film convention instead - the preview flips as you click. The logo toggle is on the
   Fields step above, and turning it off is allowed.
4. **Next**, **Next**, **Finish** into the editor.

## What to look at

- **On the Fields step, before anything else: the preview is a screen full of names.** It used to
  be an empty black box for the first second and a half, and not recognisably a credit roll for
  about twelve, because a roll's entrance is eighteen seconds of travel that starts below the
  frame. Off the Animation step the preview now parks a travelling graphic at rest instead of
  playing it. **▶ Replay still runs the roll from the bottom** - press it and check that it does.
- The three camera operators share **one** "CAMERA OPERATORS" heading, sitting closer to each
  other than the next role sits to them - that spacing is the only thing saying they share a
  credit.
- The last line is ordinary white text, **not** gold small caps.
- Then do the same in **Column Roll**: the identical text, with the role right-aligned in a left
  column beside its stack of names. Switching design never means retyping the credits.
- Emphasis is the one taste call worth a second opinion: Role-loud is what was asked for, and
  Name-loud is the film convention. Both ship; only the default is a decision.

## Also worth a glance

- **Home → Graphics.** The card thumbnails for **Repeating Reel** and the other looping credits
  design used to be blank rectangles: they settled at an arbitrary phase of their endless loop.
  They now show names. Save one of each and look at the cards.
- The public format guide at **`/docs#end-credits`** - that page is what an operator who never
  sees this repo will read before pasting a roll into a playout server.
