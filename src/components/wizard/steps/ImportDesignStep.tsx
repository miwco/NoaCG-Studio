import { useEffect, useRef, useState } from 'react';
import type { AssetFile, Resolution } from '../../../model/types';
import type { ProjectFormatSelection } from '../../../model/projectFormat';
import type { DesignArt } from '../../../model/wizard';
import { fileToDataUrl, uniqueAssetPath } from '../../../assets/assetUtils';
import { probeAsset } from '../../../assets/assetInfo';
import { importSvgMarkup, isSvgFile, type SvgImportResult } from '../../../assets/svgImport';
import { isTemplateFile, type ImportedTemplateResult } from '../../../model/importTemplate';
import ProjectFormatPicker from '../../ProjectFormatPicker';
import SectionHead from '../SectionHead';

interface Props {
  art: DesignArt | null;
  images: AssetFile[];
  resolution: Resolution;
  format: ProjectFormatSelection;
  onFormat: (format: ProjectFormatSelection) => void;
  onArt: (art: DesignArt, images: AssetFile[]) => void;
  onClear: () => void;
  /** A dropped .html/.zip TEMPLATE that was parsed, rather than artwork to place fields on. */
  templateFile: ImportedTemplateResult | null;
  onTemplateFile: (file: File) => void;
  onClearTemplate: () => void;
  /** Why the dropped template file could not be read (the parse is the wizard's). */
  fileError: string | null;
  /** A dropped SVG, parsed + sanitized + inventoried (docs/SVG_IMPORT_PLAN.md). */
  svg: SvgImportResult | null;
  onSvg: (svg: SvgImportResult) => void;
  onClearSvg: () => void;
}

/**
 * "Import graphic", step 1 — bring in the finished artwork.
 *
 * ONE image, and it IS the design (not a logo dropped into someone else's template). Any
 * raster format the browser decodes is accepted — the flow works off the decoded pixels, so
 * PNG, JPEG, WebP, GIF and AVIF are the same to it. Its natural size is MEASURED here rather
 * than assumed: it decides the graphic's size, whether the design covers the frame or floats
 * inside it, and where the text defaults land. Guessing any of that would put the user's
 * artwork somewhere they didn't draw it.
 *
 * THE SAME ZONE TAKES A FINISHED TEMPLATE (.html / .zip). "I already have this graphic" is
 * the same errand as "I already have this picture" — both arrive here holding something made
 * elsewhere and wanting it usable in a production — so the flow reads the file, not the
 * user's route to it. A template file skips artwork preparation entirely (there is nothing to
 * erase and no field to place: it already declares its own) and goes straight to Finish,
 * where it joins a production or exports like anything else.
 */
export default function ImportDesignStep({
  art,
  images,
  resolution,
  format,
  onFormat,
  onArt,
  onClear,
  templateFile,
  onTemplateFile,
  onClearTemplate,
  fileError,
  svg,
  onSvg,
  onClearSvg,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = art ? images.find((a) => a.path === art.path) : null;
  const fullFrame = !!art && art.width === resolution.width && art.height === resolution.height;
  const scaled = !!art && art.sourceWidth != null;

  /**
   * Does this artwork carry transparency at all? A graphic that fills the frame with no
   * transparent pixel anywhere COVERS THE LIVE PICTURE - correct for a full-screen card, and
   * the commonest thing to get wrong when a lower third is exported with the footage or the
   * mock-up background still behind it. Nothing here blocks: a full-frame card is a real
   * graphic, so this states the fact and names both readings.
   *
   * `probeAsset` samples a 64x64 downscale, so it answers "any transparency anywhere" rather
   * than a proportion - which is exactly the question. Unknown (a canvas readback the browser
   * refused) says nothing at all, since a guess here would be a warning about someone's
   * correct file.
   */
  const [opaque, setOpaque] = useState(false);
  useEffect(() => {
    if (!preview) {
      setOpaque(false);
      return;
    }
    let alive = true;
    void probeAsset(preview)
      .then((info) => alive && setOpaque(info.hasAlpha === false))
      .catch(() => alive && setOpaque(false));
    return () => {
      alive = false;
    };
  }, [preview]);

  /** The artwork's real pixel size — an <img> is the only thing that actually knows it. */
  const measure = (dataUrl: string) =>
    new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('That file could not be read as an image.'));
      img.src = dataUrl;
    });

  /**
   * The design-space size: artwork larger than the frame is scaled down to FIT it, because a
   * larger file is almost always the same design exported at higher resolution (a 2× / retina
   * export), and placing it at natural size would push most of it off the frame. The file keeps
   * every pixel — only the display size shrinks — and the real size is kept for the summary.
   */
  const fitToFrame = (size: { width: number; height: number }): Omit<DesignArt, 'path'> => {
    if (size.width <= resolution.width && size.height <= resolution.height) return size;
    const fit = Math.min(resolution.width / size.width, resolution.height / size.height);
    return {
      width: Math.round(size.width * fit),
      height: Math.round(size.height * fit),
      sourceWidth: size.width,
      sourceHeight: size.height,
    };
  };

  const take = async (files: FileList | File[]) => {
    setError(null);
    // A finished template first: it is decided by the FILE, so dropping one here never has to
    // be a different gesture from dropping the picture it was made from.
    const dropped = Array.from(files);
    const template = dropped.find(isTemplateFile);
    if (template) {
      onTemplateFile(template);
      return;
    }
    // An SVG before the raster path: its MIME type is image/*, so without this branch it
    // would fall into the pixel measurement below and die at the no-intrinsic-size check.
    // A vector file is not a defect to explain — it is the better import (the SVG road,
    // docs/SVG_IMPORT_PLAN.md): parsed, sanitized, its text layers offered as fields.
    const svgFile = dropped.find(isSvgFile);
    if (svgFile) {
      try {
        onSvg(importSvgMarkup(await svgFile.text()));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
      return;
    }
    // Any image the browser can decode is welcome — the pipeline works off the decoded
    // pixels, never the container, so PNG, JPEG, WebP, GIF and AVIF all behave the same.
    // (Erasing baked-in text re-encodes to PNG, so a lossy original never loses more.)
    const file = dropped.find((f) => f.type.startsWith('image/'));
    if (!file) {
      setError('That is neither an image nor a template file. Bring in your finished design as a PNG, JPEG or WebP, or a graphic you already have as .html or .zip.');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      const size = await measure(dataUrl);
      // A vector file with no intrinsic size measures 0 × 0, and every downstream number
      // (the design's size, the placement defaults, the erase rect) is derived from it —
      // so say what is wrong instead of creating a zero-sized design.
      if (size.width < 1 || size.height < 1) {
        setError('That image has no fixed pixel size. Export it at the size you want it on air and drop it again.');
        return;
      }
      // One design per graphic: a second drop REPLACES the artwork rather than piling up.
      const asset: AssetFile = { path: uniqueAssetPath(file.name, []), data: dataUrl };
      onArt({ path: asset.path, ...fitToFrame(size) }, [asset]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div>
      <ProjectFormatPicker
        value={format}
        onChange={onFormat}
        disabled={!!art || !!templateFile || !!svg}
        idPrefix="import-design-format"
        description={
          templateFile
            ? 'A finished template brings its own canvas — this is what it is read back against.'
            : art || svg
              ? 'Remove the current artwork before changing its authored canvas.'
              : 'Choose the canvas before artwork is measured and placed.'
        }
      />

      {/* ONE LINE PER THING, AND AN ⓘ FOR THE REST (GOALS goal 4): the drop zone carries one
          line; what each format buys lives behind this dot. */}
      {!art && !templateFile && !svg && (
        <SectionHead title="Your design" summary="the artwork you already made" testid="import-design-why">
          <p>
            A layered <strong>SVG</strong> from Illustrator, Figma or Inkscape is the best
            import. It stays pixel-exact and its text layers turn into editable fields on their
            own. PNG, JPEG and WebP work too; you place the text fields yourself in the next
            steps.
          </p>
          <p>
            Pick a format that carries transparency (SVG, PNG, WebP) and the video shows through
            behind your graphic.
          </p>
          <p>
            Already have the finished graphic as <strong>.html</strong> or <strong>.zip</strong>?
            Drop that instead. It comes in as it is, with its own fields.
          </p>
        </SectionHead>
      )}
      {/* Once the design is in, the drop zone steps DOWN to a quiet swap target: keeping it
          at full height would give the loudest element on the step to an action the user has
          already finished, and push everything that still matters below the fold. */}
      <div
        className={`wz-drop ${art || templateFile || svg ? 'compact' : ''} ${dragOver ? 'over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); void take(e.dataTransfer.files); }}
        onClick={() => fileInput.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={fileInput}
          type="file"
          accept="image/*,.svg,.html,.htm,.zip"
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files) void take(e.target.files); e.target.value = ''; }}
        />
        <strong>
          {art || templateFile || svg ? 'Drop another file to replace it' : 'Drop your finished design here'}
        </strong>
        {/* ONE LINE (GOALS goal 4): the drop zone says what to do; the format detail — why an
            SVG beats a PNG, what transparency buys, the .html/.zip door — moved to the ⓘ
            beside the step title above. */}
        {!art && !templateFile && !svg && (
          <span className="hint">
            A layered <strong>SVG</strong> is best. PNG, JPEG, WebP, .html and .zip work too.
          </span>
        )}
      </div>

      {(error || fileError) && (
        <p className="status-bad" style={{ marginTop: 10 }}>✗ {error ?? fileError}</p>
      )}

      {templateFile && (
        <div className="panel-section" style={{ marginTop: 16 }} data-testid="import-template-card">
          <h3>Your template</h3>
          <p>
            <strong>{templateFile.template.name}</strong>{' '}
            <span className="hint mono">
              {templateFile.template.resolution.width} × {templateFile.template.resolution.height}
              {templateFile.detection.fps ? ` · ${templateFile.detection.fps} fps` : ''}
            </span>
          </p>
          {/* The FIELDS are the whole point of importing a template rather than a picture:
              they are what an operator types into, on the control page and in playout. Naming
              them here is what turns "it opened" into "it is usable". */}
          {templateFile.template.fields.length > 0 ? (
            <p className="hint" data-testid="import-template-fields">
              {templateFile.template.fields.length} operator field
              {templateFile.template.fields.length === 1 ? '' : 's'}:{' '}
              {templateFile.template.fields.map((f) => f.title || f.field).join(', ')}
            </p>
          ) : (
            <p className="status-bad" data-testid="import-template-nofields">
              No operator fields were found in this file, so there is nothing to type into on
              air. It can still be exported and played out as a fixed graphic.
            </p>
          )}
          {templateFile.detection.messages.map((m) => (
            <p className="hint" key={m}>{m}</p>
          ))}
          <button onClick={onClearTemplate}>✕ Use a different file</button>
        </div>
      )}

      {svg && (
        <div className="panel-section" style={{ marginTop: 16 }} data-testid="import-svg-card">
          <h3>Your design</h3>
          <p>
            <strong>SVG artwork</strong>{' '}
            <span className="hint mono">{svg.width} × {svg.height}</span>
          </p>
          {/* The text layers are the whole point of an SVG import: each becomes an operator
              field with the designer's exact typography. Counting them here is what turns
              "it opened" into "it is bindable". */}
          {svg.candidates.length > 0 ? (
            <p className="hint" data-testid="import-svg-layers">
              {svg.candidates.length} text layer{svg.candidates.length === 1 ? '' : 's'} found.
              Pick which ones the operator can retype, next step.
            </p>
          ) : (
            <p className="status-warn" data-testid="import-svg-nolayers">
              No text layers here. The type was probably turned into outlines on export. It
              still imports pixel-exact. The next step shows two ways to get editable text.
            </p>
          )}
          {svg.fonts.length > 0 && (
            <p className="hint" data-testid="import-svg-fonts">
              Typeface{svg.fonts.length === 1 ? '' : 's'}: {svg.fonts.map((f) => f.family).join(', ')}
            </p>
          )}
          {svg.notices.map((n) => (
            <p className="hint" key={n}>{n}</p>
          ))}
          <button onClick={onClearSvg}>✕ Use a different design</button>
        </div>
      )}

      {art && preview && (
        <div className="panel-section" style={{ marginTop: 16 }}>
          <h3>Your design</h3>
          <div className="asset-card" style={{ maxWidth: 320 }}>
            <div className="asset-thumb">
              <img src={typeof preview.data === 'string' ? preview.data : ''} alt={art.path} />
            </div>
            <div className="asset-path" title={art.path}>{art.path.replace('images/', '')}</div>
            <div className="hint mono" style={{ marginBottom: 6 }}>
              {art.sourceWidth ?? art.width} × {art.sourceHeight ?? art.height}
            </div>
            <button onClick={onClear}>✕ Use a different design</button>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            {fullFrame && scaled
              ? `A ${Math.round((art.sourceWidth! / art.width) * 10) / 10}× export of the ${resolution.width} × ${resolution.height} frame — shown frame-sized, edge to edge, exactly as you drew it (the extra resolution keeps it sharp).`
              : fullFrame
                ? `Frame-sized (${resolution.width} × ${resolution.height}) — it will sit exactly where you drew it, edge to edge.`
                : scaled
                  ? `Larger than the ${resolution.width} × ${resolution.height} frame, so it is scaled down to fit it (the extra resolution keeps it sharp) and placed as an object you can position.`
                  : `Smaller than the ${resolution.width} × ${resolution.height} frame, so it is placed as an object you can position and resize.`}
          </p>
          {fullFrame && opaque && (
            <p className="status-warn" data-testid="import-opaque-warning">
              This artwork fills the frame and has no transparent areas, so on air it covers the
              whole picture. Right for a full-screen card. Wrong for a lower third exported with
              its background behind it. If the video should show through, export again as PNG or
              WebP with a transparent background.
            </p>
          )}
          {!scaled &&
            art.width / art.height === resolution.width / resolution.height &&
            (art.width < resolution.width || art.height < resolution.height) && (
              <p className="status-bad" data-testid="import-raster-warning">
                This source is smaller than the project canvas. It stays at native pixel size;
                enlarging it to fill the frame would soften it.
              </p>
            )}
        </div>
      )}

      <div className="panel-section" style={{ marginTop: 14 }}>
        <h3>What happens next</h3>
        <p className="hint">
          {templateFile
            ? 'Name it, then send it to a production or export it: OGraf, CasparCG, SPX, LiveOS or an OBS/vMix overlay. Your file is kept exactly as you wrote it.'
            : svg
              ? 'Next you pick which text layers the operator can edit, match the typefaces, and choose how it moves on and off air. The SVG is never redrawn. Your exact artwork goes on air.'
              : 'Next you clean up the artwork if it needs it, place the text fields, and choose how it moves on and off air. Your artwork is never redrawn. NoaCG only adds the broadcast behaviour around it.'}
        </p>
      </div>
    </div>
  );
}
