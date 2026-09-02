# 2026-09-02 - three orchestration mistakes now fire at the moment they are made

Branch `claude/h-orchestration-guardrails`, off `main` at `e9cc60d8`. Four commits, ten files.

Each of the three was already a RULE, written after an incident, and each rule fires only if
somebody reads the contract it lives in. A hook fires every time. Nothing in
`.agent-workflows/orchestrator/` was edited: these are byte-budgeted contracts, and describing a
mechanism that needs no reader is the "adding instead of moving" failure the coherence rule names.

## What landed

**1. A branch created in the PRIMARY checkout is REFUSED** (`scripts/hooks/guard-command.mjs`,
matcher `branchCreations` in `scripts/command-match.mjs`). That checkout is what the landing queue
checks out, merges, builds and resets on every integration; on 2026-08-28 a branch parked there
made every landing of the wave refuse with "main is checked out nowhere", and a build run in that
tree while the runner held it gated `main` instead of its own branch and still reported green.
A refusal rather than a notice because both failures are silent. The message names the worktree
recipe. `main` itself is exempt - restoring it there is the one thing that checkout is for.

**2. A commit that has just STALED A QUEUED LANDING PIN raises a notice**
(`scripts/hooks/warn-command.mjs`, new, PostToolUse on `Bash|PowerShell`). Queueing pins the branch
at its current commit; a later commit turns the job into a stale-pin refusal, which is how two of
three jobs from one branch burned on 2026-08-28. A notice rather than a refusal because the commit
is legitimate as long as the session re-queues, and the message says exactly that, naming the job,
the pin, the new tip, and whether to cancel it or let it refuse.

**3. A new migration whose NUMBER IS ALREADY CLAIMED raises a notice**
(`scripts/hooks/warn-edit.mjs`, new, PostToolUse on `Write`; pure half in
`scripts/migration-collision.mjs`). Two branches on one number share no file, so `git merge-tree`
finds nothing and `merge-order` returns `clear`; the drifted ledger surfaces only when `db:push`
refuses, with both already on `main`. The check reads every ref, not the directory beside it -
that is the half that matters, since a number claimed on another branch is invisible from a
worktree by construction. It names who holds it and the lowest number free everywhere.

Also: `scripts/hooks/lib.mjs` gained `warn` (PostToolUse's only channel to the agent is exit 2,
the same code `deny` uses) and `gitOutput` (one "run git in that checkout" for the three hooks that
had each grown their own).

## Why the two notices run AFTER rather than before

A PreToolUse hook can only reach the AGENT by blocking. An allowed call's reason goes to the user,
not to the model, so "warn without denying" has no channel there. For the landing pin the two
reasons agree: the fact the rule needs is whether the tip actually MOVED, which is only true once
the commit has run - so a failed or empty commit stays silent, and the notice cannot cry wolf.

## Every hook was verified by feeding it a real event

Not by reading the code. Each pair below was run against the real primary checkout and this
worktree, after the review fixes, with the exit code observed.

**Guard - branch creation in the primary checkout** (11 cases, all correct):

| | command | cwd | result |
|---|---|---|---|
| triggers | `git switch -c claude/probe` | primary checkout | exit 2 |
| triggers | `cd C:/claude/NoaCG-Studio && git checkout -b claude/probe` | a worktree | exit 2 |
| triggers | `git -C C:/claude/NoaCG-Studio checkout -b claude/probe` | a worktree | exit 2 |
| triggers | `bash -c "git checkout -b claude/probe"` | primary checkout | exit 2 |
| triggers | `git fetch origin; if ($?) { git checkout -b claude/probe }` | primary checkout | exit 2 |
| silent | `git switch -c claude/probe` | a LINKED worktree | exit 0 |
| silent | `git checkout -B main origin/main` | primary checkout | exit 0 |
| silent | `git worktree add -b claude/probe .claude/worktrees/probe main` | primary checkout | exit 0 |
| silent | `git -C C:/nowhere-at-all checkout -b claude/probe` | primary checkout | exit 0 |
| silent | `grep -rn "git checkout -b" AGENTS.md` | primary checkout | exit 0 |

**Landing pin** (5 cases, all correct). A stand-in merge job was written into the real queue with
an inert command carrying only the `--expect-sha` token, and removed in a `finally`:

- triggers: `git commit -m "one more thing"` with a WAITING job pinned at the previous commit -
  exit 2, naming the job, `d01a22ba -> d691acfb`, and `jobs.mjs cancel` then `queue:merge`.
- triggers: the same with the job RUNNING - exit 2, different advice (let it refuse; it is
  mid-flight).
- silent: `git log --oneline -5` with the same stale job present - exit 0.
- silent: the same commit with the job's pin still EQUAL to the tip - exit 0. This is the
  cry-wolf guard: a commit that changed nothing leaves the pin valid.
- silent: the same commit with nothing queued - exit 0.

**Migration number** (6 cases, all correct):

- triggers: writing `supabase/migrations/0053_flake_ledger.sql` - exit 2. **This is the case that
  proves the point**: 0053 is not in this worktree's directory listing at all (the branch forked
  before it landed), so a listing would have said the number was free. The notice named
  `0053_teams_and_membership.sql  (on main - the number is spent)` and suggested 0055.
- triggers: `0052_flake_ledger.sql` - exit 2, same shape.
- silent: `0055_flake_ledger.sql` (free everywhere), re-writing `0052_inherited_grants_tightened.sql`
  (itself), `supabase/config.toml`, `src/store/templateStore.ts` - all exit 0.

## Cost

Measured on this laptop, five runs each. `warn-command` runs after EVERY shell command, so its
common case is what matters: **59 ms on an `ls`, against a 47 ms bare `node -e 0`** - node starting
up plus about 12 ms, because everything expensive (`command-target.mjs`, `jobs-store.mjs`, both git
calls, the queue read) is behind a lazy import and a pure text gate. A commit costs 195 ms.
`warn-edit` is 50 ms on an ordinary Write; its all-refs traversal is about 170 ms with 97 local
branches and runs only for a file under `supabase/migrations`.

## /check

`review: delegated` - the code-review skill, level `high`, forked and returned findings on this
branch and only this branch's files (scope check passed). Seven findings, five fixed, two deferred
with reasons below.

`simplify: inline` - the skill returned fan-out instructions, which by `.agent-workflows/check.md`
means the pass did not run, so the four angles were covered here. Four fixes: three copies of "run
git in that checkout" folded into `lib.mjs`, the duplicated `deny`/`warn` bodies reduced to one
channel, a mixed concat/template message, and a redundant truthiness guard.

`verify: inline` - `npm run build` green, `npm run test:worktree-safety` 58/58, the three unit
suites 38/38, all three hooks re-fed their real events after the refactor. CI run 33559810135 on
`d691acfb` was green with **all nine E2E shards plus Build, Factory gates and CI gate actually
running** (read from `gh run view --json jobs`, not from the green tick). A second run
(33561447634) was in flight on the check-fix commit `dee3e39e` when this was written and is
**UNVERIFIED**; it is a scripts-and-tests commit, so its plan is narrower than the first, and the
landing job dispatches its own full run on the integrated sha regardless.

## What the review found and I did NOT fix

**Occupancy, not just creation.** `git checkout <existing-branch>` in the primary checkout causes
the identical failure, and the 2026-08-28 incident is about a branch BEING there, not about how it
got there. It is not fixed because `git checkout foo` and `git checkout src/foo.ts` are the same
command line with the same shape - one moves HEAD, one restores a file - and telling them apart
needs the filesystem. A refusal this broad should not be guessing, so the crisp half shipped and
this is written down rather than half-done. It deserves its own change, with a decision about
whether a deny may stat the working tree.

**A migration created by shell redirect.** `cat > supabase/migrations/0053_x.sql <<'EOF'` creates
the file with no `Write` event, and this environment's own instructions steer towards heredocs.
Closing it means teaching the shell notice to read a redirect target, which is a different matcher
with a different failure mode. Recorded in `warn-edit.mjs`'s own header, where it fires.

**`invokesE2e` / `invokesSweep` still read only the bare segment** - no `&` split, no wrapper
strip, no brace split - so `bash -c "npm run test:e2e"` and `if ($?) { npm run test:e2e }` walk
past the machine-wide mutual exclusion. That is a pre-existing hole wider than the one this branch
closed, and it is in a REFUSAL that serialises the whole laptop, so widening it is its own change
with its own measurement. `startsDevServer` was routed through the shared parts helper here
because the fix was one line on a rule this branch was already changing, and both directions are
pinned in the tests.

## Note for the next orchestrator

This branch was the wave's designated LAST landing, and the reason still holds: it tightens the
machine's behaviour for every session, so anything landing after it meets rules its prompt was not
written against. The three hooks change refusals and notices only - no product code, no gate - so
it is not a `GATE LANDS ALONE` case.
