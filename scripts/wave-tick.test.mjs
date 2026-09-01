// The watch tick's guard: the DELTA is the product, so what is pinned here is which state
// transitions produce an event, which do not, and that the finished-but-unqueued classifier
// stays as modest as its comment claims. A tick that re-announces old news every time trains the
// orchestrator to skim, which is the failure the delta design exists to prevent - and a tick
// that GUESSES when git cannot answer sends the orchestrator re-queueing landed work, which is
// the failure the landedUnknown suppression exists to prevent.
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
  wavePlanFresh,
} from './wave-tick.mjs';

const NOW = Date.parse('2026-09-01T22:00:00Z');
const MINUTE = 60_000;

const branch = (over = {}) => ({
  name: 'claude/a-thing',
  sha: 'abc123',
  landed: false,
  landingState: 'not-queued',
  landingReason: null,
  requeue: null,
  worktree: { path: 'C:/w', clean: true },
  lastCommitMs: NOW - 45 * MINUTE,
  ...over,
});

const snapshot = (over = {}) => ({
  at: NOW,
  branches: [],
  jobs: [],
  blocked: [],
  landedUnknown: false,
  landedBranchNames: [],
  finishedUnqueuedCarried: [],
  ...over,
});

const state = (snap, tick = 1) => nextState(snap, { tick, quietMinutes: QUIET_MINUTES });

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

test('an unmeasured or failed clean check never classifies - null is not true', () => {
  assert.equal(looksFinishedUnqueued(branch({ worktree: { path: 'C:/w', clean: null } }), { now: NOW }), false);
});

test('a branch whose landing gave up is NOT finished-unqueued - it has its own louder event', () => {
  assert.equal(looksFinishedUnqueued(branch({ landingState: 'gave-up' }), { now: NOW }), false);
});

// ── deltaBetween: transitions fire once, standing states stay silent ─────────────────────────────

test('a landing fires LANDED exactly once', () => {
  const before = state(snapshot({ branches: [branch()] }));
  const after = snapshot({ branches: [branch({ landed: true })] });
  const events = deltaBetween(before, after);
  assert.equal(events.filter((event) => event.startsWith('LANDED')).length, 1);
  assert.equal(deltaBetween(state(after, 2), after).filter((event) => event.startsWith('LANDED')).length, 0);
});

test('a branch deleted between ticks still gets its LANDED event when the queue landed it', () => {
  const before = state(snapshot({ branches: [branch()] }));
  const goneAndLanded = snapshot({ landedBranchNames: ['claude/a-thing'] });
  assert.match(deltaBetween(before, goneAndLanded).join('\n'), /LANDED claude\/a-thing \(branch already cleaned up\)/);
  const goneUnexplained = snapshot();
  assert.match(deltaBetween(before, goneUnexplained).join('\n'), /BRANCH GONE claude\/a-thing - deleted since last tick with no landing recorded/);
});

test('a branch present in both snapshots and still unqueued produces no NEW BRANCH event', () => {
  const quiet = branch({ lastCommitMs: NOW - 5 * MINUTE });
  assert.deepEqual(deltaBetween(state(snapshot({ branches: [quiet] })), snapshot({ branches: [quiet] })), []);
});

test('an unknown branch fires NEW BRANCH, and queueing fires QUEUED on the transition only', () => {
  const appeared = snapshot({ branches: [branch({ lastCommitMs: NOW - MINUTE })] });
  assert.match(deltaBetween(state(snapshot()), appeared).join('\n'), /NEW BRANCH ahead of main: claude\/a-thing/);

  const queued = snapshot({ branches: [branch({ landingState: 'queued', lastCommitMs: NOW - MINUTE })] });
  assert.match(deltaBetween(state(appeared, 2), queued).join('\n'), /QUEUED claude\/a-thing/);
  assert.deepEqual(deltaBetween(state(queued, 3), queued), []);
});

test('a landing that gave up is announced once, with the queue\'s own reason and re-queue command', () => {
  const before = state(snapshot({ branches: [branch({ landingState: 'queued', lastCommitMs: NOW - MINUTE })] }));
  const after = snapshot({
    branches: [branch({
      landingState: 'gave-up',
      landingReason: 'main itself is red - fix main first (node scripts/main-health.mjs)',
      requeue: 'node scripts/jobs.mjs add-merge claude/a-thing',
      lastCommitMs: NOW - MINUTE,
    })],
  });
  const failure = deltaBetween(before, after).find((event) => event.startsWith('LANDING GAVE UP'));
  assert.match(failure, /claude\/a-thing/);
  assert.match(failure, /main itself is red/);
  assert.match(failure, /add-merge claude\/a-thing/);
  assert.equal(deltaBetween(state(after, 2), after).some((event) => event.startsWith('LANDING GAVE UP')), false);
});

test('a withdrawn landing reads as a deliberate act, not as unfinished work', () => {
  const before = state(snapshot({ branches: [branch({ landingState: 'queued', lastCommitMs: NOW - MINUTE })] }));
  const after = snapshot({ branches: [branch({ landingState: 'withdrawn', lastCommitMs: NOW - MINUTE })] });
  assert.match(deltaBetween(before, after).join('\n'), /LANDING WITHDRAWN claude\/a-thing - a person cancelled it/);
});

test('waiting sessions are announced on arrival and on clearing, never in between', () => {
  const waiting = { key: 'C:/t/sess.jsonl', detail: 'agent a1 waiting 42 min on Bash' };
  const during = snapshot({ blocked: [waiting] });
  assert.match(deltaBetween(state(snapshot()), during).join('\n'), /WAITING .*42 min on Bash/);
  assert.deepEqual(deltaBetween(state(during, 2), during), []);
  assert.match(deltaBetween(state(during, 3), snapshot()).join('\n'), /NO LONGER WAITING/);
});

test('finished-but-unqueued fires once, says how long the branch has been quiet, and names the hazard', () => {
  const after = snapshot({ branches: [branch()] });
  const warning = deltaBetween(state(snapshot()), after).find((event) => event.startsWith('FINISHED-LOOKING'));
  assert.match(warning, /claude\/a-thing/);
  assert.match(warning, /45 min/);
  assert.match(warning, /nothing will/);
  assert.equal(deltaBetween(state(after, 2), after).some((event) => event.startsWith('FINISHED-LOOKING')), false);
});

test('when git cannot answer the merged question, nothing that rests on it is guessed', () => {
  const before = state(snapshot({ branches: [branch()] }));
  const blind = snapshot({ branches: [branch({ landed: false })], landedUnknown: true });
  const events = deltaBetween(before, blind);
  assert.equal(events.some((event) => /LANDED|NEW BRANCH|FINISHED-LOOKING/.test(event)), false);
  // And the carried set keeps the warning from re-firing for known cases once git recovers.
  const carried = nextState({ ...blind, finishedUnqueuedCarried: ['claude/a-thing'] }, { tick: 2, quietMinutes: QUIET_MINUTES });
  assert.deepEqual(carried.finishedUnqueued, ['claude/a-thing']);
  const recovered = snapshot({ branches: [branch()] });
  assert.equal(deltaBetween(carried, recovered).some((event) => event.startsWith('FINISHED-LOOKING')), false);
});

// ── State and formatting ─────────────────────────────────────────────────────────────────────────

test('nextState carries exactly what the delta needs, versioned, on one quietMinutes channel', () => {
  const snap = snapshot({ branches: [branch({ lastCommitMs: NOW - 100 * MINUTE })], blocked: [{ key: 'k', detail: 'd' }] });
  const wide = nextState(snap, { tick: 7, quietMinutes: 120 });
  assert.equal(wide.v, STATE_VERSION);
  assert.equal(wide.tick, 7);
  assert.deepEqual(wide.blocked, ['k']);
  // 100 quiet minutes is under the caller's 120-minute bar - the state must use the same bar the
  // delta used, or the warning re-fires forever.
  assert.deepEqual(wide.finishedUnqueued, []);
  assert.deepEqual(nextState(snap, { tick: 7, quietMinutes: 30 }).finishedUnqueued, ['claude/a-thing']);
});

test('the summary counts ahead-of-main branches, not landed ones', () => {
  const line = summaryLine(snapshot({
    branches: [branch(), branch({ name: 'claude/b', landed: true })],
    jobs: [{ state: 'running' }, { state: 'waiting' }, { state: 'done' }],
  }));
  assert.match(line, /1 branch\(es\) ahead of main/);
  assert.match(line, /1 job\(s\) running, 1 waiting/);
});

test('the heartbeat line is one line, timestamped, carrying the tick\'s event count', () => {
  const line = heartbeatLine({ tick: 3, at: NOW, summary: 'all quiet', events: 2 });
  assert.equal(line, '- tick 3 at 2026-09-01T22:00:00.000Z: 2 event(s); all quiet');
  assert.equal(line.includes('\n'), false);
});

test('parseArgs refuses what would silently misconfigure the tick', () => {
  assert.throws(() => parseArgs(['--quiet-minutes', '0']), /positive/);
  assert.throws(() => parseArgs(['--nope']), /unknown argument/);
  assert.equal(parseArgs(['--no-fetch']).fetch, false);
  assert.equal(parseArgs([]).quietMinutes, QUIET_MINUTES);
});

test('heartbeats go only to a wave plan whose NAMED date is current - never to a leftover', () => {
  // Local-midnight parses on both sides, so the expectation holds in every timezone.
  const now = Date.parse('2026-09-01T12:00:00');
  assert.equal(wavePlanFresh('2026-09-01-wave-plan.local.md', now), true);
  assert.equal(wavePlanFresh('2026-08-31-wave-plan.local.md', now), true);
  assert.equal(wavePlanFresh('2026-08-30-wave-plan.local.md', now), false);
  assert.equal(wavePlanFresh('wave-plan.local.md', now), false);
});
