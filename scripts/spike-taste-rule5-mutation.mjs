// Mutation check for rule 5: prove the rewritten finding can FIRE, and that the one thing that
// silences it is the geometry it is about. Two synthetic frames, same stack, different panel
// width. Free; needs the dev server on this checkout's port.
import { chromium } from 'playwright';
import { devPort } from './dev-port.mjs';

const BASE = `http://localhost:${devPort()}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
await page.locator('.topbar').waitFor();

const PX = 'data:image/svg+xml;base64,'
  + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#e0a020"/></svg>').toString('base64');

const frame = (panelWidth, headline) => `<!doctype html><html><head><meta name="color-scheme" content="dark">
<style>
  body { margin: 0; background: #111; }
  .panel { position: absolute; left: 100px; top: 100px; width: ${panelWidth}px; padding: 24px;
           background: #1b1b1b; display: flex; flex-direction: column; align-items: flex-start; }
  #f1 { display: block; width: 64px; height: 64px; margin-bottom: 20px; }
  .head { font: 700 54px/1.1 Arial, sans-serif; color: #fff; white-space: nowrap; }
</style></head><body>
  <div class="panel"><img id="f1" src="${PX}" alt=""><div class="head">${headline}</div></div>
</body></html>`;

async function measure(html) {
  return page.evaluate(async (srcdoc) => {
    const { measureTaste } = await import('/src/ai/spike/tasteCheck.ts?t=' + Date.now());
    document.getElementById('probe')?.remove();
    const el = document.createElement('iframe');
    el.id = 'probe';
    el.style.cssText = 'position:fixed;left:0;top:0;width:1920px;height:1080px;border:0;z-index:99999;background:#333;color-scheme:dark;';
    document.body.appendChild(el);
    el.srcdoc = srcdoc;
    await new Promise((resolve) => { el.onload = resolve; });
    await el.contentWindow.document.fonts.ready;
    await new Promise((resolve) => setTimeout(resolve, 400));
    const taste = measureTaste(el.contentDocument, { markFieldId: 'f1' });
    el.remove();
    return { markRow: taste.markRow, codes: taste.findings.map((f) => f.code), findings: taste.findings };
  }, html);
}

const wide = await measure(frame(900, 'Election Night'));
const tight = await measure(frame(240, 'Election Night Results Desk'));

const show = (label, r) => {
  const m = r.markRow ?? {};
  console.log(`${label}: panel ${m.panelWidthPx}px, mark ${m.markWidthPx}px, rowShare ${m.rowShare}, `
    + `besideSlack ${m.besideSlackPx}px -> [${r.codes.join(', ') || 'clean'}]`);
  for (const f of r.findings.filter((x) => x.rule === 5)) console.log(`    ${f.detail}`);
};
show('WIDE  panel (room beside the line)', wide);
show('TIGHT panel (no room beside it)  ', tight);

const firesWide = wide.codes.includes('mark-stacked-with-room');
const quietTight = !tight.codes.includes('mark-stacked-with-room');
console.log(`\nfires when there is room: ${firesWide}; quiet when there is not: ${quietTight}`);
console.log(firesWide && quietTight ? 'MUTATION CHECK PASSED' : 'MUTATION CHECK FAILED');
await browser.close();
process.exit(firesWide && quietTight ? 0 : 1);
