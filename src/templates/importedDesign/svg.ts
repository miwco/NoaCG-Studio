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
import { customFontFaceCss, fontFaceCss, FONTS } from '../../model/fonts';
import {
  paletteById,
  resolveOptions,
  type DesignSvg,
  type ResolvedOptions,
  type TemplateVariant,
  type WizardOptions,
} from '../../model/wizard';
import type { SpxField } from '../../model/types';
import { SVG_CANDIDATE_ATTR } from '../../assets/svgImport';
import {
  baseSettings,
  computeScale,
  documentHtml,
  resetCanvasCss,
  resolveHeadingFont,
  rootVarsCss,
  runtimeJs,
  zoneCssText,
} from '../shared/base';
import { convertToDataRegion } from '../shared/standard';
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
  // binding, so any such id moves aside (references to it inside the file move with it).
  const taken = new Set(svg.fields.map((_, i) => `f${i}`));
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

  svg.fields.forEach((field, i) => {
    const el = root.querySelector(`[${SVG_CANDIDATE_ATTR}="${field.candidateId}"]`);
    el?.setAttribute('id', `f${i}`);
  });
  for (const el of Array.from(root.querySelectorAll(`[${SVG_CANDIDATE_ATTR}]`))) {
    el.removeAttribute(SVG_CANDIDATE_ATTR);
  }
  return new XMLSerializer().serializeToString(root);
}

/** The SPX DataFields: one per bound layer, numeric samples as real number fields. */
function svgFields(svg: DesignSvg): SpxField[] {
  return svg.fields.map((f, i) => ({
    field: `f${i}`,
    ftype: f.numeric ? ('number' as const) : ('textfield' as const),
    title: f.title,
    value: f.sample,
  }));
}

/**
 * Every @font-face the template ships (plan §4): a bundled face whose family name matches
 * what the SVG references, or a fetched/uploaded face embedded as an asset. An UNRESOLVED
 * family is stated in a comment — never blocked, because the designer may know the playout
 * machine has the face installed; the wizard already warned out loud.
 */
function svgFontCss(svg: DesignSvg): string {
  const blocks: string[] = [];
  const unresolved: string[] = [];
  for (const font of svg.fonts) {
    const bundled = font.fontId ? FONTS.find((f) => f.id === font.fontId) : undefined;
    if (bundled) blocks.push(fontFaceCss(bundled));
    else if (font.customFont) blocks.push(customFontFaceCss(font.customFont));
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
 * shrink-not-condense rule. Named `fitPlacedText` because that is the optional hook the
 * shared update() already calls (templates/shared/base.ts). Design-owned JS OUTSIDE the
 * marked region, so the data conversion and every export carry it untouched.
 */
const SVG_FIT_JS = `
// ── Text fit (SVG) ────────────────────────────────────────────────────────────
// SVG text neither wraps nor clips: a longer value would run past the artwork. Each bound
// text layer's ORIGINAL length is recorded once; when an operator value overflows it, the
// text is condensed to exactly that length (textLength + lengthAdjust) — and only then.
// A value that fits keeps the designer's typography untouched. Remove this block to let
// text run free instead.
var svgFitWidths = {};
function fitPlacedText() {
  var nodes = document.querySelectorAll('.${PREFIX}-art text[id], .${PREFIX}-art tspan[id]');
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    if (!/^f\\d+$/.test(el.id) || typeof el.getComputedTextLength !== 'function') continue;
    // Measure the natural length with any previous fit removed, or the fit compounds.
    el.removeAttribute('textLength');
    el.removeAttribute('lengthAdjust');
    var length = el.getComputedTextLength();
    if (svgFitWidths[el.id] == null) svgFitWidths[el.id] = length;    // first sight = the design's own width
    if (length > svgFitWidths[el.id] + 0.5) {
      el.setAttribute('textLength', String(svgFitWidths[el.id]));
      el.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    }
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fitPlacedText);
} else {
  fitPlacedText();                              // DOM already parsed (e.g. an inline preview build)
}
// The first pass may have measured a FALLBACK face; once the real fonts arrive, re-measure
// from scratch so the recorded widths are the design's true ones.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(function () { svgFitWidths = {}; fitPlacedText(); });
}`;

/** The preset to build with — always one of this category's, whatever a carried-over draft says. */
function designPreset(id: string): AnimPreset {
  return DESIGN_PRESETS.find((p) => p.id === id) ?? DESIGN_PRESETS[0];
}

/** Build the complete SpxTemplate for an imported SVG design. */
export function assembleImportedSvg(o: ResolvedOptions): SpxTemplate {
  const svg = o.designSvg ?? NO_SVG;
  const name = 'Imported SVG design';
  const fields = svgFields(svg);
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

  const html = documentHtml({
    title: name,
    definitionBlock: definitionScriptBlock(settings, fields),
    body: `  <!-- Imported SVG design — your artwork, exactly as exported. The text layers chosen at
       import carry id="f0", "f1", … and update() writes the operator's values straight into
       them; everything else is untouched. -->
  <div class="${PREFIX}">
    <div class="${PREFIX}-box">
${inlineSvg}
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
  width: calc(${svg.width}px * var(--scale));  /* the artwork's own width drives the size */
  will-change: transform, opacity; /* hint the browser: this element animates */
}
.${PREFIX}-art {
  display: block;
  width: 100%;                     /* fills the box — so --scale resizes art and text together */
  height: auto;                    /* the viewBox keeps the aspect */
}
`;

  const preset = designPreset(o.animation.presetId);
  const ease = resolveEasing(o.animation.easing, preset.autoEase);
  const cfg: PresetConfig = {
    prefix: PREFIX,
    lineCount: 0, // the design presets animate the whole box; the SVG's text is inside it
    hasAccent: false,
    steps: false,
    speed: o.animation.speed,
    easeIn: ease.easeIn,
    easeOut: ease.easeOut,
  };

  const js = runtimeJs(name, preset.emit(cfg)) + SVG_FIT_JS + '\n';

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
    layers: svg.fields.map((f, i) => ({
      id: `f${i}`,
      type: 'text' as const,
      label: f.title,
      fieldId: `f${i}`,
      text: f.sample,
      styles: {},
    })),
  };

  return convertToDataRegion(template);
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
  animationPresets: ['design-fade', 'design-slide', 'design-pop', 'design-blur'],
  defaultPalette: paletteById('ivory'),
  defaultFontId: 'inter',
  defaultZone: 'bottom-left',
  create(options?: WizardOptions) {
    return assembleImportedSvg(resolveOptions(IMPORTED_SVG, options));
  },
};
