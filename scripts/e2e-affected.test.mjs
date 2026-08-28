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
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_SHARDS, planFor, runPlan, runsFor, shardsFor, summariseRuns } from './e2e-affected.mjs';
import { readTable } from './e2e-durations.mjs';

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

/**
 * Specs that RECONSTRUCT a preset's emitted region - they import the preset registry and call
 * `emit()` themselves to build a legacy twin, then measure it against the interpreter that
 * actually ships. The emitted region is authored under `src/templates/`, so those specs' whole
 * subject moves when a preset there changes.
 */
function emitReconstructingSpecs() {
  return readdirSync(E2E_DIR)
    .filter((f) => f.endsWith('.spec.ts'))
    .filter((f) => readFileSync(join(E2E_DIR, f), 'utf8').includes('presetRegistry'));
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

// THE RULE: a preset change under src/templates must RUN the specs that reconstruct its emit.
//
// This is the catalog hole above one layer down, and it cost main a full day of red. The
// count-from-zero fix (2026-08-27) changed how an infographic's counting builder is positioned;
// anim-engine.spec.ts is the only place the emitted region and the interpreter that replaced it
// are measured against each other, and it was reachable from src/blocks/ alone. Every branch plan
// for that change therefore skipped the one spec whose subject it was, the branch landed green,
// and the nightly found four mismatches on main the next morning.
//
// Derived from the import, not from a list: a second spec that starts building legacy twins is
// covered the day it is written.
test('a preset change under src/templates selects every spec that reconstructs an emit', () => {
  const reconstructing = emitReconstructingSpecs();
  assert.ok(reconstructing.length >= 1, 'expected the detector to find the legacy-twin specs');

  const { mode, specs } = planFor(['src/templates/infographics/igPresets.ts']);
  assert.equal(mode, 'subset', 'a template file is mapped, so it must not escalate');

  const missing = reconstructing.filter((s) => !specs.includes(s));
  assert.deepEqual(
    missing,
    [],
    `these specs rebuild a preset's emitted region but no src/templates/ change selects them - add them to the src/templates rule in e2e-affected.mjs: ${missing.join(', ')}`,
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

// ── The merge-commit blind spot, pinned against a REAL merge ────────────────
//
// THE RULE: a run whose HEAD took `main` in must plan from the FORK POINT, so the plan covers
// both sides' changes. Otherwise the diff base is the pre-merge branch tip, the file list is
// only what MAIN brought in, and a branch whose own work was a catalog change gets
// `catalog: false` - the calibration gate skipped, and a green verdict that was earned by the
// run BEFORE the merge.
//
// It is not hypothetical: replaying the last 120 merge-of-main commits in this repository
// through `planFor` from both bases, 71 of them (59%) would have been planned differently - 17
// of those skipping the catalog gate the combined tree needed, and 8 skipping E2E entirely with
// `mode: none`. Local `--integration` always did the right thing; CI passed an explicit base,
// which used to switch integration off.
//
// The test drives the real CLI over a real git repository with a real merge, because the thing
// under test IS the base resolution - `planFor` cannot see it. The `--no-integration` half is
// the mutation: it reproduces the old behaviour and proves the guard has something to catch.
test('a merge commit plans from the fork point, so the catalog gate is not skipped', () => {
  const repo = mkdtempSync(join(tmpdir(), 'e2e-affected-merge-'));
  // stderr is swallowed on purpose: git narrates every checkout and every CRLF conversion, and
  // this test's output should be its assertions, not a second git log.
  const git = (...args) =>
    execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  const write = (rel, body) => {
    mkdirSync(dirname(join(repo, rel)), { recursive: true });
    writeFileSync(join(repo, rel), body);
  };
  const cli = fileURLToPath(new URL('./e2e-affected.mjs', import.meta.url));
  const plan = (...args) =>
    JSON.parse(execFileSync(process.execPath, [cli, ...args], { cwd: repo, encoding: 'utf8' }));

  try {
    git('init', '-b', 'main');
    git('config', 'user.email', 'test@example.invalid');
    git('config', 'user.name', 'Test');
    git('config', 'commit.gpgsign', 'false');
    write('README.md', 'base\n');
    git('add', '-A');
    git('commit', '-m', 'base');

    // The branch's OWN work is the catalog change - the half a post-merge diff cannot see.
    git('checkout', '-b', 'feature');
    write('src/templates/competition/esp09.ts', 'export const esp09 = {};\n');
    git('add', '-A');
    git('commit', '-m', 'add a design');
    const branchTip = git('rev-parse', 'HEAD');

    // …and main moves on, touching something that maps nowhere near the catalog.
    git('checkout', 'main');
    write('src/landing/motion.ts', 'export const motion = {};\n');
    git('add', '-A');
    git('commit', '-m', 'landing motion');

    git('checkout', 'feature');
    git('merge', '--no-ff', '-m', 'Merge branch main into feature', 'main');

    // THE MUTATION: the old behaviour, reproduced by switching integration off. CI passed
    // `github.event.before` - the pre-merge branch tip - and got exactly this.
    const pushBase = plan('--json', '--no-integration', branchTip);
    assert.equal(pushBase.catalog, false, 'the mutation must reproduce the skipped catalog gate');
    assert.ok(
      !pushBase.specs.includes('catalog-baseline.spec.ts'),
      'the mutation must also lose the catalog specs, or this test proves nothing',
    );

    // THE GUARD: the same base, with integration asked for. The fork point is an ancestor of the
    // push base, so the plan can only grow.
    const forked = plan('--json', '--integration', branchTip);
    assert.equal(forked.catalog, true, 'the merged tree carries a catalog change - the gate must run');
    assert.ok(forked.specs.includes('catalog-baseline.spec.ts'));
    assert.ok(forked.specs.includes('landing.spec.ts'), "main's side of the merge must be covered too");
    assert.equal(forked.base, git('merge-base', branchTip, 'main'));

    // …and with no base at all, which is how a person runs it, the same answer.
    assert.equal(plan('--json', '--integration').catalog, true);

    // A branch that has merged nothing from main keeps the base it was given: `--integration`
    // must not silently rewrite an explicit ref when there is no merge to integrate.
    git('checkout', 'main');
    assert.equal(plan('--json', '--integration', 'HEAD~1').base, 'HEAD~1');

    // …AND A MERGE THAT IS ALREADY ON MAIN IS SOMEBODY ELSE'S INTEGRATION. Land the feature
    // branch, cut a fresh branch from the resulting merge commit, and change one harmless file:
    // the inherited merge must not drag that branch's plan back to a fork point from the work
    // that landed. Measured failing on run 32301201748 - a six-file push planned six shards
    // instead of three because `main`'s tip happened to be a merge commit.
    git('merge', '--no-ff', '-m', 'Merge branch feature into main', 'feature');
    const landed = git('rev-parse', 'HEAD');
    git('checkout', '-b', 'fresh');
    write('src/legal.css', '/* tweak */\n');
    git('add', '-A');
    git('commit', '-m', 'tweak the legal page');
    const fresh = plan('--json', '--integration', landed);
    assert.equal(fresh.base, landed, 'an inherited merge is not this branch\'s integration');
    assert.deepEqual(fresh.specs, ['legal.spec.ts']);
    assert.equal(fresh.catalog, false);
  } finally {
    rmSync(repo, { recursive: true, force: true, maxRetries: 5 });
  }
});

// ── Shard sizing, pinned to what it is FOR ─────────────────────────────────
//
// THE RULE: the runner count follows measured minutes, not a file count. The old rule capped a
// subset at four shards however big it was, and under sprint focus plus the curated map a subset
// is routinely 70-100 of the 128 spec files - so 80% of the suite ran on 44% of the runners and
// finished later than the full suite beside it (run 32174589727: 103 specs, 58.3 min, 4 shards,
// 14.6 min per shard, against 7.4 min on the full run).
const FAKE_TABLE = { minutes: { 'a.spec.ts': 8, 'b.spec.ts': 4, 'c.spec.ts': 2, 'd.spec.ts': 1 } };

test('shard count follows measured minutes, and a full plan still lands on nine', () => {
  // 15 measured minutes over the whole fake suite -> ceil(15 / 3) = 5.
  assert.equal(shardsFor({ mode: 'full', specs: [] }, FAKE_TABLE), 5);
  // The real table is what CI uses, and it must reproduce the nine shards ci.yml has run since
  // 2026-08-08 - this change is about how a SUBSET is sized, not about resizing the full run.
  assert.equal(shardsFor({ mode: 'full', specs: [] }), 9);

  // A subset is sized by ITS OWN minutes, so a heavy plan gets more runners than a light one.
  assert.equal(shardsFor({ mode: 'subset', specs: ['a.spec.ts', 'b.spec.ts'] }, FAKE_TABLE), 4);
  assert.equal(shardsFor({ mode: 'subset', specs: ['d.spec.ts'] }, FAKE_TABLE), 1);
  // A plan too small to be worth splitting is not split: an extra runner costs about a minute
  // of setup, so below ~3 minutes of tests a second shard makes the answer arrive later.
  assert.equal(shardsFor({ mode: 'subset', specs: ['c.spec.ts'] }, FAKE_TABLE), 1);

  // The old cap is gone: a subset covering most of the suite gets most of the runners.
  const nearlyEverything = Object.keys(readTable().minutes).slice(0, 100);
  assert.ok(
    shardsFor({ mode: 'subset', specs: nearlyEverything }) > 4,
    'a subset worth more than four shards must be allowed to have them',
  );
});

test('shard count never leaves a plan with no runner, and never exceeds the ceiling', () => {
  assert.equal(shardsFor({ mode: 'none', specs: [] }, FAKE_TABLE), 1);
  assert.equal(shardsFor({ mode: 'subset', specs: [] }, FAKE_TABLE), 1);
  // Every entry unknown: each counts as the MEDIAN rather than as zero, or a plan made entirely
  // of brand-new spec files would ask for a single runner.
  const brandNew = ['new-1.spec.ts', 'new-2.spec.ts', 'new-3.spec.ts', 'new-4.spec.ts'];
  assert.ok(shardsFor({ mode: 'subset', specs: brandNew }, FAKE_TABLE) >= 2);
  // A table that has been deleted or emptied degrades to one shard rather than to a crash.
  assert.equal(shardsFor({ mode: 'full', specs: [] }, { minutes: {} }), 1);
  assert.ok(shardsFor({ mode: 'subset', specs: Object.keys(readTable().minutes) }) <= MAX_SHARDS);
});

// THE RULE: a component that lives outside every directory rule must name its own surfaces.
// `MotionPresetPicker.tsx` sits directly under src/components/, which no wide rule covers, so
// its line in MAP is the whole of its coverage - and a line that names only the component's own
// spec is indistinguishable from one that is right. On 2026-08-23 it was the former: the picker
// grew a direction-arrow row in the wizard Travel box's class and ux.spec.ts, which walks that
// step, went red on a shard nothing had planned.
test('the universal motion picker plans the wizard steps that MOUNT it, not just its own spec', () => {
  const { mode, specs } = planFor(['src/components/MotionPresetPicker.tsx']);
  assert.equal(mode, 'subset', 'the picker is mapped, so it must not escalate to the full suite');
  for (const spec of ['motion-presets.spec.ts', 'ux.spec.ts', 'wizard-preview.spec.ts']) {
    assert.ok(specs.includes(spec), `${spec} renders the picker and must be planned by a picker change`);
  }
});
