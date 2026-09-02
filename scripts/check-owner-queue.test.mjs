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
import { auditOwnerQueueItem, KINDS, QUEUE_DIR } from './check-owner-queue.mjs';

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
// would red-gate a build for a line those prompts never saw.
test('the three original kinds still pass, and the two new ones are known', () => {
  for (const kind of ['walk', 'owner-action', 'hardware', 'walk-p', 'agent']) {
    assert.ok(KINDS.includes(kind), `kind '${kind}' must stay in the vocabulary`);
  }
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
