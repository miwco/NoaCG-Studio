// The horizon: does another unit still fit before the window ends? It failed on 2026-09-04 by not
// existing - the loop stopped with two hours left. What is pinned is that it fits a unit only when
// there is time to LAND it too, that it falls back to a labelled seed below the sample floor, and
// that it reads the window from the plan.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SEED_GATE_MINUTES,
  SEED_P90_MINUTES,
  horizon,
  landingLatency,
  parseWindowEnd,
} from './wave-horizon.mjs';

test('parseWindowEnd reads the plan line and rejects a missing or unparseable one', () => {
  assert.equal(parseWindowEnd('## Wave\nWindow ends: 2026-09-05T07:00:00+03:00\n'), Date.parse('2026-09-05T07:00:00+03:00'));
  assert.equal(parseWindowEnd('- **Window ends**: `2026-09-05T07:00:00Z`'), Date.parse('2026-09-05T07:00:00Z'));
  assert.equal(parseWindowEnd('no such line here'), null);
  assert.equal(parseWindowEnd('Window ends: tomorrow morning'), null);
});

test('landingLatency reads gate and wait p90 over finished merges only', () => {
  const done = (gate, wait) => ({ kind: 'merge', state: 'done', enqueuedAt: 0, startedAt: wait * 60_000, finishedAt: (wait + gate) * 60_000 });
  const jobs = [done(5, 2), done(10, 4), done(13, 8), { kind: 'merge', state: 'running', startedAt: 0, finishedAt: null }, { kind: 'gate', state: 'done', startedAt: 0, finishedAt: 999 }];
  const latency = landingLatency(jobs);
  assert.equal(latency.gate.n, 3);
  assert.equal(latency.wait.n, 3);
  assert.ok(latency.gate.p90 >= 13);
});

const enoughSamples = { small: { n: 6, p90: 70 }, standard: { n: 6, p90: 150 }, large: { n: 0, p90: null } };
const measuredLatency = { gate: { n: 10, p90: 12 }, wait: { n: 10, p90: 6 } };

test('a unit fits only when its landing fits too', () => {
  // standard needs 150 + 12 + 6 + 30 = 198.
  const tight = horizon({ remainingMin: 180, durations: enoughSamples, latency: measuredLatency });
  assert.equal(tight.sizes.standard.fits, false);
  assert.equal(tight.sizes.small.fits, true); // 70 + 12 + 6 + 30 = 118 <= 180
  const open = horizon({ remainingMin: 260, durations: enoughSamples, latency: measuredLatency });
  assert.equal(open.sizes.standard.fits, true);
});

test('below the sample floor a size uses a labelled seed, never a silent zero', () => {
  const result = horizon({ remainingMin: 400, durations: { small: { n: 1, p90: 5 }, standard: { n: 0, p90: null }, large: { n: 0, p90: null } }, latency: { gate: { n: 0, p90: null }, wait: { n: 0, p90: null } } });
  assert.equal(result.sizes.standard.unit.minutes, SEED_P90_MINUTES.standard);
  assert.match(result.sizes.standard.unit.source, /seed/);
  assert.equal(result.gate.minutes, SEED_GATE_MINUTES);
  assert.match(result.gate.source, /seed/);
});

test('when nothing fits the caller is told to stop refilling', () => {
  const result = horizon({ remainingMin: 30, durations: enoughSamples, latency: measuredLatency });
  assert.equal(result.sizes.small.fits, false);
  assert.equal(result.sizes.standard.fits, false);
});
