// card82 "Poster Topic" - the condensed-poster topic card: an outlined index numeral the height
// of the whole card, and the topic set beside it in a condensed display face.
//
// The sibling of lt61 (docs/DESIGN_LANGUAGE.md §8) - same poster voice, same condensed family,
// the card version of the same billing. Two measured absences meet in it: condensed-poster
// typography (docs/CATALOG_VARIETY.md §3 absence 4 - three faces bundled to do it, four designs
// using any of them) and type as the composition (absence 8 - the catalog's display size tops
// out around 52px for a fifth of it).
//
// The index is drawn as an OUTLINE rather than filled, which is the one decision that makes a
// 168px numeral sit beside a 96px word instead of drowning it: an outlined figure reads as
// structure - a chapter marker printed on the sheet - and a filled one reads as the content.
// The number is typed once per graphic and never repainted, so it is deliberately NOT under the
// numerals contract (docs/DESIGN_LANGUAGE.md §1: that rule is for figures that change on air).

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

export const card82: TemplateVariant = defineCardVariant(
  {
    id: 'card82',
    category: 'info-card',
    name: 'Poster Topic',
    styleTag: 'sport',
    description:
      'A poster topic card: a big outlined index numeral beside a condensed display topic and one detail line.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Index', sample: '03' },
      { title: 'Topic', sample: 'THE MIDNIGHT SET' },
      { title: 'Detail', sample: 'Live from Studio B · 23:00' },
    ],
    logo: 'none',
    animationPresets: [
      'snap-stinger',
      'mask-wipe',
      'slide-left',
      'line-reveal',
      'pop-spring',
      'fade',
    ],
    defaultPalette: paletteById('inferno'),
    defaultFontId: 'big-shoulders',
    defaultZone: 'mid-center',
  },
  {
    name: 'Poster Topic',
    description:
      'The poster bill as a topic card: an outlined index numeral running the height of the ' +
      'block, the topic set large in a condensed display face beside it, and one detail line ' +
      'under an accent bar.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Poster Topic: outlined index / topic at poster scale / accent bar / detail line. -->
    <div class="info-card-box">
${maskLines([maskLine('info-card', o, 0, 'info-card-index', '      ')])}
      <!-- The words column, beside the index rather than under it. -->
      <div class="info-card-billing">
${maskLines([maskLine('info-card', o, 1, 'info-card-topic', '        ')])}
        <!-- The sport family's heavy bar, between the topic and its detail. -->
        <div class="info-card-accent"></div>
${maskLines([maskLine('info-card', o, 2, 'info-card-detail', '        ')])}
      </div>
    </div>`,
    css: `/* The slab, cut into two columns: the index sets the left one, the words take the rest. */
.info-card-box {
  display: grid;  /* the index and the billing are columns, not a stack */
  grid-template-columns: auto minmax(0, 1fr);  /* the index hugs its digits; the words take what is left */
  align-items: center;  /* index and billing share one centre line */
  column-gap: calc(38px * var(--scale));  /* the gutter between the marker and the words */
  width: fit-content;  /* the slab hugs the bill - a poster is trimmed to its words, so this
                          design declares NO stageWidth: it is a hug inside a board category,
                          and claiming a stage it overrides here would only lie to the gate */
  max-width: calc(1160px * var(--scale));  /* overrides the category cap: a long topic may run this wide */
  padding: calc(40px * var(--scale)) calc(48px * var(--scale));  /* the poster's printed margins */
  text-align: left;  /* the bill is set off the index, which sits on the left */
  background-color: var(--panel-bg);  /* the solid slab this family is built on */
  background-image: repeating-linear-gradient(45deg, color-mix(in srgb, var(--text-color) 5%, transparent) 0 1px, transparent 1px calc(5px * var(--scale)));  /* the screen-print texture a poster is pulled through */
  border-radius: var(--panel-radius);  /* the family's corner language (sport: square) */
  box-shadow: var(--panel-shadow);  /* the family's hard offset - a sticker slab, not a glow */
}

/* The index - an outlined figure at the height of the block. Drawn, not read: the stroke is
   what keeps a 168px numeral from outranking the topic beside it. */
.info-card-mask > .info-card-index {
  /* The index is an ATOMIC TOKEN - a chapter number, not a line of copy - so it is bounded by
     the catalog's clip rule (src/templates/AGENTS.md): the cap, the nowrap and the ellipsis all
     sit on the SPAN, because overflow: hidden on the mask around it clips the PAINT and
     leaves the layout box its full width, which is what lets a long value reach the words.
     The CHILD selector and the text-wrap longhand are both load-bearing: the assembler's
     .info-card-mask > span { text-wrap: balance } outranks a plain white-space: nowrap. */
  max-width: calc(300px * var(--scale));  /* a marker's whole budget - past this it ellipsises */
  white-space: nowrap;  /* one line (the shorthand, for older engines) */
  text-wrap: nowrap;  /* one line - the longhand that actually beats the category's balance */
  overflow: hidden;  /* with the two rules around it, this is what makes the ellipsis appear */
  text-overflow: ellipsis;  /* an over-long index is cut honestly rather than pushing the bill */
  font-size: calc(168px * var(--scale) * var(--type-scale));  /* poster scale - the marker IS the composition */
  font-weight: 700;  /* a heavy stroke, since the fill is taken away */
  line-height: 0.82;  /* the figure sits tight against its own cap height */
  letter-spacing: -0.02em;  /* very big condensed figures close up */
  color: transparent;  /* the fill is removed so the numeral reads as printed structure */
  -webkit-text-stroke: calc(3px * var(--scale)) var(--accent);  /* the outline, in the one accent colour */
}

/* The words column. min-width:0 is load-bearing - a grid item refuses to shrink by default,
   which is exactly what pushes a long topic past the slab's edge. */
.info-card-billing {
  min-width: 0;  /* lets a long topic wrap instead of widening the card */
}

/* The topic at poster scale. This is the line the card exists for. */
.info-card-topic {
  font-size: calc(96px * var(--scale) * var(--type-scale));  /* poster display scale */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 0.94;  /* condensed display type stacks tight when it wraps */
  letter-spacing: -0.01em;  /* big type closes up slightly */
  text-transform: uppercase;  /* a bill is set in caps whatever the operator types */
  color: var(--text-color);  /* primary text colour */
}

/* The accent bar, between the topic and its detail rather than above the block. */
.info-card-accent {
  width: calc(150px * var(--scale));  /* a short heavy bar - a poster rule, not a divider */
  height: var(--accent-weight);  /* the sport family's heavy bar weight */
  margin: calc(20px * var(--scale)) 0;  /* even air above and below the bar */
  background: var(--accent);  /* the accent's second appearance, filled this time */
  transform-origin: left center;  /* the stinger draws the bar from the words' own edge */
  will-change: transform;  /* hints the exact property the entrance animates */
}

/* The detail line - the venue, the time, the billing note. */
.info-card-detail {
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* secondary voice, above the broadcast floor */
  font-weight: 500;  /* medium keeps small condensed type legible */
  line-height: 1.3;  /* may wrap to a second row */
  letter-spacing: 0.06em;  /* small condensed type needs air */
  text-transform: uppercase;  /* the bill stays in caps throughout */
  color: var(--text-dim);  /* secondary text colour */
}

/* An empty detail takes no space, so a topic-only bill is a shorter card. */
.info-card-detail:empty {
  display: none;  /* the operator can clear the line without leaving a hole */
}`,
    hasAccent: true,
  }),
);
