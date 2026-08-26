#!/usr/bin/env node
// THE MODEL-VS-HARNESS FOUR-ARM STUDY (docs/LOWER_THIRDS_REFERENCE_CORPUS.md §7,
// docs/MODEL_VS_HARNESS_STUDY.md - the predeclared readings live THERE, not here).
//
// The one experiment that separates "our checkpoint is too weak" from "our harness selects
// for plainness": the SAME briefs through four arms, rendered and judged IDENTICALLY -
// over live footage, at broadcast distance, with real name lengths, under the SPX field
// contract - so the only thing that varies between two gallery items is what produced them.
//
//   arm             prompt                                  model
//   bare-frontier   RAW_SYSTEM (format basics only)         the frontier route     (A)
//   bare-open       RAW_SYSTEM (format basics only)         the open route         (B)
//   harness-open    full harness (spike exemplar arm)       the open route         (C)
//   harness-frontier full harness (spike exemplar arm)      the frontier route     (D)
//
// The BARE arm is the product's own harness-off baseline (`RAW_SYSTEM` in claudeProvider -
// the exact prompt `generateRaw` serves), plus the brief and the f0/f1 field contract and
// nothing else: no taste teaching, no worked example, no exemplars, no repair loop, no
// conversion - the emit renders verbatim. The HARNESS arm is `runSpikeBrief`'s exemplar
// arm: the shipped coder contract, retrieval exemplars, deterministic grounding, the
// two-round repair loop and productionSpxValidator - the configuration every Pro round
// measures. The arms share the pinned decoding (benchmarks/pro/v1/spike/decoding.json).
//
//   node scripts/model-vs-harness.mjs <out-dir> --dry --bed=<footage.webm>
//       FREE. Run FIRST, and again after any change here: pushes hand-authored
//       generation-shaped documents through BOTH grounding paths, the capture, the
//       gallery, the key and the verdict math. A paid round must never be the first
//       thing to execute a code path.
//   node scripts/model-vs-harness.mjs <out-dir> --probe \
//       --open-route=vercel:... --frontier-route=vercel:...
//       PAID (cents). Proves both model ids by a REAL call through the same in-page
//       glue the round uses - a listing is not an entitlement.
//   node scripts/model-vs-harness.mjs <out-dir> --generate --bed=<footage.webm> \
//       --open-route=vercel:... --frontier-route=vercel:... --max-cost=4 [--resume]
//       PAID. The round: 6 briefs x 4 arms, cheap arms first, code saved the moment
//       it exists, capture after, blind gallery last.
//   node scripts/model-vs-harness.mjs <out-dir> --sheet-only
//       FREE. Rebuild the blind sheet from the ledger.
//   node scripts/model-vs-harness.mjs <out-dir> --reasoning --frontier-route=... --max-cost=1
//       PAID. One frontier call, NO tool: the model narrates its full design process for
//       one creative brief, then writes the code - the transcript the stage decomposition
//       in the study doc is built from.
//   node scripts/model-vs-harness.mjs <out-dir> --verdict=<ballot.jsonl>
//       FREE. Apply the PREDECLARED readings to the owner's ballot. Never run it, and
//       never open mvh-key.json, before the ballot is in: a previous round was spoiled
//       by machine verdicts leaking per blind id (scripts/ai-lite-value-gate.mjs).
//
// Requires the bench dev server on this checkout's port (`node scripts/bench-env.mjs
// --profile=pro`, then `npm run dev:bench`). Routes are policed by
// scripts/harness-route-policy.mjs like every other paid runner.

import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { devPort } from './dev-port.mjs';
import { readEnvFile } from './ai-bench-server.mjs';
import { requireAllowedRoute } from './harness-route-policy.mjs';
import { UPDATE_COPY, captureLifecycle } from './ai-lite-capture.mjs';
import { seededRandom } from './ai-lite-bench/suites.mjs';

const BASE = `http://localhost:${devPort()}`;
export const MVH_VERSION = 1;

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const OUT = path.resolve(args.find((a) => !a.startsWith('--')) ?? 'mvh-out');

const DRY = flag('dry');
const PROBE = flag('probe');
const GENERATE = flag('generate');
const SHEET_ONLY = flag('sheet-only');
const REASONING = flag('reasoning');
const VERDICT_FILE = value('verdict');
const RESUME = flag('resume');
const BED = value('bed');
const MAX_COST = Number(value('max-cost') ?? 0);
const FFMPEG = (process.env.FFMPEG_PATH ?? 'ffmpeg').trim() || 'ffmpeg';

const BANK = path.resolve('benchmarks/pro/v1/briefs.json');
const DECODING = path.resolve('benchmarks/pro/v1/spike/decoding.json');

/** The gateway reports NO estimatedCost for the anthropic routes (measured by --probe,
 *  2026-08-15: a served claude-sonnet-5 call came back $0.0000), and a ceiling fed zeros
 *  never trips. So frontier-arm costs fall back to a local price per million tokens,
 *  --frontier-price=<in>,<out> USD, and every ledger row says which kind of number it
 *  carries (`costSource: gateway | estimated`). */
const FRONTIER_PRICE = (value('frontier-price') ?? '3,15').split(',').map(Number);

function armCost(item, routeKey) {
  const reported = item.costUsd ?? 0;
  if (reported > 0) return { costUsd: reported, costSource: 'gateway' };
  const u = item.usage ?? {};
  const inTok = u.inputTokens ?? u.input ?? 0;
  const outTok = u.outputTokens ?? u.output ?? 0;
  if (routeKey !== 'frontier' || (!inTok && !outTok)) return { costUsd: reported, costSource: 'gateway' };
  return {
    costUsd: (inTok * FRONTIER_PRICE[0] + outTok * FRONTIER_PRICE[1]) / 1_000_000,
    costSource: 'estimated',
  };
}

/** The six briefs, from the Pro bank so results join every prior round. Logo briefs are left
 *  out on purpose: this round carries no brand, and a broken-image mark would dominate the
 *  read with a defect class the mark contract already owns. */
const BRIEF_IDS = (value('briefs') ?? 'news-public,sports-live,entertainment,minimalist,long-name,multiline-title')
  .split(',').filter(Boolean);

/** The four arms. `kind` picks the in-page path; `routeKey` picks which policed route pays. */
const ARMS = [
  { id: 'bare-open', kind: 'bare', routeKey: 'open' },
  { id: 'harness-open', kind: 'harness', routeKey: 'open' },
  { id: 'bare-frontier', kind: 'bare', routeKey: 'frontier' },
  { id: 'harness-frontier', kind: 'harness', routeKey: 'frontier' },
];
/** §7's cell letters, used only by the verdict readout. */
const CELL = { 'bare-frontier': 'A', 'bare-open': 'B', 'harness-open': 'C', 'harness-frontier': 'D' };

if (!DRY && !PROBE && !GENERATE && !SHEET_ONLY && !REASONING && !VERDICT_FILE && !value('recapture')) {
  console.error('Pick a mode: --dry (free, run first), --probe, --generate (PAID), --sheet-only, --recapture=<slugs>, --reasoning (PAID) or --verdict=<ballot.jsonl>.');
  process.exit(1);
}

// ── The verdict: the PREDECLARED readings, applied mechanically ─────────────────────────
//
// Operationalized BEFORE the ballot exists (docs/MODEL_VS_HARNESS_STUDY.md §3). Per brief
// with all four arms judged, arms compare by the ballot's quality score, strictly. Over the
// judged briefs, for a pair (X, Y) with wins wx and wy:
//   X >> Y   when wx > judged/2 AND wy <= 1
//   X ≈ Y    when |wx - wy| <= 1
//   lean X   otherwise - directional, not decisive.
export function pairVerdict(wx, wy, judged) {
  if (wx > judged / 2 && wy <= 1) return '>>';
  if (wy > judged / 2 && wx <= 1) return '<<';
  if (Math.abs(wx - wy) <= 1) return '≈';
  return wx > wy ? 'lean-first' : 'lean-second';
}

function comparePair(byBrief, x, y) {
  let wx = 0; let wy = 0; let judged = 0;
  for (const arms of byBrief.values()) {
    if (!arms[x] || !arms[y]) continue;
    judged += 1;
    if (arms[x].quality > arms[y].quality) wx += 1;
    else if (arms[y].quality > arms[x].quality) wy += 1;
  }
  return { wx, wy, judged, verdict: pairVerdict(wx, wy, judged) };
}

async function applyVerdict(ballotFile) {
  const key = JSON.parse(await readFile(path.join(OUT, 'mvh-key.json'), 'utf8'));
  const byCode = new Map(key.map((entry) => [entry.code, entry]));
  const byBrief = new Map();
  for (const line of (await readFile(ballotFile, 'utf8')).split(/\r?\n/)) {
    if (!line.trim()) continue;
    const vote = JSON.parse(line);
    const entry = byCode.get(vote.code);
    if (!entry || !Number.isFinite(vote.quality)) continue;
    const brief = byBrief.get(entry.briefId) ?? {};
    brief[entry.arm] = vote;
    byBrief.set(entry.briefId, brief);
  }

  const airRate = (arm) => {
    const votes = [...byBrief.values()].map((arms) => arms[arm]).filter(Boolean);
    const aired = votes.filter((vote) => ['yes', 'minor'].includes(vote.decision)).length;
    return `${aired}/${votes.length}`;
  };
  console.log('Air rate (yes or minor), per arm:');
  for (const arm of ARMS) console.log(`  ${CELL[arm.id]} ${arm.id}: ${airRate(arm.id)}`);
  console.log('');

  const pairs = [
    ['bare-frontier', 'bare-open', 'the checkpoint question, unharnessed'],
    ['bare-frontier', 'harness-frontier', 'the harness question, on the frontier model'],
    ['harness-open', 'bare-open', 'what the harness does to the open model'],
    ['harness-frontier', 'harness-open', 'the checkpoint question, inside the harness'],
  ];
  const results = {};
  for (const [x, y, label] of pairs) {
    const r = comparePair(byBrief, x, y);
    results[`${CELL[x]}v${CELL[y]}`] = r;
    const word = r.verdict === '>>' ? `${CELL[x]} >> ${CELL[y]}`
      : r.verdict === '<<' ? `${CELL[y]} >> ${CELL[x]}`
        : r.verdict === '≈' ? `${CELL[x]} ≈ ${CELL[y]}`
          : `lean ${r.verdict === 'lean-first' ? CELL[x] : CELL[y]}`;
    console.log(`${CELL[x]} vs ${CELL[y]} (${label}): ${word}  [${r.wx}-${r.wy} of ${r.judged} judged]`);
  }
  console.log('');
  const ab = results.AvB; const ad = results.AvD;
  console.log('§7 reading:');
  if (ab.verdict === '>>') console.log('  A >> B - it is the checkpoint. Route quality-critical work to frontier and price it.');
  else if (ab.verdict === '≈') console.log('  A ≈ B - it is not the checkpoint, and no model swap fixes anything.');
  else console.log(`  A vs B is ${ab.verdict} - directional only; the checkpoint reading is not decisive.`);
  if (ad.verdict === '>>') console.log('  A >> D - it is the harness: the same model gets worse when constrained. The work is one ablation at a time.');
  else if (ad.verdict === '≈') console.log('  A ≈ D - no gap between bare and harnessed frontier; the difference was the judging context.');
  else console.log(`  A vs D is ${ad.verdict} - directional only; the harness reading is not decisive.`);
  console.log('\nWrite the outcome into docs/MODEL_VS_HARNESS_STUDY.md and docs/AI_ATTEMPTS.md.');
  return results;
}

/** The verdict math, proven free in --dry: crafted ballots with known answers. */
function verdictSelfTest() {
  const cases = [
    { wx: 5, wy: 0, judged: 6, expect: '>>' },
    { wx: 6, wy: 0, judged: 6, expect: '>>' },
    { wx: 3, wy: 3, judged: 6, expect: '≈' },
    { wx: 3, wy: 2, judged: 6, expect: '≈' },
    { wx: 4, wy: 2, judged: 6, expect: 'lean-first' },
    { wx: 0, wy: 5, judged: 6, expect: '<<' },
    { wx: 4, wy: 1, judged: 6, expect: '>>' },
  ];
  for (const { wx, wy, judged, expect } of cases) {
    const got = pairVerdict(wx, wy, judged);
    if (got !== expect) throw new Error(`verdict self-test: (${wx},${wy},${judged}) -> ${got}, expected ${expect}`);
  }
  console.log(`verdict self-test: ${cases.length}/${cases.length} predeclared readings reproduce.`);
}

if (VERDICT_FILE) {
  await applyVerdict(path.resolve(VERDICT_FILE));
  process.exit(0);
}

// ── Shared plumbing ─────────────────────────────────────────────────────────────────────

const decoding = JSON.parse(await readFile(DECODING, 'utf8'));
const bank = JSON.parse(await readFile(BANK, 'utf8'));
const briefs = BRIEF_IDS.map((id) => {
  const entry = bank.briefs.find((candidate) => candidate.id === id);
  if (!entry) { console.error(`Unknown brief id "${id}".`); process.exit(1); }
  return entry;
});

/** The bare arm's user message: the brief and the field contract, nothing else. The first
 *  paragraphs match spikeUserMessage word for word so the arms differ in the harness and
 *  not in the ask; the harness message's "what is being judged" block is deliberately part
 *  of the TREATMENT and therefore absent here. */
function bareUserMessage(brief) {
  return `Design and build a LOWER THIRD for this brief.

## The brief
${brief.brief}

## What it must carry
- The primary line (f0), sample value: "${brief.name}"
- The supporting line (f1), sample value: "${brief.title}"

Both lines are LIVE operator fields - the sample values above are what an operator types on
the day, so the composition has to hold text of roughly that length and a good deal longer
without breaking.`;
}

const routes = {};
if (GENERATE || PROBE || REASONING) {
  const open = value('open-route');
  const frontier = value('frontier-route');
  if ((GENERATE || PROBE) && !open) { console.error('PAID mode needs --open-route=<provider>:<model>.'); process.exit(1); }
  if (!frontier) { console.error('PAID mode needs --frontier-route=<provider>:<model>.'); process.exit(1); }
  if (open) routes.open = requireAllowedRoute(open, { flag: 'open-route', reason: value('frontier-reason') });
  routes.frontier = requireAllowedRoute(frontier, { flag: 'frontier-route', reason: value('frontier-reason') });
  if ((GENERATE || REASONING) && (!Number.isFinite(MAX_COST) || MAX_COST <= 0)) {
    console.error('--max-cost must be a positive number of dollars. This run spends real money.');
    process.exit(1);
  }
}

let bedDataUrl = null;
if (DRY || GENERATE) {
  if (!BED) { console.error('--bed=<footage.webm> is required: the arms are judged over live footage.'); process.exit(1); }
  const bytes = await readFile(path.resolve(BED));
  bedDataUrl = `data:video/webm;base64,${bytes.toString('base64')}`;
  await mkdir(OUT, { recursive: true });
  await copyFile(path.resolve(BED), path.join(OUT, 'footage-bed.webm')).catch(() => {});
}

await mkdir(OUT, { recursive: true });

async function checkServer() {
  try {
    await fetch(`${BASE}/app`, { signal: AbortSignal.timeout(4000) });
  } catch {
    console.error(`Dev server not reachable at ${BASE} - start it first (npm run dev:bench).`);
    process.exit(1);
  }
}

/** Sign the page in as the dedicated test account, so the managed gateway key counts
 *  (the pro-spike.mjs lesson: a fresh Playwright context has no session). */
async function signIn(page) {
  const fileEnv = await readEnvFile();
  const email = (process.env.E2E_EMAIL ?? fileEnv.E2E_EMAIL ?? '').trim();
  const password = (process.env.E2E_PASSWORD ?? fileEnv.E2E_PASSWORD ?? '').trim();
  if (!email || !password) {
    console.log('No E2E credentials found - continuing signed out.');
    return;
  }
  try {
    await page.getByRole('button', { name: 'Sign in', exact: true }).click({ timeout: 10_000 });
    await page.locator('#auth-email').fill(email);
    await page.locator('#auth-pass').fill(password);
    await page.locator('.auth-card').getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.locator('.auth-status').waitFor({ state: 'visible', timeout: 20_000 });
    console.log('Signed in for the managed route.');
  } catch (error) {
    console.error(`Sign-in failed (${error.message?.split('\n')[0]}) - continuing signed out.`);
  }
}

async function openApp(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (error) => console.log('  pageerror:', error.message));
  await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
  await page.locator('.topbar').waitFor();
  await page.locator('.wz-modal').waitFor({ state: 'visible', timeout: 20_000 }).catch(() => undefined);
  await page.keyboard.press('Escape');
  await page.locator('.wz-modal').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
  return page;
}

// ── Generation: the two in-page paths ───────────────────────────────────────────────────

/** BARE: one RAW_SYSTEM call, forced emit_template, no repair, no conversion. The validator
 *  still RUNS - report-only, for the post-ballot ledger - exactly as the product statically
 *  validates a raw result for display without ever repairing it. */
const bareInPage = async ({ message, route, decoding }) => {
  const bust = '?t=' + Date.now();
  const { callModelDetailed } = await import('/src/ai/modelGateway.ts' + bust);
  const { RAW_SYSTEM, TEMPLATE_TOOL, toTemplate } = await import('/src/ai/claudeProvider.ts' + bust);
  const { outputBudget } = await import('/src/ai/modelTypes.ts' + bust);
  const { productionSpxValidator } = await import('/src/ai/lite/pipeline.ts' + bust);
  const { parseAnimData } = await import('/src/blocks/animData.ts' + bust);
  const result = await callModelDetailed({
    system: RAW_SYSTEM,
    messages: [{ role: 'user', content: [{ type: 'text', text: message }] }],
    tool: TEMPLATE_TOOL,
    route,
    surface: 'spike',
    cacheSystem: true,
    temperature: decoding.temperature,
    seed: decoding.seed,
    maxTokens: outputBudget(decoding.expectedOutputTokens),
  });
  const emitted = result.output;
  const template = toTemplate(emitted);
  const validation = await productionSpxValidator(null, [])(template);
  return {
    emitted,
    template,
    model: result.model,
    usage: result.usage ?? null,
    costUsd: result.usage?.estimatedCost?.amount ?? 0,
    repairRounds: 0,
    editableTimeline: Boolean(parseAnimData(template.js)),
    validation: {
      ok: validation.ok,
      errors: validation.errors.map((e) => `${e.rule}: ${e.message.slice(0, 200)}`),
      warnings: validation.warnings.map((e) => `${e.rule}: ${e.message.slice(0, 200)}`),
    },
  };
};

/** HARNESS: the spike's exemplar arm - the full shipped harness for a composing model. */
const harnessInPage = async ({ brief, route, decoding }) => {
  const bust = '?t=' + Date.now();
  const spikeRun = await import('/src/ai/spike/run.ts' + bust);
  const { productionSpxValidator } = await import('/src/ai/lite/pipeline.ts' + bust);
  const { parseAnimData } = await import('/src/blocks/animData.ts' + bust);
  const result = await spikeRun.runSpikeBrief({
    brief,
    arm: 'exemplar',
    route,
    decoding,
    validate: productionSpxValidator(null, []),
  });
  return {
    emitted: result.emitted,
    template: result.template,
    model: result.model,
    usage: result.usage,
    costUsd: result.costUsd,
    repairRounds: result.repairRounds,
    exemplarIds: result.exemplarIds,
    editableTimeline: Boolean(parseAnimData(result.template.js)),
    validation: {
      ok: result.validation.ok,
      errors: result.validation.errors.map((e) => `${e.rule}: ${e.message.slice(0, 200)}`),
      warnings: result.validation.warnings.map((e) => `${e.rule}: ${e.message.slice(0, 200)}`),
    },
  };
};

// ── Capture: the shared lifecycle rig over the footage bed ──────────────────────────────
//
// scripts/ai-lite-capture.mjs is the ONE capture loop (its header says why); this build
// function is the only per-caller piece. The bed rides in as a data URL and loops behind
// the transparent graphic iframe - the same clip for every arm, which is the §7 confound
// control: two items may differ only in what produced the graphic.
const captureBuildFn = async ({ template, bed, initialData, updateData }) => {
  const bust = '?t=' + Date.now();
  const { composeDocument } = await import('/src/preview/composeDocument.ts' + bust);
  const { parseAnimData } = await import('/src/blocks/animData.ts' + bust);
  document.body.innerHTML = '';
  document.body.style.cssText = 'margin:0;width:1920px;height:1080px;overflow:hidden;background:#05070a';
  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.autoplay = true;
  video.playsInline = true;
  video.style.cssText = 'position:absolute;inset:0;width:1920px;height:1080px;object-fit:cover';
  video.src = bed;
  document.body.appendChild(video);
  await video.play().catch(() => {});
  const frame = document.createElement('iframe');
  frame.id = 'lite-eval-frame';
  frame.style.cssText = 'position:absolute;inset:0;width:1920px;height:1080px;border:0;background:transparent';
  await new Promise((resolve) => {
    frame.onload = resolve;
    frame.srcdoc = composeDocument(template);
    document.body.appendChild(frame);
  });
  // Data-region templates report real durations; an authoring-shape emit (the bare arms)
  // parses null and takes the defaults - the settle detector owns the rest either way.
  const animData = parseAnimData(template.js);
  const entranceDurationMs = animData ? (animData.steps[0].duration / animData.speed) * 1000 : 3000;
  const exitDurationMs = animData ? (animData.steps.at(-1).duration / animData.speed) * 1000 : 1500;
  return { entranceDurationMs, exitDurationMs, initialData, updateData };
};

/** The first two TEXT fields carry the brief's own lines; the mid-clip update swaps in the
 *  shared longer copy (UPDATE_COPY) - the same real-name-length instrument every Lite and
 *  value-gate round uses. Extra fields keep their emitted defaults. */
function dataFor(template, brief) {
  // `f.field` must be truthy: qwen's bare emits declare DataFields entries as `name:` rather
  // than `field:`, which parses to two fields with EMPTY ids - and a drive keyed by '' made
  // every template's own update() erase its baked sample text (the whole bare-open arm of the
  // 2026-08-15 round was voided and recaptured over exactly this).
  const textFields = (template.fields ?? []).filter((f) => (f.ftype === 'textfield' || f.ftype === 'textarea') && f.field);
  const lines = [brief.name, brief.title];
  const roles = ['person-name', 'person-role'];
  // A definition that parses to no fields still gets driven: the user message pins f0/f1,
  // templates write by getElementById, and un-driving one arm would break the §7 control
  // (measured by --probe: claude-sonnet-5's bare emit wrote `dataFields`/`id`/`ftype`-less
  // entries parseDefinition rightly rejects). The parse failure itself stays recorded on the
  // row - the drive is equalized, the defect is not hidden.
  if (!textFields.length) {
    return {
      initialData: { f0: lines[0], f1: lines[1] },
      updateData: { f0: UPDATE_COPY[roles[0]], f1: UPDATE_COPY[roles[1]] },
    };
  }
  const initialData = {};
  const updateData = {};
  textFields.forEach((field, index) => {
    if (index < 2) {
      initialData[field.field] = lines[index];
      updateData[field.field] = UPDATE_COPY[roles[index]];
    }
  });
  return { initialData, updateData };
}

async function saveCode(slug, item) {
  const dir = path.join(OUT, 'code', slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), item.template.html ?? '', 'utf8');
  await writeFile(path.join(dir, 'template.css'), item.template.css ?? '', 'utf8');
  await writeFile(path.join(dir, 'template.js'), item.template.js ?? '', 'utf8');
  await writeFile(path.join(dir, 'template.json'), JSON.stringify(item.template, null, 2), 'utf8');
  await writeFile(path.join(dir, 'emitted.json'), JSON.stringify(item.emitted, null, 2), 'utf8');
}

const ledgerPath = () => path.join(OUT, 'results.json');
async function writeLedger(ledger) {
  await writeFile(ledgerPath(), `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
}

async function captureItem(browser, slug, template, brief) {
  const { initialData, updateData } = dataFor(template, brief);
  const rawVideoDir = path.join(OUT, '.raw-video');
  await mkdir(rawVideoDir, { recursive: true });
  return captureLifecycle({
    browser,
    base: BASE,
    out: OUT,
    rawVideoDir,
    label: 'mvh',
    itemId: slug,
    ffmpeg: FFMPEG,
    buildFn: captureBuildFn,
    buildArg: { template, bed: bedDataUrl, initialData, updateData },
  });
}

// ── The blind sheet ─────────────────────────────────────────────────────────────────────

async function buildSheet() {
  const ledger = JSON.parse(await readFile(ledgerPath(), 'utf8'));
  const items = ledger.results.filter((row) => row.kind === 'candidate' && !row.skipped);
  // Shuffle EVERYTHING flat, seeded from the item keys: grouping a brief's four arms, or a
  // stable arm order, would let position answer the question the reviewer is asked.
  let seed = 0;
  for (const item of items) for (const ch of item.slug) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = seededRandom(seed || 1);
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const assetsDir = path.join(OUT, 'gate-assets');
  await mkdir(assetsDir, { recursive: true });
  const cards = [];
  const key = [];
  for (const [index, item] of shuffled.entries()) {
    const code = `item-${String(index + 1).padStart(2, '0')}`;
    key.push({ code, key: item.slug, briefId: item.briefId, arm: item.arm, model: item.model ?? null });
    const brief = bank.briefs.find((b) => b.id === item.briefId)?.brief.brief ?? '';
    if (!item.phaseFiles) {
      cards.push({ code, brief, failed: true });
      continue;
    }
    const phases = {};
    for (const [phase, file] of Object.entries(item.phaseFiles)) {
      const name = `${code}-${phase}.png`;
      await copyFile(path.join(OUT, file), path.join(assetsDir, name));
      phases[phase] = `gate-assets/${name}`;
    }
    let motion = null;
    if (item.motionFile) {
      const name = `${code}-motion.webm`;
      await copyFile(path.join(OUT, item.motionFile), path.join(assetsDir, name));
      motion = `gate-assets/${name}`;
    }
    cards.push({ code, brief, phases, motion, still: phases.hold });
  }
  await writeFile(path.join(OUT, 'mvh-key.json'), JSON.stringify(key, null, 2), 'utf8');

  const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NoaCG - blind lower-third review</title>
<style>
  :root{color-scheme:dark;font-family:system-ui,sans-serif;background:#090b0f;color:#e8edf2}
  body{margin:0 auto;max-width:1500px;padding:28px}
  h1{margin:0 0 6px}
  .sub{color:#aeb7c3;margin:0 0 20px;max-width:900px;line-height:1.55}
  .bar{display:flex;gap:12px;align-items:center;margin:0 0 18px;flex-wrap:wrap;position:sticky;top:0;background:#090b0f;padding:10px 0;z-index:5}
  input,button{font:inherit;background:#12161d;color:#e8edf2;border:1px solid #29313d;border-radius:8px;padding:8px 12px}
  button{cursor:pointer}button.primary{border-color:#ffb000;color:#ffb000}
  .card{background:#12161d;border:1px solid #29313d;border-radius:12px;padding:18px;margin:0 0 22px}
  .card img.still,.card video{display:block;width:100%;height:auto;background:#05070a;border-radius:8px;margin:0 0 12px}
  .brief{color:#c6cfda;font-size:14px;line-height:1.5;margin:0 0 12px}
  .phases{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0 0 12px}
  .phases img{width:100%;height:auto;border-radius:6px;background:#05070a}
  .judge{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .judge .grp{display:flex;gap:6px;align-items:center}
  .judge button.sel{border-color:#ffb000;color:#ffb000}
  .label{color:#8d97a5;font-size:13px;text-transform:uppercase;letter-spacing:.06em}
  .done{opacity:.55}
  .failed{color:#ff5a4d;font-size:14px;padding:40px 0;text-align:center;border:1px dashed #3a4351;border-radius:8px;margin:0 0 12px}
</style>
<body>
<h1>Blind lower-third review</h1>
<p class="sub">One question per graphic: <strong>would you put this on air?</strong> Then one 1-5 <strong>quality</strong> score (is it a good broadcast lower third), and an optional note. Every item is rendered over the same live-footage bed, at 1920x1080; judge the still at 100% and use the clip for the entrance, settle and exit. The copy changes once mid-clip on purpose (a longer-name legibility test) - never read the swap itself as a fault. A few items may say they failed to render: that is a real result, score it as what an operator would have received. Items are shuffled and unlabelled. Progress saves in this browser; press Download when finished and send the file back.</p>
<div class="bar">
  Reviewer <input id="reviewer" placeholder="initials" size="8">
  <span id="progress"></span>
  <button class="primary" id="download">Download ballot</button>
</div>
<div id="items"></div>
<script>
const ITEMS = ${JSON.stringify(cards)};
const KEY = 'noacg-mvh-v${MVH_VERSION}';
const state = JSON.parse(localStorage.getItem(KEY) || '{}');
const save = () => { localStorage.setItem(KEY, JSON.stringify(state)); paint(); };
const complete = (code) => Boolean(state[code]?.decision) && Number.isFinite(state[code]?.quality);
function paint() {
  const judged = ITEMS.filter(i => complete(i.code)).length;
  document.getElementById('progress').textContent = judged + ' / ' + ITEMS.length + ' judged';
  for (const item of ITEMS) {
    const el = document.getElementById(item.code);
    if (!el) continue;
    el.classList.toggle('done', complete(item.code));
    for (const b of el.querySelectorAll('[data-dec]')) b.classList.toggle('sel', state[item.code]?.decision === b.dataset.dec);
    for (const b of el.querySelectorAll('[data-quality]')) b.classList.toggle('sel', String(state[item.code]?.quality) === b.dataset.quality);
  }
}
const container = document.getElementById('items');
for (const item of ITEMS) {
  const card = document.createElement('section');
  card.className = 'card'; card.id = item.code;
  card.innerHTML =
    '<p class="label">' + item.code + '</p>' +
    '<p class="brief">' + item.brief + '</p>' +
    (item.failed
      ? '<p class="failed">This one failed to render or play - what reached the screen was nothing usable.</p>'
      : '<a href="' + item.still + '" target="_blank"><img class="still" loading="lazy" src="' + item.still + '"></a>' +
        (item.motion ? '<video controls muted loop preload="metadata" poster="' + item.still + '" src="' + item.motion + '"></video>' : '') +
        '<div class="phases">' + ['entrance','hold','update','exit'].filter(p => item.phases[p])
          .map(p => '<a href="' + item.phases[p] + '" target="_blank"><img loading="lazy" src="' + item.phases[p] + '"></a>').join('') + '</div>') +
    '<div class="judge">' +
      '<span class="grp"><span class="label">On air?</span> ' +
      ['yes','minor','no'].map(d => '<button data-dec="' + d + '">' + ({yes:'Yes',minor:'Yes, after minor edits',no:'No'})[d] + '</button>').join('') + '</span>' +
      '<span class="grp"><span class="label">Quality</span> ' + [1,2,3,4,5].map(s => '<button data-quality="' + s + '">' + s + '</button>').join('') + '</span>' +
      '<input class="note" size="40" maxlength="240" placeholder="What stands out (optional)">' +
    '</div>';
  card.addEventListener('click', (event) => {
    const d = event.target.dataset ?? {};
    if (!d.dec && !d.quality) return;
    const cur = state[item.code] ?? {};
    if (d.dec) cur.decision = d.dec;
    if (d.quality) cur.quality = Number(d.quality);
    cur.reviewer = document.getElementById('reviewer').value || 'owner';
    cur.at = new Date().toISOString();
    state[item.code] = cur; save();
  });
  const note = card.querySelector('.note');
  note.value = state[item.code]?.note ?? '';
  note.addEventListener('change', () => {
    const cur = state[item.code] ?? {};
    cur.note = note.value.trim();
    state[item.code] = cur; save();
  });
  container.appendChild(card);
}
document.getElementById('download').addEventListener('click', () => {
  const lines = Object.entries(state)
    .filter(([, v]) => v.decision)
    .map(([code, v]) => JSON.stringify({ type: 'model-vs-harness', code, ...v }))
    .join('\\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines + '\\n'], { type: 'application/jsonl' }));
  a.download = 'mvh-ballot.jsonl';
  a.click();
});
paint();
</script>
</body>
</html>`;
  await writeFile(path.join(OUT, 'mvh-review.html'), html, 'utf8');
  console.log(`Sheet: ${path.join(OUT, 'mvh-review.html')} (${cards.length} items).`);
}

if (SHEET_ONLY) {
  await buildSheet();
  process.exit(0);
}

// ── RECAPTURE: re-film named slugs from their SAVED templates, zero tokens ──────────────
//
// For a capture-rig fault found after the round (the 2026-08-15 empty-field-id drive): the
// paid emits are on disk, so the fix re-films them without a model call. The sheet's shuffle
// is seeded from the slug set, which is unchanged - so the blind codes stay identical and
// only the repaired items need re-judging.
const RECAPTURE = value('recapture');
if (RECAPTURE) {
  await checkServer();
  if (!bedDataUrl) {
    const bytes = await readFile(path.join(OUT, 'footage-bed.webm'));
    bedDataUrl = `data:video/webm;base64,${bytes.toString('base64')}`;
  }
  const slugs = RECAPTURE.split(',').filter(Boolean);
  const ledger = JSON.parse(await readFile(ledgerPath(), 'utf8'));
  const browser = await chromium.launch();
  try {
    await openApp(browser);
    for (const slug of slugs) {
      const row = ledger.results.find((candidate) => candidate.slug === slug);
      if (!row) { console.error(`No ledger row for ${slug}.`); process.exitCode = 1; continue; }
      const template = JSON.parse(await readFile(path.join(OUT, 'code', slug, 'template.json'), 'utf8'));
      const entry = bank.briefs.find((b) => b.id === row.briefId);
      process.stdout.write(`- recapture ${slug}: `);
      const captured = await captureItem(browser, slug, template, entry.brief);
      row.motionSettled = captured.motionSettled;
      row.phaseFiles = captured.phaseFiles;
      row.motionFile = captured.motionFile ?? null;
      row.recaptured = new Date().toISOString();
      await writeLedger(ledger);
      console.log('done');
    }
  } finally {
    await browser.close();
  }
  await buildSheet();
  process.exit(process.exitCode ?? 0);
}

// ── PROBE: prove both model ids by a real call through the round's own glue ─────────────

if (PROBE) {
  await checkServer();
  const browser = await chromium.launch();
  try {
    const page = await openApp(browser);
    await signIn(page);
    const probeBrief = {
      brief: 'A plain test lower third: one dark panel, name over role, no decoration.',
      name: 'Test Person', title: 'Test Role',
    };
    for (const [label, route] of Object.entries(routes)) {
      process.stdout.write(`- probe ${label} (${route.provider}:${route.model}): `);
      try {
        const result = await page.evaluate(bareInPage, {
          message: bareUserMessage(probeBrief),
          route: { provider: route.provider, model: route.model },
          decoding: { ...decoding, expectedOutputTokens: 2500 },
        });
        const shape = ['html', 'css', 'js'].every((k) => typeof result.emitted?.[k] === 'string' && result.emitted[k].length > 0);
        // The emit is saved so a surprising probe (0 fields, an empty file) can be READ
        // rather than guessed about - and the probe's few cents are never the only record.
        await saveCode(`probe-${label}`, result);
        const cost = armCost(result, label);
        console.log(`served by "${result.model}" · emit ${shape ? 'complete' : 'INCOMPLETE'}`
          + ` · fields ${result.template.fields.length}`
          + ` · ${result.usage?.inputTokens ?? '?'} in / ${result.usage?.outputTokens ?? '?'} out`
          + ` · $${cost.costUsd.toFixed(4)} (${cost.costSource})`);
      } catch (error) {
        console.log(`FAILED: ${error.message.split('\n')[0]}`);
        process.exitCode = 1;
      }
    }
  } finally {
    await browser.close();
  }
  process.exit();
}

// ── REASONING: one frontier call, no tool - the transcript the decomposition reads ──────

if (REASONING) {
  await checkServer();
  const brief = bank.briefs.find((b) => b.id === (value('reasoning-brief') ?? 'entertainment'));
  const browser = await chromium.launch();
  try {
    const page = await openApp(browser);
    await signIn(page);
    console.log(`Reasoning capture: ${routes.frontier.provider}:${routes.frontier.model} on "${brief.id}".`);
    const result = await page.evaluate(async ({ message, route, decoding }) => {
      const bust = '?t=' + Date.now();
      const { callModelDetailed } = await import('/src/ai/modelGateway.ts' + bust);
      const { RAW_SYSTEM } = await import('/src/ai/claudeProvider.ts' + bust);
      const { outputBudget } = await import('/src/ai/modelTypes.ts' + bust);
      const r = await callModelDetailed({
        system: RAW_SYSTEM,
        messages: [{ role: 'user', content: [{ type: 'text', text: message }] }],
        route,
        surface: 'spike',
        temperature: decoding.temperature,
        seed: decoding.seed,
        maxTokens: outputBudget(decoding.expectedOutputTokens),
      });
      // A plain (tool-less) call's answer IS `output` - the same read brainstorm.ts does.
      return { text: typeof r.output === 'string' ? r.output : JSON.stringify(r.output), model: r.model, usage: r.usage ?? null };
    }, {
      message: `${bareUserMessage(brief.brief)}

## How to answer
FIRST, before writing any code, narrate your complete design process exactly as you make it:
every decision, in the order you actually decide it - what you considered, what you rejected
and why, and what each decision constrains about the ones after it. Number the decisions.
Be concrete (real values: sizes, weights, colours, timings), not generic advice.
THEN write the complete template (index.html, template.css, template.js) that follows from
those decisions. Make the graphic genuinely creative - something a design-led broadcaster
would air, not a safe default.`,
      route: { provider: routes.frontier.provider, model: routes.frontier.model },
      decoding,
    });
    const cost = result.usage?.estimatedCost?.amount ?? 0;
    if (MAX_COST && cost > MAX_COST) console.error(`Reasoning call cost $${cost.toFixed(4)} - above the stated ceiling.`);
    const file = path.join(OUT, `reasoning-${brief.id}.md`);
    await writeFile(file, `# Frontier reasoning transcript - ${brief.id}

Route: ${routes.frontier.provider}:${routes.frontier.model} (served by "${result.model}")
Decoding: temperature ${decoding.temperature}, seed ${decoding.seed}
Usage: ${result.usage?.inputTokens ?? '?'} in / ${result.usage?.outputTokens ?? '?'} out ($${cost.toFixed(4)})

## The prompt (RAW_SYSTEM + this user message)

${bareUserMessage(brief.brief)}

(...plus the "narrate your complete design process" instruction; see scripts/model-vs-harness.mjs)

## The transcript

${result.text}
`, 'utf8');
    console.log(`Transcript: ${file} · $${cost.toFixed(4)}`);
  } finally {
    await browser.close();
  }
  process.exit();
}

// ── DRY: the whole rig, zero tokens ─────────────────────────────────────────────────────

/** A hand-authored RAW-shaped emit: what a bare arm's model returns, written by hand so the
 *  bare grounding + capture path runs before any call pays for the answer. Authoring-shape
 *  GSAP on purpose - the bare arms render exactly this shape. */
const DRY_BARE_EMIT = {
  name: 'Dry bare control',
  type: 'lower-third',
  summary: 'Hand-authored raw-shaped control for the zero-token dry run.',
  html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<script>
window.SPXGCTemplateDefinition = {
  "description": "Dry bare control",
  "playserver": "OVERLAY", "playchannel": "1", "playlayer": "19",
  "webplayout": "19", "out": "manual", "dataformat": "json",
  "DataFields": [
    { "field": "f0", "ftype": "textfield", "title": "Name", "value": "Dry Name" },
    { "field": "f1", "ftype": "textfield", "title": "Role", "value": "Dry Role" }
  ]
};
</scr` + `ipt>
<link rel="stylesheet" href="css/template.css">
<script src="js/gsap.min.js"></scr` + `ipt>
<script src="js/template.js"></scr` + `ipt>
</head>
<body>
<div class="dry-strap">
  <div class="dry-strap-box">
    <div id="f0" class="dry-strap-name">Dry Name</div>
    <div id="f1" class="dry-strap-role">Dry Role</div>
  </div>
</div>
</body>
</html>`,
  css: `.dry-strap { position: absolute; left: 96px; bottom: 96px; opacity: 0; }
.dry-strap-box { background: rgba(10, 16, 24, 0.92); padding: 18px 28px; border-left: 6px solid #ffb000; }
.dry-strap-name { color: #ffffff; font: 700 44px/1.15 Arial, sans-serif; }
.dry-strap-role { color: rgba(255, 255, 255, 0.72); font: 400 24px/1.3 Arial, sans-serif; margin-top: 6px; }`,
  js: `function update(data) {
  var parsed = JSON.parse(data);
  for (var key in parsed) {
    var el = document.getElementById(key);
    if (el) el.textContent = parsed[key];
  }
}
function play() {
  gsap.fromTo('.dry-strap', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
}
function stop() {
  gsap.to('.dry-strap', { opacity: 0, y: 24, duration: 0.4, ease: 'power2.in' });
}
function next() {}`,
};

if (DRY) {
  await checkServer();
  const browser = await chromium.launch();
  const ledger = {
    version: MVH_VERSION, mode: 'dry', capturedAt: new Date().toISOString(), results: [],
  };
  try {
    const page = await openApp(browser);

    // Path 1: the HARNESS grounding - a catalog design re-expressed in the authoring shape
    // (exactly what the coder emits) through convertEmittedRegion. The conversion MUST
    // produce an editable region here, or the harness arms would be measured through a
    // broken converter: a broken harness must stop a run, not score it.
    const dryHarness = await page.evaluate(async () => {
      const bust = '?t=' + Date.now();
      const { variantById } = await import('/src/templates/catalog.ts' + bust);
      const { emitPresetRegion } = await import('/src/blocks/presetRegistry.ts' + bust);
      const { convertEmittedRegion, toTemplate } = await import('/src/ai/claudeProvider.ts' + bust);
      const { parseAnimData } = await import('/src/blocks/animData.ts' + bust);
      const { productionSpxValidator } = await import('/src/ai/lite/pipeline.ts' + bust);
      const variant = variantById('lt01');
      if (!variant) throw new Error('dry: lt01 missing from the catalog');
      const tpl = variant.create();
      const region = emitPresetRegion(tpl, variant.animationPresets[0]);
      if (!region) throw new Error('dry: lt01 preset emitted no authoring region');
      const js = tpl.js.replace(/\/\* == ANIMATION[\s\S]*?== END ANIMATION == \*\//, () => region);
      const emitted = { name: 'Dry harness control', type: 'lower-third', summary: 'dry', html: tpl.html, css: tpl.css, js };
      const template = convertEmittedRegion(toTemplate(emitted));
      if (!parseAnimData(template.js)) throw new Error('dry harness control: conversion produced no editable region');
      const validation = await productionSpxValidator(null, [])(template);
      return {
        emitted,
        template,
        editableTimeline: true,
        validation: {
          ok: validation.ok,
          errors: validation.errors.map((e) => `${e.rule}: ${e.message.slice(0, 200)}`),
          warnings: validation.warnings.map((e) => `${e.rule}: ${e.message.slice(0, 200)}`),
        },
      };
    });

    // Path 2: the BARE grounding - toTemplate on a hand-authored raw emit; the timeline is
    // expected to be UNREADABLE (authoring shape, no markers), and capture must cope.
    const dryBare = await page.evaluate(async (emit) => {
      const bust = '?t=' + Date.now();
      const { toTemplate } = await import('/src/ai/claudeProvider.ts' + bust);
      const { parseAnimData } = await import('/src/blocks/animData.ts' + bust);
      const { productionSpxValidator } = await import('/src/ai/lite/pipeline.ts' + bust);
      const template = toTemplate(emit);
      if (template.fields.length !== 2) throw new Error(`dry bare control: parsed ${template.fields.length} fields, expected 2`);
      if (parseAnimData(template.js)) throw new Error('dry bare control: authoring-shape js unexpectedly parsed as a data region');
      const validation = await productionSpxValidator(null, [])(template);
      return {
        emitted: emit,
        template,
        editableTimeline: false,
        validation: {
          ok: validation.ok,
          errors: validation.errors.map((e) => `${e.rule}: ${e.message.slice(0, 200)}`),
          warnings: validation.warnings.map((e) => `${e.rule}: ${e.message.slice(0, 200)}`),
        },
      };
    }, DRY_BARE_EMIT);

    const dryBriefs = [briefs[0], briefs[1] ?? briefs[0]];
    const plan = [
      { slug: `${dryBriefs[0].id}.dry-harness`, briefId: dryBriefs[0].id, arm: 'dry-harness', item: dryHarness, brief: dryBriefs[0].brief },
      { slug: `${dryBriefs[1].id}.dry-bare`, briefId: dryBriefs[1].id, arm: 'dry-bare', item: dryBare, brief: dryBriefs[1].brief },
    ];
    for (const { slug, briefId, arm, item, brief } of plan) {
      await saveCode(slug, item);
      process.stdout.write(`- ${slug}: `);
      const captured = await captureItem(browser, slug, item.template, brief);
      ledger.results.push({
        kind: 'candidate', slug, briefId, arm, model: 'none (dry)',
        editableTimeline: item.editableTimeline,
        validation: item.validation,
        motionSettled: captured.motionSettled,
        phaseFiles: captured.phaseFiles,
        motionFile: captured.motionFile ?? null,
      });
      await writeLedger(ledger);
      console.log(`captured · validation ${item.validation.ok ? 'ok' : 'NOT ok'} · clip ${captured.motionFile ? 'yes' : 'NO'}`);
    }
    await buildSheet();
    verdictSelfTest();
    console.log('\nDRY RUN PASSED: both grounding paths, capture over the bed, the sheet, the key and the verdict math all ran.');
  } finally {
    await browser.close();
  }
  process.exit();
}

// ── GENERATE: the paid round ────────────────────────────────────────────────────────────

if (GENERATE) {
  await checkServer();
  console.log(`PAID run: open=${routes.open.provider}:${routes.open.model}, frontier=${routes.frontier.provider}:${routes.frontier.model}, `
    + `${briefs.length} briefs x ${ARMS.length} arms, ceiling $${MAX_COST.toFixed(2)}.`);

  const kept = new Map();
  let carried = 0;
  if (RESUME) {
    try {
      const prior = JSON.parse(await readFile(ledgerPath(), 'utf8'));
      for (const row of prior.results ?? []) {
        if (row.kind === 'candidate' && !row.error && !row.skipped) kept.set(row.slug, row);
      }
      carried = prior.spentUsd ?? 0;
      console.log(`Resuming: ${kept.size} candidate(s) kept (~$${carried.toFixed(3)} already spent).`);
    } catch {
      console.log('Nothing to resume from - running the whole plan.');
    }
  }

  const ledger = {
    version: MVH_VERSION,
    mode: 'generate',
    capturedAt: new Date().toISOString(),
    routes: { open: `${routes.open.provider}:${routes.open.model}`, frontier: `${routes.frontier.provider}:${routes.frontier.model}` },
    decoding,
    briefIds: BRIEF_IDS,
    spentUsd: carried,
    results: [],
  };

  const browser = await chromium.launch();
  try {
    const page = await openApp(browser);
    await signIn(page);

    // Cheap arms first: if something is structurally wrong it is found at open-model prices,
    // and the ceiling protects the frontier arms rather than being spent by them.
    for (const arm of ARMS) {
      const route = routes[arm.routeKey];
      for (const entry of briefs) {
        const slug = `${entry.id}.${arm.id}`;
        const prior = kept.get(slug);
        if (prior) {
          ledger.results.push(prior);
          ledger.spentUsd += 0; // already carried
          await writeLedger(ledger);
          console.log(`- ${slug}: kept from the previous run ($${(prior.costUsd ?? 0).toFixed(4)})`);
          continue;
        }
        if (ledger.spentUsd >= MAX_COST) {
          ledger.results.push({ kind: 'candidate', slug, briefId: entry.id, arm: arm.id, skipped: 'cost-ceiling' });
          await writeLedger(ledger);
          console.log(`- ${slug}: SKIPPED (ceiling $${MAX_COST.toFixed(2)} spent: $${ledger.spentUsd.toFixed(3)})`);
          continue;
        }
        const started = Date.now();
        process.stdout.write(`- ${slug}: `);
        let item;
        try {
          item = arm.kind === 'bare'
            ? await page.evaluate(bareInPage, {
                message: bareUserMessage(entry.brief),
                route: { provider: route.provider, model: route.model },
                decoding,
              })
            : await page.evaluate(harnessInPage, {
                brief: entry.brief,
                route: { provider: route.provider, model: route.model },
                decoding,
              });
        } catch (error) {
          console.log(`FAILED: ${error.message.split('\n')[0]}`);
          ledger.results.push({
            kind: 'candidate', slug, briefId: entry.id, arm: arm.id,
            error: error.message.slice(0, 500), costUsd: null, ms: Date.now() - started,
          });
          await writeLedger(ledger);
          continue;
        }
        // THE MODEL'S OUTPUT IS THE IRREPLACEABLE ARTIFACT - on disk before anything else
        // can fail (the 2026-08-12 lesson: 45 paid generations reduced to PNGs).
        await saveCode(slug, item);
        const { costUsd, costSource } = armCost(item, arm.routeKey);
        item.costUsd = costUsd;
        item.costSource = costSource;
        ledger.spentUsd += costUsd;

        let captured = null;
        let captureError = null;
        try {
          captured = await captureItem(browser, slug, item.template, entry.brief);
        } catch (error) {
          captureError = error.message.slice(0, 300);
        }
        ledger.results.push({
          kind: 'candidate', slug, briefId: entry.id, arm: arm.id,
          model: item.model,
          costUsd: item.costUsd ?? 0,
          costSource: item.costSource ?? 'gateway',
          usage: item.usage ?? null,
          repairRounds: item.repairRounds ?? 0,
          exemplarIds: item.exemplarIds ?? [],
          editableTimeline: item.editableTimeline,
          validation: item.validation,
          ...(captureError ? { captureError } : {}),
          ...(captured ? {
            motionSettled: captured.motionSettled,
            phaseFiles: captured.phaseFiles,
            motionFile: captured.motionFile ?? null,
          } : {}),
          ms: Date.now() - started,
        });
        await writeLedger(ledger);
        console.log(`$${(item.costUsd ?? 0).toFixed(4)} · ${item.repairRounds ?? 0} repair(s)`
          + ` · ${captureError ? `capture FAILED (${captureError.split('\n')[0]})` : 'captured'}`
          + ` · total $${ledger.spentUsd.toFixed(3)}`);
      }
    }
  } finally {
    await browser.close();
  }
  await buildSheet();
  console.log(`\nDone. Spent $${JSON.parse(await readFile(ledgerPath(), 'utf8')).spentUsd.toFixed(4)} `
    + `of the $${MAX_COST.toFixed(2)} ceiling. The blind sheet is ${path.join(OUT, 'mvh-review.html')}.`);
  console.log('Hand the sheet to the owner. Say nothing about any item. Do not open mvh-key.json.');
}
