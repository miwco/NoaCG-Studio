#!/usr/bin/env node
// THE NIGHT REPORT - what the queue did while nobody was awake, in one command.
//
// THE FAILURE IT ANSWERS. The queue lands branches unattended, and by morning the only trace is
// GitHub failure mail and 560-odd job records in a directory nobody opens. On 2026-09-04 the
// owner woke to the mail and no summary, and the four facts he actually needed - what landed,
// what refused and WHY, what the queue repaired by itself, and what is still sitting there
// waiting for a person - were each available and none of them were together.
//
// Naming refusals (2026-09-04) put the WHY on the record: every merge job that refuses now carries
// `refusal.kind`, and `refusalGuidance` in jobs-store.mjs owns what each kind means, the one
// command that answers it, and whether the QUEUE or the SESSION runs that command. This script
// does no classifying of its own - it reads those kinds back and groups by them. A kind this
// script invented would be a second vocabulary that drifts from the one the queue acts on.
//
// IT IS A REPORT, NEVER A GATE (docs/ROUTINES.md). It writes no job, cancels nothing, queues
// nothing, and exits 0 whatever it finds - including when the news is bad. A morning report that
// can fail is a morning report that sometimes does not arrive.
//
// Usage:
//   node scripts/night-report.mjs                 # the last 12 hours, to stdout
//   node scripts/night-report.mjs --hours 24      # a longer window
//   node scripts/night-report.mjs --since 2026-09-04T18:00
//   node scripts/night-report.mjs --json          # the same facts, structured
//   node scripts/night-report.mjs --write         # also docs/handoffs/night-report.local.md

import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { finishedSince, giveUpReason, jobsDir, readJobs, readLandings, refusalGuidance } from './jobs-store.mjs';

/** The default window. A night is the evening's last queueing to the morning's first reading. */
export const DEFAULT_WINDOW_HOURS = 12;

/** How a refusal with no `refusal.kind` is grouped. Named once so the section and its note agree. */
export const UNNAMED = '(no kind on the record)';

// A job's moment. `finishedAt` for everything terminal; `enqueuedAt` only for a record that
// somehow has neither, which sorts it early rather than to 1970.
const at = (job) => job.finishedAt ?? job.enqueuedAt ?? 0;

/**
 * Everything the report says, as data.
 *
 * Pure on purpose: the reading of the queue directory happens once, in `main`, and every judgement
 * below is made on plain objects a test can hand it. The bug this shape guards against is a report
 * that is only ever exercised against whatever the machine happens to hold tonight.
 */
export function nightReport({ jobs = [], landings = [], since, until = Date.now() } = {}) {
  const inWindow = (ms) => ms >= since && ms <= until;

  const landed = landings
    .filter((l) => inWindow(l.at ?? 0))
    .map((l) => ({ branch: l.branch, sha: String(l.sha ?? '').slice(0, 7), at: l.at, worktree: l.worktree }))
    .sort((a, b) => a.at - b.at);

  // A branch that landed AFTER a refusal is a repaired night, not a broken one. The comparison is
  // per branch and by time, because the same branch can refuse at 01:00 and land at 02:00 - which
  // is the queue working, and reporting it as an outstanding refusal is the report crying wolf.
  const landedAfter = (branch, ms) =>
    landings.some((l) => l.branch === branch && (l.at ?? 0) > ms);

  const finished = finishedSince(jobs, since).filter((j) => at(j) <= until);
  const merges = finished.filter((j) => j.kind === 'merge');

  // A refusal the queue already put back is not outstanding - its RETRY is the live fact, and
  // listing both makes one stuck branch read as two. Taken from every job on the machine rather
  // than from the window, because a retry minted just after the window still answers the refusal
  // inside it.
  const retried = new Set(jobs.map((j) => j.retryOf).filter(Boolean));

  const refusals = merges
    .filter((j) => j.exitCode !== 0)
    .map((job) => {
      const said = job.refusal?.kind ? refusalGuidance(job.refusal, job.branch ?? '<branch>') : null;
      return {
        id: job.id,
        branch: job.branch ?? '<no branch>',
        at: at(job),
        state: job.state,
        // An unnamed refusal is not a hole to plug with a guess: a landing runs the copy of
        // auto-merge.mjs in its own branch's checkout, so a branch cut before a kind existed
        // refuses without one, forever. It is reported as what it is.
        kind: job.refusal?.kind ?? null,
        blockers: job.refusal?.blockers ?? [],
        summary: said?.summary ?? giveUpReason(job),
        recovery: said?.recovery ?? null,
        byQueue: said?.byQueue === true,
        recovered: landedAfter(job.branch, at(job)),
        retried: retried.has(job.id),
      };
    })
    .sort((a, b) => a.at - b.at);

  const byKind = new Map();
  for (const refusal of refusals) {
    const key = refusal.kind ?? UNNAMED;
    if (!byKind.has(key)) byKind.set(key, []);
    byKind.get(key).push(refusal);
  }
  const kinds = [...byKind.entries()]
    .map(([kind, items]) => ({ kind, count: items.length, items }))
    .sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind));

  // WHAT THE QUEUE REPAIRED BY ITSELF. A retry carries `retryOf`, and the reason the sweep or the
  // landing put it back is on the record - "reached no verdict", a released order hold, a
  // dispatched CI run. Reading it back is how "the queue recovers what it can, once" stops being
  // a claim in a doc and becomes a number in the morning.
  const retries = finished
    .filter((j) => j.retryOf)
    .map((job) => ({
      id: job.id,
      of: job.retryOf,
      branch: job.branch ?? '<no branch>',
      reason: job.retryReason ?? 'not recorded',
      dispatchedCi: job.ciDispatched === true,
      landed: job.exitCode === 0 || landedAfter(job.branch, at(job)),
      at: at(job),
    }))
    .sort((a, b) => a.at - b.at);

  // WHAT NEEDS A PERSON. Three things qualify and nothing else: a refusal the queue does not adopt
  // whose branch never landed; a landing killed at its cap (no verdict at all, and the queue
  // retries those only once); and a gate or sweep that failed, because a red gate at 02:00 is
  // silent until somebody looks. Everything the queue is going to fix on its own stays out - a
  // morning list that mixes the two is read once and then skipped.
  const needsAPerson = [
    ...refusals
      .filter((r) => !r.recovered && !r.byQueue && !r.retried)
      .map((r) => ({
        what: `${r.branch} - ${r.summary}`,
        action: r.recovery ?? 'a person decides this one',
        where: `node scripts/jobs.mjs log ${r.id}`,
      })),
    ...merges
      .filter((j) => j.state === 'timed-out' && !landedAfter(j.branch, at(j)))
      .map((j) => ({
        what: `${j.branch ?? '<no branch>'} - killed at its ${j.capMinutes ?? '?'} min cap, so it reached no verdict`,
        action: `node scripts/jobs.mjs requeue ${j.branch ?? '<branch>'}`,
        where: `node scripts/jobs.mjs log ${j.id}`,
      })),
    ...finished
      .filter((j) => j.kind !== 'merge' && j.state === 'failed')
      .map((j) => ({
        what: `${j.id} failed - ${j.command}`,
        action: 'read it, then decide whether it is the branch or the machine',
        where: `node scripts/jobs.mjs log ${j.id}`,
      })),
  ];

  const cancelled = finished
    .filter((j) => j.state === 'cancelled')
    .map((j) => ({ id: j.id, branch: j.branch ?? null, command: j.command, at: at(j) }))
    .sort((a, b) => a.at - b.at);

  return {
    window: { since, until },
    landed,
    refusals,
    kinds,
    retries,
    cancelled,
    needsAPerson,
    counts: {
      landed: landed.length,
      refused: refusals.length,
      refusedAndRecovered: refusals.filter((r) => r.recovered).length,
      retries: retries.length,
      cancelled: cancelled.length,
      needsAPerson: needsAPerson.length,
      finished: finished.length,
    },
  };
}

const clock = (ms) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const stamp = (ms) => `${new Date(ms).toISOString().slice(0, 10)} ${clock(ms)}`;

/** The report as the text a person reads at 08:00, with a coffee and one eye open. */
export function renderReport(report) {
  const { counts } = report;
  const lines = [];
  lines.push(`# The night, ${stamp(report.window.since)} to ${stamp(report.window.until)}`);
  lines.push('');
  lines.push(
    `${counts.landed} landed · ${counts.refused} refused (${counts.refusedAndRecovered} of them went on to land) ` +
      `· ${counts.retries} ${counts.retries === 1 ? 'retry' : 'retries'} · ${counts.needsAPerson} need a person`,
  );

  lines.push('');
  lines.push(`## Landed (${counts.landed})`);
  if (report.landed.length === 0) lines.push('Nothing. No branch reached main in this window.');
  for (const l of report.landed) lines.push(`- ${clock(l.at)}  ${l.branch}  ${l.sha}`);

  lines.push('');
  lines.push(`## Refused (${counts.refused})`);
  if (report.kinds.length === 0) lines.push('No landing refused.');
  for (const group of report.kinds) {
    lines.push('');
    lines.push(`### ${group.kind} - ${group.count}`);
    if (group.kind === UNNAMED) {
      lines.push('A landing runs the copy of auto-merge.mjs in its OWN branch, so a branch cut');
      lines.push('before the refusal kinds existed refuses in prose and nothing else. This group');
      lines.push('shrinks as old branches land; it is not a fault to chase.');
    }
    for (const r of group.items) {
      const tail = r.recovered ? ' - and the branch went on to land' : '';
      lines.push(`- ${clock(r.at)}  ${r.branch} (${r.id})${tail}`);
      // The summary already names the blockers where there are any (refusalGuidance builds the
      // sentence from them), so they are on the record for --json and not repeated here.
      lines.push(`      ${r.summary}`);
      if (r.recovery) lines.push(`      ${r.byQueue ? 'the QUEUE runs' : 'the SESSION runs'}: ${r.recovery}`);
      else if (!r.recovered) lines.push('      no command answers this one - a person decides');
    }
  }

  lines.push('');
  lines.push(`## What the queue repaired by itself (${counts.retries})`);
  if (report.retries.length === 0) lines.push('No retry was minted. Either nothing needed one, or nothing was adopted.');
  for (const r of report.retries) {
    const outcome = r.landed ? 'and it landed' : 'and it did NOT land';
    const ci = r.dispatchedCi ? ', after a dispatched full CI run' : '';
    lines.push(`- ${clock(r.at)}  ${r.branch}: ${r.id} retried ${r.of} (${r.reason})${ci} - ${outcome}`);
  }

  if (report.cancelled.length > 0) {
    lines.push('');
    lines.push(`## Cancelled (${counts.cancelled})`);
    lines.push('Somebody withdrew these. They are here so a missing job is never a mystery.');
    for (const c of report.cancelled) lines.push(`- ${clock(c.at)}  ${c.id}${c.branch ? ` (${c.branch})` : ''}  ${c.command}`);
  }

  lines.push('');
  lines.push(`## Needs a person (${counts.needsAPerson})`);
  if (report.needsAPerson.length === 0) {
    lines.push('Nothing. Everything that refused was either recovered or is the queue\'s to retry.');
  }
  for (const item of report.needsAPerson) {
    lines.push(`- ${item.what}`);
    lines.push(`      do: ${item.action}`);
    lines.push(`      read: ${item.where}`);
  }

  lines.push('');
  return lines.join('\n');
}

/** Argument parsing, kept separate so the window rule is testable without a process. */
export function parseArgs(argv, now = Date.now()) {
  const options = { json: false, write: false, since: now - DEFAULT_WINDOW_HOURS * 3_600_000, until: now };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') options.json = true;
    else if (arg === '--write') options.write = true;
    else if (arg === '--hours') {
      const hours = Number(argv[i += 1]);
      if (!Number.isFinite(hours) || hours <= 0) throw new Error('--hours wants a positive number of hours');
      options.since = now - hours * 3_600_000;
    } else if (arg === '--since') {
      const parsed = Date.parse(argv[i += 1] ?? '');
      if (!Number.isFinite(parsed)) throw new Error('--since wants a date this machine can parse, e.g. 2026-09-04T18:00');
      options.since = parsed;
    } else throw new Error(`unknown option: ${arg}`);
  }
  return options;
}

/** Where the morning report looks. Gitignored (`docs/handoffs/*.local.md`), so a dirty checkout
 *  can never stop a landing - the same rule the CI morning verdict is written under. */
export const REPORT_FILE = join('docs', 'handoffs', 'night-report.local.md');

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`night-report: ${err.message}`);
    process.exit(2);
  }

  const dir = jobsDir();
  if (!dir) {
    console.log('No job store on this machine - nothing has been queued here yet.');
    return;
  }

  const report = nightReport({ jobs: readJobs(dir), landings: readLandings(dir), ...options });
  const text = options.json ? JSON.stringify(report, null, 1) : renderReport(report);
  console.log(text);

  if (options.write) {
    writeFileSync(REPORT_FILE, `${options.json ? renderReport(report) : text}\n`);
    console.log(`\n[night-report] written to ${REPORT_FILE}`);
  }
}

// Only when run, never when imported by the tests.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
