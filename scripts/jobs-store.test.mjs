// The queue's arithmetic, pinned. Every failure mode here is one that reads as "nothing is
// happening" from outside, which is exactly the situation the queue exists to make legible -
// so a wrong answer is not just wrong, it is invisible.
//
// The clock and the free-RAM reading are INJECTED, so no test depends on wall time or on how
// much memory the machine running it happens to have.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  POLICY,
  addJob,
  capacity,
  ensureJobsDir,
  finishedSince,
  pending,
  readJobs,
  reapDead,
  schedule,
} from './jobs-store.mjs';

const NIGHT = 3; // 03:00 local
const DAY = 14; // 14:00 local
const PLENTY = 12_000; // MB free

/** A job in whatever state the case needs, with the fields the scheduler reads. */
function job(id, over = {}) {
  return { id, kind: 'gate', state: 'waiting', after: [], enqueuedAt: Number(id.slice(2)), pid: null, ...over };
}

function tempQueue() {
  return ensureJobsDir(mkdtempSync(join(tmpdir(), 'noacg-jobs-')));
}

test('capacity is one by day, two at night', () => {
  assert.equal(capacity({ hour: DAY, freeMemMb: PLENTY }), 1);
  assert.equal(capacity({ hour: NIGHT, freeMemMb: PLENTY }), 2);
  // The boundaries themselves, since an off-by-one here silently halves a night's throughput.
  assert.equal(capacity({ hour: POLICY.nightFrom, freeMemMb: PLENTY }), 2, '00:00 is night');
  assert.equal(capacity({ hour: POLICY.nightTo, freeMemMb: PLENTY }), 1, '07:00 is day again');
  assert.equal(capacity({ hour: POLICY.nightTo - 1, freeMemMb: PLENTY }), 2, '06:00 is still night');
});

test('the RAM floor overrides the clock in both directions', () => {
  assert.equal(capacity({ hour: NIGHT, freeMemMb: POLICY.freeMemFloorMb - 1 }), 0);
  assert.equal(capacity({ hour: DAY, freeMemMb: POLICY.freeMemFloorMb - 1 }), 0);
  assert.equal(capacity({ hour: NIGHT, freeMemMb: POLICY.freeMemFloorMb }), 2, 'the floor itself is allowed');
});

test('work started outside the queue is subtracted from capacity', () => {
  // Another coding agent, or a hand-run suite. Invisible to us, visible to the process table.
  assert.equal(capacity({ hour: NIGHT, freeMemMb: PLENTY, outsideRuns: 1 }), 1);
  assert.equal(capacity({ hour: NIGHT, freeMemMb: PLENTY, outsideRuns: 2 }), 0);
  assert.equal(capacity({ hour: NIGHT, freeMemMb: PLENTY, outsideRuns: 5 }), 0, 'never negative');
  assert.equal(capacity({ hour: DAY, freeMemMb: PLENTY, outsideRuns: 1 }), 0);
});

test('by day one job starts and the rest say why they are waiting', () => {
  const jobs = [job('j-0001'), job('j-0002'), job('j-0003')];
  const { start, waiting, slots } = schedule(jobs, { hour: DAY, freeMemMb: PLENTY });
  assert.deepEqual(start.map((j) => j.id), ['j-0001']);
  assert.equal(slots, 1);
  assert.deepEqual(waiting.map((w) => w.job.id), ['j-0002', 'j-0003']);
  assert.match(waiting[0].reason, /capacity 1\/1/);
});

test('at night two start together', () => {
  const jobs = [job('j-0001'), job('j-0002'), job('j-0003')];
  const { start } = schedule(jobs, { hour: NIGHT, freeMemMb: PLENTY });
  assert.deepEqual(start.map((j) => j.id), ['j-0001', 'j-0002']);
});

test('a running job occupies its slot', () => {
  const jobs = [job('j-0001', { state: 'running', pid: 1 }), job('j-0002')];
  const { start, waiting } = schedule(jobs, { hour: DAY, freeMemMb: PLENTY });
  assert.deepEqual(start, []);
  assert.match(waiting[0].reason, /capacity 1\/1/);
});

test('a merge never runs beside anything, even at night', () => {
  // This is what makes "land one branch at a time" structural instead of remembered.
  const withMerge = [job('j-0001', { kind: 'merge' }), job('j-0002')];
  const { start, waiting } = schedule(withMerge, { hour: NIGHT, freeMemMb: PLENTY });
  assert.deepEqual(start.map((j) => j.id), ['j-0001'], 'the merge goes alone');
  assert.match(waiting[0].reason, /merge runs alone/);

  // And it will not start beside work already running.
  const busy = [job('j-0001', { state: 'running', pid: 1 }), job('j-0002', { kind: 'merge' })];
  assert.deepEqual(schedule(busy, { hour: NIGHT, freeMemMb: PLENTY }).start, []);

  // Two merges never overlap either.
  const twoMerges = [job('j-0001', { kind: 'merge' }), job('j-0002', { kind: 'merge' })];
  assert.deepEqual(schedule(twoMerges, { hour: NIGHT, freeMemMb: PLENTY }).start.map((j) => j.id), ['j-0001']);
});

test('a dependency holds a job back until it is green, and names what it waits on', () => {
  const jobs = [job('j-0001', { state: 'running', pid: 1 }), job('j-0002', { after: ['j-0001'] })];
  const { start, waiting } = schedule(jobs, { hour: NIGHT, freeMemMb: PLENTY });
  assert.deepEqual(start, []);
  assert.match(waiting[0].reason, /waiting on j-0001/);

  const done = [job('j-0001', { state: 'done' }), job('j-0002', { after: ['j-0001'] })];
  assert.deepEqual(schedule(done, { hour: DAY, freeMemMb: PLENTY }).start.map((j) => j.id), ['j-0002']);
});

test('a job whose dependency failed is never started, and says so', () => {
  // The gate went red, so the merge that depended on it must not run - and must not sit
  // "waiting" forever either, which would read as a queue that has stalled.
  for (const bad of ['failed', 'timed-out', 'cancelled']) {
    const jobs = [job('j-0001', { state: bad }), job('j-0002', { after: ['j-0001'], kind: 'merge' })];
    const { start, waiting } = schedule(jobs, { hour: NIGHT, freeMemMb: PLENTY });
    assert.deepEqual(start, [], `${bad} dependency must not release the job`);
    assert.match(waiting[0].reason, /did not finish green/);
  }
});

test('a job depending on an id that does not exist is not startable', () => {
  const jobs = [job('j-0002', { after: ['j-0999'] })];
  const { start, waiting } = schedule(jobs, { hour: NIGHT, freeMemMb: PLENTY });
  assert.deepEqual(start, []);
  assert.match(waiting[0].reason, /did not finish green/);
});

test('nothing starts under the RAM floor, and the reason names the memory', () => {
  const { start, waiting } = schedule([job('j-0001')], { hour: NIGHT, freeMemMb: 3174 });
  assert.deepEqual(start, []);
  assert.match(waiting[0].reason, /3\.1 GB RAM free/);
});

test('a running job whose process is gone is reaped, not left holding a slot', () => {
  const jobs = [
    job('j-0001', { state: 'running', pid: 4242 }),
    job('j-0002', { state: 'running', pid: 4243 }),
    job('j-0003', { state: 'done' }),
  ];
  const reaped = reapDead(jobs, (pid) => pid === 4243, 1_000);
  assert.deepEqual(reaped.map((j) => j.id), ['j-0001']);
  assert.equal(reaped[0].state, 'failed');
  assert.equal(reaped[0].finishedAt, 1_000);
  assert.equal(reaped[0].reapedAsDead, true);
});

test('two adds in the same millisecond produce two distinct jobs', () => {
  // The 'wx' claim is the whole concurrency story: the filesystem decides, and a process that
  // dies mid-claim leaves no lock behind.
  const dir = tempQueue();
  try {
    const a = addJob(dir, { command: 'npm run build', checkout: '/x', now: 1 });
    const b = addJob(dir, { command: 'npm run build', checkout: '/x', now: 1 });
    assert.notEqual(a.id, b.id);
    assert.equal(readdirSync(dir).filter((n) => n.endsWith('.json')).length, 2);
    assert.deepEqual(readJobs(dir).map((j) => j.id), [a.id, b.id]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an unreadable job file is skipped and reported, never fatal', () => {
  // A torn read during someone else's write must cost one job, not the whole queue.
  const dir = tempQueue();
  try {
    addJob(dir, { command: 'npm run build', checkout: '/x', now: 1 });
    writeFileSync(join(dir, 'j-9999.json'), '{ this is not json');
    const seen = [];
    const jobs = readJobs(dir, { onUnreadable: (n) => seen.push(n) });
    assert.equal(jobs.length, 1);
    assert.deepEqual(seen, ['j-9999.json']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a job refuses an unknown kind and an empty command', () => {
  const dir = tempQueue();
  try {
    assert.throws(() => addJob(dir, { command: 'x', checkout: '/x', kind: 'nonsense', now: 1 }), /unknown job kind/);
    assert.throws(() => addJob(dir, { command: '   ', checkout: '/x', now: 1 }), /needs a command/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('pending and finishedSince split the queue the way the reports read it', () => {
  const jobs = [
    job('j-0001', { state: 'waiting' }),
    job('j-0002', { state: 'running', pid: 1 }),
    job('j-0003', { state: 'done', finishedAt: 500 }),
    job('j-0004', { state: 'failed', finishedAt: 1500 }),
  ];
  assert.deepEqual(pending(jobs).map((j) => j.id), ['j-0001', 'j-0002']);
  assert.deepEqual(finishedSince(jobs, 1000).map((j) => j.id), ['j-0004']);
  assert.deepEqual(finishedSince(jobs, 0).map((j) => j.id), ['j-0003', 'j-0004']);
});
