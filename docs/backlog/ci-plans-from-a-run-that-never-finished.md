# CI plans a push from a run that never finished

**Filed:** 2026-09-05, from the review of `claude/r-mistake-triggers` (altitude finding 1). A
build-gate change, so its own row: a gate lands alone.

## Why

`ci.yml`'s plan step sets the diff base for a push to `github.event.before` unconditionally
(`BASE=$PUSH_BEFORE`, falling back to the fork point only when `before` is empty, all zeros or
unreachable). It never asks whether the run for `before` FINISHED. Under the ref-wide concurrency
group a follow-up push cancels that run, so the delta `before` owed is covered by nothing, and the
new run plans only its own small delta and reports the gate green. Sixteen handoffs between
2026-09-01 and 2026-09-05 carry the trap; `scripts/hooks/warn-command.mjs` now says so at the push,
from the laptop, through a `gh` that goes silent offline. The fact is authoritative where the plan
is made, and ci.yml already argues the fork point "can only ever plan MORE than the truth, never
less".

## What

In the plan step, for a `push` event: if no completed `ci.yml` run with a verdict (`success` or
`failure`) exists for `before` on this ref, plan from `git merge-base origin/main HEAD` instead of
`before`. `gh run list --commit <before> --workflow ci.yml --json conclusion` answers it in one
call with the workflow's own token. Keep the manual door as it is: a `workflow_dispatch` with no
`diff_base` still runs everything. When this lands, the push notice in `warn-command.mjs` becomes
belt-and-braces and its header should say so; the refusal of push-and-dispatch in one command is
about a different defect (`docs/backlog/ci-concurrency-group-per-event.md`).

## Evidence

`.github/workflows/ci.yml`, the plan step ("RECOVER A BASE INSTEAD OF ESCALATING");
`docs/backlog/ci-run-cancellation-hides-skipped-shards.md`; `docs/MISTAKE_TRIGGERS.md`, "The
2026-09-05 read", first row.
