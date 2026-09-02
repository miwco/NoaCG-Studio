---
v: 1
source: owner
raised: 2026-09-01
state: unstarted
asked: "we keep running into the same mistakes... why can't we find those when we need them? - a rule with a tool shape should fire at the tool call instead of relying on someone having read it"
---
# The mistake-trigger design picture, and the three hooks the night wave never built

**Filed:** 2026-09-02, from the 2026-09-01 night-wave plan (row E, never launched; the wave that
ran built three different guardrails instead - see below). **Source:** owner, 2026-09-01.

## Why

A rule in a contract fires only if somebody reads the contract; a hook fires every time. On
2026-09-01 the `check` workflow already said a launched session must not spawn a background
fan-out, and session C spawned six anyway - twenty-one findings survived only because a human was
awake to relay them. The owner's question is the ask: the same mistakes recur because the rule
lives where it is not looked at when it matters.

What exists since: `scripts/hooks/guard-command.mjs` (branch creation in the primary checkout),
`warn-command.mjs` (a commit that stales a queued landing pin), `warn-edit.mjs` (a migration
number already claimed elsewhere) - the 2026-09-02 guardrails - and `stop-wait.mjs` (a turn that
ends waiting on something that cannot wake the session). The three hooks the owner's row named are
still unbuilt, and so is the design picture that says which lessons are hookable at all.

## What it would take

1. `docs/MISTAKE_TRIGGERS.md`: which lessons have a TOOL SHAPE and become hooks, which are
   judgements and cannot, and the rule for deciding. A hook fires per tool call, so a wrong
   judgement inside a correct call is invisible; a hook that blocks wrongly is worse than the
   mistake it prevents. Default to WARN; block only where the check is exact.
2. Hook: an Agent launch whose prompt names a path that does not exist - parse TOUCHES/READ lines
   out of the prompt text, resolve each, refuse with the line quoted (the 2026-09-01 wrong-filename
   error). `scripts/wave-plan-check.mjs` now checks the plan's TOUCHES; the launch is the second
   place the same path can be wrong.
3. Hook: a delete or overwrite under `docs/handoffs/` while the file still lists open items with no
   recorded trace (the 2026-09-01 wrong-deletion error). `scripts/handoff-drain.mjs` makes the
   classification visible; the hook would stop the deletion itself.
4. Hook, WARN only: a background fan-out spawned from a launched session - the `check` rule that
   did not fire.
5. Each hook tested against the real 2026-09-01 case AND a case that must not fire.

## Evidence

The night-wave plan of 2026-09-01 (row E, verbatim in the orchestrator home's
`docs/handoffs/2026-09-01-night-wave.local.md`); `docs/handoffs/2026-09-02-h-orchestration-guardrails.md`
for the three hooks that were built and how each was fed a real event.
