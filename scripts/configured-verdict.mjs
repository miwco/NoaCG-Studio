#!/usr/bin/env node
// Turn a Playwright JSON report from the configured suite into a VERDICT.
//
// WHY THIS IS A SCRIPT AND NOT INLINE YAML. Two workflows now run the same specs against different
// backends - configured-suite.yml against a local `supabase start` stack, hosted-latency.yml
// against the hosted staging project - and both must judge the result identically. Eighty lines of
// jq duplicated across two files is exactly the shape that drifts: on 2026-08-25 a shared e2e
// helper was fixed for one of its two callers and broke the other, in a file whose own header says
// the two walks must not drift. One implementation, two callers, and a test that pins the
// behaviour.
//
// WHAT IT JUDGES, and why each one exists:
//   - NOTHING SKIPPED outside an explicit allowlist. Every spec calls `test.skip(!haveCreds, …)`,
//     so a run with the environment unset executes NOTHING and exits 0. A job reading only the
//     exit code is permanently, silently green - the hole that let five specs sit on main
//     unverified.
//   - AT LEAST minTests ran. Catches what the skip check cannot: a spec file that stops being
//     collected at all.
//   - Zero failures and zero FLAKES. A flake is a real signal here; it is the repeat REPORTING
//     that is suppressed elsewhere, never the verdict.
//
// It also fingerprints the failure set so the caller can tell "the same known problem again" from
// "something new" - see the rolling-issue step in either workflow.
//
//   node scripts/configured-verdict.mjs <report.json> [--min N] [--allow "a.spec.ts b.spec.ts"]
//
// Writes a human summary to stdout, GitHub `::error` lines to stdout, a markdown block to
// $GITHUB_STEP_SUMMARY and key=value pairs to $GITHUB_OUTPUT when those are set. Exits 0 always:
// the CALLER decides what a non-green verdict costs, because the two workflows differ there.
import { appendFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

/** Every spec in the report, at any nesting depth. Playwright nests suites per file and per
 *  describe, so a flat pick of `.specs[]` from every object is the honest way to reach them all. */
export function allSpecs(report) {
  const found = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node.specs)) found.push(...node.specs);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') walk(value);
    }
  };
  walk(report);
  return found;
}

const statuses = (spec) => (spec.tests ?? []).flatMap((t) => (t.results ?? []).map((r) => r.status));

/** A spec is "not clean" if ANY attempt failed - a flake is `failed > passed`, so reading only the
 *  LAST status sees `passed` and fingerprints the empty set. Written that way first and caught
 *  against two real reports that each held a flaky spec and both hashed to SHA1(""). */
export const isUnclean = (spec) => statuses(spec).some((s) => s !== 'passed');
const lastStatus = (spec) => statuses(spec).at(-1) ?? 'not run';

export function verdict(report, { minTests, allowedSkips }) {
  const stats = report?.stats ?? {};
  const expected = stats.expected ?? 0;
  const unexpected = stats.unexpected ?? 0;
  const flaky = stats.flaky ?? 0;
  const skipped = stats.skipped ?? 0;
  const ran = expected + unexpected + flaky;

  const specs = allSpecs(report);
  const allowed = new Set(allowedSkips.split(/\s+/).filter(Boolean));
  const unexpectedSkips = [
    ...new Set(specs.filter((s) => lastStatus(s) === 'skipped').map((s) => s.file)),
  ]
    .filter((file) => !allowed.has(file))
    .sort();

  const failSet = specs
    .filter(isUnclean)
    .map((s) => `${s.file}::${s.title}`)
    .sort();
  const failHash = createHash('sha1').update(failSet.join('\n')).digest('hex').slice(0, 12);

  const problems = [];
  if (unexpectedSkips.length) {
    problems.push({
      title: 'Unexpected skip',
      detail: `These spec files skipped:${unexpectedSkips.map((f) => ` ${f}`).join('')}. Nothing should skip - every credential and capability is present by construction, so a skip means the environment did not come up the way this job assumes.`,
    });
  }
  if (ran < minTests) {
    problems.push({
      title: 'Too few tests ran',
      detail: `${ran} test(s) executed, expected at least ${minTests}.`,
    });
  }
  if (unexpected !== 0 || flaky !== 0) {
    problems.push({ title: 'Configured suite is red', detail: `${unexpected} failed, ${flaky} flaky.` });
  }

  return {
    green: problems.length === 0,
    ran, expected, unexpected, flaky, skipped,
    problems, failHash, failSet, specs,
    summary: `${ran} ran, ${skipped} skipped, ${unexpected} failed, ${flaky} flaky`,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('configured-verdict.mjs')) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const valueOf = (flag, fallback) => {
    const i = args.indexOf(flag);
    return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
  };
  const minTests = Number(valueOf('--min', '0'));
  const allowedSkips = valueOf('--allow', '');
  const label = valueOf('--label', 'Configured suite');

  const out = (line) => console.log(line);
  const emit = (name, value) => {
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  };

  let report = null;
  try {
    report = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    // No report at all is its own verdict, and a loud one: the suite never got far enough to
    // write one. Reported as not-green rather than thrown, because the CALLER decides the cost.
    out(`::error title=No report::Could not read ${file} - the run never produced one (${error.message}).`);
    emit('green', 'false');
    emit('summary', 'no JSON report - the run never started');
  }

  if (report) {
    const v = verdict(report, { minTests, allowedSkips });
    out(`Ran ${v.ran} tests (${v.expected} passed, ${v.unexpected} failed, ${v.flaky} flaky), ${v.skipped} skipped.`);
    for (const p of v.problems) out(`::error title=${p.title}::${p.detail}`);
    out(`failure set (${v.failHash}):`);
    for (const entry of v.failSet) out(`  ${entry}`);

    if (process.env.GITHUB_STEP_SUMMARY) {
      const lines = [
        `### ${label} — tests executed`,
        '',
        `${v.ran} ran, ${v.skipped} skipped, ${v.unexpected} failed, ${v.flaky} flaky.`,
        '',
        ...v.specs
          .map((s) => `- \`${s.file}\` — ${s.title}: ${lastStatus(s)}`)
          .sort(),
        '',
      ];
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
    }

    emit('green', String(v.green));
    emit('summary', v.summary);
    emit('failhash', v.failHash);
    emit('hardfail', String(v.unexpected));
  }
}
