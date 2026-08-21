# safe-merge - safely merge a branch or worktree into main

Shared canonical procedure for the `safe-merge` workflow - invoked as `/safe-merge` in Claude
Code, `$safe-merge` in Codex. Cross-references to other workflows below use their plain names
(e.g. "the cleanup-worktrees workflow"); translate as `/cleanup-worktrees` in Claude Code,
`$cleanup-worktrees` in Codex.

Safely merge a branch or worktree into `main`. Do NOT just print git commands for the user
to run - execute each phase yourself, report what you find, and stop whenever reality
disagrees with the happy path.

Branch to merge: the argument given at invocation, if any (if empty, detect it in Phase 1 and
confirm with the user before merging).

This workflow carries standing permission to update and push `main`, so it runs **only on an
explicit user invocation**. There are exactly two of those:

- the user typed the command themselves (`/safe-merge` in Claude Code, `$safe-merge` in Codex);
- **the user SELECTED this workflow from a pick the next workflow offered** for a named branch.
  A pick is a decision the user made about a specific branch, not an inference - so it is a real
  invocation and must be honoured by running this procedure, not answered with "type the command
  yourself". It authorizes exactly the branch named in that option, for that turn only.

Everything else is still forbidden: never infer invocation from a general request to inspect,
review, or discuss a merge, from work merely looking finished, or from a pick that was about
something else.

Note for Claude Code: the `/safe-merge` adapter sets `disable-model-invocation: true` on
purpose, so the model can never invoke this workflow as a tool of its own accord. That flag stays.
Acting on a user's pick means reading `.agent-workflows/safe-merge.md` and following it directly -
the user has invoked it, and the adapter is only a pointer to this file anyway.

## Repo layout (this project)

- `main` is normally checked out at the repo root (`C:\claude\NoaCG-Studio`) - but never
  ASSUME it is; determine where (and whether) `main` is checked out from `git worktree list`
  every run.
- Feature worktrees commonly live under `.claude/worktrees/<name>` on `claude/*` or `codex/*`
  branches, but paths and prefixes are never safety signals.
- The verification gate is a CI run green on **exactly the commit being promoted** (`ci.yml`
  triggers on every branch push), and the local `npm run build` + `npm run test:e2e:focus:queued`
  pair only when there is no such run. Phase 3 has the full rule. Whichever route runs, BOTH
  halves are required - typecheck/lint AND e2e. `build` alone is not enough: it does not run a
  single e2e spec, and on 2026-07-30 four template packs landed in a row that each passed it
  while leaving `main` red for two hours on `catalog-baseline.spec.ts`. A gate that cannot fail
  the way production fails is not a gate.
- Standing permission exists to push verified work to `origin/main`, and to push the source
  branch to `origin` so CI can verify it (a plain push of the branch, never `--force`).

## Hard safety rules (never break these, even if asked mid-flow)

- Never `push --force`, never `reset --hard`, never delete a branch that isn't fully merged.
- The source must resolve to one exact local branch (`refs/heads/<branch>`), must not be `main`,
  and must be checked out in one known worktree. Never accept a remote ref, revision expression,
  tag, detached commit, or argument beginning with `-` as the source branch.
- Update `main` only with `git pull --ff-only`; the final merge into `main` is
  `git merge --ff-only` (see Phase 4). Git itself must refuse any unexpected non-fast-forward.
- **Local `main` vs `origin/main` before the requested merge (`MAIN_SYNC` rule):**
  - **Diverged** (each has commits the other lacks): hard STOP. Show both sides
    (`git log --oneline origin/main..main` and `main..origin/main`) and let the user decide.
  - **Ahead only** (local `main` has commits origin lacks, but is not behind): STOP and
    require explicit confirmation. Show `git log --oneline origin/main..main` and explain that
    the final push would also publish these pre-existing local-only commits, not just the branch.
- Never assume the repo root is on `main` merely because it is the usual main checkout
  location. If `main` is checked out nowhere, follow the Phase 1 "main not checked out"
  procedure - never switch, reset, stash, discard, or overwrite anything on a hunch.
- Never stash or discard uncommitted changes without explicitly asking first.
- Never merge with a dirty source or target worktree. If either is dirty, stop and let the user
  decide how to preserve that work outside this workflow.
- If a merge hits conflicts you are not confident resolving, `git merge --abort` and
  report the conflicting files rather than guessing.
- Never delete a branch, and never remove a worktree you did not create in this run. Cleanup
  is out of scope for this workflow - the cleanup-worktrees workflow owns it and runs from the
  primary `main` checkout, where removal actually works. The exceptions are the TEMPORARY
  worktrees this flow may create, one for a source branch that has none and one for `main` when
  the root cannot host it (both in Phase 1; a run may need both): the run that created them
  removes them in Phase 5, and it may never remove any other. They are identified by the
  `safe-merge-` name prefix AND by having been created in this run - a pre-existing folder with
  that prefix belongs to someone else and is left alone.
- Never touch other worktrees' work. Merge only the ONE requested branch; its merge brings
  in only that branch's commits and must never overwrite or discard work living on other
  worktrees' branches. Do not `git checkout`/`switch`/`restore` files across worktrees, and
  never run a destructive command (`reset`, `clean`, `checkout -- .`) in any checkout.

## Phase 1 - Assess - no working-tree or branch-history changes

This phase only reads state and fetches remote metadata (`git fetch` touches no working tree
or branch history, so it is safe here). Report findings before any later state change.

**Run the mechanical checks rather than narrating them:**

    node scripts/safe-merge-preflight.mjs --branch <branch>

It settles steps 1-8 below in about two seconds - every condition printed PASS/FAIL with the value
it found, and a non-zero exit when any blocking one fails. It only READS (its one write-shaped
command is the `git fetch` of step 3, which touches no working tree and no branch history), so it
can never change what it is assessing. Paste its output; a condition that was checked and one that
was merely claimed must never again look the same in a report. `--skip-order` drops the
merge-order ranking, `--no-fetch` the fetch.

It covers what a machine can settle. The judgement calls stay here and with the user: whether a
`hold` should be waved through, whether a conflict is mechanically resolvable, and - in Phase 3 -
whether a red CI run is a verdict or a damaged run.

Run and summarize:

1. `git worktree list --porcelain` - what worktrees exist, what branch is each on, and **where is
   `main` checked out** (or nowhere)? This determines every later main-updating step's
   checkout; if no worktree has it, see "If `main` is not checked out anywhere" below.
2. If `main` is checked out, run `git status --porcelain` in that exact worktree. Stop if it is
   dirty. Do not substitute the repository root unless the worktree list says the root holds
   `main`.
3. `git fetch origin --prune`.
4. `git rev-list --left-right --count main...origin/main` - ahead, behind, or diverged?
   Apply the `MAIN_SYNC` rule (Hard safety rules).
5. Identify the source branch: use the invocation argument if given; otherwise list candidate
   branches (`git branch --no-merged main` plus the worktree list) and ask the user which one to
   merge if it isn't obvious. Validate the chosen name with `git check-ref-format --branch
   <branch>`, reject `main` and any leading `-`, then require `git show-ref --verify
   refs/heads/<branch>` to succeed. Locate the one worktree whose porcelain branch line is
   exactly `refs/heads/<branch>`. **More than one resolves: stop.** **None resolves: the branch
   has no worktree** - that is a normal state here, not an error (a closed session leaves its
   branch behind and the client parks the freed worktree on a detached HEAD, which is the very
   case `worktree-activity.mjs` exists to surface). Follow "If the source branch has no
   worktree" below rather than stopping.
6. If the branch HAS a worktree, run `git status --porcelain` in that exact one. Stop if it is
   dirty. A branch with no worktree has no working tree at all, so there is nothing uncommitted
   to check and nothing to preserve - it clears this step by construction.
7. Preview the merge: `git log --oneline main..<branch>` (what comes in) and
   `git log --oneline <branch>..main` (what the branch is missing), plus
   `git merge-base main <branch>` followed by
   `git merge-tree <base> main <branch>`. Inspect its output for conflicts. On Windows
   PowerShell, also intersect `git diff --name-only <base> <branch>` with
   `git diff --name-only <base> main` and report overlapping paths conservatively. **Never use
   `git merge --no-commit` as a preview**; it changes the index and working tree.
8. **Merge ORDER - what landing this branch costs the other worktrees.** Several branches are
   normally in flight, and this workflow merges `main` into the branch before fast-forwarding,
   so whatever lands first is absorbed by everyone else afterwards. Run:

       node scripts/merge-order.mjs --branch <branch>

   It is read-only (a `git merge-tree` three-way merge in the object store - no working tree, no
   ref) and prints the ranked landing order plus a verdict for this branch. Report its one-line
   verdict every run, whatever it says:

   - **`clear`** - landing this now costs nothing in flight. Say so in one line and continue.
   - **`caution`** - there is a cost but no cheaper branch is waiting, or the cost is small.
     Report the number and continue; someone has to go first.
   - **`hold`** - a cheaper branch is ready AND this one is expensive: it renames or deletes
     paths another branch edits, collides on a sequence number (two migrations minting `0024`
     merge CLEANLY and are still wrong), is stacked on a branch that must land first, or leaves
     five or more conflicted files for others. STOP and get an explicit go-ahead, naming the
     branch it recommends landing first.

   This never overrides the user: a `hold` that the user waves through proceeds normally. It is
   advice with a stop attached, not a gate - and it is advisory only about ORDER. It never
   substitutes for any Hard safety rule or for Phase 3 verification.

### If the source branch has no worktree

Verification is the whole point of this workflow, and it needs a working tree: `main` has to be
merged INTO the branch (Phase 2) and the result built and tested (Phase 3) before anything
reaches `main`. A worktree-less branch has nowhere for that to happen - so this flow creates a
TEMPORARY worktree for it, uses it, and removes it again in Phase 5.

Never borrow another worktree for this. A parked worktree already has dependencies installed and
is tempting, but checking a branch out inside someone else's checkout is exactly what the Hard
safety rules forbid; a fresh one costs an `npm install` and risks nothing.

Report the plan in Phase 1 and create it as the first action of Phase 2:

    git worktree add .claude/worktrees/safe-merge-<branch-slug> <branch>

where `<branch-slug>` is the branch name with `/` replaced by `-`.

**Install AFTER `main` has been merged into the branch, not before** (Phase 2 step 6). A new
worktree shares the object store but NOT `node_modules`, so an install is required before either
gate will run - but a worktree-less branch is usually an OLD one, and the `git merge main` in
step 5 replaces its `package.json` with a much newer dependency set. Installing first means
installing twice: the first run was measured against a lockfile the branch no longer has. Get
`main` in, then install once, against the exact manifest the gates will run under.

The install is the real cost of this path - state it up front rather than letting it surprise
anyone, and expect a couple of minutes even for a one-file docs branch.

From there the flow is unchanged: that temporary worktree IS "the source worktree" for Phase 2
step 5, all of Phase 3, and every cleanliness re-check in Phase 4.

**Stop instead of creating one** if the target path already exists (it is someone else's, whatever
its name), if `git worktree add` fails for any reason, or if the branch turns out to be checked
out somewhere after all. Never use `--force`.

### If `main` is not checked out anywhere

If no worktree has `main` checked out, do NOT assume the root is on `main`. The root
(`C:\claude\NoaCG-Studio`, `<root>` below) is our canonical `main` worktree, but the client
parks it on a detached HEAD when it spins up a linked worktree, so it can drift off `main`.

The single, authoritative definition of "is it safe to reattach `<root>` to `main`?" lives
in `scripts/reattach-main.mjs` - the SAME gate the SessionStart hook uses, so this workflow
and the hook can never disagree. Assess read-only, and trust its verdict:

    node scripts/reattach-main.mjs --check --from-branch <branch> <root>

It prints `SAFE to reattach to main` (clean checkout, no git op in progress, `main` free, and
HEAD either detached with no commits unreachable from any branch/remote or attached to
`<branch>` itself) or `will NOT reattach - <reason>`.

`--from-branch <branch>` names the ONE branch this run is merging. The root sitting on that
branch is the normal rhythm here - it is where the work was done - so it is a configuration to
handle, not a risk to stop on; pass the source branch every run and never any other name. The
SessionStart hook passes no such flag, so it still refuses to pull the root off any branch.

**Decision:**
- SAFE, HEAD detached: plan to **reattach** `<root>` to `main`; it is a state change, so only
  REPORT the plan here and perform it as the first action of Phase 2.
- SAFE, HEAD on `<branch>`: `<root>` is BOTH the source worktree and the future `main`
  worktree. Reattaching now would strand the branch with nowhere to verify, so the reattach
  moves to **Phase 4, after verification passes** - see the marked steps below. Report that
  ordering in the plan.
- NOT SAFE (any reason): do not touch `<root>` - never switch, reset, stash, discard, or
  overwrite anything there. Give `main` a TEMPORARY worktree of its own instead, below.

### If `main` has no worktree and `<root>` cannot provide one

The gate refuses whenever `<root>` is somebody else's right now: on an unrelated branch, dirty,
or mid-operation. Several sessions share this checkout, and the root is as often carrying live
work as it is parked on `main`. That is not a fault to report and stop on - it is the ordinary
state of a busy repo, and stopping there strands a fully verified branch on a condition the user
can only clear by interrupting another session.

So `main` gets its own TEMPORARY worktree, on exactly the terms the source branch already gets
one:

    git worktree add .claude/worktrees/safe-merge-main main

**This is only ever a substitute for a `main` worktree, never a way around a refusal.** It
applies when, and only when, `main` is checked out NOWHERE. Git enforces that itself: with
`main` already checked out, `git worktree add … main` fails with `'main' is already used by
worktree at …`, so there is no path where this quietly creates a second one. **Stop instead**
if `.claude/worktrees/safe-merge-main` already exists (it is another run's), or if
`git worktree add` fails for any reason. Never use `--force`.

It needs no `npm install`: only git runs there - the fetch, the fast-forward and the push.
Verification still happens in the source worktree, against the source branch, exactly as below.

**What this does NOT relax.** The Hard rule against merging into a dirty target worktree stands
untouched, and is *satisfied rather than skipped*: a freshly created worktree is clean by
construction, and it - not `<root>` - is the target. A dirty `<root>` no longer blocks the merge
for the same reason it is no longer involved: nothing in the flow reads or writes it. The source
worktree must still be clean, `main` must still equal `origin/main`, and the final merge is
still `--ff-only`.

Everywhere below, "the actual `main` worktree" means this temporary one for the rest of the run.
The run that created it removes it in Phase 5 - never any other, never with `--force` - under
the same rule as the temporary SOURCE worktree, and a run may create both.

Then present a short plan: **the source branch and the target (`main`), stated explicitly**
("merge `<branch>` -> `main`"), how many commits, predicted conflict files (if any), any
reattach that Phase 2 will perform, and what verification will run.

**Auto-proceed on a clean preflight (standing permission).** The user has granted standing
permission for this workflow to run end to end - including the final `git push origin main` -
without a confirmation prompt. When the Phase 1 assessment is clean, state the plan (source
branch -> `main`, commit count, "no risks flagged") and continue straight into Phase 2
without waiting. Only STOP and require an explicit go-ahead when the assessment surfaces a
real risk, meaning any of:

- local `main` is diverged from or ahead-only of `origin/main` (the Hard safety rules cases);
- the source worktree has uncommitted changes;
- `main` is checked out nowhere AND neither route to a `main` worktree is open - the gate did
  not report SAFE and a temporary `main` worktree could not be created. Neither of those alone
  is a risk: the root sitting on `<branch>` is reported SAFE and is the ordinary shape of a
  merge here, and the root being busy with someone else's work is the ordinary state of a
  shared checkout, answered by the temporary worktree rather than by stopping;
- the source branch is ambiguous or was not clearly identified;
- `merge-order.mjs` returned a `hold` verdict (step 8).

In any of those cases, report the specific risk and wait. Absent them, do not pause - the
later phases still enforce every Hard safety rule and abort on their own if reality
disagrees (dirty verification, main moved, non-fast-forward), so a clean run needs no
gate here.

**REPORT, DO NOT STOP, WHEN THE ANSWER IS "PROCEED ANYWAY."** A stop is for a decision only
the user can make - one where the two branches of the answer lead somewhere different. It is
not for keeping them informed; that is what the report is. Standing instruction from the
owner, 2026-08-06: "there is no point in stopping just to relay information if we are still
going to continue as planned." So state the finding in the running report and carry on. In
particular:

- **A predicted conflict is not a stop.** It used to be listed above and no longer is. The
  merge happens on the BRANCH with `main` untouched, Phase 3 resolves only what is
  mechanically obvious, and anything semantic stops THERE with the hunks shown - which is a
  stop with something to decide, at the moment there is something to decide. Predicting one
  in Phase 1 and asking permission adds a round trip and no safety.
- **`merge-order` `caution` is not a stop**, and never was. Report the number and continue;
  someone has to go first. A `hold` still stops, because that one says a cheaper branch is
  ready and this one is expensive for everyone else - a genuine ordering decision.

None of this relaxes a Hard safety rule or any stop still listed above. Those exist because
proceeding could lose work, publish something unintended, or promote an untested commit.

## Phase 2 - Prepare (reattach main if needed, update main, then integrate it INTO the branch)

Order matters: bring the latest main into the WORKTREE branch first, so all conflict
resolution and testing happen on the branch. Main only ever receives an already-tested
branch - it is never where conflicts get resolved.

1. If Phase 1 found `main` checked out nowhere, the gate reported SAFE **and HEAD was
   detached**, reattach now: `node scripts/reattach-main.mjs <root>` (it re-verifies safety,
   then switches). If instead the root is on the source branch, do NOT reattach here - it is
   the source worktree until Phase 3 is done; Phase 4 step 3 handles it. If Phase 1 found the
   root cannot host `main` at all, create its temporary worktree now:
   `git worktree add .claude/worktrees/safe-merge-main main`, and read "the actual `main`
   worktree" as that one everywhere below.
   If Phase 1 found the SOURCE branch has no worktree, create the temporary one now:
   `git worktree add .claude/worktrees/safe-merge-<branch-slug> <branch>`. Do NOT install into
   it yet - that happens in step 6, once the branch holds the manifest the gates will use.
   Everything below means that worktree wherever it says "source worktree".
2. Recheck the actual `main` and source worktrees with `git status --porcelain`. Stop if either
   became dirty after assessment. A freshly created worktree reports clean because
   `node_modules/` is gitignored; if it reports anything else, stop - something is wrong.
3. In the actual `main` worktree, update main from the remote:
   `git pull --ff-only origin main`. When `main` has no worktree at all because the root is on
   the source branch, update the ref in place instead: `git fetch origin main:main`, which git
   refuses unless it fast-forwards - the same guarantee `--ff-only` gives, without needing a
   checkout.
4. Record `INTEGRATED_MAIN_SHA = git rev-parse main` - the exact main integrated into the
   branch, re-checked in Phase 4.
5. In the SOURCE branch's worktree, integrate that main into the branch: `git merge main`.
6. If step 1 created a temporary worktree, install into it NOW - after the merge, so the install
   matches the manifest the gates will run under: `npm install` inside that worktree. Conflicts
   from step 5 are resolved first (Phase 3 step 1) when there are any; installing against a
   half-merged `package.json` proves nothing.

## Phase 3 - Resolve & verify (on the branch, main untouched)

1. Resolve any conflicts from the `git merge main`, carefully. Resolve only what is
   mechanically obvious; for anything semantic, stop and show the user the conflicting hunks.
   If it is not confidently resolvable, `git merge --abort` and report. This happens on the
   BRANCH, so main stays untouched. When conflicts are resolved, complete the merge commit before
   continuing; never verify a half-finished merge.
2. Pin the commit under test: `VERIFIED_SHA = git rev-parse <branch>` and state it. The exact
   commit that passes verification must be the exact commit that becomes `main`.
3. Verify the integrated branch. **CI is the primary gate; the local pair is the fallback.**

   `ci.yml` triggers on every branch push, and what it runs is strictly MORE than a laptop
   can: `npm run build`, the same affected plan sharded across up to nine runners, the factory
   gates, and the catalog tripwire when the plan raises it - all on a clean checkout. It
   finishes in about ten minutes and costs nothing (the repo is public, so Actions minutes
   are free). Running the same work locally instead buys no extra confidence and takes the
   machine out of service while it happens.

   **Since 2026-08-19 that CI run answers the INTEGRATION question, which is the one this
   phase is about.** The commit Route A verifies is the merge commit Phase 2 just made, and
   the plan job used to base its diff at `github.event.before` - the pre-merge branch tip - so
   it classified only the files `main` had brought in and the branch's own work went unplanned.
   A green run then meant "main's changes are fine here", not "the combined tree holds".
   Replayed over the last 120 merge-of-main commits in this repository, 71 (59%) would have
   been planned differently, 17 of them skipping the catalog calibration gate. The plan job now
   passes `--integration`, so the base is the fork point and the plan is the union of both
   sides. Route A and Route B ask the same question again, which is what makes preferring
   Route A safe.

   **Route A - CI (prefer this).** Push the integrated branch and let the gate run there:

       git push origin <branch>
       gh run watch --exit-status $(gh run list --branch <branch> --commit <VERIFIED_SHA> \
         --limit 1 --json databaseId --jq '.[0].databaseId')

   Accept the run ONLY when all of these hold, and state in the report which run you are
   citing:

   - its head SHA is **exactly** `VERIFIED_SHA` - not the branch tip, not "the latest run on
     this branch". The Phase 2 `git merge main` produced a new commit, so a run from before
     it proves nothing about the tree being promoted;
   - its conclusion is `success` (a cancelled or skipped run is not a pass);
   - the `CI gate` job itself is green - that job is the one that requires every other, so a
     green gate is the whole verdict in one place.

   If no run exists for that SHA, or it is red, or you cannot positively confirm the SHA
   matches, use Route B. A red CI run means fix-or-abort exactly as a red local gate does -
   but first make sure it IS red, in the sense below.

   **Before believing a red run: was it a verdict, or was it damaged?** A CI run can come back
   `failure` without any of this repository's code having been executed, and the two look
   identical in `gh run list`. Telling them apart takes one command:

       gh api repos/{owner}/{repo}/actions/runs/<RUN_ID>/jobs \
         --jq '.jobs[] | select(.conclusion != "success")
               | {name, conclusion, steps: [.steps[] | {name, conclusion}]}'

   A failing job is **damaged, not failing**, when it shows any of:

   - `steps: []` - the job never started; it was killed while queued;
   - the only failed step is `Set up job` - runner acquisition failed, before checkout;
   - `cancelled` on a job nobody cancelled, especially several jobs cancelled in the same
     second (that is a whole-run kill, not independent timeouts);
   - a wall time far past its own `timeout-minutes`. That clock only runs while a job is
     EXECUTING, so it cannot cut a job short that is stuck in the queue - a queued job can sit
     indefinitely, and its reported start time is when it entered the queue, not when it ran.

   Corroborate with `curl -s https://www.githubstatus.com/api/v2/status.json` (and
   `.../incidents/unresolved.json` for the detail). Actions being degraded is not a rare
   event: on 2026-08-06 a critical Actions incident ran for over five hours and produced three
   damaged runs here, two of them on `main`, which filed the rolling red-main issue against a
   commit that had passed every code-testing job twice.

   **A damaged run is not a red run - it is NO run.** It carries no verdict about the commit,
   so it is not fix-or-abort and there is nothing to fix: Route A simply did not produce an
   answer, and you fall through to Route B. Say so explicitly in the report - name the run,
   the damaged job and the incident - so the landing is never later mistaken for one that
   ignored a red gate.

   Do not sit and re-run into an ongoing outage. A re-run of a damaged run is free to try
   once; if it also queues without starting, that is confirmation, not a reason to keep
   waiting. Route B is the answer during an outage, and it is a complete one.

   **Route B - locally, when CI is unavailable or you need an answer without pushing.**
   Both of:
   - `npm run build` - typecheck, lint, bundle.
   - `npm run test:e2e:integration:queued` - the same affected plan, based at the FORK POINT
     rather than at `main`. Phase 2 just merged `main` into the branch, and the default base
     (`merge-base HEAD main`) is then `main` itself, so a plain affected run covers only the
     branch's own files and everything main brought in goes unverified. That is the whole
     question this phase exists to answer: a clean merge says two diffs did not touch the same
     lines, never that the COMBINED state holds. Outside the student-release sprint drop the
     `--focus` half (`node scripts/e2e-affected.mjs --integration`); for a branch that has NOT
     taken main in, `npm run test:e2e:focus:queued` is the same thing and still correct.

     Either way it runs the specs covering the diff it was based on,
     plus the catalog calibration gate when the catalog moved. Run it even when the change
     looks harmless: "it's only templates" is exactly the branch that went red, and the
     script decides what "affected" means, not the person merging. It reports and skips
     cleanly when a diff touches nothing the suite covers, so a docs-only branch costs
     seconds.

     The `:queued` form waits for any Playwright run in ANOTHER checkout to finish before
     starting (`scripts/e2e-runs.mjs`). Several worktrees are normally live and each config
     asks for four workers, so two overlapping suites exhaust the machine's RAM instead of
     sharing it - measured at 59 browser shells and 35 MB free. The `:focus` form runs the
     34-file student-critical set where a bare `affected` run would escalate to all 103,
     which is the difference between a few minutes and most of an hour on a core change.

   Anything red on either route means fix-or-abort - do not proceed to main. Any fix creates
   a new commit, so re-record `VERIFIED_SHA` and re-verify it, whichever route you used.
   Playwright starts its own offline-pinned dev server; a server already running on this
   checkout's port makes the guard hook refuse, so stop that one first rather than letting
   the specs reuse it.

   **A local run you already did in this session can stand in for Route B**, under conditions
   worth checking one by one. A branch that changes `package.json` escalates to the whole
   suite, so re-running it minutes later on a byte-identical commit costs a quarter of an hour
   to reproduce a result you are holding. Cite the earlier run in place of a fresh one ONLY
   when ALL of these hold, and say in the report which run you are citing and when it finished:

   - it was `npm run test:e2e:affected` or one of its `:focus` / `:queued` forms (whatever
     scope the mapper chose) and it finished GREEN;
   - it ran in the SAME worktree, so the same `node_modules` and the same dev port;
   - it ran on exactly `VERIFIED_SHA` - AFTER the Phase 2 `git merge main`, never before it,
     because that merge produced a different tree;
   - `VERIFIED_SHA` has not moved since, and nothing has been installed or edited since;
   - `main` has not moved either: `INTEGRATED_MAIN_SHA` still equals `origin/<default>`. If
     main moved, Phase 4 sends you back to re-integrate anyway, and the old run is void.

   If you cannot positively confirm every one, run it again - the doubt costs less than the
   minutes. A merge is not the place to be approximately sure, and "I think that run was after
   the merge" is exactly the shape of an assumption that turns out wrong.
4. Confirm the source worktree is clean with `git status --porcelain`. The checked filesystem
   must exactly match the commit being promoted; generated or uncommitted changes make the
   verification invalid.
5. Confirm the branch still points at the verified commit: `git rev-parse <branch>` must
   equal `VERIFIED_SHA`. If it moved, re-verify.

## Phase 4 - Re-check main, fast-forward merge, and push

Do this immediately before merging - main may have moved on the remote while you verified.

**Run these five checks rather than narrating them** - same script, phase 4:

    node scripts/safe-merge-preflight.mjs --branch <branch> --phase 4 \
      --verified-sha <VERIFIED_SHA> --integrated-main-sha <INTEGRATED_MAIN_SHA>

A non-zero exit means step 2 applies: STOP, do not merge. Paste the output.

1. `git fetch origin`, then confirm ALL of:
   - the actual `main` worktree and source worktree are still clean;
   - `git rev-parse <branch>` still equals `VERIFIED_SHA`;
   - local `main` still matches `origin/main`: `git rev-parse main` == `git rev-parse origin/main`;
   - `main` has not moved since it was integrated into the branch:
     `git rev-parse origin/main` == `INTEGRATED_MAIN_SHA`;
   - the final merge is still a fast-forward: `git merge-base --is-ancestor main <branch>`
     succeeds.
2. **If `main` moved** (any check fails): STOP - do not merge. Return to Phase 2, integrate
   the new latest `main` into the source branch (`git pull --ff-only origin main`, then
   `git merge main` in the worktree), rerun the Phase 3 verification (new `VERIFIED_SHA`),
   and only then repeat this Phase 4 re-check.
3. If the root has been carrying the source branch (the Phase 1 "SAFE, HEAD on `<branch>`"
   case), reattach it NOW - verification is finished, so the branch no longer needs a working
   tree and `main` does: `node scripts/reattach-main.mjs --from-branch <branch> <root>`. It
   re-verifies every condition and switches only if they all still hold; if it declines, STOP
   and report what it said. `<root>` is the actual main worktree from here on.
4. Fast-forward merge from the actual main worktree:
   `git merge --ff-only <branch>`. Git refuses this if it is not a fast-forward; if it fails,
   STOP and report (main moved, or the branch does not contain main). Because the branch already
   includes main, a healthy run fast-forwards cleanly, bringing in only this branch's commits.
5. Confirm the exact verified commit is now `main`: `git rev-parse main` must equal
   `VERIFIED_SHA`. Do not push otherwise.
6. Push: `git push origin main` (standing permission). If Phase 1 flagged pre-existing
   local-only commits ahead of `origin/main`, you must already have the user's explicit
   confirmation that publishing them is intended.

## Phase 5 - Finish

1. Confirm the branch is contained: `git branch --merged main` includes `<branch>`.
2. Remove every temporary worktree THIS run created - each exists only to have made the merge
   possible, and leaving one behind turns a merge into litter that the next session mistakes
   for live work:

       git worktree remove .claude/worktrees/safe-merge-<branch-slug>
       git worktree remove .claude/worktrees/safe-merge-main
       node scripts/dev-port.mjs --prune

   Run each line only for a worktree this run actually created. The prune releases the dev-port
   ticket if the e2e run reserved one for that path - it only
   ever clears tickets whose worktree is gone, so it is safe to run unconditionally, and on a
   docs-only branch (where the affected run skips without starting a server) it simply finds
   nothing of ours to release. Never use
   `--force`: if the removal refuses, say so and leave it for the cleanup-worktrees workflow
   rather than overriding a refusal you did not diagnose. Remove ONLY the worktrees this run
   created, and never the branch.

   On Windows a removal routinely half-succeeds: git deregisters the worktree and then reports
   `failed to delete … Permission denied`, leaving an EMPTY directory behind. That is the known
   OS lock, not a refusal to override - the worktree is gone from `git worktree list`. Deleting
   an empty directory this run created is fine; if it will not go, leave it and say so, because
   `session-start.mjs` sweeps empty leftover folders under `.claude/worktrees/` anyway.
3. Do NOT remove any other worktree or delete the branch, and do not offer to. Just note that
   the cleanup-worktrees workflow (run from the primary `main` checkout) sweeps merged
   branches and their worktrees when the user wants them gone.
4. Final report: merged commits, verified SHA now on `main`, build result, push result, and
   which temporary worktrees were created and removed.
