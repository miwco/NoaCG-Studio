// Infographic motion presets. Same marked-region + knob contract as every category.
// Two data shapes, two presets:
//   - 'count-up' (stat designs): the big number counts from 0 to its value.
//   - 'bars-grow' (bar designs): every .ig-bar-fill grows to its data-value percent.
//
// The infographic structure contract (see shared.ts):
//   .ig (root, opacity:0) → .ig-box (the panel) → stat value #f0 / #ig-bars rows

import type { AnimPresetId } from '../../model/wizard';
import type { AnimPreset, PresetConfig } from '../lowerThirds/animPresets';

const MARK_OPEN = '/* == ANIMATION (generated — the Animation panel rewrites this block) == */';
const MARK_CLOSE = '/* == END ANIMATION == */';

function knobs(cfg: PresetConfig): string {
  return `var animSpeed = ${cfg.speed};  // 1 = normal · 0.75 = slower · 1.5 = faster
var easeIn = '${cfg.easeIn}';   // entrance ease — arrives fast, settles smooth
var easeOut = '${cfg.easeOut}';   // exit ease — starts naturally, leaves quickly`;
}

export const IG_PRESETS: AnimPreset[] = [
  {
    id: 'count-up' as AnimPresetId,
    name: 'Count up',
    description: 'The panel rises in, then the big number counts from zero up to its value.',
    autoEase: { easeIn: 'expo.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Count up — reveal the panel, then count the stat (#f0) from 0 to its value.
${knobs(cfg)}

// buildInTimeline(): panel fades and rises in, then the number counts up.
function buildInTimeline() {
  var el = document.getElementById('f0');
  // Read the target from data-target (update() keeps it current) — NOT from the live
  // textContent, which is a mid-count value like "43%" if the last play was interrupted.
  var text = el.getAttribute('data-target');
  if (text === null) {                         // first play before any update():
    text = el.textContent;                     // seed it from the markup once
    el.setAttribute('data-target', text);
  }
  var target = parseFloat(text.replace(/,/g, '')); // leading number: "1,234%" -> 1234
  var suffix = text.replace(/^\\s*[-+]?[0-9.,]+/, ''); // what follows it: '%', ' pts'…

  var tl = gsap.timeline();
  tl.set('.ig', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.fromTo('.ig-box',
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.6 / animSpeed, ease: easeIn }
  );

  // Count only when the text actually starts with a number — otherwise leave it alone.
  if (!isNaN(target)) {
    var counter = { value: 0 };                // a plain object GSAP can tween
    tl.set(el, { textContent: '0' + suffix }); // zero AFTER storing the target above
    tl.to(counter, {
      value: target,
      duration: 1.6 / animSpeed,
      ease: easeIn,
      onUpdate: function () {
        el.textContent = Math.round(counter.value) + suffix;  // whole numbers read best
      },
      onComplete: function () {
        el.textContent = text;                 // restore the exact text (keeps decimals)
      },
    }, '-=0.2');                               // start while the panel is still settling
  }
  return tl;
}

// buildOutTimeline(): quick fade away — exits run faster than entrances.
function buildOutTimeline() {
  var tl = gsap.timeline();
  tl.to('.ig-box', { opacity: 0, duration: 0.35 / animSpeed, ease: easeOut });
  tl.set('.ig', { opacity: 0 });               // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },

  {
    id: 'bars-grow' as AnimPresetId,
    name: 'Bars grow',
    description: 'The panel pops in, then the bars grow to their values one after another.',
    autoEase: { easeIn: 'back.out(1.4)', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Bars grow — pop the panel in, then each bar grows to its data-value percent.
// The staged reveal runs past the usual 0.5-0.9s entrance window on purpose: a data
// chart earns the extra beats (panel first, then one bar per stagger step).
${knobs(cfg)}

// buildInTimeline(): the panel pops in (glass-family entrance), then the bars grow.
function buildInTimeline() {
  var tl = gsap.timeline();
  tl.set('.ig', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.set('#ig-bars .ig-bar-fill', { width: '0%' });  // rebuilds render fills at value — empty them so they grow
  tl.fromTo('.ig-box',
    { opacity: 0, y: 20, scale: 0.95 },
    { opacity: 1, y: 0, scale: 1, duration: 0.6 / animSpeed, ease: easeIn }
  );
  // Each fill grows from empty to its own data-value (0–100, written by the rebuild).
  // Deliberate width tween (not scaleX): scaling would squash the fill's rounded cap.
  // Fills keep power3.out whatever the entrance ease — a data bar must land exactly
  // on its value, so the panel's back.out overshoot never applies to the bars.
  tl.fromTo('#ig-bars .ig-bar-fill',
    { width: '0%' },
    {
      width: function (i, el) { return el.getAttribute('data-value') + '%'; },
      duration: 0.9 / animSpeed,
      ease: 'power3.out',
      stagger: 0.12 / animSpeed,               // bars arrive one after another
    }
  );
  return tl;
}

// buildOutTimeline(): quick fade away, then reset the bars for the next play().
function buildOutTimeline() {
  var tl = gsap.timeline();
  tl.to('.ig-box', { opacity: 0, duration: 0.35 / animSpeed, ease: easeOut });
  tl.set('.ig', { opacity: 0 });               // fully hidden; ready to play again
  tl.set('#ig-bars .ig-bar-fill', { width: '0%' });  // bars grow again on replay
  return tl;
}
${MARK_CLOSE}`,
  },
];

export function igPresetById(id: AnimPresetId): AnimPreset {
  const p = IG_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown infographic preset: ${id}`);
  return p;
}
