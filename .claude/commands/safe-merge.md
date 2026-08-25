---
description: Land a branch on main - preflight checks, verified gate, then push. With no argument, drains the queue of `clear` branches in merge order.
argument-hint: [branch-name (optional - omit to drain the queue in merge order)]
disable-model-invocation: true
---

Argument: $ARGUMENTS

Read `.agent-workflows/safe-merge.md` now and follow it in full - that file is the canonical
procedure, shared with the Codex skill of the same name. Nothing here overrides it. The
argument above (if any) is the branch name the workflow refers to; if empty, detect it as the
workflow's Phase 1 describes.
