// pi10 "Source Folio" - editorial source attribution and sibling of lt31 "Standfirst".
// A source is obligatory public information, so the qualifier stays legible and the design
// remains a flat printed surface rather than a decorative chip.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { definePublicInfoVariant, piMasks } from './shared';

export const pi10: TemplateVariant = definePublicInfoVariant(
  {
    id: 'pi10',
    category: 'public-info',
    name: 'Source Folio',
    styleTag: 'editorial',
    description: 'Source and qualifier on a compact flat paper folio with one printed rule.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Source', sample: 'Source · National Statistics Office' },
      { title: 'Qualifier', sample: 'Quarterly release · seasonally adjusted · 30 July 2026' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'fade', 'slide-up'],
    defaultPalette: paletteById('broadsheet'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-right',
  },
  {
    name: 'Source Folio',
    description:
      'The source attribution in the compact lt31 Standfirst family: one exact 2 px printed ' +
      'rule, a clear source and its qualifier on a flat paper surface.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Source Folio: source above its date, method or qualifier. -->
    <div class="public-info-box">
      <div class="public-info-accent"></div>
${piMasks(o, [
  [0, 'public-info-source'],
  [1, 'public-info-qualifier'],
])}
    </div>`,
    css: `/* The source folio - a flat printed surface, square and compact. */
.public-info-box {
  padding: calc(24px * var(--scale)) calc(31px * var(--scale)) calc(26px * var(--scale));
  background: var(--panel-bg);     /* paper surface */
  border-radius: var(--panel-radius); /* exact editorial zero */
  box-shadow: var(--panel-shadow); /* restrained printed-sheet lift */
  text-align: right;               /* aligns toward the right anchor */
}

.public-info-accent {
  width: calc(150px * var(--scale)); /* short source rule */
  height: var(--accent-weight);     /* exact editorial 2 px */
  margin: 0 0 calc(15px * var(--scale)) auto; /* aligns to the right reading edge */
  background: var(--accent);       /* the single accent colour */
  transform-origin: right center;  /* draws inward from the frame edge */
  will-change: transform;          /* animated by line-reveal */
}

.public-info-source {
  font-size: calc(25px * var(--scale) * var(--type-scale)); /* source stays readily legible */
  font-weight: var(--display-weight); /* exact editorial 600 */
  line-height: 1.25;               /* supports wrap */
  letter-spacing: var(--display-tracking); /* exact editorial -0.015em */
  color: var(--text-color);        /* primary ink */
}

.public-info-qualifier {
  display: block;                  /* qualifier owns the next row */
  max-width: calc(620px * var(--scale)); /* readable compact measure */
  margin-top: calc(9px * var(--scale)); /* tied to the source */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* broadcast floor */
  font-weight: 600;                /* survives compression */
  line-height: 1.35;               /* supports a wrapped method line */
  color: var(--text-dim);          /* subordinate but never omitted */
}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 790,
  }),
);
