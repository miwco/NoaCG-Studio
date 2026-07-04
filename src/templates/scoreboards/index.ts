// The scoreboard catalog: two-team score straps, family-consistent with the rest of the
// package (docs/DESIGN_LANGUAGE.md §8) — each variant names its lower-third sibling.

import type { TemplateVariant } from '../../model/wizard';
import { sb01 } from './sb01';
import { sb02 } from './sb02';

export const SCOREBOARDS: TemplateVariant[] = [
  sb01,
  sb02,
];

export function scoreboardById(id: string): TemplateVariant | undefined {
  return SCOREBOARDS.find((v) => v.id === id);
}
