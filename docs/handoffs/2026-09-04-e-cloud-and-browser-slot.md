# E - remote isolation is a no-op, and the catalog battery now runs on GitHub

Branch `claude/e-cloud-and-browser-slot` (renamed from the worktree's auto-generated
`worktree-agent-aa582b8c443cd6f7e` as the row's first step).

Two questions, both answered with evidence. The first closed a probe that had been open since
this morning; the second moved a whole gate tier off this laptop.

## 1. Does remote isolation run remotely on this account? No, and it is not "gated" either

`node scripts/agent-isolation.mjs --expect remote` in this row: **exit 1**, ISOLATION MISMATCH.

Then a throwaway agent launched with `isolation: "remote"` whose only job was
`node scripts/agent-isolation.mjs --json`. The launch reported success. It ran here:

```json
{ "host": "Legion-001", "platform": "win32",
  "cwd": "C:\\claude\\NoaCG-Studio\\.claude\\worktrees\\agent-a4aab0fc778f9becb",
  "gitCommonDir": "C:/claude/NoaCG-Studio/.git",
  "worktrees": 13, "queueRecords": 562, "verdict": "local", "confident": true }
```

Thirteen worktrees and 562 landing-queue records against this machine's own `.git` - neither of
which git ever clones. That is the **second independent reproduction**, so it is the behaviour and
not one bad launch.

**There is no gate to open.** A documentation search found `isolation: "worktree"` documented and
`isolation: "remote"` documented nowhere - no plan tier, no org setting, no feature flag, no
`settings.json` key, no environment variable, no repo connection, no CLI version. Nothing in the
launch result reports the drop, and no supported command says where a session is running. So the
honest finding is not "gated pending X" but **accepted and ignored**.

**The lead worth following.** Cloud sessions do exist on this install, through a door the Agent
tool does not have. `claude --version` is 2.1.251 and its own `--help` carries:

| flag | what it says |
|---|---|
| `--cloud [description\|session_id\|url]` | create a cloud session, or attach to an existing one |
| `--environment <ccpool_...>` | create a cloud session on a self-hosted environment |
| `--teleport [session]` | resume a teleport session |

That reframes the backlog item rather than closing it: **cloud is session-level, not
subagent-level**, so an orchestrator cannot route one wave row to the cloud by passing a parameter.
I verified the flags EXIST; I did **not** verify they work on this account, because running
`claude --cloud` starts an interactive session that cannot be driven from here and may cost money.
That is the next probe and it is written down as such in the backlog file, with the exact command.

`docs/backlog/cloud-sessions-for-stateless-rows.md` carries all of this as a dated finding under
"The answer to step 1". Its `state:` stays `unstarted` deliberately - the ask itself (run rows as
cloud sessions) has not started; only its blocker has an answer, and `owner-receipts --check`
refuses `active` without a branch that will outlive this one.

**Re-asking it is one command**, now named in `docs/VERIFICATION.md` under "One browser-driving job
per MACHINE":

```bash
node scripts/agent-isolation.mjs                  # where am I running, and on what evidence
node scripts/agent-isolation.mjs --expect remote  # exit 1 if the launch asked for remote and got local
```

## 2. The catalog battery now runs on GitHub's runners

`.github/workflows/catalog-gates.yml` (new, the only file this row mints) runs exactly the battery
`npm run catalog:affected` prints - `check-catalog-emit`, the four rendered sweeps, and
`catalog-specs` - scoped with the same `--only`, on `workflow_dispatch` and on a 11:50 UTC cron.
The plan is derived by the same script a session runs locally, so the two cannot drift.

```bash
gh workflow run catalog-gates.yml --ref <branch>                        # plan from the branch diff
gh workflow run catalog-gates.yml --ref <branch> -f designs=lt01,tk05   # or name them
gh workflow run catalog-gates.yml --ref <branch> -f designs=all         # or force the whole catalog
```

**Why it matters:** four of those six gates are on the machine-wide browser-job list, so gating a
catalog change locally takes the one slot every other worktree is also waiting for. A runner shares
none of that.

### What it covers, and what it does not

- **Covers:** the plan's steps 1 and 2 for a branch, before it lands - which neither `ci.yml` (emit
  gate + tripwire only, unscoped, per change) nor `nightly.yml` (all five, unscoped, once a day on
  main) can do, because neither knows a branch exists until it is main.
- **Does not run** `l3-sweep` (screenshots, asserts nothing) or `engine-floor` (not in the plan; the
  nightly has it).
- **Render baseline is win32-only**, so `catalog-baseline.spec.ts`'s FRAME half is still inert on a
  runner. The emitted-code half runs.
- **Files no issue when red.** The run fails and that is the signal; the nightly owns the rolling
  issue for these gates rather than a second one arriving about the same fault. The cost is named in
  the file: a midday failure fixed before 00:20 UTC was written down only in the Actions tab.
- **The schedule is not on `nightly-drift.yml`'s watch list**, so a cron that stops firing says
  nothing. The nightly stays the guaranteed tier. Obvious follow-up.
- **The branch base is the plain merge-base with main**, so after taking main in the plan misses
  what main brought - the trap `integrationBase` exists for on the e2e side, which
  `catalog-affected.mjs` has no equivalent of. Pass `-f base=<fork-point-sha>` after a merge. The
  root fix belongs in `catalog-affected.mjs`, not in this workflow.

### It is proven, and proving it found a real bug

`workflow_dispatch` is only triggerable once the file is on the **default branch** - `gh workflow
run` answers 404 otherwise - so a dispatch-only workflow cannot be run on the branch that adds it.
It was proved with a temporary push trigger plus a comment-only edit to `lt01`, both removed again.

- **Run 33896869659** - green, and *wrong*. It measured the **whole catalog**. `plan.txt`, written
  by the plan step itself into the working tree, counted as a changed file (`changedFilesSince`
  adds `git status --porcelain`), could not be attributed to any design, and escalated to `full`
  with its own name printed as the trigger. It fails toward measuring MORE, so **nothing goes red**:
  every run would simply have cost forty minutes instead of four, forever. Scratch files now go to
  `$RUNNER_TEMP`.
- **Run 33898338599** - `1 design(s) in 1 category - lt01`, sweeps `ONLY: --only lt01`, and
  `Numerals - SCOPED to 1 of 331 designs`. Non-vacuous: it says how many it measured.
- **Run 33900304138** - the same, re-proved after the review rewrote how the plan is derived.

Those three run ids are recorded in the workflow's own header, because once it lands there is no
dispatch history on a branch to point at.

## The check chain

- `review: delegated` - code-review at level `high`; the result came back into this conversation and
  passed the phase-1 scope check (right branch, right merge-base `4507b34b`, right three files).
  Seven findings, all verified against the surrounding code before acting.
  - **high, fixed**: the scheduled base query was unfiltered, so the first cron after landing would
    have taken a *feature branch* sha (confirmed empirically - the only green runs of this workflow
    are branch pushes), computed an empty window and reported green having measured nothing. Now
    `--branch main --event schedule`; the event filter matters because a dispatch with an explicit
    `designs=` list measured only those designs.
  - **medium, fixed**: an explicit `-f base=` went unvalidated, so the obvious `base=main` died as a
    raw stack trace inside `git ls-tree` (checkout creates no local `main` on a branch). Now
    resolved with `rev-parse`, with an `origin/` retry.
  - **medium, fixed**: plan-job `timeout-minutes` was 15, under the measured p90 for a cache-missing
    `npm ci` plus a browser download. Now 30.
  - **low, fixed**: the plan was derived twice, each call bundling the catalog and launching its own
    browser. Now once.
  - **low, fixed**: the `designs` input rejected the spaces a person types and did not require the
    trailing digit the catalog's own declaration pattern has.
  - **medium + low, reported not fixed**: the narrow merge-base and the unwatched cron, both above.
    The first needs `catalog-affected.mjs` to grow an integration base; the second needs
    `nightly-drift.yml`, which this row does not own.
- `simplify: inline` - the skill returned fan-out instructions, which per `.agent-workflows/check.md`
  means the pass did not run, so it was done here over the four angles. Removed a duplicated summary
  line and replaced a fragile double-quoted `node -e` (escaped backticks and `${...}`) with a
  single-quoted one. Reported, not fixed: the dev-server boot block is copied verbatim from
  `nightly.yml` and wants a composite action, which would mean editing `nightly.yml`.
- `verify: build + CI` - `npm run build` green on the final tree, and CI green on the final commit
  `27357c77`: run **33902455832**, **all nine E2E shards `(full)`** plus Build, Factory gates, the
  Catalog calibration gate and the CI gate.

  **CI had to be dispatched twice, and the reason is the trap itself.** A workflow-and-docs push
  plans `mode: none`: the push run on this exact commit (33901962535) skipped every shard and the
  catalog gate and reported green on Build and Factory gates alone - not a verdict. Worse, an
  earlier dispatch (33901556733) was **cancelled by my own next push**, since a push joins the same
  concurrency group and cancels the run in flight. So the working order is: push everything first,
  then dispatch, then read which jobs ran, and push nothing until it finishes.
- `taste: not applicable` - nothing in the landed diff can move what a graphic looks like. The
  `lt01` edits were probe scaffolding and are fully reverted; the final diff is three files
  (`.github/workflows/catalog-gates.yml`, `docs/VERIFICATION.md`, the backlog file) and no template.

## Pointers

- `.github/workflows/catalog-gates.yml` - the workflow, with its own reasoning and the proving runs
- `docs/VERIFICATION.md` - "Run the battery on GitHub instead of on the laptop" (when to prefer it
  over the local `:queued` form, and what it does not cover); the isolation command under "One
  browser-driving job per MACHINE"
- `docs/backlog/cloud-sessions-for-stateless-rows.md` - "The answer to step 1"
- `scripts/agent-isolation.mjs` - unchanged by this row; it is what produced the verdict
- `scripts/harness-capabilities.json` - carries the `claude-remote-isolation-silently-runs-local`
  probe. Its claim is now confirmed twice; adding the `--cloud` finding there is a follow-up this
  row left alone to avoid colliding with whoever owns that file.

## What I would do next

1. Probe `claude --cloud` for real. It is the only remaining unknown in the cloud question, and the
   answer decides whether the fetch-ref-and-enqueue bridge is worth building at all.
2. Give `catalog-affected.mjs` an integration base, the way `e2e-affected.mjs` has one. Until then
   the pre-land catalog gate is narrow at exactly the moment it is sold as a pre-land gate.
3. Add `catalog-gates.yml` to `nightly-drift.yml`'s watch list.
