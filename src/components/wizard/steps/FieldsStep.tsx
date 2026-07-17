import { useRef } from 'react';
import { fileToDataUrl, uniqueAssetPath } from '../../../assets/assetUtils';
import { paletteById, type LineStyle, type TemplateVariant } from '../../../model/wizard';
import { FONTS } from '../../../model/fonts';
import { defaultLineStyle } from '../../../templates/importedDesign/shared';
import type { DraftPatch, WizardDraft } from '../draft';

interface Props {
  variant: TemplateVariant;
  draft: WizardDraft;
  onDraft: (patch: DraftPatch) => void;
}

/** Step 3 — the data fields: the visible text lines plus the design's logo slot. */
export default function FieldsStep({ variant, draft, onDraft }: Props) {
  const lines = draft.lines;
  const logoInput = useRef<HTMLInputElement>(null);
  // An imported design carries its own look, so its text is placed and styled to match the
  // artwork instead of inheriting a house layout. Every catalog design lays its own lines out.
  const placed = variant.category === 'imported-design';
  const art = draft.designArt;
  const palette =
    draft.customPalette ?? (draft.paletteId ? paletteById(draft.paletteId) : variant.defaultPalette);

  const setLine = (i: number, key: 'title' | 'sample', value: string) => {
    onDraft({ lines: lines.map((l, k) => (k === i ? { ...l, [key]: value } : l)) });
  };

  const styleOf = (i: number): LineStyle =>
    lines[i].style ?? defaultLineStyle(i, art ?? { path: '', width: 1920, height: 1080 }, palette);

  const setStyle = (i: number, patch: Partial<LineStyle>) => {
    onDraft({
      lines: lines.map((l, k) => (k === i ? { ...l, style: { ...styleOf(i), ...patch } } : l)),
    });
  };

  // The logo slot: built-in designs always carry one; optional designs get a toggle.
  // Unset (null) follows "a logo image exists" — the import flow pre-fills it.
  const logoOn =
    variant.logo === 'built-in' || (draft.logoEnabled ?? draft.logoAssetPath !== null);
  const logoImage = draft.importedImages.find((a) => a.path === draft.logoAssetPath);

  /** Upload a custom logo: embed it as a data-URL asset and point the slot at it. */
  const uploadLogo = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    const path = uniqueAssetPath(file.name, draft.importedImages);
    onDraft({
      importedImages: [...draft.importedImages, { path, data: dataUrl }],
      logoAssetPath: path,
      logoEnabled: true,
    });
  };

  return (
    <div>
      <div className="panel-section">
        <h3>
          {placed ? 'Text on your design' : 'Text lines'}{' '}
          <span className="muted">
            {placed
              ? `(${variant.maxLines} max — place each one where your artwork has room for it)`
              : `(the design adapts — ${variant.maxLines} max for ${variant.name})`}
          </span>
        </h3>
        {placed && (
          <p className="hint" style={{ marginTop: -4, marginBottom: 10 }}>
            Each line becomes an editable field the operator fills in on air. Position is measured
            in your artwork's own pixels{art ? ` (${art.width} × ${art.height})` : ''}, from its
            top-left corner — and after creating, you can select a field on the canvas and drag it
            into place.
          </p>
        )}
        {lines.map((line, i) => (
          <div className={`wz-line-row ${placed ? 'wz-line-row--placed' : ''}`} key={i}>
            <span className="wz-fid">f{i}</span>
            <input
              placeholder="Label shown to the operator"
              value={line.title}
              onChange={(e) => setLine(i, 'title', e.target.value)}
            />
            {variant.suggestedLines[i]?.sample.includes('\n') ? (
              <textarea
                rows={5}
                placeholder="One entry per line — e.g.  Role | Name"
                value={line.sample}
                onChange={(e) => setLine(i, 'sample', e.target.value)}
              />
            ) : (
              <input
                placeholder="Sample text shown in the design"
                value={line.sample}
                onChange={(e) => setLine(i, 'sample', e.target.value)}
              />
            )}
            <button
              disabled={lines.length <= 1}
              title="Remove this line"
              onClick={() => onDraft({ lines: lines.filter((_, k) => k !== i) })}
            >
              ✕
            </button>

            {placed && (
              <div className="wz-place-grid">
                <label>
                  X
                  <input
                    type="number"
                    value={styleOf(i).x}
                    onChange={(e) => setStyle(i, { x: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Y
                  <input
                    type="number"
                    value={styleOf(i).y}
                    onChange={(e) => setStyle(i, { y: Number(e.target.value) })}
                  />
                </label>
                <label title="Which edge of the text sits at X">
                  Anchor
                  <select
                    value={styleOf(i).align}
                    onChange={(e) => setStyle(i, { align: e.target.value as LineStyle['align'] })}
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </label>
                <label>
                  Font
                  <select
                    value={styleOf(i).fontId ?? ''}
                    onChange={(e) => setStyle(i, { fontId: e.target.value || null })}
                  >
                    <option value="">Design font</option>
                    {FONTS.map((f) => (
                      <option key={f.id} value={f.id}>{f.family}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Size
                  <input
                    type="number"
                    min={4}
                    value={styleOf(i).fontSize}
                    onChange={(e) => setStyle(i, { fontSize: Math.max(4, Number(e.target.value)) })}
                  />
                </label>
                <label>
                  Weight
                  <select
                    value={styleOf(i).weight}
                    onChange={(e) => setStyle(i, { weight: Number(e.target.value) })}
                  >
                    <option value={400}>Regular</option>
                    <option value={500}>Medium</option>
                    <option value={700}>Bold</option>
                  </select>
                </label>
                <label className="wz-place-color">
                  Color
                  <span className="row" style={{ gap: 6 }}>
                    <input
                      type="color"
                      value={hexOf(styleOf(i).color)}
                      onChange={(e) => setStyle(i, { color: e.target.value })}
                    />
                    <input
                      value={styleOf(i).color}
                      onChange={(e) => setStyle(i, { color: e.target.value })}
                    />
                  </span>
                </label>
              </div>
            )}
          </div>
        ))}
        {lines.length < variant.maxLines && (
          <button
            onClick={() =>
              onDraft({ lines: [...lines, { title: `Line ${lines.length + 1}`, sample: 'More text' }] })
            }
          >
            + Add a line
          </button>
        )}
      </div>

      {variant.logo !== 'none' && (
        <div className="panel-section">
          <h3>Logo <span className="muted">(a real SPX image field — swap the file at playout)</span></h3>
          <label className="row" style={{ gap: 8, alignItems: 'center', cursor: variant.logo === 'built-in' ? 'default' : 'pointer' }}>
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={logoOn}
              disabled={variant.logo === 'built-in'}
              onChange={(e) => onDraft({ logoEnabled: e.target.checked })}
            />
            <span>
              <strong>Include a logo slot</strong>
              <span className="hint" style={{ display: 'block' }}>
                {variant.logo === 'built-in'
                  ? 'This design always carries its logo slot — upload yours or pick a file later in SPX.'
                  : 'Adds an image field to the design; leave it empty for a clean placeholder.'}
              </span>
            </span>
          </label>
          {logoOn && (
            <div className="row" style={{ gap: 8, marginTop: 10, alignItems: 'center' }}>
              <input
                ref={logoInput}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => { if (e.target.files?.[0]) void uploadLogo(e.target.files[0]); e.target.value = ''; }}
              />
              <button onClick={() => logoInput.current?.click()}>⬆ Upload a logo…</button>
              {logoImage && typeof logoImage.data === 'string' && (
                <>
                  <img
                    src={logoImage.data}
                    alt="Logo preview"
                    style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6 }}
                  />
                  <span className="hint">{logoImage.path.replace('images/', '')}</span>
                  <button
                    title="Remove the uploaded logo (the slot keeps its placeholder)"
                    onClick={() => onDraft({ logoAssetPath: null })}
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="panel-section">
        <h3>Need more fields? <span className="muted">(after creating)</span></h3>
        <p className="hint">
          The wizard keeps to the lines this design actually shows. Extra fields and custom
          layouts are added after creating, where the design can adapt to them: the Data tab
          adds a field, and AI editing or the canvas editor works it into the graphic.
        </p>
      </div>
    </div>
  );
}

/** A hex the native color input accepts — it rejects rgba()/named colors, which the text
 *  field beside it still takes (the design's own color may well be one). */
function hexOf(color: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : '#ffffff';
}
