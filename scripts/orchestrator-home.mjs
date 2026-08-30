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
// It holds NO dev-port reservation. Ports are allocated lazily, by `scripts/dev-port.mjs` running
// inside a checkout - `git worktree add` allocates nothing, so this script burns none. The other
// half is that opening a SESSION in a linked worktree normally mints a ticket through the
// SessionStart hook, and this worktree is never removed, so that ticket would never come back:
// `scripts/hooks/session-start.mjs` exempts this one path for that reason (docs/DEV_PORTS.md).
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

  /** Every verdict below carries the same path and fetch outcome; only the verdict differs. */
  const report = (status, message, extra = {}) => ({
    ...base,
    path: home,
    fetched,
    fetchError,
    status,
    message,
    ...extra,
  });

  const target = git(['rev-parse', '--verify', `${ref}^{commit}`], cwd);
  if (!target.ok) {
    const error = target.stderr || target.stdout;
    return report('failed', `cannot resolve ${ref}: ${error}`, { gitError: error });
  }
  const targetSha = target.stdout;

  const entry = registeredAt(worktreeEntries(cwd), home);

  // A directory git does not know about is somebody's - a stale checkout, a half-removed
  // worktree, a folder made by hand. Refuse rather than clobber it; the fix is a human's.
  if (!entry) {
    if (occupiedDirectory(home)) {
      return report(
        'blocked',
        `${home} exists but git does not know it as a worktree. Nothing was changed. ` +
          'Inspect it, move or delete it by hand, then run this again.',
      );
    }
    const created = git(['worktree', 'add', '--detach', home, targetSha], cwd);
    if (!created.ok) {
      const error = created.stderr || created.stdout;
      return report('failed', `git worktree add refused: ${error}`, { gitError: error });
    }
    return report(
      'created',
      `created ${home} detached at ${ref} (${targetSha.slice(0, 8)})`,
      { head: targetSha },
    );
  }

  // It must never hold a branch. If it somehow does, that is work in flight to every other tool
  // in the repo, so leave it exactly where it is and say so.
  if (entry.branch) {
    return report(
      'branched',
      `${home} has branch "${entry.branch}" checked out; the orchestrator's home is always ` +
        'detached and never holds a branch. Nothing was changed.',
      { head: entry.head },
    );
  }

  // Registered but GONE - deleted by hand, or a `git worktree remove` that was interrupted. Every
  // git command below would run with a cwd that does not exist, and spawnSync reports that as a
  // process that never started: no stdout, no stderr, so the honest-looking "git said no" path
  // would print a message with nothing after the colon, forever. Name the one command that fixes
  // it instead. Pruning here is not this script's call: `git worktree prune` drops EVERY stale
  // registration in the repo, which is a decision about other people's worktrees.
  if (!existsSync(home)) {
    return report(
      'blocked',
      `git has ${home} registered as a worktree but the directory is gone. Nothing was ` +
        'changed. Run `git worktree prune` in the primary checkout, then run this again.',
      { head: entry.head },
    );
  }

  const dirty = git(['status', '--porcelain=v1'], home);
  if (!dirty.ok) {
    const error = dirty.stderr || dirty.stdout;
    return report('failed', `cannot read the status of ${home}: ${error}`, {
      head: entry.head,
      gitError: error,
    });
  }
  if (dirty.stdout !== '') {
    // Never reset over somebody's files. The home is stale but present, which is worth saying
    // rather than fixing: the reads that follow are older than origin/main by exactly this much.
    return report(
      'dirty',
      `${home} has uncommitted changes, so it was left alone and is NOT at ${ref}. ` +
        'Reads taken there may be stale. Clear it by hand to refresh it.',
      { head: entry.head },
    );
  }

  if (entry.head === targetSha) {
    return report('current', `${home} is already at ${ref} (${targetSha.slice(0, 8)})`, {
      head: targetSha,
    });
  }

  // `--ff-only` is the whole safety story: it moves the detached HEAD when the target is a
  // descendant and refuses otherwise, so a force-pushed or rewound `main` reports instead of
  // silently discarding whatever this worktree was sitting on.
  const forward = git(['merge', '--ff-only', targetSha], home);
  if (!forward.ok) {
    const error = forward.stderr || forward.stdout;
    return report('failed', `${home} could not be fast-forwarded to ${ref}: ${error}`, {
      head: entry.head,
      from: entry.head,
      gitError: error,
    });
  }
  return report(
    'updated',
    `fast-forwarded ${home} to ${ref} ` +
      `(${(entry.head ?? '').slice(0, 8)} -> ${targetSha.slice(0, 8)})`,
    { head: targetSha, from: entry.head },
  );
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
