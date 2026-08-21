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
import { drift, fullRunRefusal, minutesByFile } from './e2e-durations.mjs';

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
