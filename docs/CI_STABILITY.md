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

### 5. FLAKY-SPEC - 0 proven, and the table that claimed otherwise

Proven means: red, then green on the **same SHA** after a re-run. Anything without that re-run is
not proven and is not in this class.

**Both rows this table carried were worked on 2026-08-29 and neither survived it.** Every run behind
them is `run_attempt: 1`, `conclusion: failure` - **there is no same-SHA re-run anywhere in the
window**, so nothing here ever met the admission rule written directly above it. What the table
recorded was repeat FAILURES, and two quite different things were hiding inside them: one pair of
genuine races that had already been fixed days before the table was written, and one deterministic
regression that was never a flake at all.

| Spec, by TITLE | Runs | What it actually was | Outcome |
|---|---:|---|---|
| `local-relay` - "a reloaded browser source reads the log from where it left off" | 2 | **two different races**, not one | both fixed in-window; verified 2026-08-29 |
| `flows` - "wizard: steps mode reveals lines on Next" | 4 | **a deterministic regression** (retired design) | fixed by `d6ee4d3b`, ~3 h after it began |
| `production-controls.spec.ts:262` | 1 | one occurrence, no receipt | never a flake claim; left alone |

**How the old table went wrong, which matters more than either row.** It keyed specs by LINE NUMBER.
`local-relay.spec.ts` was edited four times inside the measurement window, so its line numbers moved
under the ledger: the "neighbours at `:389`, `:396` and `:413`" are not neighbours and not three
specs - they are the *same* test, "a baseline that describes a log which no longer exists is thrown
away", at three successive commits. `:330` names one test before 2026-08-24 19:01 and a different
one after it. **Key a flake by its TITLE.** Line numbers are not identities across a two-week window,
and reading them as identities is what turned two fixed races into a six-occurrence instability.

The second error is cheaper to avoid: **ask whether a fix already landed before opening a row.** Both
relay failures had named fixes in `git log` days before this file was written.

#### `local-relay` - two races, both already fixed, one reproduced on purpose

Only two runs in the window actually failed on this spec (the other candidates matched the spec name
in a shard annotation while failing on `motion-presets`, `package` and `import-svg` - the last being
the known 50-vs-51 font-geometry bound in `e2e/AGENTS.md`).

- **2026-08-24 16:04Z**, at the poll on the baseline: `Expected "89" / Received "88"`. The baseline is
  written on a debounce, so "the key exists" was true before the bumped score reached it. Fixed by
  **`7447ea9c`** - fifteen minutes later.
- **2026-08-24 20:15Z**, at `expect(reads[0]).toBe(play!.id - 1)`: `Expected: 4 / Received: 7`. The
  document still on screen polls every 400 ms with its own cursor, and one of its polls was recorded
  as the reloaded document's boot read. Fixed by **`f193f969`**, which separates the two by the
  receiver's single boot `/relay/ping`.

**Reproduced, rather than assumed.** 15 repeat runs of the current spec under contention are green,
which on this laptop proves nothing (`e2e/AGENTS.md`: a race is fault-injected, never repeated
harder). So the fix was mutation-tested instead: restoring the pre-`f193f969` recorder - and keeping
the deliberate 600 ms pre-reload wait - fails **`Expected: 4 / Received: 7`** at `expect(reads[0])`,
the same assertion and the same two numbers CI reported on 2026-08-24. That makes the ping filter
demonstrably load-bearing rather than decorative, and closes the row.

#### `flows` "steps mode reveals lines on Next" - not a flake, a retired design

All four failures are `locator.click: Test timeout of 60000ms exceeded`, and none of them is in the
test's body. The stack lands in the shared helper - `pickDesign` (`e2e/_browse.ts`), which fills the
Browse search box and clicks the first card matching the name - on the test's very FIRST line. The
name it asked for was `Soft Stack`, and **`12206f5c` had retired that design ~3.5 hours earlier**.
The click then waited a full minute for a card that no longer existed.

Checked at each failing SHA, not inferred: all four ask for `Soft Stack`, all four have `12206f5c`
as an ancestor, and none of them contains **`d6ee4d3b`** ("Point the steps-mode flow at a design that
still exists"), which repointed the spec at `Stack Three` and ended the failures. The "single
40-minute window across three unrelated branches" was not an infrastructure blip wearing a spec's
name - it was three branches that had all taken the retirement and not yet the fix. It is the same
one-bug-reported-N-times shape this file diagnoses for `anim-engine` in its opening section, and it
was missed here because a click timeout in a shared helper looks like flakiness from the outside.

20 repeat runs of the current spec are green, as expected for a defect that was fixed by a commit.
**Nothing in the spec was changed**, which is the correct outcome for a row that was never a flake.

**A retirement is a rename with no compiler behind it.** Retiring a catalog design orphans every spec
that names it, and the spec keeps compiling and only fails at runtime, a minute at a time. That is a
cheap gate for whoever next retires one: grep `e2e/` for the design's name in the same commit.

**Three specs named as suspects in the task brief were checked and cleared:**
`e2e/anim-engine.spec.ts:656` is **not flaky** - it is the deterministic regression above, 27
identical failures fixed by a commit. `e2e/student-rehearsal.spec.ts:110` and
`e2e/video-project.spec.ts:314` have **zero appearances** in the window.

**Mechanism (this table IS the mechanism), with the three rules the first version needed.** A flake
is entered here only with a **re-run-green receipt on the same SHA**; it is keyed by **test title**,
never by line number; and it is opened only after checking that **no fix has already landed** for it.
It carries an owner and a date, and a run failing **only** on specs in this table is a flake rather
than a regression - re-run once before believing it. A spec that stays here for two weeks without an
owner gets quarantined or fixed; it does not get to sit in the list forever being an excuse. **Do not
fix a flaky spec without reproducing it first** - a spec fix without a reproduction is exactly the
recurring-breakage pattern this file exists to end, and on this evidence the more common failure is
softening an assertion that was telling the truth.

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
2. ~~**Own the two real flakes** (class 5). 11 occurrences~~ - **done, 2026-08-29, and there were no
   unowned flakes to own.** Both rows resolved to defects that already had named fixes in `git log`;
   the six-occurrence relay row was two races counted through moving line numbers, and the
   four-occurrence wizard row was a deterministic regression. Nothing was left to quarantine and no
   assertion was softened. The residue is a MEASUREMENT rule, now in class 5: key by title, require
   the same-SHA receipt, and check for an existing fix before opening a row.
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
