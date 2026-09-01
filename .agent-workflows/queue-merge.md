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

**THE GATE NO LONGER WAITS ON A WEBHOOK - it hands itself a run.** When `main` has moved, the sha
being verified is a merge commit the job has just minted, so its CI run arrives by GitHub's PUSH
WEBHOOK - and delivery is not bounded: on 2026-08-26 three webhooks arrived 28-35 minutes late,
each spending the gate's whole wait budget hoping and then refusing in words that read like a tree
fault. So `waitForCi` (`auto-merge.mjs`) now gives the webhook ~30 seconds and then dispatches the
run itself (`gh workflow run ci.yml --ref <branch>` - created by the API immediately, no webhook
in the path, and `--ref` targets the branch tip, which after the job's own push IS the verified
sha). It also reads runs properly: ci.yml runs only (never a deploy-verify run), ties between a
push run and a dispatch broken on `databaseId` (`selectCiRun`, `safe-merge-preflight.mjs`), a
cancelled shell never mistaken for a verdict, and the listing - not `gh run watch`'s exit, which
returns immediately on a run still `pending` with zero jobs (j-0088) - decides when the wait ends.

**One caveat: a RUNNING runner keeps the code it started with.** A landing draining through a
runner that started before this behaviour landed still waits passively; the manual move is the
same as the automatic one - while the gate waits, run `gh workflow run ci.yml --ref <branch>`
yourself (watch `node scripts/jobs.mjs log <job>` for the push line first, so the tip is the
verified sha). The next `add` after the old runner exits starts a fresh one with the new code.

The residual race remains: the push's own webhook can arrive mid-watch and cancel the dispatched
run (the ci.yml concurrency group is the REF, not the sha). The gate keeps waiting through the
cancelled shell and follows the replacement; if nothing conclusive ever arrives it refuses,
loudly, exactly as before - re-queue, and by then a run for that sha is on disk.

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

**A branch whose worktree is gone lands anyway.** A closed session leaves its branch with nowhere
to integrate main and run the gate, and that used to be a refusal - so finished work sat unlandable
and the outstanding listing called it "not queued". The job now makes ONE temporary worktree at
`.claude/worktrees/auto-merge-tmp-<branch>`, lands there, and removes that same path again - never
another, never with `--force`. It still refuses if that path already exists, because something left
it behind and its contents are not this job's to assume.

## When a landing gives up

`npm run jobs` prints, for every branch ahead of main, either `QUEUED <id>`, `not queued`, or a
loud row saying the landing FAILED or was WITHDRAWN - with the reason it stopped (killed at its
cap, process vanished, still blocked, a refusal and its exit code) and the exact command that puts
it back:

    node scripts/jobs.mjs add-merge <branch>

"Not queued" never describes a branch that was queued. Re-queue after reading the log
(`node scripts/jobs.mjs log <id>`) - a landing that refused usually refused for a reason that is
still true.

A landing that SUCCEEDED reads as `LANDED <id> - already on main`, with a log command and **no
re-queue command**, because there is nothing to put back. Until 2026-09-01 it read as a refusal
(`LANDING FAILED <id> (done) - auto-merge refused it (exit 0)`) and did offer one: never queue a
branch on the strength of a row that names an exit code of 0.

**Do not sit and watch it.** A landing takes as long as CI takes, and a foreground poll loop over
the queue is refused by the guard hook: the shell tool dies at 600 s, so a long wait is a session
holding an answer nobody reads. If you need the verdict now, `node scripts/jobs.mjs wait <id>` is
bounded at 30 minutes and then tells you to hand off. Otherwise queue and hand off - the next
session start reports what landed.
