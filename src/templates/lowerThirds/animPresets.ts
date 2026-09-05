// GSAP animation presets for lower thirds. Each preset emits the complete, commented
// "ANIMATION" block of template.js — the marked region the Animation panel is allowed to
// rewrite. Everything outside the markers (play/stop/update/next scaffolding) never changes.
//
// Presets rely on the standard structure contract, parameterized by a class PREFIX so every
// category shares this library (lower thirds use "lower-third", info cards "info-card", …):
//   .<p> (root, opacity:0 until play) → .<p>-accent? → .<p>-box → .<p>-mask > #fN line elements
// Because the structure is standard, ANY preset applies to ANY variant of ANY category.
//
// Easing contract (docs/DESIGN_LANGUAGE.md §4): the emitted block declares `easeIn` and
// `easeOut` variables that every tween references — one obvious place to change the feel.
// Entrances default to Out-direction curves (arrive fast, settle smooth); exits default to
// In-direction curves (start naturally, leave quickly) and run 30–40 % faster than entrances.
// Each preset carries a hand-tuned `autoEase` pair; the wizard's easing presets
// (model/easings.ts) can override it.

import type { AnimPresetId } from '../../model/wizard';

/** A template's existing Continue chain, carried through re-emits so a preset swap never
 *  resets the user's regrouping or per-step timing. Values are the RAW literals the arrays
 *  are written with (durations pre-division, eases 'easeIn' or a quoted string). */
export interface StepChain {
  /** Parts revealed per » Next press — any registry part selector, not just lines. */
  groups: string[][];
  durations: string[];
  eases: string[];
  /** Reveal channel per assigned selector: 'mask' slides within a line mask, 'rise' is the
   *  generic fade+rise for everything else (accents, logos). Lines default to 'mask'. */
  reveals: Record<string, 'mask' | 'rise'>;
}

export interface PresetConfig {
  /** The category's class prefix ('lower-third', 'info-card', 'credits', 'ticker'). */
  prefix: string;
  /** How many visible text lines (#f0…#fN) the design has. */
  lineCount: number;
  /** Whether the design has a .<prefix>-accent element. */
  hasAccent: boolean;
  /** Whether the design pairs a progress bar with its stat (a .<prefix>-bar-fill element).
   *  Only the infographic count-up preset asks: its designs may or may not carry one, and a
   *  preset must not write motion for an element that isn't there (a phantom timeline layer). */
  hasBars?: boolean;
  /**
   * Which of a category's OPTIONAL parts this design actually draws, as bare class tokens
   * ('audience-kicker', 'audience-by', …). Same job as `hasBars`, generalized: the audience
   * category is one contract worn five ways — a question card has a kicker and an attribution
   * line, a queue has neither — and a preset must not write motion for an element that is not
   * there. Filled from the HTML by both the assembler and `emitPresetRegion`, so a preset
   * re-applied after creation sees exactly what the create-time emit saw.
   */
  parts?: string[];
  /**
   * An imported SVG's own LAYERS — the selectors of its top-level named groups, in document
   * order (model/structure.ts svgLayerSelectors; docs/SVG_IMPORT_PLAN.md §3 phase 2). Same
   * job as `parts`, for a design whose structure the designer drew rather than a category
   * declared: the per-layer stagger preset animates exactly these, and a preset must not
   * write motion for a layer that is not there. Filled from the markup by both the SVG
   * assembler and `emitPresetRegion`, so a re-applied preset sees what create saw. Absent
   * or empty on every other design — the stagger then degrades to its whole-unit motion.
   */
  layers?: string[];
  /**
   * An imported SVG's own FIELDS — `#f0`, `#f1`, … in document order, the words the operator
   * types (model/structure.ts svgFieldSelectors).
   *
   * They are NOT layers and are deliberately kept apart from `layers`: the layer list is the
   * element-identity contract the timeline strip and the canvas read, and a field is already a
   * part there, so widening it would put every word in the timeline twice. What the per-layer
   * stagger needs is a MEMBER LIST, which is both — the owner asked for exactly that
   * (2026-09-05: "the text is in its own fields, the effect should stagger the text also"), and
   * before it the words sat at full opacity from the first frame while the artwork behind them
   * arrived. Absent or empty on every design whose artwork is not an inlined SVG.
   */
  fields?: string[];
  /** Multi-step mode: in-timeline shows line 1; each next() reveals one more line. */
  steps: boolean;
  /** The current chain to preserve (when the template already has one); absent = defaults. */
  stepChain?: StepChain;
  /** Assigned chain selectors whose element lives OUTSIDE the .<prefix> root (building-block
   *  elements sit next to the root, not inside it) — they miss the root's opacity gate, so the
   *  steps block hides them from first paint. On a data template the exit side is the
   *  interpreter's job (it fades press-revealed layers outside the root with the Out step). */
  stepOutsideParts?: string[];
  /** Initial animSpeed value (0.75 slower · 1 normal · 1.5 faster). */
  speed: number;
  /** GSAP ease string for entrance tweens (e.g. 'power3.out', 'back.out(1.6)'). */
  easeIn: string;
  /** GSAP ease string for exit tweens (e.g. 'power2.in'). */
  easeOut: string;
}

export interface AnimPreset {
  id: AnimPresetId;
  name: string;
  description: string;
  /** The preset's hand-tuned ease pair, used when the easing choice is 'auto'. */
  autoEase: { easeIn: string; easeOut: string };
  /** Emit the full marked ANIMATION block for template.js. */
  emit(cfg: PresetConfig): string;
  /**
   * STRUCTURAL: this preset only works alongside code the assembler writes OUTSIDE the marked
   * region at create time - runtime knobs, extra CSS, a state machine. Applying a preset after
   * creation rewrites the DATA and nothing else (blocks/presetApply.ts), so swapping a
   * structural one in leaves the data and that outside code disagreeing, and the graphic ends
   * up silently inert. Such a preset is a create-time choice, offered by the wizard (a variant
   * lists it in `animationPresets`) and withheld from the post-creation picker.
   */
  structural?: boolean;
}

const MARK_OPEN = '/* == ANIMATION (generated — the Animation panel rewrites this block) == */';
const MARK_CLOSE = '/* == END ANIMATION == */';

/** Selectors for the visible line elements, e.g. "'#f0', '#f1'". */
function lineList(count: number): string {
  return Array.from({ length: count }, (_, i) => `'#f${i}'`).join(', ');
}

/** The selectors a preset's steps world currently assigns to presses (empty = defaults). */
function assignedSet(cfg: PresetConfig): Set<string> {
  if (!cfg.steps) return new Set();
  if (cfg.stepChain) return new Set(cfg.stepChain.groups.flat());
  return new Set(Array.from({ length: Math.max(0, cfg.lineCount - 1) }, (_, i) => `#f${i + 1}`));
}

/** The lines that enter WITH the in-timeline: everything not assigned to a » press.
 *  (Default steps mode: only line 1 enters; the rest wait for next().) */
function linesInIntro(cfg: PresetConfig): string {
  if (!cfg.steps) return lineList(cfg.lineCount);
  const assigned = assignedSet(cfg);
  return Array.from({ length: cfg.lineCount }, (_, i) => `#f${i}`)
    .filter((s) => !assigned.has(s))
    .map((s) => `'${s}'`)
    .join(', ');
}

/**
 * Shared header of the marked block: the three knobs every tween reads.
 * Change these to retime or re-ease the whole graphic.
 */
function knobs(cfg: PresetConfig): string {
  return `var animSpeed = ${cfg.speed};${' '.repeat(Math.max(1, 21 - String(cfg.speed).length))}// 1 = normal · 0.75 = slower · 1.5 = faster
var easeIn = '${cfg.easeIn}';${' '.repeat(Math.max(1, 18 - cfg.easeIn.length))}// entrance ease — arrives fast, settles smooth
var easeOut = '${cfg.easeOut}';${' '.repeat(Math.max(1, 17 - cfg.easeOut.length))}// exit ease — starts naturally, leaves quickly`;
}

/** The multi-step block: each next() (SPX Continue) reveals the next GROUP of parts.
 *  Groups + per-step timing/ease live in the arrays; each part's reveal style lives in
 *  stepReveals — the timeline strip edits these literals. Pre-hiding is DERIVED from
 *  stepGroups at runtime (hidePendingSteps), so a part removed from every group appears
 *  with the graphic again, by construction. */
function stepsBlock(cfg: PresetConfig): string {
  if (!cfg.steps) return '';
  // An existing chain (regrouped presses, tuned timings, assigned parts) survives the
  // re-emit; without one, the default is one line per press in document order.
  const chain = cfg.stepChain && cfg.stepChain.groups.length > 0 ? cfg.stepChain : null;
  if (!chain && cfg.lineCount < 2) return '';
  const count = chain ? chain.groups.length : cfg.lineCount - 1;
  const groups = chain
    ? chain.groups.map((g) => `[${g.map((t) => `'${t}'`).join(', ')}]`).join(', ')
    : Array.from({ length: count }, (_, i) => `['#f${i + 1}']`).join(', ');
  const durations = (chain ? chain.durations : Array.from({ length: count }, () => '0.45')).join(', ');
  const eases = (chain ? chain.eases : Array.from({ length: count }, () => 'easeIn')).join(', ');
  const revealEntries = chain
    ? chain.groups.flat().map((sel) => `'${sel}': '${chain.reveals[sel] ?? 'mask'}'`)
    : Array.from({ length: count }, (_, i) => `'#f${i + 1}': 'mask'`);
  return `

// Multi-step: the in animation shows only the parts that are NOT on a » press; each
// Continue (next()) reveals the next GROUP. Groups + per-step timing below — the
// timeline strip edits these. stepReveals says HOW each part appears: 'mask' slides
// up within its line mask, 'rise' fades and rises (accents, logos, shapes).
var currentStep = 0;
var stepGroups = [${groups}];  // parts revealed per Continue, in order
var stepDurations = [${durations}];  // seconds per step (divided by animSpeed)
var stepEases = [${eases}];  // ease per step (a quoted string overrides the knob)
var stepReveals = { ${revealEntries.join(', ')} };
function hidePendingSteps(tl) {
  currentStep = 0;                         // a fresh play restarts the step sequence
  stepGroups.forEach(function (group) { group.forEach(function (sel) {
    tl.set(sel, stepReveals[sel] === 'rise' ? { opacity: 0, y: 14 } : { yPercent: 110 });
  }); });
}
function revealNextStep() {
  var group = stepGroups[currentStep];
  if (group === undefined) return null;    // no more steps
  var duration = stepDurations[currentStep] || 0.45;
  var ease = stepEases[currentStep] || easeIn;
  currentStep += 1;
  var tl = gsap.timeline();
  group.forEach(function (sel, i) {
    var rise = stepReveals[sel] === 'rise';
    tl.fromTo(sel,
      rise ? { opacity: 0, y: 14 } : { yPercent: 110 },
      rise ? { opacity: 1, y: 0, duration: duration / animSpeed, ease: ease }
           : { yPercent: 0, duration: duration / animSpeed, ease: ease },
      i * 0.08 / animSpeed                 // per-part stagger within the press
    );
  });
  return tl;
}${outsideGate(cfg)}`;
}

/** The load-side of the outside gate: press-assigned parts that live OUTSIDE the root are
 *  not covered by its rest-hide (the root is CSS-hidden until play; its children with it),
 *  so they must hide themselves from the first paint. The exit side belongs to the data
 *  interpreter, which fades press-revealed layers outside the root with the Out step. */
function outsideGate(cfg: PresetConfig): string {
  const outside = cfg.stepOutsideParts ?? [];
  if (!cfg.steps || outside.length === 0) return '';
  return `

// Parts on a » press that live OUTSIDE the graphic's root miss its opacity gate (the
// root is CSS-hidden until play, and its children with it). Hide them from the first
// paint so nothing shows before play — DOM-ready-safe: this file loads in <head>.
var stepOutsideParts = [${outside.map((s) => `'${s}'`).join(', ')}];
function hideOutsideStepParts() {
  stepOutsideParts.forEach(function (sel) { gsap.set(sel, { opacity: 0, y: 14 }); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hideOutsideStepParts);
else hideOutsideStepParts();`;
}

/** In steps mode, park the press-assigned parts hidden at the start of the in-timeline.
 *  The set of parts and HOW each hides live with the steps block (derived from stepGroups),
 *  so regrouping and unassigning never leave a part stuck hidden. */
function hideStepLines(cfg: PresetConfig): string {
  if (stepsBlock(cfg) === '') return '';
  return `
  hidePendingSteps(tl);                            // parts on a » press start hidden`;
}

/** The Slide family — one choreography, four directions of travel. Kept as four plain
 *  presets (not one parameterized preset) so every consumer of the library — the preset
 *  registry, the keyframe deriver, the Animations tab — handles them like any other id. */
const SLIDE_DIRECTIONS = {
  up: {
    name: 'Slide up',
    description: 'Rises into place from below and sinks back down to leave. Quiet and universal.',
    comment: 'the whole graphic rises in from below; text lines follow in sequence',
    boxFrom: 'y: 26',
    boxOut: 'y: 18',
    lineFrom: '{ yPercent: 110 }',                   // below the mask edge
    lineTo: '{ yPercent: 0',
  },
  down: {
    name: 'Slide down',
    description: 'Settles in from above and lifts back up to leave. Calm and headline-like.',
    comment: 'the whole graphic settles in from above; text lines follow in sequence',
    boxFrom: 'y: -26',
    boxOut: 'y: -18',
    lineFrom: '{ yPercent: -110 }',                  // above the mask edge
    lineTo: '{ yPercent: 0',
  },
  left: {
    name: 'Slide left',
    description: 'Glides in from the right edge and slips back out that way. Lateral and smooth.',
    comment: 'the whole graphic glides in travelling left; text lines drift after it',
    boxFrom: 'x: 60',
    boxOut: 'x: 44',
    lineFrom: '{ x: 24, opacity: 0 }',
    lineTo: '{ x: 0, opacity: 1',
  },
  right: {
    name: 'Slide right',
    description: 'Glides in from the left edge and slips back out that way. Lateral and smooth.',
    comment: 'the whole graphic glides in travelling right; text lines drift after it',
    boxFrom: 'x: -60',
    boxOut: 'x: -44',
    lineFrom: '{ x: -24, opacity: 0 }',
    lineTo: '{ x: 0, opacity: 1',
  },
} as const;

export type SlideDirection = keyof typeof SLIDE_DIRECTIONS;

function makeSlidePreset(dir: SlideDirection): AnimPreset {
  const d = SLIDE_DIRECTIONS[dir];
  return {
    id: `slide-${dir}` as AnimPresetId,
    name: d.name,
    description: d.description,
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: ${d.name} — ${d.comment}.
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}
  tl.fromTo('.${cfg.prefix}-box',
    { ${d.boxFrom}, opacity: 0 },
    { ${d.boxFrom.startsWith('x') ? 'x' : 'y'}: 0, opacity: 1, duration: 0.55 / animSpeed }
  );
  tl.fromTo([${linesInIntro(cfg)}],
    ${d.lineFrom},
    ${d.lineTo}, duration: 0.5 / animSpeed, stagger: 0.09 / animSpeed },
    '-=0.3'                                          // overlap with the box for flow
  );
  return tl;
}

// buildOutTimeline(): the exit — slips back toward where it came from, faster.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.${cfg.prefix}-box', { ${d.boxOut}, opacity: 0, duration: 0.35 / animSpeed });
  tl.set('.${cfg.prefix}', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  };
}

/** The four slide ids, adjacent so pickers can group them as one family. */
export const SLIDE_FAMILY: AnimPresetId[] = ['slide-up', 'slide-down', 'slide-left', 'slide-right'];

export function isSlidePreset(id: AnimPresetId): boolean {
  return SLIDE_FAMILY.includes(id);
}

export const ANIM_PRESETS: AnimPreset[] = [
  makeSlidePreset('up'),
  makeSlidePreset('down'),
  makeSlidePreset('left'),
  makeSlidePreset('right'),

  {
    id: 'line-reveal',
    name: 'Line reveal',
    description: 'The accent line draws in, the panel follows it open, text slides up from behind its mask.',
    autoEase: { easeIn: 'expo.out', easeOut: 'power3.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Line reveal — the accent draws in, the panel follows it open, text slides up.
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}${
    cfg.hasAccent
      ? `
  tl.fromTo('.${cfg.prefix}-accent',
    { scaleX: 0, transformOrigin: 'left center' },   // the line grows from its left end
    { scaleX: 1, duration: 0.6 / animSpeed }         // an unhurried draw — this preset takes its time
  );
  tl.fromTo('.${cfg.prefix}-box',
    { clipPath: 'inset(0 100% 0 0)', opacity: 0 },   // the panel draws open behind the line…
    { clipPath: 'inset(0 0% 0 0)', opacity: 1, duration: 0.65 / animSpeed },
    '-=0.35'                                         // …overlapping the accent draw
  );`
      : `
  tl.fromTo('.${cfg.prefix}-box',
    { clipPath: 'inset(0 100% 0 0)', opacity: 0 },   // the panel draws open left to right
    { clipPath: 'inset(0 0% 0 0)', opacity: 1, duration: 0.65 / animSpeed }
  );`
  }
  tl.fromTo([${linesInIntro(cfg)}],
    { yPercent: 110 },                               // start hidden below the mask edge
    { yPercent: 0, duration: 0.7 / animSpeed, stagger: 0.14 / animSpeed },
    '-=0.4'
  );
  tl.set('.${cfg.prefix}-box', { clearProps: 'clipPath' });     // drop the clip once open — skewed ::before/::after layers may poke past the box
  return tl;
}

// buildOutTimeline(): the exit — text drops back, accent retracts, the panel sweeps off.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to([${lineList(cfg.lineCount)}], { yPercent: 110, duration: 0.35 / animSpeed, stagger: 0.05 / animSpeed });${
    cfg.hasAccent
      ? `
  tl.to('.${cfg.prefix}-accent', { scaleX: 0, transformOrigin: 'right center', duration: 0.3 / animSpeed }, '-=0.1');`
      : ''
  }
  tl.fromTo('.${cfg.prefix}-box',
    { clipPath: 'inset(0 0% 0 0%)' },                // re-arm the clip (the entrance cleared it)…
    { clipPath: 'inset(0 0% 0 100%)', opacity: 0, duration: 0.3 / animSpeed },  // …the panel sweeps off after the line, fading
    '-=0.15');
  tl.set('.${cfg.prefix}', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  },

  {
    id: 'mask-wipe',
    name: 'Mask wipe',
    description: 'The panel wipes open left-to-right like a curtain, and wipes shut the other way.',
    autoEase: { easeIn: 'expo.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Mask wipe — the panel reveals via a clip-path wipe; text follows just behind.
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}
  tl.fromTo('.${cfg.prefix}-box',
    { clipPath: 'inset(0 100% 0 0)' },               // fully clipped from the right…
    { clipPath: 'inset(0 0% 0 0)', duration: 0.85 / animSpeed }  // …wipes open, curtain-slow
  );
  tl.fromTo([${linesInIntro(cfg)}],
    { x: -24, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.55 / animSpeed, stagger: 0.1 / animSpeed },
    '-=0.5'
  );
  tl.set('.${cfg.prefix}-box', { clearProps: 'clipPath' });     // drop the clip once open — skewed ::before/::after layers may poke past the box
  return tl;
}

// buildOutTimeline(): the exit — wipes closed the way it came, a touch faster.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to([${lineList(cfg.lineCount)}], { opacity: 0, duration: 0.2 / animSpeed });
  tl.fromTo('.${cfg.prefix}-box',
    { clipPath: 'inset(0 0% 0 0%)' },                // re-arm the clip (the entrance cleared it)…
    { clipPath: 'inset(0 0% 0 100%)', duration: 0.4 / animSpeed },  // …and wipe closed
    '-=0.1');
  tl.set('.${cfg.prefix}', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  },

  {
    id: 'pop-spring',
    name: 'Pop spring',
    description: 'Pops up with a springy overshoot and shrinks away cleanly. Social-stream energy.',
    autoEase: { easeIn: 'back.out(1.6)', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Pop spring — the card pops in with a springy overshoot (Back Out ease).
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}
  tl.fromTo('.${cfg.prefix}-box',
    { scale: 0.9, y: 24, opacity: 0 },
    { scale: 1, y: 0, opacity: 1, duration: 0.6 / animSpeed }
  );
  tl.fromTo([${linesInIntro(cfg)}],
    { y: 14, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.4 / animSpeed, stagger: 0.07 / animSpeed },
    '-=0.25'
  );
  return tl;
}

// buildOutTimeline(): the exit — shrinks away quickly, no bounce on the way out.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.${cfg.prefix}-box', { scale: 0.94, y: 14, opacity: 0, duration: 0.35 / animSpeed });
  tl.set('.${cfg.prefix}', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  },

  {
    id: 'snap-stinger',
    name: 'Snap stinger',
    description: 'Slams in from the left and snaps straight, then leaves even faster. Sport-fast.',
    autoEase: { easeIn: 'power4.out', easeOut: 'power3.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Snap stinger — slams in from the left with a skew that settles. Fast by design.
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}
  tl.fromTo('.${cfg.prefix}-box',
    { x: -90, skewX: -10, opacity: 0 },              // arrives fast with a lean…
    { x: 0, skewX: 0, opacity: 1, duration: 0.38 / animSpeed }  // …and snaps straight
  );
  tl.fromTo([${linesInIntro(cfg)}],
    { x: -30, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.3 / animSpeed, stagger: 0.05 / animSpeed },
    '-=0.22'
  );
  return tl;
}

// buildOutTimeline(): the exit — snaps out the opposite way, even faster.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.${cfg.prefix}-box', { x: 70, skewX: 6, opacity: 0, duration: 0.28 / animSpeed });
  tl.set('.${cfg.prefix}', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  },

  {
    id: 'blur-in',
    name: 'Blur in',
    description: 'Materialises out of a blur and dissolves back into it. Soft, premium, glassy.',
    autoEase: { easeIn: 'power2.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Blur in — the card materialises out of a blur (filter animates on the box only).
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}
  tl.fromTo('.${cfg.prefix}-box',
    { opacity: 0, filter: 'blur(14px)', y: 16 },
    { opacity: 1, filter: 'blur(0px)', y: 0, duration: 1.0 / animSpeed }  // a slow materialise — the soft pole of the bank
  );
  tl.fromTo([${linesInIntro(cfg)}],
    { y: 10, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.6 / animSpeed, stagger: 0.12 / animSpeed },
    '-=0.55'
  );
  return tl;
}

// buildOutTimeline(): the exit — dissolves back into the blur, faster.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.${cfg.prefix}-box', { opacity: 0, filter: 'blur(10px)', duration: 0.5 / animSpeed });
  tl.set('.${cfg.prefix}', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  },

  {
    id: 'fade',
    name: 'Fade',
    description: 'A clean crossfade, no movement at all. The calmest choice.',
    autoEase: { easeIn: 'sine.out', easeOut: 'sine.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Fade — a pure opacity dissolve, no movement. Calm, documentary, timeless.
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}
  tl.fromTo('.${cfg.prefix}-box',
    { opacity: 0 },
    { opacity: 1, duration: 0.9 / animSpeed }        // an unhurried dissolve — calm is the point
  );
  tl.fromTo([${linesInIntro(cfg)}],
    { opacity: 0 },
    { opacity: 1, duration: 0.7 / animSpeed, stagger: 0.16 / animSpeed },
    '-=0.5'                                          // lines join while the box is still fading
  );
  return tl;
}

// buildOutTimeline(): the exit — fades away faster than it arrived.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.${cfg.prefix}-box', { opacity: 0, duration: 0.55 / animSpeed });
  tl.set('.${cfg.prefix}', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  },

  {
    id: 'flip-3d',
    name: 'Flip 3D',
    description: 'The card swings down from a 3D hinge along its top edge. Dimensional.',
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Flip 3D — the card swings in on a 3D hinge along its top edge.
${knobs(cfg)}

// buildInTimeline(): choreographs the entrance. Called by play().
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });                     // reveal the (CSS-hidden) graphic${hideStepLines(cfg)}
  tl.fromTo('.${cfg.prefix}-box',
    { rotationX: -80, opacity: 0, transformPerspective: 900, transformOrigin: 'center top' },
    { rotationX: 0, opacity: 1, duration: 0.85 / animSpeed }  // a full theatrical swing
  );
  tl.fromTo([${linesInIntro(cfg)}],
    { opacity: 0 },
    { opacity: 1, duration: 0.45 / animSpeed, stagger: 0.1 / animSpeed },
    '-=0.35'
  );
  return tl;
}

// buildOutTimeline(): the exit — folds forward past the camera, faster.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.${cfg.prefix}-box',
    { rotationX: 65, opacity: 0, transformPerspective: 900, transformOrigin: 'center top', duration: 0.45 / animSpeed });
  tl.set('.${cfg.prefix}', { opacity: 0 });                     // fully hidden; ready to play again
  return tl;
}${stepsBlock(cfg)}
${MARK_CLOSE}`,
  },
];

export function presetById(id: AnimPresetId): AnimPreset {
  const preset = ANIM_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`Unknown animation preset: ${id}`);
  return preset;
}

export { MARK_OPEN as ANIMATION_MARK_OPEN, MARK_CLOSE as ANIMATION_MARK_CLOSE };
