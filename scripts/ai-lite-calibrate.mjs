// NoaCG Lite benchmark calibration - the FREE run that frames every model result.
// Zero model calls, zero cost. Requires the dev server (npm run dev).
//
//   npm run bench:calibrate [-- out-dir]
//
// Two arms through the production compile pipeline (src/ai/lite/pipeline.ts):
//   gold  - hand-written ceiling specs. If these do not review well, the CATALOG is the
//           ceiling and no model choice will move it.
//   floor - seeded-random valid chassis carrying the labelled fields. A model that does
//           not clearly beat this is contributing nothing.
// Every model candidate is later reported as a position between the two, never as an
// absolute score. Also records the assembled-context token measurements (docs/
// AI_LITE_BENCHMARK.md #context).

import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { devPort } from './dev-port.mjs';
import { CORE_SUITE, GOLD_SPECS, floorDecision } from './ai-lite-bench/suites.mjs';
import { CHALLENGE_SUITE } from './ai-lite-bench/challenge.mjs';
import { buildRunManifest } from './ai-lite-bench/manifest.mjs';
import { runCompileJobs } from './ai-lite-bench/compileRunner.mjs';

const BASE = `http://localhost:${devPort()}`;
const CHALLENGE = process.argv.includes('--challenge');
const OUT = path.resolve(process.argv.filter((a) => !a.startsWith('--'))[2] || './lite-bench-out/calibration');

function seedFor(id) {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

await mkdir(OUT, { recursive: true });

// The floor needs the Lite catalog; read it through the dev server so this script never
// duplicates the allowlist. One tiny fetch of the source is enough to fail loudly if the
// server is down, before Playwright starts.
const { chromium } = await import('@playwright/test');
const probe = await chromium.launch();
let liteCatalog;
try {
  const page = await (await probe.newContext()).newPage();
  await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' }).catch(() => {
    console.error(`No dev server answering at ${BASE}. Start it with: npm run dev`);
    process.exit(1);
  });
  liteCatalog = await page.evaluate(async () =>
    (await import('/src/ai/lite/contract.ts')).LITE_CATALOG.map((entry) => ({ ...entry })));
} finally {
  await probe.close();
}

const jobs = [];
for (const gold of GOLD_SPECS) {
  jobs.push({ id: `gold-${gold.briefId}`, arm: 'gold', briefId: gold.briefId, decision: gold.decision });
}
for (const brief of CORE_SUITE) {
  const floor = floorDecision(brief, liteCatalog, seedFor(brief.id));
  if (floor) jobs.push({ id: `floor-${brief.id}`, arm: 'floor', briefId: brief.id, decision: floor });
}
if (CHALLENGE) {
  // Diagnostic only (--challenge): the rotating challenge briefs through a floor-style
  // chassis pick - a capacity/Unicode/contrast probe of the CATALOG, never a model score
  // and never part of the calibration pass/fail gate.
  for (const brief of CHALLENGE_SUITE) {
    const floor = floorDecision(brief, liteCatalog, seedFor(brief.id));
    if (floor) jobs.push({ id: `challenge-${brief.id}`, arm: 'challenge', briefId: brief.id, decision: floor });
  }
}

const manifest = buildRunManifest({ mode: 'calibration' });
const { rows, context } = await runCompileJobs(jobs, { base: BASE, outDir: OUT, capture: true, label: 'calib' });

const summary = {
  manifest,
  context,
  rows,
  goldMachineValid: rows.filter((r) => r.arm === 'gold' && r.ok).length,
  goldTotal: rows.filter((r) => r.arm === 'gold').length,
  floorMachineValid: rows.filter((r) => r.arm === 'floor' && r.ok).length,
  floorTotal: rows.filter((r) => r.arm === 'floor').length,
  challengeMachineValid: rows.filter((r) => r.arm === 'challenge' && r.ok).length,
  challengeTotal: rows.filter((r) => r.arm === 'challenge').length,
};
await writeFile(path.join(OUT, 'calibration-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
for (const row of rows) {
  await appendFile(
    path.join(OUT, 'results.jsonl'),
    JSON.stringify({ type: 'calibration-result', runId: manifest.runId, ...row }) + '\n',
    'utf8',
  );
}

console.log('\nContext measurements:', JSON.stringify(context));
console.log(`Gold machine-valid: ${summary.goldMachineValid}/${summary.goldTotal}`);
console.log(`Floor machine-valid: ${summary.floorMachineValid}/${summary.floorTotal}`);
if (summary.challengeTotal) {
  console.log(`Challenge (diagnostic, non-gating): ${summary.challengeMachineValid}/${summary.challengeTotal} machine-valid`);
}
console.log(`Wrote ${path.join(OUT, 'calibration-summary.json')}`);
console.log('Review the gold arm by eye (npm run bench:gallery) before trusting any model score:');
console.log('if gold does not look broadcast-ready, the catalog is the ceiling - fix it first.');
if (rows.some((r) => r.arm !== 'challenge' && !r.ok)) {
  console.error('\nCalibration arm failed machine validation - a platform bug, not a model result.');
  process.exitCode = 1;
}
