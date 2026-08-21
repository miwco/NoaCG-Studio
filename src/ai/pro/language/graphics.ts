// THE PACKAGE - which graphics one design language renders, and what each of them is measured
// against (docs/NOACG_PRO_PLAN.md §15.9).
//
// Phase A's claim, stated in `src/ai/AGENTS.md` and in Pro's own promise, is that a model decides
// a design LANGUAGE and the platform renders it across every graphic type a show needs. Until
// Phase B that claim had been tested on ONE type, which is a lower-third generator with a plan
// attached. This file is the list the claim is actually about.
//
// THE TWO NEW TYPES WERE PICKED FROM THE REGISTRY, NOT FROM TASTE. `src/templates/types/` records
// how many of the 60 reference formats ask for each graphic, and the order is not a matter of
// opinion: lower third 52, sponsor bug 37, countdown 30, topic card 29, title card 23. So the two
// types a show cannot go on air without, after the strap, are the SPONSOR BUG and the COUNTDOWN -
// and they happen to be the two that stress the claim hardest, which is the argument for trusting
// the frequency figure rather than second-guessing it:
//
//   * they span the package's whole footprint range - a corner mark a fifth of the frame wide, a
//     strap along the bottom, a clock panel with an 80px display element;
//   * one is mark-led with a single line, one is text-led with two, one has a primary element no
//     operator types;
//   * and all three are on screen in the same programme, often within a minute of each other,
//     which is what makes "do these belong to each other" a question a person can actually answer.
//
// THE TOPIC CARD (29 of 60, the next figure down the same column) joined the list on 2026-08-19,
// under the two-step rule `PRO_PACKAGE_IDS` (structure.ts) documents: it composes and calibrates
// here, and enters the default package only after the owner's blind read of its set rows. The
// bench reads PRO_GRAPHIC_LIST (everything); the product reads PRO_PACKAGE_LIST.
//
// ── THE INSTRUMENT THRESHOLDS ARE PER TYPE, AND THEY ARE MEASURED ─────────────────────────────
//
// Every calibrated number in `spike/spacingCheck.ts` and `spike/proportionCheck.ts` was taken on
// the lower-third catalog, and both instruments accept an override for every one of them - which
// is what makes a per-type calibration a set of ARGUMENTS rather than an edit to a shared gate.
// `node scripts/pro-type-calibrate.mjs` is the sweep that produced the numbers below: it renders
// the catalog's own shipped designs for each type and reports what the lower third's thresholds
// say about them. Where a shipped design fails a lower-third threshold, the threshold is what is
// wrong for that type, not the design.

import type { SpxTemplate } from '../../../model/types';
import type { LineSpec } from '../../../model/wizard';
import type { DesignLanguage } from './contract';
import { composeFromLanguage, type ComposeOptions, type ComposedGraphic } from './compose';
import { composeBugFromLanguage } from './composeBug';
import { composeCardFromLanguage } from './composeCard';
import { composeTimerFromLanguage } from './composeTimer';
import { GRAPHIC_METRICS, PRO_GRAPHIC_IDS, PRO_PACKAGE_IDS, type ProGraphicId } from './structure';

export type { ProGraphicId };
export { PRO_GRAPHIC_IDS, PRO_PACKAGE_IDS };

/**
 * The instrument thresholds this graphic type is judged against.
 *
 * Structurally a subset of `SpacingOptions` / `ProportionOptions`, re-declared rather than
 * imported: `pro/` may not import the bench-only `spike/` (the layering rule stated in
 * prompt.ts), and the runner is the composition root that holds both halves. An absent key means
 * "the lower third's calibrated value is right for this type too", which is the honest default -
 * a threshold copied and renamed is a second number that can drift from the one it came from.
 */
export interface GraphicInstruments {
  spacing?: {
    paddingFloorRatio?: number;
    paddingSkewFactor?: number;
    lineGapCeilingRatio?: number;
    ruleGapFloorRatio?: number;
    markGapFloorRatio?: number;
    markGapCeilingRatio?: number;
  };
  proportion?: {
    typeRatioFlat?: number;
    typeRatioThin?: number;
    markScaleCeiling?: number;
    panelFillFloor?: number;
    footprintCeiling?: number;
  };
}

export interface ProGraphicSpec {
  id: ProGraphicId;
  /** The graphic-type registry id this composes through. */
  typeId: string;
  /** What a human reading a gallery calls it. */
  label: string;
  /** The class prefix its category emits, for the instruments and the mark field. */
  prefix: string;
  /** How many of the 60 reference formats ask for this graphic - the registry's own figure, and
   *  the reason this type is in the package at all. */
  frequency: number;
  /** Whether a brand mark has anywhere to go. Every type in the package takes one since
   *  2026-08-21 - a mark is forbidden only by a genuine type constraint, never by an authoring
   *  default (the owner's ruling, docs/NOACG_PRO_PLAN.md §25.9). The field stays because a
   *  future type may have a real reason, and because the package rule needs somewhere to read
   *  the answer from. */
  takesMark: boolean;
  instruments: GraphicInstruments;
  compose(language: DesignLanguage, options: ComposeOptions): ComposedGraphic;
}

export const PRO_GRAPHICS: Record<ProGraphicId, ProGraphicSpec> = {
  'lower-third': {
    id: 'lower-third',
    typeId: 'lower-third',
    label: 'Lower third',
    prefix: 'lower-third',
    frequency: 52,
    takesMark: true,
    // The type every threshold in both instruments was calibrated on - so it overrides nothing,
    // and any override appearing here later would mean the calibration itself had moved.
    instruments: {},
    compose: composeFromLanguage,
  },
  'sponsor-bug': {
    id: 'sponsor-bug',
    typeId: 'sponsor-bug',
    label: 'Sponsor bug',
    prefix: 'corner-bug',
    frequency: 37,
    takesMark: true,
    instruments: {
      // THE MARK-GAP OVERRIDE IS GONE, AND WHAT REMOVED IT WAS THE UNIT CHANGING UNDER IT.
      //
      // A `markGapFloorRatio: 0.1` stood here, derived when the instrument divided the gap by the
      // MARK's own height: half the shipped bugs failed a 0.25 floor that way, because a design
      // giving its mark room was divided by its own generosity. `spacingCheck` now reports the
      // gap in PRIMARY TYPE SIZES (floor 0.35), which fixes that class at the source - and
      // re-measured on the new unit the shipped bugs read well clear of it, so the override was
      // both unnecessary and stating a reason that had stopped being true.
      //
      // Kept as a note rather than deleted silently: a threshold whose justification outlives its
      // unit is the failure mode this whole per-type calibration exists to avoid, and this file
      // has now hit it once.
      proportion: {
        // A BUG'S MARK IS THE GRAPHIC, and 3.2 primary type sizes is a strap's answer to "is the
        // logo taking over". MEASURED over the four shipped bugs the mark runs 1.67x to 5.25x the
        // caption, and the two the strap's ceiling flags (bug01 5.25, bug04 4.81) are both a
        // small caption under a mark rather than a mark beside a headline. Phase A's own bugs
        // come in at 2.1x-2.7x, so this ceiling bounds the catalog and never binds the composer.
        markScaleCeiling: 5.5,
        // NOTHING ELSE IS OVERRIDDEN, and the sweep is why. A panel-fill floor for the tile was
        // written here on the reasoning that a bug is mostly mark and mostly air; measured, the
        // shipped bug fills 0.56 of its tile and Phase A's fill 0.70-0.78, so the strap's 0.18
        // floor was never near firing. An override nothing needs is a second number that can
        // drift from the one it was copied from.
      },
    },
    compose: composeBugFromLanguage,
  },
  countdown: {
    id: 'countdown',
    typeId: 'countdown',
    label: 'Countdown',
    prefix: 'game-timer',
    frequency: 30,
    takesMark: true,
    instruments: {
      spacing: {
        // MEASURED TWICE, and the second reading is the owner's. The 0.24 floor that stood here
        // was read off the four gameTimers alone (gt05's 0.26 top padding); the 2026-08-19 blind
        // read then AIRED both frames it stopped - cd-launch and cd-results, padding 0.11-0.23 -
        // two false stops, zero true ones (docs/NOACG_PRO_PLAN.md §23.1). The full shipped
        // countdown family (game-timer + starting-soon, scripts/spike-countdown-calibrate.mjs,
        // 25 designs) reads 0.2-1.06 where a panel resolves at all, so the catalog alone cannot
        // justify a floor under 0.2 - the owner's aired frames are what set it: under the
        // tightest AIRED reading (0.11), above the bleed cut (0.06), so a panel genuinely
        // crammed against its content still fails while everything the owner has accepted
        // passes. Mutation-controlled in pro-iterate-spike --control on both sides.
        paddingFloorRatio: 0.1,
        // The strap's 1.4 "stopped reading as one block" ceiling does not describe this family:
        // measured over the same 25 shipped designs, 12 space their lines 1.5-3.3 type sizes
        // apart - a holding screen parks a clock a long way under its title on purpose, and
        // both aired dirty stops (1.55-1.92) sat squarely in that shipped range. Ceiling read
        // off the catalog with the mark-gap rule's ~1.3x headroom over the widest shipped
        // reading (ss10 at 3.3), so a genuinely orphaned line still fails.
        lineGapCeilingRatio: 4.3,
      },
      proportion: {
        // The catalog's own timers step their label further down from the clock than a strap ever
        // steps its role line: MEASURED, gt01 0.20, gt02 0.25, gt05 0.25, gt06 0.34 - three of
        // the four under the strap's 0.28 "thin" floor. That is the type rather than a defect: a
        // clock is read from across a room and its label is a caption on it. Phase A's own step
        // never goes below 0.36 and measures 0.38-0.63 here, so the floor is lowered to cover the
        // CATALOG rather than to excuse the composer.
        typeRatioThin: 0.18,
      },
      // TWO SHIPPED READINGS ARE LEFT FLAGGED ON PURPOSE, because one design is not a
      // calibration: gt01's clock sits 0.11 type sizes from its accent (inside the 0.02-0.12
      // crowding band - an almost-touch really does read as a mistake, and Phase A's rule gap is
      // 0.45), and gt06's label-to-clock gap is 1.5 against a 1.4 ceiling. Moving a threshold to
      // silence a single design is how an instrument stops measuring anything.
    },
    compose: composeTimerFromLanguage,
  },
  'topic-card': {
    id: 'topic-card',
    typeId: 'topic-card',
    label: 'Topic card',
    prefix: 'info-card',
    frequency: 29,
    takesMark: true,
    // NOT in the default package until the owner's blind read of its set rows clears it - it is
    // absent from `PRO_PACKAGE_IDS` (structure.ts, where the two-step rule is stated). Until
    // then it is bench-reachable only: the control run, `pro-type-calibrate`, the paid round
    // and the set gallery all see it.
    //
    // NOTHING OVERRIDDEN YET, deliberately: the info-card category compiles through the same
    // `assembleStandard` contract the strap's calibration was taken on, so the honest starting
    // claim is "the lower third's thresholds transfer" - and `pro-type-calibrate` is what says
    // whether the shipped cards (card01-card06 and the pack4 topics) agree. An override written
    // before that sweep would be taste wearing a threshold's name.
    instruments: {},
    compose: composeCardFromLanguage,
  },
};

/** Every graphic Pro can compose, in the registry's frequency order - the BENCH's list. */
export const PRO_GRAPHIC_LIST: ProGraphicSpec[] = PRO_GRAPHIC_IDS.map((id) => PRO_GRAPHICS[id]);

/** The PACKAGE a Pro user gets: only the types whose set rows an owner read has cleared.
 *  The wizard's checkbox list reads THIS list; the bench reads the full one above. The id set
 *  itself lives in structure.ts (`PRO_PACKAGE_IDS`, with the two-step rule) because the
 *  settings normalizer needs it without these canvas-bearing compose imports. */
export const PRO_PACKAGE_LIST: ProGraphicSpec[] =
  PRO_GRAPHIC_LIST.filter((spec) => PRO_PACKAGE_IDS.includes(spec.id));

/**
 * Render one graphic of the package. The single seam a caller composing a whole SET goes through,
 * so "one language, N graphics" is one loop rather than three call sites that can drift.
 */
export function composeGraphic(
  id: ProGraphicId,
  language: DesignLanguage,
  options: ComposeOptions,
): ComposedGraphic {
  return PRO_GRAPHICS[id].compose(language, options);
}

/**
 * WHAT EACH GRAPHIC SAYS, from one show's own facts.
 *
 * A package is judged as a set, so the words have to be the set's: the strap names the person on
 * camera, the bug names the channel or partner that is on screen all segment, and the countdown
 * names what the viewer is waiting for. Deriving all three from one input here is what keeps a
 * gallery row an actual programme rather than three graphics carrying three unrelated captions.
 */
export function packageLines(
  id: ProGraphicId,
  show: { name: string; title: string; channel?: string | null },
): LineSpec[] {
  switch (id) {
    case 'sponsor-bug':
      return [{ title: 'Caption', sample: show.channel?.trim() || 'ON AIR' }];
    case 'countdown':
      return [{ title: 'Label', sample: 'STARTING IN' }];
    case 'topic-card':
      // The card names the DISCUSSION, not the person - the strap already does that. The type's
      // own shipped samples (TOPIC_CARD_FIELDS, templates/pack4/content.ts), because a type
      // describes the shape of a graphic's content and inventing fresh copy here would be a
      // second sample voice inside one package. ALL THREE declared lines, not a subset: the
      // type compiles every declared line field, and a line left empty still renders its mask -
      // which the block accent then paints as a bare stub (found by LOOKING at the Volt
      // control frame, the way the bug's top-rule defect was).
      return [
        { title: 'Topic', sample: 'The Story in Numbers' },
        { title: 'Context', sample: 'Renewables grew 28% this year' },
        { title: 'Detail', sample: 'Coal at its lowest share since 1965' },
      ];
    case 'lower-third':
    default:
      return [
        { title: 'Name', sample: show.name },
        { title: 'Title', sample: show.title },
      ];
  }
}

/** The primary type size each graphic paints, for a gallery caption that can be checked. */
export function graphicAnchorPx(id: ProGraphicId): number {
  return GRAPHIC_METRICS[id].primaryPx;
}

/** One graphic of a composed package, WITH the type it is - so a member can name itself rather
 *  than be identified by its position in a list an unticked box has already shifted. */
export interface ProPackageMember {
  id: ProGraphicId;
  template: SpxTemplate;
}

/**
 * NAME EVERY MEMBER FOR WHAT IT IS, once there is more than one of them.
 *
 * A composed graphic takes the design LANGUAGE's name, which is right for a single result and
 * useless for a set: three thumbnails captioned "Harbour Nightly", three library rows of that
 * name, and three same-named folders inside one export. **The name is the export slug and the
 * template FOLDER an operator reads in the playout server** (src/export/AGENTS.md), so this is
 * not a caption - it is what makes a package operable once it leaves the wizard.
 *
 * A package of ONE is returned untouched: there is nothing to tell apart, and the
 * single-graphic ending's name placeholder is shipped behaviour.
 *
 * It lives HERE rather than in the wizard step that calls it because the rule is testable only
 * where it can be reached - the Pro door exists on a configured deployment and nowhere else, so
 * a rule buried in that component is pinned by a suite CI never runs.
 */
export function namedPackage(
  members: ProPackageMember[],
  languageName: string,
): ProPackageMember[] {
  if (members.length < 2) return members;
  return members.map((member) => ({
    ...member,
    template: {
      ...member.template,
      name: `${languageName} ${PRO_GRAPHICS[member.id].label.toLowerCase()}`,
    },
  }));
}
