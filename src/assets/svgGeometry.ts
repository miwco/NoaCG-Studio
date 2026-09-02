// WHERE A DRAWN SHAPE ACTUALLY IS, once its transforms are taken into account.
//
// An SVG shape's `x`/`y`/`width`/`height` are in ITS OWN coordinate system, and every `transform`
// between it and the root moves that system. Reading the attributes alone is right only for
// artwork drawn square on the artboard, and hand-drawn artwork rarely is: the owner's quiz board
// (2026-09-02) is a set of plates turned a few degrees on purpose, and its question plate - 1238 x
// 259 where it is painted - was inventoried as 231 x 1233, the portrait rectangle it was before an
// 88.68 degree rotation. Everything built on that inventory then ran on rectangles that are not
// where the shapes are: the widest-first order, which shape the growth default picks, which shapes
// make the list at all, and the size printed beside each one.
//
// The runtime does not have this problem - it measures a rendered document through
// getBoundingClientRect and the element's CTM. This is the same answer computed from the markup,
// at import, where nothing is rendered yet.
//
// Pure and DOM-free on purpose, so it is testable without a browser: the caller collects the
// transform strings down the ancestor chain (assets/svgImport.ts) and this does the arithmetic.
// Self-tests: scripts/svg-geometry.test.mjs.

/** An affine transform, in SVG's own order: x' = a·x + c·y + e, y' = b·x + d·y + f. */
export interface Matrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

/** An axis-aligned rectangle in whatever coordinate system the caller is working in. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const IDENTITY: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** `outer` applied AFTER `inner` — the order `transform="A B"` means, and the order an ancestor's
 *  transform relates to its child's. */
export function compose(outer: Matrix, inner: Matrix): Matrix {
  return {
    a: outer.a * inner.a + outer.c * inner.b,
    b: outer.b * inner.a + outer.d * inner.b,
    c: outer.a * inner.c + outer.c * inner.d,
    d: outer.b * inner.c + outer.d * inner.d,
    e: outer.a * inner.e + outer.c * inner.f + outer.e,
    f: outer.b * inner.e + outer.d * inner.f + outer.f,
  };
}

const RAD = Math.PI / 180;

/** The numbers inside one transform function, in order. Separated by commas, whitespace, or both,
 *  and a leading minus binds to its own number ("1-2" is two numbers, which is how a minified
 *  exporter writes them). */
function args(body: string): number[] {
  const found = body.match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g);
  return found ? found.map(Number).filter((n) => Number.isFinite(n)) : [];
}

function rotation(deg: number, cx: number, cy: number): Matrix {
  const cos = Math.cos(deg * RAD);
  const sin = Math.sin(deg * RAD);
  const spin: Matrix = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
  if (cx === 0 && cy === 0) return spin;
  // Rotation about a point is translate(c) · rotate · translate(-c), which is what the optional
  // second and third arguments mean.
  return compose(
    compose({ ...IDENTITY, e: cx, f: cy }, spin),
    { ...IDENTITY, e: -cx, f: -cy },
  );
}

/**
 * Parse one `transform` attribute — every function SVG 1.1 defines, in the order they are written.
 * An unrecognised function is skipped rather than throwing: a file we cannot fully read still
 * imports, and skipping leaves the shape where the attributes said, which is exactly today's
 * answer rather than a worse one.
 */
export function parseTransform(value: string | null | undefined): Matrix {
  if (!value) return IDENTITY;
  let out = IDENTITY;
  const fn = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
  let match = fn.exec(value);
  while (match !== null) {
    const name = match[1].toLowerCase();
    const n = args(match[2]);
    let step: Matrix | null = null;
    if (name === 'matrix' && n.length >= 6) {
      step = { a: n[0], b: n[1], c: n[2], d: n[3], e: n[4], f: n[5] };
    } else if (name === 'translate' && n.length >= 1) {
      step = { ...IDENTITY, e: n[0], f: n[1] ?? 0 };
    } else if (name === 'scale' && n.length >= 1) {
      step = { ...IDENTITY, a: n[0], d: n[1] ?? n[0] };
    } else if (name === 'rotate' && n.length >= 1) {
      step = rotation(n[0], n[1] ?? 0, n[2] ?? 0);
    } else if (name === 'skewx' && n.length >= 1) {
      step = { ...IDENTITY, c: Math.tan(n[0] * RAD) };
    } else if (name === 'skewy' && n.length >= 1) {
      step = { ...IDENTITY, b: Math.tan(n[0] * RAD) };
    }
    if (step) out = compose(out, step);
    match = fn.exec(value);
  }
  return out;
}

/** Every transform between a shape and the root, applied. Pass them OUTERMOST FIRST — the root's
 *  nearest descendant down to the shape's own attribute — which is the order they compose in. */
export function chainMatrix(transforms: readonly (string | null | undefined)[]): Matrix {
  let out = IDENTITY;
  for (const t of transforms) out = compose(out, parseTransform(t));
  return out;
}

/**
 * The AXIS-ALIGNED box a transformed rectangle covers, in the root's coordinates - all four
 * corners moved, then the extent of them.
 *
 * A rotated rectangle does not stay a rectangle, so this is deliberately the box AROUND it and
 * not the shape itself: it is what "is this text inside that plate", "which shape is widest" and
 * "how big is it" are asked against, and every one of those wants the covered extent. The tilt
 * itself is never lost, because the artwork is never redrawn - the markup keeps its transform.
 */
export function transformedBox(local: Box, matrix: Matrix): Box {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [cx, cy] of [
    [local.x, local.y],
    [local.x + local.width, local.y],
    [local.x + local.width, local.y + local.height],
    [local.x, local.y + local.height],
  ] as const) {
    xs.push(matrix.a * cx + matrix.c * cy + matrix.e);
    ys.push(matrix.b * cx + matrix.d * cy + matrix.f);
  }
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { x: left, y: top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
}

/** The two together, which is what a caller actually wants. */
export function boxInUserSpace(local: Box, transforms: readonly (string | null | undefined)[]): Box {
  return transformedBox(local, chainMatrix(transforms));
}
