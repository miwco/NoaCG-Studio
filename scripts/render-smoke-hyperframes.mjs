// The HyperFrames engine's render round trip, end to end against the RUNNING dev server,
// verified in PIXELS (the 'hyperframes' counterpart of render-smoke-video.mjs):
//
//   node scripts/render-smoke-hyperframes.mjs        (dev server must be running)
//
// What this proves that the preview specs cannot: a HyperFrames project reaches the
// renderer as a COMPOSED document (assets + GSAP + the NoaCG driver inlined by
// composeHyperframesDocument in 'render' mode), and the worker's noacg-hyperframes host
// really drives it - the still is taken at the MIDDLE frame, so every check depends on
// __noacgHfRender.seek() having run:
//
//   corner pixel == the EDITED accent   (a variable value crossed compose -> driver ->
//                                        var(--accent), AND the #cover slab that starts
//                                        parked over that corner was tweened away by the
//                                        seeked timeline - an unseeked document would
//                                        show #ff00ff there)
//   centre pixel == the uploaded asset  (an asset:logo reference was substituted with
//                                        the project asset's data URL)
//
// png-still keeps it to a couple of seconds. Not in CI: it needs `npm install` inside
// render-worker/ and downloads Chrome.

import { chromium } from '@playwright/test';
import { devPort } from './dev-port.mjs';

const BASE = `http://localhost:${devPort()}`;
const fail = (msg) => { console.error('HYPERFRAMES SMOKE FAIL:', msg); process.exit(1); };

const DEFAULT_ACCENT = '#123456';
const EDITED_ACCENT = '#e83f6f';
const LOGO_COLOR = '#00c853';
const COVER_COLOR = '#ff00ff';
const LOGO_SVG = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="${LOGO_COLOR}"/></svg>`,
)}`;

// A composition in the house contract whose look is DECIDED by its variable + asset + the
// seeked timeline: the accent fills the frame via var(--accent), the logo sits centred via
// asset:logo, and the #cover slab parks over the checked corner until the timeline moves it.
const HTML = `<!doctype html>
<html lang="en" data-composition-variables='[
  {"id":"accent","type":"color","label":"Accent","default":"${DEFAULT_ACCENT}"}
]'>
<head><meta charset="UTF-8" /><title>smoke</title>
<style>
  body { margin: 0; }
  #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; }
  .clip { position: absolute; inset: 0; }
  #bg { position: absolute; inset: 0; background: var(--accent, ${DEFAULT_ACCENT}); }
  #logo { position: absolute; left: 660px; top: 240px; width: 600px; height: 600px; }
  #cover { position: absolute; left: 0; top: 0; width: 400px; height: 400px; background: ${COVER_COLOR}; }
</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="1">
  <section id="scene" class="clip" data-start="0" data-duration="1" data-track-index="1">
    <div id="bg"></div>
    <img id="logo" src="asset:logo" alt="" />
    <div id="cover"></div>
  </section>
</div>
<script>
  window.__timelines = window.__timelines || {};
  var tl = gsap.timeline({ paused: true });
  // The cover leaves the corner in the first 0.4 s - the middle-frame still only shows
  // the accent there if the renderer actually seeked the timeline.
  tl.to('#cover', { x: 3000, duration: 0.4, ease: 'none' }, 0);
  window.__timelines['main'] = tl;
</script>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });

// 1) Build the manifest the way the Export tab does - static checks, compose ('render'
//    mode), then the pure manifest builder - with the accent EDITED away from its default.
const manifest = await page.evaluate(async ({ html, logoSvg, editedAccent }) => {
  const { staticValidateHyperframes, HF_WARNING_RULES } = await import('/src/video/hyperframes/validate.ts');
  const { composeHyperframesDocument } = await import('/src/video/hyperframes/compose.ts');
  const { loadHyperframesFontCss } = await import('/src/video/hyperframes/fontCss.ts');
  const { buildHyperframesManifest } = await import('/src/render/buildVideoManifest.ts');

  const settings = { width: 1920, height: 1080, fps: 30, durationInFrames: 30, transparent: false };
  const assets = [{ path: 'images/logo.svg', data: logoSvg }];
  const blocking = staticValidateHyperframes(html, assets, settings).filter((i) => !HF_WARNING_RULES.has(i.rule));
  if (blocking.length > 0) throw new Error(`the smoke composition fails validation: ${blocking[0].message}`);

  const fontCss = await loadHyperframesFontCss();
  if (!fontCss.includes('@font-face')) throw new Error('the bundled fonts did not resolve');
  const documentHtml = composeHyperframesDocument(html, {
    settings,
    assets,
    values: { accent: editedAccent },
    mode: 'render',
    fontCss,
  });
  return buildHyperframesManifest(
    {
      name: 'HyperFrames round trip',
      width: 1920,
      height: 1080,
      fps: 30,
      durationInFrames: 30,
      documentHtml,
      transparent: false,
    },
    { format: 'png-still' },
  );
}, { html: HTML, logoSvg: LOGO_SVG, editedAccent: EDITED_ACCENT });

console.log(`manifest: ${manifest.projectName} ${manifest.output.format} ` +
  `${(JSON.stringify(manifest).length / 1024).toFixed(0)} kB`);

// 2) start (a per-run principal: the anonymous quota is 2/h and this is a local dev server)
const ip = `10.99.2.${(Date.now() % 250) + 1}`;
const startRes = await fetch(`${BASE}/api/render/start`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
  body: JSON.stringify({ manifest }),
});
if (startRes.status !== 202) fail(`start -> ${startRes.status}: ${await startRes.text()}`);
const { jobId, jobToken, pollIntervalMs } = await startRes.json();
console.log(`job ${jobId} started`);

// 3) poll to terminal
const t0 = Date.now();
let status;
for (;;) {
  if (Date.now() - t0 > 5 * 60_000) fail('timed out after 5 minutes');
  await new Promise((r) => setTimeout(r, pollIntervalMs));
  const res = await fetch(`${BASE}/api/render/status?id=${jobId}`, {
    headers: { authorization: `Bearer ${jobToken}` },
  });
  if (!res.ok) fail(`status -> ${res.status}: ${await res.text()}`);
  status = await res.json();
  console.log(`  ${status.state} ${status.percent}%`);
  if (['complete', 'failed', 'cancelled', 'expired'].includes(status.state)) break;
}
if (status.state !== 'complete') fail(`terminal state ${status.state}: ${JSON.stringify(status.error)}`);
if (!status.output?.url) fail('complete but no output url');

// 4) download and sniff the PNG
const url = `${BASE}${status.output.url}&token=${jobToken}`;
const dl = await fetch(url);
if (!dl.ok) fail(`download -> ${dl.status}`);
const buf = Buffer.from(await dl.arrayBuffer());
if (buf.subarray(1, 4).toString('ascii') !== 'PNG') fail('downloaded file is not a PNG');

// 5) THE POINT: decode the rendered frame and read the values back out of the pixels.
const shot = await page.evaluate(async (fileUrl) => {
  const bitmap = await createImageBitmap(await (await fetch(fileUrl)).blob());
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  const hex = (n) => n.toString(16).padStart(2, '0');
  const at = (x, y) => {
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  };
  return {
    w: bitmap.width,
    h: bitmap.height,
    corner: at(12, 12), // accent via var(--accent), with #cover tweened away
    centre: at(Math.floor(bitmap.width / 2), Math.floor(bitmap.height / 2)), // asset:logo
  };
}, url);
await browser.close();

if (shot.w !== 1920 || shot.h !== 1080) fail(`rendered ${shot.w}x${shot.h}, expected 1920x1080`);
if (shot.corner !== EDITED_ACCENT) {
  fail(
    `corner pixel is ${shot.corner}, expected the edited accent ${EDITED_ACCENT}` +
      (shot.corner === COVER_COLOR
        ? ' (the cover slab never moved - the timeline was NOT seeked)'
        : shot.corner === DEFAULT_ACCENT
          ? ' (the variable value never arrived - it rendered the declared default)'
          : ''),
  );
}
if (shot.centre !== LOGO_COLOR) {
  fail(`centre pixel is ${shot.centre}, expected the asset colour ${LOGO_COLOR} (asset:logo did not resolve)`);
}

console.log(
  `hyperframes-kind PASS: ${buf.byteLength} bytes in ${((Date.now() - t0) / 1000).toFixed(1)}s — ` +
    `variable ${shot.corner}, seeked timeline, and asset ${shot.centre} all survived compose -> render`,
);
