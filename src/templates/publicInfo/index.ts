// The public-information catalog: official notices, instructions, attributions and
// disclaimers, family-consistent with the rest of the package (docs/DESIGN_LANGUAGE.md §8).
//
// Two of these — the rotators — carry a real state machine, because their languages take
// turns. The other seven are static panels and say so: a notice that does not change has no
// states to offer, and inventing some would put buttons on a control page that do nothing.

import type { TemplateVariant } from '../../model/wizard';
import { pi01 } from './pi01';
import { pi02 } from './pi02';
import { pi03 } from './pi03';
import { pi04 } from './pi04';
import { pi05 } from './pi05';
import { pi06 } from './pi06';
import { pi07 } from './pi07';
import { pi08 } from './pi08';
import { pi09 } from './pi09';

export const PUBLIC_INFO: TemplateVariant[] = [
  pi01, // Public Notice — the category's reference design
  pi02, // Emergency Instructions — the numbered action list
  pi05, // Municipal Notice — council notices with a reference chip
  pi06, // Health Advisory — advice plus a helpline band
  pi07, // Bilingual Panel — two languages side by side
  pi08, // Language Rotator — the house two-language machine
  pi09, // Notice Rotator — the minimal two-language machine
  pi03, // Source Label — the corner attribution chip
  pi04, // Disclaimer Strip — the full-width small-print band
];

export function publicInfoById(id: string): TemplateVariant | undefined {
  return PUBLIC_INFO.find((v) => v.id === id);
}
