#!/usr/bin/env node
// IS MAIN ITSELF GREEN RIGHT NOW? The question the landing gate never asked.
//
//   node scripts/main-health.mjs [--json]
//
// WHY THIS EXISTS. `auto-merge.mjs` gates hard on the INTEGRATED sha - is this branch, merged with
// main, green? - and that is the right question about the branch. It is not a question about main.
// So when main went red on 2026-08-27, every queued landing integrated a red main, gated green on
// its own merge commit (the failing spec was not in that branch's affected plan), pushed, and
// started another main run that failed the same way. `ci.yml` sets `cancel-in-progress: false` for
// main deliberately, so nothing collapsed those, and GitHub mailed a CheckSuite failure for each.
//
// ONE defect, 35 hours, 27 emails (docs/CI_STABILITY.md, measured 2026-08-15..29). The mechanism
// that turns those 27 back into 1 is this file: a red main stops the queue until a person fixes
// main. Refusing is not the cost - the landings were never going to be safe to promote onto a red
// main anyway; all the queue was doing was re-reporting somebody else's bug under new sha names.
//
// WHAT IT DELIBERATELY DOES NOT DO:
//   - It never treats "no answer" as red. No completed run (a fresh repo, a fresh main), an
//     unreachable `gh`, a run still in flight - all proceed, with a printed note. This gate makes
//     the inbox quieter; it must never make the queue mysteriously stop.
//   - It never treats a CANCELLED run as a verdict, the standing rule in docs/VERIFICATION.md.
//   - It is not the safety gate. The branch's own green gate on the integrated sha still decides
//     whether the branch may land, exactly as before, and nothing here relaxes it.

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describeFailureSet, fetchFailureSet } from './ci-failure-set.mjs';

/** A conclusion that says the code is at fault. `cancelled` is not here on purpose. */
const RED = new Set(['failure', 'timed_out', 'startup_failure']);

/**
 * What main's recent ci.yml runs say, newest verdict first.
 *
 * Run selection follows `selectCiRun`'s reasoning (scripts/safe-merge-preflight.mjs): newest by
 * `databaseId` because that is minted in strict creation order, and a run that is still going or
 * was cancelled is skipped rather than judged - neither is a verdict about anything.
 *
 * Returns `{ state: 'green' | 'red' | 'unknown', latest, since, redRuns }`. `since` is the
 * creation time of the OLDEST run in the current unbroken red streak, which is the honest answer
 * to "since when" - the newest red run's timestamp would say main went red seconds ago when it has
 * been red since yesterday morning.
 */
export function assessMain(runs) {
  const sorted = [...(runs ?? [])]
    .filter((r) => r?.databaseId != null)
    .sort((a, b) => Number(b.databaseId) - Number(a.databaseId));
  // Only settled, non-cancelled runs carry a verdict; everything else is skipped, not counted.
  const settled = sorted.filter(
    (r) => r.status === 'completed' && (r.conclusion === 'success' || RED.has(r.conclusion)),
  );
  const latest = settled[0] ?? null;
  if (!latest) return { state: 'unknown', latest: null, since: null, redRuns: 0 };
  if (latest.conclusion === 'success') return { state: 'green', latest, since: null, redRuns: 0 };

  // Walk back through consecutive reds. The first green ends the streak; nothing else does,
  // because a cancelled run between two reds did not make main green in between.
  let streak = 0;
  let oldest = latest;
  for (const run of settled) {
    if (!RED.has(run.conclusion)) break;
    streak += 1;
    oldest = run;
  }
  return { state: 'red', latest, since: oldest.createdAt ?? null, redRuns: streak };
}

/** "3 h", "2 d 4 h" - or null when there is no timestamp to measure from. */
export function humanAge(since, now = Date.now()) {
  const started = Date.parse(since ?? '');
  if (!Number.isFinite(started)) return null;
  const minutes = Math.max(0, Math.round((now - started) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} d ${hours % 24} h`;
}

/**
 * May this branch land, given what main's own CI says?
 *
 * Pure, and separate from the fetching for the reason every other decision in the landing path is:
 * a wrong condition here costs EVERY future landing, so it has to be reachable by a test that
 * performs no merge and talks to no API.
 */
export function planMainHealth(health, { failing = null, allowRed = false, branch = 'this branch', now = Date.now() } = {}) {
  if (health.state === 'unknown') {
    return {
      action: 'proceed',
      message: 'main has no completed ci.yml verdict to read - that is not red, so landing continues.',
    };
  }
  if (health.state === 'green') {
    return { action: 'proceed', message: `main is green (run ${health.latest?.databaseId ?? '?'}).` };
  }

  const what = failing?.items?.length ? describeFailureSet(failing.items) : 'a failure this gate could not name';
  const age = humanAge(health.since, now);
  const when = health.since ? `since ${health.since}${age ? ` (${age} ago)` : ''}` : 'since an unknown time';
  const runs = `${health.redRuns} consecutive red run${health.redRuns === 1 ? '' : 's'}`;
  const where = health.latest?.url ? `\n  latest red run: ${health.latest.url}` : '';
  const headline = `main is red on ${what} ${when} - ${runs}.`;

  if (allowRed) {
    return {
      action: 'proceed',
      message:
        `${headline}${where}\n` +
        '  --onto-red-main was passed, so this lands anyway. Only correct when THIS branch is the fix.',
    };
  }
  return {
    action: 'refuse',
    message:
      `${headline}${where}\n` +
      '  Fix main first, then queue again. Landing onto a red main is how one defect became 27 CI\n' +
      '  emails in 35 hours (docs/CI_STABILITY.md) - every landing pushes main, every push starts a\n' +
      '  run, and every run reports the same bug under a new sha.\n' +
      `  If ${branch} IS the fix for that, land it with:\n` +
      `      node scripts/jobs.mjs add-merge ${branch} --onto-red-main`,
  };
}

/**
 * The live answer: main's recent ci.yml runs, and what is failing in the newest red one.
 *
 * Both halves fail soft. `gh` missing, offline, rate-limited - each yields no runs, which reads as
 * `unknown` and lets the landing continue. That direction is deliberate and stated at the top.
 */
export function readMainHealth({ listRuns = defaultListRuns, failureSetFor = fetchFailureSet } = {}) {
  const health = assessMain(listRuns());
  const failing = health.state === 'red' && health.latest ? failureSetFor(health.latest.databaseId) : null;
  return { health, failing };
}

function defaultListRuns() {
  const res = spawnSync(
    'gh',
    ['run', 'list', '--workflow', 'ci.yml', '--branch', 'main', '--limit', '30',
      '--json', 'databaseId,status,conclusion,headSha,createdAt,url'],
    { encoding: 'utf8', windowsHide: true },
  );
  if (res.status !== 0) return [];
  try {
    return JSON.parse(res.stdout);
  } catch {
    return [];
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { health, failing } = readMainHealth();
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify({ ...health, failing })}\n`);
  } else {
    console.log(planMainHealth(health, { failing }).message);
  }
  process.exit(health.state === 'red' ? 1 : 0);
}
