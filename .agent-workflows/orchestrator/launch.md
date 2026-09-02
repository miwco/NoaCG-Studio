# Launching the rows - the Agent tool, the classifier, and permission prompts

Loaded when a wave's rows are launched, day or night - after the plan has passed
`node scripts/wave-plan-check.mjs`, never while it is being written. Done when every `START now`
row is running in its own worktree, every held row is in section 4 with its full prompt, and the
wave-state file says which is which.

**Launch directly; a chip only when the start IS the owner's decision.** **The PRIMARY launch path
is the Agent tool** - a background subagent in its own worktree, model per the wave row. The
headless CLI (`claude -p`) is the alternative and needs live CLI auth, verified that day.

The Agent tool sets a MODEL but no reasoning EFFORT, so an auto-launched row runs at the default
effort whatever its MODEL line promises. **Headless carries both**: `claude -p --model <m>
--effort <low|medium|high|xhigh|max>` - so a row whose effort is the point may auto-launch
HEADLESS once live CLI auth is verified; only when headless is unavailable does it fall back to a
chip or a user-started session.

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

**A wave may not depend on a permission prompt being answered.** An unattended wave runs while
nobody is awake, so an unanswered prompt would not be a delay - it would be a session that never
finishes and never says why. Two halves, and the plan owns both:

- **Plan inside what is already allowed.** The allowlist is `.claude/settings.json`, tracked, so
  every worktree gets it from git and an approval made in one survives
  (`docs/AGENT_WORKFLOWS.md`, "Permissions"). A row whose work needs something outside it either
  gets that entry landed first - a one-line settings change, not a night's blocker - or is planned
  for a session the owner is awake for, and section 4 says which. **Never plan around it by asking
  for bypass mode**: the fix for a command that prompts too often is an allowlist entry that was
  reasoned about, or a mechanism that removes the command, not switching the check off
  machine-wide.
- **A blocked session must be VISIBLE.** The watch loop asks the transcripts, not the branch tips
  - see `night.md` for the signal and, just as binding, for what it cannot tell you.
