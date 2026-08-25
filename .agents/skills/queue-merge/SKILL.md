---
name: queue-merge
description: Declare this work finished and queue the branch for landing - the queue merges it when its turn comes
---

Read `.agent-workflows/queue-merge.md` (relative to the repo root) now and follow it in full - that
file is the canonical procedure, shared with the Claude Code command of the same name. Nothing here
overrides it. Any branch name typed after `$queue-merge` in the invoking message is the branch the
workflow refers to; with none, it means this worktree's branch.
