// A wrong condition here costs EVERY future landing, in one of two directions: refuse when main is
// fine and the queue silently stops, or proceed when main is red and the 27-emails-for-one-bug
// shape comes back. Both directions are pinned below.

import assert from 'node:assert/strict';
import test from 'node:test';

import { assessMain, humanAge, planMainHealth } from './main-health.mjs';

const AUG27 = Date.parse('2026-08-27T08:39:00Z');
const AUG28 = Date.parse('2026-08-28T19:43:00Z');

/** A run as `gh run list --json databaseId,status,conclusion,headSha,createdAt,url` gives it. */
function run(id, conclusion, { status = 'completed', createdAt = '2026-08-28T12:00:00Z' } = {}) {
  return { databaseId: id, status, conclusion, createdAt, url: `https://example.invalid/${id}` };
}

test('a green main proceeds', () => {
  const health = assessMain([run(3, 'success'), run(2, 'failure'), run(1, 'success')]);
  assert.equal(health.state, 'green');
  assert.equal(planMainHealth(health).action, 'proceed');
});

test('a red main refuses, naming the spec and since when', () => {
  const health = assessMain([
    run(3, 'failure', { createdAt: '2026-08-28T19:43:00Z' }),
    run(2, 'failure', { createdAt: '2026-08-27T08:39:00Z' }),
    run(1, 'success', { createdAt: '2026-08-27T07:00:00Z' }),
  ]);
  assert.equal(health.state, 'red');
  assert.equal(health.redRuns, 2);
  // Since the OLDEST red in the streak, not the newest: main had been red 35 hours, and saying
  // "since two minutes ago" on the 27th report of it is the lie this gate exists to stop telling.
  assert.equal(health.since, '2026-08-27T08:39:00Z');

  const decision = planMainHealth(health, {
    failing: { items: ['e2e/anim-engine.spec.ts'], hash: 'abc123' },
    branch: 'claude/my-branch',
    now: AUG28,
  });
  assert.equal(decision.action, 'refuse');
  assert.match(decision.message, /main is red on e2e\/anim-engine\.spec\.ts/);
  assert.match(decision.message, /2026-08-27T08:39:00Z/);
  assert.match(decision.message, /35 h ago/);
  assert.match(decision.message, /2 consecutive red runs/);
  // Actionable, or it is just an obstacle: the message has to carry the way out.
  assert.match(decision.message, /add-merge claude\/my-branch --onto-red-main/);
});

test('BOOTSTRAP: no completed run at all is not red', () => {
  // A fresh repository, a fresh main, or a `gh` that answered nothing. The gate must never invent
  // a red main out of an absent answer - that would stop the queue for a reason nobody can fix.
  assert.equal(assessMain([]).state, 'unknown');
  assert.equal(assessMain(undefined).state, 'unknown');
  assert.equal(planMainHealth(assessMain([])).action, 'proceed');
});

test('a run still in flight is not a verdict - the newest SETTLED one decides', () => {
  const health = assessMain([run(4, null, { status: 'in_progress' }), run(3, 'success')]);
  assert.equal(health.state, 'green');
});

test('main in flight over a red run still reads red', () => {
  const health = assessMain([run(4, null, { status: 'queued' }), run(3, 'failure')]);
  assert.equal(health.state, 'red');
});

test('a CANCELLED run is never a verdict, in either direction', () => {
  // docs/VERIFICATION.md, standing rule. 93 of the 204 non-green runs in the measured fortnight
  // were cancels, so reading them as anything would misjudge main most of the time.
  assert.equal(assessMain([run(3, 'cancelled'), run(2, 'success')]).state, 'green');
  assert.equal(assessMain([run(3, 'cancelled'), run(2, 'failure')]).state, 'red');
  // ...and a cancel does not BREAK a red streak either: main was never green in between.
  const health = assessMain([
    run(4, 'failure', { createdAt: '2026-08-28T19:43:00Z' }),
    run(3, 'cancelled', { createdAt: '2026-08-28T12:00:00Z' }),
    run(2, 'failure', { createdAt: '2026-08-27T08:39:00Z' }),
    run(1, 'success'),
  ]);
  assert.equal(health.since, '2026-08-27T08:39:00Z');
  assert.equal(health.redRuns, 2);
});

test('newest is by databaseId, not by list order', () => {
  // `gh run list` creation-order ties broke a real landing on 2026-08-26 (safe-merge-preflight's
  // `selectCiRun` carries the receipt); databaseId is minted in strict creation order.
  assert.equal(assessMain([run(1, 'failure'), run(3, 'success'), run(2, 'failure')]).state, 'green');
});

test('a timed-out or startup-failed main is red; a skipped one has no opinion', () => {
  assert.equal(assessMain([run(2, 'timed_out')]).state, 'red');
  assert.equal(assessMain([run(2, 'startup_failure')]).state, 'red');
  assert.equal(assessMain([run(2, 'skipped'), run(1, 'success')]).state, 'green');
  assert.equal(assessMain([run(2, 'skipped')]).state, 'unknown');
});

test('--onto-red-main lands anyway, and says loudly that it did', () => {
  const health = assessMain([run(2, 'failure')]);
  const decision = planMainHealth(health, { failing: { items: ['e2e/x.spec.ts'] }, allowRed: true });
  assert.equal(decision.action, 'proceed');
  assert.match(decision.message, /--onto-red-main was passed/);
  assert.match(decision.message, /main is red on e2e\/x\.spec\.ts/);
});

test('a red main with an unidentifiable failure still refuses, and says so honestly', () => {
  const decision = planMainHealth(assessMain([run(2, 'failure')]), { failing: { items: [], hash: 'unknown' } });
  assert.equal(decision.action, 'refuse');
  assert.match(decision.message, /could not name/);
});

test('humanAge reads in the units a person thinks in, and refuses to invent one', () => {
  assert.equal(humanAge('2026-08-28T19:00:00Z', Date.parse('2026-08-28T19:30:00Z')), '30 min');
  assert.equal(humanAge('2026-08-27T08:39:00Z', AUG28), '35 h');
  assert.equal(humanAge('2026-08-25T08:00:00Z', Date.parse('2026-08-28T12:00:00Z')), '3 d 4 h');
  assert.equal(humanAge(null), null);
  assert.equal(humanAge('not a date'), null);
  // A clock that disagrees must not produce a negative age.
  assert.equal(humanAge('2026-08-29T00:00:00Z', AUG27), '0 min');
});
