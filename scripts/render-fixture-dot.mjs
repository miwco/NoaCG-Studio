// THE ORANGE DOT — the one user-supplied image the render smoke pushes through the real
// service, and the one thing that proves the image-input and asset-delivery paths carry a
// picture all the way into a rendered frame.
//
// It lives in its own module because three places need the SAME bytes and the SAME expected
// colour: `make-remotion-manifest.mjs` (which puts it in the manifest), `render-smoke.mjs`
// (which looks for it in the rendered still) and `render-fixture.test.mjs` (which checks the
// bytes on every build, free, without rendering anything). A second copy of a fixture is how
// one of them ends up asserting against a picture the render never saw.
//
// HISTORY, because it is the reason the checks are shaped this way. The constant here used to
// be a base64 string nobody had decoded: its IDAT declared 17 bytes inside an 18-byte chunk,
// so the length ran into IEND, the CRC did not match, and the payload it did carry was a
// truncated pair of black-and-white scanlines rather than an orange 2x2. Chromium and the
// renderer both read it leniently and drew whatever fell out, so the smoke's image leg passed
// for months while proving nothing at all.
//
// If you ever replace these bytes, decode the REPLACEMENT and check every chunk CRC — do not
// trust a base64 string you were handed. `render-fixture.test.mjs` does exactly that and is
// part of `npm run build`, so a bad replacement fails the gate rather than the next reader.

/** A 2x2 solid #f6a623 PNG as a data URL: 8-bit RGB, no alpha, no palette, not interlaced. */
export const DOT_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR42mP4tkz52zJlBggFADQ+Bv1fo2iYAAAAAElFTkSuQmCC';

/** The colour every one of its four pixels carries, as [r, g, b]. */
export const DOT_RGB = [0xf6, 0xa6, 0x23];

/** The raw bytes behind the data URL. */
export function dotPngBytes() {
  return Buffer.from(DOT_PNG.slice(DOT_PNG.indexOf(',') + 1), 'base64');
}

// ── How the fixture DRAWS it ───────────────────────────────────────────────────────────────
//
// The composition in `make-remotion-manifest.mjs` reads these, and `render-smoke.mjs` predicts
// the rendered pixel from them. Both must move together: the smoke says "the image never
// arrived" whenever what it expects and what the fixture drew disagree, so a size or a fade
// living in only one of the two files reports a plumbing failure for a perfectly good render.

/** Side of the square the composition draws the 2x2 image into, in composition pixels. */
export const DOT_DISPLAY_PX = 48;

/** The fixture's page colour, which the dot is composited over, as [r, g, b]. */
export const BACKDROP_RGB = [0x10, 0x13, 0x18];

/** The image fades from this opacity to this one across the composition. */
export const DOT_OPACITY_FROM = 0.5;
export const DOT_OPACITY_TO = 1;

/** The opacity the fixture draws the image at on a given frame. */
export function dotOpacityAt(frame, durationInFrames) {
  return DOT_OPACITY_FROM + (frame / durationInFrames) * (DOT_OPACITY_TO - DOT_OPACITY_FROM);
}

/** What the dot's pixels read as once composited over the backdrop at that frame, as [r, g, b]. */
export function dotRenderedRgbAt(frame, durationInFrames) {
  const opacity = dotOpacityAt(frame, durationInFrames);
  return DOT_RGB.map((channel, i) => Math.round(channel * opacity + BACKDROP_RGB[i] * (1 - opacity)));
}

/** [r, g, b] as `#rrggbb`. */
export const rgbHex = (rgb) => '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('');

/**
 * The accent the fixture's BAR is drawn in — deliberately NOT the dot's orange.
 *
 * It used to be the same `#f6a623`. That made the smoke's "is this a block or a coincidence?"
 * check unsound: an anti-aliased bar edge whose coverage happens to land near the dot's opacity
 * composites over the same backdrop to the dot's exact colour, so a single edge pixel 600 px
 * away could stretch the matched region across the frame and fail the check while blaming the
 * image. A different hue also earns the bar its keep, by proving `fields.accent` overrode the
 * composition's own default.
 */
export const FIXTURE_ACCENT = '#3ba0ff';
