// The kind:'hyperframes' host: mounts the composed HyperFrames render document in a
// same-origin srcdoc iframe and drives its __noacgHfRender driver one seek per frame -
// the same host pattern as NoaCGGraphic (serialized seeks, hard reset on rewind), minus
// the SPX schedule/measurement machinery: a HyperFrames project has a fixed duration and
// the driver renders any time t deterministically (clip windows + one paused GSAP
// timeline). The document is fully self-contained (assets, GSAP, and the driver inlined
// by src/video/hyperframes/compose.ts in 'render' mode) - this component only
// synchronizes it with Remotion's frame counter.

import { AbsoluteFill, cancelRender, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import { useEffect, useRef } from 'react';
import { HYPERFRAMES_RUNTIME_VERSION, type HyperframesRenderManifest } from '../../src/render/manifest';

interface HfRenderRuntime {
  version: number;
  prepare(): Promise<{ durationMs: number }>;
  seek(tMs: number): void;
  getErrors(): string[];
}

interface HostState {
  chain: Promise<void>;
  iframe: HTMLIFrameElement | null;
  runtime: HfRenderRuntime | null;
  lastMs: number;
}

const settlePaint = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

export const HyperframesGraphic: React.FC<HyperframesRenderManifest> = (manifest) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<HostState>({ chain: Promise.resolve(), iframe: null, runtime: null, lastMs: 0 });

  // The host page's color scheme must match the render document's (light) — Chromium
  // paints a scheme-mismatched iframe opaque, which would silently kill alpha output.
  useEffect(() => {
    document.documentElement.style.colorScheme = 'light';
  }, []);

  /** (Re)create the iframe and run the driver's prepare(). */
  const boot = async (): Promise<void> => {
    const container = containerRef.current;
    if (!container) throw new Error('hyperframes host: container missing');
    stateRef.current.iframe?.remove();
    stateRef.current.iframe = null;
    stateRef.current.runtime = null;
    stateRef.current.lastMs = 0;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    iframe.style.cssText = `width: ${manifest.width}px; height: ${manifest.height}px; border: 0; display: block; background: transparent; color-scheme: light;`;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('hyperframes host: document load timed out')), 30_000);
      iframe.addEventListener('load', () => { clearTimeout(timer); resolve(); }, { once: true });
      iframe.srcdoc = manifest.documentHtml;
      container.appendChild(iframe);
    });

    const w = iframe.contentWindow as (Window & { __noacgHfRender?: HfRenderRuntime }) | null;
    const runtime = w?.__noacgHfRender;
    if (!runtime) throw new Error('hyperframes host: __noacgHfRender missing from the render document');
    if (runtime.version !== HYPERFRAMES_RUNTIME_VERSION) {
      throw new Error(`hyperframes host: runtime version ${runtime.version} !== ${HYPERFRAMES_RUNTIME_VERSION} (stale document?)`);
    }
    await runtime.prepare();
    const bootErrors = runtime.getErrors();
    if (bootErrors.length > 0) throw new Error('composition errors: ' + bootErrors.join(' | '));
    stateRef.current.iframe = iframe;
    stateRef.current.runtime = runtime;
  };

  useEffect(() => {
    const handle = delayRender(`hyperframes seek f${frame}`);
    stateRef.current.chain = stateRef.current.chain
      .then(async () => {
        const tMs = (frame / fps) * 1000;
        const st = stateRef.current;
        if (!st.runtime || tMs < st.lastMs - 0.001) await boot(); // first frame or rewind
        stateRef.current.runtime!.seek(tMs);
        stateRef.current.lastMs = tMs;
        await settlePaint();
        const errors = stateRef.current.runtime!.getErrors();
        if (errors.length > 0) throw new Error('composition errors: ' + errors.join(' | '));
        continueRender(handle);
      })
      .catch((err: unknown) => cancelRender(err));
    // The chain serializes work; effects only enqueue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, fps]);

  const background =
    manifest.output.format === 'mp4' ? (manifest.output.backgroundColor ?? '#000000') : undefined;

  return (
    <AbsoluteFill style={{ backgroundColor: background }}>
      <div ref={containerRef} style={{ width: manifest.width, height: manifest.height }} />
    </AbsoluteFill>
  );
};
