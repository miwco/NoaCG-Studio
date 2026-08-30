#!/usr/bin/env node
// THE docs/README.md MAP IS COMPLETE, AND THIS IS WHAT KEEPS IT THAT WAY.
//
//   node scripts/check-docs-index.mjs        # part of `npm run build`
//
// `docs/README.md` calls itself "the map of this directory", and a session reads it to find out
// whether a subject is already written down. On 2026-08-30 it carried 59 rows for 110 files, and
// said nothing about the gap - so a missing row read as "no doc exists", and the session either
// re-derived something already measured or wrote a second doc on the same subject. Two docs on
// one subject is how contracts start contradicting each other. A warning in the header would
// only stop the wrong inference; a list is the instrument, and a list nothing watches drifts
// back within a month, which is how it drifted this far.
//
// Three rules, and each fails CLOSED - the check names the files and exits non-zero:
//
//  1. MISSING - a top-level `docs/*.md` with no row. The map claims completeness, so this is
//     the rule the map is about. Subdirectories are deliberately exempt: `backlog/` has its own
//     README contract, `handoffs/` is one file per session and `acceptance/owner-queue/` is
//     transient by design. They are described as directories in the README instead.
//  2. ORPHANED - a row naming a file that is not there. A rename leaves one behind pointing at
//     nothing, which is worse than no row: it sends a reader after a file that moved.
//  3. DUPLICATED - the same file named by two rows. This is the merge hazard specifically:
//     two branches adding a row for the same doc in different sections merge CLEANLY and leave
//     the map self-contradictory, with nothing to notice it.
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

/** True only when this file was RUN, not imported - the same guard the other checks carry. */
const isEntrypoint =
  Boolean(process.argv[1]) &&
  resolve(process.argv[1]).replaceAll('\\', '/').toLowerCase() ===
    resolve(fileURLToPath(import.meta.url)).replaceAll('\\', '/').toLowerCase();

/**
 * Every doc named by a table row, in order, as written.
 *
 * Anchored at the start of a line and at the first cell, so a doc MENTIONED in another row's
 * prose is not counted. That distinction is the whole measurement: a substring search over the
 * README counts prose mentions and reports the map as far more complete than it is.
 *
 * @param {string} readme  the text of docs/README.md
 * @returns {string[]} paths relative to docs/, e.g. 'OGRAF.md', 'acceptance/OWNER_QUEUE.md'
 */
export function indexedDocs(readme) {
  return [...readme.matchAll(/^\|\s*`([A-Za-z0-9_./-]+\.md)`/gm)].map((m) => m[1]);
}

/**
 * The three findings, as data - so the rules are testable without a docs/ directory.
 *
 * @param {string[]} docFiles  top-level docs/*.md names, README.md excluded
 * @param {string[]} allDocPaths  every .md path under docs/, relative to docs/
 * @param {string} readme
 * @returns {{ missing: string[], orphaned: string[], duplicated: string[] }}
 */
export function auditDocsIndex(docFiles, allDocPaths, readme) {
  const rows = indexedDocs(readme);
  const rowSet = new Set(rows);
  const present = new Set(allDocPaths);
  const seen = new Set();
  const duplicated = [];
  for (const row of rows) {
    if (seen.has(row) && !duplicated.includes(row)) duplicated.push(row);
    seen.add(row);
  }
  return {
    missing: docFiles.filter((f) => !rowSet.has(f)),
    orphaned: rows.filter((r) => !present.has(r)).filter((r, i, a) => a.indexOf(r) === i),
    duplicated,
  };
}

/** Every .md under docs/, relative to docs/, forward slashes. */
function allDocPaths(dir = '', acc = []) {
  for (const entry of readdirSync(resolve(ROOT, 'docs', dir), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) allDocPaths(rel, acc);
    else if (entry.name.endsWith('.md')) acc.push(rel);
  }
  return acc;
}

function main() {
  const readme = readFileSync(resolve(ROOT, 'docs/README.md'), 'utf8');
  const paths = allDocPaths();
  const topLevel = paths.filter((p) => !p.includes('/') && p !== 'README.md');
  const { missing, orphaned, duplicated } = auditDocsIndex(topLevel, paths, readme);

  const report = (label, list, why) => {
    if (list.length === 0) return false;
    console.error(`\ncheck-docs-index: ${list.length} ${label}\n  ${why}`);
    for (const f of list) console.error(`  - docs/${f}`);
    return true;
  };
  const bad = [
    report('doc(s) with no row in docs/README.md', missing,
      'Add a row in the section that fits (binding contract / active plan / rationale-historical). The map says it is complete, so a doc with no row reads as a doc that does not exist.'),
    report('row(s) naming a file that is not there', orphaned,
      'The file was renamed or deleted. Update or remove the row - a row pointing at nothing is worse than no row.'),
    report('doc(s) named by more than one row', duplicated,
      'Two rows for one doc merge cleanly and leave the map self-contradictory. Keep the one in the right section.'),
  ].some(Boolean);

  if (bad) {
    console.error(`\ncheck-docs-index: FAILED. ${topLevel.length} top-level docs, ${indexedDocs(readme).length} rows.\n`);
    return 1;
  }
  console.log(`check-docs-index: OK - all ${topLevel.length} docs in docs/ have exactly one row in docs/README.md.`);
  return 0;
}

if (isEntrypoint) process.exit(main());
