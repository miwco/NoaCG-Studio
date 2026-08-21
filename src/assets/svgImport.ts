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
  /** A clock-shaped sample ("10:00", "1:05:00") can be bound as a COUNTDOWN instead of text:
   *  the node becomes the clock display and the operator field its length in minutes
   *  (templates/shared/clock.ts). Offered, never assumed — "22:40" may be the time of day. */
  clock: boolean;
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

/** One group of glyph-shaped paths that LOOKS like outlined text (docs/SVG_IMPORT_PLAN.md
 *  §1.A): a `<g>` holding nothing but path/polygon shapes. Type converted to outlines at
 *  export has nothing to bind, so the recovery is the raster flow's — hide the group and
 *  place an HTML field over its box. Offered OFF by default: a logo is also a group of paths,
 *  and only the user can tell the two apart (the mapping step's hover highlight shows which
 *  shapes a row means). The box itself is measured in the mapping step, from its rendered
 *  artwork — DOMParser has no layout. */
export interface SvgOutlineCandidate {
  /** Stable marker id ("o0", "o1", …) — the value of data-noacg-candidate on the group. */
  id: string;
  /** Operator-facing label, prefilled from the layer name like a text candidate's. */
  label: string;
  /** True when the layer name carried the `f:` / `field:` prefix. */
  marked: boolean;
}

/** One font family the SVG references, as written in its own markup. */
export interface SvgFontRef {
  /** VERBATIM, as the markup asks for it ("ArchivoBlack-Bold"). Every `@font-face` the
   *  template emits is declared under this name — it is what the artwork's own CSS asks for,
   *  so a face declared under any other name simply does not apply. */
  family: string;
  /** The same face as a real family NAME ("Archivo Black"), for looking it up in the bundled
   *  library or on Google Fonts. Equal to `family` for a file that already names it plainly. */
  lookup: string;
  /** The weight the name's style suffix implied ("-Bold" → 700), or null when it named none. */
  weight: number | null;
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
  /** Groups of glyph-shaped paths that may be outlined text, in document order. */
  outlines: SvgOutlineCandidate[];
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

/** The Inkscape namespace, whose `inkscape:label` holds the name the designer typed — Inkscape
 *  puts an auto id ("layer1", "text123") in `id` and the real name here. */
const INKSCAPE_NS = 'http://www.inkscape.org/namespaces/inkscape';

/** An id an editor GENERATED, which names nothing: a tag name plus a number ("text123",
 *  "tspan124", "path1867", "layer1", "g4"). Illustrator and Figma write the layer's name into
 *  `id`, so an id is normally the best label there is — but Inkscape's are serial numbers, and
 *  a candidate labelled "text123" beat the named layer ABOVE it, hiding the one word the
 *  designer actually chose. Treated as unnamed, so `candidateName` keeps climbing. */
function isGeneratedId(id: string): boolean {
  return /^(?:svg|g|layer|text|tspan|flowRoot|flowPara|path|rect|circle|ellipse|line|polyline|polygon|use|image|clipPath|mask|defs|marker|linearGradient|radialGradient|stop|filter)[-_]?\d+$/i.test(
    id.trim(),
  );
}

function layerName(el: Element): string {
  const dataName = el.getAttribute('data-name');
  if (dataName?.trim()) return dataName.trim();
  const inkscapeLabel = el.getAttributeNS(INKSCAPE_NS, 'label') ?? el.getAttribute('inkscape:label');
  if (inkscapeLabel?.trim()) return inkscapeLabel.trim();
  const id = el.getAttribute('id');
  if (id?.trim() && !isGeneratedId(id)) return decodeLayerName(id);
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
 *  hold "84" but not "22:40" or "2 – 1", so anything with clock/score furniture stays text.
 *  Exported for the outlined-text overlay, whose sample the user types in the mapping step. */
export function looksNumeric(sample: string): boolean {
  return /^[-+]?\d+([.,]\d+)?$/.test(sample.trim());
}

/** Does this sample look like a clock readout — M:SS or H:MM:SS ("10:00", "1:05:00")?
 *  Such a layer can be bound as a countdown; the mapping step offers the choice. */
export function looksClock(sample: string): boolean {
  return /^\d{1,2}:\d{2}(?::\d{2})?$/.test(sample.trim());
}

/** A clock-shaped sample as a countdown LENGTH in minutes (two decimals): "10:00" is ten
 *  minutes, "1:05:00" sixty-five. A two-part readout reads as M:SS — what a drawn countdown
 *  shows — never as hours:minutes. Not a clock: null. */
export function clockSampleMinutes(sample: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(sample.trim());
  if (!m) return null;
  const [a, b, c] = [Number(m[1]), Number(m[2]), m[3] === undefined ? null : Number(m[3])];
  const seconds = c === null ? a * 60 + b : a * 3600 + b * 60 + c;
  return Math.round((seconds / 60) * 100) / 100;
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

/** Elements whose contents are a DEFINITION, not a drawing: nothing inside them paints where it
 *  stands, and a `<symbol>` painted through `<use>` paints a COPY, so binding the original by id
 *  is not a promise this import can keep. A designer's unused symbol library would otherwise
 *  become a screenful of operator fields for text nobody can see. */
const NON_RENDERED_TAGS = new Set(['defs', 'symbol', 'clippath', 'mask', 'pattern', 'marker']);

/** Hidden here means hidden AS EXPORTED — a layer the designer switched off (Illustrator and
 *  Figma both write `display:none` for one) or an explicitly invisible node. Its text is a draft
 *  the operator must never be handed a field for. The markup itself is untouched: hiding is the
 *  designer's decision, and it rides into the template exactly as drawn. */
function isHiddenNode(el: Element): boolean {
  if ((el.getAttribute('display') ?? '').trim().toLowerCase() === 'none') return true;
  if ((el.getAttribute('visibility') ?? '').trim().toLowerCase() === 'hidden') return true;
  const style = el.getAttribute('style');
  if (!style) return false;
  return /(?:^|;)\s*display\s*:\s*none/i.test(style) || /(?:^|;)\s*visibility\s*:\s*hidden/i.test(style);
}

/** Is this node offered as a candidate at all? False inside a definition block or a hidden
 *  subtree — both are in the file on purpose and neither is something an operator can type into.
 *  Walks to the root, because either fact is usually stated on an ANCESTOR layer. */
function isOffered(el: Element, root: Element): boolean {
  let node: Element | null = el;
  while (node && node !== root) {
    if (NON_RENDERED_TAGS.has(node.tagName.toLowerCase())) return false;
    if (isHiddenNode(node)) return false;
    node = node.parentElement;
  }
  return node ? !isHiddenNode(node) : true;
}

/** Font sizes declared by CLASS in the file's own `<style>` blocks — Illustrator's "Internal
 *  CSS" styling option puts every size there rather than on the element. Only class selectors
 *  are read; that is what Illustrator, Figma and Inkscape all emit. */
function classFontSizes(svg: Element): Map<string, number> {
  const sizes = new Map<string, number>();
  for (const style of Array.from(svg.querySelectorAll('style'))) {
    for (const rule of (style.textContent ?? '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const size = /font-size\s*:\s*([\d.]+)/i.exec(rule[2]);
      if (!size) continue;
      const px = parseFloat(size[1]);
      if (!Number.isFinite(px)) continue;
      for (const selector of rule[1].split(',')) {
        const cls = /\.([A-Za-z0-9_-]+)\s*$/.exec(selector.trim());
        if (cls) sizes.set(cls[1], px);
      }
    }
  }
  return sizes;
}

/**
 * How big is this run's type? Attribute, inline style, then the class rules above, walking up
 * the ancestors the way inheritance does. **16 is not a guess when nothing says** — it is the
 * CSS initial font size, which is exactly what the browser will draw.
 *
 * Only used to judge whether two runs sit flush or apart (`groupRuns`), so a relative unit
 * nobody resolves (`em`, `%`) is skipped rather than approximated: the next ancestor that
 * states a real number is a better answer than arithmetic on a value we cannot see.
 */
function fontSizeResolver(svg: Element): (el: Element) => number {
  const byClass = classFontSizes(svg);
  const read = (raw: string | null | undefined): number | null => {
    if (!raw) return null;
    const m = /^([\d.]+)\s*(px|pt)?$/i.exec(raw.trim());
    if (!m) return null;
    const n = parseFloat(m[1]);
    return Number.isFinite(n) ? n : null;
  };
  return (el: Element): number => {
    let node: Element | null = el;
    while (node) {
      const attr = read(node.getAttribute('font-size'));
      if (attr !== null) return attr;
      const inline = /font-size\s*:\s*([^;]+)/i.exec(node.getAttribute('style') ?? '');
      const styled = read(inline?.[1]);
      if (styled !== null) return styled;
      for (const cls of (node.getAttribute('class') ?? '').split(/\s+/)) {
        const fromClass = cls && byClass.get(cls);
        if (fromClass) return fromClass;
      }
      node = node.parentElement;
    }
    return 16;
  };
}

/** The leaf `<tspan>`s of one `<text>` — the runs that actually hold characters. A wrapper
 *  tspan around more tspans holds none. */
function leafTspans(text: Element): Element[] {
  return Array.from(text.querySelectorAll('tspan')).filter((t) => !t.querySelector('tspan'));
}

/**
 * THE RUN PROBLEM. A `<tspan>` means two completely different things, and telling them apart
 * decides how many operator fields a file produces.
 *
 * Illustrator writes one tspan per LINE of a multi-line block — and ALSO one tspan per KERNED
 * RUN whenever the type carries tracking or manual kerning, several of them on ONE baseline.
 * Treating every run as a field turned one headline into three ("A" / "lexandra" / " Riva").
 * Treating every shared baseline as one field merged a designer's two SIDE-BY-SIDE labels
 * ("Helsinki" and "22:40", placed apart on the same line) into a single unusable field.
 *
 * Neither reading is in the markup, so the split is decided by the GAP. Runs of one line sit
 * flush against each other - the next one starts about where the previous one ended - while two
 * separate labels are placed a real distance apart. `groupRuns` walks the runs, estimates where
 * each one ends, and starts a new field only when the next `x` is more than an em past that.
 *
 * The estimate assumes start-anchored runs, which is the idiom Illustrator's kerning writes.
 * It is deliberately generous: merging two labels a designer meant to keep apart costs them a
 * field, while splitting a kerned headline costs them their headline.
 */
const CHAR_EM = 0.55; // average advance of a mixed-case glyph, in ems - good to ~15%
const GAP_EMS = 1; // a gap wider than one em means a new field, not the next run

interface TextRun {
  el: Element;
  x: number | null;
  y: number | null;
  text: string;
  size: number;
}

function numAttr(el: Element, name: string): number | null {
  const raw = (el.getAttribute(name) ?? '').trim();
  if (!raw) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

/** Runs grouped into FIELDS: a new field starts on a new baseline, or on a horizontal gap
 *  wider than `GAP_EMS`. Runs with no `x` continue whatever they follow - they are the middle
 *  of a line by definition. */
function groupRuns(runs: TextRun[]): TextRun[][] {
  const fields: TextRun[][] = [];
  let current: TextRun[] = [];
  let lineY: number | null = null;
  let penEnd: number | null = null; // where the previous run is estimated to end

  for (const run of runs) {
    const newLine = run.y !== null && lineY !== null && run.y !== lineY;
    const gapped =
      !newLine && run.x !== null && penEnd !== null && run.x - penEnd > run.size * GAP_EMS;
    if (current.length && (newLine || gapped)) {
      fields.push(current);
      current = [];
    }
    current.push(run);
    if (run.y !== null) lineY = run.y;
    const start: number = run.x ?? penEnd ?? 0;
    penEnd = start + run.text.length * CHAR_EM * run.size;
  }
  if (current.length) fields.push(current);
  return fields;
}

/**
 * The bindable text nodes, in document order. A `<text>` whose runs each stand alone as a field
 * offers each of them - ids are legal on tspans and getElementById finds them, so a line or a
 * side-by-side label can be its own operator field. When any field is made of SEVERAL runs (a
 * kerned line), the `<text>` binds whole instead: `update()` then replaces its content in one
 * write, which is the only write that cannot lose half a line.
 */
function textCandidates(svg: Element, fontSize: (el: Element) => number): Element[] {
  const out: Element[] = [];
  for (const text of Array.from(svg.querySelectorAll('text')).filter((el) => isOffered(el, svg))) {
    const fields = textFields(text, fontSize);
    if (fields.length > 1 && fields.every((f) => f.length === 1)) out.push(...fields.map((f) => f[0].el));
    else out.push(text);
  }
  return out.filter((el) => candidateSample(el, fontSize).length > 0);
}

/** One `<text>`'s runs, grouped into the fields they read as. A text with one run (or none)
 *  is one field holding itself. */
function textFields(text: Element, fontSize: (el: Element) => number): TextRun[][] {
  const tspans = leafTspans(text);
  if (tspans.length < 2) return [[{ el: text, x: null, y: null, text: text.textContent ?? '', size: fontSize(text) }]];
  return groupRuns(
    tspans.map((el) => ({
      el,
      x: numAttr(el, 'x'),
      y: numAttr(el, 'y'),
      text: el.textContent ?? '',
      size: fontSize(el),
    })),
  );
}

/**
 * The sample value a candidate starts with — what the layer READS as drawn.
 *
 * `textContent` concatenates runs with nothing between them, which is right INSIDE a field
 * ("A" + "lexandra" + " Riva" is "Alexandra Riva") and wrong between two, where a line break or
 * a placed gap would collapse into one word ("Helsinki22:40"). So a `<text>` bound whole joins
 * by the same grouping that decided the fields: runs run together, fields separated by a space.
 */
function candidateSample(el: Element, fontSize: (element: Element) => number): string {
  if (el.tagName.toLowerCase() !== 'text' || leafTspans(el).length < 2) {
    return (el.textContent ?? '').trim();
  }
  return textFields(el, fontSize)
    .map((field) => field.map((run) => run.text).join(''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The shapes a glyph outline is made of. Illustrator's Create Outlines writes one path
 *  per glyph (compound for counters); Inkscape and Figma write paths too, Figma sometimes
 *  polygons. A rect/circle/ellipse is furniture, never a letter. */
const GLYPH_TAGS = new Set(['path', 'polygon']);

/** Cap on the outline rows offered — past this a file is an icon set, not outlined copy,
 *  and a hundred anonymous rows would bury the few that are text. */
const MAX_OUTLINE_CANDIDATES = 24;

/**
 * Groups that may be OUTLINED TEXT (plan §1.A): the `<g>`s whose children are all glyph
 * shapes, at least two of them (one path alone is a shape; a word is several). The root's
 * own loose paths are not offered — a group is what a text object exports as in every
 * editor, and a group is what can be hidden as one thing. Named groups survive the cap
 * first, because a designer who named the layer "Name" has told us what it is.
 */
function outlineCandidates(svg: Element): Element[] {
  const groups = Array.from(svg.querySelectorAll('g')).filter((g) => {
    if (!isOffered(g, svg)) return false;
    const children = Array.from(g.children);
    return children.length >= 2 && children.every((c) => GLYPH_TAGS.has(c.tagName.toLowerCase()));
  });
  if (groups.length <= MAX_OUTLINE_CANDIDATES) return groups;
  const named = groups.filter((g) => layerName(g));
  const rest = groups.filter((g) => !layerName(g));
  // Keep document order inside the cap, so the rows read like the file does.
  const kept = new Set([...named, ...rest].slice(0, MAX_OUTLINE_CANDIDATES));
  return groups.filter((g) => kept.has(g));
}

/** Weight words a PostScript face name ends with, and what each one weighs. Order matters only
 *  for reading; the parser takes the heaviest word it finds. */
const STYLE_WEIGHTS: Record<string, number> = {
  thin: 100, hairline: 100,
  extralight: 200, ultralight: 200,
  light: 300,
  regular: 400, normal: 400, book: 400, roman: 400,
  medium: 500,
  semibold: 600, demibold: 600,
  bold: 700,
  extrabold: 800, ultrabold: 800,
  black: 900, heavy: 900,
};

/** Words that describe a CUT rather than a weight. A face name may end in them, and they must
 *  not stop the suffix from being recognised as a style. */
const STYLE_WORDS = new Set(['italic', 'oblique', 'condensed', 'narrow', 'compressed', 'extended', 'expanded']);

/** Split a PostScript-ish run of words apart: "ArchivoBlack" → "Archivo Black", "PTSans" →
 *  "PT Sans". Only applied to a name that carries no spaces of its own. */
function splitCamel(name: string): string {
  return name.includes(' ')
    ? name
    : name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

/**
 * A font name as the LIBRARY knows it, plus the weight the name implied.
 *
 * Illustrator's SVG export writes POSTSCRIPT names — `font-family="Archivo-Bold"`,
 * `"ArchivoBlack-Regular"`, `"HelveticaNeue-CondensedBold"` — where a designer's file names one
 * family. Matched literally, none of those ever finds the bundled face it plainly is, and "Get
 * from Google Fonts" asks Google for a family that does not exist. So the name is read: the part
 * AFTER the last hyphen is the style when every word of it is a style word (which is what keeps
 * "ArchivoBlack-Regular" as the family *Archivo Black* at weight 400, while "Archivo-Black" is
 * *Archivo* at 900), and the family part is split back into words.
 *
 * The verbatim name is never touched — it is what the artwork's own CSS asks for. This is only
 * how the face is looked UP.
 */
function fontLookup(raw: string): { lookup: string; weight: number | null } {
  const name = raw.replace(/_/g, ' ').trim();
  const cut = name.lastIndexOf('-');
  let base = name;
  let weight: number | null = null;
  if (cut > 0) {
    const words = splitCamel(name.slice(cut + 1)).toLowerCase().split(/\s+/).filter(Boolean);
    const isStyle = words.length > 0 && words.every((w) => w in STYLE_WEIGHTS || STYLE_WORDS.has(w));
    if (isStyle) {
      base = name.slice(0, cut);
      const weights = words.map((w) => STYLE_WEIGHTS[w]).filter((n): n is number => typeof n === 'number');
      weight = weights.length > 0 ? Math.max(...weights) : null;
    }
  }
  const lookup = splitCamel(base).replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  return { lookup: lookup || name, weight };
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
    out.push({ family: first, ...fontLookup(first) });
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

  // Inkscape's FLOWED text (`<flowRoot>`) is an SVG 1.2 draft element no browser ever shipped:
  // it draws nothing in Chrome, so the graphic is already missing that copy before we look at
  // it, and there is no node to bind either. Said out loud with the fix, rather than leaving a
  // designer to wonder where their paragraph went. Kept in the markup — removing it would edit
  // someone's file over a rendering opinion.
  if (svg.querySelector('flowRoot')) {
    notices.push(
      'This file uses Inkscape flowed text, which no browser draws — that copy is invisible here and cannot become a field. In Inkscape, select it and use Text > Convert to Text, then export again.',
    );
  }

  // Tag the candidates AFTER sanitizing, so a candidate can never sit inside removed markup.
  const fontSize = fontSizeResolver(svg);
  const nodes = textCandidates(svg, fontSize);
  const candidates: SvgTextCandidate[] = nodes.map((el, i) => {
    const id = `t${i}`;
    el.setAttribute(SVG_CANDIDATE_ATTR, id);
    // A tspan's own name is rarely set; the nearest named thing is usually its <text> or the
    // group Illustrator made of the layer.
    const name = candidateName(el, svg);
    const { label, marked } = stripFieldPrefix(name);
    const sample = candidateSample(el, fontSize);
    return {
      id,
      label: label || `Text ${i + 1}`,
      sample,
      marked,
      numeric: looksNumeric(sample),
      clock: looksClock(sample),
    };
  });

  // Picture layers: every surviving <image> (the sanitizer already dropped external ones).
  // A placeholder with no picture at all has nothing to restore on empty, so it is skipped.
  const images: SvgImageCandidate[] = Array.from(svg.querySelectorAll('image'))
    .filter((el) => isOffered(el, svg))
    .filter((el) => el.getAttribute('href') || el.getAttribute('xlink:href'))
    .map((el, i) => {
      const id = `i${i}`;
      el.setAttribute(SVG_CANDIDATE_ATTR, id);
      const { label, marked } = stripFieldPrefix(candidateName(el, svg));
      return { id, label: label || `Picture ${i + 1}`, marked };
    });

  // Outlined-text suspects: tagged like the rest, so the mapping step can highlight and
  // measure them on its rendered artwork, and the generator can hide the chosen ones.
  const outlines: SvgOutlineCandidate[] = outlineCandidates(svg).map((el, i) => {
    const id = `o${i}`;
    el.setAttribute(SVG_CANDIDATE_ATTR, id);
    const { label, marked } = stripFieldPrefix(candidateName(el, svg));
    return { id, label: label || `Shapes ${i + 1}`, marked };
  });

  return {
    markup: new XMLSerializer().serializeToString(svg),
    width: size.width,
    height: size.height,
    candidates,
    images,
    outlines,
    fonts: fontInventory(svg),
    notices,
  };
}
