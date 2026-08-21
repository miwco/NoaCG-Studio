// card81 "Lowercase Title" - the title card with no capitals on it anywhere, printed on paper.
//
// The sibling of lt60 (docs/DESIGN_LANGUAGE.md §8), and the same measured absence: 88.5% of the
// catalog shouts somewhere in uppercase and there was no design whose whole hierarchy was built
// without capitals (docs/CATALOG_VARIETY.md §3 absence 3). Where the strap builds that hierarchy
// out of WEIGHT in two columns, the card builds it out of SIZE in one column - a card has the
// room a strap does not, and a 92px lowercase title with a 24px lowercase kicker over it is a
// complete hierarchy with nothing shouted and nothing drawn.
//
// It is on paper (Porcelain) rather than ink because the quiet voice this pack is missing -
// arts, design, wellness, fashion - is a light-package voice, and a light PALETTE on a design
// drawn for the dark is what §5.3 measured 321 designs failing to honour. This one draws its
// own reading surface, so the contrast is between the ink and the paper and nothing else.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

export const card81: TemplateVariant = defineCardVariant(
  {
    id: 'card81',
    category: 'info-card',
    name: 'Lowercase Title',
    styleTag: 'minimal',
    description:
      'A paper title card with no capitals: a small kicker, a large lowercase title, one quiet line under it.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Kicker', sample: 'episode four' },
      { title: 'Title', sample: 'the quiet hours' },
      { title: 'Subtitle', sample: 'what a city sounds like when nobody is listening' },
    ],
    logo: 'none',
    animationPresets: [
      'fade',
      'line-reveal',
      'blur-in',
      'slide-up',
      'mask-wipe',
      'pop-spring',
    ],
    defaultPalette: paletteById('porcelain'),
    defaultFontId: 'dm-sans',
    defaultZone: 'mid-center',
  },
  {
    name: 'Lowercase Title',
    description:
      'A title card set entirely in lower case on a paper surface: a short accent rule and a ' +
      'small kicker, a large light-weight title, and one supporting line.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Lowercase Title: a short rule, a small kicker, the title, one line under it. -->
    <div class="info-card-box">
      <!-- The one drawn mark: a short rule beside the kicker rather than above the block. -->
      <div class="info-card-accent"></div>
${maskLines([
  maskLine('info-card', o, 0, 'info-card-kicker', '      '),
  maskLine('info-card', o, 1, 'info-card-title', '      '),
  maskLine('info-card', o, 2, 'info-card-sub', '      '),
])}
    </div>`,
    css: `/* The paper. Opaque by construction, so the near-black type reads against the card and
   never against the picture behind it. */
.info-card-box {
  width: calc(880px * var(--scale));  /* a settled measure - the title wraps inside it, not against the frame */
  max-width: calc(880px * var(--scale));  /* overrides the category cap: this card sets its own page */
  padding: calc(52px * var(--scale)) calc(56px * var(--scale)) calc(56px * var(--scale));  /* the card's generous, unhurried margins */
  text-align: left;  /* the short rule hangs off the left edge, so the type is set to it */
  background: var(--panel-bg);  /* the palette's paper - repaints with the palette */
  border-radius: var(--panel-radius);  /* the family's corner language */
  box-shadow: var(--panel-shadow);  /* one soft lift off the picture */
}

/* The short rule - the only drawn element, and the design's single dose of accent. */
.info-card-accent {
  width: calc(64px * var(--scale));  /* short: a mark, not a divider across the card */
  height: var(--accent-weight);  /* the family's accent weight */
  margin-bottom: calc(20px * var(--scale));  /* air between the mark and the kicker */
  background: var(--accent);  /* the accent, used once */
  transform-origin: left center;  /* the reveal grows the rule from the text's own edge */
  will-change: transform;  /* hints the exact property the entrance animates */
}

/* The kicker - lower case like everything else, so the hierarchy is size and weight alone. */
.info-card-kicker {
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* label scale, above the broadcast floor */
  font-weight: 500;  /* medium: firm without becoming a shout */
  line-height: 1.25;  /* one comfortable label row */
  letter-spacing: 0.06em;  /* lower-case labels need tracking where caps would carry themselves */
  text-transform: lowercase;  /* a design about case never leaves case to the operator */
  color: var(--text-dim);  /* secondary ink */
}

/* The title - large and light. Size does what capitals usually do. */
.info-card-title {
  margin-top: calc(16px * var(--scale));  /* separates the title from its kicker */
  font-size: calc(92px * var(--scale) * var(--type-scale));  /* the card's display scale */
  font-weight: 400;  /* the lightest weight this face carries - the quiet is deliberate */
  line-height: 1.02;  /* big type stacks tight when the title wraps */
  letter-spacing: -0.02em;  /* very big type closes up */
  text-transform: lowercase;  /* no capitals anywhere on this card */
  color: var(--text-color);  /* the ink */
}

/* The supporting line - the only place a heavier weight appears, and it is the SMALLEST line. */
.info-card-sub {
  margin-top: calc(22px * var(--scale));  /* clear of the title's descenders */
  max-width: calc(620px * var(--scale));  /* holds the line to a readable measure inside the card */
  font-size: calc(27px * var(--scale) * var(--type-scale));  /* reading size, comfortably above the floor */
  font-weight: 500;  /* the inversion: the small line is the firm one */
  line-height: 1.38;  /* prose leading - this line is read */
  text-transform: lowercase;  /* consistent with every other line */
  color: var(--text-dim);  /* secondary ink */
}

/* Either supporting line may be cleared without leaving a gap behind it. */
.info-card-kicker:empty,
.info-card-sub:empty {
  display: none;  /* an empty field takes no space at all */
}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 880,
  }),
);
