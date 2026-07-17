// Versus-card motion presets. Same marked-region + knob contract as every category. Both
// presets choreograph the category's signature move - the two sides slide in from their own
// edges and MEET at the middle, where the VS mark pops - at two temperatures:
//
//   vs-slam  - the collision: a fast power4 charge, the VS punches in with a hard back-out
//              overshoot on the impact, the accent flashes. Match-night aggressive.
//   vs-glide - the approach: a longer power3 glide, the VS blooms with a softer spring,
//              the accent and event line settle in last. Big-event ceremonial.
//
// The versus structure contract (see shared.ts):
//   .versus (root, opacity:0) -> .versus-box (the full-frame stage) holding
//     .versus-side-a / .versus-side-b (the team columns), .versus-center (the VS mark),
//     .versus-bottom (the event/date line) and, when the design has one, .versus-accent
//     (vs01's bottom hairline, vs02's collision seam - presets only ever FADE it, so the
//     same choreography reads right on both shapes).
//
// Every tween uses real keyframes on transform/opacity only (no measured motion), so the
// region converts cleanly into the NOACG_ANIM data block at create (shared/standard.ts
// convertToDataRegion). Entrances use Out-easings, exits In-easings and run faster
// (docs/DESIGN_LANGUAGE.md section 4).

import type { AnimPresetId } from '../../model/wizard';
import type { AnimPreset, PresetConfig } from '../lowerThirds/animPresets';

const MARK_OPEN = '/* == ANIMATION (generated — the Animation panel rewrites this block) == */';
const MARK_CLOSE = '/* == END ANIMATION == */';

// The versus preset ids (registered in model/wizard.ts's AnimPresetId union and in
// blocks/presetRegistry.ts, like every category's presets).
export const VS_SLAM_ID: AnimPresetId = 'vs-slam';
export const VS_GLIDE_ID: AnimPresetId = 'vs-glide';

function knobs(cfg: PresetConfig): string {
  return `var animSpeed = ${cfg.speed};  // 1 = normal · 0.75 = slower · 1.5 = faster
var easeIn = '${cfg.easeIn}';   // entrance ease — arrives fast, settles smooth
var easeOut = '${cfg.easeOut}';   // exit ease — starts naturally, leaves quickly`;
}

export const VS_PRESETS: AnimPreset[] = [
  {
    id: VS_SLAM_ID,
    name: 'Versus slam',
    description: 'The two sides charge in and collide - the VS punches in on the impact.',
    autoEase: { easeIn: 'power4.out', easeOut: 'power3.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Versus slam — the two sides charge in from their own edges and collide at the
// middle; the VS mark punches in on the impact with a hard back-out overshoot${cfg.hasAccent ? ', the accent\n// flashes on,' : ''} and the
// event line rises last. The exit reverses the collision, faster.
${knobs(cfg)}

// buildInTimeline(): stage up → sides charge → impact (VS pop) → event line.
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.fromTo('.${cfg.prefix}-box',
    { opacity: 0 },                              // the stage (mood layers) fades up under everything
    { opacity: 1, duration: 0.25 / animSpeed },
    0
  );
  tl.fromTo('.${cfg.prefix}-side-a',
    { x: -1100 },                                // team A starts fully OFF the left edge
    { x: 0, duration: 0.55 / animSpeed },
    0
  );
  tl.fromTo('.${cfg.prefix}-side-b',
    { x: 1100 },                                 // team B mirrors from the right edge
    { x: 0, duration: 0.55 / animSpeed },
    0
  );
  tl.fromTo('.${cfg.prefix}-side-a',
    { opacity: 0 },                              // a fast fade so the charge never pops from nothing
    { opacity: 1, duration: 0.15 / animSpeed },
    0
  );
  tl.fromTo('.${cfg.prefix}-side-b',
    { opacity: 0 },
    { opacity: 1, duration: 0.15 / animSpeed },
    0
  );
  tl.fromTo('.${cfg.prefix}-center',
    { scale: 0.2 },                              // the VS mark punches in on the impact…
    { scale: 1, duration: 0.35 / animSpeed, ease: 'back.out(2.4)' },  // …with a hard overshoot
    0.5 / animSpeed
  );
  tl.fromTo('.${cfg.prefix}-center',
    { opacity: 0 },
    { opacity: 1, duration: 0.1 / animSpeed },
    0.5 / animSpeed
  );${
      cfg.hasAccent
        ? `
  tl.fromTo('.${cfg.prefix}-accent',
    { opacity: 0 },                              // the accent flashes on with the impact
    { opacity: 1, duration: 0.2 / animSpeed },
    0.52 / animSpeed
  );`
        : ''
    }
  tl.fromTo('.${cfg.prefix}-bottom',
    { y: 40, opacity: 0 },                       // the event line rises once the dust settles
    { y: 0, opacity: 1, duration: 0.3 / animSpeed },
    0.7 / animSpeed
  );
  return tl;
}

// buildOutTimeline(): the collision in reverse — exits run faster than entrances.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.${cfg.prefix}-bottom', { y: 30, opacity: 0, duration: 0.2 / animSpeed }, 0);${
      cfg.hasAccent
        ? `
  tl.to('.${cfg.prefix}-accent', { opacity: 0, duration: 0.25 / animSpeed }, 0);`
        : ''
    }
  tl.to('.${cfg.prefix}-center', { scale: 0.6, opacity: 0, duration: 0.25 / animSpeed }, 0);
  tl.to('.${cfg.prefix}-side-a', { x: -1100, opacity: 0, duration: 0.4 / animSpeed }, 0.05 / animSpeed);
  tl.to('.${cfg.prefix}-side-b', { x: 1100, opacity: 0, duration: 0.4 / animSpeed }, 0.05 / animSpeed);
  tl.to('.${cfg.prefix}-box', { opacity: 0, duration: 0.35 / animSpeed }, 0.15 / animSpeed);
  tl.set('.${cfg.prefix}', { opacity: 0 });               // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },

  {
    id: VS_GLIDE_ID,
    name: 'Versus glide',
    description: 'The two sides glide in and meet - the VS blooms softly at the middle.',
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Versus glide — the ceremonial take on the meet-in-the-middle move: the stage
// glows up, the two sides glide in on a long power curve, the VS blooms with a soft
// spring${cfg.hasAccent ? ', and the accent and event line settle in last' : ', and the event line settles in last'}.
${knobs(cfg)}

// buildInTimeline(): stage up → sides glide in → VS blooms → event line settles.
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.fromTo('.${cfg.prefix}-box',
    { opacity: 0 },                              // the stage (mood layers) fades up under everything
    { opacity: 1, duration: 0.4 / animSpeed },
    0
  );
  tl.fromTo('.${cfg.prefix}-side-a',
    { x: -1200, opacity: 0 },                    // team A glides in from the left edge…
    { x: 0, opacity: 1, duration: 0.9 / animSpeed },
    0.15 / animSpeed
  );
  tl.fromTo('.${cfg.prefix}-side-b',
    { x: 1200, opacity: 0 },                     // …team B mirrors from the right, in step
    { x: 0, opacity: 1, duration: 0.9 / animSpeed },
    0.15 / animSpeed
  );
  tl.fromTo('.${cfg.prefix}-center',
    { scale: 0.4, opacity: 0 },                  // the VS blooms as the sides arrive
    { scale: 1, opacity: 1, duration: 0.6 / animSpeed, ease: 'back.out(2.2)' },
    0.75 / animSpeed
  );${
      cfg.hasAccent
        ? `
  tl.fromTo('.${cfg.prefix}-accent',
    { opacity: 0 },                              // the accent glows in with the closing beat
    { opacity: 1, duration: 0.5 / animSpeed },
    1.0 / animSpeed
  );`
        : ''
    }
  tl.fromTo('.${cfg.prefix}-bottom',
    { y: 60, opacity: 0 },                       // the event line settles in last
    { y: 0, opacity: 1, duration: 0.6 / animSpeed },
    1.0 / animSpeed
  );
  return tl;
}

// buildOutTimeline(): everything folds back toward the edges — faster than the entrance.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.${cfg.prefix}-bottom', { y: 40, opacity: 0, duration: 0.3 / animSpeed }, 0);${
      cfg.hasAccent
        ? `
  tl.to('.${cfg.prefix}-accent', { opacity: 0, duration: 0.3 / animSpeed }, 0);`
        : ''
    }
  tl.to('.${cfg.prefix}-center', { scale: 0.7, opacity: 0, duration: 0.3 / animSpeed }, 0.05 / animSpeed);
  tl.to('.${cfg.prefix}-side-a', { x: -1200, opacity: 0, duration: 0.45 / animSpeed }, 0.1 / animSpeed);
  tl.to('.${cfg.prefix}-side-b', { x: 1200, opacity: 0, duration: 0.45 / animSpeed }, 0.1 / animSpeed);
  tl.to('.${cfg.prefix}-box', { opacity: 0, duration: 0.4 / animSpeed }, 0.2 / animSpeed);
  tl.set('.${cfg.prefix}', { opacity: 0 });               // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },
];

export function versusPresetById(id: AnimPresetId): AnimPreset {
  const p = VS_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown versus preset: ${id}`);
  return p;
}
