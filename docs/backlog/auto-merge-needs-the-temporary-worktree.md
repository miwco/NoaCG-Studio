# `auto-merge.mjs` refuses the one case the human flow was built to handle

**Filed:** 2026-08-28. **Source:** job `j-0117`, a retry of `j-0115`, landing
`claude/editor-blank-stage-note`.

## Why

A closed session leaves its branch behind with no worktree. The root `AGENTS.md` says the merge
flow handles exactly this: *"a branch with no worktree (a closed session leaves those behind) has
nowhere to integrate `main` and run the gate, so the flow creates a TEMPORARY worktree for it and
removes that same one at the end."*

`scripts/auto-merge.mjs` - the mechanical path the queue actually runs - does not. It passes the
whole preflight and then stops:

```
PREFLIGHT OK - 8 passed, 0 blocking.
auto-merge REFUSED: claude/editor-blank-stage-note has no worktree - the human flow makes a temporary one
```

So a branch in this state **cannot land through the queue at all**, however clean it is. It has
failed twice now for the same reason, and it will fail every retry. The two ways out today are
both manual - a person runs `/safe-merge`, or somebody makes a worktree by hand - which is the
churn the queue was introduced to end.

The branch was `clear` on merge-order, conflict-free, with no files changed on both sides. Nothing
about the work was the problem.

## What to build

Give `auto-merge.mjs` the same carve-out the human flow has: create a temporary worktree for a
branch that has none, integrate `main` there, run the gate, merge `--ff-only`, and remove that
same worktree at the end - never another one, never with `--force`. Removal must also happen on
the failure paths, or a refused landing leaves litter behind.

A regression test belongs with it: `npm run test:worktree-safety` is where the git-safety cases
live, and "a branch with no worktree lands, and the temporary worktree is gone afterwards" is one
of them.

## Meanwhile

`claude/editor-blank-stage-note` is still ahead of `main`, still declared finished by its session,
and still unlandable by the queue. Its content is one handoff file recording the blank editor
stage (`docs/handoffs/2026-08-27-editor-stage-blank.md`), so nothing is at risk by waiting - but
it does not disappear on its own, and every future closed-session branch hits the same wall.
