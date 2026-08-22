# src/templates/cornerBug - the identity bugs

Loaded alongside the root `AGENTS.md` and `src/templates/AGENTS.md` when working in this
directory (Claude reads it via this directory's `CLAUDE.md` import; Codex reads it directly).
Keep it accurate.

Split out of `src/templates/AGENTS.md` on 2026-08-22, which keeps the catalog-wide rules and
the category index. Add a RULE here; leave the reasoning in the code's own comments.

## cornerBug/ - the IDENTITY family

bug01…bug36, the IDENTITY family (prefix 'corner-bug', standard assembler,
`dataRegion: true`, logo slot + placeholder mark). bug01-04 are the general logo bug; bug05-36
are the eight identity types x four families (types/identityBugs.ts): station ident, live
status, logo-only mark, sponsor strip, sponsor rotation, event ident, award mark, location
chip. Shared authoring parts live beside them - **parts.ts** (the logo slot's field, markup and
CSS, with a per-family placeholder mark: bars / diamond / slab / keyline / ring),
**statusParts.ts** (the live bug's three word sources + the class-driven look of its states),
**rotationParts.ts** (the one-stage stacking a rotation needs) and **bugRuntimes.ts** (the
design-owned JS the two machine-bearing types call by name: `bugStatusLive/Replay/Standby` and
`sponsorShowNext`). bug02 = house live clock via StandardDesign.runtimeExtraJs - design-owned
JS emitted BEFORE the marked ANIMATION region, DOM-ready guarded, survives the data conversion
untouched; the identity runtimes ride the same seam.
