# T - a cancelled shard is not a verdict, and the shard split was uneven

Branch `claude/t-shard-cap-poisons-every-gate`, off `09be5a75`.

## What the measurement said, before anything was changed

The row's premise held, and one of its guesses did not. Over the **30 `ci.yml` runs on `main` from
2026-09-02 23:06 to 2026-09-04 02:23**:

| | count |
|---|---|
| settled (all `success`) | 26 |
| cancelled | 4 |
| ...of those, a shard killed at the 20-minute cap | **4** |
| ...of those, superseded by concurrency | **0** |

Zero, and necessarily so: `main` sets `cancel-in-progress: false`, so a cancelled run on that
branch can only ever mean a job ran out of clock. The two causes the row asked me to separate are
not both present here - there is one cause.

Per-shard mean wall clock on the 26 green runs, under Playwright's count-based `--shard=i/n`:

| shard | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| mean min | 8.8 | **14.6** | 10.1 | 12.5 | 11.0 | 11.1 | 13.0 | 12.3 | 12.4 |
| worst green | 11.1 | **17.4** | 16.5 | 15.9 | 13.2 | 14.8 | 15.5 | 13.0 | 13.3 |
| runs at the cap | 0 | 3 | 0 | **4** | 0 | 2 | 3 | 3 | 2 |

A 1.66x spread with nothing wrong. Shard 2 sat at 14.6 minutes against a 20-minute cap - 87% of it
on its worst green run - while shard 1 idled at 8.8. Runner variance on top of that is what tipped
four runs over.

**Capacity was never the problem, and the orchestrator was right to make me prove it.** My prompt
said the suite had outgrown its shard budget; it has not. Nine runners at a 20-minute cap is a
180-minute budget and the suite measures **99.7 minutes** - 55% of it, 11.1 minutes a shard if
split evenly. There is no shard shortage, `MAX_SHARDS` stays at 9, and adding runners would have
spent money to hide the real fault. What did not fit was the WORST shard, and only because the
split was lopsided. I have corrected that framing everywhere it appeared.

**Two things had drifted underneath, and neither was visible.** The suite grew from 66.9 measured
minutes (2026-08-20) to 99.7 (today), 49% in two weeks, while `scripts/e2e-durations.json` still
described the old one - 16 of 147 spec files had no entry at all. `check:e2e-durations` reported
that correctly every week inside `check:freshness`, which is a REPORT and not a gate. And
`shardsFor` is capped at 9, so the growth changed no arithmetic anywhere: the plan asked for the
same nine runners and each simply got more work.

**So the stale table did not cause these cancellations** - nothing consumed per-file durations for
assignment while Playwright was splitting by test count. It would have caused them from now on,
which is exactly why the table was re-recorded before the packer was allowed to read it. The two
heaviest files in the repo were among the sixteen missing: `counting-settle.spec.ts` at **4.96 min**
(rank 1 of 147) and `import-svg-corpus.spec.ts` at **3.36** (rank 4), both of which would have been
packed at the 0.51-minute median. A bin holding both would have run about seven minutes over its
planned eleven. The other fourteen are small - 14.2 real minutes against 8.2 median-estimated
across all sixteen - so the aggregate error was modest and the per-file error was not.

## One more thing the measurement turned up, which the row did not predict

The row said `main-health.mjs` walked back through cancelled runs until it reached
2026-08-05. It does have that bug, and the fix is below - but the run list itself was also wrong.
My **first** `gh run list --workflow ci.yml --branch main --limit 30` of the session returned 30
runs whose newest was `30964711888` from **2026-08-05**, the exact run the earlier session quoted.
Every call after that returned today's runs. Same command, same flags, same machine. There is one
`ci.yml` workflow in the repo (checked - not a stale workflow id), so this was a stale read served
by the GitHub API.

I could not reproduce it a second time and have not tried to fix it. It matters because it means
main-health can be handed a wholly stale window with nothing wrong locally, which is an argument
for the staleness floor below being a floor on the ANSWER rather than a fix to the walk.

## What changed

**The root cause - a split that wasted the headroom the budget already had.** `packShards`
(`scripts/e2e-affected.mjs`) bin-packs
spec files by measured duration, longest-processing-time-first, and the plan job now hands each
runner an explicit file list instead of `--shard=i/n`. The nine bins come out at **11.05-11.11 min
against a balanced 11.08 - a 1.005 spread**, turning shard 2's 2.6 minutes of headroom into about
eight. `timeout-minutes` stays at 20: a loose budget stops the timeout distinguishing a hung shard
from a busy one, which is the whole reason it exists.

`ci.yml`'s own comment had argued for this for three weeks and refused it over one objection -
*an explicit per-shard file list means a spec missing from the durations table is a spec nobody
runs*. That objection is answered rather than ignored, three ways:

- the packer enumerates the suite from the **e2e directory** (`specFilesOnDisk`), never from the
  table's keys; the table supplies weights only, and an unmeasured spec is packed at the median;
- it **asserts** that the union of its bins is exactly its input, and throws in the plan job if not;
- I re-recorded the table first, so the weights are real: 147 specs, 99.7 min, from run
  `33825716179`.

**An unmeasured spec is now LOUD rather than quietly median-estimated** - the orchestrator's ask,
and the right one now that these weights buy balance instead of only a runner count. The plan names
every spec it had to guess at, on stderr locally and as a `::warning` annotation in CI, where it
sits in the same log somebody opens when a shard is slow. Verified by removing two entries and
watching it fire.

**A hazard that only appears once you hand out per-shard lists**, and which I nearly shipped:
Playwright's positional arguments are **regexes over the whole file path**, not file names. Five
spec files in `e2e/` are substrings of others (`control`, `format`, `import`, `project` and their
longer partners), so a bare `control.spec.ts` also selects `ai-more-control.spec.ts` and
`hosted-control.spec.ts` - verified against `playwright test --list`. Under `--shard=i/n` that cost
nothing, because the filter was the whole plan and Playwright divided the union. Under an explicit
assignment it would have run five files twice and unbalanced the bins that held them.
`specFilterArg` anchors each filter as `[\\/]<escaped>$`, and a test asserts across the real suite
that no two spec files share a filter.

**Proven end to end, not just in unit tests.** I asked Playwright itself what each of the nine
packed shards would run: **147 files, 1221 tests, every one exactly once, no duplicates and no
gaps** - matching `playwright test --list` over the unfiltered suite.

**The two judges, reconciled.** `main-health.mjs` gains a third answer. Skipping cancelled runs is
right and stays; what was wrong is that skipping had no floor, so it could quote a month-old run as
the present tense with nothing in the sentence saying so. `green` now means *a recent verdict says
success*; a verdict older than `STALE_AFTER_HOURS` (12) or buried under `STALE_AFTER_SKIPPED` (5)
unjudged runs reports **`stale`** instead. Stale **proceeds**, like `unknown` - the file's own rule
that this gate must never mysteriously stop the queue is untouched - but it says what it does not
know. A **red verdict is never staled**: an unattended red main is exactly where cancels pile up,
and letting age downgrade it would make the alarm quietest when the problem is worst. Both numbers
now ride along in every message, greens included, so drift is visible before it crosses a
threshold. Live today it reads:

    main is green (run 33825716179, 4 h ago, 2 newer runs unjudged).

**The alarm stops inventing faults.** `failureSet` now distinguishes **exhausted** (nothing
reported a fault, and at least one job never finished) from **unknown** (something failed and could
not be identified). Both leave the item set empty, which is how they became the same answer. The
`CI gate` job says "ran out of time rather than finding a fault" as a warning, still **exits
non-zero** - no verdict is not a pass, and exiting 0 would close the red-main issue and paint the
commit green on tests that never finished - and `planRedMainComment` refuses to file, checked
before every other rule including the create branch.

**The script is deliberately the ONLY thing that makes that call.** My first attempt also gated the
alarm step on a workflow condition, as belt and braces; the review showed the belt could strangle
the braces. A workflow condition can only test `needs.e2e.result`, which collapses nine matrix legs
into one word, so a run with one shard failing a spec and another killed at the cap would have been
skipped as "exhausted" and a real regression would have gone unreported - defeating the very
per-job check (`anyFailed`) this branch added for that case. The condition is gone; the step runs
on any failure on `main` and `planRedMainComment` reads the per-job conclusions.

## What the review caught, and what it cost

Six findings, all confirmed against the surrounding code before acting. Two were serious enough
that shipping without them would have traded one broken instrument for another:

- **The combined E2E report would have shown one shard's tests.** Dropping `--shard=i/n` also drops
  Playwright's per-shard blob naming: every runner writes `blob-report/report.zip`, and the report
  job downloads all nine artifacts with `merge-multiple: true`, which flattens them into one
  directory. Eight would have silently overwritten the ninth. The repo's own
  `e2e-durations.mjs` guards against exactly this collision when it flattens artifacts by hand,
  which is what confirmed it. Fixed with an explicit per-shard `fileName` (`NOACG_BLOB_NAME`);
  `nightly.yml` still shards and is untouched.
- **The alarm suppression described above.**
- `main-health`'s `skipped` counter was including runs still queued or in flight, which on `main`
  (`cancel-in-progress: false`) means a queue drain could report "no recent verdict" about a green
  from ten minutes ago. Now counts only runs that FINISHED without one.
- Three doc/comment passages still claimed the durations table "only decides how many runners
  `--shard` spreads the plan across", which stopped being true in this commit, and quoted the
  pre-refresh 70.5 min / 131 spec figures. Corrected in `docs/VERIFICATION.md`,
  `scripts/e2e-durations.mjs` and `scripts/e2e-affected.mjs`.
- Anchoring the filters removes accidental over-coverage: a subset plan naming `control.spec.ts`
  used to also run `ai-more-control.spec.ts` and `hosted-control.spec.ts`. **Checked - all five
  partners are named by MAP or FOCUS in their own right**, so nothing loses its only route into a
  subset plan.
- The coverage assertion checked the bins against its own input but never that the input files
  exist. A ghost spec name left by a rename used to be silently harmless and would now land alone
  in a bin and red that shard with "no tests found". The plan now refuses, naming the ghosts. There
  are none today - I checked all 133 spec names referenced in `e2e-affected.mjs` against the
  directory.

**Issue #52 is closed** with the evidence: the four cancelled shards per run, their durations, and
why the gate misread them. Nothing had failed in either run it named.

## Verification

`build: green`, stamped `claude/t-shard-cap-poisons-every-gate@ba427e5700` so it gated this branch
and not `main` · `check:workflows: green (10 validated)` · 95 node tests across the five touched
suites, plus the whole `node --test` block inside `npm run build`.

`check: review: delegated (6 findings, all confirmed, all acted on) · simplify: inline (the skill
returned fan-out instructions) · verify: build green, 95 node tests, check:workflows, coverage
proof re-run on the final state · taste: not applicable - nothing here can move what a graphic
looks like.`

Three things proven by running them rather than by reading them:

- **Coverage.** Playwright itself, asked what each of the nine packed shards would run: 147 files,
  1221 tests, every one exactly once.
- **The shard step's selection**, reproduced outside CI for all nine indices (15-17 filters each),
  including that an empty assignment exits 1 rather than running the whole suite.
- **The unquoted filters survive bash.** Every one opens with `[\\/]`, a glob bracket; expanded the
  way ci.yml expands them, they come through byte-identical, because bash leaves a non-matching
  pattern alone. Noted in ci.yml, with the warning not to set `failglob` or `nullglob` there.

**E2E was NOT run locally.** No `src/` file changed, so nothing here can reach the product surface;
the planner still escalates to the full suite because `scripts/e2e-affected.mjs` is unmapped, and a
local full run is the one thing the repo's own rule tells you not to do before landing
(`docs/VERIFICATION.md`, "the pre-merge gate belongs to CI, not the laptop"). CI is also the only
place that can verify the real thing.

**No CI run has yet executed a bin-packed shard** - this branch's own will be the first. If the
assignment is wrong, the landing gate fails and the branch does not land, which is the correct way
for it to be wrong.

## What I would watch next

- **The first bin-packed run.** Expect nine shards at roughly 12 minutes each and none near 20. If
  a shard is much slower than its bin's weight predicts, the durations table has drifted again.
- **`check:e2e-durations` is still only a weekly report**, and it was correct and ignored for 15
  days while the suite grew 49%. Bin-packing now makes a stale table cost balance rather than only
  wall clock, so this is a stronger candidate for a gate than it was - but a build gate lands
  alone, so it is filed rather than done here.
- **The stale API read** described above. One occurrence, not reproduced. If a session is ever told
  main is green quoting a run more than a day old, that is this, and `stale` will now say so.
