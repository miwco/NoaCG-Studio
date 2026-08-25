// THE JOB QUEUE'S STATE AND ARITHMETIC - everything that can be decided without spawning
// anything. `jobs.mjs` is the CLI and the drain loop; this file is what the tests drive.
//
// WHY A QUEUE EXISTS AT ALL (docs/JOB_RUNNER_PLAN.md has the measurements). Browser-driving work
// used to serialize itself by WAITING: `test:e2e:affected:queued` expands to
// `node scripts/e2e-runs.mjs --wait && ...`, a 5-second poll loop with no cap and no tie-break.
// Three things go wrong with that, and together they cost hours a day:
//
//   1. The agent's shell tool is killed at 600 s, so a foreground wait behind a twelve-minute
//      suite dies with the wait still running and the run never starts. Nothing reports it.
//   2. Every waiter wakes within 5 s of the slot freeing and they all launch together - the
//      exact collision the waiting was for.
//   3. Nothing anywhere shows a QUEUE, so "correctly queued" and "dead ten minutes ago" look
//      identical from outside.
//
// Enqueuing instead of waiting removes (1) by construction - no shell command outlives the tool
// that started it - and one runner draining the queue removes (2), because only one process
// decides what starts. This file's `pending()` output removes (3).
//
// SHAPE. One JSON file per job in <git-common-dir>/noacg-jobs/, the same shared directory the
// dev-port registry uses, so every worktree of this repo - and only this repo - sees one queue.
// A file per job rather than one queue file: two sessions enqueuing in the same second cannot
// lose each other's write, and a half-written file is one unreadable job rather than a corrupt
// queue. Ids are minted with the exclusive 'wx' flag, which is the whole concurrency story -
// the filesystem decides who won, exactly as it does for port tickets.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gitCommonDir } from './dev-port.mjs';

/** Job lifecycle. `waiting` and `running` are live; the rest are terminal. */
export const LIVE_STATES = Object.freeze(['waiting', 'running']);

/** What a job is. `merge` never runs beside anything, whatever the clock says. */
export const KINDS = Object.freeze(['gate', 'merge', 'sweep']);

/** Capacity policy. Night is for agents; the day belongs to the person using the laptop. */
export const POLICY = Object.freeze({
  nightFrom: 0, // 00:00 local, inclusive
  nightTo: 7, //  07:00 local, exclusive
  byDay: 1,
  byNight: 2,
  /**
   * Below this much free RAM nothing new starts, whatever the clock allows. 4 GB on a 16 GB box
   * is a starting point, not a measurement - `NOACG_JOBS_FREE_MB` retunes it without a code
   * change, which is how it should be set once the logs say what a run actually costs.
   */
  freeMemFloorMb: Number(process.env.NOACG_JOBS_FREE_MB ?? 4096),
  /** A job killed at this age is recorded `timed-out` rather than sitting forever. */
  capMinutes: 45,
});

/** The shared queue directory, or null outside a git checkout. */
export function jobsDir() {
  const common = gitCommonDir();
  return common ? join(common, 'noacg-jobs') : null;
}

/** Create the queue directory (and its log folder) if they are not there yet. */
export function ensureJobsDir(dir) {
  mkdirSync(join(dir, 'logs'), { recursive: true });
  return dir;
}

/**
 * Every readable job, oldest first.
 *
 * An unparseable file is SKIPPED and reported rather than throwing: a torn read during someone
 * else's write must not stop the queue, and a job nobody can read is one lost job, not an outage.
 */
export function readJobs(dir, { onUnreadable } = {}) {
  if (!dir || !existsSync(dir)) return [];
  const jobs = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    try {
      jobs.push(JSON.parse(readFileSync(join(dir, name), 'utf8')));
    } catch {
      onUnreadable?.(name);
    }
  }
  return jobs.sort((a, b) => (a.enqueuedAt ?? 0) - (b.enqueuedAt ?? 0) || String(a.id).localeCompare(String(b.id)));
}

/** Overwrite one job's file. Callers own the whole object; there is no partial update. */
export function writeJob(dir, job) {
  writeFileSync(join(dir, `${job.id}.json`), `${JSON.stringify(job, null, 1)}\n`);
  return job;
}

/**
 * Mint a new job.
 *
 * The id is claimed with 'wx' (create-only), so two sessions adding in the same millisecond
 * cannot land on the same id - the loser gets EEXIST and takes the next number. Same mechanism
 * as the port registry's tickets, for the same reason: the filesystem is the arbiter, and there
 * is no lock left behind if the process dies mid-claim.
 */
export function addJob(dir, { command, checkout, branch = null, kind = 'gate', after = [], capMinutes = POLICY.capMinutes, now }) {
  if (!KINDS.includes(kind)) throw new Error(`unknown job kind: ${kind}`);
  if (typeof command !== 'string' || command.trim() === '') throw new Error('a job needs a command');
  ensureJobsDir(dir);

  const taken = new Set(readdirSync(dir).filter((n) => n.endsWith('.json')).map((n) => n.slice(0, -5)));
  for (let n = 1; n <= 9999; n += 1) {
    const id = `j-${String(n).padStart(4, '0')}`;
    if (taken.has(id)) continue;
    const job = {
      id,
      kind,
      command,
      checkout,
      branch,
      after,
      capMinutes,
      enqueuedAt: now,
      state: 'waiting',
      startedAt: null,
      finishedAt: null,
      exitCode: null,
      pid: null,
      logPath: join(dir, 'logs', `${id}.log`),
    };
    try {
      writeFileSync(join(dir, `${id}.json`), `${JSON.stringify(job, null, 1)}\n`, { flag: 'wx' });
      return job;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      // Someone else took this id between the listing and the write. Walk on.
    }
  }
  throw new Error('no free job id - the queue directory holds 9999 jobs');
}

/**
 * How many jobs may be RUNNING right now.
 *
 * `outsideRuns` is browser-driving work this queue did not start - another coding agent, or a
 * hand-run command. It is invisible to the queue but visible to `e2e-runs.mjs activeRuns()`, so
 * we subtract it before starting anything. Cooperation is an optimisation here; the OS process
 * table stays the source of truth.
 */
export function capacity({ hour, freeMemMb, outsideRuns = 0, policy = POLICY }) {
  if (freeMemMb < policy.freeMemFloorMb) return 0;
  const isNight = hour >= policy.nightFrom && hour < policy.nightTo;
  return Math.max(0, (isNight ? policy.byNight : policy.byDay) - outsideRuns);
}

/** Whether a job's `after:` dependencies have all finished green. */
export function dependenciesMet(job, byId) {
  return (job.after ?? []).every((id) => byId.get(id)?.state === 'done');
}

/** A job whose dependency failed can never run - it is cancelled rather than left waiting. */
export function dependenciesDead(job, byId) {
  return (job.after ?? []).some((id) => {
    const dep = byId.get(id);
    return dep === undefined || ['failed', 'timed-out', 'cancelled'].includes(dep.state);
  });
}

/**
 * Which jobs should start now, and why each of the rest is waiting.
 *
 * The reason matters as much as the decision: "capacity 1/1" and "waiting on j-0006" and
 * "RAM 3.1 GB free" are three completely different situations that all look like "nothing is
 * happening" from outside, which is the thing this whole mechanism exists to end.
 */
export function schedule(jobs, { hour, freeMemMb, outsideRuns = 0, policy = POLICY }) {
  const byId = new Map(jobs.map((j) => [j.id, j]));
  const running = jobs.filter((j) => j.state === 'running');
  const slots = capacity({ hour, freeMemMb, outsideRuns, policy });

  const start = [];
  const waiting = [];
  let used = running.length;
  const mergeLive = () => [...running, ...start].some((j) => j.kind === 'merge');

  for (const job of jobs.filter((j) => j.state === 'waiting')) {
    if (dependenciesDead(job, byId)) {
      waiting.push({ job, reason: 'a job it depends on did not finish green' });
      continue;
    }
    if (!dependenciesMet(job, byId)) {
      waiting.push({ job, reason: `waiting on ${job.after.filter((id) => byId.get(id)?.state !== 'done').join(', ')}` });
      continue;
    }
    // A merge never runs beside anything, and nothing starts beside a merge. That is what makes
    // "one branch at a time" structural rather than remembered.
    if (mergeLive() || (job.kind === 'merge' && used > 0)) {
      waiting.push({ job, reason: 'a merge runs alone' });
      continue;
    }
    if (freeMemMb < policy.freeMemFloorMb) {
      waiting.push({ job, reason: `only ${(freeMemMb / 1024).toFixed(1)} GB RAM free` });
      continue;
    }
    if (used >= slots) {
      waiting.push({ job, reason: `capacity ${used}/${slots}${outsideRuns ? ` (${outsideRuns} outside this queue)` : ''}` });
      continue;
    }
    start.push(job);
    used += 1;
  }
  return { start, waiting, running, slots };
}

/**
 * Jobs recorded `running` whose process is gone - a runner that was killed, or a reboot.
 *
 * Without this a crashed runner leaves the queue permanently full of phantom work. With it, the
 * next runner start reaps them, so a dead runner is a delay rather than a stall.
 */
export function reapDead(jobs, isAlive, now) {
  const reaped = [];
  for (const job of jobs.filter((j) => j.state === 'running')) {
    if (job.pid && isAlive(job.pid)) continue;
    reaped.push({ ...job, state: 'failed', finishedAt: now, exitCode: null, reapedAsDead: true });
  }
  return reaped;
}

/**
 * The pid of a live drain loop in `processes`, or null.
 *
 * Read from the OS process list rather than a pidfile, for the same reason `e2e-runs.mjs` reads
 * the process table: a crashed runner leaves no stale claim behind, so the answer is
 * self-cleaning. `excludePid` keeps a runner from finding itself.
 */
export function findRunner(processes, { excludePid = null } = {}) {
  const match = processes.find(
    (p) => p.pid !== excludePid && /jobs\.mjs/.test(p.command ?? '') && /--runner\b/.test(p.command ?? ''),
  );
  return match?.pid ?? null;
}

/** Everything still live, for the CLI and the SessionStart summary. */
export function pending(jobs) {
  return jobs.filter((j) => LIVE_STATES.includes(j.state));
}

/** Jobs that reached a terminal state at or after `since` - the "what happened while I was away" list. */
export function finishedSince(jobs, since) {
  return jobs.filter((j) => !LIVE_STATES.includes(j.state) && (j.finishedAt ?? 0) >= since);
}
