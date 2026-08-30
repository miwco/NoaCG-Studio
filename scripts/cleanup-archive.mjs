// ARCHIVE-BEFORE-DELETE for worktree cleanup: the half of the mechanism that lets a machine,
// rather than a person, decide a finished worktree is disposable.
//
// WHY THIS EXISTS. `git status --porcelain` - the clean-tree test every deletion guard relies
// on - says nothing about ignored files, and `git worktree remove` deletes them anyway. Most
// ignored content is rebuildable (`node_modules/`, `dist/`) and some is a secret the repo can
// hand out again (`.env`), but a third kind is neither: bench rounds that cost real money,
// generated galleries, eval results. Two paid rounds have already been destroyed by ordinary
// worktree cleanup (see the archive's own README). Losing those is exactly the risk that used
// to be answered by "a human starts every cleanup"; this module answers it instead.
//
// THE VERIFY IS THE POINT, NOT THE COPY. A partial copy nobody checked is worse than no copy,
// because it reads as a safe round and nothing ever looks again. So the copy is proven before
// the caller is allowed to delete anything:
//   1. the recursive FILE COUNT matches, and
//   2. every relative path matches, and
//   3. every file's BYTE SIZE matches at that path, and
//   4. the totals agree.
// Any disagreement returns `ok: false` and the caller must refuse the removal. There is no
// flag that overrides a failed verification - an archive nobody checked is not an archive.
//
// WHERE IT WRITES. C:/claude/noacg-archives, outside the repo, override with
// NOACG_CLEANUP_ARCHIVE. That folder is the GENERAL archive; the two round-shaped archives on
// this machine (noacg-bench-archive, noacg-lite-eval-archive) are indexed by ROUND, one dated
// folder per deliberate paid run, and dropping whatever ignored content a worktree happened to
// hold into them would corrupt that index. Worktree cleanup archives leftovers, not rounds.
//
// The source is never modified, never moved and never deleted here. Deleting is the caller's
// step, and only after this module says the copy is provably complete.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

/** Environment override for the archive root, so nothing about the location is hardcoded. */
export const ARCHIVE_ROOT_ENV = 'NOACG_CLEANUP_ARCHIVE';

/** The general (non-round) archive on this machine. Outside the repo on purpose. */
export const DEFAULT_ARCHIVE_ROOT = 'C:/claude/noacg-archives';

/** Everything this mechanism writes lives under one subfolder, never loose in the root. */
export const ARCHIVE_SUBDIR = 'worktree-cleanup';

/**
 * Above this, an unattended run refuses and reports instead of copying. Not a safety rule - a
 * politeness one: an autonomous sweep that silently copies gigabytes is indistinguishable from
 * a hung sweep, and the human it would have to wait for is the one this exists to stop needing.
 */
export const ARCHIVE_BYTES_CEILING = 2 * 1024 * 1024 * 1024;

export function archiveRoot({ env = process.env } = {}) {
  const configured = env[ARCHIVE_ROOT_ENV];
  return normalizePath(configured && configured.trim() ? configured.trim() : DEFAULT_ARCHIVE_ROOT);
}

function normalizePath(path) {
  return resolve(path).replaceAll('\\', '/');
}

/** Today, as the archive's dated folder name. */
export function archiveDate(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * Every file under `target`, as `{ path, bytes }` with forward-slashed paths relative to it,
 * sorted. A single FILE returns one entry named `''` - the ignored entries git reports are a
 * mix of files (`.env`, `dev-bench.log`) and directories (`lite-eval-out/`), and both have to
 * compare the same way on both sides of the copy.
 *
 * Symlinks are not followed: they would either double-count bytes or point outside the tree,
 * and either way the two sides would stop being comparable.
 */
export function walkFiles(target) {
  let root;
  try {
    root = statSync(target);
  } catch {
    return null; // vanished or unreadable - the caller turns this into a refusal
  }
  if (!root.isDirectory()) return [{ path: '', bytes: root.size }];

  const files = [];
  const stack = [target];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return null;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        let stat;
        try {
          stat = statSync(full);
        } catch {
          return null;
        }
        files.push({ path: relative(target, full).split(sep).join('/'), bytes: stat.size });
      }
    }
  }
  return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/** The *.json / *.jsonl half of a file list - the irreplaceable records, as opposed to frames. */
export function structuredFiles(files) {
  return files.filter((file) => /\.(json|jsonl)$/i.test(file.path));
}

function totalBytes(files) {
  return files.reduce((sum, file) => sum + file.bytes, 0);
}

/** The last path segment of a worktree, used to name its folder inside the archive. */
export function worktreeLabel(worktreePath) {
  const parts = normalizePath(worktreePath).split('/').filter(Boolean);
  const name = parts.at(-1) ?? 'worktree';
  return name.replace(/[^a-z0-9_.-]+/gi, '-');
}

/**
 * Plan the archiving of one worktree's non-rebuildable ignored content.
 *
 * `entries` are the classified VALUABLE paths (never secrets - a secret is deleted where it
 * lies and copying one would only spread it). Returns
 * `{ ok, refuse, destination, items, files, bytes }`; `ok: false` means the caller must not
 * remove the worktree.
 */
export function planArchive({
  worktreePath,
  entries,
  root = archiveRoot(),
  date = archiveDate(),
  ceiling = ARCHIVE_BYTES_CEILING,
  exists = existsSync,
} = {}) {
  const destination = join(root, ARCHIVE_SUBDIR, date, worktreeLabel(worktreePath)).replaceAll('\\', '/');
  const plan = { ok: true, refuse: null, destination, items: [], files: 0, bytes: 0 };
  if (!entries || entries.length === 0) return { ...plan, destination: null };

  if (exists(destination)) {
    // Never overwrite: a half-replaced archive verifies against neither copy.
    return {
      ...plan,
      ok: false,
      refuse: `${destination} already exists - an archived folder is never overwritten`,
    };
  }

  for (const entry of entries) {
    const relativePath = String(entry.path ?? entry).replace(/\/+$/, '');
    const source = join(worktreePath, relativePath);
    const files = walkFiles(source);
    if (files === null) {
      return {
        ...plan,
        ok: false,
        refuse: `${relativePath} could not be read, so its copy could never be proven complete`,
      };
    }
    plan.items.push({
      path: relativePath,
      source: normalizePath(source),
      destination: join(destination, relativePath).replaceAll('\\', '/'),
      files: files.length,
      bytes: totalBytes(files),
    });
  }

  plan.files = plan.items.reduce((sum, item) => sum + item.files, 0);
  plan.bytes = plan.items.reduce((sum, item) => sum + item.bytes, 0);

  if (plan.bytes > ceiling) {
    return {
      ...plan,
      ok: false,
      refuse:
        `${formatBytes(plan.bytes)} of unrecoverable output is more than an unattended run ` +
        `copies (ceiling ${formatBytes(ceiling)}) - archive it deliberately, then rerun`,
    };
  }
  return plan;
}

/**
 * Execute an archive plan and PROVE the copy, item by item. Returns
 * `{ ok, reason, destination, files, bytes, verified }`. The source is untouched either way,
 * so a refusal costs nothing but a rerun.
 */
export function archiveAndVerify(plan, { copy = cpSync, makeDir = mkdirSync } = {}) {
  const done = { ok: false, reason: null, destination: plan.destination, files: 0, bytes: 0, verified: [] };
  if (!plan.ok) {
    done.reason = plan.refuse ?? 'the archive plan was refused';
    return done;
  }
  if (plan.items.length === 0) {
    done.ok = true;
    return done;
  }

  for (const item of plan.items) {
    const before = walkFiles(item.source);
    if (before === null) {
      done.reason = `${item.path} became unreadable before it was copied`;
      return done;
    }
    try {
      makeDir(parentOf(item.destination), { recursive: true });
      copy(item.source, item.destination, { recursive: true, verbatimSymlinks: true });
    } catch (error) {
      done.reason = `copying ${item.path} failed: ${error?.message ?? error}`;
      return done;
    }

    const after = walkFiles(item.destination);
    if (after === null) {
      done.reason = `${item.path} was copied but the archived copy cannot be read back`;
      return done;
    }
    const mismatch = compareTrees(before, after);
    if (mismatch) {
      // The source is still there. Nothing may be deleted on the strength of this copy.
      done.reason = `${item.path} did not archive faithfully: ${mismatch}`;
      return done;
    }
    done.verified.push({
      path: item.path,
      destination: item.destination,
      files: after.length,
      bytes: totalBytes(after),
      structured: structuredFiles(after).length,
    });
    done.files += after.length;
    done.bytes += totalBytes(after);
  }

  done.ok = true;
  return done;
}

/**
 * Why two file lists are not the same tree, or null when they are. Counts first (the cheapest
 * and commonest failure), then paths, then per-file sizes, then the totals.
 */
export function compareTrees(source, archived) {
  if (source.length !== archived.length) {
    return `${source.length} file(s) in the source, ${archived.length} archived`;
  }
  for (let i = 0; i < source.length; i += 1) {
    if (source[i].path !== archived[i].path) {
      return `path ${source[i].path || '(the file itself)'} is missing from the archive`;
    }
    if (source[i].bytes !== archived[i].bytes) {
      return `${source[i].path || '(the file itself)'} is ${source[i].bytes} bytes in the source and ${archived[i].bytes} archived`;
    }
  }
  const from = totalBytes(source);
  const to = totalBytes(archived);
  if (from !== to) return `${from} bytes in the source, ${to} archived`;
  return null;
}

function parentOf(path) {
  const normalized = normalizePath(path);
  const cut = normalized.lastIndexOf('/');
  return cut <= 0 ? normalized : normalized.slice(0, cut);
}

/** Human-readable byte count for the reports. */
export function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)}${units[unit]}`;
}
