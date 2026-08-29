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
**Mechanism (PROPOSED, needs its own wave):** *the landing queue refuses to land onto a red `main`.*
`scripts/auto-merge.mjs` already gates on the integrated sha; it does not ask whether `main` itself
is currently green. A merge job that checks `main`'s last CI conclusion first, and holds with
"`main` is red on <spec> since <time> - fix that before landing" would have turned 27 emails into
one. This is a new gate on the landing path and lands alone, never beside four in-flight siblings.

**Mechanism (PROPOSED):** *a red-main run withholds its rolling-issue comment when the failing spec
set is unchanged*, the way `nightly-triage.mjs` already withholds by failure-set hash. That protects
anyone who subscribes to the issue; it does not touch `CheckSuite` email, which GitHub sends per run.

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
`configured-suite.yml`. One real gap remains, carried over from `docs/VERIFICATION.md`:
**`configured-suite.yml` does not guard its issue steps with `github.ref == 'refs/heads/main'`**,
which is how one branch put seven identical comments on issue #38. `ci.yml` guards its equivalent.
**PROPOSED:** add the same guard.

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

1. **Stop landing onto a red `main`** (PROPOSAL, class 1). Would have removed 26 of 40 - two thirds
   of the owner's CI email - without changing a single test.
2. **Own the two real flakes** (class 5). 11 occurrences; each one is a red run with no action
   behind it, which is the kind that teaches people to ignore red.
3. **A GitHub notification setting, which only the owner can change** (see the owner-queue item
   `2026-08-29-ci-email-is-one-bug-27-times.md`). The repo cannot suppress `ci_activity` mail: every
   email in the window was GitHub telling the owner a run *they* triggered went red. Turning that
   off and relying on the rolling red-main issue requires the owner to watch the repo - `gh api
   repos/{owner}/{repo}/subscription` currently answers 404, so bot-filed issues reach nobody.

Nothing on that list is a test fix, which is the point. **The daily email was one bug reported 27
times, not 27 bugs.**

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
