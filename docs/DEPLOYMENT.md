# Deployment - CI, Vercel production, previews, and what to do when it stops

The runbook for the path from a `main` commit to the live product, and for every alarm on
that path. Binding: keep it updated when the pipeline changes.

The cost and capacity policy for the Pro account is
[`VERCEL_PRO_NO_OVERAGE_PLAN.md`](VERCEL_PRO_NO_OVERAGE_PLAN.md).

## The pipeline

1. **CI (`.github/workflows/ci.yml`)** runs on every push to `main` and every PR (a branch
   pushed without an open PR runs nothing). It is the **per-change tier**: Build (typecheck +
   lint + bundle) and the factory gates always run, while the E2E job runs only **the specs
   that cover the change**.

   An `E2E plan` job answers that first, by running `scripts/e2e-affected.mjs --json
   --integration` against the diff base (the PR base, or the previous branch tip on a push).
   Its output decides both which specs run and how many runners they get - about 7.5 measured
   minutes of test execution per runner, capped at nine, from the durations table in
   `scripts/e2e-durations.json`. It also raises the **catalog calibration gate** for changes
   that can move catalog output or the bench.

   `--integration` is what makes a MERGE COMMIT honest. Without it the base is the pre-merge
   branch tip, so the diff is only what `main` brought in and the branch's own work goes
   unplanned; replayed over the last 120 merge-of-main commits here, 71 would have been planned
   differently, 17 of them skipping the catalog gate. On a branch that merged nothing the flag
   changes nothing. See docs/VERIFICATION.md, "A clean merge is not proof the integration
   worked".

   **`main` is the exception: a push there runs the FULL suite, whatever the diff says** (and
   the sprint's focus collapse does not apply - focus keeps BRANCH runs cheap, and `main` is
   where the paused areas still need watching). Scoping answers "what can this change have
   broken", which is the right question for a branch and the wrong one for the branch
   production ships from: a spec that no change maps to is never selected, so it can break and
   stay green indefinitely. On 2026-08-07 `e2e/public-service.spec.ts` was red on `main`
   through eight consecutive green `main` runs, and what surfaced it was an unrelated branch
   escalating to the full suite by accident. This buys **latency, not coverage** - the nightly
   already ran everything - and costs about two minutes of wall clock, because the nine
   shards run in parallel and the catalog gate (3 min) finishes inside them.

   **Scoping is only safe because the mapper fails toward running more:** an unmapped file, a
   shared-core file (`src/store`, `src/model`, `src/preview`, `src/validation`, the shell), or
   a diff base that cannot be resolved all escalate to the full suite. When the plan skips the
   E2E job entirely, the gate counts that skip as a pass - but the plan job itself is
   *required*, so a crashed planner can never be mistaken for "nothing to test".

   **What can red the gate is only what tests code:** build, the plan, the factory gates, the
   E2E shards and the catalog tripwire. `Combined E2E report` merges the shards' artifacts into
   a browsable HTML report, runs no test, and is deliberately outside the gate's `needs` - its
   failure costs you a report, not a verdict, and it adds no coverage (a shard producing no
   blob report already fails in the shard). See "A red run that is not a verdict" below.

   On `main`, in-progress runs are never cancelled by a newer push (branches/PRs still
   cancel), so every `main` HEAD ends with a real verdict. A red gate names the failing job in
   an error annotation; Playwright's `github` reporter annotates the exact failing tests.

1. **`nightly` (`.github/workflows/nightly.yml`)** is the **exhaustive tier**, at 02:00 UTC
   (04:00-05:00 Helsinki, so a red result is filed before the day starts): the **whole** E2E
   suite in eight shards, plus the three catalog-wide gates that nothing else schedules - the
   calibration tripwire, `type-floor.mjs` and `overflow-sweep.mjs --baseline`. It also carries
   the **E2E time budget** (`scripts/e2e-budget.mjs`), because the nightly is the only run whose
   aggregate is comparable night to night - everything else tests a subset. The budget enforces
   the MEAN per test and only reports the total: shipping a spec with a new pack is healthy
   growth and must not fail a gate, while tests getting slower is the regression worth catching.
   Raising the ceiling is a deliberate act, argued in the commit that does it. Its rolling
   issue names **the commits since the last green nightly**, which is what keeps a red night
   from turning into a bisect.

   **`nightly-drift` (`.github/workflows/nightly-drift.yml`)** is its belt, twice a day: it
   alarms when NO nightly has run in 26 hours. A red nightly files an issue; an absent one
   looks exactly like a healthy night, which is the same shape as the outage this runbook
   exists for. The window is generous because GitHub delays scheduled runs under load - a
   23:43 cron here was observed running at 01:11 - and can drop them; two check slots mean one
   dropped slot cannot hide a missing nightly. It lives in its own workflow deliberately: a
   check inside `nightly.yml` could not fire when the nightly did not.
2. **Vercel** builds production from **`main` only** (project `noacg-studio`,
   team `miwcos-projects`, production URL <https://noacg.studio>). Every push to
   `main` triggers a production deployment via the Git integration; CI and Vercel run in
   parallel and do not gate each other (see "Known limits").
3. **`deploy-verify` (`.github/workflows/deploy-verify.yml`)** watches the deployment:
   - a **failed** production deployment becomes a red run on that commit;
   - a **successful** one is verified live: `https://noacg.studio/version.json`
     (written by `scripts/write-version.mjs` at the end of `npm run build`) must serve that
     commit (or a newer `main` commit containing it), and `/` and `/app` must answer;
   - a **drift check** four times a day alerts when production does not contain the newest
     `main` commit older than 90 minutes - the belt for "no deployment was even created".

   The drift check is a belt, not the alarm: it found the 2026-08-07 config refusal about seven
   hours after it started, because it runs four times a day and GitHub dispatches a schedule
   1-2 h late. So CI's **`Vercel accepted the commit`** job (`ci.yml`, `main` only) asks the
   same question in the run that is already happening: it polls the `Vercel` commit status for
   up to five minutes and reds the run with the refusal's own words. A missing verdict is not a
   refusal - it says so and leaves the case to the drift belt. It is deliberately **outside the
   CI gate**: a deploy fault is not a code fault, and the production rolling issue belongs to
   deploy-verify.

## Alerting (rolling issues - one per failure class, no duplicates)

Five self-closing rolling issues, all following the weekly-audit pattern (one open issue,
one comment per newly failing commit, the same commit never alerts twice, auto-closed by
the next healthy state):

| Issue title | Raised by |
|---|---|
| `CI is red on main` | the CI gate, on a red `main` run |
| `Production is not running the latest main commit` | deploy-verify: failed deploy, failed live verification, or drift |
| `Nightly full test suite is red` | nightly: the full suite or a catalog gate failed - the body lists the suspect commits |
| `Nightly sweep has not run` | nightly-drift (twice a day): no nightly at all in 26 h - the belt against a schedule that silently stops firing |
| `Weekly dependency audit is red` | weekly-audit (Mondays): a new high/critical advisory |

GitHub also emails the pusher on any failed run of their push (account notification
settings, on by default). **Drill:** to prove the alarm path works, push a `main` commit
with a deliberately broken test (or run the drift job via *Actions → deploy-verify → Run
workflow* while production is behind) and watch the rolling issue appear; revert and watch
it close.

## A red run that is not a verdict (GitHub Actions is degraded)

A run can come back `failure` without a single line of this repository having executed, and in
`gh run list` that looks exactly like a real failure. Check before you go hunting for a bug:

    gh api repos/{owner}/{repo}/actions/runs/<RUN_ID>/jobs \
      --jq '.jobs[] | select(.conclusion != "success")
            | {name, conclusion, steps: [.steps[] | {name, conclusion}]}'

The job was **damaged, not failing**, if it shows `steps: []` (killed while queued), a lone
failed `Set up job` step (runner acquisition, before checkout), a `cancelled` nobody asked for -
especially several jobs cancelled in the same second, which is a whole-run kill - or a wall time
past its own `timeout-minutes`. That last one is the counter-intuitive part: **`timeout-minutes`
only runs while a job is EXECUTING**, so it cannot cut short a job stuck in the queue, and the
reported start time is when the job entered the queue, not when it ran.

Confirm against `curl -s https://www.githubstatus.com/api/v2/status.json` (detail in
`.../incidents/unresolved.json`). This is not rare: on **2026-08-06** a critical Actions incident
ran over five hours and damaged three runs here, two on `main`, filing `CI is red on main`
against a commit that had passed every code-testing job twice. It also cancelled a
`deploy-verify` drift job, which files a *different* rolling issue for the same non-reason.

**A damaged run carries no verdict.** There is nothing to fix and nothing to revert. Re-run it
once; if the re-run also queues without starting, that is confirmation, not a reason to wait.
The rolling issue is self-closing, so it clears on the next healthy run - comment on it rather
than closing it by hand, so the record says why it was open. safe-merge Phase 3 has the matching
rule for a landing: a damaged Route A run is no run, so it falls through to Route B.

## The serverless function budget (the >12 functions error)

The Vercel **Hobby plan caps a deployment at 12 serverless functions**. Every file under
`api/` that is not in `api/_lib/` (and not a `.test.ts`) becomes one function. In July 2026
the api/ tree grew to 29 files and **every production deploy failed for days while the repo
stayed green** - the wake-up call this runbook exists for.

The fix was consolidation to **10 functions** via one catch-all per area
(`api/admin/[...path].ts`, `api/ai/[...path].ts`, `api/ai/lite/[...path].ts`,
`api/ai/tasks/[...path].ts`, `api/render/[...path].ts`) plus the standalone entrypoints
that need their own runtime config in `vercel.json` (`api/ai/generate.ts`,
`api/render/start.ts`, `api/render/cleanup.ts`) and the small singles (`api/events.ts`,
`api/me/entitlement.ts`). **A new endpoint goes INSIDE an existing catch-all** (a new route
in its `_lib` router), never as a new top-level file, unless it genuinely needs its own
`functions` entry - and then check the count first.

**`npm run check:function-budget` now counts them in the build gate**
(`scripts/check-function-budget.mjs`), implementing Vercel's routing rule rather than an
approximation: everything under `api/` is a function except paths with an `_` segment and
`.d.ts` files. It prints the headroom on every build (10 of 12 today) and fails over the cap,
so the count cannot climb back to 29 unnoticed. `scripts/check-function-budget.test.mjs`
tests the rule against a fixture tree, since `api/` alone only ever exercises today's shape.

## Traps that already cost days (check these FIRST on a failing Vercel build)

- **Vercel typechecks `api/` with the ROOT `tsconfig.json`, not `tsconfig.api.json`.** The
  root lib is pinned to ES2020 and `tsconfig.api.json`'s lib now matches it, so the local
  gate reproduces production. If a Vercel build dies with a TS error CI never saw (e.g.
  TS2550 on `.at()`), an api file is using a library surface newer than the root lib -
  fix the code, do not widen the lib.
- **The function count** (above): "No more than 12 Serverless Functions" in the build log.
- **An invalid route pattern in `vercel.json` leaves NO trace on Vercel at all.** Config is
  validated *before* a deployment is created, so there is no failed build, no deployment row,
  and a project page that looks idle and healthy - production just keeps serving the last
  commit that deployed. On 2026-08-07 the header source `/join(/(.*))?` (an unnamed group
  inside an optional group - not valid path-to-regexp, though it reads like the `/(.*)` rules
  beside it) stopped eight consecutive `main` commits this way. The only signal is the
  **`Vercel` commit status** on GitHub: `gh api repos/miwco/NoaCG-Studio/commits/<sha>/status`
  → `"description": "Deployment failed."` with a `vercel.link/...` target URL naming the class.
  `gh run list` never shows it, because no workflow of ours deploys.
  **`npm run check:vercel-config` now runs this locally in the build gate**
  (`scripts/check-vercel-config.mjs`, over Vercel's own `@vercel/routing-utils`), so this class
  cannot reach `main` again; `scripts/check-vercel-config.test.mjs` mutation-tests the gate.
- Build log access: `vercel.com/miwcos-projects/noacg-studio` → the deployment → Build Logs,
  or the Vercel MCP `get_deployment_build_logs`.

## Previews (opt-in, never production)

Production deploys **only from `main`**; a branch push can never replace production - it
would only ever create a Preview deployment. Since dozens of worktree branches are active
at once and CI already builds each of them, previews are **opt-in**:
`scripts/vercel-ignore-build.mjs` (wired as `ignoreCommand` in `vercel.json`) skips the
Vercel build for every non-`main` branch unless the head commit message contains
`[preview]`. `main` always builds - the script fails open (builds) on any error.

## Where to look when production stops updating

1. **The rolling issues** (above) - if the machinery works, the answer is already filed.
2. `gh run list --limit 15` - is `main` red (which gate?), or green but undeployed?
3. Vercel dashboard / MCP `list_deployments` - is there a production deployment for the
   commit at all, and did it ERROR (open build logs; check the traps above)?
4. **No deployment row for the commit?** Read the `Vercel` commit status on GitHub before
   suspecting the webhook - a rejected `vercel.json` fails there, silently and invisibly on
   Vercel's side (trap above). `ignoreCommand` is the other cause, but it never skips `main`.
5. `curl https://noacg.studio/version.json` - what commit is actually live?
6. E2E-red-without-a-code-fault has four known non-code causes (stale dev server, parallel
   sessions on one checkout, HMR ghost modules, offline pin vs a manual server) - reproduce
   locally with `npm run test:e2e -- <spec>` before assuming the code broke.

## Known limits (deliberate, revisit when they hurt)

- Vercel deploys `main` without waiting for CI: a bad merge can be live for the minutes
  until the gate reddens. The repo-side fix would be deploy-on-workflow-success (CI-driven
  `vercel deploy --prebuilt` or Vercel's "only deploy when checks pass" project setting);
  adopt it if a red-but-deployed `main` ever causes real damage. The safe-merge flow verifies
  the exact commit it promotes before anything lands, so `main` should be red only when a
  merge race slips through - and both alarm classes above catch it within minutes. Its gate
  covers e2e for a reason: until 2026-07-30 the flow gated on `build` alone, which runs no
  e2e spec at all, and four template packs landed in a row that each passed it while leaving
  `main` red for two hours on `catalog-baseline.spec.ts`. A gate that cannot fail the way
  production fails is not a gate.
- **That verification now happens in CI, not on the developer's machine.** `ci.yml` triggers
  on every branch push (not just `main`), so safe-merge's Phase 3 waits for the run whose head
  SHA is exactly the commit being promoted and cites it, falling back to the local
  `npm run build` + `npm run test:e2e:focus:queued` pair only when no such run exists. This is
  more coverage, not less: CI adds the factory gates and runs the affected plan across up to
  nine shards on a clean checkout, in about ten minutes of somebody else's compute. The local
  pair was costing far longer than that and taking the machine out of service while it ran -
  measured on a Ryzen 7 5800H / 16 GB laptop at 59 concurrent browser shells and 35 MB of
  free RAM, which is a paging laptop, not a test run.
- The drift check trusts `version.json`; if the endpoint is unreachable the check alerts
  rather than guessing.
