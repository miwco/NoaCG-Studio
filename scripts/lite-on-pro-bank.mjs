#!/usr/bin/env node
// NoaCG Lite over the PRO brief bank - the like-for-like half of the Pro feasibility round.
//
//   node scripts/lite-on-pro-bank.mjs [--max-cost=0.1] [id,id,…]
//
// Runs the SAME twelve briefs the Pro bank carries (benchmarks/pro/v1/briefs.json), through the
// Lite tier, in the same page, through the same production validator, photographed the same way
// at the same hold.
// That sameness is the whole point: a Pro-vs-Lite comparison assembled from two rigs measures
// the rigs as much as the tiers.
//
// SPENDS REAL MONEY, but roughly a two-hundredth of the Pro half (~$0.0003 a generation).
// Requires the dev server on this checkout's port and a Lite-enabled .env.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { devPort } from './dev-port.mjs';
import { readEnvFile } from './ai-bench-server.mjs';

const BASE = `http://localhost:${devPort()}`;
const OUT = path.resolve('lite-on-pro-out');
const BANK = path.resolve('benchmarks/pro/v1/briefs.json');

const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith('--'))?.split(',').filter(Boolean) ?? null;

const bank = JSON.parse(await readFile(BANK, 'utf8'));
const briefs = bank.briefs.filter((entry) => !only || only.includes(entry.id));

/** The Pro brief is typed (brief/name/title/includeLogo); Lite takes prose. This is the ONE
 *  place the two vocabularies meet, and it is deterministic so neither tier is handed a
 *  better-written version of the same request. */
function proseFor(entry) {
  const parts = [entry.brief.brief.trim()].filter(Boolean);
  parts.push(`A lower third naming "${entry.brief.name}" with the role line "${entry.brief.title}".`);
  if (entry.brief.includeLogo) parts.push('Leave room for a channel logo.');
  return parts.join(' ');
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (error) => console.log('  pageerror:', error.message));
await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
await page.locator('.topbar').waitFor();

const fileEnv = await readEnvFile();
const creds = {
  email: (process.env.E2E_EMAIL ?? fileEnv.E2E_EMAIL ?? '').trim(),
  password: (process.env.E2E_PASSWORD ?? fileEnv.E2E_PASSWORD ?? '').trim(),
};
if (creds.email && creds.password) {
  await page.locator('.wz-modal').waitFor({ state: 'visible', timeout: 20_000 });
  await page.keyboard.press('Escape');
  await page.locator('.wz-modal').waitFor({ state: 'hidden', timeout: 10_000 });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click({ timeout: 10_000 });
  await page.locator('#auth-email').fill(creds.email);
  await page.locator('#auth-pass').fill(creds.password);
  await page.locator('.auth-card').getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.locator('.auth-status').waitFor({ state: 'visible', timeout: 20_000 });
  console.log('Signed in for the Lite profile.');
} else {
  console.error('Lite needs a signed-in caller (the ai.lite entitlement). Set E2E_EMAIL/E2E_PASSWORD.');
  process.exit(1);
}

const results = [];
for (const entry of briefs) {
  const started = Date.now();
  console.log(`\n── ${entry.id} ──`);
  let outcome;
  try {
    outcome = await page.evaluate(async (input) => {
      const bust = `?t=${Date.now()}`;
      const { getAiProvider } = await import(`/src/ai/index.ts${bust}`);
      const { productionSpxValidator } = await import(`/src/ai/lite/pipeline.ts${bust}`);
      const validate = productionSpxValidator();
      const context = { images: [], palette: null, resolution: { width: 1920, height: 1080 }, fps: 50 };
      let change;
      try {
        change = await getAiProvider('lite').generate(input.prose, context, { validate, profile: 'lite' });
      } catch (error) {
        return { error: String(error).slice(0, 300) };
      }
      const t = change.template;
      const fieldValues = t.fields.map((f) => String(f.value ?? ''));
      const checks = {
        validationOk: change.validation ? change.validation.ok : true,
        validationErrors: change.validation ? change.validation.errors.map((e) => `${e.rule}: ${e.message.slice(0, 140)}`) : [],
        textFields: t.fields.filter((f) => f.ftype === 'textfield').length,
        variantId: change.spec?.variantId ?? null,
        fieldValues,
      };

      // Drive the operator's real values in, exactly as the Pro bench does, then photograph
      // the settled hold. A tier that keeps the design but cannot carry the name is not
      // comparable to one that carries it - so both halves are measured on the same values.
      const { composeDocument } = await import(`/src/preview/composeDocument.ts${bust}`);
      const frame = document.createElement('iframe');
      frame.id = 'lite-bench-frame';
      frame.style.cssText = 'position:fixed;left:0;top:0;width:1920px;height:1080px;border:0;z-index:99999;background:#333;';
      document.body.appendChild(frame);
      frame.srcdoc = composeDocument(t);
      await new Promise((resolve) => { frame.onload = resolve; });
      await new Promise((resolve) => setTimeout(resolve, 400));
      const win = frame.contentWindow;
      const text = t.fields.filter((f) => f.ftype === 'textfield');
      const values = Object.fromEntries(t.fields.map((f) => [f.field, f.value ?? '']));
      if (text[0]) values[text[0].field] = input.name;
      if (text[1]) values[text[1].field] = input.title;
      win.update(JSON.stringify(values));
      win.play();
      await win.document.fonts.ready;
      await new Promise((resolve) => setTimeout(resolve, 1800));
      return { checks };
    }, { prose: proseFor(entry), name: entry.brief.name, title: entry.brief.title });
  } catch (error) {
    console.log(`  FAILED: ${error.message.split('\n')[0]}`);
    results.push({ id: entry.id, error: error.message.slice(0, 300) });
    await page.evaluate(() => document.getElementById('lite-bench-frame')?.remove()).catch(() => undefined);
    continue;
  }
  if (outcome.error) {
    console.log(`  FAILED: ${outcome.error.split('\n')[0]}`);
    results.push({ id: entry.id, error: outcome.error, ms: Date.now() - started });
    continue;
  }
  await page.frameLocator('#lite-bench-frame').locator('body').screenshot({ path: path.join(OUT, `${entry.id}.png`) });
  await page.evaluate(() => document.getElementById('lite-bench-frame')?.remove());
  const record = { id: entry.id, ...outcome.checks, ms: Date.now() - started };
  results.push(record);
  console.log(`  ${record.validationOk ? 'OK' : 'INVALID'} · ${record.variantId} · fields ${record.textFields} · ${record.ms} ms`);
  await writeFile(path.join(OUT, 'results.json'), JSON.stringify({ base: BASE, results }, null, 2));
}

const rows = results.map((r) => `
  <section><h2>${r.id} <small>${r.error ? 'ERROR' : r.validationOk ? 'valid' : 'INVALID'}${r.variantId ? ` · ${r.variantId}` : ''}</small></h2>
  ${r.error ? `<pre>${r.error}</pre>` : `<img src="${r.id}.png">`}</section>`).join('\n');
await writeFile(path.join(OUT, 'review.html'), `<!doctype html><meta charset="utf-8">
<title>NoaCG Lite on the Pro brief bank</title>
<style>body{background:#101216;color:#e8e9ec;font:14px system-ui;padding:24px}img{max-width:70vw;border:1px solid #333}
small{color:#9aa0ab}pre{color:#9aa0ab;white-space:pre-wrap}</style>
<h1>NoaCG Lite — the same twelve briefs the Pro bench runs</h1>${rows}`);

const ok = results.filter((r) => !r.error && r.validationOk).length;
console.log(`\n${ok}/${results.length} valid.\nReview: ${path.join(OUT, 'review.html')}`);
await browser.close();
