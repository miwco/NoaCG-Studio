#!/usr/bin/env node
// LAND ONE BRANCH, MECHANICALLY - the boring path of the safe-merge workflow, as a command a
// job runner can spawn.
//
//   node scripts/auto-merge.mjs --branch <branch> [--dry-run] [--no-wait]
//
// WHY THIS EXISTS. `.agent-workflows/safe-merge.md` is a procedure for a reader: it stops for
// judgement calls, and most of a landing is not a judgement call. Queued as
// `jobs.mjs add "node scripts/auto-merge.mjs --branch <b>" --kind merge`, several branches drain
// overnight in merge order, one at a time, and the owner wakes up to them landed.
//
// WHAT IT WILL NOT DO, and this is the whole design. It refuses - loudly, changing nothing
// further - on every case where the workflow would have asked a person:
//
//   - a merge-order verdict that is not `clear` (a stacked branch, a duplicate migration
//     number, a rename over another branch's edits - the cases the old collisions came from);
//   - any failed check in `safe-merge-preflight.mjs` phase 1, 3 or 4;
//   - a dirty worktree on either side;
//   - a branch with no worktree (the human flow makes a temporary one; that is more surface
//     than an unattended run should have);
//   - a CONFLICT integrating main (it aborts the merge and stops);
//   - a red, missing, damaged or shard-skipping CI run;
//   - main moving under it at any point.
//
// It never force-pushes, never resets, never deletes a branch or a worktree, and the only merge
// it makes into main is `--ff-only`, which git refuses unless the branch already contains main.
//
// Publishing PAST main - npm publish, production migrations, money - is never done here.

import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseWorktrees } from './safe-merge-preflight.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const branch = valueOf('--branch');
const dryRun = argv.includes('--dry-run');
const noWait = argv.includes('--no-wait');

if (!branch) {
  console.error('usage: node scripts/auto-merge.mjs --branch <branch> [--dry-run] [--no-wait]');
  process.exit(2);
}

process.exit(await main());

async function main() {
  // --- 1. Order. A `clear` verdict is the licence; anything else is a person's call. ---------
  const verdict = mergeOrderVerdict(branch);
  if (!verdict) return refuse('merge-order gave no verdict for this branch');
  if (verdict.severity !== 'clear') {
    return refuse(
      `merge-order says ${verdict.severity}: ${verdict.reasons.map((r) => r.text).join('; ')}` +
        (verdict.landFirst ? `\n  land ${verdict.landFirst} first` : ''),
    );
  }
  say(`merge-order: clear`);

  // --- 2. Assess. The preflight settles every mechanical condition and prints each one. ------
  if (run('node', ['scripts/safe-merge-preflight.mjs', '--branch', branch]).status !== 0) {
    return refuse('preflight phase 1 failed - see its output above');
  }

  const mainWt = worktreeFor('main');
  const branchWt = worktreeFor(branch);
  if (!mainWt) return refuse('main is checked out nowhere - the human flow handles that case');
  if (!branchWt) return refuse(`${branch} has no worktree - the human flow makes a temporary one`);
  for (const [label, wt] of [['main', mainWt], [branch, branchWt]]) {
    if (git(['-C', wt, 'status', '--porcelain']) !== '') return refuse(`${label}'s worktree is dirty (${wt})`);
  }

  if (dryRun) {
    say('dry run: everything up to the first state change passed. Stopping before touching main.');
    return 0;
  }

  // --- 3. Integrate main INTO the branch. Conflicts stop here, with the tree put back. -------
  if (run('git', ['-C', mainWt, 'pull', '--ff-only', 'origin', 'main']).status !== 0) {
    return refuse('could not fast-forward main from origin');
  }
  const integratedMainSha = git(['rev-parse', 'main']);
  say(`main is ${integratedMainSha.slice(0, 8)}`);

  if (run('git', ['-C', branchWt, 'merge', '--no-edit', 'main']).status !== 0) {
    run('git', ['-C', branchWt, 'merge', '--abort']);
    return refuse('integrating main conflicted - aborted, nothing changed. A person resolves this.');
  }
  const verifiedSha = git(['rev-parse', branch]);
  say(`verified sha will be ${verifiedSha.slice(0, 8)}`);

  // --- 4. Gate on CI, green on EXACTLY that commit. ------------------------------------------
  if (run('git', ['-C', branchWt, 'push', 'origin', branch]).status !== 0) {
    return refuse('could not push the branch for CI');
  }
  if (!noWait && !(await waitForCi(verifiedSha))) return refuse('no green CI run for the integrated commit');
  if (run('node', ['scripts/safe-merge-preflight.mjs', '--branch', branch, '--phase', '3', '--verified-sha', verifiedSha]).status !== 0) {
    return refuse('preflight phase 3 refused the CI run - red, damaged, or it skipped every shard');
  }

  // --- 5. Re-check, fast-forward, push. -----------------------------------------------------
  if (
    run('node', [
      'scripts/safe-merge-preflight.mjs', '--branch', branch, '--phase', '4',
      '--verified-sha', verifiedSha, '--integrated-main-sha', integratedMainSha,
    ]).status !== 0
  ) {
    return refuse('main moved while the gate ran - re-queue this branch and it will integrate the new main');
  }
  if (run('git', ['-C', mainWt, 'merge', '--ff-only', branch]).status !== 0) {
    return refuse('the fast-forward merge was refused by git');
  }
  if (git(['rev-parse', 'main']) !== verifiedSha) {
    return refuse('main is not the verified commit after the merge - NOT pushing');
  }
  if (run('git', ['-C', mainWt, 'push', 'origin', 'main']).status !== 0) {
    return refuse('the push to origin/main failed - main is landed locally, resolve by hand');
  }

  say(`landed ${branch} on main as ${verifiedSha.slice(0, 8)}`);
  say('the branch and its worktree are left alone - cleanup-worktrees owns that.');
  return 0;
}

/**
 * Wait for the CI run on this exact commit.
 *
 * `gh run watch --exit-status` EXITS on the condition rather than being polled, which is the
 * rule that outlived a hand-rolled loop whose own tooling failed silently and read as "still
 * running" for 26 minutes (docs/VERIFICATION.md). Its exit code is deliberately NOT trusted as
 * the verdict - that is what the phase 3 preflight is for.
 */
async function waitForCi(sha) {
  say('waiting for CI on the integrated commit...');
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const id = capture('gh', ['run', 'list', '--branch', branch, '--commit', sha, '--limit', '1',
      '--json', 'databaseId', '--jq', '.[0].databaseId']);
    if (id) {
      run('gh', ['run', 'watch', '--exit-status', id]);
      return true; // whether it PASSED is the preflight's call, not this exit code's
    }
    await new Promise((done) => setTimeout(done, 10_000));
  }
  return false;
}

// --- helpers ----------------------------------------------------------------------------------

/**
 * The merge-order verdict for one branch.
 *
 * Read stdout WHATEVER the exit code: `merge-order.mjs` exits 3 precisely when the answer is
 * `hold`, so treating a non-zero exit as "no answer" would throw away the one verdict that
 * matters most and refuse for the wrong reason.
 */
function mergeOrderVerdict(name) {
  const res = spawnSync('node', ['scripts/merge-order.mjs', '--branch', name, '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
  });
  try {
    return JSON.parse(res.stdout).verdict ?? null;
  } catch {
    return null;
  }
}

/**
 * The worktree holding `ref`, or null.
 *
 * Parsed with the preflight's own `parseWorktrees`, which is already unit-tested, rather than a
 * second reader of the same porcelain: this repo's worktree names routinely disagree with their
 * branches, so a directory name is never the answer and two parsers would be two chances to get
 * that wrong.
 */
function worktreeFor(ref) {
  return parseWorktrees(git(['worktree', 'list', '--porcelain'])).find((w) => w.branch === `refs/heads/${ref}`)?.path ?? null;
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

/** Run a command with its output shown, and hand back the result rather than throwing. */
function run(cmd, args) {
  return spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', encoding: 'utf8', windowsHide: true });
}

function capture(cmd, args) {
  const res = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', windowsHide: true });
  return res.status === 0 ? res.stdout.trim() : '';
}

function valueOf(name) {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

function say(message) {
  console.log(`auto-merge: ${message}`);
}

/** Stop, say exactly why, and change nothing further. Every refusal here is a person's cue. */
function refuse(reason) {
  console.error(`auto-merge REFUSED: ${reason}`);
  return 1;
}
