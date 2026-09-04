#!/usr/bin/env node
// HOW LONG EACH SPEC FILE TAKES - the measured table `scripts/e2e-affected.mjs` sizes a CI run's
// shard count from, and the command that refreshes it.
//
//   node scripts/e2e-durations.mjs --check                 # report drift, change nothing
//   npm run record:e2e-durations                           # re-record from the newest green full run
//   npm run record:e2e-durations -- <run-id>               # ...or from one you name
//   node scripts/e2e-durations.mjs <merged-report.json>    # rewrite the table from a report you merged
//
// WHY A TABLE AND NOT A FILE COUNT. Until 2026-08-19 CI sized its shards off the NUMBER of spec
// files in the plan: nine shards for a full run, and `min(4, floor(files / 4))` for a subset.
// File count is a bad proxy for time - the spread across these 128 files is 0.001 min to 3.33 -
// and the cap made it worse the bigger the plan got. Measured on the 60 CI runs to 2026-08-19:
//
//   run 32174589727   103 specs  58.3 min of tests  on 4 shards = 14.6 min per shard
//   run 32152498866    88 specs  51.8 min           on 4 shards = 12.9 min per shard
//   run 32215290709    73 specs  40.8 min           on 4 shards = 10.2 min per shard
//   (a FULL run)      128 specs  66.9 min           on 9 shards =  7.4 min per shard
//
// A subset covering 80% of the suite was running on 44% of the runners, so a "cheap" targeted
// run finished LATER than the full suite it was meant to be cheaper than. Sizing off measured
// minutes puts every one of those at ~7 min per shard instead.
//
// WHAT IT CANNOT BREAK. This table only decides HOW MANY runners the plan asks for. Playwright's
// own `--shard=i/n` still assigns every test in the plan across those runners, so a stale or
// missing entry changes the wall clock and never the coverage - which is why the file is
// deliberately not a gate and lives under `scripts/` (ignored by the affected-spec map: nothing
// a spec can observe changes when it does).
//
// HOW TO REFRESH IT. `npm run record:e2e-durations` does the whole thing. The numbers come from a
// real CI run's shard reports, because that is the hardware they are used on - a laptop's timings
// are a different machine's - so the command picks the newest GREEN FULL run of ci.yml on `main`
// (main always runs full), downloads its blob reports, merges them and rewrites the table,
// stamping which run it came from. Name a run id to use that one instead.
//
// A HALF-RUN IS REFUSED, not silently recorded: a run whose E2E jobs are not all `(full)`, or that
// is missing a shard, measures a SUBSET, and writing that would drop every unmeasured spec back to
// the median. Blob artifacts are kept for 7 days, so re-record from a recent run.
import { readFileSync, writeFileSync, mkdtempSync, rmSync, copyFileSync, mkdirSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TABLE = fileURLToPath(new URL('./e2e-durations.json', import.meta.url));
const E2E_DIR = fileURLToPath(new URL('../e2e/', import.meta.url));

/** The table as `{ source, minutes }`, or a usable empty one if it has been removed. */
export function readTable() {
  try {
    const raw = JSON.parse(readFileSync(TABLE, 'utf8'));
    return { source: raw.source ?? {}, minutes: raw.minutes ?? {} };
  } catch {
    return { source: {}, minutes: {} };
  }
}

/**
 * Per-file totals, in minutes, from a Playwright JSON report.
 *
 * Sums every RESULT rather than every test, so a retried test contributes what it actually cost
 * the runner - which is the number a shard's wall clock is made of.
 */
export function minutesByFile(report) {
  const totals = new Map();
  const walk = (suite, inherited) => {
    const file = suite.file ?? inherited;
    for (const child of suite.suites ?? []) walk(child, file);
    for (const spec of suite.specs ?? []) {
      const name = (spec.file ?? file ?? '').split(/[/\\]/).pop();
      if (!name) continue;
      for (const test of spec.tests ?? []) {
        for (const result of test.results ?? []) {
          totals.set(name, (totals.get(name) ?? 0) + (result.duration ?? 0) / 60_000);
        }
      }
    }
  };
  for (const suite of report.suites ?? []) walk(suite, suite.file);
  return Object.fromEntries(
    [...totals].map(([f, m]) => [f, Number(m.toFixed(3))]).sort(([a], [b]) => (a < b ? -1 : 1)),
  );
}

/** Spec files on disk that the table has never measured, and entries for files that are gone. */
export function drift(minutes, specFiles) {
  const known = new Set(Object.keys(minutes));
  return {
    unmeasured: specFiles.filter((f) => !known.has(f)),
    stale: [...known].filter((f) => !specFiles.includes(f)),
  };
}

/**
 * Every spec file in `e2e/`, sorted - the SUITE, as the disk holds it.
 *
 * Exported because the shard packer (`packShards`, scripts/e2e-affected.mjs) must enumerate the
 * suite from the DIRECTORY and never from this table's keys. Packing hands each runner an explicit
 * file list, so a spec the table has not measured must still be assigned to a shard; taking the
 * list from the table would make an unmeasured spec a spec nobody runs, which is the exact hazard
 * ci.yml's strategy comment refused bin-packing over until now.
 */
export function specFilesOnDisk() {
  return readdirSync(E2E_DIR).filter((f) => f.endsWith('.spec.ts')).sort();
}

/** Rewrite the table, refusing a report that measured nothing. Returns the spec count, or 0. */
function writeTable(minutes, source) {
  if (Object.keys(minutes).length === 0) return 0;
  const written = {
    $comment: 'GENERATED - do not hand-edit. See scripts/e2e-durations.mjs for how to refresh it and why it exists.',
    source: {
      run: source.run,
      workflow: 'ci.yml',
      branch: source.branch,
      sha: source.sha,
      mode: 'full',
      recordedAt: new Date().toISOString().slice(0, 10),
    },
    minutes,
  };
  writeFileSync(TABLE, `${JSON.stringify(written, null, 2)}\n`);
  const total = Object.values(minutes).reduce((a, b) => a + b, 0);
  console.log(`e2e-durations: wrote ${Object.keys(minutes).length} specs, ${total.toFixed(1)} min total.`);
  return Object.keys(minutes).length;
}

function run(cmd, cmdArgs, opts = {}) {
  return execFileSync(cmd, cmdArgs, { encoding: 'utf8', shell: process.platform === 'win32', ...opts });
}

/**
 * Why this run's shard jobs are not a whole full suite, or `null` if they are.
 *
 * The names CI gives them (`E2E 3/9 (full)`) carry both facts the table needs: that every shard
 * measured the FULL plan rather than an affected subset, and that none of them is missing.
 */
export function fullRunRefusal(jobs) {
  const shards = [];
  for (const job of jobs) {
    const m = /^E2E (\d+)\/(\d+) \((\w+)\)$/.exec(job.name ?? '');
    if (m) shards.push({ index: Number(m[1]), of: Number(m[2]), mode: m[3], conclusion: job.conclusion });
  }
  if (shards.length === 0) return 'it ran no E2E shards';
  const subset = shards.filter((s) => s.mode !== 'full');
  if (subset.length > 0) return `it ran mode "${subset[0].mode}", not the full suite`;
  const expected = shards[0].of;
  if (shards.length !== expected) return `only ${shards.length} of its ${expected} shards reported`;
  const failed = shards.filter((s) => s.conclusion !== 'success');
  if (failed.length > 0) return `shard ${failed[0].index}/${expected} concluded "${failed[0].conclusion}"`;
  return null;
}

/** The newest green FULL ci.yml run on `main`, as `{ id, sha }`. Throws if none is in reach. */
function newestFullRun() {
  const candidates = JSON.parse(
    run('gh', ['run', 'list', '--workflow', 'ci.yml', '--branch', 'main', '--limit', '20',
      '--json', 'databaseId,conclusion,headSha']),
  ).filter((r) => r.conclusion === 'success');
  for (const candidate of candidates) {
    const { jobs } = JSON.parse(run('gh', ['run', 'view', String(candidate.databaseId), '--json', 'jobs']));
    const refusal = fullRunRefusal(jobs);
    if (refusal) {
      console.log(`e2e-durations: skipping run ${candidate.databaseId} - ${refusal}.`);
      continue;
    }
    return { id: String(candidate.databaseId), sha: candidate.headSha };
  }
  throw new Error('no green FULL ci.yml run on main in the last 20 - name a run id, or push one.');
}

/** Download a run's shard reports, merge them, and rewrite the table from what they measured. */
function record(runId) {
  let target;
  if (runId) {
    const view = JSON.parse(run('gh', ['run', 'view', String(runId), '--json', 'jobs,headSha']));
    const refusal = fullRunRefusal(view.jobs);
    if (refusal) {
      console.error(`e2e-durations: run ${runId} is not a whole full suite - ${refusal}. Refusing to record it.`);
      return 1;
    }
    target = { id: String(runId), sha: view.headSha };
  } else {
    target = newestFullRun();
  }
  console.log(`e2e-durations: recording from run ${target.id} (${target.sha.slice(0, 8)}).`);

  const work = mkdtempSync(join(tmpdir(), 'e2e-durations-'));
  try {
    const blobs = join(work, 'blobs');
    const flat = join(work, 'flat');
    mkdirSync(flat, { recursive: true });
    run('gh', ['run', 'download', target.id, '--pattern', 'blob-report-*', '--dir', blobs], { stdio: 'inherit' });
    // merge-reports wants every zip in ONE directory; `gh` gives each artifact its own.
    let zips = 0;
    for (const dir of readdirSync(blobs)) {
      for (const file of readdirSync(join(blobs, dir))) {
        if (!file.endsWith('.zip')) continue;
        copyFileSync(join(blobs, dir, file), join(flat, `${dir}-${file}`));
        zips += 1;
      }
    }
    if (zips === 0) throw new Error(`run ${target.id} has no blob reports left - they expire after 7 days.`);
    const merged = run('npx', ['playwright', 'merge-reports', '--reporter=json', flat], { maxBuffer: 256 * 1024 * 1024 });
    const minutes = minutesByFile(JSON.parse(merged));
    if (writeTable(minutes, { run: target.id, branch: 'main', sha: target.sha }) === 0) {
      console.error(`e2e-durations: run ${target.id} merged to no test results - refusing to write an empty table.`);
      return 1;
    }
    return 0;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

function main() {
  const args = process.argv.slice(2);
  const table = readTable();

  if (args.includes('--check') || args.length === 0) {
    const files = specFilesOnDisk();
    const { unmeasured, stale } = drift(table.minutes, files);
    const total = Object.values(table.minutes).reduce((a, b) => a + b, 0);
    console.log(
      `e2e-durations: ${Object.keys(table.minutes).length} specs, ${total.toFixed(1)} min total, ` +
        `recorded ${table.source.recordedAt ?? '?'} from run ${table.source.run ?? '?'}.`,
    );
    if (unmeasured.length > 0) {
      console.log(`  ${unmeasured.length} spec file(s) not in the table (each counted as the median):`);
      for (const f of unmeasured) console.log('   -', f);
    }
    if (stale.length > 0) {
      console.log(`  ${stale.length} table entry/entries no longer on disk (ignored):`);
      for (const f of stale) console.log('   -', f);
    }
    // Deliberately exit 0 either way. A stale table costs wall clock and never coverage
    // (see the header), so this REPORTS - it is not a gate, and must not become one.
    return 0;
  }

  const positional = args.find((a) => !a.startsWith('--'));

  if (args.includes('--record')) return record(positional);

  if (!positional) {
    console.error('usage: node scripts/e2e-durations.mjs [--check | --record [run-id] | <merged-report.json>]');
    return 1;
  }
  const minutes = minutesByFile(JSON.parse(readFileSync(positional, 'utf8')));
  if (
    writeTable(minutes, {
      run: process.env.E2E_DURATIONS_RUN ?? table.source.run ?? 'unknown',
      branch: process.env.E2E_DURATIONS_BRANCH ?? 'main',
      sha: process.env.E2E_DURATIONS_SHA ?? 'unknown',
    }) === 0
  ) {
    console.error(`e2e-durations: ${positional} contained no test results - refusing to write an empty table.`);
    return 1;
  }
  return 0;
}

const isEntrypoint =
  Boolean(process.argv[1]) &&
  process.argv[1].replaceAll('\\', '/').toLowerCase().endsWith('e2e-durations.mjs');
if (isEntrypoint) process.exit(main());
