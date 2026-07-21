import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FONTS,
  familyFromFileName,
  fontFormatForExt,
  registerAppFont,
  type BundledFont,
  type CustomFont,
} from '../../model/fonts';
import { extOf, fileToDataUrl } from '../../assets/assetUtils';

/**
 * The dependable font sources, in order (docs/SAVED_CONTENT_MODEL companion — the import
 * flow's typography): 1) NoaCG's bundled OFL library, 2) an uploaded font file, 3) a font
 * installed on this computer (Chromium's Local Font Access, permission-gated). Sources 2
 * and 3 both become a `CustomFont` whose bytes ride `template.assets` — embedded in every
 * export, never dependent on the playback machine's installed fonts.
 */
interface Props {
  /** The selected bundled id, 'custom' (the uploaded font), or null = the design default. */
  value: string | null;
  customFont: CustomFont | null;
  /** null clears back to the design default; 'custom' selects the uploaded font. */
  onPick: (fontId: string | null) => void;
  /** A new uploaded/local font (also selects it). */
  onCustomFont: (font: CustomFont) => void;
  /** What "null" means where this picker sits (e.g. "Design font"). */
  defaultLabel?: string;
}

/** Load a bundled face into the BUILDER document so the picker and the placement canvas
 *  render true previews (templates load their own copy from fonts/<file>). */
const loaded = new Set<string>();
export function ensureAppFontFace(font: BundledFont): void {
  if (loaded.has(font.id) || typeof FontFace === 'undefined') return;
  loaded.add(font.id);
  const face = new FontFace(font.family, `url(/fonts/${font.file})`, {
    weight: `${font.weights[0]} ${font.weights[1]}`,
  });
  face
    .load()
    .then((f) => (document.fonts as unknown as { add(f: FontFace): void }).add(f))
    .catch(() => loaded.delete(font.id));
}

/** Chromium's Local Font Access API (feature-detected; absent everywhere else). */
interface LocalFontData {
  family: string;
  fullName: string;
  postscriptName: string;
  blob(): Promise<Blob>;
}
type QueryLocalFonts = () => Promise<LocalFontData[]>;

export default function FontPicker({ value, customFont, onPick, onCustomFont, defaultLabel = 'Design font' }: Props) {
  const [query, setQuery] = useState('');
  const [localFonts, setLocalFonts] = useState<LocalFontData[] | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [busyLocal, setBusyLocal] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const fonts = useMemo(
    () => (q ? FONTS.filter((f) => f.family.toLowerCase().includes(q) || f.blurb.toLowerCase().includes(q)) : FONTS),
    [q],
  );
  useEffect(() => {
    for (const f of fonts) ensureAppFontFace(f);
  }, [fonts]);

  const canQueryLocal = typeof window !== 'undefined' && 'queryLocalFonts' in window;

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const ext = extOf(file.name);
    if (!['woff2', 'woff', 'ttf', 'otf'].includes(ext)) return;
    const data = await fileToDataUrl(file);
    const font: CustomFont = {
      family: familyFromFileName(file.name),
      format: fontFormatForExt(ext),
      asset: { path: `fonts/${file.name}`, data },
    };
    registerAppFont(font.family, data); // renders in the builder UI immediately
    onCustomFont(font);
  };

  const listLocal = async () => {
    setLocalError(null);
    try {
      const list = await (window as unknown as { queryLocalFonts: QueryLocalFonts }).queryLocalFonts();
      // One entry per family (the API lists every style); regular-ish first when present.
      const byFamily = new Map<string, LocalFontData>();
      for (const f of list) {
        const cur = byFamily.get(f.family);
        if (!cur || /regular/i.test(f.fullName)) byFamily.set(f.family, cur && !/regular/i.test(f.fullName) ? cur : f);
      }
      setLocalFonts([...byFamily.values()].sort((a, b) => a.family.localeCompare(b.family)));
    } catch {
      setLocalError('Local fonts are unavailable — permission was declined or this browser does not support it. Uploading the font file works everywhere.');
    }
  };

  /** A local font is EMBEDDED like an upload — the graphic must play on machines that
   *  never installed it. */
  const embedLocalFont = async (f: LocalFontData) => {
    setBusyLocal(f.family);
    try {
      const blob = await f.blob();
      const data = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(blob);
      });
      const font: CustomFont = {
        family: f.family,
        // The API serves SFNT bytes; ttf/otf both load via format('truetype'/'opentype').
        format: 'truetype',
        asset: { path: `fonts/${f.postscriptName || f.family.replace(/\s+/g, '-')}.ttf`, data },
      };
      registerAppFont(font.family, data);
      onCustomFont(font);
    } catch {
      setLocalError(`Could not read "${f.family}" — try uploading its file instead.`);
    } finally {
      setBusyLocal(null);
    }
  };

  return (
    <div className="font-picker" data-testid="font-picker">
      <div className="row">
        <input
          className="grow"
          placeholder="Search fonts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="font-search"
        />
        <input
          ref={fileInput}
          type="file"
          accept=".woff2,.woff,.ttf,.otf"
          style={{ display: 'none' }}
          onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }}
          data-testid="font-upload-input"
        />
        <button onClick={() => fileInput.current?.click()} title="Upload a .woff2 / .woff / .ttf / .otf — embedded in the graphic and every export" data-testid="font-upload">
          ⬆ Upload font…
        </button>
        {canQueryLocal && (
          <button onClick={() => void listLocal()} title="Pick a font installed on this computer (it gets embedded, so playout never depends on it being installed)">
            💻 Installed…
          </button>
        )}
      </div>

      <div className="font-picker-list" role="listbox" aria-label="Font family">
        <button
          className={`font-option ${value === null ? 'selected' : ''}`}
          onClick={() => onPick(null)}
          role="option"
          aria-selected={value === null}
        >
          <span className="font-option-name">{defaultLabel}</span>
          <span className="hint">Inherit the graphic's own font</span>
        </button>
        {customFont && (
          <button
            className={`font-option ${value === 'custom' ? 'selected' : ''}`}
            onClick={() => onPick('custom')}
            role="option"
            aria-selected={value === 'custom'}
            style={{ fontFamily: `"${customFont.family}"` }}
            data-testid="font-option-custom"
          >
            <span className="font-option-name">{customFont.family}</span>
            <span className="hint">Your font — embedded in the export</span>
          </button>
        )}
        {fonts.map((f) => (
          <button
            key={f.id}
            className={`font-option ${value === f.id ? 'selected' : ''}`}
            onClick={() => onPick(f.id)}
            role="option"
            aria-selected={value === f.id}
            style={{ fontFamily: `"${f.family}", ${f.fallback}` }}
            data-testid={`font-option-${f.id}`}
          >
            <span className="font-option-name">{f.family}</span>
            <span className="hint">{f.blurb} · weights {f.weights[0]}–{f.weights[1]}</span>
          </button>
        ))}
        {fonts.length === 0 && <p className="hint">No bundled font matches “{query}”. Upload one instead?</p>}
      </div>

      {localFonts && (
        <div className="font-picker-local">
          <span className="hint">Installed on this computer (picking one embeds it):</span>
          <div className="font-picker-list">
            {localFonts.slice(0, 60).map((f) => (
              <button key={f.postscriptName} className="font-option" onClick={() => void embedLocalFont(f)} disabled={busyLocal !== null}>
                <span className="font-option-name">{busyLocal === f.family ? 'Embedding…' : f.family}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {localError && <p className="hint">{localError}</p>}
    </div>
  );
}
