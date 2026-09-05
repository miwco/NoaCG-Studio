---
v: 2
source: owner
kind: ask
raised: 2026-09-01
state: unstarted
asked: "we keep running into the same mistakes... why can't we find those when we need them? - a rule with a tool shape should fire at the tool call instead of relying on someone having read it"
---
# The two mistake-trigger hooks that are still unbuilt

**Filed:** 2026-09-02, from the 2026-09-01 night-wave plan (row E, never launched). **Source:**
owner, 2026-09-01. **Narrowed 2026-09-02** on `claude/d-mistake-trigger-hooks`: the design picture
and one of the three hooks landed there, and what is left is below.

## Why

A rule in a contract fires only if somebody reads the contract; a hook fires every time. On
2026-09-01 the `check` workflow already said a launched session must not spawn a background
fan-out, and session C spawned six anyway - twenty-one findings survived only because a human was
awake to relay them.

## What closed

- **`docs/MISTAKE_TRIGGERS.md`** now says which lessons have a tool shape and become hooks, which
  belong in a build gate, which are judgements no mechanism can hold, and how a hook is verified.
  It also carries the two candidates below with their reasons.
- **The handoff hook** is built: destroying a handoff that still lists open items with no wave-plan
  trace raises a notice, from `scripts/handoff-trace.mjs` through `warn-command.mjs` (deletion) and
  `warn-edit.mjs` (overwrite). Verified by feeding the real hooks real events, including the
  nine-file drain a wave row performs, which must stay silent and does.
- Separately, the machine-wide browser refusal stopped missing wrapped commands
  (`bash -c "npm run test:e2e"` and seven other spellings).

## What is left

1. **Hook: an Agent launch whose prompt names a path that does not exist.** Parse the `TOUCHES` and
   `READ` lines out of the prompt text, resolve each, refuse with the offending line quoted. This is
   the 2026-09-01 wrong-filename error. `scripts/wave-plan-check.mjs` already checks the plan's
   `TOUCHES`; the launch is the second place the same path can be wrong. A path that does not exist
   is an exact check, so this one may refuse rather than warn.
2. **Hook, WARN only: a background fan-out spawned from a launched session.** The `check` rule that
   did not fire. A launched session never receives its own subagents' completion notifications,
   which is what makes the failure silent. It stays a warning because a fan-out is legitimate in an
   interactive session and the hook cannot always tell which it is in.

Both must be tested against the real 2026-09-01 case AND a case that must not fire, per
`docs/MISTAKE_TRIGGERS.md`.

## Evidence

The night-wave plan of 2026-09-01 (row E, verbatim in the orchestrator home's
`docs/handoffs/2026-09-01-night-wave.local.md`);
`docs/handoffs/2026-09-02-h-orchestration-guardrails.md` for the first three guardrails and how
each was fed a real event; `docs/handoffs/2026-09-02-d-mistake-trigger-hooks.md` for this round.
