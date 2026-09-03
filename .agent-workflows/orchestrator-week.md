# orchestrator-week - the weekly loop over the orchestration system itself

Shared canonical procedure - `/orchestrator-week` in Claude Code, `$orchestrator-week` in Codex,
and the body of the `weekly-orchestrator-review` scheduled task (`docs/ROUTINES.md`). Runs once a
week, in a fresh session, read-only on the repository; it writes exactly one gitignored file.

**Why.** Owner, 2026-09-03: a standing loop that checks the orchestrator skill once a week - how
much of the Codex and Antigravity subscriptions were used, how many decisions were taken without
asking him, what the skill changed about itself, what the tokens across every model came to, and
a recap of how the skill can improve - including what other orchestrator skills on GitHub do now.
Every wave already improves the system by one lesson; this is the loop one level up, where the
week's lessons are read together and the direction of the skill is judged, not just its last
incident.

## 1. Measure - one command, nothing recalled

Work from the PRIMARY checkout, `C:\claude\NoaCG-Studio`, so the wave plans in `docs/handoffs/`
and the orchestrator home are both in reach. Run:

    node scripts/orchestrator-week.mjs

It prints one page: tokens by model and per harness on each meter, the Codex snapshot, the
Antigravity calls, the delegation outcomes and which capability observations lapsed; the waves
and their rows by pool, and what the queue landed; the `DECIDED:` count against the asks in the
week's handoffs and the owner-queue items by kind; and the commits that touched the orchestration
system, with the common-path line count now against the window's start. Every number names its
source in the script's header; do not restate a number the page does not carry.

## 2. Read the skill's own week

- `git log --since=7.days --format='%h %s' -- .agent-workflows/orchestrator.md .agent-workflows/orchestrator scripts/hooks`
  and read each commit's diff for one question: did it add a mechanism, or text? A lesson that
  arrived as prose where a hook, script, test or ledger line was available is the week's first
  finding (`docs/MISTAKE_TRIGGERS.md`, the four places a lesson can live).
- `.agent-workflows/orchestrator/incidents.md`: the entries dated this week, read for repeats -
  the same shape in a new costume is a mechanism that did not fire, never a new incident.
- The last morning report's alignment questionnaire (the newest `*-wave-plan.local.md`): which
  `DECIDED:` items were the machine's to take, and which asks in the week's handoffs were not.

## 3. Look outside, briefly

Search for what other orchestrator skills and multi-agent coordinators do now - GitHub first
(`orchestrator skill`, `multi-agent coordinator playbook`, `SKILL.md orchestrate`, the pstack and
Claude Code plugin ecosystems), then whatever the search turns up. Read the source, not a
summary. Bring back at most three ideas, each classified **Already have / Adopt / Experiment /
Reject** against a measured NoaCG failure from step 1 or 2 - an idea with no failure behind it is
noted in one line and not proposed. `docs/ORCHESTRATION_REVIEW.md` carries the classifications
made so far; do not re-argue one it already settled unless the evidence changed.

## 4. Write the recap

Write `C:\claude\NoaCG-Studio\docs\handoffs\<date>-orchestrator-week.local.md` - the name MUST end
in `.local.md`, because `docs/handoffs/` is tracked and an ordinary untracked file in the primary
checkout stops every landing on the machine (`docs/ROUTINES.md`, the morning CI verdict's rule).
Overwrite the same date's file if it exists. Five short sections, numbers from the page:

1. **Spend** - the by-model table and the three harness lines, then one sentence: was the scarce
   pool spent on work a proven cheaper pool could have carried, and did any cheap delegation cost
   more in repair than it saved (the delegation ledger says).
2. **Decisions** - decisions taken against asks made, and the two or three asks that should have
   been decisions, with the shape each took (a measurable question treated as taste; a deviation
   filed as a ratification; a walk that needed a test account, not his eyes).
3. **The skill** - what changed, one line per commit, marked mechanism or text; the common path
   now against a week ago; any incident that repeated.
4. **Outside** - the ideas from step 3, classified.
5. **Improve** - at most three improvements for the coming week, each as a candidate row in the
   orchestrator's section-5 shape (GOAL, WHY, TOUCHES, POOL), so the next `/orchestrator`
   invocation can lift it straight into a wave. A row whose why is "the number went down" is not
   a row; name the failure it ends.

Then print the file in chat. The next `/orchestrator` invocation reads it with the rest of
`docs/handoffs/` (`orchestrator/grounding.md`) and plans the rows or says why not.

## What this never does

It edits no tracked file, commits nothing, queues nothing, and starts no wave: routines report,
sessions write (`docs/ROUTINES.md`). An improvement it is sure of is still a row for a session,
because the session that lands it verifies it and the coherence session reads it cold. It does
not compute a Claude percentage - the machine cannot read one - and it never sums tokens across
harnesses, because the meters count different things.
