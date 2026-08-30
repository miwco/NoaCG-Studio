# Worktree cleanup no longer waits for you - and has still deleted nothing

Date: 2026-08-30

## What changed

Your words, 2026-08-30: *"we can remove the written rule about only me starting cleanups when we
have just established the rules that we only delete worktrees and branches that are on main, so we
don't lose any work... env files should not be read in vain, but they can be deleted from work
trees when we don't need them anymore. Additionally, paid benches output needs to be saved in the
archive."*

That rule is gone from `AGENTS.md` and from the cleanup workflow, and the thing it was standing in
for is now in code. The old rule was never really about permission: it existed because a clean
`git status` says nothing about ignored files, and `git worktree remove` deletes them anyway. Two
paid rounds died that way. So each ignored path is now classified and answered rather than counted:

- **rebuildable** (`node_modules/`, `dist/`, and everything `.gitignore` itself calls regenerated
  on demand) goes with the worktree;
- **a secret** (`.env` and friends) is deleted **unread** - never opened, printed, copied or
  archived - and only while the primary checkout still has one at the same path. A `.env` that
  exists nowhere else refuses the removal;
- **anything the repo cannot rebuild** is copied to `C:\claude\noacg-archives\worktree-cleanup\`
  and the copy is verified file by file and byte for byte **before** anything is deleted. A copy
  that cannot be proven refuses, and there is no flag that overrides it.

Eligibility itself is unchanged in spirit and stricter in practice: every commit on the branch must
be an ancestor of an `origin/main` fetched in the last ten minutes. A stale fetch refuses the whole
assessment. `git branch -d` (never `-D`) and an unforced `git worktree remove` are still the
backstops git enforces itself.

## What would now happen without you, measured on this machine today

`node scripts/cleanup-worktrees.mjs` (dry run, removed nothing):

- **17 worktrees and 17 branches would go**, plus 15 GitHub branches - all fully landed.
- **Nothing would be archived.** The one candidate, `ograf-starters-out/`, is now correctly read as
  rebuildable, because `.gitignore` says so in its own words.
- **5 refuse, and the reasons are the interesting part:** two for uncommitted changes, one because
  the worktree is *locked* (how the harness marks an agent running right now), and two because a
  session wrote a transcript turn 0 and 45 minutes ago - the case containment cannot see, since a
  session that just landed its branch looks exactly like a finished one.

## Needs you - one decision, and it is not permission

**A supervised first real run.** From the primary checkout, on `main`:

    cd C:\claude\NoaCG-Studio
    node scripts/cleanup-worktrees.mjs            # read the plan
    node scripts/cleanup-worktrees.mjs --apply    # do it

That is the whole ask: watch it once. After that it is a mechanism.

**One discrepancy you should see rather than discover.** Your memory entry `fix-dont-ask` records
an earlier version of this ask - *"we could also soon look into automatically deleting work
trees"* - and files it as **not yet authorized**, "a task to design, not a licence to start
deleting". The later, explicit permission quoted at the top is what this branch acted on. If that
is not what you meant, the contract change is one revert; the mechanism underneath it stands on its
own either way.

## What still refuses, and always will

Uncommitted changes. A detached HEAD holding work no branch names. A branch in local `main` but not
on `origin/main`. A stopped rebase, merge, cherry-pick or **bisect** (a bisect leaves a perfectly
clean tree - the old check for it never actually fired, and now does). A locked worktree. A secret
with no copy anywhere else. Output that cannot be archived or whose copy will not verify. A
non-empty leftover folder.

**The honest limit:** the liveness guard reads Claude Code session transcripts, so it does not see
a Codex or plain-shell session sitting in a worktree. That guard protects convenience, not work -
containment is what protects work, and it fails closed.

## Route (under a minute)

1. `cd C:\claude\NoaCG-Studio` then `node scripts/cleanup-worktrees.mjs` - the dry run above.
2. `.agent-workflows/cleanup-worktrees.md`, the section "Why this used to need a person, and what
   replaced it".

## What to look at

Whether the refusal wording is what you would want to read, and whether the two-hour idle window is
right - it is the only number between "a session is still in there" and "that folder is litter".
`NOACG_CLEANUP_MIN_IDLE_MINUTES` changes it.
