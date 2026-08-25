#!/usr/bin/env node
// LAND ONE BRANCH, MECHANICALLY - the boring path of the safe-merge workflow, as a command a
// job runner can spawn.
//
//   node scripts/auto-merge.mjs --branch <branch> [--dry-run] [--no-wait] [--no-db-push]
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
// Publishing PAST main - npm publish, money - is never done here. MIGRATIONS ARE THE EXCEPTION,
// and deliberately so since 2026-08-25: after a successful landing this applies whatever
// production is missing, through `scripts/db-push.mjs`, which classifies every statement and
// refuses anything that can remove something. So the unattended run can do strictly less than an
// attended one, and the thing it removes is the gap where a landed migration waits for somebody
// to remember it. A refusal is reported and never fails the landing. `--no-db-push` opts out.

import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseWorktrees } from './safe-merge-preflight.mjs';
import { jobsDir } from './jobs-store.mjs';

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
/**
 * The commit the branch was at when a person queued it, if they said.
 *
 * A landing is queued to mean "this work is finished". Without pinning the sha, a session that
 * queues and then keeps working would have whatever it had committed by the time its turn came
 * landed for it - which is the thing queueing was supposed to prevent. If the branch moved, the
 * job refuses and asks for a fresh queue rather than guessing which commits were meant.
 */
const expectSha = valueOf('--expect-sha') ?? null;
/**
 * Land without applying what production is missing.
 *
 * For a machine that should never write to the hosted project - a second laptop, a checkout
 * pointed at someone else's `.env`. The push is otherwise the default, because a migration that
 * lands and is not applied is the failure this whole path exists to remove.
 */
const noDbPush = argv.includes('--no-db-push');


/**
 * Exit code the runner reads as "not my turn yet - put me back in the queue".
 *
 * Distinct from a failure on purpose: a landing blocked by a branch that is ITSELF still waiting
 * is a turn-order problem that resolves as soon as that branch lands, and treating it as a
 * failure would mean queueing five branches and hand-re-queueing the three that lost.
 */
const BLOCKED_EXIT = 3;

// Only land when invoked directly. Importing this module - which is how `scripts/auto-merge.test.mjs`
// reaches the decisions above - must never merge anything.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!branch) {
    console.error('usage: node scripts/auto-merge.mjs --branch <branch> [--dry-run] [--no-wait] [--no-db-push]');
    process.exit(2);
  }
  const outcome = await main();
  process.exit(outcome === 'blocked' ? BLOCKED_EXIT : outcome);
}

/**
 * What the merge-order verdict licenses: proceed, wait for a turn, or refuse.
 *
 * Pure, and lifted out of `main` for the reason `planMigrationPush` was: these three answers are
 * the difference between a night that lands five branches and one that quietly drops four of
 * them, and no test can reach them through a function that also performs a real merge.
 */
export function planOrderDecision(verdict, { accept: accepted = [], isAheadOfMain = () => false } = {}) {
  if (!verdict) return { action: 'refuse', message: 'merge-order gave no verdict for this branch' };
  if (verdict.severity === 'clear') return { action: 'proceed', message: 'merge-order: clear' };

  // A NAMED risk a person has already weighed may be accepted; nothing else can.
  //
  // Two branches editing one shared registry both read `hold`, symmetrically, so neither can
  // ever be the one that goes first - the queue deadlocks and only a human can break it. That
  // is the tool asking the right question, but it needs an answer it can accept. `--accept
  // <kind>` is that answer, and it is deliberately per-KIND rather than a blanket override:
  // saying "I have looked at the shared-registry collision" must not also wave through a
  // stacked branch or a duplicate migration number that happens to be in the same verdict.
  const unaccepted = (verdict.reasons ?? []).filter((r) => !accepted.includes(r.kind));
  if (unaccepted.length === 0) {
    return {
      action: 'proceed',
      message: `merge-order says ${verdict.severity}, accepted by hand: ${verdict.reasons.map((r) => r.kind).join(', ')}`,
    };
  }

  // BLOCKED BY A BRANCH THAT IS ITSELF STILL WAITING? Then this is not a refusal, it is a
  // turn-order problem that solves itself. Queue several landings at once and most of them
  // start out blocked by each other; each one that lands frees the next. Failing them
  // outright would mean the owner queues five, three fail, and he re-queues by hand - which
  // is the manual tracking this whole thing exists to remove.
  const blockers = [...(verdict.blockedBy ?? []), verdict.landFirst].filter(Boolean);
  const stillWaiting = blockers.filter((b) => isAheadOfMain(b));
  if (stillWaiting.length > 0) {
    return {
      action: 'blocked',
      message: `waiting its turn - ${stillWaiting.join(', ')} ${stillWaiting.length === 1 ? 'is' : 'are'} still ahead of main.`,
    };
  }
  return {
    action: 'refuse',
    message:
      `merge-order says ${verdict.severity}: ${unaccepted.map((r) => `[${r.kind}] ${r.text}`).join('; ')}` +
      (verdict.landFirst ? `\n  land ${verdict.landFirst} first` : '') +
      `\n  a person who has weighed one of these can pass --accept <kind>`,
  };
}

/**
 * The conditions that must hold before main is touched at all: the branch is still the commit a
 * person queued, both sides have a worktree, and neither is dirty.
 *
 * Pure for the same reason, and ORDERED on purpose. The pin comes first because it is the only
 * one of the three that says "this is not the work that was queued", which stays true however
 * clean the trees are.
 */
export function planPreconditions({
  branch: name,
  expectSha: pinned = null,
  currentSha = null,
  mainWorktree = null,
  branchWorktree = null,
  isDirty = () => false,
} = {}) {
  if (pinned && currentSha !== pinned) {
    return {
      action: 'refuse',
      message:
        `${name} has moved since it was queued (${pinned.slice(0, 8)} -> ${String(currentSha).slice(0, 8)}).\n` +
        '  Queueing a landing means the work is finished; commits arrived after that, so this is\n' +
        '  no longer the thing that was queued. Queue it again when it is done.',
    };
  }
  if (!mainWorktree) {
    return { action: 'refuse', message: 'main is checked out nowhere - the human flow handles that case' };
  }
  if (!branchWorktree) {
    return { action: 'refuse', message: `${name} has no worktree - the human flow makes a temporary one` };
  }
  for (const [label, wt] of [['main', mainWorktree], [name, branchWorktree]]) {
    if (isDirty(wt)) return { action: 'refuse', message: `${label}'s worktree is dirty (${wt})` };
  }
  return { action: 'proceed' };
}

async function main() {
  // --- 1. Order. A `clear` verdict is the licence; anything else is a person's call. ---------
  const order = planOrderDecision(mergeOrderVerdict(branch), { accept, isAheadOfMain: aheadOfMain });
  if (order.action === 'refuse') return refuse(order.message);
  if (order.action === 'blocked') {
    console.error(`auto-merge: ${order.message}`);
    return 'blocked';
  }
  say(order.message);

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

  // The pin is checked ONCE, here, before any attempt: the retry loop legitimately moves the
  // branch tip by integrating main, so it cannot live inside the loop.
  const mainWt = worktreeFor('main');
  const branchWt = worktreeFor(branch);
  const pre = planPreconditions({
    branch,
    expectSha,
    currentSha: expectSha ? git(['rev-parse', branch]) : null,
    mainWorktree: mainWt,
    branchWorktree: branchWt,
    isDirty: (wt) => git(['-C', wt, 'status', '--porcelain']) !== '',
  });
  if (pre.action === 'refuse') return refuse(pre.message);

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
  return landWithRetries(attempts, () => attemptLanding(mainWt, branchWt));
}

/**
 * Run one landing pass, re-running it ONLY while main keeps moving underneath, and at most
 * `attempts` times.
 *
 * Separated so the bound itself can be tested: an unbounded version of this is a machine that
 * looks busy all night and lands nothing, and that failure is invisible from the outside.
 */
export async function landWithRetries(attempts, attempt) {
  for (let n = 1; n <= attempts; n += 1) {
    if (n > 1) say(`main moved - re-integrating (attempt ${n} of ${attempts})`);
    const outcome = await attempt(n);
    if (outcome !== 'main-moved') return outcome;
  }
  return refuse(
    `main moved under this branch ${attempts} times running - giving up rather than looping. ` +
      'Land it by hand, or queue it when the machine is quieter.',
  );
}

/**
 * One full integrate-verify-land pass. Returns 0, 1, or 'main-moved' when the target moved.
 *
 * Every command it issues arrives through `deps`, defaulting to the real ones. That is not
 * ceremony: the refusals below - a conflict, a red gate, a fast-forward git itself declines, a
 * main that moved - ARE this script, they run unattended at night, and a test that cannot reach
 * them without performing a real merge is not testing the part that lands branches.
 */
export async function attemptLanding(mainWt, branchWt, deps = {}) {
  const {
    branch: name = branch,
    noWait: skipCi = noWait,
    run: runCmd = run,
    git: gitCmd = git,
    waitForCi: awaitCi = waitForCi,
    afterLanding = (entry) => {
      recordLanding(entry);
      applyPendingMigrations();
    },
  } = deps;
  if (runCmd('git', ['-C', mainWt, 'pull', '--ff-only', 'origin', 'main']).status !== 0) {
    return refuse('could not fast-forward main from origin');
  }
  const integratedMainSha = gitCmd(['rev-parse', 'main']);
  say(`main is ${integratedMainSha.slice(0, 8)}`);

  if (runCmd('git', ['-C', branchWt, 'merge', '--no-edit', 'main']).status !== 0) {
    runCmd('git', ['-C', branchWt, 'merge', '--abort']);
    return refuse('integrating main conflicted - aborted, nothing changed. A person resolves this.');
  }
  const verifiedSha = gitCmd(['rev-parse', name]);
  say(`verified sha will be ${verifiedSha.slice(0, 8)}`);

  // Gate on CI, green on EXACTLY that commit.
  if (runCmd('git', ['-C', branchWt, 'push', 'origin', name]).status !== 0) {
    return refuse('could not push the branch for CI');
  }
  if (!skipCi && !(await awaitCi(verifiedSha))) return refuse('no green CI run for the integrated commit');
  if (runCmd('node', ['scripts/safe-merge-preflight.mjs', '--branch', name, '--phase', '3', '--verified-sha', verifiedSha]).status !== 0) {
    return refuse('preflight phase 3 refused the CI run - red, damaged, or it skipped every shard');
  }

  // Re-check, fast-forward, push.
  if (
    runCmd('node', [
      'scripts/safe-merge-preflight.mjs', '--branch', name, '--phase', '4',
      '--verified-sha', verifiedSha, '--integrated-main-sha', integratedMainSha,
    ]).status !== 0
  ) {
    console.error('auto-merge: main moved while the gate ran.');
    return 'main-moved';
  }
  if (runCmd('git', ['-C', mainWt, 'merge', '--ff-only', name]).status !== 0) {
    return refuse('the fast-forward merge was refused by git');
  }
  if (gitCmd(['rev-parse', 'main']) !== verifiedSha) {
    return refuse('main is not the verified commit after the merge - NOT pushing');
  }
  if (runCmd('git', ['-C', mainWt, 'push', 'origin', 'main']).status !== 0) {
    return refuse('the push to origin/main failed - main is landed locally, resolve by hand');
  }

  say(`landed ${name} on main as ${verifiedSha.slice(0, 8)}`);
  say('the branch and its worktree are left alone - cleanup-worktrees owns that.');
  // Only now, with the merge on origin/main: the ledger line, then whatever migration production
  // is missing. Neither may fail the landing - see `applyPendingMigrations`.
  afterLanding({ branch: name, sha: verifiedSha, worktree: branchWt, at: Date.now() });
  return 0;
}

/**
 * Apply any migration production is missing, now that one may have just landed.
 *
 * WHY HERE. `npm run db:push` removed the JUDGEMENT from applying a migration - it classifies
 * every statement and refuses anything that can lose something - but it left the TRIGGER with a
 * person, and a person is exactly what was missing. `0051` sat on main and unapplied for hours on
 * 2026-08-25; the drift check that found it can only report. This is the moment the gap opens:
 * main just moved, the runner is on a machine whose `.env` has the token, and nobody is watching.
 * Closing it here means the state a migration is written for is the state the next request meets.
 *
 * WHY IT ASKS THE DRIFT CHECK RATHER THAN DIFFING THIS BRANCH. "Did this landing add a migration"
 * is the wrong question - it would keep missing the case this exists for, which is a migration
 * that landed at some point and was never applied. "Is production behind" is the right one, and
 * it is already answered by a script that never fails its caller.
 *
 * WHY IT CANNOT FAIL THE LANDING. The merge is pushed. Whatever happens now, that is true, and
 * turning a successful landing into a failed job would make the job's exit code mean two things
 * at once - the same reasoning `recordLanding` above is written under. A REFUSED push is not an
 * error either: it is the guard doing its work, and it is reported so the next person sees it.
 */
export function planMigrationPush(driftReport, { noDbPush: optedOut } = {}) {
  if (optedOut) return { action: 'skip' };

  let drift;
  try {
    drift = JSON.parse(driftReport);
  } catch {
    // The drift script never fails its caller, so an unreadable report means it did not run at
    // all. Say so rather than treating silence as "production is fine" - that reading is the
    // failure the script is named after, and it would be worse here than there.
    return {
      action: 'report',
      message: 'could not read the migration drift report - run `npm run db:push` by hand if a migration just landed.',
    };
  }
  if (drift.status === 'ok') return { action: 'skip' };
  if (drift.status !== 'drift') {
    // No token, no network, an offline laptop. Said once, so a reader knows the push was
    // considered and stood down rather than silently skipped.
    return { action: 'report', message: `migration push not attempted: ${drift.detail}` };
  }
  return { action: 'push', drift };
}

function applyPendingMigrations() {
  const decision = planMigrationPush(capture('node', ['scripts/migration-drift.mjs', '--json']), { noDbPush });
  if (decision.action === 'skip') return;
  if (decision.action === 'report') return say(decision.message);

  const drift = decision.drift;
  say(`production is missing ${drift.missing.join(', ')} - applying`);
  const pushed = run('node', ['scripts/db-push.mjs']);
  if (pushed.status === 0) return say(`migrations applied to ${drift.ref}`);

  console.error(
    `\nauto-merge: ${branch} LANDED, but the migration push did not go through.\n` +
      '  This is not a failed landing, and it may not be a failure at all - db-push refuses any\n' +
      '  migration that can remove something and reports instead. Read what it printed above, then:\n' +
      `      npm run db:push -- --allow ${drift.missing.join(',')}\n` +
      '  if you accept what it does. Until then production stays one or more migrations behind,\n' +
      '  which the safe-merge preflight will keep saying on every landing.',
  );
  return undefined;
}

/**
 * Append one line to the landed ledger.
 *
 * WHY. Automating the merge moved the decision off the owner's desk and, as a side effect, took
 * the ANSWER with it: with landings happening in a background runner, "which branches are in, and
 * therefore which sessions are finished?" stopped being something he could see. The ledger is
 * what SessionStart and `npm run jobs` read to put that back - a session whose branch has landed
 * says so loudly and suggests a handoff, so "done" is announced rather than inferred.
 *
 * Append-only JSONL, and a failure here never fails the landing: the merge is already pushed, and
 * losing a notification must not turn a successful landing into a failed job.
 */
function recordLanding(entry) {
  try {
    const dir = jobsDir();
    if (dir) appendFileSync(join(dir, 'landed.jsonl'), `${JSON.stringify(entry)}\n`);
  } catch {
    // Reported nowhere on purpose - see above.
  }
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

/** Is `ref` still unmerged - i.e. is the branch blocking us actually still in the running? */
function aheadOfMain(ref) {
  const res = spawnSync('git', ['rev-list', '--count', `origin/main..${ref}`], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
  });
  return res.status === 0 && res.stdout.trim() !== '0';
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
