---
v: 1
source: owner
raised: 2026-09-03
state: unstarted
asked: "it would be nice if we wouldn't offer things that don't do anything, just a nice-to-have vanity thing there"
---
# A step offers nothing it cannot actually do on the graphic in front of it

**Filed:** 2026-09-03, from the walk of `figma-outline-text-title-card.svg`.

## Why

An outlined-text import has one layer and no editable text. The door says so correctly and
recommends re-export, which he walked and accepted. The next step then still offers the layer
tagger, which on that file can do nothing - every shape is in one layer.

> Of course, it would be nice if we wouldn't offer things that don't do anything, just a
> nice-to-have vanity thing there.

He called it not a big deal, and it is not. It is filed because it is the SAME rule he ruled on
for the Style step on 2026-08-28 - offer only what can change the graphic in front of you - and
that rule has now earned a second instance, which is what turns a fix into a principle. A control
that cannot move anything teaches the user that our controls are decorative.

## What it would take

1. Name the rule once, in the wizard's contract, rather than fixing each step separately:
   a step's control is offered when it can change THIS graphic, and hidden when it cannot. The
   Style step's `cssPaintsWith` (`src/blocks/cssVars.ts`) is the shape that already works - ask
   the artwork, then offer.
2. Apply it to the layer tagger on a single-layer import. Check the other steps on the same file
   while there; the outline import is the leanest graphic the wizard ever carries, so it is the
   case that exposes every decorative control at once.
3. Hiding, not disabling - a greyed control still asks to be understood.

## Evidence

Owner walk, verbatim in `docs/acceptance/owner-queue/2026-08-28-svg-import-against-real-exports.md`.
The Style step precedent is `docs/backlog/style-step-palettes-match-graphic.md` part 1, landed
2026-09-02.
