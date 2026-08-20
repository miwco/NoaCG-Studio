import { useEffect, useRef, useState } from 'react';
import type { DraftPatch, SvgFieldDraft, SvgFontDraft, WizardDraft } from '../draft';
import { SVG_CANDIDATE_ATTR } from '../../../assets/svgImport';
import { extOf, fileToDataUrl } from '../../../assets/assetUtils';
import {
  fontAssetPath,
  fontFormatForExt,
  registerAndMeasureFont,
  type CustomFont,
} from '../../../model/fonts';
import { fetchGoogleFont } from '../../../model/googleFonts';
import './mapSvgFields.css';

interface Props {
  draft: WizardDraft;
  onDraft: (patch: DraftPatch) => void;
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

  if (!svg) return null;

  const patchField = (candidateId: string, patch: Partial<SvgFieldDraft>) =>
    onDraft({
      svgFields: draft.svgFields.map((f) => (f.candidateId === candidateId ? { ...f, ...patch } : f)),
    });

  const patchFont = (family: string, patch: Partial<SvgFontDraft>) =>
    onDraft({
      svgFonts: draft.svgFonts.map((f) => (f.family === family ? { ...f, ...patch } : f)),
    });

  /** Fetch one family from Google Fonts, embedded like an upload (model/googleFonts.ts).
   *  The @font-face must declare the family name the SVG references, so a fetch whose
   *  declared spelling differs is re-labelled to the SVG's own. */
  const fetchFont = async (family: string) => {
    setFontBusy(family);
    setFontError(null);
    try {
      const font = await fetchGoogleFont(family);
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

  return (
    <div className="map-svg">
      {/* The artwork, with the hover highlight over it. */}
      <div className="map-svg-stage-wrap">
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
        </div>
      ) : (
        <div className="panel-section" data-testid="map-svg-fields">
          <h3>
            Editable text{' '}
            <span className="muted">
              {onCount} of {draft.svgFields.length} on air as operator fields
            </span>
          </h3>
          <p className="hint">
            Everything ticked becomes a field the operator can retype — with your exact
            typography. Hover a row to see which text it is.
          </p>
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
                <span className="status-ok">✓ Bundled with NoaCG</span>
              ) : f.customFont ? (
                <span className="status-ok">✓ Embedded in the template</span>
              ) : (
                <>
                  <span className="status-warn" data-testid={`map-svg-font-warn-${f.family}`}>
                    Not embedded — previews and playout may show a substitute unless the
                    playout machine has it installed.
                  </span>
                  <span className="map-svg-font-actions">
                    <button
                      disabled={fontBusy !== null}
                      onClick={() => void fetchFont(f.family)}
                      title="Downloads the family from Google Fonts and embeds it in the template. The download shows your IP address to Google."
                      data-testid={`map-svg-font-google-${f.family}`}
                    >
                      {fontBusy === f.family ? 'Fetching…' : 'Get from Google Fonts'}
                    </button>
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
