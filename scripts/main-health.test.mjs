// A wrong condition here costs EVERY future landing, in one of two directions: refuse when main is
// fine and the queue silently stops, or proceed when main is red and the 27-emails-for-one-bug
// shape comes back. Both directions are pinned below.

import assert from 'node:assert/strict';
import test from 'node:test';

import { assessMain, humanAge, planMainHealth, STALE_AFTER_HOURS, STALE_AFTER_SKIPPED } from './main-health.mjs';

const AUG27 = Date.parse('2026-08-27T08:39:00Z');
const AUG28 = Date.parse('2026-08-28T19:43:00Z');

/** A run as `gh run list --json databaseId,status,conclusion,headSha,createdAt,url` gives it. */
function run(id, conclusion, { status = 'completed', createdAt = '2026-08-28T12:00:00Z' } = {}) {
  return { databaseId: id, status, conclusion, createdAt, url: `https://example.invalid/${id}` };
}

/**
 * The fixtures above are dated, and since 2026-09-04 a verdict's AGE is part of the answer - so
 * every case below is judged from a clock an hour after the newest fixture rather than from the
 * wall clock, which would quietly turn each of them stale as the file got older.
 */
const NOW = Date.parse('2026-08-28T20:43:00Z');
const assess = (runs, opts = {}) => assessMain(runs, { now: NOW, ...opts });

test('a green main proceeds', () => {
  const health = assess([run(3, 'success'), run(2, 'failure'), run(1, 'success')]);
  assert.equal(health.state, 'green');
  assert.equal(planMainHealth(health).action, 'proceed');
});

test('a red main refuses, naming the spec and since when', () => {
  const health = assess([
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
  assert.equal(assess([]).state, 'unknown');
  assert.equal(assess(undefined).state, 'unknown');
  assert.equal(planMainHealth(assess([])).action, 'proceed');
});

test('a run still in flight is not a verdict - the newest SETTLED one decides', () => {
  const health = assess([run(4, null, { status: 'in_progress' }), run(3, 'success')]);
  assert.equal(health.state, 'green');
});

test('main in flight over a red run still reads red', () => {
  const health = assess([run(4, null, { status: 'queued' }), run(3, 'failure')]);
  assert.equal(health.state, 'red');
});

test('a CANCELLED run is never a verdict, in either direction', () => {
  // docs/VERIFICATION.md, standing rule. 93 of the 204 non-green runs in the measured fortnight
  // were cancels, so reading them as anything would misjudge main most of the time.
  assert.equal(assess([run(3, 'cancelled'), run(2, 'success')]).state, 'green');
  assert.equal(assess([run(3, 'cancelled'), run(2, 'failure')]).state, 'red');
  // ...and a cancel does not BREAK a red streak either: main was never green in between.
  const health = assess([
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
  assert.equal(assess([run(1, 'failure'), run(3, 'success'), run(2, 'failure')]).state, 'green');
});

test('a timed-out or startup-failed main is red; a skipped one has no opinion', () => {
  assert.equal(assess([run(2, 'timed_out')]).state, 'red');
  assert.equal(assess([run(2, 'startup_failure')]).state, 'red');
  assert.equal(assess([run(2, 'skipped'), run(1, 'success')]).state, 'green');
  assert.equal(assess([run(2, 'skipped')]).state, 'unknown');
});

test('--onto-red-main lands anyway, and says loudly that it did', () => {
  const health = assess([run(2, 'failure')]);
  const decision = planMainHealth(health, { failing: { items: ['e2e/x.spec.ts'] }, allowRed: true });
  assert.equal(decision.action, 'proceed');
  assert.match(decision.message, /--onto-red-main was passed/);
  assert.match(decision.message, /main is red on e2e\/x\.spec\.ts/);
});

test('a red main with an unidentifiable failure still refuses, and says so honestly', () => {
  const decision = planMainHealth(assess([run(2, 'failure')]), { failing: { items: [], hash: 'unknown' } });
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

// THE THIRD ANSWER. Skipping cancelled runs is right; skipping without a floor is what let this
// gate quote a month-old run as the present tense on 2026-09-04. `stale` is how it says so.
test('a verdict buried under too many unjudged runs is stale, not green', () => {
  const runs = [
    ...Array.from({ length: STALE_AFTER_SKIPPED }, (_, i) => run(100 + i, 'cancelled')),
    run(50, 'success'),
  ];
  const health = assess(runs);
  assert.equal(health.state, 'stale');
  assert.equal(health.skipped, STALE_AFTER_SKIPPED);
  assert.equal(health.tooBuried, true);
});

test('one or two cancelled runs on top of a green is still green', () => {
  // The ordinary bad patch. Staleness must not fire on it, or the honest answer becomes noise
  // and stops being read - the same failure mode as the 27 red-main emails.
  const health = assess([run(3, 'cancelled'), run(2, 'cancelled'), run(1, 'success')]);
  assert.equal(health.state, 'green');
  assert.equal(health.skipped, 2);
});

test('a green verdict older than the window is stale however few runs sit on it', () => {
  const health = assess([run(1, 'success', { createdAt: '2026-08-28T00:00:00Z' })], {
    now: Date.parse('2026-08-28T00:00:00Z') + (STALE_AFTER_HOURS + 1) * 3_600_000,
  });
  assert.equal(health.state, 'stale');
  assert.equal(health.tooOld, true);
  assert.equal(health.tooBuried, false);
});

test('THE 2026-09-04 CASE: a month-old green under a full window of cancels is not a green', () => {
  // Exactly what happened. `gh run list --limit 30` came back holding nothing but cancelled runs
  // and one settled run from 2026-08-05, and this gate answered "main is green" quoting it.
  const runs = [
    ...Array.from({ length: 29 }, (_, i) => run(200 + i, 'cancelled', { createdAt: '2026-09-03T20:00:00Z' })),
    run(1, 'success', { createdAt: '2026-08-05T00:53:14Z' }),
  ];
  const health = assess(runs, { now: Date.parse('2026-09-04T05:45:00Z') });
  assert.equal(health.state, 'stale');
  const plan = planMainHealth(health, { now: Date.parse('2026-09-04T05:45:00Z') });
  // It still lands - this gate stops a RED main, never an unclear one - but it must not say green.
  assert.equal(plan.action, 'proceed');
  assert.match(plan.message, /no RECENT verdict/);
  assert.ok(!/^main is green/.test(plan.message), 'a month-old run must never be reported as green');
});

test('a RED verdict is never downgraded by age or by runs piling up behind it', () => {
  // An unattended red main is precisely where cancels accumulate. Staling the red there would
  // make the alarm quietest when the problem is worst.
  const runs = [
    ...Array.from({ length: 20 }, (_, i) => run(300 + i, 'cancelled', { createdAt: '2026-09-03T20:00:00Z' })),
    run(1, 'failure', { createdAt: '2026-08-05T00:53:14Z' }),
  ];
  const health = assess(runs, { now: Date.parse('2026-09-04T05:45:00Z') });
  assert.equal(health.state, 'red');
  assert.equal(planMainHealth(health).action, 'refuse');
});

test('a green says how old it is and how much is unjudged, before either matters', () => {
  const health = assess([run(3, 'cancelled'), run(2, 'success', { createdAt: '2026-08-28T18:43:00Z' })]);
  const message = planMainHealth(health, { now: NOW }).message;
  assert.match(message, /^main is green/);
  assert.match(message, /2 h ago/);
  assert.match(message, /1 newer run unjudged/);
});
