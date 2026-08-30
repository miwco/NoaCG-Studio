// The orchestrator's PERMANENT home: one worktree at .claude/worktrees/orchestrator, checked out
// DETACHED at origin/main, created if missing and fast-forwarded if behind.
//
// Why a script and not three lines of prose in the workflow. Prose gets skipped; a script either
// ran or it did not, and it says which of the five things it found. The owner asked for exactly
// this ("add it to the skill so it does it correctly, so it's not up to me to mess up") after
// making the worktree by hand was the only way to get one.
//
// Why a permanent worktree at all. A throwaway worktree is pinned at the commit it was cut from,
// so the orchestrator reads a STALE repo - on 2026-08-29 the usage meter it was asked to report
// from did not exist in its own checkout and had to be pulled out of origin/main by hand. And
// every throwaway is one more thing for the cleanup sweep to reason about, which is the litter
// the owner is trying to end.
//
// Why not the main checkout. The landing queue MUTATES that working tree during every
// integration - checkout, merge, build, reset - so a read taken there mid-landing can be wrong
// and nothing says so. This is not tidiness; it is that the main checkout has an owner already.
//
// Why DETACHED. Git refuses to check out `main` in a second worktree while the main checkout
// holds it, and this worktree must never hold a branch of its own: it is infrastructure, it
// never commits, and a branch here would make it look like work in flight to
// `worktree-activity.mjs` and to the merge order.
//
// It takes NO dev-port reservation. Ports are allocated lazily, by `scripts/dev-port.mjs` running
// inside a checkout - `git worktree add` allocates nothing. The orchestrator never starts a dev
// server, so nothing here may run that script and burn one of the 5180-5298 block (docs/DEV_PORTS.md).
//
// CLI:
//   node scripts/orchestrator-home.mjs           ensure the home exists and is current
//   node scripts/orchestrator-home.mjs --json    the same, as one JSON record
//   node scripts/orchestrator-home.mjs --no-fetch  skip the fetch (use the origin/main already here)
//
// Exit codes: 0 when the home is usable (created, updated, current, or left alone because the
// owner has files in it), 1 when it is NOT usable and the caller must fall back to its own
// checkout. Never removes anything, never forces anything, never writes outside the worktree.

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { git, normalize, samePath, worktreeEntries } from './worktree-cleanup-lib.mjs';

/** The one path this worktree ever lives at, relative to the primary checkout. */
export const HOME_RELATIVE_PATH = '.claude/worktrees/orchestrator';

/**
 * Statuses that still leave a usable, current home. Everything else is a refusal the caller has
 * to read - which is why the set is named rather than spelled inline at each call site.
 */
const USABLE = new Set(['created', 'updated', 'current', 'dirty']);

export function isUsable(status) {
  return USABLE.has(status);
}

/** The primary checkout of the repository containing `cwd`; `git worktree list` puts it first. */
export function primaryRoot(cwd) {
  return worktreeEntries(cwd)[0]?.root ?? null;
}

/** The registered worktree entry at `path`, or null when git does not know that path. */
function registeredAt(entries, path) {
  return entries.find((entry) => samePath(entry.root, path)) ?? null;
}

/** True when `path` exists on disk with at least one entry in it. */
function occupiedDirectory(path) {
  try {
    return readdirSync(path).length > 0;
  } catch {
    return existsSync(path);
  }
}

/**
 * Create or refresh the orchestrator's home worktree.
 *
 * @param {object} [options]
 * @param {string} [options.cwd]        any checkout of the repository (default: this process's)
 * @param {string} [options.path]       override the home path - TESTS ONLY, so a test run can
 *                                      never create or move the real `.claude/worktrees/orchestrator`
 * @param {string} [options.remote]     remote to fetch and track (default `origin`)
 * @param {string} [options.branch]     branch to follow on that remote (default `main`)
 * @param {boolean} [options.fetch]     fetch before reading the remote ref (default true)
 * @returns {{status: string, path: string|null, head: string|null, message: string,
 *            fetched: boolean, fetchError: string|null, from: string|null, gitError: string|null}}
 */
export function ensureOrchestratorHome(options = {}) {
  const {
    cwd = process.cwd(),
    remote = 'origin',
    branch = 'main',
    fetch: shouldFetch = true,
  } = options;

  const base = {
    status: 'failed',
    path: options.path ? normalize(options.path) : null,
    head: null,
    message: '',
    fetched: false,
    fetchError: null,
    from: null,
    gitError: null,
  };

  // Only the default PATH comes from the primary checkout; every git command below runs in `cwd`
  // or in the home itself, so this never reaches into the main checkout's working tree.
  const root = primaryRoot(cwd);
  if (!root) {
    return { ...base, message: `not a git checkout: ${normalize(cwd)}` };
  }
  const home = base.path ?? normalize(join(root, ...HOME_RELATIVE_PATH.split('/')));
  const ref = `${remote}/${branch}`;

  // Fetch FIRST, and never let a failure here be fatal: an offline laptop should still get a
  // home, it just gets one that is honest about being as fresh as the last fetch.
  let fetched = false;
  let fetchError = null;
  if (shouldFetch) {
    const result = git(['fetch', remote, branch, '--quiet'], cwd);
    fetched = result.ok;
    if (!result.ok) fetchError = result.stderr || result.stdout || `git fetch ${remote} ${branch} failed`;
  }

  const target = git(['rev-parse', '--verify', `${ref}^{commit}`], cwd);
  if (!target.ok) {
    return {
      ...base,
      path: home,
      fetched,
      fetchError,
      gitError: target.stderr || target.stdout,
      message: `cannot resolve ${ref}: ${target.stderr || target.stdout}`,
    };
  }
  const targetSha = target.stdout;

  const entry = registeredAt(worktreeEntries(cwd), home);

  // A directory git does not know about is somebody's - a stale checkout, a half-removed
  // worktree, a folder made by hand. Refuse rather than clobber it; the fix is a human's.
  if (!entry) {
    if (occupiedDirectory(home)) {
      return {
        ...base,
        path: home,
        fetched,
        fetchError,
        status: 'blocked',
        message:
          `${home} exists but git does not know it as a worktree. Nothing was changed. ` +
          'Inspect it, move or delete it by hand, then run this again.',
      };
    }
    const created = git(['worktree', 'add', '--detach', home, targetSha], cwd);
    if (!created.ok) {
      return {
        ...base,
        path: home,
        fetched,
        fetchError,
        gitError: created.stderr || created.stdout,
        message: `git worktree add refused: ${created.stderr || created.stdout}`,
      };
    }
    return {
      ...base,
      path: home,
      head: targetSha,
      fetched,
      fetchError,
      status: 'created',
      message: `created ${home} detached at ${ref} (${targetSha.slice(0, 8)})`,
    };
  }

  // It must never hold a branch. If it somehow does, that is work in flight to every other tool
  // in the repo, so leave it exactly where it is and say so.
  if (entry.branch) {
    return {
      ...base,
      path: home,
      head: entry.head,
      fetched,
      fetchError,
      status: 'branched',
      message:
        `${home} has branch "${entry.branch}" checked out; the orchestrator's home is always ` +
        'detached and never holds a branch. Nothing was changed.',
    };
  }

  const dirty = git(['status', '--porcelain=v1'], home);
  if (!dirty.ok) {
    return {
      ...base,
      path: home,
      head: entry.head,
      fetched,
      fetchError,
      gitError: dirty.stderr || dirty.stdout,
      message: `cannot read the status of ${home}: ${dirty.stderr || dirty.stdout}`,
    };
  }
  if (dirty.stdout !== '') {
    // Never reset over somebody's files. The home is stale but present, which is worth saying
    // rather than fixing: the reads that follow are older than origin/main by exactly this much.
    return {
      ...base,
      path: home,
      head: entry.head,
      fetched,
      fetchError,
      status: 'dirty',
      message:
        `${home} has uncommitted changes, so it was left alone and is NOT at ${ref}. ` +
        'Reads taken there may be stale. Clear it by hand to refresh it.',
    };
  }

  if (entry.head === targetSha) {
    return {
      ...base,
      path: home,
      head: targetSha,
      fetched,
      fetchError,
      status: 'current',
      message: `${home} is already at ${ref} (${targetSha.slice(0, 8)})`,
    };
  }

  // `--ff-only` is the whole safety story: it moves the detached HEAD when the target is a
  // descendant and refuses otherwise, so a force-pushed or rewound `main` reports instead of
  // silently discarding whatever this worktree was sitting on.
  const forward = git(['merge', '--ff-only', targetSha], home);
  if (!forward.ok) {
    return {
      ...base,
      path: home,
      head: entry.head,
      from: entry.head,
      fetched,
      fetchError,
      gitError: forward.stderr || forward.stdout,
      message:
        `${home} could not be fast-forwarded to ${ref}: ${forward.stderr || forward.stdout}`,
    };
  }
  return {
    ...base,
    path: home,
    head: targetSha,
    from: entry.head,
    fetched,
    fetchError,
    status: 'updated',
    message:
      `fast-forwarded ${home} to ${ref} ` +
      `(${(entry.head ?? '').slice(0, 8)} -> ${targetSha.slice(0, 8)})`,
  };
}

/** The human report: the path first, because every command that follows runs there. */
export function formatResult(result) {
  const lines = [];
  if (result.fetchError) {
    lines.push(`WARN  fetch failed, using the origin ref already here: ${result.fetchError}`);
  }
  if (isUsable(result.status)) {
    lines.push(`ORCHESTRATOR HOME: ${result.path}`);
    lines.push(`  ${result.status}: ${result.message}`);
    lines.push('  Run every later read of this session from that directory.');
  } else {
    lines.push(`ORCHESTRATOR HOME UNAVAILABLE (${result.status})`);
    lines.push(`  ${result.message}`);
    lines.push('  Continue in the current checkout and say in the plan that its reads may be stale.');
  }
  return lines;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const argv = process.argv.slice(2);
  const result = ensureOrchestratorHome({ fetch: !argv.includes('--no-fetch') });
  if (argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else for (const line of formatResult(result)) console.log(line);
  if (!isUsable(result.status)) process.exitCode = 1;
}
