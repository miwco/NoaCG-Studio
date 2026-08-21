// GROUPING A CUE'S FIELDS BY WHAT THEY BELONG TO - derived from the template, never authored.
//
// The playout cue editor used to flow every field, in field order, into whatever number of
// columns the window afforded. On a wide monitor a scoreboard therefore read as one long
// undifferentiated row: Team A, Score A, Team B, Score B, Period, Clock, two colours. Owner,
// 2026-08-21: "if we have a scoring system then everything that fits one team should be on one
// row or one column and the other team is in the next row. There would be some logic in how we
// build up the dashboard."
//
// THE CONSTRAINT IS THE SAME OWNER'S NEXT SENTENCE: "we have no idea what kinds of graphics we
// will have in the future… I don't know if we can make any hard rules about this." So this
// module may not know about scoreboards, or about any other type. It reads the SAME side tokens
// `cueData.ts` already reads to load a teams table into one half of a board - if that rule is
// good enough to decide which fields a data row fills, it is good enough to decide which fields
// belong beside each other - and when it is not confident it returns ONE unlabelled group, which
// renders exactly as the flat flow always did. A wrong grouping is worse than no grouping: it
// tells an operator two fields are related when they are not.
//
// docs/PLAYOUT_DASHBOARD.md §2d records the candidates this is the first of.

import { hasSideFields } from './cueData';

/** The sides a two-sided board names in its field titles - `cueData.ts` owns the vocabulary. */
const SIDES = ['A', 'B'] as const;

/** One band of the cue editor: a heading and the fields under it, in field order. */
export interface CueFieldGroup {
  /** Stable across renders and unique within the cue - React keys and test ids. */
  id: string;
  /**
   * The side token this band is, when it is one ('A' / 'B'). The band's visible heading is not
   * here: it depends on the cue's VALUES, which are not this module's business (see
   * `groupHeading`). Null on the shared band and on the single ungrouped band.
   */
  side: string | null;
  /** Field keys, in the order the template declares them. */
  keys: string[];
}

/** How many fields a side must claim before a band is worth drawing. */
const MIN_PER_SIDE = 2;

/** Does this title carry exactly one side token? Returns it, or null for none/both. */
function soleSide(label: string): string | null {
  const hits = SIDES.filter((s) => new RegExp(`\\b${s}\\b`).test(label));
  return hits.length === 1 ? hits[0] : null;
}

/**
 * A LETTERED LIST IS NOT A TWO-SIDED BOARD, and the A/B tokens alone cannot tell them apart.
 *
 * A quiz titles its fields "Answer A", "Answer B", "Answer C", "Answer D" - the same shape a
 * scoreboard uses for two teams, with the same first two letters. Grouping it would put Answer A
 * in one band, Answer B in another, and Answers C and D in a third called "Both", which is not a
 * layout so much as a lie about what the fields are.
 *
 * A single capital letter standing as its own word anywhere past B is the tell, and it is one a
 * two-sided board never has: the sides of a match are A and B and stop there. Bailing is the safe
 * direction anyway - the flat flow is what every graphic had until now.
 */
function looksLikeLetteredList(descriptors: { label: string }[]): boolean {
  return descriptors.some((d) => /\b[C-Z]\b/.test(d.label));
}

/** A field title with its side token removed - "Team A colour" -> "Team colour". */
function stripSide(label: string, side: string): string {
  return label.replace(new RegExp(`\\s*\\b${side}\\b`), ' ').replace(/\s{2,}/g, ' ').trim().toLowerCase();
}

/**
 * The bands for one cue's CONTENT fields.
 *
 * Always returns at least one group covering every key exactly once, so a caller can render the
 * result without a second code path for the ungrouped case: a lone group with `side: null` and
 * no heading IS today's flat flow.
 *
 * A side band needs `MIN_PER_SIDE` fields of its own on BOTH sides. One "Team A" among eight
 * unrelated fields is a coincidence, not a structure, and drawing a band around it would state
 * a relationship the template never claimed.
 */
export function groupCueFields(descriptors: { key: string; label: string }[]): CueFieldGroup[] {
  const one: CueFieldGroup[] = [{ id: 'all', side: null, keys: descriptors.map((d) => d.key) }];
  if (descriptors.length === 0) return one;
  if (!hasSideFields(descriptors) || looksLikeLetteredList(descriptors)) return one;

  const bySide = new Map<string, string[]>(SIDES.map((s) => [s, []]));
  const strippedBySide = new Map<string, Set<string>>(SIDES.map((s) => [s, new Set<string>()]));
  const shared: string[] = [];
  for (const d of descriptors) {
    const side = soleSide(d.label);
    if (!side) {
      shared.push(d.key);
      continue;
    }
    bySide.get(side)!.push(d.key);
    strippedBySide.get(side)!.add(stripSide(d.label, side));
  }
  if (SIDES.some((s) => bySide.get(s)!.length < MIN_PER_SIDE)) return one;
  // THE SIDES HAVE TO MIRROR EACH OTHER. Two teams are described by the same words - "Team",
  // "Score", "Team colour" on both halves - so the stripped titles overlap. Fields that merely
  // happen to carry an A and a B ("Camera A", "Sponsor B") do not, and drawing two bands around
  // them would claim a symmetry the template never had.
  const [a, b] = SIDES.map((s) => strippedBySide.get(s)!);
  const mirrored = [...a].filter((label) => b.has(label)).length;
  if (mirrored < MIN_PER_SIDE) return one;

  const groups: CueFieldGroup[] = SIDES.map((s) => ({ id: `side-${s}`, side: s, keys: bySide.get(s)! }));
  if (shared.length > 0) groups.push({ id: 'shared', side: null, keys: shared });
  return groups;
}

/**
 * What a band is CALLED on screen.
 *
 * A side band borrows the operator's own word for that side - the value of its first field,
 * which on every two-sided board we ship is the name ("Team A", "Fighter A", "Party A"). That is
 * the whole reason the heading is computed from values rather than from titles: "ARC" and
 * "YLE12" say which half of the board you are editing in the language of the show, where "SIDE
 * A" and "SIDE B" only say that a split exists.
 *
 * It falls back the moment the borrowed word would not help: an empty value, or one long enough
 * to be a sentence rather than a name (a heading is a glance, and a wrapped one is worse than a
 * generic one). The fallback is never a guess - `Side A` is exactly as much as we know.
 */
export function groupHeading(group: CueFieldGroup, values: Record<string, unknown>): string | null {
  if (!group.side) return group.id === 'shared' ? 'Both' : null;
  const first = group.keys[0];
  const named = first === undefined ? '' : String(values[first] ?? '').trim();
  return named !== '' && named.length <= 20 ? named : `Side ${group.side}`;
}
