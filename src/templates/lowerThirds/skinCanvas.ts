// ltc01 "Skin Canvas" — the NEUTRAL SKELETON that NoaCG Lite's model-authored skin paints.
//
// This variant is deliberately NOT in the browse catalog (lowerThirds/index.ts): it exists
// only as the assembly target of the Lite skin path (src/ai/lite/pipeline.ts). The platform
// assembles it deterministically — structure spine, #fN fields, NOACG_ANIM data region,
// zone placement — and the skin call restyles it with an appended CSS override block, the
// same bounded surface as the polish pass. Its own styling is therefore a competent, quiet
// broadcast strap: legible on its own, opinionless enough that override CSS wins by cascade
// without fighting decorative rules.
//
// The class contract the skin prompt teaches (keep these names stable):
//   .lower-third          root (zone-positioned; never restyle its position)
//   .lower-third-box      the panel — presets animate this
//   .lower-third-accent   the single accent element (absolute, left edge of the panel)
//   .lower-third-mask     one overflow wrapper per line
//   .lower-third-name     line 1 (#f0), .lower-third-title line 2 (#f1)

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const ltc01: TemplateVariant = defineVariant(
  {
    id: 'ltc01',
    category: 'lower-third',
    name: 'Skin Canvas',
    styleTag: 'minimal',
    description: 'Neutral panel-and-accent strap — the base the Lite skin restyles.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Marcus Chen' },
      { title: 'Title', sample: 'Senior Analyst' },
    ],
    logo: 'none',
    animationPresets: ['slide-up', 'fade', 'line-reveal', 'mask-wipe', 'slide-down'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Skin Canvas',
    description:
      'A quiet dark panel with a left accent bar and a plain name-over-title stack. ' +
      'Every rule is a default the skin override block is expected to beat by cascade.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Skin Canvas: accent bar + a plain line stack. The skin CSS restyles these
         elements; the structure (classes, ids, masks) is the contract and stays. -->
    <div class="lower-third-box">
      <!-- The single accent element — docked at the panel's left edge by default. -->
      <div class="lower-third-accent"></div>
${lineMasks(o)}
    </div>`,
    css: `/* The panel: one quiet surface. The skin repaints it — background, border, radius,
   shadow, padding are all fair game for the override block. */
.lower-third-box {
  position: relative;              /* anchors the absolute accent bar */
  display: flex;                   /* a plain vertical stack */
  flex-direction: column;          /* name above title */
  gap: calc(6px * var(--scale));   /* modest breathing room between lines */
  padding: calc(20px * var(--scale)) calc(28px * var(--scale))
           calc(20px * var(--scale)) calc(34px * var(--scale));  /* extra left: clears the bar */
  background: var(--panel-bg);     /* the family panel surface */
}

/* The accent: a vertical bar on the panel's left edge — the one color moment. */
.lower-third-accent {
  position: absolute;              /* rides the panel, not the flow */
  left: 0;                         /* docked at the edge */
  top: 0;
  bottom: 0;                       /* full panel height */
  width: calc(6px * var(--scale)); /* a bar, not a wall */
  background: var(--accent);       /* the one accent color */
  will-change: transform;          /* hint: line-reveal scales this */
}

/* Name line — the big moment. */
.lower-third-name {
  font-size: calc(52px * var(--scale) * var(--type-scale));  /* headline size */
  font-weight: var(--display-weight);  /* the family display weight */
  line-height: 1.1;                /* tight leading for big text */
  letter-spacing: var(--display-tracking);  /* big display type tightens */
  color: var(--text-color);        /* primary text color */
}

/* Title line — small, quiet, subordinate. */
.lower-third-title {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* clearly under the name */
  font-weight: 400;                /* light against the display name */
  line-height: 1.3;                /* relaxed leading at small sizes */
  letter-spacing: var(--label-tracking);  /* label tracking */
  text-transform: uppercase;       /* reads as a label */
  color: var(--label-color);       /* the family label color */
}`,
    hasAccent: true,
    tokens: {
      labelTracking: '0.04em',
      displayWeight: '600',
    },
  }),
);
