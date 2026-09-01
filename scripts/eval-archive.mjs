// Copy a finished paid bench round into the permanent archive, then PROVE the copy is complete.
//
//   node scripts/eval-archive.mjs <out-dir> <label> [--date=YYYY-MM-DD] [--dry-run]
//                                 [--archive=<path>]
//   npm run eval:archive -- lite-eval-out v14
//
// Every bench out-dir this repo produces (`lite-eval-out*`, `lite-bench-out*`, `pro-spike-out*`,
// `bench-*`) is gitignored, so a round lives only inside one throwaway worktree and dies with
// it. Two paid rounds have already been destroyed that way. The archive at
// C:/claude/noacg-lite-eval-archive is outside the repo on purpose.
//
// The verify is the point, not the copy: a partial copy that nobody checked is worse than no
// copy, because it reads as a safe round. Two independent checks have to agree -
//   1. the recursive FILE COUNT matches, and
//   2. the *.json / *.jsonl relative-path set diffs identical at every depth.
// The structured records are the irreplaceable half; the frames are merely expensive.
//
// The source is never deleted, never moved, and never modified. This is the DELIBERATE archive of
// a round you meant to keep, indexed by round; worktree cleanup has its own archiver for whatever
// ignored output a worktree happened to be holding when it was retired
// (scripts/cleanup-archive.mjs, .agent-workflows/cleanup-worktrees.md). Use this one first when
// the round matters - a round filed under its own name is findable; one filed under a worktree
// hash is only recoverable.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const DEFAULT_ARCHIVE = 'C:/claude/noacg-lite-eval-archive';

const argv = process.argv.slice(2);
const flag = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const DRY_RUN = argv.includes('--dry-run');
const positional = argv.filter((a) => !a.startsWith('--'));
const [SOURCE_ARG, LABEL_ARG] = positional;

if (!SOURCE_ARG || !LABEL_ARG) {
  console.error('Usage: node scripts/eval-archive.mjs <out-dir> <label> [--date=YYYY-MM-DD] [--dry-run]');
  console.error('Copies a bench round into the permanent archive and verifies the copy.');
  process.exit(1);
}

const DATE = flag('date') ?? new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(DATE)) {
  console.error(`--date must be YYYY-MM-DD, got "${DATE}".`);
  process.exit(1);
}
const LABEL = LABEL_ARG.replace(/[^a-z0-9_.-]+/gi, '-');

const source = resolve(SOURCE_ARG);
const archiveRoot = resolve(flag('archive') ?? DEFAULT_ARCHIVE);
const dest = join(archiveRoot, `${LABEL}-${DATE}`);

if (!existsSync(source) || !statSync(source).isDirectory()) {
  console.error(`${source} is not a directory.`);
  process.exit(1);
}
if (resolve(dest) === source) {
  console.error(`The source IS the destination (${dest}) - nothing to archive.`);
  process.exit(1);
}

/** Every file under `root`, as forward-slashed paths relative to it. Directories are not files. */
function walk(root) {
  const files = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      // A symlink is not followed: it would either duplicate bytes already counted or point
      // outside the round, and either way the two sides would stop being comparable.
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) files.push(relative(root, full).split(sep).join('/'));
    }
  }
  return files.sort();
}

const structured = (files) => files.filter((file) => /\.(json|jsonl)$/i.test(file));

const sourceFiles = walk(source);
const sourceStructured = structured(sourceFiles);
if (!sourceFiles.length) {
  console.error(`${source} holds no files - refusing to archive an empty round.`);
  process.exit(1);
}

console.log(`source      ${source}`);
console.log(`destination ${dest}`);
console.log(`            ${sourceFiles.length} files, ${sourceStructured.length} structured (*.json / *.jsonl)`);

const destExisted = existsSync(dest);
if (destExisted && !DRY_RUN) {
  // Overwriting an archived round in place could half-replace it and leave something that
  // verifies against neither original. Pick another label or date, by hand.
  console.error(`\nREFUSED: ${dest} already exists.`);
  console.error('An archived round is never overwritten. Use a different --date or label.');
  process.exit(1);
}

if (DRY_RUN) {
  if (!destExisted) {
    console.log('\ndry run: nothing copied.');
    console.log(`would create ${dest} and then verify ${sourceFiles.length} files`);
    console.log(`and diff ${sourceStructured.length} structured names against the source.`);
    process.exit(0);
  }
  console.log('\ndry run: the destination already exists - verifying it against the source instead.');
} else {
  mkdirSync(archiveRoot, { recursive: true });
  cpSync(source, dest, { recursive: true, verbatimSymlinks: true });
}

// ---- verify -----------------------------------------------------------------------------
const destFiles = walk(dest);
const destStructured = structured(destFiles);

const missing = sourceStructured.filter((file) => !destStructured.includes(file));
const extra = destStructured.filter((file) => !sourceStructured.includes(file));
const countMatches = destFiles.length === sourceFiles.length;
const namesMatch = missing.length === 0 && extra.length === 0;

console.log('\nverify');
console.log(`  file count   ${sourceFiles.length} source / ${destFiles.length} archived   ${countMatches ? 'OK' : 'MISMATCH'}`);
console.log(`  *.json/.jsonl ${sourceStructured.length} source / ${destStructured.length} archived   ${namesMatch ? 'identical name set' : 'DIFFERENT'}`);

if (!namesMatch) {
  for (const file of missing.slice(0, 20)) console.log(`    MISSING in archive: ${file}`);
  if (missing.length > 20) console.log(`    ...and ${missing.length - 20} more missing`);
  for (const file of extra.slice(0, 20)) console.log(`    ONLY in archive:    ${file}`);
  if (extra.length > 20) console.log(`    ...and ${extra.length - 20} more extra`);
}

if (!countMatches || !namesMatch) {
  console.error(`\nREFUSED: ${dest} is NOT a faithful copy of the round.`);
  console.error('The source is untouched. Fix the destination (or delete it and re-run) before');
  console.error('anyone treats this round as archived, and never sweep the worktree until it is.');
  process.exit(1);
}

console.log(`\nOK: ${dest} holds a verified copy. The source at ${source} was not modified.`);
if (!DRY_RUN) console.log('Add a row to the archive README so the round is findable.');
