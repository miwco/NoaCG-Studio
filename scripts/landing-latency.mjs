#!/usr/bin/env node
// HOW LONG DID LANDING ACTUALLY TAKE, AND WHAT MADE THE SLOW ONES SLOW.
//
//   node scripts/landing-latency.mjs [--days 7] [--slow 60] [--json]
//
// WHY. The owner's read on 2026-09-05: "I am always saying something is wrong with the landing,
// the agents tell me everything is okay, and it still takes hours." Both were true at once. The
// agents read `auto-merge --dry-run` and their own green CI, which is the truth about the branch
// at that moment; the hours come later, from what the queue meets once other branches move -
// and nobody was reading that. This prints it: per branch, the time from FIRST queued to landed,
// every landing job it took, and the refusal each failed job gave, read from the job store the
// queue already keeps. The slow tail with its causes is the list of core problems, measured.
//
// It reads and never writes. The store is `<git-common-dir>/noacg-jobs` (`jobs-store.mjs`).

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { jobsDir, readJobs } from './jobs-store.mjs';

export function parseArgs(argv) {
  const args = { days: 7, slow: 60, json: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--days') args.days = Number(argv[index += 1]);
    else if (token === '--slow') args.slow = Number(argv[index += 1]);
    else if (token === '--json') args.json = true;
    else if (token === '--help' || token === '-h') args.help = true;
    else throw new Error(`unknown argument: ${token}`);
  }
  if (!Number.isFinite(args.days) || args.days <= 0) throw new Error('--days must be a positive number');
  if (!Number.isFinite(args.slow) || args.slow < 0) throw new Error('--slow must be a number of minutes');
  return args;
}

/**
 * The one-line reason a failed landing job gave, from its log. The queue prints a
 * `REFUSAL-KIND: <kind>` line since 2026-09-04 and an `auto-merge REFUSED: ...` line before that;
 * a preflight failure names itself with `[FAIL]`. Older logs have only the last of those.
 */
export function refusalOf(log) {
  if (!log) return 'no log';
  const kind = log.match(/REFUSAL-KIND:\s*([a-z0-9-]+)/i)?.[1];
  const refused = [...log.matchAll(/auto-merge REFUSED: (.+)/g)].pop()?.[1];
  const fail = [...log.matchAll(/\[FAIL\] (.+)/g)].pop()?.[1];
  const text = (refused ?? fail ?? '').trim();
  if (kind) return text ? `${kind}: ${text}` : kind;
  return text || 'refused without saying why';
}

/**
 * The KIND behind one refusal, so the tail can be counted by cause rather than by branch name:
 * "blocked by claude/x" and "blocked by claude/y" are the same problem (an unqueued branch
 * holding the order), and so are the three "has moved since it was queued" lines.
 */
export function causeOf(refusal) {
  if (/^timed-out/.test(refusal)) return 'timed-out at the landing cap';
  if (/blocked by claude\//.test(refusal)) return 'blocked by an unqueued branch ahead of main';
  if (/has moved since it was queued/.test(refusal)) return 'branch moved after it was queued';
  if (/merge-order says caution|^order-caution/.test(refusal)) return 'merge-order caution (a person must accept)';
  if (/refused the CI run/.test(refusal)) return 'CI run on the integrated sha was red or damaged';
  return refusal.split(':')[0].split(' - ')[0].trim();
}

/** Group landing jobs per branch and measure each branch's road to main. Pure. */
export function summarize(jobs, { now = Date.now(), days = 7, slowMinutes = 60, logOf = () => '' } = {}) {
  const since = now - days * 24 * 60 * 60_000;
  const byBranch = new Map();
  for (const job of jobs) {
    if (job.kind !== 'merge' || !job.branch || (job.enqueuedAt ?? 0) < since) continue;
    if (!byBranch.has(job.branch)) byBranch.set(job.branch, []);
    byBranch.get(job.branch).push(job);
  }
  const branches = [];
  for (const [branch, list] of byBranch) {
    list.sort((a, b) => a.enqueuedAt - b.enqueuedAt);
    const first = list[0];
    const landedJob = list.find((job) => job.state === 'done');
    const end = landedJob?.finishedAt ?? null;
    const minutes = end ? Math.round((end - first.enqueuedAt) / 60_000) : null;
    const refusals = list
      .filter((job) => job.state === 'failed' || job.state === 'timed-out')
      .map((job) => (job.state === 'timed-out' ? `timed-out: killed at its ${job.capMinutes ?? '?'}-minute cap` : refusalOf(logOf(job))));
    branches.push({ branch, firstQueuedAt: first.enqueuedAt, jobs: list.length, landed: Boolean(landedJob), minutes, refusals, states: list.map((job) => job.state) });
  }
  branches.sort((a, b) => a.firstQueuedAt - b.firstQueuedAt);
  const landed = branches.filter((b) => b.landed).map((b) => b.minutes).sort((a, b) => a - b);
  const median = landed.length ? landed[Math.floor(landed.length / 2)] : null;
  const slow = branches.filter((b) => (b.minutes ?? Infinity) > slowMinutes);
  const causes = new Map();
  for (const b of slow) for (const r of b.refusals) causes.set(causeOf(r), (causes.get(causeOf(r)) ?? 0) + 1);
  return { branches, landedCount: landed.length, medianMinutes: median, slow, causes: [...causes].sort((a, b) => b[1] - a[1]) };
}

const ago = (ms) => new Date(ms).toISOString().slice(5, 16).replace('T', ' ');

export function render(summary, { slowMinutes }) {
  const out = [];
  out.push(`${summary.branches.length} branches queued, ${summary.landedCount} landed, median queue-to-land ${summary.medianMinutes ?? '-'} min.`);
  out.push(`${summary.slow.length} took longer than ${slowMinutes} min (or never landed):`);
  for (const b of summary.slow) {
    out.push(`  ${ago(b.firstQueuedAt)}  ${b.landed ? `${b.minutes} min` : 'NOT LANDED'}  ${b.jobs} job(s)  ${b.branch}`);
    for (const r of b.refusals) out.push(`      - ${r.slice(0, 160)}`);
  }
  if (summary.causes.length) {
    out.push('Refusals behind the slow ones, by kind:');
    for (const [kind, count] of summary.causes) out.push(`  ${String(count).padStart(3)}  ${kind}`);
  }
  return out.join('\n');
}

export function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`landing-latency: ${error.message}\n`);
    return 2;
  }
  if (args.help) {
    process.stdout.write('Usage: node scripts/landing-latency.mjs [--days <n>] [--slow <minutes>] [--json]\n');
    return 0;
  }
  const dir = jobsDir();
  if (!dir || !existsSync(dir)) {
    process.stderr.write('landing-latency: no job store here (not a git checkout, or the queue has never run)\n');
    return 1;
  }
  const jobs = readJobs(dir);
  const logOf = (job) => (job.logPath && existsSync(job.logPath) ? readFileSync(job.logPath, 'utf8') : '');
  const summary = summarize(jobs, { days: args.days, slowMinutes: args.slow, logOf });
  process.stdout.write(args.json ? `${JSON.stringify(summary)}\n` : `${render(summary, { slowMinutes: args.slow })}\n`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
