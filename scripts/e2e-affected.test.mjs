// `npm run test:e2e:affected` is the PER-MERGE gate (docs/DEPLOYMENT.md, AGENTS.md "Verifying
// changes"), and it can spawn TWO Playwright processes: the mapped-or-full suite, then the
// catalog calibration tripwire under its own config. Whatever it exits with is the whole verdict
// a person or a CI step reads.
//
// That makes the aggregation a silent-failure surface: report only the LAST run's status and a
// red suite followed by a green catalog gate exits 0. Nobody would notice - the failure list is
// thousands of lines above the prompt, and the headline says the gate passed. The repo has
// already been burned twice by trusting a headline over a failure list (~/.claude memory,
// "Pipe masks exit codes"), so the rule is pinned here rather than left to a careful reading of
// the runner.
//
// `runPlan` takes its spawner as an argument for exactly this reason: the behaviour can be
// driven with fake exit codes, with no dev server, no browser and no minutes on the clock.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planFor, runPlan, runsFor, summariseRuns } from './e2e-affected.mjs';

const E2E_DIR = fileURLToPath(new URL('../e2e/', import.meta.url));

/**
 * Specs that ENUMERATE a catalog collection - `CATALOG`, `TYPES`, `KITS` or `PACKS` - rather
 * than pulling one design out by id. They are the specs whose assertions move when a design is
 * added, so they are exactly the specs a `src/templates/` change has to select.
 */
function catalogEnumeratingSpecs() {
  const collection = /(?:import|const)\s*\{[^}]*\b(?:CATALOG|TYPES|KITS|PACKS)\b[^}]*\}/;
  return readdirSync(E2E_DIR)
    .filter((f) => f.endsWith('.spec.ts'))
    .filter((f) => collection.test(readFileSync(join(E2E_DIR, f), 'utf8')));
}

/** A spawner that returns canned statuses in order, and records what it was asked to run. */
function fakeRunner(...statuses) {
  const seen = [];
  const run = (r) => {
    seen.push(r.name);
    return statuses.length > 0 ? statuses.shift() : 0;
  };
  run.seen = seen;
  return run;
}

const SUBSET_WITH_CATALOG = { mode: 'subset', specs: ['sports.spec.ts'], catalog: true };

test('a failed suite is not hidden by a catalog gate that passes afterwards', () => {
  const run = fakeRunner(1, 0);
  const { status, runs } = runPlan(SUBSET_WITH_CATALOG, run);

  assert.equal(status, 1, 'the overall status must stay red');
  assert.deepEqual(run.seen, ['suite', 'catalog gate'], 'both runs still execute');
  assert.deepEqual(
    runs.map((r) => [r.name, r.status]),
    [
      ['suite', 1],
      ['catalog gate', 0],
    ],
  );
});

test('the first failure keeps its own exit code, rather than being flattened to 1', () => {
  // Playwright exits 1 for test failures but other codes exist (e.g. a config or worker fault).
  // Reporting the FIRST failure's code keeps that distinction reachable.
  const { status } = runPlan(SUBSET_WITH_CATALOG, fakeRunner(2, 1));
  assert.equal(status, 2);
});

test('a failure in the second run is reported too', () => {
  const { status } = runPlan(SUBSET_WITH_CATALOG, fakeRunner(0, 1));
  assert.equal(status, 1);
});

test('all-successful runs still return success', () => {
  const run = fakeRunner(0, 0);
  const { status } = runPlan(SUBSET_WITH_CATALOG, run);
  assert.equal(status, 0);
  assert.deepEqual(run.seen, ['suite', 'catalog gate']);
});

test('a spawn that never reported an exit code counts as a failure', () => {
  // spawnSync reports `status: null` when the process was killed by a signal or failed to start.
  // Treating that as 0 is the same false green by another route.
  assert.equal(runPlan(SUBSET_WITH_CATALOG, fakeRunner(null, 0)).status, 1);
  assert.equal(runPlan(SUBSET_WITH_CATALOG, fakeRunner(undefined, 0)).status, 1);
});

test('the run list matches the plan - and an empty spec list never reaches Playwright', () => {
  // `full` deliberately runs Playwright with no spec arguments (that IS the whole suite); a
  // `subset` with an empty list must run NOTHING, because those two spell the same command line.
  assert.deepEqual(runsFor({ mode: 'full', specs: [], catalog: true }).map((r) => r.name), [
    'suite',
    'catalog gate',
  ]);
  assert.deepEqual(runsFor({ mode: 'subset', specs: ['ux.spec.ts'], catalog: false }).map((r) => r.args), [
    ['playwright', 'test', 'ux.spec.ts'],
  ]);
  assert.deepEqual(runsFor({ mode: 'none', specs: [], catalog: true }).map((r) => r.name), ['catalog gate']);
  assert.deepEqual(runsFor({ mode: 'none', specs: [], catalog: false }), []);
});

test('nothing to run is a pass, and spawns nothing', () => {
  const run = fakeRunner();
  const { status, runs } = runPlan({ mode: 'none', specs: [], catalog: false }, run);
  assert.equal(status, 0);
  assert.deepEqual(runs, []);
  assert.deepEqual(run.seen, []);
});

test('the summary names which run went red', () => {
  const { status, runs } = runPlan(SUBSET_WITH_CATALOG, fakeRunner(1, 0));
  const line = summariseRuns(runs, status);
  assert.match(line, /suite FAILED \(exit 1\)/);
  assert.match(line, /catalog gate passed/);
  assert.match(line, /Overall: FAILED \(exit 1\)/);

  const green = runPlan(SUBSET_WITH_CATALOG, fakeRunner(0, 0));
  assert.match(summariseRuns(green.runs, green.status), /Overall: passed/);
});

// ── The mapping's own hole, pinned ──────────────────────────────────────────
//
// THE RULE: adding a design must select every spec that enumerates the catalog. Those specs
// assert over the collection the design was added to, so they are the ones whose expectations a
// catalog change can invalidate - and a mapping that omits one produces the failure mode this
// script says it does not have, running FEWER specs with no alarm attached.
//
// Six of them were omitted for months. On 2026-08-08 ten designs landed on
// claude/new-session-d34962, `competition-pack.spec.ts` went stale on its per-category counts,
// and every gate stayed green: the local affected run never named the spec, and neither did any
// CI branch run. It surfaced only because that branch's FIRST push gave CI no diff base
// (`github.event.before` was all zeroes) and the fallback escalated to the full suite - luck,
// not coverage.
//
// The detector is derived, not a list, so a NEW pack spec is covered the day it is written
// rather than the day someone remembers this file.
test('a design added under src/templates selects every spec that enumerates the catalog', () => {
  const enumerating = catalogEnumeratingSpecs();
  assert.ok(enumerating.length >= 10, `expected the detector to find the pack specs, got ${enumerating.length}`);

  const { mode, specs } = planFor(['src/templates/competition/esp09.ts']);
  assert.equal(mode, 'subset', 'a template file is mapped, so it must not escalate');

  const missing = enumerating.filter((s) => !specs.includes(s));
  assert.deepEqual(
    missing,
    [],
    `these specs enumerate the catalog but no src/templates/ change selects them - add them to the src/templates rule in e2e-affected.mjs: ${missing.join(', ')}`,
  );
});

// THE RULE: a change whose only coverage lives in e2e/configured must SAY so. That suite is
// ignored by this planner and unrunnable in CI, so hosted Pro's door, its metering and its
// allowance read-back can break while the offline specs that pin their ABSENCE stay green -
// the quiet failure, one directory over from the catalog hole above.
test('a change only a configured deployment can cover raises the configured flag', () => {
  for (const file of [
    'src/ai/pro/session.ts',
    'api/_lib/pro/status.ts',
    'src/components/wizard/steps/AiStep.tsx',
    'e2e/configured/pro-wizard.spec.ts',
  ]) {
    assert.equal(planFor([file]).configured, true, `${file} must raise the configured flag`);
  }
  // e2e/configured/** is IGNORED for the offline plan, and the flag has to survive that: the
  // spec files themselves are exactly the change whose suite most needs naming.
  const { mode, configured } = planFor(['e2e/configured/pro-wizard.spec.ts']);
  assert.equal(mode, 'none', 'the configured suite is reported, never run by this gate');
  assert.equal(configured, true);
  // And it stays off for an ordinary change, or the line is noise nobody reads.
  assert.equal(planFor(['src/templates/competition/esp09.ts']).configured, false);
});

// THE RULE: a change to the catalog gate's own specs must RUN the catalog gate. Those specs sit
// outside the default suite, so nothing in the spec mapping selects them; left unmapped the change
// escalates to `full`, and a `full` escalation under sprint focus deliberately drops the catalog
// coupling - so editing a catalog spec would be the one change that never executes it. The same
// hole `playwright.catalog.config.ts` was added to close, one directory over.
test('a change to the catalog gate\'s own specs raises the catalog flag', () => {
  for (const file of ['e2e/catalog/catalog-bench.spec.ts', 'e2e/catalog/mark-height.spec.ts']) {
    assert.equal(planFor([file]).catalog, true, `${file} must raise the catalog flag`);
  }
  // …and it stays off for a change that cannot touch catalog output, or the flag means nothing.
  assert.equal(planFor(['src/landing/motion.ts']).catalog, false);
});

// THE SAME RULE ONE STEP OUT: the bench is the catalog gate's measurement, and a bench rule that
// keeps its measurement in its own module would otherwise be editable without ever running the
// gate that proves it stays quiet on 502 shipped designs.
test('the modules the runtime bench measures through raise the catalog flag', () => {
  for (const file of ['src/validation/runtimeBench.ts', 'src/validation/occlusion.ts']) {
    assert.equal(planFor([file]).catalog, true, `${file} must raise the catalog flag`);
  }
});

test('public legal pages select their clean-URL and responsive-layout spec', () => {
  for (const file of ['terms.html', 'privacy.html', 'src/legal.css']) {
    const { mode, specs } = planFor([file]);
    assert.equal(mode, 'subset');
    assert.deepEqual(specs, ['legal.spec.ts']);
  }
});
