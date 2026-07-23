// The info-card catalog: designs per style family, each the visual sibling of a
// lower third (docs/DESIGN_LANGUAGE.md §8). Built on shared.ts + the shared presets.
//
// The set now covers two jobs. The first nine are INFORMATION cards — a heading with lines
// under it. The rest are SET-PIECE cards, where the layout itself carries a convention that
// existed long before television did: a reading, a lyric, a quotation, a translation, an
// order of service, and the ceremony cards. Those are grouped last.

import type { TemplateVariant } from '../../model/wizard';
import { card01 } from './card01';
import { card02 } from './card02';
import { card03 } from './card03';
import { card04 } from './card04';
import { card05 } from './card05';
import { card06 } from './card06';
import { card07 } from './card07';
import { card08 } from './card08';
import { card09 } from './card09';
import { card10 } from './card10';
import { card11 } from './card11';
import { card12 } from './card12';
import { card13 } from './card13';
import { card14 } from './card14';
import { card15 } from './card15';
import { card16 } from './card16';
import { card17 } from './card17';
import { card18 } from './card18';

export const INFO_CARDS: TemplateVariant[] = [
  // ── Information cards ──
  card05, // House Title — noacg mono kicker + huge display title (sibling lt11)
  card01, // Hairline Card — minimal, sibling of lt01 Hairline
  card02, // Slab Card — sport, sibling of lt05 Angle Slab
  card03, // Frosted Panel — glass, sibling of lt08 Frosted Card
  card04, // bench-winner card variant
  card06, // House Topic — noacg topic card, amber bar + void panel (sibling lt11)
  card07, // Clean Title — minimal title card (sibling lt01 / lt02)
  card08, // Slab Title — sport title card, leaning slab (sibling lt05 / card02)
  card09, // Frost Title — glass title card, frosted panel (sibling lt08 / card03)
  // ── Words on screen: readings, lyrics, quotes, translations ──
  card10, // Scripture — a verse set for reading aloud (minimal)
  card11, // Lyric Line — now and next, the singalong format (glass)
  card12, // Quotation — a pull quote with a subordinate attribution (minimal)
  card13, // Translation — spoken above, translation below and brighter (glass)
  card17, // Order of Service — the order number beside the item (minimal)
  // ── Ceremony ──
  card16, // Award Card — category held, winner on Continue (noacg)
  card18, // Graduate — one name at a time for the walk (noacg)
  card14, // Wedding Card — the couple, the date, the place (minimal)
  card15, // In Memoriam — one name, the years, one line (minimal)
];

export function infoCardById(id: string): TemplateVariant | undefined {
  return INFO_CARDS.find((v) => v.id === id);
}
