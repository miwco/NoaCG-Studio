// A strict, dependency-free PNG reader — used to ASSERT ON PIXELS rather than on a render
// having finished.
//
// WHY IT EXISTS. `scripts/render-smoke.mjs` feeds a tiny orange PNG through the real render
// service to exercise the image-input and asset-delivery paths, and for a long time that leg
// proved nothing: the fixture was malformed (bad IDAT CRC, a declared length running past
// IEND, truncated black-and-white scanlines instead of the four orange pixels its comment
// promised) and every reader in the chain — Chromium, the renderer — read it leniently and
// drew whatever fell out. A green exit code was the only evidence anyone had.
//
// So the two checks that replace it both need to read real pixels, and STRICTLY: this decoder
// refuses a file the platform's lenient readers would accept. A CRC mismatch, a chunk length
// running off the end, trailing bytes after IEND, an inflate failure or a raw stream that is
// not exactly the size the header implies are all errors here, because each of them is
// precisely the shape of corruption that went unnoticed.
//
// `render-smoke-video.mjs` reads its rendered frame a different way - through `createImageBitmap`
// in the Chromium page it already has open, which is the shorter route when a browser is at hand.
// Both are fine for reading a frame the renderer just produced. Only this one is fine for judging
// a FIXTURE, because the browser path is the lenient reader that hid the corruption in the first
// place, and because the build's test has no browser.
//
// Deliberately narrow: 8-bit non-interlaced greyscale/RGB/greyscale+alpha/RGBA, which is what
// both callers produce (a hand-minted 2x2 RGB fixture and Remotion's `renderStill` output).
// A palette or 16-bit file throws rather than being half-supported.

import zlib from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 as PNG defines it (over the chunk TYPE plus its data). */
export function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Every chunk in order, each CRC checked. Throws on the first structural problem. */
export function readChunks(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG (bad signature)');
  const chunks = [];
  let offset = 8;
  while (offset < buf.length) {
    if (offset + 8 > buf.length) throw new Error(`truncated chunk header at byte ${offset}`);
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
    const end = offset + 8 + length + 4;
    if (end > buf.length) {
      throw new Error(`chunk ${type} declares ${length} bytes, which runs past the end of the file`);
    }
    const stored = buf.readUInt32BE(offset + 8 + length);
    const computed = crc32(buf.subarray(offset + 4, offset + 8 + length));
    if (stored !== computed) {
      throw new Error(
        `chunk ${type} CRC mismatch: stored ${stored.toString(16).padStart(8, '0')}, ` +
          `computed ${computed.toString(16).padStart(8, '0')}`,
      );
    }
    chunks.push({ type, data: buf.subarray(offset + 8, offset + 8 + length) });
    offset = end;
    if (type === 'IEND') break;
  }
  if (offset !== buf.length) throw new Error(`${buf.length - offset} trailing byte(s) after IEND`);
  if (!chunks.some((c) => c.type === 'IEND')) throw new Error('no IEND chunk');
  return chunks;
}

const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/**
 * Decode to raw samples. Returns { width, height, colorType, channels, samples, pixel(x, y) },
 * where `pixel` always answers [r, g, b, a] with 0-255 components.
 */
export function decodePng(buf) {
  const chunks = readChunks(buf);
  const ihdr = chunks.find((c) => c.type === 'IHDR');
  if (!ihdr || ihdr.data.length !== 13) throw new Error('missing or malformed IHDR');

  const width = ihdr.data.readUInt32BE(0);
  const height = ihdr.data.readUInt32BE(4);
  const depth = ihdr.data[8];
  const colorType = ihdr.data[9];
  const interlace = ihdr.data[12];
  if (depth !== 8) throw new Error(`unsupported bit depth ${depth} (this reader handles 8-bit only)`);
  if (interlace !== 0) throw new Error('interlaced PNGs are not supported');
  const channels = CHANNELS[colorType];
  if (!channels) throw new Error(`unsupported colour type ${colorType}`);

  const idat = chunks.filter((c) => c.type === 'IDAT').map((c) => c.data);
  if (!idat.length) throw new Error('no IDAT data');
  let raw;
  try {
    raw = zlib.inflateSync(Buffer.concat(idat));
  } catch (err) {
    throw new Error(`IDAT does not inflate: ${err.message}`, { cause: err });
  }

  const stride = width * channels;
  const expected = height * (stride + 1);
  if (raw.length !== expected) {
    throw new Error(`IDAT inflates to ${raw.length} bytes; a ${width}x${height} image needs exactly ${expected}`);
  }

  const samples = Buffer.alloc(height * stride);
  let read = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[read++];
    const rowStart = y * stride;
    const prevStart = (y - 1) * stride;
    for (let x = 0; x < stride; x++) {
      const cur = raw[read + x];
      const a = x >= channels ? samples[rowStart + x - channels] : 0;
      const b = y > 0 ? samples[prevStart + x] : 0;
      const c = x >= channels && y > 0 ? samples[prevStart + x - channels] : 0;
      let value;
      switch (filter) {
        case 0: value = cur; break;
        case 1: value = cur + a; break;
        case 2: value = cur + b; break;
        case 3: value = cur + ((a + b) >> 1); break;
        case 4: value = cur + paeth(a, b, c); break;
        default: throw new Error(`row ${y} has unknown filter type ${filter}`);
      }
      samples[rowStart + x] = value & 0xff;
    }
    read += stride;
  }

  const pixel = (x, y) => {
    const i = y * stride + x * channels;
    switch (colorType) {
      case 0: return [samples[i], samples[i], samples[i], 255];
      case 2: return [samples[i], samples[i + 1], samples[i + 2], 255];
      case 4: return [samples[i], samples[i], samples[i], samples[i + 1]];
      default: return [samples[i], samples[i + 1], samples[i + 2], samples[i + 3]];
    }
  };

  return { width, height, colorType, channels, samples, pixel };
}

/**
 * Every OPAQUE pixel within `tolerance` of [r, g, b] on all three channels: how many, and the
 * box they span. The box matters as much as the count - a picture that arrived is a solid block
 * of the right size, while the same number of pixels scattered across the frame is a
 * coincidence. Returns `{ count: 0, box: null }` when nothing matches.
 *
 * Transparent pixels are skipped rather than compared. Every non-mp4 format renders with alpha
 * (the worker leaves the composition background undefined), and an invisible pixel still carries
 * whatever RGB the encoder happened to leave in it - so counting those would be reading colour
 * out of nothing. `minAlpha` is the cutoff for "actually drawn"; the default demands full opacity.
 */
export function findPixelsNear(image, [r, g, b], tolerance, minAlpha = 255) {
  let count = 0;
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const [pr, pg, pb, pa] = image.pixel(x, y);
      if (pa < minAlpha) continue;
      if (Math.abs(pr - r) > tolerance || Math.abs(pg - g) > tolerance || Math.abs(pb - b) > tolerance) continue;
      count++;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (!count) return { count: 0, box: null };
  return { count, box: { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 } };
}
