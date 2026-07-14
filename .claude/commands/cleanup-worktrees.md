---
description: Bulk-clean stale worktrees, their merged branches, stale worktree metadata, and empty leftover folders - safely, from the primary main checkout
argument-hint: (no arguments)
---

Clean up the leftovers from finished coding sessions: stale git worktrees, the `claude/*`
branches that are already fully merged into `main`, stale worktree metadata, and empty
leftover worktree folders. Do NOT print git commands for the user to run - drive the script
yourself, read its output, and report conclusions.

All the safety logic lives in `scripts/cleanup-worktrees.mjs` (dry-run by default, `--apply`
to act). It reuses the same containment test and helpers as `/safe-merge` and the SessionStart
hook, so this command can never disagree with them. Your job is to run it, sanity-check its
assessment, and apply when the assessment is clean.

## Why this runs from the primary checkout only

A worktree cannot delete the folder it is running inside. This command must be run from a fresh
session in the **primary `main` checkout** (`C:\claude\NoaCG-Studio`). The script enforces this
and refuses to act from a linked worktree - if it reports that, stop and tell the user to rerun
from the primary checkout. Never work around it.

## What counts as safe (the script decides; these are the rules it applies)

- The ONLY trustworthy "safely in main" test is commit containment
  (`git rev-list --count <ref> --not main == 0`). Branch names, `gone` upstream markers, and
  memory are never trusted.
- A worktree is removed only if its working tree is clean AND (its branch is contained in main,
  OR it is detached at a commit contained in main). Dirty or unique-work worktrees are skipped
  and reported.
- Branches: only fully-merged `claude/*` branches are deleted (via `git branch -d`, never `-D`;
  git refuses an unmerged branch as a final backstop). `main` and the current branch are never
  touched. Non-`claude/*` merged branches are reported, not deleted.
- Empty leftover folders are swept; non-empty unregistered folders are reported for manual
  review, never auto-deleted. Locked/busy folders are reported to rerun later.

## Steps

1. **Fetch remote state first** (so the main-vs-origin/main assessment is current), then run the
   dry run:
   - `git fetch origin --prune`
   - `node scripts/cleanup-worktrees.mjs`
2. **Read and relay the plan.** Summarize what will be removed/deleted, what is skipped and why,
   and any manual cleanup remaining. If the script refused (not the primary checkout, `main`
   missing), stop and report that - do not force anything.
3. **Auto-apply on a clean assessment (standing permission).** If the plan shows only safe
   removals and skips with benign reasons, apply it without waiting:
   - `node scripts/cleanup-worktrees.mjs --apply`
   STOP and ask the user first only when the assessment surfaces a real risk:
   - local `main` is **diverged** from `origin/main` (ahead-only is safe to proceed on but call
     it out);
   - a worktree is skipped for **uncommitted changes** or **unique detached work** that the user
     may want to keep;
   - a **non-empty leftover folder** was found (it may be live work);
   - anything the script could not classify.
   In those cases, report the specific item and let the user decide.
4. **Report the outcome** from the `--apply` output: what was deleted, what was skipped and why,
   and whether any manual cleanup remains. Do not claim success for items the script marked
   `[FAILED]` or left in "Manual cleanup remaining".

Hard rules (never break, even if asked mid-flow): never `git branch -D`, never
`git worktree remove --force`, never delete `main` or the current branch, never delete a
non-empty folder, never run from a linked worktree.
