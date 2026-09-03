---
kind: owner-action
date: 2026-09-03
---
# Claude Code is eight releases behind, and a second, older copy is installed

**Why this is yours and not a session's.** Upgrading mutates shared machine state while three or
four sessions are live on this laptop, so it wants a quiet moment rather than a wave row. Nothing
is broken today; this is a pile of fixes we are not getting.

**What is installed, measured 2026-09-03.** Two copies answer to `claude`:

| Path | Version | Which one runs |
|---|---|---|
| `~/AppData/Roaming/npm/claude` (npm shim) | **2.1.251** | this one, first on PATH |
| `~/.local/bin/claude` (native install) | **2.1.240** | shadowed - but only by PATH order |

Newest is **2.1.259**. The second install is the part worth removing: which version answers
depends on PATH order, and nothing warns you when that changes.

**What the upgrade buys, specifically.** Concurrent sessions reverting each other's
`~/.claude.json` (fixed in 2.1.259) hits a three-to-four session wave on one laptop directly.
Blocking Stop hooks costing the next turn its reasoning (2.1.259) - `scripts/hooks/stop-wait.mjs`
is a blocking Stop hook, so we have been paying that on every turn. Worktree-isolation
false-positives on ordinary Bash loops and heredocs (2.1.257, 2.1.259); I hit exactly this class
during this session, when a plain `cat >> file` heredoc was refused inside an isolated worktree.

## Do it in under a minute

```bash
npm i -g @anthropic-ai/claude-code
claude --version          # expect 2.1.259 or newer
which -a claude           # then remove the ~/.local/bin/claude copy
```

**What unblocks when you do.** `--permission-prompts none` lands in 2.1.259 and does not exist on
2.1.251 - I probed it, and `claude --help` on this machine has only `--permission-mode`. The
orchestrator's headless launch path is meant to pass it so a night wave denies rather than hangs
where nobody can answer. That change is written up and ready but deliberately not made, because
adding a flag the installed binary rejects would break every headless launch. It is item 1 in
`docs/handoffs/2026-09-03-b-harness-followups.md`.
