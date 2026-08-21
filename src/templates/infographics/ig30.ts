// ig30 'Clean Goal' - the minimal goal meter. It uses the same measured count-up/bar builder
// as ig22, with a hairline track and a soft scrim instead of a panel.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { goalRuntimeJs } from './dataRuntimes';
import { defineInfographicVariant } from './shared';

export const ig30: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig30',
    category: 'infographic',
    name: 'Clean Goal',
    styleTag: 'minimal',
    description:
      'A quiet goal meter: running total, derived share, and a hairline progress track.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Raised', sample: '18400' },
      { title: 'Goal', sample: '30000' },
    ],
    logo: 'none',
    animationPresets: ['count-up'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Clean Goal',
    description:
      'A minimal running total with its derived percentage and target on a quiet hairline meter.',
    uicolor: '2',
  },
  (o) => {
    const raisedText = o.lines[0]?.sample || '18400';
    const goalText = o.lines[1]?.sample || '30000';
    return {
      // The stage: the width this design holds a full-length value at, so the panel
      // stops re-sizing itself between one piece of content and the next.
      stageWidth: 750,
      html: `    <!-- Clean Goal: label / total + share / hairline meter / target. -->
    <div class="infographic-box"><div class="infographic-accent"></div>
      <div class="infographic-kicker" id="f2">TOTAL RAISED</div>
      <div class="infographic-head"><div class="infographic-figure"><span class="infographic-unit" id="f3">&euro;</span><span class="infographic-value" id="f0">${raisedText}</span></div><span class="infographic-percent" id="infographic-percent"></span></div>
      <div class="infographic-track"><div class="infographic-bar-fill" data-value="0"></div></div>
      <div class="infographic-goal-line" id="infographic-goal-line"></div>
    </div><div id="f1" class="noacg-data-source">${goalText}</div>`,
      css: `/* The container fixes the composition footprint and protects it over unknown programme pictures. */
      .infographic-box {
        min-width: calc(700px * var(--scale));  /* reserves the footprint needed by doubled-text stress */
        padding: calc(24px * var(--scale)) calc(30px * var(--scale));  /* gives content broadcast-safe breathing room */
        background: linear-gradient(90deg, rgba(7,9,13,.66), rgba(7,9,13,.2));  /* provides the family surface or contrast this element needs */
      }
/* The family accent supplies hierarchy without adding another decorative surface. */
.infographic-accent {
  width: calc(82px * var(--scale));  /* fixes the authored horizontal footprint */
  height: var(--accent-weight);  /* fixes the authored vertical footprint */
  margin-bottom: calc(13px * var(--scale));  /* preserves the authored hierarchy and fixed broadcast footprint */
  background: var(--accent);  /* provides the family surface or contrast this element needs */
}
/* The supporting voice stays subordinate while remaining broadcast-legible. */
.infographic-kicker {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  letter-spacing: var(--label-tracking);  /* uses tracking to reinforce the family voice */
  text-transform: uppercase;  /* normalizes the label register regardless of input case */
  color: var(--label-color);  /* assigns the intended hierarchy and contrast role */
}
/* Shared alignment keeps related values on one readable visual baseline. */
.infographic-head {
  display: flex;  /* selects the layout model the composition depends on */
  justify-content: space-between;  /* distributes the authored negative space predictably */
  align-items: baseline;  /* keeps related elements aligned as one visual unit */
  gap: calc(34px * var(--scale));  /* sets a deliberate seam between distinct information */
  margin-top: calc(6px * var(--scale));  /* separates this voice from the one above it */
}
/* This rule preserves the family hierarchy and the graphic's fixed broadcast footprint. */
.infographic-figure {
  display: flex;  /* selects the layout model the composition depends on */
  align-items: baseline;  /* keeps related elements aligned as one visual unit */
  gap: calc(8px * var(--scale));  /* sets a deliberate seam between distinct information */
  min-width: 0;  /* reserves the footprint needed by doubled-text stress */
}
/* This compact signal stays visually distinct because viewers may need to copy it quickly. */
.infographic-unit {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  color: var(--text-dim);  /* assigns the intended hierarchy and contrast role */
}
/* Empty operator data removes the whole element so no unexplained gap remains. */
.infographic-unit:empty {
  display: none;  /* selects the layout model the composition depends on */
}
/* Numeric hierarchy makes the changing value readable without competing with its label. */
.infographic-value {
  font-family: var(--font-numeric);  /* uses the designated voice for this kind of information */
  font-size: calc(92px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  line-height: 1;  /* keeps wrapped copy compact but readable */
  letter-spacing: -.02em;  /* uses tracking to reinforce the family voice */
  font-variant-numeric: tabular-nums;  /* holds live digits to a stable box width */
  color: var(--text-color);  /* assigns the intended hierarchy and contrast role */
}
/* Numeric hierarchy makes the changing value readable without competing with its label. */
.infographic-percent {
  font-family: var(--font-numeric);  /* uses the designated voice for this kind of information */
  font-size: calc(37px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  font-variant-numeric: tabular-nums;  /* holds live digits to a stable box width */
  white-space: nowrap;  /* protects a short atomic value from breaking */
  color: var(--accent);  /* assigns the intended hierarchy and contrast role */
}
/* The measured builder owns progress while this rule preserves the designed lane geometry. */
.infographic-track {
  height: var(--accent-weight);  /* fixes the authored vertical footprint */
  margin-top: calc(20px * var(--scale));  /* separates this voice from the one above it */
  background: rgba(255,255,255,.18);  /* provides the family surface or contrast this element needs */
  overflow: hidden;  /* clips media and measured fills to their authored slots */
}
/* The measured builder owns progress while this rule preserves the designed lane geometry. */
.infographic-bar-fill {
  width: 0;  /* fixes the authored horizontal footprint */
  height: 100%;  /* fixes the authored vertical footprint */
  background: var(--accent);  /* provides the family surface or contrast this element needs */
  will-change: width;  /* hints the exact property the entrance animates */
}
/* The live figure gets a deliberate numeric voice without changing the surrounding hierarchy. */
.infographic-goal-line {
  margin-top: calc(11px * var(--scale));  /* separates this voice from the one above it */
  font-family: var(--font-numeric);  /* uses the designated voice for this kind of information */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-variant-numeric: tabular-nums;  /* holds live digits to a stable box width */
  color: var(--text-dim);  /* assigns the intended hierarchy and contrast role */
}`,
      fields: [
        {
          field: 'f0',
          ftype: 'number',
          title: o.lines[0]?.title || 'Raised',
          value: raisedText,
        },
        {
          field: 'f1',
          ftype: 'number',
          title: o.lines[1]?.title || 'Goal',
          value: goalText,
        },
        {
          field: 'f2',
          ftype: 'textfield',
          title: 'Label',
          value: 'TOTAL RAISED',
        },
        { field: 'f3', ftype: 'textfield', title: 'Unit', value: '€' },
      ],
      runtimeExtraJs: goalRuntimeJs('bar'),
    };
  },
);
