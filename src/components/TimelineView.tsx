import { useEffect, useRef, useState, useMemo, type RefObject } from 'react';
import { useTemplateStore } from '../store/templateStore';
import {
  buildOverview,
  insertPartTween,
  parseTimeline,
  patchStepEase,
  patchStepRegroup,
  patchStepTiming,
  patchTweenEase,
  patchTweenTiming,
  patchTweenVars,
  splitTween,
  TRANSFORM_IDENTITY,
  TRANSFORM_PROPS,
  type OverviewSection,
  type TimelineTween,
  type TransformProp,
} from '../blocks/timelineModel';
import { readAnimationInfo, setStepsMode, withStepsSetting } from '../blocks/animPatch';
import { changePartPress } from '../blocks/stepAssign';
import { countLines, detectPrefix, getTemplateParts } from '../model/structure';
import { EASINGS } from '../model/easings';
import { loadPrefs, savePrefs } from '../model/prefs';
import { useIsMobile } from './useIsMobile';
import type { SpxWindow } from './PlayoutSimulator';

interface Props {
  iframeRef: RefObject<HTMLIFrameElement>;
}

/** One playout segment on the strip: the entrance, a Continue step, or the exit. */
interface Segment {
  id: string; // 'in' | 'step-N' | 'out'
  marker: string; // the playout cue glyph: ▶ » ■
  label: string;
  duration: number;
  infinite: boolean;
  kind: 'in' | 'out' | 'step';
  stepIndex?: number;
}

/** A bar drag in progress: move = slide the start, resize = stretch the end,
 *  resize-start = move the start with the end pinned. Identified down to the MEMBER of a
 *  multi-target tween — releasing a member drag splits the tween so only that layer moves. */
interface BarDrag {
  sectionId: string;
  tweenIndex: number;
  /** Index within the tween's target list; the split-on-release target. */
  member: number;
  /** True when the tween has several targets — release splits it first. */
  multiTarget: boolean;
  /** The dragged bar's part selector (cross-section drops move WHEN it appears). */
  selector: string;
  /** Whether this part may move onto a » press at all (registry-eligible). */
  assignable: boolean;
  mode: 'move' | 'resize' | 'resize-start';
  startClientX: number;
  pxPerSec: number;
  origStart: number;
  origDuration: number;
  /** Live values while dragging (committed to code on release). */
  start: number;
  duration: number;
  /** Cross-section drop target while dragging: a » press index, steps.length = a new
   *  press, null = none (plain retime). */
  dropStep: number | null;
  x: number;
  y: number;
}

const SNAP = 0.05; // timing grid — keeps the emitted literals readable (two decimals)

// T4.2 — overview geometry. The hold is a fixed-width break (it waits for a cue, so it has
// no clock to scale); real sections scale by duration × zoom.
const HOLD_PX = 64;
const SEC_MIN_PX = 72;
const ROW_H = 20;
const OV_HEAD_H = 22;
const DRAWER_H = 26; // the expanded layer's "enters from" sub-row

/** T3.3 — a line being dragged toward another » segment (regroup). */
interface RegroupDrag {
  target: string;
  fromStep: number;
  x: number;
  y: number;
  /** The » tab currently under the pointer (its step index; steps.length = the »+ target). */
  overStep: number | null;
}

/** What a bar DOES, in plain words — derived from the tween's animated props. Ordered by
 *  visual dominance; the two strongest verbs are shown inside the bar (e.g. "slide + fade"). */
const PROP_VERBS: [RegExp, string][] = [
  [/^clipPath$/, 'wipe'],
  [/^filter$/, 'blur'],
  [/^scaleX$/, 'draw'],
  [/^scale[YZ]?$/, 'pop'],
  [/^skew/, 'skew'],
  [/^(x|y|xPercent|yPercent)$/, 'slide'],
  [/^opacity$/, 'fade'],
];

function actionLabel(tween: Pick<TimelineTween, 'kind' | 'props'>): string {
  if (tween.kind === 'set') return '';
  const verbs: string[] = [];
  for (const [re, verb] of PROP_VERBS) {
    if (tween.props.some((p) => re.test(p)) && !verbs.includes(verb)) verbs.push(verb);
  }
  return verbs.slice(0, 2).join(' + ');
}

/** A GSAP ease string in plain words: the vocabulary name when the curve is one of ours
 *  ('expo.out' → 'Expo'), else the title-cased family ('power3.in' → 'Power3'). The raw
 *  string stays available in tooltips. */
function easeName(gsap: string, direction: 'in' | 'out'): string {
  const known = EASINGS.find((e) => (direction === 'in' ? e.gsapIn : e.gsapOut) === gsap);
  if (known) return known.name;
  if (gsap === 'none') return 'Linear';
  const family = gsap.split('.')[0];
  return family.charAt(0).toUpperCase() + family.slice(1);
}

/** The per-tween ease options for a phase: the vocabulary's phase-correct half, deduped by
 *  the actual GSAP string (several presets share a curve), plus 'auto' (inherit the knob). */
function easeOptionsFor(direction: 'in' | 'out'): { value: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const e of EASINGS) {
    const value = direction === 'in' ? e.gsapIn : e.gsapOut;
    if (!seen.has(value)) seen.set(value, e.tag === 'standard' ? e.name : `${e.name} ·${e.tag}`);
  }
  return [...seen.entries()].map(([value, label]) => ({ value, label }));
}

/**
 * The preview timeline strip (Era 6 — docs/TIMELINE_PLAN.md): the graphic as a playout
 * segment chain `▶ In · » 2 · » 3 · … · ■ Out`, exactly what the operator's buttons do.
 * Parsed from the marked ANIMATION region (parse-by-construction); a live playhead follows
 * the simulator's running timeline through Play, every Continue, and Stop; scrubbing pauses
 * the preview; bars drag/stretch and eases pick — each edit is ONE readable literal patch in
 * the region (undoable). A hand-edited region the parser can't read makes the strip step
 * aside — the code is the truth.
 */
export default function TimelineView({ iframeRef }: Props) {
  const template = useTemplateStore((s) => s.template);
  const sendScrub = useTemplateStore((s) => s.sendScrub);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const requestReplay = useTemplateStore((s) => s.requestReplay);
  // Shared selection (Era 6): the canvas and this strip highlight the SAME element.
  const selectedPart = useTemplateStore((s) => s.selectedPart);
  const setSelectedPart = useTemplateStore((s) => s.setSelectedPart);

  const model = useMemo(() => parseTimeline(template.js), [template.js]);
  // The category's class prefix + visible line count — for friendly labels and the »+ button.
  const prefix = useMemo(() => detectPrefix(template.html), [template.html]);
  const lineCount = useMemo(() => countLines(template.html), [template.html]);
  // The shared element-identity registry — the single home for part naming (labels here,
  // in the canvas selection layer, and in step assignment must always agree).
  const parts = useMemo(() => getTemplateParts(template.html, template.fields), [template.html, template.fields]);
  const stepsOn = template.js.includes('function revealNextStep');
  const [phaseId, setPhaseId] = useState<string>('in');
  const [time, setTime] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const scrubbingRef = useRef(false);
  scrubbingRef.current = scrubbing;
  // T2 bar-drag state — declared with the other hooks (BEFORE the model-null early return,
  // or templates without a parsable region would change the hook count and crash React).
  const [barDrag, setBarDrag] = useState<BarDrag | null>(null);
  const barDragRef = useRef<BarDrag | null>(null);
  barDragRef.current = barDrag;
  // T3.3 regroup-drag state (same hook-placement rule).
  const [regroup, setRegroup] = useState<RegroupDrag | null>(null);
  const regroupRef = useRef<RegroupDrag | null>(null);
  regroupRef.current = regroup;
  // T5 — which part row has its "enters from" drawer open (one at a time keeps it calm).
  const [expandedPart, setExpandedPart] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Announce the moment steps turn ON (via »+, the Motion checkbox, or undo/redo) — ▶ Play
  // behaves differently from that moment on, and silent behavior changes tested badly.
  const [stepsNotice, setStepsNotice] = useState(false);
  const prevStepsOn = useRef(stepsOn);
  useEffect(() => {
    const was = prevStepsOn.current;
    prevStepsOn.current = stepsOn;
    if (stepsOn && !was) {
      setStepsNotice(true);
      const t = setTimeout(() => setStepsNotice(false), 8000);
      return () => clearTimeout(t);
    }
    if (!stepsOn) setStepsNotice(false);
  }, [stepsOn]);

  // T4.2 — the overview's zoom: pixels per second on every section's LOCAL clock. Fitted
  // to the visible width once per template; the +/- buttons take over from there.
  const [pxPerSec, setPxPerSec] = useState(140);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fittedRef = useRef<string | null>(null);

  // Collapsed state: explicit preference wins; otherwise expanded on desktop, collapsed on phones.
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState<boolean>(() => loadPrefs().timelineCollapsed ?? isMobile);
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      savePrefs({ timelineCollapsed: !c });
      return !c;
    });
  };

  // Fit the whole playout into the visible strip, once per TEMPLATE (a create/import gets
  // a fresh fit; timing tweaks and the zoom buttons don't refit under the user). An
  // unmeasured layout (clientWidth ~0) does not lock the fit — the next change retries.
  useEffect(() => {
    if (!model || collapsed || fittedRef.current === template.name) return;
    const el = scrollRef.current;
    if (!el || el.clientWidth < 120) return;
    const durations = [
      model.phases[0]?.duration ?? 0,
      ...model.steps.map((s) => s.duration + s.stagger * Math.max(0, s.targets.length - 1)),
      model.phases[model.phases.length - 1]?.duration ?? 0,
    ];
    // Two passes: sections pinned at SEC_MIN_PX don't scale, so give the remaining width
    // to the sections that do (a single refinement is enough for a fit).
    const available = el.clientWidth - HOLD_PX - 16;
    const px0 = available / Math.max(0.5, durations.reduce((a, b) => a + b, 0));
    const pinned = durations.filter((d) => d * px0 < SEC_MIN_PX);
    const scaling = durations.filter((d) => d * px0 >= SEC_MIN_PX);
    const px1 =
      scaling.length > 0
        ? (available - pinned.length * SEC_MIN_PX) / Math.max(0.5, scaling.reduce((a, b) => a + b, 0))
        : px0;
    fittedRef.current = template.name;
    setPxPerSec(Math.min(400, Math.max(40, px1)));
  }, [model, collapsed, template.name]);

  // The live playhead: follow the simulator's running timeline (window.__activeTl) through
  // In, every Continue step, and Out. Parks at the END of In when idle — the settled state.
  const phaseRef = useRef(phaseId);
  phaseRef.current = phaseId;
  const lastActiveRef = useRef<unknown>(null);
  useEffect(() => {
    if (!model) return;
    let raf = 0;
    const inDur = model.phases.find((p) => p.id === 'in')?.duration ?? 0;
    const knownIds = new Set(['in', 'out', ...model.steps.map((_, k) => `step-${k + 2}`)]);
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const w = iframeRef.current?.contentWindow as SpxWindow | null;
      const active = w?.__activeTl;
      // A NEW simulator run (Play/Next/Stop) reclaims the playhead from a paused scrub.
      if (active && active !== lastActiveRef.current) {
        lastActiveRef.current = active;
        if (scrubbingRef.current) setScrubbing(false);
      }
      if (!active) lastActiveRef.current = null;
      if (scrubbingRef.current) return; // the user's scrub owns the playhead
      if (active) {
        if (active.phase !== phaseRef.current && knownIds.has(active.phase)) setPhaseId(active.phase);
        const dur = Math.max(active.tl.duration(), 0.001);
        setTime(active.tl.time() % (dur + 0.0001)); // loops (repeat:-1) wrap visually
      } else if (phaseRef.current === 'in') {
        setTime(inDur); // idle = settled at the end of the entrance
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [model, iframeRef]);

  if (!model) {
    // Blank/imported templates (no managed region) get no strip at all. A marked region the
    // parser can't read gets an honest one-liner instead of silently vanishing.
    if (!readAnimationInfo(template.js).hasRegion) return null;
    return (
      <div className="timeline-strip collapsed" data-testid="timeline">
        <div className="timeline-head">
          <p className="timeline-hint" data-testid="timeline-unreadable">
            This animation is hand-crafted beyond what the timeline can chart — the JS code is
            in charge. Applying a Motion preset brings the timeline back.
          </p>
        </div>
      </div>
    );
  }

  const inPhase = model.phases.find((p) => p.id === 'in') ?? model.phases[0];
  const outPhase = model.phases.find((p) => p.id === 'out') ?? model.phases[model.phases.length - 1];
  // The playout segment chain — what each operator button plays. Step cards are numbered
  // by PRESS (the 1st » Next is "» 1") — the one numbering scheme every control shares.
  const segments: Segment[] = [
    { id: 'in', marker: '▶', label: 'In', duration: inPhase.duration, infinite: inPhase.infinite, kind: 'in' },
    ...model.steps.map((s, k) => ({
      id: `step-${k + 2}`,
      marker: '»',
      label: String(k + 1),
      duration: s.duration + s.stagger * Math.max(0, s.targets.length - 1),
      infinite: false,
      kind: 'step' as const,
      stepIndex: k,
    })),
    { id: 'out', marker: '■', label: 'Out', duration: outPhase.duration, infinite: outPhase.infinite, kind: 'out' },
  ];
  const seg = segments.find((s) => s.id === phaseId) ?? segments[0];
  // The ● On air pseudo-card between the steps and Out: the settled hold every graphic has.
  // It isn't a timeline (nothing animates) — selecting it shows the settled on-air look.
  const holdSelected = phaseId === 'hold';
  const total = Math.max(seg.duration, 0.001);
  const shown = Math.min(time, total);
  const frac = shown / total;
  // How the layer leaves air (the SPX `out` setting) — playout truth on the On air card.
  const outMode = template.settings.out ?? 'manual';
  const outBadge = outMode === 'none' ? 'no out' : /^\d+$/.test(outMode) ? `auto ${outMode}ms` : null;
  const holdSub =
    outMode === 'none' ? 'stays — no out' : /^\d+$/.test(outMode) ? `auto-out ${Number(outMode) / 1000}s` : 'until ■ Stop';
  /** The moment's cue, written under each card — the operator button that plays it (the
   *  step card's main line already carries its press number). */
  const segSub = (s: Segment): string =>
    s.kind === 'in' ? 'on ▶ Play' : s.kind === 'out' ? 'on ■ Stop' : 'press of » Next';

  const pickHold = () => {
    setPhaseId('hold');
    setScrubbing(true); // park until the next Play/Next/Stop reclaims the strip
    setTime(inPhase.duration);
    sendScrub('in', inPhase.duration); // the settled end of the entrance IS the on-air look
  };

  // ── T2/T3.2: draggable timing bars ─────────────────────────────────────────
  const snap = (n: number) => Math.round(n / SNAP) * SNAP;

  const startBarDrag = (
    e: React.PointerEvent,
    bar: { sectionId: string; tweenIndex: number; member: number; multiTarget: boolean; selector: string },
    mode: BarDrag['mode'],
    orig: { start: number; duration: number },
  ) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setBarDrag({
      ...bar,
      assignable: stepsOn && eligibleParts.some((p) => p.selector === bar.selector),
      mode,
      startClientX: e.clientX,
      pxPerSec,
      origStart: orig.start,
      origDuration: orig.duration,
      start: orig.start,
      duration: orig.duration,
      dropStep: null,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const moveBarDrag = (e: React.PointerEvent) => {
    const d = barDragRef.current;
    if (!d) return;
    const dxSec = (e.clientX - d.startClientX) / d.pxPerSec;
    // Dragging an ENTRANCE bar over a » press means "reveal this layer there instead" —
    // the timing preview freezes and the drop takes over (never a stretched phase).
    const raw = d.assignable && d.sectionId === 'in' && d.mode === 'move' ? dropTargetAt(e.clientX, e.clientY) : null;
    const dropStep = raw !== null && raw >= 0 ? raw : null;
    const next: BarDrag = { ...d, dropStep, x: e.clientX, y: e.clientY };
    if (dropStep === null) {
      if (d.mode === 'move') next.start = Math.max(0, snap(d.origStart + dxSec));
      else if (d.mode === 'resize') next.duration = Math.max(SNAP, snap(d.origDuration + dxSec));
      else {
        // resize-start: the END stays pinned; the start moves and the duration compensates.
        const end = d.origStart + d.origDuration;
        const start = Math.min(Math.max(0, snap(d.origStart + dxSec)), end - SNAP);
        next.start = start;
        next.duration = end - start;
      }
    }
    setBarDrag(next);
  };

  /** Release: ONE undoable patch — a cross-section drop moves WHEN the layer appears; a
   *  member of a joint tween splits first so only that layer retimes; a plain drag
   *  rewrites the timing literals; and a click (nothing changed) selects the element. */
  const endBarDrag = () => {
    const d = barDragRef.current;
    setBarDrag(null);
    if (!d) return;
    if (d.dropStep !== null) {
      const change = changePartPress(template, parts, model, d.selector, -1, d.dropStep);
      if (!change) return;
      applyTemplate({ ...template, ...change.patch });
      requestReplay();
      if (change.destStep !== null) setPhaseId(`step-${change.destStep + 2}`);
      return;
    }
    if (d.start === d.origStart && d.duration === d.origDuration) {
      setSelectedPart(d.selector); // a plain click — select the element (canvas too)
      return;
    }
    const timing = {
      start: d.mode !== 'resize' ? d.start : undefined,
      duration: d.mode !== 'move' ? d.duration : undefined,
    };
    let js: string | null;
    if (d.sectionId.startsWith('step-')) {
      js = patchStepTiming(template.js, d.tweenIndex, d.duration);
    } else if (d.multiTarget) {
      // Independent layers: split the joint tween, then retime ONLY the dragged member.
      js = splitTween(template.js, d.sectionId as 'in' | 'out', d.tweenIndex);
      if (js) js = patchTweenTiming(js, d.sectionId as 'in' | 'out', d.tweenIndex + d.member, timing);
    } else {
      js = patchTweenTiming(template.js, d.sectionId as 'in' | 'out', d.tweenIndex, timing);
    }
    if (!js) return; // not patchable after all — leave the code untouched
    applyTemplate({ ...template, js });
    requestReplay(); // hear the new timing immediately (plays after the rebuild settles)
  };

  /** T2.5/T3.2: set/clear an ease — one undoable patch + replay. */
  const pickEase = (index: number, value: string) => {
    const ease = value === 'auto' ? null : value;
    const js =
      seg.kind === 'step'
        ? patchStepEase(template.js, seg.stepIndex!, ease)
        : patchTweenEase(template.js, seg.id as 'in' | 'out', index, ease);
    if (!js || js === template.js) return;
    applyTemplate({ ...template, js });
    requestReplay();
  };
  // Cheap enough to build per render — and NO hooks may sit below the model-null return above.
  const easeOptions = easeOptionsFor(seg.kind === 'out' ? 'out' : 'in');

  // ── T3.3: drag a line onto another » segment to regroup what each Continue reveals ──
  const startRegroup = (e: React.PointerEvent, target: string, fromStep: number) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setRegroup({ target, fromStep, x: e.clientX, y: e.clientY, overStep: null });
  };

  const moveRegroup = (e: React.PointerEvent) => {
    const r = regroupRef.current;
    if (!r) return;
    setRegroup({ ...r, x: e.clientX, y: e.clientY, overStep: dropTargetAt(e.clientX, e.clientY) });
  };

  /** Release a reveal-bar drag: dropped on a » press/card = regroup; dropped on the In
   *  section/card = back to "appears with ▶ Play". One shared transition, one undo. */
  const endRegroup = () => {
    const r = regroupRef.current;
    setRegroup(null);
    if (!r || r.overStep === null || r.overStep === r.fromStep) return;
    const change = changePartPress(template, parts, model, r.target, r.fromStep, r.overStep);
    if (!change) return;
    applyTemplate({ ...template, ...change.patch });
    requestReplay();
    setPhaseId(change.destStep !== null ? `step-${change.destStep + 2}` : 'in');
  };

  /** Turn step reveal off from the strip (the Motion checkbox's counterpart) — everything
   *  goes back to appearing with ▶ Play. */
  const turnOffSteps = () => {
    applyTemplate({ ...template, ...setStepsMode(template, false) });
    setPhaseId('in'); // the selected step segment ceases to exist
    requestReplay();
  };

  /** Assign an on-with-the-graphic part to a » Next press (a new one when toStep points
   *  past the chain) — the entrance choreography changes, so this re-emits the IN phase. */
  const assignPartToPress = (selector: string, toStep: number) => {
    const change = changePartPress(template, parts, model, selector, -1, toStep);
    if (!change) return;
    applyTemplate({ ...template, ...change.patch });
    requestReplay();
    setPhaseId(`step-${change.destStep! + 2}`);
  };

  /** Send an assigned part back to "appears with the graphic" — removed from every press
   *  (an emptied press disappears; the last part leaving turns steps off entirely). */
  const unassignPart = (selector: string) => {
    const change = changePartPress(template, parts, model, selector, 0, -1);
    if (!change) return;
    applyTemplate({ ...template, ...change.patch });
    requestReplay();
    if (seg.stepIndex === undefined || seg.stepIndex >= change.stepsAfter) setPhaseId('in');
  };

  /** The "appears on" menu (a part row's when-control): move a part to another » Next
   *  press — or give it its own — with a plain dropdown. Exactly the patch that dropping
   *  the row on a » card writes, minus the drag. */
  const moveLineTo = (target: string, fromStep: number, toStep: number) => {
    const change = changePartPress(template, parts, model, target, fromStep, toStep);
    if (!change) return;
    applyTemplate({ ...template, ...change.patch });
    requestReplay();
    // Follow the moved line to its destination segment (indices shift when a step empties).
    setPhaseId(`step-${change.destStep! + 2}`);
  };

  // ── The »+ Step button: grow the Continue chain without knowing the internals ─────
  // Steps off → turn step reveal on (the SAME patch as the Motion panel's checkbox).
  // Steps on → split the last multi-line reveal group into a new Continue step.
  const stepsSupported =
    !['end-credits', 'ticker', 'starting-soon', 'countdown', 'infographic', 'quiz'].includes(template.type);
  const splitFrom = (() => {
    for (let i = model.steps.length - 1; i >= 0; i--) {
      const s = model.steps[i];
      if (s.groupable && s.targets.length > 1) return i;
    }
    return -1;
  })();
  // Why »+ Step is unavailable right now (null = clickable) — shown as the disabled button's
  // tooltip, so the affordance explains itself instead of vanishing.
  const addStepBlocked = !stepsOn
    ? lineCount > 1
      ? null
      : 'Steps need at least two text lines — add another field in the Data tab first'
    : splitFrom !== -1
      ? null
      : 'Every line already has its own press — merge lines first (a line\'s "appears on" menu, or drag its row onto another » card)';
  const canAddStep = stepsSupported && !addStepBlocked;

  const addStep = () => {
    if (!stepsOn) {
      applyTemplate({ ...template, ...setStepsMode(template, true) });
    } else {
      const group = model.steps[splitFrom];
      const js = patchStepRegroup(template.js, group.targets[group.targets.length - 1], splitFrom, model.steps.length);
      if (!js) return;
      applyTemplate({ ...template, ...withStepsSetting(template, js) });
    }
    requestReplay(); // play it — the new step is one » Next press away
  };

  const scrubTo = (raw: number) => {
    if (holdSelected) setPhaseId('in'); // dragging out of the hold scrubs the entrance
    // Range steps accumulate float error and can stall one step short of the end — snap the
    // last step to the exact phase end so end-of-phase set() calls (e.g. the final hide) render.
    const t = raw >= total - 0.011 ? total : raw;
    setTime(t);
    sendScrub(seg.id, t);
  };

  const pickSegment = (id: string) => {
    setPhaseId(id);
    setScrubbing(true); // manual pick pauses at 0 until the next Play/Next/Stop
    setTime(0);
    sendScrub(id, 0);
  };

  // ── Friendly row labels: the part registry is the single naming home (the raw selector
  //    stays in the tooltip); heuristics below only catch unregistered selectors (e.g.
  //    hand-added tweens on custom classes).
  const friendlyTarget = (t: string): string => {
    const part = parts.find((p) => p.selector === t);
    if (part) return part.label;
    if (prefix && t.startsWith(`.${prefix}-`)) {
      const suffix = t.slice(prefix.length + 2);
      return suffix.charAt(0).toUpperCase() + suffix.slice(1);
    }
    if (/^#f\d+$/.test(t)) {
      const field = template.fields.find((f) => f.field === t.slice(1));
      return field?.title || t;
    }
    return t;
  };

  const step = seg.kind === 'step' ? model.steps[seg.stepIndex!] : null;

  // ── T4.2: the cue-segmented overview — the whole playout as one strip ─────────
  // Parts eligible for a » press: the first line anchors the entrance (▶ Play must always
  // show something); root/panel are load-bearing containers; blocks outside the root are
  // deferred. Which press a part is on (or -1 = appears with the graphic):
  const firstLine = parts.find((p) => p.kind === 'line')?.selector;
  const eligibleParts = parts.filter(
    (p) => (p.kind === 'line' || p.kind === 'image' || p.kind === 'accent') && p.selector !== firstLine,
  );
  const pressOf = new Map<string, number>();
  model.steps.forEach((s, k) => s.targets.forEach((t) => pressOf.set(t, k)));
  const chainGroupable = model.steps.length > 0 && model.steps.every((s) => s.groupable);

  const overview = buildOverview(
    model,
    parts.map((p) => p.selector),
    stepsOn && chainGroupable ? eligibleParts.map((p) => p.selector) : [],
  );
  const secPx = (sec: OverviewSection) =>
    sec.kind === 'hold' ? HOLD_PX : Math.max(SEC_MIN_PX, sec.duration * pxPerSec);
  const secOffsets = new Map<string, number>();
  let offset = 0;
  for (const sec of overview.sections) {
    secOffsets.set(sec.id, offset);
    offset += secPx(sec);
  }
  const canvasPx = offset;
  // The playhead lives on the SELECTED section's local clock (the tick keeps phaseId on
  // the running phase); the hold has no clock — park at the settled end of the entrance.
  const playheadLeft = holdSelected
    ? (secOffsets.get('in') ?? 0) + secPx(overview.sections[0]) - 1
    : (secOffsets.get(seg.id) ?? 0) + Math.min(frac, 1) * (seg.duration || 0) * pxPerSec;

  /** Where a drag would drop: a [data-step-drop] element under the pointer (cards, the
   *  »+ card, headers), else the SECTION BODY the point is over — a » press index, -1 for
   *  the entrance, null elsewhere. Rows sit on top of the section backdrops, so bodies
   *  resolve geometrically, not through elementFromPoint. */
  const dropTargetAt = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y)?.closest('[data-step-drop]');
    if (el) return Number(el.getAttribute('data-step-drop'));
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
    const px = x - r.left;
    for (const sec of overview.sections) {
      const off = secOffsets.get(sec.id) ?? 0;
      if (px >= off && px < off + secPx(sec)) {
        if (sec.kind === 'step') return sec.stepIndex!;
        if (sec.kind === 'in') return -1;
        return null; // the hold and the exit don't reveal anything
      }
    }
    return null;
  };

  /** Bars of one row, with live drag values applied — only to the dragged MEMBER when the
   *  tween is multi-target (independent layers), and frozen while a cross-section drop is
   *  armed (the ghost communicates; the phase must not look stretched). */
  const rowBars = (key: string) =>
    overview.bars
      .filter((b) => b.rowKey === key)
      .map((b) => {
        const d =
          barDrag &&
          barDrag.sectionId === b.sectionId &&
          barDrag.tweenIndex === b.tweenIndex &&
          (!barDrag.multiTarget || barDrag.member === b.member) &&
          barDrag.dropStep === null
            ? barDrag
            : null;
        return {
          ...b,
          raw: { start: b.start, span: b.span },
          start: d ? b.start + (d.start - d.origStart) : b.start,
          span: d && d.mode !== 'move' ? d.duration : b.span,
          dragging: !!d || (barDrag?.sectionId === b.sectionId && barDrag?.tweenIndex === b.tweenIndex && barDrag?.member === b.member),
        };
      });
  /** Whether a phase bar belongs to a joint multi-target tween (a drag then splits it so
   *  only the grabbed layer moves). */
  const isMultiTarget = (b: { sectionId: string; tweenIndex: number; kind: string }) => {
    if (b.kind === 'reveal') return false;
    const phase = b.sectionId === 'in' ? inPhase : outPhase;
    return (phase.tweens[b.tweenIndex]?.targets.length ?? 1) > 1;
  };
  // Unassigned eligible parts in row order — keeps the appears-add-N testids stable.
  const unassignedOrder = overview.rowKeys.filter(
    (k) => eligibleParts.some((p) => p.selector === k) && !pressOf.has(k),
  );
  /** The ease chip for a row, scoped to the SELECTED moment (a step's ease belongs to the
   *  whole group — one chip on its first part's row). */
  const easeChipFor = (key: string): { index: number; ease: string | null } | null => {
    if (holdSelected) return null;
    if (seg.kind === 'step') {
      if (!step || step.targets[0] !== key) return null;
      return { index: 0, ease: step.ease };
    }
    const phase = seg.kind === 'in' ? inPhase : outPhase;
    const idx = phase.tweens.findIndex((tw) => tw.editable && tw.targets[0] === key);
    return idx === -1 ? null : { index: idx, ease: phase.tweens[idx].ease };
  };

  // ── T5: the per-layer "enters from" drawer — basic transforms, kept deliberately small ──
  const drawerFor = (key: string) => {
    const idx = inPhase.tweens.findIndex((tw) => tw.kind !== 'set' && tw.editable && tw.targets.includes(key));
    const tw = idx >= 0 ? inPhase.tweens[idx] : null;
    const values = Object.fromEntries(
      TRANSFORM_PROPS.map((p) => [p, tw?.fromVars?.[p] ?? TRANSFORM_IDENTITY[p]]),
    ) as Record<TransformProp, number>;
    return { idx, tw, values };
  };

  /** Write one "enters from" value: ensure the part has its OWN entrance tween (split a
   *  joint one / insert a fresh one), then patch the from/to literals — one undoable apply. */
  const setEnterFrom = (key: string, prop: TransformProp, value: number) => {
    if (!Number.isFinite(value)) return;
    let js: string | null = template.js;
    const { idx, tw } = drawerFor(key);
    if (idx === -1 || !tw) {
      js = insertPartTween(js, key, { [prop]: value });
    } else {
      let target = idx;
      if (tw.targets.length > 1) {
        js = splitTween(js, 'in', idx);
        if (!js) return;
        target = idx + tw.targets.indexOf(key);
      }
      js = patchTweenVars(js, 'in', target, { [prop]: value });
    }
    if (!js || js === template.js) return;
    applyTemplate({ ...template, js });
    requestReplay();
  };

  // Which rows can open the drawer: registry parts entering WITH the graphic (an assigned
  // part's entry belongs to its » press) — the root's entrance is the preset's whole job.
  const canDrawer = (key: string) => {
    const part = parts.find((p) => p.selector === key);
    return !!part && part.kind !== 'root' && !pressOf.has(key);
  };
  const drawerOpen = expandedPart && overview.rowKeys.includes(expandedPart) && canDrawer(expandedPart) ? expandedPart : null;
  const DRAWER_FIELDS: { prop: TransformProp; label: string; step: number; min?: number; max?: number }[] = [
    { prop: 'x', label: 'X', step: 1 },
    { prop: 'y', label: 'Y', step: 1 },
    { prop: 'scale', label: 'Scale', step: 0.05, min: 0 },
    { prop: 'opacity', label: 'Opacity', step: 0.1, min: 0, max: 1 },
    { prop: 'rotation', label: 'Rot°', step: 1 },
  ];

  return (
    <div className={`timeline-strip${collapsed ? ' collapsed' : ''}`} data-testid="timeline">
      <div className="timeline-head">
        <button className="timeline-collapse" onClick={toggleCollapsed} title={collapsed ? 'Expand the timeline' : 'Collapse the timeline'}>
          {collapsed ? '▸' : '▾'}
        </button>
        {segments.map((s) => (
          <span key={s.id} style={{ display: 'contents' }}>
            {/* »+ Step — click to grow the Continue chain (turns steps on, or splits a
                multi-line reveal); doubles as the new-step DROP target while regrouping. */}
            {s.kind === 'out' && (regroup || stepsSupported) && (
              <button
                className={`tab timeline-seg timeline-newstep${regroup?.overStep === model.steps.length ? ' drop-target' : ''}`}
                data-step-drop={model.steps.length}
                data-testid="timeline-seg-new"
                disabled={!regroup && !canAddStep}
                onClick={regroup || !canAddStep ? undefined : addStep}
                title={
                  !regroup && addStepBlocked
                    ? addStepBlocked
                    : !stepsOn
                      ? 'Add a Continue step — ▶ Play then shows only the first line; each » Next press reveals the next one'
                      : 'Add a Continue step — splits the last multi-line reveal so its last line gets its own » Next press'
                }
              >
                <span className="timeline-seg-main"><span className="timeline-marker">»</span> + Step</span>
                <span className="timeline-seg-sub" aria-hidden="true">adds a press</span>
              </button>
            )}
            {/* ● On air — the hold between the last reveal and the exit, made visible. */}
            {s.kind === 'out' && (
              <button
                className={`tab timeline-seg timeline-hold${holdSelected ? ' active' : ''}`}
                onClick={pickHold}
                title={`The hold — the graphic sits settled on air ${outBadge ? `(${outBadge})` : 'until ■ Stop'}; » steps play during it`}
                data-testid="timeline-seg-hold"
              >
                <span className="timeline-seg-main"><span className="timeline-marker">●</span> On air</span>
                <span className="timeline-seg-sub" aria-hidden="true">{holdSub}</span>
              </button>
            )}
            <button
              className={`tab timeline-seg ${s.id === phaseId ? 'active' : ''}${
                regroup && s.kind === 'step' && regroup.overStep === s.stepIndex ? ' drop-target' : ''
              }`}
              onClick={() => pickSegment(s.id)}
              title={
                s.kind === 'step'
                  ? `Plays on press ${s.label} of the » Next button (SPX Continue)`
                  : s.kind === 'in'
                    ? 'The entrance — plays on ▶ Play'
                    : `The exit — plays on ■ Stop${outBadge ? ` (${outBadge})` : ''}`
              }
              data-testid={`timeline-seg-${s.id}`}
              {...(s.kind === 'step' ? { 'data-step-drop': s.stepIndex } : {})}
              {...(s.kind === 'in' ? { 'data-step-drop': -1 } : {})}
            >
              <span className="timeline-seg-main">
                <span className="timeline-marker">{s.marker}</span> {s.label} {s.infinite ? '∞' : `${s.duration.toFixed(2)}s`}
              </span>
              <span className="timeline-seg-sub" aria-hidden="true">{segSub(s)}</span>
            </button>
          </span>
        ))}
        <input
          className="grow timeline-scrub"
          type="range"
          min={0}
          max={total}
          step={0.01}
          value={shown}
          onPointerDown={() => setScrubbing(true)}
          onChange={(e) => scrubTo(Number(e.target.value))}
          title="Scrub — pauses the preview at this moment (▶ Play runs it again)"
          data-testid="timeline-scrub"
        />
        <span className="mono muted timeline-time" data-testid="timeline-time">{shown.toFixed(2)}s</span>
        {!collapsed && (
          <span className="timeline-zoom" aria-hidden="false">
            <button
              className="timeline-zoom-btn"
              onClick={() => setPxPerSec((z) => Math.max(40, z / 1.3))}
              title="Zoom out — more of the playout per screen"
              data-testid="timeline-zoom-out"
            >
              −
            </button>
            <button
              className="timeline-zoom-btn"
              onClick={() => setPxPerSec((z) => Math.min(400, z * 1.3))}
              title="Zoom in — finer timing"
              data-testid="timeline-zoom-in"
            >
              +
            </button>
          </span>
        )}
        {/* Last on purpose: the knobs readout is the one flexible-width item — it may
            ellipsize when the head is tight; the zoom buttons must not fall off. */}
        {!collapsed && (
          <span
            className="hint timeline-knobs"
            title={`animSpeed ×${model.animSpeed} · easeIn ${model.easeIn} · easeOut ${model.easeOut}`}
          >
            ×{model.animSpeed} · {easeName(model.easeIn, 'in')} / {easeName(model.easeOut, 'out')}
          </span>
        )}
      </div>

      {/* The one-time announcement when steps turn on — ▶ Play changed its behavior. */}
      {stepsNotice && !collapsed && (
        <p className="timeline-notice" data-testid="timeline-notice">
          Step reveal is on — ▶ Play now shows only the first line; each press of » Next
          reveals one more.
        </p>
      )}

      {/* T4.2 — the cue-segmented overview: the WHOLE playout as one strip. Sections keep
          their own real local clocks; the hold is a fixed break (it waits, it has no
          clock); part rows span every section. */}
      {!collapsed && (
        <div className="timeline-tracks timeline-ov" data-testid="timeline-overview">
          {/* Left: the part names, outside the scroll. A registry part's label is the row's
              selection handle — clicking it selects the element on the canvas too (shared
              selection); clicking the selected one deselects. */}
          <div className="timeline-ov-labels">
            <div className="timeline-ov-corner" style={{ height: OV_HEAD_H }} aria-hidden="true" />
            {overview.rowKeys.map((key) => {
              const isPart = parts.some((p) => p.selector === key);
              const isSelected = selectedPart === key;
              return (
                <span key={key} style={{ display: 'contents' }}>
                  <span
                    className={`timeline-label${isPart ? ' clickable' : ''}${isSelected ? ' selected' : ''}`}
                    data-part={key}
                    title={isPart ? `${key} — click to select this element (on the canvas too)` : key}
                    style={{ height: ROW_H, lineHeight: `${ROW_H}px` }}
                    onClick={isPart ? () => setSelectedPart(isSelected ? null : key) : undefined}
                  >
                    {/* T5 — the layer's basic animation controls live behind this arrow. */}
                    {canDrawer(key) ? (
                      <button
                        className="timeline-expand"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedPart(drawerOpen === key ? null : key);
                        }}
                        title="Basic animation — where this element enters from (X, Y, scale, opacity, rotation)"
                        data-testid={`timeline-expand-${key.replace(/[^\w-]/g, '')}`}
                      >
                        {drawerOpen === key ? '▾' : '▸'}
                      </button>
                    ) : (
                      <span className="timeline-expand-spacer" aria-hidden="true" />
                    )}
                    {friendlyTarget(key)}
                  </span>
                  {drawerOpen === key && (
                    <span
                      className="timeline-label timeline-drawer-label"
                      style={{ height: DRAWER_H, lineHeight: `${DRAWER_H}px` }}
                    >
                      ↳ enters from
                    </span>
                  )}
                </span>
              );
            })}
          </div>

          {/* Middle: the zoomable, scrollable section canvas. */}
          <div className="timeline-ov-scroll" ref={scrollRef}>
            <div
              className="timeline-ov-canvas"
              ref={canvasRef}
              style={{
                width: canvasPx,
                height: OV_HEAD_H + overview.rowKeys.length * ROW_H + (drawerOpen ? DRAWER_H : 0),
                paddingTop: OV_HEAD_H, // the header/ruler row is absolute — keep rows below it
              }}
            >
              {/* Section backdrops (selection tint, hold hatch, drop highlight) + ticks. */}
              {overview.sections.map((sec) => {
                const dropArmed =
                  sec.kind === 'step' &&
                  ((regroup && regroup.overStep === sec.stepIndex) ||
                    (barDrag && barDrag.dropStep === sec.stepIndex));
                const backToPlay = sec.kind === 'in' && !!regroup && regroup.overStep === -1;
                return (
                  <div
                    key={`bg-${sec.id}`}
                    className={`timeline-ov-secbg${sec.kind === 'hold' ? ' hold' : ''}${
                      (sec.kind === 'hold' ? holdSelected : sec.id === phaseId) ? ' active' : ''
                    }${dropArmed || backToPlay ? ' drop' : ''}`}
                    style={{ left: secOffsets.get(sec.id), width: secPx(sec) }}
                    aria-hidden="true"
                  />
                );
              })}
              {pxPerSec >= 60 &&
                overview.sections
                  .filter((s) => s.kind !== 'hold')
                  .flatMap((sec) => {
                    const ticks: number[] = [];
                    for (let t = 0.25; t < sec.duration - 0.01 && ticks.length < 80; t += 0.25) ticks.push(t);
                    return ticks.map((t) => (
                      <div
                        key={`tick-${sec.id}-${t}`}
                        className={`timeline-ov-tick${Math.abs(t % 1) < 0.001 ? ' whole' : ''}`}
                        style={{ left: (secOffsets.get(sec.id) ?? 0) + t * pxPerSec }}
                        aria-hidden="true"
                      />
                    ));
                  })}

              {/* Section headers — the ruler row; clicking selects the moment. */}
              {overview.sections.map((sec) => {
                const selected = sec.kind === 'hold' ? holdSelected : sec.id === phaseId;
                const dur = sec.infinite ? '∞' : `${sec.duration.toFixed(2)}s`;
                const head =
                  sec.kind === 'in'
                    ? `▶ In · ${dur}`
                    : sec.kind === 'out'
                      ? `■ Out · ${dur}`
                      : sec.kind === 'hold'
                        ? '● hold'
                        : `» ${sec.stepIndex! + 1} · ${dur}`;
                return (
                  <button
                    key={`sec-${sec.id}`}
                    className={`timeline-ov-sec${selected ? ' active' : ''}${
                      regroup && sec.kind === 'step' && regroup.overStep === sec.stepIndex ? ' drop-target' : ''
                    }`}
                    style={{ left: secOffsets.get(sec.id), width: secPx(sec), height: OV_HEAD_H }}
                    onClick={() => (sec.kind === 'hold' ? pickHold() : pickSegment(sec.id))}
                    title={
                      sec.kind === 'in'
                        ? 'The entrance — plays on ▶ Play'
                        : sec.kind === 'out'
                          ? `The exit — plays on ■ Stop${outBadge ? ` (${outBadge})` : ''}`
                          : sec.kind === 'hold'
                            ? `The hold — the graphic sits settled on air (${holdSub}); » presses play during it`
                            : `Plays on press ${sec.stepIndex! + 1} of the » Next button`
                    }
                    data-testid={`timeline-ov-sec-${sec.id}`}
                    {...(sec.kind === 'step' ? { 'data-step-drop': sec.stepIndex } : {})}
                    {...(sec.kind === 'in' ? { 'data-step-drop': -1 } : {})}
                  >
                    {head}
                  </button>
                );
              })}

              {/* Part rows — bars across every section, on each section's local clock. */}
              {overview.rowKeys.map((key) => (
                <span key={key} style={{ display: 'contents' }}>
                  <div
                    className={`timeline-ov-row${selectedPart === key ? ' selected' : ''}`}
                    style={{ height: ROW_H }}
                  >
                    {rowBars(key).map((b) => {
                      const sec = overview.sections.find((s) => s.id === b.sectionId)!;
                      const isReveal = b.kind === 'reveal';
                      const left = (secOffsets.get(b.sectionId) ?? 0) + b.start * pxPerSec;
                      const verb = isReveal
                        ? 'reveal'
                        : actionLabel({ kind: b.kind as TimelineTween['kind'], props: b.props });
                      const canDrag = b.editable;
                      const groupable = isReveal && model.steps[sec.stepIndex!]?.groupable;
                      const barRef = {
                        sectionId: b.sectionId,
                        tweenIndex: b.tweenIndex,
                        member: b.member,
                        multiTarget: isMultiTarget(b),
                        selector: b.rowKey,
                      };
                      const barTestId = isReveal
                        ? `timeline-bar-${b.sectionId}-r${b.member}`
                        : b.firstMember
                          ? `timeline-bar-${b.sectionId}-${b.tweenIndex}`
                          : `timeline-bar-${b.sectionId}-${b.tweenIndex}-m${b.member}`;
                      return (
                        <div
                          key={`${b.sectionId}-${b.tweenIndex}-${b.member}`}
                          className={`timeline-bar ${isReveal ? 'to' : b.kind}${canDrag ? ' editable' : ''}${b.dragging ? ' dragging' : ''}`}
                          style={{
                            left,
                            width: b.kind === 'set' ? undefined : Math.max(6, b.span * pxPerSec),
                          }}
                          title={
                            b.kind === 'set'
                              ? `instant set · ${b.props.join(', ')}`
                              : `${verb || 'animate'}${b.props.length ? ` (${b.props.join(', ')})` : ''} · ${b.start.toFixed(2)}–${(b.start + b.span).toFixed(2)}s${
                                  groupable
                                    ? ' — drag onto a » card or the entrance to change when it appears, edge to stretch'
                                    : canDrag
                                      ? ' — drag to retime (or onto a » press to reveal it there), edges to stretch either end'
                                      : ''
                                }`
                          }
                          data-testid={barTestId}
                          onPointerDown={
                            !canDrag
                              ? undefined
                              : groupable
                                ? (e) => startRegroup(e, b.rowKey, sec.stepIndex!)
                                : isReveal
                                  ? (e) => startBarDrag(e, barRef, 'resize', { start: b.raw.start, duration: b.raw.span })
                                  : (e) => startBarDrag(e, barRef, 'move', { start: b.raw.start, duration: b.raw.span })
                          }
                          onPointerMove={(e) => { moveBarDrag(e); moveRegroup(e); }}
                          onPointerUp={() => { endBarDrag(); endRegroup(); }}
                          onPointerCancel={() => { setBarDrag(null); setRegroup(null); }}
                        >
                          {b.kind !== 'set' && (b.firstMember || isReveal) && (
                            <span className="timeline-bar-verb" aria-hidden="true">{verb}</span>
                          )}
                          {/* Left edge — move the START, the end stays pinned (phase bars only:
                              a reveal's start belongs to its press). */}
                          {canDrag && b.kind !== 'set' && !isReveal && (
                            <span
                              className="timeline-bar-handle-left"
                              data-testid={`timeline-handle-left-${b.sectionId}-${b.tweenIndex}${b.firstMember ? '' : `-m${b.member}`}`}
                              onPointerDown={(e) =>
                                startBarDrag(e, barRef, 'resize-start', { start: b.raw.start, duration: b.raw.span })
                              }
                            />
                          )}
                          {canDrag && b.kind !== 'set' && (
                            <span
                              className="timeline-bar-handle"
                              data-testid={
                                isReveal
                                  ? `timeline-handle-${b.sectionId}-r${b.member}`
                                  : `timeline-handle-${b.sectionId}-${b.tweenIndex}${b.firstMember ? '' : `-m${b.member}`}`
                              }
                              onPointerDown={(e) =>
                                startBarDrag(e, barRef, 'resize', { start: b.raw.start, duration: b.raw.span })
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* T5 — the expanded layer's basic animation controls (sticky, not on the
                      time axis: these are properties, not bars). */}
                  {drawerOpen === key && (
                    <div className="timeline-ov-row timeline-drawer" style={{ height: DRAWER_H }}>
                      <div className="timeline-drawer-fields">
                        {DRAWER_FIELDS.map((f) => {
                          const value = drawerFor(key).values[f.prop];
                          return (
                            <label className="timeline-drawer-field" key={f.prop}>
                              <span>{f.label}</span>
                              <input
                                type="number"
                                key={`${key}-${f.prop}-${value}`}
                                defaultValue={value}
                                step={f.step}
                                min={f.min}
                                max={f.max}
                                data-testid={`timeline-from-${f.prop}`}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
                                }}
                                onBlur={(e) => {
                                  const v = Number(e.currentTarget.value);
                                  if (Number.isFinite(v) && v !== value) setEnterFrom(key, f.prop, v);
                                }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </span>
              ))}

              {/* The playhead — travels the whole strip through Play, every press, and Stop. */}
              <div
                className="timeline-playhead"
                data-testid="timeline-playhead"
                style={{ left: playheadLeft, top: OV_HEAD_H }}
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Right gutter: each part's press assignment + the selected moment's ease. */}
          <div className="timeline-ov-gutter">
            <div className="timeline-ov-corner" style={{ height: OV_HEAD_H }} aria-hidden="true" />
            {overview.rowKeys.map((key) => {
              const eligible = stepsOn && chainGroupable && eligibleParts.some((p) => p.selector === key);
              const press = pressOf.has(key) ? pressOf.get(key)! : -1;
              const soloLast =
                press === model.steps.length - 1 && press >= 0 && model.steps[press].targets.length === 1;
              const appearsTestId =
                step && press === seg.stepIndex
                  ? `timeline-appears-${model.steps[seg.stepIndex!].targets.indexOf(key)}`
                  : press === -1
                    ? `timeline-appears-add-${unassignedOrder.indexOf(key)}`
                    : `timeline-appears-p${press}-${model.steps[press].targets.indexOf(key)}`;
              const chip = easeChipFor(key);
              return (
                <div
                  className="timeline-ov-gutter-row"
                  key={key}
                  // The drawer's sub-row lives in the canvas; box-sizing keeps the selects
                  // centered in the top ROW_H while the row grows underneath.
                  style={{
                    height: drawerOpen === key ? ROW_H + DRAWER_H : ROW_H,
                    paddingBottom: drawerOpen === key ? DRAWER_H : 0,
                  }}
                >
                  {eligible ? (
                    <select
                      className="timeline-appears"
                      value={press}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (v === press) return;
                        if (press === -1) {
                          if (v >= 0) assignPartToPress(key, v);
                        } else if (v === -1) {
                          unassignPart(key);
                        } else {
                          moveLineTo(key, press, v);
                        }
                      }}
                      title="When this part appears — with ▶ Play, or revealed by a press of » Next"
                      data-testid={appearsTestId}
                    >
                      <option value={-1}>appears with ▶ Play</option>
                      {model.steps.map((_, k) => (
                        <option key={k} value={k}>{`appears on press ${k + 1}`}</option>
                      ))}
                      {!soloLast && <option value={model.steps.length}>appears on a new press</option>}
                    </select>
                  ) : (
                    stepsOn && chainGroupable && <span className="timeline-appears-spacer" aria-hidden="true" />
                  )}
                  {chip ? (
                    <select
                      className="timeline-ease"
                      value={chip.ease ?? 'auto'}
                      onChange={(e) => pickEase(chip.index, e.target.value)}
                      title={`How this move accelerates in the selected moment (its ease) — 'auto' follows the phase's easing knob`}
                      data-testid={`timeline-ease-${chip.index}`}
                    >
                      <option value="auto">ease · auto</option>
                      {easeOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                      {chip.ease && !easeOptions.some((o) => o.value === chip.ease) && (
                        <option value={chip.ease}>{chip.ease}</option>
                      )}
                    </select>
                  ) : (
                    <span className="timeline-ease-spacer" aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* The hold explained, when it is the selected moment. */}
      {!collapsed && holdSelected && (
        <p className="timeline-hold-note" data-testid="timeline-hold-note">
          The graphic holds here, settled,{' '}
          {outMode === 'none'
            ? 'and never leaves on its own (no out is set).'
            : /^\d+$/.test(outMode)
              ? `then leaves by itself after ${Number(outMode) / 1000}s.`
              : 'until ■ Stop plays the exit.'}
          {model.steps.length > 0 && ' Each » Next press plays during this hold.'}
        </p>
      )}

      {/* One line of context so the gestures are discoverable without hovering. */}
      {!collapsed && !holdSelected && (
        <p className="timeline-hint" data-testid="timeline-hint">
          {step ? (
            <>
              {'Plays on one press of the » button — the "appears on" menu moves a line to another press. '}
              <button
                className="timeline-hint-action"
                onClick={turnOffSteps}
                title="Remove all Continue steps — every line appears with ▶ Play again (undo with Ctrl+Z)"
                data-testid="timeline-steps-off"
              >
                Turn off step reveal
              </button>
            </>
          ) : seg.kind === 'out'
            ? 'The exit (■ Stop) — drag a bar to retime it, drag its right edge to stretch, the menu sets its ease.'
            : 'The entrance (▶ Play) — drag a bar to retime it, drag its right edge to stretch, the menu sets its ease.'}
        </p>
      )}

      {/* The chip following the pointer while a drag changes WHEN a part appears. */}
      {regroup && (
        <div className="regroup-ghost" style={{ left: regroup.x + 10, top: regroup.y - 24 }}>
          {friendlyTarget(regroup.target)} →{' '}
          {regroup.overStep === null
            ? 'drop on a » card (or the entrance)'
            : regroup.overStep === -1
              ? 'appears with ▶ Play'
              : regroup.overStep === model.steps.length
                ? 'a new press'
                : `press ${regroup.overStep + 1}`}
        </div>
      )}
      {barDrag && barDrag.dropStep !== null && (
        <div className="regroup-ghost" style={{ left: barDrag.x + 10, top: barDrag.y - 24 }}>
          {friendlyTarget(barDrag.selector)} →{' '}
          {barDrag.dropStep === model.steps.length ? 'a new press' : `press ${barDrag.dropStep + 1}`}
        </div>
      )}
    </div>
  );
}
