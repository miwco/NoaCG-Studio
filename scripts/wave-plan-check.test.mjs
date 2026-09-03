// The wave plan check's guard: a plan in the contract's shape passes, and each shape the contract
// forbids produces its own named problem - a missing pool, a duplicate mint, a path that does not
// exist, a prompt that does not end on QUEUE, an unclassified handoff, an unmentioned owner ask.
import assert from 'node:assert/strict';
import test from 'node:test';

import { checkPlan, economyNotes, parsePromptBlocks, parseWaveTable, touchProblems } from './wave-plan-check.mjs';

const NOW = Date.parse('2026-09-02T12:00:00');
const FILES = new Set(['src/a.ts', 'src/b.ts', 'scripts/x.mjs', 'docs/SVG_AUTHORING.md', 'src/components/wizard', 'e2e/import.spec.ts']);
const exists = (relative) => FILES.has(relative);

const GOOD = `# Wave plan - 2026-09-02 night wave

Pools at plan time: Codex weekly 64% (snapshot 07:33), agy pools available, Opus ample.

## Wave table

| L | goal | START | TOUCHES | MINTS | POOL | browser |
|---|---|---|---|---|---|---|
| A | thing one | now | src/a.ts, e2e/import.spec.ts | scripts/e2e-lists.mjs (new) | opus | yes |
| B | thing two | on slot free | src/b.ts, src/components/wizard/**, docs/NEW_THING.md (new) | - | agy-gemini + opus | no |
| C | follow-on | on claude/a-thing landing | scripts/x.mjs | migration 0055 | opus | no |

## Handoffs

- consumed: 2026-09-01-a-thing.md -> row A
- spent: 2026-09-01-d-thing.md - traced to c9ff21a5

Owner receipts: agents-md-byte-headroom is held for the next wave (lands alone).

## Prompts

\`\`\`
SESSION A - thing one
BRANCH claude/a-thing
MODEL  opus high - design judgement
START  now
TOUCHES src/a.ts
GOAL   done means x.
DO     1. do it.
GATE   npm run build
QUEUE  1. /check; 2. handoff; 3. /queue-merge last.
\`\`\`

\`\`\`
SESSION B - thing two
BRANCH claude/b-thing
MODEL  opus medium - the doing is delegated to agy-gemini, fallback opus
DO     1. delegate; 2. re-derive.
QUEUE  1. /check; 2. handoff; 3. /queue-merge last.
\`\`\`

\`\`\`
SESSION C - follow-on
BRANCH claude/c-thing
DO     1. thing.
QUEUE  last.
\`\`\`
`;

const handoffs = [
  { name: '2026-09-01-a-thing.md', at: NOW },
  { name: '2026-09-01-d-thing.md', at: NOW },
];
const receipts = [{ receipt: true, slug: 'agents-md-byte-headroom', state: 'unstarted', ageDays: 1 }];

test('a plan in the contract shape passes', () => {
  const verdict = checkPlan(GOOD, { exists, handoffs, receipts, now: NOW });
  assert.deepEqual(verdict.problems, []);
  assert.equal(verdict.rows, 3);
  assert.deepEqual(verdict.pools, ['opus', 'agy-gemini']);
});

test('parseWaveTable accepts # or L as the letter column and names a missing column', () => {
  const { rows, problems } = parseWaveTable('## Wave table\n\n| # | goal | START | TOUCHES | MINTS | browser |\n|---|---|---|---|---|---|\n| A | g | now | src/a.ts | - | no |\n');
  assert.equal(rows[0].letter, 'A');
  assert.deepEqual(problems, ['the wave table lacks a POOL column']);
  assert.deepEqual(parseWaveTable('# nothing here').problems, ['no "## Wave table" heading']);
  // The heading may be worded the way the core names section 1, and header cells may be bold.
  const worded = parseWaveTable('## 1. The wave table\n\n| **L** | **goal** | **START** | **TOUCHES** | **MINTS** | **POOL** | **browser** |\n|---|---|---|---|---|---|---|\n| A | g | now | src/a.ts | none | opus | no |\n');
  assert.deepEqual(worded.problems, []);
  assert.equal(worded.rows[0].pool, 'opus');
});

test('a shell comment inside a prompt does not end the block, and "none" mints nothing', () => {
  const plan = GOOD
    .replace('GATE   npm run build\nQUEUE  1. /check; 2. handoff; 3. /queue-merge last.', 'GATE   npm run build\n# a comment line in the prompt\nQUEUE  1. /check; 2. handoff; 3. /queue-merge last.')
    .replace('| B | thing two | on slot free | src/b.ts, src/components/wizard/**, docs/NEW_THING.md (new) | - |', '| B | thing two | on slot free | src/b.ts, src/components/wizard/**, docs/NEW_THING.md (new) | none |')
    .replace('| C | follow-on | on claude/a-thing landing | scripts/x.mjs | migration 0055 |', '| C | follow-on | on claude/a-thing landing | scripts/x.mjs | n/a |');
  const { problems } = checkPlan(plan, { exists, handoffs, receipts, now: NOW });
  assert.deepEqual(problems, []);
});

test('parsePromptBlocks keys blocks by letter and records the last keyword', () => {
  const blocks = parsePromptBlocks(GOOD);
  assert.deepEqual([...blocks.keys()], ['A', 'B', 'C']);
  assert.equal(blocks.get('A').lastKey, 'QUEUE');
  assert.match(blocks.get('B').text, /fallback opus/);
});

test('touchProblems checks paths and globs, and skips free text and (new)', () => {
  const row = { letter: 'Z', touches: 'src/a.ts, src/missing.ts, src/components/wizard/**, docs/gone/**, the AGENTS.md chain, docs/X.md (new)' };
  assert.deepEqual(touchProblems(row, exists), [
    'row Z: TOUCHES names src/missing.ts, which does not exist (mark it (new) if the row creates it)',
    'row Z: TOUCHES names docs/gone/**, which does not exist (mark it (new) if the row creates it)',
  ]);
});

test('each forbidden shape is its own named problem', () => {
  const broken = GOOD
    .replace('| A | thing one | now | src/a.ts, e2e/import.spec.ts | scripts/e2e-lists.mjs (new) | opus | yes |',
      '| A | thing one | wait for B | src/a.ts, src/nope.ts | migration 0055 |  | yes |')
    .replace('| B | thing two | on slot free | src/b.ts, src/components/wizard/**, docs/NEW_THING.md (new) | - | agy-gemini + opus | no |',
      '| B | thing two | on slot free | src/b.ts | - | codex | no |')
    .replace('MODEL  opus medium - the doing is delegated to agy-gemini, fallback opus', 'MODEL  codex high')
    .replace('QUEUE  1. /check; 2. handoff; 3. /queue-merge last.\n```\n\n```\nSESSION C', 'QUEUE  1. /check; 2. handoff.\nGATE   npm run build\n```\n\n```\nSESSION C')
    .replace('Pools at plan time: Codex weekly 64% (snapshot 07:33), agy pools available, Opus ample.', '')
    .replace('- spent: 2026-09-01-d-thing.md - traced to c9ff21a5', '')
    .replace('Owner receipts: agents-md-byte-headroom is held for the next wave (lands alone).', '');
  const { problems } = checkPlan(broken, { exists, handoffs, receipts, now: NOW });
  const expect = (pattern) => assert.ok(problems.some((p) => pattern.test(p)), `missing problem ${pattern}\n${problems.join('\n')}`);
  expect(/row A: START must be/);
  expect(/row A: no POOL/);
  expect(/rows A and C both mint migration 0055/);
  expect(/row A: TOUCHES names src\/nope\.ts/);
  expect(/row B: a non-Claude pool must name its fallback/);
  expect(/row B: the prompt's last keyword line is GATE, not QUEUE/);
  expect(/no "Pools at plan time:" line/);
  expect(/handoff 2026-09-01-d-thing\.md is not classified/);
  expect(/unstarted owner receipt agents-md-byte-headroom/);
});

test('a prompt block without a row, and a row without a block, are both problems', () => {
  const noBlock = GOOD.replace('SESSION C - follow-on', 'SESSION D - stray');
  const { problems } = checkPlan(noBlock, { exists, handoffs, receipts, now: NOW });
  assert.ok(problems.some((p) => /row C: no prompt block/.test(p)));
  assert.ok(problems.some((p) => /prompt block SESSION D has no wave-table row/.test(p)));
});

test('economy notes name Codex headroom left idle, and a Claude percentage that cannot exist', () => {
  const rows = (...pools) => pools.map((pool) => ({ pool, raw: '' }));
  // The GOOD plan: Codex weekly 64% and no codex row - a note, never a problem.
  const good = checkPlan(GOOD, { exists, handoffs: [], receipts: [], now: NOW });
  assert.equal(good.problems.length, 0);
  assert.equal(good.notes.length, 1);
  assert.match(good.notes[0], /no row names the codex pool/);

  // A codex row silences it; so does the invocation saying Codex is off limits this wave.
  assert.deepEqual(economyNotes('Pools at plan time: Codex weekly 64%, agy ample.', rows('opus', 'codex + opus')), []);
  assert.deepEqual(economyNotes('Pools at plan time: Codex is off limits this wave (owner), agy ample.', rows('opus')), []);
  assert.deepEqual(economyNotes('Pools at plan time: Codex UNKNOWN (no snapshot), agy ample.', rows('opus')), [], 'unknown routes like low and is not headroom');
  assert.deepEqual(economyNotes('Pools at plan time: Codex weekly 96%, 5-hour 80%.', rows('opus')), [], 'a nearly spent week is not headroom');
  assert.equal(economyNotes('Pools at plan time: Codex headroom (weekly 40%).', rows('opus')).length, 1);

  // The 2026-09-03 day plan, as written: Codex's meter attributed to Claude, and no codex row.
  const misread = 'Pools at plan time: Claude 5-hour window 0% used (resets 11:19Z), weekly 64% with 4 days left - Antigravity both pools idle.';
  const notes = economyNotes(misread, rows('opus', 'opus + agy-gemini'));
  assert.equal(notes.length, 2);
  assert.match(notes[0], /Claude Code publishes no rate limit/);
  assert.match(notes[1], /no row names the codex pool/);

  // A line that names Codex's percentage as Codex's is read correctly.
  assert.deepEqual(economyNotes('Pools at plan time: Codex weekly 64%; Claude has no meter.', rows('codex')), []);
  // No snapshot line at all is the plan check's own problem, not a note.
  assert.deepEqual(economyNotes('## Wave table', rows('opus')), []);
});
