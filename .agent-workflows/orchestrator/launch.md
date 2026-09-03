# Launching the rows - the Agent tool, the classifier, and permission prompts

Loaded when a wave's rows are launched, day or night - after the plan has passed
`node scripts/wave-plan-check.mjs`, never while it is being written. Done when every `START now`
row is running in its own worktree, every held row is in section 4 with its full prompt, and the
wave-state file says which is which.

**Launch directly; a chip only when the start IS the owner's decision.** **The PRIMARY launch path
is the Agent tool** - a background subagent in its own worktree, model per the wave row. The
headless CLI (`claude -p`) is the alternative and needs live CLI auth, verified that day.

**The Agent tool CALL carries a model and no reasoning effort, but an agent DEFINITION carries
both** - `.claude/agents/<name>.md` frontmatter takes `model:` and `effort:`, and the launch names
that agent. So the primary path can deliver a row's whole MODEL line once the rungs the routing
ladder uses exist as definitions; until they do, a launch that names only a model runs at the
session's effort whatever the row promised. Read the current frontmatter field list from the
subagent docs rather than from here. **Headless carries both on the command line**: `claude -p
--model <m> --effort <low|medium|high|xhigh|max>` - the fallback for a row whose effort is the
point, once live CLI auth is verified that day, and only then a chip or a user-started session.

**A LAUNCH CAN BE REFUSED BY THE SAFETY CLASSIFIER, and the row is then HELD, not dropped.** A
held row keeps its letter, its full prompt goes in the wave-state file and in section 4, and the
owner starts it in a session he opens. Never re-word a prompt to get it past the classifier. **The
same refusal covers messages, not just launches.** **These are the two hard edges of this
session's autonomy, and both are enforced by the harness rather than by this contract: widening
the machine's permission posture, and overruling a merge-safety verdict.** Treat a refusal as the
mechanism working. The item goes to the owner with the evidence and the one command that settles
it - never re-phrased, never routed around, and never handed to a different session in the hope
that it lands differently. Evidence: `incidents.md` "the two classifier refusals".

**A wave session that spawns its own subagents never receives their completion notifications -
they route to the orchestrator session instead.** A prompt that sanctions a fan-out says so:
collect results via FILES at agreed paths, never wait on notifications; the orchestrator relays
any stray report it receives to the owning session.

**Cross-session peer messaging is TRANSIENT and is never a wave's channel.** Messages do not
persist, and peers vanish - most of the ones a listing shows are already offline. Fine for a nudge
to a session known to be live; the durable channels stay the only source of truth (the handoff
file, the owner queue, the wave-state file).

A task chip is minted only when starting it is genuinely the owner's call: a Fable-tier task worth
hand-picking the model for, anything near real money, or a scope judgment. Chips are the owner's
control point, not the loop's queue.

## Permission prompts

The plan has already been made inside the allowlist (`collisions.md`, "The machine's limits"); what
is left at launch is the other half: **a blocked session must be VISIBLE.** The watch loop asks the
transcripts, not the branch tips - see `night.md` for the signal and, just as binding, for what it
cannot tell you. When the owner asks whether anything is waiting on him right now, the question is
`node scripts/blocked-sessions.mjs --minutes 1`, never the 30-minute default that the unattended
loop needs.
