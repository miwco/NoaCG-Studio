---
kind: walk
date: 2026-08-29
---
# The AI door says it is still in testing, and the docs point at the CLI

**Date:** 2026-08-29 · **Branch:** `claude/p-ai-door-copy`

## What changed

You said the AI creations need a warning or should be switched off for now, because they are
still in the testing phase. **The door stays open and says so in words.** "Beta" was already on
the card, but Beta is a label a reader can carry any meaning into - half the industry ships
finished things marked Beta. The card now leads with the specific sentence:
**"Still in testing - results vary."**

The same line repeats one screen in, on the AI step itself, with the fuller sentence behind that
step's ⓘ. It separates the two claims: what varies is the DESIGN, not whether the graphic works -
every result is still validated and benched before you can create it - and if you want a settled
result today, start from a template or import your artwork.

You also said people should be told to drive NoaCG from their own Claude Code or Codex. That
guide existed, at the very bottom of /docs under "For developers" - the last place someone with
Claude Code already open would scroll. It is now named in **Getting started** too.

## The route, in under a minute

1. `/app` - the Entry step. Look at the **Create with AI** card: the description begins
   **"Still in testing - results vary."** in white, ahead of everything else on the card.
2. Click that card. At the top of the step: **Still in testing - results vary** on the right of
   the "Create with AI" heading. Click the **ⓘ** beside it for the fuller sentence.
3. `/docs` - the first section, **Getting started**. The amber-edged callout at the bottom of it:
   **"Have Claude Code or Codex?"**

## What to look at

- **Is the entry card's line the right loudness?** It is white and semibold against the dim
  description, and deliberately NOT amber - the Beta tag on that card's title is already the one
  accent, and two amber marks read as decoration rather than as a caution. Louder and quieter are
  each one line of CSS.
- **Are the words plain enough?** "Still in testing - results vary" was chosen over anything
  longer. If it should name what varies on the card itself, that costs a line the entry grid does
  not have without trimming elsewhere.
- **The ⓘ text.** Whether the split it draws is the honest one: the design varies, the graphic
  working does not.
- **The step got shorter, not longer.** The two paragraphs of prose that used to sit under the
  heading moved behind the ⓘ with the caution, which is the ⓘ rule applied rather than an
  exception to it. Worth confirming you like the step opening straight into Project format.
- **The docs callout.** Whether it says the right thing to someone who has an agent open, and
  whether it belongs that high on the page.

## Nothing is waiting on a decision

Both of your options were on the table and labelling was taken, for the reason in the handoff:
the AI door is a pillar, and nothing inside it is broken today - so disabling it would have been
a false statement in the other direction. If you would rather it were switched off, say so and it
is a small change.
