import { useEffect, useRef, useState } from 'react';
import type {
  DraftPatch,
  SvgFieldDraft,
  SvgFontDraft,
  SvgImageDraft,
  SvgOutlineDraft,
  SvgQuizDraft,
  WizardDraft,
} from '../draft';
import { SVG_CANDIDATE_ATTR } from '../../../assets/svgImport';
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
 * The artwork rendered here is the SANITIZED markup itself (candidate markers still in
 * place), not the live template preview: the wizard's preview iframe deliberately carries no
 * allow-same-origin, so nothing outside it can reach its nodes to highlight them.
 */
export default function MapSvgFieldsStep({ draft, onDraft }: Props) {
  const svg = draft.designSvg;
  const stageRef = useRef<HTMLDivElement>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [fontBusy, setFontBusy] = useState<string | null>(null);
  const [fontError, setFontError] = useState<string | null>(null);
  const uploadFor = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // The hover highlight: measure the hovered layer's box in the rendered artwork. Measured
  // from the live rect (not getBBox) so the stage's own scaling is already accounted for.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !hoverId) {
      setHighlight(null);
      return;
    }
    const el = stage.querySelector(`[${SVG_CANDIDATE_ATTR}="${hoverId}"]`);
    if (!el) {
      setHighlight(null);
      return;
    }
    const box = el.getBoundingClientRect();
    const frame = stage.getBoundingClientRect();
    setHighlight({ x: box.x - frame.x, y: box.y - frame.y, w: box.width, h: box.height });
  }, [hoverId]);

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

  // THE SAMPLE IS THE ARTWORK'S TEXT. Editing a row used to change nothing on the picture
  // above it — the new value only appeared two steps later, which made the field read as
  // decoration and left no way to try a length here, on the one screen that shows the design
  // at its own size. Written the way `update()` writes it on air (textContent on the bound
  // node), so what this step shows is what the operator will get, overflow and all. A row
  // switched OFF goes back to the text the designer drew; a COUNTDOWN row is left alone —
  // its field is a length in minutes, not the readout.
  const fields = draft.svgFields;
  const drawnText = useRef(new Map<string, string>());
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    for (const f of fields) {
      const el = stage.querySelector(`[${SVG_CANDIDATE_ATTR}="${f.candidateId}"]`);
      if (!el) continue;
      if (!drawnText.current.has(f.candidateId)) drawnText.current.set(f.candidateId, el.textContent ?? '');
      if (f.kind === 'countdown') continue;
      const next = f.on ? f.sample : (drawnText.current.get(f.candidateId) ?? '');
      if (el.textContent !== next) el.textContent = next;
    }
  }, [fields]);

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
      {/* THE ARTWORK AND WHAT THE STEP IS FOR, side by side and STICKY. The artwork used to
          be the whole first screen — a full-frame design at the column's width is 435px tall,
          which left one of seven field rows inside a 1366x768 scrollport, and the step read as
          having nothing on it. So the artwork is capped to a share of the window, the sentence
          that says what to do sits in the room beside it rather than above it, and both stay
          put while the checklist scrolls — the hover highlight is useless the moment the
          artwork has scrolled off the top. The cap is a HEIGHT applied as a max WIDTH at the
          artwork's own aspect: letterboxing the svg inside a wider box would break
          measureOutline, which reads the scale off the root element's rect. */}
      <div className="map-svg-stagebar">
        <div
          className="map-svg-stage-wrap"
          style={{ maxWidth: `calc(var(--map-svg-cap) * ${(svg.width / svg.height).toFixed(4)})` }}
        >
          <div
            className="map-svg-stage"
            ref={stageRef}
            data-testid="map-svg-stage"
            // The markup is our own sanitizer's output (script/handlers/foreignObject already
            // removed at import — assets/svgImport.ts), never raw user input.
            dangerouslySetInnerHTML={{ __html: svg.markup }}
          />
          {highlight && (
            <div
              className="map-svg-highlight"
              data-testid="map-svg-highlight"
              style={{ left: highlight.x - 4, top: highlight.y - 4, width: highlight.w + 8, height: highlight.h + 8 }}
            />
          )}
        </div>
        <div className="map-svg-lead">
          <h3>Choose what the operator can change</h3>
          {svg.candidates.length > 0 ? (
            <p className="hint">
              Your artwork airs exactly as drawn. Tick the layers below that an operator should
              be able to retype — hover a row to see which one it is, and edit its text here to
              try a real length.
            </p>
          ) : (
            <p className="hint">
              Your artwork airs exactly as drawn. This file has no text layers to bind — what
              that means, and the two ways forward, are below.
            </p>
          )}
        </div>
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
              {draft.svgStretch.on ? 'the panel grows' : 'the text shrinks to fit'}
            </span>
          </h3>
          <p className="hint">
            A longer value than you drew for has to go somewhere. By default the line shrinks
            until it fits — right for a board, whose layout is the design. A lower third can
            instead let its banner grow, so the type stays the size you drew it.
          </p>
          <label className="save-field">
            <span>Too-long text</span>
            <select
              value={draft.svgStretch.on ? 'grow' : 'shrink'}
              onChange={(e) =>
                onDraft({
                  svgStretch: {
                    on: e.target.value === 'grow',
                    // Turning it on with nothing picked takes the proposal rather than
                    // leaving a switch that is on and does nothing.
                    shapeId: draft.svgStretch.shapeId ?? svg.shapes[0]?.id ?? null,
                  },
                })
              }
              data-testid="map-svg-stretch-mode"
            >
              <option value="shrink">Shrinks to fit the space you drew</option>
              <option value="grow">Grows the panel behind it</option>
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
                onChange={(e) => onDraft({ svgStretch: { on: true, shapeId: e.target.value || null } })}
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
              It widens to the right, and anything drawn past its right edge travels with it —
              never past the frame's safe margin. Only rectangles can grow: a panel drawn as a
              freeform shape has no width to change.
            </p>
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
