# queue-merge - say this work is finished, and let the queue land it

Shared canonical procedure - `/queue-merge` in Claude Code, `$queue-merge` in Codex.

**This is the normal way work reaches `main`.** Run it when the work here is done. It does not
merge anything itself: it puts this branch in the machine-wide landing queue, which lands it when
its turn comes, one branch at a time, gated on CI.

Optional argument: another branch name. Read "Landing someone else's branch" before using it.

## Why this exists rather than running safe-merge

Landing is serialized, not permissioned (root `AGENTS.md`, "Git"). But serialization alone left a
real problem: **the queue knew a branch was landable long before its author knew it was finished.**
A branch can be green, clean and `clear` while the session that owns it is still mid-conversation
about what to do next - and nothing in a verdict can tell the difference.

So the authority to land sits where the knowledge is. Queueing IS the declaration that the work is
done, made by the only party who can make it. Nobody else queues your branch; you queue it when you
mean it, and then it lands without you waiting for anything.

That also removes the last reason to sit through a merge. `safe-merge` run by hand is outside the
queue, races the other sessions, and costs a full re-verification every time it loses - five
branches landing in a hundred minutes against a ten-minute gate meant a near coin-flip each time.

## 1. Be finished

Queueing pins the branch at its CURRENT commit. If you commit again afterwards the job refuses and
asks you to queue again, because the thing that was queued is not the thing that is there. That is
deliberate: it is what makes "I queued it" mean "it was done".

So before queueing:

- everything committed, `git status --porcelain` empty;
- `npm run build` green on what you are about to queue;
- anything observable in the product has its own file under `docs/acceptance/owner-queue/`
  (one file per item - a shared list makes parallel sessions conflict, and a conflict stops the
  landing job dead).

## 2. Look before you queue

    node scripts/auto-merge.mjs --branch <branch> --dry-run

It runs the whole assessment - merge-order verdict, both worktrees clean, the merge preview - and
stops before the first state change. Two minutes here saves a refusal later.

**If it refuses, read which kind it is.** The queue lands only what it can settle mechanically:

- **`clear`** - queue it.
- **`caution` / `hold`** - a person has to weigh the named risk. `docs/JOB_RUNNER_PLAN.md` and the
  note beside `SILENT_MERGE_FILES` in `scripts/merge-order.mjs` explain how to test whether the
  collision is real. When it has been weighed, `--accept <kind>` records that, per KIND - it never
  waves through a different risk in the same verdict.
- **a conflict integrating `main`** - resolve it here, commit, then queue.

## 3. Queue it

    npm run queue:merge

With no branch it queues THIS worktree's. Then:

    npm run jobs        # position, what is running, why anything waits

**The job pushes for you - do not push by hand.** The pin is `git rev-parse <branch>`, the LOCAL
ref (`jobs.mjs` `branchTip`), so a commit that has never left this machine is covered; and the job
pushes the branch itself before it waits on CI (`auto-merge.mjs`, just above the `awaitCi` call).
The rhythm is **commit everything, then queue** - not commit, push, queue. Two sessions reached
for the hand push by habit on 2026-08-26 and neither needed it.

The one exception is a PRE-CHECK of your own work before handing it to the queue. That is worth
having - it is how one branch found a spec that passed locally and failed on CI's fonts - but it
must be a FULL DISPATCH (`gh workflow run ci.yml --ref <branch>`), never a bare push: an ordinary
push plans from the PREVIOUS push, and preflight phase 3 refuses a run that skipped every shard as
loudly as it refuses a red one. A bare markdown-only push is therefore a refusal, not a delay.
And the pre-check is only ever the run the GATE consumes when main has not moved by your turn - if
it has, phase 2 makes a merge commit and the gate waits on a fresh run for that sha regardless.

Nothing else to do. Merge jobs never run beside each other, so queued landings drain strictly one
at a time in order. If `main` moves under yours mid-gate it re-integrates and re-verifies by
itself, up to three times.

**A migration on your branch applies itself.** Once the branch is on `origin/main` the job runs
`npm run db:push`, so you never have to remember a production push. It refuses anything that can
remove something - a DROP, a REVOKE on an object the migration did not create - and reports instead;
that refusal does not fail the landing. If it happens, add an `owner-action` file under
`docs/acceptance/owner-queue/` carrying the `npm run db:push -- --allow <version>` command,
because from there it is the owner's call.

## 4. When it lands

The worktree whose branch landed is told at its next start-up: merged, pushed, nothing left to
merge. `npm run jobs` lists recent landings with the session each belongs to.

**Then run the handoff workflow** if the work is finished, so the owner knows which sessions are
done and which still want a look. That is the whole point of announcing the landing: without it,
"landed" and "still working" look identical from outside.

## Landing someone else's branch

Naming a branch that is not this worktree's is allowed, and should be rare. **Check that its
session is not live first** - `node scripts/worktree-activity.mjs`, and look at how recent its last
commit is. A branch whose session closed (nobody will ever queue it) is the case this exists for; a
branch someone is actively committing to is not yours to finish.

If in doubt, ask that session to queue its own. It costs a message and removes the whole question.
