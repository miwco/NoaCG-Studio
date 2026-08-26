// Shared browser-side compile driver for the FREE benchmark modes (calibration,
// regression). Loads the dev server's /app page and compiles decisions through
// src/ai/lite/pipeline.ts compileLiteDecision - the SAME function production is built
// from - then optionally captures a settled screenshot and a short motion clip.
// No provider is ever contacted; the only network traffic is the local dev server.

import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, rename, unlink } from 'node:fs/promises';
import path from 'node:path';

const FFMPEG = (process.env.FFMPEG_PATH ?? 'ffmpeg').trim() || 'ffmpeg';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore', windowsHide: true });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}

async function trimMotionVideo(rawPath, finalPath, startSeconds) {
  try {
    await run(FFMPEG, [
      '-y',
      // Cut 1.0s before play, inside the stage's guaranteed 1.5s CLEAR HOLD (see the
      // wait before play below): the wall-clock -> video-clock mapping drifts by the
      // recorder's startup latency, so a tight cut clipped into the entrance (first
      // frame showed a half-drawn graphic) and a naive wide one reached back past the
      // stage swap (first frame showed the app UI). The recording ends after stop()
      // settles and there is no duration cap, so the last frame stays clear too.
      '-ss', Math.max(0, startSeconds - 1.0).toFixed(3),
      '-i', rawPath,
      '-an',
      '-c:v', 'libvpx-vp9',
      '-crf', '22',
      '-b:v', '0',
      finalPath,
    ]);
    await unlink(rawPath).catch(() => {});
  } catch {
    await unlink(finalPath).catch(() => {});
    await rename(rawPath, finalPath);
  }
}

export async function assertDevServer(base) {
  const ok = await fetch(`${base}/app`, { method: 'GET' }).then((r) => r.ok).catch(() => false);
  if (!ok) {
    console.error(`No dev server answering at ${base}. Start it with: npm run dev`);
    process.exit(1);
  }
}

/**
 * Compile one decision through the production pipeline inside the app page.
 * Returns { ok, ruleCodes, warnings, category, variantId, fieldCount }.
 */
async function compileInPage(page, decision) {
  return page.evaluate(async ({ spec, skin }) => {
    const { compileLiteDecision } = await import('/src/ai/lite/pipeline.ts');
    const { composeDocument } = await import('/src/preview/composeDocument.ts');
    const context = {
      images: [],
      palette: null,
      resolution: { width: 1920, height: 1080, label: '1080p' },
      fps: 50,
    };
    const result = await compileLiteDecision(spec, context, skin ?? undefined);
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;width:1920px;height:1080px;overflow:hidden;background:radial-gradient(circle at 35% 20%,#334155,#111827 58%,#05070a)';
    const frame = document.createElement('iframe');
    frame.id = 'lite-bench-frame';
    frame.style.cssText = 'position:absolute;inset:0;width:1920px;height:1080px;border:0;background:transparent';
    await new Promise((resolve) => {
      frame.onload = resolve;
      frame.srcdoc = composeDocument(result.template);
      document.body.appendChild(frame);
    });
    return {
      ok: result.validation.ok,
      ruleCodes: result.validation.errors.map((error) => error.rule),
      warningCodes: result.validation.warnings.map((warning) => warning.rule),
      category: result.spec.category,
      variantId: result.spec.variantId ?? null,
      skinApplied: result.skinApplied,
      skinOutcome: result.skinOutcome,
      holdFindings: result.holdFindings,
      attemptedVariantIds: result.attemptedVariantIds,
      fieldCount: result.template.fields.length,
    };
  }, { spec: decision.spec, skin: decision.skin ?? null });
}

/**
 * Measure the assembled context sizes once per run - the benchmark's answer to "what
 * does catalog growth cost". Tokens are approximated as chars/4; the trend across runs
 * is the signal, not the absolute number.
 */
async function measureContext(page) {
  return page.evaluate(async () => {
    const t = (s) => Math.round(s.length / 4);
    const contract = await import('/src/ai/lite/contract.ts');
    const { catalogDigest } = await import('/src/ai/designSpec.ts');
    const system = contract.liteSystemPrompt('measure');
    const digest = contract.liteCatalogDigest();
    const schema = JSON.stringify(contract.LITE_READY_OUTPUT.schema);
    const fullDigest = catalogDigest();
    return {
      liteVariants: contract.LITE_CATALOG.length,
      liteSystemTokens: t(system),
      liteCatalogDigestTokens: t(digest),
      liteSchemaTokens: t(schema),
      liteTotalStaticTokens: t(system) + t(schema),
      fullHarnessDigestTokens: t(fullDigest),
    };
  });
}

/**
 * Run a list of compile jobs. Each job: { id, arm, briefId, decision }.
 * options: { base, outDir, capture, label } - capture writes <label>-<id>.png/.webm.
 */
export async function runCompileJobs(jobs, { base, outDir, capture = false, label = 'bench' }) {
  await assertDevServer(base);
  if (capture) await mkdir(path.join(outDir, '.raw-video'), { recursive: true });
  const browser = await chromium.launch();
  const rows = [];
  let context_ = null;
  try {
    for (const job of jobs) {
      const started = Date.now();
      const browserContext = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        ...(capture
          ? { recordVideo: { dir: path.join(outDir, '.raw-video'), size: { width: 1920, height: 1080 } } }
          : {}),
      });
      const page = await browserContext.newPage();
      const video = capture ? page.video() : null;
      const recordingStarted = Date.now();
      try {
        await page.goto(`${base}/app`, { waitUntil: 'domcontentloaded' });
        if (!context_) context_ = await measureContext(page);
        const measured = await compileInPage(page, job.decision);
        let files = {};
        if (capture) {
          // The CLEAR HOLD the clip trim anchors into: the stage is built and the graphic
          // is CSS-hidden, so these frames are the honest clear-before-cue state.
          await page.waitForTimeout(1500);
          const motionStarted = Date.now();
          await page.evaluate(() => document.querySelector('#lite-bench-frame')?.contentWindow?.play());
          await page.waitForTimeout(1100);
          const screenshotFile = `${label}-${job.id}.png`;
          await page.screenshot({ path: path.join(outDir, screenshotFile) });
          await page.evaluate(() => document.querySelector('#lite-bench-frame')?.contentWindow?.stop());
          await page.waitForTimeout(900);
          await page.close();
          await browserContext.close();
          files = { screenshotFile };
          if (video) {
            const motionFile = `${label}-${job.id}.webm`;
            await trimMotionVideo(
              await video.path(),
              path.join(outDir, motionFile),
              (motionStarted - recordingStarted) / 1000,
            );
            files.motionFile = motionFile;
          }
        }
        rows.push({ ...job.meta, id: job.id, arm: job.arm, briefId: job.briefId, ...measured, ...files, ms: Date.now() - started });
        console.log(`- ${job.arm}/${job.id}: ${measured.ok ? 'machine-valid' : `INVALID (${measured.ruleCodes.join(', ')})`}`);
      } catch (error) {
        rows.push({
          ...job.meta,
          id: job.id,
          arm: job.arm,
          briefId: job.briefId,
          ok: false,
          compileError: error instanceof Error ? error.message.slice(0, 200) : 'unknown',
          ms: Date.now() - started,
        });
        console.log(`- ${job.arm}/${job.id}: COMPILE ERROR`);
      } finally {
        if (!page.isClosed()) await page.close().catch(() => {});
        await browserContext.close().catch(() => {});
      }
    }
  } finally {
    await browser.close();
  }
  return { rows, context: context_ };
}
