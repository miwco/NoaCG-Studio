// The reclaimer decides to KILL processes on a machine somebody is working on, unattended, at
// night. So it is tested the way `db-push.test.mjs` tests the migration classifier: the safe
// answers are checked one by one, and the failing-closed answer is checked for every shape that
// is not explicitly allowed - because the guard is the classifier, not the prose around it.

import assert from 'node:assert/strict';
import test from 'node:test';

import { RECLAIMABLE, RECLAIM_AFTER_MS, classifyForReclaim, describeReclaim, planReclaim } from './ram-reclaim.mjs';

test('only the named leftover kinds may be closed', () => {
  for (const kind of Object.keys(RECLAIMABLE)) {
    const verdict = classifyForReclaim({ pid: 1234, kind });
    assert.equal(verdict.action, 'kill', `${kind} is a leftover by construction`);
    assert.equal(verdict.reason, RECLAIMABLE[kind]);
  }
});

test('the classifier fails closed on everything it does not recognise', () => {
  const strangers = [
    { pid: 1, kind: 'node' },
    { pid: 2, kind: 'vite-dev-server' },
    { pid: 3, kind: 'chrome' },
    { pid: 4, kind: 'looks-expensive' },
    { pid: 5, kind: '' },
    { pid: 6 },
    { pid: 7, kind: 'PLAYWRIGHT-WORKER' }, // near-miss spelling is still a stranger
    { kind: 'playwright-worker' }, // no pid
    { pid: 0, kind: 'playwright-worker' },
    { pid: -1, kind: 'playwright-worker' },
    null,
    undefined,
  ];
  for (const stranger of strangers) {
    assert.equal(classifyForReclaim(stranger).action, 'keep', `${JSON.stringify(stranger)} must be kept`);
  }
  assert.match(classifyForReclaim({ pid: 9, kind: 'chrome' }).reason, /fails closed/);
});

test('a leftover with a live owner is not a leftover', () => {
  const verdict = classifyForReclaim({ pid: 99, kind: 'headless-browser-shell', hasLiveOwner: true });
  assert.equal(verdict.action, 'keep');
  assert.match(verdict.reason, /live session owns it/);
});

test('nothing is reclaimed before the queue has been starved for a quarter of an hour', () => {
  const candidates = [{ pid: 11, kind: 'headless-browser-shell' }];
  const now = 10_000_000;
  assert.equal(planReclaim({ starvedSince: null, now, candidates }).action, 'wait');
  assert.equal(planReclaim({ starvedSince: now - 60_000, now, candidates }).action, 'wait');
  assert.equal(planReclaim({ starvedSince: now - RECLAIM_AFTER_MS, now, candidates }).action, 'reclaim');
});

test('a reclaim reports what it freed and NAMES who is holding the rest, without touching them', () => {
  const now = 10_000_000;
  const plan = planReclaim({
    starvedSince: now - RECLAIM_AFTER_MS,
    now,
    candidates: [
      { pid: 11, kind: 'headless-browser-shell' },
      { pid: 12, kind: 'vite-dev-server' },
    ],
    holders: ['C:/claude/NoaCG-Studio/.claude/worktrees/aa-svg (playwright, 2 workers)'],
  });

  assert.deepEqual(plan.kill.map((d) => d.candidate.pid), [11]);
  assert.deepEqual(plan.keep.map((d) => d.candidate.pid), [12]);

  const text = describeReclaim(plan).join('\n');
  assert.match(text, /closing 1 orphaned process/);
  assert.match(text, /kept pid 12/);
  assert.match(text, /aa-svg/);
  // Closing a session is a judgement about work in flight. The reclaimer says who, never does it.
  assert.match(text, /nobody's to close but its own session/);
});
