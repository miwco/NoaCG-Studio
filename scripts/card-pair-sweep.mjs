// NEAR-DUPLICATE PAIRS, measured on the RENDERED CARD - the owner's "two similar graphics"
// question, answered off pixels rather than off CSS decisions.
//
// Why this exists beside card-look-sweep.mjs. That instrument buckets each design on four axes
// (backdrop / accent / footprint / density) and reports the DISTRIBUTION - it can say a category
// has one silhouette, but two designs can share every bucket and still look nothing alike, and
// two can straddle a bucket boundary while being twins. Sameness between a PAIR needs the pair
// compared directly. catalog-sameness.mjs compares pairs, but on fourteen CSS decisions - the
// vector that scored the all-alike lower-third page 11-distinct-of-12 (docs/CATALOG_WORK_QUEUE.md
// §4). So this one renders every design exactly as card-look-sweep does, thumbnails it to the
// size a storefront card actually occupies, and measures every same-category pair on:
//
//   STRUCTURE   RMS difference over the greyscale thumbnail - layout, silhouette, tone. The
//               primary ranking, because it is what an eye reads at card size.
//   COLOUR      distance between the two hue histograms (saturated pixels only), so "the same
//               strap with the accent repainted" is named as exactly that instead of hiding
//               behind a structural difference it does not have.
//
// Pairs are reported per category, ranked most-alike first. It REPORTS; it gates nothing - the
// distance is evidence of sameness, never proof of difference (docs/CATALOG_VARIETY.md, "What
// the distance measure is"). Needs the dev server on this checkout's port; browser-driving, so
// run it through the queue like its siblings.
//
//   node scripts/card-pair-sweep.mjs [category|all] [--json out.json] [--top N]
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { devPort } from './dev-port.mjs';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const SCOPE = args[0] || 'lower-third';
const jsonAt = process.argv.indexOf('--json');
const jsonOut = jsonAt >= 0 ? process.argv[jsonAt + 1] : null;
const topAt = process.argv.indexOf('--top');
const TOP = topAt >= 0 ? Number(process.argv[topAt + 1]) : 12;

// The thumbnail. 96x54 keeps the frame's aspect and is close to the storefront card's own
// density - fine enough that a moved accent bar registers, coarse enough that sub-pixel text
// rendering does not.
const TW = 96;
const TH = 54;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
await page.goto(`http://localhost:${devPort()}/app`, { waitUntil: 'domcontentloaded' });
await page.keyboard.press('Escape');
await page.waitForTimeout(600);

const categories = await page.evaluate(async (scope) => {
  const { CATALOG } = await import('/src/templates/catalog.ts');
  const names = scope === 'all' ? Object.keys(CATALOG) : [scope];
  return names
    .filter((c) => (CATALOG[c] ?? []).length > 1)
    .map((c) => ({
      category: c,
      designs: CATALOG[c].map((v) => ({ id: v.id, name: v.name, family: v.styleTag })),
    }));
}, SCOPE);
if (categories.length === 0) {
  console.error(`No category "${SCOPE}" with more than one design.`);
  await browser.close();
  process.exit(2);
}

/** Render one design full-frame over BLACK, settled, and screenshot it (card-look-sweep's rig). */
async function shoot(id) {
  await page.evaluate(async (variantId) => {
    const { variantById } = await import('/src/templates/catalog.ts');
    const { composeDocument } = await import('/src/preview/composeDocument.ts');
    document.getElementById('look-stage')?.remove();
    const host = document.createElement('div');
    host.id = 'look-stage';
    host.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#000;overflow:hidden';
    const f = document.createElement('iframe');
    f.style.cssText = 'width:1920px;height:1080px;border:0;display:block;transform:scale(0.5);transform-origin:0 0';
    host.appendChild(f);
    document.body.appendChild(host);
    await new Promise((r) => {
      f.onload = r;
      f.srcdoc = composeDocument(variantById(variantId).create({}));
    });
    f.contentWindow.play?.();
    await new Promise((r) => setTimeout(r, 2200));
  }, id);
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 960, height: 540 } });
  return `data:image/png;base64,${buf.toString('base64')}`;
}

/** Thumbnail + axes, read in the page: a data: URL never taints a canvas. */
const READ = ([dataUrl, tw, th]) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = tw;
      c.height = th;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, tw, th);
      const { data } = ctx.getImageData(0, 0, tw, th);
      const gray = new Array(tw * th);
      const hues = new Array(12).fill(0);
      let ink = 0;
      let minX = tw, minY = th, maxX = -1, maxY = -1, lumSum = 0;
      for (let y = 0; y < th; y += 1) {
        for (let x = 0; x < tw; x += 1) {
          const i = (y * tw + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          gray[y * tw + x] = Math.round(lum);
          // The bed is pure black, so anything above it is the design.
          if (r + g + b < 24) continue;
          ink += 1;
          lumSum += lum;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          // Only a genuinely saturated pixel votes for a hue - grey text is not an accent.
          if (sat > 0.45 && max > 60) {
            let h;
            if (max === min) h = 0;
            else if (max === r) h = ((g - b) / (max - min) + 6) % 6;
            else if (max === g) h = (b - r) / (max - min) + 2;
            else h = (r - g) / (max - min) + 4;
            hues[Math.floor((h * 60) / 30) % 12] += 1;
          }
        }
      }
      if (maxX < 0) {
        resolve(null);
        return;
      }
      resolve({
        gray,
        hues,
        box: {
          x: Number((minX / tw).toFixed(3)),
          y: Number((minY / th).toFixed(3)),
          w: Number(((maxX - minX + 1) / tw).toFixed(3)),
          h: Number(((maxY - minY + 1) / th).toFixed(3)),
        },
        coverage: Number((ink / (tw * th)).toFixed(3)),
        meanLum: Math.round(lumSum / Math.max(1, ink)),
      });
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });

/** Root-mean-square difference between two greyscale thumbnails, normalised to 0..1. */
function grayRms(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum / a.length) / 255;
}

/** Distance between two hue histograms: 1 - cosine similarity, with two no-accent designs at 0. */
function hueDist(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < 12; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 && nb === 0) return 0; // neither paints an accent - identical in colour terms
  if (na === 0 || nb === 0) return 1; // one does and one does not
  return Number((1 - dot / Math.sqrt(na * nb)).toFixed(3));
}

const HUE_NAMES = ['red', 'orange', 'amber', 'yellow-green', 'green', 'spring', 'cyan', 'azure', 'blue', 'violet', 'magenta', 'rose'];
const domHue = (hues) => {
  const peak = Math.max(...hues);
  return peak > 10 ? HUE_NAMES[hues.indexOf(peak)] : 'none';
};

/** Name what separates a pair, so the ranked list carries its own reading. */
function separates(a, b) {
  const parts = [];
  const dh = hueDist(a.look.hues, b.look.hues);
  if (dh > 0.35) parts.push(`accent ${domHue(a.look.hues)} vs ${domHue(b.look.hues)}`);
  const dw = Math.abs(a.look.box.w - b.look.box.w);
  const dhh = Math.abs(a.look.box.h - b.look.box.h);
  if (dw > 0.1 || dhh > 0.1) parts.push('footprint');
  if (Math.abs(a.look.meanLum - b.look.meanLum) > 60) parts.push('tone');
  if (a.family !== b.family) parts.push(`family ${a.family}/${b.family}`);
  return parts.length ? parts.join(', ') : 'almost nothing';
}

const out = [];
for (const { category, designs } of categories) {
  const rows = [];
  process.stdout.write(`${category} `);
  for (const v of designs) {
    const url = await shoot(v.id);
    const look = await page.evaluate(READ, [url, TW, TH]);
    await page.evaluate(() => document.getElementById('look-stage')?.remove());
    if (!look) {
      console.error(`\n  ! ${v.id} rendered nothing`);
      continue;
    }
    rows.push({ ...v, look });
    process.stdout.write('.');
  }
  process.stdout.write('\n');

  const pairs = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const a = rows[i], b = rows[j];
      pairs.push({
        a: a.id,
        b: b.id,
        aName: a.name,
        bName: b.name,
        structure: Number(grayRms(a.look.gray, b.look.gray).toFixed(4)),
        colour: hueDist(a.look.hues, b.look.hues),
        separates: separates(a, b),
      });
    }
  }
  pairs.sort((x, y) => x.structure - y.structure);
  out.push({
    category,
    designs: rows.map(({ look, ...r }) => ({ ...r, box: look.box, meanLum: look.meanLum, hue: domHue(look.hues) })),
    pairs,
  });
}
await browser.close();

// ── The report ───────────────────────────────────────────────────────────────────────────
for (const { category, pairs } of out) {
  console.log(`\n=== ${category} - most-alike pairs (structure RMS, 0 = identical) ===`);
  for (const p of pairs.slice(0, TOP)) {
    console.log(
      `  ${p.structure.toFixed(4)}  ${p.a} "${p.aName}"  ~  ${p.b} "${p.bName}"` +
        `  | colour ${p.colour.toFixed(2)}  | separates: ${p.separates}`,
    );
  }
}

if (jsonOut) {
  // The thumbnails stay out of the JSON - the pair distances are the finding; the raw vectors
  // are a render away for anyone re-measuring.
  writeFileSync(jsonOut, JSON.stringify(out, null, 1));
  console.log(`\nwrote ${jsonOut}`);
}
