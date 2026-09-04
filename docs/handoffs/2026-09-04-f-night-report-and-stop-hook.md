# F - the night reports itself, and a wait on a monitor is caught

Branch `claude/f-night-report-and-stop-hook` (renamed from the worktree's auto-generated
`worktree-agent-aaf99cae9dc090992` as the row's first step), four commits off `3fd40d15`.

Two small mechanisms, both measured against tonight's own records rather than against what the
row's prompt assumed. One of them was wrong about a third of the way through, and saying which is
most of the value here.

## 1. The stop hook missed the word the row actually used

Reproduced before anything was changed. `declaresWait("I'll wait for the monitor rather than
polling.")` returned `false`.

`NOTHING_WAKES_YOU` listed `watcher` and none of the ordinary synonyms for the same thing. That is
the whole bug, and it cost about forty minutes of the rehearsal because one row wrote the plain
word twice.

**The fix is not one token, deliberately.** The list has two halves and they behave differently.
THE WORK a session waits on (a run, a landing, a queued job, the shards, the gate) is a closed set
that the queue's own vocabulary already fixes. THE OBSERVER it believes will carry that finish back
(watcher, monitor, poller, tick, background task) is an open set of everyday synonyms, and it had
exactly one member spelled out. Enumerating that half as a class is what stops the same gap
reopening on the next word; adding `monitor` alone would have fixed one sentence.

**Widening it exposed a false positive that was already live and unnoticed.** A wait ON A PERSON
that happens to name a machine fired too:

- `Waiting for you to land the fix.` → matched on `land`
- `I will resume once you have read the run.` → matched on `the run`

A person is the one thing that CAN wake a stopped session, and the hook's own message ends by
asking a blocked session to say so and stop. So it was arguing with the sessions doing the right
thing. `NOT_A_PERSON` is a negative lookahead on the object of the wait, immediately after the
preposition, and the widening ships with it because the widening would have multiplied it.

**And the review of this change tripped the hook, which is a third finding.** `declaresWait` had no
notion of quoted text, so quoting the queue's own sentence for a capped landing - *killed at its 45
min cap - probably still waiting on CI* - reads as declaring a wait. That hits a handoff quoting a
job log, a review reading this file, and the night report added in the same branch. Fenced blocks,
inline code spans and blockquote lines are now stripped before matching. **Raw prose pasted with no
markers is still not covered**, and that residue is in the backlog item rather than pretended away.

Bare `poll` is excluded on purpose: this product has poll graphics, and waiting on one is a wait on
a person's work.

## 2. The night report

`node scripts/night-report.mjs` (`npm run night:report`) reads the job store and `landed.jsonl` over
a window - default twelve hours, `--hours`, `--since`, `--json`, `--write`.

It classifies nothing itself. `refusalGuidance` in `scripts/jobs-store.mjs` already owns what each
refusal kind means, the one command that answers it, and whether the QUEUE or the SESSION runs that
command; the report groups by those kinds and prints what that function says. A second vocabulary
here would drift from the one the landings act on, which is the failure row A had just finished
fixing.

### Tonight's output, in full

```
# The night, 2026-09-04 09:01 to 2026-09-04 23:01

17 landed · 17 refused (16 of them went on to land) · 1 retry · 0 need a person

## Landed (17)
- 09:38  claude/s-ordering-block-is-a-wait  4f1512b
- 10:00  claude/f-contracts-point  6f7efcf
- 10:17  claude/d-queue-walks-itself  1ff2cf9
- 10:39  claude/m-counting-graphic-airs-zero  ef45d92
- 11:17  claude/walk-f7debe  48ad25c
- 11:38  claude/t-shard-cap-poisons-every-gate  a3b7c3c
- 13:28  claude/u-honest-timings-and-selection  8e80d13
- 13:46  claude/j-fields-step-per-field  776aa8c
- 14:03  claude/p-alignment-across-corpus  da58bf0
- 15:07  claude/v-file-todays-findings  20250b5
- 16:16  claude/walk-f7debe  a32d1a1
- 16:25  claude/landing-path-honest-b154a2  e8dc449
- 16:40  claude/cloud-sessions-remote-worktrees-828938  d3d4136
- 18:49  claude/cloud-sessions-remote-worktrees-828938  4507b34
- 20:40  claude/a-refusals-say-why  8c6a3af
- 21:10  claude/d-account-surface  1b8b493
- 21:22  claude/e-cloud-and-browser-slot  3fd40d1

## Refused (17)

### (no kind on the record) - 13
A landing runs the copy of auto-merge.mjs in its OWN branch, so a branch cut
before the refusal kinds existed refuses in prose and nothing else. This group
shrinks as old branches land; it is not a fault to chase.
- 09:17  claude/m-counting-graphic-airs-zero (j-0529) - and the branch went on to land
      killed at its 45 min cap - probably still waiting on CI
- 10:00  claude/f-contracts-point (j-0533) - the queue put it back
      its process vanished - the runner died or the machine slept
- 10:39  claude/t-shard-cap-poisons-every-gate (j-0538) - and the branch went on to land
      auto-merge refused it (exit 1) - read the log for which check said no
- 11:38  claude/j-fields-step-per-field (j-0541) - and the branch went on to land
      auto-merge refused it (exit 1) - read the log for which check said no
- 11:38  claude/p-alignment-across-corpus (j-0542) - and the branch went on to land
      auto-merge refused it (exit 1) - read the log for which check said no
- 11:43  claude/j-fields-step-per-field (j-0543) - and the branch went on to land
      auto-merge refused it (exit 1) - read the log for which check said no
- 11:43  claude/p-alignment-across-corpus (j-0544) - and the branch went on to land
      auto-merge refused it (exit 1) - read the log for which check said no
- 12:28  claude/j-fields-step-per-field (j-0545) - and the branch went on to land
      killed at its 45 min cap - probably still waiting on CI
- 13:13  claude/p-alignment-across-corpus (j-0546) - and the branch went on to land
      killed at its 45 min cap - probably still waiting on CI
- 16:00  claude/walk-f7debe (j-0553) - and the branch went on to land
      auto-merge refused it (exit 1) - read the log for which check said no
- 16:04  claude/walk-f7debe (j-0554) - and the branch went on to land
      auto-merge refused it (exit 1) - read the log for which check said no
- 17:42  claude/cloud-sessions-remote-worktrees-828938 (j-0558) - and the branch went on to land
      auto-merge refused it (exit 1) - read the log for which check said no
- 18:34  claude/cloud-sessions-remote-worktrees-828938 (j-0559) - and the branch went on to land
      auto-merge refused it (exit 1) - read the log for which check said no

### order-blocked - 4
- 09:18  claude/j-fields-step-per-field (j-0530) - and the branch went on to land
      blocked by claude/m-counting-graphic-airs-zero - held until one lands or is queued
- 09:18  claude/p-alignment-across-corpus (j-0531) - and the branch went on to land
      blocked by claude/m-counting-graphic-airs-zero - held until one lands or is queued
- 10:39  claude/j-fields-step-per-field (j-0536) - and the branch went on to land
      blocked by claude/t-shard-cap-poisons-every-gate - held until one lands or is queued
- 10:39  claude/p-alignment-across-corpus (j-0537) - and the branch went on to land
      blocked by claude/t-shard-cap-poisons-every-gate - held until one lands or is queued

## What the queue repaired by itself (1)
- 15:45  claude/f-contracts-point: j-0552 retried j-0533 (reached no verdict) - and it landed

## Cancelled (2)
Somebody withdrew these. They are here so a missing job is never a mystery.
- 15:46  j-0551 (claude/landing-path-honest-b154a2)  node -e "process.stdout.write('runner-start-probe ok')"
- 19:26  j-0561 (HEAD)  node -e "console.log('queue smoke ok')"

## Needs a person (0)
Nothing. Everything that refused was either recovered or is the queue's to retry.
```

Row A's, D's and E's landings are all there, and so is the cancelled `j-0561` the row's prompt
named. **The night needs nobody**, which is the answer the owner did not have this morning.

### What running it against real records changed about it

Three of the distinctions it makes were wrong on the first pass and were caught by measurement, not
by reasoning:

- **A job's STATE is the verdict; its exit code is not.** `endedWithoutExitCode` writes a landing
  that pushed to main and was then killed as `{ state: 'done', exitCode: null, landedBeforeItEnded:
  true }`, asking git before it records, precisely so a success is never read back as a failure.
  Selecting refusals with `exitCode !== 0` threw that away. On tonight's own data it put
  `claude/f-contracts-point` - already on main, its handoff landed - under "needs a person", and the
  same filter counted a cancelled job as a refusal. This was the review's high finding.
- **A capped landing was listed twice**, as a refusal and again as its own case, with two lines of
  contradictory advice about one branch.
- **A gate killed at its cap was reported as nothing at all**, because only a reaper kill writes
  `failed`; a cap writes `timed-out`.

And one the printing forced: a refusal that is already answered says so and offers **no** command.
Printing a re-queue beside a branch that went on to land is how a morning list gets somebody to mint
a second landing for work already on main.

## 3. Two findings filed, and the prompt was wrong about one of them

- `docs/backlog/stop-hook-detects-waits-by-word-list.md` - records the fix above and argues the
  three ways out of the remaining shape, cheapest first. The first is *measure the miss rate before
  designing anything*: the hook already sees every turn end and could record the misses itself.
- `docs/backlog/owner-receipts-do-not-advance-when-their-work-lands.md`.

**The second one is not what the prompt said it was, and I checked before filing.** The prompt named
three receipts that "read unstarted right now with their work on main". Only one of them does:

| receipt | verdict |
|---|---|
| `password-reset-link-lands-nowhere` | **confirmed stale.** All three commits are on main (`bbac256b`, `570d7762`, `72a92321`) and `docs/acceptance/owner-queue/2026-09-04-password-reset-has-a-route.md` is filed. `docs/backlog/README.md` says the file is deleted in the change that lands the work; it was not, and a later commit edited it without touching `state:`. |
| `cloud-sessions-for-stateless-rows` | **correctly unstarted.** Row E left it there deliberately and its handoff says why: real work landed against it (`09091ee3`), but the ask has not started and `--check` refuses `active` without a `branch:` that outlives the session. |
| `catalog-growth-must-not-cost-iteration-speed` | **correctly unstarted.** It asks for three measurements nobody has made. Row E moved the catalog battery to GitHub's runners, which is adjacent and not the same thing. |

So the finding is narrower in one direction and wider in another. The miss is real and it is one
file. The more interesting half is that **the state vocabulary has no value for the state two of
these are actually in** - work landed against it, the ask still stands, no branch owns it - so
`unstarted` carries untouched, answered and finished items alike, and that is the number the plan
check makes the planner read. The file proposes one word (`answered`) and a mechanism at the moment
(`/queue-merge` asking which receipt a branch serves), and points at the owner's own receipt
`receipts-confuse-an-ask-with-a-finding`, which is one edit to `STATES` away from the same place.

**Neither new file carries receipt front matter**, and that is not an oversight. `source: owner`
would be false for both - they are findings, not asks - and putting a false receipt on the file
whose subject is the receipt count would corrupt exactly the number it is about. `npm run build`
passes `owner-receipts --check` with both in place: 43 receipts, 36 unstarted, unchanged.

## The check chain

- `review: delegated` - the code-review skill at level `high` returned its findings into this
  conversation and they passed the scope check (right branch, right merge-base `3fd40d15`, right
  eight files). **Seven findings, seven fixed**, each verified against the surrounding code before
  acting. It also fired the stop hook on itself mid-review, which became the seventh.
- `simplify: inline` - the skill returned fan-out instructions rather than a result, so per
  `.agent-workflows/check.md` the leg did not run as delegated and was done here over the four
  angles. Three changes: an unreachable `enqueuedAt` fallback removed (`finishedSince` has already
  guaranteed `finishedAt`), the `--write` path simplified so the file is always the human report
  whatever stdout was asked for, and the refusal listing given one exit rather than two branches
  saying different things.
  **Skipped with a reason:** `logCommand` and `requeueCommand` in `scripts/jobs-store.mjs:971-973`
  are module-private, so the two command strings are duplicated in the report. Exporting them is
  correct and I did not do it - `jobs-store.mjs` is the most contended file on the machine tonight
  (rows A and D both landed into it), and a conflict there during a serialised landing costs more
  than the duplication. Worth doing on a quiet branch.
- `verify: inline` - `npm run build` green (branch stamp
  `dist/version.json -> claude/f-night-report-and-stop-hook@613990d927`, so it gated this branch and
  not main), and `node --test scripts/night-report.test.mjs scripts/stop-wait.test.mjs`, 26 pass.
  No product code changed, so no e2e run is owed.
- `taste: not applicable` - nothing here can move what a graphic looks like.
- Verdict stamp: `<git-common-dir>/noacg-jobs/checks/claude-f-night-report-and-stop-hook.json`,
  `reviewedSha` `ccd2a349`.

## What is left

- **The schedule row is ahead of the machine.** `docs/ROUTINES.md` names
  `nightly-queue-night-report`, daily, just before the morning CI verdict, and says out loud that
  the task file under `~/.claude/scheduled-tasks/` does not exist yet - that path is outside the
  repository, so no branch can land it. Creating it is a standing configuration change on the
  owner's machine and belongs to a session he opens. Until then `npm run night:report` on demand
  gives the same answer, and the doc says so rather than describing a routine that does not run.
- **Raw pasted output still trips the stop hook.** Only fenced, inline-code and blockquote spans are
  stripped. A session that pastes a bare night report into its wrap-up gets one extra turn, not a
  lost night. Recorded in the backlog file.
- **`refusalGuidance` has nothing to say about a landing that reached no verdict**, because it is
  keyed on a refusal kind and a capped landing never printed one. The report supplies the re-queue
  command itself, which is the right depth for a report but leaves the sentence in two places.

## Pointers

- `3bcfccf4` the stop hook · `7d1212c2` the night report · `613990d9` the two backlog items ·
  `ccd2a349` the review and simplify fixes.
- `scripts/night-report.mjs` header carries why the report exists and why it classifies nothing.
- `scripts/stop-wait.mjs` - `THE_WORK` / `THE_OBSERVER` / `NOT_A_PERSON` and why the split.
- CI, read to a verdict on both runs rather than on the newest one:
  - **33912703172** on `613990d9` - green, with all nine E2E shards reporting `(subset)`. This is
    the run that gates the code.
  - **33914804443** on the tip `ccd2a349` - green, and it planned **`mode: none`**: Build, E2E plan,
    Factory gates and CI gate ran, every shard was skipped. That is the legitimate version of the
    case row A split - the nearest shard-running green run is its own ancestor and the delta since
    it is scripts and tests only, which no E2E spec covers.
  - **Not dispatched by hand, on purpose.** `ci.yml` has one concurrency group per ref with
    `cancel-in-progress`, so pushing and dispatching in one breath cancels one of the two and which
    one is not stable (row A measured it both ways within twenty minutes). `classifyEmptyPlan`
    accounts for this shape, and if it refuses instead, the kind is `shards-skipped` and the queue
    hands the landing one full run and re-queues it - the recovery row A landed tonight. Either way
    it is the queue's move, not this session's.
