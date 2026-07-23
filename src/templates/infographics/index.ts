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
import { ig14 } from './ig14';
import { ig15 } from './ig15';
import { ig16 } from './ig16';
import { ig17 } from './ig17';
import { ig18 } from './ig18';
import { ig19 } from './ig19';
import { ig20 } from './ig20';
import { ig21 } from './ig21';
import { ig22 } from './ig22';
import { ig23 } from './ig23';
import { ig24 } from './ig24';
import { ig25 } from './ig25';
import { ig26 } from './ig26';
import { ig27 } from './ig27';
import { ig28 } from './ig28';
import { ig29 } from './ig29';

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
  ig14, // House Lineup — noacg void panel, amber numbers (sibling ig08)
  ig15, // Volt Lineup — sport slab, accent number blocks (sibling ig10)
  ig16, // Frost Lineup — glass column, number pills (sibling ig09)
  ig17, // Club Lineup — minimal flat panel, the local/amateur sheet (sibling ig06)
  // ── The sports pack: standings, with the columns as data ──
  ig18, // House Table — noacg void panel, amber ranks (sibling ig14)
  ig19, // Volt Table — sport slab, accent heading bar (sibling ig15)
  ig20, // Frost Table — glass card, tinted rank pills (sibling ig16)
  ig21, // Club Table — minimal flat panel, narrow columns (sibling ig17)
  // ── The sports pack: the stat comparison (team and player stats) ──
  ig22, // House Head to Head — noacg void panel, centre-out bars (sibling ig11)
  ig23, // Volt Head to Head — sport slab, heavy bars (sibling ig12)
  ig24, // Frost Head to Head — glass card, rounded bars (sibling ig02)
  ig25, // Club Head to Head — minimal flat panel, big figures (sibling ig13)
  // ── The sports pack: fixtures and results, on one board ──
  ig26, // House Fixtures — noacg void panel, amber score chips (sibling ig18)
  ig27, // Volt Fixtures — sport slab, filled score blocks (sibling ig19)
  ig28, // Frost Fixtures — glass card, tinted score pills (sibling ig20)
  ig29, // Club Fixtures — minimal flat panel, the local results board (sibling ig21)
];

export function infographicById(id: string): TemplateVariant | undefined {
  return INFOGRAPHICS.find((v) => v.id === id);
}
