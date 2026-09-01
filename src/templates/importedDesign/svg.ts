// The IMPORTED SVG DESIGN: a layered SVG the user made elsewhere, inlined VERBATIM, with its
// own <text> layers bound to operator fields (docs/SVG_IMPORT_PLAN.md).
//
// Architecture B from the plan: the SVG's own text nodes get id="fN" and the standard
// update() writes their textContent - the typography IS the designer's, nothing is redrawn.
// The only edits the markup takes are (a) id="fN" on the bound nodes, (b) sanitization
// (already done at import - assets/svgImport.ts), (c) the candidate markers stripped, and
// (d) a class on the root <svg> so the part registry can name it. Everything else ships
// byte-for-byte as the designer exported it.
//
// Like the raster imported design (shared.ts) this self-assembles from shared/base.ts: the
// ARTWORK decides the size, so the box is exactly the SVG's fitted width - never the standard
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
  type DesignSvgFollower,
  type DesignSvgGrowth,
  type ResolvedOptions,
  type TemplateVariant,
  type WizardOptions,
} from '../../model/wizard';
import type { SpxField } from '../../model/types';
import { SVG_CANDIDATE_ATTR, clockSampleMinutes, svgPictureTarget } from '../../assets/svgImport';
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
import { boundBehaviour } from './behaviour';
import type { AnimPreset, PresetConfig } from '../lowerThirds/animPresets';
import { DESIGN_PRESETS } from './designPresets';
import { PREFIX } from './shared';

/** Stand-in used only when a preview (or the catalog baseline) renders the variant before an
 *  SVG exists. Deterministic on purpose - the baselines hash the emitted panes. */
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
 * it. Any pre-existing id that collides with a bound one is prefixed out of the way - the
 * field ids are the one namespace the platform owns inside the file.
 *
 * `keepMarkers` is the ONE preview-only exception (`ResolvedOptions.previewMarkers`): the
 * mapping step's hover highlight needs a handle on the layer a checklist row means, and the
 * preview iframe is the only canvas that has the fit runtime. A ticked OUTLINE group still
 * loses its marker there - that group is hidden and its live stand-in wears the marker
 * instead (components/wizard/draft.ts `withSvgOutlineFields`), so one marker always points at
 * whatever actually airs.
 */
/** The attribute every element a layout rule names carries. One stamp kind for the feature. */
const LAYOUT_EL_ATTR = 'data-noacg-el';
/** The emitted relationship table's schema (docs/SVG_IMPORT_PLAN.md §6c). Additive optional
 *  fields never bump it; a breaking shape change bumps it and migrates on read in the SAME
 *  commit, the doctrine docs/STATE_MACHINE_SCHEMA.md §5 states and `blocks/animData.ts` keeps. */
const LAYOUT_VERSION = 1;
/** How close to the frame's edge a growing element may get, as a fraction of the frame. The
 *  hug's original constant: growing off the screen was never a fit (plan §3). */
const PANEL_SAFE = 0.04;

const growToken = (i: number) => `g${i}`;
const followToken = (i: number, j: number) => `g${i}f${j}`;

/**
 * THE LAYOUT RELATIONSHIPS OF A DESIGN, in one shape (plan §6c).
 *
 * A NORMALIZING read, the same idiom `parseAnimData` uses: the hug's original one-rectangle
 * `stretch` becomes one axis-'x' rule with derived followers - which is exactly what it always
 * meant - so a draft, a saved wizard option or a project from before this change still builds
 * the graphic it described, and nothing downstream ever sees two shapes.
 */
function layoutRules(svg: DesignSvg): DesignSvgGrowth[] {
  if (svg.growth?.length) return svg.growth;
  return svg.stretch ? [{ candidateId: svg.stretch.candidateId, axis: 'x' }] : [];
}

/** The designer's own name for a marked element, straight off the markup - `data-name`
 *  carries the original spelling where an exporter uniquified the id. Null when the layer
 *  was never named, so the caller can fall back honestly. */
function candidateLabel(svg: DesignSvg, candidateId: string): string | null {
  const doc = new DOMParser().parseFromString(svg.markup, 'image/svg+xml');
  const el = doc.querySelector(`[${SVG_CANDIDATE_ATTR}="${candidateId}"]`);
  const name = el?.getAttribute('data-name') ?? el?.getAttribute('id');
  return name?.trim() ? name.trim() : null;
}

/**
 * THE SWAP AND THE RESTORE BOTH SPEAK `href`, so a bound picture keeps exactly one spelling.
 *
 * Illustrator and Figma both write the SVG 1.1 `xlink:href` on a placed picture, while
 * `setFieldValue` (templates/shared/base.ts) remembers and rewrites the SVG 2 `href`. Left as
 * exported that half-works in the worst way: an operator's swap paints (a browser prefers
 * `href`), and CLEARING the field restores an empty string over a picture the `xlink:href`
 * beside it can no longer bring back - the field's own promise, "empty keeps the picture you
 * drew", failing only on the second click. Moving the value rather than copying it also keeps
 * one base64 payload in the export instead of two.
 */
function normalizePictureHref(el: Element): void {
  const legacy = el.getAttribute('xlink:href');
  if (legacy === null) return;
  if (!el.getAttribute('href')) el.setAttribute('href', legacy);
  el.removeAttribute('xlink:href');
}

/** Rename an element's id and move every in-document reference to it with the rename. An SVG
 *  refers to its own nodes by `#id` all over - a `<use>` inside a `<pattern>`, a gradient, a
 *  clip path - so an id changed on its own turns a painted shape into an empty one. */
function setIdKeepingRefs(root: Element, el: Element, id: string): void {
  const was = el.getAttribute('id');
  el.setAttribute('id', id);
  if (!was || was === id) return;
  for (const ref of Array.from(root.querySelectorAll(`[href="#${was}"], [*|href="#${was}"]`))) {
    if (ref.getAttribute('href') === `#${was}`) ref.setAttribute('href', `#${id}`);
    if (ref.getAttribute('xlink:href') === `#${was}`) ref.setAttribute('xlink:href', `#${id}`);
  }
}

function bindSvgMarkup(svg: DesignSvg, keepMarkers = false): string {
  const doc = new DOMParser().parseFromString(svg.markup, 'image/svg+xml');
  const root = doc.documentElement;

  // The artwork identity (model/structure.ts `.{prefix}-art`) - appended, never replacing
  // classes the designer put there.
  const classes = (root.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
  if (!classes.includes(`${PREFIX}-art`)) classes.push(`${PREFIX}-art`);
  root.setAttribute('class', classes.join(' '));

  // Field ids are ours: a layer Illustrator happened to name "f0" would collide with the
  // binding, so any such id moves aside (references to it inside the file move with it). The
  // behaviour's own fields count here too - its holders carry `fN` ids like any other field,
  // and the stamped layer ids (`q-sel-1`, `p-bar-1`, …) are ours for the same reason.
  const behaviour = boundBehaviour(svg.behaviour);
  const taken = new Set([
    ...[...svg.fields, ...svg.images, ...Array(behaviour?.fieldCount ?? 0)].map((_, i) => `f${i}`),
    ...(behaviour?.layerIds ?? []),
  ]);
  for (const el of Array.from(root.querySelectorAll('[id]'))) {
    const id = el.getAttribute('id')!;
    if (taken.has(id)) setIdKeepingRefs(root, el, `layer-${id}`);
  }

  const clock = countdownIndex(svg);
  [...svg.fields, ...svg.images].forEach((field, i) => {
    const el = root.querySelector(`[${SVG_CANDIDATE_ATTR}="${field.candidateId}"]`);
    if (!el) return;
    if (i === clock) {
      // The countdown DISPLAY: the clock runtime paints into `.{prefix}-clock`, and the
      // operator's minutes land in the hidden #fN holder instead - so this node takes the
      // class and NOT the field id, or update() would write "10" over the ticking readout.
      const own = (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
      if (!own.includes(`${PREFIX}-clock`)) own.push(`${PREFIX}-clock`);
      el.setAttribute('class', own.join(' '));
      return;
    }
    // A PICTURE field binds the node whose href paints the picture, which is not always the node
    // the mapping step offered: Figma's placed raster is a `<rect fill="url(#pattern0)">` painted
    // by an `<image>` parked in `<defs>`, and only that `<image>` responds to a swap
    // (assets/svgImport.ts `svgPictureTarget` states why the two are chosen separately). Taking
    // the id KEEPS the references: the pattern's `<use>` points at the picture by id, so an
    // unaccompanied `setAttribute('id', …)` would leave the shape painting nothing.
    const bound = i >= svg.fields.length ? svgPictureTarget(el, root) : el;
    if (i >= svg.fields.length) normalizePictureHref(bound);
    setIdKeepingRefs(root, bound, `f${i}`);
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
  // THE ELEMENTS A LAYOUT RELATIONSHIP NAMES (plan §6c): every participant - an element that
  // may GROW, and anything DECLARED to travel with it - is stamped with one token, and the
  // emitted NOACG_LAYOUT table says what each token does. One stamp kind for the whole
  // feature, so a rule can name several elements without minting a class per role.
  for (const [i, rule] of layoutRules(svg).entries()) {
    // A SPACE-SEPARATED list of tokens, not a single value: one element may be named by two
    // rules at once - the wider-then-wrap ladder is one panel growing on both axes - and a
    // plain `setAttribute` would let the second rule erase the first one's stamp.
    const stamp = (candidateId: string, token: string) => {
      const el = root.querySelector(`[${SVG_CANDIDATE_ATTR}="${candidateId}"]`);
      if (!el) return;
      const own = (el.getAttribute(LAYOUT_EL_ATTR) ?? '').split(/\s+/).filter(Boolean);
      if (!own.includes(token)) own.push(token);
      el.setAttribute(LAYOUT_EL_ATTR, own.join(' '));
    };
    stamp(rule.candidateId, growToken(i));
    rule.followers?.forEach((f: DesignSvgFollower, j: number) => stamp(f.candidateId, followToken(i, j)));
  }
  // The layers a bound behaviour claims: our id, plus the state class on the ones that are drawn
  // MOMENTS. Before the markers are stripped - that is what they are for.
  behaviour?.markLayers(root);
  const replaced = new Set(svg.outlines.map((o) => o.candidateId));
  for (const el of Array.from(root.querySelectorAll(`[${SVG_CANDIDATE_ATTR}]`))) {
    if (keepMarkers && !replaced.has(el.getAttribute(SVG_CANDIDATE_ATTR) ?? '')) continue;
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
 *  the countdown layer as its LENGTH in minutes, the drawn readout converted - "10:00" is
 *  ten), then one filelist per bound picture layer - update() swaps that node's href, and
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
 * family is stated in a comment - never blocked, because the designer may know the playout
 * machine has the face installed; the wizard already warned out loud.
 */
/** A bundled face declared under the name the artwork asks for - same file, second name. The
 *  comment says which face it really is, so the emitted CSS is readable rather than mysterious. */
function aliasFontFaceCss(font: BundledFont, family: string): string {
  return `/* Bundled open-source font (the file ships with the export - no internet at playout).
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
      // - but a `@font-face` declared as "Archivo" answers nothing in an SVG whose own CSS says
      // `font-family: Archivo-Bold`, so the alias is the whole point of the match.
      blocks.push(
        bundled.family === font.family ? fontFaceCss(bundled) : aliasFontFaceCss(bundled, font.family),
      );
    } else if (font.customFont) blocks.push(customFontFaceCss(font.customFont));
    else unresolved.push(font.family);
  }
  if (unresolved.length > 0) {
    blocks.push(
      `/* UNRESOLVED ${unresolved.length === 1 ? 'FONT' : 'FONTS'}: ${unresolved.join(', ')} - the SVG references ${unresolved.length === 1 ? 'this family' : 'these families'} but no file ships
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
 * value overflows it - never distorting by default, mirroring the raster flow's
 * shrink-not-condense rule. Design-owned JS OUTSIDE the marked region, so the data
 * conversion and every export carry it untouched.
 *
 * ONE FIT PER GRAPHIC (plan §6b). This runtime measures BOTH kinds of line an imported SVG
 * can carry: the `<text>`/`<tspan>` layers the designer drew, and the HTML lines PLACED on the
 * artwork afterwards - an outlined-text stand-in (plan §1.A) or a field added later. The
 * placed ones used to have a fit of their own (`fitPlacedText`, templates/shared/textFit.ts,
 * which the RASTER import still uses) with no room measurement, no height check and no
 * overflow report - so the operator's too-long warning covered the drawn text and went silent
 * on an outlined-text field. `blocks/designLayout.ts` now leaves a template carrying this
 * ladder alone, and update() calls this one hook instead of two.
 *
 * The room a PLACED line gets is its own SLOT - the width its wrapper declares - because
 * nothing was drawn behind it to measure a margin from. The slot is authored (measured from
 * the outlined group's box, or dragged on the canvas), which is why it beats any rectangle a
 * container search might find under it; and being a width alone, a placed line does not wrap.
 * The full reasoning is plan §6b "THE ROOM RULE FOR A PLACED LINE".
 */
const SVG_FIT_JS = `
// ── Text fit (SVG) ────────────────────────────────────────────────────────────
// SVG text neither wraps nor clips: a longer value would run past the artwork. So each bound
// layer has a BUDGET - the width of the text the DESIGNER drew - and a value wider than that
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
var svgFitLines = {};                           // id -> the LINES they drew it on, for a block
var svgFitStep = {};                            // id -> the LEADING they drew those lines at, px
var svgFitWidths = {};                          // id -> that text's width, in the real face
var svgFitSizes = {};                           // id -> the font size it was drawn at, in px
var svgFitRoom = {};                            // id -> { width, lines } the design offers it
var svgFitExtra = {};                           // id -> WIDTH a growing panel gave this line
var svgFitExtraH = {};                          // id -> HEIGHT a growing panel may still give it
var svgFitOver = {};                            // id -> true when even the floor could not fit
var SVG_FIT_FLOOR = 0.55;                       // never smaller than 55% of the drawn size
var SVG_LINE_HEIGHT = 1.2;                      // a wrapped line's step, in ems

// EVERY line this design fits, of both kinds. The layers the DESIGNER drew are <text>/<tspan>
// inside the artwork; a PLACED line is an HTML span the design got afterwards - a stand-in for
// text that was exported as outlines, or a field added later - and it lives after </svg>, in
// the same box. One list, so one ladder walks them and one report names them.
function svgFitNodes() {
  var out = [];
  var drawn = document.querySelectorAll('.${PREFIX}-art text[id], .${PREFIX}-art tspan[id]');
  for (var i = 0; i < drawn.length; i++) {
    if (/^f\\d+$/.test(drawn[i].id) && typeof drawn[i].getComputedTextLength === 'function') out.push(drawn[i]);
  }
  // data-fit="shrink" is the mode a placed line is born in and the only one that ever had a
  // runtime: a line the author set to run free, or to reflow in CSS, is saying the cap does
  // not apply to it, so the ladder leaves it exactly as it was.
  var placed = document.querySelectorAll('.${PREFIX}-box [data-fit="shrink"]');
  for (var j = 0; j < placed.length; j++) {
    if (/^f\\d+$/.test(placed[j].id)) out.push(placed[j]);
  }
  return out;
}

/** A line PLACED on the artwork rather than drawn in it - an HTML span, which measures and
 *  paints through different calls than an SVG text node does. */
function svgFitPlaced(el) {
  return typeof el.getComputedTextLength !== 'function';
}

/** Painted px per LAYOUT px for a placed line - what an entrance that scales the whole design
 *  puts between the two. A drawn layer never needs this: getComputedTextLength answers in the
 *  SVG's own user units, which no transform above it can move. */
function svgPlacedScale(el) {
  var slot = el.parentNode;
  var layout = slot && slot.offsetWidth;
  return layout > 0 ? slot.getBoundingClientRect().width / layout : 1;
}

/** The width of whatever text the node holds right now, in the space its room is measured in:
 *  user units for a drawn layer, LAYOUT px for a placed one. Each is compared only against its
 *  own room, and both spaces stand still while an entrance is mid-flight - so a value the design
 *  cannot hold is caught during the animation exactly as it is at rest. */
function svgTextWidth(el) {
  return svgFitPlaced(el)
    ? el.getBoundingClientRect().width / svgPlacedScale(el)
    : el.getComputedTextLength();
}

// THE ROOM A PLACED LINE GETS IS ITS OWN SLOT - the max-width its wrapper declares. Nothing was
// drawn behind it (it sits on empty artwork, or over shapes this template hides), so there is no
// shape to take a margin from, and the slot is the only statement anybody made about how much
// room the line has: measured from the outlined group's own box at import, or dragged on the
// canvas. That is the same sentence as the drawn line's fallback - a layer with no shape behind
// it keeps the width it was DRAWN at - and it is a WIDTH, so a placed line never wraps: the room
// below it belongs to artwork drawn for something else.
function svgFitSlot(el) {
  var slot = el.parentNode;
  if (!slot || !slot.offsetWidth) return 0;
  var cap = parseFloat(getComputedStyle(slot).maxWidth);
  // No cap at all: the wrapper hugs its line, so its own box is the only room on offer.
  return cap > 0 ? cap : slot.offsetWidth;
}

// ── THE LAST RUNG: NOTHING PAINTS OUTSIDE ITS ROOM (owner ruling, 2026-08-26) ──
// The ladder used to stop at the readability floor and simply REPORT a value it could not fit,
// which left the floored line running straight across whatever the designer drew beside it. So a
// floored block is squeezed into its budget as well: the same glyphs, narrower. It is deliberately
// ugly, it is still reported as too long, and it comes off the moment a shorter value arrives.
//
// Never a default. Filling the room, growing the panel, wrapping and shrinking all happen first;
// this only ever runs on a value no size and no line count could hold.
function svgUnsqueeze(el) {
  if (svgFitPlaced(el)) {
    el.style.transform = '';
    el.style.transformOrigin = '';
    return;
  }
  var kids = el.children.length ? el.children : [el];
  for (var i = 0; i < kids.length; i++) {
    kids[i].removeAttribute('textLength');
    kids[i].removeAttribute('lengthAdjust');
  }
}

function svgSqueeze(el, budget) {
  svgUnsqueeze(el);
  if (!(budget > 0)) return;
  // A PLACED line is HTML and has no textLength, so it takes a horizontal scale pinned to
  // whichever edge its own alignment reads from. Same caveat as a growth follower's transform:
  // a line the TIMELINE animates in its own right is transformed by GSAP too, and the tween
  // wins - so a floored value on a separately-animated placed line loses its squeeze. The
  // artwork's own layers are what the design presets move, so this does not bite by default.
  if (svgFitPlaced(el)) {
    var w = svgTextWidth(el);
    if (!(w > budget + 0.5)) return;
    var align = getComputedStyle(el).textAlign;
    el.style.transformOrigin =
      (align === 'right' ? 'right' : align === 'center' ? 'center' : 'left') + ' center';
    el.style.transform = 'scaleX(' + (budget / w).toFixed(4) + ')';
    return;
  }
  // A DRAWN layer takes SVG's own fit-to-width. Per painted line, because a wrapped block's
  // tspans each have their own length and only the ones actually over need squeezing.
  var kids = el.children.length ? el.children : [el];
  for (var j = 0; j < kids.length; j++) {
    var k = kids[j];
    if (!k.getComputedTextLength) continue;
    if (!(k.getComputedTextLength() > budget + 0.5)) continue;
    k.setAttribute('textLength', budget.toFixed(2));
    k.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  }
}

// Runs as the page parses, with the artwork above it and update() not yet callable. Through
// svgFitValue, never textContent: a block the designer drew as three stacked lines is one value
// with two spaces in it, and taken raw those spaces are the ones that go missing. The LINES they
// drew are kept beside it, because the drawn state has to be reproducible after the first fit has
// repainted the node (svgShowDrawn).
(function () {
  var nodes = svgFitNodes();
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    if (svgFitDrawn[el.id] != null) continue;
    svgFitDrawn[el.id] = svgFitValue(el);
    if (!svgWrappedBlock(el)) continue;
    var lines = [];
    var steps = [];
    var prevY = null;
    for (var k = 0; k < el.children.length; k++) {
      var kid = el.children[k];
      lines.push(kid.textContent);
      // THE LEADING IS THE DESIGNER'S, and it is written two ways: a baked-in y per line
      // (Illustrator, Inkscape) or a dy step off the one before it. Both are read, because a
      // block repainted at some constant instead is a design nobody drew - a 30px standfirst
      // set on 50px steps tightens to 36 the first time the ladder runs.
      var y = parseFloat(kid.getAttribute('y'));
      var dy = parseFloat(kid.getAttribute('dy'));
      if (isFinite(y) && prevY !== null && y > prevY) steps.push(y - prevY);
      else if (k > 0 && isFinite(dy) && dy > 0) steps.push(dy);
      if (isFinite(y)) prevY = y;
    }
    svgFitLines[el.id] = lines;
    // The FIRST step, not an average: a designer who set one leading set it for every line, and
    // a block whose steps differ is doing something this rule has no reading of.
    if (steps.length) svgFitStep[el.id] = steps[0];
  }
})();

/** THE STEP BETWEEN TWO LINES OF THIS BLOCK, in ems - the leading the designer drew where they
 *  drew one, and the house 1.2 where nothing says. Out-of-range values are not leadings: a
 *  block whose lines overlap, or sit a paragraph apart, is not a wrapping block's step and the
 *  constant is the safer answer. */
function svgLineHeight(el) {
  var step = svgFitStep[el.id];
  var drawn = svgFitSizes[el.id];
  if (!(step > 0) || !(drawn > 0)) return SVG_LINE_HEIGHT;
  var ems = step / drawn;
  return ems >= 0.8 && ems <= 3 ? ems : SVG_LINE_HEIGHT;
}

/** PUT THE DRAWN VALUE BACK ON A NODE, to measure the design rather than the operator's copy.
 *
 *  A BLOCK is repainted line for line. Writing its drawn value as textContent would leave ONE
 *  long line standing, and that width becomes the floor of the room below - a budget the block
 *  could never overflow, so a question that wrapped correctly at load stopped wrapping the moment
 *  anybody typed into it. The lines are the ones the designer drew, kept since parse, so this is
 *  the same measurement whenever it is taken and in whatever face has finished loading. */
function svgShowDrawn(el, drawn) {
  var lines = svgFitLines[el.id];
  if (!lines) { el.textContent = drawn; return; }
  svgPaintLines(el, lines, parseFloat(getComputedStyle(el).fontSize) || 0, svgLineHeight(el));
}

/** Is what this node is SHOWING no longer the drawn design - a different value, or the same one
 *  in a different shape? A block is repainted by every fit, so its form goes stale even while
 *  its value does not, and a measurement taken off the previous pass's answer is the previous
 *  pass's answer. */
function svgFitStale(el, showing) {
  return showing !== svgFitDrawn[el.id] || svgWrappedBlock(el) || !!svgFitLines[el.id];
}

function measureSvgBudgets() {
  var nodes = svgFitNodes();
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    var live = svgFitValue(el);
    if (svgFitDrawn[el.id] == null) svgFitDrawn[el.id] = live;
    var drawn = svgFitDrawn[el.id];
    // Any previous fit has to come off first, or the measurement compounds.
    el.style.fontSize = '';
    svgUnsqueeze(el);
    // Measure the design, put the value back. A BLOCK is restored even when the value matches,
    // because the previous pass repainted its lines - see measureSvgRoom for what that cost.
    var stale = svgFitStale(el, live);
    if (stale) svgShowDrawn(el, drawn);
    // A BLOCK'S DRAWN WIDTH IS ITS WIDEST LINE, not the sum of its lines. getComputedTextLength()
    // adds up every tspan under the node, so a question drawn as three stacked lines reported a
    // width three lines long - and that number is the FLOOR of the room below, so the block could
    // never overflow anything and never wrapped.
    svgFitWidths[el.id] = svgBlockWidth(el);
    svgFitSizes[el.id] = parseFloat(getComputedStyle(el).fontSize) || 0;
    // PUT BACK WHAT WAS THERE, in the shape it was in. Writing textContent leaves one flat line,
    // which the ladder normally repaints straight afterwards - but not on the paths that skip a
    // node (no budget, no drawn size), and a block left flat there is a design nobody drew.
    // Where the value IS the drawn one, the drawn lines are the shape to put back.
    if (stale) { if (live === drawn) svgShowDrawn(el, drawn); else el.textContent = live; }
  }
}

// ── THE ROOM THE DESIGN GIVES A LINE ──────────────────────────────────────────
// The budget is NOT the width of the text the designer typed. A name drawn 402px wide inside a
// 1040px banner has 588px of empty banner beside it, and taking the drawn text as the budget
// spent none of it: the 403rd pixel shrank the type while more than half the panel stood
// empty. So the budget is the ROOM - the shape drawn behind the line, out to a right margin
// mirroring the left one the designer left. A line with no shape behind it keeps the drawn
// width as its budget, which is the honest answer when nothing says otherwise.
//
// The same measurement answers how many LINES the design can hold: the gap from this line down
// to the nearest thing drawn below it (a second text layer, or the panel's own bottom margin).
// A name in a three-line strap measures no room and stays one line, exactly as drawn; a
// question alone on a board measures several and may wrap. Nothing is asked of the designer
// and nothing about the artwork changes - which is the rule this ladder exists to keep.
function svgFitContainer(el) {
  var art = document.querySelector('.${PREFIX}-art');
  if (!art) return null;
  var box = el.getBoundingClientRect();
  var shapes = art.querySelectorAll('rect, path, polygon, ellipse, circle');
  var best = null;
  for (var i = 0; i < shapes.length; i++) {
    var r = shapes[i].getBoundingClientRect();
    // Contains the line, and is genuinely bigger than it - a highlight rule under a word is
    // not the panel the word sits in.
    if (r.left > box.left + 1 || r.right < box.right - 1) continue;
    if (r.top > box.top + 1 || r.bottom < box.bottom - 1) continue;
    if (r.width * r.height <= box.width * box.height) continue;
    if (!best || r.width * r.height < best.width * best.height) best = r;
  }
  return best;
}

/** THE PANEL'S OWN TOP PADDING - the gap the designer left between the panel's top edge and the
 *  first line drawn inside it, MIRRORED onto the bottom to bound a wrapped block.
 *
 *  Sideways a line's room already stops one drawn left-inset short of the far edge; downwards
 *  there was no such rule at all, so a wrapped block could paint right onto the panel's bottom
 *  edge - a graphic with no safe space around its own text (owner walk, 2026-08-29). It is the
 *  same mirror, on the other axis, and it is MEASURED off the rest pose the designer drew rather
 *  than invented as a constant. Mirroring the TOP (rather than reading the drawn bottom gap) is
 *  what keeps a lone line drawn high in a tall panel free to wrap into the space below it: that
 *  space is room, while the space above the first line is the margin. A panel with no bound line
 *  drawn in it keeps its own edge, which is the honest fallback. */
function svgPanelTopPad(panel, nodes) {
  var first = null;
  for (var i = 0; i < nodes.length; i++) {
    var r = nodes[i].getBoundingClientRect();
    if (!(r.width > 0) || !(r.height > 0)) continue;
    if (r.left < panel.left - 1 || r.left >= panel.right) continue;
    if (r.top < panel.top - 1 || r.top >= panel.bottom) continue;
    if (first === null || r.top < first) first = r.top;
  }
  return first === null ? 0 : Math.max(0, first - panel.top);
}

/** How far down this line's block may run before it starts changing the design.
 *
 *  Two bounds, and the nearer wins. Anything drawn BELOW the line keeps THE WHOLE GAP THE
 *  DESIGNER DREW between them - a name with a role under it therefore has no room of its own at
 *  all, and a second line has to be bought by growing the panel. The leading between two lines
 *  is the composition, not spare room: filling it was how a wrapped name came to sit hard
 *  against the role beneath it (owner walk, 2026-08-29 - "the panel doesn't have a safe space").
 *  With nothing drawn below, the bound is the panel's own bottom edge less its top padding
 *  mirrored. Only things that overlap the line horizontally count; a crest off to one side does
 *  not. */
function svgFitCeiling(el, panel, pad) {
  var art = document.querySelector('.${PREFIX}-art');
  var box = el.getBoundingClientRect();
  var others = art.querySelectorAll('text, tspan, image, rect, path, polygon, ellipse, circle');
  var top = panel.bottom - (pad || 0);
  for (var i = 0; i < others.length; i++) {
    var o = others[i];
    if (o === el || o.contains(el) || el.contains(o)) continue;
    var r = o.getBoundingClientRect();
    if (!(r.width > 0) || !(r.height > 0)) continue;
    if (r.width * r.height >= panel.width * panel.height) continue;   // that IS the panel
    if (r.right < box.left + 1 || r.left > box.right - 1) continue;   // no horizontal overlap
    if (r.top < box.bottom - 1) continue;                             // not below this line
    // The gap the designer drew between the two is kept WHOLE, so the bound is this line's own
    // drawn bottom rather than the neighbour's top.
    if (box.bottom < top) top = box.bottom;
  }
  return top;
}

/** A CAP: panel FURNITURE rather than a neighbour - a narrow shape drawn hugging the panel's
 *  far edge (a gradient end-cap, an accent bar). Text must stay off it (owner, 2026-08-28:
 *  "text stays between the caps, never on top of them"), so it bounds a line's room exactly
 *  like a neighbour does - but it TRAVELS when the panel grows, so it must not PEN the line:
 *  widening the panel moves the cap and genuinely buys the line room. Only a shape or an image
 *  can be one; a text beside a text is a real neighbour. */
function svgIsEndCap(o, r, panel, axis, dir) {
  var tag = (o.tagName || '').toLowerCase();
  if (tag === 'text' || tag === 'tspan') return false;
  // The cap hugs the edge that MOVES, which is not always the far one: a panel growing upward
  // (a lower third keeping its drawn bottom) carries the furniture on its TOP edge and leaves
  // anything closing its bottom exactly where the designer drew it.
  if (axis === 'y') {
    if (r.height > panel.height * 0.25) return false;
    return dir < 0
      ? r.top <= panel.top + Math.max(2, panel.height * 0.02) && r.bottom < panel.bottom - 1
      : r.bottom >= panel.bottom - Math.max(2, panel.height * 0.02) && r.top > panel.top + 1;
  }
  if (r.width > panel.width * 0.25) return false;
  return dir < 0
    ? r.left <= panel.left + Math.max(2, panel.width * 0.02) && r.right < panel.right - 1
    : r.right >= panel.right - Math.max(2, panel.width * 0.02) && r.left > panel.left + 1;
}

/** The nearest drawn thing to the RIGHT of this line, on its own rows - what a longer value would
 *  run into (owner, 2026-08-26: "a line's room is bounded by what is drawn next to it"). Two
 *  labels placed apart on ONE baseline is how an exporter writes a strap's place and its time, and
 *  the panel behind them says nothing about where the first one has to stop: HELSINKI is bounded by
 *  19:30, not by the banner, and widening the banner moves neither. The panel's own right edge is
 *  the backstop, so a line with nothing beside it is unchanged. The bound is returned WITH what
 *  it is - an end CAP bounds the room without penning the line (see svgIsEndCap). */
function svgFitNeighbour(el, panel) {
  var art = document.querySelector('.${PREFIX}-art');
  var box = el.getBoundingClientRect();
  var others = art.querySelectorAll('text, tspan, image, rect, path, polygon, ellipse, circle');
  var left = panel.right;
  var cap = false;
  for (var i = 0; i < others.length; i++) {
    var o = others[i];
    if (o === el || o.contains(el) || el.contains(o)) continue;
    var r = o.getBoundingClientRect();
    if (!(r.width > 0) || !(r.height > 0)) continue;
    if (r.width * r.height >= panel.width * panel.height) continue;   // that IS the panel
    if (r.bottom < box.top + 1 || r.top > box.bottom - 1) continue;   // not on this line's rows
    if (r.left < box.right - 1) continue;                             // not to the right of it
    if (r.left < left) { left = r.left; cap = svgIsEndCap(o, r, panel, 'x', 1); }
  }
  return { edge: left, cap: cap };
}

function measureSvgRoom() {
  var nodes = svgFitNodes();
  // THE WHOLE DESIGN AT REST BEFORE ANY OF IT IS MEASURED, never one line at a time. A
  // neighbour still holding a WRAPPED operator value is taller than the designer drew it, and
  // it is exactly what the line above measures its ceiling against - so a per-line swap reads
  // one line of the design against everybody else's screen. Restoring every value afterwards
  // costs one extra loop and makes the room a pure function of the artwork.
  //
  // A node holding exactly what the designer drew is NOT rewritten, only read: writing
  // textContent flattens whatever markup is underneath, and a kerned headline's own per-glyph
  // tspans are the artwork arriving verbatim.
  //
  // A BLOCK is the exception, and it is restored on every pass even when the VALUE has not
  // changed - because its FORM has. The first fit repaints it at whatever line count that pass
  // settled on, so the second pass (the one document.fonts.ready fires) would measure the room
  // against the previous pass's own answer: a question drawn on three lines and first fitted
  // onto two then reported two lines' worth of height as the room the design offers, and each
  // pass shrank it again. Same failure as an un-rested layout (refitSvgText), same fix - and
  // svgShowDrawn puts the drawn LINES back, so nothing is lost by restoring it.
  var live = [];
  var swapped = [];
  for (var a = 0; a < nodes.length; a++) {
    var was = svgFitValue(nodes[a]);
    var drawn = svgFitDrawn[nodes[a].id];
    live.push(was);
    swapped.push(drawn != null && svgFitStale(nodes[a], was));
    nodes[a].style.fontSize = '';
    if (swapped[a]) svgShowDrawn(nodes[a], drawn);
  }
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    // A PLACED line's room is its slot, and a slot has no height - one line, filled and then
    // shrunk. Nothing else about it is measured, because nothing else about it was drawn.
    if (svgFitPlaced(el)) {
      svgFitRoom[el.id] = { width: svgFitSlot(el), height: 0, top: 0, penned: false };
      continue;
    }
    var box = el.getBoundingClientRect();
    // Screen px -> the artwork's own units, read off the element's CTM. This used to be derived
    // from the line's own two widths (advance length / ink box), which is CLOSE and not exact:
    // a glyph's side bearings are in one and not the other, so the ratio carried a per-typeface
    // error of a percent or two straight into the ROOM - and a grown banner then missed the
    // margin it was mirroring by a pixel or so (measured 2026-08-26: 51.4px against a drawn 50).
    var ctm = el.parentNode && el.parentNode.getScreenCTM ? el.parentNode.getScreenCTM() : null;
    var scale = ctm && ctm.a ? 1 / ctm.a : 1;
    var panel = svgFitContainer(el);
    // "height" is the room the BLOCK has, measured from this line's own top - not a line
    // count, because the count depends on the size and the size is what the ladder changes.
    // A 112px board panel holds one 44px line and three 24px ones, and only the height knows
    // that. Zero height (a line drawn hard against whatever is below it) means no wrapping.
    var room = { width: svgFitWidths[el.id], height: 0, top: 0, penned: false };
    if (panel && box.width > 0) {
      var inset = box.left - panel.left;
      // Where this line has to stop: its neighbour if it has one, else the panel's own right
      // edge less the margin the designer left on the left. A PENNED line (one bounded by a
      // neighbour rather than by the panel) is marked, because widening the panel gives it
      // nothing - so it must not drive the growth either. A bound that is an end CAP does not
      // pen: the cap is the panel's own furniture and travels with its growing edge, so
      // widening genuinely buys the line room - the text just stays off the cap meanwhile.
      var bound = svgFitNeighbour(el, panel);
      var edge = bound.edge;
      room.penned = edge < panel.right - 0.5 && !bound.cap;
      // The gap to keep: half the drawn type beside a neighbour (a readable space between two
      // labels), the design's own left margin mirrored when the panel - or its cap - is the
      // bound.
      var pad = room.penned ? ((svgFitSizes[el.id] || 0) * 0.5) / scale : inset;
      room.width = Math.max(svgFitWidths[el.id], (edge - pad - box.left) * scale);
      // A LINE ALWAYS HAS ROOM FOR ITSELF, whatever the margins say - the floor is the block as
      // drawn, never zero. Zero would read as "this line overflows its room by its own height"
      // to everything downstream, and the lowest line of a stack (whose ceiling is the panel's
      // mirrored top padding, drawn tighter than that on most artwork) is exactly that case.
      room.height = Math.max(
        box.height * scale,
        (svgFitCeiling(el, panel, svgPanelTopPad(panel, nodes)) - box.top) * scale,
      );
      // Where the drawn line starts, in the artwork's own units - the datum the painted block's
      // height is checked against. getBBox() answers in user units and ignores transforms, so
      // the check holds while an entrance is mid-flight.
      room.top = el.getBBox ? el.getBBox().y : 0;
    }
    svgFitRoom[el.id] = room;
  }
  // Put each value back in the shape it was in - the drawn LINES where the value is the drawn
  // one, so a block skipped by the ladder is not left flattened (measureSvgBudgets says why).
  for (var b = 0; b < nodes.length; b++) {
    if (!swapped[b]) continue;
    if (live[b] === svgFitDrawn[nodes[b].id]) svgShowDrawn(nodes[b], live[b]);
    else nodes[b].textContent = live[b];
  }
}

/** Break a value into at most "max" lines no wider than "budget", at the current size. A word
 *  longer than the budget stays whole and simply overflows - the shrink answers that. */
function svgWrapLines(el, value, budget, max) {
  var words = value.split(/\\s+/);
  var lines = [];
  var line = '';
  for (var i = 0; i < words.length; i++) {
    var next = line ? line + ' ' + words[i] : words[i];
    el.textContent = next;
    if (line && el.getComputedTextLength() > budget && lines.length + 1 < max) {
      lines.push(line);
      line = words[i];
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** IS THIS NODE A BLOCK OF LINES - one value spread over several tspans?
 *
 *  True for the lines this runtime paints, and true for the DESIGNER'S own stacked lines, which
 *  the import stamps with the same attribute the moment they read as one wrapping field
 *  (assets/svgImport.ts markWrappedBlock). One stamp, so a block measures and reads back the
 *  same way before its first update() and after it.
 *
 *  False for the tspans a kerned headline is written as: those are RUNS of one line, they carry
 *  no stamp, and every measurement of them is the line's own - the whole advance, read straight
 *  off the text node. */
function svgWrappedBlock(el) {
  var kids = el.children;
  return !!(kids.length && kids[0].hasAttribute && kids[0].hasAttribute('data-noacg-line'));
}

/** THE VALUE A BOUND NODE HOLDS RIGHT NOW.
 *
 *  A BLOCK holds it as one tspan per line, and textContent concatenates those with nothing
 *  between them - so re-reading it that way loses one space per break, and the next pass fits a
 *  different value than the one the operator typed ("Ada Lovelace" comes back as "AdaLovelace").
 *  The lines are stamped, so they are read back as the value they were made from. Anything else -
 *  a plain line, or a kerned line's runs - is its own textContent, untouched. */
function svgFitValue(el) {
  if (!svgWrappedBlock(el)) return el.textContent;
  var kids = el.children;
  var parts = [];
  for (var i = 0; i < kids.length; i++) parts.push(kids[i].textContent);
  return parts.join(' ');
}

/** Paint a wrapped value as tspans on the node's own x, stepping down by the line height - in
 *  ems, the designer's where they drew one (svgLineHeight). One line is written as plain text,
 *  so a graphic that never wraps emits nothing new. */
function svgPaintLines(el, lines, size, lineHeight) {
  var lh = lineHeight > 0 ? lineHeight : SVG_LINE_HEIGHT;
  if (lines.length < 2) { el.textContent = lines[0] || ''; return; }
  // EVERY LINE RESTARTS AT THE TEXT'S OWN X, and a layer with no x attribute starts at 0 -
  // which is SVG's own default and exactly where Illustrator puts it, since Illustrator writes
  // the position in the element's TRANSFORM instead. Left off, a tspan continues from wherever
  // the previous one ended and the wrap paints a staircase running out of the panel.
  var x = el.getAttribute('x');
  if (x === null) x = '0';
  el.textContent = '';
  for (var i = 0; i < lines.length; i++) {
    // The namespace comes from the node itself rather than a literal URL: an XML namespace is
    // not a network reference, but the export gate scans emitted code for URLs and cannot tell
    // the two apart - and it is right not to try (pillar 3: emitted code reaches no network).
    var t = document.createElementNS(el.namespaceURI, 'tspan');
    t.setAttribute('x', x);
    t.setAttribute('dy', i === 0 ? '0' : (size * lh).toFixed(2));
    // MARKED AS OURS, so svgFitValue can read the value back with its spaces intact.
    t.setAttribute('data-noacg-line', '');
    t.textContent = lines[i];
    el.appendChild(t);
  }
}

/** The widest of a block's lines, which is what has to fit the budget. Anything that is not a
 *  block - a placed line, a plain line, a kerned line's runs - measures as one line, because it
 *  IS one: summing a kerned headline's runs is the correct answer for it and taking the widest
 *  would report a fraction of the line as its width. */
function svgBlockWidth(el) {
  if (svgFitPlaced(el) || !svgWrappedBlock(el)) return svgTextWidth(el);
  var widest = 0;
  for (var i = 0; i < el.children.length; i++) {
    var w = el.children[i].getComputedTextLength();
    if (w > widest) widest = w;
  }
  return widest;
}

// THE LADDER (owner-ruled 2026-08-23): fill the panel, then wrap inside the height the design
// already has, then shrink to the readability floor, then say so. The artwork is never
// reshaped to make copy fit - a panel grows only where the author opted into it (stretchSvgPanel
// below), and past the floor the value is reported as too long rather than clipped.
function fitSvgText() {
  if (typeof growSvgLayout === 'function') growSvgLayout();
  var nodes = svgFitNodes();
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    if (svgFitWidths[el.id] == null) measureSvgBudgets();
    if (svgFitRoom[el.id] == null) measureSvgRoom();
    el.style.fontSize = '';                     // back to the drawn size before measuring
    svgUnsqueeze(el);                           // …and out of any previous pass's squeeze
    var room = svgFitRoom[el.id];
    var budget = room.width + (svgFitExtra[el.id] || 0);
    var drawnSize = svgFitSizes[el.id];
    var value = svgFitValue(el);
    svgFitOver[el.id] = false;
    if (!(budget > 0) || !(drawnSize > 0)) continue;

    var size = drawnSize;
    var floor = drawnSize * SVG_FIT_FLOOR;
    var lineHeight = svgLineHeight(el);         // the designer's leading, or the house 1.2
    // WHERE A GROWING PANEL PUTS ITS CEILING. Sideways, growth is more BUDGET (above). Downwards
    // it is not a budget at all - it is somewhere to WRAP into, so it raises the ceiling this
    // block may fill and the panel is then grown to whatever the settled block actually needed
    // (growSvgHeights below). The ceiling is the MAXIMUM the rule could ever give, measured at
    // rest, so the wrap never chases a height that is itself still moving.
    var ceiling = room.height + (svgFitExtraH[el.id] || 0);
    // WRAP AND SHRINK TOGETHER. How many lines fit is a function of the SIZE - the quiz board's
    // 112px panel holds one line of 44px type and three of 24px - so every pass re-asks. While
    // more lines are still reachable the size comes down in small steps, because the next step
    // may buy a whole line rather than a few pixels of width; once the block can only ever be
    // one line, the exact ratio settles it in one move.
    for (var pass = 0; pass < 8; pass++) {
      el.style.fontSize = size === drawnSize ? '' : size.toFixed(2) + 'px';
      // HOW MANY LINES THE ROOM COULD HOLD - an upper bound the measured check below prunes,
      // never the answer on its own. A block of n lines is (n-1) line STEPS plus one line's own
      // box, not n steps: counting it as n steps loses the last line of every block that fills
      // its room, which is exactly the block a designer drew to fill it. The question drawn on
      // three lines was offered two, so it shrank to fit a room it already fitted.
      var maxLines = Math.max(1, 1 + Math.floor((ceiling - size) / (size * lineHeight)));
      // HEIGHT IS CHECKED, NOT CALCULATED, and a block that does not fit loses a LINE rather
      // than keeping one that prints through the layer below it. A wrapped block starts at the
      // first line's baseline and grows down, so the line count is arithmetic with an ascender
      // and a descender in it; measuring the painted block is exact. Falling back through the
      // counts is what guarantees the last line stays inside the shape it was drawn in - at the
      // floor this settles on one long line, which overruns sideways where somebody can see it
      // rather than over somebody else's artwork.
      var width = 0;
      var tall = false;
      for (var n = maxLines; n >= 1; n--) {
        svgPaintLines(el, n > 1 ? svgWrapLines(el, value, budget, n) : [value], size, lineHeight);
        width = svgBlockWidth(el);
        tall = ceiling > 0 && !!el.getBBox
          && el.getBBox().y + el.getBBox().height > room.top + ceiling + 0.5;
        if (!tall) break;
      }
      if (width <= budget + 0.5 && !tall) break;
      if (size <= floor + 0.01) { svgFitOver[el.id] = true; break; }
      // COULD A SMALLER SIZE STILL BUY A LINE? Counted the SAME WAY as maxLines above, or the
      // two disagree by one and the ladder takes the width-ratio jump past the very size at
      // which the extra line would have fitted.
      var atFloor = Math.max(1, 1 + Math.floor((ceiling - floor) / (floor * lineHeight)));
      var canGrowLines = atFloor > maxLines;
      var ratio = width > budget ? budget / width : 0.94;
      size = Math.max(floor, canGrowLines || tall ? size * 0.9 : size * ratio);
    }
    // The floor is a legibility rule, not a licence to paint over the artwork: a value that
    // reached it and is STILL wider than its room gets squeezed the rest of the way. It stays
    // reported as too long - the operator is told, and the graphic still airs inside its shape.
    if (svgFitOver[el.id]) svgSqueeze(el, budget);
    el.classList.toggle('${PREFIX}-overflow', !!svgFitOver[el.id]);
  }
  if (typeof growSvgHeights === 'function') growSvgHeights();
}

/**
 * WHICH VALUES ARE TOO LONG FOR THIS GRAPHIC - the field ids whose copy could not be made to
 * fit even at the floor, after filling the panel and using every line the design has room for.
 * The artwork is never reshaped and the copy is never cut to hide it (owner ruling 2026-08-23),
 * so this is how an operator surface can say so before the graphic goes to air.
 */
function noacgTextOverflow() {
  var out = [];
  for (var id in svgFitOver) if (svgFitOver[id]) out.push(id);
  return out;
}

// THE ROOM IS THE DESIGN'S, NEVER THE LAST PASS'S. A re-measure has to start from the artwork
// AT REST: measured while a panel is still grown from the previous pass, the room reads as
// bigger than the designer drew, the block looks like it already fits, and the growth is
// quietly dropped - the same fit answering the same value differently on its second run. That
// is the one thing this may not do (docs/SVG_IMPORT_PLAN.md §6c), so every re-measure rests
// first and the pass is a pure function of the value and the design.
function refitSvgText() {
  if (typeof svgLayoutRest === 'function') svgLayoutRest();
  measureSvgBudgets();
  measureSvgRoom();
  fitSvgText();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', refitSvgText);
} else {
  refitSvgText();                               // DOM already parsed (e.g. an inline preview build)
}
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(refitSvgText);
}`;

/**
 * THE HUG (docs/SVG_IMPORT_PLAN.md §3), emitted only for a design whose author said its panel
 * grows. Its doctrine is the raster stretch runtime's (importedDesign/stretch.ts): ONE measured
 * value - how far the longest bound line overflows the width it was drawn at - widens the
 * panel, and the text fit above then answers only what the frame's safe margin could not give.
 *
 * Everything is measured in SCREEN px and converted back through each element's own CTM,
 * because a group between the artwork's root and a layer may carry a transform, and comparing
 * raw attribute numbers across two such spaces is how a banner ends up growing the wrong way.
 */
/**
 * THE RELATIONSHIP TABLE, emitted as data the runtime below loops over (plan §6c).
 *
 * It is DATA, and versioned, because it is a persisted format: the author declares which
 * element grows, which way, how far and what travels with it, and principle 6 applies to
 * anything a saved template carries. Emitted as a HIDDEN model it would be the second scene
 * model the architecture forbids; emitted as a commented literal the code reads - and the code
 * still the truth - it is not. A reader can delete a row and the relationship is gone.
 */
function layoutDataJs(svg: DesignSvg, labelOf: (candidateId: string) => string): string {
  const rules = layoutRules(svg);
  const rows = rules.map((rule, i) => {
    const axis = rule.axis ?? 'x';
    const way = axis === 'x' ? 'wider' : 'taller';
    const followers = rule.followers?.length
      ? `,\n      followers: [${rule.followers
          .map((f: DesignSvgFollower, j: number) => `{ el: '${followToken(i, j)}', mode: '${f.mode ?? 'move'}' }`)
          .join(', ')}]`
      : '';
    const note = rule.followers?.length
      ? `${rule.followers.length} layer(s) travel with it`
      : 'whatever is drawn past its moving edge travels with it';
    return `    // "${labelOf(rule.candidateId)}" grows ${way}; ${note}.
    { el: '${growToken(i)}', axis: '${axis}', safe: ${PANEL_SAFE}${followers} }`;
  });
  return `
// ── Layout relationships (SVG) ────────────────────────────────────────────────
// WHICH ELEMENT MAY GROW, WHICH WAY, HOW FAR, AND WHAT TRAVELS WITH IT.
//
// Nothing here is elastic by default: a graphic with an empty table never moves, which is what
// every board and every scorebug wants. Each row names one element by the data-noacg-el stamp
// it carries in the artwork above, the axis it may grow on, and how close to the frame's edge
// it may get (\`safe\`, a fraction of the frame). A row with its own \`followers\` list moves
// exactly those layers; a row without one falls back to measuring what sits past the growing
// edge, which is a fair guess sideways and a poor one downwards - so a vertical rule is
// normally written with its followers spelled out.
//
// Delete a row and that element stops growing. Edit \`axis\` and it grows the other way.
var NOACG_LAYOUT = {
  version: ${LAYOUT_VERSION},
  rules: [
${rows.join(',\n')}
  ]
};
`;
}

function growthRuntimeJs(): string {
  return `
// ── Panel hug (SVG) ───────────────────────────────────────────────────────────
// The panel below grows with its text: a longer value widens it instead of shrinking the type,
// which is what a lower third wants (a board wants the opposite, and simply has no such
// function). Everything drawn PAST the panel's right edge travels with it, and the growth stops
// at the frame's safe margin - past that, the text fit shrinks whatever is still over.
// Remove this block and the graphic becomes a fixed one.
//
// One limit worth knowing: a follower travels by its transform ATTRIBUTE, and a CSS transform
// beats an attribute - so a layer the timeline animates in its own right (a per-layer stagger,
// say) stays where its animation puts it instead of travelling with the edge.
// Per rule, measured at rest and rebuilt on every pass: the element's drawn size, what travels
// with its edge, and the bound lines inside it. Indexed by the rule's position in the table.
var svgGrowRest = [];

/** The element a table row names, by the stamp it carries in the artwork. The stamp is a LIST -
 *  a panel that both widens and wraps is named by two rows - so the match is word-wise. */
function svgLayoutEl(token) {
  return document.querySelector('.${PREFIX}-art [${LAYOUT_EL_ATTR}~="' + token + '"]');
}

/** Screen px per unit of the space an element's own measurements are written in - the CTM of
 *  the space a drawn layer's transform lives in, and for a PLACED line the painted-to-layout
 *  ratio, since that is the space its width and its slot are both measured in. */
function svgUserScale(el) {
  if (svgFitPlaced(el)) return svgPlacedScale(el);   // both defined in the fit block above
  var ctm = el.parentNode && el.parentNode.getScreenCTM ? el.parentNode.getScreenCTM() : null;
  return ctm && ctm.a ? ctm.a : 1;
}

/** THE ATTRIBUTES A RULE'S GROWTH WRITES, with the values they hold right now: sideways a
 *  rect's width, downwards its height - and its y as well when it grows UPWARD, because a
 *  rect extends from its own y. A panel drawn as a PATH (Illustrator's rounded rectangle) has
 *  no width to change, so the half of its points past the middle is shifted instead
 *  (svgShiftPathD), which keeps the corner radii exactly as drawn.
 *
 *  Read at rest it is the design, and svgGrowSet puts that back verbatim; read at apply time
 *  it is the design plus whatever an earlier rule of the same pass granted, which is what lets
 *  one panel carry both a widening row and a wrapping one. */
function svgGrowBase(rule, el, dir) {
  var base = {};
  if ((el.tagName || '').toLowerCase() === 'path') {
    base.d = el.getAttribute('d');
    return base;
  }
  if (rule.axis === 'y') {
    base.height = el.getAttribute('height');
    if (dir < 0) base.y = el.getAttribute('y');
  } else {
    base.width = el.getAttribute('width');
  }
  return base;
}

/** Write a base back, attribute by attribute. A null value means the element never carried
 *  that attribute, so it is removed rather than written as "null". */
function svgGrowSet(el, base) {
  for (var k in base) {
    if (base[k] == null) el.removeAttribute(k);
    else el.setAttribute(k, base[k]);
  }
}

// ── Growing a PATH panel ──────────────────────────────────────────────────────
// A rounded rectangle exported as a <path> grows the way a 9-slice does: every point on the
// GROWING side of the shape's middle moves by the grant, so the two straight runs get longer
// and the drawn corner curves ride along unchanged. "dir" says which side that is - the far
// half for a panel growing right or down, the near half (moved the other way) for one growing
// up. The path data is parsed to absolute segments once per apply, shifted, and re-emitted;
// resting restores the drawn data verbatim.
function svgShiftPathD(d, axis, split, dir, delta) {
  var tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\\d*\\.\\d+|\\d+)(?:e[-+]?\\d+)?/gi);
  if (!tokens) return d;
  var ARITY = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  var x = 0, y = 0, sx = 0, sy = 0;
  var out = '';
  var i = 0, cmd = '';
  var moves = function (v) { return dir < 0 ? v < split : v > split; };
  var shift = function (vx, vy) {
    // Everything is emitted ABSOLUTE, the shifted coordinate included, so a relative source
    // command cannot smear the shift across the points that follow it.
    if (axis === 'y') return vx.toFixed(3) + ',' + (moves(vy) ? vy + dir * delta : vy).toFixed(3);
    return (moves(vx) ? vx + dir * delta : vx).toFixed(3) + ',' + vy.toFixed(3);
  };
  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i])) cmd = tokens[i++];
    var upper = cmd.toUpperCase();
    var n = ARITY[upper];
    if (n === undefined) return d;                 // unknown command: hand the data back untouched
    if (upper === 'Z') { out += 'z'; x = sx; y = sy; continue; }
    var nums = [];
    for (var k = 0; k < n; k++) nums.push(parseFloat(tokens[i + k]));
    i += n;
    var rel = cmd !== upper;
    if (upper === 'H') { x = rel ? x + nums[0] : nums[0]; out += 'L' + shift(x, y); }
    else if (upper === 'V') { y = rel ? y + nums[0] : nums[0]; out += 'L' + shift(x, y); }
    else if (upper === 'A') {
      x = rel ? x + nums[5] : nums[5];
      y = rel ? y + nums[6] : nums[6];
      out += 'A' + nums[0] + ',' + nums[1] + ',' + nums[2] + ',' + nums[3] + ',' + nums[4] + ',' + shift(x, y);
    } else {
      var abs = [];
      for (var p = 0; p + 1 < n; p += 2) {
        abs.push(shift(rel ? x + nums[p] : nums[p], rel ? y + nums[p + 1] : nums[p + 1]));
      }
      x = rel ? x + nums[n - 2] : nums[n - 2];
      y = rel ? y + nums[n - 1] : nums[n - 1];
      out += upper + abs.join(',');
      if (upper === 'M') { sx = x; sy = y; cmd = rel ? 'l' : 'L'; }
    }
  }
  return out;
}

/** Grow one element by delta user units along "dir": a rect by arithmetic on its numbers (an
 *  upward grower moves its y as well, since a rect extends from there), a path by shifting the
 *  points on the growing side of its own middle. */
function svgGrowElBy(rule, el, base, dir, delta) {
  if ((el.tagName || '').toLowerCase() === 'path') {
    var bb = el.getBBox();
    var split = rule.axis === 'y' ? bb.y + bb.height / 2 : bb.x + bb.width / 2;
    el.setAttribute('d', svgShiftPathD(base.d, rule.axis === 'y' ? 'y' : 'x', split, dir, delta));
    return;
  }
  if (rule.axis === 'y') {
    el.setAttribute('height', String((parseFloat(base.height) || 0) + delta));
    if (dir < 0) el.setAttribute('y', String((parseFloat(base.y) || 0) - delta));
  } else {
    el.setAttribute('width', String((parseFloat(base.width) || 0) + delta));
  }
}

/** WHICH WAY A RULE GROWS: +1 towards the frame's right or bottom, -1 towards its left or top.
 *
 * SIDEWAYS the text answers it. A start-anchored line gains room only to its RIGHT, so the
 * panel widens rightward whatever else is true of the composition - widening it leftward would
 * move the panel and give the line nothing.
 *
 * DOWNWARDS nothing ties it, so the panel grows AWAY FROM THE FRAME EDGE IT IS ANCHORED TO -
 * the nearer of the two. A lower third is drawn against the frame's BOTTOM (130px below it and
 * 760 above, on the shipped Illustrator sample), so it gets taller UPWARDS, into empty screen,
 * and the edge the designer composed against never moves.
 *
 * That was the whole reason "the text wraps onto more lines" did nothing on the archetypal
 * file (owner walk, 2026-08-29): growth was always downward and the cap mirrored the inset from
 * the frame's TOP, which put the ceiling 630px ABOVE the panel's own bottom edge. Every lower
 * third therefore measured ZERO room to grow, the wrap rung had nowhere to go, and the ladder
 * fell straight through to shrinking - the one rung the owner ruled must come last.
 */
function svgGrowDir(rule, el, frame) {
  if (rule.axis !== 'y') return 1;
  var box = el.getBoundingClientRect();
  return frame.bottom - box.bottom < box.top - frame.top ? -1 : 1;
}

/** THE FURTHEST THE GROWING EDGE MAY REACH, in screen px on the frame's own axis.
 *
 * GROWTH IS SYMMETRICAL (owner, 2026-08-26): the margin the design keeps on the side the element
 * is ANCHORED to is mirrored onto the side it grows towards, so a banner drawn 150px in from the
 * left stops 150px short of the right and the graphic keeps the composition it was drawn with.
 * The rule's own safe margin is the floor, for a panel drawn hard against its edge. An inset is
 * never negative, so this can never permit growth past the frame - "we cannot have templates
 * outgrow the screen" is structural here rather than a number somebody has to keep right.
 */
function svgGrowCap(rule, el, frame, dir) {
  var box = el.getBoundingClientRect();
  if (rule.axis !== 'y') return frame.right - Math.max(box.left - frame.left, frame.width * rule.safe);
  return dir < 0
    ? frame.top + Math.max(frame.bottom - box.bottom, frame.height * rule.safe)
    : frame.bottom - Math.max(box.top - frame.top, frame.height * rule.safe);
}

/** How much room the cap still leaves this element, in screen px - never negative. */
function svgGrowRoom(rule, el, frame, dir) {
  var box = el.getBoundingClientRect();
  var cap = svgGrowCap(rule, el, frame, dir);
  var edge = rule.axis === 'y' ? (dir < 0 ? box.top : box.bottom) : box.right;
  return Math.max(0, (cap - edge) * dir);
}

/** Put the artwork back exactly as drawn, so every measurement starts from the design. The
 *  resting value is the set of base ATTRIBUTES the growth writes - a rect's width figure, a
 *  path's drawn data, an upward grower's y as well - so every kind restores verbatim. The
 *  bound LINES restore too: a wrapped block was lifted (or pushed) to keep the stack against
 *  the edge the panel is anchored to, and that travel is undone here like any other. */
function svgLayoutRest() {
  for (var i = 0; i < NOACG_LAYOUT.rules.length; i++) {
    var rule = NOACG_LAYOUT.rules[i];
    var rest = svgGrowRest[i];
    var el = svgLayoutEl(rule.el);
    if (!el) continue;
    if (!rest) { rest = svgGrowRest[i] = { base: null, dir: 1, followers: [], texts: [], textBase: [] }; }
    if (rest.base === null) rest.base = svgGrowBase(rule, el, rest.dir);
    svgGrowSet(el, rest.base);
    for (var j = 0; j < rest.followers.length; j++) {
      var f = rest.followers[j];
      if (f.mode === 'grow') svgGrowSet(f.el, f.base);
      else if (f.base === null) f.el.removeAttribute('transform');
      else f.el.setAttribute('transform', f.base);
    }
    for (var t = 0; t < rest.textBase.length; t++) {
      var tb = rest.textBase[t];
      if (tb.base === null) tb.el.removeAttribute('transform');
      else tb.el.setAttribute('transform', tb.base);
    }
  }
  svgFitExtra = {};
}

// WHAT TRAVELS, when the table does not say. A shape drawn entirely past the growing edge has
// to move with it or the gap the designer left would close. A GROUP that straddles the edge is
// looked inside instead of moved whole - half of it belongs on each side. A straddling SHAPE is
// left alone: it is either the growing element itself or something drawn across the boundary,
// and moving it would tear the artwork. A rotated or skewed space is skipped for the same
// reason.
//
// This is a fair guess SIDEWAYS and a poor one DOWNWARDS: below a panel sit things that should
// move, things that should stretch, and things pinned to the frame that must stay, and no
// measurement separates them (plan §6c). So a rule that means it lists its followers, and this
// is only what an unlisted one falls back to.
function svgCollectFollowers(node, grower, edge, axis, dir, out) {
  var kids = node.children;
  for (var i = 0; i < kids.length; i++) {
    var el = kids[i];
    if (el === grower || (el.contains && el.contains(grower))) continue;
    var box = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    if (!box || (box.width === 0 && box.height === 0)) continue;
    // "Past the growing edge" reads from the edge OUTWARDS, so it flips with the direction: a
    // panel growing up pushes what is drawn ABOVE it, exactly as one growing down pushes what
    // is below.
    var lo = axis === 'y' ? box.top : box.left;
    var hi = axis === 'y' ? box.bottom : box.right;
    var beyond = dir < 0 ? hi <= edge + 0.5 : lo >= edge - 0.5;
    var straddles = dir < 0 ? lo < edge - 0.5 : hi > edge + 0.5;
    if (beyond) {
      var ctm = el.parentNode.getScreenCTM ? el.parentNode.getScreenCTM() : null;
      if (ctm && (ctm.b || ctm.c)) continue;    // rotated/skewed: not ours to move
      out.push({ el: el, base: el.getAttribute('transform'), mode: 'move' });
    } else if (straddles && el.children && el.children.length) {
      svgCollectFollowers(el, grower, edge, axis, dir, out);
    }
  }
}

/** FURNITURE THAT SPANS THE PANEL on the growing axis - an accent rail down a banner's edge, a
 *  tint band behind it - drawn to the panel's own two edges. It is neither past the growing
 *  edge (so it never travels) nor the panel itself, and left alone it simply stops covering the
 *  part the panel gained: the shipped lower third's amber rail is drawn 760-950 exactly like
 *  its plate, so a plate that grew upward showed 67px of un-railed edge. A shape that spans the
 *  panel GROWS with it instead. Only a shape, and only one that really reaches both edges. */
function svgCollectSpanners(art, rule, grower, panel, dir, out) {
  var shapes = art.querySelectorAll('rect, path, polygon, ellipse, circle');
  var axis = rule.axis === 'y' ? 'y' : 'x';
  var tol = Math.max(2, (axis === 'y' ? panel.height : panel.width) * 0.02);
  for (var i = 0; i < shapes.length; i++) {
    var el = shapes[i];
    if (el === grower || el.contains(grower) || grower.contains(el)) continue;
    var r = el.getBoundingClientRect();
    if (!(r.width > 0) || !(r.height > 0)) continue;
    if (r.width * r.height >= panel.width * panel.height) continue;   // that IS the panel
    if (axis === 'y') {
      if (Math.abs(r.top - panel.top) > tol || Math.abs(r.bottom - panel.bottom) > tol) continue;
      if (r.right < panel.left + 1 || r.left > panel.right - 1) continue;
    } else {
      if (Math.abs(r.left - panel.left) > tol || Math.abs(r.right - panel.right) > tol) continue;
      if (r.bottom < panel.top + 1 || r.top > panel.bottom - 1) continue;
    }
    var listed = false;
    for (var j = 0; j < out.length; j++) if (out[j].el === el) listed = true;
    if (!listed) out.push({ el: el, base: svgGrowBase(rule, el, dir), mode: 'grow' });
  }
}

/** The followers of one rule: the DECLARED list when there is one, else the derivation. */
function svgFollowersOf(rule, el, edge, dir) {
  var axis = rule.axis === 'y' ? 'y' : 'x';
  var out = [];
  if (rule.followers && rule.followers.length) {
    for (var i = 0; i < rule.followers.length; i++) {
      var node = svgLayoutEl(rule.followers[i].el);
      if (!node) continue;
      var mode = rule.followers[i].mode === 'grow' ? 'grow' : 'move';
      var base = mode === 'grow' ? svgGrowBase(rule, node, dir) : node.getAttribute('transform');
      out.push({ el: node, base: base, mode: mode });
    }
    return out;
  }
  var art = document.querySelector('.${PREFIX}-art');
  if (art) svgCollectFollowers(art, el, edge, axis, dir, out);
  return out;
}

/** Which bound lines live inside the growing element: the ones that START inside it, on its
 *  own rows. They are what drives the growth - the copy the element has to hold. */
function svgLinesInside(el) {
  var box = el.getBoundingClientRect();
  var nodes = svgFitNodes();
  var out = [];
  for (var i = 0; i < nodes.length; i++) {
    var r = nodes[i].getBoundingClientRect();
    var sameRows = r.top < box.bottom && r.bottom > box.top;
    if (sameRows && r.left >= box.left - 1 && r.left < box.right) out.push(nodes[i]);
  }
  return out;
}

function growSvgLayout() {
  svgLayoutRest();
  // WHO TRAVELS, AND WHICH LINES ARE INSIDE - read for EVERY rule while the artwork is still at
  // rest, before any of them has moved. A panel that both widens and wraps carries TWO rows on
  // one element, and a follower whose transform were captured after the first row had already
  // translated it would record that translation as its resting pose - so the artwork would never
  // come back to the design, which is the one thing this may not do.
  for (var i = 0; i < NOACG_LAYOUT.rules.length; i++) svgRestOneRule(NOACG_LAYOUT.rules[i], i);
  for (var r = 0; r < NOACG_LAYOUT.rules.length; r++) growOneRule(NOACG_LAYOUT.rules[r], r);
  svgOfferHeights();
}

/** One rule's resting reading: the layers that travel with its edge, and the bound lines inside
 *  it. Split out of growOneRule so it can run for every rule BEFORE any of them grows. */
function svgRestOneRule(rule, index) {
  var panel = svgLayoutEl(rule.el);
  var rest = svgGrowRest[index];
  if (!panel || !rest) return;
  var art0 = document.querySelector('.${PREFIX}-art');
  var box = panel.getBoundingClientRect();
  // WHICH WAY, decided once on the artwork AT REST and remembered. Read again after a pass had
  // already moved the panel, the answer could flip mid-fit and the layout would never come back
  // to the design.
  rest.dir = art0 ? svgGrowDir(rule, panel, art0.getBoundingClientRect()) : 1;
  rest.base = svgGrowBase(rule, panel, rest.dir);
  var edge = rule.axis === 'y' ? (rest.dir < 0 ? box.top : box.bottom) : box.right;
  rest.followers = svgFollowersOf(rule, panel, edge, rest.dir);
  if (art0 && !(rule.followers && rule.followers.length)) {
    svgCollectSpanners(art0, rule, panel, box, rest.dir, rest.followers);
  }
  // END CAPS RIDE THE MOVING EDGE, always - declared list or not. A cap is the panel's own
  // furniture (svgIsEndCap: a narrow shape hugging the far edge), so it is not a follower an
  // author decides about: a grown panel with its end-cap left behind mid-artwork is simply
  // wrong, and the room measurement already promises the cap stays on the edge the text is
  // kept off of.
  var art = document.querySelector('.${PREFIX}-art');
  if (art) {
    var axis = rule.axis === 'y' ? 'y' : 'x';
    var caps = art.querySelectorAll('rect, path, polygon, ellipse, circle, image');
    for (var c = 0; c < caps.length; c++) {
      var el = caps[c];
      if (el === panel || el.contains(panel) || panel.contains(el)) continue;
      var r = el.getBoundingClientRect();
      if (!(r.width > 0) || !(r.height > 0)) continue;
      if (r.width * r.height >= box.width * box.height) continue;
      if (!svgIsEndCap(el, r, box, axis, rest.dir)) continue;
      var listed = false;
      for (var j = 0; j < rest.followers.length; j++) if (rest.followers[j].el === el) listed = true;
      if (!listed) rest.followers.push({ el: el, base: el.getAttribute('transform'), mode: 'move' });
    }
  }
  // The bound lines inside, TOP FIRST - the order the stack is walked in when a wrapped block
  // has to be kept against the edge the panel is anchored to (growSvgHeights).
  rest.texts = svgLinesInside(panel).sort(function (a, b) {
    return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
  });
  rest.textBase = [];
  for (var t = 0; t < rest.texts.length; t++) {
    rest.textBase.push({ el: rest.texts[t], base: rest.texts[t].getAttribute('transform') });
  }
}

function growOneRule(rule, index) {
  var panel = svgLayoutEl(rule.el);
  if (!panel) return;
  var art = document.querySelector('.${PREFIX}-art');
  if (!art) return;
  var rest = svgGrowRest[index];
  if (!rest) return;
  var svgPanelTexts = rest.texts;
  // A DOWNWARD rule grows AFTER the fit, from the height the settled block actually needed
  // (growSvgHeights). All this pass owes it is who travels and which lines are inside.
  if (rule.axis === 'y') return;

  // THE DEFICIT: how far past the ROOM THE PANEL ALREADY OFFERS the widest line now runs, in
  // screen px. Measured against the room and not against the drawn text, or a banner would
  // start growing at the 403rd pixel of a name drawn 402px wide inside 1040px of panel - which
  // is the growth being spent before any of the design's own space is.
  var need = 0;
  for (var i = 0; i < svgPanelTexts.length; i++) {
    var el = svgPanelTexts[i];
    if (svgFitWidths[el.id] == null) measureSvgBudgets();
    if (svgFitRoom[el.id] == null) measureSvgRoom();
    // A PENNED line is bounded by whatever is drawn beside it, not by the panel, so widening
    // the panel gives it nothing and it may not ask for any. Its own room already stops it
    // short of its neighbour; the fit answers the rest.
    if (svgFitRoom[el.id].penned) continue;
    // EVERY TRACE OF THE LAST PASS COMES OFF FIRST, or the measurement compounds - the same rule
    // measureSvgBudgets keeps. A line left squeezed from a floored value answers
    // getComputedTextLength with the TEXTLENGTH it was given, so a short value arriving after a
    // long one measured as long as the long one and the panel never came back to the design.
    el.style.fontSize = '';                     // at the drawn size - the panel gives the room
    svgUnsqueeze(el);
    // …and as ONE line: a block still painted as wrapped tspans from a previous pass measures
    // its widest line, which understates what the panel actually has to hold. The fit below
    // repaints it either way.
    var whole = svgFitValue(el);
    if (el.textContent !== whole) el.textContent = whole;
    var over = (svgTextWidth(el) - svgFitRoom[el.id].width) * svgUserScale(el);
    if (over > need) need = over;
  }
  if (!(need > 0)) return;

  // THE CAP: GROWTH IS SYMMETRICAL, and nothing may outgrow the screen (owner, 2026-08-26).
  // The margin the designer left on the side the panel is ANCHORED to is mirrored onto the side
  // it grows towards - a banner drawn 150px in from the left stops 150px short of the right - so
  // the graphic keeps the composition it was drawn with instead of running out to a flat 4%.
  // The table's own safe margin is the floor for a panel drawn hard against its edge. An inset is
  // never negative, so this can never permit growth past the frame; anything the cap withholds
  // is what fitSvgText() answers by shrinking.
  var frame = art.getBoundingClientRect();
  var grant = Math.min(need, svgGrowRoom(rule, panel, frame, rest.dir));
  if (!(grant > 0)) return;

  svgApplyGrowth(rule, panel, rest, grant);
  for (var k = 0; k < svgPanelTexts.length; k++) {
    if (svgFitRoom[svgPanelTexts[k].id].penned) continue;
    svgFitExtra[svgPanelTexts[k].id] = grant / svgUserScale(svgPanelTexts[k]);
  }
}

/** Grow one element by \`grant\` screen px along its axis, and take its followers with it.
 *  The base is the CURRENT attribute, not the resting one: every pass rests the whole layout
 *  first, so at apply time "current" is the design plus whatever an EARLIER rule of this same
 *  pass already granted - which is exactly what lets the wider-then-wrap combination name one
 *  PATH with two rows. Both of a path's rows rewrite the same \`d\`, so applying from rest
 *  would let the second row erase the first row's growth (a rect never had the problem - its
 *  two rows touch width and height). */
function svgApplyGrowth(rule, el, rest, grant) {
  var dir = rest.dir || 1;
  svgGrowElBy(rule, el, svgGrowBase(rule, el, dir), dir, grant / svgUserScale(el));
  for (var j = 0; j < rest.followers.length; j++) {
    var f = rest.followers[j];
    var step = grant / svgUserScale(f.el);
    if (f.mode === 'grow') {
      // A background band behind a growing block, or a rail drawn down its edge, STRETCHES by
      // the same amount instead of sliding out from under it.
      svgGrowElBy(rule, f.el, svgGrowBase(rule, f.el, dir), dir, step);
    } else {
      svgTravel(f.el, rule.axis === 'y' ? 'y' : 'x', dir * step, f.base);
    }
  }
}

/** Move one layer along an axis by its transform ATTRIBUTE, keeping whatever transform the
 *  designer wrote on it. The one limit worth knowing is the same one a follower has: a CSS
 *  transform beats an attribute, so a layer the timeline animates in its own right stays where
 *  its animation puts it. */
function svgTravel(el, axis, step, base) {
  var move = axis === 'y' ? '0,' + step.toFixed(2) : step.toFixed(2) + ',0';
  el.setAttribute('transform', 'translate(' + move + ')' + (base ? ' ' + base : ''));
}

// ── GROWING DOWNWARDS ─────────────────────────────────────────────────────────
// Wrap and grow are circular: how many lines a value takes depends on the type size, how much
// height is available depends on the growth, and the growth depends on the line count. Iterating
// that would settle differently in the editor, in an exported package and under SPX, which is
// the one thing this may not do.
//
// So it is not iterated. The ceiling a block may fill is the MOST the rule could ever give,
// measured on the artwork at rest (svgOfferHeights, before the fit); the fit wraps and shrinks
// inside that fixed ceiling exactly as it always did; and then the panel is grown by what the
// SETTLED block actually needed. One measure, one fit, one apply - the same answer every time,
// in any order, and running it twice changes nothing because every pass starts from rest.
function svgOfferHeights() {
  svgFitExtraH = {};
  var art = document.querySelector('.${PREFIX}-art');
  if (!art) return;
  var frame = art.getBoundingClientRect();
  for (var r = 0; r < NOACG_LAYOUT.rules.length; r++) {
    var rule = NOACG_LAYOUT.rules[r];
    if (rule.axis !== 'y') continue;
    var el = svgLayoutEl(rule.el);
    var rest = svgGrowRest[r];
    if (!el || !rest) continue;
    var most = svgGrowRoom(rule, el, frame, rest.dir);
    var texts = rest.texts.length ? rest.texts : svgLinesInside(el);
    for (var i = 0; i < texts.length; i++) {
      svgFitExtraH[texts[i].id] = most / svgUserScale(texts[i]);
    }
  }
}

/** HOW MUCH EXTRA HEIGHT EACH LINE OF A PANEL TOOK, top line first, in screen px: how far the
 *  settled block runs past the room the design gave it. Measured in the artwork's own units
 *  through getBBox, which ignores transforms - so an entrance in flight cannot change it. */
function svgBlockExtras(rest) {
  var out = [];
  for (var i = 0; i < rest.texts.length; i++) {
    var t = rest.texts[i];
    var room = svgFitRoom[t.id];
    if (!room || !t.getBBox) { out.push(0); continue; }
    var bottom = t.getBBox().y + t.getBBox().height;
    out.push(Math.max(0, (bottom - (room.top + room.height)) * svgUserScale(t)));
  }
  return out;
}

function growSvgHeights() {
  var art = document.querySelector('.${PREFIX}-art');
  if (!art) return;
  var frame = art.getBoundingClientRect();
  for (var r = 0; r < NOACG_LAYOUT.rules.length; r++) {
    var rule = NOACG_LAYOUT.rules[r];
    if (rule.axis !== 'y') continue;
    var el = svgLayoutEl(rule.el);
    var rest = svgGrowRest[r];
    if (!el || !rest) continue;
    var extras = svgBlockExtras(rest);
    var total = 0;
    for (var e = 0; e < extras.length; e++) total += extras[e];
    var most = svgGrowRoom(rule, el, frame, rest.dir);
    var grant = Math.min(total, most);
    if (!(grant > 0)) continue;

    // THE STACK STAYS AGAINST THE EDGE THE PANEL IS ANCHORED TO. A wrapped block grows
    // DOWNWARDS from its own first baseline - that is how SVG text is drawn - so every line
    // has to travel by exactly the extra height taken on the side the panel is NOT growing
    // towards, or the second line of a name would print through the role under it.
    //
    // Growing UP (the lower third: bottom edge composed against the frame): a line rises by the
    // extra its own block took plus everything BELOW it, so the lowest line never moves and the
    // panel's drawn bottom padding survives untouched.
    // Growing DOWN (a board hung from the top): a line descends by the extra taken ABOVE it, so
    // the top line never moves. Either way the drawn gaps between the lines are exactly kept.
    var running = 0;
    for (var k = 0; k < rest.texts.length; k++) {
      var idx = rest.dir < 0 ? rest.texts.length - 1 - k : k;
      var line = rest.texts[idx];
      if (rest.dir < 0) running += extras[idx];
      var travel = Math.min(running, most);
      if (!svgFitPlaced(line) && travel > 0) {
        svgTravel(line, 'y', (rest.dir * travel) / svgUserScale(line), rest.textBase[idx].base);
      }
      if (rest.dir > 0) running += extras[idx];
    }
    svgApplyGrowth(rule, el, rest, grant);
  }
}`;
}

/** The shared update()'s optional placed-text hook line (templates/shared/base.ts runtimeJs).
 *  An imported SVG REPLACES it with its own: the ladder below fits the placed lines too, so
 *  this design calls one fit rather than two (plan §6b). Matched by shape, like
 *  blocks/designLayout does. */
const PLACED_TEXT_HOOK = `  // Designs that fit text to a fixed slot re-measure here (no-op otherwise).
  if (typeof fitPlacedText === 'function') fitPlacedText();`;
const SVG_FIT_HOOK = `  // The fit ladder re-measures here - every text layer, the ones the SVG drew and the ones
  // placed on it alike (no-op otherwise).
  if (typeof fitSvgText === 'function') fitSvgText();`;

/** The preset to build with - always one of this category's, whatever a carried-over draft says. */
function designPreset(id: string): AnimPreset {
  return DESIGN_PRESETS.find((p) => p.id === id) ?? DESIGN_PRESETS[0];
}

/** Build the complete SpxTemplate for an imported SVG design. */
export function assembleImportedSvg(o: ResolvedOptions): SpxTemplate {
  const svg = o.designSvg ?? NO_SVG;
  const name = 'Imported SVG design';
  const artworkFields = svgFields(svg);
  // The behaviour's own fields sit AFTER the artwork's, and that order is load-bearing: the
  // behaviour's type shim mirrors it so a control's payload resolves to the right `fN`.
  const behaviour = boundBehaviour(svg.behaviour);
  const fields = behaviour
    ? [...artworkFields, ...behaviour.fields(artworkFields.length)]
    : artworkFields;
  // Steps are off: the whole design is one unit - a layer can still be given its own press
  // later, from the timeline.
  const settings = baseSettings({ name, uicolor: '7' }, o, { steps: '1' });
  const scale = computeScale(o);

  // Same anchoring rule as the raster import: frame-sized artwork covers the canvas as
  // drawn; anything smaller is a free-floating object and gets a zone.
  const fullFrame = svg.width === o.resolution.width && svg.height === o.resolution.height;
  const rootPosition = fullFrame
    ? `  left: 0;                         /* the artwork is frame-sized - it covers the canvas as drawn */
  top: 0;`
    : zoneCssText(o.zone, o.nudge, o.resolution);

  // The SVG rides inline, indented to sit inside the box - no asset path, no fetch, so every
  // single-file export target stays single-file.
  const inlineSvg = bindSvgMarkup(svg, o.previewMarkers)
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');

  // The countdown (plan P2 "clock ftype"): the chosen layer is the clock DISPLAY
  // (`.{prefix}-clock`, painted by the shared runtime), and the operator's minutes live in a
  // hidden data source the runtime reads - the exact contract every catalog countdown uses.
  const clock = countdownIndex(svg);
  const clockField = clock === -1 ? null : artworkFields[clock];
  const clockHolder = clockField
    ? `
    <!-- ${clockField.title} (${clockField.field}) - the countdown's length in minutes, written by SPX
         and read by the clock runtime in template.js; the drawn clock layer shows the count. -->
    <div id="${clockField.field}" class="${DATA_SOURCE_CLASS}">${clockField.value}</div>`
    : '';

  const html = documentHtml({
    title: name,
    definitionBlock: definitionScriptBlock(settings, fields),
    body: `  <!-- Imported SVG design - your artwork, exactly as exported. The text layers chosen at
       import carry id="f0", "f1", … and update() writes the operator's values straight into
       them; everything else is untouched. -->
  <div class="${PREFIX}">
    <div class="${PREFIX}-box">
${inlineSvg}${clockHolder}${behaviour ? behaviour.html(artworkFields.length) : ''}
    </div>
  </div>`,
  });

  const fontCss = svgFontCss(svg);
  const css = `/* ${name} - generated by NoaCG Studio. Edit freely: this file is yours. */

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
  width: 100%;                     /* fills the box - so --scale resizes art and text together */
  height: auto;                    /* the viewBox keeps the aspect */
}
${svg.outlines.length > 0 ? `
/* Outlined text replaced by a live field: the original shapes stay in the file, hidden.
   Delete this rule to see them again beside the text that stands in for them. */
.${PREFIX}-outlined {
  display: none;
}
` : ''}${clockField || behaviour ? `
${dataSourceCss}
` : ''}${behaviour?.css ? `
${behaviour.css}
` : ''}`;

  const preset = designPreset(o.animation.presetId);
  const ease = resolveEasing(o.animation.easing, preset.autoEase);
  const cfg: PresetConfig = {
    prefix: PREFIX,
    lineCount: 0, // the design presets animate the whole box; the SVG's text is inside it
    hasAccent: false,
    // The artwork's own top-level layers - what the per-layer stagger walks. Read off the
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
  // with callbacks suppressed, so the trailing update() is what puts the drawn states back. It
  // is also where a LIVE VOTE's bars move: data never causes a transition, so the tally animates
  // inside whatever state the board is in (docs/GRAPHIC_BEHAVIOUR_PLAN.md §12).
  // A bound countdown re-derives its length from the value just written - the same hook the
  // catalog's own countdowns call, so an imported clock answers Update identically (the
  // reasoning is in shared/clock.ts). Emitted only for a design that actually bound one.
  const clockHook = `  if (typeof clockDataUpdated === 'function') clockDataUpdated();  // the countdown's length (below)`;
  const js =
    runtimeJs(name, preset.emit(cfg)).replace(
      PLACED_TEXT_HOOK,
      `${SVG_FIT_HOOK}${behaviour ? `\n${behaviour.updateHook}` : ''}${clockField ? `\n${clockHook}` : ''}`,
    ) +
    SVG_FIT_JS +
    // The relationship TABLE and the runtime that loops it ride together, and only for a design
    // that declares one: a board emits neither and cannot move (plan §6c).
    (layoutRules(svg).length > 0
      ? `\n${layoutDataJs(
          svg,
          // The comment above each rule names the element the way the reader knows it: a bound
          // field by its operator title, anything else (the usual case - a panel rect) by the
          // layer name the designer gave it in their own file.
          (id) =>
            svg.fields.find((f) => f.candidateId === id)?.title ?? candidateLabel(svg, id) ?? 'Layer',
        )}${growthRuntimeJs()}`
      : '') +
    '\n' +
    (clockField ? `\n${clockRuntimeJs(PREFIX, clockField.field)}\n` : '') +
    (behaviour ? `\n${behaviour.js(artworkFields.length)}` : '');

  // The design presets know nothing of clocks, so the lifecycle hooks are added to the DATA
  // (the step-calls model, docs/TIMELINE_V2_PLAN.md §3b): startClock as the entrance lands,
  // stopClock the moment the exit begins - exactly what the catalog's countdown presets emit.
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
    // The countdown's layer is the clock display, not a text field - left out here.
    layers: svg.fields.flatMap((f, i) =>
      i === clock
        ? []
        : [{ id: `f${i}`, type: 'text' as const, label: f.title, fieldId: `f${i}`, text: f.sample, styles: {} }],
    ),
  };

  // Compose the two data refinements: the clock's lifecycle calls, then the behaviour's own extra
  // step (the quiz's Reveal, the vote's Result). Order matters only in that the clock's
  // `stopClock` must stay on the LAST step, and the extra step is spliced in front of it - so
  // the behaviour's refinement runs second.
  const refine =
    withClockCalls || behaviour
      ? (data: AnimData): AnimData => {
          const withClock = withClockCalls ? withClockCalls(data) : data;
          return behaviour ? behaviour.steps(withClock) : withClock;
        }
      : undefined;
  const built = convertToDataRegion(template, refine);
  // The machine last, on the finished data: `attachMachine` derives the default path from the
  // steps, so the behaviour's own step has to already be there when the arc's path events
  // (`judge`, `result`) are compiled onto it.
  return behaviour ? attachMachine(behaviour.type(svg), built) : built;
}

export const IMPORTED_SVG: TemplateVariant = {
  id: 'svg01',
  category: 'imported-design',
  name: 'Imported SVG design',
  styleTag: 'minimal',
  description: 'Your own SVG artwork, its text layers bound as editable fields.',
  maxLines: 3,
  suggestedLines: [],
  // The fields are the SVG's own text layers, chosen at import - never an open line list.
  fieldPlan: { kind: 'fixed', reason: 'The fields are the SVG’s own text layers, chosen at import.' },
  // The artwork IS the design - a logo drawn into it needs no slot from us.
  logo: 'none',
  // The whole-unit presets plus the per-layer stagger - only an SVG has layers to stagger.
  animationPresets: ['design-fade', 'design-slide', 'design-pop', 'design-blur', 'design-stagger'],
  defaultPalette: paletteById('ivory'),
  defaultFontId: 'inter',
  defaultZone: 'bottom-left',
  create(options?: WizardOptions) {
    return assembleImportedSvg(resolveOptions(IMPORTED_SVG, options));
  },
};
