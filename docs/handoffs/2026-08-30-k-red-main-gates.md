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
  `main`, proving the new check passes and stops before the first state change.

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

## Wave / queue

Sibling branches checked before queueing: `claude/l-flake-ledger`, `claude/m-citation-rename` and
`claude/p-ai-door-copy` had all **LANDED**; `claude/o-svg-corpus-robustness` and
`claude/n-ograf-checker-pass` were never created. Nothing was in flight, so this gate landed alone
as the brief required, with no waiting.
