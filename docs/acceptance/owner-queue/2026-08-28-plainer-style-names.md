---
kind: agent
date: 2026-08-28
---
# Plainer names for the style vocabulary - which list did you mean?

You said the style vocabulary "all sound so AI generated". The dictation is ambiguous between
two lists, so both are here with plainer proposals. Nothing is renamed yet - say which list (or
both), and whether these words are the right direction.

Route: Create -> Browse (the style chips under the search box) shows list A; pick "A whole kit"
and the "Look" dropdown shows the same six words (today as raw lowercase ids - that at least is
a defect whichever way this goes); Create -> any design -> Style step shows list B in the
palette picker.

**A. The six style families** (Browse chips + the kit Look dropdown):

| today | plainer proposal | why |
|---|---|---|
| Minimal | Clean | says what you get; "minimal" is designer jargon |
| Editorial | Print | rules, paper, serifs - the printed-page voice |
| Cinematic | Film | scrims and wide light caps - the documentary super |
| Sport | Sport | already plain - keep |
| Glass | Glass | already plain - keep |
| NoaCG | House | it is the product's own look; naming it after the brand reads as an ad |

**B. The fourteen palette names** (the Style step's colour list):

| today | plainer proposal |
|---|---|
| NoaCG Amber | Amber |
| Ivory | Gold |
| Porcelain | Paper |
| Signal Red | Red |
| Volt | Lime |
| Inferno | Orange |
| Royal | Blue |
| Vermilion | Brick |
| Broadsheet | Navy on paper |
| Noir | Bone |
| Ember | Warm gold |
| Frost | Sky |
| Orchid | Purple |
| Mint | Green |

The principle behind both columns: name the thing the user sees, not a mood. A rename is a
display-label change only (stored ids never move), so it costs one file per list plus the specs
that assert the words.

## Owner ruled, 2026-08-28 (walk + questionnaire)

Both lists sounded AI-generated to him; specifics, verbatim: *"it's the 'editorial' I don't
really understand what it means. And 'glass' is kinda AI, and what is 'sport'? ... 'minimal'
makes sense. I like 'minimal'"*; on the mood palettes: *"'Frost' and 'Volt' - they sound like
some gaming tags... we are also mainly focused on other types of shows. We should be very
show-agnostic and not give out wrong vibes."*

**Ratified names:**
- Families: **Minimal, Print, Film, Sport, Glass, NoaCG** (Minimal/Sport/Glass/NoaCG kept on
  his word; Editorial and Cinematic renamed).
- Palettes: **the full plainer column above applies** - name the colour, not a mood.
- Same change fixes the kit Look dropdown showing raw lowercase ids.

**Held for the taxonomy files to free up:** the rename touches `src/model/taxonomy.ts`, which a
running search session owns (2026-08-28) - the task starts when that lands.

**His deeper point, routed to backlog:** labels never answer *"a nice-looking graphic for my
late-night show"* - occasion-finding went to `docs/backlog/graphic-use-case-metadata.md`.
