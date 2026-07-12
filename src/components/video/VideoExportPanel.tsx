// Export for video projects. The rendered-video path (MP4/WebM/PNG/sequence/ProRes via
// the render service) plugs in with the render slice; source download is always available
// so the project is portable from day one.

import { saveAs } from 'file-saver';
import { useVideoProjectStore } from '../../store/videoProjectStore';
import { isRenderConfigured } from '../../render/config';

export default function VideoExportPanel() {
  const project = useVideoProjectStore((s) => s.project);

  const downloadSource = () => {
    saveAs(
      new Blob([project.tsx], { type: 'text/plain;charset=utf-8' }),
      `${project.name.replace(/[^\w-]+/g, '-') || 'composition'}.tsx`,
    );
  };

  return (
    <div className="video-export">
      <div className="panel-section">
        <h3>Render video</h3>
        {isRenderConfigured() ? (
          <p className="hint">
            Video rendering for AI compositions is being wired to the render service - it lands
            later in this branch.
          </p>
        ) : (
          <p className="hint">
            Video rendering needs the render service (VITE_RENDER_API) - not configured in this
            build.
          </p>
        )}
      </div>

      <div className="panel-section">
        <h3>Source</h3>
        <p className="hint">
          The composition is a single React/Remotion file - use it in any Remotion project.
        </p>
        <button onClick={downloadSource}>⬇ Download Composition.tsx</button>
      </div>
    </div>
  );
}
