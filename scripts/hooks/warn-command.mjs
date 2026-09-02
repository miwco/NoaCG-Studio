// PostToolUse notice for shell commands (the Bash and PowerShell tools). Says two things:
//
//   A COMMIT LANDED ON A BRANCH WHOSE LANDING JOB IS ALREADY QUEUED, so the pin that job holds
//   is now stale and it will refuse when its turn comes.
//
//   A HANDOFF THAT STILL LISTS OPEN ITEMS WAS DESTROYED and no wave plan records where they went.
//   The reasoning is in scripts/handoff-trace.mjs; the destroyed-handoff half is checked FIRST
//   because only one notice can be delivered per call (`warn` exits) and lost content outranks a
//   pin that refuses loudly on its own.
//
// WHY THIS IS A NOTICE AND NOT A REFUSAL. Queueing pins the branch at its current commit, because
// queueing IS the declaration that the work is finished (`.agent-workflows/queue-merge.md` §1).
// A commit afterwards is perfectly legitimate - the session found one more thing - as long as it
// re-queues. What is never legitimate is leaving both: on 2026-08-28 one session queued, committed
// more, and queued again, and two of its three landing jobs burned as stale-pin refusals
// (`.agent-workflows/orchestrator/incidents.md`, "the three stacked pins"). Blocking the commit
// would be refusing legitimate work; saying nothing is what cost the two jobs.
//
// WHY IT RUNS AFTER RATHER THAN BEFORE. Two reasons, and they agree. A PreToolUse hook can only
// reach the agent by BLOCKING - an allowed call's reason goes to the user, not to the model - so
// "warn without denying" has no channel there. And the fact this rule needs is whether the branch
// tip actually MOVED, which is only true once the commit has run: a commit that failed, or one
// with nothing staged, leaves the pin valid and must stay silent. So the check is exact rather
// than speculative, and it cannot cry wolf.
//
// COST. This runs after every shell command in every session, so the only thing it does
// unconditionally is a pure text match for a `git commit` INVOCATION. Everything that costs
// anything - resolving the checkout, asking git for the branch and its tip, reading the queue -
// happens only for the handful of commands that pass it, including the module loads.
// Measured 2026-09-02 on this laptop, five runs each: 59 ms on an `ls`, against a 47 ms bare
// `node -e 0` on the same box - so the common case is node starting up and about 12 ms of work.
// A commit costs 195 ms, which is two git calls and a queue read, on the one command per session
// where the answer matters. Re-measured after the handoff rule was added: 49 ms on an `ls` and
// 50 ms on `grep -rn x docs/handoffs/` (the folder is named, but no verb destroys anything), so
// the common case is unchanged; a command that really can take a handoff away costs about 140 ms.

import { existsSync } from 'node:fs';
import { readHookInput, warn, gitOutput } from './lib.mjs';
// `command-match.mjs` is pure and imports nothing, so the gate below costs only itself. The two
// modules that answer the rest are loaded LAZILY, after it passes: `command-target.mjs` and
// `jobs-store.mjs` each pull in a chain (git plumbing, the port registry, the worktree lister)
// that is pure overhead on the `ls` this hook mostly sees.
import { commitCheckouts } from '../command-match.mjs';

const input = await readHookInput();
const command = input?.tool_input?.command;
if (typeof command !== 'string' || command.length === 0) process.exit(0);
const committing = commitCheckouts(command);

// The commands that can take a handoff away: a delete or a move naming the folder. A COMMIT is the
// other door, because `git rm <file> && git commit` destroys it with the working tree never left
// holding the deletion - so the two ranges below are read from different places.
const DESTROYS = /(?:^|[\s;|&(])(?:rm|del|erase|unlink|mv|move|Remove-Item|Move-Item|ri|rni)\b/i;
const touchesHandoffs = /docs[/\\]handoffs/i.test(command) && DESTROYS.test(command);
if (committing.length === 0 && !touchesHandoffs) process.exit(0);

const { checkoutRoot, commandCheckout } = await import('../command-target.mjs');

// The command belongs to the checkout it ACTS ON, not to wherever this session happens to sit - a
// session driving another worktree by absolute path is ordinary here (command-target.mjs). A
// `git -C <path>` on the commit itself is the most explicit statement of that and wins, the same
// way it does in the branch rule next door; anything else is read off the command line.
const sessionDir = typeof input?.cwd === 'string' && input.cwd ? input.cwd : process.cwd();
const named = committing.find(Boolean);
const root = (named ? checkoutRoot(named) : null) ?? commandCheckout(command, sessionDir) ?? sessionDir;

// --- A destroyed handoff that still listed open items ----------------------------------------
//
// Read from GIT rather than from the command's own arguments: a wildcard, a loop, a PowerShell
// cmdlet and a `git rm` all name the file differently, and git says the same thing about all of
// them. `HEAD` covers a deletion whether it is staged or not; `HEAD^ HEAD` catches the one that
// arrived inside the commit itself.
const deletedNow = deletedHandoffs(['diff', '--name-only', '--diff-filter=D', 'HEAD', '--', 'docs/handoffs/']);
const deletedInCommit =
  committing.length > 0
    ? deletedHandoffs(['diff', '--name-only', '--diff-filter=D', 'HEAD^', 'HEAD', '--', 'docs/handoffs/'])
    : [];
if (deletedNow.length > 0 || deletedInCommit.length > 0) {
  const { classificationOf, verdict, wavePlanPaths } = await import('../handoff-trace.mjs');
  const { parseHandoffSection } = await import('../handoff-drain.mjs');
  const { primaryRoot, HOME_RELATIVE_PATH } = await import('../orchestrator-home.mjs');
  const home = homeWorktree(primaryRoot(root), HOME_RELATIVE_PATH);
  const plans = wavePlanPaths(root, home);
  for (const [rel, ref] of [
    ...deletedNow.map((rel) => [rel, 'HEAD']),
    ...deletedInCommit.map((rel) => [rel, 'HEAD^']),
  ]) {
    const before = gitOutput(root, ['show', `${ref}:${rel}`]);
    if (!before) continue;
    const { entry, planPath } = classificationOf(rel.split('/').pop(), plans, parseHandoffSection);
    const message = verdict({ rel, before, after: null, entry, planPath });
    if (message) warn(message); // exits
  }
}

// --- A commit that staled a queued landing pin ------------------------------------------------

if (committing.length === 0) process.exit(0);
const { jobsDir, readJobs, landingStateFor } = await import('../jobs-store.mjs');

const branch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
// A detached HEAD has no branch to have queued, and `main` is never queued for landing.
if (!branch || branch === 'HEAD' || branch === 'main') process.exit(0);

const dir = jobsDir();
if (!dir) process.exit(0);
const landing = landingStateFor(branch, readJobs(dir));
if (landing.state !== 'queued') process.exit(0);

// WHAT THE JOB PINNED, in the job's own words. `jobs.mjs add-merge` records the tip as
// `--expect-sha <sha>` in the queued command, and `auto-merge.mjs` compares it there - so reading
// it back from the same place is what makes this notice agree with the refusal it predicts. A job
// carrying no pin (git could not answer when it was queued) has nothing to go stale.
const pinned = /--expect-sha\s+([0-9a-f]{7,40})\b/.exec(landing.job.command)?.[1];
const tip = git(root, ['rev-parse', branch]);
if (!pinned || !tip || pinned === tip) process.exit(0);

const running = landing.job.state === 'running';
warn(
  `Heads up: landing job ${landing.job.id} is already ${landing.job.state} for ${branch}, pinned at ` +
    `${pinned.slice(0, 8)}, and this commit moved the branch to ${tip.slice(0, 8)}. That job will refuse ` +
    `("${branch} has moved since it was queued") rather than land anything.\n` +
    'Queueing pins the branch because queueing means the work is finished. Committing afterwards is ' +
    'fine, but the queued job is now dead weight, and QUEUEING A SECOND ONE BESIDE IT is what burned ' +
    'two of three jobs from one branch on 2026-08-28. Queue once, at the true end.\n' +
    (running
      ? `Let ${landing.job.id} refuse (it is mid-flight; ` +
        `\`node scripts/jobs.mjs log ${landing.job.id}\` shows where it got to), then run ` +
        '`npm run queue:merge` once - when this branch is actually finished.'
      : `Withdraw the stale job and re-queue when you are actually finished:\n` +
        `  node scripts/jobs.mjs cancel ${landing.job.id}\n` +
        '  npm run queue:merge'),
);

/** One git answer from the checkout the command acts on, trimmed, or null when git cannot say. */
function git(cwd, args) {
  return gitOutput(cwd, args)?.trim() || null;
}

/** The tracked handoff files this git range reports as deleted. Fails open on an empty answer. */
function deletedHandoffs(args) {
  return (gitOutput(root, args) ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.endsWith('.md') && !line.endsWith('.local.md'));
}

/** The orchestrator's home worktree, where the gitignored wave plan lives, or null. */
function homeWorktree(primary, relative) {
  if (!primary) return null;
  const at = `${primary.replaceAll('\\', '/').replace(/\/$/, '')}/${relative}`;
  return existsSync(at) ? at : null;
}
