import { useCallback, useEffect, useRef, useState } from 'react';
import { uuid } from '../../../model/id';
import type {
  DesignFieldSpec,
  DraftPatch,
  SvgFollowerDraft,
  SvgFieldDraft,
  SvgFontDraft,
  SvgImageDraft,
  SvgOutlineDraft,
  SvgQuizDraft,
  WizardDraft,
} from '../draft';
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
 */
function proposeFollowers(
  stage: HTMLElement,
  svg: SvgImportResult,
  growId: string,
  axis: 'x' | 'y',
): string[] {
  const grow = stage.querySelector(`[${SVG_CANDIDATE_ATTR}="${growId}"]`);
  if (!grow) return [];
  const gr = grow.getBoundingClientRect();
  const edge = axis === 'y' ? gr.bottom : gr.right;
  const hits: { id: string; el: Element }[] = [];
  for (const c of [...svg.groups, ...svg.shapes, ...svg.candidates, ...svg.images, ...svg.outlines]) {
    if (c.id === growId) continue;
    const el = stage.querySelector(`[${SVG_CANDIDATE_ATTR}="${c.id}"]`);
    if (!el || el.contains(grow) || grow.contains(el)) continue;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0) || !(r.height > 0)) continue;
    if ((axis === 'y' ? r.top : r.left) >= edge - 0.5) hits.push({ id: c.id, el });
  }
  return hits.filter((h) => !hits.some((o) => o !== h && o.el.contains(h.el))).map((h) => h.id);
}

/** The published weight closest to the one the file's own name asked for. */
function nearestWeight(weights: number[], want: number): number {
  return weights.reduce((best, w) => (Math.abs(w - want) < Math.abs(best - want) ? w : best), weights[0] ?? want);
}

/** The bundled face's own family name, for a row that matched one under a different spelling. */
function bundledName(fontId: string): string {
  return FONTS.find((b) => b.id === fontId)?.family ?? fontId;
}

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
  const el = stage.querySelector(`[${SVG_CANDIDATE_ATTR}="${candidateId}"]`);
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
  const [proposed, setProposed] = useState<string[]>([]);
  const growId = draft.svgStretch.on ? draft.svgStretch.shapeId : null;
  const growAxis = draft.svgStretch.axis ?? 'x';
  useEffect(() => {
    const stage = stageRef.current;
    if (!svg || !stage || !growId) {
      setProposed([]);
      return;
    }
    setProposed(proposeFollowers(stage, svg, growId, growAxis));
  }, [svg, growId, growAxis]);

  /** The set as it stands: the author's own list once they have touched it, else the proposal. */
  const declaredFollowers: SvgFollowerDraft[] =
    draft.svgStretch.followers ?? proposed.map((candidateId) => ({ candidateId, mode: 'move' as const }));

  /** Every follower edit commits the whole set, so an untouched proposal never half-materializes. */
  const setFollowers = (next: SvgFollowerDraft[]) =>
    onDraft({ svgStretch: { ...draft.svgStretch, followers: next } });

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
      // itself is never its own follower.
      if (followArmed) {
        if (candidateId === draft.svgStretch.shapeId) return;
        const set = declaredFollowers;
        const already = set.some((f) => f.candidateId === candidateId);
        onDraft({
          svgStretch: {
            ...draft.svgStretch,
            followers: already
              ? set.filter((f) => f.candidateId !== candidateId)
              : [...set, { candidateId, mode: 'move' as const }],
          },
        });
        return;
      }
      const text = draft.svgFields.find((f) => f.candidateId === candidateId);
      if (text) {
        onDraft({
          svgFields: draft.svgFields.map((f) =>
            f.candidateId === candidateId ? { ...f, on: !f.on } : f,
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
        onDraft({ svgStretch: { ...draft.svgStretch, on: false } });
        return;
      }
      onDraft({
        svgStretch: {
          on: true,
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

  const patchImage = (candidateId: string, patch: Partial<SvgImageDraft>) =>
    onDraft({
      svgImages: draft.svgImages.map((f) => (f.candidateId === candidateId ? { ...f, ...patch } : f)),
    });

  const patchOutline = (candidateId: string, patch: Partial<SvgOutlineDraft>) =>
    onDraft({
      svgOutlines: draft.svgOutlines.map((f) => (f.candidateId === candidateId ? { ...f, ...patch } : f)),
    });

  // The behaviour pickers work on the rows that are ON — an answer has to be a real field
  // before it can be an answer, and the list re-reads itself as rows are ticked.
  const onFields = draft.svgFields.filter((f) => f.on);
  const behaviour = draft.svgBehaviour;
  const patchBehaviour = (patch: Partial<SvgQuizDraft>) =>
    onDraft({ svgBehaviour: behaviour ? { ...behaviour, ...patch } : null });
  const patchQuizRow = (at: number, patch: Partial<SvgQuizDraft['rows'][number]>) =>
    patchBehaviour({ rows: (behaviour?.rows ?? []).map((r, i) => (i === at ? { ...r, ...patch } : r)) });
  /** Add or remove an answer row, keeping its drawn states beside it. */
  const setAnswerCount = (n: number) => {
    if (!behaviour) return;
    const answers = [...behaviour.answers];
    const rows = [...behaviour.rows];
    while (answers.length < n) {
      answers.push('');
      rows.push({ selected: '', correct: '', wrong: '' });
    }
    patchBehaviour({ answers: answers.slice(0, n), rows: rows.slice(0, n) });
  };

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
      <div className="map-svg-lead">
        <h3>Choose what the operator can change</h3>
        {svg.candidates.length > 0 ? (
          /* The promise used to be "your artwork airs exactly as drawn", and the markup does
             still ship verbatim. But it became a half-truth the moment a declared element could
             move (plan §6c): a panel the author tells to grow WILL change size on air, and only
             because they asked for it. The sentence now says what is actually guaranteed. */
          <p className="hint">
            Your artwork ships exactly as you drew it, and nothing moves unless you say so. Tick
            the layers below that an operator should be able to retype — hover a row to see which
            layer it is in the preview, and type a real length into its text to watch the graphic
            take it.
          </p>
        ) : (
          <p className="hint">
            Your artwork ships exactly as you drew it. This file has no text layers to bind —
            what that means, and the two ways forward, are below.
          </p>
        )}
      </div>

      {svg.candidates.length === 0 ? (
        /* The honest outlined-text answer (plan §2): nothing here is bindable, and saying why
           teaches the fix. The graphic still imports pixel-exact as a fixed graphic. */
        <div className="panel-section" data-testid="map-svg-outlined">
          <h3>This SVG has no text layers</h3>
          <p className="hint">
            Its text was converted to outlines when it was exported — the letters are shapes
            now, so there is nothing to type into. The graphic still imports exactly as drawn
            and can go on air as a <strong>fixed graphic</strong>.
          </p>
          <p className="hint">
            To make its text editable, export it again with real text kept as text — in
            Illustrator: <strong>File → Export → SVG, and set Fonts to “SVG”</strong> (not
            “Convert to outlines”); in Figma, export without “Outline text” — and drop the new
            file on the previous step.
          </p>
          {draft.svgOutlines.length > 0 && (
            <p className="hint">
              Or keep this file: tick a group of shapes below that <em>was</em> text, and a
              live text field takes its place — same spot, same size and colour, in a typeface
              of yours rather than the original.
            </p>
          )}
        </div>
      ) : (
        <div className="panel-section" data-testid="map-svg-fields">
          <h3>
            Editable text{' '}
            <span className="muted">
              {onCount} of {draft.svgFields.length} on air as operator fields
            </span>
          </h3>
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
                onChange={(e) => patchField(f.candidateId, { on: e.target.checked })}
                title={f.on ? 'On — this layer is an operator field' : 'Off — this text stays as drawn'}
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
                        ? 'Another layer is already the countdown — a graphic has one clock'
                        : 'Text: the operator types what shows. Countdown: the operator sets minutes and this layer counts down on air.'
                    }
                    data-testid={`map-svg-kind-${f.candidateId}`}
                  >
                    <option value="text">Text</option>
                    <option value="countdown">Countdown (operator sets minutes)</option>
                  </select>
                </label>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FIELDS THE FILE NEVER DREW (docs/SVG_IMPORT_PLAN.md §6a step 3). The imported SVG is
          a fixed STAGE, not immutable artwork: the show needs a line the designer did not draw,
          and the reader should be able to put it there without opening the editor. Always
          offered — an artwork with every layer bound may still be missing a caption.
          DIRECTLY UNDER THE CHECKLIST, and that placement is the point: this is the other half
          of "which fields does this graphic have", so it belongs beside the layers it extends
          rather than after the questions about behaviour and growth. Measured at 1366x768, a
          seven-layer scorebug put it 553px below the fold when it sat last, which is where a
          reader who has never been told it exists would never find it. */}
      <div className="panel-section" data-testid="map-svg-added">
        <h3>
          Add a field{' '}
          <span className="muted">
            {draft.designFields.length === 0
              ? 'nothing added'
              : `${draft.designFields.length} added`}
          </span>
        </h3>
        {/* Two lines, not four: the rows above have already shown what a field IS, so this only
            has to say where a new one comes from. */}
        <p className="hint">
          Your artwork is the stage, not the whole graphic. Draw a box on the preview to put a
          real editable field where the file drew nothing.
        </p>
        <button
          className={drawArmed ? 'active' : ''}
          onClick={() => setDrawArmed((a) => !a)}
          data-testid="map-svg-add-field"
        >
          {drawArmed ? '✕ Cancel — or draw a box on the preview' : '＋ Draw a field on the artwork'}
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
              title="Remove this field — the artwork is untouched either way"
              data-testid={`map-svg-added-remove-${f.id}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* THE BEHAVIOUR (docs/GRAPHIC_BEHAVIOUR_PLAN.md). Offered once there are enough text
          rows for a question and two answers — below that there is nothing to bind, and the
          section would only be a puzzle. Everything here is a picker: no layer has to be
          named anything, and nobody edits XML. */}
      {onFields.length >= 3 && (
        <div className="panel-section" data-testid="map-svg-behaviour">
          <h3>
            What it does{' '}
            <span className="muted">{behaviour ? 'quiz — select, lock, reveal' : 'nothing but in and out'}</span>
          </h3>
          <p className="hint">
            A graphic can carry behaviour the operator drives live. Your artwork stays exactly as
            you drew it — you say which layers show each moment, and NoaCG decides when.
          </p>
          <label className="save-field">
            <span>Behaviour</span>
            <select
              value={behaviour ? 'quiz' : 'none'}
              onChange={(e) =>
                onDraft({
                  svgBehaviour:
                    e.target.value === 'quiz'
                      ? behaviour ?? {
                          kind: 'quiz',
                          question: onFields[0]?.candidateId ?? '',
                          answers: [onFields[1]?.candidateId ?? '', onFields[2]?.candidateId ?? ''],
                          rows: [
                            { selected: '', correct: '', wrong: '' },
                            { selected: '', correct: '', wrong: '' },
                          ],
                          locked: '',
                        }
                      : null,
                })
              }
              data-testid="map-svg-behaviour-kind"
            >
              <option value="none">Nothing — it just comes on and off</option>
              <option value="quiz">Quiz — select an answer, lock it in, reveal it</option>
            </select>
          </label>
          {behaviour && (
            <>
              <div className="map-svg-row">
                <label className="save-field grow">
                  <span>Question</span>
                  <select
                    value={behaviour.question}
                    onChange={(e) => patchBehaviour({ question: e.target.value })}
                    data-testid="map-svg-quiz-question"
                  >
                    <option value="">— pick a text layer —</option>
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
                    value={String(behaviour.answers.length)}
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
                For each answer: which text layer it is, and — if you drew them — which layers show
                that answer picked, right and wrong. Leave a drawing empty and that moment simply
                shows nothing extra; the board still selects, locks and reveals.
              </p>
              {behaviour.answers.map((answerId, at) => (
                <div className="map-svg-quiz-row" key={at} data-testid={`map-svg-quiz-row-${at}`}>
                  <span className="map-svg-quiz-letter">{String.fromCharCode(65 + at)}</span>
                  <label className="save-field grow">
                    <span>Answer text</span>
                    <select
                      value={answerId}
                      onChange={(e) =>
                        patchBehaviour({
                          answers: behaviour.answers.map((a, i) => (i === at ? e.target.value : a)),
                        })
                      }
                      data-testid={`map-svg-quiz-answer-${at}`}
                    >
                      <option value="">— pick a text layer —</option>
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
                        value={behaviour.rows[at]?.[state] ?? ''}
                        onChange={(e) => patchQuizRow(at, { [state]: e.target.value })}
                        onFocus={() => setHoverId(behaviour.rows[at]?.[state] || null)}
                        data-testid={`map-svg-quiz-${state}-${at}`}
                      >
                        <option value="">— not drawn —</option>
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
                  value={behaviour.locked}
                  onChange={(e) => patchBehaviour({ locked: e.target.value })}
                  data-testid="map-svg-quiz-locked"
                >
                  <option value="">— not drawn —</option>
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
        /* THE HUG (docs/SVG_IMPORT_PLAN.md §3). A lower third's banner should be as wide as
           the name on it; a quiz board and a scorebug declare a stage and must not move. No
           geometry separates the two — our own samples draw the banner on a full-frame
           artboard and the scorebug as a small floating object — so this asks, with the
           widest rectangle already proposed and OFF until somebody says otherwise. */
        <div className="panel-section" data-testid="map-svg-stretch">
          <h3>
            When the text is too long{' '}
            <span className="muted">
              {!draft.svgStretch.on
                ? 'the text shrinks to fit'
                : draft.svgStretch.axis === 'y'
                  ? 'the panel gets taller'
                  : 'the panel gets wider'}
            </span>
          </h3>
          <p className="hint">
            A longer value than you drew for has to go somewhere. By default the line shrinks
            until it fits — right for a board, whose layout is the design. A lower third can
            instead let its banner grow WIDER, so the type stays the size you drew it; a panel
            with room beneath it can grow TALLER, and the value wraps into the new height
            before any of it shrinks.
          </p>
          <label className="save-field">
            <span>Too-long text</span>
            <select
              value={!draft.svgStretch.on ? 'shrink' : draft.svgStretch.axis === 'y' ? 'grow-y' : 'grow-x'}
              onChange={(e) =>
                onDraft({
                  svgStretch: {
                    on: e.target.value !== 'shrink',
                    // Turning it on with nothing picked takes the proposal rather than
                    // leaving a switch that is on and does nothing.
                    shapeId: draft.svgStretch.shapeId ?? svg.shapes[0]?.id ?? null,
                    axis: e.target.value === 'grow-y' ? 'y' : 'x',
                  },
                })
              }
              data-testid="map-svg-stretch-mode"
            >
              <option value="shrink">Shrinks to fit the space you drew</option>
              <option value="grow-x">Grows the panel wider</option>
              <option value="grow-y">Grows the panel taller, and the text wraps</option>
            </select>
          </label>
          {draft.svgStretch.on && (
            <label
              className="save-field"
              onMouseEnter={() => setHoverId(draft.svgStretch.shapeId)}
              onMouseLeave={() => setHoverId((h) => (h === draft.svgStretch.shapeId ? null : h))}
            >
              <span>Which panel grows</span>
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
                      shapeId: e.target.value || null,
                      followers: null,
                    },
                  })
                }
                data-testid="map-svg-stretch-shape"
              >
                {svg.shapes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} — {Math.round(s.width)} × {Math.round(s.height)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {draft.svgStretch.on && (
            <p className="hint">
              {growAxis === 'y'
                ? 'It gets taller and the value wraps into the new height — never past the frame’s safe margin.'
                : 'It widens to the right and the type stays the size you drew — never past the frame’s safe margin.'}{' '}
              Only rectangles can grow: a panel drawn as a freeform shape has no side to move.
            </p>
          )}
          {/* WHAT TRAVELS (docs/SVG_IMPORT_PLAN.md §6c). Geometry proposes and the author edits,
              and the reason is the ruling itself: sideways "anything past the edge" is usually
              right, downwards it is not - below a panel sit things that should move, things that
              should stretch, and things pinned to the frame that must stay, and no measurement
              tells them apart. So the guess is shown rather than trusted. */}
          {draft.svgStretch.on && (
            <div className="map-svg-followers" data-testid="map-svg-followers">
              <h4>
                What travels with it{' '}
                <span className="muted">
                  {declaredFollowers.length === 0
                    ? 'nothing moves'
                    : `${declaredFollowers.length} layer${declaredFollowers.length === 1 ? '' : 's'}`}
                  {draft.svgStretch.followers ? '' : ' — proposed'}
                </span>
              </h4>
              <p className="hint">
                {draft.svgStretch.followers
                  ? 'Your list. A layer that moves keeps its gap; one that stretches grows by the same amount.'
                  : 'Measured from your artwork — everything drawn past the growing edge. Change it and the list becomes yours.'}
              </p>
              <button
                className={followArmed ? 'active' : ''}
                onClick={() => setFollowArmed((a) => !a)}
                data-testid="map-svg-followers-pick"
              >
                {followArmed
                  ? '✕ Done — or click layers on the artwork'
                  : '⌖ Pick what travels, on the artwork'}
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
                    <span>Behaviour</span>
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
                      <option value="move">Moves with it</option>
                      <option value="grow">Stretches with it</option>
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
          <h3>
            Pictures{' '}
            <span className="muted">
              {draft.svgImages.filter((f) => f.on).length} of {draft.svgImages.length} swappable on air
            </span>
          </h3>
          <p className="hint">
            A ticked picture becomes a field the operator can swap — leaving it empty keeps
            the picture you drew. Untouched pictures stay part of the artwork.
          </p>
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
                title={f.on ? 'On — the operator can swap this picture' : 'Off — this picture stays as drawn'}
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
          <h3>
            Outlined text{' '}
            <span className="muted">
              {draft.svgOutlines.filter((f) => f.on).length} of {draft.svgOutlines.length} replaced by live text
            </span>
          </h3>
          <p className="hint">
            {svg.candidates.length > 0
              ? 'Shapes that may be text converted to outlines. '
              : ''}
            Tick a group that was text and a typed field replaces it — at the same spot, size
            and colour, in a typeface of yours. Hover a row to see which shapes it means.
            {draft.svgOutlines.some((f) => f.looksLikeText === false) && (
              <> The ones that read as a line of type are listed first.</>
            )}
          </p>
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
                      ? 'On — these shapes are hidden and a text field stands in for them'
                      : 'Off — these shapes stay as drawn'
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
          <h3>Typefaces</h3>
          <p className="hint">
            The design names {draft.svgFonts.length === 1 ? 'this typeface' : 'these typefaces'}.
            A resolved one ships inside the template, so the graphic looks the same on every
            playout machine.
          </p>
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
                    Not embedded — previews and playout may show a substitute unless the
                    playout machine has it installed.
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
    </div>
  );
}
