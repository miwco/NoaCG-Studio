#!/usr/bin/env node
// WHAT DOES THE SHIPPED CATALOG DO ABOUT TEXT PAINTED OVER? FREE - no model call, no tokens.
//
//   node scripts/occlusion-sweep.mjs                    # every design in the catalog
//   node scripts/occlusion-sweep.mjs --category=lower-third
//   node scripts/occlusion-sweep.mjs --ids=lt11,sb01 --stress
//
// WHY A SWEEP BEFORE A RULE. `src/validation/occlusion.ts` measures a defect nothing in this
// repo has ever measured, and the bench it would join is a GATE the whole catalog must pass
// (e2e/catalog/catalog-bench.spec.ts). A threshold picked before knowing what 490 shipped
// designs read would be taste wearing a number's name, and a rule that fires on the house's own
// artifacts is one authors learn to ignore - the argument `spacingCheck` already makes twice.
//
// So: measure first, print the distribution, and let the committed threshold be read off it.
// `--stress` measures the same designs under doubled values, because that is where a panel
// grown by long text starts covering the line beside it.
//
// Requires the dev server on this checkout's port (node scripts/dev-port.mjs).

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { devPort } from './dev-port.mjs';

const args = process.argv.slice(2);
const value = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? null;
const CONTROL = args.includes('--control');
const CATEGORY = value('category');
const IDS = (value('ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const STRESS = args.includes('--stress');
const OUT = path.resolve(value('out') ?? 'benchmarks/pro/v1/spike/occlusion-sweep.json');

const BASE = `http://localhost:${devPort()}`;
try {
  await fetch(`${BASE}/app`, { signal: AbortSignal.timeout(4000) });
} catch {
  console.error(`Dev server not reachable at ${BASE} - start it first (npm run dev).`);
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (error) => console.log('  pageerror:', error.message));
await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
await page.locator('.topbar').waitFor();
await page.locator('.wz-modal').waitFor({ state: 'visible', timeout: 20_000 }).catch(() => undefined);
await page.keyboard.press('Escape');
await page.locator('.wz-modal').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);

// ── --control: PROVE THE PROBE CAN FIRE, AND THAT IT DOES NOT FIRE ON A TINT ──────────────
//
// A sweep that reports zero over the whole catalog is either good news or a broken instrument,
// and nothing in the number itself says which. So the control mounts ONE shipped design three
// times and mutates the frame between them: an opaque panel dropped over the name must read as
// covered, the same panel at a third of the opacity must not, and a gradient scrim laid over the
// text must not either - the commonest legitimate construction in broadcast, and the false
// positive that would make this rule unusable.
if (CONTROL) {
  const cases = [
    ['an OPAQUE panel over the name', 'background:#101418;opacity:1', true],
    ['the same panel at 0.3 opacity - a tint reads through', 'background:#101418;opacity:0.3', false],
    ['a gradient scrim over the text', 'background:linear-gradient(to top, rgba(0,0,0,.9), transparent)', false],
  ];
  let failed = 0;
  for (const [name, css, expected] of cases) {
    const got = await page.evaluate(async ({ css: style }) => {
      const bust = '?t=' + Date.now();
      const cat = await import('/src/templates/catalog.ts' + bust);
      const { composeDocument } = await import('/src/preview/composeDocument.ts' + bust);
      const { measureOcclusion } = await import('/src/validation/occlusion.ts' + bust);
      const template = cat.variantById('lt11').create({});
      document.getElementById('occlusion-frame')?.remove();
      const frame = document.createElement('iframe');
      frame.id = 'occlusion-frame';
      frame.style.cssText = 'position:fixed;left:0;top:0;width:1920px;height:1080px;border:0;'
        + 'z-index:99999;background:#333;color-scheme:dark;';
      document.body.appendChild(frame);
      frame.srcdoc = composeDocument(template);
      await new Promise((resolve) => { frame.onload = resolve; });
      const win = frame.contentWindow;
      try { win.play(); } catch { /* a broken lifecycle still paints - measure what is there */ }
      await win.document.fonts.ready;
      await new Promise((resolve) => setTimeout(resolve, 1800));
      const doc = frame.contentDocument;
      const target = doc.getElementById('f0');
      const r = target.getBoundingClientRect();
      const cover = doc.createElement('div');
      cover.className = 'control-cover';
      cover.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;`
        + `height:${r.height}px;z-index:99;${style}`;
      doc.body.appendChild(cover);
      const readings = measureOcclusion(win, [target]);
      frame.remove();
      return readings.map((x) => ({ el: x.el, share: x.coveredShare, by: x.coveredBy }));
    }, { css });
    const fired = got.some((x) => x.share > 0.5);
    const ok = fired === expected;
    if (!ok) failed += 1;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} · ${name} → ${fired ? `covered ${(got[0].share * 100).toFixed(0)}% by ${got[0].by.join('/')}` : 'not covered'}`
      + ` (expected ${expected ? 'covered' : 'not covered'})`);
  }
  if (failed) {
    console.error(`\nCONTROL FAILED: ${failed} case(s) - the probe does not measure what it claims.`);
    process.exitCode = 1;
  } else {
    console.log('\nControl passed: the probe fires on an opaque cover and stays quiet on a tint and a scrim.');
  }
  await browser.close();
  process.exit(process.exitCode ?? 0);
}

// The target set is the CATALOG's own registry, never a list kept here - the rule every sweep
// beside this one states.
const targets = await page.evaluate(async ({ category, ids }) => {
  const cat = await import('/src/templates/catalog.ts?t=' + Date.now());
  const out = [];
  for (const [key, list] of Object.entries(cat.CATALOG)) {
    if (category && key !== category) continue;
    for (const variant of list ?? []) {
      if (ids.length && !ids.includes(variant.id)) continue;
      out.push({ id: variant.id, category: key });
    }
  }
  return out;
}, { category: CATEGORY, ids: IDS });

if (!targets.length) {
  console.error('No designs selected.');
  await browser.close();
  process.exit(2);
}
console.log(`Sweeping ${targets.length} shipped design(s)${STRESS ? ', stress values' : ''}…\n`);

const rows = [];
for (const target of targets) {
  const row = await page.evaluate(async ({ variantId, stress }) => {
    const bust = '?t=' + Date.now();
    const cat = await import('/src/templates/catalog.ts' + bust);
    const { composeDocument } = await import('/src/preview/composeDocument.ts' + bust);
    const { measureOcclusion } = await import('/src/validation/occlusion.ts' + bust);
    // The BENCH's own leaf set and dynamics exemption, imported rather than re-derived: a
    // calibration that decided for itself what a leaf is would be setting a number for a frame
    // the gate does not measure.
    const { collectLeaves, dynamicsRoots } = await import('/src/validation/runtimeBench.ts' + bust);
    const variant = cat.variantById(variantId);
    if (!variant) return { id: variantId, error: 'gone' };
    const template = variant.create({});
    document.getElementById('occlusion-frame')?.remove();
    const frame = document.createElement('iframe');
    frame.id = 'occlusion-frame';
    frame.style.cssText = 'position:fixed;left:0;top:0;width:1920px;height:1080px;border:0;'
      + 'z-index:99999;background:#333;color-scheme:dark;';
    document.body.appendChild(frame);
    frame.srcdoc = composeDocument(template);
    await new Promise((resolve) => { frame.onload = resolve; });
    const win = frame.contentWindow;
    // The design's OWN sample data, doubled under --stress the way the bench doubles it - a
    // panel that covers its neighbour only once the text is long is the case this sweep is
    // most interested in.
    const data = {};
    for (const f of template.fields ?? []) {
      const v = f.value ?? '';
      data[f.field] = stress && typeof v === 'string' && v.trim() && !/^[\d\s.:+-]+$/.test(v)
        ? `${v} ${v}`
        : v;
    }
    let playError = null;
    try {
      win.update(JSON.stringify(data));
      win.play();
    } catch (e) {
      playError = String(e?.message ?? e).slice(0, 160);
    }
    await win.document.fonts.ready;
    await new Promise((resolve) => setTimeout(resolve, 1800));
    const leaves = collectLeaves(win);
    const exempt = dynamicsRoots(template, win);
    const readings = measureOcclusion(win, leaves, exempt);
    frame.remove();
    return { id: variantId, playError, leaves: leaves.length, exempt: exempt.length, readings };
  }, { variantId: target.id, stress: STRESS });
  rows.push({ ...target, ...row });
  const worst = (row.readings ?? []).reduce((m, r) => Math.max(m, r.coveredShare), 0);
  if (worst > 0) {
    console.log(`  ${row.id.padEnd(7)} ${(worst * 100).toFixed(1).padStart(5)}% covered · `
      + row.readings.map((r) => `${r.el} by ${r.coveredBy.join('/')} (${(r.coveredShare * 100).toFixed(0)}%)`).join('; '));
  }
}

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify({ stress: STRESS, category: CATEGORY, rows }, null, 2)}\n`);

// ── The distribution a threshold can be read off ──────────────────────────────────────────
const withReadings = rows.filter((r) => (r.readings ?? []).length);
const shares = rows.flatMap((r) => (r.readings ?? []).map((x) => x.coveredShare)).sort((a, b) => a - b);
console.log(`\n── ${rows.length} design(s), ${rows.filter((r) => r.error).length} unresolvable ──`);
console.log(`  ${withReadings.length} design(s) have ANY covered text`);
for (const band of [0.02, 0.1, 0.25, 0.5, 0.9]) {
  const hit = rows.filter((r) => (r.readings ?? []).some((x) => x.coveredShare > band));
  console.log(`  covered share > ${String(band).padEnd(4)} : ${String(hit.length).padStart(3)} design(s)`
    + `${hit.length && hit.length <= 12 ? ` - ${hit.map((r) => r.id).join(', ')}` : ''}`);
}
if (shares.length) {
  const at = (p) => shares[Math.min(shares.length - 1, Math.floor(p * shares.length))];
  console.log(`  readings n=${shares.length} min ${shares[0]} p50 ${at(0.5)} p90 ${at(0.9)} max ${shares.at(-1)}`);
}
console.log(`\nWritten ${path.relative(process.cwd(), OUT)}`);

await browser.close();
