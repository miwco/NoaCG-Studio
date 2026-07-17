// The Content panel: the video project's Template Definition, editable by anyone. The AI
// declares a handful of inputs (a headline, an accent colour, a score) alongside the
// composition; here a non-technical user changes them WITHOUT touching TSX. Every edit is a
// live, undoable store patch (consecutive edits to one field coalesce into a single undo);
// the preview updates instantly through the player host's set-props channel (no recompile).
//
// Values reach the composition as its `fields` prop - the same channel in the live preview
// (VideoPlayerFrame) and the final render (VideoRenderPanel/buildVideoManifest).
//
// The rows themselves are the SHARED field control (components/fields/FieldControl.tsx): a
// video input becomes a FieldDescriptor exactly as an SPX DataField does, so the video
// Content panel and the SPX Data/Control panels are the same component over the same
// vocabulary - one place decides what a colour or image control is.

import { useMemo } from 'react';
import { useVideoProjectStore } from '../../store/videoProjectStore';
import { videoInputDescriptor, type VideoInput } from '../../model/videoTypes';
import { contentInputs } from '../../model/videoInputInfer';
import { hyperframesContentInputs } from '../../video/hyperframes/parse';
import { FieldRow, type FieldImage } from '../fields/FieldControl';
import { describeAssets } from '../../video/types';

function InputRow({ input, images, fromCode }: { input: VideoInput; images: FieldImage[]; fromCode: boolean }) {
  const setInputValue = useVideoProjectStore((s) => s.setInputValue);
  return (
    <FieldRow
      descriptor={videoInputDescriptor(input)}
      value={input.value}
      onChange={(v) => setInputValue(input, v)}
      images={images}
      imageHint="Upload images in the Assets tab"
      testIdPrefix="video-input"
      badge={fromCode ? 'code' : undefined}
    />
  );
}

export default function VideoContentPanel() {
  const declared = useVideoProjectStore((s) => s.project.inputs);
  const engine = useVideoProjectStore((s) => s.project.engine);
  const tsx = useVideoProjectStore((s) => s.project.tsx);
  const html = useVideoProjectStore((s) => s.project.html);
  const assets = useVideoProjectStore((s) => s.project.assets);
  const resetInputs = useVideoProjectStore((s) => s.resetInputs);

  // What the panel edits is what the CODE reads: the inputs the AI declared, plus any a human
  // wrote into the composition by hand - `fields.subtitle ?? 'Live tonight'` in a Remotion
  // module, or a data-composition-variables declaration in a HyperFrames document. An inferred
  // input holds no value until it's edited - the code's own fallback is the value until then -
  // so it is never "changed" and never needs a reset.
  const inputs = useMemo(
    () =>
      engine === 'hyperframes'
        ? hyperframesContentInputs(declared, html)
        : contentInputs(declared, tsx),
    [engine, declared, tsx, html],
  );
  const declaredKeys = useMemo(() => new Set(declared.map((i) => i.key)), [declared]);
  const anyChanged = declared.some((i) => i.value !== i.default);

  // What an image input can point at: an asset's LOGICAL NAME - the same name the composition
  // reads from its assets prop and the render packs into inputProps (video/types.ts). Uploading
  // lives in the Assets tab (it enforces the manifest budget), so this control only picks.
  const dataByPath = new Map(assets.map((a) => [a.path, a.data]));
  const images: FieldImage[] = describeAssets(assets).map((a) => {
    const data = dataByPath.get(a.path);
    return { value: a.name, src: a.mime.startsWith('image/') && typeof data === 'string' ? data : undefined };
  });

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
            numbers you can change here - or write one yourself:{' '}
            {engine === 'hyperframes' ? (
              <>
                declare it in <code>data-composition-variables</code> and it shows up here as a
                field.
              </>
            ) : (
              <>
                any <code>fields.name ?? 'default'</code> the code reads shows up here as a field.
              </>
            )}
          </p>
        ) : (
          <>
            <p className="hint" style={{ marginTop: 4, marginBottom: 12 }}>
              Change the words, colours, and numbers - the preview updates live and the code stays
              the source of truth. Fields marked <span className="field-id">code</span> were read
              straight out of the composition.
            </p>
            {inputs.map((input) => (
              <InputRow
                key={input.key}
                input={input}
                images={images}
                fromCode={!declaredKeys.has(input.key)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
