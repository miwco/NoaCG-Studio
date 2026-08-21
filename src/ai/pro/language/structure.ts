// THE PLATFORM'S SIDE OF PHASE A - the structure and the spacing the model never touches
// (docs/NOACG_PRO_PLAN.md §15.5).
//
// THE ONE IDEA IN THIS FILE: every size here is a RATIO OF THE PRIMARY TYPE SIZE, which is the
// unit the instruments measure in (spacingCheck.ts, proportionCheck.ts). The platform therefore
// composes in the same language the measurements are taken in, which is what makes each margin
// KNOWABLE without a model in the loop. Knowable is not the same as CLEAR, and the difference is
// the whole content of the note below: composing in the instrument's unit means a margin can be
// rendered and read off, not that the number a ratio implies is the number that paints.
//
// ── THE MARGINS, MEASURED - 2026-08-16 (docs/NOACG_PRO_PLAN.md §18) ────────────────────────
//
// `node scripts/spike-structure-margins.mjs`, free: 582 cells over density x step x accent form x
// panel treatment x graphic type x mark arm, each composed through `composeGraphic` +
// `composeDocument` at 1920x1080 and read by the LIVE instruments (with each type's own
// thresholds) at the control's words and again at the stress words - 1164 readings. Every line is
// the WORST the whole package produced, with the cell that produced it:
//
//   padding-tight        floor 0.28 type sizes  · tightest 0.33   (strap, compact)
//   padding-lopsided     limit 2.6x             · 1.00 on 790 of the 792 readings that have one;
//                                                 1.06 worst, and that is a FACE's line box (one
//                                                 bug in Oswald), never a padding - the CSS
//                                                 sides stay equal
//   lines-adrift         ceiling 1.4            · widest 1.20    (countdown, airy + block accent:
//                                                 the block's own padding rides on the line gap)
//   text-crowds-rule     band 0.02-0.12         · nearest 0.14    (countdown, compact + block).
//                                                 A strap's own RULES sit at 0.44 and up, which
//                                                 is what the old 0.45 was about - but the block
//                                                 accent is a painted rule too, and the gap to it
//                                                 is the LINE GAP (0.14 compact), not `ruleGapPx`
//   type-ratio-thin      floor 0.28             · smallest 0.35   (strap, compact + strong step)
//   type-ratio-flat      band 0.86-0.93         · largest 0.63    (countdown, subtle step)
//   panel-oversized      fill floor 0.18        · lowest 0.34     (countdown, airy + strong step)
//   footprint-large      ceiling 0.10 of frame  · 0.08 at the control's words - and 0.14 at the
//                                                 STRESS words, which BREACHES the ceiling on 59
//                                                 of the 162 strap stress readings that produce a
//                                                 footprint, 46 of them airy, and none at the
//                                                 control's words. THE ONE MARGIN THIS FILE DOES
//                                                 NOT HAVE; see below
//   mark-oversized       ceiling 3.2 type sizes · 1.56 on the strap, 2.13-2.67 on the bug (whose
//                                                 own ceiling is 5.5). NOT 1.2: the shared slot
//                                                 caps a mark at 84px (`MARK_MAX_HEIGHT_PX`) and
//                                                 a square crest reaches it, so 84/54 = 1.56
//   mark-crowded/adrift  band 0.35-2.1          · 0.48 on the strap, 0.83-0.87 on the bug
//   text-escapes-panel   -                      · ZERO in the 792 readings that HAVE a panel to
//                                                 escape (a panel-free super has none) - the box
//                                                 is `width: fit-content` with the category's
//                                                 auto-fit cap, so it is SIZED BY its text
//
// OF THE ELEVEN LINES, TWO SURVIVED AND NINE MOVED. What survived is the structural claim (no
// text ever escaped its panel) and the strap's 0.48 mark gap, which was the one reading anybody
// had ever rendered. Everything else was DERIVED - a ratio read off the CSS this file writes -
// and the CSS is not the box the browser paints: line-height leading, the mask idiom, a size
// floor firing above the anchor its ratio was taken from, a block's own padding riding on a line
// gap, and a fit-content panel sized by its own text all move it. One reading was out by 3.2x
// (`text-crowds-rule`, stated 0.45 and measured 0.14) and one was out in the direction that
// matters.
//
// THAT ONE IS `footprint-large`, and it is stated as a breach rather than retuned. A long name
// and a 60-character role at airy density widen the fit-content panel to the auto-fit cap, and
// the strap then covers 14% of the frame against a ceiling calibrated at 10% - where the
// catalog's largest is 0.09 and the owner's own "the box is way too big" sat at 0.12. The
// instrument REPORTS and does not gate (spacingCheck.ts says why), so nothing here fails; what
// changes is that the file no longer claims a margin it does not have. Density is the lever - 46
// of the 59 are airy - and whether an airy strap should hold its width is a design decision, not
// a threshold to move.
//
// The five failures §15.2 decomposed were all panel layout, and four of them are gone here by
// construction rather than by a check: a panel sized by its own text cannot be overflowed (now
// measured over the 792 readings that have a panel at all, zero escapes), a rule placed by the
// platform cannot be sat on, a graphic anchored in the type's own zone cannot be stranded in a
// corner, and a mark column capped against the type size cannot inflate the composition.
//
// WHAT THE MODEL DECIDES is which of these arrangements to use and what it looks like - see
// contract.ts. Nothing in this file is reachable from the model's answer except by picking one of
// the named enum values, each of which resolves here.
//
// ── PHASE B: THE SAME RATIOS, MORE THAN ONE GRAPHIC (docs/NOACG_PRO_PLAN.md §15.9) ──────────
//
// A channel does not need a lower third; it needs a lower third, a sponsor bug and a countdown
// that visibly belong to each other. Every ratio above is therefore expressed against a PER-TYPE
// anchor (`GRAPHIC_METRICS[id].primaryPx`) rather than against one hard-coded 54px heading: a
// corner bug's caption is small and a countdown's clock is huge, and holding them to the same
// absolute size would be sameness rather than coherence.
//
// TWO NUMBERS DELIBERATELY DO NOT SCALE WITH THE ANCHOR, and that is the sibling rule made
// structural (docs/DESIGN_LANGUAGE.md §8, "reuse the exact token values across categories"): the
// ACCENT's thickness and the CORNER radius are one value for the whole package, resolved against
// `PACKAGE_UNIT_PX`. The catalog already works this way - lt11, gt05 and bug03 all draw their bar
// from the family's single `--accent-weight` - and it is what makes three graphics read as one
// system instead of as three graphics that happen to share a palette.

import type {
  AccentForm,
  AccentWeight,
  Density,
  DesignLanguage,
  MotionCharacter,
  MotionPace,
  TypeStep,
  TypeWeight,
} from './contract';
import type { AnimPresetId, AnimSpeed } from '../../../model/wizard';

/**
 * The primary type size at 1080p, in px, before `--scale` and `--type-scale`.
 *
 * The house strap's own number (lt11), so a Phase A graphic reads at the size the catalog reads
 * at rather than at a size invented here. Everything below is a multiple of it.
 */
export const HEADING_PX = 54;

/**
 * The PACKAGE's reference size - the unit the two cross-graphic constants are resolved against.
 *
 * It is the lower third's own anchor because the strap is the graphic every package is judged by
 * and the one type the calibration was taken on; making it a separate constant is what stops a
 * later edit to one graphic's anchor from silently re-weighting the accent on all three.
 */
export const PACKAGE_UNIT_PX = HEADING_PX;

/** The graphic types Pro composes. Ordered by the registry's own frequency figure - how many of
 *  the 60 reference formats ask for that graphic (`src/templates/types/registry.ts`), which is
 *  what "a show cannot go on air without it" is answered by here rather than by taste. */
export const PRO_GRAPHIC_IDS = ['lower-third', 'sponsor-bug', 'countdown', 'topic-card'] as const;
export type ProGraphicId = (typeof PRO_GRAPHIC_IDS)[number];

/**
 * The PACKAGE a Pro user gets by default - the subset of the composable types whose set rows an
 * owner blind read has cleared.
 *
 * A new type joins in TWO steps, and the gap between the lists is the rule: it enters
 * `PRO_GRAPHIC_IDS` when it composes and calibrates (so the control run, the paid round and the
 * set gallery all reach it), and enters THIS list only after the owner's read. A validation
 * phase decides whether a thing ships, never assumes it - wiring a type straight into the
 * default package would ship it to every Pro user on the strength of its own instruments, the
 * §16 class of mistake. The topic card sits in that gap now (added 2026-08-19, read pending).
 *
 * It lives HERE, not in graphics.ts, because the stored-package normalizer (settings.ts) needs
 * it and settings must stay off the canvas-bearing compose modules graphics.ts imports.
 */
export const PRO_PACKAGE_IDS: readonly ProGraphicId[] = ['lower-third', 'sponsor-bug', 'countdown'];

/**
 * What a graphic TYPE contributes to the resolved spacing: its own type anchor, its own mark
 * geometry, and the presets its category actually draws.
 *
 * The mark numbers are the SHARED SLOT's, not this file's - `templates/shared/logoSlot.ts` draws
 * the mark and the two arrangements it draws are the category's decision, never the language's.
 *
 * WHAT READS THEM IS THE BUG, and only the bug: `composeBug` floors its tile's padding at a
 * quarter of `markHeightPx`, because on that type the mark IS the graphic and the tile's air
 * belongs to it rather than to the caption under it. There the numbers are EXACT - the stacked
 * slot paints a fixed 64px with 20px beneath it, and both are transcribed.
 *
 * THE STRAP'S PAIR IS DIFFERENT, and the 2026-08-16 sweep is what said so. `gapPx` 26 is exact
 * (the slot's own `MARK_CLEAR_PX`); `heightPx` 65 is NOT the slot's geometry but one wordmark's
 * rendered height from the §15.8 round. The side-by-side slot states a CAP, not a height
 * (`MARK_MAX_HEIGHT_PX` 84 with `height: auto`), so what paints depends on the artwork's aspect -
 * a square crest reaches the cap and measures 1.56 type sizes, not the 1.2 this pair implies.
 * Nothing spends the strap's `heightPx` today, which is why it is corrected in the comment rather
 * than in the number: changing it would move `markGapPx`'s fallback for a type that never uses it
 * and would not touch the one caller that does.
 *
 * The pair stays here because the mark numbers have to be the ones the platform ACTUALLY paints;
 * a value invented here would pad a bug's tile to a band that is not there.
 */
export interface GraphicMetrics {
  /** The primary type size at 1080p, before `--scale` and `--type-scale`. */
  primaryPx: number;
  /**
   * Whether this graphic draws TWO type sizes, so the language's `step` has something to step.
   *
   * A sponsor bug carries one line and there is nothing for a hierarchy to be expressed between,
   * so its caption is set at the primary size and takes the package's LABEL voice - the same
   * weight, case and tracking a lower third's role line and a countdown's label take. Stepping a
   * single line down from itself would be a size decision with no relationship in it, and it
   * would hand the weight floor a number nothing paints.
   */
  steppedSecondary: boolean;
  /** The mark's painted height and its clear space, or null for a type that carries no mark. */
  mark: { heightPx: number; gapPx: number } | null;
  /** Motion character to a real preset, per category. A preset the category never drew for is a
   *  different graphic rather than a different feeling, so each map stays inside the type's own
   *  declared preset set (`GraphicType.capabilities.animationPresets`). */
  motion: Record<MotionCharacter, AnimPresetId>;
}

export const GRAPHIC_METRICS: Record<ProGraphicId, GraphicMetrics> = {
  // 52 of 60 formats. The strap: two lines, a mark beside them, the calibration's own subject.
  'lower-third': {
    primaryPx: HEADING_PX,
    steppedSecondary: true,
    // 26px of clear space is exactly the shared slot's own `MARK_CLEAR_PX`. The 65px height is
    // one wordmark's rendered height from the §15.8 round rather than the slot's rule - the slot
    // caps at 84px and lets the artwork's aspect decide - so read the note on `GraphicMetrics`
    // before spending it: a square crest paints 1.56 type sizes, not 1.2.
    mark: { heightPx: Math.round(HEADING_PX * 1.2), gapPx: Math.round(HEADING_PX * 1.2 * 0.4) },
    motion: { snap: 'slide-up', glide: 'mask-wipe', reveal: 'line-reveal', fade: 'fade' },
  },
  // 37 of 60 - second only to the lower third. A mark and a caption, parked in a corner for as
  // long as the segment runs, so the MARK is the graphic and the caption is subordinate to it.
  'sponsor-bug': {
    // 24px, the largest caption the four shipped bugs draw (bug03; the other three set 16px).
    // A bug is read at a glance from across a room, and the catalog's smallest is the size the
    // §15.8 blind read already called out on a supporting line ("too thin and small").
    primaryPx: 24,
    steppedSecondary: false,
    // The shared slot's stacked band: 64px tall with 20px of clear space beneath it
    // (`applyLogoSlot`). Not ours to choose - stated so the mark field pads to what is painted.
    mark: { heightPx: 64, gapPx: 20 },
    // The corner-bug type declares fade / slide-up / blur-in / pop-spring. A bug has no line to
    // reveal from behind a mask, so `reveal` resolves out of a blur - the glass entrance the
    // category already ships (bug01).
    motion: { snap: 'pop-spring', glide: 'slide-up', reveal: 'blur-in', fade: 'fade' },
  },
  // 30 of 60. A labelled clock counting down to zero, pausable on air - and the one of the three
  // whose primary element is not a line the operator types.
  countdown: {
    // The clock, at gt05's own display size. The label steps down from it exactly as a lower
    // third's role line steps down from the name, which is the point: one type step, one package.
    primaryPx: 80,
    steppedSecondary: true,
    mark: null,   // the countdown type declares `logo: 'none'` - there is no slot to fill
    // The game-timer category draws exactly two entrances, so three characters resolve onto the
    // quieter one. That is honest rather than lossy: a category that never drew a glide has no
    // glide, and inventing one would be a different graphic (see GraphicMetrics.motion).
    motion: {
      snap: 'timer-run',
      glide: 'timer-line-reveal',
      reveal: 'timer-line-reveal',
      fade: 'timer-line-reveal',
    },
  },
  // 29 of 60 - the next type down the registry's own frequency column. The card that stays up
  // DURING the discussion: a topic or question, with room for its source. Structurally the
  // strap's sibling (the info-card category compiles through the same `assembleStandard`
  // contract), which is why its metrics read like a wider, taller lower third rather than a
  // new shape.
  'topic-card': {
    // 44px - the info-card catalog's own heading size (card01/card06 both set it), not a
    // number invented here. Bigger than a strap's role line, smaller than its name: a card is
    // read for seconds, not glanced at.
    primaryPx: 44,
    steppedSecondary: true,
    // The type declares `logo: 'optional'`, and outside a lower third the shared slot draws
    // the mark as its stacked BAND: a fixed 64px with 20px of clear space beneath it
    // (`applyLogoSlot`) - the same transcribed pair the sponsor bug states, because it is the
    // same slot painting it.
    mark: { heightPx: 64, gapPx: 20 },
    // The topic-card type declares line-reveal / slide-up / mask-wipe / fade (+ slide-down,
    // flip-3d) - the full standard-contract set, so all four characters resolve onto real
    // category presets exactly as the strap's do.
    motion: { snap: 'slide-up', glide: 'mask-wipe', reveal: 'line-reveal', fade: 'fade' },
  },
};

/** How far the supporting line steps down. The catalog's own distribution (p50 0.48, p95 0.63)
 *  read off `scripts/spike-proportion-calibrate.mjs`, not chosen by taste. */
const STEP_RATIO: Record<TypeStep, number> = { subtle: 0.62, clear: 0.48, strong: 0.36 };

/**
 * Padding and the gap between lines, per density, as ratios of the heading size.
 *
 * OPPOSITE SIDES ARE ALWAYS EQUAL, which is what retires `padding-lopsided` structurally - and
 * the 2026-08-16 sweep is the first thing to check that in a browser rather than in this table.
 * Rendered, 790 of the 792 readings that HAVE a skew (a panel-free super has none) come back at
 * exactly 1.00; the two that do not are one sponsor bug set in Oswald, read at both content
 * shapes, at 1.06. **That is a FACE's line box, not a padding**: the instrument measures from the
 * panel's edge to the bounding box of what it holds, and a face whose ascent and descent sit
 * asymmetrically inside its line box moves that bounding box without moving a single declaration
 * here. 1.06 against a 2.6x limit, so it costs nothing - but "exactly 1.0" was a claim about CSS
 * being read as a claim about pixels, which is the whole subject of this file's header.
 *
 * `compact.lineGap` IS ALSO A RULE GAP, and that is the one number here with a thin margin. The
 * `block` accent form seats the supporting line on a painted slab, so the slab is a rule the
 * spacing instrument measures text against - and the gap to it is this line gap, never
 * `RULE_GAP_RATIO`. On a countdown that renders 0.14 type sizes against a 0.02-0.12 crowding
 * band: clear, by 0.02. Lowering compact's line gap would put a real composition inside the band.
 */
const DENSITY_SPACE: Record<Density, { padV: number; padH: number; lineGap: number }> = {
  compact: { padV: 0.34, padH: 0.46, lineGap: 0.14 },
  balanced: { padV: 0.46, padH: 0.62, lineGap: 0.20 },
  airy: { padV: 0.62, padH: 0.86, lineGap: 0.30 },
};

/** The accent's thickness, as a ratio of the heading size. */
const ACCENT_RATIO: Record<AccentWeight, number> = { hairline: 0.06, medium: 0.15, heavy: 0.3 };

/**
 * The clear space between a rule that sits INSIDE the panel and the text beside it - the
 * `top-rule` and `underline` forms, which are the only two that draw one.
 *
 * Never zero: `touching is a composition` is a decision the catalog's own designs make, not one
 * to fall into by accident. MEASURED 2026-08-16, this renders 0.44 on a strap's top rule (its
 * tightest reading) and 0.46 on a bug's underline, against a 0.02-0.12 crowding band - so the
 * rules this constant governs are nowhere near it.
 *
 * IT IS NOT THE PACKAGE'S NEAREST RULE, and the old note claiming so was reading this constant
 * instead of the frame. The `block` form's slab is a painted rule as well, and text sits a LINE
 * GAP from it (0.14 at compact density) - see `DENSITY_SPACE`. Two forms, two clear spaces, and
 * only one of them is this number.
 */
const RULE_GAP_RATIO = 0.45;

/** Corner radii in px at scale 1. `pill` is a capsule, capped by the browser at half the height. */
const CORNER_PX = { sharp: 0, soft: 6, round: 16, pill: 999 } as const;

/** Letter-spacing, in em, for the two lines. Caps lines take the wider half of each pair,
 *  because tracked caps is the label voice and untracked caps is a mistake. */
const TRACKING_EM = {
  tight: { heading: '-0.02em', supporting: '0.04em' },
  normal: { heading: '0em', supporting: '0.08em' },
  wide: { heading: '0.02em', supporting: '0.16em' },
} as const;

/** CSS font weights. */
const WEIGHT: Record<TypeWeight, number> = {
  regular: 400, medium: 500, semibold: 600, bold: 700, black: 900,
};

/**
 * THE WEIGHT FLOOR EVERY INFORMATIONAL LINE CARRIES, WHATEVER SIZE IT IS SET AT.
 *
 * The owner's blind read of the first Phase A round (2026-08-15): *"the title is too thin and
 * small for it to be legible"*. That graphic's supporting line was 26px `regular` in the brand's
 * own grey - and it CLEARED the contrast floor at 4.6:1, so no colour repair fired. Contrast was
 * never the defect; a hairline stroke at broadcast distance was.
 *
 * IT USED TO STOP AT 30px, AND THE MEASUREMENT IS WHAT REMOVED THE CONDITION. Reading a stem as
 * a small-text problem was a guess, and re-judging the paid corpus against the owner's own
 * ratified floor of 500 (2026-08-20, `spike/tasteCheck.ts`) says it was the wrong one: **33 of
 * the 40 readings rule 4 raised were the countdown's label at 38px weight 400**, eight pixels
 * above the old boundary and therefore untouched, and the four rows the owner named in
 * `docs/NOACG_PRO_PLAN.md` §25.6 include a **54px name at weight 400** and an **80px clock at
 * weight 400**. A floor that exempts exactly the sizes he complained about is not a floor.
 *
 * So it applies to the heading as well as the supporting line, and at every size. It is still a
 * BOUNDARY rather than a repair - `medium` is one usable step above `regular`, the language still
 * chooses among four weights above it, and the owner explicitly declined `semibold` for the
 * general case because that legislates the design rather than guarding it.
 */
export const TYPE_WEIGHT_FLOOR = WEIGHT.medium;

/**
 * A LABEL ON A SOLID SLAB IS A LABEL. The block accent form puts the supporting line ON the
 * accent, where it stops being subordinate text and becomes a badge - so it carries its own,
 * higher floor. Both cells that used this form failed the same blind read (*"black text on an
 * orange background is not so good, and the text is very small"*), and this is the half of that
 * fault that is about weight; `readableInkOn` in compose.ts is the half about colour.
 */
export const BLOCK_LABEL_WEIGHT_FLOOR = WEIGHT.semibold;
/** …and its SIZE floor, for the other half of the same note ("the text is very small"). A line
 *  set on a solid slab of the accent colour is the loudest thing in the composition after the
 *  name; at the bottom of the step range it reads as a caption someone forgot to finish. */
export const BLOCK_LABEL_MIN_PX = 30;

/**
 * The mark's height and its clear space, against the type it stands beside - never against the
 * frame, which is what "the logo takes half the screen" gets wrong.
 *
 * THE FALLBACK ONLY, and no graphic type reaches it today: all three either state the slot's own
 * numbers (`GraphicMetrics.mark`) or carry no slot. It is kept so a fourth type cannot resolve a
 * mark geometry of `undefined`, and it is stated in type sizes because that is the unit the
 * question is asked in.
 *
 * IT IS NOT WHAT A STRAP PAINTS. `logoSlot.ts` gives the side-by-side arrangement a CAP
 * (`MARK_MAX_HEIGHT_PX` 84) and `height: auto`, so the artwork's aspect decides: measured
 * 2026-08-16, a square crest reaches the cap at 1.56 type sizes and a wordmark paints far less.
 * 1.2 is a fallback nobody spends, not a description of the slot.
 */
export const MARK_HEIGHT_RATIO = 1.2;
export const MARK_GAP_RATIO = 0.4;

/** Pace is the one motion decision that means the same thing in every category, so unlike the
 *  character map above it is a single table. */
const MOTION_SPEED: Record<MotionPace, AnimSpeed> = { fast: 1.5, measured: 1, slow: 0.75 };

/** Every number the composer needs, resolved from the language. Nothing downstream computes
 *  geometry: it reads this. */
export interface ResolvedSpacing {
  headingPx: number;
  supportingPx: number;
  padVPx: number;
  padHPx: number;
  lineGapPx: number;
  accentPx: number;
  ruleGapPx: number;
  cornerPx: number;
  markHeightPx: number;
  markGapPx: number;
  headingWeight: number;
  supportingWeight: number;
  headingTracking: string;
  supportingTracking: string;
  preset: AnimPresetId;
  speed: AnimSpeed;
}

/**
 * Every number a composer needs, resolved from the language for ONE graphic type.
 *
 * `graphic` defaults to the lower third, which is what keeps the shipped strap byte-identical to
 * the composition the §15.8 blind read scored: at that anchor every expression below reduces to
 * the constant it was before Phase B existed.
 */
export function resolveSpacing(
  language: DesignLanguage,
  graphic: ProGraphicId = 'lower-third',
): ResolvedSpacing {
  const metrics = GRAPHIC_METRICS[graphic];
  const space = DENSITY_SPACE[language.density];
  const heading = metrics.primaryPx;
  const supporting = Math.max(
    metrics.steppedSecondary ? Math.round(heading * STEP_RATIO[language.typography.step]) : heading,
    language.accent.form === 'block' ? BLOCK_LABEL_MIN_PX : 0,
  );
  const tracking = TRACKING_EM[language.typography.tracking];
  // The two floors above, applied. Recorded by the caller as an adjustment when either bites.
  const supportingWeight = Math.max(
    WEIGHT[language.typography.supportingWeight],
    TYPE_WEIGHT_FLOOR,
    language.accent.form === 'block' ? BLOCK_LABEL_WEIGHT_FLOOR : 0,
  );
  // ── THE UNIT IS THE LARGEST PAINTED TYPE SIZE, NOT THE ANCHOR ──────────────────────────
  //
  // `spacingCheck` reports padding as a ratio of the PRIMARY type size it measures on the frame,
  // and on two of the three graphics the anchor IS that size - so this reduced to `heading` and
  // nobody noticed the difference. On a sponsor bug it does not: the caption is the only line,
  // and the block accent form's own size floor (BLOCK_LABEL_MIN_PX) can raise what is painted
  // above the anchor the padding was derived from. Measured on the free per-type sweep: a compact
  // block-accent bug came out at 8px of padding on a 30px caption - 0.27 against a 0.28 floor,
  // `padding-tight`, on a composition whose whole premise is that the threshold is cleared BY
  // CONSTRUCTION. Deriving the unit from what is painted is what makes that true again.
  //
  // CONFIRMED RENDERED, 2026-08-16: over every density/step/accent/panel combination the bug's
  // tightest padding is 0.53 - the widest margin of the three types, because `composeBug` floors
  // the tile at a quarter of the mark's height on top of this. The fix is not merely present in
  // the source, it is present in the frame.
  const unit = Math.max(heading, supporting);
  return {
    headingPx: heading,
    supportingPx: supporting,
    padVPx: Math.round(unit * space.padV),
    padHPx: Math.round(unit * space.padH),
    lineGapPx: Math.round(unit * space.lineGap),
    // Against the PACKAGE unit, not this graphic's anchor - one bar weight for the whole set.
    accentPx: Math.round(PACKAGE_UNIT_PX * ACCENT_RATIO[language.accent.weight]),
    ruleGapPx: Math.round(heading * RULE_GAP_RATIO),
    cornerPx: CORNER_PX[language.shape.corner],
    // The shared slot's own geometry, or the lower third's ratios where it has none to state.
    markHeightPx: metrics.mark?.heightPx ?? Math.round(heading * MARK_HEIGHT_RATIO),
    markGapPx: metrics.mark?.gapPx ?? Math.round(heading * MARK_HEIGHT_RATIO * MARK_GAP_RATIO),
    headingWeight: Math.max(WEIGHT[language.typography.headingWeight], TYPE_WEIGHT_FLOOR),
    supportingWeight,
    headingTracking: tracking.heading,
    supportingTracking: tracking.supporting,
    preset: metrics.motion[language.motion.character],
    speed: MOTION_SPEED[language.motion.pace],
  };
}

/**
 * WHERE THE ACCENT GOES, per form. The platform draws all of it: which element carries the
 * accent class, what it looks like, and how the panel makes room for it.
 *
 * `edge-bar` is the house arrangement (lt11): the bar is fused to the panel's leading edge and
 * lives OUTSIDE the panel's padding, so it can never crowd the text. `top-rule` and `underline`
 * sit inside, one clear-space away. `block` puts the supporting line on the accent itself, which
 * is the one arrangement where text TOUCHING the accent is the composition rather than a defect
 * (lt39 ships exactly that) - and it is drawn as contact, never as a near miss.
 */
export interface AccentPlan {
  /** Whether a `.PREFIX-accent` ELEMENT is emitted. `block` deliberately does not emit one: the
   *  accent is the supporting line's own surface, so there is no separate shape to animate, and
   *  claiming one would hand the entrance preset an element that does not exist. */
  element: boolean;
  /** Where it sits, for the structure comment a reader of the generated code sees. */
  note: string;
}

export function accentPlan(form: AccentForm): AccentPlan {
  switch (form) {
    case 'edge-bar':
      return { element: true, note: 'a bar fused to the panel\'s leading edge, outside its padding' };
    case 'top-rule':
      return { element: true, note: 'a rule across the top of the panel, one clear space above the words' };
    case 'underline':
      return { element: true, note: 'a rule under the words, one clear space below them' };
    case 'block':
      return { element: false, note: 'a solid block the supporting line sits on' };
    case 'none':
    default:
      return { element: false, note: 'no accent shape - the accent colour lives in the type alone' };
  }
}
