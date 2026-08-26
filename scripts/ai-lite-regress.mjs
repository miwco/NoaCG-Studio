// NoaCG Lite benchmark REGRESSION mode - model held fixed (in fact absent: zero model
// calls, zero cost), pipeline varies. Answers "did my catalog / prompt-contract /
// compiler / validator change break anything" - the weekly-value mode while the catalog
// is still growing (docs/AI_LITE_BENCHMARK.md).
//
//   npm run bench:regress [-- --update-baseline]
//
// Three checks:
//   1. Pipeline identity - manifest hashes vs the committed baseline. Drift is REPORTED,
//      not failed: a growing catalog changes identity weekly, and the point is knowing
//      that recorded model runs are no longer comparable.
//   2. The repair suite - validateLiteDecision + the zero-cost unsupported screen must
//      emit exactly the expected rule codes (Node, via the compiled API runtime).
//   3. Gold + floor compile - every calibration arm must stay machine-valid through the
//      production pipeline (requires the dev server; skipped with --no-compile).

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { buildApiRuntime } from './api-runtime-build.mjs';
import { devPort } from './dev-port.mjs';
import { CORE_SUITE, GOLD_SPECS, REPAIR_SUITE, floorDecision } from './ai-lite-bench/suites.mjs';
import { buildRunManifest } from './ai-lite-bench/manifest.mjs';
import { runCompileJobs } from './ai-lite-bench/compileRunner.mjs';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = path.join(scriptsDir, 'ai-lite-bench', 'regress-baseline.json');
const UPDATE = process.argv.includes('--update-baseline');
const NO_COMPILE = process.argv.includes('--no-compile');
let failures = 0;

// ── 1. Pipeline identity ─────────────────────────────────────────────────────
const manifest = buildRunManifest({ mode: 'regression' });
let baseline = null;
try {
  baseline = JSON.parse(await readFile(BASELINE_PATH, 'utf8'));
} catch {
  console.log('No recorded baseline yet - run with --update-baseline to record one.');
}
if (baseline) {
  const drifted = Object.entries(manifest.hashes).filter(([key, value]) => baseline.hashes?.[key] !== value);
  if (drifted.length) {
    console.log(`Pipeline identity CHANGED since the baseline: ${drifted.map(([k]) => k).join(', ')}.`);
    console.log('Model-comparison runs recorded before this change are no longer comparable.');
    console.log('Re-record with: npm run bench:regress -- --update-baseline');
  } else {
    console.log('Pipeline identity unchanged since the baseline.');
  }
}

// ── 2. The repair suite (Node, compiled contract, no browser) ────────────────
const runtime = await buildApiRuntime(['api/_lib/aiLiteProfile.ts']);
let repairPassed = 0;
try {
  const contract = await import(
    pathToFileURL(path.join(runtime.outputDir, 'src/ai/lite/contract.js')).href
  );
  for (const item of REPAIR_SUITE) {
    const result = contract.validateLiteDecision(item.decision, item.request);
    const got = [...result.errors].sort();
    const want = [...item.expectErrors].sort();
    // A fixture may also pin what was REPAIRED. Since the repairs landed, an expectation of
    // "no errors" stopped being enough on its own: deleting a check entirely would satisfy it,
    // which is precisely the state this suite exists to catch.
    const gotAdjustments = [...(result.adjustments ?? [])].sort();
    const wantAdjustments = [...(item.expectAdjustments ?? [])].sort();
    const match = got.length === want.length && got.every((code, i) => code === want[i])
      && wantAdjustments.every((code) => gotAdjustments.includes(code));
    if (match) repairPassed += 1;
    else {
      failures += 1;
      console.error(`REPAIR SUITE MISMATCH ${item.id}: expected [${want.join(', ')}]`
        + `${wantAdjustments.length ? ` + adjustments [${wantAdjustments.join(', ')}]` : ''}`
        + `, got [${got.join(', ')}]`
        + `${gotAdjustments.length ? ` + adjustments [${gotAdjustments.join(', ')}]` : ''}`);
    }
  }
  console.log(`Repair suite: ${repairPassed}/${REPAIR_SUITE.length} expectations hold.`);

  // The zero-cost DETERMINISTIC unsupported gate (the production pre-inference screen -
  // the model's schema is ready-only, so this screen is the ONLY refusal path) must still
  // catch the expected-unsupported core briefs it caught when the suite was frozen: a miss
  // is both a cost regression and an UNSUPPORTED_FORCED result waiting to happen.
  for (const brief of CORE_SUITE.filter((b) =>
    b.expect.decision === 'unsupported' && b.expect.unsupportedCode !== 'unsupported-category')) {
    const screened = contract.deterministicUnsupportedDecision({
      prompt: brief.brief,
      resolution: { width: 1920, height: 1080 },
      fps: 50,
    });
    if (!screened || screened.code !== brief.expect.unsupportedCode) {
      failures += 1;
      console.error(
        `UNSUPPORTED SCREEN REGRESSION ${brief.id}: expected ${brief.expect.unsupportedCode}, ` +
        `got ${screened ? screened.code : 'no match (would now spend a model call)'}`,
      );
    }
  }
} finally {
  await runtime.cleanup();
}

// ── 3. Gold + floor compile through the production pipeline ──────────────────
if (!NO_COMPILE) {
  const BASE = `http://localhost:${devPort()}`;
  const { chromium } = await import('@playwright/test');
  const probe = await chromium.launch();
  let liteCatalog;
  try {
    const page = await (await probe.newContext()).newPage();
    const loaded = await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' }).then(() => true).catch(() => false);
    if (!loaded) {
      console.error(`No dev server at ${BASE} - start it (npm run dev) or pass --no-compile.`);
      process.exit(1);
    }
    liteCatalog = await page.evaluate(async () =>
      (await import('/src/ai/lite/contract.ts')).LITE_CATALOG.map((entry) => ({ ...entry })));
  } finally {
    await probe.close();
  }
  const seedFor = (id) => {
    let h = 2166136261;
    for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  };
  const jobs = [
    ...GOLD_SPECS.map((gold) => ({ id: `gold-${gold.briefId}`, arm: 'gold', briefId: gold.briefId, decision: gold.decision })),
    ...CORE_SUITE.map((brief) => {
      const floor = floorDecision(brief, liteCatalog, seedFor(brief.id));
      return floor ? { id: `floor-${brief.id}`, arm: 'floor', briefId: brief.id, decision: floor } : null;
    }).filter(Boolean),
  ];
  const outDir = path.resolve('./lite-bench-out/regress');
  const { rows, context } = await runCompileJobs(jobs, { base: BASE, outDir, capture: false });
  const broken = rows.filter((row) => !row.ok);
  for (const row of broken) {
    failures += 1;
    console.error(`COMPILE REGRESSION ${row.id}: ${row.compileError ?? row.ruleCodes?.join(', ')}`);
  }
  console.log(`Compile arms machine-valid: ${rows.length - broken.length}/${rows.length}.`);
  console.log('Context measurements:', JSON.stringify(context));
  manifest.context = context;
}

if (UPDATE) {
  await writeFile(
    BASELINE_PATH,
    JSON.stringify({ suiteId: manifest.suiteId, gitCommit: manifest.gitCommit, hashes: manifest.hashes, recordedAt: manifest.timestamp }, null, 2) + '\n',
    'utf8',
  );
  console.log(`Baseline recorded at ${BASELINE_PATH}.`);
}

if (failures) {
  console.error(`\nbench:regress found ${failures} behavioral regression(s).`);
  process.exitCode = 1;
} else {
  console.log('\nbench:regress: no behavioral regressions.');
}
