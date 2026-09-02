// The handoff drain's guard: the plan's `## Handoffs` lines are parsed in the shapes a planner
// actually writes, an unmentioned file reads as UNCLASSIFIED, and a deferred file past the
// graduate-or-die line is flagged rather than forgotten.
import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFERRED_STALE_DAYS, drain, formatDrain, parseHandoffSection } from './handoff-drain.mjs';

const NOW = Date.parse('2026-09-02T12:00:00');
const DAY = 86_400_000;

const PLAN = `# Wave plan - 2026-09-02 day wave

## Wave table

| L | goal | START |
|---|---|---|
| A | thing | now |

## Handoffs

- consumed: 2026-09-01-a-thing.md -> row A
- spent: \`docs/handoffs/2026-09-01-d-thing.md\` - items traced: the rule landed in prompts.md (c9ff21a5)
* deferred: 2026-08-20-n-thing.md - needs a real renderer round
- owner: 2026-09-02-x-thing.md -> needs-you item 2
- nonsense: 2026-09-02-y.md
- consumed 2026-09-02-z.md (no colon, not a classification)

## Prompts
- consumed: 2026-09-02-q.md (outside the section, ignored)
`;

test('parseHandoffSection reads the four classes in the shapes planners write', () => {
  const classified = parseHandoffSection(PLAN);
  assert.equal(classified.get('2026-09-01-a-thing.md').cls, 'consumed');
  assert.equal(classified.get('2026-09-01-a-thing.md').trace, 'row A');
  assert.equal(classified.get('2026-09-01-d-thing.md').cls, 'spent');
  assert.match(classified.get('2026-09-01-d-thing.md').trace, /items traced/);
  assert.equal(classified.get('2026-08-20-n-thing.md').cls, 'deferred');
  assert.equal(classified.get('2026-09-02-x-thing.md').cls, 'owner');
  assert.ok(!classified.has('2026-09-02-y.md'));
  assert.ok(!classified.has('2026-09-02-z.md'));
  assert.ok(!classified.has('2026-09-02-q.md'));
});

test('drain flags the unclassified and the stale-deferred, and ages from the filename date', () => {
  const files = [
    { name: '2026-09-01-a-thing.md', at: NOW - DAY },
    { name: '2026-08-20-n-thing.md', at: NOW - 13 * DAY },
    { name: '2026-09-02-w-thing.md', at: NOW },
  ];
  const rows = drain(files, parseHandoffSection(PLAN), { now: NOW });
  assert.deepEqual(rows.map((row) => [row.name, row.cls, row.flag, row.ageDays]), [
    ['2026-09-01-a-thing.md', 'consumed', null, 1],
    ['2026-08-20-n-thing.md', 'deferred', 'STALE-DEFERRED', 13],
    ['2026-09-02-w-thing.md', null, 'UNCLASSIFIED', 0],
  ]);
  assert.ok(DEFERRED_STALE_DAYS < 13);
});

test('formatDrain says how many files the plan still owes a line', () => {
  const rows = drain([{ name: '2026-09-02-w-thing.md', at: NOW }], new Map(), { now: NOW });
  const lines = formatDrain(rows, null);
  assert.match(lines[0], /no fresh wave plan/);
  assert.match(lines[1], /UNCLASSIFIED\s+0d\s+2026-09-02-w-thing\.md/);
  assert.match(lines[2], /1 file\(s\) unclassified/);
  assert.match(formatDrain([], null)[0], /nothing to drain/);
});
