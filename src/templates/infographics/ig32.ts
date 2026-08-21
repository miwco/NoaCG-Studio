// ig32 'Clean Milestones' - the minimal milestone rail. The milestone-run builder owns the
// measured line and node motion; this design only changes the rail's visual register.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { milestoneRuntimeJs } from './dataRuntimes';
import { defineInfographicVariant } from './shared';

const SAMPLE = [
  'First bell | 1000',
  'Halfway | 2500',
  'Final hour | 5000',
  'Stretch | 7500',
].join("\n");

export const ig32: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig32',
    category: 'infographic',
    name: 'Clean Milestones',
    styleTag: 'minimal',
    description:
      'A quiet milestone rail with evenly spaced hairline nodes and a derived running position.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Milestones', sample: SAMPLE },
      { title: 'Current', sample: '3200' },
    ],
    logo: 'none',
    animationPresets: ['milestone-run'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Clean Milestones',
    description:
      'A panel-light milestone rail with hairline markers, small-caps labels, and the measured milestone-run entrance.',
    uicolor: '2',
  },
  (o) => {
    const milestonesText = o.lines[0]?.sample || SAMPLE;
    const currentText = o.lines[1]?.sample || '3200';
    return {
      // The stage: the width this design holds a full-length value at, so the panel
      // stops re-sizing itself between one piece of content and the next.
      stageWidth: 1040,
      html: `    <!-- Clean Milestones: heading / evenly spaced rail and nodes. -->
    <div class="infographic-box"><div class="infographic-head"><div class="infographic-head-left"><span class="infographic-kicker" id="f2">MILESTONES</span><span class="infographic-current" id="infographic-current"></span></div><span class="infographic-reached" id="infographic-reached"></span></div>
      <div class="infographic-rail"><div class="infographic-milestone-track"><div class="infographic-milestone-fill" data-value="0"></div></div><div class="infographic-nodes" id="infographic-nodes"></div></div>
    </div><div id="f0" class="noacg-data-source">${milestonesText}</div><div id="f1" class="noacg-data-source">${currentText}</div>`,
      css: `/* The container fixes the composition footprint and protects it over unknown programme pictures. */
      .infographic-box {
        width: calc(1040px * var(--scale));  /* fixes the authored horizontal footprint */
        padding: calc(24px * var(--scale)) calc(30px * var(--scale)) calc(28px * var(--scale));  /* gives content broadcast-safe breathing room */
        background: linear-gradient(90deg, rgba(7,9,13,.62), rgba(7,9,13,.18));  /* provides the family surface or contrast this element needs */
        border-top: var(--accent-weight) solid var(--accent);  /* uses the family accent as the single structural edge */
      }
/* Shared alignment keeps related values on one readable visual baseline. */
.infographic-head {
  display: flex;  /* selects the layout model the composition depends on */
  justify-content: space-between;  /* distributes the authored negative space predictably */
  align-items: baseline;  /* keeps related elements aligned as one visual unit */
  gap: calc(32px * var(--scale));  /* sets a deliberate seam between distinct information */
}
/* The flexible content column may wrap without widening the complete graphic. */
.infographic-head-left {
  display: flex;  /* selects the layout model the composition depends on */
  align-items: baseline;  /* keeps related elements aligned as one visual unit */
  gap: calc(16px * var(--scale));  /* sets a deliberate seam between distinct information */
  min-width: 0;  /* reserves the footprint needed by doubled-text stress */
}
/* The supporting voice stays subordinate while remaining broadcast-legible. */
.infographic-kicker {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  letter-spacing: var(--label-tracking);  /* uses tracking to reinforce the family voice */
  text-transform: uppercase;  /* normalizes the label register regardless of input case */
  color: var(--label-color);  /* assigns the intended hierarchy and contrast role */
}
/* Numeric hierarchy makes the changing value readable without competing with its label. */
.infographic-current {
  font-family: var(--font-numeric);  /* uses the designated voice for this kind of information */
  font-size: calc(45px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  font-variant-numeric: tabular-nums;  /* holds live digits to a stable box width */
  color: var(--text-color);  /* assigns the intended hierarchy and contrast role */
}
/* Numeric hierarchy makes the changing value readable without competing with its label. */
.infographic-reached {
  font-family: var(--font-numeric);  /* uses the designated voice for this kind of information */
  font-size: calc(25px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  font-variant-numeric: tabular-nums;  /* holds live digits to a stable box width */
  white-space: nowrap;  /* protects a short atomic value from breaking */
  color: var(--accent);  /* assigns the intended hierarchy and contrast role */
}
/* The measured builder owns progress while this rule preserves the designed lane geometry. */
.infographic-rail {
  position: relative;  /* anchors the element without adding layout reflow */
  margin-top: calc(29px * var(--scale));  /* separates this voice from the one above it */
  padding-top: calc(11px * var(--scale));  /* reserves room for the rail and its markers */
}
/* The measured builder owns progress while this rule preserves the designed lane geometry. */
.infographic-milestone-track {
  height: var(--accent-weight);  /* fixes the authored vertical footprint */
  background: rgba(255,255,255,.2);  /* provides the family surface or contrast this element needs */
  overflow: hidden;  /* clips media and measured fills to their authored slots */
}
/* The measured builder owns progress while this rule preserves the designed lane geometry. */
.infographic-milestone-fill {
  width: 0;  /* fixes the authored horizontal footprint */
  height: 100%;  /* fixes the authored vertical footprint */
  background: var(--accent);  /* provides the family surface or contrast this element needs */
  will-change: width;  /* hints the exact property the entrance animates */
}
/* Even node geometry keeps labels readable regardless of the milestone values. */
.infographic-nodes {
  display: flex;  /* selects the layout model the composition depends on */
  margin-top: calc(-13px * var(--scale));  /* separates this voice from the one above it */
}
/* Even node geometry keeps labels readable regardless of the milestone values. */
.infographic-node {
  flex: 1 1 0;  /* protects the intended share of available space */
  min-width: 0;  /* reserves the footprint needed by doubled-text stress */
  display: flex;  /* selects the layout model the composition depends on */
  flex-direction: column;  /* stacks the content in its intended reading order */
  align-items: center;  /* keeps related elements aligned as one visual unit */
  text-align: center;  /* keeps wrapped copy aligned with the composition */
}
/* Even node geometry keeps labels readable regardless of the milestone values. */
.infographic-node-dot {
  width: calc(20px * var(--scale));  /* fixes the authored horizontal footprint */
  height: calc(20px * var(--scale));  /* fixes the authored vertical footprint */
  border: calc(2px * var(--scale)) solid rgba(255,255,255,.45);  /* draws one restrained keyline against moving video */
  border-radius: 50%;  /* follows the family corner language */
  background: rgba(7,9,13,.9);  /* provides the family surface or contrast this element needs */
}
/* The derived reached state uses accent and contrast to distinguish completed milestones. */
.infographic-node.is-reached .infographic-node-dot {
  border-color: var(--accent);  /* raises the derived state without changing geometry */
  background: var(--accent);  /* provides the family surface or contrast this element needs */
}
/* Even node geometry keeps labels readable regardless of the milestone values. */
.infographic-node-target {
  margin-top: calc(11px * var(--scale));  /* separates this voice from the one above it */
  font-family: var(--font-numeric);  /* uses the designated voice for this kind of information */
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 700;  /* separates this voice without introducing another typeface */
  font-variant-numeric: tabular-nums;  /* holds live digits to a stable box width */
  color: var(--text-dim);  /* assigns the intended hierarchy and contrast role */
}
/* Even node geometry keeps labels readable regardless of the milestone values. */
.infographic-node-label {
  margin-top: calc(4px * var(--scale));  /* separates this voice from the one above it */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* sets the hierarchy while staying above the broadcast floor */
  font-weight: 600;  /* separates this voice without introducing another typeface */
  line-height: 1.25;  /* keeps wrapped copy compact but readable */
  letter-spacing: var(--label-tracking);  /* uses tracking to reinforce the family voice */
  text-transform: uppercase;  /* normalizes the label register regardless of input case */
  overflow-wrap: break-word;  /* breaks hostile operator text before it escapes */
  color: var(--text-dim);  /* assigns the intended hierarchy and contrast role */
}
/* The derived reached state uses accent and contrast to distinguish completed milestones. */
.infographic-node.is-reached .infographic-node-target {
  color: var(--accent);  /* assigns the intended hierarchy and contrast role */
}
/* Reached tiers gain contrast from derived data while every node keeps the same geometry. */
.infographic-node.is-reached .infographic-node-label {
  color: var(--text-color);  /* assigns the intended hierarchy and contrast role */
}`,
      fields: [
        {
          field: 'f0',
          ftype: 'textarea',
          title: o.lines[0]?.title || 'Milestones',
          value: milestonesText,
        },
        {
          field: 'f1',
          ftype: 'number',
          title: o.lines[1]?.title || 'Current',
          value: currentText,
        },
        {
          field: 'f2',
          ftype: 'textfield',
          title: 'Label',
          value: 'MILESTONES',
        },
      ],
      runtimeExtraJs: milestoneRuntimeJs(),
    };
  },
);
