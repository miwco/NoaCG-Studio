#!/usr/bin/env node
// THE ITERATE-ARM RUNNER - render, measure, feed back, repeat (src/ai/spike/iterate.ts,
// docs/NOACG_PRO_PLAN.md §20.1's custom-lane experiment).
//
//   node scripts/pro-iterate-spike.mjs --control                 # FREE. Run FIRST - proves the
//                                                                # loop's findings collection on
//                                                                # a known-good and a known-bad
//                                                                # template, no model call.
//   node scripts/pro-iterate-spike.mjs --generate --route=vercel:<model> --max-cost=2 \
//       --out=pro-iterate-out-<model> [--max-iterations=4] [--no-vision] [--resume] [briefs]
//
// WHAT THE LOOP IS. First emit = byte-identical protocol to the one-shot `none` arm (same
// prompt, tool, decoding, grounding), so round 0 is comparable with the four-checkpoint round.
// Then, up to --max-iterations times: mount the REAL rendered hold, run every instrument the
// paid rounds are scored by, and hand the model the findings plus (unless --no-vision) a
// downscaled screenshot of its own frame. Stop when the frame measures CLEAN - or stop dirty
// and say so: `deliverable: false` is a first-class result, because the owner's rule is that
// an unfinished graphic never ships as a success.
//
// A SEPARATE RUNNER ON PURPOSE: pro-spike.mjs is the one-shot protocol and another live
// session is editing it; this file duplicates the small capture core rather than entangling
// the two. No motion strips here - the iteration signal is the settled frame, and the round's
// blind page is stills (stated on it, not hidden).
//
// Records land results.json-compatible with the spike ledger (hold/stressHold/usage/costUsd/
// contract/instrument reports), so pro-freeform-compare-gallery.mjs and
// pro-freeform-columns.mjs read an iterate round unchanged.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { devPort } from './dev-port.mjs';
import { readEnvFile } from './ai-bench-server.mjs';
import { requireAllowedRoute } from './harness-route-policy.mjs';

const BASE = `http://localhost:${devPort()}`;

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const only = args.find((a) => !a.startsWith('--'))?.split(',').filter(Boolean) ?? null;

// The TYPE SWEEP (docs/NOACG_PRO_PLAN.md §21.2 follow-on) runs the same loop over the custom
// bank: `--bank=benchmarks/pro/v1/custom/briefs.json --brands=benchmarks/pro/v1/custom/brands.json`.
const BANK = path.resolve(value('bank') ?? 'benchmarks/pro/v1/briefs.json');
const DECODING = path.resolve('benchmarks/pro/v1/spike/decoding.json');
const BRANDS = path.resolve(value('brands') ?? 'benchmarks/pro/v1/spike/brands.json');

const control = flag('control');
const anchors = flag('anchors');
const paid = flag('generate');
const resume = flag('resume');
const vision = !flag('no-vision');
const MAX_ITERATIONS = Number(value('max-iterations') ?? 4);
const OUT = path.resolve(value('out') ?? 'pro-iterate-out');
/** 'feed' = readability findings drive the loop; 'report' = ledger-only. The control mode's
 *  catalog calibration is what decides which is honest (an instrument whose false positives
 *  are good designs gets ignored - the mark-gap lesson). */
const READABILITY_MODE = value('readability') ?? 'feed';
/** The canonical rules' knobs (src/model/designRules.ts), pinned standard/tv for the R3
 *  round - the wizard UI for both is R4. Safe mode is exercised by controls + math tests. */
const LEGIBILITY_MODE = value('legibility') ?? 'standard';
const VIEWING_PROFILE = value('profile') ?? 'tv';

// ── The sweep's type table ─────────────────────────────────────────────────────────────
// Instrument thresholds exist calibrated for exactly two of the seven types: the lower third
// (the calibration baseline) and the countdown (PRO_GRAPHICS.countdown, measured on the
// shipped timers). Every OTHER type runs spacing/proportion with the lower-third defaults and
// its findings are fed as ADVISORY - shown to the model with a judgement note, never counted
// against deliverability, because an uncalibrated threshold must not bully a scoreboard.
const CALIBRATED_PRO_TYPE = { 'lower-third': 'lower-third', countdown: 'countdown' };
const sweepType = (entry) => entry.type ?? 'lower-third';
const proInstrumentType = (entry) => CALIBRATED_PRO_TYPE[sweepType(entry)] ?? null;
const instrumentsAdvisory = (entry) => !CALIBRATED_PRO_TYPE[sweepType(entry)];
const declaredSteps = (entry) => Math.min(entry.brief.steps?.length ?? 0, 6);
/** fieldPaints composes into the loop's VALIDATOR (the Lite pattern) only where its one-state
 *  read is the whole answer: no declared steps, and every field expected to paint verbatim.
 *  Steppers and transform fields (a countdown's seconds, a quiz's answer index) get the
 *  runner's own sentinel step-walk instead - a sentinel that legitimately reaches no pixels
 *  must not read as a defect. */
const validatorFieldPaints = (entry) => {
  if (!entry.brief.fields) return true;
  return declaredSteps(entry) === 0 && entry.brief.fields.every((f) => f.paintExpected !== false);
};

if (!control && !paid && !anchors) {
  console.error('Pick a mode: --control (free, run this first), --anchors (free, per-type catalog baselines) or --generate (PAID).');
  process.exit(1);
}

const route = value('route');
const maxCost = Number(value('max-cost') ?? 0);
let frontierReason = null;
if (paid) {
  if (!route) {
    console.error('PAID mode needs --route=<provider>:<model>.');
    process.exit(1);
  }
  const checked = requireAllowedRoute(route, { flag: 'route', reason: value('frontier-reason') });
  frontierReason = checked.frontierReason;
  if (!Number.isFinite(maxCost) || maxCost <= 0) {
    console.error('--max-cost must be a positive number of dollars. This run spends real money.');
    process.exit(1);
  }
  console.log(`PAID iterate run: ${route}, max ${MAX_ITERATIONS} iteration(s), vision ${vision ? 'on' : 'off'},`
    + ` ceiling $${maxCost.toFixed(2)}. This spends real tokens.`);
}

const decoding = JSON.parse(await readFile(DECODING, 'utf8'));
const bank = JSON.parse(await readFile(BANK, 'utf8'));
const briefs = bank.briefs.filter((entry) => !only || only.includes(entry.id));
const brandsFixture = JSON.parse(await readFile(BRANDS, 'utf8'));

const rawBrands = [];
for (const brand of brandsFixture.brands) {
  const file = path.resolve(path.dirname(BRANDS), brand.mark);
  const bytes = await readFile(file);
  const ext = path.extname(file).toLowerCase();
  const mime = ext === '.svg' ? 'image/svg+xml' : ext === '.png' ? 'image/png' : 'image/jpeg';
  rawBrands.push({
    ...brand,
    markFileName: path.basename(file),
    markDataUrl: `data:${mime};base64,${bytes.toString('base64')}`,
  });
}

try {
  await fetch(`${BASE}/app`, { signal: AbortSignal.timeout(4000) });
} catch {
  console.error(`Dev server not reachable at ${BASE} - start it first.`);
  process.exit(1);
}

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (error) => console.log('  pageerror:', error.message));
await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
await page.locator('.topbar').waitFor();
await page.locator('.wz-modal').waitFor({ state: 'visible', timeout: 20_000 }).catch(() => undefined);
await page.keyboard.press('Escape');
await page.locator('.wz-modal').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);

// Probe the marks in the page (measured, never hand-written - pro-spike.mjs says why).
const brands = [];
{
  const probes = await page.evaluate(async (input) => {
    const bust = '?t=' + Date.now();
    const { probeMark } = await import('/src/assets/assetInfo.ts' + bust);
    const out = {};
    for (const brand of input) {
      out[brand.id] = await probeMark({ path: `images/${brand.markFileName}`, data: brand.markDataUrl });
    }
    return out;
  }, rawBrands.map((b) => ({ id: b.id, markFileName: b.markFileName, markDataUrl: b.markDataUrl })));
  for (const raw of rawBrands) {
    if (!probes[raw.id]) {
      console.error(`Brand "${raw.id}": probeMark could not read ${raw.markFileName}.`);
      process.exit(1);
    }
    brands.push({
      id: raw.id,
      name: raw.name,
      world: raw.world,
      typeface: raw.typeface,
      palette: raw.palette,
      mark: { path: `images/${raw.markFileName}`, dataUrl: raw.markDataUrl, probe: probes[raw.id] },
    });
  }
}
const brandById = new Map(brands.map((b) => [b.id, b]));

if (paid) {
  const fileEnv = await readEnvFile();
  const email = (process.env.E2E_EMAIL ?? fileEnv.E2E_EMAIL ?? '').trim();
  const password = (process.env.E2E_PASSWORD ?? fileEnv.E2E_PASSWORD ?? '').trim();
  if (email && password) {
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
}

/** The full instrument pass over whatever the iterate frame currently shows - shared by the
 *  hold, the stress frames and EVERY step frame (§22.1 escape 4: X-25's growing, misaligned,
 *  background-overflowing steps passed a paint-only step walk). */
async function measureCurrentFrame(opts = {}) {
  return page.evaluate(async ({ markFieldId, markProbe, proType, ticker, legibility, profile }) => {
    const bust = '?t=' + Date.now();
    const { measureRenderedMark } = await import('/src/ai/spike/brand.ts' + bust);
    const { measureAxes } = await import('/src/ai/spike/axisCheck.ts' + bust);
    const { measureSpacing } = await import('/src/ai/spike/spacingCheck.ts' + bust);
    const { measureProportion } = await import('/src/ai/spike/proportionCheck.ts' + bust);
    const { measureDevice } = await import('/src/ai/spike/deviceCheck.ts' + bust);
    const { measureReadability } = await import('/src/validation/readabilityCheck.ts' + bust);
    const { measureTickerMargins } = await import('/src/validation/tickerCheck.ts' + bust);
    const doc = document.getElementById('iterate-hold-frame')?.contentDocument;
    if (!doc) return null;
    // The per-type thresholds are PRO_GRAPHICS' own (measured, docs/NOACG_PRO_PLAN.md §21.2
    // pre-flight d) - imported rather than copied, so they cannot drift from the product's.
    let spacingOpts = {};
    let proportionOpts = {};
    if (proType) {
      const { PRO_GRAPHICS } = await import('/src/ai/pro/language/graphics.ts' + bust);
      const inst = PRO_GRAPHICS[proType]?.instruments ?? {};
      spacingOpts = { ...(inst.spacing ?? {}) };
      proportionOpts = { ...(inst.proportion ?? {}) };
    }
    const base = { markFieldId: markFieldId ?? null };
    return {
      axis: measureAxes(doc),
      spacing: measureSpacing(doc, { ...spacingOpts, ...base }),
      proportion: measureProportion(doc, { ...proportionOpts, ...base }),
      device: measureDevice(doc),
      mark: markFieldId && markProbe ? measureRenderedMark(doc, markFieldId, markProbe) : null,
      // The floors come from the canonical rules module (roles x mode x profile), never a
      // local constant - src/model/designRules.ts is the one source (§22.1 escape 3).
      readability: measureReadability(doc, {
        mode: legibility,
        target: { profile },
        markFieldId: markFieldId ?? null,
      }),
      ticker: ticker ? measureTickerMargins(doc) : null,
    };
  }, {
    markFieldId: opts.markFieldId ?? null,
    markProbe: opts.markProbe ?? null,
    proType: opts.proType ?? null,
    ticker: Boolean(opts.ticker),
    legibility: LEGIBILITY_MODE,
    profile: VIEWING_PROFILE,
  });
}

/** Mount the settled hold, measure every instrument, screenshot it. The same compose path,
 *  wait and instrument set as the spike runner's hold capture. `opts.proType` selects a
 *  calibrated per-type instrument override (PRO_GRAPHICS); `opts.steps` > 0 additionally
 *  drives next() through the declared steps, shoots each settled step frame under
 *  `opts.stepPrefix` and runs the FULL instrument pass on it. */
async function captureAndMeasure(template, data, markFieldId, markProbe, file, opts = {}) {
  const steps = opts.steps ?? 0;
  const playError = await page.evaluate(async ({ template, data }) => {
    const bust = '?t=' + Date.now();
    const { composeDocument } = await import('/src/preview/composeDocument.ts' + bust);
    document.getElementById('iterate-hold-frame')?.remove();
    const frame = document.createElement('iframe');
    frame.id = 'iterate-hold-frame';
    frame.style.cssText = 'position:fixed;left:0;top:0;width:1920px;height:1080px;border:0;'
      + 'z-index:99999;background:#333;color-scheme:dark;';
    document.body.appendChild(frame);
    frame.srcdoc = composeDocument(template);
    await new Promise((resolve) => { frame.onload = resolve; });
    await new Promise((resolve) => setTimeout(resolve, 300));
    const win = frame.contentWindow;
    let error = null;
    try {
      win.update(JSON.stringify(data));
      win.play();
    } catch (e) {
      error = String(e?.message ?? e).slice(0, 300);
    }
    await win.document.fonts.ready;
    await new Promise((resolve) => setTimeout(resolve, 1800));
    return error;
  }, { template, data });
  const measureOpts = {
    markFieldId, markProbe, proType: opts.proType ?? null, ticker: opts.ticker ?? false,
  };
  const measured = await measureCurrentFrame(measureOpts);
  const shot = await page.frameLocator('#iterate-hold-frame').locator('body')
    .screenshot({ path: path.join(OUT, file) });

  // STEP CAPTURE: drive next() along the DECLARED default path; shoot and MEASURE each
  // settled frame. Advance is judged by MARKUP DIFF, never by next()'s return value - a
  // hand-written next() may do its work and return nothing (the drive-proof lesson: two
  // cells the loop called step-broken drove fine under the real panel).
  const stepFrames = [];
  const stepFindings = [];
  const stepMeasures = [];
  for (let k = 1; k <= steps; k += 1) {
    const press = await page.evaluate(async () => {
      const win = document.getElementById('iterate-hold-frame')?.contentWindow;
      if (!win) return { error: 'frame gone' };
      if (typeof win.next !== 'function') return { missing: true };
      const before = win.document.body.innerHTML;
      try {
        win.next();
      } catch (e) {
        return { error: String(e?.message ?? e).slice(0, 200) };
      }
      return { before };
    });
    if (press.missing) {
      stepFindings.push(`the template declares ${steps} operator step(s) but window.next() does not exist`);
      break;
    }
    if (press.error) {
      stepFindings.push(`next() threw at step ${k} of ${steps}: ${press.error}`);
      break;
    }
    await page.waitForTimeout(1400);
    const after = await page.evaluate(() =>
      document.getElementById('iterate-hold-frame')?.contentWindow?.document.body.innerHTML ?? null);
    if (after !== null && after === press.before) {
      stepFindings.push(`step ${k} of ${steps} changed NOTHING on screen (the markup is identical after next() settled) - the graphic does not advance through its declared steps`);
      break;
    }
    const stepFile = `${opts.stepPrefix ?? file.replace(/\.png$/, '')}.step-${k}.png`;
    await page.frameLocator('#iterate-hold-frame').locator('body')
      .screenshot({ path: path.join(OUT, stepFile) });
    stepFrames.push(stepFile);
    const stepMeasured = await measureCurrentFrame(measureOpts);
    if (stepMeasured) stepMeasures.push({ step: k, measured: stepMeasured });
  }

  await page.evaluate(() => document.getElementById('iterate-hold-frame')?.remove());
  return { playError, measured, shot, stepFrames, stepFindings, stepMeasures };
}

/**
 * THE SENTINEL STEP-WALK - does every paint-expected field reach the screen in SOME state
 * along the declared default path? The fieldPaint technique (validation/fieldPaint.ts -
 * sentinels driven through update(), the frame re-read), walked with next() instead of the
 * machine snap, because an emitted stepper's next() is hand-written JS with no machine to
 * snap. Runs only where the validator's one-state fieldPaints read is not the whole answer.
 */
async function paintWalk(template, entry) {
  const fields = (entry.brief.fields ?? []).filter((f) => f.paintExpected !== false);
  if (!fields.length) return [];
  const steps = declaredSteps(entry);
  return page.evaluate(async ({ template, fields, steps }) => {
    const bust = '?t=' + Date.now();
    const { composeDocument } = await import('/src/preview/composeDocument.ts' + bust);
    const { sentinelFor, visibleText, TEXT_FTYPES } = await import('/src/validation/fieldPaint.ts' + bust);
    document.getElementById('iterate-paint-frame')?.remove();
    const frame = document.createElement('iframe');
    frame.id = 'iterate-paint-frame';
    frame.style.cssText = 'position:fixed;left:0;top:0;width:1920px;height:1080px;border:0;'
      + 'z-index:99998;background:#333;color-scheme:dark;';
    document.body.appendChild(frame);
    frame.srcdoc = composeDocument(template);
    await new Promise((resolve) => { frame.onload = resolve; });
    await new Promise((resolve) => setTimeout(resolve, 300));
    const win = frame.contentWindow;
    const doc = win.document;
    const findings = [];
    try {
      // Sentinels for the CONTRACT's paint-expected fields, driven through the fields the
      // template actually declares (sentinelFor needs the declared ftype). A contract field
      // the template does not declare at all is its own finding.
      const declared = new Map((template.fields ?? []).map((f) => [f.field, f]));
      const driven = [];
      for (const [i, f] of fields.entries()) {
        const tf = declared.get(f.id);
        if (!tf) {
          findings.push(`the field contract declares ${f.id} (${f.title}) and the template's SPX definition does not carry it`);
          continue;
        }
        if (!TEXT_FTYPES.has(tf.ftype)) continue; // an image or colour field cannot be measured this way
        driven.push({ id: f.id, title: f.title, sentinel: sentinelFor(tf, i) });
      }
      if (!driven.length) { frame.remove(); return findings; }
      try {
        win.update(JSON.stringify(Object.fromEntries(driven.map((d) => [d.id, d.sentinel]))));
        win.play();
      } catch {
        frame.remove(); return findings; // a throwing template is the capture's finding, not ours
      }
      await new Promise((resolve) => setTimeout(resolve, 1600));
      const shows = (sentinel, painted) =>
        sentinel.split(/[\s|\n]+/).some((part) => part && painted.includes(part));
      let missing = driven.filter((d) => !shows(d.sentinel, visibleText(doc, win)));
      // The walk presses through the DECLARED count - never gated on next()'s return value
      // (a hand-written next() may do its work and return nothing; markup diff is the honest
      // advance measure and the capture owns that question).
      for (let k = 1; k <= steps && missing.length; k += 1) {
        try {
          if (typeof win.next !== 'function') break;
          win.next();
        } catch { break; }
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const painted = visibleText(doc, win);
        missing = missing.filter((d) => !shows(d.sentinel, painted));
      }
      for (const d of missing) {
        findings.push(`live field ${d.title} (${d.id}) paints NOTHING in any state along the default path - its value never reaches the screen`);
      }
    } finally {
      frame.remove();
    }
    return findings;
  }, { template, fields, steps });
}

/**
 * THE CONTROL-PAGE SMOKE - does the SHIPPED control page run this graphic at all?
 *
 * The one class the 2026-08-19 round's gates could not see (docs/NOACG_PRO_PLAN.md §23.1):
 * qz-primetime delivered clean, the owner would air it, and #/control/<id> threw
 * ("Cannot convert undefined or null to object") and painted nothing. The loop's bench mounts
 * the graphic in its OWN iframe; this mounts it the way an operator meets it - createGraphic
 * (the real save door), the real control page, the real play press - in a FRESH page, because
 * a throwing graphic can wedge the shared shell (the drive spike's own lesson).
 *
 * Detection is two channels, because the page's command handler deliberately swallows a
 * play()/update() throw inside the stage iframe: any PAGE-level error or a control page that
 * never renders is the crash class, and ZERO visibly painted text after the play press is the
 * silent class (a template whose lifecycle died leaves its CSS-hidden root hidden - opacity
 * keeps innerText, so visibility is computed, not read).
 *
 * Returns null when the panel runs the graphic, else one blocking-finding sentence. FREE.
 */
async function controlPageSmoke(template, name) {
  const smokePage = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  smokePage.on('pageerror', (error) => errors.push(String(error?.message ?? error).split('\n')[0]));
  try {
    await smokePage.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
    await smokePage.locator('.topbar').waitFor({ timeout: 15_000 });
    await smokePage.locator('.wz-modal').waitFor({ state: 'visible', timeout: 8_000 }).catch(() => undefined);
    await smokePage.keyboard.press('Escape');
    const made = await smokePage.evaluate(async ({ template, name }) => {
      const bust = '?t=' + Date.now();
      const { createGraphic } = await import('/src/model/library.ts' + bust);
      const { doc, error } = createGraphic(template, { name });
      if (error || !doc) return { error: error ?? 'createGraphic returned nothing' };
      const { commitDurableWrites } = await import('/src/model/durableStore.ts' + bust);
      const failure = await commitDurableWrites();
      if (failure) return { error: `durable write refused: ${failure}` };
      return { id: doc.id };
    }, { template, name });
    if (made.error) return `the graphic breaks the shipped control page: it cannot be saved for it (${made.error})`;
    await smokePage.goto(`${BASE}/app#/control/${made.id}`, { waitUntil: 'domcontentloaded' });
    try {
      await smokePage.locator('[data-testid="graphic-control-page"]').waitFor({ timeout: 15_000 });
    } catch {
      return `the graphic breaks the shipped control page: the page never renders${errors.length ? ` (${errors[0]})` : ''}`;
    }
    await smokePage.locator('[data-testid="control-play"]').click({ timeout: 10_000 });
    await smokePage.waitForTimeout(2200);
    if (errors.length) return `the graphic breaks the shipped control page: it throws there (${errors[0]})`;
    const painted = await smokePage
      .frameLocator('[data-testid="control-stage"] iframe')
      .locator('body')
      .evaluate((body) => {
        const win = body.ownerDocument.defaultView;
        let count = 0;
        for (const el of body.querySelectorAll('*')) {
          let hasOwn = false;
          for (const n of el.childNodes) {
            if (n.nodeType === 3 && (n.textContent ?? '').trim()) { hasOwn = true; break; }
          }
          if (!hasOwn) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) continue;
          let visible = true;
          for (let a = el; a && a !== body; a = a.parentElement) {
            const s = win.getComputedStyle(a);
            if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.05) {
              visible = false;
              break;
            }
          }
          if (visible) count += 1;
        }
        return count;
      })
      .catch(() => -1);
    if (painted === -1) return 'the graphic breaks the shipped control page: its stage frame cannot be read';
    if (painted === 0) return 'the graphic breaks the shipped control page: after the panel\'s own play press it paints no visible text at all';
    return null;
  } catch (error) {
    const detail = errors[0] ?? String(error?.message ?? error).split('\n')[0];
    return `the graphic breaks the shipped control page: ${detail}`;
  } finally {
    await smokePage.close().catch(() => undefined);
  }
}

/** Everything the loop feeds back, as teaching strings - split into BLOCKING (counts against
 *  deliverability) and ADVISORY (shown to the model with a judgement note, never counted:
 *  spacing/proportion thresholds on a type they were never calibrated for). The device
 *  instrument is deliberately ABSENT - a plain panel is a legal answer; this loop repairs
 *  defects, it does not demand novelty. */
const EDITABILITY_RULE = 'bench-editability';
const UNPAINTED_RULE = 'bench-field-unpainted';
/** A COLLISION is binary, not a calibrated threshold - it blocks on EVERY type (owner ruling,
 *  docs/NOACG_PRO_PLAN.md §22.1 escape 1: the accent-over-text class let back in by the
 *  advisory demotion). `lines-crowded` only ever fires on an actual overlap (its floor is 0). */
const COLLISION_SPACING_CODES = new Set(['text-over-rule', 'lines-crowded']);

/** One measured frame's findings, labeled and routed. Collisions, mark findings, ticker
 *  margins and readability BLOCK findings always block; calibrated spacing/proportion
 *  thresholds demote to advisory on types they were never calibrated for. Alignment
 *  near-misses dedupe into ONE grouped advisory (the owner named zero of them across 49
 *  items while they burned whole repair rounds on quiz/podium grids). */
function frameFindings(measured, ctx = {}) {
  const blocking = [];
  const advisory = [];
  if (!measured) return { blocking, advisory };
  const instruments = ctx.advisoryInstruments ? advisory : blocking;
  for (const f of measured.spacing?.findings ?? []) {
    const bucket = COLLISION_SPACING_CODES.has(f.code) ? blocking : instruments;
    bucket.push(`spacing (${f.code}): ${f.detail}`);
  }
  for (const escape of measured.spacing?.escapes ?? []) {
    if (escape.isText) blocking.push(`live text paints outside its panel: ${escape.desc} by ${escape.px}px past the ${escape.side} edge`);
  }
  for (const f of measured.proportion?.findings ?? []) instruments.push(`proportion (${f.code}): ${f.detail}`);
  const misses = measured.axis?.nearMisses ?? [];
  if (misses.length) {
    const seen = new Set();
    const parts = [];
    for (const miss of misses) {
      const key = [miss.a.el, miss.b.el].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      parts.push(`${miss.a.el} vs ${miss.b.el} ${miss.gapPx}px off on the ${miss.side}`);
    }
    advisory.push(`${seen.size} alignment near-miss(es), grouped: `
      + `${parts.slice(0, 5).join('; ')}${seen.size > 5 ? ` (+${seen.size - 5} more)` : ''}`
      + ' - align exactly or separate deliberately where the frame genuinely reads misaligned');
  }
  for (const f of measured.mark?.findings ?? []) blocking.push(`brand mark: ${f}`);
  if (READABILITY_MODE === 'feed') {
    for (const f of measured.readability?.findings ?? []) {
      const bucket = f.severity === 'block' ? blocking : advisory;
      bucket.push(`readability (${f.code}): ${f.detail}`);
    }
  }
  // Full-bleed-or-equal-margins is binary geometry, so it blocks without calibration - the
  // same argument that makes a collision block everywhere (§22.1 escape 7).
  for (const f of measured.ticker?.findings ?? []) blocking.push(`ticker (${f.code}): ${f.detail}`);
  return { blocking, advisory };
}

/** Everything the loop feeds back, as teaching strings - split into BLOCKING (counts against
 *  deliverability) and ADVISORY (shown to the model with a judgement note, never counted).
 *  `frames` is every measured frame of the round: the hold, each STEP frame, and the STRESS
 *  frames (§22.1 escapes 4 and 5 - a stepper's geometry and the fixture stress capture are
 *  measured signals, not decoration). The device instrument is deliberately ABSENT - a plain
 *  panel is a legal answer; this loop repairs defects, it does not demand novelty. */
function collectFindings(validation, playError, frames, ctx = {}) {
  const blocking = [];
  const advisory = [];
  for (const e of validation.errors) {
    if (!e.startsWith(`${EDITABILITY_RULE}:`)) blocking.push(`platform check failed - ${e}`);
  }
  // The validator's one-state field-paint read (productionSpxValidator fieldPaints - the Lite
  // lesson) surfaces as a warning; here it is the owner's "never ship a field that paints
  // nothing" rule, so it blocks.
  for (const w of validation.warnings ?? []) {
    if (w.startsWith(`${UNPAINTED_RULE}:`)) blocking.push(`field paint - ${w}`);
  }
  if (playError) blocking.push(`the template threw at play(): ${playError}`);
  for (const f of ctx.stepFindings ?? []) blocking.push(`step contract: ${f}`);
  for (const f of ctx.paintFindings ?? []) blocking.push(`field paint: ${f}`);
  for (const f of ctx.extraBlocking ?? []) blocking.push(f);
  // The stress and step frames re-measure everything the hold measured, so a defect present
  // on several frames would otherwise be fed repeatedly: dedupe on the unlabeled sentence,
  // keeping the FIRST frame's labeling (the hold's, when it shows there).
  const seenBlocking = new Set();
  const seenAdvisory = new Set();
  for (const frame of frames) {
    const split = frameFindings(frame.measured, ctx);
    const tag = frame.label ? `${frame.label} - ` : '';
    for (const f of split.blocking) {
      if (seenBlocking.has(f)) continue;
      seenBlocking.add(f);
      blocking.push(`${tag}${f}`);
    }
    for (const f of split.advisory) {
      if (seenAdvisory.has(f)) continue;
      seenAdvisory.add(f);
      advisory.push(`${tag}${f}`);
    }
  }
  return { blocking: blocking.slice(0, 16), advisory: advisory.slice(0, 8) };
}

/** Brief-§9 edge cases the long-content stress cannot see (docs/DESIGN_RULES_PLAN.md §3.3):
 *  zero values, an emptied optional, Nordic accents, all-caps. Deterministic off the declared
 *  fields; transform fields (paintExpected: false) keep their legal sample - a countdown fed
 *  junk minutes measures the harness, not the design. */
function edgeStressValues(entry) {
  const fields = entry.brief.fields;
  if (!fields) {
    // The legacy two-line lower third: a Nordic all-caps name, and the supporting line EMPTY.
    return { f0: 'ÅSA KJÆRGÅRD-ÖSTRÖM', f1: '' };
  }
  const paintable = fields.filter((f) => f.paintExpected !== false);
  const textFields = paintable.filter((f) => !/^[\d.]+$/.test(f.sample));
  const firstText = textFields[0];
  const lastText = textFields.length > 1 ? textFields[textFields.length - 1] : null;
  return Object.fromEntries(fields.map((f) => {
    if (f.paintExpected === false) return [f.id, f.sample];
    if (/^[\d.]+$/.test(f.sample)) return [f.id, '0'];
    if (f === lastText) return [f.id, ''];
    if (f === firstText) return [f.id, 'ÅSA KJÆRGÅRD-ÖSTRÖM'];
    return [f.id, f.sample.toUpperCase()];
  }));
}

/** What the model is shown: the blocking findings as the contract, the advisory ones behind a
 *  judgement note - stated as uncalibrated so an instrument cannot bully a type it has never
 *  measured. */
function feedFindings({ blocking, advisory }) {
  return [
    ...blocking,
    ...advisory.map((a) => `ADVISORY, use your judgement (this threshold was calibrated on lower thirds, not this graphic type - fix it only if the frame genuinely reads wrong): ${a}`),
  ];
}

// ── The calibrated vision critic (docs/DESIGN_RULES_PLAN.md §4, calibrated 2026-08-19 in
// benchmarks/design-rules/CRITIC-CALIBRATION-2026-08-19.md). ONLY strong-precision questions
// are wireable, and every answer feeds as ADVISORY - the deterministic instruments gate,
// the critic is a second opinion on the one class it is proven on. `--critic=` disables.
const CRITIC_QUESTIONS = {
  lineOnText: 'Is any accent line, rule or bar drawn ON TOP of text (overlapping the letters)?',
};
const CRITIC = paid
  ? (value('critic') ?? 'lineOnText').split(',').filter((q) => q && CRITIC_QUESTIONS[q])
  : [];

async function criticAdvisories(jpegB64) {
  if (!CRITIC.length || !jpegB64) return { advisories: [], costUsd: 0 };
  const res = await page.evaluate(async ({ route, jpeg, questions }) => {
    const bust = '?t=' + Date.now();
    const { callModelDetailed } = await import('/src/ai/modelGateway.ts' + bust);
    const [provider, ...model] = route.split(':');
    try {
      const result = await callModelDetailed({
        system: 'You inspect broadcast graphics for objective visual defects. Answer strictly from the frame; never guess a defect you cannot see.',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `One rendered broadcast graphic frame at 1920x1080.\n${questions.map((q) => `- ${q.id}: ${q.ask}`).join('\n')}` },
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpeg } },
          ],
        }],
        tool: {
          name: 'report_defects',
          description: 'Binary defect answers for this frame.',
          input_schema: {
            type: 'object',
            additionalProperties: false,
            required: questions.map((q) => q.id),
            properties: Object.fromEntries(questions.map((q) => [q.id, { type: 'boolean', description: q.ask }])),
          },
        },
        route: { provider, model: model.join(':') },
        surface: 'spike',
        temperature: 0,
        maxTokens: 800,
      });
      return { answers: result.output, costUsd: result.usage?.estimatedCost?.amount ?? 0 };
    } catch (e) {
      return { error: String(e?.message ?? e).slice(0, 200) };
    }
  }, { route, jpeg: jpegB64, questions: CRITIC.map((id) => ({ id, ask: CRITIC_QUESTIONS[id] })) });
  if (res.error) {
    console.log(`  critic error (advisory lost, round continues): ${res.error}`);
    return { advisories: [], costUsd: 0 };
  }
  const advisories = CRITIC.filter((id) => res.answers?.[id]).map((id) =>
    `ADVISORY vision check (${id}): the judge answered YES to "${CRITIC_QUESTIONS[id]}" - verify on your render and fix it where real`);
  return { advisories, costUsd: res.costUsd ?? 0 };
}

/** Downscale the 1920x1080 hold to a model-sized JPEG inside the page. */
async function downscale(shotBuffer) {
  return page.evaluate(async (pngB64) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 960;
      canvas.height = 540;
      canvas.getContext('2d').drawImage(img, 0, 0, 960, 540);
      resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
    };
    img.onerror = () => resolve(null);
    img.src = 'data:image/png;base64,' + pngB64;
  }), shotBuffer.toString('base64'));
}

// ── --control: prove the findings collection, no model ─────────────────────────────────
if (control) {
  let failed = false;
  const anchor = await page.evaluate(async () => {
    const bust = '?t=' + Date.now();
    const spikeAnchors = await import('/src/ai/spike/anchors.ts' + bust);
    const a = spikeAnchors.controlAnchor();
    return { template: a.template, data: a.data };
  });
  // THE OWNER TABLE MAY INDICT SHIPPED DESIGNS, and that is evidence for the audit report,
  // never a harness failure (docs/DESIGN_RULES_PLAN.md: the table wins; the report states the
  // disagreement). Everything ELSE loud on a known-good frame is harness murk.
  const isOwnerTableFinding = (f) =>
    f.includes('readability (text-under-size-floor)') || f.includes('readability (text-size-warning-band)');
  const clean = await captureAndMeasure(anchor.template, anchor.data, null, null, 'control-clean.hold.png');
  const cleanFindings = collectFindings({ errors: [], warnings: [] }, clean.playError, [{ label: '', measured: clean.measured }]);
  const cleanTable = cleanFindings.blocking.filter(isOwnerTableFinding);
  const cleanOther = cleanFindings.blocking.filter((f) => !isOwnerTableFinding(f));
  console.log(`control (known-good): ${cleanOther.length} blocking finding(s)`
    + `${cleanTable.length ? ` + ${cleanTable.length} owner-table size finding(s) (audit evidence, not harness murk)` : ''}`);
  for (const f of cleanOther) console.log(`  - ${f}`);
  for (const f of cleanTable) console.log(`  ~ ${f}`);

  // The MUTATION: pull the supporting line's MASK up over the primary line. Moving the field
  // itself is absorbed by the mask's own overflow clip (the first version of this check
  // proved that by failing) - the mask is the painted box, so the mask is what must move.
  // A loop whose collector cannot see a forced overlap would iterate on nothing.
  const broken = {
    ...anchor.template,
    css: `${anchor.template.css}\n/* control mutation - forced overlap */\n[class*="-mask"]:has(#f1) { margin-top: -52px; }`,
  };
  const bad = await captureAndMeasure(broken, anchor.data, null, null, 'control-broken.hold.png');
  const badFindings = collectFindings({ errors: [], warnings: [] }, bad.playError, [{ label: '', measured: bad.measured }]);
  console.log(`control (forced overlap): ${badFindings.blocking.length} blocking finding(s)`);
  for (const f of badFindings.blocking) console.log(`  - ${f}`);
  if (badFindings.blocking.length === 0) {
    console.error('MUTATION CHECK FAILED: the forced overlap produced no findings.');
    failed = true;
  }

  // ── READABILITY CALIBRATION: three shipped catalog designs. An instrument whose false
  // positives are good designs gets ignored (the mark-gap lesson), so the floor is trusted
  // only if the catalog is quiet under it. Murky = rerun the round with --readability=report.
  const calibration = await page.evaluate(async () => {
    const bust = '?t=' + Date.now();
    const { variantById } = await import('/src/templates/catalog.ts' + bust);
    const out = [];
    for (const id of ['lt11', 'lt27', 'lt08']) {
      const variant = variantById(id);
      if (!variant) { out.push({ id, error: 'gone from the catalog' }); continue; }
      out.push({
        id,
        template: variant.create({
          lines: [
            { title: 'Name', sample: 'Alexandra Riva' },
            { title: 'Role', sample: 'Chief Political Correspondent' },
          ],
        }),
      });
    }
    return out;
  });
  let calibrationMurk = 0;
  let calibrationTable = 0;
  for (const c of calibration) {
    if (c.error) { console.error(`  readability calibration: ${c.id} ${c.error}`); failed = true; continue; }
    const cap = await captureAndMeasure(c.template, { f0: 'Alexandra Riva', f1: 'Chief Political Correspondent' }, null, null, `control-readability-${c.id}.hold.png`);
    const report = cap.measured?.readability ?? { findings: [], readings: [] };
    // Owner-table size findings on a shipped design are the AUDIT's evidence (the table wins
    // and the report states the disagreement); anything else loud here is instrument murk.
    const table = report.findings.filter((f) => f.code === 'text-under-size-floor' || f.code === 'text-size-warning-band');
    const murk = report.findings.filter((f) => !table.includes(f) && f.severity === 'block');
    calibrationTable += table.length;
    calibrationMurk += murk.length;
    console.log(`readability calibration ${c.id}: ${murk.length} murk / ${table.length} owner-table finding(s); readings: ${report.readings.map((r) => `${r.fontPx}px(${r.role})${r.contrast ? `/${r.contrast}:1` : ''}`).join(', ')}`);
    for (const f of murk) console.log(`  - ${f.code}: ${f.detail}`);
    for (const f of table) console.log(`  ~ ${f.code}: ${f.detail}`);
  }
  if (calibrationMurk > 0) {
    console.error(`READABILITY CALIBRATION MURKY: ${calibrationMurk} non-size finding(s) on shipped designs - run the paid round with --readability=report.`);
  }
  if (calibrationTable > 0) {
    console.log(`owner-table size findings on shipped designs: ${calibrationTable} (expected where the ratified table indicts the catalog - the audit report quantifies this).`);
  }

  // ── READABILITY MUTATION: a deliberately grey-on-grey, undersized supporting line must be
  // loud, or the floor is measuring nothing.
  const greyOnGrey = {
    ...anchor.template,
    css: `${anchor.template.css}\n/* control mutation - grey-on-grey undersized */\n#f1 { color: #3c4046 !important; font-size: 14px !important; }`,
  };
  const grey = await captureAndMeasure(greyOnGrey, anchor.data, null, null, 'control-grey.hold.png');
  const greyFindings = grey.measured?.readability?.findings ?? [];
  console.log(`control (grey-on-grey 14px): ${greyFindings.length} readability finding(s)`);
  for (const f of greyFindings) console.log(`  - ${f.code}: ${f.detail}`);
  if (greyFindings.length === 0) {
    console.error('READABILITY MUTATION FAILED: the grey-on-grey undersized line produced no findings.');
    failed = true;
  }

  // ── MUTATION CONTROLS FOR EVERY NEW CHECK (the standing rule: a check enters the feed
  // only after its control is loud on a broken fixture and quiet on shipped designs). Each
  // fixture is a minimal hand-written template so the defect is unambiguous.
  const mini = (body, css, extraJs = '') => ({
    name: 'control fixture',
    type: 'lower-third',
    resolution: { width: 1920, height: 1080, label: '1080p' },
    fps: 25,
    html: `<!DOCTYPE html>\n<html><head><meta charset="utf-8"><link rel="stylesheet" href="css/template.css"><script>window.SPXGCTemplateDefinition={DataFields:[{field:"f0",ftype:"textfield",title:"Line",value:""}]};</script></head><body>${body}</body></html>`,
    css,
    js: `window.update=function(){};window.play=function(){};${extraJs}`,
    fields: [{ field: 'f0', ftype: 'textfield', title: 'Line', value: '' }],
    settings: {},
    assets: [],
    layers: [],
  });
  const expectLoud = (name, list, matcher) => {
    const hit = list.filter(matcher);
    console.log(`mutation ${name}: ${hit.length} finding(s)`);
    for (const f of hit.slice(0, 3)) console.log(`  - ${typeof f === 'string' ? f : `${f.code}: ${f.detail}`}`);
    if (!hit.length) {
      console.error(`MUTATION CHECK FAILED: ${name} produced no findings - the check must not enter the feed.`);
      failed = true;
    }
  };

  // undersized-by-role: a 30px headline is the frame's primary and sits under the ~50px floor.
  const primarySmall = await captureAndMeasure(
    mini('<span id="f0">Undersized Primary Name</span>',
      '#f0{position:fixed;left:400px;bottom:300px;font:700 30px sans-serif;color:#fff;background:#101216;padding:10px 16px}'),
    { f0: 'Undersized Primary Name' }, null, null, 'control-primary-small.hold.png',
  );
  expectLoud('undersized-by-role (primary 30px)', primarySmall.measured?.readability?.findings ?? [],
    (f) => f.code === 'text-under-size-floor' && f.detail.includes('(primary)'));

  // standard-pass / safe-fail sizing: 70px + 30px passes STANDARD untouched and the 30px
  // supporting line fails SAFE's 5% floor - measured directly against both modes.
  const dualModes = await page.evaluate(async ({ template, data }) => {
    const bust = '?t=' + Date.now();
    const { composeDocument } = await import('/src/preview/composeDocument.ts' + bust);
    const { measureReadability } = await import('/src/validation/readabilityCheck.ts' + bust);
    document.getElementById('iterate-hold-frame')?.remove();
    const frame = document.createElement('iframe');
    frame.id = 'iterate-hold-frame';
    frame.style.cssText = 'position:fixed;left:0;top:0;width:1920px;height:1080px;border:0;z-index:99999;background:#333;color-scheme:dark;';
    document.body.appendChild(frame);
    frame.srcdoc = composeDocument(template);
    await new Promise((resolve) => { frame.onload = resolve; });
    await new Promise((resolve) => setTimeout(resolve, 300));
    try {
      frame.contentWindow.update(JSON.stringify(data));
      frame.contentWindow.play();
    } catch { /* static fixture */ }
    await new Promise((resolve) => setTimeout(resolve, 400));
    const doc = frame.contentDocument;
    const std = measureReadability(doc, { mode: 'standard', target: { profile: 'tv' } }).findings;
    const safe = measureReadability(doc, { mode: 'safe', target: { profile: 'tv' } }).findings;
    frame.remove();
    return { std, safe };
  }, {
    template: mini('<div class="sf"><span id="f0">Headline Seventy</span><span class="sf-sub">Supporting thirty line</span></div>',
      '.sf{position:fixed;left:400px;bottom:300px;background:#101216;padding:20px 28px}'
      + '.sf span{display:block;color:#fff}#f0{font:700 70px/1.15 sans-serif}.sf-sub{font:500 30px/1.2 sans-serif}'),
    data: { f0: 'Headline Seventy' },
  });
  const stdSize = dualModes.std.filter((f) => f.code === 'text-under-size-floor');
  if (stdSize.length) {
    console.error(`MUTATION CHECK FAILED: the standard-pass fixture fails STANDARD mode (${stdSize[0].detail}).`);
    failed = true;
  }
  expectLoud('standard-pass/safe-fail sizing (safe mode)', dualModes.safe,
    (f) => f.code === 'text-under-size-floor' && f.detail.includes('Supporting thirty'));

  // unprotected-over-video: white text straight over the picture, no panel/shadow/stroke.
  const unprotected = await captureAndMeasure(
    mini('<span id="f0">Floating Over Footage</span>',
      '#f0{position:fixed;left:400px;bottom:300px;font:700 70px sans-serif;color:#fff}'),
    { f0: 'Floating Over Footage' }, null, null, 'control-unprotected.hold.png',
  );
  expectLoud('unprotected-over-video', unprotected.measured?.readability?.findings ?? [],
    (f) => f.code === 'text-unprotected-over-video');

  // hairline functional stroke: a 1px rule right beside 30px text.
  const hairline = await captureAndMeasure(
    mini('<div class="hl"><div class="hl-rule"></div><span id="f0">Sources: Election Desk</span></div>',
      '.hl{position:fixed;left:400px;bottom:240px}.hl-rule{width:400px;height:1px;background:#f6a623}'
      + '#f0{display:block;font:600 30px sans-serif;color:#fff;background:#101216;padding:12px 16px}'),
    { f0: 'Sources: Election Desk' }, null, null, 'control-hairline.hold.png',
  );
  expectLoud('hairline functional stroke', hairline.measured?.readability?.findings ?? [],
    (f) => f.code === 'hairline-functional-stroke');

  // field outside safe area: a field-bound line 20px from the left edge (inset is 96px).
  const unsafeArea = await captureAndMeasure(
    mini('<span id="f0">Left Edge Name</span>',
      '#f0{position:fixed;left:20px;bottom:300px;font:700 60px sans-serif;color:#fff;background:#101216;padding:8px 14px}'),
    { f0: 'Left Edge Name' }, null, null, 'control-unsafe-area.hold.png',
  );
  expectLoud('field outside safe area', unsafeArea.measured?.readability?.findings ?? [],
    (f) => f.code === 'text-outside-safe-area');

  // uneven ticker margins: loud on a lopsided band, quiet on equal margins and full bleed.
  const band = (left, width) => mini(
    `<div class="tkc-band"><span id="f0">Breaking: the margins rule is measured</span></div>`,
    `.tkc-band{position:fixed;bottom:60px;left:${left}px;width:${width}px;height:72px;background:#101216;color:#fff;font:500 30px/72px sans-serif;padding-left:24px;box-sizing:border-box}`,
  );
  const uneven = await captureAndMeasure(band(100, 1700), { f0: 'Breaking' }, null, null, 'control-ticker-uneven.hold.png', { ticker: true });
  expectLoud('uneven ticker margins', uneven.measured?.ticker?.findings ?? [],
    (f) => f.code === 'ticker-margins-uneven');
  for (const [name, fixture] of [['equal margins', band(110, 1700)], ['full bleed', band(0, 1920)]]) {
    const cap = await captureAndMeasure(fixture, { f0: 'Breaking' }, null, null, `control-ticker-${name.replace(/\s+/g, '-')}.hold.png`, { ticker: true });
    const loud = cap.measured?.ticker?.findings ?? [];
    console.log(`ticker control (${name}): ${loud.length} finding(s)`);
    if (loud.length) {
      console.error(`MUTATION CHECK FAILED: the ${name} ticker fixture must be quiet (${loud[0].detail}).`);
      failed = true;
    }
  }

  // misaligned growing step (the X-25 class): step 2 grows the line past its panel - the
  // per-step instrument pass must catch the escape on a STEP frame, not the hold.
  const growing = await captureAndMeasure(
    mini('<div class="stc-box"><div class="stc-accent"></div><span id="f0">Growing content stays put</span></div>',
      '.stc-box{position:fixed;left:400px;top:400px;width:560px;background:#0d1117;padding:24px;overflow:visible}'
      + '.stc-accent{width:120px;height:6px;background:#f6a623;margin-bottom:12px}'
      + '#f0{display:inline-block;white-space:nowrap;font:600 34px sans-serif;color:#fff}',
      'var k=0;window.next=function(){k+=1;document.getElementById("f0").style.fontSize=(34+k*30)+"px";};'),
    { f0: 'Growing content stays put' }, null, null, 'control-growing-step.hold.png',
    { steps: 2, stepPrefix: 'control-growing-step' },
  );
  const stepEscapes = growing.stepMeasures.flatMap((s) =>
    (s.measured?.spacing?.escapes ?? []).filter((e) => e.isText).map((e) => `step ${s.step}: ${e.desc} ${e.px}px past ${e.side}`));
  expectLoud('misaligned growing step (per-step instruments)', stepEscapes, () => true);

  // no-advance stepper: next() exists, returns nothing AND changes nothing - the markup diff
  // must call it, and a next() that does real work while returning undefined must NOT trip it
  // (the growing fixture above returns undefined every press and walked both steps).
  if (growing.stepFindings.length) {
    console.error(`MUTATION CHECK FAILED: the growing stepper (working next(), undefined return) tripped the advance check: ${growing.stepFindings[0]}`);
    failed = true;
  }
  const inert = await captureAndMeasure(
    mini('<div class="stc-box"><div class="stc-accent"></div><span id="f0">Never advances</span></div>',
      '.stc-box{position:fixed;left:400px;top:400px;background:#0d1117;padding:24px}'
      + '.stc-accent{width:120px;height:6px;background:#f6a623;margin-bottom:12px}'
      + '#f0{font:600 34px sans-serif;color:#fff}',
      'window.next=function(){};'),
    { f0: 'Never advances' }, null, null, 'control-inert-step.hold.png',
    { steps: 1, stepPrefix: 'control-inert-step' },
  );
  expectLoud('inert stepper (markup diff)', inert.stepFindings, (f) => f.includes('changed NOTHING'));

  // ── COUNTDOWN THRESHOLD MUTATIONS (the §23.1 recalibration). Both retuned numbers are
  // pinned from BOTH sides against the countdown overrides themselves: a fixture built at the
  // AIRED frames' readings (padding 0.12, line gap 1.9 - the two dirty stops the owner aired)
  // must be QUIET under the countdown thresholds and LOUD under the strap defaults (proof the
  // override does the separating), and fixtures below the new floor / above the new ceiling
  // must be LOUD under the countdown thresholds.
  {
    const spacingUnder = async (template, data) => page.evaluate(async ({ template, data }) => {
      const bust = '?t=' + Date.now();
      const { composeDocument } = await import('/src/preview/composeDocument.ts' + bust);
      const { measureSpacing } = await import('/src/ai/spike/spacingCheck.ts' + bust);
      const { PRO_GRAPHICS } = await import('/src/ai/pro/language/graphics.ts' + bust);
      document.getElementById('iterate-hold-frame')?.remove();
      const frame = document.createElement('iframe');
      frame.id = 'iterate-hold-frame';
      frame.style.cssText = 'position:fixed;left:0;top:0;width:1920px;height:1080px;border:0;z-index:99999;background:#333;color-scheme:dark;';
      document.body.appendChild(frame);
      frame.srcdoc = composeDocument(template);
      await new Promise((resolve) => { frame.onload = resolve; });
      await new Promise((resolve) => setTimeout(resolve, 300));
      try {
        frame.contentWindow.update(JSON.stringify(data));
        frame.contentWindow.play();
      } catch { /* static fixture */ }
      await new Promise((resolve) => setTimeout(resolve, 400));
      const doc = frame.contentDocument;
      const countdown = measureSpacing(doc, PRO_GRAPHICS.countdown.instruments.spacing ?? {}).findings;
      const strap = measureSpacing(doc, {}).findings;
      frame.remove();
      return { countdown, strap };
    }, { template, data });

    // The aired shape: a 100px clock over a 100px readout 190px below it (a 1.9 gap in the
    // smaller line's type sizes - cd-results' own reading), 12px of panel padding (0.12 -
    // inside cd-launch's 0.11-0.23 band).
    const airedLike = await spacingUnder(
      mini('<div class="cd"><span id="f0">19:00</span><span class="cd-label">DOORS OPEN</span></div>',
        '.cd{position:fixed;left:660px;top:240px;display:flex;flex-direction:column;background:#101216;padding:12px}'
        + '.cd span{display:block;color:#fff}#f0{font:700 100px/1 sans-serif}'
        + '.cd-label{font:600 100px/1 sans-serif;margin-top:190px}'),
      { f0: '19:00' },
    );
    const airedCountdownSpacing = airedLike.countdown.filter((f) => f.code === 'padding-tight' || f.code === 'lines-adrift');
    if (airedCountdownSpacing.length) {
      console.error(`MUTATION CHECK FAILED: the aired-frame fixture still stops under the countdown thresholds (${airedCountdownSpacing[0].code}: ${airedCountdownSpacing[0].detail}).`);
      failed = true;
    } else {
      console.log('mutation countdown thresholds (aired-frame fixture): quiet under the countdown overrides');
    }
    expectLoud('countdown-vs-strap separation (the same fixture under strap defaults)',
      airedLike.strap, (f) => f.code === 'padding-tight' || f.code === 'lines-adrift');

    // Below the retuned floor: 8px of padding on the same 100px clock (0.08 - past bleed, under 0.1).
    const crammed = await spacingUnder(
      mini('<div class="cd"><span id="f0">19:00</span><span class="cd-label">DOORS OPEN</span></div>',
        '.cd{position:fixed;left:760px;top:340px;display:flex;flex-direction:column;background:#101216;padding:8px}'
        + '.cd span{display:block;color:#fff}#f0{font:700 100px/1 sans-serif}'
        + '.cd-label{font:600 40px/1 sans-serif;margin-top:60px}'),
      { f0: '19:00' },
    );
    expectLoud('countdown padding floor (0.08 type sizes of padding)', crammed.countdown,
      (f) => f.code === 'padding-tight');

    // Above the retuned ceiling: the label parked 460px under a 100px clock (4.6 > 4.3).
    const adrift = await spacingUnder(
      mini('<div class="cd"><span id="f0">19:00</span><span class="cd-label">DOORS OPEN</span></div>',
        '.cd{position:fixed;left:760px;top:140px;display:flex;flex-direction:column;background:#101216;padding:30px}'
        + '.cd span{display:block;color:#fff}#f0{font:700 100px/1 sans-serif}'
        + '.cd-label{font:600 100px/1 sans-serif;margin-top:460px}'),
      { f0: '19:00' },
    );
    expectLoud('countdown line-gap ceiling (4.6 type sizes of gap)', adrift.countdown,
      (f) => f.code === 'lines-adrift');
  }

  // ── ONE KNOWN-GOOD CATALOG CELL PER NEW TYPE, through the EXTENDED capture: if step
  // capture or the field-paint validator misfires on a shipped scoreboard or quiz, the
  // harness is broken - fix it before paying (the Phase 0 lesson, standing).
  // `skipPaint` mirrors the bank's own `paintExpected: false`: a catalog design's TRANSFORM
  // fields (gt05's minutes become a clock, sb21's spotlight index drives a state) legitimately
  // paint nothing verbatim, and a paid cell of that type never runs the raw one-state read on
  // such a field either - the harness check must measure the same rule the round will.
  const TYPE_CELLS = [
    { type: 'scoreboard', variant: 'sb01' },
    { type: 'quiz-board', variant: 'qz01' },
    { type: 'ticker', variant: 'tk01' },
    { type: 'stat-panel', variant: 'ig01' },
    { type: 'countdown', variant: 'gt05', skipPaint: ['f1'] },
    { type: 'podium-score', variant: 'sb21', skipPaint: ['f9'] },
  ];
  for (const cell of TYPE_CELLS) {
    const made = await page.evaluate(async ({ variantId }) => {
      const bust = '?t=' + Date.now();
      const { variantById } = await import('/src/templates/catalog.ts' + bust);
      const variant = variantById(variantId);
      if (!variant) return { error: `variant ${variantId} is gone from the catalog` };
      const template = variant.create({});
      const values = Object.fromEntries(
        template.fields
          .filter((f) => f.ftype === 'textfield' || f.ftype === 'textarea' || f.ftype === 'number')
          .map((f) => [f.field, String(f.value ?? '')]),
      );
      const presses = Math.max(0, (parseInt(template.settings.steps, 10) || 1) - 1);
      return { template, values, presses };
    }, { variantId: cell.variant });
    if (made.error) {
      console.error(`  type cell ${cell.type}: ${made.error}`);
      failed = true;
      continue;
    }
    const cap = await captureAndMeasure(
      made.template, made.values, null, null, `control-type-${cell.type}.hold.png`,
      { steps: Math.min(made.presses, 6), stepPrefix: `control-type-${cell.type}` },
    );
    // The validator's field-paint read, exactly as a paid cell composes it (machine-aware:
    // unreachableFields walks a shipped type's explicit machine).
    const paint = await page.evaluate(async ({ template, skipPaint }) => {
      const bust = '?t=' + Date.now();
      const { productionSpxValidator } = await import('/src/ai/lite/pipeline.ts' + bust);
      const validate = productionSpxValidator(null, [], { fieldPaints: true });
      const v = await validate(template);
      return v.warnings
        .filter((w) => w.rule === 'bench-field-unpainted')
        .map((w) => w.message.slice(0, 160))
        .filter((m) => !skipPaint.some((id) => m.includes(`(${id})`)));
    }, { template: made.template, skipPaint: cell.skipPaint ?? [] });
    // The control-page smoke must stay QUIET on every shipped type cell - a smoke whose
    // false positives are the catalog is one the loop would teach the model to ignore.
    const cellSmoke = await controlPageSmoke(made.template, `control smoke ${cell.variant}`);
    const loud = [
      ...(cap.playError ? [`play() threw: ${cap.playError}`] : []),
      ...cap.stepFindings.map((f) => `step: ${f}`),
      ...paint.map((p) => `unpainted: ${p}`),
      ...(cellSmoke ? [`control-page smoke: ${cellSmoke}`] : []),
    ];
    console.log(`type cell ${cell.type} (${cell.variant}): steps ${cap.stepFrames.length}/${Math.min(made.presses, 6)}, ${loud.length} harness finding(s)`);
    for (const f of loud) console.log(`  - ${f}`);
    if (loud.length > 0) failed = true;
  }

  // ── CONTROL-PAGE SMOKE MUTATIONS (the §23.1 qz-primetime class). Three fixtures on the
  // control anchor's own template:
  //   - a lifecycle that THROWS on the panel must be LOUD (play/update throws are swallowed
  //     by the page's command handler, so the smoke reads painted visibility instead);
  //   - a hand-written noacgMachineState() returning a groups-less shape must be QUIET now -
  //     the control surfaces were hardened to read it as "not answered yet", and this fixture
  //     pins that a malformed state shape no longer takes the whole page down;
  //   - the anchor itself must be QUIET (the shipped lower third is the seventh type cell).
  {
    const throwing = {
      ...anchor.template,
      js: `${anchor.template.js}\n;window.buildInTimeline=function(){throw new Error('lifecycle throws on purpose');};`
        + `window.play=function(){throw new Error('lifecycle throws on purpose');};`
        + `window.update=function(){throw new Error('lifecycle throws on purpose');};`,
    };
    const loudSmoke = await controlPageSmoke(throwing, 'control smoke throwing fixture');
    expectLoud('control-page smoke (throwing lifecycle)', loudSmoke ? [loudSmoke] : [], () => true);

    const groupless = {
      ...anchor.template,
      js: `${anchor.template.js}\n;window.noacgMachineState=function(){return {stepsPlayed:1};};`,
    };
    const stateSmoke = await controlPageSmoke(groupless, 'control smoke groups-less state');
    if (stateSmoke) {
      console.error(`MUTATION CHECK FAILED: a groups-less noacgMachineState() still breaks the control page (${stateSmoke}).`);
      failed = true;
    } else {
      console.log('mutation control-page smoke (groups-less state): quiet - the panel degrades honestly');
    }

    const anchorSmoke = await controlPageSmoke(anchor.template, 'control smoke anchor');
    if (anchorSmoke) {
      console.error(`MUTATION CHECK FAILED: the smoke is loud on the shipped control anchor (${anchorSmoke}).`);
      failed = true;
    } else {
      console.log('mutation control-page smoke (shipped anchor): quiet');
    }
  }

  await browser.close();
  if (failed) {
    console.error('\nCONTROL FAILED - do not pay for a round on this harness.');
    process.exit(1);
  }
  console.log('\nControl PASSED: quiet on known-good frames (all seven types), loud on both mutations.');
  process.exit(0);
}

// ── --anchors: per-type CATALOG baselines for the blind page, free ─────────────────────
// The real create() output of a shipped variant, driven with the type's first brief's own
// words, so the read has a professional baseline per type (the §0.2 anchor rule, applied
// per type). The slug borrows that brief's id - a slug naming "anchor" would answer the
// question before the reviewer looks.
if (anchors) {
  const ANCHOR_VARIANTS = {
    'lower-third': 'lt27',
    scoreboard: 'sb01',
    'quiz-board': 'qz01',
    ticker: 'tk01',
    'stat-panel': 'ig01',
    countdown: 'gt05',
    'podium-score': 'sb21',
  };
  const seen = new Set();
  const anchorResults = [];
  for (const entry of briefs) {
    const type = sweepType(entry);
    if (seen.has(type) || !ANCHOR_VARIANTS[type]) continue;
    seen.add(type);
    const variantId = ANCHOR_VARIANTS[type];
    const made = await page.evaluate(async ({ variantId, brief }) => {
      const bust = '?t=' + Date.now();
      const { variantById } = await import('/src/templates/catalog.ts' + bust);
      const spikeAnchors = await import('/src/ai/spike/anchors.ts' + bust);
      const variant = variantById(variantId);
      if (!variant) return { error: `variant ${variantId} is gone from the catalog` };
      const template = variant.create({});
      // The brief's own words onto the design's fields BY WHAT EACH FIELD IS (mapBriefValues) -
      // the purely positional map put "NORTHBRIDGE ALBION" on sb01's score chip and the whole
      // headlines block in tk01's label, and the 2026-08-19 blind read judged both frames as
      // the DESIGN's failure (docs/NOACG_PRO_PLAN.md §23.1).
      const sample = Object.values(spikeAnchors.dataFor(brief));
      const stressVals = Object.values(spikeAnchors.stressFor(brief));
      const map = (vals) => spikeAnchors.mapBriefValues(template.fields, vals);
      return {
        template,
        variantName: variant.name,
        values: map(sample),
        stressValues: map(stressVals),
        presses: Math.max(0, (parseInt(template.settings.steps, 10) || 1) - 1),
      };
    }, { variantId, brief: entry.brief });
    if (made.error) {
      console.error(`anchor ${type}: ${made.error}`);
      continue;
    }
    const brandId = brandsFixture.assignment[entry.id] ?? brands[0].id;
    const slug = `${entry.id}.${brandId}.catalog`;
    const cap = await captureAndMeasure(
      made.template, made.values, null, null, `${slug}.hold.png`,
      { steps: Math.min(made.presses, 6), stepPrefix: slug, proType: proInstrumentType(entry) },
    );
    const stressCap = await captureAndMeasure(
      made.template, made.stressValues, null, null, `${slug}.stress.hold.png`,
    );
    anchorResults.push({
      slug,
      kind: 'candidate',
      arm: 'catalog-anchor',
      type,
      brand: brandId,
      model: 'catalog',
      provenance: `catalog design ${variantId} "${made.variantName}" via its real create(), driven with the ${entry.id} brief's words`,
      deliverable: true,
      iterations: 0,
      contract: { scaffoldOk: true, blockingErrors: [] },
      hold: `${slug}.hold.png`,
      stressHold: `${slug}.stress.hold.png`,
      ...(cap.stepFrames.length ? { stepFrames: cap.stepFrames } : {}),
      ...(cap.playError ? { playError: cap.playError } : {}),
      ...(stressCap.playError ? { stressPlayError: stressCap.playError } : {}),
      costUsd: 0,
    });
    console.log(`anchor ${type}: ${variantId} · ${cap.stepFrames.length} step frame(s)${cap.playError ? ` · PLAY ERROR ${cap.playError}` : ''}`);
  }
  await writeFile(path.join(OUT, 'results.json'), `${JSON.stringify({
    base: BASE,
    capturedAt: new Date().toISOString(),
    bank: path.relative(process.cwd(), BANK),
    kind: 'catalog-anchors',
    results: anchorResults,
  }, null, 2)}\n`);
  await browser.close();
  console.log(`\n${anchorResults.length} catalog anchor(s) · ${path.join(OUT, 'results.json')}`);
  process.exit(0);
}

// ── The paid loop ──────────────────────────────────────────────────────────────────────
const kept = new Map();
if (resume) {
  try {
    const prior = JSON.parse(await readFile(path.join(OUT, 'results.json'), 'utf8'));
    for (const r of prior.results ?? []) {
      if (r.kind === 'candidate' && !r.error) kept.set(r.slug, r);
    }
    console.log(`Resuming: ${kept.size} candidate(s) kept.`);
  } catch { /* nothing to resume */ }
}

const results = [];
let spentUsd = 0;
const ledgerPath = path.join(OUT, 'results.json');
async function writeLedger() {
  await writeFile(ledgerPath, `${JSON.stringify({
    base: BASE,
    capturedAt: new Date().toISOString(),
    route,
    frontierReason,
    bank: path.relative(process.cwd(), BANK),
    brands: path.relative(process.cwd(), BRANDS),
    readabilityMode: READABILITY_MODE,
    legibilityMode: LEGIBILITY_MODE,
    viewingProfile: VIEWING_PROFILE,
    critic: CRITIC,
    maxIterations: MAX_ITERATIONS,
    vision,
    maxCost,
    spentUsd,
    decoding,
    results,
  }, null, 2)}\n`);
}

for (const entry of briefs) {
  const brand = brandById.get(brandsFixture.assignment[entry.id]);
  const slug = `${entry.id}.${brand.id}.iterate`;
  if (kept.has(slug)) {
    results.push(kept.get(slug));
    continue;
  }
  if (spentUsd >= maxCost) {
    console.log(`  SKIPPED ${slug}: the $${maxCost.toFixed(2)} ceiling is spent ($${spentUsd.toFixed(3)}).`);
    results.push({ slug, kind: 'candidate', arm: 'iterate', skipped: true });
    continue;
  }
  console.log(`\n── ${slug} ──`);
  const started = Date.now();
  const totals = { input: 0, output: 0, reasoning: 0 };
  let cost = 0;
  const iterationLog = [];
  let current = null;      // { template, emitted, validation, fill }
  let lastCapture = null;
  let previous = null;     // what the next round is told
  let deliverable = false;
  let error = null;

  try {
    for (let round = 0; round <= MAX_ITERATIONS; round += 1) {
      const emitRes = await page.evaluate(async (input) => {
        const bust = '?t=' + Date.now();
        const { iterateEmit } = await import('/src/ai/spike/iterate.ts' + bust);
        const { productionSpxValidator } = await import('/src/ai/lite/pipeline.ts' + bust);
        const [provider, ...model] = input.route.split(':');
        const result = await iterateEmit({
          brief: input.brief,
          route: { provider, model: model.join(':') },
          decoding: input.decoding,
          // fieldPaints composed into the LOOP'S validator (the Lite pattern - §21.2 escape
          // 2) wherever its one-state read is the whole answer; steppers get the runner's
          // sentinel step-walk instead.
          validate: productionSpxValidator(null, [input.brand.mark.path], input.benchOptions),
          brand: input.brand,
          // The canonical rules ride the USER message, generated from designRules.ts - the
          // frozen coder system prompt stays frozen (docs/DESIGN_RULES_PLAN.md §2).
          rules: { target: { profile: input.profile }, mode: input.legibility },
          previous: input.previous ?? undefined,
        });
        return {
          template: result.template,
          emitted: { name: result.emitted?.name, type: result.emitted?.type, summary: result.emitted?.summary },
          validation: {
            ok: result.validation.ok,
            errors: result.validation.errors.map((e) => `${e.rule}: ${e.message.slice(0, 200)}`),
            warnings: result.validation.warnings.map((e) => `${e.rule}: ${e.message.slice(0, 200)}`),
          },
          fill: result.fill ?? null,
          usage: result.usage,
          costUsd: result.costUsd,
          model: result.model,
        };
      }, {
        brief: entry.brief,
        route,
        decoding,
        brand,
        previous,
        benchOptions: validatorFieldPaints(entry) ? { fieldPaints: true } : {},
        profile: VIEWING_PROFILE,
        legibility: LEGIBILITY_MODE,
      });

      totals.input += emitRes.usage.input;
      totals.output += emitRes.usage.output;
      totals.reasoning += emitRes.usage.reasoning;
      cost += emitRes.costUsd;
      spentUsd += emitRes.costUsd;
      current = emitRes;

      // Save the code the moment it exists (the Phase 0 lesson), one directory per round.
      const codeDir = path.join(OUT, 'code', slug, `round-${round}`);
      await mkdir(codeDir, { recursive: true });
      await Promise.all([
        writeFile(path.join(codeDir, 'index.html'), emitRes.template.html),
        writeFile(path.join(codeDir, 'template.css'), emitRes.template.css),
        writeFile(path.join(codeDir, 'template.js'), emitRes.template.js),
        // The whole SpxTemplate, so the control-drive proof can load the exact emitted
        // graphic into the shipped panel without re-importing from the three files.
        writeFile(path.join(codeDir, 'template.json'), `${JSON.stringify(emitRes.template, null, 2)}\n`),
      ]);

      const data = await page.evaluate(async ({ briefEntry, fill }) => {
        const bust = '?t=' + Date.now();
        const spikeAnchors = await import('/src/ai/spike/anchors.ts' + bust);
        const values = spikeAnchors.dataFor(briefEntry);
        if (fill?.slotFieldId && fill.path) values[fill.slotFieldId] = fill.path;
        return values;
      }, { briefEntry: entry.brief, fill: emitRes.fill });

      const captureOpts = {
        proType: proInstrumentType(entry),
        ticker: sweepType(entry) === 'ticker',
      };
      const capture = await captureAndMeasure(
        emitRes.template, data, emitRes.fill?.slotFieldId ?? null, brand.mark.probe,
        `${slug}.round-${round}.hold.png`,
        {
          ...captureOpts,
          steps: declaredSteps(entry),
          stepPrefix: `${slug}.round-${round}`,
        },
      );
      // THE STRESS FRAMES FEED THE LOOP (§22.1 escape 5: X-35 measured clean and broke under
      // stress; the capture existed and the findings never entered the feed). Two frames: the
      // brief's own long-content stress, and the brief-§9 edge cases.
      const roundStressData = await page.evaluate(async ({ briefEntry, fill }) => {
        const bust = '?t=' + Date.now();
        const spikeAnchors = await import('/src/ai/spike/anchors.ts' + bust);
        const values = spikeAnchors.stressFor(briefEntry);
        if (fill?.slotFieldId && fill.path) values[fill.slotFieldId] = fill.path;
        return values;
      }, { briefEntry: entry.brief, fill: emitRes.fill });
      const stressCapture = await captureAndMeasure(
        emitRes.template, roundStressData, emitRes.fill?.slotFieldId ?? null, brand.mark.probe,
        `${slug}.round-${round}.stress.png`, captureOpts,
      );
      const edgeCapture = await captureAndMeasure(
        emitRes.template, edgeStressValues(entry), emitRes.fill?.slotFieldId ?? null, brand.mark.probe,
        `${slug}.round-${round}.edge.png`, captureOpts,
      );
      // The sentinel step-walk covers what the validator's one-state read cannot (steppers,
      // transform fields) - a quiz that never reveals its answer must fail the loop.
      const paintFindings = validatorFieldPaints(entry) ? [] : await paintWalk(emitRes.template, entry);
      // The shipped-control-page smoke: free, per round, the one check that runs the graphic
      // where an OPERATOR meets it (§23.1's qz-primetime class - airable on the page, not
      // drivable through the panel).
      const controlSmoke = await controlPageSmoke(emitRes.template, `${slug} round ${round}`);
      lastCapture = { ...capture, data, round };

      const frames = [
        { label: '', measured: capture.measured },
        ...capture.stepMeasures.map((s) => ({ label: `on step frame ${s.step}`, measured: s.measured })),
        { label: 'under stress values (long content)', measured: stressCapture.measured },
        { label: 'under edge-case values (zero/empty/Nordic/all-caps)', measured: edgeCapture.measured },
      ];
      const extraBlocking = [];
      if (controlSmoke) extraBlocking.push(controlSmoke);
      if (stressCapture.playError) extraBlocking.push(`under stress values the template threw: ${stressCapture.playError}`);
      if (edgeCapture.playError) extraBlocking.push(`under edge-case values the template threw: ${edgeCapture.playError}`);
      // The owner's no-model-placed-logos ruling, enforced deterministically: a brief that
      // carries no mark must not grow a logo field or placeholder (§22.1 escape 2).
      if (entry.brief.includeLogo === false && emitRes.template.fields.some((f) => f.ftype === 'filelist')) {
        extraBlocking.push('this brief carries NO brand mark - remove the image/logo field and any reserved logo space (the platform owns mark placement)');
      }
      const split = collectFindings(emitRes.validation, capture.playError, frames, {
        advisoryInstruments: instrumentsAdvisory(entry),
        stepFindings: capture.stepFindings,
        paintFindings,
        extraBlocking,
      });
      const findings = feedFindings(split);
      iterationLog.push({
        round,
        findings: split.blocking,
        advisory: split.advisory,
        usage: emitRes.usage,
        costUsd: emitRes.costUsd,
      });
      console.log(`  round ${round}: ${split.blocking.length} blocking / ${split.advisory.length} advisory finding(s)`
        + ` · ${emitRes.usage.input} in / ${emitRes.usage.output} out · $${emitRes.costUsd.toFixed(4)}`);
      for (const f of split.blocking.slice(0, 6)) console.log(`    - ${f.slice(0, 140)}`);

      if (split.blocking.length === 0) {
        deliverable = true;
        break;
      }
      if (round === MAX_ITERATIONS) break;
      if (spentUsd >= maxCost) {
        console.log('  ceiling reached mid-loop - stopping dirty.');
        break;
      }
      const screenshot = vision ? await downscale(capture.shot) : null;
      const critic = await criticAdvisories(screenshot);
      if (critic.costUsd) {
        spentUsd += critic.costUsd;
        cost += critic.costUsd;
      }
      if (critic.advisories.length) {
        findings.push(...critic.advisories);
        iterationLog[iterationLog.length - 1].critic = critic.advisories;
        console.log(`    critic: ${critic.advisories.length} advisory`);
      }
      previous = {
        template: emitRes.template,
        findings,
        ...(screenshot ? { screenshot: { mediaType: 'image/jpeg', base64: screenshot } } : {}),
      };
    }
  } catch (e) {
    error = String(e?.message ?? e).slice(0, 500);
    console.log(`  FAILED: ${error.split('\n')[0]}`);
  }

  if (error && !current) {
    results.push({ slug, kind: 'candidate', arm: 'iterate', error, costUsd: cost || null, ms: Date.now() - started });
    await writeLedger();
    continue;
  }

  // Final frames under the ledger names the galleries expect.
  const holdFile = `${slug}.hold.png`;
  await writeFile(path.join(OUT, holdFile), lastCapture.shot);
  const stressData = await page.evaluate(async ({ briefEntry, fill }) => {
    const bust = '?t=' + Date.now();
    const spikeAnchors = await import('/src/ai/spike/anchors.ts' + bust);
    const values = spikeAnchors.stressFor(briefEntry);
    if (fill?.slotFieldId && fill.path) values[fill.slotFieldId] = fill.path;
    return values;
  }, { briefEntry: entry.brief, fill: current.fill });
  const stress = await captureAndMeasure(
    current.template, stressData, current.fill?.slotFieldId ?? null, brand.mark.probe, `${slug}.stress.hold.png`,
    { proType: proInstrumentType(entry), ticker: sweepType(entry) === 'ticker' },
  );

  const blockingErrors = current.validation.errors.filter((e) => !e.startsWith(`${EDITABILITY_RULE}:`));
  const fields = current.template.fields;
  const textFields = fields.filter((f) => f.ftype === 'textfield' || f.ftype === 'textarea').length;
  const record = {
    slug,
    kind: 'candidate',
    arm: 'iterate',
    type: sweepType(entry),
    brand: brand.id,
    route,
    model: current.model,
    provenance: `${route} · iterate arm (${iterationLog.length} round(s), vision ${vision ? 'on' : 'off'}) · ${sweepType(entry)} · brand ${brand.id}`,
    iterations: iterationLog.length - 1,
    iterationLog,
    deliverable,
    ...(error ? { error } : {}),
    validation: current.validation,
    repairRounds: iterationLog.length - 1,
    contract: {
      textFields,
      expectedTextFields: entry.expect?.textFields ?? 2,
      fieldsOk: textFields >= (entry.expect?.textFields ?? 2),
      logoExpected: entry.brief.includeLogo !== false,
      logoSlot: Boolean(current.fill?.slotFieldId),
      blockingErrors,
      scaffoldOk: blockingErrors.length === 0 && textFields >= (entry.expect?.textFields ?? 2)
        && (entry.brief.includeLogo === false || Boolean(current.fill?.slotFieldId)),
    },
    fill: current.fill,
    emitted: current.emitted,
    hold: holdFile,
    stressHold: `${slug}.stress.hold.png`,
    ...(lastCapture.playError ? { playError: lastCapture.playError } : {}),
    ...(lastCapture.measured?.spacing ? { spacingReport: lastCapture.measured.spacing } : {}),
    ...(lastCapture.measured?.proportion ? { proportionReport: lastCapture.measured.proportion } : {}),
    ...(lastCapture.measured?.device ? { deviceReport: lastCapture.measured.device } : {}),
    ...(lastCapture.measured?.mark ? { markReport: lastCapture.measured.mark } : {}),
    ...(lastCapture.measured?.readability ? { readabilityReport: lastCapture.measured.readability } : {}),
    ...(lastCapture.stepFrames?.length ? { stepFrames: lastCapture.stepFrames } : {}),
    ...(stress.playError ? { stressPlayError: stress.playError } : {}),
    usage: totals,
    costUsd: cost,
    frames: [],
    ms: Date.now() - started,
  };
  results.push(record);
  console.log(`  ${deliverable ? 'DELIVERABLE (clean)' : 'NOT DELIVERABLE (stopped dirty)'}`
    + ` · ${iterationLog.length} round(s) · tokens ${totals.input} in / ${totals.output} out`
    + `${totals.reasoning ? ` (${totals.reasoning} reasoning)` : ''} · $${cost.toFixed(4)} · ${record.ms} ms`);
  await writeLedger();
}

await browser.close();
const done = results.filter((r) => !r.error && !r.skipped);
console.log(`\n${done.length} candidate(s), ${done.filter((r) => r.deliverable).length} clean,`
  + ` ${done.filter((r) => !r.deliverable).length} stopped dirty · spent ~$${spentUsd.toFixed(3)} of $${maxCost.toFixed(2)}.`);
console.log(`Ledger: ${ledgerPath}`);
