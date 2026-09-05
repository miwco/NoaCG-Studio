// The landing-latency report answers "why did that take hours" from the job store alone. Pinned:
// a branch is measured from its FIRST queued job to the job that landed it, every failed or
// timed-out job in between contributes its refusal, the slow tail is what gets listed, and the
// refusal text is read from the log's newest REFUSAL-KIND / REFUSED / [FAIL] line.
import assert from 'node:assert/strict';
import test from 'node:test';

import { parseArgs, refusalOf, summarize } from './landing-latency.mjs';

const T0 = Date.parse('2026-09-05T12:00:00Z');
const min = (n) => n * 60_000;
const job = (id, branch, state, enqueuedAt, finishedAt, extra = {}) => ({ id, kind: 'merge', branch, state, enqueuedAt, finishedAt, logPath: `${id}.log`, ...extra });

test('parseArgs defaults and refusals', () => {
  assert.deepEqual(parseArgs([]), { days: 7, slow: 60, json: false, help: false });
  assert.equal(parseArgs(['--days', '3', '--slow', '30']).slow, 30);
  assert.throws(() => parseArgs(['--days', '0']), /positive/);
  assert.throws(() => parseArgs(['--bogus']), /unknown argument/);
});

test('refusalOf prefers the kind line, then the REFUSED line, then the [FAIL] line', () => {
  assert.equal(refusalOf('x\nauto-merge REFUSAL-KIND: order-caution\nauto-merge REFUSED: merge-order says caution: [conflict] ...\n'), 'order-caution: merge-order says caution: [conflict] ...');
  assert.equal(refusalOf('[FAIL] merge preview is conflict-free - 2 conflicted path(s)\nauto-merge REFUSED: preflight phase 1 failed\n'), 'preflight phase 1 failed');
  assert.equal(refusalOf('[FAIL] source worktree is clean - 1 dirty path(s)\n'), 'source worktree is clean - 1 dirty path(s)');
  assert.equal(refusalOf(''), 'no log');
  assert.equal(refusalOf('nothing useful'), 'refused without saying why');
});

test('a branch is measured from first queue to landing, with every refusal on the way', () => {
  const jobs = [
    job('j-1', 'claude/fast', 'done', T0 - min(30), T0 - min(20)),
    job('j-2', 'claude/slow', 'failed', T0 - min(600), T0 - min(590)),
    job('j-3', 'claude/slow', 'timed-out', T0 - min(400), T0 - min(355), { capMinutes: 45 }),
    job('j-4', 'claude/slow', 'done', T0 - min(100), T0 - min(90)),
    job('j-5', 'claude/stuck', 'failed', T0 - min(50), T0 - min(49)),
    { id: 'j-6', kind: 'gate', branch: 'claude/slow', state: 'done', enqueuedAt: T0 - min(700), finishedAt: T0 - min(690) },
    job('j-7', 'claude/ancient', 'done', T0 - min(60 * 24 * 30), T0 - min(60 * 24 * 30) + min(5)),
  ];
  const logs = { 'j-2.log': 'auto-merge REFUSED: blocked by claude/other - still ahead of main, and NO landing is queued for it', 'j-5.log': 'auto-merge REFUSAL-KIND: order-caution\nauto-merge REFUSED: merge-order says caution: [conflict] x' };
  const s = summarize(jobs, { now: T0, days: 7, slowMinutes: 60, logOf: (j) => logs[j.logPath] ?? '' });
  assert.deepEqual(s.branches.map((b) => b.branch), ['claude/slow', 'claude/stuck', 'claude/fast']);
  const slow = s.branches[0];
  assert.equal(slow.minutes, 510);
  assert.equal(slow.jobs, 3);
  assert.deepEqual(slow.refusals, ['blocked by claude/other - still ahead of main, and NO landing is queued for it', 'timed-out: killed at its 45-minute cap']);
  assert.equal(s.landedCount, 2);
  assert.equal(s.medianMinutes, 510);
  assert.deepEqual(s.slow.map((b) => b.branch), ['claude/slow', 'claude/stuck']);
  assert.deepEqual(s.causes, [['blocked by an unqueued branch ahead of main', 1], ['timed-out at the landing cap', 1], ['merge-order caution (a person must accept)', 1]]);
});
