---
v: 2
source: owner
kind: ask
raised: 2026-09-05
state: unstarted
asked: "we should also check that the orchestrator works as well in Codex as in Claude because I will be using that when we run out of usage"
serves: H0
size: standard
touches: .agents/skills/orchestrator/SKILL.md, .agents/skills/o/SKILL.md, .agent-workflows/orchestrator.md, .agent-workflows/orchestrator/night.md, docs/handoffs/
covered-by: scripts/check-shared-instructions.mjs, scripts/wave-plan-check.test.mjs
needs-owner: none
---
# The orchestrator produces the same plan in Codex as in Claude Code

**Filed:** 2026-09-05. **Source:** owner ruling (`docs/OWNER_RULINGS.md`, owner-decisions-2026-09-05).

## Why

When Claude usage runs out the owner switches to Codex, and the orchestrator is the session he
starts first. Today the Codex adapter (`.agents/skills/orchestrator/SKILL.md`) points at the same
`.agent-workflows/orchestrator.md`, and `check-shared-instructions` proves the pair exists and the
modules link - but nothing has ever RUN a wave plan in Codex and compared it. The known gaps are
documented, not measured: no Monitor (so no watch loop, no refill, follow-ons collapsed into
prompts), no `AskUserQuestion` hook (so the 2026-09-05 question rule is the contract line alone),
no `Agent` tool (so rows are pasted prompts, not launched subagents), and a different notify
mechanism. A plan that quietly differs on a night he is asleep is the failure to rule out.

## What it would take

- Run `$orchestrator` in Codex against the same repository state as a Claude `/orchestrator`
  day plan (same `origin/main` sha, same handoffs), both as dry plans nobody launches. Compare
  the seven sections, the wave table, the candidate list, and whether `wave-plan-check.mjs`
  passes both.
- List every step in `orchestrator.md` and its modules that names a Claude-only tool (Monitor,
  Agent, AskUserQuestion, spawn_task) and confirm each has its Codex arm written out, or write it.
- The question rule: Codex has no PreToolUse hook, so the root `AGENTS.md` line is the guard;
  test it by giving a Codex session a prompt that invites a design question and reading what it
  does. If it asks anyway, the Codex `notify` hook or a wrapper is the next mechanism.
- Record the differences in `docs/AGENT_CLI.md` or the orchestrator's Codex section, and file
  an incident for any step where the Codex plan would have gone wrong unattended.

## Evidence

`node scripts/check-shared-instructions.mjs` on 2026-09-05: 16 Claude/Codex workflow pairs OK,
orchestrator core 198/200, common path 640/640. `night.md` already carves out the Codex night
("no follow-on rows and no refill at all"). No recorded Codex-run wave plan exists in
`docs/handoffs/`.
