// Bounded NoaCG Lite evaluation runner. This calls the trusted managed endpoint,
// compiles each returned DesignSpec through the real deterministic catalog path, runs the
// static and live benches, and captures native-resolution lifecycle media for blind review.
//
// It never receives or stores a provider key, model id, route, full DesignSpec, template,
// generated code, or provider body. The bearer token must identify a real server-validated
// development/admin user. Configure the candidate route only on the server, restart it,
// then run this script with a neutral label such as candidate-a.
//
//   NOACG_LITE_EVAL_BEARER_TOKEN=... node scripts/ai-lite-eval.mjs \
//     [out-dir] [candidate-label] [count]
//
// SPENDS REAL TOKENS. Hard stops: 40 calls or USD 1.50 of provider-reported cost.

import { chromium } from '@playwright/test';
import {
  mkdir,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { devPort } from './dev-port.mjs';
import { outDir } from './out-dir.mjs';
import { UPDATE_COPY, captureLifecycle } from './ai-lite-capture.mjs';
import {
  LITE_LOWER_THIRD_FIXTURES,
  LITE_LOWER_THIRD_FIXTURE_VERSION,
} from './ai-lite-lower-third-fixtures.mjs';
import {
  LITE_BRAND_FIXTURES,
  LITE_BRAND_FIXTURE_VERSION,
  LITE_BRAND_MARKS_BY_ID,
  LITE_BRAND_PALETTES,
} from './ai-lite-brand-fixtures.mjs';
import {
  LITE_SEMANTIC_FIXTURES,
  LITE_SEMANTIC_FIXTURE_VERSION,
} from './ai-lite-semantic-fixtures.mjs';
import {
  LITE_MATRIX_FIXTURES,
  LITE_MATRIX_FIXTURE_VERSION,
} from './ai-lite-matrix-fixtures.mjs';

const BASE = `http://localhost:${devPort()}`;
const OUT = path.resolve(outDir(process.argv[2], './lite-eval-out', 'Usage: node scripts/ai-lite-eval.mjs [out-dir] [label] [count]'));
const LABEL = String(process.argv[3] || 'candidate').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 40);
const REQUESTED = Math.min(40, Math.max(1, Number(process.argv[4]) || LITE_LOWER_THIRD_FIXTURES.length));
const TOKEN = (process.env.NOACG_LITE_EVAL_BEARER_TOKEN ?? '').trim();
const MAX_PROVIDER_CALLS = Math.min(40, Math.max(1, Number(process.env.NOACG_LITE_EVAL_MAX_CALLS) || 40));
const MAX_COST_USD = Math.min(5, Math.max(0.01, Number(process.env.NOACG_LITE_EVAL_MAX_COST_USD) || 1.5));
const FIXTURE_IDS = new Set(
  (process.env.NOACG_LITE_EVAL_FIXTURES ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);
// WHICH BANK. The default is the text-only lower-third bank every prior round used. `brand`
// selects the BRAND bank (scripts/ai-lite-brand-fixtures.mjs): the same shape of brief, plus a
// real mark and the brand colours it arrives with. `semantic` selects the locked provider-free
// semantic bank, but replaces its authored decisions with real endpoint decisions. Only the
// fixtures differ - the endpoint, ceilings, shared compile, capture and ledger stay identical.
// `matrix` is the brand bank's ingredients CROSSED (scripts/ai-lite-matrix-fixtures.mjs): the
// same marks, the same palettes, colour-neutral jobs, one cell per pairing. It sends exactly the
// brand bank's request shape, so nothing below this line has to know which of the two it is.
const BANK = (process.env.NOACG_LITE_EVAL_BANK ?? 'lower-third').trim();
if (!['lower-third', 'brand', 'semantic', 'matrix'].includes(BANK)) {
  console.error(`Unknown NOACG_LITE_EVAL_BANK "${BANK}". Use lower-third, brand, semantic or matrix.`);
  process.exit(1);
}
const MATRIX = BANK === 'matrix';
const SEMANTIC = BANK === 'semantic';
// Both banks that carry a mark and a palette on the request. Every "does this round send brand
// input" decision below reads this, never the bank name, so adding a third one is one line.
const BRAND = BANK === 'brand' || MATRIX;
// Where in the grid this batch starts. The per-round ceiling is 40 calls and the grid is larger,
// so a matrix round is a SEQUENCE of batches; the offset is what stops batch two re-firing (and
// re-paying for) batch one. Ignored by every other bank.
const MATRIX_OFFSET = Math.max(0, Number(process.env.NOACG_LITE_EVAL_MATRIX_OFFSET) || 0);

/** Which bank's version stamps this round. One function, because the summary and the review
 *  gallery both answer it and a gallery pooling two banks' rounds is what the stamp prevents. */
function bankFixtureVersion() {
  if (MATRIX) return LITE_MATRIX_FIXTURE_VERSION;
  if (BANK === 'brand') return LITE_BRAND_FIXTURE_VERSION;
  if (SEMANTIC) return LITE_SEMANTIC_FIXTURE_VERSION;
  return LITE_LOWER_THIRD_FIXTURE_VERSION;
}
// The brand bank carries three briefs for categories Lite cannot serve yet (§3 of the plan
// widens to them). Sending those would spend money to be told `unsupported`, which is a known
// answer, so the round takes only what is servable and SAYS how many it left out.
const BRAND_SERVABLE = LITE_BRAND_FIXTURES.filter((fixture) => fixture.servable);
const BANK_FIXTURES = MATRIX
  // The grid, from the offset on. Its order already makes any prefix a balanced sample across
  // marks and palettes, so a batch is just a window into it.
  ? LITE_MATRIX_FIXTURES.slice(MATRIX_OFFSET).map((fixture) => [fixture.id, fixture.prompt, fixture])
  : BANK === 'brand'
    ? BRAND_SERVABLE.map((fixture) => [fixture.id, fixture.prompt, fixture])
    : SEMANTIC
      ? LITE_SEMANTIC_FIXTURES.map((fixture) => [fixture.id, fixture.request.prompt, fixture])
      : LITE_LOWER_THIRD_FIXTURES;
const SELECTED_FIXTURES = (FIXTURE_IDS.size
  ? BANK_FIXTURES.filter(([fixtureId]) => FIXTURE_IDS.has(fixtureId))
  : BANK_FIXTURES
).slice(0, REQUESTED);
const RAW_VIDEO_DIR = path.join(OUT, '.raw-video');
const FFMPEG = (process.env.FFMPEG_PATH ?? 'ffmpeg').trim() || 'ffmpeg';

if (!TOKEN) {
  console.error('NOACG_LITE_EVAL_BEARER_TOKEN is required. Aborting before spending anything.');
  process.exit(1);
}
if (SELECTED_FIXTURES.length === 0) {
  console.error('No requested Lite evaluation fixture ids exist. Aborting before spending anything.');
  process.exit(1);
}

const headers = {
  'content-type': 'application/json',
  authorization: `Bearer ${TOKEN}`,
};

async function json(response) {
  const value = await response.json().catch(() => null);
  if (!response.ok) {
    // Carry the MACHINE code, not just the prose. The two failure classes a model
    // comparison must separate - the model exhausting its repair round versus the
    // provider breaking - are indistinguishable once only the message survives, and
    // classifying by matching English sentences would break on the first reword.
    const error = new Error(value?.error?.message ?? `HTTP ${response.status}`);
    error.code = value?.error?.code ?? `http_${response.status}`;
    throw error;
  }
  return value;
}

const status = await json(await fetch(`${BASE}/api/ai/lite/status`, { headers }));
if (!status.available) {
  console.error(`NoaCG Lite is not available for the evaluation identity (${status.reason ?? 'unknown'}).`);
  process.exit(1);
}
// The vision judge is optional: when the server enables it, every SKINNED result's hold
// frame gets one scored judge call and a failed verdict is recorded as the production
// funnel's revert. Its cost counts against this run's ceiling like any other call.
const JUDGE = Boolean(status.skinJudgeEnabled);

await mkdir(OUT, { recursive: true });
await mkdir(RAW_VIDEO_DIR, { recursive: true });
const browser = await chromium.launch();

/**
 * Measure each brand mark through the REAL browser probe the product uses, rather than reading
 * the descriptor off the fixture record.
 *
 * The fixture knows its own shape and ink because the SVG is authored beside it, so a descriptor
 * could be assembled here for free - and it would be a second implementation of the one thing
 * this round exists to exercise. `probeMark` + `markShapeFromAspect` are what a real upload goes
 * through (src/ai/lite/client.ts `describeMark`), so a bug in either has to show up as a wrong
 * request, not be quietly routed around by the runner.
 */
async function probeBrandMarks() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
    return await page.evaluate(async (marks) => {
      const { probeMark } = await import('/src/assets/assetInfo.ts');
      const { markShapeFromAspect } = await import('/src/ai/lite/types.ts');
      const out = {};
      for (const mark of marks) {
        const probe = await probeMark({ path: mark.path, data: mark.data });
        if (!probe) { out[mark.id] = null; continue; }
        const ink = probe.inkLuminance >= 0.65 ? 'light' : probe.inkLuminance <= 0.35 ? 'dark' : undefined;
        out[mark.id] = {
          descriptor: {
            shape: markShapeFromAspect(probe.aspect),
            backing: probe.backing,
            ...(probe.backing === 'transparent' && ink ? { ink } : {}),
          },
          measured: { aspect: Math.round(probe.aspect * 1000) / 1000, inkLuminance: Math.round(probe.inkLuminance * 1000) / 1000 },
        };
      }
      return out;
    }, [...LITE_BRAND_MARKS_BY_ID.values()].map(({ id, path: assetPath, data }) => ({ id, path: assetPath, data })));
  } finally {
    await context.close().catch(() => {});
  }
}

async function measureAndCapture(spec, fixtureId, skin = null, brandContext = null) {
  // The lifecycle rig is shared (scripts/ai-lite-capture.mjs) so that a Lite result and the
  // plain wizard assemblies the value gate compares it against are filmed identically. Only
  // the in-page BUILD below is this runner's own.
  return captureLifecycle({
    browser,
    base: BASE,
    out: OUT,
    rawVideoDir: RAW_VIDEO_DIR,
    label: LABEL,
    itemId: fixtureId,
    ffmpeg: FFMPEG,
    buildArg: { spec, skin, brand: brandContext, updateCopy: UPDATE_COPY },
    buildFn: async ({ spec: designSpec, skin: skinPatch, brand, updateCopy }) => {
      // The ONE shared compile pipeline (src/ai/lite/pipeline.ts) - identical to what
      // production runs after the same server decision. Never re-inline the steps here:
      // a benchmark-only compile path is exactly the drift the module exists to prevent.
      const { compileLiteDecision } = await import('/src/ai/lite/pipeline.ts');
      const { parseAnimData } = await import('/src/blocks/animData.ts');
      const { variantById } = await import('/src/templates/catalog.ts');
      // The brand bank supplies what a real user brings: the mark as a project asset (so the
      // slot fills with a real file rather than staying empty) and the brand palette (so "the
      // accent came from the brand" is visible in the frame). The lower-third bank passes
      // neither, which is byte-identical to every round before this one.
      const context = {
        images: brand?.images ?? [],
        palette: brand?.palette ?? null,
        resolution: { width: 1920, height: 1080, label: '1080p' },
        fps: 50,
      };
      const { template, validation, spec, skinApplied, skinOutcome, skinRejectionRules } = await compileLiteDecision(
        designSpec,
        context,
        skinPatch ?? undefined,
      );
      // The canonical animation durations drive the capture waits below - never a fixed
      // sleep: the entrance/hold/exit stills must land on the phase they claim to show.
      const animData = parseAnimData(template.js);
      const entranceDurationMs = animData
        ? (animData.steps[0].duration / animData.speed) * 1000
        : 3000;
      const exitDurationMs = animData
        ? (animData.steps.at(-1).duration / animData.speed) * 1000
        : 1500;
      const { composeDocument } = await import('/src/preview/composeDocument.ts');
      document.body.innerHTML = '';
      document.body.style.cssText = 'margin:0;width:1920px;height:1080px;overflow:hidden;background:radial-gradient(circle at 35% 20%,#334155,#111827 58%,#05070a)';
      const frame = document.createElement('iframe');
      frame.id = 'lite-eval-frame';
      frame.style.cssText = 'position:absolute;inset:0;width:1920px;height:1080px;border:0;background:transparent';
      await new Promise((resolve) => {
        frame.onload = resolve;
        frame.srcdoc = composeDocument(template);
        document.body.appendChild(frame);
      });
      return {
        ok: validation.ok,
        ruleCodes: validation.errors.map((error) => error.rule),
        // Warnings are recorded SEPARATELY and were not recorded at all until 2026-08-07.
        // That gap turned a severity change into a fake improvement: `bench-line-wrap` moved
        // from error to warning between two rounds, the wrap count read 11 then 0, and nothing
        // in the artifacts said the second round had simply stopped counting. A finding that
        // exists but is not written down is indistinguishable from a finding that went away.
        warningCodes: validation.warnings.map((warning) => warning.rule),
        category: spec.category,
        variantId: spec.variantId,
        skinApplied,
        skinOutcome,
        skinRejectionRules: skinRejectionRules ?? null,
        fieldCount: template.fields.length,
        // The zone the graphic actually SITS at. It used to read `designSpec.zone`, which the
        // v9 schema no longer carries: placement folded onto the design's own `defaultZone`
        // after two rounds measured the model answering `bottom-left` 47 times out of 47.
        // Reading the retired field would have quietly turned this column into `null` on every
        // row - the `warningCodes` failure again, a measurement that stops measuring and looks
        // like a change.
        zone: variantById(spec.variantId)?.defaultZone ?? null,
        // Retired alongside `zone` in v9 and kept as an EXPLICIT null rather than deleted: a
        // round comparing against v7 or v8 has to be able to tell "the model chose no preset"
        // from "this runner stopped asking". `presetId` is no longer in the schema at all.
        animationPreset: null,
        // The COLOUR and PROPORTION decisions, recorded for the same reason warningCodes is:
        // a round that cannot say what a frame was built from cannot diagnose the frame. The
        // 2026-08-08 quality round produced one lt11 result whose second field painted no
        // pixels at all - visible in the hold frame, invisible to every rule code - and the
        // artifacts could not say whether a bespoke palette caused it, because none of this
        // was written down. These are DESIGN parameters, not user content: the same class as
        // variantId and zone, and nothing here carries a brief, a template, or a person's copy.
        paletteId: designSpec.paletteId ?? null,
        palette: designSpec.palette ?? null,
        density: designSpec.density ?? null,
        alignment: designSpec.alignment ?? null,
        sizeScale: designSpec.sizeScale ?? null,
        typography: designSpec.typography ?? null,
        shape: designSpec.shape ?? null,
        entranceDurationMs,
        exitDurationMs,
        initialData: Object.fromEntries(designSpec.lines.map((line, index) => [`f${index}`, line.sample])),
        updateData: Object.fromEntries(designSpec.lines.map((line, index) => (
          [`f${index}`, updateCopy[line.role] ?? line.sample]
        ))),
      };
    },
  });
}

/** Downscale the hold frame in-browser (no native image dependency) - vision tokens are
 *  tile-priced, and 960x540 is plenty for judging gross legibility and shape failures. */
async function judgeImageBase64(holdPath) {
  const buffer = await readFile(holdPath);
  const page = await browser.newPage();
  try {
    return await page.evaluate(async (dataUrl) => {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('hold frame failed to decode'));
        image.src = dataUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = 960;
      canvas.height = 540;
      canvas.getContext('2d').drawImage(image, 0, 0, 960, 540);
      return canvas.toDataURL('image/png').split(',')[1];
    }, `data:image/png;base64,${buffer.toString('base64')}`);
  } finally {
    await page.close();
  }
}

async function judgeSkin(generated, prompt, holdPath) {
  return json(await fetch(`${BASE}/api/ai/lite/judge`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      generationId: generated.generationId,
      brief: prompt,
      skinSummary: generated.decision.skin.summary,
      imageBase64: await judgeImageBase64(holdPath),
    }),
  }));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function writeReviewPage() {
  const files = (await readdir(OUT)).filter((file) => file.endsWith('-metrics.json')).sort();
  const summaries = [];
  for (const file of files) {
    const parsed = JSON.parse(await readFile(path.join(OUT, file), 'utf8'));
    // Same BANK and same version, both. The version alone stopped being enough the moment a
    // second bank existed: brand v1 and lower-third v1 would otherwise pool into one gallery
    // and read as candidates for the same brief.
    const sameBank = (parsed.bank ?? 'lower-third') === BANK;
    const version = bankFixtureVersion();
    if (sameBank && parsed.fixtureVersion === version) summaries.push(parsed);
  }
  const cards = SELECTED_FIXTURES.map(([fixtureId, prompt]) => {
    const candidates = summaries
      .map((summary) => summary.rows.find((row) => row.fixtureId === fixtureId))
      .filter((row) => row?.status === 'machine-usable')
      .map((row) => `
        <article>
          <h3>${escapeHtml(row.candidate)}</h3>
          ${row.motionFile ? `<video controls muted loop preload="metadata" src="${escapeHtml(row.motionFile)}"></video>
          <p class="clip-note">The copy changes once mid-clip: the runner sends a second <code>update()</code> during the hold. Not a template defect - judge the swap for FIT, not for firing.</p>` : ''}
          <div class="phases">
            ${Object.entries(row.phaseFiles ?? {}).map(([phase, file]) => `
              <figure>
                <a href="${escapeHtml(file)}"><img loading="lazy" src="${escapeHtml(file)}" alt="${escapeHtml(`${row.candidate} ${fixtureId} ${phase}`)}"></a>
                <figcaption>${escapeHtml(phase)}</figcaption>
              </figure>
            `).join('')}
          </div>
        </article>
      `).join('');
    return `
      <section>
        <h2>${escapeHtml(fixtureId)}</h2>
        <p>${escapeHtml(prompt)}</p>
        <div class="grid">${candidates || '<p>No machine-usable results yet.</p>'}</div>
      </section>
    `;
  }).join('');
  await writeFile(path.join(OUT, 'review.html'), `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NoaCG Lite blind lower-third review</title>
<style>
  :root{color-scheme:dark;font-family:system-ui,sans-serif;background:#090b0f;color:#e8edf2}
  body{margin:0 auto;max-width:1800px;padding:32px}
  header,section{margin:0 0 48px}
  h1,h2,h3{margin:0 0 10px} p{max-width:960px;color:#aeb7c3;line-height:1.5}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(440px,1fr));gap:24px}
  article{padding:16px;background:#12161d;border:1px solid #29313d;border-radius:10px}
  img,video{display:block;width:100%;height:auto;background:#05070a;border-radius:6px}
  video{margin-bottom:12px}
  .clip-note{max-width:none;margin:0 0 12px;font-size:12px;line-height:1.45;color:#8d97a5}
  .clip-note code{font-family:ui-monospace,monospace;color:#c6cfda}
  .phases{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  figure{margin:0} figcaption{padding-top:5px;color:#aeb7c3;font-size:12px;text-transform:uppercase;letter-spacing:.08em}
</style>
<body>
  <header>
    <h1>NoaCG Lite blind lower-third review</h1>
    <p>Candidate labels are intentionally neutral. Every still is captured at 1920x1080 for entrance, hold, update, and exit. Review at 100% for typography, spacing, hierarchy, fit, and sharpness. Use the clips to judge the full lifecycle choreography and settling. <strong>Each clip runs entrance &rarr; hold &rarr; update &rarr; exit, so its text changes once mid-clip on purpose</strong> - the runner sends a second <code>update()</code> with longer copy during the hold, 600&thinsp;ms before <code>stop()</code>. No shipped template re-fires that itself, so read the swap as a legibility test (does the longer copy still fit and sit right?), never as a fault. The clips are review proxies; runtime validation still uses the live browser graphic.</p>
  </header>
  ${cards}
</body>
</html>`, 'utf8');
}

const rows = [];
let totalCostUsd = 0;
let providerCalls = 0;
let sessions = 0;
// Measure every brand mark ONCE, before the loop and before anything is spent: a probe that
// failed is a configuration fault, and finding that out after four paid generations is finding
// it too late. Empty on the lower-third bank, which sends no marks.
const MARK_PROBES = BRAND ? await probeBrandMarks() : {};
if (BRAND) {
  const unreadable = Object.entries(MARK_PROBES).filter(([, value]) => !value).map(([id]) => id);
  if (unreadable.length) {
    console.error(`Could not probe brand mark(s): ${unreadable.join(', ')}. Aborting before spending anything.`);
    await browser.close();
    process.exit(1);
  }
  if (MATRIX) {
    const last = MATRIX_OFFSET + SELECTED_FIXTURES.length;
    console.log(`Matrix bank v${LITE_MATRIX_FIXTURE_VERSION}: cells ${MATRIX_OFFSET}-${last - 1} `
      + `of ${LITE_MATRIX_FIXTURES.length} (${SELECTED_FIXTURES.length} this batch). `
      + `Next batch: NOACG_LITE_EVAL_MATRIX_OFFSET=${last}.`);
  } else {
    console.log(`Brand bank: ${SELECTED_FIXTURES.length} servable brief(s); `
      + `${LITE_BRAND_FIXTURES.length - BRAND_SERVABLE.length} left out as not-yet-servable categories.`);
  }
  for (const [id, value] of Object.entries(MARK_PROBES)) {
    console.log(`  ${id}: ${JSON.stringify(value.descriptor)} `
      + `(aspect ${value.measured.aspect}, ink ${value.measured.inkLuminance})`);
  }
}

for (const [fixtureId, prompt, fixture] of SELECTED_FIXTURES) {
  // What a real user's request carries, assembled from the fixture record.
  const brandPalette = fixture ? LITE_BRAND_PALETTES[fixture.palette] : null;
  const brandMark = fixture ? LITE_BRAND_MARKS_BY_ID.get(fixture.markId) : null;
  const brandContext = brandMark
    ? {
        palette: { id: 'brand', name: 'Brand', ...brandPalette },
        images: [{ path: brandMark.path, data: brandMark.data }],
      }
    : null;
  // The cell's own coordinates, carried onto EVERY row including the failures. The matrix
  // exists to produce a failure rate per mark x palette family, and a failure row that records
  // only its fixture id makes that table un-derivable from the artifacts - the id would have to
  // be parsed back into its parts, which is a naming convention pretending to be data.
  const cell = brandMark
    ? { job: fixture.job ?? null, markId: fixture.markId, palette: fixture.palette }
    : null;
  if (providerCalls >= MAX_PROVIDER_CALLS || totalCostUsd >= MAX_COST_USD) break;
  const started = Date.now();
  process.stdout.write(`- ${fixtureId}: `);
  let sent = false;
  let attemptAccounted = false;
  let generated = null;
  try {
    sessions += 1;
    sent = true;
    generated = await json(await fetch(`${BASE}/api/ai/lite/generations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        idempotencyKey: `eval-${LABEL}-${fixtureId}-${crypto.randomUUID()}`,
        prompt,
        // The brand bank only: the user's colours, that there IS a mark, and what the browser
        // measured that mark to be. Absent on the lower-third bank, so its request body is
        // byte-identical to every round before this one.
        ...(brandPalette ? { palette: brandPalette } : {}),
        ...(brandMark ? { hasLogo: true, mark: MARK_PROBES[brandMark.id].descriptor } : {}),
        ...(SEMANTIC ? { generationSpec: fixture.request.generationSpec } : {}),
        resolution: { width: 1920, height: 1080 },
        fps: 50,
      }),
    }));
    providerCalls += Math.max(1, Number(generated.attemptCount) || 0);
    attemptAccounted = true;
    const costUsd = Number(generated.usage?.estimatedCost?.amount ?? 0);
    totalCostUsd += costUsd;
    if (totalCostUsd > MAX_COST_USD) throw new Error('Evaluation cost ceiling reached.');
    if (generated.decision.status !== 'ready') {
      rows.push({
        fixtureId,
        candidate: LABEL,
        ...(cell ? { cell } : {}),
        status: 'unsupported',
        latencyMs: Date.now() - started,
        costUsd,
        inputTokens: generated.usage?.inputTokens ?? 0,
        outputTokens: generated.usage?.outputTokens ?? 0,
        attempts: generated.attemptCount ?? 0,
        repairs: generated.repairCount ?? 0,
      });
      console.log('unsupported');
      continue;
    }

    const measured = await measureAndCapture(generated.decision.spec, fixtureId, generated.decision.skin ?? null, brandContext);

    // The vision judge - the production-shaped tail of the skin funnel: a skin that
    // compiled and benched clean still reverts to the house chassis on a failed verdict.
    // A judge TRANSPORT failure fails open (the deterministic gates already passed);
    // it is recorded, never hidden.
    let judge = null;
    if (JUDGE && measured.ok && measured.skinApplied && generated.decision.skin) {
      try {
        judge = await judgeSkin(generated, prompt, path.join(OUT, measured.phaseFiles.hold));
        totalCostUsd += Number(judge.usage?.estimatedCost?.amount ?? 0);
      } catch (error) {
        judge = { verdict: 'error', error: error instanceof Error ? error.message.slice(0, 120) : 'unknown' };
      }
    }

    await fetch(`${BASE}/api/ai/lite/outcome`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        generationId: generated.generationId,
        action: measured.ok ? 'usable' : 'validation-failed',
        resolvedCategory: measured.category,
        validationRuleCodes: judge?.verdict === 'fail'
          ? [...measured.ruleCodes, 'skin-judge-fail']
          : measured.ruleCodes,
        runtimeMs: Date.now() - started,
      }),
    });
    rows.push({
      fixtureId,
      candidate: LABEL,
      ...(cell ? { cell } : {}),
      status: measured.ok ? 'machine-usable' : 'invalid',
      category: measured.category,
      variantId: measured.variantId,
      skinApplied: measured.skinApplied ?? false,
      motionSettled: measured.motionSettled ?? true,
      // The funnel's FINAL state for a skinned result: 'skinned' survived the judge (or
      // ran unjudged / judge-errored open); 'judge-reverted' means production would show
      // the house chassis. The skinned stills stay on disk so the verdict is reviewable.
      ...(measured.skinApplied
        ? { skinFinal: judge?.verdict === 'fail' ? 'judge-reverted' : 'skinned' }
        : {}),
      ...(judge
        ? {
            judgeVerdict: judge.verdict,
            ...(judge.scores
              ? { judgeScores: judge.scores, judgeReason: judge.reason, judgeThreshold: judge.threshold }
              : {}),
            ...(judge.error ? { judgeError: judge.error } : {}),
            judgeCostUsd: Number(judge.usage?.estimatedCost?.amount ?? 0),
          }
        : {}),
      intentKind: generated.decision.spec.intent?.kind,
      fieldCount: measured.fieldCount,
      zone: measured.zone,
      animationPreset: measured.animationPreset,
      paletteId: measured.paletteId,
      palette: measured.palette,
      density: measured.density,
      alignment: measured.alignment,
      sizeScale: measured.sizeScale,
      typography: measured.typography,
      shape: measured.shape,
      entranceDurationMs: measured.entranceDurationMs,
      exitDurationMs: measured.exitDurationMs,
      ruleCodes: measured.ruleCodes,
      warningCodes: measured.warningCodes ?? [],
      latencyMs: Date.now() - started,
      costUsd,
      inputTokens: generated.usage?.inputTokens ?? 0,
      outputTokens: generated.usage?.outputTokens ?? 0,
      cachedInputTokens: generated.usage?.cachedInputTokens ?? 0,
      reasoningTokens: generated.usage?.reasoningTokens ?? 0,
      attempts: generated.attemptCount ?? 0,
      repairs: generated.repairCount ?? 0,
      phaseFiles: measured.phaseFiles,
      motionFile: measured.motionFile,
    });
    console.log(
      `${measured.ok ? 'machine-usable' : `invalid (${measured.ruleCodes.join(', ')})`}`
      + (measured.motionSettled === false ? ' [motion: never settled - idle loop?]' : '')
      + ` [skin: ${measured.skinOutcome}${measured.skinRejectionRules?.length ? ` ${measured.skinRejectionRules.join('|')}` : ''}]`
      + (judge
        ? judge.scores
          ? ` [judge: ${judge.verdict} L${judge.scores.legibility}/H${judge.scores.hierarchy}/B${judge.scores.briefFit}/S${judge.scores.strapShape}]`
          : ` [judge: ${judge.verdict}]`
        : ''),
    );
  } catch (error) {
    if (sent && !attemptAccounted) providerCalls += 1;
    // A rig failure after a READY decision leaves the generation ACTIVE on the ledger
    // ('spec_ready' holds a concurrency slot for 15 minutes) - measured 2026-07-28: two
    // stranded actives hit the eval user's concurrency cap and refused the entire rest
    // of a spike. Close the record so the slot frees; best-effort, the row is failed
    // either way.
    if (generated?.decision?.status === 'ready') {
      await fetch(`${BASE}/api/ai/lite/outcome`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          generationId: generated.generationId,
          action: 'validation-failed',
          validationRuleCodes: ['rig-error'],
          runtimeMs: Date.now() - started,
        }),
      }).catch(() => {});
    }
    rows.push({
      fixtureId,
      candidate: LABEL,
      ...(cell ? { cell } : {}),
      status: 'failed',
      latencyMs: Date.now() - started,
      errorCode: error?.code ?? 'unknown',
      errorMessage: error instanceof Error ? error.message.slice(0, 120) : 'unknown',
    });
    console.log('failed');
  }
}
await browser.close();

const summary = {
  version: 1,
  // Which BANK and which version of it - two rounds from different banks are not comparable,
  // and a summary that records only a version number leaves that ambiguous the moment a
  // second bank exists.
  bank: BANK,
  fixtureVersion: bankFixtureVersion(),
  candidate: LABEL,
  calls: providerCalls,
  sessions,
  totalCostUsd,
  maxCalls: MAX_PROVIDER_CALLS,
  maxCostUsd: MAX_COST_USD,
  machineUsable: rows.filter((row) => row.status === 'machine-usable').length,
  // How many results landed as the SKINNED canvas (vs reverting to a house chassis) -
  // the skin spike's primary count; always 0 on a skin-disabled route.
  skinApplied: rows.filter((row) => row.skinApplied).length,
  // The vision-judge funnel over the skinned results (all 0 when the judge is off).
  judgeCalls: rows.filter((row) => row.judgeVerdict).length,
  judgePassed: rows.filter((row) => row.judgeVerdict === 'pass').length,
  judgeReverted: rows.filter((row) => row.skinFinal === 'judge-reverted').length,
  judgeErrors: rows.filter((row) => row.judgeVerdict === 'error').length,
  judgeCostUsd: rows.reduce((sum, row) => sum + (row.judgeCostUsd ?? 0), 0),
  rows,
};
await writeFile(path.join(OUT, `${LABEL}-metrics.json`), JSON.stringify(summary, null, 2), 'utf8');
await writeReviewPage();
console.log(`Wrote ${rows.length} synthetic-fixture results. Cost reported: $${totalCostUsd.toFixed(4)}.`);
