// Capture the PUBLIC DOCS page's product screenshots from the running app.
//
//   node scripts/docs-shots.mjs [--only=<name,name>]   (dev server up)
//
// The SVG guide is the one page a designer reads before they have ever used the product, so it
// is the page where a picture earns its place: "your layers become fields" is a sentence until
// somebody sees the layer names sitting in the field list.
//
// Every one of those pictures is produced HERE, by driving the real app the way the e2e suite
// does, and never hand-captured. A checked-in hand screenshot goes stale the moment the surface
// it shows is redesigned, nobody notices (a PNG cannot fail a build), and the docs then teach
// the wrong thing to exactly the reader who cannot tell. Re-running this script is the fix, and
// the file names below are the contract docs.html references.
//
// Deliberately NOT part of the e2e suite: it produces artifacts and asserts nothing. It writes
// straight into public/docs/ because the output IS the committed asset - reviewing the diff on
// those PNGs is how a stale screenshot gets caught.
//
// The fixtures are the SHIPPED SAMPLES in docs/svg-samples/, the same files e2e/_svg-import.ts
// walks and the same files the guide tells the reader to drop. A picture of a private fixture
// would show a road the reader cannot take.
//
// Each shot runs in its OWN browser context, so no shot inherits the previous one's saved work
// (the wizard auto-opens only on a first-ever visit, and a leftover project would change what
// the Entry step offers).

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(projectRoot, 'public', 'docs');
mkdirSync(outDir, { recursive: true });

const sample = (name) => join(projectRoot, 'docs', 'svg-samples', name);

const port = execSync('node scripts/dev-port.mjs', { cwd: projectRoot }).toString().trim();
const base = `http://localhost:${port}`;

const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice('--only='.length);
const wanted = only ? new Set(only.split(',').map((s) => s.trim())) : null;

/**
 * The docs body column is 780 CSS px wide, so everything here is published at well under half
 * the size it was captured at. That, not sharpness, is what decides the pane width: a 1440 pane
 * is a beautiful screenshot whose labels are 6 px tall on the page. 1120 is the narrowest that
 * still keeps the wizard's desktop layout (its breakpoint is 768) and its live preview beside
 * the form. 1.5x device scale then puts 1680 real pixels behind a 780 px slot, crisp on any
 * panel, without the page weight 2x would cost.
 */
const VIEWPORT = { width: 1120, height: 860 };
const SCALE = 1.5;

const browser = await chromium.launch();

/** One shot = one fresh context. `run(page)` returns the locator to capture, or null for the
 *  whole viewport. */
async function shot(name, run, size = VIEWPORT) {
  if (wanted && !wanted.has(name)) return;
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: SCALE });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  try {
    const target = await run(page);
    // `animations: 'disabled'` parks CSS/Web animations at their end state, which is what a
    // settled product surface looks like.
    await (target ?? page).screenshot({ path: join(outDir, `${name}.png`), animations: 'disabled' });
    console.log(`✓ ${name}.png`);
  } catch (e) {
    console.error(`✗ ${name}.png - ${(e ?? '').message ?? e}`);
    process.exitCode = 1;
  } finally {
    await context.close();
  }
}

/** The wizard panel itself, not the dimmed shell behind it: the docs show the SURFACE. */
const modal = (page) => page.locator('.wz-modal');

async function openImportDoor(page) {
  await page.goto(`${base}/app#/new`);
  await modal(page).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.locator('[data-entry="import-graphic"]').click();
}

/** Drop a shipped sample and land on the mapping step. */
async function dropSample(page, file) {
  await page.locator('.wz-drop input[type="file"]').setInputFiles(sample(file));
  await page.getByTestId('import-svg-card').waitFor();
  await modal(page).getByRole('button', { name: 'Next' }).click();
  await page.getByTestId('map-svg-fields').waitFor();
  // The mapping step mounts a live template in an iframe and measures it; let it settle before
  // the shutter rather than guessing a fixed cost after the fact.
  await page.waitForTimeout(1500);
}

// ── 1. The drop step, with the export advice open ────────────────────────────
//
// The ⓘ is opened on purpose. Shut, the picture says "there is a drop zone", which the reader
// already believes. The reason this section exists is that the export settings decide whether
// the import works at all, and the page's job is to show that they are THERE, at the drop.
// Narrower than its siblings on purpose. The docs column is 780 CSS px, so everything captured
// here is shown at well under half size, and this step is all TYPE - a 1280 pane would publish
// the export rules at a size nobody can read on the page. There is no preview pane on this step
// to lose, and 1040 is clear of the wizard's 768 px breakpoint.
await shot('svg-drop', async (page) => {
  await openImportDoor(page);
  await page.getByTestId('import-svg-export-why').click();
  await page.getByTestId('import-svg-export-why-body').waitFor();
  await page.waitForTimeout(400);
  return modal(page);
}, { width: 1040, height: 860 });

// ── 2. The mapping step: layer names, sitting in the field list ──────────────
await shot('svg-fields', async (page) => {
  await openImportDoor(page);
  await dropSample(page, 'lower-third.svg');
  return modal(page);
});

// ── 3. Attaching quiz behaviour to artwork somebody else drew ────────────────
//
// The behaviour panel scrolled into view, captured as the WHOLE STEP rather than as the panel
// element. The panel is wider than the pane it sits in, so an element grab comes back with
// every dropdown sliced down its right edge - a picture of a broken product. The step around it
// also earns its place here: "where do I say this is a quiz?" is a question about a place.
await shot('svg-behaviour', async (page) => {
  await openImportDoor(page);
  await dropSample(page, 'quiz-board.svg');
  const panel = page.getByTestId('map-svg-behaviour');
  await panel.waitFor();
  await panel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  return modal(page);
});

await browser.close();
