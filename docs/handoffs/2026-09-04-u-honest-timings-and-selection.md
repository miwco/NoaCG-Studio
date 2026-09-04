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
`node_modules` and `player-host/node_modules`, and every `npm ci` in ci.yml goes through it. On a
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

**2. The model carries the term it was missing.** `scripts/e2e-durations.json` gains an `overhead`
block, recorded from the same run as the per-spec minutes:

    "overhead": { "jobMinutes": 6.6, "medianJobMinutes": 2.87, "testFactor": 1.02, "samples": 9 }

`jobMinutes` is the p90 of job wall clock minus the `E2E shard` step - at the p90 because a cap kills
the WORST shard and the mean is not what has to fit. `medianJobMinutes` rides along so the two can be
compared: a wide gap is the signature of exactly the install lottery above, and `check:e2e-durations`
now says so in words when it exceeds two minutes. `testFactor` is the shard steps over the table's
own total, floored at 1 because CI runs `workers: 1`.

The model is `wall clock = tests x testFactor + jobMinutes`. Against run 33854844447 it predicts
**16.6 min** per shard where the actual mean was **17.19** - a 3.4% error on the mean. It does not
predict the 10.6-to-20.3 spread, and it should not: that spread is the coin flip change 1 removes.

**3. A plan that cannot fit says so before it starts.** `budgetMinutes` turns the overhead into how
many table-minutes a shard can carry and still clear the cap with the variance margin intact;
`shardsFor` sizes against that as well as against the throughput target; `emitJson` publishes
`predicted` (per shard) and `overCap`, and the plan job raises a `::warning` naming the predicted
minutes. On today's recorded overhead a full plan predicts 17.9 min a shard and the warning fires -
correctly, because that is the world before change 1. It goes quiet when the table is re-recorded
from a run that has the cache.

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
`check:e2e-durations: green` · node tests: 40 in `e2e-affected.test.mjs`, 16 in
`e2e-durations.test.mjs`, 80 across the three selection suites, plus the whole `node --test` block
inside `npm run build`.

`check: review: <mode> · simplify: <mode> · verify: build green, node tests, check:workflows ·
taste: not applicable - nothing here can move what a graphic looks like.`

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
- **Re-record the table once main has a green full run under the cache**:
  `npm run record:e2e-durations`. Until then `overhead.jobMinutes` is 6.6 and the plan job will warn
  that a full plan sits close to the cap. That warning is correct about the world it measured and
  wrong about the world after this lands, and re-recording is what closes the gap.
- **Nobody re-records tables by hand for long.** The last one sat 15 days stale while the suite grew
  49%. Filed as `docs/backlog/the-durations-table-is-refreshed-by-hand.md`.
- **Issue #53 ("CI is red on main") is open** and was filed by runs that ran out of clock rather than
  found a fault. If the cache does what the measurement says, it should be closable on evidence.
- The other five workflows still call `npm ci` directly (`nightly.yml` four times,
  `configured-suite.yml`, `hosted-latency.yml`, `weekly-audit.yml`). None of them is cap-bound the
  way a landing gate is, so they were left alone; the action is generic and they can adopt it.
