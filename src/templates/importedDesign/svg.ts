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
  // THE PANEL THAT GROWS (plan §3, the hug): one class on one rectangle, which is the whole
  // markup edit the feature needs — the runtime finds it by that class and changes its `width`.
  if (svg.stretch) {
    const el = root.querySelector(`[${SVG_CANDIDATE_ATTR}="${svg.stretch.candidateId}"]`);
    if (el) {
      const own = (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
      if (!own.includes(`${PREFIX}-panel`)) own.push(`${PREFIX}-panel`);
      el.setAttribute('class', own.join(' '));
    }
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
var svgFitRoom = {};                            // id -> { width, lines } the design offers it
var svgFitExtra = {};                           // id -> room a growing panel gave this line
var svgFitOver = {};                            // id -> true when even the floor could not fit
var SVG_FIT_FLOOR = 0.55;                       // never smaller than 55% of the drawn size
var SVG_LINE_HEIGHT = 1.2;                      // a wrapped line's step, in ems

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

// ── THE ROOM THE DESIGN GIVES A LINE ──────────────────────────────────────────
// The budget is NOT the width of the text the designer typed. A name drawn 402px wide inside a
// 1040px banner has 588px of empty banner beside it, and taking the drawn text as the budget
// spent none of it: the 403rd pixel shrank the type while more than half the panel stood
// empty. So the budget is the ROOM — the shape drawn behind the line, out to a right margin
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

/** The nearest drawn thing BELOW this line - what a wrapped line would run into, and therefore
 *  how far the block may grow. The panel's own bottom edge is the backstop: a wrapped block
 *  stays inside the shape it was drawn in, which is what "wrap within the drawn height" means.
 *  Only things that overlap it horizontally count; a crest off to one side does not. */
function svgFitCeiling(el, panel) {
  var art = document.querySelector('.${PREFIX}-art');
  var box = el.getBoundingClientRect();
  var others = art.querySelectorAll('text, tspan, image, rect, path, polygon, ellipse, circle');
  var top = panel.bottom;
  for (var i = 0; i < others.length; i++) {
    var o = others[i];
    if (o === el || o.contains(el) || el.contains(o)) continue;
    var r = o.getBoundingClientRect();
    if (!(r.width > 0) || !(r.height > 0)) continue;
    if (r.width * r.height >= panel.width * panel.height) continue;   // that IS the panel
    if (r.right < box.left + 1 || r.left > box.right - 1) continue;   // no horizontal overlap
    if (r.top < box.bottom - 1) continue;                             // not below this line
    if (r.top < top) top = r.top;
  }
  return top;
}

function measureSvgRoom() {
  var nodes = svgFitNodes();
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    var live = el.textContent;
    var drawn = svgFitDrawn[el.id];
    el.style.fontSize = '';
    if (live !== drawn) el.textContent = drawn;   // measure the DESIGN, then put the value back
    var box = el.getBoundingClientRect();
    var scale = box.width > 0 ? el.getComputedTextLength() / box.width : 1;   // screen px -> user units
    var panel = svgFitContainer(el);
    // "height" is the room the BLOCK has, measured from this line's own top - not a line
    // count, because the count depends on the size and the size is what the ladder changes.
    // A 112px board panel holds one 44px line and three 24px ones, and only the height knows
    // that. Zero height (a line drawn hard against whatever is below it) means no wrapping.
    var room = { width: svgFitWidths[el.id], height: 0, top: 0 };
    if (panel && box.width > 0) {
      var inset = box.left - panel.left;
      room.width = Math.max(svgFitWidths[el.id], (panel.right - inset - box.left) * scale);
      room.height = Math.max(0, (svgFitCeiling(el, panel) - box.top) * scale);
      // Where the drawn line starts, in the artwork's own units - the datum the painted block's
      // height is checked against. getBBox() answers in user units and ignores transforms, so
      // the check holds while an entrance is mid-flight.
      room.top = el.getBBox ? el.getBBox().y : 0;
    }
    svgFitRoom[el.id] = room;
    if (live !== drawn) el.textContent = live;
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

/** Paint a wrapped value as tspans on the node's own x, stepping down by the line height.
 *  One line is written as plain text, so a graphic that never wraps emits nothing new. */
function svgPaintLines(el, lines, size) {
  if (lines.length < 2) { el.textContent = lines[0] || ''; return; }
  var x = el.getAttribute('x');
  el.textContent = '';
  for (var i = 0; i < lines.length; i++) {
    var t = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    if (x !== null) t.setAttribute('x', x);
    t.setAttribute('dy', i === 0 ? '0' : (size * SVG_LINE_HEIGHT).toFixed(2));
    t.textContent = lines[i];
    el.appendChild(t);
  }
}

/** The widest of the painted lines, which is what has to fit the budget. */
function svgBlockWidth(el) {
  if (!el.children.length) return el.getComputedTextLength();
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
  if (typeof stretchSvgPanel === 'function') stretchSvgPanel();
  var nodes = svgFitNodes();
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    if (svgFitWidths[el.id] == null) measureSvgBudgets();
    if (svgFitRoom[el.id] == null) measureSvgRoom();
    el.style.fontSize = '';                     // back to the drawn size before measuring
    var room = svgFitRoom[el.id];
    var budget = room.width + (svgFitExtra[el.id] || 0);
    var drawnSize = svgFitSizes[el.id];
    var value = el.textContent;
    svgFitOver[el.id] = false;
    if (!(budget > 0) || !(drawnSize > 0)) continue;

    var size = drawnSize;
    var floor = drawnSize * SVG_FIT_FLOOR;
    // WRAP AND SHRINK TOGETHER. How many lines fit is a function of the SIZE - the quiz board's
    // 112px panel holds one line of 44px type and three of 24px - so every pass re-asks. While
    // more lines are still reachable the size comes down in small steps, because the next step
    // may buy a whole line rather than a few pixels of width; once the block can only ever be
    // one line, the exact ratio settles it in one move.
    for (var pass = 0; pass < 8; pass++) {
      el.style.fontSize = size === drawnSize ? '' : size.toFixed(2) + 'px';
      var maxLines = Math.max(1, Math.floor(room.height / (size * SVG_LINE_HEIGHT)));
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
        svgPaintLines(el, n > 1 ? svgWrapLines(el, value, budget, n) : [value], size);
        width = svgBlockWidth(el);
        tall = room.height > 0 && !!el.getBBox
          && el.getBBox().y + el.getBBox().height > room.top + room.height + 0.5;
        if (!tall) break;
      }
      if (width <= budget + 0.5 && !tall) break;
      if (size <= floor + 0.01) { svgFitOver[el.id] = true; break; }
      var canGrowLines = Math.floor(room.height / (floor * SVG_LINE_HEIGHT)) > maxLines;
      var ratio = width > budget ? budget / width : 0.94;
      size = Math.max(floor, canGrowLines || tall ? size * 0.9 : size * ratio);
    }
    el.classList.toggle('${PREFIX}-overflow', !!svgFitOver[el.id]);
  }
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

function refitSvgText() { measureSvgBudgets(); measureSvgRoom(); fitSvgText(); }
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
 * value — how far the longest bound line overflows the width it was drawn at — widens the
 * panel, and the text fit above then answers only what the frame's safe margin could not give.
 *
 * Everything is measured in SCREEN px and converted back through each element's own CTM,
 * because a group between the artwork's root and a layer may carry a transform, and comparing
 * raw attribute numbers across two such spaces is how a banner ends up growing the wrong way.
 */
function stretchRuntimeJs(): string {
  return `
// ── Panel hug (SVG) ───────────────────────────────────────────────────────────
// The panel below grows with its text: a longer value widens it instead of shrinking the type,
// which is what a lower third wants (a board wants the opposite, and simply has no such
// function). Everything drawn PAST the panel's right edge travels with it, and the growth stops
// at the frame's safe margin — past that, the text fit shrinks whatever is still over.
// Remove this block and the graphic becomes a fixed one.
//
// One limit worth knowing: a follower travels by its transform ATTRIBUTE, and a CSS transform
// beats an attribute — so a layer the timeline animates in its own right (a per-layer stagger,
// say) stays where its animation puts it instead of travelling with the edge.
var PANEL_SAFE = 0.04;                          // keep the grown panel 4% inside the frame edge
var svgPanelWidth = null;                       // the panel's DRAWN width, in its own units
var svgPanelFollowers = [];                     // { el, base } — what travels with the far edge
var svgPanelTexts = [];                         // the bound lines drawn inside the panel

function svgPanelNode() { return document.querySelector('.${PREFIX}-art .${PREFIX}-panel'); }

/** Screen px per user unit for the space an element's own transform is written in. */
function svgUserScale(el) {
  var ctm = el.parentNode && el.parentNode.getScreenCTM ? el.parentNode.getScreenCTM() : null;
  return ctm && ctm.a ? ctm.a : 1;
}

/** Put the artwork back exactly as drawn, so every measurement starts from the design. */
function svgPanelRest() {
  var panel = svgPanelNode();
  if (!panel) return null;
  if (svgPanelWidth === null) svgPanelWidth = parseFloat(panel.getAttribute('width')) || 0;
  panel.setAttribute('width', String(svgPanelWidth));
  for (var i = 0; i < svgPanelFollowers.length; i++) {
    var f = svgPanelFollowers[i];
    if (f.base === null) f.el.removeAttribute('transform');
    else f.el.setAttribute('transform', f.base);
  }
  svgFitExtra = {};
  return panel;
}

// WHAT TRAVELS. A shape drawn entirely past the panel's right edge has to move with it or the
// gap the designer left would close. A GROUP that straddles the edge is looked inside instead
// of moved whole — half of it belongs on each side. A straddling SHAPE is left alone: it is
// either the panel itself or something drawn across the boundary, and moving it would tear the
// artwork. A rotated or skewed space is skipped for the same reason.
function svgCollectFollowers(node, right, out) {
  var kids = node.children;
  for (var i = 0; i < kids.length; i++) {
    var el = kids[i];
    if (el.classList && el.classList.contains('${PREFIX}-panel')) continue;
    var box = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    if (!box || (box.width === 0 && box.height === 0)) continue;
    if (box.left >= right - 0.5) {
      var ctm = el.parentNode.getScreenCTM ? el.parentNode.getScreenCTM() : null;
      if (ctm && (ctm.b || ctm.c)) continue;    // rotated/skewed: not ours to move
      out.push({ el: el, base: el.getAttribute('transform') });
    } else if (box.right > right + 0.5 && el.children && el.children.length) {
      svgCollectFollowers(el, right, out);
    }
  }
}

/** Which bound lines live inside the panel: the ones that START inside it, on its own rows. */
function svgPanelInside(panel) {
  var box = panel.getBoundingClientRect();
  var nodes = svgFitNodes();
  var out = [];
  for (var i = 0; i < nodes.length; i++) {
    var r = nodes[i].getBoundingClientRect();
    var sameRows = r.top < box.bottom && r.bottom > box.top;
    if (sameRows && r.left >= box.left - 1 && r.left < box.right) out.push(nodes[i]);
  }
  return out;
}

function stretchSvgPanel() {
  var panel = svgPanelRest();
  if (!panel) return;
  var art = document.querySelector('.${PREFIX}-art');
  if (!art) return;

  // The layers that move and the lines that drive the growth are read off the artwork AT REST,
  // so an operator value already on screen can never change who is inside the panel.
  svgPanelFollowers = [];
  svgCollectFollowers(art, panel.getBoundingClientRect().right, svgPanelFollowers);
  svgPanelTexts = svgPanelInside(panel);

  // THE DEFICIT: how far past the ROOM THE PANEL ALREADY OFFERS the widest line now runs, in
  // screen px. Measured against the room and not against the drawn text, or a banner would
  // start growing at the 403rd pixel of a name drawn 402px wide inside 1040px of panel - which
  // is the growth being spent before any of the design's own space is.
  var need = 0;
  for (var i = 0; i < svgPanelTexts.length; i++) {
    var el = svgPanelTexts[i];
    if (svgFitWidths[el.id] == null) measureSvgBudgets();
    if (svgFitRoom[el.id] == null) measureSvgRoom();
    el.style.fontSize = '';                     // at the drawn size — the panel gives the room
    var over = (el.getComputedTextLength() - svgFitRoom[el.id].width) * svgUserScale(el);
    if (over > need) need = over;
  }
  if (!(need > 0)) return;

  // THE CAP: the panel's far edge stays inside the frame's safe margin. Anything the cap
  // withholds is what fitSvgText() shrinks.
  var frame = art.getBoundingClientRect();
  var grant = Math.min(need, Math.max(0, frame.right - frame.width * PANEL_SAFE - panel.getBoundingClientRect().right));
  if (!(grant > 0)) return;

  panel.setAttribute('width', String(svgPanelWidth + grant / svgUserScale(panel)));
  for (var j = 0; j < svgPanelFollowers.length; j++) {
    var f = svgPanelFollowers[j];
    var shift = grant / svgUserScale(f.el);
    f.el.setAttribute('transform', 'translate(' + shift.toFixed(2) + ',0)' + (f.base ? ' ' + f.base : ''));
  }
  for (var k = 0; k < svgPanelTexts.length; k++) {
    svgFitExtra[svgPanelTexts[k].id] = grant / svgUserScale(svgPanelTexts[k]);
  }
}`;
}

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
    (svg.stretch ? `\n${stretchRuntimeJs()}` : '') +
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
