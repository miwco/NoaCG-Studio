# Handoff - Session G: OGraf ecosystem verdicts (2026-08-29)

**Branch:** `claude/g-ograf-ecosystem`, queued. Research and documentation only - nothing
implemented, the student push untouched.

## What was concluded

**`docs/OGRAF_ECOSYSTEM.md` is the deliverable** - a verdict per ecosystem project, the
generic-OGraf-operation boundary, the isolation model, the bidirectional interop evidence bar,
and binding sequencing. Also landed: the gstcefsrc source-level dossier as
`docs/NATIVE_PLAYOUT_RESEARCH.md` §8 (verdict: fork-and-fix, no external-BeginFrame pacing, no
transparent background - the native-renderer park *strengthened*); a dated update block in
`docs/OGRAF_FIRST_REVIEW.md` (four corrections/extensions, ratified text untouched); the
GOALS.md NEXT ladder reordered playout-first per the owner's 2026-08-29 evening ruling; four
backlog items.

### The verdicts (full arguments in the dossier §1)

| Project | Verdict |
|---|---|
| ograf-server | INTEROP TARGET - reference server; never a dependency (no auth, no instance recovery - validates our command log) |
| ograf-form | REFERENCE ONLY - the GDD oracle to cross-check `ografContract.ts` against |
| ograf-devtool | REFERENCE ONLY + INTEROP TARGET - lift the Service-Worker local-package trick; retry the blocked compliance run |
| ograf.dev checker (ficosta) | INTEROP TARGET - 83 rules (not 82), community not authority, browser-only |
| EBU examples + nytamin/ograf-graphics | USE - the import fixture corpus |
| Eyevinn ograf-editor | REFERENCE ONLY - scene-model-generates-code, the pattern pillar 1 refuses |
| Ferryman | INTEROP TARGET + REUSE PARTS (conventions only: `_field` names, marker vocabulary; AGPL codebase refused) |
| SPX-GC | INTEROP TARGET - **v1.4 plays OGraf packages in SPX rundowns** (the sweep's best finding) |
| gstcefsrc | REFERENCE ONLY, parked |
| Sofie/TSR | REFERENCE ONLY - the three-layer transport/state-diff/orchestrator pattern; recovery = re-diff, not replay |
| SuperConductor | REFERENCE ONLY - dormant, AGPL; proves TSR stands alone |
| casparcg-connection | REFERENCE ONLY today, adopt when the agent outgrows PLAY/STOP/VERSION |
| closed vendors (Loopic, DJ, everviz, Erizos, LiveOS, BBright) | NOT RELEVANT NOW - one lesson each in §1h |

### Sequencing (owner ruling, binding)

Working OGraf playout on the EXISTING output architecture (`/output` + command log) before ALL
outreach; the ograf.dev listing, checker-CI contribution and any EBU contact are gated behind a
real production being testable by EBU/YLE. Encoded in the dossier §5, GOALS.md NEXT, and the
review's update block.

## What is left / next picks

Each is bounded and can be picked cold from the docs:

1. GDD alignment (GOALS ladder) - now with `docs/backlog/ograf-form-oracle.md` as its test idea.
2. Isolation, then import v1, then OGraf playout on `/output` - the dossier §2-§3 specify the
   boundary and the sandbox shape; the fixture corpus (§4 B) is import v1's test suite.
3. `docs/backlog/ograf-checker-83-rules.md` (private pass ungated), `spx-gc-ograf-round.md`,
   `ograf-lottie-ferryman-conventions.md`.

## Step-7 cross-check (the owner's SVG-animation brief vs the two research docs)

The part-2 brief is essentially fully answered by `docs/SVG_ANIMATION_DIRECTION.md` +
`docs/EDITOR_RESEARCH.md`. Genuine gaps, both small:

- **Animated `<pattern>`/texture fills** are never explicitly named among ambient-addressable
  targets (gradients/masks/dashes are) - one line for `svg-ambient-preset-bank.md` when it is
  next touched; no doc rewrite warranted.
- **An AE/Lottie ingestion road** appears in neither doc - now filed as
  `docs/backlog/ograf-lottie-ferryman-conventions.md` with Ferryman's conventions as the model.

## Open questions for the owner

1. **The IBC timing casualty**: the outreach gate means the ograf.dev listing will NOT happen
   before IBC (12 Sept) unless you carve it out. The ruling as relayed gates it; say so if the
   listing (45 min, no product claim implied) should be exempt.
2. **GOALS.md NEXT edit**: the reorder was made from the relayed ruling - worth a glance that
   the wording matches your intent.
3. **ograf-form's table asymmetry**: it renders GDD arrays-of-objects as editable tables; our
   descriptor vocabulary cannot. Fine to leave until foreign packages with table-shaped GDD are
   a real operator need - flag if you want it sooner.
4. **SPX-GC OGraf support** belongs in the next monthly ecosystem-watch ledger block
   (`docs/backlog/ograf-ecosystem-watch.md` - fed by the routine, not by this session).
