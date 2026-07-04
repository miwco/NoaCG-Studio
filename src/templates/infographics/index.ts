// The infographic catalog: two data callouts, family-consistent with the rest of the
// package (docs/DESIGN_LANGUAGE.md §8) — a big stat count-up and a growing bar chart.

import type { TemplateVariant } from '../../model/wizard';
import { ig01 } from './ig01';
import { ig02 } from './ig02';

export const INFOGRAPHICS: TemplateVariant[] = [
  ig01, // Big stat count-up
  ig02, // Bar chart grow
];

export function infographicById(id: string): TemplateVariant | undefined {
  return INFOGRAPHICS.find((v) => v.id === id);
}
