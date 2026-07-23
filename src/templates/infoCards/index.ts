// The info-card catalog: designs per style family, each the visual sibling of a
// lower third (docs/DESIGN_LANGUAGE.md §8). Built on shared.ts + the shared presets.

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
import { card19 } from './card19';
import { card20 } from './card20';
import { card21 } from './card21';

export const INFO_CARDS: TemplateVariant[] = [
  card05, // House Title — noacg mono kicker + huge display title (sibling lt11)
  card01, // Hairline Card — minimal, sibling of lt01 Hairline
  card02, // Slab Card — sport, sibling of lt05 Angle Slab
  card03, // Frosted Panel — glass, sibling of lt08 Frosted Card
  card04, // bench-winner card variant
  card06, // House Topic — noacg topic card, amber bar + void panel (sibling lt11)
  card07, // Clean Title — minimal title card (sibling lt01 / lt02)
  card08, // Slab Title — sport title card, leaning slab (sibling lt05 / card02)
  card09, // Frost Title — glass title card, frosted panel (sibling lt08 / card03)
  card10, // House Product — noacg live-shopping card, shot + price row (sibling lt11 / card06)
  card11, // Frost Product — glass live-shopping card, stacked shot + price row (sibling card03)
  card12, // Volt Offer — sport flash-offer slab, claim + promo code (sibling lt05 / card02)
  card13, // Clean Offer — minimal panel-free offer card (sibling lt01 / card07)
  card14, // Clean Listing — minimal property/lot/resource card (sibling lt03 / ig05)
  card15, // House Lot — noacg auction/listing card, live value block (sibling lt11 / card10)
  card16, // House Scan — noacg QR card, quiet-zone tile + address (sibling lt11 / card10)
  card17, // Clean Scan — minimal stacked QR card (sibling lt01 / card07)
  card18, // Frost Location — glass travel/location card, drawn pin (sibling card03 / card11)
  card19, // Volt Location — sport venue marker, drawn pin (sibling lt05 / card02)
  card20, // House Sponsors — noacg sponsor strip, four partner slots (sibling lt11 / bug02)
  card21, // Clean Partners — minimal partners board, 3 × 2 slot grid (sibling lt01 / card14)
];

export function infoCardById(id: string): TemplateVariant | undefined {
  return INFO_CARDS.find((v) => v.id === id);
}
