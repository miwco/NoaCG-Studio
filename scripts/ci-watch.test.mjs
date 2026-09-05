// The CI watch is the Monitor contract applied to GitHub: one line per red run, once per run id,
// nothing on a quiet poll, a cancelled run is not a verdict, reds already old at arming are
// history, main turning green after a red is an event, and a failed poll speaks up once.
import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_EVERY_SECONDS, baseline, errorLines, parseArgs, redLine, step } from './ci-watch.mjs';

const T0 = Date.parse('2026-09-05T20:00:00Z');
const minutes = (n) => new Date(T0 - n * 60_000).toISOString();

function run(id, over = {}) {
  return {
    databaseId: id,
    status: 'completed',
    conclusion: 'success',
    headBranch: 'claude/x',
    headSha: `${id}abcdef0123456789`,
    name: 'CI',
    workflowName: 'CI',
    url: `https://github.com/o/r/actions/runs/${id}`,
    createdAt: minutes(5),
    updatedAt: minutes(1),
    ...over,
  };
}

test('parseArgs defaults and refuses a too-fast interval', () => {
  assert.equal(parseArgs([]).every, DEFAULT_EVERY_SECONDS);
  assert.equal(parseArgs(['--every', '120', '--since', '0', '--limit', '10']).limit, 10);
  assert.throws(() => parseArgs(['--every', '5']), /at least 30 seconds/);
  assert.throws(() => parseArgs(['--limit', '500']), /between 1 and 100/);
  assert.throws(() => parseArgs(['--nonsense']), /unknown argument/);
});

test('the baseline treats reds older than --since as history, and recent reds as events', () => {
  const runs = [run(3, { conclusion: 'failure', updatedAt: minutes(2) }), run(2, { conclusion: 'failure', updatedAt: minutes(120) }), run(1)];
  const state = baseline(runs, { now: T0, sinceMs: 60 * 60_000 });
  const { lines } = step(state, runs);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^CI RED - CI on claude\/x \(3abcdef0\) - open the run - https:/);
});

test('a red run prints once per id, a cancelled run never, a quiet poll nothing', () => {
  const state = baseline([run(1)], { now: T0 });
  const red = run(2, { conclusion: 'failure', headBranch: 'main' });
  const cancelled = run(3, { conclusion: 'cancelled' });
  const first = step(state, [cancelled, red, run(1)], { describe: () => 'e2e/anim-engine.spec.ts' });
  assert.deepEqual(first.lines, [redLine(red, 'e2e/anim-engine.spec.ts')]);
  const again = step(first.state, [cancelled, red, run(1)]);
  assert.deepEqual(again.lines, []);
});

test('an in-flight run is not a verdict until it completes', () => {
  const state = baseline([], { now: T0 });
  const running = run(4, { status: 'in_progress', conclusion: '' });
  assert.deepEqual(step(state, [running]).lines, []);
  const failed = { ...running, status: 'completed', conclusion: 'timed_out' };
  assert.equal(step(state, [failed]).lines.length, 1);
});

test('main turning green after a red is an event; green after green is not', () => {
  const red = run(5, { conclusion: 'failure', headBranch: 'main' });
  const state = baseline([red], { now: T0, sinceMs: 0 });
  assert.equal(state.mainVerdict.get('CI').verdict, 'red');
  const green = run(6, { headBranch: 'main' });
  const flip = step(state, [green, red]);
  assert.deepEqual(flip.lines, ['CI GREEN - main is green again on CI (6abcdef0) - https://github.com/o/r/actions/runs/6']);
  assert.deepEqual(step(flip.state, [run(7, { headBranch: 'main' }), green, red]).lines, []);
});

test('a cancelled main run does not hide the last real verdict', () => {
  const red = run(8, { conclusion: 'failure', headBranch: 'main' });
  const state = baseline([red], { now: T0, sinceMs: 0 });
  const cancelled = run(9, { conclusion: 'cancelled', headBranch: 'main' });
  const next = step(state, [cancelled, red]);
  assert.deepEqual(next.lines, []);
  assert.equal(next.state.mainVerdict.get('CI').verdict, 'red');
});

test('a re-run red main run is still red until a run at least as new answers', () => {
  const red = run(10, { conclusion: 'failure', headBranch: 'main', createdAt: minutes(10) });
  const olderGreen = run(9, { headBranch: 'main', createdAt: minutes(40) });
  const state = baseline([red, olderGreen], { now: T0, sinceMs: 0 });
  // The re-run: same id, back in flight. The newest VERDICT is now the older green.
  const rerunning = { ...red, status: 'in_progress', conclusion: '' };
  const during = step(state, [rerunning, olderGreen]);
  assert.deepEqual(during.lines, []);
  assert.equal(during.state.mainVerdict.get('CI').verdict, 'red');
  // The re-run passes: same id, same createdAt, now a green verdict.
  const passed = { ...red, conclusion: 'success' };
  const after = step(during.state, [passed, olderGreen]);
  assert.deepEqual(after.lines, ['CI GREEN - main is green again on CI (10abcdef) - https://github.com/o/r/actions/runs/10']);
});

test('a failed poll prints WATCH ERROR once until gh recovers, then RECOVERED once', () => {
  assert.deepEqual(errorLines({ ok: false, error: 'gh: not logged in' }, null), ['WATCH ERROR - gh run list failed: gh: not logged in']);
  assert.deepEqual(errorLines({ ok: false, error: 'gh: not logged in' }, 'gh: not logged in'), []);
  assert.deepEqual(errorLines({ ok: true, runs: [] }, 'gh: not logged in'), ['WATCH RECOVERED - gh answers again']);
  assert.deepEqual(errorLines({ ok: true, runs: [] }, null), []);
});
