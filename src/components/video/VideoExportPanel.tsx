// Export for video projects: render to media through the render service (only when
// isRenderConfigured() - unconfigured builds grow zero render UI, same posture as the SPX
// ExportPanel) plus the always-available source download. A HyperFrames project downloads
// as a standalone composition file that any HyperFrames tooling can run - the source
// carries no script tags (gsap is provided by NoaCG's driver), so the download inlines
// the bundled GSAP to stay plug-and-play offline.

import { saveAs } from 'file-saver';
import gsapSource from '../../assets/gsap.min.js?raw';
import { useVideoProjectStore } from '../../store/videoProjectStore';
import { isRenderConfigured } from '../../render/config';
import VideoRenderPanel from './VideoRenderPanel';

export default function VideoExportPanel() {
  const project = useVideoProjectStore((s) => s.project);
  const hyperframes = project.engine === 'hyperframes';

  const downloadSource = () => {
    const stem = project.name.replace(/[^\w-]+/g, '-') || 'composition';
    if (hyperframes) {
      // Inline GSAP at the start of <head> so the file runs (and renders via the
      // HyperFrames CLI) with no network and no extra files.
      const gsapTag = `<script>/* GSAP (bundled) */\n${gsapSource}\n</script>`;
      const html = /<head[^>]*>/i.test(project.html)
        ? project.html.replace(/<head[^>]*>/i, (m) => `${m}\n${gsapTag}`)
        : gsapTag + project.html;
      saveAs(new Blob([html], { type: 'text/html;charset=utf-8' }), `${stem}.html`);
      return;
    }
    saveAs(new Blob([project.tsx], { type: 'text/plain;charset=utf-8' }), `${stem}.tsx`);
  };

  return (
    <div className="video-export">
      {isRenderConfigured() ? (
        <VideoRenderPanel />
      ) : (
        <div className="panel-section">
          <h3>Render video</h3>
          <p className="hint">
            Video rendering needs the render service (VITE_RENDER_API) - not configured in this
            build.
          </p>
        </div>
      )}

      <div className="panel-section">
        <h3>Source</h3>
        <p className="hint">
          {hyperframes
            ? 'The composition is a standalone HyperFrames HTML file (GSAP inlined) - open it in a browser or render it with the HyperFrames CLI.'
            : 'The composition is a single React/Remotion file - use it in any Remotion project.'}
        </p>
        <button onClick={downloadSource}>
          ⬇ Download {hyperframes ? 'composition.html' : 'Composition.tsx'}
        </button>
      </div>
    </div>
  );
}
