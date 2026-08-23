// Animation easing presets (GSAP ease strings). House doctrine (docs/DESIGN_LANGUAGE.md §4):
// movement must feel responsive but polished — never mechanical.
//
// - IN animations prefer an *Out-direction* curve (enter quickly, settle smoothly).
// - OUT animations prefer an *In-direction* curve (start naturally, exit quickly).
//   Each preset below therefore carries the correct GSAP ease for each phase.
// - Safe defaults: Easy Ease / Ease Out. Back = snappy pop with a small overshoot.
// - Bounce and Elastic are playful options only — never defaults.
// - Linear is only for continuous motion (tickers, timers, progress bars).
//
// MEASURED, 2026-08-23 (the owner: "I never use the dropdown menu because I feel like it
// doesn't change the easing"). The wizard's imported-SVG Animation step was driven for every
// one of the thirteen options the dropdown offers, and the composed preview read back: first
// the emitted NOACG_ANIM, then the RENDERED computed style at ten fixed frame times across the
// entrance, seeked through the template's own buildInTimeline(). What it found:
//
//  1. The choice REACHES the keyframes every time — the ease string is stamped into the
//     landing keyframe exactly as picked. Nothing is dropped on the way in. So the complaint
//     is not a broken control; it is a control whose effect is not visible.
//  2. Two entries are LITERAL DUPLICATES on an entrance: `cubic` and `ease-out` both emit
//     `power2.out` (identical rendered value at all ten frames — they differ only on the
//     exit), and `sine` is byte-identical to `auto` on any motion whose tuned entrance ease
//     is already `sine.out` (Fade).
//  3. On a CLAMPED property the overshoot eases have nowhere to go. On Fade (opacity only):
//     `back` clamps at 1 and reads as nothing but a faster fade; `bounce` renders 0.91 → 0.77
//     → 0.93, a flicker rather than a bounce; `elastic` is at opacity 1 by the first sampled
//     frame — the fade is gone. Same story on Wipe, where the ease drives an inset()
//     percentage that cannot go negative. This is the owner's own question ("How can you do a
//     back ease or bounce ease with a fade?") answered in numbers.
//  4. On a DISPLACEMENT motion the out-direction family is real but too small to read: against
//     Rise's tuned `power3.out`, the largest rendered difference across the whole entrance was
//     4.1 px for ease-out/cubic, 3.6 px for circ, 6.3 px for expo and 5.8 px for back — on a
//     1080-line frame, half a percent. Only the WRONG-direction curves (easy-ease, ease-in,
//     ease-in-out, linear) moved enough to see, and those are the ones the doctrine above
//     tells an entrance not to use. The cause is not the curve list: it is that the universal
//     bank only travelled 40 px, so no curve had anywhere to happen (blocks/motionPresets.ts).

export type EasingId =
  | 'auto'
  | 'linear'
  | 'easy-ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'back'
  | 'bounce'
  | 'elastic'
  | 'expo'
  | 'cubic'
  | 'sine'
  | 'circ';

export interface EasingPreset {
  id: Exclude<EasingId, 'auto'>;
  name: string;
  /** GSAP ease used for entrance (in) animations. */
  gsapIn: string;
  /** GSAP ease used for exit (out) animations. */
  gsapOut: string;
  description: string;
  /** 'standard' = safe pick · 'playful' = use sparingly · 'continuous' = loops/timers only. */
  tag: 'standard' | 'playful' | 'continuous';
}

export const EASINGS: EasingPreset[] = [
  {
    id: 'easy-ease',
    name: 'Easy Ease',
    gsapIn: 'power1.inOut',
    gsapOut: 'power1.inOut',
    description: 'Gentle S-curve at both ends — the classic smooth default.',
    tag: 'standard',
  },
  {
    id: 'ease-out',
    name: 'Ease Out',
    gsapIn: 'power2.out',
    gsapOut: 'power2.out',
    description: 'Fast start that settles softly — the safe pick for entrances.',
    tag: 'standard',
  },
  {
    id: 'ease-in',
    name: 'Ease In',
    gsapIn: 'power2.in',
    gsapOut: 'power2.in',
    description: 'Gentle start that accelerates — the natural pick for exits.',
    tag: 'standard',
  },
  {
    id: 'ease-in-out',
    name: 'Ease In-Out',
    gsapIn: 'power2.inOut',
    gsapOut: 'power2.inOut',
    description: 'A stronger S-curve than Easy Ease — smooth both ends, more drive in the middle.',
    tag: 'standard',
  },
  {
    id: 'cubic',
    name: 'Cubic',
    gsapIn: 'power2.out',
    gsapOut: 'power2.in',
    description: 'The cubic family with the right direction per phase: out on entry, in on exit.',
    tag: 'standard',
  },
  {
    id: 'sine',
    name: 'Sine',
    gsapIn: 'sine.out',
    gsapOut: 'sine.in',
    description: 'The softest curve — subtle, almost linear, but never mechanical.',
    tag: 'standard',
  },
  {
    id: 'circ',
    name: 'Circ',
    gsapIn: 'circ.out',
    gsapOut: 'circ.in',
    description: 'Rounder than cubic — a strong arrival that eases off late.',
    tag: 'standard',
  },
  {
    id: 'expo',
    name: 'Expo',
    gsapIn: 'expo.out',
    gsapOut: 'expo.in',
    description: 'Dramatic: arrives very fast, settles very late. Great for reveals.',
    tag: 'standard',
  },
  {
    id: 'back',
    name: 'Back',
    gsapIn: 'back.out(1.6)',
    gsapOut: 'back.in(1.4)',
    description: 'Snappy pop with a small overshoot in, and a little anticipation out.',
    tag: 'standard',
  },
  {
    id: 'bounce',
    name: 'Bounce',
    gsapIn: 'bounce.out',
    gsapOut: 'power2.in',
    description: 'Lands with bounces. Playful — not a default. Exits cleanly (no bounce out).',
    tag: 'playful',
  },
  {
    id: 'elastic',
    name: 'Elastic',
    // The period was 0.4, which the measurement above caught rendering as a single frame's
    // glitch rather than a spring: on a 0.55 s entrance it had already settled by the first
    // sampled frame (opacity 1.00 at t = 0.055 s), with one -10 px flick on the way. 0.7 is
    // slow enough that the oscillation is the thing you see.
    gsapIn: 'elastic.out(1, 0.7)',
    gsapOut: 'power2.in',
    description: 'Springs past and oscillates into place. Playful — not a default.',
    tag: 'playful',
  },
  {
    id: 'linear',
    name: 'Linear',
    gsapIn: 'none',
    gsapOut: 'none',
    description: 'Constant speed. Only for continuous motion: tickers, timers, progress bars.',
    tag: 'continuous',
  },
];

export function easingById(id: Exclude<EasingId, 'auto'>): EasingPreset {
  const e = EASINGS.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown easing preset: ${id}`);
  return e;
}

/**
 * Resolve the { easeIn, easeOut } GSAP strings for a choice: 'auto' uses the animation
 * preset's hand-tuned pair; anything else uses the easing preset's phase-correct pair.
 */
export function resolveEasing(
  choice: EasingId,
  autoPair: { easeIn: string; easeOut: string },
): { easeIn: string; easeOut: string } {
  if (choice === 'auto') return autoPair;
  const e = easingById(choice);
  return { easeIn: e.gsapIn, easeOut: e.gsapOut };
}
