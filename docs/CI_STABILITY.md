# CI stability - why the same things keep breaking, and what stops each one

The owner's question, 2026-08-29: *"I feel like we are fixing things and then they break again
almost every day. How can we establish a workflow so I don't receive emails every day?"*

This file answers it as a **classification with a mechanism per class**, so the next red run can be
put in a box that already has an owner and a fix, instead of being investigated from scratch. It is
about the SHAPE of the failures. `docs/VERIFICATION.md` §"What a red run means, and what actually
emails" holds the complementary fact - which runs actually reach the inbox - and is not repeated
here.

**Measured 2026-08-15 to 2026-08-29** (14 days, 1245 runs, 204 non-green: 92 `failure`, 112
`cancelled`). Reproduction commands are at the bottom.

## The finding that reframes the question

**Main went red 40 times, for 14 distinct reasons.** One defect accounts for 27 of the 40:
`e2e/anim-engine.spec.ts:656` was red on `main` for about **35 hours** across 25 CI runs and 2
nightlies (2026-08-27 08:39 to 2026-08-28 19:43), always the same assertion at
`anim-engine.spec.ts:716` with the same diff - `ig01`/`ig04`/`ig05` reading a `0` stat instead of
the data.

That is the daily email, and it is not "things breaking again every day". It is **one thing broken
once, re-reported 27 times, because landings kept arriving onto a red `main`.** Each landing pushes
`main`, each push starts a CI run, each run fails the same way, and each failure is a separate
`CheckSuite` email. `ci.yml` deliberately sets `cancel-in-progress: false` for `main`, so unlike a
feature branch nothing collapses those runs into one.

The corollary matters as much: **the other 148 non-green runs cannot email about `main` at all.**
93 are silent cancels (a cancelled run never emails), and the 52 feature-branch failures are an
author's own push telling them their own push is red.

## The classes

Ordered by how much of the inbox each one explains.

### 1. REAL-REGRESSION - 55 runs, 34 on `main`

A genuine defect. Correct to email; a person must act. The problem is never the first email, it is
the 26 after it.

**Mechanism (landed):** none needed for detection - the gate already works.

**Mechanism (LANDED 2026-08-30): *the landing queue refuses to land onto a red `main`.***
`scripts/main-health.mjs` reads `main`'s own recent `ci.yml` runs and `scripts/auto-merge.mjs`
consults it before touching anything, refusing with `main is red on <spec> since <time> - N
consecutive red runs` and the way out. It is a **refusal kind of its own** (exit 4), so
`npm run jobs` prints "main itself is red - fix main first" rather than a generic refusal: five
landings queued against a red `main` all stop with the same line, which is how a person sees the
fault is upstream of all five. It is deliberately **not** a deferral like exit 3 - a red `main` is
fixed by a person, and a job cycling in the queue would hide the fault it just detected.

Three things it will not do, each a way this gate could have made the queue worse than the noise:
no completed run, an unreachable `gh`, or a run still in flight all **proceed** (no answer is never
red); a `cancelled` run is never read as a verdict (`docs/VERIFICATION.md`); and the branch's own
green gate on the integrated sha is unchanged - nothing here relaxes it. The one escape is
`--onto-red-main`, passed by hand and forwarded by `jobs.mjs add-merge`, because otherwise the
branch that FIXES `main` is the one branch the gate can never let land.

**Mechanism (LANDED 2026-08-30): *a red-main run withholds its rolling-issue comment when the
failing spec set is unchanged.*** `scripts/ci-failure-set.mjs` builds the set from the run's own
check **annotations** - Playwright's `github` reporter already puts the failing spec there - and
`scripts/red-main-issue.mjs` decides what to say. The old rule keyed on the COMMIT, and every
landing is a new commit, which is the entire reason one defect was reported 27 times.

The receipt, measured on the three consecutive red `main` runs of 2026-08-28 (33195106665,
33198360101, 33205116363 - three different commits): all three hash to `025ffbf39dcb`,
`e2e/anim-engine.spec.ts`. Under the old rule, three comments; under the new one, one.

What it will not do is go quiet on anything new: a set that has not been reported always comments
(**including a new spec appearing beside a familiar one** - that is a different set), and a set the
gate could not identify hashes to `unknown`, which is never equal to anything, including another
`unknown`. Only the LATEST reported set dedups, so a failure that returns after something else was
reported is news again. The run still goes red and the commit status is still red; only the
notification is withheld, and a withheld comment prints a `::notice` in the run so the choice is
visible rather than silent. It does not touch `CheckSuite` email, which GitHub sends per run - see
"What would actually empty the inbox" below, point 3.

One trap, caught only by running it against a real red run: Playwright also emits **`Slow Test`
warning** annotations (path `[chromium] > e2e/ai.spec.ts` on run 33205116363) and a run-summary
notice. Counting those would put a timing-dependent member in the set, so the hash would differ on
most runs and nothing would ever dedup - the fix would look installed while doing nothing. Only
`annotation_level: failure` counts, and `scripts/ci-failure-set.test.mjs` pins that case.

### 2. CANCELLED-BY-PUSH - 99 runs, 93 on feature branches

`cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}` collapsing a branch's older run when a
newer push arrives, plus 16 runs superseded while still queued (`jobs: []`).

**Emails: none.** Working as designed, and the largest single slice of the dashboard. Its only cost
is that a cancelled run leaves no per-commit verdict.

**Mechanism: none wanted.** The one trap is reading a cancelled run as a verdict - covered in
`docs/VERIFICATION.md` ("A GREEN run is not one either until you read WHICH JOBS RAN").

### 3. MISSED-BASELINE - 17 runs, 9 days, 14 branches, **0 on `main`**

Almost always `e2e/catalog-baseline.spec.ts:65` - "every catalog variant emits byte-identical code"
- failing because a deliberate source change moved the emitted code and the baseline was not
re-recorded in the same commit range.

This class never reaches `main`, so it costs the author an email and a re-run, not the owner. It is
the most *preventable* class in the list: the failure message already names the fix
(`UPDATE_CATALOG_BASELINE=1`), so the gap is knowing to run the gate **before** pushing.

**Mechanism (landed elsewhere, 2026-08-29):** `npm run catalog:affected` names the designs a change
can move and prints the gates already scoped to them - the whole point being that the check is now
a minute rather than a quarter of an hour, so there is no longer a reason to skip it.
**Mechanism (PROPOSED):** *a pre-push reminder rather than a gate.* When the staged diff touches a
file that owns a baseline (`src/templates/**`, `src/templates/importedDesign/**`, anything under
`scripts/*-baseline.json`'s inputs), print the re-record command. A reminder, not a refusal - a
gate here would block the legitimate case where the baseline move IS the change.

### 4. SHARD-TIMEOUT - 12 runs, and already closed

Jobs stopping at exactly their `timeout-minutes` with `##[error]The operation was canceled.` All 12
sit in one 2026-08-15 to 2026-08-19 cluster, and every one hung inside
`npm exec playwright install-deps chromium`.

**This was never a timeout-budget problem** - raising `timeout-minutes` would have made those runs
slower, not greener. The cluster stops dead once `.github/actions/playwright-chromium` began caching
the browser binary. **Closed; no mechanism owed.** The standing rule that a job stopping AT its own
limit is not a verdict (`docs/VERIFICATION.md`) still holds for the next one.

### 5. FLAKY-SPEC - 4 proven, 11 occurrences

Proven means: red, then green on the **same SHA** after a re-run. Anything without that re-run is
not proven and is not in this class.

| Spec | Occurrences | Error shape | Owner |
|---|---:|---|---|
| `e2e/local-relay.spec.ts:330` - a reloaded browser source reads the log from where it left off | 6 | `expect(received).toBe(expected)` | unassigned |
| `e2e/flows.spec.ts:81` - wizard: steps mode reveals lines on Next | 4 | `locator.click: Test timeout of 60000ms exceeded` | unassigned |
| `e2e/production-controls.spec.ts:262` | 1 | `page.evaluate: Execution context was destroyed` | unassigned |

`local-relay.spec.ts` is the one worth a session: its neighbours at `:389`, `:396` and `:413` each
failed once too, which reads as one instability rather than four specs. `flows.spec.ts:81` appeared
four times inside a single 40-minute window across three unrelated branches and never again - that
shape is an infrastructure blip wearing a spec's name, and it should be re-confirmed before anybody
rewrites the spec.

**Three specs named as suspects in the task brief were checked and cleared:**
`e2e/anim-engine.spec.ts:656` is **not flaky** - it is the deterministic regression above, 27
identical failures fixed by a commit. `e2e/student-rehearsal.spec.ts:110` and
`e2e/video-project.spec.ts:314` have **zero appearances** in the window.

**Mechanism (this table IS the mechanism).** The rule that makes it work: a flake is entered here
only with a re-run-green receipt on the same SHA, it carries an owner and a date, and a run failing
**only** on specs in this table is a flake rather than a regression - re-run once before believing
it. A spec that stays here for two weeks without an owner gets quarantined or fixed; it does not get
to sit in the list forever being an excuse. **Do not fix a flaky spec without reproducing it first**
- a spec fix without a reproduction is exactly the recurring-breakage pattern this file exists to
end.

### 6. SELF-REQUESTED / CONFIG-GAP - 10 runs

`workflow_dispatch` runs failing because someone is iterating on the workflow itself (8, one
branch), or because repository secrets are absent (2 on `main`:
`Missing repository secret(s): E2E_EMAIL E2E_PASSWORD VITE_SUPABASE_URL …`).

**Emails: yes, and correctly** - the run is the reply to a question a person typed. This is not
inbox noise; it is the answer.

**Mechanism:** the secret-shaped half is worth one line of prevention - a dispatch that cannot
possibly pass should say so in its first step rather than after setup. Already the case in
`configured-suite.yml`.

**The branch guard on issue steps: CLOSED.** This file claimed `configured-suite.yml` still lacked
`github.ref == 'refs/heads/main'` on its issue steps - the gap that put seven identical comments on
issue #38. **It was already fixed** in `13f057fa`, "Stop the configured suite alarming from feature
branches", before this file was written; the proposal was stale on arrival. Checking the code
rather than the description found two SIBLINGS that still had the hole, and those are now guarded
too (2026-08-30): **`hosted-latency.yml`** (which the `configured-suite.yml` comment names as
sharing its verdict implementation, and which shared the bug with it) and **`nightly.yml`**. All
three now read `github.event_name == 'schedule' || github.ref == 'refs/heads/main'` on both the
file/update and the close step - a rolling alarm is a statement about `main`, so a
`workflow_dispatch` from a branch being debugged must be able to neither raise it nor withdraw it.

Still unguarded, deliberately: `nightly-drift.yml` (its alarm is about the schedule itself, not
about code on a branch), `deploy-verify.yml` and `weekly-audit.yml` (about production and about the
repository, neither of which a branch dispatch misstates). Revisit if one of them ever spams.

### 7. INFRA - 6 runs

`429 Too Many Requests` downloading an action, a `fetch failed` in a build-stage node test, Vercel
deployment drift (`Production serves <sha>, but main reached <sha> over 90 minutes ago`), and one
**damaged run** (`E2E plan` finished its steps and is still reported `cancelled`; `specs` never set,
downstream skipped, gate red).

**Mechanism: re-run once, then look.** The damaged shape has no verdict at all - check `jobs: []`
or a missing job output before treating one as red (`docs/VERIFICATION.md`, "Ways a run reports
something other than its verdict").

### 8. BY-DESIGN-ALARM - 1 run

`nightly-drift` going red on purpose because a schedule had not fired in 26 hours. Correct, and the
repeat comment is already withheld while the red is not.

## Two reports checked and NOT acted on, with the receipts

Both arrived from a sibling session on 2026-08-29 as CI friction. Both were checked against the
code rather than fixed on the description, and neither turned out to be what it looked like. They
are written down because the next person will hit them and reach for the same wrong fix.

**"A markdown-only branch was classified behaviour-changing and ran the full suite."** It was not,
and it does not. `IGNORE` in `scripts/e2e-affected.mjs` has carried `/\.md$/` and `/^docs\//` for
some time, and `planFor` is exported and pure, so the claim is directly checkable:

```bash
node -e "const {planFor}=await import('./scripts/e2e-affected.mjs');
  console.log(planFor(['src/components/AGENTS.md','e2e/AGENTS.md','src/ai/AGENTS.md']))" --input-type=module
# -> { mode: 'none', specs: [], catalog: false, unmapped: [], focusApplied: false }
```

Ten `.md` files under `src/` and `e2e/` select **`none`** - no shards at all. **Adding a
"`.md` never counts as behaviour" rule would have changed nothing**, and would have been a fix
credited for someone else's cause. Two things really do escalate a diff that looks documentation-
shaped, and either one explains the report: a **CORE** file such as `package.json`, and a script on
the short `SUITE_CRITICAL_SCRIPTS` list (`dev-port`, `e2e-affected`, `e2e-workers`, `e2e-runs`,
`port-registry`, `e2e-lists`, the dev plugins) - everything else under `scripts/` is ignored
wholesale. This branch escalated for exactly those two reasons and was right to.

The likelier real cause of the refused landing is the other half of that report: **a mode-`none`
run runs no specs, and a cancelled run has no verdict at all.** Both read as "green-ish" from a
distance and neither is a verdict - the trap `docs/VERIFICATION.md` states as "a GREEN run is not
one either until you read WHICH JOBS RAN". Check `mode` and the job list before concluding the
mapper misclassified anything.

**"The worktree-isolation guard refuses bounded `until … do sleep; done` waits."** True, and **not
this repo's code.** The refusal ("this command is too complex to verify that it stays inside the
worktree") comes from the agent harness's worktree isolation, not from
`scripts/hooks/guard-command.mjs` - it fires with no `cd`, no git, and `gh -R` fully qualified, and
this session hit the same wall on an unrelated heredoc. Nothing in the repo can relax it. The
workaround is the one the sibling session found: **put the loop in a file and run the file.** Note
also that a poll loop over the JOB QUEUE is refused separately and deliberately by `pollsQueue`
(`scripts/command-match.mjs`) - that one is ours, it is about not sitting on a wait the shell tool
will outlive, and `node scripts/jobs.mjs wait <id>` is the sanctioned bounded form.

## What would actually empty the inbox

In order of leverage, measured against the 40 emailing `main` failures:

1. **Stop landing onto a red `main`** (LANDED 2026-08-30, class 1). Would have removed 26 of 40 -
   two thirds of the owner's CI email - without changing a single test.
2. **Own the two real flakes** (class 5). 11 occurrences; each one is a red run with no action
   behind it, which is the kind that teaches people to ignore red.
3. **A GitHub notification setting, which only the owner can change** (see the owner-queue item
   `2026-08-29-ci-email-is-one-bug-27-times.md`). The repo cannot suppress `ci_activity` mail: every
   email in the window was GitHub telling the owner a run *they* triggered went red. Turning that
   off and relying on the rolling red-main issue requires the owner to be **watching the repository
   for Issues**. Two steps, both in the GitHub web UI, and nothing in the repo can do either:

   - **Turn the noise off:** github.com/settings/notifications -> Actions -> uncheck email, or set
     it to "Only notify for failed workflows **that I trigger**"... which is what it already is, and
     is exactly why the landings mailed. Unchecking email is the step that helps.
   - **Keep the signal on:** on the repository, Watch -> Custom -> tick **Issues**. This is what
     makes the rolling red-main issue reach him. **Do not do the first without the second.**

   *Correction to an earlier version of this file:* it claimed `gh api
   repos/{owner}/{repo}/subscription` answering 404 proved bot-filed issues reach nobody. That 404
   is ambiguous - the CLI token lacks the `notifications` scope and says so on the next line - so
   the subscription state is simply unknown from here. The Watch menu is the place to read it.

Nothing on that list is a test fix, which is the point. **The daily email was one bug reported 27
times, not 27 bugs.**

## What landed on 2026-08-30, in one place

| Gate | Where | Refuses / withholds |
|---|---|---|
| Never land onto a red `main` | `scripts/main-health.mjs`, called by `scripts/auto-merge.mjs` | exit 4, named in `npm run jobs`; `--onto-red-main` is the one escape |
| Say each distinct failure once | `scripts/ci-failure-set.mjs` + `scripts/red-main-issue.mjs`, called by `ci.yml` | withholds only a byte-identical repeat of the latest reported set |
| A branch cannot raise a `main` alarm | `hosted-latency.yml`, `nightly.yml` (and `configured-suite.yml` since `13f057fa`) | issue steps scoped to `schedule` or `refs/heads/main` |

Unit-tested in `scripts/main-health.test.mjs`, `scripts/ci-failure-set.test.mjs` and
`scripts/red-main-issue.test.mjs`, all three in the `npm run build` gate.

## Reproducing this

```bash
# The inventory. `gh run list` caps at 1000 per query - stitch windows and dedupe by databaseId.
gh api --paginate "repos/{owner}/{repo}/actions/runs?created=%3E%3D<DATE>&per_page=100" \
  --jq '.workflow_runs[] | "\(.created_at)\t\(.conclusion)\t\(.name)\t\(.event)\t\(.head_branch)\t\(.id)"'

# Which job and which step failed, per run - cheap, and enough to classify most runs.
gh api repos/{owner}/{repo}/actions/runs/<id>/jobs \
  --jq '.jobs[] | select(.conclusion=="failure") | .name + " :: " +
        ([.steps[]? | select(.conclusion=="failure") | .name] | join(","))'

# The failing spec. The log is the whole shard, so grep rather than read it.
gh run view <id> --log-failed | grep -E "^\S+\s+\S+\s+\S+\s+ +[0-9]+\) |Error: |[0-9]+ failed"

# Flake proof: red on attempt 1, green on the final conclusion, same SHA.
gh api repos/{owner}/{repo}/actions/runs/<id>/attempts/1 --jq '.conclusion'
```

A cancelled run that never started is `jobs: []`; a cancelled run that was superseded mid-flight has
jobs. The two mean different things and only the second cost any runner time.
