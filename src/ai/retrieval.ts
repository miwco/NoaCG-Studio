// RETRIEVAL - the shortlist of proven designs a brief should be adapted from.
//
// The product promise is "describe the graphic you need and NoaCG turns a PROVEN broadcast
// design into a customized one". The design stage was already the adaptation machine; what it
// lacked was retrieval. It was handed `catalogDigest()` - 430 variants, ~20,300 tokens, one flat
// list - and asked to find the right one, on the cheapest model in the product. That is the
// single decision the whole grounded path rests on, and nothing narrowed the haystack
// (docs/ADAPT_FIRST_PLAN.md §1.4; the benchmark's most common defect was a lower third assembled
// for a stinger brief).
//
// So this module narrows it, and it does so with NO new model call and NO second retrieval
// system: the ranking is the Browse storefront's own engine (`templates/search.ts` - the
// field-weighted token index, phrase-first alias expansion, and programme relevance already
// serving the wizard's faceted storefront), and the structural filter is the ONE anchor table
// (`templates/structuralAnchor.ts`) the router and the satisfaction check already share. The
// inputs are what the intent stage has already produced before the design call runs.
//
// **Degrade, never fail.** No terms, no matches, no anchor - each step falls back to a wider
// pool, and the last fallback is the full digest, i.e. exactly the pre-retrieval behaviour.

import { ALIASES } from '../model/taxonomy';
import type { StructuralIntent } from '../model/structuralIntent';
import type { TemplateVariant } from '../model/wizard';
import { allTemplateMeta } from '../templates/templateMeta';
import { browseTemplates, NO_BROWSE_FILTERS, type FieldBucket } from '../templates/search';
import {
  anchorResolves,
  structuralFit,
  variantSatisfiesAnchor,
  type StructuralAnchor,
} from '../templates/structuralAnchor';

// Lite uses the same retrieval surface, but its candidates are measured chassis rather than
// the full wizard catalog. The implementation stays with the Lite contract so its category,
// capacity, slot, and geometry facts cannot drift into a second registry.
export { retrieveLiteReferenceSet } from './lite/contract';

/** How many proven designs the design stage chooses between. Ten is a shortlist a small model
 *  can hold and a person can be shown; the full catalog is neither. */
export const SHORTLIST_LIMIT = 10;

export interface Shortlist {
  /** The candidates, best first. Empty means "use the full catalog" (see `full`). */
  variants: TemplateVariant[];
  /** The structure the brief was resolved to, when one resolved. */
  anchor: StructuralAnchor | null;
  /** How the shortlist was built - recorded in telemetry and honest about every degrade. */
  reason: string;
  /** True when nothing narrowed the catalog: the caller must show the full digest. */
  full: boolean;
}

export const FULL_CATALOG: Shortlist = {
  variants: [],
  anchor: null,
  reason: 'No structure resolved - the whole catalog is the shortlist.',
  full: true,
};

// ── Term extraction ──────────────────────────────────────────────────────────
//
// The search engine's text score is token-AND: every token must land somewhere or the whole
// query scores zero. A brief is a sentence ("a lower third for our evening news with the
// reporter's name and location"), and the words that never land - our, evening, with - would
// zero the entire query. So a brief is not ONE query. It is a set of terms, each scored
// separately and summed, which is the union the AND semantics cannot express and which makes a
// term that matches nothing harmless instead of fatal.

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'onto', 'over', 'under', 'when',
  'what', 'which', 'their', 'there', 'here', 'have', 'has', 'had', 'will', 'would', 'should',
  'could', 'need', 'needs', 'want', 'wants', 'make', 'makes', 'made', 'create', 'creates',
  'design', 'designs', 'graphic', 'graphics', 'template', 'templates', 'show', 'shows', 'like',
  'some', 'each', 'also', 'about', 'them', 'they', 'your', 'ours', 'been', 'being', 'very',
  'more', 'most', 'less', 'than', 'then', 'both', 'only', 'just', 'must', 'plus', 'plain',
]);

const MAX_TERMS = 12;

/** The alias phrases the brief actually contains - the strongest single signal in the index,
 *  and the reason a phrase must survive as a phrase ("breaking news" is not two words here). */
function aliasPhrases(text: string): string[] {
  const hay = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;
  return Object.keys(ALIASES)
    .filter((alias) => hay.includes(` ${alias} `))
    // Longest first, so a phrase is preferred over a word it contains.
    .sort((a, b) => b.length - a.length);
}

/**
 * The terms a brief is searched by, best signal first. Everything here is already written
 * down by the time the design call runs - the intent stage produced the fields, the parts and
 * the tone - so retrieval asks no model anything.
 */
export function briefTerms(brief: string, intent: StructuralIntent | null): string[] {
  const terms: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string | undefined) => {
    const t = (raw ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim();
    if (!t || t.length < 3 || seen.has(t) || STOPWORDS.has(t)) return;
    seen.add(t);
    terms.push(t);
  };

  for (const phrase of aliasPhrases(brief)) add(phrase);
  for (const t of intent?.tone ?? []) add(t);
  // A field's LABEL and a part's ROLE are indexed at weight 6 and 4 - "location", "role",
  // "standings" name what the graphic carries, which is what a design is chosen by.
  for (const f of intent?.fields ?? []) add(f.label);
  for (const p of intent?.parts ?? []) add(p.role);
  for (const word of brief.toLowerCase().split(/[^a-z0-9]+/)) {
    if (terms.length >= MAX_TERMS) break;
    if (word.length >= 4) add(word);
  }
  return terms.slice(0, MAX_TERMS);
}

// ── Placement ────────────────────────────────────────────────────────────────
//
// The chassis now keeps the zone it was drawn for (AssembleOptions.keepChassisZone), which is
// only defensible if a brief that ASKS for a side can still get one. It cannot get there
// through the text index: `templateMeta` records a coverage-derived `placements` list, never a
// side, and the index reads name/category/semantics/field titles/capabilities/formats/
// structures/description - so of the twelve right-anchored lower thirds only three ("House
// Right", "Right Rail", "Right Slam") carry the word at all, and "Line Handle" or "Glass Tag"
// are unreachable by any wording of the request.
//
// So placement is matched against the one place it IS declared: `variant.defaultZone`.

const ZONE_WORDS: { test: RegExp; match: (zone: string) => boolean }[] = [
  { test: /\b(right|right-hand|right side|starboard)\b/, match: (z) => z.endsWith('-right') },
  { test: /\b(left|left-hand|left side)\b/, match: (z) => z.endsWith('-left') },
  { test: /\b(cent(er|re)|centred|centered|middle)\b/, match: (z) => z.endsWith('-center') },
  { test: /\b(top|upper|above)\b/, match: (z) => z.startsWith('top-') },
  { test: /\b(bottom|lower|beneath|underneath)\b/, match: (z) => z.startsWith('bottom-') },
];

/** Graphic NAMES that contain a position word without asking for one. "A lower third" says
 *  what the graphic is, not where to put it - and read as a request it matches all 88
 *  bottom-anchored lower thirds, which is every design in the pool. */
const NOT_A_PLACEMENT = /\b(lower|upper)[- ]thirds?\b/g;

/** Does the brief ask for a placement, and does this design answer it? Null = it asked for
 *  nothing, which must not be read as every design being wrong. */
function placementMatch(brief: string): ((zone: string) => boolean) | null {
  const text = ` ${brief.toLowerCase().replace(NOT_A_PLACEMENT, ' ')} `;
  const asked = ZONE_WORDS.filter((w) => w.test.test(text));
  if (!asked.length) return null;
  // EVERY asked-for word must hold: "bottom left" names one place, and a brief that somehow
  // says both left and right matches nothing, so the boost simply never applies - the right
  // degrade for a request nobody can satisfy.
  return (zone: string) => asked.every((w) => w.match(zone));
}

// ── The field bucket ─────────────────────────────────────────────────────────

/** The intent's own field list as a Browse bucket. Only fields that PAINT count - the bucket
 *  is over visible content fields, and a hidden config input is not one. */
function bucketFor(intent: StructuralIntent | null): FieldBucket | null {
  if (!intent) return null;
  if ((intent.parts ?? []).some((p) => p.repeating)) return 'repeating';
  if ((intent.fields ?? []).some((f) => f.role === 'list')) return 'repeating';
  const visible = (intent.fields ?? []).filter((f) => f.role !== 'hidden').length;
  if (!visible) return null;
  if (visible <= 1) return '1';
  if (visible === 2) return '2';
  if (visible === 3) return '3';
  if (visible <= 5) return '4-5';
  return '6+';
}

// ── The shortlist ────────────────────────────────────────────────────────────

export interface ShortlistOptions {
  /** The structure to retrieve within when the intent stage did not run. Explicit ADAPT skips
   *  the intent call on purpose (the one-call economy), so the caller supplies the anchor it
   *  already knows - a category the user pinned in the structured setup, or the category of
   *  the spec a refinement is editing. */
  anchor?: StructuralAnchor | null;
  /**
   * A design the shortlist must offer even if the brief does not reach it: the one already in
   * use.
   *
   * Load-bearing on a REFINEMENT. The shortlist narrows the tool's `variantId` enum, so a
   * design missing from it is a design the model cannot ask for - and "warmer colours" would
   * then be unable to keep the graphic the user is looking at. Swapping someone's design under
   * a colour request is a far worse failure than showing one design too many.
   */
  keep?: string;
  limit?: number;
}

/**
 * The proven designs this brief should be adapted from, best first.
 *
 * Scoring is the Browse engine's, run once per term and summed: a term the index cannot place
 * contributes nothing rather than zeroing the query. The structural filter is the anchor the
 * intent already resolved, so a shortlist can never offer a design that is not the KIND of
 * graphic asked for - the defect `structuralIntentCheck` was built to catch after the fact.
 *
 * Every narrowing degrades rather than empties: an over-tight field bucket is dropped, a
 * query that matched nothing falls back to the anchor's own designs in catalog order, and no
 * anchor at all returns FULL_CATALOG so the caller keeps today's full digest.
 */
export function shortlistFor(
  brief: string,
  intent: StructuralIntent | null,
  options: ShortlistOptions = {},
): Shortlist {
  const { anchor: anchorOverride, keep, limit = SHORTLIST_LIMIT } = options;
  const resolved = intent ? structuralFit(intent) : { fit: false, anchor: undefined };
  const anchor = resolved.anchor ?? anchorOverride ?? null;
  // `variantSatisfiesAnchor` answers TRUE for an anchor that no longer resolves — an
  // unresolvable anchor is not the variant's fault. That is right for the satisfaction check
  // and wrong here: it would let every design in the catalog "satisfy" a dead anchor and hand
  // the model a shortlist that means nothing. Retrieval needs the anchor to be real.
  if (!anchor || !anchorResolves(anchor)) return FULL_CATALOG;

  const satisfies = (v: TemplateVariant) => variantSatisfiesAnchor(v.id, anchor);
  const anchored = allTemplateMeta().map((m) => m.variant).filter(satisfies);
  if (!anchored.length) return FULL_CATALOG;

  const notes: string[] = [];

  // A requested SIDE narrows the pool rather than merely ranking it: with the chassis keeping
  // the zone it was drawn for, a left-anchored strap is not an answer to "anchored on the
  // right", so offering one would spend a shortlist slot on a design the brief ruled out.
  // It only counts once it actually narrows - "bottom" describes 88 of 89 lower thirds, and
  // honouring that would restrict nothing while claiming to.
  const asked = placementMatch(brief);
  const zoneMatched = asked ? anchored.filter((v) => asked(v.defaultZone)) : [];
  const placed = asked && zoneMatched.length > 0 && zoneMatched.length < anchored.length / 2;
  if (placed) notes.push(`placement requested (${zoneMatched.length} designs)`);
  const pool = placed ? zoneMatched : anchored;

  const terms = briefTerms(brief, intent);
  const bucket = bucketFor(intent);

  // The bucket is a STRICT facet in the storefront and a noisy signal here (the intent's field
  // list is a model's reading of a brief), so it narrows only while it leaves something.
  // Everything below scores INSIDE the pool, which a placement request may have narrowed. It
  // has to: the rarity discount divides by the pool size, so counting hits against the wider
  // anchored set makes every term look common and drops them all.
  const inPool = new Set(pool.map((v) => v.id));
  const bucketed = bucket
    ? new Set(
        browseTemplates({ ...NO_BROWSE_FILTERS, fieldBucket: bucket }).best
          .filter((r) => inPool.has(r.variant.id))
          .map((r) => r.variant.id),
      )
    : null;
  const bucketUsable = bucketed !== null && bucketed.size > 0;
  if (bucket && !bucketUsable) notes.push(`field bucket ${bucket} matched nothing and was dropped`);

  // A term that hits everything ranks nothing. "lower", "third", "name" and "news" match every
  // lower third in the catalog, so summing raw scores makes the shortlist collapse to catalog
  // order once the distinctive words run out - measured: 89 of 89 designs "matched the brief
  // text", and the tail of a worship brief was squad numbers and club crests. Each term is
  // therefore weighted by how RARE it is inside the pool (the standard inverse-document-frequency
  // discount): a term matching the whole pool weighs exactly zero, and "scripture" carries the
  // shortlist instead of tying with "third".
  const scores = new Map<string, number>();
  // The designs a term NAMED, as opposed to merely brushed. A term matching most of the pool
  // still carries a positive idf, so it leaves a score on nearly everything; a term matching a
  // handful picks those out. Telling the two apart is the whole question in the top-up below,
  // and the split is the same argument as the `idf <= 0` discard taken one step in: a term that
  // does not name fewer candidates than it leaves out has not narrowed anything.
  const signal = new Set<string>();
  let distinctive = 0;
  for (const term of terms) {
    // `briefTerm`: this is one term of a brief, not a person's search. See BrowseContext -
    // the browse surfaces' "your own name ranks first" bonus is an absolute number, and the
    // score below is multiplied by idf and measured against a relative cut, where an absolute
    // bonus moves the bar rather than the order.
    const hits = browseTemplates({ ...NO_BROWSE_FILTERS, query: term }, { briefTerm: true }).best.filter((r) => inPool.has(r.variant.id));
    if (!hits.length) continue;
    const idf = Math.log(pool.length / hits.length);
    if (idf <= 0) continue;
    distinctive += 1;
    const selective = hits.length * 2 < pool.length;
    for (const r of hits) {
      scores.set(r.variant.id, (scores.get(r.variant.id) ?? 0) + r.score * idf);
      if (selective) signal.add(r.variant.id);
    }
  }

  // A design the field bucket agrees with leads the ones it does not, without excluding them:
  // the bucket answers capacity, and a design one line short of the brief is still a candidate
  // the model may legitimately prefer.
  const BUCKET_BONUS = 12;
  const ranked = pool
    .map((variant, catalogIndex) => ({
      variant,
      score:
        (scores.get(variant.id) ?? 0) +
        (bucketUsable && bucketed.has(variant.id) ? BUCKET_BONUS : 0) +
        (1000 - catalogIndex) / 100000,
    }))
    .sort((a, b) => b.score - a.score);

  // **Do not pad a shortlist with designs the brief did not reach.** Ten slots filled from a
  // pool of 89 put squad numbers and club crests under a worship brief, and a shortlist is a
  // recommendation - a slot spent on an irrelevant design is worse than an empty one. So when
  // anything matched, only matches ship (topped up to a floor, so there is always a choice);
  // when nothing matched there is no signal to respect and catalog order fills the list.
  // A nonzero score is not relevance: a term matching 80 of 89 designs still contributes a
  // sliver to all 80, so "did it match" separates almost nothing. What the scores DO have is a
  // cliff - on a worship brief the two scripture designs score 29 and 11 and the next 60 all
  // score 2.2, the residue of "name" and "lower". The cut is therefore relative to the best
  // match, which is what makes it work the same on a brief with two strong hits and on one
  // with twenty.
  const MIN_SHORTLIST = 4;
  const RELEVANCE_FLOOR = 0.2;
  const top = Math.max(0, ...scores.values());
  const hit = ranked.filter((r) => top > 0 && (scores.get(r.variant.id) ?? 0) >= top * RELEVANCE_FLOOR);
  const matched = hit.length;
  if (!terms.length) notes.push('no searchable terms in the brief');
  if (terms.length && !matched) notes.push('no design matched the brief text; ranked by catalog order');

  // The floor still has to be filled, and WHICH designs fill it is a real choice. Measured over
  // 40 briefs, 14 needed a top-up, and the two obvious rules are both wrong. Filling by "scored
  // anything at all" spends the slots on the 2.2 residue in 13 of the 14 - it puts Squad Number
  // and Player Stats under a worship brief, the exact defect the relevance cut exists to remove.
  // Filling by "scored nothing at all" misses the 14th: on "squad number strap for a stadium
  // match with the club crest", Track Cue (named by "number", 3 designs of 89) and Team Bar
  // (named by "crest", 2 of 89) sit just below the cut and were passed over for House Handle,
  // which no term reached at all.
  //
  // So the floor is filled in three bands, each exhausted before the next: designs a SELECTIVE
  // term named, then designs no term reached, then the residue. Residue ranks BELOW an unreached
  // design on purpose - a generic house strap is unreached because it has no distinctive
  // vocabulary to match, which makes it a neutral base to adapt, while a 2.2 score means only
  // "has a name field and is a lower third". Each band keeps `ranked` order, so the field bucket
  // still leads within it.
  const hitIds = new Set(hit.map((r) => r.variant.id));
  const spare = ranked.filter((r) => !hitIds.has(r.variant.id));
  const named = spare.filter((r) => signal.has(r.variant.id));
  const rest = spare.filter((r) => !signal.has(r.variant.id));
  const chosen = matched
    ? [
        ...hit,
        ...named,
        ...rest.filter((r) => !(scores.get(r.variant.id) ?? 0)),
        ...rest.filter((r) => scores.get(r.variant.id)),
      ].slice(0, Math.min(limit, Math.max(MIN_SHORTLIST, matched)))
    : ranked.slice(0, limit);
  // The design already in use leads, and can never be cut. It is measured against the ANCHOR
  // rather than the pool: a placement request may have narrowed the pool, and a refinement that
  // said nothing about placement must not lose the graphic it is refining to that filter.
  const incumbent = keep ? anchored.find((v) => v.id === keep) : undefined;
  const variants = [
    ...(incumbent ? [incumbent] : []),
    ...chosen.map((r) => r.variant).filter((v) => v.id !== incumbent?.id),
  ].slice(0, Math.max(limit, incumbent ? 1 : 0));
  if (keep && !incumbent) notes.push(`${keep} is not one of this structure's designs`);
  // A shortlist that is part matches and part floor-filling must say so: "4 of 89" reads as four
  // answers, and two of them may be house designs nothing in the brief pointed at.
  const filled = chosen.filter((r) => !hitIds.has(r.variant.id));
  const near = filled.filter((r) => signal.has(r.variant.id)).length;
  const reason = [
    `${variants.length} of ${pool.length} designs carrying ${anchor}`,
    incumbent ? `keeping ${incumbent.id}` : null,
    matched
      ? `${matched} above the relevance cut on ${distinctive} distinguishing term${distinctive === 1 ? '' : 's'}`
      : null,
    matched && filled.length
      ? `${filled.length} topped up (${near} named below the cut, ${filled.length - near} no term named)`
      : null,
    bucketUsable ? `field bucket ${bucket}` : null,
    ...notes,
  ]
    .filter(Boolean)
    .join('; ');

  return { variants, anchor, reason, full: false };
}
