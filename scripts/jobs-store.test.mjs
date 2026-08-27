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
  COST,
  POLICY,
  addJob,
  capacity,
  costOf,
  ensureJobsDir,
  finishedSince,
  landingStateFor,
  pending,
  readJobs,
  reapDead,
  schedule,
} from './jobs-store.mjs';

const NIGHT = 3; // 03:00 local
const DAY = 14; // 14:00 local
const PLENTY = 12_000; // MB free

/**
 * A job in whatever state the case needs.
 *
 * The default command is a real e2e invocation, because that is the expensive case the budget
 * exists for - a fixture with no command would be charged as one too (unknown is assumed heavy),
 * but naming it keeps these tests honest about WHICH cost they are exercising.
 */
function job(id, over = {}) {
  return {
    id,
    kind: 'gate',
    command: 'npm run test:e2e:affected',
    checkout: `/wt/${id}`,
    state: 'waiting',
    after: [],
    enqueuedAt: Number(id.slice(2)),
    pid: null,
    ...over,
  };
}

/** A landing job - the cheap, network-bound kind that the weighting exists to let through. */
function merge(id, over = {}) {
  return job(id, { kind: 'merge', command: `node scripts/auto-merge.mjs --branch b-${id}`, ...over });
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

test('the RAM floor is an admission check on a job, not a cut to the budget', () => {
  // Zeroing the budget also stopped the cheapest jobs, which is the opposite of what the floor
  // is for - so the budget is now purely the clock, and the floor is applied per job in
  // `schedule`, scaled by that job's cost.
  assert.equal(capacity({ hour: NIGHT }), 2);
  assert.equal(capacity({ hour: DAY }), 1);
});

test('work started outside the queue is subtracted from capacity', () => {
  // Another coding agent, or a hand-run suite. Invisible to us, visible to the process table.
  assert.equal(capacity({ hour: NIGHT, freeMemMb: PLENTY, outsideRuns: 1 }), 1);
  assert.equal(capacity({ hour: NIGHT, freeMemMb: PLENTY, outsideRuns: 2 }), 0);
  assert.equal(capacity({ hour: NIGHT, freeMemMb: PLENTY, outsideRuns: 5 }), 0, 'never negative');
  assert.equal(capacity({ hour: DAY, freeMemMb: PLENTY, outsideRuns: 1 }), 0);
});

test('by day one suite starts and the rest say why they are waiting', () => {
  const jobs = [job('j-0001'), job('j-0002'), job('j-0003')];
  const { start, waiting, slots } = schedule(jobs, { hour: DAY, freeMemMb: PLENTY });
  assert.deepEqual(start.map((j) => j.id), ['j-0001']);
  assert.equal(slots, 1);
  assert.deepEqual(waiting.map((w) => w.job.id), ['j-0002', 'j-0003']);
  assert.match(waiting[0].reason, /budget 1\/1 used/);
});

test('at night two start together', () => {
  const jobs = [job('j-0001'), job('j-0002'), job('j-0003')];
  const { start } = schedule(jobs, { hour: NIGHT, freeMemMb: PLENTY });
  assert.deepEqual(start.map((j) => j.id), ['j-0001', 'j-0002']);
});

test('a running suite occupies the whole day budget', () => {
  const jobs = [job('j-0001', { state: 'running', pid: 1 }), job('j-0002')];
  const { start, waiting } = schedule(jobs, { hour: DAY, freeMemMb: PLENTY });
  assert.deepEqual(start, []);
  assert.match(waiting[0].reason, /budget 1\/1 used/);
});

test('two merges never overlap, whatever the clock says', () => {
  // This is what makes "land one branch at a time" structural instead of remembered.
  const two = [merge('j-0001'), merge('j-0002')];
  const { start, waiting } = schedule(two, { hour: NIGHT, freeMemMb: PLENTY });
  assert.deepEqual(start.map((j) => j.id), ['j-0001']);
  assert.match(waiting[0].reason, /another landing is in flight/);

  const oneRunning = [merge('j-0001', { state: 'running', pid: 1 }), merge('j-0002')];
  assert.deepEqual(schedule(oneRunning, { hour: NIGHT, freeMemMb: PLENTY }).start, []);
});

test('a landing runs beside a suite in ANOTHER checkout, but never in its own', () => {
  // The overnight case: five branches to land is five jobs that are almost entirely idle in
  // `gh run watch`. Charging them a full slot each would queue them behind a suite for no reason.
  const elsewhere = [job('j-0001', { state: 'running', pid: 1, checkout: '/wt/a' }), merge('j-0002', { checkout: '/wt/b' })];
  assert.deepEqual(
    schedule(elsewhere, { hour: NIGHT, freeMemMb: PLENTY }).start.map((j) => j.id),
    ['j-0002'],
    'a landing in another worktree is harmless beside a suite',
  );

  // Same checkout is a different matter: the merge rewrites the tree the suite is reading.
  const sameTree = [job('j-0001', { state: 'running', pid: 1, checkout: '/wt/a' }), merge('j-0002', { checkout: '/wt/a' })];
  const { start, waiting } = schedule(sameTree, { hour: NIGHT, freeMemMb: PLENTY });
  assert.deepEqual(start, []);
  assert.match(waiting[0].reason, /using that checkout/);

  // And nothing else starts in a checkout a landing is already using.
  const mergeFirst = [merge('j-0001', { state: 'running', pid: 1, checkout: '/wt/a' }), job('j-0002', { checkout: '/wt/a' })];
  assert.deepEqual(schedule(mergeFirst, { hour: NIGHT, freeMemMb: PLENTY }).start, []);
});

test('a landing is not charged against the suite budget', () => {
  // One suite elsewhere used to consume the whole day budget and stall every landing behind it,
  // which is the opposite of what "merge latency is the bottleneck" asks for. A landing is a
  // couple of git commands and then ten minutes waiting on GitHub; its concurrency is governed
  // by rules that are stricter where it matters, not by the RAM budget.
  const busy = [job('j-0001', { state: 'running', pid: 1, checkout: '/wt/a' }), merge('j-0002', { checkout: '/wt/b' })];
  assert.deepEqual(schedule(busy, { hour: DAY, freeMemMb: PLENTY }).start.map((j) => j.id), ['j-0002']);

  // Even with the budget fully spent by work OUTSIDE the queue.
  const outside = [merge('j-0001', { checkout: '/wt/b' })];
  assert.deepEqual(
    schedule(outside, { hour: DAY, freeMemMb: PLENTY, outsideRuns: 2 }).start.map((j) => j.id),
    ['j-0001'],
  );

  // A non-merge job is still charged, so the exemption cannot be used as a general escape.
  const cheap = [job('j-0001', { state: 'running', pid: 1 }), job('j-0002', { command: 'npm run build' })];
  assert.deepEqual(schedule(cheap, { hour: DAY, freeMemMb: PLENTY }).start, []);
});

test('several landings fit inside one suite-equivalent', () => {
  // 0.15 each: the day budget of 1.0 holds six of them, and they still drain one at a time
  // because two merges never overlap.
  const many = [merge('j-0001'), merge('j-0002'), merge('j-0003')];
  const { start } = schedule(many, { hour: DAY, freeMemMb: PLENTY });
  assert.deepEqual(start.map((j) => j.id), ['j-0001'], 'serial by the merge rule, not by the budget');
  assert.ok(costOf(many[0]) * 3 < 1, 'three landings cost less than one suite');
});

test('cost is read from the command, and an unrecognised command is assumed expensive', () => {
  assert.equal(costOf({ command: 'npm run test:e2e:affected', kind: 'gate' }), COST.browser);
  assert.equal(costOf({ command: 'node scripts/l3-sweep.mjs scoreboard', kind: 'sweep' }), COST.browser);
  assert.equal(costOf({ command: 'npm run build', kind: 'gate' }), COST.other);
  assert.equal(costOf({ command: 'node --test scripts/x.test.mjs', kind: 'gate' }), COST.other);
  assert.equal(costOf({ command: 'node scripts/auto-merge.mjs --branch x', kind: 'merge' }), COST.merge);
  // The asymmetry that matters: undercharging an expensive job puts two dev servers and eight
  // browser workers on a 16 GB laptop; overcharging a cheap one costs some wall clock at night.
  assert.equal(costOf({ command: 'some-tool-nobody-listed', kind: 'gate' }), COST.browser);
  assert.equal(costOf({ command: 'npm run build', kind: 'gate', cost: 0.9 }), 0.9, 'an explicit cost wins');
});

test('a cheap job runs beside a suite at night', () => {
  const jobs = [job('j-0001', { state: 'running', pid: 1 }), job('j-0002', { command: 'npm run build' })];
  assert.deepEqual(schedule(jobs, { hour: NIGHT, freeMemMb: PLENTY }).start.map((j) => j.id), ['j-0002']);
  // ...but not by day, where the whole budget is one suite.
  assert.deepEqual(schedule(jobs, { hour: DAY, freeMemMb: PLENTY }).start, []);
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

test('no SUITE starts under the RAM floor, and the reason names the memory', () => {
  const { start, waiting } = schedule([job('j-0001')], { hour: NIGHT, freeMemMb: 3174 });
  assert.deepEqual(start, []);
  assert.match(waiting[0].reason, /3\.1 GB RAM free, needs 4\.0/);
});

test('the floor scales with the job, so a landing is not blocked by a suite-sized threshold', () => {
  // The floor stops a dev server and four browser workers starting on a short box. A landing is
  // a few hundred megabytes spending ten minutes waiting on GitHub, and charging it the full
  // 4 GB stalled exactly the work that most needs to finish overnight.
  const tight = { hour: NIGHT, freeMemMb: 2458 }; // 2.4 GB - under the suite floor
  assert.deepEqual(schedule([job('j-0001')], tight).start, [], 'a suite still waits');
  assert.deepEqual(schedule([merge('j-0001')], tight).start.map((j) => j.id), ['j-0001'], 'a landing goes');

  // But a landing is not exempt either - below its own scaled floor it waits too.
  const starved = { hour: NIGHT, freeMemMb: 100 };
  assert.deepEqual(schedule([merge('j-0001')], starved).start, []);
  assert.match(schedule([merge('j-0001')], starved).waiting[0].reason, /needs 0\.6/);
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

// A landing that died - deferrals exhausted, a refusal, a timeout - used to read exactly like a
// branch nobody had queued, so an exhausted landing VANISHED: queue empty, branch "not queued",
// indistinguishable from unfinished work. These pin the three answers apart.

test('a live merge job reads as queued', () => {
  const jobs = [job('j-0001', { kind: 'merge', branch: 'claude/x', state: 'waiting' })];
  assert.deepEqual(landingStateFor('claude/x', jobs), { state: 'queued', job: jobs[0] });
});

test('a dead landing reads as gave-up, never as not-queued', () => {
  const jobs = [
    job('j-0001', { kind: 'merge', branch: 'claude/x', state: 'failed', finishedAt: 100, exitCode: 3 }),
    job('j-0002', { kind: 'merge', branch: 'claude/x', state: 'timed-out', finishedAt: 200 }),
  ];
  const answer = landingStateFor('claude/x', jobs);
  assert.equal(answer.state, 'gave-up');
  assert.equal(answer.job.id, 'j-0002', 'the newest dead landing is the one to read the log of');
});

test('a fresh queue after a dead landing wins - the branch is queued again', () => {
  const jobs = [
    job('j-0001', { kind: 'merge', branch: 'claude/x', state: 'failed', finishedAt: 100 }),
    job('j-0002', { kind: 'merge', branch: 'claude/x', state: 'waiting' }),
  ];
  assert.equal(landingStateFor('claude/x', jobs).state, 'queued');
});

test('a cancelled landing was a person withdrawing it, so the branch reads not-queued', () => {
  const jobs = [job('j-0001', { kind: 'merge', branch: 'claude/x', state: 'cancelled', finishedAt: 100 })];
  assert.deepEqual(landingStateFor('claude/x', jobs), { state: 'not-queued', job: null });
});

test('another branch\'s jobs, and non-merge jobs, never answer for this branch', () => {
  const jobs = [
    job('j-0001', { kind: 'merge', branch: 'claude/other', state: 'failed', finishedAt: 100 }),
    job('j-0002', { kind: 'gate', branch: 'claude/x', state: 'failed', finishedAt: 100 }),
  ];
  assert.deepEqual(landingStateFor('claude/x', jobs), { state: 'not-queued', job: null });
});
