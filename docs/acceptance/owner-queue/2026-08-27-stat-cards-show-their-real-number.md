# Stat cards show their real number

**Date:** 2026-08-27 · **Branch:** `claude/infographic-settle-semantics`

## What changed

Every counting graphic - a big stat, a bar chart with figures at the tips, a percentage ring, a
fundraising total, an election seat board - was showing **0** on every card, thumbnail and
preview. Not the number the operator typed. Zero. "Big Stat" advertised itself with `0%` where its
own data said `87%`, and seventeen readouts across eleven designs did the same thing.

The cause was one runtime detail with a one-line fix. A card parks a graphic at the end of its
entrance without playing it, and that jump deliberately silences the animation's callbacks (so
clocks and loops do not start on a still frame). The counting numbers only ever reached the screen
FROM one of those callbacks, so they never arrived. Each count now also writes its final figure as
a plain value, which survives the jump.

Two other things came with it:

- **The editor canvas and the cards now settle identically again.** They had briefly diverged, to
  paper over this same bug from the other side. The cost was visible on credits: two designs
  settled with only half their frame covered on the canvas while the cards showed a full one.
- **A gate that reads the settled figure of every counting design.** There was none - which is why
  the zeros shipped and nothing said so. It discovers the designs itself rather than working from
  a list, so a new counting design is covered the day it lands.

## The route, in under a minute

1. `/app` → **Home**. Look at any saved graphic card that shows a big number.
2. `/app` → **New graphic** → **Templates** → in the search box type **stat**. The Browse cards
   are live previews: **every figure on them should be a real number.** Before this, every one of
   them read 0.
3. Search **Election** and look at the seat board - the figures at the ends of the bars. Then
   search **Fundraising** and look at the money total. Same story.

## What to look at

- **Real figures, no zeros.** That is the whole check, and it is not subtle - a card either shows
  87% or it shows 0%.
- The number should be the FULL text, decimals and thousands separators included: `124,213`, not
  `124213` and not `124`.
- Press **▶ Replay** on one of them. The count should still roll up from zero the way it always
  did - the fix must not have turned the animation into a jump cut.

## Also worth a glance

The reasoning is in `docs/DYNAMIC_MOTION_SCOPE.md` §11a. One thing was deliberately left alone and
filed instead (`docs/backlog/settle-emitted-runtime-finite-end.md`): the same class of fault
exists one runtime deeper, in the code every exported template carries, where it is reachable but
currently harmless. Fixing it changes the bytes of every template in the catalog, so it wants its
own branch rather than a ride on this one.
