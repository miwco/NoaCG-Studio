# Handoff - SVG animation direction review (session AA, night wave 2026-08-28)

Branch `claude/aa-svg-animation-review`, worktree `.claude/worktrees/aa-svg-animation`.
Docs only, no product code. Queued for landing at the end of this session.

## What was done

The owner's brief - continuous on-air motion for SVG-based graphics, three classes on the one
model, one format with two ceilings - is answered in **`docs/SVG_ANIMATION_DIRECTION.md`**:

- **The three classes:** in/out and state/event are already whole on the shipped model;
  ambient is the real question, and it is smaller than the brief frames it. The model already
  carries the primitive (`loops` per track, played in its own repeating sub-timeline;
  `dynamics` for measured motion). What is missing is the runtime's definition of a
  timeline's END: `progress(1)` is poisoned by any endless child (timers refuse to arm,
  snap/settle seek to an arbitrary phase). The direction's one semantic ask: **end = the
  finite end**, everywhere the emitted runtime asks - which resolves the timer trap, the
  filed settle bug, and makes ambient legal in any state, all at once.
- **The rest contract:** ambient presets put the rest pose in the first keyframe, so snap,
  settle and thumbnails show the drawn artwork with no phase luck. Preset-guaranteed;
  a validation warning (never an error) at the agent ceiling.
- **Layer addressability:** import already ships ids verbatim; the gap is depth (top-level
  groups only) and is surfacing, not format.
- **MVP (one phase, §6):** the finite-end runtime change (graduates
  `docs/backlog/settle-emitted-runtime-finite-end.md`, whose own trigger - "the moment a
  design review says so" - this is) plus two ambient presets (breathe, glow-pulse) on svg01's
  layers, with the fixture/spec and both catalog baselines the blast radius demands.

## Filed

- `docs/SVG_ANIMATION_DIRECTION.md` - the direction, with §9 the owner's four decisions.
- Backlog: `svg-ambient-preset-bank.md`, `svg-ambient-state-scope.md`,
  `svg-deep-layer-addressability.md`; `settle-emitted-runtime-finite-end.md` now points at
  the direction doc as its trigger.
- Owner queue: `docs/acceptance/owner-queue/2026-08-29-svg-animation-direction.md` (route:
  §0 summary + §9 decisions).

## Verification

- `npm run build` green in the worktree (branch stamp checked:
  `claude/aa-svg-animation-review`). Docs only, so no affected e2e run applies.
- **The /check trial (night one):** the check workflow was run per
  `.agent-workflows/check.md`. The code-review skill fork completed but returned an empty
  report to this session, so its findings (if any) were not observable here - the direct
  diff review that backs it verified every factual claim in the doc against
  `animRuntime.ts`, `animMachine.ts`, the import plan and the settle scope doc, and found
  nothing to fix; simplify had nothing. Net: /check caught nothing on a docs-only branch,
  and the empty fork result is worth knowing for the trial's evaluation.

## For the next session

Nothing builds from this branch. The MVP starts only if the owner approves §9 - when that
happens, it is its own branch (whole-catalog emitted-JS churn; never a rider), and the
`settle-emitted-runtime-finite-end.md` backlog file is deleted in the commit that schedules
it.
