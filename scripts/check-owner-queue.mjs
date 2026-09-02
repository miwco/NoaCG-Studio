#!/usr/bin/env node
// THE OWNER QUEUE'S TWO KEYS, AND THIS IS WHAT KEEPS THEM THERE.
//
//   node scripts/check-owner-queue.mjs        # part of `npm run build`
//
// `docs/acceptance/OWNER_QUEUE.md` ("The shape of an item") says every file under
// `docs/acceptance/owner-queue/` opens with front matter carrying `kind:` (walk | owner-action |
// hardware) and `date:`. `.agent-workflows/walk.md` step 1 reads those two keys to sort the
// queue newest-first, filter it (`/walk hardware`) and skip `done: true` items. On 2026-09-02,
// 30 of 59 files carried neither key, so more than half the queue could not be sorted or
// filtered by the mechanism its own contract describes - the documented shape was untrue, and
// nothing said so.
//
// Narrow on purpose: this checks only that the two keys are present and that `kind:` is a value
// `/walk` understands. It does not check the route, the "what to look at" line, or anything else
// the shape doc describes - so a red here always has a one-line fix: add the missing key, or
// correct the kind.
//
// Reuses parseFrontmatter from scripts/owner-receipts.mjs, the one front-matter parser for the
// repo's own markdown, rather than writing a second one.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './owner-receipts.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

export const QUEUE_DIR = 'docs/acceptance/owner-queue';

/** The kinds `.agent-workflows/walk.md` and `docs/acceptance/OWNER_QUEUE.md` both know about. */
export const KINDS = Object.freeze(['walk', 'owner-action', 'hardware']);

/** True only when this file was RUN, not imported - the same guard the other checks carry. */
const isEntrypoint =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]).replaceAll('\\', '/').toLowerCase() ===
    path.resolve(fileURLToPath(import.meta.url)).replaceAll('\\', '/').toLowerCase();

/**
 * One item's problems, or `[]` when it is fine. Pure, so the rule is testable with literal text
 * rather than fixture files on disk.
 *
 * @param {string} text  the file's full content
 * @returns {string[]}
 */
export function auditOwnerQueueItem(text) {
  const parsed = parseFrontmatter(text);
  if (!parsed) return ['missing front matter (kind: and date:)'];
  const { data } = parsed;
  const problems = [];
  if (!data.kind) problems.push('missing kind:');
  else if (!KINDS.includes(data.kind)) problems.push(`kind: '${data.kind}' is not one of ${KINDS.join(', ')}`);
  if (!data.date) problems.push('missing date:');
  return problems;
}

function main() {
  const dir = path.join(ROOT, ...QUEUE_DIR.split('/'));
  let names;
  try {
    names = readdirSync(dir).filter((name) => name.endsWith('.md')).sort();
  } catch (error) {
    if (error.code === 'ENOENT') {
      // An empty or missing queue is a real answer, not a failure - "no open item" is exactly
      // what OWNER_QUEUE.md says the absence of a file means.
      console.log(`check-owner-queue: OK - ${QUEUE_DIR} does not exist (nothing queued).`);
      return 0;
    }
    console.error(`Cannot read ${QUEUE_DIR}: ${error.message}`);
    return 1;
  }

  const failures = [];
  for (const name of names) {
    const text = readFileSync(path.join(dir, name), 'utf8');
    for (const problem of auditOwnerQueueItem(text)) {
      failures.push(`${QUEUE_DIR}/${name}: ${problem}`);
    }
  }

  if (failures.length > 0) {
    console.error(`\ncheck-owner-queue: ${failures.length} problem(s) across ${names.length} file(s):\n`);
    for (const failure of failures) console.error(`  - ${failure}`);
    console.error('\nAdd the missing key(s), or fix the kind. See docs/acceptance/OWNER_QUEUE.md, "The shape of an item".\n');
    return 1;
  }

  console.log(`check-owner-queue: OK - ${names.length} item(s), all carry kind: and date:.`);
  return 0;
}

if (isEntrypoint) process.exit(main());
