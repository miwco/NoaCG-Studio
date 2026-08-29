# Red-main landing gates

Branch: `claude/k-red-main-gates`
Date: 2026-08-30

## What this was

`docs/CI_STABILITY.md` measured the fortnight to 2026-08-29 and found the owner's daily CI email was
**one deterministic bug re-reported 27 times**, because landings kept arriving onto a red `main`. It
proposed three mechanisms and said they needed their own wave, landing alone. This is that wave.

## What landed

### Gate 1 - the landing queue refuses to merge onto a red `main`

- **`scripts/main-health.mjs`** (new). `assessMain(runs)` reads `main`'s own recent `ci.yml` runs and
  answers `green` / `red` / `unknown`; `planMainHealth(...)` turns that into proceed-or-refuse.
- **`scripts/auto-merge.mjs`** consults it as step **2b**, after the preflight and preconditions and
  **before the dry-run exit**, so `--dry-run` exercises the check rather than skipping it.
- The refusal names the spec and the age: `main is red on e2e/anim-engine.spec.ts since
  2026-08-27T08:39:00Z (35 h ago) - 2 consecutive red runs`, the run URL, and the way out.
- **Its own exit code, 4**, so it is a refusal KIND rather than a generic one: `npm run jobs` prints
  "main itself is red - fix main first" (`scripts/jobs-store.mjs` `giveUpReason`, `scripts/jobs.mjs`
  runner). Five landings queued against a red `main` all stop with that same line, which is how a
  person sees the fault is upstream of all five.
- Deliberately **not** a deferral like exit 3: a red `main` is fixed by a person, so waiting cannot
  resolve it, and a job cycling in the queue would hide the fault it just detected.
- **The escape hatch:** `--onto-red-main`, forwarded by `jobs.mjs add-merge`. Without it the branch
  that FIXES `main` is the one branch the gate could never let land. A typed flag on purpose - "does
  this branch fix that spec?" is not a question a diff can answer.

**Where it fails OPEN, all three intentional and tested:** no completed run on `main` (the bootstrap
case), an unreachable/failing `gh`, and a run still in flight all **proceed**. A `cancelled` run is
never a verdict, and a cancel between two reds does not break the red streak. No existing refusal
was weakened - the branch's own green gate on the integrated sha is untouched.

### Gate 2 - a red-main run withholds its comment when the failing spec set is unchanged

- **`scripts/ci-failure-set.mjs`** (new) builds the failing set from the run's own **check
  annotations** (Playwright's `github` reporter already puts the failing spec there), hashes it, and
  fails open: an empty or unreadable set hashes to `unknown`, which is never equal to anything.
- **`scripts/red-main-issue.mjs`** (new) owns the decision and the `gh` calls. `ci.yml`'s gate job
  now runs it instead of six lines of inline bash.
- **The old rule keyed on the COMMIT**, and every landing is a new commit - which is precisely why
  one bug was reported 27 times. The new key is *what is failing*.
- The pre-existing refusal is kept and checked FIRST: a re-run of an already-reported commit is
  still silent.

**Receipt, replayed against real GitHub data** - the three consecutive red `main` runs of
2026-08-28 (`33195106665`, `33198360101`, `33205116363`), three different commits: all three hash to
`025ffbf39dcb`, `e2e/anim-engine.spec.ts`. Old rule: 3 notifications. New rule: **1 create, 2
withheld.** A changed set and an `unknown` set both still comment.

**The trap that only a live run could show, and it would have silently voided the whole fix:**
Playwright also emits `Slow Test` **warning** annotations (path `[chromium] > e2e/ai.spec.ts` on run
33205116363) and a run-summary notice, and GitHub uses `.github` as the placeholder path for an
annotation with no file. Counting any of those puts a timing-dependent member in the set, so the
hash differs on most runs, nothing ever dedups, and the mechanism looks installed while doing
nothing. Only `annotation_level: failure` counts. Pinned by `scripts/ci-failure-set.test.mjs`.

### Gate 3 - the branch guard on issue steps: **it was already landed, and the doc was stale**

`docs/CI_STABILITY.md` said `configured-suite.yml` lacked `github.ref == 'refs/heads/main'` on its
issue steps. **It has had it since `13f057fa`** ("Stop the configured suite alarming from feature
branches"), which is on `main`. The proposal was stale when it was written.

Checking the code rather than the description found the same hole still open in two SIBLINGS, and
both are now guarded: **`hosted-latency.yml`** (which `configured-suite.yml`'s own comment names as
sharing its verdict implementation - it shared the bug too) and **`nightly.yml`**. Both the
file/update and the close step, on each. `nightly-drift.yml`, `deploy-verify.yml` and
`weekly-audit.yml` are left unguarded deliberately - their alarms are about the schedule, production
and the repository, none of which a branch dispatch misstates. Reasoning recorded in both docs.

### Docs

- `docs/CI_STABILITY.md`: the three proposals moved to LANDED with what changed and the receipts,
  plus a summary table at the end. Two corrections of its own claims (gate 3 above; and the
  `subscription` 404, see below).
- `docs/VERIFICATION.md`: the same stale `configured-suite.yml` claim corrected.
- `docs/acceptance/owner-queue/2026-08-30-red-main-landing-gates.md`: the owner-facing item.

## The owner's one-click step, in plain words

He asked to keep problems visible after turning Actions emails off. **Both halves, one sitting:**

1. **Turn the noise down** - github.com -> Settings -> Notifications -> **Actions** -> turn **email**
   off. (The "only failed workflows **I trigger**" option is what he already has, and is exactly why
   every landing mailed him: a landing counts as triggered by him.)
2. **Keep the signal on** - on the repository page -> **Watch** -> **Custom** -> tick **Issues**.
   That is what makes the rolling red-main issue reach him. Gate 2 is what makes it safe to rely on:
   before today that issue would have repeated itself as often as the email did.

**Correction carried into the docs:** the earlier owner-queue item claimed `gh api
repos/{owner}/{repo}/subscription` answering 404 proved bot-filed issues reach nobody. That 404 is
ambiguous - the CLI token lacks the `notifications` scope and says so on the next line. His actual
watch state is unknown from here; the Watch menu is where to read it, and ticking Issues is harmless
if it is already on.

## Verified

- `npm run build` green (typecheck + lint + bundle + every `node --test` in the gate).
- `node --test` on all touched scripts: `main-health`, `ci-failure-set`, `red-main-issue` (new, 37
  cases) and `jobs-store` (extended for exit 4). All three new files are in the `npm run build` list
  and in `npm run test:landing-gates`.
- `node scripts/check-workflows.mjs` green - 10 files, including all four workflows touched.
- **Live, read-only:** `node scripts/main-health.mjs` against the real repo (`main is green (run
  33252905700)`); the failure set computed against three real red runs; the gate-2 decision replayed
  end to end (1 notification instead of 3).
- **`node scripts/auto-merge.mjs --branch claude/k-red-main-gates --dry-run`** against a green
  `main`. Worth reading precisely: the first dry run stopped at exit 3 in the merge-order step
  (`waiting its turn - claude/m-citation-rename is still ahead of main`) **before** reaching the new
  check, which is the queue behaving correctly and not a fault in the gate. Gate 1 itself was proven
  directly by `main-health.mjs` on the live repo, and the full path was re-run after integration.
- **`npm run build` again on the INTEGRATED tree** (`claude/k-red-main-gates@6c979285`), because a
  new `main` is a new tree and the pre-merge green proved nothing about this one.
- Deliberately NOT run locally: the full e2e suite. `ci.yml` plans a merge commit from the fork
  point, so the landing's own gate covers both sides, and the standing rule is cheapest gate first.

## Traps for whoever is next

- **The queue runner already running keeps the OLD code.** `scripts/jobs.mjs` spawns the runner
  once and it holds its module graph; the exit-4 give-up wording and the `--onto-red-main`
  passthrough only take effect in a **fresh** runner. The next `add`/`add-merge` after this lands
  starts one, so nothing needs doing by hand - but a landing queued in the current runner will
  report exit 4 with the generic "auto-merge refused it (exit 4)" wording instead of the named one.
  The gate itself is in `auto-merge.mjs`, which the runner spawns per job, so **gate 1 is live
  immediately either way**; only the wording lags.
- **Gate 2 cannot be proven by a green CI run** - it only executes when `main` is red. The replay
  above is the closest thing to proof that exists without breaking `main` on purpose. If it ever
  misbehaves, the first symptom is either a red main with no comment at all (check the `::notice`
  the withhold prints in the run) or a comment on every run (check that the annotations query still
  returns `annotation_level`).
- The `ci.yml` gate job now does a **sparse `actions/checkout` of `scripts/`** (cone mode) so the
  script is there, and gained `actions: read` + `checks: read` to reach its own jobs and their
  annotations. It still installs nothing and needs no `setup-node`.
- Gate 1 asks GitHub once per landing attempt (one `gh run list`, plus job+annotation reads only
  when `main` is red). Negligible, but it is a network call on a path that previously had none
  before the CI wait.
- **A known, deliberately accepted race.** Gate 1 is checked once, before integration - not again
  inside the retry loop when `main` moves underneath. So `main` can go red *during* this branch's
  ten-minute CI gate and the merge still lands on it. That was left alone rather than fixed for two
  reasons: gate 2 now absorbs the consequence (the extra run reports the same failure set, so it
  withholds rather than mails), and every additional refusal point on the landing path is a new way
  for the queue to stop for a reason nobody can act on. If it ever bites, the right shape is a
  re-check inside `landWithRetries` on the `n > 1` path only - that path is already doing a full
  re-verification, so it is the one place the extra question costs nothing conceptually.

## Wave / queue, and the shared-doc merge

This gate went LAST, as the brief required. The wait was real: `m-citation-rename`,
`n-ograf-checker-pass`, `o-svg-corpus-robustness` and `l-flake-ledger` all landed first, in that
order, and this branch integrated after them.

**A trap worth naming for the next person doing a wave audit.** An early check here concluded three
siblings had already landed and nothing was in flight. That was wrong within minutes, and not
because the check was buggy: each of those sessions **landed its work, then committed its handoff
and queued a second landing.** `merge-base --is-ancestor` was true when asked and false ten minutes
later. A branch is not finished when its work is on `main`; it is finished when its session says so.
Ask the queue (`node scripts/jobs.mjs`), not just git.

**The `docs/CI_STABILITY.md` conflict was planned, not an accident.** `l-flake-ledger` re-queued
with `--accept conflict` specifically so the conflict would land on this branch's integrate step,
where both texts could be reconciled by someone holding both. `auto-merge` refuses a conflicting
integrate, so this was resolved by hand before queueing, and the resolution **keeps both sides**:

- L's rewritten class 5, its corrected item 2 in the leverage list, and its expanded "Reproducing
  this" - including its self-corrections, which are load-bearing and were kept verbatim:
  `local-relay` **was** a real, properly-receipted flake (both causes already fixed in-window), and
  re-running failed jobs flips a run's conclusion to `success`, hiding the strongest flake receipts
  from any `conclusion=failure` sweep.
- This branch's classes 1 and 6, items 1 and 3, and the summary table - with the gate 1 row now
  reading **landed** rather than proposed, since this branch is what lands it.

Two cross-references were added while both texts were in view, because they are the same finding
reached twice:

1. **Both sessions independently chose check annotations over `--log-failed`** - byte-identical
   error text, ~1/50 the cost, already structured. That is now recommended in "Reproducing this"
   and is what `scripts/ci-failure-set.mjs` is built on.
2. **Both were bitten by the same shape of counting error.** A `Slow Test` warning annotation here,
   a passing test's `[107/119] … spec.ts:389` progress line there - counting either as a failure is
   the same mistake, and it once put three passing line numbers in this file as three separate
   flakes. Written up as one lesson: filter to the failures before you count.

And one **reconciliation** rather than an agreement, which is the part most likely to be misread
later: class 5 warns that a re-run flips a run's conclusion to `success` and hides receipts. Gate 1
reads that same field and *wants* that - `gh run list` reports each run at its latest attempt, so a
red run someone re-ran green reads green, which is the correct answer to "is `main` green **now**".
A historical sweep must walk the attempts; a live health check must not. Both are in the doc.
