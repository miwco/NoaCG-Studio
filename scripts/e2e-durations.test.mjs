// The duration table decides how many runners a CI plan asks for, and it is refreshed from a
// real run's shard reports (`npm run record:e2e-durations`). Recording is where it can go
// silently wrong: a run that measured only an AFFECTED SUBSET has timings for a fraction of the
// suite, and writing those wipes every spec it never ran. Each wiped spec then counts as the
// median - the table reads full and healthy while being wrong about most of it.
//
// Nothing downstream can catch that. The table is deliberately not a gate (a stale entry costs
// wall clock, never coverage), so a corrupt recording produces no red anywhere - just slower
// runs, blamed on the runners. The refusal is the only thing standing between a mistyped run id
// and that outcome, which is why it is a pure function over the job list and pinned here.
//
// `fullRunRefusal` reads the names CI gives its shard jobs (`E2E 3/9 (full)`), because they carry
// both facts a recording needs: that every shard ran the FULL plan, and that none is missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  budgetMinutes,
  drift,
  fullRunRefusal,
  minutesByFile,
  overheadFrom,
  predictShardMinutes,
  SHARD_CAP_MINUTES,
  SHARD_SAFETY_MINUTES,
} from './e2e-durations.mjs';

/** The shard jobs of a healthy full run, as `gh run view --json jobs` reports them. */
function fullShards(count = 9, overrides = {}) {
  return Array.from({ length: count }, (_, i) => ({
    name: `E2E ${i + 1}/${count} (full)`,
    conclusion: 'success',
    ...(overrides[i + 1] ?? {}),
  }));
}

/** The non-shard jobs every run also has - none of which says anything about coverage. */
const OTHER_JOBS = [
  { name: 'Build', conclusion: 'success' },
  { name: 'E2E plan', conclusion: 'success' },
  { name: 'Catalog calibration gate', conclusion: 'success' },
  { name: 'CI gate', conclusion: 'success' },
];

test('a green full run is accepted', () => {
  assert.equal(fullRunRefusal([...OTHER_JOBS, ...fullShards()]), null);
});

test('the surrounding jobs are not mistaken for shards', () => {
  // "E2E plan" starts with the same two characters as a shard job and must not parse as one -
  // if it did, a run would look like it had an extra, unnumbered shard.
  assert.equal(fullRunRefusal([...OTHER_JOBS, ...fullShards(4)]), null);
  assert.match(fullRunRefusal(OTHER_JOBS), /ran no E2E shards/);
  // A shard name CI does not currently produce must refuse rather than half-parse: reading a
  // trailing word as if it were not there is how a renamed job would quietly pass as full.
  const suffixed = fullShards().map((job) => ({ ...job, name: `${job.name} rerun` }));
  assert.match(fullRunRefusal(suffixed), /ran no E2E shards/);
});

test('a subset run is refused - it measured a fraction of the suite', () => {
  const subset = fullShards().map((job) => ({ ...job, name: job.name.replace('(full)', '(subset)') }));
  assert.match(fullRunRefusal(subset), /not the full suite/);
});

test('one subset shard among full ones is still a refusal', () => {
  const mixed = fullShards();
  mixed[2].name = 'E2E 3/9 (subset)';
  assert.match(fullRunRefusal(mixed), /not the full suite/);
});

test('a missing shard is refused - its specs would be wiped, not measured', () => {
  const short = fullShards().slice(0, 8);
  const refusal = fullRunRefusal(short);
  assert.match(refusal, /only 8 of its 9 shards/);
});

test('a failed or cancelled shard is refused', () => {
  assert.match(fullRunRefusal(fullShards(9, { 4: { conclusion: 'failure' } })), /shard 4\/9.*"failure"/);
  assert.match(fullRunRefusal(fullShards(9, { 7: { conclusion: 'cancelled' } })), /shard 7\/9.*"cancelled"/);
});

test('a run with no jobs at all is refused', () => {
  assert.match(fullRunRefusal([]), /ran no E2E shards/);
  assert.match(fullRunRefusal([{ conclusion: 'success' }]), /ran no E2E shards/);
});

test('per-file minutes sum every RESULT, so a retry costs what it really cost', () => {
  const report = {
    suites: [
      {
        file: 'e2e/wizard.spec.ts',
        specs: [
          {
            file: 'e2e/wizard.spec.ts',
            tests: [{ results: [{ duration: 30_000 }, { duration: 30_000 }] }],
          },
        ],
      },
    ],
  };
  // Two results of 30s - a test that failed once and passed on retry - is one measured minute.
  assert.deepEqual(minutesByFile(report), { 'wizard.spec.ts': 1 });
});

test('per-file minutes fold nested suites into the file that owns them', () => {
  const report = {
    suites: [
      {
        file: 'e2e/exports.spec.ts',
        suites: [
          { specs: [{ tests: [{ results: [{ duration: 6_000 }] }] }] },
          { specs: [{ tests: [{ results: [{ duration: 6_000 }] }] }] },
        ],
        specs: [{ tests: [{ results: [{ duration: 12_000 }] }] }],
      },
    ],
  };
  assert.deepEqual(minutesByFile(report), { 'exports.spec.ts': 0.4 });
});

test('drift names specs the table has never measured, and entries whose file is gone', () => {
  const minutes = { 'a.spec.ts': 1, 'gone.spec.ts': 2 };
  const { unmeasured, stale } = drift(minutes, ['a.spec.ts', 'new.spec.ts']);
  assert.deepEqual(unmeasured, ['new.spec.ts']);
  assert.deepEqual(stale, ['gone.spec.ts']);
});

// THE PART OF A SHARD THAT IS NOT ITS TESTS. Until 2026-09-04 nothing measured it, and the
// planner behaved as though it were zero: it aimed nine bins at 11.1 measured minutes each,
// called that comfortable against a 20-minute cap, and two shards of run 33854844447 were killed
// at exactly that cap carrying 9.8 measured minutes behind a ten-minute `npm ci`. These tests pin
// the arithmetic that now carries the second term, because it decides whether a plan is planned
// to fail.

/** A run's shard jobs in the REST shape, with per-step timings. Minutes in, minutes out. */
function shardJobs(pairs) {
  const at = (minutes) => new Date(Date.UTC(2026, 8, 4) + minutes * 60_000).toISOString();
  return pairs.map(([setup, step], i) => ({
    name: `E2E ${i + 1}/${pairs.length} (full)`,
    started_at: at(0),
    completed_at: at(setup + step),
    steps: [
      { name: 'Install dependencies', started_at: at(0), completed_at: at(setup) },
      { name: 'E2E shard', started_at: at(setup), completed_at: at(setup + step) },
    ],
  }));
}

test('overhead is the job wall clock minus its test step, at the p90 and the median', () => {
  // Setup costs 1,1,1,1,1,1,1,1,9 - nine samples, so the p90 is the worst one. That is the point:
  // a cap kills the slowest shard, and sizing against the mean is how a plan is planned to fail.
  const jobs = shardJobs([[1, 10], [1, 10], [1, 10], [1, 10], [1, 10], [1, 10], [1, 10], [1, 10], [9, 10]]);
  const overhead = overheadFrom(jobs, 90);
  assert.equal(overhead.jobMinutes, 9);
  assert.equal(overhead.medianJobMinutes, 1);
  assert.equal(overhead.samples, 9);
});

test('the test factor is the shard steps over the table, floored at one', () => {
  // Three steps of 10 minutes against a table saying 24: the runner spent 25% longer than the sum
  // of `result.duration`, which is Playwright's own start and the dev-server boot.
  assert.equal(overheadFrom(shardJobs([[1, 10], [1, 10], [1, 10]]), 24).testFactor, 1.25);
  // A table LARGER than the steps that produced it cannot be right for a `workers: 1` run, and
  // reporting a factor below one would shrink every later prediction. Floored, never inverted.
  assert.equal(overheadFrom(shardJobs([[1, 10], [1, 10], [1, 10]]), 60).testFactor, 1);
});

test('jobs that are not shards, or that never ran the step, contribute nothing', () => {
  const jobs = [
    ...shardJobs([[2, 10], [2, 10]]),
    { name: 'Build', started_at: '2026-09-04T00:00:00Z', completed_at: '2026-09-04T00:30:00Z', steps: [] },
    { name: 'E2E 3/3 (full)', started_at: '2026-09-04T00:00:00Z', completed_at: '2026-09-04T00:40:00Z', steps: [] },
  ];
  const overhead = overheadFrom(jobs, 20);
  assert.equal(overhead.samples, 2);
  assert.equal(overhead.jobMinutes, 2);
});

test('a payload with no usable shard returns null, so the caller keeps what it had', () => {
  assert.equal(overheadFrom([], 10), null);
  assert.equal(overheadFrom([{ name: 'Build' }], 10), null);
});

test('the shard budget shrinks as the measured overhead grows', () => {
  const table = (jobMinutes, testFactor) => ({ minutes: {}, overhead: { jobMinutes, testFactor } });
  // A healthy day: 20, less 3 of variance margin, less 1 of setup, over a factor of 1.
  assert.equal(budgetMinutes(table(1, 1)), 16);
  // 2026-09-04's measured p90. The full suite is 99.7 minutes, so nine runners cannot carry it -
  // which is exactly what the cancelled shards were saying.
  assert.ok(budgetMinutes(table(6.6, 1.02)) < 99.7 / 9);
  // Never zero or negative, however bad the reading: a plan that cannot fit must produce a
  // warning a person reads, not a division that asks for an unbounded number of runners.
  assert.equal(budgetMinutes(table(40, 1)), 1);
});

test('the prediction is the budget read the other way round', () => {
  const table = { minutes: {}, overhead: { jobMinutes: 2, testFactor: 1.1 } };
  assert.equal(predictShardMinutes(10, table), 13);
  // A shard carrying exactly the budget lands on the cap minus the variance margin.
  const budget = budgetMinutes(table);
  assert.ok(Math.abs(predictShardMinutes(budget, table) - (SHARD_CAP_MINUTES - SHARD_SAFETY_MINUTES)) < 1e-9);
});
