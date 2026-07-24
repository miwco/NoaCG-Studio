// Alert scaffolding — the category-generic assembler bound to the ALERT contract: class
// prefix "alert", a banner-wide auto-fit cap, and the severity FLAG that makes an alert an
// alert rather than an info card.
//
// Alerts are ordinary standard-contract templates. They reuse the shared preset bank, the
// line masks, the steps machinery and the data-block conversion exactly as lower thirds and
// info cards do — nothing here is a second runtime. The one thing this module adds is the
// severity level stack and the rest pose that keeps it honest.
//
// Structure contract:
//   <div class="alert">                    root — positioned by zone; opacity:0 until play()
//     <div class="alert-box">              the banner; presets animate this
//       [<div class="alert-flag">          the severity flag (a level-bearing design only)
//          <div class="alert-level-1" data-level="advisory">Advisory</div>
//          … one block per level, stacked; the level machine cross-cuts them
//        </div>]
//       <div class="alert-lines">          the text column
//         <div class="alert-mask"><span id="f0" class="alert-name">…</span></div>
//         <div class="alert-mask"><span id="f1" class="alert-title">…</span></div>
//         <div class="alert-mask"><span id="f2" class="alert-extra">…</span></div>
//       </div>
//     </div>
//   </div>
//
// ── Why the levels are four ELEMENTS and not one recoloured element ──────────────────────
//
// A severity level has to be readable as a WORD, not only as a colour: colour alone fails
// every colour-blind viewer and every washed-out downstream encode, and "red means the worst
// one" is a convention nobody is obliged to know. So the level is spelled out, and a spelled-
// out level cannot be tweened — text is not an animatable property. Four stacked blocks, one
// per level, cross-cut by opacity, is the honest shape: each block is a real registry part
// (model/structure.ts), each level state owns a real editable opacity track, and the timeline
// and node editor show exactly what the machine does.

import type { Resolution } from '../../model/types';
import type { AnimData, AnimLayerTracks } from '../../blocks/animData';
import type { ResolvedOptions, TemplateVariant, WizardOptions } from '../../model/wizard';
import { resolveTokens } from '../../model/themeTokens';
import { resolveOptions } from '../../model/wizard';
import {
  assembleStandard,
  composeRefine,
  lineClassFor,
  lineMasksFor,
  type CategorySpec,
  type StandardDesign,
  type StandardMeta,
} from '../shared/standard';

export type AlertMeta = StandardMeta;

/** An alert design. `hasLevels` is the one addition to the standard design shape: it says the
 *  design emits the severity flag, which is what earns it the level machine and the rest pose
 *  below. A design without it is a plain notice — and must not claim states it has not got. */
export interface AlertDesign extends StandardDesign {
  hasLevels?: boolean;
}

const ALERT_CATEGORY: CategorySpec = {
  type: 'alert',
  prefix: 'alert',
  rootComment: 'Alert. Hidden until play(); positioned by the .alert rule in the CSS.',
  // Alerts are read at a glance from across a room, so they run wider than a card: up to 66%
  // of the frame inside the safe areas. Banner designs override the box width outright.
  maxTextWidth: (res: Resolution) =>
    Math.round(Math.min(res.width * 0.66, res.width - 2 * (res.width * 0.0625))),
  dataRegion: true,
};

export function alertLineClass(index: number): string {
  return lineClassFor('alert', index);
}

export function alertLineMasks(o: ResolvedOptions, indent = '        '): string {
  return lineMasksFor('alert', o, indent);
}

// ── The severity levels ──────────────────────────────────────────────────────

/** One severity level: the word the operator's audience reads, and the colour behind it. */
export interface AlertLevel {
  /** The machine state id and the block's `data-level` value. */
  id: string;
  /** The word shown on air. Never abbreviated — this is the whole point of the flag. */
  word: string;
  /** The block's fill. FIXED semantic colours, deliberately independent of the project
   *  palette (the same doctrine as tk06's market green/red): a warning that turns mint
   *  because someone picked a mint accent is a graphic that lies. */
  color: string;
  /** Ink on that fill. Every pair below clears 5:1 against its own background, so the level
   *  word stays legible as body text and not merely as "large text". */
  ink: string;
}

/**
 * The severity ramp, low to high. Four steps is the number every public-warning system
 * converges on (CAP's minor/moderate/severe/extreme, the meteorological
 * advisory/watch/warning, the civil-protection ladder) and the most a viewer can rank
 * without a legend.
 */
export const ALERT_LEVELS: AlertLevel[] = [
  { id: 'advisory',  word: 'Advisory',  color: '#1f5fa8', ink: '#ffffff' },
  { id: 'watch',     word: 'Watch',     color: '#e0a11a', ink: '#0b0d11' },
  { id: 'warning',   word: 'Warning',   color: '#e0621a', ink: '#0b0d11' },
  { id: 'emergency', word: 'Emergency', color: '#cf2f2f', ink: '#ffffff' },
];

/** The selector of one level block — the one place the numbering is written down. */
export function alertLevelSelector(index: number): string {
  return `.alert-level-${index + 1}`;
}

/** The severity flag's markup: every level, stacked, with the lowest one showing. */
export function alertLevelStackHtml(indent = '      '): string {
  const blocks = ALERT_LEVELS.map(
    (level, i) =>
      `${indent}  <div class="alert-level-${i + 1}" data-level="${level.id}">${level.word}</div>`,
  ).join('\n');
  return `${indent}<!-- The severity flag. Every level is a real element; the level state machine
${indent}     cross-cuts them, so the word and the colour can never disagree. -->
${indent}<div class="alert-flag">
${blocks}
${indent}</div>`;
}

/**
 * The flag's shared CSS. Every level-bearing design includes this and then sizes the flag
 * to its own layout; the stacking, the fixed colours and the no-reflow rule live here so
 * four designs cannot drift into four different severity ramps.
 */
export const ALERT_LEVEL_CSS = `/* ── The severity flag ── */

/* The flag is a fixed-width slab: the level blocks are stacked on top of each other, so the
   banner's layout must not depend on which word is showing. Without the min-width the whole
   graphic would re-flow every time an operator escalated.

   The width follows --type-scale as well as --scale, and it has to: the blocks are absolutely
   positioned, so they contribute NOTHING to the flag's width — turning the text size up would
   grow the longest word past a slab that never grew with it, and "Emergency" would run off its
   own flag. */
.alert-flag {
  position: relative;              /* the stacking context for the level blocks */
  flex-shrink: 0;                  /* never squeezed by the text column */
  align-self: stretch;             /* the flag spans the banner's full height */
  min-width: calc(248px * var(--scale) * var(--type-scale));  /* fits the longest level word at any text size */
}

/* One level block — a full-bleed coloured slab with its word centred. All four are here at
   all times; exactly one is opaque. */
.alert-flag > div {
  position: absolute;              /* stacked, not laid out in a row */
  inset: 0;                        /* fill the flag */
  display: flex;                   /* centre the word */
  align-items: center;             /* vertical centring */
  justify-content: center;         /* horizontal centring */
  padding: 0 calc(22px * var(--scale)); /* keeps a long word off the slab's edges */
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(26px * var(--scale) * var(--type-scale)); /* the flag speaks first — read before the headline */
  font-weight: 800;                /* heavy caps carry at a distance */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* a severity word is a stamp */
  white-space: nowrap;             /* the word never wraps inside its slab */
  opacity: 0;                      /* only the current level is painted (see below) */
  will-change: opacity;            /* the level machine animates exactly this */
}

/* The resting level. This matches the level machine's INITIAL state, and the entrance step
   sets the same pose — so a replay, a snap and a fresh load all agree on where the graphic
   rests.

   The selector is deliberately two levels deep: the "all levels hidden" rule above is a CHILD
   selector and therefore outranks a bare class, so a one-class rule here would lose and the
   flag would rest blank. It did, until a visual reset went looking for the resting level and
   found nothing painted. */
.alert-flag > .alert-level-1 { opacity: 1; }

/* The severity colours are FIXED, on purpose: they are the one thing in the graphic that must
   not follow the project palette. Each pair clears 5:1 contrast, and the level is always
   spelled out as well as coloured — colour is never the only carrier. */
.alert-level-1 { background: ${ALERT_LEVELS[0].color}; color: ${ALERT_LEVELS[0].ink};
  box-shadow: calc(16px * var(--scale)) 0 calc(48px * var(--scale)) calc(-14px * var(--scale)) ${ALERT_LEVELS[0].color}; }
.alert-level-2 { background: ${ALERT_LEVELS[1].color}; color: ${ALERT_LEVELS[1].ink};
  box-shadow: calc(16px * var(--scale)) 0 calc(48px * var(--scale)) calc(-14px * var(--scale)) ${ALERT_LEVELS[1].color}; }
.alert-level-3 { background: ${ALERT_LEVELS[2].color}; color: ${ALERT_LEVELS[2].ink};
  box-shadow: calc(16px * var(--scale)) 0 calc(48px * var(--scale)) calc(-14px * var(--scale)) ${ALERT_LEVELS[2].color}; }
.alert-level-4 { background: ${ALERT_LEVELS[3].color}; color: ${ALERT_LEVELS[3].ink};
  box-shadow: calc(16px * var(--scale)) 0 calc(48px * var(--scale)) calc(-14px * var(--scale)) ${ALERT_LEVELS[3].color}; }`;

/**
 * The level REST POSE, written into the entrance step.
 *
 * The level lives in a parallel state group whose initial state is the lowest level, and a
 * group resting at its initial state replays nothing (that is what "initial" means). So
 * without this the DOM would keep whatever level was last on air across a stop/play: the
 * pointer would say Advisory and the flag would still read Emergency. Putting the rest pose
 * in step 0 makes the entrance itself establish it — one pose, authored once, and every
 * route to it (play, replay, snap-to-initial via the CSS default) lands on the same picture.
 *
 * These are ordinary single-keyframe tracks, so they show up on the timeline as the layer
 * poses they are and can be edited like anything else.
 */
export function alertLevelRestRefine(data: AnimData): AnimData {
  const rest: Record<string, AnimLayerTracks> = {};
  ALERT_LEVELS.forEach((_level, i) => {
    rest[alertLevelSelector(i)] = { opacity: [{ time: 0, value: i === 0 ? 1 : 0 }] };
  });
  const steps = data.steps.map((step, i) =>
    i === 0 ? { ...step, layers: { ...step.layers, ...rest } } : step,
  );
  return { ...data, steps };
}

// ── The authoring API ────────────────────────────────────────────────────────

/**
 * The authoring API for alert variant modules — `makeDefineVariant` plus the level rest pose.
 *
 * It is its own factory rather than the shared one because a level-bearing design must carry
 * the rest pose whether or not a graphic TYPE later attaches the level machine: the pose is a
 * property of the markup, not of the machine, and a design that emitted the flag without it
 * would drift on the first replay.
 */
export function defineAlertVariant(
  spec: Omit<TemplateVariant, 'create'>,
  meta: AlertMeta,
  buildDesign: (o: ResolvedOptions) => AlertDesign,
  /** Optional animation-data refinement (a graphic type's machine rides in here). */
  refine?: (o: ResolvedOptions) => ((data: AnimData) => AnimData) | undefined,
): TemplateVariant {
  const variant: TemplateVariant = {
    ...spec,
    create(options?: WizardOptions) {
      const o = resolveOptions(variant, options);
      const design = buildDesign(o);
      // The family lives on the variant, the overrides on the design — resolved here because
      // this is the only place that holds both.
      const tokens = resolveTokens(spec.styleTag, design.tokens);
      // ORDERING (shared/standard.ts composeRefine): the rest pose only edits step 0's layers,
      // so it adds no step and is safe on either side — it runs first because it belongs to
      // the design, and a type's machine is layered over the finished choreography.
      const composed = composeRefine(
        design.hasLevels ? alertLevelRestRefine : undefined,
        refine?.(o),
      );
      return assembleStandard(ALERT_CATEGORY, meta, design, o, composed, tokens);
    },
  };
  return variant;
}
