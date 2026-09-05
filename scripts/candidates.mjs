#!/usr/bin/env node
// WHICH CANDIDATE DOES THE REFILL LOOP LAUNCH NEXT - the whole per-tick refill decision in one
// command, over the planner's ordered candidate list (`orchestrator/night.md`, "The candidate
// list"; the refilling loop is change 1 of the 2026-09-05 review).
//
//   node scripts/candidates.mjs --plan <wave-state file>     # ordered verdicts + the next pick
//   node scripts/candidates.mjs --plan <path> --json
//
// WHY. Change 1 gave the loop two instruments - collision-check reads a candidate against the
// running rows' real diffs, wave-horizon says whether a unit of its size still fits - but the loop
// ran them per candidate by hand. This composes both over the `## Candidates` TABLE the planner
// writes (columns L, size, serves, TOUCHES, SPECS, goal), so the refill pick is one command whose
// answer the loop confirms rather than a sequence the model drives. It launches nothing; it prints
// LAUNCH <letter> for the first candidate that is collision-clear AND fits the window, and HOLD for
// each one it passes with the reason (a collision, or a size the window can no longer land).
//
// The pick respects the planner's ORDER and falls through: a standard unit at the top that no
// longer fits does not block a small one below it that does. Read-only, like the instruments it
// composes.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { collisions } from './collision-check.mjs';
import { scanActivity } from './worktree-activity.mjs';
import { horizon, landingLatency, parseWindowEnd } from './wave-horizon.mjs';
import { joinDurations, readLaunches, SIZES, statsBySize } from './wave-launch.mjs';
import { jobsDir, readJobs, readLandings } from './jobs-store.mjs';
import { newestWavePlan } from './wave-tick.mjs';

/** Split a table cell of comma/semicolon-separated tokens, dropping `-`, `none`, and empties. */
function cells(value) {
  return String(value ?? '').split(/[,;]/).map((token) => token.replace(/`/g, '').trim())
    .filter((token) => token && token !== '-' && token.toLowerCase() !== 'none');
}

/**
 * The `## Candidates` table as rows { letter, size, serves, files, specs, goal }. Any heading
 * containing "candidates" opens it; the header row names the columns, so order is not assumed.
 */
export function parseCandidates(text) {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((line) => /^#{1,6}\s+.*\bcandidates\b/i.test(line));
  if (start < 0) return [];
  let header = null;
  const rows = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^#{1,6}\s+/.test(line)) break;
    if (!line.trim().startsWith('|')) continue;
    const parts = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
    if (!header) { header = parts.map((cell) => cell.replace(/\*/g, '').toLowerCase()); continue; }
    if (parts.every((cell) => /^:?-+:?$/.test(cell))) continue;
    const row = {};
    header.forEach((key, position) => { row[key] = parts[position] ?? ''; });
    const letter = (row.l ?? row.letter ?? row['#'] ?? '').replace(/\*/g, '').trim();
    if (!/^[A-Z]{1,2}$/.test(letter)) continue;
    rows.push({
      letter,
      size: (row.size ?? 'standard').trim().toLowerCase(),
      serves: (row.serves ?? '').trim(),
      files: cells(row.touches),
      specs: cells(row.specs).map((spec) => spec.replace(/^e2e\//, '')),
      goal: (row.goal ?? '').trim(),
    });
  }
  return rows;
}

/**
 * Evaluate the ordered candidates. `entries` are the activity scan's running rows; `durations` and
 * `latency` feed the horizon; `remainingMin` is the window left. Each result carries a verdict and
 * the reason; `pick` is the first candidate that is collision-clear and fits, in the planner's order.
 */
export function evaluate(candidates, { entries, durations, latency, remainingMin }) {
  const window = horizon({ remainingMin, durations, latency });
  const results = candidates.map((candidate) => {
    const size = SIZES.includes(candidate.size) ? candidate.size : 'standard';
    const collision = collisions({ files: candidate.files, specs: candidate.specs, branch: null }, entries);
    const fits = window.sizes[size]?.fits ?? false;
    let verdict;
    let reason;
    if (!collision.clear) { verdict = 'HOLD'; reason = `collides with ${collision.hits.map((hit) => hit.branch).join(', ')}`; }
    else if (!fits) { verdict = 'HOLD'; reason = `a ${size} unit no longer fits (${window.sizes[size]?.slackMin ?? '?'} min short)`; }
    else { verdict = 'LAUNCH'; reason = 'clear and fits'; }
    return { letter: candidate.letter, size, verdict, reason, goal: candidate.goal, cautions: collision.cautions };
  });
  const pick = results.find((result) => result.verdict === 'LAUNCH') ?? null;
  return { window, results, pick };
}

function argValue(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

export async function main(argv = process.argv.slice(2), { now = Date.now(), cwd = process.cwd() } = {}) {
  const dir = jobsDir();
  if (!dir) { process.stderr.write('candidates: not inside a git repository.\n'); return 2; }
  const planArg = argValue(argv, '--plan');
  const planPath = planArg ? path.resolve(planArg) : newestWavePlan(now, cwd);
  if (!planPath || !existsSync(planPath)) {
    process.stderr.write('candidates: no wave-state plan found (pass --plan <path>).\n');
    return 2;
  }
  const text = readFileSync(planPath, 'utf8');
  const candidates = parseCandidates(text);
  if (candidates.length === 0) {
    process.stdout.write('No ## Candidates table in the plan - the planner writes one for the refill loop to draw on.\n');
    return 0;
  }
  const endAt = parseWindowEnd(text);
  if (endAt === null) {
    process.stderr.write('candidates: the plan has no "Window ends: <iso>" line - wave-horizon needs it.\n');
    return 2;
  }
  const jobs = readJobs(dir);
  const durations = statsBySize(joinDurations(readLaunches(dir), jobs, readLandings(dir)));
  const latency = landingLatency(jobs);
  const activity = await scanActivity(cwd);
  const entries = [
    ...activity.worktrees.map((entry) => ({ name: entry.name, branch: entry.branch, files: entry.files })),
    ...activity.branches.map((entry) => ({ name: entry.branch, branch: entry.branch, files: entry.files })),
  ];
  const { results, pick } = evaluate(candidates, { entries, durations, latency, remainingMin: (endAt - now) / 60_000 });

  if (argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify({ pick: pick?.letter ?? null, results }, null, 2)}\n`);
    return 0;
  }
  for (const result of results) {
    process.stdout.write(`  ${result.verdict === 'LAUNCH' ? 'LAUNCH' : 'hold  '} ${result.letter} (${result.size}) - ${result.reason}${result.letter === pick?.letter ? '  <- next' : ''}\n`);
    for (const caution of result.cautions) process.stdout.write(`         caution: ${caution.reason}\n`);
  }
  process.stdout.write(pick
    ? `\nLaunch next: ${pick.letter} - ${pick.goal}\n`
    : '\nHold - nothing on the list is both clear and fits the window. Let what is running land, then re-check.\n');
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => process.exit(code));
}
