# `/check`'s legs fan out, and in a launched session their findings go to the orchestrator

**Filed:** 2026-09-02. **Source:** measurement - the 2026-09-02 day wave
(`docs/handoffs/2026-09-02-orchestrator-live-run.md`)

## Why

**Every launched wave session is currently either misreporting its own quality gate or handing its
findings to a session that cannot adjudicate them.** Both halves were observed on the same day.

The misreport half. Three handoffs written on 2026-09-02 say, in almost identical words,
`simplify: inline - the skill returned fan-out instructions, which in a launched session means it
did not run`. It ran. The subagents completed and produced real findings; their completion
notifications routed to the orchestrator session, which is what `launch.md` already documents for
any subagent a launched session spawns. So sessions have been recording a leg as not-run when it
ran and found things, and nobody read those findings.

The adjudication half. Row C's seven check angles all reported to the orchestrator: about 25
findings across simplify, reuse, conventions, efficiency, two review angles and altitude. Relaying
them took six separate messages, and each one needed a scope ruling the receiving session could not
make for itself, because several findings sat outside that row's `TOUCHES` set (hoisting a CSS
walker into `src/model/`, a helper that edits another spec, a devDependency). **The orchestrator
became the adjudicator of another session's quality gate**, which is a role the contract does not
size it for and which does not exist at all when a wave runs unattended.

Two of those 25 findings were regressions the change had introduced and would have shipped
otherwise, so the fan-out is doing valuable work. The defect is the addressing, not the fan-out.

## What it would take

The honest options, in the order they should be considered:

1. **Make the legs collect through FILES at agreed paths** rather than through completion
   notifications. `prompts.md` already requires exactly this of any prompt that sanctions a
   fan-out - *"collect results via FILES at agreed paths, never wait on notifications"* - and
   `/check` is a fan-out that no prompt sanctioned, so the rule was never applied to it. This is
   the smallest change and it fixes both halves at once.
2. **Route a subagent's completion back to the session that spawned it** when that session is
   itself a subagent. This is harness behaviour, not repo code, so it is a report rather than a
   task - but it is the version that needs no discipline from any prompt.
3. **Make the skill state honestly what it did.** A leg that fans out should say "fanned out, N
   angles, results at `<path>`", never return instructions that a session reasonably reads as
   "this did not run".

Whichever lands, the wave contract's line about check legs needs one sentence: a leg that returns
fan-out instructions has NOT necessarily failed to run, and a session must not report it as
not-run without checking the agreed path.

## Evidence

`docs/handoffs/2026-09-02-orchestrator-live-run.md`, "What caused friction" finding 2, and its
"What the next architecture review should investigate" section, which puts this first. The three
handoffs carrying the misreport are `2026-09-02-orchestrator-review.md`,
`2026-09-02-a-teams-spec-diagnosability.md` and `2026-09-02-c-ograf-host-page.md`. The rule that
already exists but was never applied to `/check` is in `.agent-workflows/orchestrator/prompts.md`,
the last bullet of "The line rules"; the notification-routing behaviour is stated in
`.agent-workflows/orchestrator/launch.md`.
