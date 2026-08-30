# Close the docs/README.md map, and gate it so it stays closed

**Filed:** 2026-08-30. **Source:** the weekly coherence pass (measurement).

`docs/README.md` opens with "The map of this directory." Its tables carry 62 rows for the 112
markdown files in `docs/`. The 51 with no row are not all offcuts: `VERIFICATION.md`,
`SVG_IMPORT_PLAN.md`, `PLAYOUT_DASHBOARD.md`, `OGRAF.md`, `OGRAF_FIRST_REVIEW.md`,
`INTERACTIVE_PLAYOUT_PLAN.md`, `NOACG_PRO_PLAN.md`, `AGENT_WORKFLOWS.md` and `JOB_RUNNER_PLAN.md`
are among them, and several of those are cited as binding from `AGENTS.md` files. `GOALS.md`
itself has no row either, though the layer list above names it.

## Why

The map is what a session reads to find out whether a subject is already written down. When it is
56% complete and does not say so, a missing row reads as "no doc exists" - so the session either
re-derives something already measured, or writes a second doc on the same subject. That is the
exact failure mode the coherence cadence exists to catch, and it compounds: two docs on one
subject is how contracts start contradicting each other.

The header now warns that the map is incomplete, which stops the wrong inference. It does not fix
the map, and a warning is a worse instrument than a list.

## What it would take

1. **A row for each of the 51**, classified into the section it belongs in (binding contract /
   active plan / rationale-historical). This is the part that needs judgement, not typing: several
   of the 51 are finished plans that still read as open, so classifying them means reading each
   header and deciding whether it is current. Budget one session.
2. **A gate.** A file in `docs/` with no row in `docs/README.md` should fail the build, the way
   `scripts/check-shared-instructions.mjs` fails on an `AGENTS.md` with no `CLAUDE.md`. Roughly
   twenty lines in a new `scripts/check-docs-index.mjs`, added to `npm run build`. Without it the
   map drifts back within a month - it drifted this far with nothing watching.

Do them in that order and in one branch: the gate cannot land while 51 files fail it.

## Evidence

Measured 2026-08-30 on `claude/a-coherence-round`: 112 files in `docs/*.md` excluding
`README.md`; the README's tables carry 62 rows (lines matching ``^\|\s*`<name>.md` ``), leaving 51
files with no row. Reproducible with a directory read and that row match - do not measure it as a
substring search over the whole README, which counts prose mentions and undercounts the gap.
