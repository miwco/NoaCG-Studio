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

import { readHookInput, warn, gitOutput } from './lib.mjs';
// `command-match.mjs` is pure and imports nothing, so the gate below costs only itself. The two
// modules that answer the rest are loaded LAZILY, after it passes: `command-target.mjs` and
// `jobs-store.mjs` each pull in a chain (git plumbing, the port registry, the worktree lister)
// that is pure overhead on the `ls` this hook mostly sees.
import { commitCheckouts } from '../command-match.mjs';
// Pure, and imports only node:fs and node:path, so naming the handoff rule's one shared predicate
// here costs nothing on the `ls` this hook mostly sees.
import { isHandoff } from '../handoff-trace.mjs';

const input = await readHookInput();
const command = input?.tool_input?.command;
if (typeof command !== 'string' || command.length === 0) process.exit(0);
const committing = commitCheckouts(command);

// The commands that can take a handoff away: a delete or a move naming the folder. A COMMIT is the
// other door, because `git rm <file> && git commit` destroys it with the working tree never left
// holding the deletion - so the two ranges below are read from different places.
// The gate names the folder as well as a verb, and both halves cost it coverage it cannot afford
// to buy: `Remove-Item $spent` in a loop, or an `rm` after a separate `cd docs/handoffs`, says
// neither and is missed. The alternative is a git call before EVERY shell command in every
// session, at about 90 ms each, to catch a shape nobody has typed yet. `handoffs` rather than
// `docs/handoffs` is the cheap half of that back.
const DESTROYS = /(?:^|[\s;|&(])(?:rm|del|erase|unlink|mv|move|Remove-Item|Move-Item|ri|rni)\b/i;
const touchesHandoffs = /handoffs/i.test(command) && DESTROYS.test(command);
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
// them.
//
// EACH RANGE IS TIED TO THE DOOR IT ANSWERS FOR, which the first cut of this got wrong. A working
// tree holding an unstaged deletion answers `HEAD` the same way for the rest of the session, so
// reading that range on any commit reported "this deletes …" for commands that deleted nothing,
// once per commit, forever. So the working-tree range is read only when the COMMAND itself
// destroys something, and the commit range only for a commit, which is the only door
// `git rm <file> && git commit` comes through.
const deletedNow = touchesHandoffs
  ? deletedHandoffs(['diff', '--name-only', '--diff-filter=D', 'HEAD', '--', 'docs/handoffs/'])
  : [];
// A MERGE COMMIT IS NOT THIS SESSION'S DELETION. `git merge main` that conflicts is finished with
// `git commit`, and its `HEAD^ HEAD` range carries every handoff `main` drained - so the notice
// would fire on somebody else's classified work and advise `git restore`, which undoes the merge.
// Taking `main` in is what every session is told to do regularly, so this is the routine path.
const deletedInCommit =
  committing.length > 0 && !git(root, ['rev-parse', '--verify', '--quiet', 'HEAD^2'])
    ? deletedHandoffs(['diff', '--name-only', '--diff-filter=D', 'HEAD^', 'HEAD', '--', 'docs/handoffs/'])
    : [];

// BOTH RULES SPEAK, in one message. `warn` exits, so a hook with two things to say and one exit
// silently drops the second - and one un-restored handoff deletion would have made the stale-pin
// notice unreachable for the rest of the session, which is the notice this file was written for.
const notices = [];

const destroyed = [
  ...deletedNow.map((rel) => [rel, 'HEAD']),
  ...deletedInCommit.map((rel) => [rel, 'HEAD^']),
]
  .map(([rel, ref]) => ({ rel, before: gitOutput(root, ['show', `${ref}:${rel}`]), after: null }))
  .filter((item) => item.before);
if (destroyed.length > 0) {
  const { handoffNotices } = await import('../handoff-trace.mjs');
  notices.push(...(await handoffNotices(root, destroyed)));
}

// --- A commit that staled a queued landing pin ------------------------------------------------

if (committing.length === 0) say();
const { jobsDir, readJobs, landingStateFor } = await import('../jobs-store.mjs');

const branch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
// A detached HEAD has no branch to have queued, and `main` is never queued for landing.
if (!branch || branch === 'HEAD' || branch === 'main') say();

const dir = jobsDir();
if (!dir) say();
const landing = landingStateFor(branch, readJobs(dir));
if (landing.state !== 'queued') say();

// WHAT THE JOB PINNED, in the job's own words. `jobs.mjs add-merge` records the tip as
// `--expect-sha <sha>` in the queued command, and `auto-merge.mjs` compares it there - so reading
// it back from the same place is what makes this notice agree with the refusal it predicts. A job
// carrying no pin (git could not answer when it was queued) has nothing to go stale.
const pinned = /--expect-sha\s+([0-9a-f]{7,40})\b/.exec(landing.job.command)?.[1];
const tip = git(root, ['rev-parse', branch]);
if (!pinned || !tip || pinned === tip) say();

const running = landing.job.state === 'running';
notices.push(
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

say();

/**
 * The ONE exit. Everything collected goes out together, because `warn` exits the process and a
 * hook with two rules and two exits delivers whichever fired first and silently drops the other.
 */
function say() {
  if (notices.length > 0) warn(notices.join('\n\n'));
  process.exit(0);
}

/** One git answer from the checkout the command acts on, trimmed, or null when git cannot say. */
function git(cwd, args) {
  return gitOutput(cwd, args)?.trim() || null;
}

/**
 * The tracked handoff files this git range reports as deleted. Fails open on an empty answer.
 *
 * Filtered through `isHandoff` rather than by suffix, because the git pathspec `docs/handoffs/`
 * also matches SUBDIRECTORIES - so an archived handoff would have fired here while the Write half
 * next door, which does use `isHandoff`, stayed silent about the same file.
 */
function deletedHandoffs(args) {
  return (gitOutput(root, args) ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(isHandoff);
}
