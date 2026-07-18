// Runtime READABILITY checks on whatever the host has mounted, run against the real
// composition DOM at a settled frame. Two independent failure classes, one implementation
// each, both consumed by two callers:
//
//   - the validator's probe (src/video/validate.ts -> the `probe` message), where a CLIP
//     finding becomes a repair round before the composition is ever applied;
//   - scripts/video-bench.mjs, which reaches into this frame over CDP and calls the
//     window.__noacgTextChecks global installed at boot.
//
// It lives HERE, in the host package, because this is the document being inspected - one
// copy, no hand-mirroring (contrast protocol.ts, which two packages must both speak).
//
// CLIPPING: "KITCHEN" rendering as "KITCH", "WORLD REPORT" as "WORLD REP". Measured from
// the glyphs themselves - a Range over the element's own text nodes - against the frame and
// every overflow-clipping ancestor. Measuring the RANGE, not the element box, is what makes
// this work: nowrap text inside a fixed-width clipped card overflows silently, and the
// element's own rect reports the (uncut) box width, not the painted glyph extent.
//
// OCCLUSION: "the title is painted behind the shape panels" - hit-testing sample points
// against the real paint order, the video counterpart of the SPX bench's overlap check.
//
// False positives are the expensive failure here (a flagged run is discarded and rewritten),
// so the checks are deliberately conservative: clip-path/mask-image ancestors are invisible
// to a rect test and stay unflagged (an intentional mask reads as clean), the thresholds
// below ignore sub-glyph bleeds, and callers only trust a finding that PERSISTS across
// several hold frames - which is what excludes an entrance still in flight.

/** Fraction of the text's own width/height that must be lost before it counts as clipped.
 *  0.12 is comfortably below one short word ("WORLD REPORT" -> "WORLD REP" loses ~17%,
 *  "KITCHEN" -> "KITCH" ~28%) and comfortably above a trailing-space or antialiasing bleed. */
const CLIP_LOSS = 0.12;
/** …and an absolute floor, so a big headline losing a hairline never fires. */
const CLIP_MIN_PX = 8;

export interface TextIssue {
  kind: 'clip' | 'occlusion';
  /** Stable across frames (the percentages in `message` are not) - callers dedupe and
   *  intersect on this, never on the prose. */
  key: string;
  message: string;
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const boxOf = (r: DOMRect): Box => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
const width = (b: Box) => Math.max(0, b.right - b.left);
const height = (b: Box) => Math.max(0, b.bottom - b.top);

function describe(el: Element): string {
  const cls = typeof el.className === 'string' && el.className ? `.${el.className.split(' ')[0]}` : '';
  return `<${el.tagName.toLowerCase()}${cls}>`;
}

const label = (el: Element) => (el.textContent ?? '').trim().slice(0, 28);

/**
 * Every element that renders its OWN readable text: visible, not tiny, carrying a direct
 * non-empty text node, and big enough on screen to matter. Both checks start here.
 */
export function readableTextElements(doc: Document = document, win: Window = window): HTMLElement[] {
  return [...doc.querySelectorAll<HTMLElement>('body *')].filter((el) => {
    const cs = win.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.3) return false;
    if (parseFloat(cs.fontSize) < 12) return false;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim())) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.width * r.height > 500;
  });
}

/** The painted extent of an element's OWN glyphs (its direct text nodes), ignoring
 *  descendants - a Range measures what is actually drawn, box overflow included. */
function textExtent(el: HTMLElement, doc: Document): Box | null {
  let box: Box | null = null;
  for (const node of el.childNodes) {
    if (node.nodeType !== 3 || !(node.textContent ?? '').trim()) continue;
    const range = doc.createRange();
    range.selectNodeContents(node);
    const r = range.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    box = box
      ? {
          left: Math.min(box.left, r.left),
          top: Math.min(box.top, r.top),
          right: Math.max(box.right, r.right),
          bottom: Math.max(box.bottom, r.bottom),
        }
      : boxOf(r);
  }
  return box;
}

const CLIPS = /^(hidden|clip|scroll|auto)$/;

/**
 * Clip a box down through the ancestor chain, per axis, remembering who took the biggest
 * bite. The frame itself (the viewport) is the outermost clipper.
 */
function clipRegion(el: HTMLElement, win: Window): { region: Box; clippers: Element[] } {
  const region: Box = { left: 0, top: 0, right: win.innerWidth, bottom: win.innerHeight };
  const clippers: Element[] = [];
  for (let a = el.parentElement; a && a !== el.ownerDocument.documentElement; a = a.parentElement) {
    const cs = win.getComputedStyle(a);
    const clipsX = CLIPS.test(cs.overflowX);
    const clipsY = CLIPS.test(cs.overflowY);
    if (!clipsX && !clipsY) continue;
    // The BORDER box, not the padding box: the larger region, so padding never manufactures
    // a finding. getBoundingClientRect is already in the same (post-transform) space as the
    // text Range, so scaled previews compare correctly.
    const r = a.getBoundingClientRect();
    if (clipsX) {
      region.left = Math.max(region.left, r.left);
      region.right = Math.min(region.right, r.right);
    }
    if (clipsY) {
      region.top = Math.max(region.top, r.top);
      region.bottom = Math.min(region.bottom, r.bottom);
    }
    clippers.push(a);
  }
  return { region, clippers };
}

/** An element that clips its own overflow cuts its own text too (the fixed-width card). */
function selfClip(el: HTMLElement, win: Window, region: Box): Box {
  const cs = win.getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const out = { ...region };
  if (CLIPS.test(cs.overflowX)) {
    out.left = Math.max(out.left, r.left);
    out.right = Math.min(out.right, r.right);
  }
  if (CLIPS.test(cs.overflowY)) {
    out.top = Math.max(out.top, r.top);
    out.bottom = Math.min(out.bottom, r.bottom);
  }
  return out;
}

/** Text whose glyphs are cut by the frame edge or by an overflow-clipping ancestor. */
export function clipIssues(doc: Document = document, win: Window = window): TextIssue[] {
  const issues: TextIssue[] = [];
  for (const el of readableTextElements(doc, win)) {
    const text = textExtent(el, doc);
    if (!text || width(text) <= 0 || height(text) <= 0) continue;

    const { region: ancestorRegion, clippers } = clipRegion(el, win);
    const region = selfClip(el, win, ancestorRegion);
    const visible: Box = {
      left: Math.max(text.left, region.left),
      top: Math.max(text.top, region.top),
      right: Math.min(text.right, region.right),
      bottom: Math.min(text.bottom, region.bottom),
    };

    const lostW = width(text) - width(visible);
    const lostH = height(text) - height(visible);
    const axis =
      lostW > Math.max(CLIP_MIN_PX, CLIP_LOSS * width(text))
        ? ('width' as const)
        : lostH > Math.max(CLIP_MIN_PX, CLIP_LOSS * height(text))
          ? ('height' as const)
          : null;
    if (!axis) continue;

    const pct = Math.round(((axis === 'width' ? lostW / width(text) : lostH / height(text)) * 100));
    // Name the culprit so the repair round has somewhere to go: the innermost clipper, or
    // the frame when nothing else took the bite.
    const cutter = clippers.length ? describe(clippers[0]) : 'the frame edge';
    issues.push({
      kind: 'clip',
      key: `clip:${label(el)}:${axis}`,
      message: `"${label(el)}" is CUT OFF - ${pct}% of its ${axis} is clipped by ${cutter}. Give the text room (or fit the type to the box); readable text must never be cropped at the hold.`,
    });
  }
  return issues.slice(0, 5);
}

/** Is this element something that PAINTS over what is behind it? */
function painted(el: Element, win: Window): boolean {
  if (['IMG', 'VIDEO', 'CANVAS', 'SVG', 'svg'].includes(el.tagName)) return true;
  const cs = win.getComputedStyle(el);
  if (Number(cs.opacity) < 0.05) return false;
  // background-clip: text paints only inside its own glyphs - the standard technique for a
  // specular sweep over a wordmark (a duplicate glyph layer), not an occluder.
  if ((cs.webkitBackgroundClip ?? cs.backgroundClip) === 'text') return false;
  if (cs.backgroundImage !== 'none') return true;
  const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
  if (!m) return false;
  const parts = m[1].split(',').map(Number);
  return (parts[3] ?? 1) > 0.05;
}

/**
 * Text painted BEHIND the graphics: hit-test each text element against the real paint order
 * (elementsFromPoint). Occluded = most sample points are covered by a painted element that
 * is neither ancestor nor descendant and does not carry the same text (duplicate glyph
 * layers - sweeps, glows - are deliberate).
 */
export function occlusionIssues(doc: Document = document, win: Window = window): TextIssue[] {
  const issues: TextIssue[] = [];
  for (const el of readableTextElements(doc, win)) {
    const r = el.getBoundingClientRect();
    const points: [number, number][] = [
      [r.left + r.width / 2, r.top + r.height / 2],
      [r.left + r.width * 0.25, r.top + r.height / 2],
      [r.left + r.width * 0.75, r.top + r.height / 2],
      [r.left + r.width / 2, r.top + r.height * 0.25],
      [r.left + r.width / 2, r.top + r.height * 0.75],
    ];
    let blocked = 0;
    let blocker: string | null = null;
    for (const [x, y] of points) {
      if (x < 0 || y < 0 || x >= win.innerWidth || y >= win.innerHeight) continue;
      for (const hit of doc.elementsFromPoint(x, y)) {
        if (hit === el || el.contains(hit) || hit.contains(el)) break; // reached our text - visible here
        const hitText = (hit.textContent ?? '').trim();
        if (hitText && hitText === (el.textContent ?? '').trim()) break;
        if (painted(hit, win)) {
          blocked++;
          blocker = blocker ?? describe(hit);
          break;
        }
      }
    }
    if (blocked >= 3) {
      issues.push({
        kind: 'occlusion',
        key: `occlusion:${label(el)}`,
        message: `"${label(el)}" is painted BEHIND ${blocker} (${blocked}/5 sample points covered)`,
      });
    }
  }
  return issues.slice(0, 5);
}

declare global {
  interface Window {
    __noacgTextChecks?: { clip: () => TextIssue[]; occlusion: () => TextIssue[] };
  }
}

/** Expose the checks to a driving harness (scripts/video-bench.mjs reaches in over CDP).
 *  Read-only DOM analysis - nothing here can reach the embedding app. */
export function installTextChecks(win: Window = window, doc: Document = document): void {
  win.__noacgTextChecks = {
    clip: () => clipIssues(doc, win),
    occlusion: () => occlusionIssues(doc, win),
  };
}
