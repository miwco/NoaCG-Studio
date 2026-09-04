# U - the durations table was right, and the model around it had no term for the install

Branch `claude/u-honest-timings-and-selection`, off `origin/main` at `a3b7c3c1`.

## What the measurement said, and why the row's hypothesis was wrong

The row was sent with a strong premise: a subset plan whose nine shards summed to ~155 minutes,
against a table that measured the whole suite at 99.7, meant **the table under-predicts real runner
time by a large factor**. It does not. The table is accurate; nothing was reading it against the
right question.

Run `33854844447` (`claude/j-fields-step-per-field`, 08:43), the first landing under T's packer, per
shard - the table's prediction for the files that shard was assigned, against what GitHub recorded:

| shard | files | table minutes | **job wall clock** | of which: test step | of which: setup | step / table |
|---|---|---|---|---|---|---|
| 1 | 14 | 9.82 | 16.25 | 10.87 | 5.38 | 1.11 |
| 2 | 12 | 9.81 | 14.02 | 11.15 | 2.87 | 1.14 |
| 3 | 14 | 9.80 | 16.18 | 12.25 | 3.93 | 1.25 |
| 4 | 13 | 9.79 | 19.87 | 9.53 | 10.33 | 0.97 |
| 5 | 11 | 9.76 | **20.30 killed** | 9.95 | 10.35 | 1.02 |
| 6 | 13 | 9.75 | 18.93 | 8.63 | 10.30 | 0.89 |
| 7 | 13 | 9.75 | 18.30 | 7.88 | 10.42 | 0.81 |
| 8 | 14 | 9.74 | **20.27 killed** | 10.02 | 10.25 | 1.03 |
| 9 | 12 | 9.74 | 10.58 | 10.15 | 0.43 | 1.04 |
| | | **88.0** | 154.7 | **90.4** | 64.3 | **1.03** |

Read the third and fifth columns together. **The table predicted the test execution to 2.7% in
aggregate** - 88.0 against 90.4 - and the row's 55% gap is entirely the sixth column, which no
number anywhere held. The two shards that died were not overloaded: each was carrying 9.8 measured
minutes of the 11 the packer planned for, behind ten minutes of setup.

**The setup is `npm ci`, and it is a lottery rather than a workload.** Over the 90 E2E shard jobs of
the ten ci.yml runs from 01:25 to 08:43 it averaged **6.36 min**, median 6.08, p90 10.07, max 10.18;
76% of jobs spent more than five minutes on it. Inside run 33854844447, with the same lockfile and
the same restored `~/.npm` cache, shard 9 installed 304 packages in **8 seconds** and shard 8 took
**10 minutes** for the same 304. It is paid twice per job: the root `postinstall` builds
`player-host/`, whose own `npm ci` runs on a fresh runner too, and five of those nine shards paid
about five minutes for each half. The npm log even names it - the fast runners print "added 304
packages, and audited 305 packages in 8s", the slow ones a bare "added 304 packages in 10m".

The distribution was also getting worse through the day (per-run npm ci minutes across nine shards):

    01:25  0.5 0.6 1.7 2.2 2.7 2.8 3.1 4.2 6.4
    07:50  5.0 5.1 7.9 7.9 10.0 10.0 10.1 10.1 10.2
    08:43  0.1 2.5 3.7 5.2 10.1 10.1 10.1 10.1 10.2

So T's diagnosis and mine agree on the shape and differ on the cause: the split WAS lopsided and
packing it fixed that, and packing nine equal bins at 11.1 table-minutes each is only comfortable
against a 20-minute cap if the other nine minutes are free. They were not.

## What changed

**1. The waste is gone, rather than compensated for.** `.github/actions/node-modules` caches
`node_modules` and `player-host/node_modules`, and every `npm ci` in ci.yml and nightly.yml goes
through it. On a
hit npm is not invoked at all, so the registry is out of a capped job's critical path; on a miss it
runs `npm ci --prefer-offline --no-audit --no-fund`, none of which changes what is installed.

Two details are load-bearing. The key hashes **`package.json` as well as the lockfile**, root and
player-host, because `npm ci` does one thing besides installing - it refuses when the two disagree -
and keying on the lockfile alone would let a package.json edited without re-locking hit a cache
entry and skip that check. And a cache hit runs `npm run postinstall` explicitly, because a restored
tree never ran npm's own: the per-checkout dev port, the generated video font module and
`public/player-host/` all come from there, and `public/player-host/` is what the video specs load.

`MAX_SHARDS` stays at 9 and `timeout-minutes` stays at 20. Neither was touched, and the owner's
refusal of "add runners to compensate for waste" is why: nine runners spending 57 minutes of
combined wall clock installing the same 304 packages was the waste.

**2. The model carries the term it was missing.** `scripts/e2e-durations.json` can now carry an
`overhead` block recorded from the same run as the per-spec minutes. Recorded from run 33825716179
it reads:

    "overhead": { "jobMinutes": 6.6, "medianJobMinutes": 2.87, "testFactor": 1.02, "samples": 9 }

`jobMinutes` is the p90 of job wall clock minus the `E2E shard` step - at the p90 because a cap kills
the WORST shard and the mean is not what has to fit. `medianJobMinutes` rides along so the two can be
compared: a wide gap is the signature of exactly the install lottery above, and `check:e2e-durations`
now says so in words when it exceeds two minutes. `testFactor` is the shard steps over the table's
own total, floored at 1 because CI runs `workers: 1`.

The model is `wall clock = tests x testFactor + jobMinutes`. Against run 33854844447 it predicts
**16.6 min** per shard where the actual mean was **17.19** - a 3.4% error on the mean. It does not
predict the 10.6-to-20.3 spread, and it should not: that spread is the coin flip change 1 removes.

**That block is deliberately NOT committed, and the review is why.** With 6.6 in it, a nine-bin full
plan predicts 17.9 minutes against a 17-minute line, so the very first act of a brand-new instrument
would be a warning on every full run - and one that stops being true the moment the cache starts
hitting, since 6.6 was measured on runs that paid the install this same commit removes. A permanent
false alarm is how a warning gets trained out of people. Shipping the pre-cache number to avoid an
empty field would have been precision about a configuration that no longer exists. So
`DEFAULT_OVERHEAD` (1 minute a job, factor 1.05, built from the cache-hit step costs and the sibling
browser cache's measured 2.9 s restore of 261 MB) stands in, `check:e2e-durations` says **"DEFAULTS -
never recorded"** in those words, and the first honest reading comes from a green full run with the
cache. Today the full plan predicts **12.6-12.7 min** a shard and raises nothing.

**3. A plan that cannot fit says so before it starts.** `budgetMinutes` turns the overhead into how
many table-minutes a shard can carry and still clear the cap with the variance margin intact;
`shardsFor` sizes against that as well as against the throughput target; `emitJson` publishes
`predicted` (per shard) and `overCap`, and the plan job raises a `::warning` naming the predicted
minutes. Fed the pre-cache measurement it would have said 17.9 min a shard against a 17-minute line
and fired on every full run, which is the reason that measurement is not committed; on the shipped
defaults it says 12.6 and stays quiet.

**4. Two selection narrowings, both measured.** `.claude/`, `.codex/`, `.agents/` and
`.agent-workflows/` join `.github/` in the ignore list - the agent harness, five tracked non-markdown
files across all four, none of which a Playwright spec can observe. And `scripts/*.test.mjs`, which
was being pulled back out of the wholesale `scripts/` ignore by a name match and escalating, because
a test cannot change the thing it tests and each of these is named in `npm run build`'s `node --test`
block.

## The selection contract, and what auditing it actually found

Written up in full as **`docs/TEST_SELECTION.md`** - what runs for a change to each kind of file,
with the confidence argument per rule, and the rules for editing the map.

Replayed over the **119 first-parent commits on `main`** to 2026-09-04, before and after:

| | before | after |
|---|---|---|
| plans that run nothing | 68 | 72 |
| plans that run a subset | 51 | 47 |
| plans that run everything | 0 | 0 |
| p75 planned minutes | 36.9 | **12.5** |
| p90 planned minutes | 45.6 | 45.6 |
| plans covering >80% of the suite | 3 (3%) | 3 (3%) |
| landings escalating through core/unmapped | 25 | **21** |

**The honest finding is that "run everything just in case" is already not the default here**, and I
should say so plainly rather than manufacture a bigger win. Not one of 119 landings ran the whole
suite, 57% ran nothing at all, and 97% ran under 80% of it. `scripts/e2e-affected.mjs` is curated
rule by rule with an incident receipt on most of them, and the audit found no lazy trigger hiding
behind a wide one - it found four small ones, which are the narrowings above. The p75 halving is
those leaving; the p90 is unchanged, which is the truthful reading: the wide plans are wide for
reasons that survive scrutiny, and narrowing them further is per-rule design work on
`src/templates/` and `src/components/wizard/`, not a policy change.

Two judgements the row asked for by name:

- **The integration base is the one substantial narrowing available, and I did not take it.** A
  landing is planned from the fork point, so its plan is the union of both sides - on J, 116 specs /
  88.0 min against 71 / 65.2 for the branch's own seven files. There is a real argument for the
  narrow base (`main` runs the full suite on every push, so its side already has a green verdict,
  and `main-health.mjs` can say whether that verdict is recent). It overturns a root `AGENTS.md`
  rule backed by a 120-merge replay, and its safety rests entirely on the branch's own map having no
  holes - which is what the union is a belt against. Filed with the argument and the measurement as
  `docs/backlog/integration-plans-run-both-sides-of-a-merge.md`.
- **The configured tier stays out of the per-change plan, and the row's premise about it is stale.**
  `e2e/configured/**` needs a Supabase stack no ci.yml job has, and it is not unowned:
  `configured-suite.yml` runs it nightly at 01:10 against a local stack, with its own rolling issue
  and guards against the silent-green failure mode. It failed on 2026-09-03 and was **green again on
  2026-09-04 05:46** (run 33841739638). Covered in `docs/TEST_SELECTION.md`.

## Verification

`build: green` · `check:workflows: green (11 validated, including the new action)` ·
`check:e2e-durations: green` · node tests: 40 in `e2e-affected.test.mjs`, 17 in
`e2e-durations.test.mjs`, plus the whole `node --test` block inside `npm run build`.

`check: review: delegated (5 findings, all confirmed, all acted on) · simplify: inline (the skill
returned fan-out instructions) · verify: build green, 57 node tests across the two touched suites,
check:workflows, the planner re-run on the final state · taste: not applicable - nothing here can
move what a graphic looks like.`

**What the review caught**, all five confirmed against the surrounding code before acting:

- **The recorded overhead would have made the new warning fire falsely, for ever.** The finding
  above, and the most valuable one: it turned a number that looked rigorous into a permanent alarm.
- **`planMinutes` counted the TABLE for a full plan, not the suite on disk.** So a spec on disk the
  table had never measured contributed zero to the runner count while contributing the median to
  the packing and the prediction beside it - the sizing under-asking for runners in exactly the
  stale-table case the cap term exists to catch. It now sums the same file list the packer uses,
  with the median fallback, and the tests pin both the unmeasured-spec and deleted-entry directions.
- **`nightly.yml` still paid the install lottery**, on a tighter margin than ci.yml: 8 shards at a
  25-minute cap, 12.5 measured minutes plus a 10.1 p90 install is 22.6. The nightly is the run that
  covers what the per-change gate deliberately skips, so a cancellation there is expensive. Its four
  jobs now use the same action.
- **`gh api --paginate` on an object endpoint** would have thrown at 31 jobs, been swallowed by the
  catch, and frozen the overhead at whatever was last recorded with only a log line saying so. Now
  one page of 100, which is the whole answer for a ~16-job run.
- **`SHARD_CAP_MINUTES` duplicated ci.yml's `timeout-minutes` with only a comment holding them
  together.** A test now reads the E2E job's own block out of ci.yml and asserts the two agree.

The simplify pass, done inline, folded the three copies of "what is this spec worth" (sizing,
packing, prediction) into one `weigher(table)`, moved the `testFactor` floor into `readTable` where
the repo normalizes every other format, and corrected the stale "103 files" in the sprint-focus
message to the real suite size.

New tests pin the arithmetic that decides whether a plan is planned to fail: the p90/median split,
the test factor's floor, that a non-shard job contributes nothing, that the budget shrinks as the
overhead grows and never reaches zero, that the prediction is the budget read backwards, that the
shard count answers the cap as well as the throughput target, and both narrowings (including that
`scripts/e2e-affected.mjs` itself still escalates, because a mistake there is the one mistake that
reports `mode: none` and goes green having run nothing).

**E2E was not run locally.** No `src/` file changed. The one thing that matters here can only be
verified on a runner, and this branch's own CI run is the first to use the cache.

## What I would watch next

- **The first run under the cache.** Expect `Install dependencies` to drop from minutes to seconds
  on a hit, and every shard to land near 12 minutes. If it does not, the cache is missing - the
  step's own log says which.
- **Record the overhead once main has a green full run under the cache**:
  `npm run record:e2e-durations`. Until then the model runs on `DEFAULT_OVERHEAD` and
  `check:e2e-durations` says so. That is the one open loop this branch leaves, and it is the
  difference between a model that is measured and one that is merely plausible.
- **Nobody re-records tables by hand for long.** The last one sat 15 days stale while the suite grew
  49%. Filed as `docs/backlog/the-durations-table-is-refreshed-by-hand.md`.
- **Issue #53 ("CI is red on main") is open** and was filed by runs that ran out of clock rather than
  found a fault. If the cache does what the measurement says, it should be closable on evidence.
- Three workflows still call `npm ci` directly: `configured-suite.yml`, `hosted-latency.yml` and
  `weekly-audit.yml`. None is cap-bound the way a gate is, and `weekly-audit.yml` deliberately wants
  a real registry conversation, so they were left alone; the action is generic and they can adopt
  it.
