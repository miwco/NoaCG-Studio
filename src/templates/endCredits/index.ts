// The end-credits catalog — the LIST set. Every design here is the same data model (one
// textarea of lines, parsed into sections at runtime) shown at a different speed: rolled,
// paged, crawled, looped, or held perfectly still.
//
// Choosing between them is really choosing a SPEED, and the speed follows the job:
//   roll   — a list read once, at the end of something (cr01, cr02, cr10, cr11)
//   pages  — sections read one at a time (cr03)
//   crawl  — a strip that runs while the show continues (cr04, cr12)
//   loop   — a reel for the long tail after a show, or a wall too long for one screen (cr06, cr08)
//   board  — a list nobody should have to chase: a schedule, a wall of names (cr05, cr07, cr09)
//
// Family-consistent with the rest of the package (docs/DESIGN_LANGUAGE.md §8).

import type { TemplateVariant } from '../../model/wizard';
import { cr01 } from './cr01';
import { cr02 } from './cr02';
import { cr03 } from './cr03';
import { cr04 } from './cr04';
import { cr05 } from './cr05';
import { cr06 } from './cr06';
import { cr07 } from './cr07';
import { cr08 } from './cr08';
import { cr09 } from './cr09';
import { cr10 } from './cr10';
import { cr11 } from './cr11';
import { cr12 } from './cr12';

export const END_CREDITS: TemplateVariant[] = [
  // ── Credits proper ──
  cr01, // Classic Roll — stacked role-above-name (minimal, sibling lt01)
  cr02, // Column Roll — title left / name right (glass, sibling lt10)
  cr03, // Pager — one-pager section swaps (sport, sibling lt05)
  cr04, // Crawl — horizontal single-line credits (minimal, sibling lt02)
  cr06, // Credit Reel — the seamless looping reel (noacg, sibling lt11)
  // ── Walls & acknowledgements ──
  cr07, // Thank You Wall — held board of names in columns (minimal)
  cr08, // Donor Wall — giving levels, looping (glass)
  cr09, // Sponsor Board — held tiers, sized by contract (noacg)
  cr12, // Sponsor Crawl — the bottom-of-frame partner strip (sport)
  // ── Ceremony lists ──
  cr10, // Graduation Roll — name above award (minimal)
  cr11, // Roll of Remembrance — memorial names (glass)
  // ── Schedules ──
  cr05, // Schedule Hold — the running order as a static board (minimal)
];

export function endCreditsById(id: string): TemplateVariant | undefined {
  return END_CREDITS.find((v) => v.id === id);
}
