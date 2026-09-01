// The FREE half of proving the render smoke's image leg: the orange dot's bytes really are a
// well-formed 2x2 #f6a623 PNG. Runs in `npm run build`, needs no dev server, no render-worker
// and no render — so a fixture that stops being a picture fails the gate immediately, instead
// of being drawn leniently by Chromium and passing a render smoke that proves nothing.
//
// The other half — that the picture actually reaches a RENDERED FRAME — cannot be free, and
// lives in `render-smoke.mjs`, which samples the dot's pixels out of a real still.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DOT_PNG, DOT_RGB, dotPngBytes } from './render-fixture-dot.mjs';
import { decodePng, readChunks } from './png-decode.mjs';

test('the dot fixture is a base64 data URL that round-trips exactly', () => {
  assert.match(DOT_PNG, /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/);
  const base64 = DOT_PNG.slice(DOT_PNG.indexOf(',') + 1);
  assert.equal(dotPngBytes().toString('base64'), base64, 'the base64 carries stray or missing bytes');
});

test('every chunk is intact: correct CRCs, no length running past the end, nothing after IEND', () => {
  // readChunks throws on a bad CRC, an overrunning length or trailing bytes - the exact three
  // faults the previous fixture had, in that order.
  const chunks = readChunks(dotPngBytes());
  assert.deepEqual(chunks.map((c) => c.type), ['IHDR', 'IDAT', 'IEND']);
});

test('it decodes to four #f6a623 pixels', () => {
  const image = decodePng(dotPngBytes());
  assert.equal(image.width, 2);
  assert.equal(image.height, 2);
  assert.equal(image.colorType, 2, 'expected 8-bit RGB (no palette, no alpha)');
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const [r, g, b] = image.pixel(x, y);
      assert.deepEqual([r, g, b], DOT_RGB, `pixel ${x},${y} is not the fixture colour`);
    }
  }
});

test('the strict reader rejects the kind of corruption that went unnoticed', () => {
  // A single flipped payload byte must be caught by the IDAT CRC. Nothing in the render chain
  // would have complained; this is what makes the test above worth having.
  const flipped = Buffer.from(dotPngBytes());
  const idatPayload = flipped.indexOf('IDAT', 0, 'ascii') + 4;
  assert.ok(idatPayload > 4, 'no IDAT chunk to corrupt');
  flipped[idatPayload + 2] ^= 0xff;
  assert.throws(() => readChunks(flipped), /CRC mismatch/);

  // A truncated file must not decode into "whatever fell out".
  assert.throws(() => readChunks(dotPngBytes().subarray(0, 40)), /runs past the end|truncated/);
});
