#!/usr/bin/env node
// Classify a nightly Playwright JSON report into FOCUS vs PAUSED failures (docs/GOALS_ARCHIVE.md
// "Student release"; the focus list is scripts/e2e-lists.mjs, shared with e2e-affected.mjs so
// the two consumers cannot drift).
//
//   node scripts/nightly-triage.mjs nightly-report.json > nightly-triage.md
//
// Prints a markdown verdict body to stdout and writes nightly-triage.json (the failed-file
// sets plus a stable failure-set hash) beside the cwd. The nightly verdict job appends the
// markdown to the rolling issue and uses the hash to post only when the failure SET changed -
// paused-area drift is reported once per change of drift, never once per night. A night with
// any focus failure always posts.
//
// Mass-failure promotion: a paused-area failure count above MASS_THRESHOLD is promoted out of
// the collapsed details block - dozens of paused specs failing at once is a broken foundation
// (an e2e helper, the shell), never "drift", and must not be filed under a fold. The threshold
// is absolute rather than night-over-night because this script sees one night at a time.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { FOCUS } from './e2e-lists.mjs';

const MASS_THRESHOLD = 10;

const reportPath = process.argv[2];
if (!reportPath) {
  console.error('usage: node scripts/nightly-triage.mjs <playwright-json-report>');
  process.exit(2);
}

let report;
try {
  report = JSON.parse(readFileSync(reportPath, 'utf8'));
} catch (err) {
  // A missing or unreadable report is itself a finding, not a crash: emit an honest body so
  // the verdict job still has something to file.
  console.log(`Nightly triage: could not read ${reportPath} (${err.message}) - per-spec classification unavailable.`);
  writeFileSync('nightly-triage.json', JSON.stringify({ hash: 'no-report', focusFailed: [], pausedFailed: [] }));
  process.exit(0);
}

// Walk the merged report's suite tree; a spec with ok === false marks its FILE as failed.
const failedFiles = new Set();
function walk(suite) {
  for (const spec of suite.specs ?? []) {
    if (spec.ok === false) failedFiles.add(basename(suite.file ?? spec.file ?? 'unknown'));
  }
  for (const child of suite.suites ?? []) walk(child);
}
for (const suite of report.suites ?? []) walk(suite);

const focusSet = new Set(FOCUS);
const focusFailed = [...failedFiles].filter((f) => focusSet.has(f)).sort();
const pausedFailed = [...failedFiles].filter((f) => !focusSet.has(f)).sort();
const hash = createHash('sha1').update([...failedFiles].sort().join('\n')).digest('hex').slice(0, 12);

writeFileSync('nightly-triage.json', JSON.stringify({ hash, focusFailed, pausedFailed }, null, 2));

const lines = [];
if (failedFiles.size === 0) {
  lines.push('Nightly triage: every spec file green.');
} else {
  if (focusFailed.length > 0) {
    lines.push(`**Sprint-relevant failures (fix now) - ${focusFailed.length} spec file(s):**`);
    for (const f of focusFailed) lines.push(`- ${f}`);
    lines.push('');
  }
  if (pausedFailed.length > MASS_THRESHOLD) {
    lines.push(`**PAUSED-AREA MASS FAILURE - ${pausedFailed.length} spec files red at once.** That is a broken shared foundation, not sprint drift - investigate now:`);
    for (const f of pausedFailed) lines.push(`- ${f}`);
    lines.push('');
  } else if (pausedFailed.length > 0) {
    lines.push('<details>');
    lines.push(`<summary>Paused-area failures (${pausedFailed.length}) - areas paused during the student-release sprint, swept at sprint end</summary>`);
    lines.push('');
    for (const f of pausedFailed) lines.push(`- ${f}`);
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }
}
lines.push(`<!-- nightly-failure-set: ${hash} -->`);
console.log(lines.join('\n'));
