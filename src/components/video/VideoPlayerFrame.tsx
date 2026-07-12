// The video preview stage. This placeholder renders the aspect-correct stage chrome;
// the sandboxed Remotion Player iframe host (player-host/) plugs into it in the preview
// slice - the surrounding shell, panels, and store wiring are already final.

import { useVideoProjectStore } from '../../store/videoProjectStore';

export default function VideoPlayerFrame() {
  const project = useVideoProjectStore((s) => s.project);
  const previewError = useVideoProjectStore((s) => s.previewError);

  return (
    <div className="preview-wrap">
      <div
        className={`preview-stage ${project.transparent ? 'checkerboard' : 'black'}`}
        style={{ aspectRatio: `${project.width} / ${project.height}` }}
        data-testid="video-stage"
      >
        <div className="video-stage-placeholder">
          <span className="hint">
            Live preview loads here - the Remotion player pipeline is next in this branch.
          </span>
        </div>
      </div>
      {previewError && (
        <div className="status-bad video-preview-error" data-testid="video-preview-error">
          ✗ {previewError}
        </div>
      )}
    </div>
  );
}
