// The watch turns the loop's self-chosen nap into an event stream. What is pinned is the Monitor
// contract: one line per event, nothing on a quiet tick, a WATCH ERROR line on failure (silence is
// not success), the error printed once until it recovers, and the too-fast interval refused.
import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_EVERY_SECONDS, linesFor, parseArgs } from './wave-watch.mjs';

test('parseArgs defaults and refuses a too-fast interval', () => {
  assert.equal(parseArgs([]).every, DEFAULT_EVERY_SECONDS);
  assert.equal(parseArgs(['--every', '300']).every, 300);
  assert.throws(() => parseArgs(['--every', '10']), /at least 30 seconds/);
  assert.throws(() => parseArgs(['--nonsense']), /unknown argument/);
});

test('a quiet tick prints nothing; each event is one line', () => {
  assert.deepEqual(linesFor({ ok: true, tick: 5, events: [] }), []);
  assert.deepEqual(linesFor({ ok: true, tick: 6, events: ['LANDED claude/a', 'QUEUED claude/b'] }), [
    'tick 6: LANDED claude/a',
    'tick 6: QUEUED claude/b',
  ]);
});

test('a failed tick prints WATCH ERROR, but only once until it recovers', () => {
  const first = linesFor({ ok: false, error: 'git fetch failed' }, { lastError: null });
  assert.deepEqual(first, ['WATCH ERROR - wave-tick failed: git fetch failed']);
  const repeat = linesFor({ ok: false, error: 'git fetch failed' }, { lastError: 'git fetch failed' });
  assert.deepEqual(repeat, []);
});

test('recovery after an error prints a RECOVERED line before the events', () => {
  const lines = linesFor({ ok: true, tick: 9, events: ['LANDED claude/c'] }, { lastError: 'git fetch failed' });
  assert.deepEqual(lines, ['WATCH RECOVERED - wave-tick answers again', 'tick 9: LANDED claude/c']);
});
