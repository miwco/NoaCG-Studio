// THE TASTE FRAME REVIEW - render the graphic, so the session can LOOK at it before it ships.
//
// Why this exists. Owner, 2026-09-03, after a day of judging graphics by hand: "I've been giving
// feedback for hours on how a text should be centered and look good, and how text inside a box
// should live inside a box and not go outside of the boundaries... I realized that I shouldn't
// need to say these things because if you just look at it yourself, you would notice how it
// should look." Every source-level check in this repo passes a visibly broken graphic; the five
// catalog gates measure numbers off the rendered frame and still cannot say whether it looks
// right. What was missing was not the eye but the TRIGGER: nothing made a session render its own
// output and answer a small written instrument. This script is the rendering half of that
// trigger; `docs/VISUAL_TASTE_REVIEW.md` is the instrument, and `.agent-workflows/check.md`
// phase 4 is where it fires.
//
// It writes PNG frames and prints the questions. It asserts NOTHING - a person (or the session)
// answers the questions by looking, which is the whole point. Per design:
//   hold.png     the graphic with its own defaults, entrance settled, motion frozen
//   long.png     every text field lengthened the way an operator would (the text-containment
//                recipe: 1.7x its own sample, real words), every number three wide digits
//   step-N.png   each `next()` step, where the design has steps
// The bed is #333 - the same grey the owner's 2026-08-18 blind read used, so a frame here can be
// held against the frames he already judged.
//
// Usage (a dev server for THIS checkout must be running - `npm run dev:worktree`):
//   node scripts/taste-frame-review.mjs [out-dir] --only lt27,tk01   # named catalog designs
//   node scripts/taste-frame-review.mjs [out-dir] --affected         # what this branch's diff can move
//   node scripts/taste-frame-review.mjs [out-dir] --svg <file.svg>   # an SVG import, zero-interaction defaults
//   node scripts/taste-frame-review.mjs [out-dir] --base http://localhost:5186
//
// `--affected` reads the same plan `npm run catalog:affected` does. A slice renders the named
// designs; a FULL verdict (shared machinery moved) is refused rather than rendering 500 designs -
// name the ones you changed with --only. A diff touching the SVG import road renders the owner's
// own quiz board as well, because that is the graphic he has walked three times this week and
// the one this instrument was asked for.
//
// `--svg` mounts the import with NO wizard choices: every text layer a field, every box staying
// as drawn. That is the student's zero-interaction case and the quiz-board case; a banner meant
// to GROW with its text is driven through the real door by `scripts/svg-import-sweep.mjs --shots`.
//
// The out-dir defaults to ./shots-taste, which the repo's `shots-*/` ignore rule already covers.
// It drives Chromium over the app, so it is BROWSER WORK: `npm run queue -- "<command>"`, never a
// foreground run beside a suite (AGENTS.md "Verifying changes" rule 3, scripts/command-match.mjs).
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { devPort } from './dev-port.mjs';
import { outDir } from './out-dir.mjs';
import { parseOnly } from './catalog-scope.mjs';

/** The graphic the owner judges this week (docs/TEXT_BOX_BINDING.md). Rendered on --affected
 *  whenever the change can move an imported design. */
const OWNER_BOARD = fileURLToPath(
  new URL('../e2e/fixtures/svg-corpus/illustrator-owner-quiz-board-rotated.svg', import.meta.url),
);
/** Changes here move what an IMPORTED graphic looks like, which no catalog id can name. */
const IMPORT_ROAD = /^src\/(templates\/importedDesign\/|assets\/svg)/;

const args = process.argv.slice(2);
const flagValue = (name) => {
  const at = args.indexOf(name);
  return at >= 0 ? (args[at + 1] ?? null) : null;
};
const positional = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const OUT = outDir(
  positional[0],
  './shots-taste',
  'Usage: node scripts/taste-frame-review.mjs [out-dir] --only lt27,tk01 | --affected | --svg <file>',
);
const { ids: onlyIds } = parseOnly(args);
const affected = args.includes('--affected');
const svgFile = flagValue('--svg');
const BASE = flagValue('--base') ?? `http://localhost:${devPort()}`;

if (!onlyIds && !affected && !svgFile) {
  console.error('Nothing to render. Name designs with --only, a file with --svg, or pass --affected.');
  process.exit(2);
}

// ── What to render ─────────────────────────────────────────────────────────────────────────
/** @type {{ kind: 'catalog', id: string }[] | { kind: 'svg', file: string }[]} */
const targets = [];
if (onlyIds) for (const id of onlyIds) targets.push({ kind: 'catalog', id });
if (svgFile) targets.push({ kind: 'svg', file: resolve(svgFile) });
if (affected) {
  const { planForWorkingTree } = await import('./catalog-affected.mjs');
  const plan = await planForWorkingTree();
  if (plan.mode === 'full') {
    console.error(
      'taste-frame-review: this change moves shared machinery, so every design can look different:\n' +
        plan.escalatedBy.map((f) => `  - ${f}`).join('\n') +
        '\nRendering all of them is not a review anybody reads. Name the designs you changed or ' +
        'looked at with --only (one per affected category is the honest minimum).',
    );
    process.exit(2);
  }
  for (const id of plan.ids) if (!targets.some((t) => t.kind === 'catalog' && t.id === id)) targets.push({ kind: 'catalog', id });
  if (plan.changed.some((f) => IMPORT_ROAD.test(f)) && !targets.some((t) => t.kind === 'svg')) {
    targets.push({ kind: 'svg', file: OWNER_BOARD });
  }
  if (targets.length === 0) {
    console.log('taste-frame-review: nothing in this change can move what a graphic looks like - nothing to look at.');
    process.exit(0);
  }
}

// ── The rig ────────────────────────────────────────────────────────────────────────────────
try {
  await fetch(`${BASE}/app`, { signal: AbortSignal.timeout(4000) });
} catch {
  console.error(`Dev server not reachable at ${BASE} - start it first (npm run dev:worktree).`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
await page.locator('.topbar').waitFor();
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// One mount-and-shoot rig in the page, shared by both kinds of target. The iframe is the same
// composed document the studio previews and the export ships (composeDocument), on the same bed
// the owner's blind frames were shot on.
await page.evaluate(async () => {
  const bust = '?t=' + Date.now();
  window.__cat = await import('/src/templates/catalog.ts' + bust);
  window.__comp = await import('/src/preview/composeDocument.ts' + bust);
  window.__svgImport = await import('/src/assets/svgImport.ts' + bust);
  window.__svgDesign = await import('/src/templates/importedDesign/svg.ts' + bust);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const FILL = ['Wisniewska', 'district', 'provisional', 'afternoon', 'coverage', 'regional'];

  /** The operator's realistic worst case, per field, against its OWN sample. */
  window.__longValues = (win) => {
    const data = {};
    for (const fd of (win.SPXGCTemplateDefinition || {}).DataFields || []) {
      const sample = String(fd.value ?? '').trim();
      if (fd.ftype === 'number') {
        data[fd.field] = '8'.repeat(Math.max(3, sample.length));
        continue;
      }
      if (fd.ftype !== 'textfield' && fd.ftype !== 'textarea') continue;
      if (!sample) continue;
      let value = sample;
      const target = Math.max(sample.length + 8, Math.round(sample.length * 1.7));
      for (let i = 0; value.length < target; i += 1) value += ' ' + FILL[i % FILL.length];
      data[fd.field] = value;
    }
    return data;
  };

  /** Mount a template full-frame over the grey bed, settle it, and hand back its window. */
  window.__mount = async (template) => {
    document.getElementById('taste-stage')?.remove();
    const host = document.createElement('div');
    host.id = 'taste-stage';
    host.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#333;overflow:hidden';
    const frame = document.createElement('iframe');
    frame.style.cssText = 'width:1920px;height:1080px;border:0;display:block;color-scheme:dark';
    host.appendChild(frame);
    document.body.appendChild(host);
    await new Promise((r) => {
      frame.onload = r;
      frame.srcdoc = window.__comp.composeDocument(template);
    });
    const win = frame.contentWindow;
    await win.document.fonts.ready;
    return win;
  };

  /**
   * Settle, then freeze. A crawl is mid-travel when the shutter opens, so GSAP's global timeline
   * is paused before the shot (the text-containment sweep's rule). `will-change` layers keep the
   * texture they were rasterised with mid-entrance, so they are turned off for the shot and two
   * frames are waited out (cli/src/screenshot.ts, measured 2026-08-16).
   */
  window.__settle = async (win, ms) => {
    await sleep(ms);
    try { win.gsap?.globalTimeline?.pause(); } catch { /* no gsap */ }
    const hint = win.document.createElement('style');
    hint.textContent = '*{will-change:auto !important}';
    win.document.head.appendChild(hint);
    await new Promise((r) => win.requestAnimationFrame(() => win.requestAnimationFrame(r)));
  };
  window.__unfreeze = (win) => {
    try { win.gsap?.globalTimeline?.resume(); } catch { /* no gsap */ }
  };
});

const shoot = (file) => page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1920, height: 1080 } });

/** Build the template for one target inside the page and leave it as window.__template. */
async function build(target) {
  if (target.kind === 'catalog') {
    return page.evaluate((id) => {
      const variant = window.__cat.variantById(id);
      if (!variant) return { error: `the catalog does not ship "${id}"` };
      window.__template = variant.create({});
      return { name: variant.name, category: variant.category };
    }, target.id);
  }
  const source = readFileSync(target.file, 'utf8');
  return page.evaluate((markup) => {
    const result = window.__svgImport.importSvgMarkup(markup);
    // Every detected text layer is a field, exactly as the mapping step defaults it. No growth
    // rule, no behaviour, no outline replacement: the file as the designer drew it.
    window.__template = window.__svgDesign.IMPORTED_SVG.create({
      designSvg: {
        markup: result.markup,
        width: result.width,
        height: result.height,
        fields: result.candidates.map((c) => ({
          candidateId: c.id,
          title: c.label || 'Text',
          sample: c.sample,
          numeric: c.numeric,
          countdown: false,
        })),
        images: [],
        outlines: [],
        fonts: result.fonts.map((f) => ({ family: f.family })),
      },
    });
    return { name: `imported ${result.width}x${result.height}`, category: 'imported-design', fields: result.candidates.length };
  }, source);
}

const manifest = [];
for (const target of targets) {
  const key = target.kind === 'catalog' ? target.id : basename(target.file, '.svg');
  const dir = join(OUT, key);
  mkdirSync(dir, { recursive: true });
  const built = await build(target);
  if (built.error) {
    console.error(`  ! ${key}: ${built.error}`);
    continue;
  }
  const frames = [];

  // HOLD: the design on its own defaults.
  const steps = await page.evaluate(async () => {
    const win = await window.__mount(window.__template);
    try { win.play?.(); } catch { /* a design that throws still paints something */ }
    await window.__settle(win, 2200);
    return Number((win.SPXGCTemplateDefinition || {}).steps || 1);
  });
  await shoot(join(dir, 'hold.png'));
  frames.push('hold.png');

  // STEPS: every `next()` the design answers to, on the same mount.
  for (let k = 1; k < steps; k += 1) {
    const advanced = await page.evaluate(async () => {
      const win = document.querySelector('#taste-stage iframe').contentWindow;
      if (typeof win.next !== 'function') return false;
      window.__unfreeze(win);
      try { win.next(); } catch { return false; }
      await window.__settle(win, 1300);
      return true;
    });
    if (!advanced) break;
    await shoot(join(dir, `step-${k}.png`));
    frames.push(`step-${k}.png`);
  }

  // LONG: a fresh mount with every field at its realistic worst, then the entrance.
  const lengthened = await page.evaluate(async () => {
    const win = await window.__mount(window.__template);
    const data = window.__longValues(win);
    try { if (Object.keys(data).length) win.update(JSON.stringify(data)); } catch { /* not a text graphic */ }
    await new Promise((r) => setTimeout(r, 250));
    try { win.play?.(); } catch { /* still paints */ }
    await window.__settle(win, 2400);
    return data;
  });
  await shoot(join(dir, 'long.png'));
  frames.push('long.png');

  manifest.push({ id: key, ...built, steps, frames: frames.map((f) => join(dir, f)), longValues: lengthened });
  console.log(`  ${key.padEnd(44)} ${String(built.category).padEnd(16)} ${frames.join(' · ')}`);
}
await page.evaluate(() => document.getElementById('taste-stage')?.remove());
await browser.close();

writeFileSync(join(OUT, 'frames.json'), `${JSON.stringify({ base: BASE, shotAt: new Date().toISOString(), designs: manifest }, null, 1)}\n`);

// ── The instrument, printed beside the frames so nobody has to go and find it ─────────────
console.log(`
${manifest.length} design(s) rendered into ${OUT}. Open every frame and answer, in writing, the nine
questions in docs/VISUAL_TASTE_REVIEW.md - each YES or NO, and each NO with what you saw:

  1 HIERARCHY    Does the eye land first on the one thing this graphic is for?
  2 COMPOSITION  Is every element placed against something - centred in its shape, flush to
                 its edge, or on a line something else shares - so nothing floats?
  3 RESTRAINT    One accent, at most two typefaces, and nothing drawn that does no job?
  4 COHERENCE    Would every piece pass as one show - mark, panel, type and accent in one voice?
  5 ON AIR       Over a real picture, at the size a viewer sees, does a broadcaster air THIS?

  T1 CENTRED     Is text meant to be centred actually centred in its shape, on BOTH axes?
  T2 INSIDE      In long.png, does every glyph sit inside the box it belongs to?
  T3 ALIGNED     Is the text aligned to the graphic behind it, never to the frame?
  T4 GROWS       Does a growing box grow the way the design implies, and neighbours stay put?

A NO is a defect: fix it, or say in the handoff why not. A NO on 5 or T2 means it does not ship.
`);
