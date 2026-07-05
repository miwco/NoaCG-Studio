// The infographic catalog: two data callouts, family-consistent with the rest of the
// package (docs/DESIGN_LANGUAGE.md §8) — a big stat count-up and a growing bar chart.

import type { TemplateVariant } from '../../model/wizard';
import { ig01 } from './ig01';
import { ig02 } from './ig02';
import { ig03 } from './ig03';
import { ig04 } from './ig04';
import { ig05 } from './ig05';
import { ig06 } from './ig06';

export const INFOGRAPHICS: TemplateVariant[] = [
  ig01, // Big stat count-up
  ig02, // Bar chart grow
  ig03, // bench-winner infographic variant
  ig04, // bench-winner infographic variant
  ig05, // bench-winner infographic variant
  ig06, // bench-winner infographic variant
];

export function infographicById(id: string): TemplateVariant | undefined {
  return INFOGRAPHICS.find((v) => v.id === id);
}
