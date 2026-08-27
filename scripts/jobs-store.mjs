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
import { invokesE2e, invokesSweep } from './command-match.mjs';

/** Job lifecycle. `waiting` and `running` are live; the rest are terminal. */
export const LIVE_STATES = Object.freeze(['waiting', 'running']);

/** What a job is. `merge` never runs beside anything, whatever the clock says. */
export const KINDS = Object.freeze(['gate', 'merge', 'sweep']);

/**
 * What a job COSTS, in suite-equivalents.
 *
 * Counting jobs was the crude part. A Playwright suite is a dev server plus four browser workers
 * - two of them together were measured at 34 `chrome-headless-shell` processes, 93% CPU and
 * under 2 GB free. A merge job is almost entirely `gh run watch` waiting on GitHub's network,
 * and it used to occupy a whole slot for ten minutes while a suite queued behind it. That is the
 * overnight case exactly: "land these five branches" is five jobs that are nearly all idle.
 *
 * Heavy work is classified by `command-match.mjs`, the repo's ONE named list of what starts
 * browser work - the same authority the guard hook and the process detector read, so a script
 * that is heavy here is heavy everywhere rather than in a second opinion that can drift.
 */
export const COST = Object.freeze({ browser: 1, merge: 0.15, other: 0.4 });

/** Capacity policy. Night is for agents; the day belongs to the person using the laptop. */
export const POLICY = Object.freeze({
  nightFrom: 0, // 00:00 local, inclusive
  nightTo: 7, //  07:00 local, exclusive
  /** Budgets in suite-equivalents, not job counts. */
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
export function capacity({ hour, outsideRuns = 0, policy = POLICY }) {
  // The free-RAM floor is deliberately NOT here. It is an admission check on one job, scaled by
  // what that job costs (see `schedule`), because zeroing the whole budget on a suite-sized
  // threshold also stopped the landings - the cheapest jobs there are, and the ones that most
  // need to finish overnight.
  const isNight = hour >= policy.nightFrom && hour < policy.nightTo;
  // An outside run is browser work by definition - `activeRuns` only reports Playwright CLIs and
  // sweeps - so it costs a full suite-equivalent.
  return Math.max(0, (isNight ? policy.byNight : policy.byDay) - outsideRuns * COST.browser);
}

/**
 * Commands we KNOW are cheap: CPU and a little RAM, no dev server, no browser.
 *
 * The list is deliberately short and explicit. Everything it does not recognise is charged as a
 * full suite, because the failure directions are not symmetric: charging a cheap job too much
 * costs some wall clock at night, while charging an expensive one too little puts two dev
 * servers and eight browser workers on a 16 GB laptop and slows everything down at once.
 */
const CHEAP = [/\bnpm\s+run\s+build\b/, /\bnode\s+--test\b/, /\bnpm\s+run\s+lint\b/, /\btsc\b/, /\bnpm\s+run\s+check:/];

/**
 * What one job costs, in suite-equivalents.
 *
 * A job records its cost when it is queued, so the number is visible in the queue and stable for
 * the job's whole life; this is where that default comes from.
 */
export function costOf(job) {
  if (typeof job.cost === 'number') return job.cost;
  if (job.kind === 'merge') return COST.merge;
  const command = job.command ?? '';
  if (invokesE2e(command) || invokesSweep(command)) return COST.browser;
  return CHEAP.some((p) => p.test(command)) ? COST.other : COST.browser;
}

/** Budgets are fractional; print them without floating-point noise. */
function round(n) {
  return Math.round(n * 100) / 100;
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
  let used = running.reduce((sum, j) => sum + costOf(j), 0);
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
    // TWO MERGES NEVER OVERLAP. That is what makes "land one branch at a time" structural
    // rather than remembered, and it holds whatever the clock or the budget says.
    if (job.kind === 'merge' && mergeLive()) {
      waiting.push({ job, reason: 'another landing is in flight' });
      continue;
    }
    // A merge rewrites the working tree of the checkout it runs in, so it must not run beside
    // anything IN THAT CHECKOUT - a suite there would have the ground moved under it mid-run.
    // Beside work in a DIFFERENT worktree it is harmless, which is what lets a night drain
    // several landings alongside a suite instead of behind it.
    const sharesCheckout = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();
    const live = [...running, ...start];
    if (
      (job.kind === 'merge' && live.some((j) => sharesCheckout(j.checkout, job.checkout))) ||
      live.some((j) => j.kind === 'merge' && sharesCheckout(j.checkout, job.checkout))
    ) {
      waiting.push({ job, reason: 'a landing is using that checkout' });
      continue;
    }
    const cost = costOf(job);
    // THE FLOOR SCALES WITH THE JOB. It exists to stop a dev server and four browser workers
    // starting on a box that is already short - not to stop a landing, which is a few hundred
    // megabytes spending ten minutes in `gh run watch`. Charging a 0.15 job the full 4 GB
    // stalled exactly the work the owner cares most about finishing overnight.
    if (freeMemMb < policy.freeMemFloorMb * cost) {
      waiting.push({
        job,
        reason: `only ${(freeMemMb / 1024).toFixed(1)} GB RAM free, needs ${(policy.freeMemFloorMb * cost / 1024).toFixed(1)}`,
      });
      continue;
    }
    // A LANDING IS NOT CHARGED AGAINST THE SUITE BUDGET. The budget protects RAM and CPU, and a
    // landing uses neither meaningfully - it is a couple of git commands and then ten minutes in
    // `gh run watch`. Its concurrency is governed by its own rules instead, which are stricter
    // where it matters: two never overlap, and none runs in a checkout something else is using.
    // Without this exemption one suite in another worktree consumed the whole day budget and
    // stalled every landing behind it - the opposite of "merge latency is the bottleneck".
    if (job.kind !== 'merge' && used + cost > slots) {
      waiting.push({
        job,
        reason: `budget ${round(used)}/${round(slots)} used${outsideRuns ? `, ${outsideRuns} run(s) outside this queue` : ''}`,
      });
      continue;
    }
    start.push(job);
    used += cost;
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

/**
 * Branches this queue has landed, oldest first.
 *
 * Automating the merge took the ANSWER off the owner's desk along with the decision: with
 * landings happening in a background runner, "which branches are in, and therefore which sessions
 * are finished?" stopped being visible anywhere. This ledger is what puts it back - SessionStart
 * announces it in the worktree whose branch landed, and `npm run jobs` lists it for everyone else.
 */
export function readLandings(dir) {
  if (!dir) return [];
  try {
    return readFileSync(join(dir, 'landed.jsonl'), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null; // one torn line must not hide every landing before it
        }
      })
      .filter(Boolean);
  } catch {
    return []; // nothing has landed through the queue yet
  }
}

/** The most recent landing of the branch checked out at `worktree`, or null. */
export function landingForWorktree(landings, worktree) {
  const want = String(worktree ?? '').replaceAll('\\', '/').toLowerCase().replace(/\/$/, '');
  if (!want) return null;
  const mine = landings.filter((l) => String(l.worktree ?? '').replaceAll('\\', '/').toLowerCase().replace(/\/$/, '') === want);
  return mine.length > 0 ? mine[mine.length - 1] : null;
}

/** Everything still live, for the CLI and the SessionStart summary. */
export function pending(jobs) {
  return jobs.filter((j) => LIVE_STATES.includes(j.state));
}

/**
 * The queue's answer for one branch in the outstanding listing: queued, gave up, or never queued.
 *
 * "Not queued" used to be the answer for BOTH a branch nobody declared finished and a branch
 * whose landing died - deferrals exhausted, a refusal, a timeout - because a terminal job is
 * invisible to `pending`. Those are opposite situations: one needs its session to finish, the
 * other needs a person to read a log. A landing that fails must stay visible as a failed
 * LANDING, so `gave-up` names the newest dead merge job and its log is one command away.
 * A cancelled job is deliberate - a person withdrew it - so it reads as not queued.
 */
export function landingStateFor(branch, jobs) {
  const mine = jobs.filter((j) => j.kind === 'merge' && j.branch === branch);
  const live = mine.filter((j) => LIVE_STATES.includes(j.state));
  if (live.length > 0) return { state: 'queued', job: live[live.length - 1] };
  const dead = mine
    .filter((j) => ['failed', 'timed-out'].includes(j.state))
    .sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0));
  if (dead.length > 0) return { state: 'gave-up', job: dead[dead.length - 1] };
  return { state: 'not-queued', job: null };
}

/** Jobs that reached a terminal state at or after `since` - the "what happened while I was away" list. */
export function finishedSince(jobs, since) {
  return jobs.filter((j) => !LIVE_STATES.includes(j.state) && (j.finishedAt ?? 0) >= since);
}
