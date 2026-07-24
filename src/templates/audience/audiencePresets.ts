// Audience motion presets. Same marked-region + knob contract as every category — this emit is
// the SOURCE the data block is converted from at create (shared/standard.ts convertToDataRegion).
//
// ONE contract, FIVE shapes. A viewer-question card has a kicker, a masked question and an
// attribution line; a chat highlight leads with the handle; a queue has a list and no byline at
// all. So each emitter asks `cfg.parts` what the design actually draws and writes motion only
// for that — the `hasBars` rule generalized (see PresetConfig.parts). Writing a tween for an
// element that is not there would put a phantom layer on the timeline and animate nothing.
//
// The audience structure contract (see shared.ts):
//   .audience (root, opacity:0) → .audience-box → [.audience-accent] [.audience-kicker]
//     [.audience-mask > .audience-question] [.audience-answer] [#audience-queue] [.audience-by]

import type { AnimPresetId } from '../../model/wizard';
import type { AnimPreset, PresetConfig } from '../lowerThirds/animPresets';

const MARK_OPEN = '/* == ANIMATION (generated — the Animation panel rewrites this block) == */';
const MARK_CLOSE = '/* == END ANIMATION == */';

function knobs(cfg: PresetConfig): string {
  return `var animSpeed = ${cfg.speed};  // 1 = normal · 0.75 = slower · 1.5 = faster
var easeIn = '${cfg.easeIn}';   // entrance ease — arrives fast, settles smooth
var easeOut = '${cfg.easeOut}';   // exit ease — starts naturally, leaves quickly`;
}

/** Does this design draw that part? Absent `parts` (a hand-written template the caller knew
 *  nothing about) reads as "yes", so a preset degrades to animating everything rather than
 *  silently animating nothing. */
const has = (cfg: PresetConfig, part: string): boolean => !cfg.parts || cfg.parts.includes(part);

/** The pieces of the entrance, in the order they arrive. Joined by the emitter below so each
 *  design's timeline holds exactly the lines its own markup earns. */
function entranceLines(cfg: PresetConfig, lead: string): string[] {
  const out: string[] = [lead];
  if (has(cfg, 'audience-kicker')) {
    out.push(`  tl.fromTo('.audience-kicker',                  // the kicker pops in over the panel
    { opacity: 0, y: -8 },
    { opacity: 1, y: 0, duration: 0.35 / animSpeed, ease: easeIn }, '-=0.3');`);
  }
  if (has(cfg, 'audience-mask')) {
    out.push(`  tl.fromTo('.audience-question',                 // the message slides up from behind its mask
    { yPercent: 110 },
    { yPercent: 0, duration: 0.55 / animSpeed, ease: easeIn }, '-=0.2');`);
  }
  if (has(cfg, 'audience-queue')) {
    out.push(`  tl.fromTo('#audience-queue',                    // the queue arrives as one block
    { opacity: 0, y: 14 },
    { opacity: 1, y: 0, duration: 0.45 / animSpeed, ease: easeIn }, '-=0.3');`);
  }
  if (has(cfg, 'audience-by')) {
    out.push(`  tl.fromTo('.audience-by',                       // the attribution settles in last
    { opacity: 0, y: 8 },
    { opacity: 1, y: 0, duration: 0.4 / animSpeed, ease: easeIn }, '-=0.25');`);
  }
  return out;
}

function emitPreset(cfg: PresetConfig, name: string, lead: string, outMotion: string): string {
  return `${MARK_OPEN}
// Preset: ${name}
${knobs(cfg)}

// buildInTimeline(): the graphic arrives — panel first, then everything the design carries.
function buildInTimeline() {
  var tl = gsap.timeline();
  tl.set('.audience', { opacity: 1 });            // reveal the (CSS-hidden) graphic
${entranceLines(cfg, lead).join('\n')}
  return tl;
}

// buildOutTimeline(): quick exit — the whole panel leaves, then the root hides.
function buildOutTimeline() {
  var tl = gsap.timeline();
${outMotion}
  tl.set('.audience', { opacity: 0 });            // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`;
}

export const AUDIENCE_PRESETS: AnimPreset[] = [
  {
    id: 'audience-rise' as AnimPresetId,
    name: 'Audience rise',
    description: 'The card fades up, the kicker pops, the message wipes up and the attribution settles in.',
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    emit: (cfg) =>
      emitPreset(
        cfg,
        'Audience rise — the card fades up and its parts arrive in reading order.',
        `  tl.fromTo('.audience-box',                      // the panel: fade + a small rise
    { opacity: 0, y: 22 },
    { opacity: 1, y: 0, duration: 0.5 / animSpeed, ease: easeIn });`,
        `  tl.to('.audience-box', { opacity: 0, y: -16, duration: 0.35 / animSpeed, ease: easeOut });`,
      ),
  },
  {
    id: 'audience-slide' as AnimPresetId,
    name: 'Audience slide',
    description: 'The card travels in from the left edge and leaves the way it came — the strap arrival.',
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    emit: (cfg) =>
      emitPreset(
        cfg,
        'Audience slide — the card travels in from the left and leaves the way it came.',
        `  tl.fromTo('.audience-box',                      // the panel travels in from the left edge
    { opacity: 0, x: -48 },
    { opacity: 1, x: 0, duration: 0.55 / animSpeed, ease: easeIn });`,
        `  tl.to('.audience-box', { opacity: 0, x: -32, duration: 0.35 / animSpeed, ease: easeOut });`,
      ),
  },
];

export function audiencePresetById(id: AnimPresetId): AnimPreset {
  const p = AUDIENCE_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown audience preset: ${id}`);
  return p;
}
