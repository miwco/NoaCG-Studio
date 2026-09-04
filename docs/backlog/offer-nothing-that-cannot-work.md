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

## Landed 2026-09-05, with the sweep the rule asked for

**The named instance was the LAYER STAGGER, not the layer tagger** - the dictation lost a letter,
and the step it sits on is Animation, not the mapping step. On `figma-outline-text-title-card.svg`
the mapping step already offers nothing it cannot do (its outline rows and "Add a field" are both
conditional, and the file gets neither). The Animation step offered the "Layer stagger" card,
which reads "the design's layers rise into place one after another"; the preset targets the
artwork's named top-level groups, a Figma frame export has none, and the emitter falls back to a
plain whole-unit fade. Verified in the product: with that card picked, the created graphic's
`NOACG_ANIM` was one `.imported-design-box` opacity track.

`presetMovesSomething` (`src/blocks/presetRegistry.ts`) now answers "can this preset move THIS
design", reading the same `svgLayerSelectors` the emitter is handed. Three surfaces ask it: the
wizard's Animation step, the Inspector's motion-style dropdown (which offered the same dead
option after creation - confirmed by applying it and watching a fade land) and the legacy
timeline's start-over list.

**HIDDEN, not greyed**, as this file asked - and the reasoning held up at the surface: the
universal motion bank sits right beside the hidden card and offers everything the artwork can
actually do, so there is nothing to teach and nothing lost.

The sweep found three more instances, all verified live and all fixed in the same pass:

- **"Reveal in steps"** was offered on twenty categories that ignore it (scoreboards, versus,
  the competition pack, polls, audience graphics, frames, transitions, stream notifications).
  Ticking it on House Match-up left the built template byte-identical.
- **"Apply to: Heading / Body / Numeric / Label"** in the Style step's typeface panel never
  reached the graphic at all - a key-format mismatch dropped every per-role pick. Repaired, and
  the roles a design does not read are no longer listed (nothing in the catalog declares
  `--font-body`).
- **"Colors & typeface from this project"** was offered in the video, dropped-file and blank
  walks, none of which have anywhere to put a palette or a typeface.

One finding was filed rather than fixed: `docs/backlog/typeface-search-ignores-apply-to.md`.
