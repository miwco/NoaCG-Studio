// card80 "Broadsheet Title" - the printed title card: a masthead rule, a section kicker, a
// display serif headline, and a standfirst set in TWO COLUMNS the way a newspaper sets one.
//
// It is the sibling of lt59 (docs/DESIGN_LANGUAGE.md §8 - "would these two appear in the same
// show?"): same paper stock, same print register, same masthead rule, same serif. What the card
// adds is the thing a strap has no room for and the catalog had almost nowhere - a COLUMN GRID.
// 17 designs of 459 use grid columns at all (docs/CATALOG_VARIETY.md §3 absence 7), and none of
// them sets running text in a measure, which is the single most recognisable thing print does.
//
// The standfirst is a real multicol block, so it fills column one and flows into column two as
// the operator types - a fixed two-box layout would leave an empty right half on short copy.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

export const card80: TemplateVariant = defineCardVariant(
  {
    id: 'card80',
    category: 'info-card',
    name: 'Broadsheet Title',
    styleTag: 'editorial',
    description:
      'A printed title card on paper: masthead rule, serif headline, and a standfirst set in two columns.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Section', sample: 'THE SATURDAY ESSAY' },
      { title: 'Headline', sample: 'The Long Way Back to the River' },
      {
        title: 'Standfirst',
        sample:
          'Forty years after the mill closed, the valley is learning to live with the water again — and the people who stayed are the ones rewriting what the town is for.',
      },
      { title: 'Byline', sample: 'By Eleanor Whitfield · Photographs by Jonas Berg' },
    ],
    logo: 'none',
    animationPresets: [
      'line-reveal',
      'mask-wipe',
      'fade',
      'slide-up',
      'blur-in',
      'slide-left',
    ],
    defaultPalette: paletteById('broadsheet'),
    defaultFontId: 'playfair-display',
    defaultZone: 'mid-center',
  },
  {
    name: 'Broadsheet Title',
    description:
      'The newspaper page as a title card: a printed rule across the top, a wide-tracked ' +
      'section kicker, a display-serif headline, a two-column standfirst, and a byline under ' +
      'a closing rule.',
    uicolor: '4',
  },
  (o) => ({
    html: `    <!-- Broadsheet Title: masthead rule / section / headline / two-column standfirst / byline. -->
    <div class="info-card-box">
      <!-- The masthead rule. Editorial structure is a RULE, not a chip - it draws first. -->
      <div class="info-card-accent"></div>
${maskLines([
  maskLine('info-card', o, 0, 'info-card-section', '      '),
  maskLine('info-card', o, 1, 'info-card-headline', '      '),
  maskLine('info-card', o, 2, 'info-card-standfirst', '      '),
  maskLine('info-card', o, 3, 'info-card-byline', '      '),
])}
    </div>`,
    css: `/* The page. A fixed measure, because a column grid needs a width to divide - a
   fit-content card would re-cut its columns on every keystroke. */
.info-card-box {
  width: calc(940px * var(--scale));  /* the printed measure the two columns are cut from */
  max-width: calc(940px * var(--scale));  /* overrides the category cap: this card sets its own page */
  padding: calc(34px * var(--scale)) calc(44px * var(--scale)) calc(38px * var(--scale));  /* printed-page margins */
  text-align: left;  /* a printed page reads from one edge; the centred zone positions the SHEET, not the type */
  background-color: var(--panel-bg);  /* the palette's paper - repaints with the palette */
  background-image: repeating-linear-gradient(0deg, color-mix(in srgb, var(--text-color) 4%, transparent) 0 1px, transparent 1px calc(4px * var(--scale)));  /* the print register: a faint ruled texture */
  border-radius: var(--panel-radius);  /* the family's corner language (editorial: square) */
  clip-path: polygon(0 0, calc(100% - 64px * var(--scale)) 0, 100% calc(64px * var(--scale)), 100% 100%, 0 100%);  /* the trimmed corner a printed proof carries - the pack's paper signature (ss18, cr13) */
  filter: drop-shadow(0 calc(12px * var(--scale)) calc(36px * var(--scale)) rgba(0, 0, 0, 0.28));  /* one soft lift off the picture */
}
/* The shadow is a FILTER rather than the family's box-shadow token, and that is the trimmed
   corner's price: clip-path clips a box's paint, shadow included, so var(--panel-shadow)
   would simply never be drawn. drop-shadow follows the clipped silhouette instead. Its value
   is the editorial family's own (DESIGN_LANGUAGE §8) restated in filter syntax. */

/* The masthead rule - full width of the page, drawn before anything is read. */
.info-card-accent {
  width: 100%;  /* spans the whole printed measure */
  height: var(--accent-weight);  /* the family's printed-rule weight */
  margin-bottom: calc(18px * var(--scale));  /* clear air under the rule before the kicker */
  background: var(--accent);  /* the one accent dose in the design */
  transform-origin: left center;  /* the reveal draws the rule from the spine outward */
  will-change: transform;  /* hints the exact property the entrance animates */
}

/* The section kicker - wide-tracked caps in the accent, the masthead's own voice. */
.info-card-section {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* label scale, above the broadcast floor */
  font-weight: 600;  /* firm enough for small caps to carry */
  line-height: 1.2;  /* one tight label row */
  letter-spacing: var(--label-tracking);  /* the family's masthead tracking */
  text-transform: uppercase;  /* a section is set in caps whatever the operator types */
  color: var(--label-color);  /* the family's label colour - editorial accents its kickers */
}

/* The headline - the display serif, set rather than shouted. */
.info-card-headline {
  margin-top: calc(14px * var(--scale));  /* separates the headline from the kicker above it */
  font-size: calc(66px * var(--scale) * var(--type-scale));  /* display scale for a wrapping headline */
  font-weight: var(--display-weight);  /* editorial sets its display type at 600 */
  line-height: 1.04;  /* big serif type sits tight */
  letter-spacing: var(--display-tracking);  /* large display type tightens slightly */
  color: var(--text-color);  /* the ink */
}

/* The standfirst - running text in a real two-column measure, which is the card's whole point.
   Two overrides of the category's own span rule are needed and both are load-bearing:
   display:block because an inline-block never fragments across columns, and the balanced
   wrapping is turned off because multicol does its own balancing. */
.info-card-mask > .info-card-standfirst {
  display: block;  /* multicol only fragments block-level content */
  margin-top: calc(20px * var(--scale));  /* clear air under the headline */
  padding-top: calc(20px * var(--scale));  /* air below the dividing rule */
  border-top: 1px solid color-mix(in srgb, var(--text-color) 22%, transparent);  /* the rule that opens the body */
  columns: 2;  /* the printed measure, cut in two */
  column-gap: calc(44px * var(--scale));  /* a real gutter, so the columns read as separate */
  column-rule: 1px solid color-mix(in srgb, var(--text-color) 14%, transparent);  /* the printed gutter rule */
  font-size: calc(25px * var(--scale) * var(--type-scale));  /* reading size, comfortably above the floor */
  font-weight: 400;  /* the reading weight */
  line-height: 1.45;  /* prose leading - this is text to be read, not scanned */
  text-align: left;  /* a measure reads from one edge; centred columns are unreadable */
  text-wrap: initial;  /* multicol balances the columns; balanced wrapping would fight it */
  color: var(--text-dim);  /* secondary ink */
}

/* The byline - the smallest voice on the page, under a closing rule. It is a BLOCK for the
   same reason the standfirst is: an inline-block's rule would stop where the words stop. */
.info-card-mask > .info-card-byline {
  display: block;  /* so the closing rule runs the full printed measure */
  margin-top: calc(24px * var(--scale));  /* clear of the last column */
  padding-top: calc(16px * var(--scale));  /* air below the closing rule */
  border-top: var(--accent-weight) solid var(--accent);  /* the page closes on the same rule it opened with */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* the smallest type here, still above the floor */
  font-weight: 500;  /* medium keeps a small credit crisp */
  letter-spacing: 0.04em;  /* small type needs a little air */
  color: var(--text-color);  /* the credit is ink, not a whisper */
}

/* Either lower line may be cleared without leaving a rule stranded behind it. */
.info-card-standfirst:empty,
.info-card-byline:empty {
  display: none;  /* an empty field takes no space at all */
}`,
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 940,
  }),
);
