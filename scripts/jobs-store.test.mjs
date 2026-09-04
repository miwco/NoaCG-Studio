// The queue's arithmetic, pinned. Every failure mode here is one that reads as "nothing is
// happening" from outside, which is exactly the situation the queue exists to make legible -
// so a wrong answer is not just wrong, it is invisible.
//
// The clock and the free-RAM reading are INJECTED, so no test depends on wall time or on how
// much memory the machine running it happens to have.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  COST,
  FOREGROUND_WAIT_CAP_MS,
  JOB_RETENTION_MS,
  MAX_LANDING_RETRIES,
  NO_VERDICT_EXIT,
  POLICY,
  addJob,
  adoptOrphanedLandings,
  cancelVerdict,
  capacity,
  costOf,
  devServerPrecheck,
  ensureJobsDir,
  expiredJobIds,
  finishedSince,
  giveUpReason,
  landingRow,
  landingStateFor,
  pending,
  pruneJobs,
  readJobs,
  reapDead,
  retryLandingFor,
  schedule,
  waitVerdict,
  writeJob,
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

test('a landing chained behind a FAILED one runs once that one is terminal', () => {
  // Measured 2026-08-28: it sat at "a job it depends on did not finish green" for ever, and
  // nothing anywhere said the landing had stopped trying. `--after` on a merge means "not before
  // that one" - a matter of turn, not of permission, because landings are order-free and each is
  // fully re-verified against whatever main it finds.
  for (const bad of ['failed', 'timed-out', 'cancelled']) {
    const jobs = [job('j-0001', { state: bad }), job('j-0002', { after: ['j-0001'], kind: 'merge' })];
    const { start, waiting, dead, released } = schedule(jobs, { hour: NIGHT, freeMemMb: PLENTY });
    assert.deepEqual(start.map((j) => j.id), ['j-0002'], `a ${bad} predecessor must release the landing`);
    assert.deepEqual(waiting, [], 'and never leave it waiting on a state that will never arrive');
    assert.deepEqual(dead, []);
    assert.match(released[0].reason, /landings are order-free/);
  }
});

test('a NON-landing whose dependency died is written off, not left waiting', () => {
  // A gate that was to run after a build cannot mean anything once that build failed. Saying so
  // on every poll for ever is the stall; the job is terminal with the reason on it.
  const jobs = [job('j-0001', { state: 'failed' }), job('j-0002', { after: ['j-0001'], kind: 'gate' })];
  const { start, waiting, dead } = schedule(jobs, { hour: NIGHT, freeMemMb: PLENTY });
  assert.deepEqual(start, []);
  assert.deepEqual(waiting, []);
  assert.deepEqual(dead.map((d) => d.job.id), ['j-0002']);
  assert.match(dead[0].reason, /can never run/);
});

test('a job depending on an id that does not exist is not startable', () => {
  const jobs = [job('j-0002', { after: ['j-0999'] })];
  const { start, dead } = schedule(jobs, { hour: NIGHT, freeMemMb: PLENTY });
  assert.deepEqual(start, []);
  assert.match(dead[0].reason, /did not finish green/);
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

test('a file that is not a job is not read as one', () => {
  // The queue directory carries sidecars - `last-seen.json` is one - and one of them reached
  // every consumer of this list as an entry with an undefined id and state.
  const dir = tempQueue();
  try {
    const real = addJob(dir, { command: 'npm run build', checkout: '/x', now: 1 });
    writeFileSync(join(dir, 'last-seen.json'), JSON.stringify({ at: 1234 }));
    assert.deepEqual(readJobs(dir).map((j) => j.id), [real.id]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('finished jobs older than the retention window are pruned, live ones never', () => {
  const dir = tempQueue();
  try {
    const old = addJob(dir, { command: 'npm run build', checkout: '/x', now: 1 });
    writeJob(dir, { ...old, state: 'done', finishedAt: 1 });
    writeFileSync(join(dir, 'logs', `${old.id}.log`), 'output of a job nobody will read again');
    const stillRunning = addJob(dir, { command: 'npm run build', checkout: '/x', now: 1 });
    writeJob(dir, { ...stillRunning, state: 'running', startedAt: 1 });
    const recent = addJob(dir, { command: 'npm run build', checkout: '/x', now: 1 });
    writeJob(dir, { ...recent, state: 'failed', finishedAt: 1 });

    const now = 1 + JOB_RETENTION_MS + 1;
    // A long-RUNNING job is not stale, at any age - the queue's own reaper decides that.
    assert.deepEqual(expiredJobIds([{ id: 'j-0001', state: 'running', enqueuedAt: 1 }], now), []);
    // The recent one is dated inside the window by moving the clock, not the record.
    assert.deepEqual(expiredJobIds(readJobs(dir), 1 + JOB_RETENTION_MS - 1), []);

    const removed = pruneJobs(dir, { now });
    assert.deepEqual(removed.sort(), [old.id, recent.id].sort());
    assert.deepEqual(readJobs(dir).map((j) => j.id), [stillRunning.id]);
    assert.ok(!existsSync(join(dir, 'logs', `${old.id}.log`)), 'the log goes with the record');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ids continue past the highest one on disk, so a pruned id is not handed straight back', () => {
  // Pruning frees the OLDEST ids. Restarting the scan at the first free number would give a
  // fresh job the id an old log and an old landing record already refer to.
  const dir = tempQueue();
  try {
    const first = addJob(dir, { command: 'npm run build', checkout: '/x', now: 1 });
    const second = addJob(dir, { command: 'npm run build', checkout: '/x', now: 1 });
    assert.deepEqual([first.id, second.id], ['j-0001', 'j-0002']);
    rmSync(join(dir, `${first.id}.json`));
    assert.equal(addJob(dir, { command: 'npm run build', checkout: '/x', now: 1 }).id, 'j-0003');
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

// --- The foreground wait, and the job that needs a server nobody started ----------------------

test('a foreground wait gives up at the cap instead of running for hours', () => {
  const running = job('j-0001', { state: 'running' });
  assert.deepEqual(waitVerdict({ job: running, waitedMs: 60_000 }), { action: 'wait' });

  const late = waitVerdict({ job: running, waitedMs: FOREGROUND_WAIT_CAP_MS });
  assert.equal(late.action, 'give-up');
  assert.match(late.message, /still running after 30 minutes/);
  assert.match(late.message, /Hand off/);
  assert.match(late.message, /Nothing was interrupted/);

  assert.equal(FOREGROUND_WAIT_CAP_MS, 30 * 60_000, 'the bound is the point of this function');
});

test('a finished job ends the wait at once, whatever it finished as', () => {
  for (const state of ['done', 'failed', 'timed-out', 'cancelled']) {
    const verdict = waitVerdict({ job: job('j-0001', { state, exitCode: state === 'done' ? 0 : 1 }), waitedMs: 0 });
    assert.equal(verdict.action, 'finished');
    assert.equal(verdict.state, state);
  }
  assert.equal(waitVerdict({ job: undefined, waitedMs: 0 }).action, 'unknown');
});

test('a sweep whose dev server is not up fails in its first second, not its whole slot', () => {
  const sweep = job('j-0001', { command: 'node scripts/overflow-sweep.mjs --baseline', checkout: 'C:/wt/x' });
  const dead = devServerPrecheck(sweep, { port: 5183, busy: false });
  assert.equal(dead.action, 'fail');
  assert.match(dead.reason, /nothing is listening on port 5183/);
  assert.match(dead.reason, /Start the dev server in C:\/wt\/x/);

  assert.deepEqual(devServerPrecheck(sweep, { port: 5183, busy: true }), { action: 'go' });
  // Fails OPEN when the port is unknown - a missing generated file must not stop a job.
  assert.deepEqual(devServerPrecheck(sweep, {}), { action: 'go' });
  // And it never speaks for a job that brings its own server.
  assert.deepEqual(devServerPrecheck(job('j-0002', { command: 'npm run test:e2e' }), { port: 5183, busy: false }), {
    action: 'go',
  });
});

test('a live merge job reads as queued', () => {
  const jobs = [job('j-0001', { kind: 'merge', branch: 'claude/x', state: 'waiting' })];
  const answer = landingStateFor('claude/x', jobs);
  assert.equal(answer.state, 'queued');
  assert.equal(answer.job, jobs[0]);
});

test('a dead landing reads as gave-up, never as not-queued', () => {
  const jobs = [
    job('j-0001', { kind: 'merge', branch: 'claude/x', state: 'failed', finishedAt: 100, exitCode: 3 }),
    job('j-0002', { kind: 'merge', branch: 'claude/x', state: 'timed-out', finishedAt: 200, capMinutes: 45 }),
  ];
  const answer = landingStateFor('claude/x', jobs);
  assert.equal(answer.state, 'gave-up');
  assert.equal(answer.job.id, 'j-0002', 'the newest dead landing is the one to read the log of');
});

test('a landing that gave up says WHY and hands back the command that re-queues it', () => {
  // Every one of these vanished at least once on 2026-08-28. A row that only names the job sends
  // a person to a log to learn which of them happened, and a row with no re-queue command sends
  // them to the docs to learn how to put it back.
  const cases = [
    [{ state: 'timed-out', capMinutes: 45 }, /45 min cap/],
    [{ state: 'failed', reapedAsDead: true }, /process vanished/],
    [{ state: 'failed', exitCode: 3 }, /still blocked/],
    // Exit 4 is the red-main gate, and it is worth its own code precisely so this line can say
    // "not your branch": five landings queued against a red main all stop with this reason, and
    // reading five identical rows is how a person sees the fault is upstream of all of them.
    [{ state: 'failed', exitCode: 4 }, /main itself is red/],
    [{ state: 'failed', exitCode: 1 }, /exit 1/],
    [{ state: 'failed', giveUpReason: 'main moved under it three times' }, /main moved under it/],
  ];
  for (const [fields, expected] of cases) {
    const jobs = [job('j-0007', { kind: 'merge', branch: 'claude/x', finishedAt: 100, ...fields })];
    const answer = landingStateFor('claude/x', jobs);
    assert.equal(answer.state, 'gave-up');
    assert.match(answer.reason, expected);
    assert.equal(answer.requeue, 'node scripts/jobs.mjs add-merge claude/x');
    const row = landingRow('claude/x', jobs);
    assert.match(row, /LANDING FAILED j-0007/);
    assert.match(row, expected);
    assert.match(row, /re-queue: node scripts\/jobs\.mjs add-merge claude\/x/);
    assert.doesNotMatch(row, /not queued/);
  }
});

// ── Adopting a landing whose session has gone ───────────────────────────────────────────────────
//
// On 2026-09-03 two landings were killed at their 45-minute cap - the first two to time out in
// 213 - and both owning sessions had already finished. Only a branch's own session may queue it,
// so `claude/d-queue-walks-itself` and `claude/f-contracts-point` became unlandable with nobody
// left to try again. Then it spread: `merge-order.mjs` refuses a branch that collides with one
// still ahead of main and unqueued, so `claude/j-fields-step-per-field` was refused outright for
// touching the same files as F, and three more rows queued behind that.

test('a landing killed at its cap is put back, once', () => {
  const dead = merge('j-0438', {
    branch: 'claude/d', state: 'timed-out', finishedAt: 100, capMinutes: 45,
    command: 'node scripts/auto-merge.mjs --branch claude/d --expect-sha a878b17',
  });
  const next = retryLandingFor(dead);
  // VERBATIM, `--expect-sha` and all. That pin is what makes a retry safe without asking anyone:
  // if the session woke and pushed, auto-merge refuses rather than landing undeclared work.
  assert.equal(next.command, dead.command);
  assert.equal(next.branch, 'claude/d');
  assert.equal(next.kind, 'merge');
  assert.equal(next.retryOf, 'j-0438');
  assert.equal(next.retryCount, 1);
  assert.deepEqual(next.after, [], 'the jobs it was queued behind are long gone');

  // And exactly once. A second failure is not a flake, and looping is how a queue looks busy all
  // night and lands nothing.
  assert.equal(retryLandingFor({ ...dead, retryCount: MAX_LANDING_RETRIES }), null);
});

test('a landing that was JUDGED is never retried - only one the machine failed to answer', () => {
  const base = { branch: 'claude/d', state: 'failed', finishedAt: 100 };
  // The three ways the machine fails to answer.
  assert.ok(retryLandingFor(merge('j-1', { ...base, state: 'timed-out' })), 'killed at its cap');
  assert.ok(retryLandingFor(merge('j-2', { ...base, reapedAsDead: true })), 'runner died or the laptop slept');
  assert.ok(retryLandingFor(merge('j-3', { ...base, exitCode: NO_VERDICT_EXIT })), 'CI never gave a verdict');
  // And everything CI or the preflight actually decided. Retrying any of these is how a queue
  // lands work that was refused, which is worse than the orphan it would be curing.
  assert.equal(retryLandingFor(merge('j-4', { ...base, exitCode: 1 })), null, 'a red gate or a conflict');
  assert.equal(retryLandingFor(merge('j-5', { ...base, exitCode: 3 })), null, 'blocked has its own deferral loop');
  assert.equal(retryLandingFor(merge('j-6', { ...base, exitCode: 4 })), null, 'a red main is a person\'s fix');
  assert.equal(retryLandingFor(merge('j-7', { ...base, state: 'done', exitCode: 0 })), null, 'it landed');
  assert.equal(retryLandingFor(merge('j-8', { ...base, state: 'cancelled' })), null, 'a person withdrew it');
  // Never anything but a landing: a gate job has an owner watching it.
  assert.equal(retryLandingFor(job('j-9', { state: 'timed-out', branch: 'claude/d' })), null);
});

test('the sweep adopts landings that were ALREADY orphaned, which is the whole point', () => {
  // A hook on the moment a job dies only ever saves the next victim. The two branches this was
  // written for were stuck hours before the mechanism existed.
  const jobs = [
    merge('j-0438', { branch: 'claude/d', state: 'timed-out', finishedAt: 100 }),
    merge('j-0445', { branch: 'claude/f', state: 'timed-out', finishedAt: 200 }),
  ];
  const adopted = adoptOrphanedLandings(jobs);
  assert.deepEqual(adopted.map((a) => a.branch).sort(), ['claude/d', 'claude/f']);
  assert.deepEqual(adopted.map((a) => a.retryOf).sort(), ['j-0438', 'j-0445']);

  // Idempotent: once the retries exist, sweeping again adopts nothing. Without this the runner
  // would queue a landing every five seconds.
  const withRetries = [...jobs, ...adopted.map((a, i) => merge(`j-050${i}`, { ...a, state: 'waiting' }))];
  assert.deepEqual(adoptOrphanedLandings(withRetries), []);
});

test('the sweep stands down for a branch a person is already handling', () => {
  const dead = merge('j-0438', { branch: 'claude/d', state: 'timed-out', finishedAt: 100 });
  // Queued by hand since: the newest job is live, so there is nothing orphaned.
  assert.deepEqual(adoptOrphanedLandings([dead, merge('j-0460', { branch: 'claude/d', state: 'waiting' })]), []);
  // Landed since.
  assert.deepEqual(
    adoptOrphanedLandings([dead, merge('j-0460', { branch: 'claude/d', state: 'done', exitCode: 0, finishedAt: 300 })]),
    [],
  );
  // Withdrawn on purpose - a person said no, and the sweep is not a way around that.
  assert.deepEqual(
    adoptOrphanedLandings([dead, merge('j-0460', { branch: 'claude/d', state: 'cancelled', finishedAt: 300 })]),
    [],
  );
  // A branch nobody ever queued stays untouched. The declaration is the thing being retried, and
  // this branch has not made one.
  assert.deepEqual(adoptOrphanedLandings([job('j-0470', { state: 'timed-out', branch: 'claude/never' })]), []);
});

test('an adopted landing is PENDING, which is what clears the jam behind it', () => {
  // The cascade is the expensive half. `auto-merge.mjs` refuses a branch whose blocker is ahead
  // of main with no landing queued, on the sound reasoning that waiting cannot change it - and it
  // asks that question through `pending()`. So an adopted landing has to show up there, or the
  // branches behind it keep being refused outright instead of deferring their turn. That is what
  // happened to `claude/j-fields-step-per-field` behind `claude/f-contracts-point`.
  const dir = tempQueue();
  const orphan = merge('j-0445', { branch: 'claude/f', state: 'timed-out', finishedAt: 100 });
  writeJob(dir, orphan);
  for (const next of adoptOrphanedLandings(readJobs(dir))) addJob(dir, { ...next, now: 200 });

  const live = pending(readJobs(dir)).filter((j) => j.kind === 'merge' && j.branch === 'claude/f');
  assert.equal(live.length, 1, 'exactly the retry - the dead job is terminal and not pending');
  assert.equal(live[0].retryOf, 'j-0445');
  rmSync(dir, { recursive: true, force: true });
});

test('an automatic retry says so in the listing', () => {
  // Otherwise the row shows a branch queued that no session queued, which reads as work being
  // landed out from under a conversation - exactly what the one-session rule prevents.
  const jobs = [
    merge('j-0438', { branch: 'claude/d', state: 'timed-out', finishedAt: 100 }),
    merge('j-0500', { branch: 'claude/d', state: 'waiting', retryOf: 'j-0438', retryCount: 1 }),
  ];
  assert.equal(landingStateFor('claude/d', jobs).state, 'queued');
  assert.match(landingRow('claude/d', jobs), /QUEUED j-0500 \(automatic retry of j-0438, which reached no verdict\)/);
  // A landing a session queued itself still reads plainly.
  assert.equal(landingRow('claude/d', [merge('j-0501', { branch: 'claude/d', state: 'waiting' })]), 'QUEUED j-0501');
});

test('exit 5 reads as the machine failing to answer, never as a refusal', () => {
  const jobs = [merge('j-0438', { branch: 'claude/d', state: 'failed', exitCode: NO_VERDICT_EXIT, finishedAt: 100 })];
  const reason = landingStateFor('claude/d', jobs).reason;
  assert.match(reason, /no verdict/);
  assert.doesNotMatch(reason, /refused/, 'a refusal is a judgement, and this is the absence of one');
});

test('auto-merge and the queue agree on what exit 5 means', async () => {
  // The constant is duplicated rather than imported - importing auto-merge pulls the whole
  // landing script into every reader of the queue - so the two are pinned together here.
  const src = await readFile(new URL('./auto-merge.mjs', import.meta.url), 'utf8');
  assert.match(src, new RegExp(`const NO_VERDICT_EXIT = ${NO_VERDICT_EXIT};`));
});

test('a fresh queue after a dead landing wins - the branch is queued again', () => {
  const jobs = [
    job('j-0001', { kind: 'merge', branch: 'claude/x', state: 'failed', finishedAt: 100 }),
    job('j-0002', { kind: 'merge', branch: 'claude/x', state: 'waiting' }),
  ];
  assert.equal(landingStateFor('claude/x', jobs).state, 'queued');
});

test('a withdrawn landing says so - "not queued" may never describe a branch that WAS queued', () => {
  const jobs = [job('j-0001', { kind: 'merge', branch: 'claude/x', state: 'cancelled', finishedAt: 100 })];
  const answer = landingStateFor('claude/x', jobs);
  assert.equal(answer.state, 'withdrawn');
  assert.match(landingRow('claude/x', jobs), /LANDING WITHDRAWN j-0001/);
  assert.equal(answer.requeue, 'node scripts/jobs.mjs add-merge claude/x');
});

test('another branch\'s jobs, and non-merge jobs, never answer for this branch', () => {
  const jobs = [
    job('j-0001', { kind: 'merge', branch: 'claude/other', state: 'failed', finishedAt: 100 }),
    job('j-0002', { kind: 'gate', branch: 'claude/x', state: 'failed', finishedAt: 100 }),
  ];
  assert.equal(landingStateFor('claude/x', jobs).state, 'not-queued');
  assert.equal(landingRow('claude/x', jobs), 'not queued');
});

test('a landing that SUCCEEDED reads as landed - never as a refusal, and never with a re-queue command', () => {
  // Measured on 2026-09-01: branch claude/orchestrator-skill-redesign-a416a6 landed cleanly
  // ("auto-merge: landed ... on main as b84fd883") and the same watch tick reported
  // "LANDING GAVE UP ... auto-merge refused it (exit 0)", with a command to queue it again.
  // Two contradictory claims about one branch, and the WRONG one carried the instruction. The
  // re-queue command is the dangerous half: re-queueing a branch that is already on main is
  // noise at best, and at 07:00 it is a person acting on a failure that never happened.
  const jobs = [job('j-0126', { kind: 'merge', branch: 'claude/x', state: 'done', finishedAt: 100, exitCode: 0 })];
  const answer = landingStateFor('claude/x', jobs);
  assert.equal(answer.state, 'landed');
  assert.equal(answer.job.id, 'j-0126');
  assert.equal(answer.requeue, null, 'a branch already on main must never be handed a re-queue command');
  assert.equal(answer.reason, null, 'a landing that succeeded has nothing to explain');
});

test('the LANDED row says the branch is ahead AGAIN, because that is the only way it can be seen', () => {
  // landingRow's only caller enumerates branches ahead of main (jobs.mjs printOutstanding), so a
  // branch whose landing left it ON main never reaches this row at all. "already on main" would
  // therefore have been false every single time it printed - the same confidently-wrong shape,
  // one state along. Here the re-queue command is CORRECT: this branch has unlanded commits.
  const jobs = [job('j-0126', { kind: 'merge', branch: 'claude/x', state: 'done', finishedAt: 100, exitCode: 0 })];
  const row = landingRow('claude/x', jobs);
  assert.match(row, /LANDED j-0126/);
  assert.match(row, /ahead of main AGAIN/);
  assert.doesNotMatch(row, /already on main/);
  assert.doesNotMatch(row, /refused|FAILED|GAVE UP/);
  assert.match(row, /node scripts\/jobs\.mjs log j-0126/);
  assert.match(row, /node scripts\/jobs\.mjs add-merge claude\/x/);
  assert.doesNotMatch(row, /not queued/);
});

test('the newest merge job answers, so a success after an earlier failure reads as landed', () => {
  const jobs = [
    job('j-0001', { kind: 'merge', branch: 'claude/x', state: 'failed', finishedAt: 100, exitCode: 3 }),
    job('j-0002', { kind: 'merge', branch: 'claude/x', state: 'done', finishedAt: 200, exitCode: 0 }),
  ];
  assert.equal(landingStateFor('claude/x', jobs).state, 'landed');
});

test('giveUpReason never fabricates a refusal out of a zero exit', () => {
  // The other half of the same defect: the exit-code arm rendered success as "auto-merge refused
  // it (exit 0)". Nothing routes a successful landing here any more, but the function is
  // exported, and a lie that SOUNDS like every real refusal is worse than a loud one.
  const reason = giveUpReason(job('j-0126', { kind: 'merge', state: 'done', exitCode: 0 }));
  assert.doesNotMatch(reason, /refused/);
  assert.match(reason, /did not give up/);
});

test('cancelling an already-finished job is refused, so a landed branch is never called withdrawn', () => {
  // The measured shape: `jobs.mjs cancel` wrote `cancelled` with a fresh finishedAt over any id
  // at all. `landingStateFor` sorts terminal jobs by finishedAt and reads `cancelled` as
  // withdrawn - so cancelling a merge job that had already exited 0 made `npm run jobs` announce
  // "LANDING WITHDRAWN" for a branch sitting on main, and offer a command to queue it again.
  for (const state of ['done', 'failed', 'timed-out', 'cancelled']) {
    const answer = cancelVerdict(job('j-0001', { state, finishedAt: 100 }));
    assert.equal(answer.action, 'no-op', `a ${state} job has nothing left to cancel`);
    assert.match(answer.message, new RegExp(state), 'and it says which state it found');
  }
});

test('cancelling a live job is exactly as it was - that is the whole point of the command', () => {
  for (const state of ['waiting', 'running']) {
    assert.equal(cancelVerdict(job('j-0001', { state })).action, 'cancel');
  }
});

test('a finished landing survives a cancel, so the queue keeps calling it landed', () => {
  // The statement over the seam the fault actually crossed: refusing the cancel is only worth
  // anything because it leaves `landingStateFor` reading `done`.
  const landed = job('j-0001', { kind: 'merge', branch: 'claude/x', state: 'done', exitCode: 0, finishedAt: 100 });
  assert.equal(cancelVerdict(landed).action, 'no-op');
  assert.equal(landingStateFor('claude/x', [landed]).state, 'landed');
  // And the counterfactual - this is the lie the write used to tell.
  const overwritten = { ...landed, state: 'cancelled', finishedAt: 200 };
  assert.equal(landingStateFor('claude/x', [overwritten]).state, 'withdrawn');
});
