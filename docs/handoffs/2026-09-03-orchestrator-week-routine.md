# The weekly loop over the orchestration system

**Branch:** `claude/orchestrator-weekly-review`. Owner ask, 2026-09-03: a routine that checks the
orchestrator skill once a week - Codex and Antigravity use, decisions taken without asking him,
what the skill changed about itself, tokens across all models, a recap of how to improve it, and a
look at what other orchestrator skills on GitHub do. Built as the repo's usual pair: a script that
measures and a workflow that judges.

## What landed, as pointers

- `scripts/orchestrator-week.mjs` (+ `.test.mjs`, in the build): one page from the harness meter
  (its JSON now carries tokens by model), the delegation ledger, the capability standings, the
  wave plans (rows by pool, `DECIDED:` lines), handoffs added in the window read at the commit
  that added them, owner-queue items by kind, `landed.jsonl`, and git over the paths that are the
  orchestration system, with the common-path count now against the window's start.
- `.agent-workflows/orchestrator-week.md` with `.claude/commands/` and `.agents/skills/` adapters:
  measure, read the skill's own week for text where a mechanism was available, search for what
  other orchestrators do (three ideas at most, each classified against a measured failure), write
  the recap with candidate rows to `docs/handoffs/<date>-orchestrator-week.local.md` in the main
  checkout. The next `/orchestrator` reads it (`grounding.md` names it beside the CI verdict).
- Scheduled task `weekly-orchestrator-review`, Tuesdays 09:15 local (the owner moved it off
  Monday: his allowance can be spent by then). Registered in `docs/ROUTINES.md`.
- `report.md` item 10: each questionnaire item opens with `DECIDED:`, which is what the count reads.

## Evidence and traps that exist in no repo file

- The first live page over the last seven days: 5.9 B Claude tokens across models (Opus 4.9 B,
  Fable 0.9 B across two ids), Codex 168 M over 22 sessions, Antigravity 21 calls with 7 empty;
  21 rows planned in three wave plans, 5 of them off Claude; 148 branches landed; 0 `DECIDED:`
  lines yet (the marker is new) and 2 in the older wording; 99 non-merge commits touched the
  system, which is the modularisation week and will not repeat.
- Two counts are proxies and say so on the page: decisions are marker lines, asks are heading
  matches. Older owner-queue items carry kinds the checker no longer accepts (`decision`, `docs`,
  `look`), so the by-kind line shows an `unknown` bucket for the first weeks.
- The script runs `harness-usage --json`, which probes the three CLIs' versions; the page takes
  about a minute on this machine.

## What is left

1. The weekly percentage stays the owner's: he reads it off his account page and the routine
   never computes or asks for it (his ruling, 2026-09-03).
2. The routine's first real run on 2026-09-08 is the test of the recap's usefulness. If its
   candidate rows are not lifted into that day's wave, the workflow's step 5 is the thing to fix.

## Verification

`node --test` on `scripts/orchestrator-week.test.mjs` (9 cases) and `scripts/harness-usage.test.mjs`
green; `eslint` clean on the touched scripts; `npm run check:shared-instructions` reports 16
workflow pairs and the common path at 640/640; line endings clean. The build and check verdicts are
in the commits that follow this file.

Needs the owner: nothing.
