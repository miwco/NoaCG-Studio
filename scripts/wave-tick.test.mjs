// The watch tick's guard: the DELTA is the product, so what is pinned here is which state
// transitions produce an event, which do not, and that the finished-but-unqueued classifier
// stays as modest as its comment claims. A tick that re-announces old news every time trains the
// orchestrator to skim, which is the failure the delta design exists to prevent.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  QUIET_MINUTES,
  STATE_VERSION,
  deltaBetween,
  heartbeatLine,
  looksFinishedUnqueued,
  nextState,
  parseArgs,
  summaryLine,
} from './wave-tick.mjs';

const NOW = Date.parse('2026-09-01T22:00:00Z');
const MINUTE = 60_000;

const branch = (over = {}) => ({
  name: 'claude/a-thing',
  sha: 'abc123',
  landed: false,
  landingState: 'not-queued',
  worktree: { path: 'C:/w', clean: true },
  lastCommitMs: NOW - 45 * MINUTE,
  ...over,
});

const snapshot = (over = {}) => ({
  at: NOW,
  quietMinutes: QUIET_MINUTES,
  branches: [],
  jobs: [],
  failedJobs: [],
  blocked: [],
  ...over,
});

// ── looksFinishedUnqueued: every leg of the conjunction matters ──────────────────────────────────

test('a clean, quiet, unqueued branch ahead of main looks finished', () => {
  assert.equal(looksFinishedUnqueued(branch(), { now: NOW }), true);
});

test('any single leg failing clears the classification', () => {
  assert.equal(looksFinishedUnqueued(branch({ landed: true }), { now: NOW }), false);
  assert.equal(looksFinishedUnqueued(branch({ worktree: null }), { now: NOW }), false);
  assert.equal(looksFinishedUnqueued(branch({ worktree: { path: 'C:/w', clean: false } }), { now: NOW }), false);
  assert.equal(looksFinishedUnqueued(branch({ landingState: 'queued' }), { now: NOW }), false);
  assert.equal(looksFinishedUnqueued(branch({ lastCommitMs: NOW - 5 * MINUTE }), { now: NOW }), false);
  assert.equal(looksFinishedUnqueued(branch({ lastCommitMs: null }), { now: NOW }), false);
});

test('a branch whose landing gave up is NOT finished-unqueued - it has its own louder event', () => {
  assert.equal(looksFinishedUnqueued(branch({ landingState: 'gave-up' }), { now: NOW }), false);
});

// ── deltaBetween: transitions fire once, standing states stay silent ─────────────────────────────

test('a landing fires LANDED exactly once', () => {
  const before = nextState(snapshot({ branches: [branch()] }), { tick: 1 });
  const after = snapshot({ branches: [branch({ landed: true })] });
  const events = deltaBetween(before, after);
  assert.equal(events.filter((event) => event.startsWith('LANDED')).length, 1);
  const again = deltaBetween(nextState(after, { tick: 2 }), after);
  assert.equal(again.filter((event) => event.startsWith('LANDED')).length, 0);
});

test('a branch present in both snapshots and still unqueued produces no NEW BRANCH event', () => {
  const before = nextState(snapshot({ branches: [branch({ lastCommitMs: NOW - 5 * MINUTE })] }), { tick: 1 });
  const events = deltaBetween(before, snapshot({ branches: [branch({ lastCommitMs: NOW - 5 * MINUTE })] }));
  assert.deepEqual(events, []);
});

test('an unknown branch fires NEW BRANCH, and queueing fires QUEUED on the transition only', () => {
  const empty = nextState(snapshot(), { tick: 1 });
  const appeared = snapshot({ branches: [branch({ lastCommitMs: NOW - MINUTE })] });
  assert.match(deltaBetween(empty, appeared).join('\n'), /NEW BRANCH ahead of main: claude\/a-thing/);

  const unqueued = nextState(appeared, { tick: 2 });
  const queued = snapshot({ branches: [branch({ landingState: 'queued', lastCommitMs: NOW - MINUTE })] });
  assert.match(deltaBetween(unqueued, queued).join('\n'), /QUEUED claude\/a-thing/);
  assert.deepEqual(deltaBetween(nextState(queued, { tick: 3 }), queued), []);
});

test('a landing that gave up is announced once, with its reason and the re-queue command', () => {
  const before = nextState(snapshot(), { tick: 1 });
  const after = snapshot({
    branches: [branch({ landingState: 'gave-up', lastCommitMs: NOW - MINUTE })],
    failedJobs: [{ id: 'j-0042', branch: 'claude/a-thing', reason: 'main itself is red - fix main first (node scripts/main-health.mjs)' }],
  });
  const events = deltaBetween(before, after);
  const failure = events.find((event) => event.startsWith('LANDING GAVE UP'));
  assert.match(failure, /claude\/a-thing/);
  assert.match(failure, /main itself is red/);
  assert.match(failure, /add-merge claude\/a-thing/);
  assert.equal(deltaBetween(nextState(after, { tick: 2 }), after).some((event) => event.startsWith('LANDING GAVE UP')), false);
});

test('waiting sessions are announced on arrival and on clearing, never in between', () => {
  const waiting = { key: 'C:/t/sess.jsonl', detail: 'agent a1 waiting 42 min on Bash' };
  const before = nextState(snapshot(), { tick: 1 });
  const during = snapshot({ blocked: [waiting] });
  assert.match(deltaBetween(before, during).join('\n'), /WAITING .*42 min on Bash/);
  assert.deepEqual(deltaBetween(nextState(during, { tick: 2 }), during), []);
  assert.match(deltaBetween(nextState(during, { tick: 3 }), snapshot()).join('\n'), /NO LONGER WAITING/);
});

test('finished-but-unqueued fires once, says how long the branch has been quiet, and names the hazard', () => {
  const before = nextState(snapshot(), { tick: 1 });
  const after = snapshot({ branches: [branch()] });
  const events = deltaBetween(before, after);
  const warning = events.find((event) => event.startsWith('FINISHED-LOOKING'));
  assert.match(warning, /claude\/a-thing/);
  assert.match(warning, /45 min/);
  assert.match(warning, /nothing will/);
  assert.equal(
    deltaBetween(nextState(after, { tick: 2 }), after).some((event) => event.startsWith('FINISHED-LOOKING')),
    false,
  );
});

// ── State and formatting ─────────────────────────────────────────────────────────────────────────

test('nextState carries exactly what the delta needs, versioned', () => {
  const state = nextState(snapshot({ branches: [branch()], blocked: [{ key: 'k', detail: 'd' }] }), { tick: 7 });
  assert.equal(state.v, STATE_VERSION);
  assert.equal(state.tick, 7);
  assert.deepEqual(state.blocked, ['k']);
  assert.deepEqual(state.finishedUnqueued, ['claude/a-thing']);
  assert.deepEqual(Object.keys(state.branches), ['claude/a-thing']);
});

test('the summary counts ahead-of-main branches, not landed ones', () => {
  const line = summaryLine(snapshot({
    branches: [branch(), branch({ name: 'claude/b', landed: true })],
    jobs: [{ state: 'running' }, { state: 'waiting' }, { state: 'done' }],
  }));
  assert.match(line, /1 branch\(es\) ahead of main/);
  assert.match(line, /1 job\(s\) running, 1 waiting/);
});

test('the heartbeat line is one line, timestamped, in the wave-state file format', () => {
  const line = heartbeatLine({ tick: 3, at: NOW, summary: 'all quiet' });
  assert.equal(line, '- tick 3 at 2026-09-01T22:00:00.000Z: all quiet');
  assert.equal(line.includes('\n'), false);
});

test('parseArgs refuses what would silently misconfigure the tick', () => {
  assert.throws(() => parseArgs(['--quiet-minutes', '0']), /positive/);
  assert.throws(() => parseArgs(['--nope']), /unknown argument/);
  assert.equal(parseArgs(['--no-fetch']).fetch, false);
  assert.equal(parseArgs([]).quietMinutes, QUIET_MINUTES);
});

test('heartbeats go only to a wave plan whose NAMED date is current - never to a leftover', async () => {
  const { wavePlanFresh } = await import('./wave-tick.mjs');
  const now = Date.parse('2026-09-01T22:00:00Z');
  assert.equal(wavePlanFresh('2026-09-01-wave-plan.local.md', now), true);
  assert.equal(wavePlanFresh('2026-08-31-wave-plan.local.md', now), true);
  assert.equal(wavePlanFresh('2026-08-30-wave-plan.local.md', now), false);
  assert.equal(wavePlanFresh('wave-plan.local.md', now), false);
});
