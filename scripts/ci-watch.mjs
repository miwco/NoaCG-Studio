#!/usr/bin/env node
// THE CI WATCH - every red run on GitHub reaches the live session the minute it happens.
//
//   node scripts/ci-watch.mjs [--every 60] [--since 60] [--limit 40] [--once]
//
// WHY. The agent reads GitHub only when it polls, and only for the branches it is landing, so a
// run that goes red on any other branch - or on `main` after a landing this session never saw -
// sits unseen until somebody looks. The owner gets the email; the session never hears
// (`docs/ORCHESTRATOR_SIMPLIFICATION.md`, the visibility gap). `main-health.mjs` answers "is main
// red right now?" when a landing ASKS; nothing asked on the session's behalf. This does.
//
// HOW. The same shape as `wave-watch.mjs`: poll `gh run list` for the WHOLE repo on a short
// interval and print ONE LINE PER EVENT and nothing else, so it can be armed as a persistent
// Monitor beside the wave watch. An event is a run reaching a red conclusion (`failure`,
// `timed_out`), reported once per run id, with WHAT failed named from the run's check annotations
// (`ci-failure-set.mjs`) so the line sends a reader to a spec rather than to a dashboard; and
// `main` turning green again after a red, so the queue's release is seen too. A cancelled run is
// not a verdict (`docs/VERIFICATION.md`) and prints nothing. The first poll is a BASELINE: reds
// older than `--since` minutes at arming are history, not events.
//
// Silence is not success (the Monitor rule): a poll that FAILS prints a `WATCH ERROR` line, the
// same error at most once until `gh` answers again, and the recovery prints once too. Every line
// is also appended to `<git-common-dir>/noacg-jobs/ci-watch-events.log`, because stdout can be
// lost to compaction and the morning reads the log, not the loop's memory.

import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describeFailureSet, fetchFailureSet } from './ci-failure-set.mjs';
import { ensureJobsDir, jobsDir } from './jobs-store.mjs';

export const DEFAULT_EVERY_SECONDS = 60;
export const DEFAULT_SINCE_MINUTES = 60;
export const DEFAULT_LIMIT = 40;

/** Conclusions that are a verdict against the code. `cancelled` is deliberately absent. */
export const RED = new Set(['failure', 'timed_out']);

export function parseArgs(argv) {
  const args = { every: DEFAULT_EVERY_SECONDS, since: DEFAULT_SINCE_MINUTES, limit: DEFAULT_LIMIT, once: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--every') args.every = Number(argv[index += 1]);
    else if (token === '--since') args.since = Number(argv[index += 1]);
    else if (token === '--limit') args.limit = Number(argv[index += 1]);
    else if (token === '--once') args.once = true;
    else if (token === '--help' || token === '-h') args.help = true;
    else throw new Error(`unknown argument: ${token}`);
  }
  if (!Number.isFinite(args.every) || args.every < 30) throw new Error('--every must be at least 30 seconds - every poll is a GitHub API call');
  if (!Number.isFinite(args.since) || args.since < 0) throw new Error('--since must be a number of minutes');
  if (!Number.isFinite(args.limit) || args.limit < 1 || args.limit > 100) throw new Error('--limit must be between 1 and 100');
  return args;
}

const isRed = (run) => run.status === 'completed' && RED.has(run.conclusion);
const isVerdict = (run) => run.status === 'completed' && (run.conclusion === 'success' || RED.has(run.conclusion));
const shortSha = (sha) => String(sha ?? '').slice(0, 8);

/** The one line a red run prints. `what` is the failure set already described, or null. */
export function redLine(run, what) {
  const where = `${run.workflowName ?? run.name} on ${run.headBranch} (${shortSha(run.headSha)})`;
  return `CI RED - ${where} - ${what ?? 'open the run'} - ${run.url}`;
}

/**
 * The state one poll carries to the next: which run ids have been reported, and the last verdict
 * seen per workflow on `main` (so a red-to-green flip is an event and a green-to-green is not).
 */
export function baseline(runs, { now = Date.now(), sinceMs = DEFAULT_SINCE_MINUTES * 60_000 } = {}) {
  const reported = new Set();
  for (const run of runs) {
    if (run.status !== 'completed') continue;
    const finished = Date.parse(run.updatedAt ?? run.createdAt ?? '') || 0;
    if (now - finished > sinceMs) reported.add(run.databaseId);
  }
  return { reported, mainVerdict: mainVerdicts(runs) };
}

/** Newest verdict per workflow on main - the list is newest first, so the first wins. */
function mainVerdicts(runs) {
  const verdicts = new Map();
  for (const run of runs) {
    if (run.headBranch !== 'main' || !isVerdict(run)) continue;
    const workflow = run.workflowName ?? run.name;
    if (!verdicts.has(workflow)) verdicts.set(workflow, isRed(run) ? 'red' : 'green');
  }
  return verdicts;
}

/**
 * One poll's events, and the state for the next. Pure: `describe(run)` names what failed and is
 * only called for a run that will be printed, so a quiet poll costs no annotation fetch.
 */
export function step(state, runs, { describe = () => null } = {}) {
  const lines = [];
  const reported = new Set(state.reported);
  // Newest first from gh; print oldest first so a batch reads in the order it happened.
  for (const run of [...runs].reverse()) {
    if (!isRed(run) || reported.has(run.databaseId)) continue;
    reported.add(run.databaseId);
    lines.push(redLine(run, describe(run)));
  }
  const mainVerdict = mainVerdicts(runs);
  for (const [workflow, verdict] of mainVerdict) {
    const before = state.mainVerdict.get(workflow);
    if (before === 'red' && verdict === 'green') {
      const run = runs.find((candidate) => candidate.headBranch === 'main' && (candidate.workflowName ?? candidate.name) === workflow && isVerdict(candidate));
      lines.push(`CI GREEN - main is green again on ${workflow} (${shortSha(run?.headSha)}) - ${run?.url ?? ''}`.trimEnd());
    }
  }
  // A workflow that has scrolled out of the window keeps its last known verdict.
  for (const [workflow, verdict] of state.mainVerdict) if (!mainVerdict.has(workflow)) mainVerdict.set(workflow, verdict);
  return { lines, state: { reported, mainVerdict } };
}

/** WATCH ERROR once until recovery, WATCH RECOVERED once on recovery - the wave-watch contract. */
export function errorLines(result, lastError) {
  if (!result.ok) return result.error === lastError ? [] : [`WATCH ERROR - gh run list failed: ${result.error}`];
  return lastError ? ['WATCH RECOVERED - gh answers again'] : [];
}

const FIELDS = 'databaseId,status,conclusion,headBranch,headSha,name,workflowName,url,createdAt,updatedAt';

export function listRuns({ limit = DEFAULT_LIMIT } = {}) {
  const res = spawnSync('gh', ['run', 'list', '--limit', String(limit), '--json', FIELDS], { encoding: 'utf8', windowsHide: true, timeout: 60_000 });
  if (res.status !== 0) return { ok: false, error: String(res.stderr ?? '').trim().split('\n')[0] || `exit ${res.status}` };
  try {
    return { ok: true, runs: JSON.parse(res.stdout) };
  } catch {
    return { ok: false, error: 'gh run list printed something that was not JSON' };
  }
}

function repoSlug() {
  if (process.env.GH_REPO) return process.env.GH_REPO;
  const res = spawnSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'], { encoding: 'utf8', windowsHide: true, timeout: 30_000 });
  return res.status === 0 ? String(res.stdout).trim() || null : null;
}

function describeFor(repo) {
  return (run) => {
    const set = fetchFailureSet(run.databaseId, { repo });
    return set.items.length > 0 ? describeFailureSet(set.items) : null;
  };
}

function appendLog(lines) {
  const dir = jobsDir();
  if (!dir || lines.length === 0) return;
  try {
    ensureJobsDir(dir);
    const stamp = new Date().toISOString();
    appendFileSync(path.join(dir, 'ci-watch-events.log'), lines.map((line) => `${stamp} ${line}\n`).join(''), 'utf8');
  } catch {
    // The log is a convenience for the morning; losing a line there never stops the watch.
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`ci-watch: ${error.message}\n`);
    return 2;
  }
  if (args.help) {
    process.stdout.write('Usage: node scripts/ci-watch.mjs [--every <seconds>] [--since <minutes>] [--limit <runs>] [--once]\n');
    return 0;
  }
  const describe = describeFor(repoSlug());
  let state = null;
  let lastError = null;
  for (;;) {
    const result = listRuns({ limit: args.limit });
    let lines = errorLines(result, lastError);
    if (result.ok) {
      if (state === null) state = baseline(result.runs, { sinceMs: args.since * 60_000 });
      const next = step(state, result.runs, { describe });
      state = next.state;
      lines = lines.concat(next.lines);
    }
    for (const line of lines) process.stdout.write(`${line}\n`);
    appendLog(lines);
    lastError = result.ok ? null : result.error;
    if (args.once) return result.ok ? 0 : 1;
    await sleep(args.every * 1000);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => process.exit(code));
}
