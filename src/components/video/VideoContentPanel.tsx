// The Content panel: the video project's Template Definition, editable by anyone. The AI
// declares a handful of inputs (a headline, an accent colour, a score) alongside the
// composition; here a non-technical user changes them WITHOUT touching TSX. Every edit is a
// live, undoable store patch (consecutive edits to one field coalesce into a single undo);
// the preview updates instantly through the player host's set-props channel (no recompile).
//
// Values reach the composition as its `fields` prop - the same channel in the live preview
// (VideoPlayerFrame) and the final render (VideoRenderPanel/buildVideoManifest).

import { useState } from 'react';
import { useVideoProjectStore } from '../../store/videoProjectStore';
import type { VideoInput } from '../../model/videoTypes';
import { describeAssets } from '../../video/types';

/** Clamp a number to an input's optional bounds. */
function clampNumber(input: VideoInput, n: number): number {
  let v = n;
  if (input.min != null) v = Math.max(input.min, v);
  if (input.max != null) v = Math.min(input.max, v);
  return v;
}

function InputRow({ input, assetNames }: { input: VideoInput; assetNames: string[] }) {
  const setInputValue = useVideoProjectStore((s) => s.setInputValue);
  // Number fields hold a raw string while editing so the field can be temporarily empty or
  // mid-typing; the store still gets a live numeric value whenever the text parses.
  const [numDraft, setNumDraft] = useState<string | null>(null);
  const changed = input.value !== input.default;

  const control = () => {
    switch (input.type) {
      case 'color':
        return (
          <span className="row" style={{ gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              style={{ width: 44, padding: 0 }}
              value={String(input.value)}
              onChange={(e) => setInputValue(input.key, e.target.value)}
              data-testid={`video-input-${input.key}`}
            />
            <span className="mono muted" style={{ fontSize: 11 }}>
              {String(input.value)}
            </span>
          </span>
        );
      case 'select':
        return (
          <select
            value={String(input.value)}
            onChange={(e) => setInputValue(input.key, e.target.value)}
            data-testid={`video-input-${input.key}`}
          >
            {(input.options ?? []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
      case 'image': {
        // The value is a project asset's logical name (or '' for none); the composition
        // resolves it against the assets it already receives. Pick among uploaded assets -
        // uploading itself lives in the Assets tab. A value pointing at a since-removed asset
        // stays selectable (marked) so the control never silently drops the choice.
        const current = String(input.value);
        const missing = current !== '' && !assetNames.includes(current);
        return (
          <span className="row" style={{ gap: 8, alignItems: 'center' }}>
            <select
              value={current}
              onChange={(e) => setInputValue(input.key, e.target.value)}
              data-testid={`video-input-${input.key}`}
            >
              <option value="">None</option>
              {assetNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              {missing && (
                <option value={current}>{current} (missing)</option>
              )}
            </select>
            {assetNames.length === 0 && (
              <span className="hint" style={{ fontSize: 11 }}>
                Upload images in the Assets tab
              </span>
            )}
          </span>
        );
      }
      case 'number':
        return (
          <input
            type="number"
            min={input.min}
            max={input.max}
            step={input.step ?? 1}
            value={numDraft ?? String(input.value)}
            onChange={(e) => {
              setNumDraft(e.target.value);
              const n = Number(e.target.value);
              if (e.target.value.trim() !== '' && Number.isFinite(n)) {
                setInputValue(input.key, clampNumber(input, n));
              }
            }}
            onBlur={() => {
              if (numDraft !== null) {
                const n = Number(numDraft);
                setInputValue(input.key, clampNumber(input, Number.isFinite(n) ? n : Number(input.default) || 0));
                setNumDraft(null);
              }
            }}
            data-testid={`video-input-${input.key}`}
          />
        );
      default:
        return (
          <input
            type="text"
            value={String(input.value)}
            onChange={(e) => setInputValue(input.key, e.target.value)}
            data-testid={`video-input-${input.key}`}
          />
        );
    }
  };

  return (
    <div className="video-input-row" style={{ marginBottom: 12 }}>
      <label className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span>{input.label}</span>
        {changed && (
          <button
            onClick={() => setInputValue(input.key, input.default)}
            title={`Reset to "${input.default}"`}
            data-testid={`video-input-reset-${input.key}`}
            style={{ fontSize: 11, padding: '2px 6px' }}
          >
            ↺ Reset
          </button>
        )}
      </label>
      {control()}
    </div>
  );
}

export default function VideoContentPanel() {
  const inputs = useVideoProjectStore((s) => s.project.inputs);
  const assets = useVideoProjectStore((s) => s.project.assets);
  const resetInputs = useVideoProjectStore((s) => s.resetInputs);
  const anyChanged = inputs.some((i) => i.value !== i.default);
  // The logical names an image input can point at - the same names the composition reads
  // from its assets prop and the render packs into inputProps (video/types.ts describeAssets).
  const assetNames = describeAssets(assets).map((a) => a.name);

  return (
    <div className="video-content" data-testid="video-content-panel">
      <div className="panel-section">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3 style={{ margin: 0 }}>Content</h3>
          {anyChanged && (
            <button onClick={resetInputs} data-testid="video-content-reset" title="Reset every field to its default">
              ↺ Reset all
            </button>
          )}
        </div>

        {inputs.length === 0 ? (
          <p className="hint" data-testid="video-content-empty" style={{ marginTop: 8 }}>
            No editable inputs yet. Generate a video and the AI exposes the text, colours, and
            numbers you can change here - or edit the code to read values from the <code>fields</code>{' '}
            prop.
          </p>
        ) : (
          <>
            <p className="hint" style={{ marginTop: 4, marginBottom: 12 }}>
              Change the words, colours, and numbers - the preview updates live and the code stays
              the source of truth.
            </p>
            {inputs.map((input) => (
              <InputRow key={input.key} input={input} assetNames={assetNames} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
