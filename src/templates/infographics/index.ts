// The infographic catalog: two data callouts, family-consistent with the rest of the
// package (docs/DESIGN_LANGUAGE.md §8) — a big stat count-up and a growing bar chart.

import type { TemplateVariant } from '../../model/wizard';
import { ig01 } from './ig01';
import { ig02 } from './ig02';
import { ig03 } from './ig03';
import { ig04 } from './ig04';
import { ig05 } from './ig05';
import { ig06 } from './ig06';
import { ig07 } from './ig07';
import { ig08 } from './ig08';
import { ig09 } from './ig09';
import { ig10 } from './ig10';
import { ig11 } from './ig11';
import { ig12 } from './ig12';
import { ig13 } from './ig13';
import { ig26 } from './ig26';
import { ig27 } from './ig27';
import { ig28 } from './ig28';
import { ig29 } from './ig29';
import { ig30 } from './ig30';
import { ig31 } from './ig31';
import { ig32 } from './ig32';
import { ig33 } from './ig33';
import { ig34 } from './ig34';
import { ig35 } from './ig35';
import { ig36 } from './ig36';
import { ig37 } from './ig37';
import { ig38 } from './ig38';
import { ig39 } from './ig39';
import { ig40 } from './ig40';
import { ig41 } from './ig41';

export const INFOGRAPHICS: TemplateVariant[] = [
  ig01, // Big stat count-up
  ig02, // Bar chart grow
  ig03, // bench-winner infographic variant
  ig04, // bench-winner infographic variant
  ig05, // bench-winner infographic variant
  ig06, // bench-winner infographic variant
  ig07, // bench-winner election results bars
  ig08, // House Schedule — noacg agenda board (sibling lt11 / ig06)
  ig09, // Frost Schedule — glass agenda board (sibling lt08 / ig02)
  ig10, // Volt Schedule — sport agenda board (sibling lt06 / card02)
  ig11, // House Poll — noacg bar chart (sibling lt11 / ig08)
  ig12, // Volt Poll — sport bar chart (sibling lt06 / card02)
  ig13, // Clean Poll — minimal bar chart (sibling lt01 / ig06)
  // ── The sports pack: the team sheet in all four families ──
  ig26, // House Lineup — noacg void panel, amber numbers (sibling ig08)
  ig27, // Volt Lineup — sport slab, accent number blocks (sibling ig10)
  ig28, // Frost Lineup — glass column, number pills (sibling ig09)
  ig29, // Club Lineup — minimal flat panel, the local/amateur sheet (sibling ig06)
  // ── The sports pack: standings, with the columns as data ──
  ig30, // House Table — noacg void panel, amber ranks (sibling ig26)
  ig31, // Volt Table — sport slab, accent heading bar (sibling ig27)
  ig32, // Frost Table — glass card, tinted rank pills (sibling ig28)
  ig33, // Club Table — minimal flat panel, narrow columns (sibling ig29)
  // ── The sports pack: the stat comparison (team and player stats) ──
  ig34, // House Head to Head — noacg void panel, centre-out bars (sibling ig11)
  ig35, // Volt Head to Head — sport slab, heavy bars (sibling ig12)
  ig36, // Frost Head to Head — glass card, rounded bars (sibling ig02)
  ig37, // Club Head to Head — minimal flat panel, big figures (sibling ig13)
  // ── The sports pack: fixtures and results, on one board ──
  ig38, // House Fixtures — noacg void panel, amber score chips (sibling ig30)
  ig39, // Volt Fixtures — sport slab, filled score blocks (sibling ig31)
  ig40, // Frost Fixtures — glass card, tinted score pills (sibling ig32)
  ig41, // Club Fixtures — minimal flat panel, the local results board (sibling ig33)
];

export function infographicById(id: string): TemplateVariant | undefined {
  return INFOGRAPHICS.find((v) => v.id === id);
}
