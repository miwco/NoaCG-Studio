# Pass the ograf.dev 83-rule package checker; consider contributing its CI form

**Filed:** 2026-08-29. **Source:** the OGraf ecosystem research round (`docs/OGRAF_ECOSYSTEM.md`
§1d).

## Why

The community's de-facto definition of a *complete* OGraf package is Felipe Iasi's 83-rule
checker at <https://ograf.dev/check> (MIT, <https://github.com/ficosta/ograf>) - it checks well
past the EBU schemas (lifecycle timing, shadow-DOM compatibility, relative-URL safety,
README/LICENSE/preview presence, font licensing, 14 sandboxed runtime rules). Our export already
does several of these deliberately; a clean pass is mostly harvest, and any rule we fail is
either a real defect or a documented disagreement worth recording. The EBU schema stays the
gate; this is the polish-and-credibility layer above it.

## What it would take

Drop a representative set of exported packages (a starter, the dual scaffold, a machine-bearing
quiz/scoreboard) into the browser checker; record per-rule results; fix or argue each failure.
The tool is browser-only (no npm package, no CLI), so a CI-runnable `npx` form would be a
community contribution - the rules are MIT and inspectable. **The contribution half is
OUTREACH and is gated** behind working OGraf playout per the owner's 2026-08-29 ruling
(`docs/OGRAF_ECOSYSTEM.md` §5); the private pass is not gated.

## Evidence

`docs/OGRAF_ECOSYSTEM.md` §1d (rule categories, curator, non-affiliation with EBU);
`docs/OGRAF.md` (what the export already guarantees).
