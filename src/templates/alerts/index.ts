// The alert catalog: urgent notices, family-consistent with the rest of the package
// (docs/DESIGN_LANGUAGE.md §8).
//
// The list splits in two, and the split is the category's honesty rule. The first six carry
// the SEVERITY FLAG and are compiled by the `alert-level` graphic type, so their four
// severity states are real machine states with real control-page buttons. The last four carry
// no flag and claim no states: a technical fault, a service note, a breaking strap and a
// standby card each have exactly one level, and a graphic that offered a severity ladder for
// them would be advertising a control that means nothing.

import type { TemplateVariant } from '../../model/wizard';
import { al01 } from './al01';
import { al02 } from './al02';
import { al03 } from './al03';
import { al04 } from './al04';
import { al05 } from './al05';
import { al06 } from './al06';
import { al07 } from './al07';
import { al08 } from './al08';
import { al09 } from './al09';
import { al10 } from './al10';

export const ALERTS: TemplateVariant[] = [
  // With a genuine severity machine (the `alert-level` type).
  al01, // Signal Alert — the minimal band (sibling lt01/lt02, tk01)
  al02, // House Alert — the noacg void bar (sibling lt11, tk05)
  al03, // Frost Alert — the glass panel for a busy picture (sibling lt08/lt09)
  al04, // Volt Alert — the sport rail (sibling lt05/lt06, tk02)
  al05, // Weather Warning — the met-office cap card
  al06, // Civil Emergency — the interrupt card
  // Single-state notices — no flag, no severity claim.
  al09, // Breaking Banner — the newsroom strap
  al07, // Technical Notice — the apology strip
  al08, // Service Status — the operations panel with a live stamp
  al10, // Standby Notice — the house holding card
];

export function alertById(id: string): TemplateVariant | undefined {
  return ALERTS.find((v) => v.id === id);
}
