// THE UNIVERSAL IN/OUT MOTION BANK — ten entrance/exit motions that apply to ANY graphic
// whose motion lives in the NOACG_ANIM data block (docs/STATE_MACHINE_SCHEMA.md): the
// catalog, the wizard's imports, the agent door's scaffolds, a hand-made data template.
//
// This is the no-code surface's engine (the wizard's Animation step and a saved graphic's
// control page both pick from it); the full timeline stays the Advanced-mode editor. It is
// deliberately NOT another category preset bank (blocks/presetRegistry.ts): those are the
// catalog's tuned choreographies — lines staggering out of masks, an accent drawing in —
// emitted as code and derived to keyframes through the importer, and each one needs the
// structure contract it was written for. A universal motion knows nothing about the
// design: it moves THE GRAPHIC AS ONE UNIT, so it can promise to work on every data-block
// graphic, and it is authored directly as DATA (plain keyframe tracks), so applying it is a
// pure `(data) => data` transform — deterministic, readable, undoable, and the same in the
// wizard, on the control page and under SPX.
//
// WHAT MOVES: the graphic's root's direct element children (its box, an accent beside it —
// whatever sits directly under the root), together, with one motion. The root itself never
// takes a track: the interpreter owns its opacity (the rest-hide and the on-air reveal), and
// a track there would fight it. Layers OUTSIDE the root keep their own motion — an inserted
// graphic shares the host's steps but is not the host's unit (blocks/templateInsert.ts).
//
// WHAT IS KEPT on the step being rewritten: lifecycle `calls` (a clock's startClock), measured
// `dynamics` (a ticker's marquee builder), `loops` (an ambient breath — it is behaviour, not
// the entrance), `reveals`/`hides` (the walk's mechanics), and every layer outside the root.
// Only the inside-the-root ENTRANCE/EXIT motion is swapped, which is what the picker says it
// does. A styled lifecycle edge (a machine's play/stop arrow carrying fade/push/wipe) would
// play INSTEAD of the step's keyframes, so the rewrite clears that style — what you picked
// is what plays.
//
// Values follow the catalog's own taste (templates/lowerThirds/animPresets.ts, the imported
// design's whole-unit bank): short travel (a rise reads as "arriving", not as movement),
// Out-direction eases on entrances, In-direction eases on exits that run ~35 % faster
// (docs/DESIGN_LANGUAGE.md §4).

import type { SpxTemplate } from '../model/types';
import type { AnimData, AnimKeyframe, AnimLayerTracks, AnimStep } from './animData';

export type MotionPresetId =
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'rise'
  | 'drop'
  | 'pop'
  | 'zoom'
  | 'blur'
  | 'wipe-right'
  | 'wipe-left';

/** One half of a motion: the tracks written on EVERY target (times on [0, duration],
 *  speed-relative seconds), the step's pace and its curve. */
export interface MotionPhase {
  duration: number;
  ease: string;
  /** Written per target; `to` lands at `duration`. Values are GSAP values (numbers, or the
   *  strings GSAP tweens as strings — a filter, a clipPath). */
  from: Record<string, number | string>;
  to: Record<string, number | string>;
}

export interface MotionPreset {
  id: MotionPresetId;
  name: string;
  /** The card's one line (two at most in a 150 px cell). */
  hint: string;
  /** The full story, for the tooltip. */
  description: string;
  in: MotionPhase;
  out: MotionPhase;
}

const SHOWN = 'inset(0% 0% 0% 0%)';

export const MOTION_PRESETS: MotionPreset[] = [
  {
    id: 'fade',
    hint: 'Dissolves up, dissolves away.',
    name: 'Fade',
    description: 'Dissolves up, dissolves away. The calmest choice — no movement at all.',
    in: { duration: 0.55, ease: 'sine.out', from: { opacity: 0 }, to: { opacity: 1 } },
    out: { duration: 0.38, ease: 'sine.in', from: { opacity: 1 }, to: { opacity: 0 } },
  },
  {
    id: 'slide-left',
    hint: 'In from the right, back out that way.',
    name: 'Slide left',
    description: 'Glides in from the right edge and slips back out that way.',
    in: { duration: 0.55, ease: 'power3.out', from: { x: 60, opacity: 0 }, to: { x: 0, opacity: 1 } },
    out: { duration: 0.35, ease: 'power2.in', from: { x: 0, opacity: 1 }, to: { x: 44, opacity: 0 } },
  },
  {
    id: 'slide-right',
    hint: 'In from the left, back out that way.',
    name: 'Slide right',
    description: 'Glides in from the left edge and slips back out that way.',
    in: { duration: 0.55, ease: 'power3.out', from: { x: -60, opacity: 0 }, to: { x: 0, opacity: 1 } },
    out: { duration: 0.35, ease: 'power2.in', from: { x: 0, opacity: 1 }, to: { x: -44, opacity: 0 } },
  },
  {
    id: 'rise',
    hint: 'Up from below, sinks back down.',
    name: 'Rise',
    description: 'Rises into place from below and sinks back down to leave. Quiet and universal.',
    in: { duration: 0.55, ease: 'power3.out', from: { y: 40, opacity: 0 }, to: { y: 0, opacity: 1 } },
    out: { duration: 0.35, ease: 'power2.in', from: { y: 0, opacity: 1 }, to: { y: 24, opacity: 0 } },
  },
  {
    id: 'drop',
    hint: 'Down from above, lifts back up.',
    name: 'Drop',
    description: 'Settles in from above and lifts back up to leave. Headline-like.',
    in: { duration: 0.55, ease: 'power3.out', from: { y: -40, opacity: 0 }, to: { y: 0, opacity: 1 } },
    out: { duration: 0.35, ease: 'power2.in', from: { y: 0, opacity: 1 }, to: { y: -24, opacity: 0 } },
  },
  {
    id: 'pop',
    hint: 'Springs up to size, shrinks away.',
    name: 'Pop',
    description: 'Springs up to size with a soft overshoot, shrinks away. Energetic — sport, entertainment.',
    in: { duration: 0.5, ease: 'back.out(1.5)', from: { scale: 0.86, opacity: 0 }, to: { scale: 1, opacity: 1 } },
    out: { duration: 0.34, ease: 'power2.in', from: { scale: 1, opacity: 1 }, to: { scale: 0.94, opacity: 0 } },
  },
  {
    id: 'zoom',
    hint: 'Settles from larger, drifts off larger.',
    name: 'Zoom',
    description: 'Settles down from slightly larger, drifts away larger. Cinematic; best on full-frame graphics.',
    in: { duration: 0.6, ease: 'power3.out', from: { scale: 1.12, opacity: 0 }, to: { scale: 1, opacity: 1 } },
    out: { duration: 0.4, ease: 'power2.in', from: { scale: 1, opacity: 1 }, to: { scale: 1.06, opacity: 0 } },
  },
  {
    id: 'blur',
    hint: 'Focuses in from a blur, blurs away.',
    name: 'Blur',
    description: 'Resolves out of a soft blur, dissolves back into one. Filmic; best over calm footage.',
    in: { duration: 0.6, ease: 'power2.out', from: { filter: 'blur(14px)', opacity: 0 }, to: { filter: 'blur(0px)', opacity: 1 } },
    out: { duration: 0.4, ease: 'power2.in', from: { filter: 'blur(0px)', opacity: 1 }, to: { filter: 'blur(10px)', opacity: 0 } },
  },
  {
    id: 'wipe-right',
    hint: 'Revealed left to right, retracts.',
    name: 'Wipe right',
    description: 'Revealed left to right, as if a mask slid off; retracts back the same way.',
    in: { duration: 0.55, ease: 'power3.out', from: { clipPath: 'inset(0% 100% 0% 0%)' }, to: { clipPath: SHOWN } },
    out: { duration: 0.35, ease: 'power2.in', from: { clipPath: SHOWN }, to: { clipPath: 'inset(0% 100% 0% 0%)' } },
  },
  {
    id: 'wipe-left',
    hint: 'Revealed right to left, retracts.',
    name: 'Wipe left',
    description: 'Revealed right to left, as if a mask slid off; retracts back the same way.',
    in: { duration: 0.55, ease: 'power3.out', from: { clipPath: 'inset(0% 0% 0% 100%)' }, to: { clipPath: SHOWN } },
    out: { duration: 0.35, ease: 'power2.in', from: { clipPath: SHOWN }, to: { clipPath: 'inset(0% 0% 0% 100%)' } },
  },
];

export function motionPresetById(id: MotionPresetId): MotionPreset {
  const p = MOTION_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown motion preset: ${id}`);
  return p;
}

export type MotionPhaseName = 'in' | 'out';

/** The step a phase rewrites: the entrance is steps[0], the exit is the final Out step. */
function phaseStepIndex(data: AnimData, phase: MotionPhaseName): number {
  return phase === 'in' ? 0 : data.steps.length - 1;
}

/** The tracks one phase writes on one target — two keyframes per property, the ease stamped
 *  INTO the landing keyframe so the motion keeps its curve whatever the step's own ease is
 *  (the step may still carry another graphic's tracks; see applyMotionPreset). `ease`
 *  overrides the preset's tuned curve (the wizard's Easing choice). */
export function motionTracks(phase: MotionPhase, ease: string = phase.ease): AnimLayerTracks {
  const tracks: AnimLayerTracks = {};
  for (const prop of Object.keys(phase.from)) {
    const from: AnimKeyframe = { time: 0, value: phase.from[prop] };
    const to: AnimKeyframe = { time: phase.duration, value: phase.to[prop], ease };
    tracks[prop] = [from, to];
  }
  return tracks;
}

/**
 * The graphic's UNIT(S): a selector for each direct element child of the data root, in
 * document order. Read off the HTML every time (the markup is the source of truth — an
 * import, a hand edit or an inserted part changes the answer). Each selector is the most
 * readable one that is UNIQUE in the document: the element's own id, else a class no other
 * element carries (`.lower-third-box`), else its position under the root. Empty when the
 * root is missing or childless — then there is nothing a unit motion can move, and the
 * picker says so instead of writing tracks at nothing.
 */
export function motionTargets(template: SpxTemplate, data: AnimData): string[] {
  const doc = parseHtml(template.html);
  const root = queryOne(doc, data.root);
  if (!root) return [];
  const children = Array.from(root.children);
  const targets: string[] = [];
  children.forEach((el, i) => {
    if (!isDrawn(el)) return;
    if (el.id && doc.querySelectorAll(`#${cssEscape(el.id)}`).length === 1) return targets.push(`#${el.id}`);
    for (const cls of Array.from(el.classList)) {
      if (doc.querySelectorAll(`.${cssEscape(cls)}`).length === 1) return targets.push(`.${cls}`);
    }
    targets.push(`${data.root} > :nth-child(${i + 1})`);
  });
  return targets;
}

/** The root children a template does not DRAW — the hidden data holders SPX writes into
 *  (`.noacg-data-source`, templates/shared/base.ts), script/style, form sources, anything
 *  hidden inline. A unit motion on those is noise in the data and nothing on screen. */
const UNDRAWN_TAGS = new Set(['script', 'style', 'template', 'link', 'meta', 'noscript', 'textarea', 'input', 'select']);
function isDrawn(el: Element): boolean {
  if (UNDRAWN_TAGS.has(el.tagName.toLowerCase())) return false;
  if (el.classList.contains('noacg-data-source') || el.hasAttribute('hidden')) return false;
  const style = (el.getAttribute('style') ?? '').replace(/\s+/g, '');
  return !/display:none|visibility:hidden/.test(style);
}

function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

/** A tolerant querySelector: a selector the parser refuses (hand-written data) is "absent". */
function queryOne(doc: Document, selector: string): Element | null {
  try {
    return doc.querySelector(selector);
  } catch {
    return null;
  }
}

function cssEscape(s: string): string {
  return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(s) : s.replace(/([^\w-])/g, '\\$1');
}

/** Whether a layer's element lives INSIDE the root — the graphic's own part, whose entrance/
 *  exit the unit motion replaces — as opposed to beside it (an inserted graphic, a building
 *  block). A selector that resolves to nothing is treated as inside: a stale layer is this
 *  graphic's leftover, not another graphic's motion. */
function insideRoot(doc: Document, root: Element | null, selector: string): boolean {
  if (!root) return true;
  const el = queryOne(doc, selector);
  return !el || el === root || root.contains(el);
}

export interface MotionPick {
  in?: MotionPresetId;
  out?: MotionPresetId;
}

/** A curve choice over the presets' own (model/easings.ts resolves the wizard's named easing
 *  into this pair); absent = each preset's tuned ease. */
export interface MotionEases {
  easeIn?: string;
  easeOut?: string;
}

/**
 * Rewrite the entrance and/or exit of a data-block graphic with a universal motion. Pure:
 * returns new data, or null when nothing could be written (no unit to move, no phase
 * picked). The caller splices it in with writeAnimData + one applyTemplate / one save.
 *
 * Per rewritten step: the inside-the-root layers lose their non-looping tracks (the old
 * entrance/exit — a clean swap, exactly as the category presets do, so two picks never
 * blend), every target gets the motion's tracks, and the step is paced to the motion — or
 * longer, never shorter, when something kept (an outside layer, a loop, a call, a dynamic)
 * reaches further: a rewrite must never truncate motion it promised to keep.
 */
export function applyMotionPreset(
  template: SpxTemplate,
  data: AnimData,
  pick: MotionPick,
  eases: MotionEases = {},
): AnimData | null {
  const targets = motionTargets(template, data);
  if (targets.length === 0) return null;
  const phases: MotionPhaseName[] = (['in', 'out'] as const).filter((ph) => pick[ph] !== undefined);
  if (phases.length === 0) return null;

  const next = JSON.parse(JSON.stringify(data)) as AnimData;
  const doc = parseHtml(template.html);
  const root = queryOne(doc, data.root);

  for (const ph of phases) {
    const preset = motionPresetById(pick[ph]!);
    const phase = preset[ph];
    const ease = (ph === 'in' ? eases.easeIn : eases.easeOut) ?? phase.ease;
    const step = next.steps[phaseStepIndex(next, ph)];
    let foreignMotion = false;
    let reach = 0;

    // 1. Clear the old motion of this graphic's own parts; keep everything else.
    for (const selector of Object.keys(step.layers)) {
      const tracks = step.layers[selector];
      if (!insideRoot(doc, root, selector)) {
        foreignMotion = true;
        reach = Math.max(reach, lastTime(tracks));
        continue;
      }
      const loops = step.loops?.[selector] ?? {};
      const kept: AnimLayerTracks = {};
      for (const prop of Object.keys(tracks)) {
        if (loops[prop]) kept[prop] = tracks[prop]; // an ambient loop is behaviour, not the entrance
      }
      if (Object.keys(kept).length > 0) {
        step.layers[selector] = kept;
        reach = Math.max(reach, lastTime(kept));
      } else {
        delete step.layers[selector];
      }
    }

    // 2. Write the unit motion on every target. A target that carried a loop on one of the
    //    motion's own properties loses that loop: the written track owns the property now.
    for (const selector of targets) {
      const layer = step.layers[selector] ?? {};
      const written = motionTracks(phase, ease);
      for (const prop of Object.keys(written)) {
        layer[prop] = written[prop];
        if (step.loops?.[selector]?.[prop]) delete step.loops[selector][prop];
      }
      step.layers[selector] = layer;
    }
    tidyLoops(step);

    // 3. Pace the step: the motion's own length, stretched only by what was kept.
    for (const c of step.calls ?? []) reach = Math.max(reach, c.time);
    for (const d of step.dynamics ?? []) reach = Math.max(reach, d.time ?? 0);
    step.duration = round(Math.max(phase.duration, reach));
    // With no other graphic's tracks on the step, the step's own ease becomes the motion's
    // (the keyframes carry it either way; this keeps the Inspector's step ease honest).
    if (!foreignMotion) step.ease = ease;

    // 4. A styled lifecycle arrow plays INSTEAD of these keyframes — clear it.
    const main = next.machine?.groups[0];
    const edge = main?.transitions.find(
      (t) => t.trigger === 'lifecycle' && t.event === (ph === 'in' ? 'play' : 'stop'),
    );
    if (edge?.style !== undefined) {
      delete edge.style;
      delete edge.duration;
      delete edge.ease;
    }
  }
  return next;
}

/**
 * Which universal motion a phase currently holds, read back from the data — the picker's
 * active card. Nothing is stamped into the block for this (code is the single source of
 * truth, and a stamp could lie after a timeline edit): it matches when every target carries
 * exactly one preset's tracks and no other part inside the root animates in that step. A
 * hand-tuned or category choreography answers null — no card lit — which is the honest
 * state for motion this bank did not write. The curve is not part of the match: an easing
 * is a modifier picked beside the motion (the wizard's Easing select), not another motion.
 */
export function currentMotionPreset(template: SpxTemplate, data: AnimData, ph: MotionPhaseName): MotionPresetId | null {
  const targets = motionTargets(template, data);
  if (targets.length === 0) return null;
  const step = data.steps[phaseStepIndex(data, ph)];
  const doc = parseHtml(template.html);
  const root = queryOne(doc, data.root);
  const targetSet = new Set(targets);
  // Any inside-the-root layer that is not a target and animates (beyond its loops) means a
  // choreography richer than a unit motion is in place.
  for (const selector of Object.keys(step.layers)) {
    if (targetSet.has(selector) || !insideRoot(doc, root, selector)) continue;
    const loops = step.loops?.[selector] ?? {};
    if (Object.keys(step.layers[selector]).some((prop) => !loops[prop])) return null;
  }
  for (const preset of MOTION_PRESETS) {
    const expected = motionTracks(preset[ph]);
    const matches = targets.every((selector) => {
      const layer = step.layers[selector];
      if (!layer) return false;
      const loops = step.loops?.[selector] ?? {};
      const motionProps = Object.keys(layer).filter((prop) => !loops[prop]);
      if (motionProps.length !== Object.keys(expected).length) return false;
      return motionProps.every((prop) => sameTrack(layer[prop], expected[prop]));
    });
    if (matches) return preset.id;
  }
  return null;
}

function sameTrack(a: AnimKeyframe[] | undefined, b: AnimKeyframe[] | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((k, i) => k.time === b[i].time && k.value === b[i].value);
}

function lastTime(tracks: AnimLayerTracks): number {
  let t = 0;
  for (const kfs of Object.values(tracks)) for (const k of kfs) t = Math.max(t, k.time);
  return t;
}

/** Drop emptied loop maps so the serialized block never carries `"loops": {}` noise. */
function tidyLoops(step: AnimStep): void {
  if (!step.loops) return;
  for (const selector of Object.keys(step.loops)) {
    if (Object.keys(step.loops[selector]).length === 0) delete step.loops[selector];
  }
  if (Object.keys(step.loops).length === 0) delete step.loops;
}

const round = (n: number) => Math.round(n * 1000) / 1000;
