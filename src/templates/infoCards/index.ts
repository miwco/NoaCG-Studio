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
import { card38 } from './card38';
import { card39 } from './card39';
import { card40 } from './card40';
import { card41 } from './card41';
import { card42 } from './card42';
import { card43 } from './card43';
import { card44 } from './card44';
import { card45 } from './card45';
import { card46 } from './card46';
import { card47 } from './card47';
import { card48 } from './card48';
import { card49 } from './card49';

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
  card38, // House Product — noacg live-shopping card, shot + price row (sibling lt11 / card06)
  card39, // Frost Product — glass live-shopping card, stacked shot + price row (sibling card03)
  card40, // Volt Offer — sport flash-offer slab, claim + promo code (sibling lt05 / card02)
  card41, // Clean Offer — minimal panel-free offer card (sibling lt01 / card07)
  card42, // Clean Listing — minimal property/lot/resource card (sibling lt03 / ig05)
  card43, // House Lot — noacg auction/listing card, live value block (sibling lt11 / card38)
  card44, // House Scan — noacg QR card, quiet-zone tile + address (sibling lt11 / card38)
  card45, // Clean Scan — minimal stacked QR card (sibling lt01 / card07)
  card46, // Frost Location — glass travel/location card, drawn pin (sibling card03 / card39)
  card47, // Volt Location — sport venue marker, drawn pin (sibling lt05 / card02)
  card48, // House Sponsors — noacg sponsor strip, four partner slots (sibling lt11 / bug02)
  card49, // Clean Partners — minimal partners board, 3 × 2 slot grid (sibling lt01 / card42)
];

export function infoCardById(id: string): TemplateVariant | undefined {
  return INFO_CARDS.find((v) => v.id === id);
}
