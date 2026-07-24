// Holding-screen motion presets. Same marked-region + knob contract as every category.
// A holding screen is CALM by design: one gentle entrance, a ticking clock, and a barely
// visible breath — nothing else moves. The countdown itself lives OUTSIDE the marked
// region (templates/shared/clock.ts); the preset only calls startClock() / stopClock().
//
// TWO presets, and the difference is only whether those two calls are there. Some holding
// screens have nothing honest to count — a technical pause cannot promise a time, an ended
// show is not waiting for anything — so they carry no clock at all and take the second one.
// The interpreter resolves a step's calls by NAME and treats a missing function as a no-op,
// so pointing a clock preset at a clock-less screen degrades to "no countdown", never a throw.
//
// The starting-soon structure contract (see shared.ts):
//   .starting-soon (root, opacity:0) → .starting-soon-box (the panel) → .starting-soon-mask #fN lines,
//     .starting-soon-clock when the design has one, and exactly one element with class
//     "starting-soon-pulse" — the breath target, which every design must have.

import type { AnimPresetId } from '../../model/wizard';
import type { AnimPreset, PresetConfig } from '../lowerThirds/animPresets';

const MARK_OPEN = '/* == ANIMATION (generated — the Animation panel rewrites this block) == */';
const MARK_CLOSE = '/* == END ANIMATION == */';

function knobs(cfg: PresetConfig): string {
  return `var animSpeed = ${cfg.speed};  // 1 = normal · 0.75 = slower · 1.5 = faster (also paces the breath)
var easeIn = '${cfg.easeIn}';   // entrance ease (the panel's rise — the breath stays sine)
var easeOut = '${cfg.easeOut}';   // exit ease (the fade-out)`;
}

export const SS_PRESETS: AnimPreset[] = [
  {
    id: 'hold-loop' as AnimPresetId,
    name: 'Hold loop',
    description: 'A calm hold — the panel fades in, the countdown starts, and one element breathes gently until stop().',
    autoEase: { easeIn: 'power2.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Hold loop — one gentle entrance, then the screen simply holds: the clock
// ticks and the pulse element breathes. Calm, not busy — it may hold for minutes.
${knobs(cfg)}

// The running timeline. killTweensOf('*') only reaches DOM tweens, so each build
// kills the previous timeline too — that also cancels a still-pending startClock call.
var activeTl = null;

// buildInTimeline(): fade the panel in, start the countdown, then breathe forever.
function buildInTimeline() {
  if (activeTl) activeTl.kill();               // cancel the previous in/out completely
  var tl = gsap.timeline();
  activeTl = tl;
  tl.set('.starting-soon', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.fromTo('.starting-soon-box',
    { opacity: 0, y: 24 },                     // start slightly low and invisible
    { opacity: 1, y: 0, duration: 0.7 / animSpeed, ease: easeIn }
  );
  tl.call(startClock);                         // the countdown begins as the panel settles
  // The ambient hold: a subtle breath on the pulse element, looping until stop().
  tl.fromTo('.starting-soon-pulse',
    { scale: 1 },
    {
      scale: 1.04,                             // barely there — a breath, not a bounce
      duration: 2.4 / animSpeed,               // slow enough to feel like waiting music
      ease: 'sine.inOut',                      // the softest curve for a loop
      yoyo: true,                              // back down as smoothly as up
      repeat: -1,                              // loop until stop()
    }
  );
  return tl;
}

// buildOutTimeline(): stop the countdown and fade the screen away.
function buildOutTimeline() {
  if (activeTl) activeTl.kill();               // a mid-entrance stop() must win cleanly
  var tl = gsap.timeline();
  activeTl = tl;
  tl.call(stopClock);                          // freeze the clock before it fades
  tl.to('.starting-soon-box', { opacity: 0, duration: 0.5 / animSpeed, ease: easeOut });
  tl.set('.starting-soon', { opacity: 0 });               // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },

  {
    id: 'hold-still' as AnimPresetId,
    // Not "Quiet hold": ss01 is a VARIANT called "Quiet Hold", and two things with the same
    // name in adjacent wizard steps is a papercut waiting to happen.
    name: 'Hold (no clock)',
    description: 'The same calm hold without a countdown — for screens that have nothing to count.',
    autoEase: { easeIn: 'power2.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Hold (no clock) — the same calm entrance and endless breath as Hold loop, with no
// countdown. Some holding screens have nothing honest to count: a technical pause cannot
// promise a time, and an "ended" card is not waiting for anything.
${knobs(cfg)}

// The running timeline. killTweensOf('*') only reaches DOM tweens, so each build
// kills the previous timeline too.
var activeTl = null;

// buildInTimeline(): fade the panel in, then breathe until stop().
function buildInTimeline() {
  if (activeTl) activeTl.kill();               // cancel the previous in/out completely
  var tl = gsap.timeline();
  activeTl = tl;
  tl.set('.starting-soon', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.fromTo('.starting-soon-box',
    { opacity: 0, y: 24 },                     // start slightly low and invisible
    { opacity: 1, y: 0, duration: 0.7 / animSpeed, ease: easeIn }
  );
  // The ambient hold: a subtle breath on the pulse element, looping until stop().
  tl.fromTo('.starting-soon-pulse',
    { scale: 1 },
    {
      scale: 1.04,                             // barely there — a breath, not a bounce
      duration: 2.4 / animSpeed,               // slow enough to feel like waiting music
      ease: 'sine.inOut',                      // the softest curve for a loop
      yoyo: true,                              // back down as smoothly as up
      repeat: -1,                              // loop until stop()
    }
  );
  return tl;
}

// buildOutTimeline(): fade the screen away.
function buildOutTimeline() {
  if (activeTl) activeTl.kill();               // a mid-entrance stop() must win cleanly
  var tl = gsap.timeline();
  activeTl = tl;
  tl.to('.starting-soon-box', { opacity: 0, duration: 0.5 / animSpeed, ease: easeOut });
  tl.set('.starting-soon', { opacity: 0 });               // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },
];

export function ssPresetById(id: AnimPresetId): AnimPreset {
  const p = SS_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown starting-soon preset: ${id}`);
  return p;
}
