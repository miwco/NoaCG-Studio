import { useEffect, useRef, useState, type RefObject } from 'react';
import { composeDocument } from '../preview/composeDocument';
import { useTemplateStore } from '../store/templateStore';

interface Props {
  iframeRef: RefObject<HTMLIFrameElement>;
}

const STAGE_W = 1920;
const STAGE_H = 1080;
const RELOAD_DEBOUNCE_MS = 350;

/**
 * Live preview: renders the composed template in a sandboxed iframe scaled to fit the stage.
 * Reloads (debounced) when the code changes, and reports runtime errors back to the store.
 */
export default function PreviewFrame({ iframeRef }: Props) {
  const template = useTemplateStore((s) => s.template);
  const previewBg = useTemplateStore((s) => s.previewBg);
  const setPreviewBg = useTemplateStore((s) => s.setPreviewBg);
  const setPreviewError = useTemplateStore((s) => s.setPreviewError);

  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  // Scale the 1920x1080 iframe to fit the stage.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => {
      const { width, height } = stage.getBoundingClientRect();
      setScale(Math.min(width / STAGE_W, height / STAGE_H));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  // Listen for runtime errors posted from the preview document.
  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (ev.data && ev.data.type === 'spx-preview-error') {
        setPreviewError(String(ev.data.message));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [setPreviewError]);

  // Rebuild the iframe document when code changes (debounced).
  useEffect(() => {
    const handle = setTimeout(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      setPreviewError(null);
      iframe.srcdoc = composeDocument(template);
    }, RELOAD_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [template, iframeRef, setPreviewError]);

  return (
    <div className={`preview-stage ${previewBg}`} ref={stageRef}>
      <iframe
        ref={iframeRef}
        className="preview-frame"
        title="SPX live preview"
        sandbox="allow-scripts allow-same-origin"
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      />
      <div className="bg-switch" style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
        {(['checkerboard', 'black', 'video'] as const).map((bg) => (
          <button
            key={bg}
            className={previewBg === bg ? 'active' : ''}
            onClick={() => setPreviewBg(bg)}
            title={`${bg} background`}
          >
            {bg === 'checkerboard' ? 'Trans' : bg === 'black' ? 'Black' : 'Video'}
          </button>
        ))}
      </div>
    </div>
  );
}
