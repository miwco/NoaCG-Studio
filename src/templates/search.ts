// TEMPLATE SEARCH — the Browse step's filter + query engine
// (docs/TEMPLATE_TAXONOMY_PROPOSAL.md §13-14). Client-side over the derived metadata:
// strict facets AND together, choices within a facet OR, programme format RANKS rather
// than filters ("Best for X" / "Also works"), and free text matches a field-weighted
// index with phrase-first alias expansion.

import type { StyleTag } from '../model/fonts';
import type { TemplateVariant } from '../model/wizard';
import {
  ALIASES,
  CAPABILITIES,
  CATEGORY_GROUP_OF,
  FAMILIES,
  FORMATS,
  graphicCategoryById,
  SEMANTIC_LABELS,
  STRUCTURE_LABELS,
  type CapabilityId,
  type CategoryGroupId,
  type GraphicCategoryId,
  type MotionIntensity,
  type PlacementId,
  type ProgrammeFamilyId,
  type ProgrammeFormatId,
  type StructureId,
} from '../model/taxonomy';
import { allTemplateMeta, type TemplateMeta } from './templateMeta';

// ── Filters ─────────────────────────────────────────────────────────────────

export type FieldBucket = '1' | '2' | '3' | '4-5' | '6+' | 'repeating';

export interface BrowseFilters {
  query: string;
  /** Ranking facet — never hides (proposal §13.1). */
  family: ProgrammeFamilyId | null;
  format: ProgrammeFormatId | null;
  /** Strict facets. `group` is the lead dropdown's shelf (model/taxonomy.ts
   *  CATEGORY_GROUPS); `category` narrows further to one member category via the group's
   *  refinement chips. A set category always implies its group's result or narrower, so the
   *  two compose without ordering rules. */
  group: CategoryGroupId | null;
  category: GraphicCategoryId | null;
  fieldBucket: FieldBucket | null;
  style: StyleTag | null;
  structures: StructureId[];
  capabilities: CapabilityId[];
  placement: PlacementId | null;
  intensity: MotionIntensity | null;
}

export const NO_BROWSE_FILTERS: BrowseFilters = {
  query: '',
  family: null,
  format: null,
  group: null,
  category: null,
  fieldBucket: null,
  style: null,
  structures: [],
  capabilities: [],
  placement: null,
  intensity: null,
};

const BUCKET_RANGES: Record<Exclude<FieldBucket, 'repeating'>, [number, number]> = {
  '1': [1, 1],
  '2': [2, 2],
  '3': [3, 3],
  '4-5': [4, 5],
  '6+': [6, Infinity],
};

/** Bucket matching is RANGE INTERSECTION over the reachable visible-field range — one
 *  template can sit under several buckets by design (proposal §6.1). */
function bucketMatches(bucket: FieldBucket, meta: TemplateMeta): boolean {
  if (bucket === 'repeating') return meta.fieldCounts.repeating > 0;
  const [lo, hi] = BUCKET_RANGES[bucket];
  const [min, max] = meta.fieldCounts.visibleRange;
  return min <= hi && max >= lo;
}

function passesStrictFilters(meta: TemplateMeta, f: BrowseFilters): boolean {
  if (f.group && CATEGORY_GROUP_OF[meta.category] !== f.group) return false;
  if (f.category && meta.category !== f.category) return false;
  if (f.fieldBucket && !bucketMatches(f.fieldBucket, meta)) return false;
  if (f.style && meta.styleFamily !== f.style) return false;
  if (f.structures.length && !f.structures.some((s) => meta.structures.includes(s))) return false;
  if (f.capabilities.length && !f.capabilities.every((c) => meta.capabilities.includes(c))) return false;
  if (f.placement && !meta.placements.includes(f.placement)) return false;
  if (f.intensity && meta.motion.intensity !== f.intensity) return false;
  return true;
}

// ── The text index (proposal §14.1) ─────────────────────────────────────────

interface IndexedField {
  text: string;
  weight: number;
}

const COMBINING_MARKS = /[̀-ͯ]/g;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .trim();
}

/** Trivial plural fold: 'tickers' matches 'ticker'. */
function fold(token: string): string {
  return token.replace(/(?:es|s)$/, '');
}

const indexCache = new Map<string, IndexedField[]>();

function indexFor(meta: TemplateMeta): IndexedField[] {
  const cached = indexCache.get(meta.id);
  if (cached) return cached;
  const category = graphicCategoryById(meta.category);
  const formatNames = FORMATS.filter((f) => meta.programmeFormats.includes(f.id)).map((f) => f.name);
  const familyNames = FAMILIES.filter((f) => meta.programmeFamilies.includes(f.id)).map((f) => f.name);
  const fields: IndexedField[] = [
    { text: normalize(meta.name), weight: 10 },
    { text: normalize(`${category.name} ${meta.subtype ?? ''}`), weight: 8 },
    { text: normalize(meta.fieldSemantics.map((s) => SEMANTIC_LABELS[s]).join(' ')), weight: 6 },
    { text: normalize(meta.fieldSchema.map((f) => f.title).join(' ')), weight: 6 },
    { text: normalize(meta.capabilities.map((c) => CAPABILITIES.find((k) => k.id === c)?.name ?? '').join(' ')), weight: 5 },
    { text: normalize([...formatNames, ...familyNames].join(' ')), weight: 4 },
    { text: normalize(meta.structures.map((s) => STRUCTURE_LABELS[s]).join(' ')), weight: 4 },
    { text: normalize(meta.description), weight: 2 },
  ];
  indexCache.set(meta.id, fields);
  return fields;
}

// ── Alias expansion (phrase-first, proposal §14.2) ──────────────────────────

interface ParsedQuery {
  tokens: string[];
  boostCategories: Set<GraphicCategoryId>;
  boostSubtypes: Set<string>;
  boostStructures: Set<StructureId>;
  boostFormats: Set<ProgrammeFormatId>;
  boostFamilies: Set<ProgrammeFamilyId>;
  boostStyles: Set<StyleTag>;
}

function parseQuery(raw: string): ParsedQuery {
  let text = ` ${normalize(raw)} `;
  const parsed: ParsedQuery = {
    tokens: [],
    boostCategories: new Set(),
    boostSubtypes: new Set(),
    boostStructures: new Set(),
    boostFormats: new Set(),
    boostFamilies: new Set(),
    boostStyles: new Set(),
  };
  // Longest aliases first so "breaking news" wins over "breaking".
  const aliasKeys = Object.keys(ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of aliasKeys) {
    const needle = ` ${alias} `;
    if (!text.includes(needle)) continue;
    text = text.replace(needle, ' ');
    const t = ALIASES[alias];
    t.categories?.forEach((c) => parsed.boostCategories.add(c));
    t.subtypes?.forEach((s) => parsed.boostSubtypes.add(s));
    t.structures?.forEach((s) => parsed.boostStructures.add(s));
    t.formats?.forEach((f) => parsed.boostFormats.add(f));
    t.families?.forEach((f) => parsed.boostFamilies.add(f));
    t.styles?.forEach((s) => parsed.boostStyles.add(s));
  }
  parsed.tokens = text.split(/\s+/).filter(Boolean);
  return parsed;
}

/** Token-AND text score: every remaining token must match some indexed field (prefix on
 *  word starts); the score sums the best field weight per token. 0 = no match. */
function textScore(meta: TemplateMeta, tokens: string[]): number {
  if (!tokens.length) return 0;
  const fields = indexFor(meta);
  let score = 0;
  for (const token of tokens) {
    const folded = fold(token);
    let best = 0;
    for (const field of fields) {
      const words = field.text.split(/\s+/);
      if (words.some((w) => w.startsWith(folded) || fold(w) === folded)) {
        best = Math.max(best, field.weight);
      }
    }
    if (!best) return 0;
    score += best;
  }
  return score;
}

function aliasScore(meta: TemplateMeta, q: ParsedQuery): number {
  let score = 0;
  if (q.boostCategories.has(meta.category)) score += 40;
  // A precise word ranks its SUBTYPE above the rest of the boosted category.
  if (meta.subtype && q.boostSubtypes.has(meta.subtype)) score += 25;
  if (meta.structures.some((s) => q.boostStructures.has(s))) score += 20;
  if (meta.programmeFormats.some((f) => q.boostFormats.has(f))) score += 15;
  if (meta.programmeFamilies.some((f) => q.boostFamilies.has(f))) score += 10;
  if (q.boostStyles.has(meta.styleFamily)) score += 10;
  return score;
}

// ── Programme ranking (proposal §13) ────────────────────────────────────────

/** 'all'-relevance categories match every format but rank below genuine pack-derived
 *  matches (proposal §3). */
function formatBoost(meta: TemplateMeta, f: BrowseFilters): { boost: number; bestFor: boolean } {
  const universal = graphicCategoryById(meta.category).relevance === 'all';
  if (f.format) {
    if (!meta.programmeFormats.includes(f.format)) return { boost: 0, bestFor: false };
    return { boost: universal ? 60 : 100, bestFor: true };
  }
  if (f.family) {
    if (!meta.programmeFamilies.includes(f.family)) return { boost: 0, bestFor: false };
    return { boost: universal ? 30 : 50, bestFor: true };
  }
  return { boost: 0, bestFor: false };
}

// ── The engine ──────────────────────────────────────────────────────────────

export interface BrowseResult {
  variant: TemplateVariant;
  meta: TemplateMeta;
  score: number;
  /** True when the selected format/family genuinely matches — the "Best for" section. */
  bestFor: boolean;
}

export interface BrowseOutcome {
  best: BrowseResult[];
  also: BrowseResult[];
  total: number;
}

/** Ambient context that RANKS but is never a filter — the user did not choose it, so it
 *  earns no chip and clearing the filters does not clear it. */
export interface BrowseContext {
  /** The saved project brand's style family, when "Use current project's colors & typeface"
   *  is on: the package's siblings lead (proposal §13.3). A small boost, deliberately
   *  weaker than a programme match — it must never outrank what the user asked for. */
  brandFamily?: StyleTag | null;
  /** Variant ids this visitor may not see — a design an admin marked beta, internal or
   *  hidden and this visitor is not entitled to (docs/ADMIN.md §7, resolved server-side by
   *  GET /api/me/entitlement). They are REMOVED before scoring, never greyed: a card the
   *  visitor cannot use is noise, and an empty-state count that includes it would lie.
   *  Empty offline and whenever the lookup fails, so the free catalog stays whole. */
  hiddenIds?: readonly string[];
}

const BRAND_BOOST = 8;

export function browseTemplates(filters: BrowseFilters, context: BrowseContext = {}): BrowseOutcome {
  const q = parseQuery(filters.query);
  const hasQuery = filters.query.trim().length > 0;
  const results: BrowseResult[] = [];

  const hidden = context.hiddenIds?.length ? new Set(context.hiddenIds) : null;

  allTemplateMeta().forEach(({ variant, meta }, catalogIndex) => {
    if (hidden?.has(variant.id)) return;
    if (!passesStrictFilters(meta, filters)) return;

    let score = 0;
    if (hasQuery) {
      const text = textScore(meta, q.tokens);
      const alias = aliasScore(meta, q);
      // A query must land somewhere — tokens in the index, or an alias hit.
      if (text === 0 && alias === 0) return;
      score += text + alias;
    }
    const { boost, bestFor } = formatBoost(meta, filters);
    score += boost;
    if (context.brandFamily && meta.styleFamily === context.brandFamily) score += BRAND_BOOST;
    // Stable catalog-order tiebreak (proposal §13.3): earlier = marginally higher.
    score += (1000 - catalogIndex) / 100000;
    results.push({ variant, meta, score, bestFor });
  });

  results.sort((a, b) => b.score - a.score);
  const ranking = filters.format !== null || filters.family !== null;
  const ordered = hasQuery || ranking ? results : spreadFirstPage(results);
  return {
    best: ranking ? results.filter((r) => r.bestFor) : ordered,
    also: ranking ? results.filter((r) => !r.bestFor) : [],
    total: results.length,
  };
}

/**
 * The Browse step's page size. Duplicated from the component on purpose: this module has to know
 * how many cards the fold holds to make that many of them different, and a wrong number here
 * spreads the wrong slice rather than breaking anything.
 */
const FIRST_PAGE = 12;

/**
 * MAKE THE FIRST PAGE LOOK LIKE THE CATEGORY, not like its first twelve entries.
 *
 * Browse renders a PAGE of twelve, so for most people the first twelve ARE the category. With no
 * query and no ranking facet the only tiebreak is catalog position, so the fold showed whatever
 * happened to be written first - and designs get written in batches, which means the fold showed
 * one batch. Measured 2026-08-21 on the lower thirds: the first twelve were 10 dark and 10 orange
 * out of a shelf carrying nine accent hues, 31 designs with no coloured accent and 7 light
 * backdrops. The owner read that page and said the graphics "all look the same". They do; the
 * category does not.
 *
 * THE AXES ARE THE ONES THAT VERIFIED. `scripts/card-look-sweep.mjs` measures what an eye reads
 * off a rendered card - backdrop, accent hue, footprint - and `spike-declared-vs-measured.mjs`
 * checked those against what a design DECLARES, because ordering cannot afford a render. The
 * palette's accent hue predicted the measured hue 72/72. The palette's panel predicted the
 * measured backdrop only 60/80, so backdrop is deliberately NOT used here: a 75% signal would be
 * guessing at the one job this function has. Style family stands in for panel treatment, which
 * is the axis it genuinely explains (docs/CATALOG_VARIETY.md §1.2).
 *
 * Greedy, and score still decides everything else: walk the page, and for each slot take the
 * highest-scoring design whose (hue, family) pair is least represented so far. Everything past
 * the fold keeps its score order untouched, so this changes what is SEEN FIRST and never what is
 * ranked highest. There is deliberately no house design pinned to slot one - owner, 2026-08-21:
 * "no one wants to use a design that other people also use."
 */
function spreadFirstPage(results: BrowseResult[]): BrowseResult[] {
  if (results.length <= 2) return results;
  const hueOf = (r: BrowseResult) => accentHueBucket(r.variant.defaultPalette?.accent);
  const famOf = (r: BrowseResult) => r.variant.styleTag ?? '';
  const hueSeen = new Map<string, number>();
  const famSeen = new Map<string, number>();
  const pool = [...results];
  const page: BrowseResult[] = [];
  while (page.length < Math.min(FIRST_PAGE, results.length) && pool.length > 0) {
    let pick = 0;
    let best: [number, number] = [Infinity, Infinity];
    for (let i = 0; i < pool.length; i += 1) {
      // HUE FIRST, family only to break a tie within it. Weighing the two equally made a
      // COMPOUND key, and `none` is a hue bucket like any other - so a colourless design in each
      // family read as four different pairs and no-accent took 7 of the 12 slots against a 30%
      // share of the shelf. Lexicographic is what "spread the colour, then the treatment" means.
      const rank: [number, number] = [hueSeen.get(hueOf(pool[i])) ?? 0, famSeen.get(famOf(pool[i])) ?? 0];
      // `<` not `<=` throughout: the pool is already in score order, so the first index reaching
      // a rank is the best-scoring design holding it.
      if (rank[0] < best[0] || (rank[0] === best[0] && rank[1] < best[1])) {
        best = rank;
        pick = i;
        if (rank[0] === 0 && rank[1] === 0) break; // nothing can beat an unseen hue AND family
      }
    }
    const [chosen] = pool.splice(pick, 1);
    hueSeen.set(hueOf(chosen), (hueSeen.get(hueOf(chosen)) ?? 0) + 1);
    famSeen.set(famOf(chosen), (famSeen.get(famOf(chosen)) ?? 0) + 1);
    page.push(chosen);
  }
  return [...page, ...pool];
}

/** Twelve 30-degree buckets, or `none` for a neutral accent - the same buckets the card-look
 *  sweep reports in, so a claim made from one can be checked against the other. */
export function accentHueBucket(hex: string | undefined): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!match) return 'none';
  const n = parseInt(match[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  // A grey or near-grey accent has no hue to bucket, and calling it "red" would make two
  // colourless designs look like a deliberate pair.
  if (max === min || (max - min) / max < 0.15) return 'none';
  let h;
  if (max === r) h = ((g - b) / (max - min) + 6) % 6;
  else if (max === g) h = (b - r) / (max - min) + 2;
  else h = (r - g) / (max - min) + 4;
  return String(Math.floor((h * 60) / 30) % 12);
}

/** The chip whose removal restores the largest result count — the zero-result escape
 *  hatch (proposal §13.2). Returns null when no single strict filter is set. */
export function mostRestrictiveFilter(filters: BrowseFilters): keyof BrowseFilters | null {
  const strictKeys: (keyof BrowseFilters)[] = [
    'group', 'category', 'fieldBucket', 'style', 'structures', 'capabilities', 'placement', 'intensity',
  ];
  let bestKey: keyof BrowseFilters | null = null;
  let bestCount = -1;
  for (const key of strictKeys) {
    const value = filters[key];
    const isSet = Array.isArray(value) ? value.length > 0 : value !== null;
    if (!isSet) continue;
    const without = { ...filters, [key]: Array.isArray(value) ? [] : null } as BrowseFilters;
    const count = browseTemplates(without).total;
    if (count > bestCount) {
      bestCount = count;
      bestKey = key;
    }
  }
  return bestKey;
}

/** Facet values worth rendering as chips: only those with catalog mass (proposal §12.1),
 *  same rule as category tiles. */
export function offeredIntensities(): MotionIntensity[] {
  const seen = new Set<MotionIntensity>();
  for (const { meta } of allTemplateMeta()) seen.add(meta.motion.intensity);
  return (['none', 'subtle', 'medium', 'strong'] as MotionIntensity[]).filter((i) => seen.has(i));
}

export function offeredStructures(): StructureId[] {
  const seen = new Set<StructureId>();
  for (const { meta } of allTemplateMeta()) meta.structures.forEach((s) => seen.add(s));
  return (Object.keys(STRUCTURE_LABELS) as StructureId[]).filter((s) => seen.has(s));
}

export function offeredCapabilityFilters(): CapabilityId[] {
  const present = new Set<CapabilityId>();
  for (const { meta } of allTemplateMeta()) meta.capabilities.forEach((c) => present.add(c));
  return CAPABILITIES.filter((c) => c.filter && present.has(c.id)).map((c) => c.id);
}

/** Categories present in the catalog — used by GRAPHIC_CATEGORIES-driven UI to hide
 *  taxonomy-ahead-of-catalog tiles. Re-exported convenience over templateMeta. */
export function categoriesWithContent(): Set<GraphicCategoryId> {
  const seen = new Set<GraphicCategoryId>();
  for (const { meta } of allTemplateMeta()) seen.add(meta.category);
  return seen;
}
