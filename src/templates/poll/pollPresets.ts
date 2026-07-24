// Poll motion presets. Same marked-region + knob contract as every category — this emit is the
// SOURCE the data block is converted from at create (shared/standard.ts convertToDataRegion).
//
// The preset owns the board ARRIVING and LEAVING, and nothing else. The three moments that make
// it a poll rather than a list — the VOTE NOW badge going, the figures appearing, the bars
// growing — belong to the state timelines the type authors, because they happen when the
// operator says so, not when the graphic comes up.
//
// THE ENTRANCE CARRIES NO MEASURED MOTION, and that is a hard constraint rather than a taste
// call. The live-vote type arms its voting window as a `timer` transition out of the entrance
// state, and a timer arms when its state's timeline ENDS — so a builder on this step (whose
// return value the validator cannot see inside, and which may legitimately be endless) makes
// the window unarmable. `validateMachine` reports exactly that, which is how this was caught.
// So the option rows arrive as their CONTAINER, in ordinary finite keyframes; the per-row
// stagger lives in the result step, where the bars grow and there is no timer to strand.
//
// The poll structure contract (see shared.ts):
//   .poll (root, opacity:0) → .poll-box → .poll-mask > #f0 (question) · .poll-cue (the badge)
//     → #poll-rows (the option rows, rendered by pollRebuild) → .poll-foot > #f2

import type { AnimPresetId } from '../../model/wizard';
import type { AnimPreset, PresetConfig } from '../lowerThirds/animPresets';

const MARK_OPEN = '/* == ANIMATION (generated — the Animation panel rewrites this block) == */';
const MARK_CLOSE = '/* == END ANIMATION == */';

function knobs(cfg: PresetConfig): string {
  return `var animSpeed = ${cfg.speed};  // 1 = normal · 0.75 = slower · 1.5 = faster
var easeIn = '${cfg.easeIn}';   // entrance ease — arrives fast, settles smooth
var easeOut = '${cfg.easeOut}';   // exit ease — starts naturally, leaves quickly`;
}

export const POLL_PRESETS: AnimPreset[] = [
  {
    id: 'poll-open' as AnimPresetId,
    name: 'Poll open',
    description: 'Panel rises in, the question wipes up, the vote badge pops, the options cascade — the result is its own step.',
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Poll open — panel in, question mask-up, VOTE NOW badge, options cascade.
// The RESULT is not here: closing the vote, showing the figures and growing the bars are the
// board's own states, fired when the operator (or the voting timer) says so.
${knobs(cfg)}

// buildInTimeline(): the board arrives with voting open — no figures, no bars.
function buildInTimeline() {
  var tl = gsap.timeline();
  tl.set('.poll', { opacity: 1 });                // reveal the (CSS-hidden) graphic
  tl.fromTo('.poll-box',                          // the panel: fade + a small rise
    { opacity: 0, y: 22 },
    { opacity: 1, y: 0, duration: 0.5 / animSpeed, ease: easeIn });
  tl.fromTo('#f0',                                // the question slides up from behind its mask
    { yPercent: 110 },
    { yPercent: 0, duration: 0.55 / animSpeed, ease: easeIn }, '-=0.25');
  tl.fromTo('.poll-cue',                          // the VOTE NOW badge pops in last
    { scale: 0.8, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.4 / animSpeed, ease: 'back.out(2)' }, '-=0.3');
  // The options arrive as one block. Deliberately NOT a per-row stagger: the rows are rendered
  // from the operator's lines, so staggering them needs a measured builder — and a builder on
  // this step would leave the voting window's timer unable to arm (see the header).
  tl.fromTo('#poll-rows',
    { y: 14, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.45 / animSpeed, ease: easeIn }, '-=0.35');
  return tl;
}

// buildOutTimeline(): quick exit — the whole panel lifts away, then the root hides.
function buildOutTimeline() {
  var tl = gsap.timeline();
  tl.to('.poll-box', { opacity: 0, y: -16, duration: 0.35 / animSpeed, ease: easeOut });
  tl.set('.poll', { opacity: 0 });                // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },
];

export function pollPresetById(id: AnimPresetId): AnimPreset {
  const p = POLL_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown poll preset: ${id}`);
  return p;
}
