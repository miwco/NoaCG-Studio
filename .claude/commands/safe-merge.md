---
description: Safely merge a branch or worktree into main - live preflight checks, verified build, then push
argument-hint: [branch-name (optional - will be detected if omitted)]
---

Safely merge a branch or worktree into `main`. Do NOT just print git commands for the user
to run - execute each phase yourself, report what you find, and stop whenever reality
disagrees with the happy path. The user invokes this precisely so they never have to
worry about wrecking the repo.

Branch to merge: $ARGUMENTS (if empty, detect it in Phase 1 and confirm with the user
before merging).

## Repo layout (this project)

- `main` is normally checked out at the repo root (`C:\claude\NoaCG-Studio`).
- Feature/agent worktrees live under `.claude/worktrees/<name>` on `claude/*` branches.
- The verification gate is `npm run build` (typecheck + build). UI-facing changes should
  also get an e2e pass (`npm run test:e2e`) or at least an in-browser check.
- Standing permission exists to push verified work to `origin/main`.

## Hard safety rules (never break these, even if asked mid-flow)

- Never `push --force`, never `reset --hard`, never delete a branch that isn't fully merged.
- Update `main` only with `git pull --ff-only`. If main has diverged from origin/main,
  STOP and show both sides (`git log --oneline origin/main..main` and `main..origin/main`);
  let the user decide.
- Never stash or discard uncommitted changes without explicitly asking first.
- If a merge hits conflicts you are not confident resolving, `git merge --abort` and
  report the conflicting files rather than guessing.
- Do not remove any worktree or branch until the merge commit is confirmed to contain it
  (`git branch --merged main`).

## Phase 1 - Assess (read-only, report findings before touching anything)

Run and summarize:

1. `git status --porcelain` in the root checkout - is main's working tree clean?
2. `git worktree list` - what worktrees exist, what branch is each on, and where is
   `main` checked out? (If main is checked out somewhere other than the root, all
   main-updating steps must happen in THAT checkout.)
3. `git fetch origin --prune`
4. `git rev-list --left-right --count main...origin/main` - is local main ahead, behind,
   or diverged?
5. Identify the source branch: use $ARGUMENTS if given; otherwise list candidate branches
   (`git branch --list 'claude/*' --list '*' --no-merged main` plus the worktree list) and
   ask the user which one to merge if it isn't obvious.
6. In the source branch's worktree: `git status --porcelain` - any uncommitted work?
7. Preview the merge: `git log --oneline main..<branch>` (what comes in) and
   `git log --oneline <branch>..main` (what the branch is missing), plus
   `git merge-tree $(git merge-base main <branch>) main <branch> | grep -c '^<<<'`
   or a `git merge --no-commit --no-ff` dry-run equivalent to predict conflicts.
   On Windows PowerShell prefer: `git merge-base main <branch>` then
   `git diff --name-only <base> <branch>` intersected with `git diff --name-only <base> main`
   to list files touched on both sides.

Then present a short plan: what will be merged, how many commits, predicted conflict
files (if any), and what verification will run. Proceed only if the picture is clean;
otherwise surface the problems and wait for the user.

## Phase 2 - Prepare

1. If the source worktree has uncommitted changes: ask the user - commit them there
   (with a proper message), or leave them out? Never silently stash.
2. Update main in its checkout: `git pull --ff-only origin main`.
3. If main moved, rebase is NOT required, but re-check the conflict prediction from
   Phase 1 against the new main.

## Phase 3 - Merge and verify

1. From main's checkout: `git merge <branch>` (default fast-forward is fine for linear
   history; use `--no-ff` only if the user wants an explicit merge commit).
2. If conflicts: resolve only the ones that are mechanically obvious (e.g. both sides
   appended to the same list); for anything semantic, `git merge --abort` and report.
3. Verify: `npm run build` in the root checkout. If the merged work is user-facing,
   also run the relevant e2e specs or check the affected flow in the browser per
   CLAUDE.md's "Verifying changes". A red build means fix-or-abort, never push.

## Phase 4 - Finish and clean up

1. Push: `git push origin main` (standing permission).
2. Confirm the branch is contained: `git branch --merged main` includes `<branch>`.
3. Only then offer cleanup (ask, don't assume): `git worktree remove <path>` and
   `git branch -d <branch>` (lowercase `-d` only - it refuses if not merged).
4. Final report: merged commits, build result, push result, remaining worktrees.
