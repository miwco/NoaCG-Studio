// Timeline v2 Phase 4 — pure keyframe mutators over the animation data model. Every
// editing surface (Inspector diamonds, timeline diamond drags, Delete) routes through
// these: mutate a copy of the parsed data, then spliceAnimData + one applyTemplate makes
// the edit real, undoable code. Times are on the step's SPEED-RELATIVE clock (the stored
// numbers), rounded to the same 3 decimals the serializer writes.

import type { AnimData, AnimKeyframe } from './animData';

/** Two stored times match within half a serializer step. */
const EPS = 0.005;
const round = (n: number) => Math.round(n * 1000) / 1000;

function clone(data: AnimData): AnimData {
  return JSON.parse(JSON.stringify(data)) as AnimData;
}

/** Drop empty tracks and layer entries so the emitted block never carries dead weight. */
function prune(data: AnimData): AnimData {
  for (const step of data.steps) {
    for (const [selector, tracks] of Object.entries(step.layers)) {
      for (const [prop, kfs] of Object.entries(tracks)) {
        if (kfs.length === 0) delete tracks[prop];
      }
      if (Object.keys(tracks).length === 0) delete step.layers[selector];
    }
  }
  return data;
}

/** Add or update one keyframe (matching by time). The value may be a number or a string
 *  (filter/clipPath). Returns new data. */
export function setKeyframe(
  data: AnimData,
  stepIndex: number,
  selector: string,
  prop: string,
  time: number,
  value: number | string,
  ease?: string,
): AnimData {
  const next = clone(data);
  const step = next.steps[stepIndex];
  if (!step) return data;
  const t = round(Math.max(0, Math.min(time, step.duration)));
  const layer = (step.layers[selector] ??= {});
  const track = (layer[prop] ??= []);
  const existing = track.find((k) => Math.abs(k.time - t) < EPS);
  if (existing) {
    existing.value = typeof value === 'number' ? round(value) : value;
    if (ease !== undefined) existing.ease = ease;
  } else {
    const kf: AnimKeyframe = { time: t, value: typeof value === 'number' ? round(value) : value };
    if (ease) kf.ease = ease;
    track.push(kf);
    track.sort((a, b) => a.time - b.time);
  }
  return next;
}

/** Remove one property's keyframe at a time. Returns new data (pruned). */
export function deleteKeyframe(
  data: AnimData,
  stepIndex: number,
  selector: string,
  prop: string,
  time: number,
): AnimData {
  const next = clone(data);
  const track = next.steps[stepIndex]?.layers[selector]?.[prop];
  if (!track) return data;
  const at = track.findIndex((k) => Math.abs(k.time - time) < EPS);
  if (at === -1) return data;
  track.splice(at, 1);
  return prune(next);
}

/** Move EVERY property keyframe of a layer that sits at one time — the collapsed row's
 *  aggregate diamond drag. Clamped to the step; keyframes landing on another keyframe of
 *  the same track replace it (the drag wins). */
export function moveLayerKeyframes(
  data: AnimData,
  stepIndex: number,
  selector: string,
  fromTime: number,
  toTime: number,
): AnimData {
  const next = clone(data);
  const step = next.steps[stepIndex];
  const tracks = step?.layers[selector];
  if (!tracks) return data;
  const to = round(Math.max(0, Math.min(toTime, step.duration)));
  let moved = false;
  for (const kfs of Object.values(tracks)) {
    const at = kfs.findIndex((k) => Math.abs(k.time - fromTime) < EPS);
    if (at === -1) continue;
    const landed = kfs.findIndex((k, i) => i !== at && Math.abs(k.time - to) < EPS);
    const kf = kfs[at];
    kf.time = to;
    if (landed !== -1) kfs.splice(landed, 1);
    kfs.sort((a, b) => a.time - b.time);
    moved = true;
  }
  return moved ? next : data;
}

/** Delete EVERY property keyframe of a layer at one time — the aggregate diamond's Delete. */
export function deleteLayerKeyframes(
  data: AnimData,
  stepIndex: number,
  selector: string,
  time: number,
): AnimData {
  const next = clone(data);
  const tracks = next.steps[stepIndex]?.layers[selector];
  if (!tracks) return data;
  let removed = false;
  for (const kfs of Object.values(tracks)) {
    const at = kfs.findIndex((k) => Math.abs(k.time - time) < EPS);
    if (at !== -1) {
      kfs.splice(at, 1);
      removed = true;
    }
  }
  return removed ? prune(next) : data;
}
