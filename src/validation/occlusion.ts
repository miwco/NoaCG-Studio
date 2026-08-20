// Is painted text COVERED by something drawn on top of it?
//
// THE HOLE THIS FILLS. `runtimeBench`'s overlap check pairs LEAVES - elements that own a text
// node, plus images - because "two unrelated texts on top of each other is the #1 broadcast
// defect". A PANEL owns no text of its own, so a panel is never in a pair, and text that
// disappears under one is unmeasurable by that check however completely it vanishes. Found
// 2026-08-20 while reproducing the recreate bench's batch 1.4 (docs/NOACG_PRO_PLAN.md §26.1):
// the frame that prompted the search turned out NOT to be an occlusion, and the hole was real
// anyway - nothing anywhere in the repo asks this question.
//
// WHY HIT-TESTING RATHER THAN GEOMETRY. "Painted on top" is paint order, and paint order is
// stacking contexts, `z-index`, positioning and document order together. Re-deriving it from
// computed style is a well-known way to be subtly wrong; the browser already knows the answer
// and `elementsFromPoint` reports it. Two consequences, both handled below rather than hoped
// past: hit testing SKIPS `pointer-events: none`, so the probe forces pointer events on for its
// own duration, and hit testing does not care whether an element paints anything, so the stack
// is walked down to the first element that actually does.
//
// WHAT IS SAMPLED IS THE TEXT, NOT ITS BOX. A block-level span's rect is wider than its glyphs,
// and sampling the rect would count the empty part of the line as "visible" and dilute every
// reading. `Range.getClientRects()` gives the line boxes the glyphs actually occupy, which is
// what a viewer is looking at.
//
// IT MEASURES; the caller decides what to do with the number. `runtimeBench` wires it to a
// finding, with a threshold read off the shipped catalog by `scripts/occlusion-sweep.mjs`.

/** A covering element must be at least this opaque to count as hiding anything. Below it the
 *  text still reads through, which is what a tint or a soft scrim is for. Controlled from both
 *  sides in `scripts/occlusion-sweep.mjs --control`: an opaque panel over a name must read as
 *  covered, the same panel at 0.3 must not, and neither must a gradient scrim. */
export const COVER_OPACITY_FLOOR = 0.6;

/** Covered at or above this share of its own line boxes, a line has stopped being readable and
 *  the graphic is broken. Read off the shipped catalog - see `OCCLUSION_WARN`. */
export const OCCLUSION_ERROR = 0.5;
/** …and above this, part of a line is hidden. Deliberately the same two-band shape
 *  `runtimeBench`'s overlap check already uses, so one defect family reads one way. */
export const OCCLUSION_WARN = 0.05;

/** Sample step along a line box, in CSS px. Fine enough that a panel edge cutting a couple of
 *  glyphs is visible in the share, coarse enough that a full frame stays a few thousand hit
 *  tests rather than a few hundred thousand. */
const SAMPLE_STEP_PX = 6;

/** Line boxes thinner than this in either direction carry no readable glyph. */
const MIN_LINE_PX = 3;

export interface OcclusionReading {
  /** The covered text, described the way every other bench finding describes an element. */
  el: string;
  /** First characters of the text, so a reader can find it on the frame. */
  snippet: string;
  /** Share of the text's own line boxes that something else paints over, 0-1. */
  coveredShare: number;
  /** What is covering it, commonest first - descriptions, not elements, so the reading can be
   *  serialised into a ledger. */
  coveredBy: string[];
}

function describe(el: Element): string {
  if (el.id) return `#${el.id}`;
  const cls = el.getAttribute('class')?.trim().split(/\s+/)[0];
  return cls ? `.${cls}` : el.tagName.toLowerCase();
}

/** Computed opacity multiplied up the ancestor chain - the same reading `runtimeBench` takes,
 *  because an element made transparent by its parent covers nothing either. */
function effectiveOpacity(el: Element, win: Window): number {
  let o = 1;
  for (let node: Element | null = el; node && node !== win.document.body; node = node.parentElement) {
    const cs = win.getComputedStyle(node);
    if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
    o *= parseFloat(cs.opacity) || 0;
    if (o <= 0) return 0;
  }
  return o;
}

/**
 * Does this element paint something a viewer would see instead of what is behind it?
 *
 * A BACKGROUND IMAGE IS DELIBERATELY NOT ENOUGH ON ITS OWN when it is a gradient. A scrim laid
 * over the lower third of a frame is a gradient that is transparent exactly where the text is,
 * and counting it as a cover would report the commonest legitimate construction in broadcast as
 * the defect this file exists to find. A raster `url()` is a different matter - it paints.
 */
function paintsOver(el: Element, win: Window): boolean {
  if (effectiveOpacity(el, win) < COVER_OPACITY_FLOOR) return false;
  if (el.tagName === 'IMG') return Boolean((el as HTMLImageElement).currentSrc);
  const cs = win.getComputedStyle(el);
  if (cs.backgroundImage && cs.backgroundImage !== 'none' && !/gradient\(/i.test(cs.backgroundImage)) {
    return true;
  }
  const bg = cs.backgroundColor;
  if (!bg || bg === 'transparent') return false;
  const alpha = /rgba?\([^)]*,\s*([\d.]+)\s*\)/.exec(bg);
  return alpha ? Number(alpha[1]) >= COVER_OPACITY_FLOOR : true;
}

interface Box { left: number; right: number; top: number; bottom: number }

/**
 * What an ancestor's `overflow` leaves of this element, in viewport coordinates.
 *
 * THE FALSE POSITIVE THIS EXISTS TO CLOSE, found by the calibration sweep rather than argued
 * about. `Range.getClientRects()` reports the LAYOUT rects of the text, and layout does not
 * stop at a clip: es02 under doubled values lays "TEAM LIQUID TEAM LIQUID" out to x=974 while
 * its own box ends at 698, and the glyphs past 698 are simply never painted. Sampling the
 * layout rects walked those phantom glyphs straight under the score chip at 714 and reported
 * the one and only occlusion in 502 shipped designs - a defect that is not on the screen.
 *
 * The same reading `spacingCheck.visualRect` takes one directory over, for the same reason.
 * `clip-path` is deliberately NOT consulted: it cuts painted output with no overflow property
 * anywhere, and the instrument that owns that question is `runtimeBench`'s own clip check.
 */
function clippedBy(el: Element, win: Window): Box {
  const box: Box = { left: -Infinity, right: Infinity, top: -Infinity, bottom: Infinity };
  for (let a = el.parentElement; a; a = a.parentElement) {
    const cs = win.getComputedStyle(a);
    const clipsX = cs.overflowX !== 'visible';
    const clipsY = cs.overflowY !== 'visible';
    if (!clipsX && !clipsY) continue;
    const r = a.getBoundingClientRect();
    if (clipsX) {
      box.left = Math.max(box.left, r.left);
      box.right = Math.min(box.right, r.right);
    }
    if (clipsY) {
      box.top = Math.max(box.top, r.top);
      box.bottom = Math.min(box.bottom, r.bottom);
    }
  }
  return box;
}

/** The line boxes this element's OWN text actually PAINTS - its layout rects, cut down by every
 *  ancestor that clips. */
function lineBoxes(el: Element, win: Window): Box[] {
  const clip = clippedBy(el, win);
  const out: Box[] = [];
  for (const node of el.childNodes) {
    if (node.nodeType !== 3 || !(node.textContent ?? '').trim()) continue;
    const range = win.document.createRange();
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) {
      const box = {
        left: Math.max(rect.left, clip.left),
        right: Math.min(rect.right, clip.right),
        top: Math.max(rect.top, clip.top),
        bottom: Math.min(rect.bottom, clip.bottom),
      };
      if (box.right - box.left >= MIN_LINE_PX && box.bottom - box.top >= MIN_LINE_PX) out.push(box);
    }
    range.detach();
  }
  return out;
}

/**
 * Measure every text-owning element in the frame for text painted over by something else.
 *
 * The caller passes the elements it already collected, so the bench and this file never
 * disagree about which elements are text. Returns one reading per element that is covered at
 * all - an uncovered frame returns an empty array, which is the normal case.
 *
 * `exempt` is the bench's `dynamicsRoots`, and the first calibration run is why it is a
 * parameter rather than an afterthought: passing straight `collectLeaves` over the catalog
 * reported ten of the shipped TICKERS as covered text, 13-100% of a line, every one of them a
 * crawling item passing under the fixed label at the head of the crawl. That is the ticker
 * idiom - measured motion travelling behind something by design - and it is the same set the
 * overlap and overflow checks already exempt for the same reason one line up.
 */
export function measureOcclusion(
  win: Window,
  leaves: readonly Element[],
  exempt: readonly Element[] = [],
): OcclusionReading[] {
  const doc = win.document;
  // Hit testing skips `pointer-events: none`, and a decorative overlay is exactly the kind of
  // element a design marks that way - so without this the probe would be blind to the covers it
  // is most likely to meet. Forced on for the probe's own duration and removed in `finally`, so
  // a throw cannot leave the graphic's own pointer behaviour rewritten.
  const hitAll = doc.createElement('style');
  hitAll.textContent = '*{pointer-events:auto !important}';
  doc.head.appendChild(hitAll);
  try {
    const readings: OcclusionReading[] = [];
    const isExempt = (el: Element): boolean => exempt.some((r) => r === el || r.contains(el));
    for (const leaf of leaves) {
      if (isExempt(leaf)) continue;
      const boxes = lineBoxes(leaf, win);
      if (!boxes.length) continue;
      let samples = 0;
      let covered = 0;
      const by = new Map<string, number>();
      for (const box of boxes) {
        const y = (box.top + box.bottom) / 2;
        for (let x = box.left + SAMPLE_STEP_PX / 2; x < box.right; x += SAMPLE_STEP_PX) {
          if (x < 0 || y < 0 || x > win.innerWidth || y > win.innerHeight) continue;
          samples += 1;
          // Walk DOWN the stack to the first element that actually paints. Hit testing happily
          // returns a transparent wrapper, and stopping at the top of the stack would report
          // every graphic that wraps its composition in a positioned div as fully covered.
          for (const hit of doc.elementsFromPoint(x, y)) {
            if (hit === leaf || leaf.contains(hit)) break;          // the text itself - visible
            if (hit.contains(leaf)) break;                          // its own ancestor - behind it
            if (!paintsOver(hit, win)) continue;                    // a transparent layer - look under
            covered += 1;
            const name = describe(hit);
            by.set(name, (by.get(name) ?? 0) + 1);
            break;
          }
        }
      }
      if (!samples || !covered) continue;
      readings.push({
        el: describe(leaf),
        snippet: (leaf.textContent ?? '').trim().slice(0, 40),
        coveredShare: Math.round((covered / samples) * 1000) / 1000,
        coveredBy: [...by.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name),
      });
    }
    return readings;
  } finally {
    hitAll.remove();
  }
}
