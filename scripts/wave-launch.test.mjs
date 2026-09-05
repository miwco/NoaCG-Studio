// The launch ledger's arithmetic: percentile edges, joining a launch to its queueing and landing,
// and the per-size stats the horizon reads. The point of the file is that a night can MEASURE how
// long a unit takes instead of the loop guessing, so what is pinned is that the join takes the
// right merge job and the stats count only finished rows.
import assert from 'node:assert/strict';
import test from 'node:test';

import { joinDurations, percentile, statsBySize } from './wave-launch.mjs';

const T = (min) => Date.parse('2026-09-04T20:00:00Z') + min * 60_000;

test('percentile is nearest-rank and empty answers null, never zero', () => {
  assert.equal(percentile([], 0.9), null);
  assert.equal(percentile([5], 0.9), 5);
  assert.equal(percentile([10, 20, 30, 40, 50], 0.9), 50);
  assert.equal(percentile([10, 20, 30, 40, 50], 0.5), 30);
});

test('joinDurations takes the first merge enqueued after the launch, and the newest launch per branch', () => {
  const launches = [
    { branch: 'claude/a', at: T(0), letter: 'A', size: 'standard' },
    { branch: 'claude/a', at: T(5), letter: 'A', size: 'standard' }, // a corrected re-launch, newer
  ];
  const jobs = [
    { kind: 'merge', branch: 'claude/a', enqueuedAt: T(3) }, // before the newest launch - ignored
    { kind: 'merge', branch: 'claude/a', enqueuedAt: T(95) }, // the real queueing
  ];
  const landings = [{ branch: 'claude/a', at: T(100) }];
  const [row] = joinDurations(launches, jobs, landings);
  assert.equal(row.toQueueMin, 90); // 95 - 5
  assert.equal(row.toLandMin, 95); // 100 - 5
});

test('a launched row with no merge yet reports null, so the caller can count what is still running', () => {
  const [row] = joinDurations([{ branch: 'claude/b', at: T(0), size: 'small' }], [], []);
  assert.equal(row.toQueueMin, null);
  assert.equal(row.toLandMin, null);
});

test('statsBySize counts only finished rows, per size', () => {
  const rows = [
    { size: 'small', toQueueMin: 60 },
    { size: 'small', toQueueMin: 90 },
    { size: 'small', toQueueMin: null }, // still running - not counted
    { size: 'standard', toQueueMin: 150 },
  ];
  const stats = statsBySize(rows);
  assert.equal(stats.small.n, 2);
  assert.equal(stats.small.p90, 90);
  assert.equal(stats.standard.n, 1);
  assert.equal(stats.large.n, 0);
  assert.equal(stats.large.p90, null);
});
