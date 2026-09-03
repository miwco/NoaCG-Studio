import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { composeDocument } from '../../preview/composeDocument';
import { postPreviewCmd, PREVIEW_BOX_TYPE, type PreviewCmd } from '../../preview/previewProtocol';
import {
  CANVAS_RECTS_TYPE,
  postCanvasCmd,
  type CanvasRect,
  type CanvasRectsMessage,
} from '../../preview/canvasControlProtocol';
import type { SpxTemplate } from '../../model/types';
import { hasMeasuredMotion, parseAnimData } from '../../blocks/animData';

/** Screen px of breathing room between a highlighted layer and its box. */
const HL_PAD = 4;

/** How long the demo holds the settled graphic before taking it off, and how long it stays off
 *  before coming back. Viewing rhythm rather than motion, so these stay fixed: the MOTION is
 *  what the speed knob has to change, and a hold that scaled with it would cancel that out. */
const DEMO_HOLD_MS = 900;
const DEMO_GAP_MS = 350;

/** When the lifecycle demo should stop and replay, from the template's own animation data.
 *  Falls back to the fixed pair this used to hard-code for a template whose region does not
 *  parse (a legacy or hand-rewritten one), which is the honest answer when the clock is
 *  unreadable. */
function demoCycle(js: string): { stopAt: number; replayAt: number } {
  const data = parseAnimData(js);
  const steps = data?.steps ?? [];
  if (!data || steps.length < 2) return { stopAt: 1700, replayAt: 2800 };
  const speed = data.speed || 1;
  const inMs = ((steps[0].duration || 0) / speed) * 1000;
  const outMs = ((steps[steps.length - 1].duration || 0) / speed) * 1000;
  const stopAt = Math.round(inMs + DEMO_HOLD_MS);
  return { stopAt, replayAt: Math.round(stopAt + outMs + DEMO_GAP_MS) };
}

interface Props {
  template: SpxTemplate;
  /** Bumping this replays the animation (used when the user changes the animation). */
  replayKey?: number;
  /** Demo the full lifecycle — in, hold, out, back in — after each (re)play. */
  demoOut?: boolean;
  /** Import graphic's Prepare step: override the FIRST field's pushed value, so the
   *  content-width slider drives the emitted stretch runtime live. Null = the samples. */
  demoText?: string | null;
  /**
   * The SVG mapping step's hover highlight (docs/SVG_IMPORT_PLAN.md §6a step 1): a CSS
   * selector inside the running document to outline, or null for none. The preview is that
   * step's ONE canvas — it is the only surface carrying the emitted fit runtime, so it is the
   * only one that can answer "what does this value actually look like" — and this is how a
   * checklist row still says which layer it means. Setting it installs composeDocument's
   * `canvasControl` channel, which pushes the tracked rect every frame; nothing reaches into
   * the iframe (it carries no allow-same-origin, like every other preview surface).
   */
  highlightSelector?: string | null;
  /**
   * ADD A FIELD BY DRAWING ONE (docs/SVG_IMPORT_PLAN.md §6a step 3). A selector inside the
   * running document: the space a drawn box is reported IN, as fractions of that element's own
   * rect, so this component never learns what a design px is.
   *
   * It is passed for the whole step, not only while the marquee is armed, because the rect
   * arrives on the document's next FRAME — arming it at the moment of the gesture would leave
   * the first drag after the button with nothing to measure against, and a field the reader
   * drew would silently not appear.
   */
  drawIn?: string | null;
  /** Arm the marquee. `drawIn` says where a box lands; this says the reader is drawing one. */
  drawing?: boolean;
  /** The drawn box, as fractions (0..1) of `drawIn`'s rect. */
  onDraw?: (box: { x: number; y: number; w: number; h: number }) => void;
  /**
   * THE CANVAS AS A CONTROL SURFACE (docs/SVG_IMPORT_PLAN.md §6a step 5): the selectors the
   * reader may point at. Tracked like everything else, and hit-tested HERE rather than in the
   * document - the iframe carries no allow-same-origin, so nothing can reach in and ask what is
   * under a pointer. It does not need to: the rect channel already pushes every tracked
   * selector's box each frame, and the candidate list is the app's own
   * (`preview/canvasControlProtocol.ts` states this as its core design move).
   */
  pickable?: string[];
  /** The layer under the pointer, or null. Lets the checklist point back at the canvas. */
  onPickHover?: (selector: string | null) => void;
  /**
   * A layer the reader picked. `drag` is the dominant direction of a click-DRAG on it, or null
   * for a plain click - which is how "drag its direction" says which way a panel grows without
   * a second control to find.
   */
  onPick?: (selector: string, drag: 'x' | 'y' | null) => void;
  /**
   * This step is ABOUT the motion (the Animation step), so the entrance is played from zero
   * on every rebuild even when that means watching a credit roll travel for eighteen seconds -
   * which is exactly what the reader asked to see there.
   *
   * Off it, a graphic whose motion is MEASURED settles instead (blocks/animData.ts
   * `hasMeasuredMotion`). Measured motion is content-length motion and starts with its content
   * off-stage, so playing it on the Fields or Style step answers "what does this design look
   * like" with an empty box for the first second and a half - measured on cr01, which is not
   * recognisably a credit roll until about twelve. ▶ Replay still plays it on any step.
   */
  rehearse?: boolean;
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
export default function WizardPreview({
  template,
  replayKey = 0,
  demoOut = false,
  demoText = null,
  highlightSelector,
  drawIn,
  drawing = false,
  onDraw,
  pickable,
  onPickHover,
  onPick,
  rehearse = false,
}: Props) {
  // A surface that never asks for a highlight pays nothing: the rect channel is installed only
  // for one that does (the prop present at all, even as null, is the step saying so).
  const tracking = highlightSelector !== undefined || drawIn !== undefined || pickable !== undefined;
  // The pickable set as a stable KEY: the prop is a fresh array on every render of the step
  // above, and depending on the array itself would re-post the `track` command each time.
  const pickKey = (pickable ?? []).join('|');
  const picking = pickKey.length > 0;
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

  // ── THE LIFECYCLE DEMO'S CLOCK (measured 2026-08-26; GOALS goal 6) ─────────────────────────
  // The owner reported that Speed and Easing did nothing on a FADE. Both reach the render: the
  // emitted NOACG_ANIM carries speed 0.6/1/1.8, the built entrance measures 1.333/0.800/0.444s,
  // and the four curves offered on a fade produce four measurably different opacity ramps. What
  // hid them was THIS loop, whose stop and replay were 1700ms and 2800ms whatever the graphic
  // did - so every speed played inside one fixed 2.8s beat, and the faster the setting the
  // LONGER the graphic then sat still (367ms of hold at Slower, 1256ms at Faster: the cadence
  // moved the wrong way). A slide survived it because travel gives a second cue - a distance
  // covered in a time - which is exactly the cue a fade does not have.
  //
  // So the beat follows the animation: entrance, a moment to read it, exit, a moment of black.
  // A ±80% speed step then changes the loop's own rhythm by well over a second, which is what
  // makes it visible across separate replays. Read off the template's own data, so a preset or
  // a speed the wizard has not been told about still gets an honest cycle.
  const demoCycleRef = useRef({ stopAt: 1700, replayAt: 2800 });
  demoCycleRef.current = useMemo(() => demoCycle(template.js), [template.js]);

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

  // Every tracked selector's box in the document's own px, keyed by the selector that asked
  // for it (see the highlight block below). Two things want one: the hover highlight, and the
  // draw marquee, which needs the ARTWORK's box to report a drag relative to it.
  const [rects, setRects] = useState<Record<string, CanvasRect | null>>({});
  // The layer under the pointer while picking (plan §6a step 5), and the grab a drag started
  // from. Declared here with the other rect state because the highlight below reads them.
  const [pickHover, setPickHover] = useState<string | null>(null);
  const pickFrom = useRef<{ x: number; y: number; sel: string } | null>(null);
  // What the highlight box is drawn around. A layer under the POINTER wins over one a checklist
  // row is pointing at: the reader's hand is the more recent statement of what they mean.
  const hoverRect = pickHover ? rects[pickHover] ?? null : highlightSelector ? rects[highlightSelector] ?? null : null;
  const drawRect = drawIn ? rects[drawIn] ?? null : null;
  // The marquee being dragged, in canvas px; null when no drag is in flight.
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  // A finished drag the ARTWORK HAS NOT BEEN MEASURED FOR YET (see onDrawUp). Held in canvas
  // px, exactly as the marquee was, until a rect turns up to report it against.
  const [heldBox, setHeldBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const dragFrom = useRef<{ x: number; y: number } | null>(null);
  // Whichever pointer layer is mounted - draw or pick, never both. Pointer positions become
  // canvas px against ITS box, so the two share one ref rather than one each.
  const canvasLayerRef = useRef<HTMLDivElement>(null);

  // Rebuild (debounced) when the template changes; auto-play the entrance on load.
  // Committing a new srcdoc also cancels any pending demo timers — a stop()/play()
  // scheduled against the previous document must never hit the reloading one (it
  // would blank the preview right after the user's change).
  const doc = useMemo(
    () => composeDocument(template, { liveControl: true, ...(tracking ? { canvasControl: true } : {}) }),
    [template, tracking],
  );
  // Whether this graphic's motion is measured rather than keyframed - read off the emitted
  // animation data, so it is known before the document exists (see `showFirstFrame`). A
  // template with no readable region (blank, hand-written, foreign import) has no measured
  // motion to find and plays, exactly as it always did.
  const measured = useMemo(() => {
    const data = parseAnimData(template.js);
    return !!data && hasMeasuredMotion(data);
  }, [template.js]);
  useEffect(() => {
    // A rebuild is OWED from this moment, set before the debounce even starts - the half of the
    // stamp that separates "has not started yet" from "already finished" (see the onLoad below).
    if (stageRef.current) stageRef.current.dataset.docPending = '1';
    const t = setTimeout(() => {
      clearDemo();
      docGenRef.current += 1;
      // The old document's last rects describe a layout that no longer exists — drop them
      // rather than leaving a box hanging over the new one until its first frame arrives.
      setRects({});
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

  // ── The tracked highlight (preview/canvasControlProtocol.ts) ──
  // One selector, one rect, pushed every frame by the document — so the box follows the layer
  // through the entrance animation and through a fit that has just re-wrapped it, neither of
  // which a one-shot measurement could see. The rect arrives in the document's own px, which
  // IS canvas px (the iframe is the project's resolution and the stage scales it), so the
  // overlay wears the frame's transform and needs no maths of its own.
  useEffect(() => {
    if (!tracking) return;
    const onRects = (ev: MessageEvent) => {
      if (ev.source !== frameRef.current?.contentWindow) return;
      const msg = ev.data as CanvasRectsMessage | undefined;
      if (!msg || msg.type !== CANVAS_RECTS_TYPE) return;
      setRects(msg.rects);
    };
    window.addEventListener('message', onRects);
    return () => window.removeEventListener('message', onRects);
  }, [tracking]);

  // Re-sent on every selector change AND on every new document (the `track` list lives in the
  // document, so a rebuilt one starts with nothing tracked until it is told again).
  const trackSelector = useCallback(() => {
    if (!tracking) return;
    const selectors = [...new Set([highlightSelector, drawIn, ...pickKey.split('|')])].filter(
      (s): s is string => !!s,
    );
    postCanvasCmd(frameRef.current?.contentWindow, { cmd: 'track', selectors });
    if (selectors.length === 0) setRects({});
    // The pickable set is depended on as a KEY, not as the array: a fresh array identity every
    // render would re-post `track` on every render of the step above.
  }, [tracking, highlightSelector, drawIn, pickKey]);
  useEffect(trackSelector, [trackSelector]);

  const playIn = useCallback(() => {
    clearDemo();
    postCmd({ cmd: 'play', data: JSON.stringify(pushValues(templateRef.current)) });
    if (demoOut) {
      // Show the exit too, then come back on air so the preview isn't left empty. The two
      // moments follow the graphic's OWN clock (demoCycleRef), never a fixed pair of numbers.
      const { stopAt, replayAt } = demoCycleRef.current;
      demoTimers.current.push(
        window.setTimeout(() => postCmd({ cmd: 'stop' }), stopAt),
        window.setTimeout(() => postCmd({ cmd: 'play' }), replayAt),
      );
    }
  }, [clearDemo, demoOut, postCmd]);

  /**
   * The first frame after a rebuild: the graphic as it looks ON AIR.
   *
   * Usually that means playing the entrance, because an entrance is under a second and seeing
   * it is half of what the reader is judging. MEASURED motion is the exception, and it is a
   * different kind of thing: its length comes from the operator's text and it starts with that
   * text off-stage, so playing it from zero answers a question about the design with an empty
   * frame. Those settle instead - the parked pose the thumbnails and the operator preview
   * already use (preview/settleGraphic.ts, which carries the other half of this note).
   *
   * ▶ Replay and the Animation step (`rehearse`) always play: both are the reader asking for
   * the motion rather than for the picture.
   */
  const showFirstFrame = useCallback(() => {
    if (rehearse || !measured) { playIn(); return; }
    clearDemo();
    postCmd({ cmd: 'settle', data: JSON.stringify(pushValues(templateRef.current)) });
  }, [rehearse, measured, playIn, clearDemo, postCmd]);

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

  // ── The draw marquee (plan §6a step 3) ──
  // The layer is laid out in CANVAS px and painted through the frame's own transform, so a
  // pointer position becomes canvas px by the ratio between the two — no zoom maths of its
  // own, the same trick the highlight overlay uses.
  const pointToCanvas = (ev: React.PointerEvent): { x: number; y: number } | null => {
    const el = canvasLayerRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0) || !(r.height > 0)) return null;
    return { x: ((ev.clientX - r.left) * width) / r.width, y: ((ev.clientY - r.top) * height) / r.height };
  };

  // ── The pick hit-test (plan §6a step 5) ──
  // WHICH LAYER IS UNDER THIS POINT, answered from the pushed rect map. A rect carries no paint
  // order, so the tie-break is the editor canvas's own: innermost first (greatest ancestor
  // depth), then the smallest box - a word inside a panel wins over the panel it sits on, which
  // is what someone pointing at it means.
  const pickAt = (p: { x: number; y: number }): string | null => {
    let best: { sel: string; depth: number; area: number } | null = null;
    for (const sel of pickKey ? pickKey.split('|') : []) {
      const r = rects[sel];
      if (!r || !(r.width > 0) || !(r.height > 0)) continue;
      if (p.x < r.left || p.x > r.left + r.width || p.y < r.top || p.y > r.top + r.height) continue;
      const area = r.width * r.height;
      if (!best || r.depth > best.depth || (r.depth === best.depth && area < best.area)) {
        best = { sel, depth: r.depth, area };
      }
    }
    return best?.sel ?? null;
  };

  const onPickDown = (ev: React.PointerEvent) => {
    const p = pointToCanvas(ev);
    const sel = p && pickAt(p);
    if (!p || !sel) return;
    ev.currentTarget.setPointerCapture(ev.pointerId);
    pickFrom.current = { ...p, sel };
  };

  const onPickMove = (ev: React.PointerEvent) => {
    const p = pointToCanvas(ev);
    if (!p) return;
    // While a drag is in flight the highlight stays on what was grabbed, so the box does not
    // flicker between layers the pointer crosses on its way.
    const sel = pickFrom.current ? pickFrom.current.sel : pickAt(p);
    if (sel !== pickHover) {
      setPickHover(sel);
      onPickHover?.(sel);
    }
  };

  const onPickUp = (ev: React.PointerEvent) => {
    const from = pickFrom.current;
    pickFrom.current = null;
    if (!from || !onPick) return;
    const p = pointToCanvas(ev);
    // A DRAG says a direction, a click says none. The threshold is in canvas px, so it means the
    // same thing at every zoom - and the dominant axis wins, because a drag meant as "rightwards"
    // is never perfectly horizontal.
    const dx = p ? p.x - from.x : 0;
    const dy = p ? p.y - from.y : 0;
    const DRAG_MIN = 24;
    const drag =
      Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_MIN ? null : Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    onPick(from.sel, drag);
  };

  const onPickLeave = () => {
    if (pickFrom.current) return;
    setPickHover(null);
    onPickHover?.(null);
  };

  const onDrawDown = (ev: React.PointerEvent) => {
    const p = pointToCanvas(ev);
    if (!p) return;
    ev.currentTarget.setPointerCapture(ev.pointerId);
    dragFrom.current = p;
    setMarquee({ x: p.x, y: p.y, w: 0, h: 0 });
  };

  const onDrawMove = (ev: React.PointerEvent) => {
    const from = dragFrom.current;
    const p = from && pointToCanvas(ev);
    if (!from || !p) return;
    setMarquee({
      x: Math.min(from.x, p.x),
      y: Math.min(from.y, p.y),
      w: Math.abs(p.x - from.x),
      h: Math.abs(p.y - from.y),
    });
  };

  // Reported RELATIVE TO THE ARTWORK, as fractions of its box: the step knows what a design
  // px is and this component deliberately does not. Clamped to the artwork because a placed
  // field is positioned inside the design unit — a box half outside it would be authored at
  // a coordinate the emitted rule cannot express.
  const reportDrawnBox = useCallback(
    (box: { x: number; y: number; w: number; h: number }, rect: CanvasRect) => {
      const clamp = (v: number) => Math.min(1, Math.max(0, v));
      const x0 = clamp((box.x - rect.left) / rect.width);
      const y0 = clamp((box.y - rect.top) / rect.height);
      const x1 = clamp((box.x + box.w - rect.left) / rect.width);
      const y1 = clamp((box.y + box.h - rect.top) / rect.height);
      onDraw?.({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    },
    [onDraw],
  );

  // A DROP IS NEVER THROWN AWAY, even when there is nothing yet to measure it against. The
  // artwork's rect arrives from INSIDE the document — a `track` post, then a frame, then a
  // message back — and every rebuild clears the whole map outright, so a reader who arms the
  // tool and drags straight away can finish the gesture in a window where `drawRect` is null.
  // This used to `return` here: the marquee vanished, no field appeared, and nothing anywhere
  // said why. It is also what red-mained CI on 2026-08-24 (issue #40) and then cleared its own
  // alarm without a fix - unreproducible in 20 local runs, and exact on the first run with the
  // rect delivery delayed by 4s. Holding the box costs a frame or two and cannot lose it.
  const onDrawUp = () => {
    const box = marquee;
    dragFrom.current = null;
    setMarquee(null);
    if (!box || !onDraw) return;
    if (drawRect && drawRect.width > 0 && drawRect.height > 0) reportDrawnBox(box, drawRect);
    else setHeldBox(box);
  };

  // The held drop, placed the moment the artwork reports a box. The rect describes the artwork,
  // which does not move while the step is open, so a box measured a frame late lands where it
  // was drawn rather than where the artwork drifted to.
  useEffect(() => {
    if (!heldBox || !drawRect || !onDraw) return;
    if (!(drawRect.width > 0) || !(drawRect.height > 0)) return;
    setHeldBox(null);
    reportDrawnBox(heldBox, drawRect);
  }, [heldBox, drawRect, onDraw, reportDrawnBox]);

  // Disarming — cancelling, or leaving the step — drops anything still held. A field appearing
  // in a graphic nobody is mapping any more is worse than the gesture that was lost.
  useEffect(() => {
    if (!drawing) setHeldBox(null);
  }, [drawing]);

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
            // THE REVISION LANDS ON THE STAGE, not on the frame: a rebuild REPLACES the frame
            // (see the note above), so a stamp on the frame is gone exactly when a waiter needs
            // to read the old one. Same contract as PreviewFrame's - `data-doc-rev` says a
            // rebuild finished, `data-doc-pending` says one is owed, and only the two together
            // can tell "not started" from "already done" (e2e/_preview.ts).
            if (stageRef.current) {
              stageRef.current.dataset.docRev = String(gen);
              delete stageRef.current.dataset.docPending;
            }
            trackSelector(); // a fresh document tracks nothing until it is told again
            setTimeout(() => {
              if (docGenRef.current === gen) showFirstFrame(); // else a newer document has since loaded
            }, 60);
          }}
          style={{ width, height, transform: `translate(-50%, -50%) scale(${z}) translate(${tx}px, ${ty}px)` }}
        />}
        {/* The highlight rides a layer wearing the FRAME's own transform, so a rect in canvas
            px lands where the reader sees that layer at any zoom. The border and the breathing
            room around the layer are the two things corrected back OUT of that scale, because
            they are drawn for the reader rather than for the artwork: at the default fit a 2px
            rule would paint half a pixel and a 4px gap would close to one. */}
        {(hoverRect || drawing || picking) && (
          <div
            className="wz-stage-overlay"
            style={{ width, height, transform: `translate(-50%, -50%) scale(${z}) translate(${tx}px, ${ty}px)` }}
          >
            {hoverRect && (
              <div
                className="wz-stage-highlight"
                data-testid="wz-preview-highlight"
                style={{
                  left: hoverRect.left - HL_PAD / z,
                  top: hoverRect.top - HL_PAD / z,
                  width: hoverRect.width + (2 * HL_PAD) / z,
                  height: hoverRect.height + (2 * HL_PAD) / z,
                  borderWidth: Math.max(1, 2 / z),
                }}
              />
            )}
            {/* THE PICK SURFACE. Drawing wins when both are armed: a reader who just asked to
                draw a box means the drag to make one, not to pick what is under it. */}
            {picking && !drawing && (
              <div
                ref={canvasLayerRef}
                className="wz-stage-pick"
                data-testid="wz-preview-pick"
                onPointerDown={onPickDown}
                onPointerMove={onPickMove}
                onPointerUp={onPickUp}
                onPointerCancel={onPickLeave}
                onPointerLeave={onPickLeave}
              />
            )}
            {/* The draw surface takes pointer events back (the overlay above it has none), so
                the marquee is drawn on the one canvas that is showing the real graphic. */}
            {drawing && (
              <div
                ref={canvasLayerRef}
                className="wz-stage-draw"
                data-testid="wz-preview-draw"
                // Whether the artwork has reported a box yet. A drop before it has is HELD
                // rather than lost (onDrawUp), and this is how that window is observable —
                // from a spec, and to anyone reading the DOM to work out why a drag paused.
                data-measured={drawRect && drawRect.width > 0 && drawRect.height > 0 ? 'true' : 'false'}
                onPointerDown={onDrawDown}
                onPointerMove={onDrawMove}
                onPointerUp={onDrawUp}
                onPointerCancel={onDrawUp}
              >
                {marquee && (
                  <div
                    className="wz-stage-marquee"
                    data-testid="wz-preview-marquee"
                    style={{
                      left: marquee.x,
                      top: marquee.y,
                      width: marquee.w,
                      height: marquee.h,
                      borderWidth: Math.max(1, 2 / z),
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}
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
