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

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gitCommonDir } from './dev-port.mjs';
import { invokesE2e, invokesSweep, requiresRunningDevServer } from './command-match.mjs';

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
      const job = JSON.parse(readFileSync(join(dir, name), 'utf8'));
      // The queue directory also holds SIDECARS - `last-seen.json` is one - and a file that is
      // not a job must not be returned as a job with no id. It reached every consumer of this
      // list as an entry with `undefined` state until it was noticed; a prune deciding what is
      // old enough to delete is not the place to meet it for the first time.
      if (job && typeof job.id === 'string') jobs.push(job);
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
  // Ids continue from the highest one still on disk rather than restarting at the first free
  // number. Pruning (below) frees the oldest ids, and reusing one immediately would give a fresh
  // job the id an old log, an old landing record and somebody's notes already refer to. Scanning
  // from the high-water mark keeps ids moving forward for as long as anything recent is kept,
  // which is always; it also removes the hard stop at 9999, since the scan now wraps into the
  // low numbers the prune has released instead of throwing.
  const highest = [...taken].reduce((max, id) => {
    const n = Number(/^j-(\d{4})$/.exec(id)?.[1]);
    return Number.isInteger(n) && n > max ? n : max;
  }, 0);
  for (let step = 0; step < 9999; step += 1) {
    const n = ((highest + step) % 9999) + 1;
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
 * How long a FINISHED job's record and log are kept.
 *
 * Fourteen days is the window anybody actually reads back over - "what ran while I was away" is a
 * question about last night, and the CI classification work that needs a fortnight reads GitHub,
 * not this directory. Below that the queue grows without limit: 222 job files and 205 logs
 * accumulated in the queue's first four days, at about 55 jobs a day, which reaches the 9999-id
 * ceiling inside six months and makes every listing read the lot.
 */
export const JOB_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

/** The ids of terminal jobs past the retention window. Live jobs are never expired, at any age. */
export function expiredJobIds(jobs, now, { retentionMs = JOB_RETENTION_MS } = {}) {
  return jobs
    .filter((job) => !LIVE_STATES.includes(job.state))
    .filter((job) => {
      // A job that finished says when; one that never started is dated by when it was queued.
      const at = job.finishedAt ?? job.enqueuedAt;
      return Number.isFinite(at) && now - at > retentionMs;
    })
    .map((job) => job.id);
}

/**
 * Delete the records and logs of jobs past the retention window. Returns the ids removed.
 *
 * OPPORTUNISTIC, never a daemon: it is called from the queue's own entry points, so the sweep
 * happens exactly when somebody is already using the queue and costs one directory read they were
 * paying for anyway. A second background process to tidy the first one's files would be a new
 * thing to crash, and there is nothing here urgent enough to justify one.
 *
 * A file that cannot be deleted (another process reading it, a lock) is left for next time rather
 * than reported: the caller asked for a job id or a listing, not for a filesystem verdict.
 */
export function pruneJobs(dir, { now = Date.now(), retentionMs = JOB_RETENTION_MS } = {}) {
  if (!dir || !existsSync(dir)) return [];
  const removed = [];
  for (const id of expiredJobIds(readJobs(dir), now, { retentionMs })) {
    try {
      rmSync(join(dir, `${id}.json`));
      removed.push(id);
    } catch {
      continue; // still in use - leave the log alone too, so the pair stays consistent
    }
    try {
      rmSync(join(dir, 'logs', `${id}.log`));
    } catch {
      // no log, or already gone: the record is what the listing reads, and it is gone
    }
  }
  return removed;
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

/** A job whose dependency reached a terminal state that is not `done`. */
export function dependenciesDead(job, byId) {
  return (job.after ?? []).some((id) => {
    const dep = byId.get(id);
    return dep === undefined || ['failed', 'timed-out', 'cancelled'].includes(dep.state);
  });
}

/**
 * What a job's dependencies say it should do now: `go`, `wait`, `release`, or `dead`.
 *
 * WHY `release` EXISTS, AND ONLY FOR LANDINGS. `--after` on a merge job means "not before that
 * one", which is a matter of TURN, not of permission: landings are order-free, each is fully
 * re-verified against whatever main it finds, and the queue already refuses to run two at once.
 * So when the predecessor reaches ANY terminal state, the question the dependency was asking has
 * been answered and this landing may go. It used to sit at "a job it depends on did not finish
 * green" for ever instead - measured 2026-08-28, a landing chained behind a failed one simply
 * never ran and nothing anywhere said it had stopped trying.
 *
 * For every OTHER kind the old reading is right and it is now acted on rather than merely
 * printed: a gate that was to run after a build cannot mean anything once that build failed, so
 * the job is FAILED with the reason on it rather than left waiting for a state that will never
 * arrive.
 */
export function dependencyDecision(job, byId) {
  if (dependenciesMet(job, byId)) return { action: 'go' };
  const spent = (job.after ?? []).filter((id) => byId.get(id)?.state !== 'done');
  if (!dependenciesDead(job, byId)) return { action: 'wait', reason: `waiting on ${spent.join(', ')}` };
  if (job.kind === 'merge') {
    return {
      action: 'release',
      reason: `${spent.join(', ')} did not finish green - landings are order-free, so this one goes anyway`,
    };
  }
  return { action: 'dead', reason: `${spent.join(', ')} did not finish green, so this job can never run` };
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
  /** Jobs the caller must write off - their dependencies can never be met. Never left waiting. */
  const dead = [];
  /** Landings let through despite a dead dependency, with the reason to print. */
  const released = [];
  let used = running.reduce((sum, j) => sum + costOf(j), 0);
  const mergeLive = () => [...running, ...start].some((j) => j.kind === 'merge');

  for (const job of jobs.filter((j) => j.state === 'waiting')) {
    const deps = dependencyDecision(job, byId);
    if (deps.action === 'wait') {
      waiting.push({ job, reason: deps.reason });
      continue;
    }
    if (deps.action === 'dead') {
      dead.push({ job, reason: deps.reason });
      continue;
    }
    // Recorded only if the job actually starts below - a note about a job that is still waiting
    // for a slot would be printed on every poll and mean nothing.
    const releasedBecause = deps.action === 'release' ? deps.reason : null;
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
    if (releasedBecause) released.push({ job, reason: releasedBecause });
    used += cost;
  }
  return { start, waiting, dead, released, running, slots };
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

/**
 * The longest a session may wait on a queued job in the FOREGROUND.
 *
 * Matched to the cap in `e2e-runs.mjs --wait` and `e2e/_offline-guard.ts`, and for the same
 * reason: the agent's shell tool is killed at 600 s, so from ten minutes on a foreground wait is
 * a process nobody is reading. Thirty minutes is generous for "I need the verdict now" and short
 * enough that the answer to a longer job is what it should always have been - hand off and let
 * the runner finish it.
 */
export const FOREGROUND_WAIT_CAP_MS = 30 * 60_000;

/**
 * What a foreground wait should do now: report, keep waiting, or give up and hand off.
 *
 * Pure, because the bound is the point. An unbounded version of this ran for five hours on
 * 2026-08-28 and reported nothing at all, which is indistinguishable from a wait that has died.
 */
export function waitVerdict({ job, waitedMs, capMs = FOREGROUND_WAIT_CAP_MS }) {
  if (!job) return { action: 'unknown', message: 'no such job' };
  if (!LIVE_STATES.includes(job.state)) {
    return { action: 'finished', state: job.state, exitCode: job.exitCode ?? null };
  }
  if (waitedMs >= capMs) {
    return {
      action: 'give-up',
      message:
        `${job.id} is still ${job.state} after ${Math.round(capMs / 60_000)} minutes. Nothing was interrupted - ` +
        'it keeps running.\n' +
        `  Hand off rather than waiting longer: the runner finishes it, and \`node scripts/jobs.mjs log ${job.id}\`` +
        ' has the output whenever anyone looks.',
    };
  }
  return { action: 'wait' };
}

/** Everything still live, for the CLI and the SessionStart summary. */
export function pending(jobs) {
  return jobs.filter((j) => LIVE_STATES.includes(j.state));
}

/**
 * Should this job start, given that some jobs MEASURE the app through a dev server they do not
 * start themselves?
 *
 * A sweep whose port answers nothing spends its entire slot collecting ERR_CONNECTION_REFUSED and
 * then reports a failure that reads like the app is broken. Failing it in the first second, with
 * the one sentence that fixes it, costs the queue nothing and the reader nothing.
 *
 * FAILS OPEN when the port cannot be worked out: `.claude/dev-port.json` is generated per
 * checkout and can be missing on a fresh clone, and refusing to run a job because a generated
 * file is absent would be a worse failure than the one this prevents.
 */
export function devServerPrecheck(job, { port = null, busy = false } = {}) {
  if (!requiresRunningDevServer(job.command ?? '')) return { action: 'go' };
  if (port === null || busy) return { action: 'go' };
  return {
    action: 'fail',
    reason:
      `nothing is listening on port ${port}, and this job measures the app through a dev server it does not start. ` +
      `Start the dev server in ${job.checkout} (node scripts/dev-port.mjs prints its port), then queue this again.`,
  };
}

/**
 * The queue's answer for one branch in the outstanding listing: queued, gave up, or never queued.
 *
 * "Not queued" used to be the answer for BOTH a branch nobody declared finished and a branch
 * whose landing died - deferrals exhausted, a refusal, a timeout - because a terminal job is
 * invisible to `pending`. Those are opposite situations: one needs its session to finish, the
 * other needs a person to read a log. A landing that fails must stay visible as a failed
 * LANDING, so `gave-up` names the newest dead merge job, carries the reason it gave up, and
 * hands back the exact command that queues it again. A cancelled job reads as `withdrawn` for the
 * same reason: "not queued" may never describe a branch that WAS queued, whatever became of it.
 */
export function landingStateFor(branch, jobs) {
  const requeue = `node scripts/jobs.mjs add-merge ${branch}`;
  const mine = jobs.filter((j) => j.kind === 'merge' && j.branch === branch);
  const live = mine.filter((j) => LIVE_STATES.includes(j.state));
  if (live.length > 0) return { state: 'queued', job: live[live.length - 1], reason: null, requeue: null };
  const terminal = [...mine].sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0));
  const last = terminal[terminal.length - 1];
  if (!last) return { state: 'not-queued', job: null, reason: null, requeue: null };
  // A WITHDRAWN landing is not a branch nobody queued. It reads differently from a failure - a
  // person did it on purpose - but printing it as "not queued" made a deliberate act look like
  // unfinished work, which is the same lie in the other direction.
  if (last.state === 'cancelled') return { state: 'withdrawn', job: last, reason: 'a person cancelled it', requeue };
  return { state: 'gave-up', job: last, reason: giveUpReason(last), requeue };
}

/**
 * WHY a landing stopped, in the words of the fact that stopped it.
 *
 * Every one of these vanished silently at some point on 2026-08-28: a job killed at its cap
 * mid-CI-wait, a job whose runner died with the machine, a job that spent its deferrals waiting
 * for a turn that never came. "LANDING FAILED j-0126" alone sends a person to a log to find out
 * which of those happened; the answer is already in the job row, so it is printed.
 */
export function giveUpReason(job) {
  if (job.giveUpReason) return job.giveUpReason;
  if (job.state === 'timed-out') return `killed at its ${job.capMinutes ?? '?'} min cap - probably still waiting on CI`;
  if (job.reapedAsDead) return 'its process vanished - the runner died or the machine slept';
  if (job.exitCode === 3) return 'still blocked by another branch after every deferral';
  // Not this branch's fault, and the listing must say so: five landings queued against a red main
  // all stop here, and five identical lines are how a person sees the fault is upstream of all of
  // them rather than opening five logs looking for five different causes.
  if (job.exitCode === 4) return 'main itself is red - fix main first (node scripts/main-health.mjs)';
  if (typeof job.exitCode === 'number') return `auto-merge refused it (exit ${job.exitCode})`;
  return 'it stopped without recording why';
}

/**
 * The outstanding listing's line for one branch: what its landing did, and the exact command that
 * puts it back. Kept here, beside the state it reads, so the listing and the tests share one
 * definition of what "loud" means.
 */
export function landingRow(branch, jobs) {
  const landing = landingStateFor(branch, jobs);
  if (landing.state === 'queued') return `QUEUED ${landing.job.id}`;
  if (landing.state === 'not-queued') return 'not queued';
  const label = landing.state === 'withdrawn' ? 'LANDING WITHDRAWN' : 'LANDING FAILED';
  return (
    `${label} ${landing.job.id} (${landing.job.state}) - ${landing.reason}\n` +
    `        log: node scripts/jobs.mjs log ${landing.job.id}   ·   re-queue: ${landing.requeue}`
  );
}

/** Jobs that reached a terminal state at or after `since` - the "what happened while I was away" list. */
export function finishedSince(jobs, since) {
  return jobs.filter((j) => !LIVE_STATES.includes(j.state) && (j.finishedAt ?? 0) >= since);
}
