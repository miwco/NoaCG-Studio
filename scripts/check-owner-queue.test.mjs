// The owner-queue front-matter gate's RULES, pinned - for the same reason `scripts/check-docs-
// index.test.mjs` pins its own: every failure mode here is silent by construction. A gate that
// reports OK over an item missing `kind:`/`date:` is indistinguishable from a complete one, and
// the whole point of the two keys is that `/walk` cannot sort or filter without them.
//
// `auditOwnerQueueItem` is pure, so the rules are driven with literal file text - no owner-queue
// directory, no fixtures on disk.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { auditOwnerQueueItem, KINDS, NEEDS, QUEUE_DIR, SERVES } from './check-owner-queue.mjs';

test('a file with no front matter at all fails', () => {
  const problems = auditOwnerQueueItem('# A title\n\nSome body text.\n');
  assert.deepEqual(problems, ['missing front matter (kind: and date:)']);
});

test('a file with both keys, a known kind, passes clean', () => {
  const text = '---\nkind: walk\ndate: 2026-08-27\n---\n# A title\n\nBody.\n';
  assert.deepEqual(auditOwnerQueueItem(text), []);
});

for (const kind of KINDS) {
  test(`kind: ${kind} is accepted`, () => {
    const text = `---\nkind: ${kind}\ndate: 2026-08-27\n---\n# A title\n`;
    assert.deepEqual(auditOwnerQueueItem(text), []);
  });
}

test('front matter present but missing kind: is reported', () => {
  const text = '---\ndate: 2026-08-27\n---\n# A title\n';
  assert.deepEqual(auditOwnerQueueItem(text), ['missing kind:']);
});

test('front matter present but missing date: is reported', () => {
  const text = '---\nkind: walk\n---\n# A title\n';
  assert.deepEqual(auditOwnerQueueItem(text), ['missing date:']);
});

test('an unrecognised kind is reported by name', () => {
  const text = '---\nkind: tooling\ndate: 2026-08-27\n---\n# A title\n';
  // The expected message is built from KINDS rather than typed out, so widening the vocabulary
  // does not require editing a literal in two places - the point of this test is that an unknown
  // value is named and the legal set is printed, not what the legal set happens to be today.
  assert.deepEqual(auditOwnerQueueItem(text), [`kind: 'tooling' is not one of ${KINDS.join(', ')}`]);
});

// The 2026-09-02 widening added `walk-p` and `agent`. It must stay a WIDENING: seven sibling
// sessions were filing items against the older three values while it landed, so dropping one
// would red-gate a build for a line those prompts never saw. Driven through the rule rather than
// through `KINDS.includes`, so narrowing the vocabulary fails HERE and not only in a loop that
// reads the same list it is checking.
for (const kind of ['walk', 'owner-action', 'hardware', 'walk-p', 'agent']) {
  test(`the widened vocabulary still accepts kind: ${kind}`, () => {
    assert.deepEqual(auditOwnerQueueItem(`---\nkind: ${kind}\ndate: 2026-09-02\n---\n# T\n`), []);
  });
}

// `serves:` is the priority mechanism, and its failure mode is silent by construction: a misspelt
// value sorts the item last and nothing reads wrong. These pin that the key is OPTIONAL and that
// the only accepted value is the one the contract documents.
test('an item with no serves: key passes - the key is optional', () => {
  assert.deepEqual(auditOwnerQueueItem('---\nkind: walk\ndate: 2026-09-02\n---\n# T\n'), []);
});

test(`serves: ${SERVES} passes`, () => {
  assert.deepEqual(auditOwnerQueueItem(`---\nkind: walk\ndate: 2026-09-02\nserves: ${SERVES}\n---\n# T\n`), []);
});

test('a misspelt serves: value is reported rather than silently sorting last', () => {
  const problems = auditOwnerQueueItem('---\nkind: walk\ndate: 2026-09-02\nserves: NOW\n---\n# T\n');
  assert.equal(problems.length, 1);
  assert.match(problems[0], /^serves: 'NOW' is not 'now'/);
});

test('both keys missing reports both', () => {
  const text = '---\nother: value\n---\n# A title\n';
  assert.deepEqual(auditOwnerQueueItem(text), ['missing kind:', 'missing date:']);
});

// The gate has to be true of the REAL directory, not only of literals - otherwise it can pass
// its unit tests while the build check it backs is broken.
test('every real file under docs/acceptance/owner-queue/ carries kind: and date:', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const dir = `${root}${QUEUE_DIR}`;
  // A missing directory is the same "nothing queued" pass main() reports, not a test failure -
  // the gate and this test must not disagree on that edge case.
  let names;
  try {
    names = readdirSync(dir).filter((name) => name.endsWith('.md'));
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  const failures = names.flatMap((name) => {
    const text = readFileSync(`${dir}/${name}`, 'utf8');
    return auditOwnerQueueItem(text).map((problem) => `${name}: ${problem}`);
  });
  assert.deepEqual(failures, []);
});

// --- `needs:` - WHY an owner-action item is his (owner ruling, 2026-09-04) ---
// A technical problem is never his, so `owner-action` has to name which of four real reasons it
// is. These pin both directions: the reason is required where it applies, it is refused where it
// does not, and it is date-gated so an item filed before the rule existed still reads clean.

test('an owner-action item filed after the rule must name a reason', () => {
  const text = '---\nkind: owner-action\ndate: 2026-09-05\n---\n# A title\n';
  const problems = auditOwnerQueueItem(text);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /needs a reason/);
  assert.match(problems[0], /it is not an owner action: do the work instead/);
});

for (const needs of NEEDS) {
  test(`needs: ${needs} satisfies an owner-action item`, () => {
    const text = `---\nkind: owner-action\ndate: 2026-09-05\nneeds: ${needs}\n---\n# A title\n`;
    assert.deepEqual(auditOwnerQueueItem(text), []);
  });
}

test('an owner-action item filed BEFORE the rule is left alone', () => {
  const text = '---\nkind: owner-action\ndate: 2026-08-29\n---\n# A title\n';
  assert.deepEqual(auditOwnerQueueItem(text), []);
});

test('a reason outside the closed set is refused, at any date', () => {
  const text = '---\nkind: owner-action\ndate: 2026-08-29\nneeds: decision\n---\n# A title\n';
  const problems = auditOwnerQueueItem(text);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /needs: 'decision' is not one of account, money, identity, harness/);
});

test('a reason on a walk item is refused - that is the wrong kind dressed up', () => {
  const text = '---\nkind: walk\ndate: 2026-09-05\nneeds: account\n---\n# A title\n';
  const problems = auditOwnerQueueItem(text);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /only belongs on kind: owner-action/);
});

test('the date gate compares dates, not string length or arrival order', () => {
  const before = '---\nkind: owner-action\ndate: 2026-09-04\n---\n# A title\n';
  const on = '---\nkind: owner-action\ndate: 2026-09-05\n---\n# A title\n';
  const after = '---\nkind: owner-action\ndate: 2026-12-31\n---\n# A title\n';
  assert.deepEqual(auditOwnerQueueItem(before), []);
  assert.equal(auditOwnerQueueItem(on).length, 1);
  assert.equal(auditOwnerQueueItem(after).length, 1);
});
