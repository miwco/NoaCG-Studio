#!/usr/bin/env node
// HOW LONG EACH SPEC FILE TAKES - the measured table `scripts/e2e-affected.mjs` sizes a CI run's
// shard count from, and the command that refreshes it.
//
//   node scripts/e2e-durations.mjs --check                 # report drift, change nothing
//   node scripts/e2e-durations.mjs <merged-report.json>    # rewrite the table from a real run
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
// HOW TO REFRESH IT. The numbers come from a real CI run's shard reports, because that is the
// hardware they are used on - a laptop's timings are a different machine's. Pick a green FULL
// run (main always runs full), then:
//
//   gh run download <run-id> --pattern 'blob-report-*' --dir blobs
//   cp blobs/*/*.zip flat/
//   npx playwright merge-reports --reporter=json flat > merged.json
//   node scripts/e2e-durations.mjs merged.json
//
// Blob artifacts are kept for 7 days, so refresh from a recent run or from the nightly.
import { readFileSync, writeFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
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

function specFilesOnDisk() {
  return readdirSync(E2E_DIR).filter((f) => f.endsWith('.spec.ts')).sort();
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

  const reportPath = args.find((a) => !a.startsWith('--'));
  if (!reportPath) {
    console.error('usage: node scripts/e2e-durations.mjs [--check | <merged-report.json>]');
    return 1;
  }
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const minutes = minutesByFile(report);
  if (Object.keys(minutes).length === 0) {
    console.error(`e2e-durations: ${reportPath} contained no test results - refusing to write an empty table.`);
    return 1;
  }
  const written = {
    $comment: 'GENERATED - do not hand-edit. See scripts/e2e-durations.mjs for how to refresh it and why it exists.',
    source: {
      run: process.env.E2E_DURATIONS_RUN ?? table.source.run ?? 'unknown',
      workflow: 'ci.yml',
      branch: process.env.E2E_DURATIONS_BRANCH ?? 'main',
      sha: process.env.E2E_DURATIONS_SHA ?? 'unknown',
      mode: 'full',
      recordedAt: new Date().toISOString().slice(0, 10),
    },
    minutes,
  };
  writeFileSync(TABLE, `${JSON.stringify(written, null, 2)}\n`);
  const total = Object.values(minutes).reduce((a, b) => a + b, 0);
  console.log(`e2e-durations: wrote ${Object.keys(minutes).length} specs, ${total.toFixed(1)} min total.`);
  return 0;
}

const isEntrypoint =
  Boolean(process.argv[1]) &&
  process.argv[1].replaceAll('\\', '/').toLowerCase().endsWith('e2e-durations.mjs');
if (isEntrypoint) process.exit(main());
