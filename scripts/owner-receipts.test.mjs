// The owner receipt's guard: a backlog file that credits the owner must carry a valid receipt, the
// receipt's states each demand the field that makes them meaningful, and the listing puts the
// oldest unstarted ask first - the one line a planner must not miss.
import assert from 'node:assert/strict';
import test from 'node:test';

import { formatReceipts, parseFrontmatter, receiptFrom, sortReceipts } from './owner-receipts.mjs';

const NOW = Date.parse('2026-09-02T12:00:00');

const receipt = (fields, body = '# A thing the owner asked for\n\n**Filed:** 2026-09-01. **Source:** owner ruling.\n\n## Why\n\nBecause.\n') =>
  `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join('\n')}\n---\n${body}`;

test('parseFrontmatter reads scalars, folded blocks and trailing comments', () => {
  const parsed = parseFrontmatter('---\nsource: owner\nstate: unstarted   # still\nasked: >-\n  make the byte budget\n  real\n---\n# T\n');
  assert.equal(parsed.data.source, 'owner');
  assert.equal(parsed.data.state, 'unstarted');
  assert.equal(parsed.data.asked, 'make the byte budget real');
  assert.equal(parsed.body, '# T\n');
  assert.equal(parseFrontmatter('# no front matter\n'), null);
});

test('a valid unstarted receipt reads back with its age', () => {
  const text = receipt({ source: 'owner', raised: '2026-08-30', state: 'unstarted', asked: 'do the thing' });
  const record = receiptFrom('do-the-thing.md', text, { now: NOW });
  assert.equal(record.receipt, true);
  assert.equal(record.slug, 'do-the-thing');
  assert.equal(record.ageDays, 3);
  assert.deepEqual(record.problems, []);
});

test('each state demands its field', () => {
  const active = receiptFrom('a.md', receipt({ source: 'owner', raised: '2026-09-01', state: 'active', asked: 'x' }), { now: NOW });
  assert.ok(active.problems.some((p) => p.startsWith('branch:')));
  const parked = receiptFrom('p.md', receipt({ source: 'owner', raised: '2026-09-01', state: 'parked', asked: 'x' }), { now: NOW });
  assert.ok(parked.problems.some((p) => p.startsWith('note:')));
  const superseded = receiptFrom('s.md', receipt({ source: 'owner', raised: '2026-09-01', state: 'superseded', asked: 'x', note: 'by y' }), { now: NOW });
  assert.deepEqual(superseded.problems, []);
  const bad = receiptFrom('b.md', receipt({ source: 'owner', raised: 'yesterday', state: 'someday' }), { now: NOW });
  assert.equal(bad.problems.length, 3);
});

test('an owner-credited file without a receipt is a problem, an ordinary file is not', () => {
  const owner = receiptFrom('no-receipt.md', '# Steer users\n\n**Filed:** 2026-08-26. **Source:** owner ruling, in session.\n', { now: NOW });
  assert.equal(owner.receipt, false);
  assert.equal(owner.problems.length, 1);
  const walk = receiptFrom('walk.md', '# The size questionnaire\n\nOwner walk 2026-08-28, on the Style step.\n', { now: NOW });
  assert.equal(walk.receipt, false);
  const plain = receiptFrom('plain.md', '# A gate idea\n\n**Filed:** 2026-08-26. **Source:** the gate that landed the same day.\n', { now: NOW });
  assert.equal(plain, null);
  const queue = receiptFrom('queue.md', '# Front matter\n\n**Source:** a measurement over `docs/acceptance/owner-queue/` files.\n', { now: NOW });
  assert.equal(queue, null);
});

test('sortReceipts puts unstarted and oldest first; formatReceipts leads with the count', () => {
  const rows = [
    receiptFrom('young.md', receipt({ source: 'owner', raised: '2026-09-01', state: 'unstarted', asked: 'y' }), { now: NOW }),
    receiptFrom('parked.md', receipt({ source: 'owner', raised: '2026-08-01', state: 'parked', asked: 'p', note: 'waits' }), { now: NOW }),
    receiptFrom('old.md', receipt({ source: 'owner', raised: '2026-08-20', state: 'unstarted', asked: 'o' }), { now: NOW }),
    receiptFrom('active.md', receipt({ source: 'owner', raised: '2026-08-25', state: 'active', asked: 'a', branch: 'claude/a' }), { now: NOW }),
  ];
  assert.deepEqual(sortReceipts(rows).map((r) => r.slug), ['old', 'young', 'active', 'parked']);
  const lines = formatReceipts(rows);
  assert.match(lines[0], /4 open, 2 unstarted/);
  assert.match(lines[1], /unstarted\s+13d\s+old/);
  assert.match(lines.join('\n'), /active\s+8d\s+active on claude\/a/);
});
