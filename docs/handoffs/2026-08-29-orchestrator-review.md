# Handoff - orchestrator strategic review, contract edits landed, script leftovers

A strategic review of the orchestration design (both harnesses) found the architecture sound;
four contract-level findings were fixed on this branch. Three script-level leftovers below
belong in the machinery row - they do not merit their own session.

## What this branch changed (why in each edit's own text)

- `.agent-workflows/orchestrator.md`: a third never-acts exception - the gitignored
  `docs/handoffs/<date>-wave-plan.local.md` wave-state file (plan + tick heartbeat), so a night
  wave's follow-on prompts survive the planning session dying; honest cost of subagent launches
  added to the loop-is-additive invariant; stall telemetry as a tick step (report-only, frees
  the cohort slot); owner-queue depth as a plan-time capacity input with a ~10-item backpressure
  rule; the effort gap of the Agent-tool launch path; Codex named explicitly as not an
  autonomous wave peer. Gate marker updated in the same commit
  (`scripts/check-shared-instructions.mjs`, two exceptions -> three).
- `.agent-workflows/handoff.md`: the no-files rule now names its one exception - a wave
  session's prompt-mandated handoff file - so the two handoff channels stop contradicting.
- `docs/JOB_RUNNER_PLAN.md`: rollout step 4 no longer claims "a person still queues each
  landing" - stale since the queue-merge norm (owner, 2026-08-25).

## Leftovers for the machinery row (with the cwd-class fix)

1. **The jobs directory never prunes** - terminal job JSON files and logs accumulate forever;
   `addJob` throws once 9999 ids are taken (`scripts/jobs-store.mjs`). Add a TTL sweep for
   terminal jobs older than ~14 days. Why: the queue is now the landing path for every wave;
   a full id space or a bloated dir fails it at the worst time.
2. **`merge-order.mjs` candidates are local branches only** - `printOutstanding` in `jobs.mjs`
   already enumerates `origin/*` too because a remote-only branch once sat unmentioned seven
   weeks. Align the candidate sets or comment the asymmetry where both read it. Why: the
   orchestrator quotes merge-order verdicts as the authority; a branch it cannot see gets no
   verdict at all.
3. **Verify whether headless `claude -p` can carry reasoning effort.** If it can, the
   orchestrator's new "off-ladder rows go to a chip" restriction can be relaxed to "launch
   headless with the effort flag". Why: it decides whether `opus xhigh` rows can run hands-off.

## Bottom line

Contract edits verified by `npm run check:shared-instructions` and `npm run build`; queued
through the normal path. Nothing else in flight from this session.
