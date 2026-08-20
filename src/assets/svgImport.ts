// SVG import — parse, sanitize and inventory a dropped SVG file (docs/SVG_IMPORT_PLAN.md).
//
// The promise this module serves: a layered SVG from Illustrator, Figma or Inkscape imported
// VERBATIM is the user's exact graphic; binding its own <text> nodes to data fields makes it a
// playable template. So this module never redraws, reflows or prettifies anything — it parses
// with DOMParser, removes only what the sanitizer must (script, event handlers, foreignObject,
// external references, SMIL), tags each bindable text node with a data-noacg-candidate marker,
// and serializes ONCE. Everything downstream — the mapping step's highlight, the generator's
// id="fN" binding — addresses nodes through those markers, so the artwork itself is never
// touched again.
//
// WHY the sanitizer is here and not only in the validation gate: an imported SVG is untrusted
// input entering srcdoc previews, exports and (later) community sharing. The gate
// (validation/validateTemplate.ts) stays authoritative — it re-checks the emitted template —
// but the import must hand clean markup to the preview in the first place.

export interface SvgTextCandidate {
  /** Stable marker id ("t0", "t1", …) — the value of data-noacg-candidate on the node. */
  id: string;
  /** Operator-facing label, prefilled from the layer name (data-name / id / nearest named
   *  ancestor group). Illustrator writes layer names as element ids (original spelling kept
   *  in data-name when it had to uniquify); Figma writes frame/layer names as group ids. */
  label: string;
  /** The node's current text content — the sample value the field starts with. */
  sample: string;
  /** True when the layer name carried the optional `f:` / `field:` prefix — the power-user
   *  sugar that marks a layer editable by name. When ANY candidate carries it, only the
   *  prefixed ones default ON; with none, every detected text defaults ON. */
  marked: boolean;
  /** A numeric-looking sample proposes ftype "number" (a score, a count, a year). */
  numeric: boolean;
}

/** One bindable picture layer: an SVG `<image>` element the operator could swap by field
 *  (update() rewrites its href; empty restores the drawn picture). Offered OFF by default —
 *  most pictures inside a design are the artwork itself, not a slot. */
export interface SvgImageCandidate {
  /** Stable marker id ("i0", "i1", …) — the value of data-noacg-candidate on the node. */
  id: string;
  /** Operator-facing label, prefilled from the layer name like a text candidate's. */
  label: string;
  /** True when the layer name carried the `f:` / `field:` prefix. */
  marked: boolean;
}

/** One font family the SVG references, as written in its own markup. */
export interface SvgFontRef {
  family: string;
}

export interface SvgImportResult {
  /** The sanitized SVG markup, candidates tagged with data-noacg-candidate. Serialized once
   *  from the parsed document; not prettified, attributes untouched. */
  markup: string;
  /** Design-space size in px, from the viewBox (else width/height attributes). */
  width: number;
  height: number;
  /** Bindable text candidates, in document order. */
  candidates: SvgTextCandidate[];
  /** Bindable picture candidates (`<image>` layers), in document order. */
  images: SvgImageCandidate[];
  /** Every font family the markup references, in first-seen order. */
  fonts: SvgFontRef[];
  /** What sanitization removed, in user-facing words. Empty for a clean file. */
  notices: string[];
}

/** Marker attribute connecting a candidate record to its node in the markup. Stripped from
 *  the emitted template at build (templates/importedDesign/svg.ts). */
export const SVG_CANDIDATE_ATTR = 'data-noacg-candidate';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** True when a File is an SVG (by type or extension — a file served without a MIME type
 *  still deserves to open). */
export function isSvgFile(file: File): boolean {
  return file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
}

/** Decode an Illustrator-escaped id back to the layer name the designer typed:
 *  underscores were spaces, `_xNN_` escapes are character codes ("f_x3A_score" -> "f:score"). */
function decodeLayerName(id: string): string {
  return id
    .replace(/_x([0-9A-Fa-f]{2})_/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    // Illustrator uniquifies a repeated name with a long numeric suffix; the original
    // spelling then lives in data-name, but strip the noise for the id fallback too.
    .replace(/_\d{8,}$/, '')
    .replace(/_/g, ' ')
    .trim();
}

/** The layer name of one element: its data-name (verbatim — Illustrator keeps the original
 *  spelling there when it uniquifies the id), else its decoded id. Empty when unnamed.
 *  Exported for model/structure.ts, which labels an imported SVG's top-level groups with the
 *  same words the mapping step used — two spellings of one layer would read as two layers. */
export function svgLayerLabel(el: Element): string {
  return layerName(el);
}

function layerName(el: Element): string {
  const dataName = el.getAttribute('data-name');
  if (dataName?.trim()) return dataName.trim();
  const id = el.getAttribute('id');
  if (id?.trim()) return decodeLayerName(id);
  return '';
}

/** The optional editable-by-name prefix (docs/SVG_IMPORT_PLAN.md §2): `f:` or `field:` on a
 *  layer name marks it editable and is stripped from the label. */
function stripFieldPrefix(name: string): { label: string; marked: boolean } {
  const m = /^(?:f|field):\s*(.*)$/i.exec(name);
  return m ? { label: m[1].trim(), marked: true } : { label: name, marked: false };
}

/** The nearest named layer for a candidate: its own name, else the closest named ancestor
 *  group inside the svg (Illustrator/Figma name GROUPS, and the text sits inside one). */
function candidateName(el: Element, root: Element): string {
  let node: Element | null = el;
  while (node && node !== root) {
    const name = layerName(node);
    if (name) return name;
    node = node.parentElement;
  }
  return '';
}

/** Does this sample propose a number field? A PLAIN figure only — an SPX number input can
 *  hold "84" but not "22:40" or "2 – 1", so anything with clock/score furniture stays text. */
function looksNumeric(sample: string): boolean {
  return /^[-+]?\d+([.,]\d+)?$/.test(sample.trim());
}

/** Attribute names that run script — removed wholesale. */
const isEventAttr = (name: string) => /^on/i.test(name);

/** External reference: an absolute URL or protocol-relative — anything that would make the
 *  emitted graphic reach the network (root AGENTS.md non-negotiable 3). A local `#id` ref
 *  and a `data:` URL are fine. */
function isExternalRef(value: string): boolean {
  return /^(?:https?:)?\/\//i.test(value.trim());
}

/** SMIL animation elements — stripped with a note: deterministic playout owns time, and a
 *  wall-clock SMIL loop would also fail the OGraf post-production gate (plan §7). */
const SMIL_TAGS = new Set(['animate', 'animatetransform', 'animatemotion', 'set']);

/**
 * Sanitize the parsed SVG in place. Returns user-facing notices for everything removed —
 * the import says what it did rather than silently altering someone's file.
 */
function sanitize(svg: Element): string[] {
  const notices: string[] = [];
  let scripts = 0;
  let foreign = 0;
  let smil = 0;
  let external = 0;
  let handlers = 0;

  const doomed: Element[] = [];
  const all = [svg, ...Array.from(svg.querySelectorAll('*'))];
  for (const el of all) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'script') {
      scripts++;
      doomed.push(el);
      continue;
    }
    if (tag === 'foreignobject') {
      foreign++;
      doomed.push(el);
      continue;
    }
    if (SMIL_TAGS.has(tag)) {
      smil++;
      doomed.push(el);
      continue;
    }
    // Event handlers and javascript: URLs go regardless of the element they sit on.
    for (const attr of Array.from(el.attributes)) {
      if (isEventAttr(attr.name)) {
        handlers++;
        el.removeAttribute(attr.name);
        continue;
      }
      if (/^(?:href|xlink:href)$/i.test(attr.name)) {
        if (/^\s*javascript:/i.test(attr.value)) {
          handlers++;
          el.removeAttribute(attr.name);
        } else if (isExternalRef(attr.value)) {
          // An element whose content IS the external file (<image>, <use>) cannot survive
          // losing it; anything else just loses the attribute.
          external++;
          if (tag === 'image' || tag === 'use') doomed.push(el);
          else el.removeAttribute(attr.name);
        }
      }
    }
    // A <style> block survives (Illustrator writes class-based styles there), minus any
    // external fetch it declares.
    if (tag === 'style' && el.textContent) {
      let cssText = el.textContent;
      const before = cssText;
      cssText = cssText.replace(/@import[^;]+;/gi, '');
      cssText = cssText.replace(/url\(\s*['"]?(?:https?:)?\/\/[^)]*\)/gi, 'none');
      if (cssText !== before) {
        external++;
        el.textContent = cssText;
      }
    }
  }
  for (const el of doomed) el.remove();

  if (scripts) notices.push('Script code inside the SVG was removed — a graphic must not carry its own scripts.');
  if (handlers) notices.push('Event-handler attributes inside the SVG were removed.');
  if (foreign) notices.push('A foreignObject block was removed — embedded HTML cannot ride into playout.');
  if (smil) notices.push('SVG-native (SMIL) animation was removed — motion is added in the Animation step, where the timeline and playout can drive it.');
  if (external) notices.push('References to files on the internet were removed — an exported graphic must play out with no network. Embed images into the SVG before exporting it, or add them as assets.');
  return notices;
}

/**
 * The design-space size. An SVG usually states a viewBox; width/height attributes cover the
 * rest. A file with neither has no intrinsic geometry to place fields against — refused,
 * like a raster file with no pixel size.
 */
function measureSvg(svg: Element): { width: number; height: number } | null {
  const viewBox = svg.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: Math.round(parts[2]), height: Math.round(parts[3]) };
    }
  }
  const w = parseFloat(svg.getAttribute('width') ?? '');
  const h = parseFloat(svg.getAttribute('height') ?? '');
  if (w > 0 && h > 0) return { width: Math.round(w), height: Math.round(h) };
  return null;
}

/**
 * The bindable text nodes, in document order. A <text> whose lines are positioned <tspan>s
 * (Illustrator's multi-line idiom) offers EACH tspan as its own candidate — ids are legal on
 * tspans and getElementById finds them, so each line can be its own operator field. A <text>
 * with plain character content binds itself.
 */
function textCandidates(svg: Element): Element[] {
  const out: Element[] = [];
  for (const text of Array.from(svg.querySelectorAll('text'))) {
    const tspans = Array.from(text.querySelectorAll('tspan')).filter(
      // Only LEAF tspans hold bindable runs; a wrapper tspan around more tspans does not.
      (t) => !t.querySelector('tspan'),
    );
    if (tspans.length > 1) out.push(...tspans);
    else out.push(text);
  }
  return out.filter((el) => (el.textContent ?? '').trim().length > 0);
}

/** Every font family the markup references: font-family attributes, inline styles, and the
 *  <style> blocks. First-seen order; quotes and fallbacks stripped ("'MyFont', sans-serif"
 *  inventories as MyFont). */
function fontInventory(svg: Element): SvgFontRef[] {
  const seen = new Set<string>();
  const out: SvgFontRef[] = [];
  const add = (value: string) => {
    // The FIRST family of a stack is the one the design was set in; the rest are fallbacks.
    const first = value.split(',')[0]?.replace(/["']/g, '').trim();
    if (!first || /^(sans-serif|serif|monospace|system-ui|cursive|fantasy|inherit)$/i.test(first)) return;
    const key = first.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ family: first });
  };
  for (const el of [svg, ...Array.from(svg.querySelectorAll('*'))]) {
    const attr = el.getAttribute('font-family');
    if (attr) add(attr);
    const style = el.getAttribute('style');
    if (style) {
      const m = /font-family\s*:\s*([^;]+)/i.exec(style);
      if (m) add(m[1]);
    }
    if (el.tagName.toLowerCase() === 'style' && el.textContent) {
      for (const m of el.textContent.matchAll(/font-family\s*:\s*([^;}]+)/gi)) add(m[1]);
    }
  }
  return out;
}

/**
 * Parse, sanitize and inventory one SVG file's markup. Throws with a user-facing message on
 * a file that is not usable SVG — the caller shows it verbatim.
 */
export function importSvgMarkup(source: string): SvgImportResult {
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  // DOMParser reports XML errors as a parsererror document instead of throwing.
  if (doc.querySelector('parsererror')) {
    throw new Error('That file could not be read as SVG — it may be damaged or not an SVG at all.');
  }
  const svg = doc.documentElement;
  if (svg.namespaceURI !== SVG_NS || svg.tagName.toLowerCase() !== 'svg') {
    throw new Error('That file is XML but not an SVG document.');
  }

  const size = measureSvg(svg);
  if (!size) {
    throw new Error('This SVG states no size (no viewBox and no width/height). Re-export it with a viewBox — in Illustrator, File > Export > SVG does this — and drop it again.');
  }

  const notices = sanitize(svg);

  // Tag the candidates AFTER sanitizing, so a candidate can never sit inside removed markup.
  const nodes = textCandidates(svg);
  const candidates: SvgTextCandidate[] = nodes.map((el, i) => {
    const id = `t${i}`;
    el.setAttribute(SVG_CANDIDATE_ATTR, id);
    // A tspan's own name is rarely set; the nearest named thing is usually its <text> or the
    // group Illustrator made of the layer.
    const name = candidateName(el, svg);
    const { label, marked } = stripFieldPrefix(name);
    const sample = (el.textContent ?? '').trim();
    return {
      id,
      label: label || `Text ${i + 1}`,
      sample,
      marked,
      numeric: looksNumeric(sample),
    };
  });

  // Picture layers: every surviving <image> (the sanitizer already dropped external ones).
  // A placeholder with no picture at all has nothing to restore on empty, so it is skipped.
  const images: SvgImageCandidate[] = Array.from(svg.querySelectorAll('image'))
    .filter((el) => el.getAttribute('href') || el.getAttribute('xlink:href'))
    .map((el, i) => {
      const id = `i${i}`;
      el.setAttribute(SVG_CANDIDATE_ATTR, id);
      const { label, marked } = stripFieldPrefix(candidateName(el, svg));
      return { id, label: label || `Picture ${i + 1}`, marked };
    });

  return {
    markup: new XMLSerializer().serializeToString(svg),
    width: size.width,
    height: size.height,
    candidates,
    images,
    fonts: fontInventory(svg),
    notices,
  };
}
