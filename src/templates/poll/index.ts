// The live-vote catalog: the poll as it HAPPENS — voting open, voting closed, the result, the
// call. Family-consistent with the rest of the package (docs/DESIGN_LANGUAGE.md §8).
//
// Not to be confused with the `poll` GRAPHIC TYPE in the infographic category (ig02/ig11/ig12/
// ig13), which is the finished result chart: one look, no arc, no winner. These boards carry the
// vote itself, which is why they have states and it does not.

import type { TemplateVariant } from '../../model/wizard';
import { pl01 } from './pl01';
import { pl02 } from './pl02';
import { pl03 } from './pl03';
import { pl04 } from './pl04';

export const POLLS: TemplateVariant[] = [
  pl01, // House Vote — noacg void panel, amber edge (sibling lt11)
  pl02, // Volt Vote — sport results-night slab (sibling lt06)
  pl03, // Frost Vote — glass frosted card (sibling lt08)
  pl04, // Clean Vote — minimal quiet card (sibling lt01)
];

export function pollById(id: string): TemplateVariant | undefined {
  return POLLS.find((v) => v.id === id);
}
