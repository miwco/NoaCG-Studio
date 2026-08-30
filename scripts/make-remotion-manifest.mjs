// Build a kind:'remotion' render-manifest fixture with a hand-written compiled module -
// no browser or dev server needed (the module is plain CJS React.createElement code, the
// same shape the editor's sucrase compile emits). Drives the local render loop:
//
//   node scripts/make-remotion-manifest.mjs .render-dev/user.json [frames] [format] [fps] [scale]
//   node render-worker/cli.mjs .render-dev/user.json .render-dev/user.mp4
//
// The fixture animates a bar + counter from useCurrentFrame (deterministic), reads editable
// content from the `fields` prop (the video Template Definition) plus a title from
// inputProps, and shows a data-URL image asset chosen by an IMAGE INPUT - a `fields` value
// that is an asset's logical name, resolved against the assets prop exactly as an SPX
// filelist resolves a filename. Covers the module-eval, props, fields, image-input, and
// asset paths of the worker's UserComposition.

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [outPath, framesArg, formatArg, fpsArg, scaleArg] = process.argv.slice(2);
if (!outPath) {
  console.error('usage: node scripts/make-remotion-manifest.mjs <out.json> [frames=75] [format=mp4] [fps=25] [scale=1]');
  process.exit(1);
}
const durationInFrames = Number(framesArg ?? 75);
const format = formatArg ?? 'mp4';
const fps = Number(fpsArg ?? 25);
const scale = Number(scaleArg ?? 1);

// A 2x2 solid #f6a623 (orange) PNG as a data URL - the asset-delivery path.
//
// Minted with every chunk length and CRC computed, and verified by re-decoding these exact
// base64 bytes: 8-bit RGB, IDAT inflates to the 14 bytes a 2x2 RGB image needs (two rows of
// filter byte + 2x3 colour bytes), all four pixels f6 a6 23. The previous constant did not
// decode at all - its IDAT declared 17 bytes over a 18-byte chunk, so the length ran into
// IEND, the CRC did not match, and the payload it did carry was a truncated 4-wide
// white-and-black scanline pair, not an orange 2x2. Chromium and the renderer read it
// leniently and drew whatever fell out, so the image leg of render-smoke passed vacuously.
// If you ever replace this, decode the REPLACEMENT bytes and check every chunk CRC - do not
// trust a base64 string you were handed.
const DOT_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR42mP4tkz52zJlBggFADQ+Bv1fo2iYAAAAAElFTkSuQmCC';

// Plain CJS, no JSX - what sucrase emits for a simple module.
const COMPILED_JS = `
"use strict";
const React = require('react');
const R = require('remotion');
exports.default = function Fixture(props) {
  const frame = R.useCurrentFrame();
  const cfg = R.useVideoConfig();
  const t = frame / cfg.durationInFrames;
  const barW = R.interpolate(frame, [0, cfg.durationInFrames * 0.6], [0, cfg.width * 0.6], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const assets = props.assets || {};
  const fields = props.fields || {};
  const accent = fields.accent || '#f6a623';
  // Image input: the field carries an asset's logical NAME; the URL comes from assets.
  const logo = assets[String(fields.logo || '')];
  return React.createElement(R.AbsoluteFill, {
    style: { background: '#101318', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif' },
  },
    React.createElement('div', { style: { color: '#f4f4f5', fontSize: 72, fontWeight: 800 } },
      (fields.headline || props.title || 'FIXTURE') + ' f' + frame),
    React.createElement('div', {
      style: { width: barW, height: 12, background: accent, marginTop: 24, borderRadius: 6 },
    }),
    logo ? React.createElement(R.Img, {
      src: logo,
      style: { width: 48, height: 48, marginTop: 24, imageRendering: 'pixelated', opacity: 0.5 + t * 0.5 },
    }) : null
  );
};
`;

const manifest = {
  version: 2,
  kind: 'remotion',
  projectName: 'remotion-fixture',
  compiledJs: COMPILED_JS,
  inputProps: { title: 'FIXTURE', fields: { headline: 'FIELDS OK', accent: '#f6a623', logo: 'dot' }, assets: { dot: DOT_PNG } },
  durationInFrames,
  transparent: format !== 'mp4',
  width: 1280,
  height: 720,
  fps,
  scale,
  output: { format },
};

mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log(`wrote ${outPath} — kind:remotion, ${durationInFrames} frames @ ${fps} fps, ${format}`);
