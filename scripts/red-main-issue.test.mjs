// The dedup that must never become a silence. Both halves of the owner's constraint, stated on
// 2026-08-29, are asserted here: repeats of a reported problem stop arriving, and anything new -
// including anything this gate could not classify - always speaks up.

import assert from 'node:assert/strict';
import test from 'node:test';

import { issueBody, marker, planRedMainComment } from './red-main-issue.mjs';

const HASH = 'abc123def456';
const OTHER = '0f0f0f0f0f0f';
const SHA = 'a'.repeat(40);

test('the first red-main run files the issue', () => {
  const decision = planRedMainComment({ existing: null, sha: SHA, hash: HASH });
  assert.equal(decision.action, 'create');
});

test('a repeat of the SAME failure set comments nothing', () => {
  // The whole point: 27 identical reports of e2e/anim-engine.spec.ts across 25 runs, because each
  // landing was a new commit and the old rule deduped on the commit.
  const decision = planRedMainComment({
    existing: 12,
    bodies: ['first report', `Still red. ${marker(HASH)}`],
    sha: SHA,
    hash: HASH,
  });
  assert.equal(decision.action, 'withhold');
  assert.match(decision.reason, /still red/i);
});

test('a NEW spec alongside the familiar one always comments', () => {
  const decision = planRedMainComment({
    existing: 12,
    bodies: [`report ${marker(HASH)}`],
    sha: SHA,
    hash: OTHER,
  });
  assert.equal(decision.action, 'comment');
});

test('an UNKNOWN failure set always comments - never dedups, not even against another unknown', () => {
  const decision = planRedMainComment({
    existing: 12,
    bodies: [`report ${marker('unknown')}`],
    sha: SHA,
    hash: 'unknown',
  });
  assert.equal(decision.action, 'comment');
  assert.match(decision.reason, /could not be identified/);
});

test('only the LATEST word dedups - a set that comes back after something else is news again', () => {
  const decision = planRedMainComment({
    existing: 12,
    bodies: [`first ${marker(HASH)}`, `second ${marker(OTHER)}`],
    sha: SHA,
    hash: HASH,
  });
  assert.equal(decision.action, 'comment');
});

test('the OLD refusal is kept: a re-run of an already-reported commit stays silent', () => {
  // Not weakened by the new rule, and checked FIRST: the same commit failing again is the same
  // event, whatever it failed on.
  const decision = planRedMainComment({
    existing: 12,
    bodies: [`Commit ${SHA} failed CI ${marker(OTHER)}`],
    sha: SHA,
    hash: HASH,
  });
  assert.equal(decision.action, 'withhold');
  assert.match(decision.reason, new RegExp(SHA));
});

test('a fresh issue with no comments yet still dedups against its own body', () => {
  const decision = planRedMainComment({ existing: 12, bodies: [`opened ${marker(HASH)}`], sha: 'b'.repeat(40), hash: HASH });
  assert.equal(decision.action, 'withhold');
});

test('an issue whose bodies could not be read comments rather than assuming silence', () => {
  const decision = planRedMainComment({ existing: 12, bodies: [], sha: SHA, hash: HASH });
  assert.equal(decision.action, 'comment');
});

test('the body names the failing specs and carries the marker the next run reads', () => {
  const body = issueBody({ sha: SHA, runUrl: 'https://example.invalid/1', items: ['e2e/anim-engine.spec.ts'], hash: HASH });
  assert.match(body, /e2e\/anim-engine\.spec\.ts/);
  assert.match(body, new RegExp(SHA));
  assert.ok(body.includes(marker(HASH)));
  // The marker the body carries must be the one a later run's dedup looks for - if these two ever
  // drift, every run comments for ever and the fix silently stops working.
  assert.equal(
    planRedMainComment({ existing: 1, bodies: [body], sha: 'c'.repeat(40), hash: HASH }).action,
    'withhold',
  );
});
