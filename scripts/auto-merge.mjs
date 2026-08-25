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
/**
 * How many times to re-integrate when main moves under this branch mid-gate.
 *
 * Three, not unbounded: on a busy day an unbounded retry is a machine that never lands anything
 * while looking busy. Each attempt is a full re-verification, which the fork-point recovery in
 * ci.yml (`06a1cb31`) made cheap for a small branch - it used to be ten minutes of full suite.
 */
const attempts = Math.max(1, Number(valueOf('--attempts') ?? 3));
/**
 * Verdict reason KINDS a person has weighed and accepted, comma-separated.
 *
 * Not a severity override: `--accept shared-registry` says "I have looked at that specific
 * collision", and any OTHER reason in the same verdict still refuses. Exists because two
 * branches touching one registry both read `hold` symmetrically, so neither can go first and
 * the queue deadlocks until a human breaks the tie.
 */
const accept = (valueOf('--accept') ?? '').split(',').map((s) => s.trim()).filter(Boolean);

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
    // A NAMED risk a person has already weighed may be accepted; nothing else can.
    //
    // Two branches editing one shared registry both read `hold`, symmetrically, so neither can
    // ever be the one that goes first - the queue deadlocks and only a human can break it. That
    // is the tool asking the right question, but it needs an answer it can accept. `--accept
    // <kind>` is that answer, and it is deliberately per-KIND rather than a blanket override:
    // saying "I have looked at the shared-registry collision" must not also wave through a
    // stacked branch or a duplicate migration number that happens to be in the same verdict.
    const unaccepted = verdict.reasons.filter((r) => !accept.includes(r.kind));
    if (unaccepted.length > 0) {
      return refuse(
        `merge-order says ${verdict.severity}: ${unaccepted.map((r) => `[${r.kind}] ${r.text}`).join('; ')}` +
          (verdict.landFirst ? `\n  land ${verdict.landFirst} first` : '') +
          `\n  a person who has weighed one of these can pass --accept <kind>`,
      );
    }
    say(`merge-order says ${verdict.severity}, accepted by hand: ${verdict.reasons.map((r) => r.kind).join(', ')}`);
  } else {
    say('merge-order: clear');
  }

  // --- 2. Assess. The preflight settles every mechanical condition and prints each one. ------
  //
  // `--skip-order` only when a person has already accepted the order verdict above: the preflight
  // runs merge-order itself and blocks on a `hold`, so without this the acceptance would be
  // overruled one step later by the same fact. Every OTHER preflight check still runs - this
  // drops the one question that has already been answered, not the assessment.
  const preflight = ['scripts/safe-merge-preflight.mjs', '--branch', branch];
  if (accept.length > 0) preflight.push('--skip-order');
  if (run('node', preflight).status !== 0) {
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

  // --- 3-5. Integrate, verify, land - retried ONLY when main moved underneath. ---------------
  //
  // A serial queue on a busy day loses this race constantly: another branch lands while this
  // one's gate runs, and phase 4 correctly refuses. Measured on the first two real landings -
  // the second one lost to a branch that landed during its ten-minute CI run. Without a retry
  // the job just fails and nothing re-queues it, so a queue would quietly drop landings one
  // after another while looking busy.
  //
  // There is no honest shortcut around re-verifying: a new main means a new tree, and a clean
  // merge is not proof the integration worked. So a retry is a full re-integration.
  //
  // ONLY this refusal retries. Every other one - a conflict, a red gate, a dirty tree - stops
  // dead, because the whole design is that anything needing judgement stops.
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (attempt > 1) say(`main moved - re-integrating (attempt ${attempt} of ${attempts})`);
    const outcome = await attemptLanding(mainWt, branchWt);
    if (outcome !== 'main-moved') return outcome;
  }
  return refuse(
    `main moved under this branch ${attempts} times running - giving up rather than looping. ` +
      'Land it by hand, or queue it when the machine is quieter.',
  );
}

/** One full integrate-verify-land pass. Returns 0, 1, or 'main-moved' when the target moved. */
async function attemptLanding(mainWt, branchWt) {
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

  // Gate on CI, green on EXACTLY that commit.
  if (run('git', ['-C', branchWt, 'push', 'origin', branch]).status !== 0) {
    return refuse('could not push the branch for CI');
  }
  if (!noWait && !(await waitForCi(verifiedSha))) return refuse('no green CI run for the integrated commit');
  if (run('node', ['scripts/safe-merge-preflight.mjs', '--branch', branch, '--phase', '3', '--verified-sha', verifiedSha]).status !== 0) {
    return refuse('preflight phase 3 refused the CI run - red, damaged, or it skipped every shard');
  }

  // Re-check, fast-forward, push.
  if (
    run('node', [
      'scripts/safe-merge-preflight.mjs', '--branch', branch, '--phase', '4',
      '--verified-sha', verifiedSha, '--integrated-main-sha', integratedMainSha,
    ]).status !== 0
  ) {
    console.error('auto-merge: main moved while the gate ran.');
    return 'main-moved';
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
