// The Creative Mode PILOT bench (docs/CREATIVE_MODE_PLAN.md §8, §10, §11): run the four
// ablation arms over the pilot brief bank and report the objective half of the go/no-go
// sheet. The ranking that counts is the pairwise human review - this rig produces the
// artifacts that review needs (a hold frame and the three code files per result) plus the
// free gates: structural satisfaction, engineering validity, concept diversity, cost and
// latency.
//
//   node scripts/creative-pilot-bench.mjs --route=<provider>:<model> \
//     --coder-route=<provider>:<model> [--arms=A,B,C,D] [--only=id,id,…|count] \
//     [--category=lower-third|versus|bracket] [--critique-route=<provider>:<model>] \
//     [--out=dir] [--max-cost=usd] [--label=name]
//
// ROUTES ARE PER ARM CLASS. `--route` is the CANDIDATE under test: it serves the staged
// arms C/D (concepts, spec, style, repairs) and the rig's shared intent stage - the small
// structured calls the Lite comparison proved cheap models handle. `--coder-route` serves
// the CODER-shaped arms A/B, whose single ~10-16k-token template emits are a different
// call class: the bracket smoke (benchmarks/creative/v1/SMOKE-2026-07-31.md, blocker 1)
// measured qwen3-30b completing 0/8 arm-A and 3/8 arm-B runs on gateway malformed_response
// while going 8/8 on arm C - one route for every arm measures emit-size reliability, not
// the arms. Required whenever the arms include A or B; pass the same route as --route to
// run the old single-model design (the right call when the candidate IS a coder-class
// model). Arm A stays the frozen control either way: the rig pins the route through saved
// settings - the same mechanism that picks production's session model - and the provider
// code is untouched. Attribution caveat, stated where the numbers land: with split routes,
// B-vs-C differs in model class AND staging; A-vs-B (same coder route) and C-vs-A (the
// product question) stay single-variable. pilot.json records the route per arm and the
// stage ledgers record the model per call.
//
// SPENDS REAL TOKENS - more than any other rig here, because it runs a whole generation per
// arm. Every route is EXPLICIT and fails closed (no env, no saved settings), every model
// must be priced in scripts/ai-bench-prices.json, and the run prints its worst legal spend
// BEFORE the first call and stops at --max-cost (default $1.00) mid-run.
//
// Run the FREE gates first, so a paid run measures the pipeline and not a stale expectation:
//   npx playwright test e2e/creative-pilot.spec.ts e2e/creative-routing.spec.ts
//
// Requirements: the dev-bench server on this checkout's port (`npm run dev:bench`), started
// with the server-side key for the chosen provider. Never CI.

import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { devPort } from './dev-port.mjs';
import { PLATE_CSS } from './creative-plate.mjs';
import { requireAllowedRoute } from './harness-route-policy.mjs';

const BASE = `http://localhost:${devPort()}`;
const ARGS = process.argv.slice(2);
const flag = (name) => ARGS.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

const ROUTE = flag('route') ?? '';
const CODER_ROUTE = flag('coder-route') ?? '';
const CRITIQUE_ROUTE = flag('critique-route') ?? '';
const OUT = path.resolve(flag('out') || './creative-pilot-out');
const FILTER = flag('only') ?? '';
const CATEGORY = flag('category') ?? '';
const MAX_COST = Number(flag('max-cost') ?? '1');
const LABEL = flag('label') || 'pilot';
const ARMS = (flag('arms') || 'A,B,C,D').split(',').map((a) => a.trim().toUpperCase()).filter((a) => 'ABCD'.includes(a));

if (!ROUTE) {
  console.error('This bench SPENDS TOKENS and requires an explicit route: --route=<provider>:<model id>.');
  process.exit(1);
}
// Gateway routes only, unless the run states why it needs a frontier provider
// (scripts/harness-route-policy.mjs; docs/AI_PLATFORM_PLAN.md §7a). All THREE routes are
// checked, each where it is parsed: this rig can run its arms on different models, so gating
// only the headline one would leave the coder and the critique free to reach a flagship.
const FRONTIER_REASON = flag('frontier-reason');
const { provider, model, frontierReason } = requireAllowedRoute(ROUTE, {
  flag: 'route',
  reason: FRONTIER_REASON,
});
if (!ARMS.length) {
  console.error('--arms must name at least one of A,B,C,D.');
  process.exit(1);
}
if (!Number.isFinite(MAX_COST) || MAX_COST <= 0) {
  console.error(`--max-cost must be a positive USD amount, got "${flag('max-cost')}".`);
  process.exit(1);
}
const critique = CRITIQUE_ROUTE
  ? requireAllowedRoute(CRITIQUE_ROUTE, { flag: 'critique-route', reason: FRONTIER_REASON })
  : null;
const critiqueModel = critique?.model ?? '';
if (ARMS.includes('D') && !critiqueModel) {
  console.error('Arm D looks at a rendered frame, so it needs a vision model: --critique-route=<provider>:<model id>.');
  process.exit(1);
}
const coder = CODER_ROUTE
  ? requireAllowedRoute(CODER_ROUTE, { flag: 'coder-route', reason: FRONTIER_REASON })
  : null;
const coderProvider = coder?.provider ?? '';
const coderModel = coder?.model ?? '';
if ((ARMS.includes('A') || ARMS.includes('B')) && (!coderProvider || !coderModel)) {
  console.error(
    'Arms A/B emit whole templates (a coder-class call the smoke showed planning models cannot '
    + 'carry - SMOKE-2026-07-31.md blocker 1): name their route explicitly with '
    + '--coder-route=<provider>:<model id>. Pass the same route as --route to run every arm '
    + 'on one model.',
  );
  process.exit(1);
}

// The reference model READS the brief's attachments (plan §7, src/ai/creative/references.ts).
// It is the critique route because that is already required to be a vision model and a second
// flag for the same capability would only be a second thing to get wrong. Without one, briefs
// carrying references still run - the reference stage skips, exactly as every round before
// 2026-08-02 did, and the report says so rather than pretending the picture was read.
const referenceModel = critiqueModel || '';

/** A brief's declared attachments as data-URL assets, straight from the bank. */
const REF_DIR = new URL('../benchmarks/creative/v1/references/', import.meta.url);
const referencesFor = (brief) => (brief.references ?? []).map((r) => ({
  asset: {
    path: `images/${r.file}`,
    data: `data:image/png;base64,${readFileSync(new URL(r.file, REF_DIR)).toString('base64')}`,
  },
  use: r.use,
}));

const prices = JSON.parse(readFileSync(new URL('./ai-bench-prices.json', import.meta.url), 'utf8'));
const priced = (id, label) => {
  const entry = prices[id];
  if (!entry || typeof entry.in !== 'number' || typeof entry.out !== 'number') {
    console.error(`No price entry for the ${label} "${id}" in scripts/ai-bench-prices.json - add it (bench:discover) before spending.`);
    process.exit(1);
  }
  return entry;
};
const price = priced(model, 'candidate model');
const coderPrice = coderModel ? priced(coderModel, 'coder model') : null;
const critiquePrice = critiqueModel ? priced(critiqueModel, 'critique model') : null;

const costOf = (usage, p = price) =>
  ((usage?.inputTokens ?? 0) * p.in + (usage?.outputTokens ?? 0) * p.out) / 1e6;

/** Price one recorded stage. The ledger names the model that actually served the call
 *  (arm A's intent stage runs on the provider's fast model, the critique on the vision
 *  route), so a known model prices exactly and only an unnamed stage falls back to the
 *  arm's base price. */
const stageCost = (s, armBasePrice) => {
  const exact = s.model ? prices[s.model] : null;
  if (exact) return costOf(s.usage, exact);
  if (s.stage === 'critique' && critiquePrice) return costOf(s.usage, critiquePrice);
  return costOf(s.usage, armBasePrice);
};

/** The route a given arm runs on: A/B are the coder-class arms, C/D the candidate's. */
const armRoute = (arm) => ('AB'.includes(arm)
  ? { provider: coderProvider, model: coderModel, price: coderPrice }
  : { provider, model, price });

// The WORST legal spend per arm, per brief. Arm A carries the ~18.3k-token catalog digest
// plus the coder's example, which is why its input bound dwarfs the others'.
const ARM_MAX = {
  A: { in: 95_000, out: 20_000 },
  B: { in: 45_000, out: 20_000 },
  C: { in: 50_000, out: 16_000 },
  D: { in: 62_000, out: 20_000 },
};
// The intent stage, once per brief, shared by every arm.
const INTENT_MAX = { in: 5_000, out: 2_000 };

const bank = JSON.parse(readFileSync(new URL('../benchmarks/creative/v1/briefs.json', import.meta.url), 'utf8'));
let selected = bank.briefs;
if (CATEGORY) selected = selected.filter((b) => b.category === CATEGORY);
if (/^[a-z0-9-]+(,[a-z0-9-]+)*$/.test(FILTER)) selected = selected.filter((b) => FILTER.split(',').includes(b.id));
else if (Number(FILTER)) selected = selected.slice(0, Number(FILTER));
if (!selected.length) {
  console.error('No briefs selected.');
  process.exit(1);
}

// Each arm's worst case is priced at ITS route's price - a coder route usually costs more
// per token than a planning candidate, and an estimate at the cheap price would understate
// exactly the arms the split exists for.
const perBriefMax =
  (INTENT_MAX.in * price.in + INTENT_MAX.out * price.out) / 1e6 +
  ARMS.reduce((sum, arm) => {
    const p = armRoute(arm).price;
    return sum + (ARM_MAX[arm].in * p.in + ARM_MAX[arm].out * p.out) / 1e6;
  }, 0);
const estMax = perBriefMax * selected.length;
console.log(`Candidate route (arms C/D + intent): ${provider}:${model} — arms ${ARMS.join('')} × ${selected.length} brief(s)${CATEGORY ? ` (${CATEGORY})` : ''}`);
if (coderModel) console.log(`Coder route (arms A/B): ${CODER_ROUTE}${coderModel === model ? '  (same as candidate - single-model attribution)' : ''}`);
if (critiqueModel) console.log(`Critique (arm D) route: ${CRITIQUE_ROUTE}`);
console.log(
  `Estimated MAXIMUM cost: $${estMax.toFixed(4)} (candidate $${price.in}/$${price.out}` +
  `${coderPrice ? `, coder $${coderPrice.in}/$${coderPrice.out}` : ''} per M). ` +
  `Ceiling: $${MAX_COST.toFixed(2)}. Typical runs land well below the maximum.`,
);
if (estMax > MAX_COST) {
  console.error(`Estimated maximum ($${estMax.toFixed(4)}) exceeds the ceiling - raise --max-cost deliberately or select fewer briefs/arms.`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();

// The page renders a template; only Node can screenshot it. This binding is the bridge the
// injected FrameCapture calls once the graphic has settled.
await page.exposeFunction('__pilotScreenshot', async () => (await page.screenshot()).toString('base64'));

try {
  await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
} catch {
  console.error(`No dev-bench server on ${BASE} - start it with \`npm run dev:bench\` (nothing was spent).`);
  await browser.close();
  process.exit(1);
}

// Pin a route through saved settings - the SAME mechanism that picks production's session
// model, which is what lets arm A change route while claudeProvider stays byte-identical
// (the frozen control). Verified once per distinct route before anything is spent.
const pinRoute = (routeProvider, routeModel) => page.evaluate(async ({ provider, model }) => {
  const { refreshAiConfiguration, saveAiSettings, aiConfigured } = await import('/src/ai/settings.ts');
  await refreshAiConfiguration();
  saveAiSettings({ provider, model, fallbacks: [] });
  return aiConfigured();
}, { provider: routeProvider, model: routeModel });

const distinctRoutes = [
  { provider, model },
  ...(coderModel && coderModel !== model ? [{ provider: coderProvider, model: coderModel }] : []),
];
for (const route of distinctRoutes) {
  if (!(await pinRoute(route.provider, route.model))) {
    console.error(`No server-managed route available for ${route.provider}:${route.model}. Start the dev-bench server with the matching key.`);
    await browser.close();
    process.exit(1);
  }
}
await pinRoute(provider, model); // the candidate serves the shared intent stage

let spent = 0;
let stoppedAtCeiling = false;
const results = [];

for (const brief of selected) {
  if (spent + perBriefMax > MAX_COST) {
    stoppedAtCeiling = true;
    console.error(`Ceiling reached after $${spent.toFixed(4)} - stopping before "${brief.id}" (partial results are written).`);
    break;
  }
  console.log(`\n▸ ${brief.id} (${brief.category})`);

  // Stage 1 once per brief: the arms compare GENERATION, so they share one classification.
  // Pinned back to the candidate each time - the previous brief's last arm may have left
  // the coder route in saved settings.
  await pinRoute(provider, model);
  let intent;
  try {
    const intentRun = await page.evaluate(async (text) => {
      const { INTENT_TOOL, intentSystemPrompt, normalizeIntent } = await import('/src/ai/structuralIntent.ts');
      const { callModelDetailed } = await import('/src/ai/modelGateway.ts');
      const result = await callModelDetailed({
        system: intentSystemPrompt(),
        messages: [{ role: 'user', content: [{ type: 'text', text: `Create a broadcast graphics template.\n\nUser brief: ${text}` }] }],
        tool: INTENT_TOOL,
        maxTokens: 2000,
      });
      return { intent: normalizeIntent(result.output), usage: result.usage ?? null };
    }, brief.brief);
    intent = intentRun.intent;
    spent += costOf(intentRun.usage);
  } catch (e) {
    console.log(`  intent stage FAILED: ${String(e?.message ?? e).split('\n')[0]} — skipping the brief.`);
    results.push({ brief: brief.id, category: brief.category, arm: null, error: 'intent-stage-failed' });
    continue;
  }

  for (const arm of ARMS) {
    process.stdout.write(`  arm ${arm} … `);
    // The arm's route rides saved settings (see pinRoute above): coder route for the
    // coder-shaped arms A/B, the candidate for the staged arms C/D.
    const route = armRoute(arm);
    await pinRoute(route.provider, route.model);
    const started = Date.now();
    let row;
    try {
      row = await page.evaluate(async ({ brief, intent, arm, critiqueModel, referenceModel, references, plateCss }) => {
        const { runCreativeArm } = await import('/src/ai/creative/pipeline.ts');
        const { productionSpxValidator } = await import('/src/ai/lite/pipeline.ts');
        const { benchStructuralIntent } = await import('/src/validation/structuralIntentCheck.ts');
        const { composeDocument } = await import('/src/preview/composeDocument.ts');
        const { parseAnimData } = await import('/src/blocks/animData.ts');

        // The injected frame capture: mount, fill, play, settle, and let Node take the shot.
        const capture = async (template) => {
          document.body.innerHTML = '';
          // The plate the graphic composites over - the SHARED definition (scripts/
          // creative-plate.mjs), because the plate-visibility measurement re-renders the same
          // gradient as its reference and the two must match pixel for pixel.
          document.body.style.cssText =
            'margin:0;width:1920px;height:1080px;overflow:hidden;background:' + plateCss;
          const frame = document.createElement('iframe');
          frame.id = 'pilot-frame';
          frame.style.cssText = 'position:absolute;inset:0;width:1920px;height:1080px;border:0;background:transparent';
          await new Promise((resolve) => {
            frame.onload = resolve;
            frame.srcdoc = composeDocument(template);
            document.body.appendChild(frame);
          });
          const win = frame.contentWindow;
          try {
            win.update?.(JSON.stringify(Object.fromEntries(template.fields.map((f) => [f.field, f.value ?? '']))));
            win.play?.();
          } catch { /* a template that throws here is the validator's finding, not the capture's */ }
          const anim = parseAnimData(template.js);
          const entranceMs = anim ? (anim.steps[0].duration / anim.speed) * 1000 : 2000;
          await new Promise((r) => setTimeout(r, entranceMs + 400));
          const shot = await window.__pilotScreenshot();
          return shot;
        };

        const context = {
          images: [],
          // The brief's own attachments (plan §7). Four briefs in the bank have said "the
          // attached mood board" / "plate attached" since the bank was written, and every
          // round before 2026-08-02 sent them nothing - the model was told to follow a
          // reference that did not exist. Loaded from benchmarks/creative/v1/references.
          //
          // NOT GIVEN TO ARM A, and the asymmetry is stated wherever its numbers are: the
          // control is the FROZEN coder (§8), its code may not be touched, and it sends any
          // reference straight to its own route as a vision block - which a text coder
          // REJECTS, failing the brief outright rather than ignoring the picture. The staged
          // arms read references through a vision stage that arm A has no equivalent of, so a
          // reference brief compares a pipeline that can see against one that cannot.
          references: arm === 'A' ? [] : references,
          palette: null,
          resolution: { width: 1920, height: 1080, label: '1080p' },
          fps: 25,
        };
        const result = await runCreativeArm(arm, {
          brief,
          intent,
          context,
          validate: productionSpxValidator(),
          structuralCheck: benchStructuralIntent,
          // Both staged arms read the references - the stage sits before the concept call, so
          // making it arm D's alone would have measured the critique and the references
          // together and told us which of the two moved the frame: neither.
          ...(referenceModel && references.length ? { referenceModel } : {}),
          ...(arm === 'D' ? { capture, critiqueModel } : {}),
        });

        // Capture the FINAL frame for the gallery and the sameness proxy, whatever the arm.
        const hold = result.template ? await capture(result.template) : null;
        return {
          ok: result.ok,
          error: result.error ?? null,
          errorRules: (result.validation?.errors ?? []).map((e) => e.rule),
          warningRules: (result.validation?.warnings ?? []).map((w) => w.rule),
          structural: result.structural.map((f) => f.message),
          concepts: result.concepts,
          spec: result.spec,
          styleApplied: result.styleApplied,
          critique: result.critique ?? null,
          critiqueRepairApplied: result.critiqueRepairApplied ?? null,
          repairRounds: result.repairRounds,
          stages: result.stages,
          totalMs: result.totalMs,
          template: result.template
            ? { name: result.template.name, html: result.template.html, css: result.template.css, js: result.template.js, fields: result.template.fields.length }
            : null,
          hold,
        };
      }, { brief: brief.brief, intent, arm, critiqueModel, referenceModel, references: referencesFor(brief), plateCss: PLATE_CSS });
    } catch (e) {
      console.log(`ERROR ${String(e?.message ?? e).split('\n')[0]}`);
      results.push({ brief: brief.id, category: brief.category, arm, error: String(e?.message ?? e), latencyMs: Date.now() - started });
      continue;
    }

    const armCost = row.stages.reduce((sum, s) => sum + stageCost(s, route.price), 0);
    spent += armCost;

    const dir = path.join(OUT, arm);
    mkdirSync(dir, { recursive: true });
    const stem = `${LABEL}-${arm}-${brief.id}`;
    let holdFile = null;
    if (row.hold) {
      holdFile = `${stem}-hold.png`;
      writeFileSync(path.join(dir, holdFile), Buffer.from(row.hold, 'base64'));
    }
    if (row.template) {
      writeFileSync(path.join(dir, `${stem}.html`), row.template.html);
      writeFileSync(path.join(dir, `${stem}.css`), row.template.css);
      writeFileSync(path.join(dir, `${stem}.js`), row.template.js);
    }

    // The frame and the code are on disk now; the row keeps their paths, not their bytes.
    const rest = { ...row };
    const template = rest.template;
    delete rest.hold;
    delete rest.template;
    results.push({
      brief: brief.id,
      category: brief.category,
      arm,
      ...rest,
      templateName: template?.name ?? null,
      fieldCount: template?.fields ?? null,
      files: { hold: holdFile ? `${arm}/${holdFile}` : null, html: template ? `${arm}/${stem}.html` : null },
      costUsd: Number(armCost.toFixed(6)),
      latencyMs: Date.now() - started,
    });
    console.log(
      `${row.ok ? 'valid' : `INVALID (${row.errorRules.join(', ') || row.error})`}` +
      `${row.structural.length ? `, ${row.structural.length} structural gap(s)` : ', structurally complete'}` +
      `${row.styleApplied ? ', style landed' : ''} — ${(row.totalMs / 1000).toFixed(1)}s, $${armCost.toFixed(4)}`,
    );
  }
}

await browser.close();

// ── The report: the free half of the §11 sheet ───────────────────────────────

const armRows = (arm) => results.filter((r) => r.arm === arm && !r.error);
const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : 'n/a');
const distinct = (concepts) => {
  const differs = (a, b) =>
    a.compositionFamily.toLowerCase() !== b.compositionFamily.toLowerCase() &&
    a.hierarchyOrder.join('>').toLowerCase() !== b.hierarchyOrder.join('>').toLowerCase();
  return concepts.filter((c, i) => concepts.some((o, j) => i !== j && differs(c, o))).length;
};

const summary = {};
for (const arm of ARMS) {
  const rows = armRows(arm);
  const attempted = results.filter((r) => r.arm === arm).length;
  const conceptRows = rows.filter((r) => (r.concepts ?? []).length === 3);
  const latencies = rows.map((r) => r.latencyMs).sort((a, b) => a - b);
  const at = (p) => latencies[Math.min(latencies.length - 1, Math.floor((latencies.length - 1) * p))] ?? null;
  const families = rows.map((r) => r.spec?.layout?.family).filter(Boolean);
  const topFamily = families.length
    ? [...families.reduce((m, f) => m.set(f, (m.get(f) ?? 0) + 1), new Map())].sort((a, b) => b[1] - a[1])[0]
    : null;
  summary[arm] = {
    attempted,
    completed: rows.length,
    // Criterion 3 - REPORTED, never ranked on (the two-scorecard rule).
    engineeringValidity: pct(rows.filter((r) => r.ok).length, rows.length),
    // Criterion 2 - the brief-satisfaction gate.
    structurallyComplete: pct(rows.filter((r) => (r.structural ?? []).length === 0).length, rows.length),
    styleLanded: arm === 'C' || arm === 'D' ? pct(rows.filter((r) => r.styleApplied).length, rows.length) : 'n/a',
    // Criterion 5 - concept diversity plus the cross-brief sameness tripwire.
    conceptDiversity: conceptRows.length
      ? pct(conceptRows.filter((r) => distinct(r.concepts) >= 2).length, conceptRows.length)
      : 'n/a',
    topFamilyShare: topFamily ? `${topFamily[0]} ${pct(topFamily[1], families.length)}` : 'n/a',
    repairRounds: rows.reduce((s, r) => s + (r.repairRounds ?? 0), 0),
    // Criterion 7 - cost and latency.
    costPerAttemptUsd: rows.length ? Number((rows.reduce((s, r) => s + r.costUsd, 0) / rows.length).toFixed(5)) : null,
    costPerValidUsd: rows.filter((r) => r.ok).length
      ? Number((rows.reduce((s, r) => s + r.costUsd, 0) / rows.filter((r) => r.ok).length).toFixed(5))
      : null,
    latencyMs: { p50: at(0.5), p90: at(0.9) },
    ...(arm === 'D'
      ? {
          critiqueFoundSomething: pct(rows.filter((r) => (r.critique?.findings ?? []).length > 0).length, rows.length),
          critiqueRepairLanded: pct(rows.filter((r) => r.critiqueRepairApplied).length, rows.length),
        }
      : {}),
  };
}

const report = {
  label: LABEL,
  route: { provider, model, frontierReason },
  coderRoute: CODER_ROUTE || null,
  critiqueRoute: CRITIQUE_ROUTE || null,
  /** Which route served which arm - what makes a split-route report readable on its own. */
  armRoutes: Object.fromEntries(ARMS.map((arm) => [arm, `${armRoute(arm).provider}:${armRoute(arm).model}`])),
  when: new Date().toISOString(),
  arms: ARMS,
  briefs: selected.map((b) => b.id),
  summary,
  cost: { spentUsd: Number(spent.toFixed(6)), ceilingUsd: MAX_COST, stoppedAtCeiling, pricePerM: price, coderPricePerM: coderPrice },
  results,
  note:
    'Engineering validity is REPORTED, never ranked on (plan §11, the two-scorecard rule). ' +
    'The ranking that decides the pilot is the pairwise human review over the hold frames in ' +
    'this directory; nearest-catalog similarity (criterion 6) is `npm run bench:sameness -- ' +
    '<out> --house=<catalog refs>` over the same frames.' +
    (coderModel && coderModel !== model
      ? ' ROUTES ARE SPLIT: arms A/B ran the coder route, C/D the candidate - A-vs-B and '
        + 'C-vs-A stay single-variable, B-vs-C differs in model class AND staging.'
      : ''),
};
writeFileSync(path.join(OUT, 'pilot.json'), JSON.stringify(report, null, 2));

// The sameness rig reads *-metrics.json rows with a hold capture - write one per arm so
// criterion 6 needs no second capture pass.
for (const arm of ARMS) {
  const rows = armRows(arm).filter((r) => r.files.hold);
  if (!rows.length) continue;
  writeFileSync(
    path.join(OUT, arm, `${LABEL}-${arm}-metrics.json`),
    JSON.stringify({
      candidate: `${LABEL}-${arm}`,
      rows: rows.map((r) => ({ fixtureId: r.brief, phaseFiles: { hold: path.basename(r.files.hold) }, skinApplied: r.styleApplied })),
    }, null, 2),
  );
}

console.log('\nPer arm:');
for (const arm of ARMS) console.log(` ${arm}:`, JSON.stringify(summary[arm]));
console.log(`\n$${spent.toFixed(4)} spent${stoppedAtCeiling ? ' (stopped at the ceiling)' : ''}. Written to ${OUT}/pilot.json`);
console.log('The pairwise human review over the hold frames is what decides the pilot - these numbers are the gates, not the ranking.');
