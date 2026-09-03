import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { uuid } from '../../../model/id';
import type {
  DesignFieldSpec,
  DraftPatch,
  SvgFollowerDraft,
  SvgFieldDraft,
  SvgFontDraft,
  SvgImageDraft,
  SvgOutlineDraft,
  SvgPollDraft,
  SvgQuizDraft,
  WizardDraft,
} from '../draft';
import { behaviourBindingGaps, emptyPollRow, pollDrivenLayers } from '../draft';
import { SVG_CANDIDATE_ATTR, type SvgImportResult } from '../../../assets/svgImport';
import { extOf, fileToDataUrl } from '../../../assets/assetUtils';
import {
  FONTS,
  fontNameKey,
  fontAssetPath,
  fontFormatForExt,
  registerAndMeasureFont,
  type CustomFont,
} from '../../../model/fonts';
import { fetchGoogleFont, loadGoogleFontIndex } from '../../../model/googleFonts';
import SectionHead from '../SectionHead';
import './mapSvgFields.css';

interface Props {
  draft: WizardDraft;
  onDraft: (patch: DraftPatch) => void;
  /** Which layer the checklist is pointing at, for the PREVIEW's highlight (the step's one
   *  canvas — CreationWizard owns the state because the canvas is beside the step, not in it). */
  onHover: (candidateId: string | null) => void;
  /**
   * ADD A FIELD BY DRAWING ONE (docs/SVG_IMPORT_PLAN.md §6a step 3). Arming reports a HANDLER
   * rather than a flag: the preview gives back a box in fractions of the artwork's rect, and
   * the only code that can turn that into design px is this step, which is the one holding the
   * SVG. Null disarms. CreationWizard just hands the handler to the canvas.
   */
  onArmDraw: (handler: ((box: { x: number; y: number; w: number; h: number }) => void) | null) => void;
  /**
   * THE CANVAS AS A CONTROL SURFACE (docs/SVG_IMPORT_PLAN.md §6a step 5). Reported the same way
   * as the draw handler and for the same reason: the canvas answers WHICH layer was picked, and
   * only this step knows what picking one means. `drag` is the direction of a click-drag, which
   * is how a rectangle is told which way to grow without hunting for a second control.
   */
  onArmPick: (handler: ((candidateId: string, drag: 'x' | 'y' | null) => void) | null) => void;
}

/** Is this marker one of the file's TEXT layers? The one place that answers it, because three
 *  rules turn on it and a fourth spelling of it is how the offered set and the committed set
 *  drift apart. */
function isTextLayer(svg: SvgImportResult | null, id: string): boolean {
  return !!svg?.candidates.some((c) => c.id === id);
}

/** One layer's element on the step's own render, by the marker every measurement here speaks.
 *  Written once because three of them ask the same question of the same stage. */
function markerEl(stage: HTMLElement, id: string): Element | null {
  return stage.querySelector(`[${SVG_CANDIDATE_ATTR}="${id}"]`);
}

/**
 * WHAT GEOMETRY PROPOSES TRAVELS with a growing element (docs/SVG_IMPORT_PLAN.md §6c).
 *
 * The same guess the runtime makes - anything drawn past the growing edge - but made HERE, on
 * the step's own rendered artwork, so the reader can see it and change it. That is the whole
 * ruling: sideways the guess is usually right, downwards it is not, because "below the panel"
 * holds things that should move, things that should stretch and things pinned to the frame that
 * must stay, and no measurement separates those.
 *
 * An OUTERMOST-first rule keeps the set honest: when a named group and something inside it both
 * qualify, only the group is proposed - the runtime moves whole layers, and offering both would
 * let a reader tick one thing twice.
 *
 * A TRAVELLER THE READER CHOOSES ABOUT IS ARTWORK, never a text layer (owner walk, 2026-09-01).
 * His words on finding his own fields in this list: "I can select text fields under what travels
 * with it, which makes the concept even harder to understand because I would not expect text
 * itself to be stretched." So the two answers are SPLIT rather than the text simply dropped:
 * `artwork` is the list with a control on every row, and `text` is stated in one line and never
 * asked about, because "stretch this line" is not a question anyone can answer about a line the
 * fit ladder already sizes.
 *
 * BOTH still ship. A declared list REPLACES the runtime's own derivation outright
 * (`svgFollowersOf` returns early on a non-empty one), so returning only the artwork would mean
 * that the moment a reader touched one row, a caption drawn below the panel silently stopped
 * moving and the grown panel printed over it. The step commits the union; it only asks about
 * half of it.
 */
function proposeFollowers(
  stage: HTMLElement,
  svg: SvgImportResult,
  growId: string,
  axis: 'x' | 'y',
): { artwork: string[]; text: string[] } {
  const grow = markerEl(stage, growId);
  if (!grow) return { artwork: [], text: [] };
  const gr = grow.getBoundingClientRect();
  const edge = axis === 'y' ? gr.bottom : gr.right;
  const hits: { id: string; el: Element }[] = [];
  // DEDUPED, because an id may now sit in two inventories: a picture-filled backplate is offered
  // both as a picture and as a panel that grows, on the one marker (assets/svgImport.ts). Left
  // as a plain concatenation it would be measured twice and proposed as two follower rows for
  // the same element.
  const seen = new Set<string>();
  for (const c of [...svg.groups, ...svg.shapes, ...svg.candidates, ...svg.images, ...svg.outlines]) {
    if (c.id === growId || seen.has(c.id)) continue;
    seen.add(c.id);
    const el = markerEl(stage, c.id);
    if (!el || el.contains(grow) || grow.contains(el)) continue;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0) || !(r.height > 0)) continue;
    if ((axis === 'y' ? r.top : r.left) >= edge - 0.5) hits.push({ id: c.id, el });
  }
  const kept = hits.filter((h) => !hits.some((o) => o !== h && o.el.contains(h.el))).map((h) => h.id);
  const isText = (id: string) => isTextLayer(svg, id);
  return { artwork: kept.filter((id) => !isText(id)), text: kept.filter(isText) };
}

/**
 * IS THIS A GRAPHIC THE AUDIENCE SEES AGAIN WITH DIFFERENT CONTENT?
 *
 * The doctrine's third rule (docs/TEXT_BOX_BINDING.md, owner 2026-09-02): *"When we have a
 * graphic that comes up many times in a row, like in a quiz question where the question changes
 * or a poll result or something, then the text part where the question is - that box can't change
 * for every different graphic, because it might look weird if it changes all the time."* And, of
 * the quiz specifically: *"it should not grow, because a quiz page should be the same for each
 * question. It can't live depending on how long the text is."*
 *
 * The axis is not the graphic's shape and it is emphatically not its CATEGORY
 * (docs/backlog/growth-rule-geometry-and-purpose.md, owner 2026-08-30) - it is whether the same
 * artwork comes back with new copy in it. What says so on the artwork itself is a REPEATED ROW:
 * two or more plates of the same size, standing apart from each other, each holding its own
 * editable line. That is what a quiz board, a poll board and a scoreboard look like, and it is
 * what a lower third does not: a strap draws ONE band, and stacks its lines inside it.
 *
 * Three conditions, and each one is a case that reads as a repeat and is not:
 *  - SAME SIZE, within a tenth, MEASURED IN EACH SHAPE'S OWN FRAME. Hand-drawn plates are never
 *    identical, so an exact match would find nothing; and every plate on the owner's board carries
 *    its own rotation, so the screen rectangle is not the plate. Four plates all drawn 76 x 520
 *    have screen rectangles 114, 171, 131 and 111 units tall - the same rule the runtime states
 *    for the same reason (`svgLocalBox`, importedDesign/svg.ts), and read off those the board is
 *    a repeat only by an accident of which two rotations happen to be closest.
 *  - APART FROM EACH OTHER, by how much of the smaller one the two share. A filled plate and the
 *    hand-drawn outline tracing it are the same rectangle twice - the owner's own board draws
 *    every plate that way - and a plate inside a backplate is furniture, not a sibling. Rows in a
 *    set barely touch, and an overlap test survives rotation where a corner comparison does not.
 *  - EACH HOLDING A LINE, asked through `panelsHoldingText` - the same predicate the shape picker
 *    offers from, so what the artwork says here and what the reader is offered cannot drift. It
 *    counts a replaced OUTLINE group and a line the reader drew as well as a drawn one, which
 *    matters: a quiz board whose answers were exported as outlines is still a quiz board.
 *
 * A backplate is left out by area - it holds every line on the board, and the thing it is a
 * plate FOR is the graphic, not a row of it.
 */
function repeatsWithNewContent(stage: HTMLElement, holderIds: string[]): boolean {
  const root = stage.querySelector('svg');
  if (!root) return false;
  const frame = root.getBoundingClientRect();
  if (!(frame.width > 0) || !(frame.height > 0)) return false;
  const rows = holderIds
    .map((id) => {
      const el = markerEl(stage, id);
      const box = el?.getBoundingClientRect();
      if (!el || !box || !(box.width > 0) || !(box.height > 0)) return null;
      // The shape's DRAWN size: its own untransformed box, scaled by whatever uniform scale the
      // stage renders at. `getBBox` ignores every transform above it, which is exactly what a
      // rotation is - so this is the rectangle the designer drew, whichever way they turned it.
      const own = (el as SVGGraphicsElement).getBBox?.();
      const ctm = (el as SVGGraphicsElement).getScreenCTM?.();
      const k = ctm ? Math.hypot(ctm.a, ctm.b) : 1;
      if (!own || !(own.width > 0) || !(own.height > 0)) return null;
      return { box, w: own.width * k, h: own.height * k };
    })
    .filter((r): r is { box: DOMRect; w: number; h: number } => !!r)
    // Not the board's own backplate: a shape covering most of the frame holds every line there
    // is, so it would pair with any other such shape and say "repeat" about a single graphic.
    .filter((r) => r.box.width * r.box.height < frame.width * frame.height * 0.7);
  const apart = (a: DOMRect, b: DOMRect) => {
    const over =
      Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
      Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return over < Math.min(a.width * a.height, b.width * b.height) * 0.25;
  };
  const alike = (a: number, b: number) => Math.abs(a - b) <= Math.max(a, b) * 0.1;
  return rows.some((a) =>
    rows.some((b) => b !== a && apart(a.box, b.box) && alike(a.w, b.w) && alike(a.h, b.h)),
  );
}

/**
 * THE ORDINARY LOWER THIRD WORKS WITH NOTHING CHOSEN (owner 2026-08-25; docs/GOALS.md NOW
 * goal 5). "Of course that text should be able to become longer and the background should
 * grow with it" - so where the artwork says so unambiguously, growth defaults ON and nobody
 * is asked. This measures that, on the step's rendered artwork, and answers with the banner's
 * candidate id or null.
 *
 * What counts as unambiguous - every condition is a case that would otherwise mis-grow:
 *  - a RECTANGLE wider than tall (a banner strip; a chip or a card is not one), with room to
 *    grow before the frame's safe margin (a full-frame backplate has none, and it is also the
 *    thing that must never resize);
 *  - holding at least one STACKED bound line - one that has its own baseline to itself. A pair
 *    sharing a baseline (an exporter's usual shape for a strap's place and its time) is not an
 *    argument either way: widening the panel gives those two nothing, because each is bounded by
 *    the other, and the runtime now measures exactly that (svg.ts `svgFitNeighbour`). It used to
 *    veto the whole file, which is why the shipped Illustrator lower third - three stacked lines
 *    above one such pair - defaulted to shrinking (owner, 2026-08-26). A graphic whose lines are
 *    ALL side by side still refuses: that is a composed row, a scorebug, and it declares a stage.
 *  - those stacked lines every one START-anchored (an end- or middle-anchored line is composed
 *    against a point growth would move away from - the scorebug's score figures, a centred clock);
 *
 * Deliberately NOT measured: the artboard, or the panel's size against it. The 2026-08-23
 * ruling stands - the shipped lower third is a full-frame artboard and the shipped scorebug a
 * small floating object, so any size-against-frame rule mislabels one of them. A quiz
 * BEHAVIOUR also refuses the default (checked by the caller): a board that selects and
 * reveals declares a stage.
 *
 * WHICH shape, not WHETHER it grows. A graphic that comes up again keeps a fixed box
 * (`repeatsWithNewContent`), and the caller applies that to the LADDER while still taking the
 * shape from here - so a reader who overrides "stays as drawn" gets the plate their text is in
 * rather than the widest rectangle on the board.
 */
function proposeBannerGrowth(stage: HTMLElement, svg: SvgImportResult, onTextIds: string[]): string | null {
  if (onTextIds.length === 0) return null;
  const root = stage.querySelector('svg');
  if (!root) return null;
  const frame = root.getBoundingClientRect();
  if (!(frame.width > 0)) return null;
  const el = (id: string) => markerEl(stage, id);
  const lines = onTextIds.flatMap((id) => {
    const node = el(id);
    if (!node) return [];
    const r = node.getBoundingClientRect();
    if (!(r.width > 0) || !(r.height > 0)) return [];
    return [{ r, anchor: getComputedStyle(node).textAnchor || 'start' }];
  });
  const tol = 2;
  for (const s of svg.shapes) {
    // Widest first, which the inventory already is: the banner is the widest rectangle on it.
    const node = el(s.id);
    if (!node) continue;
    const sr = node.getBoundingClientRect();
    if (!(sr.width > 0) || !(sr.height > 0) || sr.width / sr.height < 1.5) continue;
    if (sr.right > frame.left + frame.width * 0.94) continue;
    const inside = lines.filter(
      (l) =>
        l.r.left >= sr.left - tol &&
        l.r.right <= sr.right + tol &&
        l.r.top >= sr.top - tol &&
        l.r.bottom <= sr.bottom + tol,
    );
    if (inside.length === 0) continue;
    // The lines that have a baseline TO THEMSELVES. Those are the ones a wider panel actually
    // helps, so they are the ones the question is asked about.
    const stacked = inside.filter(
      (a) =>
        !inside.some((b) => {
          if (b === a) return false;
          const overlap = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
          return overlap > Math.min(a.r.height, b.r.height) * 0.5;
        }),
    );
    if (stacked.length === 0) continue;
    if (stacked.some((l) => l.anchor !== 'start')) continue;
    return s.id;
  }
  return null;
}

/**
 * WHICH RECTANGLES COULD ACTUALLY BE THE ONE THAT GROWS (owner walk, 2026-09-01).
 *
 * His words, on the shipped Inkscape lower third: "Which panel grows? is confusing when the
 * graphic appears to contain only one relevant panel. If an option is not meaningful for a
 * particular imported SVG, ideally do not show it." That file draws two rectangles - the dark
 * bar and a 10px amber tab down its edge - so the picker offered a choice between the panel and
 * a hairline that can never grow.
 *
 * It cannot grow, and that is measurable rather than a matter of taste: growth is driven by the
 * bound lines INSIDE the element, so a rectangle holding none is granted zero every time
 * (`growOneRule` returns before it applies anything, importedDesign/svg.ts). The predicate here
 * is deliberately the runtime's own `svgLinesInside` - a line whose left edge starts inside the
 * shape, on rows the shape spans - so what the step offers and what the graphic can do are the
 * same set rather than two guesses that drift. THE LINES ARE OF BOTH KINDS for the same reason:
 * `svgFitNodes` walks the drawn `<text>` AND every placed line (an outlined-glyph stand-in, a
 * field the reader drew), so counting only the drawn ones would call a real panel a no-op.
 *
 * Where NOTHING holds a line (copy drawn outside every rectangle) this answers empty and the
 * caller falls back to offering all of them: refusing to ask is only better than asking when
 * there is one true answer.
 */
function panelsHoldingText(
  stage: HTMLElement,
  svg: SvgImportResult,
  /** The layers the artwork itself draws that are bound: ON text rows, and ON outline rows
   *  (a ticked glyph group is replaced by a placed line in the same spot, and the ladder walks
   *  placed lines exactly like drawn ones - `svgFitNodes`). */
  markerIds: string[],
  /** Lines the reader ADDED, which exist nowhere in the markup: design-px boxes to convert. */
  placed: { x: number; y: number; fontSize: number }[],
): string[] {
  const root = stage.querySelector('svg')?.getBoundingClientRect();
  const boxes = markerIds
    .map((id) => markerEl(stage, id)?.getBoundingClientRect())
    .filter((r): r is DOMRect => !!r && r.width > 0 && r.height > 0)
    .map((r) => ({ top: r.top, bottom: r.bottom, left: r.left }));
  // A drawn field is held in DESIGN px and the stage renders at whatever width it was given, so
  // the one number that converts them is the rendered root's own scale.
  if (root && root.width > 0) {
    const k = root.width / svg.width;
    for (const f of placed) {
      boxes.push({
        top: root.top + f.y * k,
        bottom: root.top + (f.y + f.fontSize) * k,
        left: root.left + f.x * k,
      });
    }
  }
  if (boxes.length === 0) return [];
  return svg.shapes
    .filter((s) => {
      const box = markerEl(stage, s.id)?.getBoundingClientRect();
      if (!box || !(box.width > 0) || !(box.height > 0)) return false;
      return boxes.some(
        (r) => r.top < box.bottom && r.bottom > box.top && r.left >= box.left - 1 && r.left < box.right,
      );
    })
    .map((s) => s.id);
}

/** The four rungs of the too-long ladder, as the select spells them. `shrink` is the absence of
 *  a growth rule; the other three are one axis each — and 'xy' is BOTH, emitted as two rows on
 *  one panel (draft.ts `svgGrowthOptions`). */
type StretchMode = 'grow-x' | 'grow-xy' | 'grow-y' | 'shrink';

const STRETCH_AXIS: Record<Exclude<StretchMode, 'shrink'>, 'x' | 'y' | 'xy'> = {
  'grow-x': 'x',
  'grow-xy': 'xy',
  'grow-y': 'y',
};

const STRETCH_SUMMARY: Record<StretchMode, string> = {
  'grow-x': 'the panel gets wider',
  'grow-xy': 'the panel gets wider, then the text wraps',
  'grow-y': 'the text wraps onto more lines',
  shrink: 'the text gets smaller',
};

const STRETCH_HINT: Record<Exclude<StretchMode, 'shrink'>, string> = {
  'grow-x': 'It widens to the right and the type stays the size you drew.',
  'grow-xy': 'It widens first. Once it reaches the margin it gets taller and the text wraps.',
  'grow-y': 'It gets taller and the text wraps into the new height.',
};

/** WHAT THE READER WILL SEE HAPPEN to the chosen shape, in the words of the result rather than
 *  of our model (owner walk, 2026-09-01: "Which panel grows?" named a concept, not a picture).
 *  The picker's label carries the FIRST visible move only - `STRETCH_HINT`, one line below it,
 *  is where the rest of the ladder is spelled out, and a label that repeated it would be a
 *  question longer than its own answer. */
const GROW_RESULT: Record<Exclude<StretchMode, 'shrink'>, string> = {
  'grow-x': 'gets wider',
  'grow-xy': 'gets wider',
  'grow-y': 'gets taller',
};

/** The published weight closest to the one the file's own name asked for. */
function nearestWeight(weights: number[], want: number): number {
  return weights.reduce((best, w) => (Math.abs(w - want) < Math.abs(best - want) ? w : best), weights[0] ?? want);
}

/** The bundled face's own family name, for a row that matched one under a different spelling. */
function bundledName(fontId: string): string {
  return FONTS.find((b) => b.id === fontId)?.family ?? fontId;
}

/** The two empty choices every behaviour picker offers, written once. One string rather than
 *  fifteen literals: the quiz and the vote ask the same two questions of the same inventory, and
 *  a picker whose empty option read differently from its neighbour's would look like it meant
 *  something different. */
const NOT_DRAWN = '— not drawn —';
const PICK_A_LAYER = '— pick a text layer —';

/** Does this row belong with the text-shaped ones? An unmeasured row (null) does — it has not
 *  been judged, and demoting it would bury a row for a reason nobody can see. A row the reader
 *  already ticked does too, whatever the measurement thought. */
function rowIsTexty(f: SvgOutlineDraft): boolean {
  return f.on || f.looksLikeText !== false;
}

/**
 * Measure one outlined-text group on the step's rendered artwork (docs/SVG_IMPORT_PLAN.md
 * §1.A): its box in DESIGN px, the cap-top-to-baseline run, and its fill. `k` maps the
 * rendered SVG's px to design px (the artwork's own space, what addPlacedLine speaks).
 *
 * Outlines carry no type, but the glyph SHAPES still say where the text sat: most glyphs of
 * a line sit ON the baseline, so the most populated cluster of shape bottoms is the baseline
 * (ties go to the top line of a multi-line object), and the tallest shape on that line is
 * its cap/ascender top. That run is what a font size derives from (~0.72 em) — the same
 * reasoning the raster erase uses (draft.ts withEraseSeedFields), measured here from vector
 * shapes instead of ink pixels. A group of fewer than two shapes (or one whose children
 * cannot be measured) falls back to ~78% of the box height, between a caps-only run (0.72)
 * and one with descenders (0.94).
 */
function measureOutline(
  stage: HTMLElement,
  svgRect: DOMRect,
  k: number,
  candidateId: string,
): Pick<SvgOutlineDraft, 'box' | 'color' | 'looksLikeText'> | null {
  const el = markerEl(stage, candidateId);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!(r.width > 0) || !(r.height > 0)) return null;
  const glyphs = Array.from(el.children).map((c) => c.getBoundingClientRect()).filter((g) => g.height > 0);

  let baseline: number | null = null;
  let lineTop = r.top;
  let onBaseline = 0;
  if (glyphs.length >= 2) {
    // Cluster the bottoms: values within `tol` of each other are one baseline. A descender
    // drops ~0.2 em below the baseline and a second line sits a full line below, so a
    // tolerance of a tenth of the box height separates both without splitting a baseline.
    const tol = r.height * 0.1;
    const bottoms = glyphs.map((g) => g.bottom).sort((a, b) => a - b);
    const clusters: number[][] = [];
    for (const b of bottoms) {
      const last = clusters[clusters.length - 1];
      if (last && b - last[0] <= tol) last.push(b);
      else clusters.push([b]);
    }
    // Most members wins; a tie goes to the earlier (higher) cluster — the first line.
    const best = clusters.reduce((a, c) => (c.length > a.length ? c : a), clusters[0]);
    baseline = best[Math.floor(best.length / 2)];
    // The shapes ON that line: the ones whose vertical span reaches the baseline (a
    // descender glyph straddles it; a hyphen floats above and is rightly left out).
    const bl = baseline;
    const onLine = glyphs.filter((g) => g.top < bl - tol && g.bottom > bl - tol);
    onBaseline = onLine.length;
    if (onLine.length > 0) lineTop = Math.min(...onLine.map((g) => g.top));
  }
  const capHeight = baseline !== null && baseline - lineTop > 0 ? baseline - lineTop : r.height * 0.78;

  // The shapes' own colour, so the stand-in arrives in it. A stroked-only or unfilled
  // outline has nothing to read; the design default serves then.
  const first = el.children[0];
  const fill = first ? getComputedStyle(first).fill : '';
  const color = fill && fill !== 'none' && !fill.startsWith('url(') ? fill : null;

  // DOES IT READ AS A LINE OF TYPE? The markup cannot say — a logo, an icon and a word are all
  // "a group of paths" — but the measured shapes can. A word is several glyphs, most of them
  // standing ON one baseline, in a box wider than it is tall. An icon is two or three shapes
  // nested inside each other with nothing in common. This only RANKS the rows (and badges the
  // rest); nothing is hidden, because the one file where a two-letter logotype really was text
  // is exactly the file this would otherwise silently lose.
  const looksLikeText = glyphs.length >= 3 && onBaseline / glyphs.length >= 0.6 && r.width / r.height >= 1.5;

  return {
    box: {
      x: Math.round((r.left - svgRect.left) * k),
      y: Math.round((lineTop - svgRect.top) * k),
      width: Math.round(r.width * k),
      height: Math.round(r.height * k),
      capHeight: Math.round(capHeight * k),
    },
    color,
    looksLikeText,
  };
}

/**
 * "Import graphic" (SVG), the mapping step — which text layers become operator fields
 * (docs/SVG_IMPORT_PLAN.md §2).
 *
 * No renaming ritual: every detected text layer is offered, labels prefilled from the layer
 * names, ALL ON by default (or only the `f:`-prefixed ones when the file opted in by name) —
 * the graphic should work with zero clicks. The checklist and the artwork are one surface:
 * hovering a row highlights the exact text it binds, because "which layer is this" is the
 * only question the step really has to answer.
 *
 * ONE CANVAS, AND IT IS THE PREVIEW (docs/SVG_IMPORT_PLAN.md §6a step 1). This step used to
 * draw the sanitized markup beside the preview and answer the same question twice — and only
 * the preview could answer it, because only the preview runs the emitted fit: a value the
 * ladder had already wrapped and shrunk showed here as clipped and running off the artwork,
 * at three times the area of the truthful picture next to it. So the markup is still RENDERED
 * (measureOutline reads `getBoundingClientRect`, which is zero inside a `display: none`
 * subtree) but off screen, and the hover highlight moved onto the preview through the rect
 * channel the editor canvas already uses (`preview/canvasControlProtocol.ts`) — the wizard
 * preview iframe deliberately carries no allow-same-origin, so nothing reaches into it.
 */
export default function MapSvgFieldsStep({ draft, onDraft, onHover, onArmDraw, onArmPick }: Props) {
  const svg = draft.designSvg;
  const stageRef = useRef<HTMLDivElement>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  // The text row whose UNTICK is waiting on "what should we do?" (owner walk, 2026-09-02).
  // The row stays ticked while it is open, so cancelling costs nothing and leaves no half state.
  const [askOff, setAskOff] = useState<string | null>(null);
  // ESCAPE CLOSES THE QUESTION, NOT THE WIZARD. CreationWizard binds Escape on `window` to rewind
  // to the front page, which for a reader with this dialog open would throw away the import they
  // are configuring - the opposite of "a mis-click costs nothing". A CAPTURE listener on the same
  // target runs before that bubble one, so stopping the event here is what keeps the ✕ and the
  // key beside it saying the same thing. Only while the dialog is open; the rewind is untouched
  // everywhere else.
  useEffect(() => {
    if (!askOff) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setAskOff(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [askOff]);
  const [drawArmed, setDrawArmed] = useState(false);
  // While armed, a pick on the artwork adds or drops a FOLLOWER instead of binding a field
  // (plan §6c). Two meanings for one gesture need a mode, and the mode is a visible button
  // rather than a modifier key nobody would find.
  const [followArmed, setFollowArmed] = useState(false);
  const [fontBusy, setFontBusy] = useState<string | null>(null);
  const [fontError, setFontError] = useState<string | null>(null);
  const uploadFor = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // The hover highlight is drawn on the PREVIEW, so the hovered layer is reported up rather
  // than measured here — and reported as a candidate id, because that marker is what the
  // preview's markup keeps (WizardOptions.previewMarkers). Cleared when the step unmounts:
  // an outline left lit over a graphic nobody is choosing layers for any more is a lie.
  useEffect(() => {
    onHover(hoverId);
  }, [hoverId, onHover]);
  useEffect(() => () => onHover(null), [onHover]);

  // ── ADD A FIELD WHERE THE FILE DREW NOTHING (docs/SVG_IMPORT_PLAN.md §6a step 3) ──
  // The imported SVG is a STAGE, not immutable artwork: a show needs a line the designer never
  // drew, and the honest answer is to draw it on the artwork rather than to send the reader to
  // the editor for it. The box arrives as fractions of the artwork's own rect, so this is where
  // it becomes DESIGN px — the space addPlacedLine speaks.
  const placeDrawnField = useCallback(
    (box: { x: number; y: number; w: number; h: number }) => {
      if (!svg) return;
      const w = box.w * svg.width;
      const h = box.h * svg.height;
      // A CLICK is a drag of no size, and a 2px field is nobody's intention — read it as
      // "put a field here" and give it a field-shaped box at that point instead.
      const tap = w < svg.width * 0.02 || h < svg.height * 0.02;
      const width = Math.max(64, Math.round(tap ? svg.width * 0.3 : w));
      // The drawn box IS the type's em box (line-height 1 below), which is what makes the
      // field land where the reader drew it rather than a guess away from it.
      const fontSize = Math.max(10, Math.min(Math.round(tap ? svg.height * 0.06 : h), Math.round(svg.height * 0.5)));
      // The first "Text n" nobody is using. Counting the list would re-issue a name the moment
      // one is removed, and two operator inputs labelled the same is a control page nobody can
      // read - the labels ARE the field names on every surface.
      const taken = new Set(draft.designFields.map((f) => f.title));
      let n = 1;
      while (taken.has(`Text ${n}`)) n += 1;
      const title = `Text ${n}`;
      onDraft({
        designFields: [
          ...draft.designFields,
          {
            id: uuid(),
            title,
            text: title,
            x: Math.round(box.x * svg.width),
            y: Math.round(box.y * svg.height),
            kind: 'area',
            width,
            // ONE FIT (plan §6b): a placed line on an SVG design is measured by the ladder,
            // which reads `data-fit="shrink"`. A wrapping line would be the one field the
            // operator's too-long warning cannot see.
            fit: 'shrink',
            fontId: null,
            fontSize,
            weight: null,
            // The design's own text token — there is no artwork behind a field nobody drew to
            // sample a colour from, and the project's colour is the honest default.
            color: 'var(--text-color)',
            // The reader drew where the text STARTS. A centre rule belongs to a field standing
            // in for something already drawn (the outlined-text seed), not to a fresh one.
            align: 'left',
            lineHeight: 1,
            letterSpacing: null,
          },
        ],
      });
      setDrawArmed(false);
    },
    [svg, draft.designFields, onDraft],
  );

  // Arming IS reporting the handler; disarming is reporting null, and so is leaving the step —
  // a canvas still armed for a graphic nobody is mapping any more would swallow the next drag.
  useEffect(() => {
    onArmDraw(drawArmed ? placeDrawnField : null);
  }, [drawArmed, placeDrawnField, onArmDraw]);
  useEffect(() => () => onArmDraw(null), [onArmDraw]);

  // ── WHAT TRAVELS WITH THE GROWING ELEMENT (docs/SVG_IMPORT_PLAN.md §6c) ──
  // Geometry PROPOSES and the author edits. The proposal is measured on this step's own
  // rendered artwork, so what the reader sees listed is what the runtime would have guessed;
  // touching it MATERIALIZES the whole set into the draft, and from then on the list is the
  // answer rather than a preview of one.
  const [proposed, setProposed] = useState<{ artwork: string[]; text: string[] }>({
    artwork: [],
    text: [],
  });
  const growId = draft.svgStretch.on ? draft.svgStretch.shapeId : null;
  // The FOLLOWER proposal is a sideways measurement whenever the panel widens at all — the
  // combination's declared set rides its sideways row (draft.ts `svgGrowthOptions`), and its
  // downward row derives its own.
  const growAxis = draft.svgStretch.axis === 'y' ? 'y' : 'x';
  const stretchMode: StretchMode = !draft.svgStretch.on
    ? 'shrink'
    : draft.svgStretch.axis === 'y'
      ? 'grow-y'
      : draft.svgStretch.axis === 'xy'
        ? 'grow-xy'
        : 'grow-x';

  // EVERY BOUND LINE, of both kinds, and every line the reader DREW - the one statement of
  // "what has to fit in this artwork", read by the two measurements that ask it (which shapes
  // are worth offering as the one that grows, and whether the board draws a repeated row).
  // Written once because two spellings of one set is how the two answers drift apart, and
  // memoized on the answer rather than rebuilt per render so neither effect re-runs on every
  // keystroke. The drawn rows and the ticked outline rows are markers in the artwork; a drawn
  // field is its own geometry.
  const boundLineKey = [
    ...draft.svgFields.filter((f) => f.on).map((f) => f.candidateId),
    ...draft.svgOutlines.filter((f) => f.on && f.box).map((f) => f.candidateId),
  ].join('|');
  const boundMarkerIds = useMemo(
    () => (boundLineKey ? boundLineKey.split('|') : []),
    [boundLineKey],
  );
  const placedLines = useMemo(
    () => draft.designFields.map((f) => ({ x: f.x, y: f.y, fontSize: f.fontSize ?? 0 })),
    [draft.designFields],
  );

  // ── GROWTH DEFAULTS ON WHERE THE ARTWORK IS UNAMBIGUOUS (docs/GOALS.md NOW goal 5) ──
  // Measured on the step's own render, and only while the author has not touched a growth
  // control: an authored answer is never recomputed, while the proposal follows the rows (a
  // banner whose only line was unticked stops proposing) and stands down the moment a
  // behaviour is attached - a quiz board is a stage. The no-patch-when-equal guard is what
  // keeps this from re-running itself forever.
  useEffect(() => {
    const stage = stageRef.current;
    if (!svg || !stage || draft.svgStretch.authored) return;
    const onIds = draft.svgFields.filter((f) => f.on).map((f) => f.candidateId);
    // WHICH shape a longer value would grow, asked WHATEVER the graphic turns out to be: a quiz
    // board's banner is still its question's plate. Answering null the moment a behaviour was
    // attached left the proposal at `svg.shapes[0]` - the board's own BACKPLATE, since the
    // inventory is widest-first - and a reader who then overrode the ladder grew that instead of
    // the plate their question sits in.
    const banner = proposeBannerGrowth(stage, svg, onIds);
    // The shapes a line actually sits in, MEASURED HERE rather than read off `panelIds` below.
    // That state is filled by a LAYOUT effect, so in the commit that first renders the artwork
    // this one would see it still empty, propose growth, and correct itself on the next pass - a
    // control that flickers through an answer nobody chose, and a draft patch to go with it. The
    // function is a pure measurement; calling it twice in a commit costs a walk of the shapes.
    const holders = panelsHoldingText(stage, svg, boundMarkerIds, placedLines);
    // A GRAPHIC THE AUDIENCE SEES AGAIN KEEPS A FIXED BOX (owner, 2026-09-02; the doctrine's
    // rule 3 in docs/TEXT_BOX_BINDING.md). The two halves are asked separately on purpose:
    // WHICH shape is a banner is geometry, and WHETHER it may grow is what the graphic is for.
    // The artwork answers the second on its own (a repeated row), and an attached BEHAVIOUR
    // answers it outright - a board that selects and reveals declares a stage.
    const grows = !!banner && !draft.svgBehaviour && !repeatsWithNewContent(stage, holders);
    const cur = draft.svgStretch;
    // THE MEASURED DEFAULT IS THE WHOLE LADDER, not its first rung (owner walk, 2026-08-29).
    // The order is ratified - wider, then onto a new line, and smaller LAST because it changes
    // the design most - so a default of 'x' alone skips the wrap rung and lands a long name
    // straight on the one rung that was meant to come last. 'xy' is both rows on the one panel;
    // where the artwork has no room to grow taller the runtime grants zero and the graphic
    // behaves exactly as 'x' did.
    const want = grows
      ? { on: true, shapeId: banner, axis: 'xy' as const }
      : { on: false, shapeId: banner ?? svg.shapes[0]?.id ?? null };
    const settled =
      cur.on === want.on && cur.shapeId === want.shapeId && (!want.on || (cur.axis ?? 'x') === 'xy');
    if (settled) return;
    onDraft({ svgStretch: want });
  }, [svg, draft.svgFields, boundMarkerIds, placedLines, draft.svgBehaviour, draft.svgStretch, onDraft]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!svg || !stage || !growId) {
      setProposed({ artwork: [], text: [] });
      return;
    }
    setProposed(proposeFollowers(stage, svg, growId, growAxis));
  }, [svg, growId, growAxis]);

  // ── WHICH SHAPES ARE WORTH OFFERING AS THE ONE THAT GROWS (owner walk, 2026-09-01) ──
  // A LAYOUT effect, not an ordinary one: the picker's presence depends on this measurement, so
  // measuring after paint would show the question for one frame and then take it away - which is
  // worse than either answer. The stage is rendered off screen in this same tree, so it is laid
  // out by the time this runs.
  const [panelIds, setPanelIds] = useState<string[]>([]);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!svg || !stage) {
      setPanelIds([]);
      return;
    }
    setPanelIds(panelsHoldingText(stage, svg, boundMarkerIds, placedLines));
  }, [svg, boundMarkerIds, placedLines]);

  /** The shapes the picker offers. The measurement where it found any, every shape where it
   *  found none, and ALWAYS whatever is currently chosen - a shape picked by dragging on the
   *  artwork is a real answer even when it holds no line, and dropping it out of its own picker
   *  would show a control set to something it does not list. */
  const growOptions = !svg
    ? []
    : (panelIds.length > 0 ? svg.shapes.filter((s) => panelIds.includes(s.id)) : svg.shapes).concat(
        draft.svgStretch.shapeId && panelIds.length > 0 && !panelIds.includes(draft.svgStretch.shapeId)
          ? svg.shapes.filter((s) => s.id === draft.svgStretch.shapeId)
          : [],
      );
  /** The one shape, when there is only one: no question is asked, and the step says so instead.
   *  Only where the MEASUREMENT found it - the all-shapes fallback below means nothing was
   *  measured, and a single shape there has not earned the sentence's claim about it. */
  const soleGrower = growOptions.length === 1 && panelIds.length > 0 ? growOptions[0] : null;

  /** The ARTWORK set as it stands: the author's own list once they have touched it, else the
   *  proposal. Text is filtered back out of a materialized list - it rides in the draft so the
   *  graphic keeps behaving, but it is never a row with a control on it. */
  const declaredFollowers: SvgFollowerDraft[] = (
    draft.svgStretch.followers ??
    proposed.artwork.map((candidateId) => ({ candidateId, mode: 'move' as const }))
  ).filter((f) => !isTextLayer(svg, f.candidateId));

  /** Every follower edit commits the whole set, so an untouched proposal never half-materializes.
   *  It also marks the growth AUTHORED: a reader editing what travels has adopted the rule.
   *  THE TEXT LINES RIDE ALONG, unasked about: a declared list replaces the runtime's derivation
   *  outright, so committing only the artwork would stop a caption drawn past the edge from
   *  moving the moment anybody touched a row. */
  const proposedText = proposed.text;
  const setFollowers = (next: SvgFollowerDraft[]) =>
    onDraft({
      svgStretch: {
        ...draft.svgStretch,
        authored: true,
        followers: [
          ...next,
          ...proposedText.map((candidateId) => ({ candidateId, mode: 'move' as const })),
        ],
      },
    });

  const labelOfCandidate = (id: string): string => {
    const all = svg
      ? [...svg.groups, ...svg.shapes, ...svg.candidates, ...svg.images, ...svg.outlines]
      : [];
    return all.find((c) => c.id === id)?.label ?? id;
  };

  // ── PICKING A LAYER ON THE ARTWORK (docs/SVG_IMPORT_PLAN.md §6a step 5) ──
  // The checklist and the canvas are two views of one decision, and pointing at the thing itself
  // is the one that needs no reading. What a pick MEANS depends on what was picked - a text layer
  // becomes a field, a rectangle becomes the panel that grows - so the canvas reports which layer
  // and this decides, exactly as it does for a drawn box.
  const pickLayer = useCallback(
    (candidateId: string, drag: 'x' | 'y' | null) => {
      // DECLARING FOLLOWERS takes the gesture while it is armed: the same pick that would
      // otherwise bind a field instead says "this travels" (plan §6c). The growing element
      // itself is never its own follower, and NEITHER IS A TEXT LAYER (owner walk, 2026-09-01):
      // a traveller the reader chooses about is artwork riding a moving edge. Arming is a MODE,
      // so a pick that lands on text does NOTHING rather than falling through to the binding
      // toggle - a missed click un-ticking a field the reader had already named and sampled is a
      // destructive answer to a gesture that meant something else entirely.
      if (followArmed) {
        if (candidateId === draft.svgStretch.shapeId) return;
        if (isTextLayer(svg, candidateId)) return;
        const set = declaredFollowers;
        const already = set.some((f) => f.candidateId === candidateId);
        onDraft({
          svgStretch: {
            ...draft.svgStretch,
            authored: true,
            // The same union `setFollowers` commits: the text lines the geometry found ride
            // along unasked, or a declared list would stop them travelling.
            followers: [
              ...(already
                ? set.filter((f) => f.candidateId !== candidateId)
                : [...set, { candidateId, mode: 'move' as const }]),
              ...proposedText.map((id) => ({ candidateId: id, mode: 'move' as const })),
            ],
          },
        });
        return;
      }
      // A DRAG ON A SHAPE ALWAYS MEANS GROWTH, and it is the whole disambiguation one element
      // holding two roles needs. A picture-filled backplate is offered as a picture AND as the
      // panel that grows (assets/svgImport.ts), and the binding kinds are checked first - so a
      // plain click on it would toggle the picture and the panel could never be picked on the
      // artwork at all. A drag is not a click: it already carries an AXIS, which is a thing only
      // growth has any use for. Written against `svg.shapes` rather than against the dual role,
      // because for every other shape this is exactly what happened anyway.
      if (drag && svg?.shapes.some((s) => s.id === candidateId)) {
        onDraft({
          svgStretch: { on: true, authored: true, shapeId: candidateId, axis: drag },
        });
        return;
      }
      const text = draft.svgFields.find((f) => f.candidateId === candidateId);
      if (text) {
        // TURNING ONE OFF ASKS THE SAME QUESTION HERE AS ON THE ROW (owner walk, 2026-09-02).
        // The canvas and the checklist are two views of one decision, so a pick that switches a
        // layer off has to mean what unticking means - otherwise pointing at the artwork is the
        // door that silently picks an answer for you.
        if (text.on) {
          setAskOff(candidateId);
          return;
        }
        onDraft({
          svgFields: draft.svgFields.map((f) =>
            f.candidateId === candidateId ? { ...f, on: true, whenOff: undefined } : f,
          ),
        });
        return;
      }
      const picture = draft.svgImages.find((f) => f.candidateId === candidateId);
      if (picture) {
        onDraft({
          svgImages: draft.svgImages.map((f) =>
            f.candidateId === candidateId ? { ...f, on: !f.on } : f,
          ),
        });
        return;
      }
      const outline = draft.svgOutlines.find((f) => f.candidateId === candidateId);
      if (outline) {
        // Only a MEASURED group can be replaced - the same rule its checkbox keeps, since the
        // stand-in needs the box. Picking an unmeasurable one does nothing rather than pretending.
        if (outline.box) {
          onDraft({
            svgOutlines: draft.svgOutlines.map((f) =>
              f.candidateId === candidateId ? { ...f, on: !f.on } : f,
            ),
          });
        }
        return;
      }
      // A RECTANGLE is the panel that grows, and a DRAG says which way. Picking the one that is
      // already growing, with no direction, turns it off again - the gesture is its own undo.
      if (!svg?.shapes.some((s) => s.id === candidateId)) return;
      const isPanel = draft.svgStretch.on && draft.svgStretch.shapeId === candidateId;
      if (isPanel && !drag) {
        onDraft({ svgStretch: { ...draft.svgStretch, authored: true, on: false } });
        return;
      }
      onDraft({
        svgStretch: {
          on: true,
          authored: true,
          shapeId: candidateId,
          axis: drag ?? (isPanel ? draft.svgStretch.axis : undefined) ?? 'x',
        },
      });
    },
    [
      draft.svgFields,
      draft.svgImages,
      draft.svgOutlines,
      draft.svgStretch,
      svg,
      onDraft,
      followArmed,
      declaredFollowers,
      proposedText,
    ],
  );

  useEffect(() => {
    onArmPick(pickLayer);
  }, [pickLayer, onArmPick]);
  useEffect(() => () => onArmPick(null), [onArmPick]);

  const patchAdded = (id: string, patch: Partial<DesignFieldSpec>) =>
    onDraft({ designFields: draft.designFields.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  const removeAdded = (id: string) =>
    onDraft({ designFields: draft.designFields.filter((f) => f.id !== id) });

  // WHICH FAMILIES GOOGLE ACTUALLY HAS. The index is a local module (no network), so the step
  // can answer this before anyone clicks: offering "Get from Google Fonts" for a licensed face
  // like Gotham is offering a button whose only outcome is an error. Loaded once, lazily, and
  // only for a file that names an unresolved family — a graphic whose fonts all matched pays
  // nothing for a 50 KB list of names.
  const [googleFamilies, setGoogleFamilies] = useState<Set<string> | null>(null);
  const needsGoogleIndex = draft.svgFonts.some((f) => !f.fontId && !f.customFont);
  useEffect(() => {
    if (!needsGoogleIndex || googleFamilies) return;
    let live = true;
    void loadGoogleFontIndex().then((all) => {
      if (live) setGoogleFamilies(new Set(all.map((g) => fontNameKey(g.family))));
    });
    return () => {
      live = false;
    };
  }, [needsGoogleIndex, googleFamilies]);

  // Measure every outlined-text suspect once the artwork is rendered (the draft keeps the
  // boxes, so a return visit measures nothing — and the create path reads them from there,
  // where no layout exists). The whole batch lands in ONE patch.
  const outlines = draft.svgOutlines;
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !svg || outlines.every((o) => o.box)) return;
    const root = stage.querySelector('svg');
    if (!root) return;
    const svgRect = root.getBoundingClientRect();
    if (!(svgRect.width > 0)) return;
    const k = svg.width / svgRect.width;
    let changed = false;
    const measured = outlines.map((o) => {
      if (o.box) return o;
      const m = measureOutline(stage, svgRect, k, o.candidateId);
      if (!m) return o;
      changed = true;
      return { ...o, ...m };
    });
    // A group that cannot be measured stays unmeasured (and unreplaceable) without
    // re-patching forever: no change, no patch, no re-run.
    if (changed) onDraft({ svgOutlines: measured });
  }, [outlines, onDraft, svg]);

  // THE SAMPLE IS THE ARTWORK'S TEXT — and the artwork that says so is the PREVIEW. Editing a
  // row rebuilds the draft template, so the value lands the way `update()` writes it on air,
  // through the emitted fit: a long name that the ladder wraps and shrinks is SHOWN wrapped
  // and shrunk, which is the only honest answer to "will this fit". This step therefore
  // repaints nothing itself; the offscreen render stays exactly as the designer drew it, which
  // is what measureOutline needs it for.

  if (!svg) return null;

  // Text-shaped groups first, everything else after — a STABLE sort, so within each half the
  // rows still read in the order the file draws them. A row a ticked group put ON stays with
  // the text-shaped ones: the reader already answered for it.
  const rankedOutlines = draft.svgOutlines
    .map((f, i) => ({ f, i }))
    .sort((a, b) => Number(rowIsTexty(b.f)) - Number(rowIsTexty(a.f)) || a.i - b.i)
    .map(({ f }) => f);

  const patchField = (candidateId: string, patch: Partial<SvgFieldDraft>) =>
    onDraft({
      svgFields: draft.svgFields.map((f) => (f.candidateId === candidateId ? { ...f, ...patch } : f)),
    });

  /** The row whose untick is waiting on an answer, and the layer it names. */
  const asked = askOff ? draft.svgFields.find((f) => f.candidateId === askOff) ?? null : null;
  const answerOff = (whenOff: 'keep' | 'remove') => {
    if (askOff) patchField(askOff, { on: false, whenOff });
    setAskOff(null);
  };

  const patchImage = (candidateId: string, patch: Partial<SvgImageDraft>) =>
    onDraft({
      svgImages: draft.svgImages.map((f) => (f.candidateId === candidateId ? { ...f, ...patch } : f)),
    });

  const patchOutline = (candidateId: string, patch: Partial<SvgOutlineDraft>) =>
    onDraft({
      svgOutlines: draft.svgOutlines.map((f) => (f.candidateId === candidateId ? { ...f, ...patch } : f)),
    });

  // THE QUIZ's pickers work on the rows that are ON — an answer has to be a real field before it
  // can be an answer, and the list re-reads itself as rows are ticked. THE POLL's do not, and
  // that difference is the behaviour's own (docs/GRAPHIC_BEHAVIOUR_PLAN.md §12): a vote's
  // question, options and figures come from the round rather than from an operator's typing, so
  // its layers are display targets picked out of every text layer the artwork has.
  const onFields = draft.svgFields.filter((f) => f.on);
  const textLayers = draft.designSvg?.candidates ?? [];
  const behaviour = draft.svgBehaviour;
  const quiz = behaviour?.kind === 'quiz' ? behaviour : null;
  const poll = behaviour?.kind === 'poll' ? behaviour : null;

  const patchQuiz = (patch: Partial<SvgQuizDraft>) => {
    if (quiz) onDraft({ svgBehaviour: { ...quiz, ...patch } });
  };
  const patchQuizRow = (at: number, patch: Partial<SvgQuizDraft['rows'][number]>) =>
    patchQuiz({ rows: (quiz?.rows ?? []).map((r, i) => (i === at ? { ...r, ...patch } : r)) });
  /** Add or remove an answer row, keeping its drawn states beside it. */
  const setAnswerCount = (n: number) => {
    if (!quiz) return;
    const answers = [...quiz.answers];
    const rows = [...quiz.rows];
    while (answers.length < n) {
      answers.push('');
      rows.push({ selected: '', correct: '', wrong: '' });
    }
    patchQuiz({ answers: answers.slice(0, n), rows: rows.slice(0, n) });
  };

  const patchPoll = (patch: Partial<SvgPollDraft>) => {
    if (poll) onDraft({ svgBehaviour: { ...poll, ...patch } });
  };
  /** The text layers the VOTE drives, so they stop being operator fields. `draftToOptions` drops
   *  them from the field list; this is the same set, read out, so nobody has to discover it by
   *  noticing a field went missing. */
  const pollDriven = pollDrivenLayers(draft.svgBehaviour);
  const pollDrivenNames = draft.svgFields
    .filter((f) => f.on && pollDriven.has(f.candidateId))
    .map((f) => f.title.trim() || 'Text');
  const patchPollRow = (at: number, patch: Partial<SvgPollDraft['rows'][number]>) =>
    patchPoll({ rows: (poll?.rows ?? []).map((r, i) => (i === at ? { ...r, ...patch } : r)) });
  /** Add or remove an option row, keeping its bar and figure beside it. */
  const setOptionCount = (n: number) => {
    if (!poll) return;
    const rows = [...poll.rows];
    while (rows.length < n) rows.push(emptyPollRow());
    patchPoll({ rows: rows.slice(0, n) });
  };

  /** What the artwork ALREADY gives the operator, and what the binding still owes — both read
   *  out so the "What it does" section can be true rather than merely short. */
  const numberFields = onFields.filter((f) => f.numeric && f.kind !== 'countdown');
  const steppers =
    numberFields.length === 0
      ? ''
      : numberFields.length === 1
        ? 'one number, with + and −'
        : `${numberFields.length} numbers, each with + and −`;
  const behaviourGaps = behaviourBindingGaps(draft);

  const patchFont = (family: string, patch: Partial<SvgFontDraft>) =>
    onDraft({
      svgFonts: draft.svgFonts.map((f) => (f.family === family ? { ...f, ...patch } : f)),
    });

  /** Fetch one family from Google Fonts, embedded like an upload (model/googleFonts.ts).
   *  Google is asked for the LOOKUP name and the weight the file's own name implied — asking
   *  it for Illustrator's "Archivo-Bold" only ever returns "no such family". The @font-face
   *  must then declare the name the SVG references, so the fetched face is re-labelled to it. */
  const fetchFont = async (row: SvgFontDraft) => {
    const family = row.family;
    setFontBusy(family);
    setFontError(null);
    try {
      // Ask the local family index for the LIBRARY'S OWN spelling first: the lookup name is
      // reconstructed from a PostScript name, and no rule can know that "JetBrainsMono" is
      // "JetBrains Mono" rather than "Jet Brains Mono". Compared on identity alone
      // (model/fonts.ts fontNameKey), so every spelling of one family lands on it. The weight is
      // then clamped to one the family actually publishes — Google answers 400 for a weight it
      // does not have, which would quietly return the wrong cut of the right face.
      const index = await loadGoogleFontIndex();
      const known = index.find((g) => fontNameKey(g.family) === fontNameKey(row.lookup));
      const weight = row.weight !== null && known ? nearestWeight(known.weights, row.weight) : row.weight;
      const font = await fetchGoogleFont(known?.family ?? row.lookup, weight ?? undefined);
      patchFont(family, { customFont: font.family === family ? font : { ...font, family } });
    } catch (e) {
      setFontError(e instanceof Error ? e.message : String(e));
    } finally {
      setFontBusy(null);
    }
  };

  /** Upload a licensed font file for one family. The family name is the SVG's, never the
   *  file name's — the @font-face has to answer the name the artwork asks for. */
  const uploadFont = async (family: string, file: File | undefined) => {
    if (!file) return;
    const ext = extOf(file.name);
    if (!['woff2', 'woff', 'ttf', 'otf'].includes(ext)) {
      setFontError('A font file is .woff2, .woff, .ttf or .otf.');
      return;
    }
    setFontBusy(family);
    setFontError(null);
    try {
      const data = await fileToDataUrl(file);
      const tabularFigures = await registerAndMeasureFont(family, data);
      const font: CustomFont = {
        family,
        format: fontFormatForExt(ext),
        asset: { path: fontAssetPath(file.name), data },
        tabularFigures,
      };
      patchFont(family, { customFont: font });
    } catch (e) {
      setFontError(e instanceof Error ? e.message : String(e));
    } finally {
      setFontBusy(null);
    }
  };

  const onCount = draft.svgFields.filter((f) => f.on).length;
  const countdownTaken = draft.svgFields.some((f) => f.on && f.kind === 'countdown');

  return (
    <div className="map-svg">
      {/* THE OFFSCREEN RENDER. Not a canvas any more — the preview beside the step is the one
          canvas (see the component note) — but `measureOutline` needs the artwork LAID OUT,
          and `getBoundingClientRect()` is all zeroes inside a `display: none` subtree. So it
          renders off screen at the artwork's own width, which also makes the measurement
          exact: k is 1, with no rounding from a fitted-down box. Hidden from assistive tech
          and untabbable; nothing here is for reading. */}
      <div className="map-svg-measure" aria-hidden="true">
        <div
          className="map-svg-stage"
          ref={stageRef}
          data-testid="map-svg-stage"
          style={{ width: svg.width }}
          // The markup is our own sanitizer's output (script/handlers/foreignObject already
          // removed at import — assets/svgImport.ts), never raw user input.
          dangerouslySetInnerHTML={{ __html: svg.markup }}
        />
      </div>
      {/* ONE LINE PER THING (docs/GOALS.md NOW goal 4): what is automatically visible is one
          line, and the rest of every section sits behind its ⓘ — which also says WHY the
          section exists at all, the half the owner asked for by name. */}
      <div className="map-svg-lead">
        <h3>Choose what the operator can change</h3>
        {svg.candidates.length > 0 ? (
          <p className="hint">Tick what can be retyped. Hover a row to see it in the preview.</p>
        ) : (
          <p className="hint">
            No text layers in this file. Your artwork still ships exactly as drawn. Two ways
            forward below.
          </p>
        )}
      </div>

      {svg.candidates.length === 0 ? (
        /* The honest outlined-text answer (plan §2): nothing here is bindable, and saying why
           teaches the fix. The graphic still imports pixel-exact as a fixed graphic. */
        <div className="panel-section" data-testid="map-svg-outlined">
          <h3>This SVG has no text layers</h3>
          <p className="hint">
            The text was turned into shapes on export, so there is nothing to type into. It
            still airs fine as a <strong>fixed graphic</strong>.
          </p>
          <p className="hint">
            To get editable text, export again keeping text as text. Illustrator:{' '}
            <strong>File → Export → SVG, Fonts set to “SVG”</strong>. Figma: turn off “Outline
            text”. Then drop the new file on the previous step.
          </p>
          {draft.svgOutlines.length > 0 && (
            <p className="hint">
              Or keep this file. Tick a group of shapes below that <em>was</em> text and a live
              field takes its place: same spot, same size, same colour, your typeface.
            </p>
          )}
        </div>
      ) : (
        <div className="panel-section" data-testid="map-svg-fields">
          <SectionHead
            title="Editable text"
            summary={`${onCount} of ${draft.svgFields.length} editable on air`}
            testid="map-svg-why-fields"
          >
            <p>
              We found every text layer and turned them all on. A ticked layer becomes a field
              the operator retypes live, in the typography you drew. Untick one and its words
              stay part of the artwork.
            </p>
            <p>
              The Text box is live. Type a real, long value and the preview shows what would
              happen on air.
            </p>
          </SectionHead>
          {draft.svgFields.map((f) => (
            <div
              key={f.candidateId}
              className={`map-svg-row ${f.on ? '' : 'off'}`}
              onMouseEnter={() => setHoverId(f.candidateId)}
              onMouseLeave={() => setHoverId((h) => (h === f.candidateId ? null : h))}
              data-testid={`map-svg-row-${f.candidateId}`}
            >
              <input
                type="checkbox"
                checked={f.on}
                /* UNTICKING ASKS (owner walk, 2026-09-02). Ticking one back ON needs no
                   question - it undoes both answers - so only the off direction opens the
                   dialog, and the row stays ticked until it is answered. */
                onChange={(e) =>
                  e.target.checked
                    ? patchField(f.candidateId, { on: true, whenOff: undefined })
                    : setAskOff(f.candidateId)
                }
                title={
                  f.on
                    ? 'On. This layer is an operator field.'
                    : f.whenOff === 'remove'
                      ? 'Off. This text has been taken off the artwork.'
                      : 'Off. This text stays as drawn.'
                }
              />
              <label className="save-field grow">
                <span>Field name</span>
                <input
                  value={f.title}
                  disabled={!f.on}
                  onChange={(e) => patchField(f.candidateId, { title: e.target.value })}
                  data-testid={`map-svg-title-${f.candidateId}`}
                />
              </label>
              <label className="save-field grow">
                <span>Text{f.numeric ? ' (number)' : ''}</span>
                <input
                  value={f.sample}
                  disabled={!f.on}
                  onChange={(e) => patchField(f.candidateId, { sample: e.target.value })}
                  data-testid={`map-svg-sample-${f.candidateId}`}
                />
              </label>
              {f.clock && (
                /* A clock-shaped layer ("10:00") can be a COUNTDOWN: the node becomes the
                   ticking display and the operator sets the length in minutes. One per
                   graphic - the shared clock runtime drives one display - so once a row
                   has it, the others keep the choice but greyed. Never assumed: "22:40"
                   is just as likely the time of day drawn into a news strap. */
                <label className="save-field">
                  <span>Binds as</span>
                  <select
                    value={f.kind}
                    disabled={!f.on || (f.kind !== 'countdown' && countdownTaken)}
                    onChange={(e) => patchField(f.candidateId, { kind: e.target.value as SvgFieldDraft['kind'] })}
                    title={
                      f.kind !== 'countdown' && countdownTaken
                        ? 'Another layer is already the countdown. A graphic has one clock.'
                        : 'Text: the operator types what shows. Countdown: the operator sets minutes and this layer counts down on air.'
                    }
                    data-testid={`map-svg-kind-${f.candidateId}`}
                  >
                    <option value="text">Text</option>
                    <option value="countdown">Countdown (operator sets minutes)</option>
                  </select>
                </label>
              )}
              {/* WHAT THE ANSWER DID, said on the row that carries it. An off row used to read
                  the same whichever answer was given, so the dialog's decision was invisible a
                  second after it was made - and the removal is the one nobody can see on the
                  preview, because the words are simply gone. */}
              {!f.on && (
                <span className="map-svg-off-note" data-testid={`map-svg-off-${f.candidateId}`}>
                  {f.whenOff === 'remove' ? 'taken off the artwork' : 'stays as drawn'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FIELDS THE FILE NEVER DREW (docs/SVG_IMPORT_PLAN.md §6a step 3). The imported SVG is
          a fixed STAGE, not immutable artwork: the show needs a line the designer did not draw,
          and the reader should be able to put it there without opening the editor. Offered on
          every file WITH text layers — an artwork with every layer bound may still be missing a
          caption. NOT offered on an all-outlined file (owner walk 2026-08-28, the backlog's
          outline-fallback ruling): there the only place a drawn box lands is ON TOP of the
          outlined type, with nothing removing the shapes underneath, and the honest door for
          that file is re-export — or an outline row, which hides the shapes it replaces.
          DIRECTLY UNDER THE CHECKLIST, and that placement is the point: this is the other half
          of "which fields does this graphic have", so it belongs beside the layers it extends
          rather than after the questions about behaviour and growth. Measured at 1366x768, a
          seven-layer scorebug put it 553px below the fold when it sat last, which is where a
          reader who has never been told it exists would never find it. */}
      {svg.candidates.length > 0 && (
      <div className="panel-section" data-testid="map-svg-added">
        <SectionHead
          title="Add a field"
          summary={
            draft.designFields.length === 0 ? 'nothing added' : `${draft.designFields.length} added`
          }
          testid="map-svg-why-added"
        >
          <p>
            A show sometimes needs a line the file never drew. Press the button and draw a box
            on the preview. A real editable field lands there, and the artwork underneath is
            untouched.
          </p>
        </SectionHead>
        <button
          className={drawArmed ? 'active' : ''}
          onClick={() => setDrawArmed((a) => !a)}
          data-testid="map-svg-add-field"
        >
          {drawArmed ? '✕ Cancel, or draw a box on the preview' : '＋ Draw a field on the artwork'}
        </button>
        {draft.designFields.map((f) => (
          <div className="map-svg-row" key={f.id} data-testid={`map-svg-added-${f.id}`}>
            <label className="save-field grow">
              <span>Field name</span>
              <input
                value={f.title}
                onChange={(e) => patchAdded(f.id, { title: e.target.value })}
                data-testid={`map-svg-added-title-${f.id}`}
              />
            </label>
            <label className="save-field grow">
              <span>Text</span>
              <input
                value={f.text}
                onChange={(e) => patchAdded(f.id, { text: e.target.value })}
                data-testid={`map-svg-added-sample-${f.id}`}
              />
            </label>
            <button
              onClick={() => removeAdded(f.id)}
              title="Remove this field. The artwork is untouched either way."
              data-testid={`map-svg-added-remove-${f.id}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      )}

      {/* THE BEHAVIOUR (docs/GRAPHIC_BEHAVIOUR_PLAN.md). Offered once there are enough text
          rows for a question and two answers — below that there is nothing to bind, and the
          section would only be a puzzle. Everything here is a picker: no layer has to be
          named anything, and nobody edits XML. */}
      {textLayers.length >= 3 && (
        <div className="panel-section" data-testid="map-svg-behaviour">
          <SectionHead
            title="What it does"
            summary={
              behaviour
                ? behaviourGaps.length > 0
                  ? `${behaviour.kind === 'poll' ? 'a live vote' : 'a quiz'}, once you say ${behaviourGaps[0]}`
                  : behaviour.kind === 'poll'
                    ? 'a live vote: open, close, result'
                    : 'a quiz: select, lock, reveal'
                : steppers || 'it just comes on and off'
            }
            testid="map-svg-why-behaviour"
          >
            <p>
              A graphic can do more than come on and off. It can carry behaviour the operator
              drives live, with real buttons on the control page. Today there are two. The quiz:
              select an answer, lock it in, reveal the right one. The live vote: the room votes
              from their phones and the bars you drew move with the count.
            </p>
            <p>
              Your artwork does not change. You say which drawn layer shows at each moment and
              NoaCG turns them on and off. Left a layer undrawn? Nothing extra shows, and the
              behaviour still works.
            </p>
            {/* SAY WHAT THE ARTWORK ALREADY EARNED. A scoreboard is the case that made this
                necessary: it needs no machine at all, because a layer holding a plain figure
                becomes a number field and every control surface draws one as a ± stepper. The
                step offered "Nothing. It comes on and off.", the reader read the whole list as
                "there is no scoreboard here", and nothing anywhere said their scores were
                already drivable. */}
            {numberFields.length > 0 && (
              <p data-testid="map-svg-behaviour-steppers">
                {numberFields.length === 1 ? 'One layer holds' : `${numberFields.length} layers hold`}{' '}
                a plain figure ({numberFields.map((f) => f.title).join(', ')}), so the operator gets
                a + and a − button for {numberFields.length === 1 ? 'it' : 'each'} with no behaviour
                chosen. That is the whole of a scoreboard.
              </p>
            )}
          </SectionHead>
          <label className="save-field">
            <span>Behaviour</span>
            <select
              value={behaviour?.kind ?? 'none'}
              onChange={(e) => {
                const want = e.target.value;
                if (want === 'none') return onDraft({ svgBehaviour: null });
                if (want === 'quiz') {
                  return onDraft({
                    svgBehaviour: quiz ?? {
                      kind: 'quiz',
                      question: onFields[0]?.candidateId ?? '',
                      answers: [onFields[1]?.candidateId ?? '', onFields[2]?.candidateId ?? ''],
                      rows: [
                        { selected: '', correct: '', wrong: '' },
                        { selected: '', correct: '', wrong: '' },
                      ],
                      locked: '',
                    },
                  });
                }
                // A fresh vote starts with two empty option rows and nothing else picked. Empty
                // rather than seeded from the first layers in the file: a poll's layers are
                // display targets, and guessing which of somebody's fifteen layers is option one
                // would put the count on the wrong drawing without saying so.
                onDraft({ svgBehaviour: poll ?? { kind: 'poll', question: '', rows: [emptyPollRow(), emptyPollRow()], total: '', badge: '' } });
              }}
              data-testid="map-svg-behaviour-kind"
            >
              <option value="none">
                {numberFields.length > 0
                  ? 'Nothing extra. The number layers already get + and −.'
                  : 'Nothing. It comes on and off.'}
              </option>
              <option value="quiz">Quiz. Select an answer, lock it in, reveal it.</option>
              <option value="poll">Live vote. The room votes; the bars move; you show the result.</option>
            </select>
          </label>
          {/* A binding that will be DROPPED says so here rather than at create time. Same rule
              as `svgBehaviourOption`'s, read from one function, so the sentence cannot drift
              from the decision. */}
          {behaviourGaps.length > 0 && (
            <p className="map-svg-note" data-testid="map-svg-behaviour-missing">
              Still to say: {behaviourGaps.join(', ')}. Until then this graphic just comes on and
              off.
            </p>
          )}
          {poll && (
            <>
              {/* WHERE THE NUMBERS COME FROM, said once and plainly. A reader who has just picked
                  "Live vote" is owed the shape of the thing: the counts are not typed, and
                  nothing a viewer sends reaches air on its own. */}
              <p className="hint" data-testid="map-svg-poll-how">
                Open a vote from the production’s Audience tab and the room votes at your join
                link. The counts land on this graphic as an ordinary cue, which you still Take,
                so nothing a viewer sends can reach air by itself.
              </p>
              {/* A field that will VANISH says so here rather than being noticed missing on the
                  control page. The vote writes these layers, so they stop being places an
                  operator types into — the same "say what the thing has and what it lacks" rule
                  `missingParts` follows on the catalog side. */}
              {pollDrivenNames.length > 0 && (
                <p className="map-svg-note" data-testid="map-svg-poll-driven">
                  The vote writes {pollDrivenNames.join(', ')}, so {pollDrivenNames.length === 1 ? 'it is' : 'they are'}{' '}
                  no longer {pollDrivenNames.length === 1 ? 'a field' : 'fields'} the operator types into. Everything
                  else you ticked above still is.
                </p>
              )}
              <div className="map-svg-row">
                <label className="save-field grow">
                  <span>Question</span>
                  <select
                    value={poll.question}
                    onChange={(e) => patchPoll({ question: e.target.value })}
                    onFocus={() => setHoverId(poll.question || null)}
                    data-testid="map-svg-poll-question"
                  >
                    <option value="">{NOT_DRAWN}</option>
                    {textLayers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="save-field">
                  <span>Options</span>
                  <select
                    value={String(poll.rows.length)}
                    onChange={(e) => setOptionCount(Number(e.target.value))}
                    data-testid="map-svg-poll-count"
                  >
                    {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} options
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="hint">
                Per option: the layer holding its wording, the bar whose length is its share, the
                figure beside it, and a winner mark if you drew one. The bar is measured at the
                length you drew it, and that length is 100%.
              </p>
              {/* The row layout is the quiz's, reused rather than restated: a marker, one wide
                  picker and a group of three that wraps as one. Same shape, same problem. */}
              {poll.rows.map((row, at) => (
                <div className="map-svg-quiz-row" key={at} data-testid={`map-svg-poll-row-${at}`}>
                  <span className="map-svg-quiz-letter">{at + 1}</span>
                  <label className="save-field grow">
                    <span>Option text</span>
                    <select
                      value={row.label}
                      onChange={(e) => patchPollRow(at, { label: e.target.value })}
                      onFocus={() => setHoverId(row.label || null)}
                      data-testid={`map-svg-poll-label-${at}`}
                    >
                      <option value="">{NOT_DRAWN}</option>
                      {textLayers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="map-svg-quiz-states">
                    <label className="save-field">
                      <span>Bar</span>
                      <select
                        value={row.bar}
                        onChange={(e) => patchPollRow(at, { bar: e.target.value })}
                        onFocus={() => setHoverId(row.bar || null)}
                        data-testid={`map-svg-poll-bar-${at}`}
                      >
                        <option value="">{NOT_DRAWN}</option>
                        {(draft.designSvg?.shapes ?? []).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                        {(draft.designSvg?.groups ?? []).map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.label}
                            {g.hidden ? ' (hidden)' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="save-field">
                      <span>Figure</span>
                      <select
                        value={row.value}
                        onChange={(e) => patchPollRow(at, { value: e.target.value })}
                        onFocus={() => setHoverId(row.value || null)}
                        data-testid={`map-svg-poll-value-${at}`}
                      >
                        <option value="">{NOT_DRAWN}</option>
                        {textLayers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="save-field">
                      <span>Winner</span>
                      <select
                        value={row.winner}
                        onChange={(e) => patchPollRow(at, { winner: e.target.value })}
                        onFocus={() => setHoverId(row.winner || null)}
                        data-testid={`map-svg-poll-winner-${at}`}
                      >
                        <option value="">{NOT_DRAWN}</option>
                        {(draft.designSvg?.groups ?? []).map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.label}
                            {g.hidden ? ' (hidden)' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
              <div className="map-svg-row">
                <label className="save-field grow">
                  <span>Vote count</span>
                  <select
                    value={poll.total}
                    onChange={(e) => patchPoll({ total: e.target.value })}
                    onFocus={() => setHoverId(poll.total || null)}
                    data-testid="map-svg-poll-total"
                  >
                    <option value="">{NOT_DRAWN}</option>
                    {textLayers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="save-field grow">
                  <span>VOTE NOW badge</span>
                  <select
                    value={poll.badge}
                    onChange={(e) => patchPoll({ badge: e.target.value })}
                    onFocus={() => setHoverId(poll.badge || null)}
                    data-testid="map-svg-poll-badge"
                  >
                    <option value="">{NOT_DRAWN}</option>
                    {(draft.designSvg?.groups ?? []).map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                        {g.hidden ? ' (hidden)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}
          {quiz && (
            <>
              <div className="map-svg-row">
                <label className="save-field grow">
                  <span>Question</span>
                  <select
                    value={quiz.question}
                    onChange={(e) => patchQuiz({ question: e.target.value })}
                    data-testid="map-svg-quiz-question"
                  >
                    <option value="">{PICK_A_LAYER}</option>
                    {onFields.map((f) => (
                      <option key={f.candidateId} value={f.candidateId}>
                        {f.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="save-field">
                  <span>Answers</span>
                  <select
                    value={String(quiz.answers.length)}
                    onChange={(e) => setAnswerCount(Number(e.target.value))}
                    data-testid="map-svg-quiz-count"
                  >
                    {[2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n} answers
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="hint">
                Per answer: its text layer, plus the picked / right / wrong drawings if you made
                them.
              </p>
              {quiz.answers.map((answerId, at) => (
                <div className="map-svg-quiz-row" key={at} data-testid={`map-svg-quiz-row-${at}`}>
                  <span className="map-svg-quiz-letter">{String.fromCharCode(65 + at)}</span>
                  <label className="save-field grow">
                    <span>Answer text</span>
                    <select
                      value={answerId}
                      onChange={(e) =>
                        patchQuiz({
                          answers: quiz.answers.map((a, i) => (i === at ? e.target.value : a)),
                        })
                      }
                      data-testid={`map-svg-quiz-answer-${at}`}
                    >
                      <option value="">{PICK_A_LAYER}</option>
                      {onFields.map((f) => (
                        <option key={f.candidateId} value={f.candidateId}>
                          {f.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  {/* The three drawn states travel together: they either sit beside the answer
                      or take their own line as a set of three. Individually wrapped, the
                      narrow column left "Wrong" alone under the other two. */}
                  <div className="map-svg-quiz-states">
                  {(['selected', 'correct', 'wrong'] as const).map((state) => (
                    <label className="save-field" key={state}>
                      <span>{state === 'selected' ? 'Picked' : state === 'correct' ? 'Right' : 'Wrong'}</span>
                      <select
                        value={quiz.rows[at]?.[state] ?? ''}
                        onChange={(e) => patchQuizRow(at, { [state]: e.target.value })}
                        onFocus={() => setHoverId(quiz.rows[at]?.[state] || null)}
                        data-testid={`map-svg-quiz-${state}-${at}`}
                      >
                        <option value="">{NOT_DRAWN}</option>
                        {draft.designSvg?.groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.label}
                            {g.hidden ? ' (hidden)' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                  </div>
                </div>
              ))}
              <label className="save-field">
                <span>Locked in</span>
                <select
                  value={quiz.locked}
                  onChange={(e) => patchQuiz({ locked: e.target.value })}
                  data-testid="map-svg-quiz-locked"
                >
                  <option value="">{NOT_DRAWN}</option>
                  {draft.designSvg?.groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                      {g.hidden ? ' (hidden)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
      )}

      {svg.candidates.length > 0 && svg.shapes.length > 0 && (
        /* THE HUG (docs/SVG_IMPORT_PLAN.md §3, GOALS goal 5). A lower third's banner should be
           as wide as the name on it; a quiz board and a scorebug declare a stage and must not
           move. Where the artwork answers that unambiguously the default is already right (the
           measuring effect above); where it does not, shrink stands and this asks. */
        <div className="panel-section" data-testid="map-svg-stretch">
          <SectionHead
            title="When the text is too long"
            summary={
              !draft.svgStretch.on
                ? 'the text gets smaller'
                : `${STRETCH_SUMMARY[stretchMode]}${draft.svgStretch.authored ? '' : ' — read from your artwork'}`
            }
            testid="map-svg-why-stretch"
          >
            <p>
              Someone will type a longer name than you drew for. Pick where it goes.
            </p>
            <p>
              A lower third grows its banner. A board or a scorebug keeps its shape, so the text
              gets smaller instead. Whatever you pick, text that still does not fit gets smaller
              as the last resort, and the panel never grows past the margin you drew.
            </p>
            <p>
              We read your artwork and set this for you. Change it here, or drag a rectangle on
              the preview.
            </p>
          </SectionHead>
          <label className="save-field">
            <span>Too-long text</span>
            {/* THE LADDER, IN THE OWNER'S ORDER (2026-08-26): "first I want it to get wider, and
                then it should go to the next line. And the last thing is to shrink" - shrink last
                "because that changes the design more". The runtime already runs in that order, so
                the list is the order, and the combination is a real choice rather than a fourth
                thing to explain: "There are many graphics that we do not want to scale ... we
                should let the customer choose whatever they want." */}
            <select
              value={stretchMode}
              onChange={(e) => {
                const mode = e.target.value as StretchMode;
                onDraft({
                  svgStretch: {
                    ...draft.svgStretch,
                    on: mode !== 'shrink',
                    // Touching the select is AUTHORING: the measured default never overwrites
                    // an answer a person gave (the effect above skips authored state).
                    authored: true,
                    // Turning it on with nothing picked takes the proposal rather than
                    // leaving a switch that is on and does nothing.
                    shapeId: draft.svgStretch.shapeId ?? growOptions[0]?.id ?? svg.shapes[0]?.id ?? null,
                    axis: mode === 'shrink' ? (draft.svgStretch.axis ?? 'x') : STRETCH_AXIS[mode],
                  },
                });
              }}
              data-testid="map-svg-stretch-mode"
            >
              <option value="grow-x">The panel gets wider</option>
              <option value="grow-xy">The panel gets wider, then the text wraps</option>
              <option value="grow-y">The text wraps onto more lines</option>
              <option value="shrink">The text gets smaller</option>
            </select>
          </label>
          {/* NO QUESTION WHERE THERE IS ONE ANSWER (owner walk, 2026-09-01). One candidate is
              stated, not asked: the shape is NAMED, hovering the line lights it up on the artwork
              exactly as hovering the picker did, and the reason it is the only one is said out
              loud - so a missing control never reads as a missing feature. What will visibly
              happen to it is the next line's job (`STRETCH_HINT`), whose "It" this gives an
              antecedent to. */}
          {draft.svgStretch.on && stretchMode !== 'shrink' && soleGrower && (
            <p
              className="hint map-svg-grow-one"
              onMouseEnter={() => setHoverId(soleGrower.id)}
              onMouseLeave={() => setHoverId((h) => (h === soleGrower.id ? null : h))}
              data-testid="map-svg-stretch-only"
            >
              <strong>{soleGrower.label}</strong> is the shape that grows: the only one your text
              sits in.
            </p>
          )}
          {draft.svgStretch.on && !soleGrower && (
            <label
              className="save-field"
              onMouseEnter={() => setHoverId(draft.svgStretch.shapeId)}
              onMouseLeave={() => setHoverId((h) => (h === draft.svgStretch.shapeId ? null : h))}
            >
              {/* NAMED BY THE VISIBLE RESULT, never by our model. "Which panel grows" asked about
                  a concept the reader has no word for; this asks about the thing they drew and
                  the thing they will watch happen to it. */}
              {/* `stretchMode` is 'shrink' exactly when growth is OFF, and this block only
                  renders while it is on - so the ladder always has a visible result to name. */}
              <span>Which shape {GROW_RESULT[stretchMode as Exclude<StretchMode, 'shrink'>]}</span>
              <select
                value={draft.svgStretch.shapeId ?? ''}
                // SPREAD, never rebuild. Written as a fresh object this dropped the AXIS the
                // reader had just chosen - picking the panel silently sent a "grows taller"
                // graphic back to growing sideways - and it would drop their declared
                // followers with it. Changing the panel also invalidates that set: it was
                // measured against a different element, so it goes back to being proposed.
                onChange={(e) =>
                  onDraft({
                    svgStretch: {
                      ...draft.svgStretch,
                      on: true,
                      authored: true,
                      shapeId: e.target.value || null,
                      followers: null,
                    },
                  })
                }
                data-testid="map-svg-stretch-shape"
              >
                {/* Only the shapes a bound line actually sits in (`growOptions`): the rest are
                    granted nothing by the runtime, so offering them is offering a control with
                    no effect - the defect the owner named on the shipped Inkscape lower third. */}
                {growOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} — {Math.round(s.width)} × {Math.round(s.height)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {draft.svgStretch.on && stretchMode !== 'shrink' && (
            <p className="hint">{STRETCH_HINT[stretchMode]}</p>
          )}
          {/* TEXT PAST THE EDGE TRAVELS, AND IS STATED RATHER THAN ASKED ABOUT (owner walk,
              2026-09-01). It still moves - it has to, or the grown panel prints over it - but
              "should this line stretch?" is not a question anyone can answer about a line the
              too-long rule already sizes, and being asked it is what made the whole section
              unreadable. So it is one sentence with no control on it. */}
          {draft.svgStretch.on && proposedText.length > 0 && (
            <p className="hint" data-testid="map-svg-travelling-text">
              {proposedText.map((id) => labelOfCandidate(id)).join(', ')}{' '}
              {proposedText.length === 1 ? 'is' : 'are'} drawn beyond{' '}
              {labelOfCandidate(draft.svgStretch.shapeId ?? '')}, so{' '}
              {proposedText.length === 1 ? 'it moves' : 'they move'} with it.
            </p>
          )}
          {/* WHAT TRAVELS (docs/SVG_IMPORT_PLAN.md §6c). Geometry proposes and the author edits,
              and the reason is the ruling itself: sideways "anything past the edge" is usually
              right, downwards it is not - below a panel sit things that should move, things that
              should stretch, and things pinned to the frame that must stay, and no measurement
              tells them apart. So the guess is shown rather than trusted.
              SHOWN ONLY WHERE THERE IS SOMETHING TO DECIDE (GOALS goal 5 - the owner could not
              understand being asked this on an ordinary lower third, and on one the honest
              answer is that nothing needs to move): the section exists when the growth would
              actually carry layers, or when the author has engaged with growth themselves. On
              the measured default with nothing past the growing edge it does not render, and
              the runtime derives at play time exactly as it always has.
              AUTHORING GROWTH IS NO LONGER ENOUGH TO SHOW IT (owner walk, 2026-09-01). Dragging a
              rectangle on the artwork used to open an empty list with a pick button on it, on a
              graphic where nothing is drawn past the edge - a section whose whole content was a
              control that could only ever add a mistake. It renders when there is something the
              growth would actually carry, or a set the author already declared. */}
          {draft.svgStretch.on &&
            (declaredFollowers.length > 0 || draft.svgStretch.followers != null) && (
            <div className="map-svg-followers" data-testid="map-svg-followers">
              {/* NAMED BY WHAT HAPPENS ON SCREEN (owner walk, 2026-09-01: "What travels with it
                  is also too abstract. The explanation needs to say concretely what selecting an
                  element changes and give an example."). "Travels" was a word for our transform;
                  "moves" is a thing you watch happen. The DIRECTION lives in the ⓘ rather than in
                  the title: this head is a sub-list, indented and set at 0.85rem, and anything
                  longer than about fifteen characters wraps to a second line THROUGH the summary
                  beside it - the summary lands between the title's two lines, which reads as a
                  broken row. The ⓘ leads with the picture rather than with the rule. */}
              <SectionHead
                title="What else moves"
                summary={
                  (declaredFollowers.length === 0
                    ? 'nothing moves'
                    : `${declaredFollowers.length} layer${declaredFollowers.length === 1 ? '' : 's'}`) +
                  (draft.svgStretch.followers ? '' : ' — read from your artwork')
                }
                testid="map-svg-why-followers"
              >
                <p>
                  {growAxis === 'y' ? (
                    <>
                      Say your board grows 40 px taller to fit a long question. A caption you drew
                      under it would end up behind the board. Every layer listed here is pushed
                      down those same 40 px, so the gap you drew stays the gap on air.
                    </>
                  ) : (
                    <>
                      Say your banner grows 120 px wider to fit a long name. A logo you drew after
                      it would end up behind the banner. Every layer listed here is pushed right
                      those same 120 px, so the gap you drew stays the gap on air.
                    </>
                  )}
                </p>
                <p>
                  <strong>Moves out of the way</strong> keeps its distance and its size.{' '}
                  <strong>Grows by the same amount</strong> makes the layer itself bigger instead.{' '}
                  {growAxis === 'y'
                    ? 'A stripe drawn down the full height of the board stays the full height.'
                    : 'A rule drawn across the full width of the banner stays the full width.'}
                </p>
                <p>
                  Artwork only. A text line drawn past the edge still moves, but its size is
                  already answered by the too-long rule above, so there is nothing here to choose
                  about it. We measured this list from your artwork. Change it and it becomes
                  yours.
                </p>
              </SectionHead>
              <button
                className={followArmed ? 'active' : ''}
                onClick={() => setFollowArmed((a) => !a)}
                data-testid="map-svg-followers-pick"
              >
                {followArmed ? '✕ Done adding' : '＋ Add one by clicking it on the artwork'}
              </button>
              {declaredFollowers.map((f) => (
                <div
                  className="map-svg-row"
                  key={f.candidateId}
                  onMouseEnter={() => setHoverId(f.candidateId)}
                  onMouseLeave={() => setHoverId((h) => (h === f.candidateId ? null : h))}
                  data-testid={`map-svg-follower-${f.candidateId}`}
                >
                  <span className="grow">{labelOfCandidate(f.candidateId)}</span>
                  <label className="save-field">
                    <span>Then it</span>
                    <select
                      value={f.mode}
                      onChange={(e) =>
                        setFollowers(
                          declaredFollowers.map((o) =>
                            o.candidateId === f.candidateId
                              ? { ...o, mode: e.target.value as 'move' | 'grow' }
                              : o,
                          ),
                        )
                      }
                      data-testid={`map-svg-follower-mode-${f.candidateId}`}
                    >
                      {/* THE RESULT, not the mechanism. "Moves with it" / "Stretches with it"
                          named our two transforms; these name what the reader will watch the
                          layer do. */}
                      <option value="move">Moves out of the way</option>
                      <option value="grow">Grows by the same amount</option>
                    </select>
                  </label>
                  <button
                    onClick={() =>
                      setFollowers(declaredFollowers.filter((o) => o.candidateId !== f.candidateId))
                    }
                    title="This one stays where it was drawn"
                    data-testid={`map-svg-follower-drop-${f.candidateId}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {draft.svgImages.length > 0 && (
        <div className="panel-section" data-testid="map-svg-images">
          <SectionHead
            title="Pictures"
            summary={`${draft.svgImages.filter((f) => f.on).length} of ${draft.svgImages.length} swappable on air`}
            testid="map-svg-why-images"
          >
            <p>
              Tick a picture and the operator can swap it on air: a guest photo, a crest. They
              start off, because a picture inside a design is usually the artwork itself. An
              empty swap field keeps the picture you drew.
            </p>
          </SectionHead>
          {draft.svgImages.map((f) => (
            <div
              key={f.candidateId}
              className={`map-svg-row ${f.on ? '' : 'off'}`}
              onMouseEnter={() => setHoverId(f.candidateId)}
              onMouseLeave={() => setHoverId((h) => (h === f.candidateId ? null : h))}
              data-testid={`map-svg-image-${f.candidateId}`}
            >
              <input
                type="checkbox"
                checked={f.on}
                onChange={(e) => patchImage(f.candidateId, { on: e.target.checked })}
                title={f.on ? 'On. The operator can swap this picture.' : 'Off. This picture stays as drawn.'}
              />
              <label className="save-field grow">
                <span>Field name</span>
                <input
                  value={f.title}
                  disabled={!f.on}
                  onChange={(e) => patchImage(f.candidateId, { title: e.target.value })}
                  data-testid={`map-svg-image-title-${f.candidateId}`}
                />
              </label>
            </div>
          ))}
        </div>
      )}

      {draft.svgOutlines.length > 0 && (
        /* The overlay road for OUTLINED text (plan §1.A): groups of glyph-shaped paths,
           offered OFF — a logo is a group of paths too, and only the user can tell which
           shapes were type. Hover shows which. A ticked group is hidden at create and a
           placed HTML field (the raster flow's exact field machinery) stands in for it. */
        <div className="panel-section" data-testid="map-svg-outlines">
          <SectionHead
            title="Outlined text"
            summary={`${draft.svgOutlines.filter((f) => f.on).length} of ${draft.svgOutlines.length} replaced by live text`}
            testid="map-svg-why-outlines"
          >
            <p>
              Some shapes look like text that was turned into outlines on export: letters that
              became drawings. Tick a group that really was text and a live field replaces it,
              same spot, same size, same colour, your typeface. Hover a row to see which shapes
              it means.
              {draft.svgOutlines.some((f) => f.looksLikeText === false) && (
                <> The ones that read as a line of type are first.</>
              )}
            </p>
          </SectionHead>
          {/* RANKED, never filtered. A Figma export can carry dozens of icon groups, each of
              them "a group of paths" exactly like outlined copy is, and the one row that IS the
              headline should not be the twentieth. The measurement (measureOutline) does the
              ranking; an unranked row keeps its place in document order. */}
          {rankedOutlines.map((f) => (
            <div
              key={f.candidateId}
              className={`map-svg-row ${f.on ? '' : 'off'}`}
              onMouseEnter={() => setHoverId(f.candidateId)}
              onMouseLeave={() => setHoverId((h) => (h === f.candidateId ? null : h))}
              data-testid={`map-svg-outline-${f.candidateId}`}
            >
              <input
                type="checkbox"
                checked={f.on}
                disabled={!f.box}
                onChange={(e) => patchOutline(f.candidateId, { on: e.target.checked })}
                title={
                  !f.box
                    ? 'These shapes could not be measured, so no field can take their place'
                    : f.on
                      ? 'On. These shapes are hidden and a text field stands in for them.'
                      : 'Off. These shapes stay as drawn.'
                }
              />
              <label className="save-field grow">
                <span>Field name</span>
                <input
                  value={f.title}
                  disabled={!f.on}
                  onChange={(e) => patchOutline(f.candidateId, { title: e.target.value })}
                  data-testid={`map-svg-outline-title-${f.candidateId}`}
                />
              </label>
              <label className="save-field grow">
                <span>Text</span>
                <input
                  value={f.sample}
                  disabled={!f.on}
                  onChange={(e) => patchOutline(f.candidateId, { sample: e.target.value })}
                  data-testid={`map-svg-outline-sample-${f.candidateId}`}
                />
              </label>
              {f.looksLikeText === false && (
                <span className="muted" data-testid={`map-svg-outline-artwork-${f.candidateId}`}>
                  looks like artwork
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {draft.svgFonts.length > 0 && (
        <div className="panel-section" data-testid="map-svg-fonts">
          <SectionHead
            title="Typefaces"
            summary={`${draft.svgFonts.filter((f) => f.fontId || f.customFont).length} of ${draft.svgFonts.length} embedded in the template`}
            testid="map-svg-why-fonts"
          >
            <p>
              An SVG carries the typeface NAME, not the font file. A typeface we can find gets
              embedded in the template, so the graphic looks the same on every playout machine.
              One we cannot find falls back to whatever that machine has, so the row warns.
            </p>
          </SectionHead>
          {draft.svgFonts.map((f) => (
            <div className="map-svg-font" key={f.family} data-testid={`map-svg-font-${f.family}`}>
              <strong className="map-svg-font-name">{f.family}</strong>
              {f.fontId ? (
                <span className="status-ok" data-testid={`map-svg-font-ok-${f.family}`}>
                  {/* When the file asks for a PostScript name ("Archivo-Bold"), name the face it
                      actually matched — otherwise the row claims a match for a family the reader
                      cannot see anywhere in their design. */}
                  ✓ Bundled with NoaCG
                  {bundledName(f.fontId) !== f.family ? ` (${bundledName(f.fontId)})` : ''}
                </span>
              ) : f.customFont ? (
                <span className="status-ok">✓ Embedded in the template</span>
              ) : (
                <>
                  <span className="status-warn" data-testid={`map-svg-font-warn-${f.family}`}>
                    Not embedded. Playout will substitute another face unless that machine has
                    this one installed.
                  </span>
                  <span className="map-svg-font-actions">
                    {/* The Google door is offered only for a family Google HAS. A licensed face
                        (Gotham, a foundry's own) is not on that list, and a button whose only
                        outcome is an error reads as the product being broken rather than as the
                        font being private. Until the index has loaded the button stands. */}
                    {googleFamilies && !googleFamilies.has(fontNameKey(f.lookup)) ? (
                      <span className="muted" data-testid={`map-svg-font-nogoogle-${f.family}`}>
                        Not on Google Fonts — upload the file
                      </span>
                    ) : (
                      <button
                        disabled={fontBusy !== null}
                        onClick={() => void fetchFont(f)}
                        title="Downloads the family from Google Fonts and embeds it in the template. The download shows your IP address to Google."
                        data-testid={`map-svg-font-google-${f.family}`}
                      >
                        {fontBusy === f.family ? 'Fetching…' : 'Get from Google Fonts'}
                      </button>
                    )}
                    <button
                      disabled={fontBusy !== null}
                      onClick={() => {
                        uploadFor.current = f.family;
                        fileInput.current?.click();
                      }}
                    >
                      Upload font file…
                    </button>
                  </span>
                </>
              )}
            </div>
          ))}
          {fontError && <p className="status-bad">✗ {fontError}</p>}
          <input
            ref={fileInput}
            type="file"
            accept=".woff2,.woff,.ttf,.otf"
            style={{ display: 'none' }}
            onChange={(e) => {
              const family = uploadFor.current;
              uploadFor.current = null;
              if (family) void uploadFont(family, e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {/* WHAT SHOULD WE DO WITH THE WORDS? (owner walk, 2026-09-02.)
          Unticking used to mean one thing silently - the layer stays exactly as drawn and the
          operator cannot retype it - which he read as neither of the two things he might have
          meant. So the step asks, and KEEPING is the primary: he was explicit that removal must
          never be automatic, "what if it's there for a reason anyway?" Closing the dialog leaves
          the row ticked, so a mis-click costs nothing.

          The app's dialog anatomy (src/styles/AGENTS.md): a `.wz-modal` in a `.gallery-backdrop`,
          one header row with the ✕ hard right, and a `.dlg-foot` whose primary sits right. */}
      {asked && createPortal(
        /* PORTALLED TO THE BODY, for the reason WizardConfirm.tsx gives: a dialog raised over
           the full-screen wizard has to beat the wizard's own shell rather than sit inside it.
           Nested, it could not - `.gallery-backdrop.wz-full` is a positioned, z-indexed box and
           so a stacking context, which clamps everything inside it below the corner notices at
           the root however high this dialog's own z-index goes. That is precisely the issue #50
           failure (a notice taking a dialog's click), surviving inside the one walk that
           matters most: a student mapping their own artwork's text layers.

           Clicking the backdrop closes it, like every other dialog in the app - and the click
           must not reach the row underneath, which would re-open the question it just closed.
           Portalling does not change that: React events bubble through the React tree, not the
           DOM one, so the step's own handlers still see what they saw before. */
        <div
          className="gallery-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAskOff(null);
          }}
        >
          <div
            className="wz-modal map-svg-off-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="map-svg-off-title"
            data-testid="map-svg-off-dialog"
          >
            <div className="wz-header">
              <h2 id="map-svg-off-title">What should happen to these words?</h2>
              <button className="gallery-close" onClick={() => setAskOff(null)} title="Close">✕</button>
            </div>
            <div className="map-svg-off-body">
              <p>
                <strong>“{asked.sample.trim() || asked.title.trim() || 'This layer'}”</strong> stops
                being a field the operator can retype. It is still your artwork, so it is your
                call what happens to it.
              </p>
              <p className="hint">
                Keep it and the words air exactly as you drew them, every time. Remove it and the
                layer comes off the graphic - the shapes stay in the file, hidden by one line of
                CSS, so nothing you exported is thrown away.
              </p>
            </div>
            <div className="dlg-foot">
              <button onClick={() => answerOff('remove')} data-testid="map-svg-off-remove">
                Remove the text
              </button>
              {/* `.dlg-foot .spacer` is the scoped push the anatomy provides (src/styles/AGENTS.md). */}
              <div className="spacer" />
              <button className="primary" onClick={() => answerOff('keep')} data-testid="map-svg-off-keep">
                Keep it as drawn
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
