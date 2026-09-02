#!/usr/bin/env node
// THE JOB QUEUE - enqueue heavy work instead of waiting for it.
//
//   node scripts/jobs.mjs add "npm run test:e2e:affected"   # prints an id, exits at once
//   node scripts/jobs.mjs add "npm run build" --after j-0007
//   node scripts/jobs.mjs                                   # running + waiting, with reasons
//   node scripts/jobs.mjs --json
//   node scripts/jobs.mjs wait j-0007                       # bounded: gives up after 30 min
//   node scripts/jobs.mjs log j-0007                        # that job's output
//   node scripts/jobs.mjs cancel j-0007
//   node scripts/jobs.mjs --runner                          # the drain loop (started for you)
//
// WHY (docs/JOB_RUNNER_PLAN.md carries the measurements): a foreground `--wait` outlives the
// shell that started it and is killed at 600 s with the run never started; every waiter wakes
// together when the slot frees; and nothing anywhere shows a QUEUE, so "correctly queued" and
// "died ten minutes ago" look identical. `add` returns immediately and one runner decides what
// starts, which removes all three.
//
// The arithmetic - capacity, dependencies, reaping - lives in jobs-store.mjs and is unit-tested.
// This file is the part that talks to the OS: spawning, killing a process TREE, and electing
// exactly one runner.

import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, readFileSync } from 'node:fs';
import { freemem } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { activeRuns, nodeProcesses, orphanProcesses } from './e2e-runs.mjs';
import { requiresRunningDevServer } from './command-match.mjs';
import { isPortBusy } from './port-probe.mjs';
import { RECLAIM_AFTER_MS, describeReclaim, planReclaim } from './ram-reclaim.mjs';
import {
  FOREGROUND_WAIT_CAP_MS,
  POLICY,
  addJob,
  cancelVerdict,
  costOf,
  devServerPrecheck,
  ensureJobsDir,
  findRunner,
  finishedSince,
  jobsDir,
  landingRow,
  pending,
  pruneJobs,
  readJobs,
  readLandings,
  reapDead,
  schedule,
  waitVerdict,
  writeJob,
} from './jobs-store.mjs';

const POLL_MS = 5_000;
/** The runner exits after this long with nothing live, so no daemon outlives the work. */
const IDLE_EXIT_MS = 60_000;
/** `auto-merge`'s "not my turn yet" - blocked by a branch that is itself still waiting. */
const BLOCKED_EXIT = 3;

/** `auto-merge`'s "main itself is red" - a person's fix, never resolved by waiting. */
const RED_MAIN_EXIT = 4;
/**
 * How many times a landing may go to the back of the queue before it is failed.
 *
 * Five branches queued together mostly start out blocked by each other, and each landing frees
 * the next - so a handful of deferrals is normal traffic, not a problem. The bound is what stops
 * a genuinely stuck pair cycling for ever while looking busy.
 */
const MAX_DEFERRALS = 6;

const dir = jobsDir();
if (!dir) {
  console.error('Not inside a git checkout - there is no shared queue to use.');
  process.exit(1);
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const valueOf = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};

// Terminal jobs older than the retention window go here, on the way past. Every entry point
// prunes because every entry point already reads this directory, so the sweep is one extra
// directory read on work somebody asked for - and nothing has to remember to run it. A daemon
// whose whole job is tidying another process's files would be a second thing to crash.
const pruned = pruneJobs(dir);
// `--json` promises machine-readable stdout, so the note goes to stderr there rather than
// nowhere: a prune is worth seeing, and a stray line ahead of the JSON breaks the reader.
if (pruned.length > 0) {
  const note = `Pruned ${pruned.length} finished job(s) older than 14 days (${pruned[0]} to ${pruned[pruned.length - 1]}).`;
  if (flag('--json')) process.stderr.write(`${note}\n`);
  else console.log(note);
}

if (flag('--runner')) await runner();
else if (args[0] === 'add') await cmdAdd();
else if (args[0] === 'add-merge') await cmdAddMerge();
else if (args[0] === 'wait') await cmdWait();
else if (args[0] === 'log') cmdLog();
else if (args[0] === 'cancel') cmdCancel();
else cmdList();

// --- commands --------------------------------------------------------------------------------

async function cmdAdd() {
  const command = args[1];
  if (!command || command.startsWith('-')) {
    console.error('Usage: node scripts/jobs.mjs add "<command>" [--kind gate|merge|sweep] [--after <id>,<id>] [--branch <name>] [--cap <minutes>]');
    process.exit(1);
  }
  ensureJobsDir(dir);
  const job = addJob(dir, {
    command,
    checkout: process.cwd(),
    branch: valueOf('--branch') ?? currentBranch(),
    kind: valueOf('--kind') ?? 'gate',
    after: (valueOf('--after') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    capMinutes: Number(valueOf('--cap') ?? POLICY.capMinutes),
    now: Date.now(),
  });
  ensureRunner();
  console.log(`${job.id} queued: ${job.command}`);
  const { waiting } = snapshot();
  const mine = waiting.find((w) => w.job.id === job.id);
  console.log(mine ? `  ${mine.reason}` : '  starting now');
  console.log(`  output: node scripts/jobs.mjs log ${job.id}`);
}

/**
 * Queue a LANDING for one branch.
 *
 * `kind: 'merge'` is what makes it safe to queue several at once: a merge never runs beside
 * anything, so they drain strictly one at a time whatever the clock allows. `auto-merge.mjs`
 * refuses anything that is not a `clear` verdict with clean trees and a green gate, so a queue
 * of these lands the boring ones and leaves the interesting ones for a person.
 */
async function cmdAddMerge() {
  // No branch given means THIS worktree's - the overwhelmingly common case, and the safe default.
  // Naming someone else's branch still works, but it has to be deliberate: a session that is
  // still working on a branch must never have it landed out from under the conversation.
  const target = args[1] && !args[1].startsWith('-') ? args[1] : currentBranch();
  if (!target || target === 'main' || target === 'HEAD') {
    console.error('Usage: node scripts/jobs.mjs add-merge [branch] [--after <id>] [--accept <kind>] [--attempts <n>] [--onto-red-main]');
    console.error('  With no branch it queues this worktree\'s. It refuses main and a detached HEAD.');
    process.exit(1);
  }
  ensureJobsDir(dir);
  // Forward the flags auto-merge understands. Dropping one silently is worse than rejecting it:
  // `--accept conflict` went missing here once and the job refused with the very verdict the flag
  // was there to answer, which reads exactly like the policy refusing rather than the queue
  // losing an argument.
  const passthrough = ['--accept', '--attempts'].flatMap((name) => {
    const value = valueOf(name);
    return value ? [name, value] : [];
  });
  // The boolean escape from the red-main gate. It takes no value, so it cannot go through the
  // loop above - and it must reach the job, because the ONE branch that legitimately lands onto a
  // red main is the branch that fixes it, and that branch is queued like any other.
  if (flag('--onto-red-main')) passthrough.push('--onto-red-main');
  // Pin the commit the branch is at RIGHT NOW. Queueing a landing means "this work is finished";
  // if commits arrive afterwards, the job refuses rather than landing something nobody queued.
  const tip = branchTip(target);
  const pin = tip ? ` --expect-sha ${tip}` : '';
  const job = addJob(dir, {
    command: `node scripts/auto-merge.mjs --branch ${target}${passthrough.length ? ` ${passthrough.join(' ')}` : ''}${pin}`,
    checkout: process.cwd(),
    branch: target,
    kind: 'merge',
    after: (valueOf('--after') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    capMinutes: Number(valueOf('--cap') ?? 45),
    now: Date.now(),
  });
  ensureRunner();
  console.log(`${job.id} queued: land ${target}`);
  console.log(`  output: node scripts/jobs.mjs log ${job.id}`);
}

function cmdList() {
  const { jobs, start, waiting, dead, running, slots } = snapshot();
  if (flag('--json')) {
    process.stdout.write(`${JSON.stringify({
      running,
      waiting: waiting.map((w) => ({ ...w.job, reason: w.reason })),
      // A job whose dependency died is still `waiting` on disk until a runner writes it off, and
      // leaving it out of both lists made it vanish from the listing entirely.
      dead: dead.map((d) => ({ ...d.job, reason: d.reason })),
      starting: start,
      slots,
    })}\n`);
    return;
  }
  // Landings first, and shown even when the queue is empty: "which branches are in, and therefore
  // which sessions are finished?" is the question automating the merge quietly took away, and an
  // empty queue is exactly when it gets asked.
  const landed = readLandings(dir).slice(-6);
  if (landed.length > 0) {
    console.log('Landed through the queue (newest last):');
    for (const l of landed) {
      const where = String(l.worktree ?? '').split('/').pop();
      console.log(`  ${String(l.sha).slice(0, 8)}  ${l.branch}${where ? `   session: ${where}` : ''}`);
    }
    console.log('  Those sessions have nothing left to merge - /handoff tells you which are done.');
    console.log('');
  }

  if (pending(jobs).length === 0) {
    console.log('Job queue empty.');
    printOutstanding(jobs);
    return;
  }
  const spent = running.reduce((sum, j) => sum + costOf(j), 0);
  console.log(
    `Job queue - budget ${Math.round(spent * 100) / 100}/${slots} suite-equivalents in use, ` +
      `${runnerPid() ? 'runner live' : 'NO RUNNER (start with --runner)'}`,
  );
  for (const job of running) {
    console.log(`  running  ${job.id}  ${elapsed(job.startedAt)}  [${costOf(job)}]  ${job.command}`);
  }
  // A job the scheduler has picked but the runner has not spawned yet is neither running nor
  // waiting. Leaving it out made it vanish from the listing entirely, which is precisely the
  // "nothing is happening and I cannot tell why" this command exists to prevent.
  for (const job of start) {
    console.log(`  starting ${job.id}  [${costOf(job)}]  ${job.command}`);
  }
  waiting.forEach(({ job, reason }, i) => {
    console.log(`  #${i + 1}       ${job.id}  ${reason}  ${job.command}`);
  });
  // Written off at the next runner poll, and shown NOW - a job in neither list is a job that
  // vanished, which is the failure this listing exists to prevent.
  for (const { job, reason } of dead) {
    console.log(`  DEAD     ${job.id}  ${reason}  ${job.command}`);
  }
  printOutstanding(jobs);
}

/**
 * What is still ahead of main, cheapest first, and whether anyone has queued it.
 *
 * The third of the three questions this command exists to answer - what landed, what is running,
 * and what is still OUT there. Without it, "which branch should go next" meant running a second
 * tool and holding both answers in your head, which is precisely the tracking cost that
 * automating the merge was supposed to remove rather than move.
 *
 * A branch with no job is not idle by accident: only its own session queues it (`/queue-merge`),
 * so "not queued" means that work is not finished yet, which is a different thing from stuck.
 */
function printOutstanding(jobs) {
  // ENUMERATE THE BRANCHES HERE, do not inherit merge-order's list. It finds candidates with
  // `git branch --no-merged`, which sees LOCAL branches only - so a branch that exists solely as
  // `origin/<name>`, which is what a closed session's pushed work looks like once its local ref
  // is gone, is invisible to it. `claude/html-graphics-course-form-a55q31` sat unmerged and
  // unmentioned for seven weeks that way, and this view reported "2 ahead of main" when there
  // were 5. A summary whose whole promise is completeness must not delegate the question of what
  // EXISTS to a tool with a narrower view; it may delegate only the ranking.
  const ahead = refsAheadOfMain();
  if (ahead.length === 0) {
    console.log('');
    console.log('Nothing is ahead of main.');
    return;
  }

  const res = spawnSync('node', ['scripts/merge-order.mjs', '--json'], { encoding: 'utf8', windowsHide: true });
  let ranked = [];
  let notReady = [];
  try {
    const result = JSON.parse(res.stdout);
    ranked = result.order ?? [];
    notReady = result.notReady ?? [];
  } catch {
    // merge-order could not answer - list everything unranked rather than listing nothing.
  }
  const rank = new Map(ranked.map((entry, i) => [entry.branch, { ...entry, position: i + 1 }]));
  const notReadyByBranch = new Map(notReady.map((entry) => [entry.branch, entry]));

  // Ranked first, in the order it gave; anything it could not see goes after, flagged.
  const ordered = [...ahead].sort((a, b) => (rank.get(a.branch)?.position ?? 1e9) - (rank.get(b.branch)?.position ?? 1e9));

  console.log('');
  console.log(`Ahead of main, cheapest to land first (${ordered.length}):`);
  // Stamped because this output gets READ ALOUD - pasted into a chat, relayed to the owner,
  // quoted back hours later. Every one of those is a snapshot that keeps looking authoritative
  // while branches are queued and landed underneath it. Three times in one day someone acted on
  // a picture that had aged in transit, including the owner being told a branch was not queued
  // twenty minutes after its session queued it. A timestamp does not stop that; it makes it
  // visible, which is the most a report can do about its own staleness.
  for (const { branch, commits, age } of ordered) {
    const entry = rank.get(branch);
    const unready = notReadyByBranch.get(branch);
    // "Not queued" and "its landing died" are opposite situations - one needs its session to
    // finish, the other needs a person to read a log - and they used to print identically,
    // which made an exhausted landing vanish. `landingRow` keeps the dead one loud: what
    // happened, and the command that puts it back.
    // Merge-order already knows why a local branch is not ready. Dropping its `notReady` row here
    // made a dirty worktree print the false remote-only diagnosis below, so retain both the
    // location and reason it supplied.
    // The last arm is still not ONLY the remote-only case: this file counts `origin/main..<ref>`
    // and merge-order enumerates against LOCAL main, so a branch merged locally but not yet
    // pushed is in neither list and reads wrong here too. Narrow, and its own change.
    const worktree = String((entry ?? unready)?.worktree ?? '').split('/').pop() || 'no worktree';
    const where = entry
      ? worktree
      : unready
        ? `${worktree} - ${unready.reason}`
        : 'NOT RANKED - no local branch';
    console.log(`  ${branch}`);
    // The metadata FIRST, then the landing state - a failed landing's row runs to two lines, and
    // appending the commit count to the second of them read as part of the re-queue command.
    console.log(`      ${commits} commit(s)  ·  last commit ${age}  ·  ${where}`);
    console.log(`      ${landingRow(branch, jobs)}`);
  }
  console.log('  Only a branch\'s own session queues it - "not queued" means that work is not finished yet.');
  console.log(`  Read at ${new Date().toISOString().slice(11, 16)} UTC - re-run rather than trusting a copy of this.`);
}

/**
 * Every ref ahead of origin/main, local or remote-only, with how far ahead and how stale.
 *
 * REMOTE-ONLY REFS ARE INCLUDED HERE AND NOT IN `scripts/merge-order.mjs`, on purpose. This list
 * answers "what work exists that has not landed?", and a branch pushed from a closed session is
 * work whether or not this machine has a local ref for it - one sat unmentioned for seven weeks
 * before this site started looking. The ranking in merge-order answers "which of the branches
 * somebody can land RIGHT NOW should go first?", and its output is consumed by the landing flow,
 * which needs a local branch in a worktree; it names remote-only branches instead of ranking them.
 * Both sites see the same refs, and each says what it can honestly say about them.
 */
function refsAheadOfMain() {
  const list = (pattern) =>
    spawnSync('git', ['for-each-ref', '--format=%(refname:short)', pattern], { encoding: 'utf8', windowsHide: true })
      .stdout?.split('\n')
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const names = new Set([...list('refs/heads/'), ...list('refs/remotes/origin/').map((n) => n.replace(/^origin\//, ''))]);
  const out = [];
  for (const branch of names) {
    if (branch === 'main' || branch === 'HEAD') continue;
    const ref = ['origin/' + branch, branch].find(
      (r) => spawnSync('git', ['rev-parse', '--verify', '-q', r], { encoding: 'utf8', windowsHide: true }).status === 0,
    );
    if (!ref) continue;
    const count = spawnSync('git', ['rev-list', '--count', `origin/main..${ref}`], { encoding: 'utf8', windowsHide: true });
    const commits = Number(count.stdout?.trim() ?? 0);
    if (!commits) continue;
    const age = spawnSync('git', ['log', '-1', '--format=%cr', ref], { encoding: 'utf8', windowsHide: true }).stdout?.trim() ?? '';
    out.push({ branch, commits, age });
  }
  return out.sort((a, b) => b.commits - a.commits);
}

/**
 * Wait for one job to finish - with a BOUND, which is the only reason this exists.
 *
 * A gate cannot take a job id for an answer, so "I need this verdict now" is a real need. What is
 * not is waiting for ever: the agent's shell tool dies at 600 s and the wait outlives it, so a
 * long poll is a session sitting on an answer nobody reads. At the cap this says so and points at
 * the handoff, having interrupted nothing.
 */
async function cmdWait() {
  const id = args[1];
  // A non-numeric minute count must not become NaN: `waitedMs >= NaN` is false for ever, which
  // is precisely the unbounded wait this command exists to replace.
  const asked = Number(valueOf('--timeout-min'));
  const capMs = Math.min(Number.isFinite(asked) && asked > 0 ? asked * 60_000 : FOREGROUND_WAIT_CAP_MS, FOREGROUND_WAIT_CAP_MS);
  if (!id || id.startsWith('-')) {
    console.error('Usage: node scripts/jobs.mjs wait <id> [--timeout-min <n, capped at 30>]');
    process.exit(1);
  }
  const startedAt = Date.now();
  for (;;) {
    const job = readJobs(dir).find((j) => j.id === id);
    const verdict = waitVerdict({ job, waitedMs: Date.now() - startedAt, capMs });
    if (verdict.action === 'unknown') {
      console.error(`No such job: ${id}`);
      process.exit(1);
    }
    if (verdict.action === 'finished') {
      console.log(`${id} ${verdict.state}${verdict.exitCode === null ? '' : ` (exit ${verdict.exitCode})`}`);
      console.log(`  output: node scripts/jobs.mjs log ${id}`);
      process.exit(verdict.state === 'done' ? 0 : 1);
    }
    if (verdict.action === 'give-up') {
      console.error(verdict.message);
      process.exit(2);
    }
    await sleep(POLL_MS);
  }
}

function cmdLog() {
  const job = readJobs(dir).find((j) => j.id === args[1]);
  if (!job) {
    console.error(`No such job: ${args[1]}`);
    process.exit(1);
  }
  if (!existsSync(job.logPath)) {
    console.log(`${job.id} is ${job.state} and has written nothing yet.`);
    return;
  }
  process.stdout.write(readFileSync(job.logPath, 'utf8'));
}

function cmdCancel() {
  const job = readJobs(dir).find((j) => j.id === args[1]);
  if (!job) {
    console.error(`No such job: ${args[1]}`);
    process.exit(1);
  }
  // Only a live job has anything left to stop, and only a live job may be written over:
  // cancelling a finished landing used to make the queue call a landed branch withdrawn.
  const verdict = cancelVerdict(job);
  if (verdict.action === 'no-op') {
    console.log(verdict.message);
    return;
  }
  if (job.state === 'running' && job.pid) killTree(job.pid);
  writeJob(dir, { ...job, state: 'cancelled', finishedAt: Date.now() });
  console.log(verdict.message);
}

// --- the drain loop --------------------------------------------------------------------------

/**
 * Drain the queue until it is empty.
 *
 * NOTE FOR ANYONE CHANGING THE SCHEDULER: a live runner keeps the code and the environment it
 * started with, so an edit to `jobs-store.mjs` (or to `NOACG_JOBS_FREE_MB`) does nothing until
 * the runner is restarted. The symptom is a queue that will not move for reasons the current
 * source says it should - stop the runner and let the next `add` start a fresh one.
 */
async function runner() {
  const other = runnerPid();
  if (other && other !== process.pid) {
    // Not an error: two `add` calls racing to start a runner is normal, and the loser exiting
    // costs one process. There is no lock to leave behind if either dies.
    console.log(`A runner is already live (pid ${other}). Nothing to do.`);
    return;
  }
  ensureJobsDir(dir);
  console.log(`Runner ${process.pid} draining ${dir}`);
  let idleSince = null;
  let starvedSince = null;

  for (;;) {
    const now = Date.now();
    let jobs = readJobs(dir, { onUnreadable: (n) => console.log(`  skipping unreadable ${n}`) });

    // A runner that died mid-job leaves `running` rows nothing will ever finish. Reap them
    // first, or the queue stays permanently full of phantom work.
    for (const dead of reapDead(jobs, isAlive, now)) {
      writeJob(dir, dead);
      console.log(`  ${dead.id} reaped - its process is gone`);
    }

    jobs = readJobs(dir);
    for (const job of jobs.filter((j) => j.state === 'running')) {
      if (now - (job.startedAt ?? now) < job.capMinutes * 60_000) continue;
      if (job.pid) killTree(job.pid);
      writeJob(dir, { ...job, state: 'timed-out', finishedAt: now });
      console.log(`  ${job.id} timed out after ${job.capMinutes} min - killed`);
    }

    jobs = readJobs(dir);
    const { start, dead, released, waiting, running } = schedule(jobs, {
      hour: new Date(now).getHours(),
      freeMemMb: freeMb(),
      outsideRuns: outsideRuns(jobs),
    });
    // A job whose dependency can never be met is written off HERE rather than left in the queue
    // saying so on every poll. It stays visible as a failed job with the reason on it, which is
    // what the outstanding listing and the SessionStart summary read.
    for (const { job, reason } of dead) {
      writeJob(dir, { ...job, state: 'failed', finishedAt: now, exitCode: null, giveUpReason: reason });
      console.log(`  ${job.id} written off - ${reason}`);
    }
    for (const { reason, job } of released) console.log(`  ${job.id} released - ${reason}`);
    for (const job of start) {
      // A job that measures the app through a dev server nobody started fails in its first
      // second with the sentence that fixes it, rather than spending its whole slot on
      // ERR_CONNECTION_REFUSED and reporting what reads like a broken app.
      const check = devServerPrecheck(job, await devServerFacts(job));
      if (check.action === 'fail') {
        writeJob(dir, { ...job, state: 'failed', finishedAt: Date.now(), exitCode: null, giveUpReason: check.reason });
        console.log(`  ${job.id} NOT STARTED - ${check.reason}`);
        continue;
      }
      spawnJob(job);
    }

    // RAM STARVATION IS A STATE, NOT A MOMENT. Waiting jobs whose only complaint is memory, with
    // nothing running, means the machine is full of something the queue did not start. After a
    // quarter of an hour that is worth looking at - see scripts/ram-reclaim.mjs for what may be
    // closed and why the rest is only named.
    // `some`, not `every`: one job waiting on a dependency (or on another landing) must not hide
    // a queue that is otherwise pinned against the memory floor - that is the same job sitting
    // there for hours, which is what starvation looks like from outside.
    const starved = start.length === 0 && running.length === 0
      && waiting.some(({ reason }) => /RAM free/.test(reason));
    starvedSince = starved ? (starvedSince ?? now) : null;
    if (starved) starvedSince = reclaimIfStarved(starvedSince, now);

    const live = pending(readJobs(dir)).length;
    if (live === 0) {
      idleSince ??= now;
      if (now - idleSince >= IDLE_EXIT_MS) {
        console.log('Queue empty - runner exiting.');
        return;
      }
    } else {
      idleSince = null;
    }
    await sleep(POLL_MS);
  }
}

/** Start one job, wire its output to its log, and record the outcome when it exits. */
function spawnJob(job) {
  const out = createWriteStream(job.logPath, { flags: 'a' });
  out.write(`=== ${job.id} ${job.command}\n=== cwd ${job.checkout}\n`);
  const child = spawn(job.command, {
    cwd: existsSync(job.checkout) ? job.checkout : process.cwd(),
    shell: true,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.pipe(out);
  child.stderr.pipe(out);
  writeJob(dir, { ...job, state: 'running', startedAt: Date.now(), pid: child.pid });
  console.log(`  ${job.id} started (pid ${child.pid})`);

  child.on('exit', (code) => {
    const current = readJobs(dir).find((j) => j.id === job.id);
    // Cancelled or timed out while running: that verdict wins, do not overwrite it.
    if (!current || current.state !== 'running') return;

    // NOT MY TURN YET (auto-merge exit 3): the branch is blocked by another that is itself still
    // waiting, so this resolves the moment that one lands. Send it to the BACK of the queue
    // rather than failing it - queueing five branches at once means most start out blocked by
    // each other, and each landing frees the next. Bounded, so a genuinely stuck job still
    // surfaces instead of cycling for ever.
    if (code === BLOCKED_EXIT && (current.deferrals ?? 0) < MAX_DEFERRALS) {
      const deferrals = (current.deferrals ?? 0) + 1;
      writeJob(dir, { ...current, state: 'waiting', startedAt: null, pid: null, enqueuedAt: Date.now(), deferrals });
      console.log(`  ${job.id} not its turn yet - back of the queue (deferral ${deferrals}/${MAX_DEFERRALS})`);
      return;
    }

    const blockedOut = code === BLOCKED_EXIT;
    // WHY it stopped is recorded on the job, not only printed here. The listing reads it back
    // (`landingRow`), and a landing that gave up hours ago must be able to say what happened
    // without anyone opening a log first.
    const giveUpReason = code === 0
      ? null
      : blockedOut
        ? `still blocked by another branch after ${MAX_DEFERRALS} turns`
        : code === RED_MAIN_EXIT
          // NOT this branch. Deliberately not a deferral like exit 3: a red main is fixed by a
          // person, not by the queue draining, so waiting cannot resolve it and a job that sat
          // there cycling would hide the very fault it detected.
          ? 'main itself is red - fix main first, then queue again (node scripts/main-health.mjs)'
          : `auto-merge refused it (exit ${code}) - read the log for which check said no`;
    writeJob(dir, {
      ...current,
      state: code === 0 ? 'done' : 'failed',
      exitCode: code,
      finishedAt: Date.now(),
      ...(giveUpReason ? { giveUpReason } : {}),
    });
    console.log(`  ${job.id} ${code === 0 ? 'done' : `FAILED - ${giveUpReason}`}`);
    if (code !== 0 && current.kind === 'merge' && current.branch) {
      console.log(`      re-queue with: node scripts/jobs.mjs add-merge ${current.branch}`);
    }
  });
}

// --- OS-facing helpers -------------------------------------------------------------------------

/**
 * Kill the whole process TREE, not just the shell.
 *
 * Killing only the shell is a documented way to leave a bench running as an orphan that holds a
 * concurrency slot invisibly for hours (e2e/AGENTS.md). On Windows only `taskkill /T` walks the
 * tree; on posix the child was started detached so it leads its own process group.
 */
function killTree(pid) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true });
    return;
  }
  try {
    process.kill(-pid, 'SIGKILL');
  } catch {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Already gone - the outcome we wanted.
    }
  }
}

/**
 * Look for reclaimable memory when the queue has been starved long enough, and say what it found.
 *
 * Returns the starvation clock to keep: reset after a reclaim, so the next one is another
 * fifteen minutes away rather than every poll. The DECISION is in `ram-reclaim.mjs`; the process
 * facts come from `e2e-runs.mjs`, whose orphan detector only answers at all when no Playwright
 * CLI is running anywhere - which is the safety argument for killing any of this.
 */
function reclaimIfStarved(starvedSince, now) {
  // THE CLOCK IS CHECKED BEFORE THE PROCESS TABLE, not after. Gathering the facts costs several
  // full `Get-CimInstance` enumerations, and this runs every five-second poll - so asking first
  // and gathering second is the difference between one heavy query per quarter of an hour and
  // nine hundred of them thrown away, on a machine that is short of memory by definition.
  if (!starvedSince || now - starvedSince < RECLAIM_AFTER_MS) return starvedSince;
  const plan = planReclaim({ starvedSince, now, candidates: reclaimCandidates(), holders: reclaimHolders() });
  if (plan.action !== 'reclaim') return starvedSince;
  for (const line of describeReclaim(plan)) console.log(line);
  for (const { candidate } of plan.kill) killTree(candidate.pid);
  return null;
}

/** Leftovers, each already PROVED orphaned by the detector that found it. */
function reclaimCandidates() {
  const { workers, shells, servers } = orphanProcesses();
  return [
    ...workers.map((p) => ({ pid: p.pid, kind: 'playwright-worker' })),
    ...shells.map((p) => ({ pid: p.pid, kind: 'headless-browser-shell' })),
    // A server's chain is children-first, so the shims cannot outlive what they were shimming.
    ...servers.flatMap((s) => s.chain.map((pid) => ({ pid, kind: 'orphaned-dev-server-chain' }))),
  ];
}

/** Who is still using the machine. Named so a person can decide; never touched. */
function reclaimHolders() {
  return activeRuns({}).map((run) => `${run.root ?? 'unknown checkout'} - ${run.kind ?? 'browser work'} (pid ${run.pid})`);
}

/** Signal-0 liveness. Throws only when the pid is gone (or is not ours to signal). */
function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM'; // alive, just not ours
  }
}

/**
 * The live runner's pid, or null. Read from the OS, so nothing goes stale.
 *
 * Delegates to `findRunner` rather than matching here. An earlier version required the command
 * line to contain this file's ABSOLUTE path, which only matched runners that `ensureRunner`
 * spawned: a runner started by hand as `node scripts/jobs.mjs --runner` was invisible, so the
 * listing said "NO RUNNER" while one was draining the queue - and, far worse, the next `add`
 * would have started a SECOND runner. Two schedulers reading one queue is the collision this
 * whole mechanism exists to prevent, so there is exactly one definition of "is a runner live".
 */
function runnerPid() {
  return findRunner(nodeProcesses(), { excludePid: process.pid });
}

/** Start a runner in the background if none is live. A duplicate start wastes a process, never a job. */
function ensureRunner() {
  if (runnerPid()) return;
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--runner'], {
    cwd: process.cwd(),
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
}

/**
 * Browser-driving work this queue did not start.
 *
 * `activeRuns()` sees every Playwright CLI on the machine, including the ones OUR jobs started.
 * We attribute a run to the queue when its checkout matches a running job's, and treat the rest
 * as outside work to subtract from capacity. That is an approximation - it errs towards counting
 * an ambiguous run as outside, which costs a slot rather than overloading the box.
 */
function outsideRuns(jobs) {
  const ours = new Set(jobs.filter((j) => j.state === 'running').map((j) => normalize(j.checkout)));
  return activeRuns({}).filter((run) => !ours.has(normalize(run.root))).length;
}

// Function declarations, not const arrows: the command dispatch at the top of this file runs
// before any `const` below it is initialised.
function normalize(p) {
  return String(p ?? '').replaceAll('\\', '/').toLowerCase().replace(/\/$/, '');
}
function freeMb() {
  return Math.round(freemem() / (1024 * 1024));
}

/**
 * The dev-server facts for one job: which port its CHECKOUT uses, and whether anything answers.
 *
 * Read from that checkout's generated `.claude/dev-port.json` rather than this process's own
 * reservation - the runner lives in one worktree and starts jobs in all of them, and the port is
 * per-checkout. A missing file means "cannot tell", which `devServerPrecheck` treats as go.
 */
async function devServerFacts(job) {
  if (!requiresRunningDevServer(job.command ?? '')) return {};
  let port;
  try {
    port = JSON.parse(readFileSync(join(job.checkout, '.claude', 'dev-port.json'), 'utf8')).port ?? null;
  } catch {
    return {}; // no generated record - fail open rather than refusing a job over a missing file
  }
  if (port === null) return {};
  return { port, busy: await isPortBusy(port, 750) };
}
function sleep(ms) {
  return new Promise((done) => setTimeout(done, ms));
}

function snapshot() {
  const jobs = readJobs(dir);
  return { jobs, ...schedule(jobs, { hour: new Date().getHours(), freeMemMb: freeMb(), outsideRuns: outsideRuns(jobs) }) };
}

function elapsed(startedAt) {
  if (!startedAt) return '';
  const min = Math.round((Date.now() - startedAt) / 60_000);
  return `${min} min`;
}

/** The commit a branch points at, or null if git cannot say. */
function branchTip(branch) {
  const res = spawnSync('git', ['rev-parse', branch], { encoding: 'utf8', windowsHide: true });
  return res.status === 0 ? res.stdout.trim() : null;
}

function currentBranch() {
  const res = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8', windowsHide: true });
  return res.status === 0 ? res.stdout.trim() : null;
}

export { finishedSince, readJobs, jobsDir };
