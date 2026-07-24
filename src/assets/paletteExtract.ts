// Brand colours read straight out of an uploaded image — a logo, a still from the package
// the user already runs. Deterministic and offline: no model call, no network, no randomness
// (k-means with a random seed would give a different answer every press for the same file,
// which is exactly the kind of "AI magic" this platform avoids where arithmetic will do).
//
// It PROPOSES, never applies. The step shows the colours as swatches and the user picks the
// one that is actually their brand — the machine cannot know whether the red in a crest is
// the identity or the shirt behind it.

/** One colour found in the image. */
export interface BrandColor {
  hex: string;
  /** Fraction of the counted (opaque) pixels this colour and its neighbours cover, 0..1. */
  share: number;
}

/** The four :root colours a picked accent implies (the house neutral system around it). */
export interface BrandPalette {
  accent: string;
  text: string;
  textDim: string;
  panel: string;
}

/** Longest edge the image is sampled at. Small on purpose: cheap, and it averages away
 *  compression noise and antialiased edges that would otherwise read as their own colours. */
const SAMPLE_EDGE = 96;
/** Pixels below this alpha are the transparent surround of a logo, not part of it. */
const MIN_ALPHA = 128;
/** Channel bits kept when bucketing (5 → a 32³ grid). Coarse enough to gather a gradient. */
const BUCKET_BITS = 3;
/** Two bucket means closer than this (per-channel sum of squares) are the same colour. */
const MERGE_DISTANCE_SQ = 34 * 34;

const clamp255 = (n: number): number => Math.min(255, Math.max(0, Math.round(n)));

const toHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b].map((c) => clamp255(c).toString(16).padStart(2, '0')).join('')}`;

/** #rgb / #rrggbb → channels. Returns null for anything else (never throws on user input). */
export function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const s = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) };
}

/** Hue 0..360, saturation and lightness 0..1. */
function toHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h = h * 60;
  return { h: h < 0 ? h + 360 : h, s, l };
}

function fromHsl(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return { r: clamp255((r1 + m) * 255), g: clamp255((g1 + m) * 255), b: clamp255((b1 + m) * 255) };
}

/**
 * How likely a colour is to BE the brand rather than the paper it sits on. Saturation is
 * most of it; near-white and near-black are penalised hard because a logo is mostly its own
 * background and ink, and those would otherwise win on area alone every time.
 */
function accentScore(r: number, g: number, b: number, share: number): number {
  const { s, l } = toHsl(r, g, b);
  if (l > 0.94 || l < 0.06) return 0; // paper and ink: never an accent
  // Mid lightness reads best on air; the curve peaks around 0.5 and falls off both ways.
  const lightnessFit = 1 - Math.abs(l - 0.52) * 1.4;
  return s * s * Math.max(0.05, lightnessFit) * Math.sqrt(share);
}

interface Bucket {
  count: number;
  r: number;
  g: number;
  b: number;
}

/** Decode a data URL (or any same-origin src) into an offscreen canvas' pixels. */
async function samplePixels(src: string): Promise<{ data: Uint8ClampedArray; total: number } | null> {
  const image = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  if (!image || !image.naturalWidth || !image.naturalHeight) return null;
  const scale = Math.min(1, SAMPLE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const w = Math.max(1, Math.round(image.naturalWidth * scale));
  const h = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, w, h);
  try {
    return { data: ctx.getImageData(0, 0, w, h).data, total: w * h };
  } catch {
    // A tainted canvas (a cross-origin src) — never for the data URLs this app uploads,
    // but reading it would throw, and no colours is a better answer than a crash.
    return null;
  }
}

/**
 * The image's colours, best accent candidate first. Empty when the image cannot be read or
 * holds nothing but transparency, paper and ink — an honest "no suggestion" the UI can show
 * as nothing at all rather than a wrong guess.
 */
export async function extractBrandColors(src: string, max = 6): Promise<BrandColor[]> {
  const sampled = await samplePixels(src);
  if (!sampled) return [];
  const shift = 8 - BUCKET_BITS;
  const buckets = new Map<number, Bucket>();
  let counted = 0;
  for (let i = 0; i < sampled.data.length; i += 4) {
    const a = sampled.data[i + 3];
    if (a < MIN_ALPHA) continue;
    const r = sampled.data[i];
    const g = sampled.data[i + 1];
    const b = sampled.data[i + 2];
    // Bucket on the coarse grid, but accumulate the REAL channel values: the representative
    // colour is then the bucket's mean, not the grid corner it happened to land in.
    const key = ((r >> shift) << (BUCKET_BITS * 2)) | ((g >> shift) << BUCKET_BITS) | (b >> shift);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count += 1;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
    } else {
      buckets.set(key, { count: 1, r, g, b });
    }
    counted += 1;
  }
  if (!counted) return [];

  // Merge neighbouring buckets into the heaviest one they are close to — a gradient or an
  // antialiased edge is one brand colour, not the dozen grid cells it crosses.
  const means = [...buckets.values()]
    .map((k) => ({ count: k.count, r: k.r / k.count, g: k.g / k.count, b: k.b / k.count }))
    .sort((a, b) => b.count - a.count);
  const merged: typeof means = [];
  for (const candidate of means) {
    const near = merged.find((m) => {
      const dr = m.r - candidate.r;
      const dg = m.g - candidate.g;
      const db = m.b - candidate.b;
      return dr * dr + dg * dg + db * db < MERGE_DISTANCE_SQ;
    });
    if (near) {
      // Weighted mean, so merging never drags the colour away from where its mass is.
      const total = near.count + candidate.count;
      near.r = (near.r * near.count + candidate.r * candidate.count) / total;
      near.g = (near.g * near.count + candidate.g * candidate.count) / total;
      near.b = (near.b * near.count + candidate.b * candidate.count) / total;
      near.count = total;
    } else {
      merged.push({ ...candidate });
    }
  }

  return merged
    .map((m) => ({
      hex: toHex(m.r, m.g, m.b),
      share: m.count / counted,
      score: accentScore(m.r, m.g, m.b, m.count / counted),
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ hex, share }) => ({ hex, share }));
}

/**
 * The neutral system the house uses around a chosen accent: white text, dimmed white
 * secondary, and a near-black panel tinted toward the accent's own hue so the graphic reads
 * as one thing. Deliberately DARK — the panel is what body text sits on, and every generated
 * template is judged on broadcast-grade contrast (white on this stays far above 4.5:1).
 */
export function paletteFromAccent(accent: string): BrandPalette {
  const rgb = parseHex(accent);
  const hue = rgb ? toHsl(rgb.r, rgb.g, rgb.b).h : 0;
  const panel = fromHsl(hue, 0.16, 0.06);
  return {
    accent: rgb ? toHex(rgb.r, rgb.g, rgb.b) : accent,
    text: '#ffffff',
    textDim: 'rgba(255,255,255,0.7)',
    panel: `rgba(${panel.r},${panel.g},${panel.b},0.92)`,
  };
}
