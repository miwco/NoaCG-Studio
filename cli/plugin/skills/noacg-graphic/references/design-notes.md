# NoaCG design notes (OPTIONAL - off by default)

Read this only when the user asks for "the NoaCG look", house guidance, or a catalog-matching
style. Nothing here is checked by the validator beyond what `validator.md` lists; it is the
studio's own taste, written down, offered - not imposed. Design the way you design; this is what
NoaCG's own designs follow when they want to read as a family.

- **The bar.** Every template should look like a paid MotionArray / Envato Elements asset, not a
  tutorial demo. Restraint where the content is serious; distinctiveness without decoration.
- **Reason from the brief, not from a house look.** A news strap, an esports ranking, an election
  result, a financial ticker, an entertainment card and a children's programme each earn
  DIFFERENT answers - density, weight, colour energy, motion speed. "Same layout, different
  colours" is a named failure.
- **Typography.** Name lines 44-92px at 600-800 weight; role/title lines 22-46px; kickers 16-22px
  with 0.08-0.2em tracking; heading-to-secondary ratio about 1.8-2.2 : 1; never below 20px at
  1080p (16px for a persistent corner bug). Secondary text has a floor too - "ON AIR", a role
  line, a sponsor wordmark are not decoration. Weight and contrast are part of legibility: thin
  grey on black does not read on air. Live numbers set in a face with even digits
  (`font-variant-numeric: tabular-nums`, lining figures) so a score does not jitter.
- **Colour.** One accent, used once and sharply; primary text >= 4.5:1 against what it actually
  sits on; secondary >= 60% white on dark panels; never accent text on an accent fill.
- **Shape and placement.** A strap spends WIDTH, never height; a lower third hugs its text; a
  board (a card, a score, a notice that is up all evening) keeps a fixed stage and wraps/shrinks
  inside it. 119-120px from the frame edge is the catalog's whole safe-area inset. A mark inside
  a container is centred in it; a mark between an accent line and text is optically balanced,
  not crowded; a package's mark is on every piece or none.
- **Motion.** Entrances with Out-direction eases (`power2.out`, `power3.out`, `expo.out`;
  `back.out` for a snappy pop), 0.5-1.4 s total; exits In-direction and FASTER; staggers 60-250
  ms; linear only for continuous travel (tickers, rolls, timers); bounce/elastic only when asked
  for playful. Transform/opacity only - 60 fps is the contract. Never skew/rotate the element a
  timeline tweens; paint it on a `::before` layer.
- **Code.** The simplest clear code: direct HTML/CSS/JS, descriptive names, short comments that
  say WHY, rich but commented CSS, no frameworks, no build steps.

Families the catalog ships (for a graphic meant to sit beside them): `minimal` (hairline,
whitespace, type does the talking), `sport` (slabs, skew on a painted layer, volt accents),
`glass` (frosted panels, soft blur, rounded), `noacg` (the house look: void panels, one amber
accent, mono kicker), `editorial` (masthead serif, rules, print rhythm), `cinematic`.
