#!/usr/bin/env node
// THE WATCH LOOP'S ONE COMMAND - the whole observation leg of an orchestrator tick, and only
// observation (docs/ORCHESTRATION_NEXT.md §3; .agent-workflows/orchestrator.md "The watch loop").
//
//   node scripts/wave-tick.mjs             # fetch, look at everything, print what CHANGED
//   node scripts/wave-tick.mjs --no-fetch  # same, without touching the network
//
// Before this existed a tick was several commands the orchestrator ran and parsed itself - fetch,
// per-branch ancestor checks, `npm run jobs`, `blocked-sessions` - most of whose output restated
// what the previous tick already said. This script keeps the previous tick's snapshot in
// `<git-common-dir>/noacg-jobs/wave-tick-state.json` (beside the job store, same lifetime rules)
// and prints only the DELTA: what landed, what was queued, what refused and how, who started or
// stopped waiting, and any branch that looks finished but was never queued. A tick where nothing
// changed prints one line. The judgement about what to DO with an event never lives here - this
// script launches nothing, kills nothing, merges nothing, and messages nobody.
//
// THE FINISHED-BUT-UNQUEUED CHECK is the mechanism for the most repeated 2026-08-30 failure:
// three sessions finished their work, armed a watcher, and ended - each leaving a green branch
// committed and never queued. An in-session Stop hook was considered and rejected (it fires at
// every turn end, so it would warn on every mid-work pause, and a crashed session never fires it
// at all); from out here the state is unambiguous to observe and cheap to re-check. "Finished-
// looking" is deliberately modest: ahead of main, clean tree, no commit for QUIET_MINUTES, not
// queued, not landed. Whether it is actually done is the orchestrator's judgement - this only
// makes the shape visible while somebody can still act on it.

import { spawnSync } from 'node:child_process';
import { existsSync, appendFileSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { jobsDir, readJobs, landingStateFor, giveUpReason } from './jobs-store.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

export const STATE_VERSION = 1;

/** No commit for this long, on a clean unqueued branch ahead of main, is worth a delta line. */
export const QUIET_MINUTES = 30;

// ── Pure decisions ───────────────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const args = { fetch: true, json: false, quietMinutes: QUIET_MINUTES, statePath: null, wavePlan: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = () => argv[index += 1];
    if (token === '--no-fetch') args.fetch = false;
    else if (token === '--json') args.json = true;
    else if (token === '--quiet-minutes') args.quietMinutes = Number(next());
    else if (token === '--state') args.statePath = next();
    else if (token === '--wave-plan') args.wavePlan = next();
    else if (token === '--help' || token === '-h') args.help = true;
    else throw new Error(`unknown argument: ${token}`);
  }
  if (!Number.isFinite(args.quietMinutes) || args.quietMinutes <= 0) {
    throw new Error('--quiet-minutes must be a positive number');
  }
  return args;
}

/**
 * A branch "looks finished and was never queued" - the ended-expecting-a-watcher shape. Modest by
 * design: this cannot know the build was green or the session's intent, only that work stopped
 * arriving and nothing was handed to the queue.
 */
export function looksFinishedUnqueued(branch, { now, quietMinutes = QUIET_MINUTES } = {}) {
  return Boolean(
    !branch.landed
    && branch.worktree
    && branch.worktree.clean
    && branch.landingState === 'not-queued'
    && Number.isFinite(branch.lastCommitMs)
    && now - branch.lastCommitMs >= quietMinutes * 60_000,
  );
}

/**
 * The delta between two snapshots, as printable events. Every event names its branch or session,
 * because the reader is deciding what to do next, not admiring a dashboard.
 */
export function deltaBetween(previous, current, { quietMinutes = QUIET_MINUTES } = {}) {
  const events = [];
  const prevBranches = previous?.branches ?? {};
  const prevBlocked = new Set(previous?.blocked ?? []);
  const prevUnqueued = new Set(previous?.finishedUnqueued ?? []);
  const prevFailedJobs = new Set(previous?.failedJobs ?? []);

  for (const branch of current.branches) {
    const before = prevBranches[branch.name];
    if (branch.landed && before && !before.landed) events.push(`LANDED ${branch.name}`);
    if (!branch.landed && !before) events.push(`NEW BRANCH ahead of main: ${branch.name}`);
    if (branch.landingState === 'queued' && before && before.landingState !== 'queued') {
      events.push(`QUEUED ${branch.name}`);
    }
  }
  for (const failure of current.failedJobs) {
    if (!prevFailedJobs.has(failure.id)) {
      events.push(`LANDING GAVE UP ${failure.branch ?? '(no branch)'} - ${failure.reason} (re-queue: node scripts/jobs.mjs add-merge ${failure.branch ?? '<branch>'})`);
    }
  }
  for (const session of current.blocked) {
    if (!prevBlocked.has(session.key)) {
      events.push(`WAITING ${session.key} - ${session.detail}`);
    }
  }
  for (const key of prevBlocked) {
    if (!current.blocked.some((session) => session.key === key)) events.push(`NO LONGER WAITING ${key}`);
  }
  for (const branch of current.branches) {
    if (looksFinishedUnqueued(branch, { now: current.at, quietMinutes }) && !prevUnqueued.has(branch.name)) {
      events.push(`FINISHED-LOOKING AND UNQUEUED ${branch.name} - clean tree, no commit for `
        + `${Math.floor((current.at - branch.lastCommitMs) / 60_000)} min, nothing queued. If its session `
        + 'ended believing a watcher would queue it, nothing will.');
    }
  }
  return events;
}

/** What the next tick compares against. Only what the delta needs - never a second job store. */
export function nextState(current, { tick }) {
  const branches = {};
  for (const branch of current.branches) {
    branches[branch.name] = { sha: branch.sha, landed: branch.landed, landingState: branch.landingState };
  }
  return {
    v: STATE_VERSION,
    tick,
    at: new Date(current.at).toISOString(),
    branches,
    blocked: current.blocked.map((session) => session.key),
    failedJobs: current.failedJobs.map((failure) => failure.id),
    finishedUnqueued: current.branches
      .filter((branch) => looksFinishedUnqueued(branch, { now: current.at, quietMinutes: current.quietMinutes }))
      .map((branch) => branch.name),
  };
}

export function summaryLine(current) {
  const ahead = current.branches.filter((branch) => !branch.landed);
  const running = current.jobs.filter((job) => job.state === 'running').length;
  const waiting = current.jobs.filter((job) => job.state === 'waiting').length;
  return `${ahead.length} branch(es) ahead of main, ${running} job(s) running, ${waiting} waiting, `
    + `${current.blocked.length} session(s) waiting on a call`;
}

export function heartbeatLine({ tick, at, summary }) {
  return `- tick ${tick} at ${new Date(at).toISOString()}: ${summary}`;
}

// ── The side-effecting shell ─────────────────────────────────────────────────────────────────────

function git(args, cwd = REPO_ROOT) {
  const run = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return { ok: run.status === 0, out: String(run.stdout ?? '').trim(), err: String(run.stderr ?? '').trim() };
}

function localBranches() {
  const refs = git(['for-each-ref', 'refs/heads', '--format=%(refname:short) %(objectname)']);
  if (!refs.ok) return [];
  return refs.out.split('\n').filter(Boolean).map((line) => {
    const space = line.lastIndexOf(' ');
    return { name: line.slice(0, space), sha: line.slice(space + 1) };
  });
}

function worktreeByBranch() {
  const list = git(['worktree', 'list', '--porcelain']);
  const map = new Map();
  if (!list.ok) return map;
  let current = null;
  for (const line of list.out.split('\n')) {
    if (line.startsWith('worktree ')) current = { path: line.slice('worktree '.length) };
    else if (line.startsWith('branch refs/heads/') && current) {
      const name = line.slice('branch refs/heads/'.length);
      const status = git(['status', '--porcelain=v1'], current.path);
      map.set(name, { path: current.path, clean: status.ok && status.out === '' });
    }
  }
  return map;
}

function blockedSessions() {
  const run = spawnSync(process.execPath, [path.join(HERE, 'blocked-sessions.mjs'), '--json'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  if (run.status !== 0) return { ok: false, sessions: [] };
  try {
    const rows = JSON.parse(run.stdout);
    if (!Array.isArray(rows)) return { ok: false, sessions: [] };
    return {
      ok: true,
      // The transcript file IS the session (docs/AGENT_WORKFLOWS.md - sessionId does not identify
      // one), so it is the stable key a delta can compare across ticks.
      sessions: rows.map((row) => ({
        key: row.transcript ?? row.cwd ?? 'unknown-session',
        detail: `${row.agentId ? `agent ${row.agentId}` : (row.branch || row.cwd || 'a session')} waiting `
          + `${row.waitedMinutes ?? '?'} min on ${row.tool ?? 'a call'}`,
      })),
    };
  } catch {
    return { ok: false, sessions: [] };
  }
}

/** A wave plan more than a wave-window old is a LEFTOVER awaiting the next orchestrator, not the
 *  live wave - heartbeats appended to it pollute a record someone will read as that night's. The
 *  age comes from the DATE IN THE NAME (the orchestrator writes `<date>-wave-plan.local.md`),
 *  never the mtime, which anything touching the file resets. */
export const WAVE_PLAN_MAX_AGE_MS = 24 * 3_600_000;

export function wavePlanFresh(name, now, { maxAgeMs = WAVE_PLAN_MAX_AGE_MS } = {}) {
  const dated = /^(\d{4}-\d{2}-\d{2})/.exec(name);
  if (!dated) return false;
  const day = Date.parse(`${dated[1]}T00:00:00Z`);
  // The stamp is the wave's START, and a wave runs into the next day - so the window is measured
  // from the end of the named day, giving a plan written at 23:00 its whole night.
  return Number.isFinite(day) && now - (day + 24 * 3_600_000) <= maxAgeMs;
}

function newestWavePlan(now) {
  const dir = path.join(REPO_ROOT, 'docs', 'handoffs');
  if (!existsSync(dir)) return null;
  const candidates = readdirSync(dir)
    .filter((name) => name.includes('wave-plan') && name.endsWith('.local.md') && wavePlanFresh(name, now))
    .sort()
    .reverse();
  return candidates.length ? path.join(dir, candidates[0]) : null;
}

export function main(argv = process.argv.slice(2), { now = Date.now() } = {}) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`wave-tick: ${error.message}\n`);
    return 2;
  }
  if (args.help) {
    process.stdout.write('Usage: node scripts/wave-tick.mjs [--no-fetch] [--json] [--quiet-minutes <n>] [--state <path>] [--wave-plan <path|none>]\n');
    return 0;
  }

  const warnings = [];
  if (args.fetch) {
    const fetch = git(['fetch', 'origin', '--quiet']);
    if (!fetch.ok) warnings.push(`git fetch failed (${fetch.err.split('\n')[0] || 'no detail'}) - reading local state only.`);
  }

  // Landed = the branch TIP is an ancestor of origin/main, and nothing else. The landings ledger
  // is deliberately not consulted here: it records that a branch landed ONCE, and a branch that
  // took new commits after landing (this session's own rhythm) would read as landed forever.
  const merged = new Set(
    git(['branch', '--merged', 'origin/main', '--format=%(refname:short)']).out.split('\n').filter(Boolean),
  );
  const worktrees = worktreeByBranch();
  const dir = jobsDir();
  const jobs = readJobs(dir);

  const branches = localBranches()
    .filter((branch) => branch.name !== 'main')
    .map((branch) => {
      const landed = merged.has(branch.name);
      const landing = landingStateFor(branch.name, jobs);
      const lastCommit = git(['log', '-1', '--format=%ct', branch.name]);
      return {
        name: branch.name,
        sha: branch.sha,
        landed,
        landingState: landing.state,
        worktree: worktrees.get(branch.name) ?? null,
        lastCommitMs: lastCommit.ok ? Number(lastCommit.out) * 1000 : null,
      };
    });

  const failedJobs = jobs
    .filter((job) => job.kind === 'merge' && ['failed', 'timed-out'].includes(job.state))
    .map((job) => ({ id: job.id, branch: job.branch, reason: giveUpReason(job) }));

  const blocked = blockedSessions();
  if (!blocked.ok) warnings.push('blocked-sessions.mjs gave no readable answer - the waiting column is blind this tick.');

  const current = {
    at: now,
    quietMinutes: args.quietMinutes,
    branches,
    jobs,
    failedJobs,
    blocked: blocked.sessions,
  };

  const statePath = args.statePath ?? path.join(dir, 'wave-tick-state.json');
  let previous = null;
  if (existsSync(statePath)) {
    try {
      const parsed = JSON.parse(readFileSync(statePath, 'utf8'));
      if (parsed.v === STATE_VERSION) previous = parsed;
      else warnings.push(`state file is v${parsed.v}, this build writes v${STATE_VERSION} - starting fresh, so every event below may be a repeat.`);
    } catch {
      warnings.push('state file was unreadable - starting fresh, so every event below may be a repeat.');
    }
  }

  const tick = (previous?.tick ?? 0) + 1;
  const events = previous ? deltaBetween(previous, current, { quietMinutes: args.quietMinutes }) : [];
  const summary = summaryLine(current);

  writeFileSync(statePath, `${JSON.stringify(nextState(current, { tick }), null, 2)}\n`, 'utf8');

  const wavePlan = args.wavePlan === 'none' ? null : (args.wavePlan ?? newestWavePlan(now));
  if (wavePlan && existsSync(wavePlan)) {
    appendFileSync(wavePlan, `${heartbeatLine({ tick, at: now, summary })}\n`, 'utf8');
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify({ tick, at: new Date(now).toISOString(), firstTick: !previous, events, summary, warnings }, null, 2)}\n`);
    return 0;
  }
  const lines = [];
  if (!previous) {
    lines.push(`tick ${tick}: baseline written (no previous state to diff against). ${summary}.`);
  } else if (!events.length) {
    lines.push(`tick ${tick}: no change. ${summary}.`);
  } else {
    lines.push(`tick ${tick}: ${events.length} event(s). ${summary}.`);
    for (const event of events) lines.push(`  ${event}`);
  }
  for (const warning of warnings) lines.push(`  note: ${warning}`);
  process.stdout.write(`${lines.join('\n')}\n`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
