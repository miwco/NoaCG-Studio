// ig31 'Volt Goal' - the sport goal meter. Its measured entrance is the same count-up/bar
// builder as ig22; the fill lives in a hard-edged track rather than being re-choreographed.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { goalRuntimeJs } from './dataRuntimes';
import { defineInfographicVariant } from './shared';

export const ig31: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig31',
    category: 'infographic',
    name: 'Volt Goal',
    styleTag: 'sport',
    description:
      'A high-impact goal meter with a hard-edged progress lane and oversized running total.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Raised', sample: '6840' },
      { title: 'Goal', sample: '10000' },
    ],
    logo: 'none',
    animationPresets: ['count-up'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Volt Goal',
    description:
      'A hard sport slab with an oversized total, accent percentage, and measured progress bar.',
    uicolor: '1',
  },
  (o) => {
    const raisedText = o.lines[0]?.sample || '6840';
    const goalText = o.lines[1]?.sample || '10000';
    return {
      // The stage: the width this design holds a full-length value at, so the panel
      // stops re-sizing itself between one piece of content and the next.
      stageWidth: 720,
      html: `    <!-- Volt Goal: hard slab / total + share / progress track. -->
    <div class="infographic-accent"></div><div class="infographic-box">
      <div class="infographic-kicker" id="f2">CAMPAIGN TOTAL</div>
      <div class="infographic-head"><div class="infographic-figure"><span class="infographic-unit" id="f3">&euro;</span><span class="infographic-value" id="f0">${raisedText}</span></div><span class="infographic-percent" id="infographic-percent"></span></div>
      <div class="infographic-track"><div class="infographic-bar-fill" data-value="0"></div></div><div class="infographic-goal-line" id="infographic-goal-line"></div>
    </div><div id="f1" class="noacg-data-source">${goalText}</div>`,
      css: `/* The single accent mark establishes hierarchy and gives the preset one clear reveal target. */
      .infographic-accent {
        position: absolute;  /* anchors the element without adding layout reflow */
        inset: 0 auto 0 0;  /* pins the authored surface to its exact slot */
        width: var(--accent-weight);  /* fixes the authored horizontal footprint */
        background: var(--accent);  /* provides the family surface or contrast this element needs */
      }
/* The container holds the composition stable over an unpredictable programme image. */
.infographic-box {
  min-width: calc(720px * var(--scale));  /* reserves the footprint needed by doubled-text stress */
  margin-left: var(--accent-weight);  /* clears the structural accent edge */
  padding: calc(23px * var(--scale)) calc(36px * var(--scale));  /* gives content broadcast-safe breathing room */
  background: var(--panel-bg);  /* provides the family surface or contrast this element needs */
  box-shadow: var(--panel-shadow);  /* lifts the surface without introducing another color */
}
/* The supporting voice stays subordinate while remaining broadcast-legible. */
.infographic-kicker {
  display: inline-block;  /* selects the layout model the composition depends on */
  padding: calc(4px * var(--scale)) calc(10px * var(--scale));  /* gives content broadcast-safe breathing room */
  background: var(--accent);  /* provides the family surface or contrast this element needs */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  letter-spacing: var(--label-tracking);  /* uses tracking to reinforce the family voice */
  text-transform: uppercase;  /* normalizes the label register regardless of input case */
  color: var(--accent-ink);  /* assigns the intended hierarchy and contrast role */
}
/* Shared alignment keeps related values on one readable visual baseline. */
.infographic-head {
  display: flex;  /* selects the layout model the composition depends on */
  justify-content: space-between;  /* distributes the authored negative space predictably */
  align-items: baseline;  /* keeps related elements aligned as one visual unit */
  gap: calc(34px * var(--scale));  /* sets a deliberate seam between distinct information */
  margin-top: calc(9px * var(--scale));  /* separates this voice from the one above it */
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
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  color: var(--text-dim);  /* assigns the intended hierarchy and contrast role */
}
/* Empty operator data removes the whole element so no unexplained gap remains. */
.infographic-unit:empty {
  display: none;  /* selects the layout model the composition depends on */
}
/* Numeric hierarchy makes the changing value readable without competing with its label. */
.infographic-value {
  font-family: var(--font-numeric);  /* uses the designated voice for this kind of information */
  font-size: calc(103px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: var(--display-weight);  /* separates this voice without introducing another typeface */
  line-height: .94;  /* keeps wrapped copy compact but readable */
  letter-spacing: var(--display-tracking);  /* uses tracking to reinforce the family voice */
  font-variant-numeric: tabular-nums;  /* holds live digits to a stable box width */
  color: var(--text-color);  /* assigns the intended hierarchy and contrast role */
}
/* Numeric hierarchy makes the changing value readable without competing with its label. */
.infographic-percent {
  font-family: var(--font-numeric);  /* uses the designated voice for this kind of information */
  font-size: calc(44px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  font-variant-numeric: tabular-nums;  /* holds live digits to a stable box width */
  white-space: nowrap;  /* protects a short atomic value from breaking */
  color: var(--accent);  /* assigns the intended hierarchy and contrast role */
}
/* The measured builder owns progress while this rule preserves the designed lane geometry. */
.infographic-track {
  height: calc(14px * var(--scale));  /* fixes the authored vertical footprint */
  margin-top: calc(19px * var(--scale));  /* separates this voice from the one above it */
  background: rgba(255,255,255,.14);  /* provides the family surface or contrast this element needs */
  overflow: hidden;  /* clips media and measured fills to their authored slots */
}
/* The measured builder owns progress while this rule preserves the designed lane geometry. */
.infographic-bar-fill {
  width: 0;  /* fixes the authored horizontal footprint */
  height: 100%;  /* fixes the authored vertical footprint */
  background: var(--accent);  /* provides the family surface or contrast this element needs */
  will-change: width;  /* hints the exact property the entrance animates */
}
/* The target caption remains secondary, but its figure must not shift as the goal updates. */
.infographic-goal-line {
  margin-top: calc(10px * var(--scale));  /* separates this voice from the one above it */
  font-family: var(--font-numeric);  /* uses the designated voice for this kind of information */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 600;  /* separates this voice without introducing another typeface */
  font-variant-numeric: tabular-nums;  /* holds live digits to a stable box width */
  letter-spacing: .05em;  /* uses tracking to reinforce the family voice */
  text-transform: uppercase;  /* normalizes the label register regardless of input case */
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
          value: 'CAMPAIGN TOTAL',
        },
        { field: 'f3', ftype: 'textfield', title: 'Unit', value: '€' },
      ],
      runtimeExtraJs: goalRuntimeJs('bar'),
    };
  },
);
