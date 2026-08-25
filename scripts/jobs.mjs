#!/usr/bin/env node
// THE JOB QUEUE - enqueue heavy work instead of waiting for it.
//
//   node scripts/jobs.mjs add "npm run test:e2e:affected"   # prints an id, exits at once
//   node scripts/jobs.mjs add "npm run build" --after j-0007
//   node scripts/jobs.mjs                                   # running + waiting, with reasons
//   node scripts/jobs.mjs --json
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
import { fileURLToPath } from 'node:url';
import { activeRuns } from './e2e-runs.mjs';
import { nodeProcesses } from './e2e-runs.mjs';
import {
  POLICY,
  addJob,
  costOf,
  ensureJobsDir,
  findRunner,
  finishedSince,
  jobsDir,
  pending,
  readJobs,
  reapDead,
  schedule,
  writeJob,
} from './jobs-store.mjs';

const POLL_MS = 5_000;
/** The runner exits after this long with nothing live, so no daemon outlives the work. */
const IDLE_EXIT_MS = 60_000;

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

if (flag('--runner')) await runner();
else if (args[0] === 'add') await cmdAdd();
else if (args[0] === 'add-merge') await cmdAddMerge();
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
  const target = args[1];
  if (!target || target.startsWith('-')) {
    console.error('Usage: node scripts/jobs.mjs add-merge <branch> [--after <id>]');
    process.exit(1);
  }
  ensureJobsDir(dir);
  const job = addJob(dir, {
    command: `node scripts/auto-merge.mjs --branch ${target}`,
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
  const { jobs, start, waiting, running, slots } = snapshot();
  if (flag('--json')) {
    process.stdout.write(`${JSON.stringify({ running, waiting: waiting.map((w) => ({ ...w.job, reason: w.reason })), starting: start, slots })}\n`);
    return;
  }
  if (pending(jobs).length === 0) {
    console.log('Job queue empty.');
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
  if (job.state === 'running' && job.pid) killTree(job.pid);
  writeJob(dir, { ...job, state: 'cancelled', finishedAt: Date.now() });
  console.log(`${job.id} cancelled.`);
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
    const { start } = schedule(jobs, { hour: new Date(now).getHours(), freeMemMb: freeMb(), outsideRuns: outsideRuns(jobs) });
    for (const job of start) spawnJob(job);

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
    writeJob(dir, { ...current, state: code === 0 ? 'done' : 'failed', exitCode: code, finishedAt: Date.now() });
    console.log(`  ${job.id} ${code === 0 ? 'done' : `FAILED (exit ${code})`}`);
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

function currentBranch() {
  const res = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8', windowsHide: true });
  return res.status === 0 ? res.stdout.trim() : null;
}

export { finishedSince, readJobs, jobsDir };
