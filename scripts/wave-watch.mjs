#!/usr/bin/env node
// THE WATCH - the loop's wake-up, as an event stream instead of a self-chosen nap.
//
//   node scripts/wave-watch.mjs [--every 180] [--plan <path>] [--once]
//
// WHY. The night loop used to pace itself: the live session picked a delay, slept, ticked, and
// picked another. On 2026-09-04 that was 103 ticks at 54 to 69 minutes apart when nobody was
// talking to it, so landings were seen 45 to 94 minutes after they happened and two rows started
// about an hour late. A wait chosen by a model is a guess; a wait on an event is not.
//
// HOW. This process runs `wave-tick.mjs` every `--every` seconds (default 180) and prints ONE
// LINE PER EVENT and nothing else - no "no change" lines, no heartbeat - so it can be armed as a
// persistent Monitor in the live session: every line it prints wakes that session, a quiet night
// wakes it never, and the tick's heartbeat still lands in the wave-state file as before. The
// tick keeps doing the observing; this only decides when it runs and what reaches the session.
//
// Silence is not success (the Monitor rule), so a tick that FAILS prints a `WATCH ERROR` line
// rather than nothing, and the same error is printed at most once until the tick recovers.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

export const DEFAULT_EVERY_SECONDS = 180;

export function parseArgs(argv) {
  const args = { every: DEFAULT_EVERY_SECONDS, plan: null, once: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--every') args.every = Number(argv[index += 1]);
    else if (token === '--plan') args.plan = argv[index += 1];
    else if (token === '--once') args.once = true;
    else if (token === '--help' || token === '-h') args.help = true;
    else throw new Error(`unknown argument: ${token}`);
  }
  if (!Number.isFinite(args.every) || args.every < 30) throw new Error('--every must be at least 30 seconds - a tick fetches from origin');
  return args;
}

/** The lines one tick result should print. Pure, so the shape is testable without a tick. */
export function linesFor(result, { lastError = null } = {}) {
  if (!result.ok) {
    return result.error === lastError ? [] : [`WATCH ERROR - wave-tick failed: ${result.error}`];
  }
  const lines = result.events.map((event) => `tick ${result.tick}: ${event}`);
  if (lastError) lines.unshift('WATCH RECOVERED - wave-tick answers again');
  return lines;
}

export function runTick({ plan = null } = {}) {
  const args = [path.join(HERE, 'wave-tick.mjs'), '--json'];
  if (plan) args.push('--wave-plan', plan);
  const run = spawnSync(process.execPath, args, { cwd: REPO_ROOT, encoding: 'utf8', windowsHide: true, timeout: 120_000 });
  if (run.status !== 0) {
    return { ok: false, error: String(run.stderr ?? '').trim().split('\n')[0] || `exit ${run.status}` };
  }
  try {
    const parsed = JSON.parse(run.stdout);
    return { ok: true, tick: parsed.tick, events: parsed.events ?? [] };
  } catch {
    return { ok: false, error: 'wave-tick printed something that was not JSON' };
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`wave-watch: ${error.message}\n`);
    return 2;
  }
  if (args.help) {
    process.stdout.write('Usage: node scripts/wave-watch.mjs [--every <seconds>] [--plan <path>] [--once]\n');
    return 0;
  }
  let lastError = null;
  for (;;) {
    const result = runTick({ plan: args.plan });
    for (const line of linesFor(result, { lastError })) process.stdout.write(`${line}\n`);
    lastError = result.ok ? null : result.error;
    if (args.once) return result.ok ? 0 : 1;
    await sleep(args.every * 1000);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => process.exit(code));
}
