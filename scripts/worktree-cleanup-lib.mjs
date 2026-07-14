// Shared worktree-hygiene helpers, so the SessionStart hook and the /cleanup-worktrees
// command can never drift on the rules that actually delete things.
//
// The one non-negotiable here is the empty-leftover-folder sweep: on Windows `git worktree
// remove` cannot delete a folder while a session is cwd'd inside it, so it deregisters the
// worktree and empties the files but leaves the now-empty directory behind. Once that session
// ends the folder unlocks and the next run removes the husk. The rule is deliberately strict:
// only a COMPLETELY EMPTY, git-UNREGISTERED folder that is not a protected cwd is removed. A
// still-busy folder stays locked (rmdir throws, we skip it); any non-empty stub is reported,
// never deleted - that is someone's working tree until proven otherwise.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, rmdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Absolute path with forward slashes, for cross-checkout comparison on Windows. */
export function normalize(path) {
  return resolve(path).replaceAll('\\', '/');
}

/** Case-insensitive path equality (Windows filesystems are case-insensitive). */
export function samePath(a, b) {
  return normalize(a).toLowerCase() === normalize(b).toLowerCase();
}

/** Run git with the given args in `cwd`; return { ok, stdout, stderr } all trimmed. */
export function git(args, cwd) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return {
    ok: res.status === 0,
    stdout: typeof res.stdout === 'string' ? res.stdout.trim() : '',
    stderr: typeof res.stderr === 'string' ? res.stderr.trim() : '',
  };
}

/** All registered worktree roots for the checkout containing `cwd`, primary first. */
export function worktreeRoots(cwd) {
  const res = git(['worktree', 'list', '--porcelain'], cwd);
  if (!res.ok) return [];
  return res.stdout
    .split('\n')
    .filter((line) => line.startsWith('worktree '))
    .map((line) => normalize(line.slice('worktree '.length)));
}

/**
 * Sweep leftover EMPTY worktree folders under `<primaryRoot>/.claude/worktrees`.
 *
 * A folder is removed ONLY when all of these hold:
 *   - it is not a registered git worktree (`registeredRoots`),
 *   - it is not a protected path (`protect`, e.g. the caller's own cwd),
 *   - it is completely empty.
 *
 * Returns { removed, nonEmpty, locked }: paths removed, non-empty leftovers left for manual
 * review, and empty-but-locked folders (a live session still owns them) to retry later.
 * Never throws - hygiene must never break session start or the command.
 */
export function sweepEmptyLeftoverFolders({ primaryRoot, registeredRoots, protect = [] }) {
  const removed = [];
  const nonEmpty = [];
  const locked = [];
  try {
    const worktreesDir = join(primaryRoot, '.claude', 'worktrees');
    if (!existsSync(worktreesDir)) return { removed, nonEmpty, locked };
    for (const name of readdirSync(worktreesDir)) {
      const dir = normalize(join(worktreesDir, name));
      if (registeredRoots.some((r) => samePath(r, dir))) continue; // a live registered worktree
      if (protect.some((p) => samePath(p, dir))) continue; // never touch a protected path
      let entries;
      try {
        entries = readdirSync(dir);
      } catch {
        continue; // not a directory or vanished - ignore
      }
      if (entries.length > 0) {
        nonEmpty.push(dir); // stub with files - report only, never auto-delete
        continue;
      }
      try {
        rmdirSync(dir); // rmdir refuses a non-empty dir, so this only ever removes an empty one
        removed.push(dir);
      } catch {
        locked.push(dir); // still owned by a live session, or a transient lock - retry later
      }
    }
  } catch {
    // Best-effort: a surprise here must never propagate.
  }
  return { removed, nonEmpty, locked };
}
