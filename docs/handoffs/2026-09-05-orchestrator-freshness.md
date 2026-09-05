# The contract staleness gate (change 3 of the orchestrator review)

Branch `claude/orchestrator-freshness`, off `39f8d9b2` (change 2's landing). This is the concrete,
self-contained half of change 3 in `docs/ORCHESTRATOR_SIMPLIFICATION.md` section 5 - the
context-control mechanism the owner asked for by name in
`docs/backlog/instruction-files-need-a-shrinking-mechanism.md`.

## What landed

`scripts/check-contract-freshness.mjs` (with `check-contract-freshness.test.mjs`), in `npm run
build` beside `check-docs-index`, and as `npm run check:contract-freshness`. It scans every
`AGENTS.md`/`CLAUDE.md` chain and every workflow markdown, and fails the build on a backticked
`scripts/...`, `docs/...`, source path, directory or `npm run` reference that git does not have.
The point is that a contract can now be TRIMMED safely: a cut that leaves a dangling pointer fails
at once instead of rotting unread, which is the mechanical half of the owner's shrinking-mechanism
ask (parts 1 and 2, the byte headroom and the reserve gate, landed earlier).

Exemptions, each principled: glob and `<placeholder>` patterns (not paths); gitignored generated
files, asked of `git check-ignore` so the verdict is identical on a laptop and CI (this is what
lets `.claude/launch.json` and the gitignored `example_projects/` reference pack be named though
absent from a clean checkout); and the transient-by-design directories `docs/handoffs/`,
`docs/backlog/`, `docs/acceptance/`, whose files are meant to vanish.

The receipt `instruction-files-need-a-shrinking-mechanism` carries a 2026-09-05 note recording this.

## What is left

- **Change 4 - structured frontier fields** (`serves`, `size`, `touches`, `covered-by`,
  `needs-owner`) on backlog and handoff items, so change 1's refill pick and collision check become
  script output rather than prose the model derives. Independent branch off this landing.
- **Receipt advancement on landing** (`docs/backlog/owner-receipts-do-not-advance-when-their-work-
  lands.md`, row F): the frontier the planner reads still shows landed asks as unstarted. Row F
  proposed an `answered` state and `/queue-merge` asking which receipt a branch serves. Not done -
  it is a receipt-vocabulary change worth its own careful row; filed, not forced.
- **The planner/watcher session split and the thin common path** (the rest of change 3): the
  `.agent-workflows/orchestrator*` common path is at 640/640, and genuinely reducing it needs the
  planner-as-a-subagent split, which changes how `/orchestrator` is invoked. The review frames that
  as an owner-run experiment (and the repo's own rule is that architectural changes are ratified
  first), so it is left for the owner rather than rewritten unattended.

## Verification

- `node scripts/check-contract-freshness.mjs`: OK, 131 contracts, every reference resolves.
- `node --test scripts/check-contract-freshness.test.mjs`: 3 pass (it flags a missing script/doc/
  dir and passes a present one; ignores prose, patterns, transient dirs).
- `npx eslint`: clean. `owner-receipts --check`, `check-docs-index`: green.
- `npm run build`: see the commit's CI run, read job by job.
