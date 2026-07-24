// The ticker catalog: strips family-consistent with the rest of the package
// (docs/DESIGN_LANGUAGE.md §8) — the first endless-loop graphics.

import type { TemplateVariant } from '../../model/wizard';
import { tk01 } from './tk01';
import { tk02 } from './tk02';
import { tk03 } from './tk03';
import { tk04 } from './tk04';
import { tk05 } from './tk05';
import { tk06 } from './tk06';
import { tk07 } from './tk07';
import { tk08 } from './tk08';
import { tk09 } from './tk09';
import { tk10 } from './tk10';
import { tk11 } from './tk11';
import { tk12 } from './tk12';
import { tk13 } from './tk13';
import { tk14 } from './tk14';
import { tk15 } from './tk15';
import { tk16 } from './tk16';
import { tk17 } from './tk17';
import { tk18 } from './tk18';
import { tk19 } from './tk19';
import { tk20 } from './tk20';

export const TICKERS: TemplateVariant[] = [
  tk05, // House Wire — noacg news wire with a live clock cap (sibling lt11)
  tk07, // House Rotator — the same strip, one story at a time on the graphic's own timer
  tk06, // House Markets — noacg mono market items, sign-colored deltas (sibling tk05)
  tk20, // Split Deck — noacg double-decker: fixed top story over a crawling wire
  tk01, // News Strip — minimal marquee (sibling lt01/lt02)
  tk11, // Headline Crawl — minimal crawl framed by a section label and a source cap
  tk12, // Upper Crawl — the slim TOP-of-frame strip (accent edge underneath)
  tk16, // Breaking Crawl — developing-story crawl with a slow live dot
  tk15, // Public Notice Crawl — the opaque, oversized emergency strip
  tk17, // Bilingual Crawl — both languages per item, equally weighted
  tk14, // Market Board — minimal index crawl: arrow + sign + colour deltas
  tk13, // Results Rail — sport results crawl with the score boxed out
  tk02, // Volt Rail — sport marquee (sibling lt05/lt06)
  tk03, // Glass Flip — glass item flip (sibling lt08/lt09)
  tk04, // bench-winner ticker variant
  tk19, // Advisory Rotator — noacg public-information rotator (ticker type, noacg)
  tk18, // Status Rotator — minimal service-status rotator (ticker type, minimal)
  tk08, // Frost Rotator — glass rotator (ticker type, glass)
  tk09, // Volt Rotator — sport rotator (ticker type, sport)
  tk10, // Wire Rotator — minimal rotator (ticker type, minimal)
];

export function tickerById(id: string): TemplateVariant | undefined {
  return TICKERS.find((v) => v.id === id);
}
