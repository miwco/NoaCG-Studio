# Verification - the full procedure

The root `AGENTS.md` carries the six rules. This file carries the detail behind them: which
suite to run, why the gate moved off the laptop, and what each catalog gate measures. Moved here
from `AGENTS.md` on 2026-08-08 to keep the always-loaded contract short; nothing was dropped.

## The build gate

`npm run build` (tsc + eslint + vite) after every change. The tree stays lint-clean: fix findings
properly rather than sprinkling eslint-disable comments.

Its first, fastest step is `node scripts/check-shared-instructions.mjs` - the drift guard for the
AGENTS.md/CLAUDE.md split and the `.agent-workflows/` shared-workflow pattern: it validates thin
imports, Claude commands, Codex skills under `.agents/skills/`, metadata, explicit-invocation
safety, referenced scripts, and the configured instruction-size budget. It self-discovers
`AGENTS.md` and shared workflow files, so a new nested area or shared command needs no separate
registration - only correct adapters. The complete maintenance contract is
`docs/AGENT_WORKFLOWS.md`.

Its second step, `scripts/check-workflows.mjs`, validates every `.github/workflows/*.yml` against
the GitHub Actions schema: a misspelled key, a wrong-typed value, a `needs:` naming a job that does
not exist - the last being exactly what editing the CI gate's dependency set can introduce. Never
wait for GitHub to catch it instead; during the 2026-08-06 outage two pushes produced no run at all.

There is **no application unit-test suite**; focused Node tests cover infrastructure scripts.
Verify product changes with `npm run build` plus in-browser checks; never mark work done on a green
build alone if the behaviour is observable.

## E2E is TIERED

`npm run test:e2e:affected` maps changed files to covering specs (`scripts/e2e-affected.mjs`) and
is both the inner loop AND what CI runs per change - except on **`main`, which always runs the FULL
suite** (a spec no change maps to is never selected, so it can sit red through green run after
green run - measured, eight of them), and NIGHTLY.

**During the student-release sprint, `npm run test:e2e:focus` is THE student-critical suite
command** (`--focus`, or `E2E_SPRINT_FOCUS=1`, which is what ci.yml sets): a core-file change runs
the focus set (`scripts/e2e-lists.mjs`, 34 specs) instead of all 103 files; the nightly still runs
everything and its verdict separates focus failures from paused-area drift. Prefer the npm script -
the env-var spelling cannot be baked into a package script, because Windows runs those through
`cmd.exe` where a `VAR=1 cmd` prefix is a syntax error, which is why every local run escalated to
103 files while CI quietly ran 34.

When you add a spec, add its mapping in the same commit, or it only ever runs at night. Bootstrap
non-wizard specs with `createProject` (`e2e/_create.ts`).

**A spec that enumerates the catalog must be selected by a `src/templates/` change**, and
`scripts/e2e-affected.test.mjs` pins that rule rather than trusting the list: it scans `e2e/` for
specs importing `CATALOG`, `TYPES`, `KITS` or `PACKS` and fails the build if the mapping misses
one. Six were missing until 2026-08-08, which is how `competition-pack.spec.ts` sat stale.

**Some behaviour has no offline spec at all, and the planner now SAYS so.** `e2e/configured/`
runs against a real backend and a throwaway account (`npm run test:e2e:live:queued`), so it can
neither run in CI nor be selected by the affected gate - which left hosted Pro's door, its
metering and its allowance read-back covered only by offline specs that pin their ABSENCE.
`CONFIGURED_TRIGGERS` (`scripts/e2e-lists.mjs`) names the files whose coverage lives there; a
change touching one prints a line telling you to run that suite. It is reported, never run:
starting it would bring up a dev server on the real `.env`, which is what the offline pin exists
to prevent.

**That suite now has its own nightly, `configured-suite.yml` (01:10 UTC), against a LOCAL Supabase
stack.** Per-change selection still cannot reach it, so nothing commit-driven ever will; a
schedule can. The job runs `supabase start` on the runner, applies the repository's own
migrations, mints a throwaway account, and runs the whole suite against that - then tears down
with the runner. It files its own rolling issue, separate from `nightly.yml`.

Two things that route buys, and one it costs:

- **No Supabase secret lives in GitHub.** The local stack's keys are the CLI's published shared
  defaults, read at runtime from `supabase status`. The repo is public and `.env` points at
  PRODUCTION, so the previous design had to withhold `SUPABASE_SERVICE_ROLE_KEY` and lost two
  specs to it; both are back, and `ALLOWED_SKIPS` is empty.
- **Nothing is written to production.** The suite creates and deletes real rows every run; they
  used to land in the owner's production project, against `playwright.live.config.ts`'s own
  advice.
- **It cannot see latency-shaped defects.** A local stack answers in ~1 ms where a hosted one
  answers in ~200 ms from a runner. The tombstone sync defect fixed on 2026-08-24 was invisible
  at 5 ms/request and failed six specs at 207 ms/request - **this job would not have caught it**.
  A green run here is not evidence that sync is fast enough anywhere real; that needs a hosted
  target or a deliberate delay.

**Its exit code is not its verdict, by construction.** Every spec calls
`test.skip(!haveCreds, …)`, so with the environment unset the run executes nothing and exits 0 -
a job checking only the exit code would be permanently, silently green, which is the exact hole
that let five specs sit on main unverified. The guards, in the order they fire:

1. the stack must come up (`supabase start`);
2. the applied migration count must equal the repository's, so a half-applied schema cannot pass
   as a product regression;
3. `supabase_realtime` must publish `chat_submissions` AND `control_events` - the four
   hosted-playout specs subscribe through `postgres_changes`, and no migration CREATES that
   publication (0003 and 0008 only add tables to it), so a missing one shows up as four 30-second
   timeouts that read like a renderer bug;
4. the test account must **authenticate**, not merely exist - one password grant turns twenty
   ambiguous UI timeouts into one unambiguous step;
5. the JSON report must show **nothing skipped and at least `MIN_TESTS` run**.

**A repeat of the same failure set posts nothing** (the `nightly.yml` amendment, ported here). The
run still fails and the rolling issue stays open - only the COMMENT is withheld, and GitHub mails
on comments rather than on an issue continuing to exist, so a known flake stops arriving every
morning while staying just as visible to anyone who looks. Two conditions keep that honest: the
set must be byte-identical to the one already reported (a new spec failing always posts, even
beside a familiar one), and there must be zero hard failures - only flakes are ever this quiet.
This is deliberately NOT the same as downgrading flaky to a warning: the verdict is unchanged,
each distinct problem is simply said once instead of nightly.

When the suite grows, raise `MIN_TESTS` in the same commit; a stale value only makes the guard
weaker. The run summary lists every test that actually executed - read that, not the exit code.

## A clean merge is not proof the integration worked

`git merge` decides whether two diffs touch the same LINES. It has no opinion about whether the
combined state still holds - and both sides are green by construction, each verified against a
tree that no longer exists. Adding designs on a branch while `main` moves underneath is a merge
git resolves perfectly into a tree whose tests are wrong.

The default affected base is `merge-base HEAD main`, which after `git merge main` IS `main` - so
the plan covers only the branch's own files and everything main just brought in is invisible.
**`npm run test:e2e:integration:queued`** moves the base back to the FORK POINT (the merge-base of
the merge's two parents), so the plan is the union of both sides' changes since they diverged.
`e2e-affected.mjs` also takes that base automatically when HEAD is itself a merge of main, because
that is exactly the moment someone is about to push an unverified combination; `--no-integration`
forces the plain branch-only diff.

It stays cheap: a wide diff escalates, and under sprint focus an escalation is the focus set, not
all 128 spec files. The order is **update from main -> verify the combined state -> fix -> push**,
and CI remains the final authority.

**CI asks the same question, since 2026-08-19.** It used to pass `github.event.before` as the base,
which switched integration off - so a merge commit's run diffed the pre-merge branch tip against the
merge and saw only the files `main` had brought in. Replaying the last 120 merge-of-main commits in
this repository through the planner from both bases, **71 (59%) would have been planned
differently**: 17 skipped the catalog calibration gate the combined tree needed, and 8 skipped E2E
entirely with `mode: none`, reporting green on a combination nothing had run. The plan job now
passes `--integration` alongside the base, so the fork point wins when there is a merge to integrate
and the given base is used untouched when there is not. That does not make the local run redundant -
it means a forgotten local run is no longer a silent hole.

## The pre-merge gate belongs to CI, not the laptop

`ci.yml` runs on every branch push and does strictly more than a local run can (build, the affected
plan sharded up to nine ways, the factory gates, the catalog tripwire when raised) in about ten
minutes, free, on a clean checkout. The safe-merge workflow's Phase 3 prefers a CI run green on
exactly the commit being promoted and falls back to the local pair only when there isn't one.

**The shard count follows measured minutes, not a file count** (`shardsFor` in
`scripts/e2e-affected.mjs`, table in `scripts/e2e-durations.json`): about three minutes of test
execution per runner, capped at nine. A full plan is 70.5 measured minutes and the cap holds it at
nine. What that replaced was a subset cap of four runners however big the subset was - and under
sprint focus plus the curated map a subset is routinely 70-100 of the 131 spec files, so run
32174589727 put 58.3 minutes of tests on four shards (14.6 min each) while the full run beside it
did 66.9 on nine (7.4 min each). Three minutes is set from what a shard now COSTS to add - about
one minute all in, against 3.5 before the browser-setup change below - so the target is a
consequence of that fix, not an independent guess. The table only decides how many runners
`--shard` spreads the plan across, so a stale entry costs wall clock and never coverage;
`npm run check:e2e-durations` reports drift, and **`npm run record:e2e-durations` re-records the
whole table** - it picks the newest green FULL run of ci.yml on `main`, downloads its shard blob
reports, merges them and rewrites the file, stamping which run it came from. Pass a run id
(`npm run record:e2e-durations -- <run-id>`) to use a particular one. A run whose shards are not all
`(full)`, or that is missing a shard, is REFUSED rather than recorded: it measured a subset, and
writing that would drop every spec it skipped back to the median. Blob artifacts expire after seven
days, so re-record from a recent run. Re-record whenever `check:e2e-durations` reports unmeasured
specs - an unmeasured spec counts as the median, so the table decays as the suite grows.

A shard that stops AT its 20-minute `timeout-minutes` is not a verdict on the change. Playwright
shards by test COUNT, not by measured time, so the spread between the fastest and slowest shard is
real and moves with the file list: on run 32178282707 the eight shards ran 7.4 to 14.2 minutes on
identical work, and across 33 full runs the slowest shard averaged 12.7 minutes against a
perfectly-balanced 9.9 - about half of that gap runner-to-runner variance rather than the split.
Re-run the unchanged SHA before bisecting. The fix for a shard creeping toward its budget is a
SHARD, never a looser timeout - a budget raised to accommodate the slowest healthy shard no longer
distinguishes it from a hung one.

**Setup is the other half of a shard's clock, and it is shared.** `.github/actions/playwright-chromium`
is the one place the browser cache and its apt call live, for the nine shards and both gate jobs.
Until 2026-08-19 it reconciled system dependencies on every job, cache hit or miss: measured over 60
runs that was 3.15 minutes of the composite on a cache hit, of which the cache restore was 3 seconds
and apt was the rest - cut off at its own 180-second bound, installing fonts nothing here reads. It
is now tied to the browser cache miss, and the same action measures 0.03-0.10 minutes on a hit.

**A GREEN run is not a verdict either, until you have read which jobs actually ran.** For an
ordinary push the plan's base is still `github.event.before` - the PREVIOUS PUSH - and the
concurrency group cancels the in-flight run on every new push to a branch. (The `--integration`
fix above changes what a MERGE COMMIT is planned from; it does not change which commit an
ordinary push diffs against.) So: push the change, then push a doc line two minutes later, and
the second run plans only that doc line - `plan: {"mode":"none","specs":[],"catalog":false}`,
every shard and the catalog tripwire SKIPPED, the run green on build and the factory gates alone -
while the run that would have covered the change was cancelled before it finished. Nothing ever
gated the change, and the tick says otherwise. Measured 2026-08-19 on
`claude/catalog-names-stat-list-97cbd3`: three pushes in nine minutes, two cancelled, the survivor
green with four of eight jobs skipped - on a branch whose whole subject was the catalog, which is
the one thing `e2e/catalog-baseline.spec.ts` only ever checks in CI.

```bash
gh run view <id> --json jobs -q '.jobs[] | "\(.conclusion)\t\(.name)"'
```

Skipped shards on a change that touches specs or the catalog mean the run answered a smaller
question than you asked. Ask for the whole one: `gh workflow run ci.yml --ref <branch>`. A
dispatched run has no `event.before`, finds no diff base, and escalates to the FULL suite by
design. (A pull request does the same through `PR_BASE`, which is why a PR's run is trustworthy
where a rapid second push's is not.)

## One browser-driving job per MACHINE, not per worktree

A suite, a catalog sweep and a bench are the same workload under different names - a dev server
plus a pile of headless Chromium - and several worktrees are normally live. Two starting in the
same minute asks a 16 GB laptop for double everything: measured at 59 live
`chrome-headless-shell` processes, 10.9 GB held by the test tree and available RAM down to 35 MB,
at which point every other app is being paged out.

The guard hook refuses the second job and names the checkout holding the first
(`scripts/e2e-runs.mjs`, which scans processes rather than keeping a lock file, so there is nothing
stale to clear), and `e2e/_offline-guard.ts` WAITS instead - the universal net, since a hook only
sees tool calls, never your terminal. Use the **`:queued`** form of any e2e script to wait rather
than fail, `node scripts/e2e-runs.mjs --all` to see what is running, and `--orphans` /
`--kill-orphans` to reap browsers a killed run left behind. `NOACG_ALLOW_PARALLEL_E2E=1` in the
command overrides.

**A killed run leaves its DEV SERVER behind, and that one holds a port rather than just RAM.**
Playwright starts the server as a child of its own CLI (`webServer`), through an npm script and a
`cmd /c` shim, so killing the CLI - which is what you do to a stuck run - frees the CLI and leaves
the chain listening. The guard hook then refuses every following run on this checkout's port, and
there is nothing left to stop it FROM. `--orphans` reports those servers and `--kill-orphans`
closes the whole chain, freeing the port. What makes it safe to kill is the same bar the browser
shells clear plus one more: no Playwright CLI is running anywhere, AND the server's launch chain
has no living owner outside itself - so a `dev` server you started, or one the preview tools own,
is never touched. Windows only, like the browser-shell reaper: on POSIX an orphan is reparented to
init instead of left with a dead parent, so the signal does not exist and the check reports
nothing rather than guessing.

**Two runs that start in the same second do not both wait.** A run sitting in its globalSetup is
indistinguishable in the process table from one driving a browser, so each used to queue behind
the other and both sat out the 30-minute cap - two worktrees, both idle at ~2 s of CPU sixteen
minutes in, and killing either one released the other within seconds (2026-08-21). `blockingRuns`
(`scripts/e2e-runs.mjs`) now orders runs by start time, ties broken by pid, and a run yields only
to those ahead of it: one starts, the rest queue behind it in a stable FIFO. A SWEEP is always
yielded to - it has no globalSetup and never waits for anyone, so it can only be work in progress.

Anything the named list misses is absorbed by the worker ladder (`scripts/e2e-workers.mjs`): it
reads FREE MEMORY at start and takes fewer workers when something heavy is already resident, which
is why the local worker count is not a constant.

**Better than waiting: enqueue.** `npm run queue -- "<command>"` returns a job id immediately and
one runner per machine drains the queue - one job by day, two between 00:00 and 07:00, never two
merges, and nothing below a free-RAM floor (`NOACG_JOBS_FREE_MB` retunes it). `npm run jobs` shows
what is running and the REASON each waiting job is waiting, which is the thing none of the
mechanisms above ever reported: "correctly queued behind a long suite" and "died ten minutes ago"
used to look identical from outside. Every job carries a 45-minute cap and is killed as a whole
process TREE on expiry, so a wedged run cannot hold a slot the way an orphaned bench used to.

Keep using the `:queued` scripts when you need the verdict in this session - a gate cannot take a
job id for an answer - but know that `--wait` now gives up after 30 minutes rather than never.
Unbounded, it outlived the shell that started it (an agent's tool call dies at 600 s), so the run
never started and nothing said so. Full account and the remaining rollout: `docs/JOB_RUNNER_PLAN.md`.

## Logic checks without UI (fast path)

Vite serves source modules, so in a browser context you can
`await import('/src/blocks/registry.ts?t=' + Date.now())`, apply blocks to
`createBlankTemplate(...)`, run `validateTemplate`, and load `composeDocument(tpl)` into a hidden
iframe to call `update()/play()/stop()`; store state via `useTemplateStore.getState()`.

## Template catalog sweep

`node scripts/l3-sweep.mjs <shots-dir> <category>` (dev server must be running; any
`AssemblerId` - `lower-third`, `info-card`, `end-credits`, `ticker`, `quiz`, `poll`,
`audience`, …) validates every variant × preset × easing. Run it for the affected category after
template changes. A category whose contract differs from the standard one gets its own branch in
the script rather than a waiver (audience and quiz each have one).

## Visual acceptance is a PACK, and it is not a gate

A gate answers "did this break". It cannot answer "is this any good", and a surface nobody has
looked at is the failure mode green gates are blindest to. Where a change needs a person's eyes,
the evidence is a **visual acceptance pack**: screenshots of the REAL running app, with the exact
route and sequence written down so the read can be repeated by hand
(`docs/INTERACTIVE_PLAYOUT_PLAN.md`, "Verification contract").

Two artifact builders exist for that, and neither asserts anything - both are browser-driving
work, both are in `SWEEP_SCRIPTS`, and the machine's one-job rule applies to them exactly as it
applies to a sweep:

- `node scripts/acceptance-shots.mjs <out-dir>` builds the SPX/CasparCG acceptance fixture end to
  end and exports the packages for the manual playout test (`docs/ACCEPTANCE_SPX_CASPARCG.md`).
- `node scripts/acceptance-pack.mjs` builds **`docs/acceptance/owner-pack/`** - the standing pack
  for every read the repo records as OWED, one page, each frame captioned with the question it is
  asking and nothing else. Its dashboard frames carry geometry read off the live document at
  capture time. **A pack asks; it never answers**, and where a frame cannot answer the question
  beside it (an offline checkout has no published join page and no minted capability links) it
  says so on the frame rather than standing in for one. The pack is committed, unlike a sweep's
  output: four docs point at it as the thing that settles a read, and a picture only this machine
  can see settles nothing.

  **A backend-only surface can still be photographed, and the rig is worth copying.** The pack's
  `hosted` section builds the ORDINARY production bundle with `VITE_SUPABASE_URL` pointed at a
  stub origin (`isBackendConfigured` reads BUILD env, so no page-side shim can reach it), serves
  the built tree to the browser out of memory through `page.route`, and answers the migration's
  RPCs from memory using the production's OWN `buildPanelSpec`/`buildOutputPayload`. Only the
  transport is fake. Its limit is worth knowing before copying it: anything driven through
  Supabase REALTIME does not move, because the log follower tail-fills only on a `SUBSCRIBED`
  channel - so the page is captured OPENING onto the state under test rather than driven into it.

  **Every frame pictures the tree it was built from, so a pack has a staleness contract too.**
  The pack's own README maps each section to the files that make it stale; a branch landing on one
  of them means re-running that section, not reading a picture of a tree that no longer exists.

## The five catalog quality gates

Run after any catalog-wide change:

- `node scripts/type-floor.mjs` fails on any text under its category size floor.
- `node scripts/overflow-sweep.mjs --baseline` fails on any box that newly escapes the 1920x1080
  frame or clips its own content, diffing against `scripts/overflow-baseline.json` (~200 variants
  clip by design - reveal masks, ticker/crawl scroll - so it is a diff gate, re-recorded with
  `--update-baseline` on a deliberate look change). **`--with-images` adds a second pass with a
  mark in every image field**, recorded as `<id>@image` in the same baseline: a logo is the one
  operator action that can spend a strap's remaining width (+35% on lt54,
  `docs/ADAPT_FIRST_PLAN.md` §1.5) and every gate here otherwise runs on the EMPTY build.
  Re-record with `--update-baseline --with-images`; the script refuses a bare re-record once image
  rows exist, because that would silently retire half the gate.
- `npm run test:e2e:catalog` (the calibration tripwire in `e2e/catalog/catalog-bench.spec.ts`) is
  the ONLY gate that catches a design growing past its width budget - it doubles every text value.
  Excluded from the default `npm run test:e2e` suite: benching every catalog variant across every
  category is the single heaviest thing here, and (like the two gates above) it only needs to run
  when the catalog or `src/validation/runtimeBench.ts` actually changed.
- `node scripts/field-coverage.mjs` is about DATA: it drives every data field to a sentinel
  through `update()` and re-reads the screen, so anything that did not move is not
  operator-reachable (an `id="fN"` scan cannot see a standings row, ticker item or credits line,
  which a runtime BUILDS from one `lines` field).
- `node scripts/numerals.mjs` is about MOVEMENT: it substitutes every digit in turn and measures,
  failing any live number whose box changes width (DESIGN_LANGUAGE §1) - `tabular-nums` is a NO-OP
  on six of the seventeen bundled faces, so grepping for it would have passed every jiggling
  scoreboard. `--fonts` re-measures the registry's `tabularFigures` flags.

**ADDING OR CHANGING A DESIGN ALSO MOVES THREE BASELINES, AND ONLY ONE OF THEM IS ABOVE.**
`e2e/catalog-baseline.spec.ts` pins the SET of catalog variants, each one's emitted code
byte-for-byte, and (on win32) its rendered frame - so nine added designs fail it until it is
re-recorded, in a diff that should be purely additive:

```bash
UPDATE_CATALOG_BASELINE=1 UPDATE_RENDER_BASELINE=1 npx playwright test e2e/catalog-baseline.spec.ts
```

**That spec is NOT in `playwright.catalog.config.ts`**, which is the trap: the five gates above
can all pass, the whole `npm run test:e2e:catalog` suite can pass, and CI's full plan still goes
red on the baseline - as it did on 2026-08-19, after four green local catalog runs on a
nine-design branch. `npm run test:e2e:focus:queued` covers it locally; CI's plan always does.
Read the diff before committing it: ids ADDED and nothing existing changed is the healthy shape,
and an existing id whose code or frame moved is a real change in a design nobody edited.

`node scripts/engine-floor.mjs` is about the PLAYOUT BROWSER: what CSS/JS an older engine silently
drops, per design and per declaration (`--engine casparcg-24`, `--chromium 80`, `--fail` to gate).
It shares its scanner with the export screen's Playout-compatibility section
(`src/validation/engineSupport.ts`), so gate and warning cannot disagree, and it REPORTS at exit 0 -
a standing account (179 of 430 designs at the Chromium 88 bar) rather than a line the catalog
currently holds.

**The doctrine these share:** they MEASURE the rendered graphic rather than grepping the source,
because every source check here would have passed a catalog that was visibly broken. Each script
documents its own exemptions, with the reason written beside them.

**None of the five is left to memory:** `npm run test:e2e:affected` raises the tripwire
automatically when relevant and CI runs it on that flag, and the NIGHTLY sweep runs all five
unconditionally - so an unrun catalog gate is caught by morning rather than never.

## Migrations reach production through a guard, not through a human

`npm run db:push` applies every pending migration to the hosted project and needs nobody's
permission. What a human used to be asked for was a judgement about RISK, so `scripts/db-push.mjs`
makes that judgement on the statements: grants, policies, additive columns/tables/indexes,
functions and backfills apply; a DROP, TRUNCATE, DELETE FROM, column-type change, RENAME,
`disable row level security`, `owner to`, `alter database`, a REVOKE on an object the same migration
did not create - or any statement shape it does not recognise, because it fails CLOSED - stops and
reports. That refusal is answered per version (`npm run db:push -- --allow 0052`), never in bulk.
The classifier is the guard, and `scripts/db-push.test.mjs` is where it is held: the dangerous
shapes are fixtures, and every migration in the repo is classified so the recognised set cannot
quietly stop covering what this project writes.

Two things make the result evidence rather than a claim. It refuses to push onto a DRIFTED ledger -
a version that is not four digits, or one with no file on disk, means something applied a migration
by a route that is not `db push` (supabase/AGENTS.md) - and it snapshots the grant matrix, columns,
policies and ledger before and after, printing the difference. For a grants-only migration the
expected diff is a named set of privileges and exactly one ledger row; anything else is a finding.

**Nothing triggers it by hand any more.** `scripts/auto-merge.mjs` calls the push immediately after
a branch reaches `origin/main` - the moment a new migration exists and nothing has applied it, on a
machine whose `.env` carries the token, with nobody watching. It asks the drift check rather than
diffing the branch, so it also catches a migration that landed earlier and was never applied, which
is the case the manual step kept losing. A push that refuses does NOT fail the landing: the merge is
already pushed, the refusal is reported, and `scripts/auto-merge.test.mjs` pins both that ordering
and the rule that nothing in the push can turn a successful landing into a failed job. `--no-db-push`
opts a machine out.

The drift check stays, because a migration can still reach `main` without going through the queue on
this machine: the safe-merge preflight REPORTS whether production is behind, and
`npm run check:migration-drift` runs the same check alone. `0051_client_table_grants` sat unapplied on production for hours on
2026-08-25, past a green CI run and a green nightly, and was found only because somebody ran
`supabase migration list` for an unrelated reason - the delay that rule bought was not caution, it
was how one safe change becomes a compound one.

Advisory, never blocking - a laptop without the token, or without a network, gets a note rather
than a refusal. It is deliberately **not** a CI job: the ledger lives in
`supabase_migrations.schema_migrations`, which PostgREST does not expose, so reading it remotely
needs the Supabase MANAGEMENT API and an ACCOUNT-WIDE personal access token - one that enumerates
every organisation and project, and whose API deletes them. This repository is public, so that
token stays out of Actions and the check runs locally, where it already lives in `.env`.

It reads the production ref from `VITE_SUPABASE_URL`, never from `supabase/.temp/`: that is the
CLI's per-checkout LINK state, and a worktree linked to a staging project would otherwise make the
check answer confidently about the wrong database.

## Freshness is TIME-driven, never commit-driven

`docs/STACK_FRESHNESS.md` owns this. `npm run check:freshness` is not in the build gate, because
its answer changes when upstream publishes. It runs weekly in `weekly-audit.yml` and REPORTS -
nothing auto-upgrades, since Remotion's three-file exact pin and the es2017 output floor can both
be broken by a bump that passes every check.

## Ways a run reports something other than its verdict

Four of these have each cost a session, and all four read as green.

**`gh run watch --exit-status` lies.** On 2026-08-23, mid-safe-merge, it exited **0** on a run
whose conclusion was `failure` - two E2E shards red, `CI gate` red. Its own printed output showed
`X CI gate`; only the exit code said green. Settle a CI verdict with the jobs list, never the exit
code:

```bash
gh run view <id> --json jobs -q '.jobs[] | "\(.conclusion)\t\(.name)"'
```

or let `node scripts/safe-merge-preflight.mjs --branch <b> --phase 3 --verified-sha <sha>` do it,
which also applies the two checks a green tick hides - whether the shards actually ran, and
whether a failing job is damaged rather than failing.

**A damaged run is not a red run - it is NO run.** GitHub Actions can return `failure` with none
of this repository's code having executed, and the two are indistinguishable in `gh run list`.

```bash
gh api repos/{owner}/{repo}/actions/runs/<RUN_ID>/jobs \
  --jq '.jobs[] | select(.conclusion != "success")
        | {name, conclusion, steps: [.steps[] | {name, conclusion}]}'
```

A failing job is damaged when it shows any of: `steps: []` (killed while queued, never started);
a single failed step of `Set up job` (runner acquisition failed, before checkout); `cancelled` on
a job nobody cancelled, especially several in the same second (a whole-run kill, not independent
timeouts); or a wall time far past its own `timeout-minutes` - that clock only runs while a job is
EXECUTING, so it cannot cut short a job stuck in the queue, and the reported start time is when it
entered the queue rather than when it ran. Corroborate with
`curl -s https://www.githubstatus.com/api/v2/status.json`. Degraded Actions is not rare: on
2026-08-06 a critical incident ran over five hours and produced three damaged runs here, two on
`main`, which filed the rolling red-main issue against a commit that had passed every code-testing
job twice. A damaged run carries no verdict, so it is not fix-or-abort and there is nothing to
fix - fall back to the local gate and say so explicitly, naming the run, the damaged job and the
incident, so the landing is never later mistaken for one that ignored a red gate. One free retry;
if it also queues without starting, that is confirmation, not a reason to keep waiting.

**A pipe masks the exit code.** `npm run test:e2e:affected 2>&1 | tail -30` reports the TAIL's
status, so a failing suite exits 0 - and grepping the tail for "passed" compounds it, because
Playwright prints the failed-test LIST above the "N passed" summary. On 2026-08-05 that produced a
false "350 green" report; a review workflow caught it, not the gate. Redirect to a file and echo
the code explicitly - `cmd > log 2>&1; echo "EXIT: $?"` - then read the log's failure list, never a
grepped summary. **And the echo becomes the next lie:** a background-task notification reports the
whole compound command's status, which is the `echo`'s, i.e. always 0. A queued run notified
"completed (exit code 0)" while Playwright had failed 2 of 13. A notification's exit code is never
a verdict for a compound command - open the log.

**Never hand-roll a poll loop to wait for a run.** Use the command that EXITS on the condition,
backgrounded, so it notifies once: `gh run watch --exit-status <run-id>` (with `gh`'s own `--jq`
flag, which does not need the jq binary). On 2026-08-21 a hand-rolled loop shelled out to `jq`,
which was not installed; `jq: command not found` went to stderr, stderr landed in the output file
WITHOUT raising a notification, the comparison never matched, and a green run sat unreported for
26 minutes while the owner waited on a safe-merge. Three monitors died that way in one session. jq
is installed now, which is the smaller half of the lesson: a silent wait loop reads as "still
running" forever, so wait on something that exits.

## A schedule that never fires reads exactly like a healthy one

A workflow whose cron has never once produced a run looks, on the Actions dashboard and in
`gh run list`, exactly like a workflow that is running fine - because the runs are all there.
They were just all typed by hand.

**configured-suite, measured 2026-08-25.** Its cron landed on `main` on 2026-08-24 at 14:55 UTC
and, by the time this was checked, had produced **zero** runs. All 16 were `workflow_dispatch`,
several of them green, so the suite read as thoroughly exercised while the nightly signal it
exists to BE had never fired once. The surfaces with no nightly verdict for those two days were
the authenticated ones - account, community, moderation, the Pro wizard and the four
hosted-playout walks the 2026-09-12 production is judged on.

```bash
gh run list --workflow=configured-suite.yml --event=schedule --limit 30   # empty
```

**What that check cost, and what it ruled out.** Every cheap cause was eliminated with API calls,
in this order - run them in this order on any workflow whose cron looks dead:

| Check | Command | Answer here |
|---|---|---|
| Is the schedule disabled? | `gh api repos/:owner/:repo/actions/workflows --jq '.workflows[] \| "\(.state)\t\(.path)"'` | `active` - not `disabled_inactivity` |
| Is this a fork? (forks never run `schedule`) | `gh api repos/:owner/:repo --jq .fork` | `false` |
| Is the file on the default branch, and since when? | `git log origin/main -- .github/workflows/<f>.yml` | since 2026-08-24 14:55 UTC |
| Does repo-level scheduling work at all? | `gh run list --workflow=nightly.yml --event=schedule` | yes - fired 01:54 UTC that same night |
| Did a concurrency group hold the slot? | compare `createdAt`/`updatedAt` of every run against the cron time | no - the group was free 01:03-03:58 UTC |
| Is the `on:` block shaped like one that works? | diff against `nightly.yml` | identical shape |

**Nothing was changed on that evidence, and that is deliberate.** One missed cycle on a
ten-hour-old schedule is not proof of a broken cron: GitHub delays scheduled runs under load and
**drops them outright** - `nightly.yml` ran its 00:20 UTC cron at 01:54 that same night, 94
minutes late, and this repo has separately recorded a 23:43 cron running at 01:11. Moving the
cron would also have re-registered the schedule and destroyed the one clean data point the next
cycle gives. The falsifiable prediction is on the record instead: **if the 2026-08-26 01:10 UTC
cycle also produces no run, the schedule itself is at fault and not GitHub's queue.**

**Never dispatch a workflow to "check whether its cron works".** A `workflow_dispatch` proves the
specs pass; it can never prove the schedule fires, and it fills the run list with green so the
absence stops being visible. Dispatching is precisely what masked this one for two days.

**The mechanism, so this cannot go quiet again.** `nightly-drift.yml` now carries a second job,
"Did the configured suite run on its schedule?", built on the same rolling-issue pattern as the
nightly's - **but filtered to `--event=schedule`**, because an unfiltered check would have been
closed by any one of those 16 dispatches and would have lied in exactly the way it exists to
prevent. Same 26-hour window, so one dropped GitHub slot closes itself and a genuinely dead cron
does not.

### The repo's secret list is a signal too

Four repository secrets were deleted on 2026-08-25: **`E2E_EMAIL`, `E2E_PASSWORD`,
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`**. No workflow or composite action read any of
them - `configured-suite.yml` sets `E2E_EMAIL`/`E2E_PASSWORD` to the local stack's own literals
and derives the two `VITE_*` values from `supabase status`, and the only secrets referenced
anywhere are the three `STAGING_*`. `E2E_PASSWORD` was a live production login sitting in the
secret list of a **public** repository with nothing consuming it.

```bash
grep -rhoE 'secrets\.[A-Za-z0-9_]+' .github/ | sort -u   # the only true list of what is READ
grep -rnE 'toJSON\(secrets|secrets\[' .github/           # and the dynamic forms that grep misses
```

Both, plus the environment and Dependabot scopes (`gh api
repos/:owner/:repo/environments/<name>/secrets`, `gh secret list --app dependabot`), before
deleting anything. The values survive in Supabase and in `.env`, so this is recoverable.
**Deleting a secret is not rotating a credential** - the production login those two named still
exists and should be rotated or removed at the source if it is not wanted.

## The affected mapper's one failure mode has no alarm

`scripts/e2e-affected.mjs` is safe because it fails TOWARD running more specs. An entry that runs
FEWER is therefore the one mistake nothing reports. It has happened twice:

- `src/assets/` maps to a fixed six-spec list written for asset HELPERS (`eraseRegion`,
  `assetInfo`, `lottieSupport`). But `src/assets/gsap.min.js` is the ANIMATION ENGINE, inlined
  into every preview and every export - so upgrading GSAP selected those six specs and never
  `anim-engine.spec.ts`, the one pinning editor-against-runtime motion parity. Fixed in `b250f2c`
  by naming the file in `CORE`. **Generalise: a shared foundation living in a folder whose rule
  was written for helpers gets silently under-covered. Ask what a file IS, not where it sits.**
- 12 AI specs sat red on `main` unnoticed when the Finish step's "Open in the editor" door became
  Advanced-only and `ai.spec.ts`, `ai-lite.spec.ts` and `adapt-first.spec.ts` were missed in the
  migration to `enableAdvancedMode`. They waited 60 s on a button that no longer rendered.

Mutation-test a mapping change in both directions before committing it - a guard that can be added
wrong and still look fine is exactly the kind that is.

## The runtime bench measures paint, not layout

`runtimeBench.overlapIssues` pairs LEAVES, and a leaf owns a text node - a PANEL owns none, so a
panel was never in a pair and text could vanish under one completely with every geometry check
passing. Closed by `src/validation/occlusion.ts` + `bench-occluded` (`9044899c`), which hit-tests
with `elementsFromPoint` rather than deriving paint order, and reads 0 of 502 shipped designs at
default values and 0 of 502 with every text doubled - which is what makes an error band affordable.

**Both calibration runs found bugs in the PROBE, not in the catalog**, and both were the same
mistake: measuring something other than what is on screen.

- Ten shipped tickers read 13-100% covered, because a crawling item passes under the fixed label
  every lap. Fixed by taking the bench's own `dynamicsRoots`.
- es02 read 16.3% under stress because **`Range.getClientRects()` reports LAYOUT rects, and layout
  does not stop at a clip.** The doubled name laid out to x=974 while its box ended at 698; those
  glyphs are never painted. Fixed by cutting line boxes down by every clipping ancestor.

Before believing any measurement of the rendered frame, check the instrument against a screenshot.
