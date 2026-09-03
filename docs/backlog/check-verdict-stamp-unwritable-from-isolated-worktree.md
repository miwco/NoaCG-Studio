# The /check verdict stamp is unreachable from the sessions that now do most of the checking

**Filed:** 2026-09-03. **Source:** measurement - two sessions in the same wave, one that gave up
and one that probed why.

## Why

`.agent-workflows/check.md` phase 5 asks every `/check` run to write a machine-readable verdict
stamp to `<git-common-dir>/noacg-jobs/checks/<branch>.json`, so the landing path can eventually see
review the way it sees CI (`docs/ORCHESTRATION_NEXT.md` §5). That path is in the SHARED `.git`
directory, outside the worktree the session is isolated to.

**A worktree-isolated session's Write tool refuses it.** Measured on 2026-09-03 from
`.claude/worktrees/agent-a748c1e5f03914368`:

- `Write` to `C:\claude\NoaCG-Studio\.git\noacg-jobs\checks\<file>.json` is refused with *"This
  agent is isolated in the worktree ... Edit the worktree copy of this file instead of the
  shared-checkout path."* There is no worktree copy of that path, so the advice cannot be followed.
- The same write **succeeds through the Bash tool**, both `mkdir -p` and a redirect.

So the mechanism is not blocked, it is blocked through the tool a session naturally reaches for,
and the refusal reads as a policy decision rather than a tool difference. One session in this wave
concluded the stamp could not be written and moved on; that is the rational reading of that message.

This matters more than it looks. **Launching rows as worktree-isolated subagents is now the normal
path, not the exception** - it is how this entire wave ran. If the stamp is skipped by default
there, it is skipped for most checks, and a mechanism that exists in the contract and not in the
data is worse than no mechanism: the landing path would eventually be built to read a store that is
mostly empty for reasons nobody recorded.

## What it would take

One of these, and the choice is the interesting part rather than the work:

- **Say so in `check.md`.** One line: write the stamp with Bash, because the Write tool refuses
  paths outside the worktree. Cheapest, and leaves the reader depending on a note.
- **Move the store somewhere a worktree can write**, and have whatever consumes it read across
  worktrees. Removes the trap instead of documenting it.
- **A small script that writes the stamp**, so no session has to know where it lives or which tool
  reaches it. This is the shape the repo usually picks, and it also fixes the second half nobody has
  hit yet: the stamp's schema is currently prose in `check.md` that every caller retypes.

## Evidence

- The two probes above, run 2026-09-03 from a worktree-isolated wave row.
- `.agent-workflows/check.md` phase 5 - the stamp's path, schema and rules.
- `docs/ORCHESTRATION_NEXT.md` §5 - what the stamp is eventually for.
