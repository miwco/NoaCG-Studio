// THE TASTE instrument - the owner's own six composition rules, as measurements of a RENDERED
// frame (memory: owner-taste-rules-composition; docs/NOACG_PRO_PLAN.md §15, §17).
//
// BENCH-ONLY (see exemplars.ts for the deletion condition).
//
// WHY IT EXISTS. On 2026-08-19 the owner read four galleries - 36 blind package rows and two
// topic-card sets - and across roughly sixty individual comments named the SAME small set of
// faults: a mark not centred in the square it sits in (ten of thirty-six rows, the single
// most-repeated complaint in the corpus), secondary text "unacceptably small", text "too thin"
// and "grey on black … unreadable", a mark eating the card's primary real estate, and a package
// carrying its wordmark on two pieces of three. Every one of those is a NUMBER on a rendered
// frame, and not one of them was measured anywhere. Until they are, the owner IS the gate and
// each verdict costs a human evening.
//
// THE SIX, in the owner's numbering:
//
//   1. A mark inside a container is CENTRED in that container. "If you have a square somewhere,
//      I want the logo to be in the middle of the square, or at least some kind of balance."
//   2. Between an accent line and text, a mark is optically BALANCED, not crowded. "If it's too
//      close to the accent line, it feels like it's some mistake."
//   3. SECONDARY text has a floor too. Measured as the SMALLEST INFORMATIONAL line rather than
//      as "the second line" - see `measureTaste`, where reading it as the second line was blind
//      on every one-line graphic the owner used to state the rule.
//   4. WEIGHT and CONTRAST are part of legibility, not separate from it. "A size-only
//      legibility instrument passes text the owner cannot read."
//   5. A mark never eats PRIMARY real estate - B27 put the logo on top of the topic card:
//      "it takes valuable real estate - it should be on the same row as the text."
//   6. A package's mark is present on EVERY piece or none.
//
// IT REPORTS AND DOES NOT GATE, like every instrument beside it (docs/DESIGN_PRINCIPLES.md and
// the §0.2 human read). Two of the six additionally refuse to carry a pass/fail at all, and
// they say so where they are measured: rule 2 because the owner stated it is not absolute
// ("sometimes it can work, and that's kind of the problem"), and rule 3 because the ratified
// secondary floor already exists in `model/designRules.ts` and disagrees with the owner by a
// factor the owner has not yet re-ratified. An instrument that invents a threshold to settle a
// disagreement has replaced the measurement with the opinion it was built to remove.
//
// WHAT IT DOES NOT DUPLICATE. `spacingCheck` already measures the mark's GAP to the nearest
// text and `proportionCheck` its HEIGHT against the type; neither asks where the mark sits
// INSIDE something, which is rules 1, 2 and 5. `readabilityCheck` already measures size, weight
// and contrast separately; rule 4 is the JOINT reading - text that clears its size floor and
// still cannot be read - which is a question none of its three findings asks.

import {
  collectPainted,
  findPanel,
  markContentRect,
  panelMembers,
  primaryTypeSize,
  round2,
  type Painted,
} from './spacingCheck';
import { measureReadability, type ReadabilityReport } from '../../validation/readabilityCheck';
import type { LegibilityMode, ViewingTarget } from '../../model/designRules';

// ── The thresholds, read off the shipped catalog ───────────────────────────────────────
//
// The sweep is `scripts/pro-taste-rejudge.mjs --control`, which measures every mark-capable
// design the catalog ships and prints the distribution. The numbers below are that
// distribution's own, in the discipline the rest of this directory follows: replace an
// adjective with a measurement, never pick a number that sounds right.

/**
 * How lopsided a mark may sit in its container before the imbalance reads as a mistake, as a
 * signed share of the free space on that axis: 0 is dead centre, 1 is flush against one edge.
 *
 * THE CATALOG BARELY ADMITS A SPREAD TO READ THIS OFF, and that IS the reading. Measured over
 * the 25 mark-capable lower thirds with a square crest and again with a tall shield
 * (`benchmarks/pro/v1/spike/taste-calibration*.json`), thirteen resolve a container, and on the
 * axis the design actually chose they read 0.0 on nine of them, 0.03-0.04 on three, and 0.14
 * once (ls29, whose mark sits 21px under the panel's top and 28px above its bottom). The
 * shipped catalog centres its marks; there is no cluster to sit outside of.
 *
 * So the number has one job: let a deliberate OPTICAL nudge through - a mark whose visual mass
 * sits low or left is centred by eye a few percent off its box - while a mark that was simply
 * not centred still fails. It is ANDed with the absolute floor below, which is what keeps the
 * whole shipped catalog quiet.
 */
export const MARK_CENTRE_OFFSET = 0.12;
/**
 * …and only once the imbalance is worth seeing.
 *
 * READ OFF THE SAME SWEEP: the largest imbalance any shipped design shows on its chosen axis is
 * ls29's 7px, so 8 clears the entire catalog with a pixel to spare. The owner's own named case -
 * the sponsor-bug tile whose mark sits 20px from one edge and 45px from the other - is 25px,
 * three times above this floor, so raising it to cover the catalog costs nothing the rule exists
 * to catch.
 */
export const MARK_CENTRE_MIN_PX = 8;

/** A painted non-text element this thin, relative to its own length, is an ACCENT RULE rather
 *  than a panel - the shape rule 2 is about. The catalog's accents run 4-14px against panels
 *  hundreds of px long, so an aspect cut separates them without needing a pixel threshold. */
export const ACCENT_ASPECT = 0.2;

/** A mark and a text line share a ROW when their vertical spans overlap by at least this share
 *  of the shorter one. Below it the mark has taken a band of its own - rule 5.
 *
 *  READ OFF THE CATALOG (`--control`): all 25 mark-capable lower thirds share a row with their
 *  primary line, the tightest at 0.53, and none of them fires at this floor. A shipped design
 *  that stacked its mark above the headline would be the counter-example; there isn't one. */
export const ROW_SHARE_FLOOR = 0.25;

export interface TasteFinding {
  /** The vocabulary: mark-off-centre, mark-owns-a-row, legible-size-only. The two
   *  deliberately-thresholdless rules (2 and 3) mint no findings - they report numbers. */
  code: string;
  /** The owner rule this answers, 1-6, so a reader can go straight to the words behind it. */
  rule: number;
  detail: string;
}

/** Rule 1 - where the mark sits inside the thing that holds it. */
export interface MarkCentreReading {
  /** The container, described. `own-well` when the mark element paints its own surface and the
   *  square IS its padding box; otherwise the nearest painted ancestor with a surface. */
  container: string;
  containerKind: 'own-well' | 'ancestor';
  /** Free space on each side, in px, between the mark's ink and the container's inner box. */
  gaps: { top: number; right: number; bottom: number; left: number };
  /** Signed share of the axis's free space, -1 (flush left/top) to 1 (flush right/bottom). */
  offset: { x: number; y: number };
  /** Which axes the design actually chose, rather than the flow deciding - see `containerFor`.
   *  An offset on a non-free axis is reported and never judged. */
  free: { x: boolean; y: boolean };
}

/** Rule 2 - the mark between an accent line and the text. Reported, never judged. */
export interface MarkBalanceReading {
  accent: string;
  text: string;
  /** Gap from the mark's ink to the accent, and to the nearest text, in px. */
  toAccentPx: number;
  toTextPx: number;
  /** The smaller over the larger: 1 is optically balanced, 0 is one side touching. */
  balance: number;
}

/** Rule 3 - the second line's size, beside the floor that is actually ratified for it. */
export interface SecondaryTypeReading {
  primaryPx: number;
  /** Every reading the classifier called SECONDARY, smallest first. Empty on a one-line
   *  graphic, which is exactly why it is not the headline number - see `smallestPx`. */
  secondaryPx: number[];
  /** THE SMALLEST INFORMATIONAL LINE IN THE FRAME, whatever role it was given. This is the
   *  number the owner's eye lands on, and reading it off the SECOND line was the first
   *  version's blind spot: a sponsor bug has one line, so it had no second, so the rule the
   *  owner stated with the words "ON AIR" could not see a sponsor bug at all. */
  smallestPx: number;
  /** What the classifier called that smallest line, and its own words - because the role is
   *  what decides which floor applies to it, and on a one-line graphic the answer is
   *  `primary`, which is a 50px floor rather than a 20px one. */
  smallestRole: string;
  smallestSnippet: string;
  /** True when the frame carries a single informational size, so the smallest IS the primary. */
  singleLine: boolean;
  /** Whether the readability instrument ALREADY flagged that smallest line on size alone. This
   *  is the difference between "nobody is measuring this" and "it is measured and the floor
   *  disagrees with the owner", and the two need different fixes. */
  smallestFlaggedOnSize: boolean;
  /** The ratified hard floor the readability instrument named for that smallest line, from
   *  `model/designRules.ts`. Reported so the gap between the table and the owner is visible;
   *  this file does not judge against it, and it is absent when nothing flagged that line. */
  ratifiedFloorPx: number | null;
}

/** Rule 4 - the joint reading. One entry per text that clears its SIZE floor and still fails
 *  on weight or contrast, which is exactly the class a size-only instrument passes. */
export interface SizeOnlyReading {
  snippet: string;
  el: string;
  fontPx: number;
  weight: number;
  contrast: number | null;
  /** Which of the two carried the failure, or both. */
  failing: ('weight' | 'contrast')[];
}

/** Rule 5 - whether the mark shares a row with the graphic's primary text, or took its own. */
export interface MarkRowReading {
  primary: string;
  /** Vertical overlap as a share of the shorter of the two spans. */
  rowShare: number;
  /** The share of the panel's height the mark's own band occupies, when a panel resolves. */
  bandOfPanel: number | null;
  insidePanel: boolean;
}

/** Rule 4's other half: the frame's weakest informational text on each of the two axes,
 *  WHETHER OR NOT it failed a floor. A rule that only reports failures cannot say how far a
 *  ratified floor sits from where the owner's eye actually stops - which is the number a
 *  re-ratification needs, and the reason the countdown padding floor could be moved on evidence
 *  rather than on argument (`graphics.ts`). */
export interface WeakestText {
  byWeight: { snippet: string; el: string; fontPx: number; weight: number } | null;
  byContrast: { snippet: string; el: string; fontPx: number; contrast: number } | null;
}

export interface TasteReport {
  markCentre: MarkCentreReading | null;
  markBalance: MarkBalanceReading | null;
  secondaryType: SecondaryTypeReading | null;
  sizeOnly: SizeOnlyReading[];
  weakest: WeakestText;
  markRow: MarkRowReading | null;
  findings: TasteFinding[];
}

export interface TasteOptions {
  /** The brand mark's field id. Rules 1, 2 and 5 are about the mark and report null without it. */
  markFieldId?: string | null;
  /** Reuse a readability report the caller already measured, rather than measuring twice - the
   *  same "one number, one place" rule `gate.ts` follows when it reads the composer's notes. */
  readability?: ReadabilityReport | null;
  mode?: LegibilityMode;
  target?: ViewingTarget;
  markCentreOffset?: number;
  markCentreMinPx?: number;
  rowShareFloor?: number;
}

function inner(el: Element, win: Window): Painted['rect'] {
  const r = el.getBoundingClientRect();
  const style = win.getComputedStyle(el);
  const b = (side: string): number => parseFloat(style.getPropertyValue(`border-${side}-width`)) || 0;
  return {
    left: r.left + b('left'),
    right: r.right - b('right'),
    top: r.top + b('top'),
    bottom: r.bottom - b('bottom'),
  };
}

/**
 * The container rule 1 measures the mark inside.
 *
 * TWO SHAPES, and the catalog ships both. A design either draws a WELL and puts the image in it
 * (the mark element itself carries the background and expresses its clear space as padding -
 * `markContentRect`'s own lesson, one file over), or it drops the mark into a panel that
 * already existed. The first is the commoner shape and is the one the owner's "square" usually
 * is, so it is checked first; the second is the nearest painted ancestor carrying a surface.
 *
 * A mark with NEITHER is not "inside a container" and rule 1 does not apply to it - reported as
 * null rather than measured against the frame, which would be a different question with the
 * same name.
 *
 * THE AXES ARE ASKED SEPARATELY, and the calibration sweep is what forced that. Measuring both
 * axes of the smallest surface above the mark read eight shipped designs as 0.84-0.96 off
 * centre, because a mark docked at one end of a broadcast-width strap is off-centre IN THE
 * STRAP by construction - the flow put it there and no reader sees a mistake. But restricting
 * the container to one holding the mark ALONE loses the owner's actual case: on the sponsor bug
 * the square is the tile, the tile also carries "ON AIR", and the mark not being centred ACROSS
 * it is exactly the complaint.
 *
 * Both readings are recovered by asking which axis the mark's position is FREE on:
 *
 *   - a container laying the mark BESIDE its words positions it horizontally, so horizontal is
 *     the flow's answer and VERTICAL is the one the design chose - measure that;
 *   - a container STACKING the mark over its words positions it vertically, so HORIZONTAL is
 *     the free axis - which is the sponsor-bug tile;
 *   - a well holding no words at all leaves both axes free, which is the plain "square".
 *
 * Disjointness is tested against painted TEXT only, never against every painted sibling: an
 * accent bar down the tile's left edge is disjoint from the mark horizontally and is decoration
 * on the container, not a peer the flow balanced the mark against. Including it suppressed the
 * one case this rule exists for.
 */
function containerFor(
  mark: Painted, items: Painted[], win: Window,
): { rect: Painted['rect']; desc: string; kind: 'own-well' | 'ancestor' } | null {
  if (mark.hasSurface) {
    const box = inner(mark.el, win);
    if (box.right - box.left > 1 && box.bottom - box.top > 1) {
      return { rect: box, desc: mark.desc, kind: 'own-well' };
    }
  }
  const host = items
    .filter((p) => p !== mark && p.hasSurface && p.el.contains(mark.el))
    .sort((a, b) => (a.rect.right - a.rect.left) * (a.rect.bottom - a.rect.top)
      - (b.rect.right - b.rect.left) * (b.rect.bottom - b.rect.top))[0];
  return host ? { rect: inner(host.el, win), desc: host.desc, kind: 'ancestor' } : null;
}

/** Which axes the mark's position inside its container was NOT decided by the flow. */
function freeAxes(
  ink: Painted['rect'], mark: Painted, host: Painted['rect'], items: Painted[],
): { x: boolean; y: boolean } {
  const words = items.filter((p) => p.isText
    && !mark.el.contains(p.el)
    && p.rect.left >= host.left - 1 && p.rect.right <= host.right + 1
    && p.rect.top >= host.top - 1 && p.rect.bottom <= host.bottom + 1);
  const disjoint = (a0: number, a1: number, b0: number, b1: number): boolean => b0 >= a1 || b1 <= a0;
  return {
    x: !words.some((w) => disjoint(ink.left, ink.right, w.rect.left, w.rect.right)),
    y: !words.some((w) => disjoint(ink.top, ink.bottom, w.rect.top, w.rect.bottom)),
  };
}

/** An accent RULE: a painted non-text, non-image element far longer than it is thick. The
 *  "rule" definition is `spacingCheck`'s (non-text, not the panel); the aspect cut is what
 *  narrows it from "any shape" to the accent LINE rule 2 is about. */
function accents(items: Painted[], panel: Painted | null, aspect: number): Painted[] {
  return items.filter((p) => {
    if (p.isText || p.el.tagName === 'IMG' || p === panel) return false;
    const w = p.rect.right - p.rect.left;
    const h = p.rect.bottom - p.rect.top;
    if (w < 2 || h < 2) return false;
    return Math.min(w, h) / Math.max(w, h) <= aspect;
  });
}

function gapPx(a: Painted['rect'], b: Painted['rect']): number {
  const dx = Math.max(a.left - b.right, b.left - a.right, 0);
  const dy = Math.max(a.top - b.bottom, b.top - a.bottom, 0);
  return Math.max(dx, dy) || Math.min(dx, dy);
}

/**
 * Measure one settled rendered frame against the owner's six rules. Pure DOM reads; the caller
 * mounts the document, exactly as the four instruments beside this one are driven.
 *
 * Rule 6 is not here: it is a property of a SET, not of a frame, and lives in
 * `measurePackageMark` below.
 */
export function measureTaste(doc: Document, options: TasteOptions = {}): TasteReport {
  const report: TasteReport = {
    markCentre: null, markBalance: null, secondaryType: null, sizeOnly: [],
    weakest: { byWeight: null, byContrast: null }, markRow: null, findings: [],
  };
  const win = doc.defaultView;
  if (!win) return report;

  const centreOffset = options.markCentreOffset ?? MARK_CENTRE_OFFSET;
  const centreMinPx = options.markCentreMinPx ?? MARK_CENTRE_MIN_PX;
  const rowFloor = options.rowShareFloor ?? ROW_SHARE_FLOOR;

  const items = collectPainted(doc);
  const primary = primaryTypeSize(items);
  const panel = findPanel(items);
  const mark = options.markFieldId
    ? items.find((p) => p.el.id === options.markFieldId) ?? null
    : null;
  const ink = mark ? markContentRect(mark, win) : null;

  // ── Rule 1. The mark is centred in the square it sits in ────────────────────────────
  if (mark && ink) {
    const host = containerFor(mark, items, win);
    if (host) {
      const gaps = {
        left: round2(ink.left - host.rect.left),
        right: round2(host.rect.right - ink.right),
        top: round2(ink.top - host.rect.top),
        bottom: round2(host.rect.bottom - ink.bottom),
      };
      const axis = (a: number, b: number): number => {
        const free = a + b;
        return free > 0 ? round2((b - a) / free) : 0;
      };
      // Signed so the direction is readable: negative x means the mark hugs the RIGHT edge,
      // because the offset is measured as (right gap - left gap) over the free space.
      const offset = { x: axis(gaps.right, gaps.left), y: axis(gaps.bottom, gaps.top) };
      const free = host.kind === 'own-well'
        ? { x: true, y: true }
        : freeAxes(ink, mark, host.rect, items);
      report.markCentre = { container: host.desc, containerKind: host.kind, gaps, offset, free };
      for (const [name, off, a, b, isFree] of [
        ['horizontally', offset.x, gaps.left, gaps.right, free.x],
        ['vertically', offset.y, gaps.top, gaps.bottom, free.y],
      ] as const) {
        if (!isFree) continue;
        if (Math.abs(off) > centreOffset && Math.abs(a - b) >= centreMinPx) {
          report.findings.push({
            code: 'mark-off-centre',
            rule: 1,
            detail: `the mark sits ${Math.abs(round2(off))} of the free space off centre `
              + `${name} in ${host.desc} (${round2(a)}px against ${round2(b)}px; band ${centreOffset})`
              + ' - a mark inside a container is centred in it, or at least balanced',
          });
        }
      }
    }
  }

  // ── Rule 2. The mark between an accent line and the text. REPORTED, NEVER JUDGED ────
  //
  // The owner's own words are the reason there is no threshold here: "if it's too close to the
  // accent line, it feels like it's some mistake" and, in the same breath, "sometimes it can
  // work, and that's kind of the problem". A rule its author has named as conditional cannot
  // become a pass/fail without the instrument asserting something the owner did not.
  if (mark && ink) {
    const nearAccent = accents(items, panel, ACCENT_ASPECT)
      .map((p) => ({ p, gap: gapPx(ink, p.rect) }))
      .sort((a, b) => a.gap - b.gap)[0];
    const nearText = items.filter((p) => p.isText)
      .map((p) => ({ p, gap: gapPx(ink, p.rect) }))
      .sort((a, b) => a.gap - b.gap)[0];
    if (nearAccent && nearText) {
      const hi = Math.max(nearAccent.gap, nearText.gap);
      report.markBalance = {
        accent: nearAccent.p.desc,
        text: nearText.p.desc,
        toAccentPx: round2(nearAccent.gap),
        toTextPx: round2(nearText.gap),
        balance: hi > 0 ? round2(Math.min(nearAccent.gap, nearText.gap) / hi) : 1,
      };
    }
  }

  // ── Rules 3 and 4. The readings the readability instrument already takes, asked two
  //    questions it does not ask ───────────────────────────────────────────────────────
  const readability = options.readability ?? measureReadability(doc, {
    mode: options.mode ?? 'standard',
    target: options.target ?? { profile: 'tv' },
    markFieldId: options.markFieldId ?? null,
  });

  // Rule 3: THE SMALLEST INFORMATIONAL LINE, not "the second line".
  //
  // The restatement is the finding this rule produced. Read as "the second line's size", the
  // measurement was null on 36 of 36 sponsor bugs - a one-line graphic has no second line, and
  // its single caption classes as PRIMARY - so the rule the owner stated with the words "ON AIR"
  // and "sponsor-bug wordmarks" could not see either of the frames it was stated about.
  //
  // Informational readings only, both roles: a decorative flourish set at 12px is not the line
  // the owner is complaining about, and the classifier already separates the two.
  const informational = readability.readings.filter((r) => r.role === 'primary' || r.role === 'secondary');
  const secondary = informational.filter((r) => r.role === 'secondary').map((r) => r.fontPx);
  const primaryPx = primary
    ?? Math.max(0, ...informational.filter((r) => r.role === 'primary').map((r) => r.fontPx));
  const smallest = [...informational].sort((a, b) => a.fontPx - b.fontPx)[0];
  if (smallest && primaryPx > 0) {
    // The ratified floor and the "already flagged" answer are both READ OFF the findings the
    // readability instrument produced for THAT ELEMENT, never recomputed here: `designRules`
    // composes the floor from role, mode, profile and frame size, and a second composition of the
    // same number is how two files come to disagree about one table. Absent when nothing flagged
    // that line - the honest answer, since the floor is then stated by nothing that ran.
    const sizeFinding = readability.findings.find(
      (f) => (f.code === 'text-under-size-floor' || f.code === 'text-size-warning-band')
        && f.el === smallest.el && typeof f.floorPx === 'number',
    );
    report.secondaryType = {
      primaryPx: round2(primaryPx),
      secondaryPx: [...secondary].sort((a, b) => a - b).map(round2),
      smallestPx: round2(smallest.fontPx),
      smallestRole: smallest.role,
      smallestSnippet: smallest.snippet,
      singleLine: new Set(informational.map((r) => Math.round(r.fontPx * 10))).size === 1,
      smallestFlaggedOnSize: Boolean(sizeFinding),
      ratifiedFloorPx: sizeFinding?.floorPx ?? null,
    };
  }

  // Rule 4, the reported half: the weakest informational text on each axis, floors or no floors.
  const lightest = [...informational].sort((a, b) => a.weight - b.weight)[0];
  if (lightest) {
    report.weakest.byWeight = {
      snippet: lightest.snippet, el: lightest.el, fontPx: round2(lightest.fontPx), weight: lightest.weight,
    };
  }
  const faintest = informational.filter((r) => r.contrast !== null)
    .sort((a, b) => (a.contrast ?? 0) - (b.contrast ?? 0))[0];
  if (faintest && faintest.contrast !== null) {
    report.weakest.byContrast = {
      snippet: faintest.snippet, el: faintest.el, fontPx: round2(faintest.fontPx), contrast: faintest.contrast,
    };
  }

  // Rule 4, the judged half: WEIGHT AND CONTRAST TOGETHER. The class this names is text the SIZE floor passed -
  // which is the owner's whole point, and is why it cannot be read off any one of the
  // readability instrument's three findings. A text failing on size is already reported by the
  // instrument that owns size; this one is about the text it waved through.
  const failedSize = new Set(
    readability.findings
      .filter((f) => (f.code === 'text-under-size-floor' || f.code === 'text-size-warning-band') && f.el)
      .map((f) => f.el),
  );
  const weightFail = new Set(
    readability.findings.filter((f) => f.code === 'text-under-weight-floor' && f.el).map((f) => f.el),
  );
  const contrastFail = new Set(
    readability.findings.filter((f) => f.code === 'text-low-contrast' && f.el).map((f) => f.el),
  );
  for (const reading of informational) {
    if (failedSize.has(reading.el)) continue;
    const failing: ('weight' | 'contrast')[] = [];
    if (weightFail.has(reading.el)) failing.push('weight');
    if (contrastFail.has(reading.el)) failing.push('contrast');
    if (!failing.length) continue;
    report.sizeOnly.push({
      snippet: reading.snippet,
      el: reading.el,
      fontPx: round2(reading.fontPx),
      weight: reading.weight,
      contrast: reading.contrast,
      failing,
    });
    report.findings.push({
      code: 'legible-size-only',
      rule: 4,
      detail: `"${reading.snippet}" (${reading.el}) is big enough at ${round2(reading.fontPx)}px and`
        + ` still fails on ${failing.join(' and ')}`
        + ` (weight ${reading.weight}${reading.contrast === null ? '' : `, contrast ${reading.contrast}:1`})`
        + ' - weight and contrast are part of legibility, not separate from it',
    });
  }

  // ── Rule 5. The mark must not eat the primary's real estate ─────────────────────────
  if (mark && ink && primary) {
    const primaryText = items.filter((p) => p.isText && p.fontSizePx >= primary - 0.5)
      .sort((a, b) => a.rect.top - b.rect.top)[0];
    if (primaryText) {
      const overlapY = Math.min(ink.bottom, primaryText.rect.bottom)
        - Math.max(ink.top, primaryText.rect.top);
      const shorter = Math.min(
        ink.bottom - ink.top,
        primaryText.rect.bottom - primaryText.rect.top,
      );
      const rowShare = shorter > 0 ? round2(Math.max(0, overlapY) / shorter) : 0;
      const inside = Boolean(panel && panelMembers(items, panel).some((p) => p.el === mark.el));
      const panelH = panel ? panel.rect.bottom - panel.rect.top : 0;
      report.markRow = {
        primary: primaryText.desc,
        rowShare,
        bandOfPanel: panelH > 0 ? round2((ink.bottom - ink.top) / panelH) : null,
        insidePanel: inside,
      };
      // Only INSIDE the panel is this rule's defect. A mark parked beside the graphic takes no
      // real estate from it; B27's took a band across the top of the card the headline then had
      // to fit under, which is what "it should be on the same row as the text" is asking for.
      if (inside && rowShare < rowFloor) {
        report.findings.push({
          code: 'mark-owns-a-row',
          rule: 5,
          detail: `the mark shares ${rowShare} of a row with ${primaryText.desc} and takes a band`
            + `${report.markRow.bandOfPanel === null ? '' : ` of ${Math.round(report.markRow.bandOfPanel * 100)}% of the panel's height`}`
            + ' to itself - it should sit on the same row as the text rather than above it',
        });
      }
    }
  }

  return report;
}

/** One package piece's answer to rule 6. */
export interface PieceMark {
  graphic: string;
  present: boolean;
  /** Why the piece carries no mark, when the platform decided that rather than the design.
   *  A declared refusal is still an inconsistency the owner sees; it is not an accident. */
  declaredNoMark?: boolean;
}

export interface PackageMarkReport {
  consistent: boolean;
  present: string[];
  absent: string[];
  findings: TasteFinding[];
}

/**
 * Rule 6 - a package's mark is on EVERY piece or none.
 *
 * A SET property, so it takes the set rather than a document: one set carried the wordmark on
 * the topic card and the sponsor bug and not on the countdown, and the owner's verdict was
 * "this doesn't work. If you skip the logo then it would fit." Both ends of that sentence are
 * passes - all three or none - and only the mixture is the defect, which is why this returns a
 * consistency verdict rather than a mark count.
 *
 * A piece that DECLARES it takes no mark (`PRO_GRAPHICS.countdown.takesMark === false`) is
 * still counted as absent, and the finding says so. The owner was looking at the rendered set,
 * not at the registry, and a platform decision the owner reads as a mistake is a platform
 * decision to revisit - hiding it behind its own declaration is how a known refusal comes to
 * live somewhere the gate does not look (§16, the argument `gate.ts` opens with).
 */
export function measurePackageMark(pieces: PieceMark[]): PackageMarkReport {
  const present = pieces.filter((p) => p.present).map((p) => p.graphic);
  const absent = pieces.filter((p) => !p.present).map((p) => p.graphic);
  const consistent = !present.length || !absent.length;
  const findings: TasteFinding[] = [];
  if (!consistent) {
    const declared = pieces.filter((p) => !p.present && p.declaredNoMark).map((p) => p.graphic);
    findings.push({
      code: 'package-mark-mixed',
      rule: 6,
      detail: `the mark is on ${present.join(', ')} but not on ${absent.join(', ')}`
        + (declared.length ? ` (${declared.join(', ')} declares it takes no mark)` : '')
        + ' - a package carries its mark on every piece or on none',
    });
  }
  return { consistent, present, absent, findings };
}
