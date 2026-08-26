// Creative Mode phase C - the two new inter-stage contracts (docs/CREATIVE_MODE_PLAN.md §4,
// §6). Both follow the house pattern of StructuralIntent and DesignSpec: a versioned typed
// shape plus a NORMALIZER that clamps a raw model emit instead of rejecting it - the platform
// owns correctness, the emit owns meaning.
//
// StructuralIntent (src/model/structuralIntent.ts) says what must EXIST. These two say how a
// creation gets there:
//   ConceptDirection - a ~200-token design DIRECTION, no code and no chassis id (stage 4);
//   CreativeSpec     - the chosen direction made concrete (stage 5), carried WHOLE into the
//                      compile and style stages, which is how F4 (the design stage's
//                      decisions dying at the coder boundary) is fixed by construction.
//
// The separation rule (§6) is enforced here by shape: CreativeSpec references intent part ids
// and never re-declares functional requirements; ConceptDirection carries no geometry at all.

import type { Zone9 } from '../../model/wizard';
import type { StructuralIntent } from '../../model/structuralIntent';
import { intentCoversFrame } from '../../templates/structuralAnchor';
import { clampLightnessForContrast } from '../lite/contract';

// ── ConceptDirection v1 (stage 4) ────────────────────────────────────────────

/** The composition families the knowledge cards teach (§5). An OPEN vocabulary: an emit may
 *  name something else and it survives normalization - the list is what the cards cover, not
 *  a wall a brief has to fit (the F2 lesson, applied one level up). */
export const COMPOSITION_FAMILIES = [
  'strap', 'tower', 'board', 'split', 'bracket', 'card', 'ring', 'full-frame', 'strip',
] as const;

export interface ConceptDirection {
  version: 1;
  /** Stable index-derived id ('c1'…'c3') - assigned by the platform, never by the model. */
  id: string;
  /** Short human label ("Ledger", "Floodlit split"). */
  name: string;
  /** The composition family this direction reads as (open word). */
  compositionFamily: string;
  /** The reading order, as intent part ids or role words - first read first. */
  hierarchyOrder: string[];
  /** How colour behaves ("one hot accent on near-black", "paper warm, ink dark"). */
  paletteCharacter: string;
  /** How it moves ("cut-fast, no bounce", "settling rise"). */
  motionCharacter: string;
  /** One line: why this direction serves the brief. */
  rationale: string;
}

/** Two directions COUNT as different only when they differ in both the composition family
 *  and the reading order (§11 criterion 5 - palette or motion variation alone is a reskin). */
export function conceptsDiffer(a: ConceptDirection, b: ConceptDirection): boolean {
  const order = (c: ConceptDirection) => c.hierarchyOrder.join('>').toLowerCase();
  return a.compositionFamily.toLowerCase() !== b.compositionFamily.toLowerCase()
    && order(a) !== order(b);
}

/** How many of the emitted directions are genuinely distinct from at least one other. The
 *  bench reports this per brief; the threshold (2 of 3) lives in the go/no-go sheet. */
export function distinctConceptCount(concepts: ConceptDirection[]): number {
  return concepts.filter((c, i) => concepts.some((o, j) => i !== j && conceptsDiffer(c, o))).length;
}

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v.trim() : fallback);
const strList = (v: unknown, max: number): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean).slice(0, max) : [];

export function normalizeConcepts(raw: unknown): ConceptDirection[] {
  const list = Array.isArray((raw as { concepts?: unknown })?.concepts)
    ? ((raw as { concepts: unknown[] }).concepts)
    : Array.isArray(raw) ? (raw as unknown[]) : [];
  return list.slice(0, 3).map((entry, i) => {
    const r = (entry ?? {}) as Record<string, unknown>;
    return {
      version: 1 as const,
      id: `c${i + 1}`,
      name: str(r.name, `Direction ${i + 1}`),
      compositionFamily: str(r.compositionFamily, 'card'),
      hierarchyOrder: strList(r.hierarchyOrder, 8),
      paletteCharacter: str(r.paletteCharacter),
      motionCharacter: str(r.motionCharacter),
      rationale: str(r.rationale),
    };
  });
}

// ── CreativeSpec v1 (stage 5) ────────────────────────────────────────────────

/** A region's weight in the reading order - what the type ladder and the entrance order are
 *  derived from. Three steps, deliberately: a finer ladder is a number nobody can defend. */
export type RegionEmphasis = 'primary' | 'secondary' | 'support';

export interface CreativeRegionSpec {
  /** Matches a StructuralIntent part id wherever one exists (the §6 reference rule). */
  id: string;
  /** Open role word, carried from the intent ("name", "score", "tie", "timer"). */
  role: string;
  emphasis: RegionEmphasis;
  /** The region repeats per data item. Compiled onto ONE list field + a rebuild runtime (the
   *  house textarea convention), never onto N numbered fields. */
  repeating?: boolean;
  /** For a repeating region: the parts of ONE item, in order - the `|` columns of a line. */
  itemParts?: string[];
  /** Intent field keys this region shows, in order. Unknown keys are dropped at compile. */
  fieldKeys?: string[];
  /** Region-level type treatment. Sizes are ladder steps, not pixels: the compiler owns the
   *  numbers so the type floor cannot be argued away by an emit (plan §3.4). */
  typography?: {
    caseStyle?: 'as-typed' | 'upper';
    weight?: 'regular' | 'semibold' | 'bold' | 'black';
    tracking?: 'tight' | 'normal' | 'wide';
  };
}

export interface CreativeStateSpec {
  /** References a StructuralIntent state id. */
  id: string;
  trigger: 'operator' | 'timer';
  /** Region ids this state brings ON - compiled as a middle step's `reveals`. */
  revealRegions?: string[];
  description?: string;
}

export interface CreativeSpec {
  version: 1;
  /** Which ConceptDirection this spec makes concrete. */
  conceptId: string;
  name: string;
  summary: string;
  layout: {
    /** The concept's composition family, carried through so the cards and the compiler agree. */
    family: string;
    /** How the regions relate. The compiler turns this into the box's display rule; a style
     *  patch may override it entirely - this is the STARTING composition, not a cage. */
    arrangement: 'stack' | 'row' | 'grid' | 'split';
    /** Full-frame graphics ignore the zone and fill the canvas (a versus card, a bracket). */
    fullFrame: boolean;
    zone: Zone9;
    /** 0.85 compact … 1.2 large, clamped. */
    sizeScale: number;
  };
  regions: CreativeRegionSpec[];
  palette: { accent: string; text: string; textDim: string; panel: string };
  /** A bundled font id (model/fonts.ts). An unknown id falls back at compile time. */
  fontId: string;
  motion: {
    /** Region ids in entrance order - the reading order made temporal. */
    entranceOrder: string[];
    character: 'rise' | 'glide' | 'fade' | 'snap' | 'wipe';
    /** Entrance length in seconds (0.4 … 2.0, clamped). */
    seconds: number;
  };
  states?: CreativeStateSpec[];
  /** What the STYLE stage must get right in this design, in one or two sentences. */
  designNote: string;
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGBA = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/i;
const colour = (v: unknown, fallback: string): string => {
  const s = str(v);
  return HEX.test(s) || RGBA.test(s) ? s : fallback;
};
const clamp = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return Math.min(max, Math.max(min, n));
};
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(str(v) as T) ? (str(v) as T) : fallback;

const ZONES: Zone9[] = [
  'top-left', 'top-center', 'top-right',
  'mid-left', 'mid-center', 'mid-right',
  'bottom-left', 'bottom-center', 'bottom-right',
];

/** The default palette a malformed emit clamps to: the product's own dark control-room look,
 *  which is legible over anything and never a silent black-on-black. */
const FALLBACK_PALETTE = { accent: '#ffb020', text: '#ffffff', textDim: '#c8ccd4', panel: 'rgba(12,14,18,0.88)' };

/** Below this a panel is a tint, not a reading surface: the video reads through it and no ink
 *  colour is reliably legible, because what is behind the panel is a picture nobody has seen
 *  yet. Raising alpha is the smallest change that makes the design the model asked for work,
 *  and it leaves the hue alone. */
const MIN_PANEL_ALPHA = 0.85;

type Rgba = { r: number; g: number; b: number; a: number };

function parseColour(value: string): Rgba | null {
  const v = value.trim();
  const rgba = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i);
  if (rgba) {
    const rawA = rgba[4];
    const a = rawA === undefined ? 1 : (rawA.endsWith('%') ? Number(rawA.slice(0, -1)) / 100 : Number(rawA));
    return { r: +rgba[1], g: +rgba[2], b: +rgba[3], a: Number.isFinite(a) ? a : 1 };
  }
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (!hex) return null;
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16), a: 1 };
}

const toHex = ({ r, g, b }: Rgba): string =>
  `#${[r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')}`;

/**
 * Make the declared palette one a viewer can actually read.
 *
 * The 2026-08-02 rounds produced correct-looking contracts that rendered unreadable - white
 * ink on a near-white panel at 1.1:1, dark brown on a dark plate. The contrast maths already
 * exists (`lite/contract.ts clampLightnessForContrast`, stepped rather than binary-searched
 * because travelling toward an extreme can pass THROUGH the panel's own luminance), so this
 * reuses it rather than writing a third implementation.
 *
 * What it could NOT reuse is the entry point: `clampLitePalette` works on hex, and 48 of the
 * 61 panels across the archived creative specs are `rgba`. Handed one, the luminance maths
 * returns null and the clamp silently no-ops - it would have looked like a fix and changed
 * nothing on four cases in five. So the panel is resolved to an opaque colour FIRST, by
 * raising a too-thin alpha to the point where the panel is a surface rather than a tint, and
 * the ink is then clamped against that.
 */
function legiblePalette(p: { accent: string; text: string; textDim: string; panel: string }) {
  const panel = parseColour(p.panel);
  if (!panel) return p;
  const raised: Rgba = { ...panel, a: panel.a < MIN_PANEL_ALPHA ? MIN_PANEL_ALPHA : panel.a };
  const panelHex = toHex(raised);

  // TRANSLUCENT INK IS THE SAME TRAP AS A TRANSLUCENT PANEL, and fixing only the panel left it
  // live: an emit asking for `rgba(128,128,128,0.9)` text on a pale panel measured 1.8:1 and
  // the clamp did nothing, because the luminance maths reads hex. So each ink is composited
  // ONTO the resolved panel first - which is what the viewer actually sees - and clamped as
  // that. The alpha is baked in rather than kept: it was what made the line unreadable.
  //
  // A colour that already clears its floor comes back BYTE-IDENTICAL. Normalizing every value
  // on the way through would rewrite `rgba(12,14,18,0.88)` as `rgba(12, 14, 18, 0.88)` in code
  // the user is expected to read and edit - churn with nothing behind it, on the majority of
  // palettes, which are fine to begin with.
  const ink = (value: string, target: number): string => {
    const c = parseColour(value);
    if (!c) return value;
    const flat = c.a >= 1 ? c : {
      r: c.r * c.a + raised.r * (1 - c.a),
      g: c.g * c.a + raised.g * (1 - c.a),
      b: c.b * c.a + raised.b * (1 - c.a),
      a: 1,
    };
    const flatHex = toHex(flat);
    const clamped = clampLightnessForContrast(flatHex, panelHex, target) ?? flatHex;
    // Opaque and already clearing the floor: nothing to say, so say nothing.
    return clamped === flatHex && c.a >= 1 ? value : clamped;
  };

  return {
    // The accent is INK too wherever a design uses it for words - the scaffold colours a row's
    // leading cell with it - so it carries the secondary floor rather than being left alone.
    accent: ink(p.accent, 3),
    text: ink(p.text, 4.5),
    textDim: ink(p.textDim, 3),
    // Keep the declared FORM, and the declared STRING when nothing needed raising: a design
    // that asked for a translucent panel keeps one, just thick enough to be read against.
    panel: raised.a === panel.a
      ? p.panel
      : `rgba(${raised.r}, ${raised.g}, ${raised.b}, ${Number(raised.a.toFixed(2))})`,
  };
}

/**
 * Clamp a raw stage-5 emit into a well-formed CreativeSpec. Nothing here rejects: an
 * off-shape region list degrades to one content region, an unknown zone to the intent's,
 * an illegal colour to the fallback - the compile stage must always have something to
 * build, and the VERIFY stage is what decides whether the result served the brief.
 */
export function normalizeCreativeSpec(raw: unknown, intent: StructuralIntent): CreativeSpec {
  const r = (raw ?? {}) as Record<string, unknown>;
  const layout = (r.layout ?? {}) as Record<string, unknown>;
  const motion = (r.motion ?? {}) as Record<string, unknown>;
  const palette = (r.palette ?? {}) as Record<string, unknown>;

  const regions = (Array.isArray(r.regions) ? r.regions : [])
    .map((entry, i) => {
      const g = (entry ?? {}) as Record<string, unknown>;
      const id = str(g.id) || `r${i + 1}`;
      return {
        id: id.replace(/[^a-z0-9-]/gi, '-').toLowerCase(),
        role: str(g.role, 'content'),
        emphasis: oneOf<RegionEmphasis>(g.emphasis, ['primary', 'secondary', 'support'], i === 0 ? 'primary' : 'secondary'),
        ...(g.repeating === true ? { repeating: true as const } : {}),
        itemParts: strList(g.itemParts, 6),
        fieldKeys: strList(g.fieldKeys, 8),
        typography: {
          caseStyle: oneOf(((g.typography ?? {}) as Record<string, unknown>).caseStyle, ['as-typed', 'upper'] as const, 'as-typed'),
          weight: oneOf(((g.typography ?? {}) as Record<string, unknown>).weight, ['regular', 'semibold', 'bold', 'black'] as const, 'semibold'),
          tracking: oneOf(((g.typography ?? {}) as Record<string, unknown>).tracking, ['tight', 'normal', 'wide'] as const, 'normal'),
        },
      };
    })
    .slice(0, 10);

  // A spec with no regions still compiles: every intent part becomes one, so the verify
  // stage measures the brief rather than the emit's silence.
  const fallbackRegions: CreativeRegionSpec[] = intent.parts.length
    ? intent.parts.map((p, i) => ({
        id: p.id,
        role: p.role,
        emphasis: (i === 0 ? 'primary' : 'secondary') as RegionEmphasis,
        ...(p.repeating ? { repeating: true as const } : {}),
        itemParts: p.itemParts ?? [],
        fieldKeys: [],
        typography: { caseStyle: 'as-typed' as const, weight: 'semibold' as const, tracking: 'normal' as const },
      }))
    : [{
        id: 'content',
        role: 'content',
        emphasis: 'primary',
        itemParts: [],
        fieldKeys: [],
        typography: { caseStyle: 'as-typed', weight: 'semibold', tracking: 'normal' },
      }];

  // ONE repeating region per graphic: repeating data rides one textarea (the house list
  // convention), the compiled runtime rebuilds one rows container, and the scaffold gives
  // that container a fixed id - a second repeating region would duplicate the DOM id and
  // stay empty forever (the bracket smoke's br-in-progress C compiled exactly that:
  // benchmarks/creative/v1/SMOKE-2026-07-31.md item 6). Later repeating flags demote to
  // plain regions; their itemParts survive as ordinary content the verify stage measures.
  const finalRegions = (regions.length ? regions : fallbackRegions).map((g, i, all) => {
    const firstRepeating = all.findIndex((o) => o.repeating);
    if (!g.repeating || i === firstRepeating) return g;
    const { repeating: _dropped, ...plain } = g;
    return plain;
  });
  const known = new Set(finalRegions.map((g) => g.id));

  const states = (Array.isArray(r.states) ? r.states : [])
    .map((entry) => {
      const s = (entry ?? {}) as Record<string, unknown>;
      return {
        id: str(s.id),
        trigger: oneOf(s.trigger, ['operator', 'timer'] as const, 'operator'),
        revealRegions: strList(s.revealRegions, 6).filter((id) => known.has(id)),
        ...(str(s.description) ? { description: str(s.description) } : {}),
      };
    })
    .filter((s) => Boolean(s.id))
    .slice(0, 4);

  const entranceOrder = strList(motion.entranceOrder, 10).filter((id) => known.has(id));

  return {
    version: 1,
    conceptId: str(r.conceptId, 'c1'),
    name: str(r.name, 'Creative graphic'),
    summary: str(r.summary),
    layout: {
      family: str(layout.family, 'card'),
      arrangement: oneOf(layout.arrangement, ['stack', 'row', 'grid', 'split'] as const, 'stack'),
      // The CATALOG's taxonomy answers this when the brief named a structure it knows; the
      // model's flag is the fallback for a genuinely novel graphic. Measured at 80% wrong on
      // lower thirds across two schema rewordings, so it is decided rather than asked for
      // (templates/structuralAnchor.ts intentCoversFrame).
      fullFrame: intentCoversFrame(intent) ?? layout.fullFrame === true,
      zone: ZONES.includes(str(layout.zone) as Zone9)
        ? (str(layout.zone) as Zone9)
        : intent.placement ?? 'bottom-left',
      sizeScale: clamp(layout.sizeScale, 0.85, 1.2, 1),
    },
    regions: finalRegions,
    palette: legiblePalette({
      accent: colour(palette.accent, FALLBACK_PALETTE.accent),
      text: colour(palette.text, FALLBACK_PALETTE.text),
      textDim: colour(palette.textDim, FALLBACK_PALETTE.textDim),
      panel: colour(palette.panel, FALLBACK_PALETTE.panel),
    }),
    fontId: str(r.fontId, 'inter'),
    motion: {
      // An emit that named no order (or named regions that do not exist) still gets the
      // reading order: the region list IS the fallback entrance order.
      entranceOrder: entranceOrder.length ? entranceOrder : finalRegions.map((g) => g.id),
      character: oneOf(motion.character, ['rise', 'glide', 'fade', 'snap', 'wipe'] as const, 'rise'),
      seconds: clamp(motion.seconds, 0.4, 2, 0.9),
    },
    ...(states.length ? { states } : {}),
    designNote: str(r.designNote),
  };
}
