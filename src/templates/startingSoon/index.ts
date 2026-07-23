// The starting-soon catalog — the HOLDING SCREEN set: everything the audience looks at while
// the show is not happening. Before it starts, between its parts, when it breaks, and after it
// ends. Family-consistent with the rest of the package (docs/DESIGN_LANGUAGE.md §8).
//
// Browse order groups them by moment rather than by style, because that is how an operator
// reaches for them: the front door first, then the middle of the show, then the end.

import type { TemplateVariant } from '../../model/wizard';
import { ss01 } from './ss01';
import { ss02 } from './ss02';
import { ss03 } from './ss03';
import { ss04 } from './ss04';
import { ss05 } from './ss05';
import { ss06 } from './ss06';
import { ss07 } from './ss07';
import { ss08 } from './ss08';
import { ss09 } from './ss09';
import { ss10 } from './ss10';
import { ss11 } from './ss11';
import { ss12 } from './ss12';
import { ss13 } from './ss13';

export const STARTING_SOON: TemplateVariant[] = [
  // ── Before the show ──
  ss04, // noacg holding screen — House Hold (sibling lt11 / card05)
  ss01, // minimal holding screen
  ss02, // sport holding screen
  ss03, // glass holding screen
  ss05, // minimal — counts to a wall-clock start time
  ss10, // minimal — the quiet ceremony hold
  ss11, // sport — the venue / doors-open hold
  // ── During the show ──
  ss06, // noacg — the BRB break card
  ss12, // glass — the compact returning-soon capsule over the picture
  ss07, // glass — the scheduled intermission
  ss13, // noacg — the between-items schedule hold
  ss08, // minimal — the technical pause, deliberately clockless
  // ── After the show ──
  ss09, // noacg — the sign-off / offline card
];

export function startingSoonById(id: string): TemplateVariant | undefined {
  return STARTING_SOON.find((v) => v.id === id);
}
