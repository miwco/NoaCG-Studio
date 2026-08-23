// The output STAGE (docs/CLOUD_PLAYOUT.md §3): one fixed-size surface at the production
// resolution, CSS-scaled to the viewport, holding ONE sandboxed iframe per published graphic —
// all built at load (preload), each composed through the same composeDocument the editor
// previews with. Templates start invisible by the SPX contract, so an idle stacked graphic
// shows nothing.
//
// Every graphic is a LAYER, and payload order is the stack: index 0 furthest back, the last
// entry on top. Several layers are on air at once by design — a bug, a lower third and a
// ticker are three graphics, so taking a cue on one of them leaves the other two exactly as
// they were. Nothing here decides that; the stage stays dumb and the log says who plays.
//
// The stage is deliberately DUMB: it routes ControlMessages to the right iframe as
// previewProtocol commands and reports back what it forwarded. Which cue airs, and stopping the
// previously-live graphic, are the CONTROL surfaces' decisions — they ride the log as ordinary
// commands, whoever wrote them (an operator today, a data connector later).

import { composeDocument } from '../preview/composeDocument';
import {
  postPreviewCmd,
  PREVIEW_STATE_TYPE,
  type PreviewCmd,
  type PreviewMachineState,
  type PreviewStateMessage,
} from '../preview/previewProtocol';
import type { ControlEventRow, OutputGraphicSpec, OutputPayload } from '../control/hostedControl';
import type { SpxTemplate } from '../model/types';
import { DEFAULT_SETTINGS } from '../model/types';

/** Rebuild a renderable SpxTemplate from the published snapshot. Fields/settings/layers are
 *  parsed views the composer never reads — the html/css/js carry the truth, as always. */
function templateFromSpec(spec: OutputGraphicSpec): SpxTemplate {
  return {
    name: spec.key,
    type: 'blank',
    resolution: spec.resolution,
    fps: spec.fps,
    html: spec.html,
    css: spec.css,
    js: spec.js,
    fields: [],
    settings: DEFAULT_SETTINGS,
    assets: spec.assets.map((a) => ({ path: a.path, data: a.data })),
    layers: [],
  };
}

export interface OutputStage {
  /** Route one command to its graphic's document. Unknown graphics and the log's status rows
   *  ('cue'/'staged'/'live') are ignored, so a caller can feed rows straight through. */
  apply(graphic: string, msg: ControlEventRow['msg']): void;
  /** Ask a graphic's document for its machine state (answers arrive via onState). */
  requestState(graphic: string): void;
  /** The latest machine state each document reported (null = none / not machine-bearing). */
  states: ReadonlyMap<string, PreviewMachineState | null>;
  /** The field ids each document last reported as TOO LONG to fit (`noacgTextOverflow()`, see
   *  PreviewStateMessage.overflow). Empty for a graphic that fits, and for every template that
   *  answers no such question. */
  overflow: ReadonlyMap<string, string[]>;
  /** Called whenever a document reports a state OR an overflow set that differs from the last
   *  one seen. Both ride the one reply, so one callback carries both. */
  onState(cb: (graphic: string, state: PreviewMachineState | null, overflow: string[]) => void): void;
  /** The graphic keys the stage hosts, in LAYER order — furthest back first. */
  graphics: string[];
  /** Hide/show the WHOLE stage — the renderer's own surface, never the graphics' own state.
   *  Boot catch-up replays missed commands as commands, so their animations run; airing that
   *  replay would put the outage's history on screen. Hidden, it settles off air and the
   *  reveal shows the finished picture (docs/CLOUD_PLAYOUT.md §3). */
  setVisible(visible: boolean): void;
  /** Re-measure the fit box and rescale. The stage does this on every window resize; a host
   *  whose box changes for other reasons (a panel resize) calls it itself. */
  rescale(): void;
  destroy(): void;
}

export interface OutputStageOptions {
  /** The box the stage scales itself into. Defaults to the VIEWPORT, which is what the /output
   *  page wants — its root fills the window and a browser source is the window. The production
   *  page's rehearsal embed passes its own panel's size instead, so one stage implementation
   *  serves both and a rehearsal cannot drift from what airs. Call `rescale()` on the returned
   *  stage after the box changes; the stage listens to window resizes either way. */
  fit?: () => { width: number; height: number };
}

/** Build the stage into `root` and keep it scaled to its fit box (the viewport by default). */
export function createOutputStage(
  root: HTMLElement,
  payload: OutputPayload,
  options: OutputStageOptions = {},
): OutputStage {
  const { width, height } = payload.resolution;
  const stage = document.createElement('div');
  stage.style.cssText = [
    `width:${width}px`,
    `height:${height}px`,
    'position:absolute',
    'left:50%',
    'top:50%',
    'transform-origin:0 0',
    'background:transparent',
  ].join(';');
  root.appendChild(stage);

  // Predictable broadcast scaling: the stage is always resolution-exact design pixels, centred
  // and uniformly scaled to fit its box (a 1920×1080 production fills a 1920×1080 browser
  // source 1:1; any other size letterboxes transparently).
  const fit = options.fit ?? (() => ({ width: window.innerWidth, height: window.innerHeight }));
  const rescale = () => {
    const box = fit();
    const scale = Math.min(box.width / width, box.height / height);
    // transform-origin 0 0 + a translate by half the SCALED size: the stage stays centred
    // without percentage translates compounding with the scale.
    stage.style.transform = `translate(${(-width * scale) / 2}px, ${(-height * scale) / 2}px) scale(${scale})`;
  };
  rescale();
  window.addEventListener('resize', rescale);

  const frames = new Map<string, HTMLIFrameElement>();
  const states = new Map<string, PreviewMachineState | null>();
  const overflow = new Map<string, string[]>();
  const stateCbs: ((graphic: string, state: PreviewMachineState | null, overflow: string[]) => void)[] = [];
  // Commands QUEUE until the iframe's document has loaded its command listener — a
  // postMessage into an unloaded srcdoc is silently lost, which is exactly what ate the boot
  // recovery burst on a renderer refresh (live commands worked; the restore did not).
  const loaded = new Set<string>();
  const pending = new Map<string, PreviewCmd[]>();
  const post = (graphic: string, cmd: PreviewCmd) => {
    if (!loaded.has(graphic)) {
      pending.set(graphic, [...(pending.get(graphic) ?? []), cmd]);
      return;
    }
    postPreviewCmd(frames.get(graphic)?.contentWindow, cmd);
  };

  payload.graphics.forEach((spec, index) => {
    // The OPERATOR'S layer number (docs/PLAYOUT_DASHBOARD.md §5) — the same one the exported
    // package declares, so a production stacks identically in the browser output and on a
    // CasparCG server. A payload published before the field falls back to its array position,
    // which is what this used to be.
    const layer = Number.isFinite(spec.layer) ? Number(spec.layer) : index + 1;
    const iframe = document.createElement('iframe');
    // The same sandbox posture as every preview surface: published template code must never
    // reach the app origin (no allow-same-origin, ever — see preview/previewProtocol.ts).
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('title', spec.key);
    // The layer number the production authored, stated rather than implied. An explicit
    // z-index makes the stack a property of the LAYER instead of a property of the append
    // loop, which is what a production changing a graphic's layer is entitled to rely on.
    iframe.dataset.layer = String(layer);
    iframe.style.cssText = [
      'position:absolute',
      'left:0',
      'top:0',
      `width:${spec.resolution.width}px`,
      `height:${spec.resolution.height}px`,
      `z-index:${layer}`,
      'border:0',
      'background:transparent',
    ].join(';');
    iframe.addEventListener('load', () => {
      loaded.add(spec.key);
      const queue = pending.get(spec.key) ?? [];
      pending.delete(spec.key);
      for (const cmd of queue) postPreviewCmd(iframe.contentWindow, cmd);
    });
    iframe.srcdoc = composeDocument(templateFromSpec(spec), { liveControl: true });
    stage.appendChild(iframe);
    frames.set(spec.key, iframe);
    states.set(spec.key, null);
    overflow.set(spec.key, []);
  });

  // State replies carry no graphic name — the SOURCE window identifies the sender.
  const onMessage = (ev: MessageEvent) => {
    const data = ev.data as PreviewStateMessage | undefined;
    if (!data || data.type !== PREVIEW_STATE_TYPE) return;
    for (const [key, frame] of frames) {
      if (frame.contentWindow === ev.source) {
        const next = data.state ?? null;
        const nextOver = Array.isArray(data.overflow) ? data.overflow.map(String) : [];
        const moved =
          JSON.stringify(next) !== JSON.stringify(states.get(key) ?? null) ||
          nextOver.join(',') !== (overflow.get(key) ?? []).join(',');
        if (moved) {
          states.set(key, next);
          overflow.set(key, nextOver);
          for (const cb of stateCbs) cb(key, next, nextOver);
        }
        return;
      }
    }
  };
  window.addEventListener('message', onMessage);

  const apply = (graphic: string, msg: ControlEventRow['msg']) => {
    if (!frames.has(graphic)) return;
    switch (msg.t) {
      case 'update':
        post(graphic, { cmd: 'update', data: JSON.stringify(msg.data ?? {}) });
        break;
      case 'play':
        post(graphic, { cmd: 'play' });
        break;
      case 'stop':
        post(graphic, { cmd: 'stop' });
        break;
      case 'next':
        post(graphic, { cmd: 'next' });
        break;
      case 'event':
        // `at` rides along: a graphic that runs its own clock anchors it to the row's instant
        // rather than to this renderer's Date.now(), so every renderer agrees (controlModel.ts).
        post(graphic, { cmd: 'dispatch', event: msg.event, payload: msg.payload, at: msg.at });
        break;
      case 'snap':
        // Recovery semantics stated explicitly — the wire field means opposite things to the
        // editor simulator (parked design view, timers off) and to a renderer (timers arm).
        post(graphic, { cmd: 'snap', assignments: msg.snap, timers: true });
        break;
      default:
        return; // 'hello' and status rows ('cue'/'staged'/'live') are not renderer commands
    }
    post(graphic, { cmd: 'state' });
  };

  return {
    apply,
    requestState: (graphic) => {
      // Polls are droppable pre-load — queueing them would just replay stale asks.
      if (loaded.has(graphic)) post(graphic, { cmd: 'state' });
    },
    states,
    overflow,
    onState: (cb) => stateCbs.push(cb),
    graphics: payload.graphics.map((g) => g.key),
    // Opacity, not `visibility`/`display`: the documents keep compositing and their timelines
    // keep ticking, so what the reveal shows is a settled picture rather than one that only
    // starts moving once it is on air.
    setVisible: (visible) => {
      stage.style.opacity = visible ? '1' : '0';
    },
    rescale,
    destroy: () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('resize', rescale);
      stage.remove();
    },
  };
}
