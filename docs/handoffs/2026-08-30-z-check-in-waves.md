# Session Z - the check workflow inside a wave session

Branch `claude/z-check-in-waves`. One file changed: `.agent-workflows/check.md`.

## The reproduction REFUTED the assumed cause

The wave prompt's premise was that the check workflow's code-review leg spawns subagents, and
that a wave session therefore waits forever on a completion notification that routes to the
orchestrator instead. **That is not what happens.** Measured from inside this wave session on
2026-08-30, both legs invoked over a real branch diff:

- **`code-review` works fine here.** It returns `Skill "code-review" completed (forked
  execution)` with the full findings in the tool result. It is a BLOCKING fork, not a background
  agent - nothing is waited on, no notification is involved. Run twice this session (once at
  `low` against `HEAD~1`, once at `high` against this branch); both returned findings inline, and
  the second correctly named this worktree's branch, commit and file.
- **`simplify` is the leg that actually cannot run.** It is an inline skill whose instructions
  say: "Launch **4 independent review agents** via the Agent tool, all in a single message so
  they run concurrently", and then "Wait for all four agents to complete". That is a background
  fan-out plus an explicit wait - the exact shape the orchestrator's "What can run at once"
  bullet says never returns in a launched session. Reproduced twice, once with the diff in scope.

So the failure was **half a real wall and half an ambiguity**, and the ambiguity was the bigger
half. The old text branched on "if the tool **provides** a dedicated code-review capability" - a
question about the tool's inventory, when the question that decides the outcome is whether the
result can come back to this conversation. A wave session has the capability and can use one form
of it and not the other, so the rule as written had no correct answer, and the three sessions on
2026-08-29 gave it three. Two of them fell back to reviewing their own diff by hand, which was the
right action, and reported it as a check, which was not.

## The fix

The workflow decides from **what the invocation returned**, never from what kind of session it
thinks it is in - the only form of the rule that cannot be got wrong by a session that does not
know its own context.

- Preamble states the real line: a **blocking** delegation that hands its result back in the tool
  result is fine everywhere; a **background** fan-out is not, because the notification goes to the
  launcher.
- Phase 2 has one rule with four outcomes: findings or an explicit clean result mean it ran
  (`delegated`); fan-out instructions, a bare agent/job id, or no capability at all mean it did
  not, so the leg is done inline (`inline`). There is always an inline path.
- Phase 3 classifies by the same rule, and must invoke rather than assume.
- The review is invoked with an **explicit level**. Claude Code's `code-review` reuses the last
  level typed when none is given, so a bare invocation could silently inherit `ultra` - a cloud
  multi-agent run that reports back out of band, i.e. the failure the change exists to prevent.
- Phase 5 reports `review: <mode>` and `simplify: <mode>` from `delegated | inline |
  discarded+inline | not run`. A `not run` leg means the check did not pass and says so. This is
  also what makes the `/check` trial evaluable: a silent fallback destroyed the evidence.

Considered and rejected: changing what wave prompts ask for (puts the knowledge in the caller,
which is the defect); and sanctioning a foreground `run_in_background: false` fan-out (untested,
and directly against the standing no-spawn rule - not something to introduce from a doc session).

## `so` does NOT have this shape

`.agent-workflows/so.md` never delegates anything. Its whole procedure is read-only git and doc
reading in one context, and it forbids writing. It cannot hit this wall, and it needs no change.

**One thing worth the owner's eye, not fixed here:** `so` says it "runs in a FRESH session on
purpose", so a wave session cannot get a second opinion on its own work without spawning one. That
is a gap in how waves are planned, not a defect in `so`, and `so.md` was outside this session's
TOUCHES. If second opinions are wanted inside waves, the orchestrator has to plan an `so` session
as its own wave row.

## Also found, reported not fixed (pre-existing, outside the diff)

`.agent-workflows/check.md` line ~72 cites `docs/handoffs/2026-08-29-dd-svg-fitting-two.md` as
evidence for the wrong-worktree failure. That file no longer exists - handoffs are consumed, and
`c5823d3b` deleted it. The citation resolves only in git history. Any durable citation into
`docs/handoffs/` will dangle the same way; it should point at the commit instead.

## Verified

- `npm run build` green on `d542541a`, branch stamp `claude/z-check-in-waves` (the wrong-tree
  trap in the root `AGENTS.md`).
- `node scripts/check-shared-instructions.mjs` OK - the two adapters
  (`.claude/commands/check.md`, `.agents/skills/check/SKILL.md`) are unchanged and still thin, so
  they stay in step by construction. All behavior is in the canonical workflow, per
  `docs/AGENT_WORKFLOWS.md`.
- No e2e: no product code changed.
- `docs/VERIFICATION.md` untouched - it makes no promise about the check workflow's review legs,
  so nothing in it became wrong.

**The proof is this session itself.** The repaired workflow was run end to end on its own branch
from inside a wave session - the situation that failed. It ran, the review leg came back
`delegated` with seven findings, six of them real and fixed in `d542541a`; the simplify leg came
back `inline` and was done here. `review: delegated`, `simplify: inline`.
