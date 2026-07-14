// The CONTENT -> RENDER round trip for a video project, end to end against the RUNNING dev
// server, verified in PIXELS:
//
//   node scripts/render-smoke-video.mjs        (dev server must be running)
//
// What this proves that nothing else does. A video project's editable inputs (its Template
// Definition - the headline, the accent, the logo a non-technical user picks in the Content
// panel) reach the LIVE PREVIEW through the player host's set-props channel, but they reach
// the RENDER through `inputProps` inside the manifest. Two different paths to the same
// promise, and a green preview says nothing about the render. So this builds the manifest
// with the app's OWN modules - the same compileTsx / describeAssets / videoFieldValues /
// buildVideoManifest calls VideoRenderPanel makes - from a project whose values were EDITED
// away from their code defaults, renders it for real, and then reads the finished PNG back:
//
//   corner pixel == the EDITED accent   (a `fields` value survived the trip)
//   centre pixel == the uploaded asset  (an IMAGE input's value is an asset's logical NAME,
//                                        resolved against the separately-shipped assets map)
//
// If either half were dropped the pixels would come back as the code's own fallbacks, which
// is precisely the failure a container sniff cannot see. render-smoke.mjs covers the service
// and the two manifest kinds; this covers what the user actually typed.
//
// png-still keeps it to a couple of seconds. Not in CI: it needs `npm install` inside
// render-worker/ and downloads Chrome.

import { chromium } from '@playwright/test';
import { devPort } from './dev-port.mjs';

const BASE = `http://localhost:${devPort()}`;
const fail = (msg) => { console.error('VIDEO SMOKE FAIL:', msg); process.exit(1); };

// The values a user would type in. Each must differ from the code fallback below, or the
// test proves nothing: an input that never arrives falls back to exactly that default.
const DEFAULT_ACCENT = '#123456';
const EDITED_ACCENT = '#e83f6f';
const LOGO_COLOR = '#00c853';
const LOGO_SVG = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="${LOGO_COLOR}"/></svg>`,
)}`;

// A composition in the house contract (react/remotion only, everything frame-derived), whose
// look is DECIDED by its inputs: the accent fills the frame, the image input names the logo.
const TSX = `import { AbsoluteFill, Img, useCurrentFrame } from 'remotion';

export default function Composition({
  fields = {},
  assets = {},
}: {
  fields?: Record<string, string | number>;
  assets?: Record<string, string>;
}) {
  const frame = useCurrentFrame();
  const accent = String(fields.accent ?? '${DEFAULT_ACCENT}');
  const logo = assets[String(fields.logo ?? '')] ?? '';
  return (
    <AbsoluteFill style={{ background: accent, alignItems: 'center', justifyContent: 'center' }}>
      {logo ? <Img src={logo} style={{ width: 600, height: 600, opacity: frame >= 0 ? 1 : 0 }} /> : null}
    </AbsoluteFill>
  );
}
`;

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });

// 1) Build the manifest the way the Export tab does - through the app's real modules, from a
//    project whose input VALUES have been edited away from their declared defaults.
const manifest = await page.evaluate(async ({ tsx, logoSvg, editedAccent, defaultAccent }) => {
  const { compileTsx } = await import('/src/video/compile.ts');
  const { describeAssets } = await import('/src/video/types.ts');
  const { videoFieldValues } = await import('/src/model/videoTypes.ts');
  const { buildVideoManifest } = await import('/src/render/buildVideoManifest.ts');

  const compiled = compileTsx(tsx);
  if (!compiled.ok) throw new Error(`the smoke composition does not compile: ${compiled.error}`);

  const assets = [{ path: 'images/logo.svg', data: logoSvg }];
  // The project's inputs, as the AI declares them - with the user's edits already applied
  // (value !== default is the whole point: a dropped field renders the default instead).
  const inputs = [
    { key: 'accent', type: 'color', label: 'Accent', value: editedAccent, default: defaultAccent },
    { key: 'logo', type: 'image', label: 'Logo', value: 'logo', default: '' },
  ];

  // VideoRenderPanel's assembly, verbatim: assets by LOGICAL NAME + the field values.
  const assetProps = {};
  for (const info of describeAssets(assets)) {
    const a = assets.find((x) => x.path === info.path);
    if (a && typeof a.data === 'string') assetProps[info.name] = a.data;
  }
  return buildVideoManifest(
    {
      name: 'Content round trip',
      width: 1920,
      height: 1080,
      fps: 30,
      durationInFrames: 30,
      compiledJs: compiled.js,
      inputProps: { assets: assetProps, fields: videoFieldValues(inputs) },
      transparent: false,
    },
    { format: 'png-still' },
  );
}, { tsx: TSX, logoSvg: LOGO_SVG, editedAccent: EDITED_ACCENT, defaultAccent: DEFAULT_ACCENT });

console.log(`manifest: ${manifest.projectName} ${manifest.output.format} ` +
  `${(JSON.stringify(manifest).length / 1024).toFixed(0)} kB`);

// 2) start (a per-run principal: the anonymous quota is 2/h and this is a local dev server)
const ip = `10.99.1.${(Date.now() % 250) + 1}`;
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
if (buf.byteLength !== status.output.bytes) fail(`size mismatch: ${buf.byteLength} != ${status.output.bytes}`);
if (buf.subarray(1, 4).toString('ascii') !== 'PNG') fail('downloaded file is not a PNG');

// 5) THE POINT: decode the rendered frame and read the values back out of the pixels.
//    (Decoded in the page - same origin as the token-gated file route, and a browser already
//    knows how to read a PNG.)
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
    corner: at(12, 12), // the accent field fills the frame
    centre: at(Math.floor(bitmap.width / 2), Math.floor(bitmap.height / 2)), // the logo asset
  };
}, url);
await browser.close();

if (shot.w !== 1920 || shot.h !== 1080) fail(`rendered ${shot.w}x${shot.h}, expected 1920x1080`);
if (shot.corner !== EDITED_ACCENT) {
  fail(
    `the accent field did NOT reach the render: corner pixel is ${shot.corner}, expected ${EDITED_ACCENT}` +
      (shot.corner === DEFAULT_ACCENT ? ' (it rendered the code default - `fields` never arrived)' : ''),
  );
}
if (shot.centre !== LOGO_COLOR) {
  fail(
    `the image input did NOT resolve in the render: centre pixel is ${shot.centre}, expected ${LOGO_COLOR}` +
      (shot.centre === EDITED_ACCENT ? ' (the accent shows through - no logo was drawn)' : ''),
  );
}

console.log(
  `video-kind PASS: ${buf.byteLength} bytes in ${((Date.now() - t0) / 1000).toFixed(1)}s — ` +
    `accent ${shot.corner} and image input ${shot.centre} both survived Content -> render`,
);
