// The relay is the channel the contract's relay rule never had. What is pinned: a written report
// reads back UNREAD until it is read, reading flips every marker so a re-check passes, the branch
// name flattens to one file, and an empty or missing relay is not "pending" (so it never blocks a
// branch nobody relayed anything to).
import assert from 'node:assert/strict';
import test from 'node:test';

import { hasUnread, markRead, relayFileName } from './relay.mjs';

const NOW = Date.parse('2026-09-05T10:00:00Z');

test('relayFileName flattens a branch path to one file', () => {
  assert.equal(relayFileName('claude/k-thing'), 'claude-k-thing.md');
  assert.equal(relayFileName('claude\\weird\\name'), 'claude-weird-name.md');
});

test('a freshly written block is UNREAD; an empty or missing relay is not pending', () => {
  const block = `## relay 2026-09-05T10:00:00.000Z from review - UNREAD\n\nthe numbers are 2x too high\n\n`;
  assert.equal(hasUnread(block), true);
  assert.equal(hasUnread(''), false);
  assert.equal(hasUnread(null), false);
});

test('read flips every UNREAD marker to a read stamp, and a re-check is no longer pending', () => {
  const two = `## relay 2026-09-05T09:00:00.000Z from review - UNREAD\n\nfirst\n\n`
    + `## relay 2026-09-05T09:30:00.000Z from codex - UNREAD\n\nsecond\n\n`;
  assert.equal(hasUnread(two), true);
  const read = markRead(two, NOW);
  assert.ok(read.includes('from review - read 2026-09-05T10:00:00.000Z'));
  assert.ok(read.includes('from codex - read 2026-09-05T10:00:00.000Z'));
  assert.equal(hasUnread(read), false);
  // A file with nothing unread returns null from markRead - nothing to rewrite.
  assert.equal(markRead(read, NOW), null);
});

test('the message body is never mistaken for a marker', () => {
  // A body that literally contains the word UNREAD in prose must not read as an unread heading.
  const block = `## relay 2026-09-05T10:00:00.000Z from review - read 2026-09-05T10:05:00.000Z\n\nI left this UNREAD earlier but it is handled\n\n`;
  assert.equal(hasUnread(block), false);
});
