---
v: 1
source: owner
raised: 2026-09-01
state: parked
note: "the launch-path hook landed 2026-09-05; the fan-out hook's premise was measured false mid-build and what is left is a Stop-time shape with one data point behind it"
asked: "we keep running into the same mistakes... why can't we find those when we need them? - a rule with a tool shape should fire at the tool call instead of relying on someone having read it"
---
# The mistake-trigger hook that is still unbuilt

**Filed:** 2026-09-02, from the 2026-09-01 night-wave plan (row E, never launched). **Source:**
owner, 2026-09-01. **Narrowed 2026-09-02** on `claude/d-mistake-trigger-hooks` and again
**2026-09-05** on `claude/r-mistake-triggers`, which read fifty handoffs and the incident file for
what actually recurs and built three hooks from that (`docs/MISTAKE_TRIGGERS.md`, "The 2026-09-05
read"). What is left is one item, and it changed shape.

## Why

A rule in a contract fires only if somebody reads the contract; a hook fires every time. On
2026-09-01 the `check` workflow already said a launched session must not spawn a background
fan-out, and session C spawned six anyway - twenty-one findings survived only because a human was
awake to relay them.

## What closed

- **`docs/MISTAKE_TRIGGERS.md`** says which lessons have a tool shape and become hooks, which
  belong in a build gate, which are judgements no mechanism can hold, and how a hook is verified.
- **The handoff hook** (2026-09-02): destroying a handoff that still lists open items with no
  wave-plan trace raises a notice.
- **The launch hook** (2026-09-05): `scripts/hooks/guard-agent-launch.mjs` refuses an Agent launch
  whose prompt's `TOUCHES` or `READ` line names a path that exists neither in the launching
  checkout nor on `origin/main`, quoting the entry back. Parser in `scripts/wave-plan-check.mjs`
  (`promptPathProblems`), tested there; the hook is fed real events in
  `scripts/hooks/guard-agent-launch.test.mjs`.
- Two hooks this file never asked for but the evidence did, same day: the follow-up push that
  cancels an unfinished CI run (`warn-command.mjs`, 16 handoffs), with the push-and-dispatch pair
  refused in `guard-command.mjs`; and `preview_start {name}` from a linked worktree
  (`guard-preview.mjs`, 4 handoffs).

## What is left

**A turn that ends while a background Agent this session launched has not reported.** The
2026-09-02 shape - warn on any background fan-out from a launched session - was measured on
2026-09-05 from inside a launched row and does not hold: the row launched a background Agent and
the completion notification arrived, appended to the result of its next blocking tool call. The
transcript was filed under the PARENT's `subagents/` directory, which is how the notification
routes, and it still reached the row while the row was mid-turn. What cannot arrive is a report for
a session that has already stopped, which is the 2026-09-04 relay incident.

So the moment is Stop, not the launch. The check: the transcript holds an `Agent` tool use with
`run_in_background` not false and no later `task-notification` carrying that agent's id. The cost
is the reason it waits: the launch can be far behind the tail `scripts/stop-wait.mjs` reads, so
this reads the whole transcript at every Stop, and it has one data point behind it. Build it on
`agent_id`, which every hook event inside a subagent carries, not on the transcript path. Test it
against a real launched row, both directions, per `docs/MISTAKE_TRIGGERS.md`.

## Evidence

The night-wave plan of 2026-09-01 (row E, verbatim in the orchestrator home's
`docs/handoffs/2026-09-01-night-wave.local.md`);
`docs/handoffs/2026-09-02-h-orchestration-guardrails.md` for the first three guardrails;
`docs/handoffs/2026-09-02-d-mistake-trigger-hooks.md` for the 2026-09-02 round;
`docs/handoffs/2026-09-05-r-mistake-triggers.md` for the measurement that reshaped this item.
