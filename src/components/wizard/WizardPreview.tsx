import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { composeDocument } from '../../preview/composeDocument';
import { postPreviewCmd, PREVIEW_BOX_TYPE, type PreviewCmd } from '../../preview/previewProtocol';
import type { SpxTemplate } from '../../model/types';

interface Props {
  template: SpxTemplate;
  /** Bumping this replays the animation (used when the user changes the animation). */
  replayKey?: number;
  /** Demo the full lifecycle — in, hold, out, back in — after each (re)play. */
  demoOut?: boolean;
  /** Import graphic's Prepare step: override the FIRST field's pushed value, so the
   *  content-width slider drives the emitted stretch runtime live. Null = the samples. */
  demoText?: string | null;
}

/**
 * The wizard's persistent live preview: the real composed template in a scaled iframe.
 * The entrance plays automatically on every (debounced) rebuild so each choice is felt
 * immediately; Replay / Out let the user test the motion at any time.
 *
 * The brief behind a template can be an AI prompt or an imported file, so this iframe carries no
 * `allow-same-origin` like every other preview surface — a generated document must never be able
 * to read the app's own origin (a stored provider key, a signed-in session) through
 * `parent.localStorage`. There is therefore no reaching in (`contentWindow.play()`,
 * `contentDocument` reads): every command goes through composeDocument's `liveControl` channel
 * (`postCmd` below posts `{ type: 'spx-preview-cmd', cmd, data? }`) and the document reports its
 * own box back (`spx-preview-box`) after any command that can move it — the same wire shape
 * GraphicThumb and MiniPreview read for their settle-once cards.
 */
export default function WizardPreview({ template, replayKey = 0, demoOut = false, demoText = null }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [srcdoc, setSrcdoc] = useState('');
  // Zoom-to-graphic: default shows the whole canvas; the toggle reframes the view onto
  // just the graphic so small formats (corner bugs, tickers) are actually inspectable.
  const [zoomed, setZoomed] = useState(false);
  // The graphic's layout box in canvas px, reported by the document itself (postMessage) rather
  // than measured here — mid-animation reports still give the settled box, since the entrance's
  // GSAP motion never transforms the root itself (presets move the box and lines inside it).
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  // Pending lifecycle-demo timers (out + back in) — cleared on any new play/stop.
  const demoTimers = useRef<number[]>([]);
  const clearDemo = useCallback(() => {
    demoTimers.current.forEach((t) => clearTimeout(t));
    demoTimers.current = [];
  }, []);
  useEffect(() => clearDemo, [clearDemo]);
  // The latest template, for pushing field values: the srcdoc lags the prop by the
  // debounce, and onLoad/demo timers fire from older closures — the ref never lies.
  const templateRef = useRef(template);
  templateRef.current = template;
  const demoTextRef = useRef(demoText);
  demoTextRef.current = demoText;
  // Bumped every time a new srcdoc is actually committed — an onLoad's deferred play() checks
  // this before firing, so a stale timer from a document the debounce has since replaced can
  // never send a command to whatever the iframe went on to load next.
  const docGenRef = useRef(0);

  /** Post a command into the live document (no-op if the iframe hasn't loaded one yet). */
  const postCmd = useCallback((msg: PreviewCmd) => {
    postPreviewCmd(frameRef.current?.contentWindow, msg);
  }, []);

  /** The values a push sends: the template's samples, with the demo override on field 1. */
  const pushValues = (tpl: SpxTemplate) => {
    const values = Object.fromEntries(tpl.fields.map((f) => [f.field, f.value]));
    const demo = demoTextRef.current;
    if (demo != null && tpl.fields.length) values[tpl.fields[0].field] = demo;
    return values;
  };

  const { width, height } = template.resolution;

  // Track the stage size (the fit scale and the zoom framing both derive from it).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      setStage({ w: r.width, h: r.height });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Rebuild (debounced) when the template changes; auto-play the entrance on load.
  // Committing a new srcdoc also cancels any pending demo timers — a stop()/play()
  // scheduled against the previous document must never hit the reloading one (it
  // would blank the preview right after the user's change).
  const doc = useMemo(() => composeDocument(template, { liveControl: true }), [template]);
  useEffect(() => {
    const t = setTimeout(() => {
      clearDemo();
      docGenRef.current += 1;
      setSrcdoc(doc);
    }, 220);
    return () => clearTimeout(t);
  }, [doc, clearDemo]);

  // The document's own box, reported after any command that can move it (composeDocument's
  // liveControl channel) — never read via contentDocument, since this iframe carries no
  // allow-same-origin.
  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (ev.source !== frameRef.current?.contentWindow) return;
      const msg = ev.data;
      if (msg && typeof msg === 'object' && msg.type === PREVIEW_BOX_TYPE) {
        setBox({ x: msg.x, y: msg.y, w: msg.w, h: msg.h });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const playIn = useCallback(() => {
    clearDemo();
    postCmd({ cmd: 'play', data: JSON.stringify(pushValues(templateRef.current)) });
    if (demoOut) {
      // Show the exit too, then come back on air so the preview isn't left empty.
      demoTimers.current.push(
        window.setTimeout(() => postCmd({ cmd: 'stop' }), 1700),
        window.setTimeout(() => postCmd({ cmd: 'play' }), 2800),
      );
    }
  }, [clearDemo, demoOut, postCmd]);

  // Replay when the parent asks (e.g. animation preset changed but srcdoc identical).
  useEffect(() => {
    if (replayKey > 0) playIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayKey]);

  // Push the demo text live (no replay): the slider drives the emitted stretch runtime in
  // the running document — the user watches the REAL mechanism, not a wizard imitation.
  useEffect(() => {
    if (demoText == null) return;
    postCmd({ cmd: 'update', data: JSON.stringify(pushValues(templateRef.current)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- postCmd is stable; pushValues reads live refs
  }, [demoText]);

  // The view: whole canvas by default; zoomed reframes onto the graphic's box.
  const fitScale = Math.min(stage.w / width, stage.h / height) || 0.2;
  let z = fitScale;
  let tx = 0;
  let ty = 0;
  if (zoomed && box) {
    const M = 48; // canvas-px breathing room around the framed graphic
    const contain = Math.min(stage.w / (box.w + M), stage.h / (box.h + M));
    // A near-canvas-wide (ticker) or -tall (credits) graphic barely gains from a
    // contain fit — fill the other axis instead and crop: that IS the detail view.
    z = contain >= fitScale * 1.3 ? contain : Math.max(stage.w / (box.w + M), stage.h / (box.h + M));
    z = Math.min(Math.max(z, fitScale), 3);
    tx = width / 2 - (box.x + box.w / 2);
    ty = height / 2 - (box.y + box.h / 2);
  }

  return (
    <div className="wz-preview">
      {/* The stage is the PROJECT's own frame, not whatever space is left over: a 16:9 (or
          9:16, or 1:1) screen centred in the column, so what the reader judges has the shape
          it will air in. The aspect comes from the template because the format is the user's
          choice — CSS cannot know it (re-design/handoff.md §2). */}
      <div className="wz-stage" ref={stageRef} style={{ aspectRatio: `${width} / ${height}` }}>
        {/* A NEW IFRAME PER DOCUMENT, never a new `srcdoc` on the same one. Replacing an
            existing frame's srcdoc is a NAVIGATION, and a subframe navigation joins the page's
            session history — so every rebuild (every keystroke on the Fields step, every colour
            on Style) quietly added an entry, and the reader's Back button filled up with
            presses that did nothing. A frame that is INSERTED with its document already set
            loads it as its initial document instead, which costs no entry at all. That is what
            makes browser Back walk the wizard's steps rather than its rebuilds.
            Keyed on the same generation counter the commit bumps, and not rendered until there
            is a document to give it, so `srcdoc` is never assigned to a live frame. */}
        {srcdoc && <iframe
          key={docGenRef.current}
          ref={frameRef}
          title="Wizard live preview"
          sandbox="allow-scripts"
          srcDoc={srcdoc}
          onLoad={() => {
            const gen = docGenRef.current;
            setTimeout(() => {
              if (docGenRef.current === gen) playIn(); // else a newer document has since loaded
            }, 60);
          }}
          style={{ width, height, transform: `translate(-50%, -50%) scale(${z}) translate(${tx}px, ${ty}px)` }}
        />}
      </div>
      <div className="wz-preview-bar">
        <span className="muted">
          Project {width}×{height} · {template.fps} fps
        </span>
        <div className="row" style={{ gap: 6 }}>
          <button
            className={zoomed ? 'active' : ''}
            disabled={!box}
            onClick={() => { if (!zoomed) postCmd({ cmd: 'measure' }); setZoomed(!zoomed); }}
            title={zoomed ? 'Show the whole canvas again' : 'Zoom the preview to just the graphic'}
          >
            {zoomed ? '▭ Whole canvas' : '⌖ Zoom to graphic'}
          </button>
          <button onClick={playIn} title={demoOut ? 'Replay the animation (in, then out)' : 'Replay the entrance animation'}>▶ Replay</button>
          <button onClick={() => { clearDemo(); postCmd({ cmd: 'stop' }); }} title="Play the exit animation">■ Out</button>
        </div>
      </div>
    </div>
  );
}
