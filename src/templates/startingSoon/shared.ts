// Starting-soon scaffolding — the HOLDING SCREEN category. A holding screen is whatever the
// audience looks at while the show is not happening: before it starts, during a break, through
// a technical problem, and after it ends. They all share one shape (a calm full-frame card that
// may hold for a very long time) and differ in what they say and whether they count.
//
// A design declares three things about itself and the assembler does the rest:
//   lineCount  — how many text lines its markup carries (#f0 … #f{n-1}); default 2
//   clock      — 'minutes' (a plain duration), 'start-time' (a wall-clock time the count
//                chases, with the duration as fallback), or 'none' (a screen with no numbers:
//                a technical pause has nothing honest to promise)
//   extras     — any further SPX fields it owns
//
// Structure contract:
//   <div class="starting-soon">                  root — positioned by zone; opacity:0 until play()
//     <div class="starting-soon-box">            the panel; presets fade + raise this
//       .starting-soon-mask > #f0 / #f1 spans    the text lines (mask-wrapped, auto-fit)
//       [<div class="starting-soon-clock">]      JS paints the remaining time here (clockRuntimeJs)
//       one element with class "starting-soon-pulse"   the hold-loop preset breathes it
//     </div>
//     [hidden #fN sources SPX writes the countdown into]
//   </div>

import type { SpxField, SpxTemplate } from '../../model/types';
import { definitionScriptBlock } from '../../model/spxDefinition';
import { resolveEasing } from '../../model/easings';
import {
  resolveOptions,
  type LineSpec,
  type ResolvedOptions,
  type TemplateVariant,
  type WizardOptions,
} from '../../model/wizard';
import {
  baseSettings,
  computeScale,
  documentHtml,
  maxTextWidthCss,
  resetCanvasCss,
  resolveHeadingFont,
  rootVarsCss,
  setFieldValueJs,
  zoneCssText,
} from '../shared/base';
import { clockRuntimeJs } from '../shared/clock';
import type { AnimData } from '../../blocks/animData';
import { convertToDataRegion } from '../shared/standard';
import type { PresetConfig } from '../lowerThirds/animPresets';
import { ssPresetById } from './ssPresets';
import { resolveTokens, type ThemeTokens, type TokenOverrides } from '../../model/themeTokens';

/**
 * What a holding screen counts, if anything.
 * - `minutes`    a plain duration the operator types ("5"). The count restarts from the top
 *                every time the graphic is taken on air — right for a break.
 * - `start-time` the same, plus an optional wall-clock time ("19:30") that WINS when it is
 *                filled in. Right for "we start at half past": the number on screen agrees
 *                with the clock on the wall no matter how long the hold has been up.
 * - `none`       no clock at all. A technical pause has no honest number to show, and a wrong
 *                promise on air is worse than no promise.
 */
export type SsClock = 'minutes' | 'start-time' | 'none';

/** A holding screen's default text for one line, used when the caller supplies none. */
export interface SsLineDefault {
  title: string;
  sample: string;
}

export interface StartingSoonDesign {
  /**
   * Inner HTML of .starting-soon — must contain .starting-soon-box with mask-wrapped #f0…
   * spans, a .starting-soon-clock element when the design has a clock, and exactly one
   * element carrying class "starting-soon-pulse".
   */
  html: string;
  /** Variant CSS (panel, lines, clock, pulse; done-state via .starting-soon-done). */
  css: string;
  /** How many text lines the markup above carries. Default 2 (title + show name). */
  lineCount?: number;
  /** Per-line fallbacks when the caller passes fewer lines than the design draws. */
  lineDefaults?: SsLineDefault[];
  /** What this screen counts. Default 'minutes'. */
  clock?: SsClock;
  /** The countdown field's default value, in whole minutes. Default '5'. */
  clockMinutes?: string;
  /** The start-time field's default value ("19:30"), for `clock: 'start-time'` designs.
   *  Empty by default — an unset start time means "use the duration", which is the
   *  behaviour a template should ship with. */
  clockStartTime?: string;
  /**
   * Extra runtime JS the design owns. Emitted BEFORE the marked ANIMATION region — same
   * doctrine as every other category — so preset swaps can never rewrite it. Any load-time
   * DOM work must use the DOM-ready guard (template.js loads in <head> when exported).
   */
  runtimeExtraJs?: string;
  /** SPX fields the design owns beyond its lines and its clock (appended last). */
  extraFields?: SpxField[];
  /**
   * Where this design disagrees with its style family's shape tokens
   * (model/themeTokens.ts). Every entry is conformance debt - DESIGN_LANGUAGE §8's rule is
   * "reuse the exact token values, don't improvise new ones per category".
   */
  tokens?: TokenOverrides;
}

export interface StartingSoonMeta {
  name: string;
  description: string;
  uicolor: string;
}

/** The two lines every holding screen had before designs could declare their own. */
const DEFAULT_LINES: SsLineDefault[] = [
  { title: 'Title', sample: 'STARTING SOON' },
  { title: 'Show name', sample: 'The Evening Show' },
];

/** Resolve the design's lines: the caller's where given, the design's defaults otherwise. */
function resolveLines(design: StartingSoonDesign, o: ResolvedOptions): LineSpec[] {
  const count = design.lineCount ?? 2;
  const defaults = design.lineDefaults ?? DEFAULT_LINES;
  const lines: LineSpec[] = [];
  for (let i = 0; i < count; i++) {
    const fallback = defaults[i] ?? { title: `Line ${i + 1}`, sample: '' };
    lines.push({
      title: o.lines[i]?.title || fallback.title,
      sample: o.lines[i]?.sample || fallback.sample,
    });
  }
  return lines;
}

/** The shared runtime: field updates + (when the design has one) the countdown clock. */
function ssRuntimeJs(
  name: string,
  animationBlock: string,
  opts: { clockJs: string | null; extraJs?: string },
): string {
  // A clock-less screen must not carry a clock repaint in update() — dead code that reads as
  // if the graphic counted something. The interpreter resolves a step's calls by NAME and
  // treats a missing function as a no-op, so a preset swapped onto a clock-less screen after
  // creation degrades to "no countdown" rather than throwing.
  const idleRepaint = opts.clockJs
    ? `
  // If the countdown isn't running yet, repaint the idle clock with the new duration.
  if (!clockTimer) {
    clockSecondsLeft = clockSeconds();
    renderClock();
  }`
    : '';

  const blocks = [
    `// ${name} — generated by NoaCG Studio. SPX calls update(), play(), stop(), next().`,
    ...(opts.clockJs ? [opts.clockJs] : []),
    ...(opts.extraJs ? [opts.extraJs] : []),
    setFieldValueJs,
    `// update(data): SPX sends field values as JSON; each value is written into the element
// whose id matches the field name (the hidden countdown sources are fields too).
function update(data) {
  var fields = (typeof data === 'string') ? JSON.parse(data) : data;
  for (var key in fields) {
    var el = document.getElementById(key);
    if (el) setFieldValue(el, fields[key]);
  }${idleRepaint}
}

// play(): take the holding screen on air${opts.clockJs ? ' — the entrance also starts the countdown' : ''}.
function play() {
  gsap.killTweensOf('*');          // stop any animation that is still running
  buildInTimeline();
}

// stop(): take the screen off air${opts.clockJs ? ' (the exit also stops the countdown)' : ''}.
function stop() {
  gsap.killTweensOf('*');
  buildOutTimeline();
}

// next(): SPX Continue — advance one step along the default path. This design ships
// single-step, so it normally does nothing; it still funnels to the interpreter so a
// template that GROWS a step (or a state machine) stays drivable through the SPX contract.
function next() {
  return (typeof revealNextStep === 'function') ? revealNextStep() : null;
}`,
    animationBlock,
  ];
  return `${blocks.join('\n\n')}\n`;
}

/** Build the complete starting-soon SpxTemplate. */
export function assembleStartingSoon(
  meta: StartingSoonMeta,
  design: StartingSoonDesign,
  o: ResolvedOptions,
  /** Refine the converted animation data — the seam a graphic TYPE injects its machine
   *  through (see shared/standard.ts composeRefine for the ordering rule). */
  refine?: (data: AnimData) => AnimData,
  /** The design's resolved SHAPE tokens (model/themeTokens.ts). Resolved by the caller,
   *  because the family lives on the VARIANT (styleTag) and this function only sees the
   *  design. Absent = emit no token lines, which is what every template did before they
   *  existed. */
  tokens?: ThemeTokens,
): SpxTemplate {
  const font = resolveHeadingFont(o);
  const scale = computeScale(o);
  // Holding screens are the show's front door: wider cap than a strap (~70% of the canvas).
  const maxTextWidth = Math.round(o.resolution.width * 0.7);

  const lines = resolveLines(design, o);
  const clock: SsClock = design.clock ?? 'minutes';
  const minutesId = `f${lines.length}`;
  const startTimeId = `f${lines.length + 1}`;
  const minutesValue = design.clockMinutes ?? '5';
  const startTimeValue = design.clockStartTime ?? '';

  const fields: SpxField[] = lines.map((line, i) => ({
    field: `f${i}`,
    ftype: 'textfield',
    title: line.title,
    value: line.sample,
  }));
  if (clock !== 'none') {
    fields.push({ field: minutesId, ftype: 'textfield', title: 'Countdown (minutes)', value: minutesValue });
  }
  if (clock === 'start-time') {
    fields.push({
      field: startTimeId,
      ftype: 'textfield',
      title: 'Start time (HH:MM, optional)',
      value: startTimeValue,
    });
  }
  fields.push(...(design.extraFields ?? []));

  const settings = baseSettings(meta, o, { steps: '1', playlayer: '4', webplayout: '4' });

  // The hidden countdown sources. They are ordinary SPX fields with nowhere visible to go:
  // the operator types a duration, the clock runtime reads it and paints the result.
  const clockSources =
    clock === 'none'
      ? ''
      : clock === 'start-time'
        ? `
    <!-- Hidden countdown sources — SPX writes the fields here; the clock reads them.
         A start time (e.g. "19:30") wins; leave it empty to count the duration instead. -->
    <div id="${minutesId}" style="display: none">${minutesValue}</div>
    <div id="${startTimeId}" style="display: none">${startTimeValue}</div>`
        : `
    <!-- Hidden countdown source — SPX writes field ${minutesId} (minutes) here; the clock reads it. -->
    <div id="${minutesId}" style="display: none">${minutesValue}</div>`;

  const html = documentHtml({
    title: meta.name,
    definitionBlock: definitionScriptBlock(settings, fields),
    body: `  <!-- ${meta.name}.${clock === 'none' ? '' : ' The clock is painted by JS from the hidden source below.'} -->
  <div class="starting-soon">
${design.html}${clockSources}
  </div>`,
  });

  const css = `/* ${meta.name} — generated by NoaCG Studio. Edit freely: this file is yours. */

${rootVarsCss(o, font.stack, scale, { tokens, consumerCss: design.css })}

${font.face}

${resetCanvasCss(o.resolution)}

/* ── Root position (anchor zone) ── */
.starting-soon {
  position: absolute;
${zoneCssText(o.zone, o.nudge, o.resolution)}
  opacity: 0;                      /* hidden until play() runs the entrance */
}

/* ── Auto-fit: the panel hugs its text and wraps instead of overflowing. ── */
.starting-soon-box {
  width: fit-content;              /* the panel hugs the text */
  max-width: ${maxTextWidthCss(o.resolution, maxTextWidth)};  /* the wrap cap — follows --scale, stops at the safe area */
  will-change: transform, opacity; /* hint the browser: this element animates */
}
.starting-soon-mask {
  overflow: hidden;                /* lines animate in from behind this mask */
}
.starting-soon-mask > span {
  display: inline-block;           /* so the line can move inside its mask */
  overflow-wrap: break-word;       /* break very long unbroken words */
  text-wrap: balance;              /* wrapped rows get even lengths */
}

/* ── Design ── */
${design.css}
`;

  const preset = ssPresetById(o.animation.presetId);
  const ease = resolveEasing(o.animation.easing, preset.autoEase);
  const cfg: PresetConfig = {
    prefix: 'starting-soon',
    lineCount: lines.length,
    hasAccent: false,
    steps: false,
    speed: o.animation.speed,
    easeIn: ease.easeIn,
    easeOut: ease.easeOut,
  };

  const js = ssRuntimeJs(meta.name, preset.emit(cfg), {
    clockJs: clock === 'none' ? null : clockRuntimeJs('starting-soon', minutesId, clock === 'start-time' ? startTimeId : undefined),
    extraJs: design.runtimeExtraJs?.trim() || undefined,
  });

  const template: SpxTemplate = {
    name: meta.name,
    type: 'starting-soon',
    resolution: o.resolution,
    fps: o.fps,
    html,
    css,
    js,
    fields,
    settings,
    assets: [...o.importedImages, ...(o.customFont ? [o.customFont.asset] : [])],
    layers: [],
  };

  // Timeline v2: convert the marked region into the NOACG_ANIM data block + interpreter.
  // The ambient breath is now describable as data (a looping scale track — gap 6), and the
  // step-calls model (§3b) carries startClock()/stopClock(), so the hold loop and countdown
  // both survive the flip; the clock runtime lives OUTSIDE the region and is untouched. A
  // conversion failure keeps the legacy emit — never a broken template.
  return convertToDataRegion(template, refine);
}

/** The authoring API for starting-soon variant modules. */
export function defineStartingSoonVariant(
  spec: Omit<TemplateVariant, 'create'>,
  meta: StartingSoonMeta,
  buildDesign: (o: ResolvedOptions) => StartingSoonDesign,
  /** Optional animation-data refinement (a graphic type's machine rides in here). It is
   *  built per create() because a type's compiled machine depends on the resolved options. */
  refine?: (o: ResolvedOptions) => ((data: AnimData) => AnimData) | undefined,
): TemplateVariant {
  const variant: TemplateVariant = {
    ...spec,
    create(options?: WizardOptions) {
      const o = resolveOptions(variant, options);
      const design = buildDesign(o);
      // The family lives on the variant, the overrides on the design — resolved here
      // because this is the only place that holds both.
      const tokens = resolveTokens(spec.styleTag, design.tokens);
      return assembleStartingSoon(meta, design, o, refine?.(o), tokens);
    },
  };
  return variant;
}
