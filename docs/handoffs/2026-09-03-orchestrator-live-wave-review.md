# Orchestrator review after the first real day and night waves

**Branch:** `claude/orchestrator-review-optimize-5800db`. The assessment is appended to
`docs/ORCHESTRATION_REVIEW.md` ("The live-wave review - 2026-09-03 evening"); the owner's rulings
from the brief are in `docs/OWNER_RULINGS.md` (owner-decisions-2026-09-03, "The orchestrator
review brief"). This file is only what a next session needs.

## What landed, as pointers

- `9daf5b28` - the agy invocation preflight (`scripts/agy-run.mjs`, pinned in
  `scripts/harness-usage.test.mjs`), `scripts/harness-capabilities.json` and the capability lines
  in `npm run harness:usage`, the rulings entry.
- `c6028b54` - Codex as the default second implementation pool (`routing.md`), the economy notes
  in `scripts/wave-plan-check.mjs`, the incident "the reserve that was never drawn on", the dated
  section in `docs/HARNESS_ROUTING.md`.
- `39d3b467` - a date-only entry condition puts an AUTHORIZED programme on the frontier (core), the
  routing trim, the `delegation-invocation-defects` receipt deleted as met.

## What is left, in priority order

1. **Run the wave the review asks for.** Route every long-to-do, short-to-specify row to Codex
   (GPT Sol high) through `rescue` from an owning Claude row, with a fallback each. The morning
   report reads two numbers: Claude tokens per landed row (`npm run harness:usage -- --wave`, the
   by-project table divided by `npm run jobs` landings) and rows landed. That is the proof; nothing
   in this branch is proven until it runs.
2. **Two point-of-use mechanisms with a tool shape, unbuilt:** a `PreToolUse` guard on
   `mcp__Claude_Browser__preview_start` from a linked worktree (three rows walked into the trap
   `docs/DEV_PORTS.md` names, in two waves), and a script that prints WHICH jobs a CI run executed
   and refuses to call a cancelled-shard run green (three rows walked into root `AGENTS.md` rule 4;
   `docs/backlog/ci-run-cancellation-hides-skipped-shards.md` is the same fact).
3. **The `/check` simplify leg never ran delegated in eighteen rows** - every handoff says
   "simplify: inline, the skill returned fan-out instructions". Either the skill's shape changed
   or the workflow's four-branch rule needs a blocking path for it; measure before editing.
   `docs/backlog/check-verdict-stamp-unwritable-from-isolated-worktree.md` is the sibling defect
   (three rows could not write the stamp).
4. **`docs/PROGRAMMES.md`, `docs/NORTH_STAR_2027.md` §3 and the GOALS NEXT sentence still say a
   programme "flips ACTIVE on the NOW date".** The core now overrides that at planning time. The
   register text was not edited here because `ram-usage-investigation-de91e5`
   (`claude/phone-walk-skill-ce7229`) holds both GOALS.md and PROGRAMMES.md unmerged; edit them
   once that branch lands, quoting the 2026-09-03 ruling.
5. **The owner-question score.** The report's alignment questionnaire should count the questions
   it carried that an agent could have decided (16 of 27 this time) and name the wave defect. One
   clause in `report.md` item 10, budget-neutral. The prototype rule ("if the answer is observable
   by running something, run it") wants one clause in `prompts.md` when a line is freed.
6. **Codex analogues of the preflight** (`scripts/codex-rescue.mjs`): whether foreign-checkout
   paths and plan-mode writes fail there too is unmeasured; measure on the first Codex rows.
7. **The ceremony-threshold experiment** from the pstack table: one day with three or fewer
   frontier rows run as a single owner session, compared on verified rows per Claude token.

## Evidence and traps that exist in no repo file

- The measurement report that the assessment rests on is in the session scratchpad
  (`wave-measurement-first.md`); its per-row table, the 27 owner questions with classes, and the
  missed-instruction list are summarised in the review section. The day plan's heartbeat stamps
  drift one to four hours from the job store; use `landed.jsonl` and the job files for timing.
- The blinded routing eval: two sanitized directories under the scratchpad (`planning/alder` with
  the old routing module, `planning/birch` with the new), one organic prompt, six real rows, the
  real `harness:usage` snapshot. Old: Codex unused, the 250-line specced build sent to
  `agy-gemini --write`. New: that build to `codex` with an `opus high` fallback, every pool used.
  One sample each, graded by this session; treat it as a discrimination, not a rate.
- The commit-message guard scans the WHOLE command, so a patch script whose text names a harness
  cannot share a command with `git commit`; run the script first, commit second.
- The `agy` grant file on this machine has no `command` grant, so the preflight's command warning
  is deliberately reserved for a prompt that declares no tool set at all.

## Verification

`node --test` on `scripts/harness-usage.test.mjs` (85 cases) and `scripts/wave-plan-check.test.mjs`
(8 cases) green; `eslint` clean on every touched script; `npm run check:shared-instructions`
reports the common path at 640/640 and the core at 198/200; `npm run owner-receipts -- --check`
green after the receipt deletion. `npm run build` and `/check` results are recorded in the
commits that follow this file.

Needs the owner: nothing. The Claude Code upgrade and the two knobs from row B's handoff still
wait on him, unchanged by this branch.
