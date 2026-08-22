// The IMPORTED SVG DESIGN: a layered SVG the user made elsewhere, inlined VERBATIM, with its
// own <text> layers bound to operator fields (docs/SVG_IMPORT_PLAN.md).
//
// Architecture B from the plan: the SVG's own text nodes get id="fN" and the standard
// update() writes their textContent — the typography IS the designer's, nothing is redrawn.
// The only edits the markup takes are (a) id="fN" on the bound nodes, (b) sanitization
// (already done at import — assets/svgImport.ts), (c) the candidate markers stripped, and
// (d) a class on the root <svg> so the part registry can name it. Everything else ships
// byte-for-byte as the designer exported it.
//
// Like the raster imported design (shared.ts) this self-assembles from shared/base.ts: the
// ARTWORK decides the size, so the box is exactly the SVG's fitted width — never the standard
// assembler's fit-content text cap. The output is an ordinary standard-contract template
// (.imported-design-box), so the canvas, the timeline, the exports and the validation gate
// all work unchanged.

import type { SpxTemplate } from '../../model/types';
import { definitionScriptBlock } from '../../model/spxDefinition';
import { resolveEasing } from '../../model/easings';
import { customFontFaceCss, fontFaceCss, FONTS, type BundledFont } from '../../model/fonts';
import {
  paletteById,
  resolveOptions,
  type DesignSvg,
  type ResolvedOptions,
  type TemplateVariant,
  type WizardOptions,
} from '../../model/wizard';
import type { SpxField } from '../../model/types';
import { SVG_CANDIDATE_ATTR, clockSampleMinutes } from '../../assets/svgImport';
import { svgLayerSelectors } from '../../model/structure';
import type { AnimData } from '../../blocks/animData';
import {
  baseSettings,
  computeScale,
  DATA_SOURCE_CLASS,
  dataSourceCss,
  documentHtml,
  resetCanvasCss,
  resolveHeadingFont,
  rootVarsCss,
  runtimeJs,
  zoneCssText,
} from '../shared/base';
import { clockRuntimeJs } from '../shared/clock';
import { convertToDataRegion } from '../shared/standard';
import { attachMachine } from '../types/graphicType';
import {
  behaviourLayerIds,
  importedQuizType,
  markQuizLayers,
  quizBehaviourCss,
  quizBehaviourFields,
  quizBehaviourHtml,
  quizBehaviourJs,
  withQuizSteps,
} from './quizBehaviour';
import type { AnimPreset, PresetConfig } from '../lowerThirds/animPresets';
import { DESIGN_PRESETS } from './designPresets';
import { PREFIX } from './shared';

/** Stand-in used only when a preview (or the catalog baseline) renders the variant before an
 *  SVG exists. Deterministic on purpose — the baselines hash the emitted panes. */
const NO_SVG: DesignSvg = {
  markup:
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 270">` +
    `<rect width="960" height="270" fill="rgba(10,12,16,0.86)"/></svg>`,
  width: 960,
  height: 270,
  fields: [],
  images: [],
  outlines: [],
  fonts: [],
};

/**
 * Bind the chosen candidates: each gets id="fN" (in field order), every remaining candidate
 * marker is stripped, and the root <svg> gains the artwork class so the part registry names
 * it. Any pre-existing id that collides with a bound one is prefixed out of the way — the
 * field ids are the one namespace the platform owns inside the file.
 */
function bindSvgMarkup(svg: DesignSvg): string {
  const doc = new DOMParser().parseFromString(svg.markup, 'image/svg+xml');
  const root = doc.documentElement;

  // The artwork identity (model/structure.ts `.{prefix}-art`) — appended, never replacing
  // classes the designer put there.
  const classes = (root.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
  if (!classes.includes(`${PREFIX}-art`)) classes.push(`${PREFIX}-art`);
  root.setAttribute('class', classes.join(' '));

  // Field ids are ours: a layer Illustrator happened to name "f0" would collide with the
  // binding, so any such id moves aside (references to it inside the file move with it). The
  // behaviour's own fields count here too — its holders carry `fN` ids like any other field,
  // and the stamped state-layer ids (`q-sel-1`, …) are ours for the same reason.
  const behaviourFields = svg.behaviour ? 2 : 0;
  const taken = new Set([
    ...[...svg.fields, ...svg.images, ...Array(behaviourFields)].map((_, i) => `f${i}`),
    ...(svg.behaviour ? behaviourLayerIds(svg.behaviour) : []),
  ]);
  for (const el of Array.from(root.querySelectorAll('[id]'))) {
    const id = el.getAttribute('id')!;
    if (!taken.has(id)) continue;
    const renamed = `layer-${id}`;
    el.setAttribute('id', renamed);
    for (const ref of Array.from(root.querySelectorAll(`[href="#${id}"], [*|href="#${id}"]`))) {
      if (ref.getAttribute('href') === `#${id}`) ref.setAttribute('href', `#${renamed}`);
      if (ref.getAttribute('xlink:href') === `#${id}`) ref.setAttribute('xlink:href', `#${renamed}`);
    }
  }

  const clock = countdownIndex(svg);
  [...svg.fields, ...svg.images].forEach((field, i) => {
    const el = root.querySelector(`[${SVG_CANDIDATE_ATTR}="${field.candidateId}"]`);
    if (!el) return;
    if (i === clock) {
      // The countdown DISPLAY: the clock runtime paints into `.{prefix}-clock`, and the
      // operator's minutes land in the hidden #fN holder instead — so this node takes the
      // class and NOT the field id, or update() would write "10" over the ticking readout.
      const own = (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
      if (!own.includes(`${PREFIX}-clock`)) own.push(`${PREFIX}-clock`);
      el.setAttribute('class', own.join(' '));
      return;
    }
    el.setAttribute('id', `f${i}`);
  });
  // An outlined-text group the user chose to replace (plan §1.A) is HIDDEN, not deleted:
  // the class below is what the `.{prefix}-outlined { display: none }` rule in template.css
  // matches, so a professional can compare the live text against the shapes by deleting
  // one line, and the file still carries everything the designer exported. The HTML field
  // that stands in for it is placed afterwards (components/wizard/draft.ts).
  for (const outline of svg.outlines) {
    const el = root.querySelector(`[${SVG_CANDIDATE_ATTR}="${outline.candidateId}"]`);
    if (!el) continue;
    const own = (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
    if (!own.includes(`${PREFIX}-outlined`)) own.push(`${PREFIX}-outlined`);
    el.setAttribute('class', own.join(' '));
  }
  // The drawn states of a bound behaviour: our id and the state class, so the runtime can turn
  // each one on and off. Before the markers are stripped — that is what they are for.
  if (svg.behaviour) markQuizLayers(root, svg.behaviour);
  for (const el of Array.from(root.querySelectorAll(`[${SVG_CANDIDATE_ATTR}]`))) {
    el.removeAttribute(SVG_CANDIDATE_ATTR);
  }
  return new XMLSerializer().serializeToString(root);
}

/** The ONE countdown field of a design (plan P2 "clock ftype"): the first text layer bound
 *  as a countdown, or -1. One, because the shared clock runtime (templates/shared/clock.ts)
 *  drives one display; a second countdown choice binds as plain text. */
function countdownIndex(svg: DesignSvg): number {
  return svg.fields.findIndex((f) => f.countdown);
}

/** The SPX DataFields: one per bound text layer (numeric samples as real number fields;
 *  the countdown layer as its LENGTH in minutes, the drawn readout converted — "10:00" is
 *  ten), then one filelist per bound picture layer — update() swaps that node's href, and
 *  an empty value keeps the picture the designer drew. */
function svgFields(svg: DesignSvg): SpxField[] {
  const clock = countdownIndex(svg);
  return [
    ...svg.fields.map((f, i): SpxField =>
      i === clock
        ? {
            field: `f${i}`,
            ftype: 'number',
            title: `${f.title} (minutes)`,
            value: String(clockSampleMinutes(f.sample) ?? 5),
          }
        : {
            field: `f${i}`,
            ftype: f.numeric ? 'number' : 'textfield',
            title: f.title,
            value: f.sample,
          },
    ),
    ...svg.images.map((f, i): SpxField => ({
      field: `f${svg.fields.length + i}`,
      ftype: 'filelist',
      title: f.title,
      value: '',
      // The SPX picker lists the project's images/ folder, like every image field.
      assetfolder: './images/',
      extension: 'png',
    })),
  ];
}

/**
 * Every @font-face the template ships (plan §4): a bundled face whose family name matches
 * what the SVG references, or a fetched/uploaded face embedded as an asset. An UNRESOLVED
 * family is stated in a comment — never blocked, because the designer may know the playout
 * machine has the face installed; the wizard already warned out loud.
 */
/** A bundled face declared under the name the artwork asks for — same file, second name. The
 *  comment says which face it really is, so the emitted CSS is readable rather than mysterious. */
function aliasFontFaceCss(font: BundledFont, family: string): string {
  return `/* Bundled open-source font (the file ships with the export — no internet at playout).
   Declared as "${family}" because that is the name this artwork's own CSS asks for; the file is ${font.family}. */
@font-face {
  font-family: "${family}";
  src: url("fonts/${font.file}") format("woff2");
  font-weight: ${font.weights[0]} ${font.weights[1]};  /* variable font: covers this weight range */
  font-display: swap;          /* show fallback text until the font loads */
}`;
}

function svgFontCss(svg: DesignSvg): string {
  const blocks: string[] = [];
  const unresolved: string[] = [];
  for (const font of svg.fonts) {
    const bundled = font.fontId ? FONTS.find((f) => f.id === font.fontId) : undefined;
    if (bundled) {
      // A face is declared under the name the ARTWORK asks for. Illustrator writes PostScript
      // names ("Archivo-Bold"), which the import matches to the bundled family they plainly are
      // — but a `@font-face` declared as "Archivo" answers nothing in an SVG whose own CSS says
      // `font-family: Archivo-Bold`, so the alias is the whole point of the match.
      blocks.push(
        bundled.family === font.family ? fontFaceCss(bundled) : aliasFontFaceCss(bundled, font.family),
      );
    } else if (font.customFont) blocks.push(customFontFaceCss(font.customFont));
    else unresolved.push(font.family);
  }
  if (unresolved.length > 0) {
    blocks.push(
      `/* UNRESOLVED ${unresolved.length === 1 ? 'FONT' : 'FONTS'}: ${unresolved.join(', ')} — the SVG references ${unresolved.length === 1 ? 'this family' : 'these families'} but no file ships
   with the template, so playout falls back to whatever the machine has installed. If the
   playout machine has the ${unresolved.length === 1 ? 'font' : 'fonts'}, this is fine; otherwise import the file in the Style panel. */`,
    );
  }
  return blocks.join('\n\n');
}

/**
 * The overflow-only text fit (plan §3): SVG text neither wraps nor clips, so a longer
 * operator value would simply run past the artwork. The runtime records each bound node's
 * original length on first measure and applies `textLength` + `lengthAdjust` ONLY when a new
 * value overflows it — never distorting by default, mirroring the raster flow's
 * shrink-not-condense rule. Design-owned JS OUTSIDE the marked region, so the data
 * conversion and every export carry it untouched.
 *
 * Its name is `fitSvgText`, NOT the shared update()'s optional `fitPlacedText` hook: that
 * name belongs to the HTML placed-line shrink runtime (templates/shared/textFit.ts), which
 * blocks/designLayout installs by that exact marker the first time a placed field asks for
 * shrink - an outlined-text stand-in on this very design (plan §1.A). Two functions of one
 * name would leave the later declaration winning and the other fit silently dead, so the SVG
 * fit gets its own hook line in update() (SVG_FIT_HOOK below) and both can coexist.
 */
const SVG_FIT_JS = `
// ── Text fit (SVG) ────────────────────────────────────────────────────────────
// SVG text neither wraps nor clips: a longer value would run past the artwork. So each bound
// layer has a BUDGET — the width of the text the DESIGNER drew — and a value wider than that
// is SHRUNK until it fits: a smaller line of the designer's own type, never a squeezed one.
// (Condensing to the drawn width, which is what this did before, distorts tracking and glyph
// shapes, so one extra letter visibly broke the typeface.) A value that fits is left exactly
// as drawn. Remove this block to let text run free instead.
//
// The budget is measured from the DRAWN text, never from whatever happens to be on screen.
// A playout renderer replays its control log the moment the page exists, so the first value
// measured there is usually the operator's: a graphic that took its budget from that never
// condensed at all, and the same file squished in the editor while running past the artwork
// on air. The drawn text is remembered before update() can be called, and the budget is
// re-measured once the real typeface has loaded (the first pass may have measured a
// fallback face). The shrink is set on the bound node; a run carrying its OWN font-size
// keeps it, which Illustrator only writes when a designer sized one word by hand.
var svgFitDrawn = {};                           // id -> the text the designer drew
var svgFitWidths = {};                          // id -> that text's width, in the real face
var svgFitSizes = {};                           // id -> the font size it was drawn at, in px

function svgFitNodes() {
  var all = document.querySelectorAll('.${PREFIX}-art text[id], .${PREFIX}-art tspan[id]');
  var out = [];
  for (var i = 0; i < all.length; i++) {
    if (/^f\\d+$/.test(all[i].id) && typeof all[i].getComputedTextLength === 'function') out.push(all[i]);
  }
  return out;
}

// Runs as the page parses, with the artwork above it and update() not yet callable.
(function () {
  var nodes = svgFitNodes();
  for (var i = 0; i < nodes.length; i++) {
    if (svgFitDrawn[nodes[i].id] == null) svgFitDrawn[nodes[i].id] = nodes[i].textContent;
  }
})();

function measureSvgBudgets() {
  var nodes = svgFitNodes();
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    var live = el.textContent;
    if (svgFitDrawn[el.id] == null) svgFitDrawn[el.id] = live;
    var drawn = svgFitDrawn[el.id];
    // Any previous fit has to come off first, or the measurement compounds.
    el.style.fontSize = '';
    if (live !== drawn) el.textContent = drawn;   // measure the design, put the value back
    svgFitWidths[el.id] = el.getComputedTextLength();
    svgFitSizes[el.id] = parseFloat(getComputedStyle(el).fontSize) || 0;
    if (live !== drawn) el.textContent = live;
  }
}

function fitSvgText() {
  var nodes = svgFitNodes();
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    if (svgFitWidths[el.id] == null) measureSvgBudgets();
    el.style.fontSize = '';                     // back to the drawn size before measuring
    var budget = svgFitWidths[el.id];
    var size = svgFitSizes[el.id];
    if (!(budget > 0) || !(size > 0)) continue;
    // Two passes: a face's advance widths are not perfectly linear in size, so the first
    // ratio lands close and the second settles it. A line that fits keeps no inline size
    // at all — the designer's own type, untouched.
    for (var pass = 0; pass < 2; pass++) {
      var length = el.getComputedTextLength();
      if (length <= budget + 0.5) break;
      size = size * (budget / length);
      el.style.fontSize = size.toFixed(2) + 'px';
    }
  }
}

function refitSvgText() { measureSvgBudgets(); fitSvgText(); }
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', refitSvgText);
} else {
  refitSvgText();                               // DOM already parsed (e.g. an inline preview build)
}
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(refitSvgText);
}`;

/** The shared update()'s optional placed-text hook line (templates/shared/base.ts runtimeJs)
 *  — the SVG fit's own hook is inserted right after it, so update() re-fits the SVG's text
 *  the way it re-fits placed lines. Matched by shape, like blocks/designLayout does. */
const PLACED_TEXT_HOOK = `  if (typeof fitPlacedText === 'function') fitPlacedText();`;
const SVG_FIT_HOOK = `  if (typeof fitSvgText === 'function') fitSvgText();       // the SVG's own text layers (below)`;

/** The preset to build with — always one of this category's, whatever a carried-over draft says. */
function designPreset(id: string): AnimPreset {
  return DESIGN_PRESETS.find((p) => p.id === id) ?? DESIGN_PRESETS[0];
}

/** Build the complete SpxTemplate for an imported SVG design. */
export function assembleImportedSvg(o: ResolvedOptions): SpxTemplate {
  const svg = o.designSvg ?? NO_SVG;
  const name = 'Imported SVG design';
  const artworkFields = svgFields(svg);
  // The behaviour's own fields sit AFTER the artwork's, and that order is load-bearing:
  // `importedQuizType` mirrors it so a control's payload resolves to the right `fN`.
  const quiz = svg.behaviour?.kind === 'quiz' ? svg.behaviour : null;
  const fields = quiz
    ? [...artworkFields, ...quizBehaviourFields(quiz, artworkFields.length)]
    : artworkFields;
  // Steps are off: the whole design is one unit — a layer can still be given its own press
  // later, from the timeline.
  const settings = baseSettings({ name, uicolor: '7' }, o, { steps: '1' });
  const scale = computeScale(o);

  // Same anchoring rule as the raster import: frame-sized artwork covers the canvas as
  // drawn; anything smaller is a free-floating object and gets a zone.
  const fullFrame = svg.width === o.resolution.width && svg.height === o.resolution.height;
  const rootPosition = fullFrame
    ? `  left: 0;                         /* the artwork is frame-sized — it covers the canvas as drawn */
  top: 0;`
    : zoneCssText(o.zone, o.nudge, o.resolution);

  // The SVG rides inline, indented to sit inside the box — no asset path, no fetch, so every
  // single-file export target stays single-file.
  const inlineSvg = bindSvgMarkup(svg)
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');

  // The countdown (plan P2 "clock ftype"): the chosen layer is the clock DISPLAY
  // (`.{prefix}-clock`, painted by the shared runtime), and the operator's minutes live in a
  // hidden data source the runtime reads — the exact contract every catalog countdown uses.
  const clock = countdownIndex(svg);
  const clockField = clock === -1 ? null : artworkFields[clock];
  const clockHolder = clockField
    ? `
    <!-- ${clockField.title} (${clockField.field}) — the countdown's length in minutes, written by SPX
         and read by the clock runtime in template.js; the drawn clock layer shows the count. -->
    <div id="${clockField.field}" class="${DATA_SOURCE_CLASS}">${clockField.value}</div>`
    : '';

  const html = documentHtml({
    title: name,
    definitionBlock: definitionScriptBlock(settings, fields),
    body: `  <!-- Imported SVG design — your artwork, exactly as exported. The text layers chosen at
       import carry id="f0", "f1", … and update() writes the operator's values straight into
       them; everything else is untouched. -->
  <div class="${PREFIX}">
    <div class="${PREFIX}-box">
${inlineSvg}${clockHolder}${quiz ? quizBehaviourHtml(quiz, artworkFields.length) : ''}
    </div>
  </div>`,
  });

  const fontCss = svgFontCss(svg);
  const css = `/* ${name} — generated by NoaCG Studio. Edit freely: this file is yours. */

${rootVarsCss(o, resolveHeadingFont(o).stack, scale, { typeScale: false })}

${fontCss ? `${fontCss}\n\n` : ''}${resetCanvasCss(o.resolution)}

/* ── Root position ── */
.${PREFIX} {
  position: absolute;
${rootPosition}
  opacity: 0;                      /* hidden until play() runs the entrance */
}

/* ── The design unit: the SVG and its bound text animate together as one box. ── */
.${PREFIX}-box {
  position: relative;              /* a placed HTML field (over outlined text) positions against it */
  width: calc(${svg.width}px * var(--scale));  /* the artwork's own width drives the size */
  will-change: transform, opacity; /* hint the browser: this element animates */
}
.${PREFIX}-art {
  display: block;
  width: 100%;                     /* fills the box — so --scale resizes art and text together */
  height: auto;                    /* the viewBox keeps the aspect */
}
${svg.outlines.length > 0 ? `
/* Outlined text replaced by a live field: the original shapes stay in the file, hidden.
   Delete this rule to see them again beside the text that stands in for them. */
.${PREFIX}-outlined {
  display: none;
}
` : ''}${clockField || quiz ? `
${dataSourceCss}
` : ''}${quiz ? `
${quizBehaviourCss}
` : ''}`;

  const preset = designPreset(o.animation.presetId);
  const ease = resolveEasing(o.animation.easing, preset.autoEase);
  const cfg: PresetConfig = {
    prefix: PREFIX,
    lineCount: 0, // the design presets animate the whole box; the SVG's text is inside it
    hasAccent: false,
    // The artwork's own top-level layers — what the per-layer stagger walks. Read off the
    // emitted HTML by the same function emitPresetRegion uses, so create and re-apply agree.
    layers: svgLayerSelectors(html),
    steps: false,
    speed: o.animation.speed,
    easeIn: ease.easeIn,
    easeOut: ease.easeOut,
  };

  // The clock runtime is design-owned JS outside the marked region, like the SVG fit: the
  // data conversion and every preset swap leave it alone, and the presets only CALL it.
  // A bound behaviour repaints on every update() for the reason quiz/shared.ts gives: a data
  // write must never erase a state the machine still holds, and a snap recovery replays states
  // with callbacks suppressed, so the trailing update() is what puts the drawn states back.
  const quizHook = `  if (typeof paintQuizState === 'function') paintQuizState();  // the drawn quiz states (below)`;
  const js =
    runtimeJs(name, preset.emit(cfg)).replace(
      PLACED_TEXT_HOOK,
      `${PLACED_TEXT_HOOK}\n${SVG_FIT_HOOK}${quiz ? `\n${quizHook}` : ''}`,
    ) +
    SVG_FIT_JS +
    '\n' +
    (clockField ? `\n${clockRuntimeJs(PREFIX, clockField.field)}\n` : '') +
    (quiz ? `\n${quizBehaviourJs(quiz, artworkFields.length)}` : '');

  // The design presets know nothing of clocks, so the lifecycle hooks are added to the DATA
  // (the step-calls model, docs/TIMELINE_V2_PLAN.md §3b): startClock as the entrance lands,
  // stopClock the moment the exit begins — exactly what the catalog's countdown presets emit.
  const withClockCalls = clockField
    ? (data: AnimData): AnimData => {
        const steps = data.steps.map((s) => ({ ...s }));
        const enter = steps[0];
        const out = steps[steps.length - 1];
        enter.calls = [...(enter.calls ?? []), { time: enter.duration, call: 'startClock' }];
        out.calls = [...(out.calls ?? []), { time: 0, call: 'stopClock' }];
        return { ...data, steps };
      }
    : undefined;

  const template: SpxTemplate = {
    name,
    type: 'imported-design',
    resolution: o.resolution,
    fps: o.fps,
    html,
    css,
    js,
    fields,
    settings,
    // The SVG is inline; only embedded font files ride as assets.
    assets: svg.fonts.filter((f) => f.customFont).map((f) => f.customFont!.asset),
    // The countdown's layer is the clock display, not a text field — left out here.
    layers: svg.fields.flatMap((f, i) =>
      i === clock
        ? []
        : [{ id: `f${i}`, type: 'text' as const, label: f.title, fieldId: `f${i}`, text: f.sample, styles: {} }],
    ),
  };

  // Compose the two data refinements: the clock's lifecycle calls, then the quiz's Reveal step.
  // Order matters only in that the clock's `stopClock` must stay on the LAST step, and the
  // reveal is spliced in front of it — so the quiz refinement runs second.
  const refine =
    withClockCalls || quiz
      ? (data: AnimData): AnimData => {
          const withClock = withClockCalls ? withClockCalls(data) : data;
          return quiz ? withQuizSteps(withClock) : withClock;
        }
      : undefined;
  const built = convertToDataRegion(template, refine);
  // The machine last, on the finished data: `attachMachine` derives the default path from the
  // steps, so the Reveal step has to already be there when it compiles `pathEvents: ['judge']`.
  return quiz ? attachMachine(importedQuizType(svg), built) : built;
}

export const IMPORTED_SVG: TemplateVariant = {
  id: 'svg01',
  category: 'imported-design',
  name: 'Imported SVG design',
  styleTag: 'minimal',
  description: 'Your own SVG artwork, its text layers bound as editable fields.',
  maxLines: 3,
  suggestedLines: [],
  // The fields are the SVG's own text layers, chosen at import — never an open line list.
  fieldPlan: { kind: 'fixed', reason: 'The fields are the SVG’s own text layers, chosen at import.' },
  // The artwork IS the design — a logo drawn into it needs no slot from us.
  logo: 'none',
  // The whole-unit presets plus the per-layer stagger — only an SVG has layers to stagger.
  animationPresets: ['design-fade', 'design-slide', 'design-pop', 'design-blur', 'design-stagger'],
  defaultPalette: paletteById('ivory'),
  defaultFontId: 'inter',
  defaultZone: 'bottom-left',
  create(options?: WizardOptions) {
    return assembleImportedSvg(resolveOptions(IMPORTED_SVG, options));
  },
};
