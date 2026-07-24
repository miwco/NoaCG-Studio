// The scoreboard catalog: two-team score straps, family-consistent with the rest of the
// package (docs/DESIGN_LANGUAGE.md §8) — each variant names its lower-third sibling.

import type { TemplateVariant } from '../../model/wizard';
import { sb01 } from './sb01';
import { sb02 } from './sb02';
import { sb03 } from './sb03';
import { sb04 } from './sb04';
import { sb05 } from './sb05';
import { sb06 } from './sb06';
import { sb07 } from './sb07';
import { sb08 } from './sb08';
import { sb09 } from './sb09';
import { sb10 } from './sb10';
import { sb11 } from './sb11';
import { sb12 } from './sb12';
import { sb13 } from './sb13';
import { sb14 } from './sb14';
import { sb15 } from './sb15';
import { sb16 } from './sb16';
import { sb17 } from './sb17';
import { sb18 } from './sb18';
import { sb19 } from './sb19';
import { sb20 } from './sb20';

export const SCOREBOARDS: TemplateVariant[] = [
  sb01, // Match Strip — sport leaning slab (sibling lt05/lt06)
  sb02, // Quiet Score — minimal corner stack (sibling lt01)
  sb03, // House Score — noacg void strip, amber accent edge (sibling lt11)
  sb04, // Frost Score — glass frosted strip, soft accent bar (sibling lt08)
  // ── The sports pack: the compact scorebug in all four families ──
  sb05, // House Scorebug — noacg void strip, colour chips, clock tile (sibling sb03)
  sb06, // Volt Scorebug — sport slab, colour bars, countdown tile (sibling sb01)
  sb07, // Frost Scorebug — glass pill, colour dots, hairline clock end (sibling sb04)
  sb08, // Club Scorebug — minimal panel-free stack, the local/amateur board (sibling sb02)
  // ── The sports pack: the full match board in all four families ──
  sb09, // House Match Board — noacg void panel, crests, period breakdown (sibling sb05)
  sb10, // Volt Match Board — sport slab, colour bands, period cells (sibling sb06)
  sb11, // Frost Match Board — glass card, stacked competitors, set columns (sibling sb07)
  sb12, // Club Match Board — minimal flat panel, the local/amateur board (sibling sb08)
  // ── The sports pack: match status and the final score, in all four families ──
  sb13, // House Status Card — noacg void panel, live pip (sibling sb09)
  sb14, // Volt Status Card — sport accent banner result slate (sibling sb10)
  sb15, // Frost Status Card — glass centred card, status pill (sibling sb11)
  sb16, // Club Status Card — minimal flat card, the local/amateur result (sibling sb12)
  // ── The sports pack: the match event card (subs, cards, penalties, goals) ──
  sb17, // House Event Card — noacg void panel, marked fact rows (sibling sb05)
  sb18, // Volt Event Card — sport strap, colour minute block (sibling sb06)
  sb19, // Frost Event Card — glass card, soft minute chip (sibling sb07)
  sb20, // Club Event Card — minimal flat card, the local/amateur event (sibling sb08)
];

export function scoreboardById(id: string): TemplateVariant | undefined {
  return SCOREBOARDS.find((v) => v.id === id);
}
