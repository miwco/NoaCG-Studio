# Orchestrator review - what to test next

Session of 2026-09-05. The review of the orchestrator landed, and its four concrete changes landed
on `main` (green, `1df34ddf`). This handoff is the list of things to TEST next, in the order they
are worth doing. Nothing here is unfinished code; it is verification and two experiments the review
deliberately left for the owner to run.

## What already landed (context, not work)

- `docs/ORCHESTRATOR_SIMPLIFICATION.md` - the review, re-derived from the 2026-09-04 night.
- Change 1, the refilling event-driven loop: `wave-launch`, `wave-horizon`, `collision-check`,
  `wave-watch`, and the `night.md` rewrite (`2953f590`).
- Change 2, the relay channel + worker posture: `relay.mjs`, the `add-merge` unread-relay gate,
  `wave-row.md` posture (`39f8d9b2`).
- Change 3, the contract staleness gate: `check-contract-freshness.mjs` (`deb94436`).
- Change 4, the mechanical refill pick: `candidates.mjs` + structured backlog fields (`b3234209`).
- Per-change handoffs: `docs/handoffs/2026-09-05-orchestrator-{refill-loop,relay-posture,freshness,
  candidates}.md`.

## What to test next, best first

1. **CLI login, and whether it holds.** `claude auth status` reports the CLI is NOT logged in, so
   every worker is an Agent-tool subagent that dies with the launching session - the single point of
   failure behind the loop dying twice in the record. WHY it matters: logging in unlocks headless
   `claude -p` workers that survive the session, and unlocks the planner/watcher split (item 4).
   Test: log in, then check `claude auth status` again a day later. If it held, we have a materially
   more robust option; if it expires daily, staying on the Agent tool is fine and loses nothing.
   The known failure mode is silent auth expiry (`incidents.md`, "the headless auth that died
   silently"), so the mitigation is a same-day auth check before any wave.

2. **A continuous GitHub-CI monitor.** The agent reads GitHub only when it polls, and only the
   branches it is landing - so a failure GitHub emails the owner about can sit unseen. WHY: this is
   the "I got the email, the agent never heard" gap. Test: arm a persistent `Monitor` tailing
   `gh run list` for the whole repo and surfacing any run that goes red the moment it does. Same
   mechanism `wave-watch` already uses. Small, and it closes almost all of the visibility gap.

3. **The first LIVE night wave on the new loop.** None of change 1-4 has run in a real unattended
   wave. WHY: the whole point is refill-until-the-horizon, and it is untested end to end. Test: plan
   a night wave whose wave-state file carries a `Window ends: <iso>` line and a `## Candidates`
   table (columns `L | size | serves | TOUCHES | SPECS | goal`), arm `wave-watch` as a Monitor, and
   let the loop refill off `node scripts/candidates.mjs --plan <plan>`. In the morning read
   `node scripts/wave-launch.mjs list` and the tick log to see what it chose and why, and whether it
   stopped on the horizon rather than early. This is the real acceptance test of the whole review.

4. **The two A/B experiments the review scoped** (`docs/ORCHESTRATOR_SIMPLIFICATION.md` sections 5
   and 8). WHY: both were framed as measured, not blind rewrites. First: who holds the watch - one
   live session as now, versus a planner session that ends and a fresh watcher started from the
   wave-state file (needs item 1's CLI login so workers survive). Second: the short-brief format -
   half the rows on today's full prompt, half on GOAL/WHY/BOUNDARIES/VERIFICATION with DO reduced to
   its first step - measured on tokens, review findings, and whether the row still lands.

5. **Bigger tasks, fewer branches, as the default.** The owner's read (2026-09-05): landing is per
   branch, so many small branches pay the gate cost many times, and on a night speed is not the
   constraint. WHY: fewer, larger, independent units mean fewer landings and less collision
   planning. The contract already says a prompt should be a big multi-step assignment; the change is
   to lean harder on it AND to keep the CORE/TAIL split so a big branch still lands its core if a
   late step breaks. Reserve parallelism for genuinely independent territories, never manufacture it
   by splitting one coherent job.

6. **The alignment session** (owner deferred it to its own session). WHY: the orchestrator grounds
   every plan in `docs/GOALS.md` NOW and the programme register, and if those drift from what the
   owner actually wants, a faithful wave goes confidently in a slightly wrong direction. Test: a
   session that reconciles the north star, the NOW push, and `docs/PROGRAMMES.md` against the
   owner's current sense of what NoaCG is and where it goes next, with the owner in the loop.

## Also open, filed not forced

- Receipt advancement on landing (`docs/backlog/owner-receipts-do-not-advance-when-their-work-lands.md`):
  the planner's frontier still shows some landed asks as unstarted. A receipt-vocabulary change worth
  its own row.
- The `.agent-workflows/orchestrator*` common path is at 640/640; genuinely reducing it needs the
  planner/watcher split (item 4), not more trimming.

## State

`main` at `1df34ddf`, CI green, nothing of this work ahead of it. My four review worktrees are
landed and disposable. One unrelated session (`new-session-a06227`, a `/walk`) has a branch ahead
of `main` that is its own to land.
