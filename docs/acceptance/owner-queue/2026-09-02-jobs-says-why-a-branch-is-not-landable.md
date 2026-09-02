---
kind: tooling
date: 2026-09-02
---
# `npm run jobs` says WHY a branch is not landable

The outstanding list used to print `NOT RANKED - no local branch` for any branch
merge-order had put aside, which is false whenever the branch has a worktree -
most often because its tree is dirty. It now prints the worktree and the real
reason.

Route, under a minute, in any worktree with a branch ahead of `main`:

    npm run jobs                      # the row ends with the worktree name
    printf 'x\n' > .repro-dirty.txt
    npm run jobs                      # the same row now ends "- 1 uncommitted file(s)"
    rm .repro-dirty.txt

What to look at: the third line of the branch's block. The old message is kept
for the one case where it is true - a branch that exists only as `origin/<name>`,
which merge-order cannot see at all.
