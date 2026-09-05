// The candidates evaluator turns the planner's ordered list into one launch pick. What is pinned:
// the table parses into files/specs/size, the pick respects the planner's order, a collision or a
// size that no longer fits is held, and a top unit that does not fit falls through to a smaller one.
import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluate, parseCandidates } from './candidates.mjs';

const TABLE = `# Wave plan

Window ends: 2026-09-05T07:00:00+03:00

## Candidates

| L | size | serves | TOUCHES | SPECS | goal |
|---|---|---|---|---|---|
| M | standard | NOW | src/big.ts, src/big2.ts | big.spec.ts | the big one |
| N | small | P6 | src/small.ts | - | the small one |
| P | small | NOW | src/other.ts | e2e/other.spec.ts | another small |
`;

test('parseCandidates reads letter, size, serves, files and specs from the table', () => {
  const rows = parseCandidates(TABLE);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], { letter: 'M', size: 'standard', serves: 'NOW', files: ['src/big.ts', 'src/big2.ts'], specs: ['big.spec.ts'], goal: 'the big one' });
  assert.deepEqual(rows[1].files, ['src/small.ts']);
  assert.deepEqual(rows[1].specs, []); // the "-" cell is empty
  assert.deepEqual(rows[2].specs, ['other.spec.ts']); // the e2e/ prefix is stripped
});

test('no Candidates section parses to nothing', () => {
  assert.deepEqual(parseCandidates('# Plan\n\nno table here\n'), []);
});

const durations = { small: { n: 6, p90: 70 }, standard: { n: 6, p90: 200 }, large: { n: 0, p90: null } };
const latency = { gate: { n: 10, p90: 12 }, wait: { n: 10, p90: 6 } };

test('with room for everything the pick is the first candidate in the planner\'s order', () => {
  const { pick } = evaluate(parseCandidates(TABLE), { entries: [], durations, latency, remainingMin: 300 });
  assert.equal(pick.letter, 'M'); // standard needs 200+12+6+30=248 <= 300
});

test('a top unit that no longer fits falls through to a smaller one that does', () => {
  // 150 min: standard needs 248 (no), small needs 70+12+6+30=118 (yes).
  const { pick, results } = evaluate(parseCandidates(TABLE), { entries: [], durations, latency, remainingMin: 150 });
  assert.equal(results[0].verdict, 'HOLD');
  assert.match(results[0].reason, /no longer fits/);
  assert.equal(pick.letter, 'N'); // the first small one in order
});

test('a candidate that collides with a running row is held', () => {
  // A running row is editing src/big.ts, so M collides; N and P are disjoint, N is first and fits.
  const entries = [{ branch: 'claude/x', files: ['src/big.ts'] }];
  const { pick, results } = evaluate(parseCandidates(TABLE), { entries, durations, latency, remainingMin: 300 });
  assert.equal(results[0].verdict, 'HOLD');
  assert.match(results[0].reason, /collides with claude\/x/);
  assert.equal(pick.letter, 'N');
});

test('when nothing is clear and fitting, there is no pick', () => {
  // 30 min: nothing fits at all.
  const { pick } = evaluate(parseCandidates(TABLE), { entries: [], durations, latency, remainingMin: 30 });
  assert.equal(pick, null);
});
