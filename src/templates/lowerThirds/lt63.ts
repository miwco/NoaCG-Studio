// lt63 "Broadsheet Band" - the full-width news band: a paper-white bar that reaches both frame
// edges, with the name and its role set on ONE row behind a printed rule.
//
// The absence this answers is docs/CATALOG_WORK_QUEUE.md §1: 99 of the 103 lower thirds render
// as `strap/thin` - an inset, content-sized plate. The catalog has one silhouette and dresses it
// 103 ways, and no amount of re-ordering can create a shape it does not contain. This is the
// FULL-WIDTH BAND: the shape a broadcaster reaches for when the graphic should read as the
// programme's own furniture rather than as a label stuck onto the picture.
//
// TWO deliberate departures from the category's defaults, both of them the point of the design:
//
//  1. IT LEAVES THE SAFE AREA, on purpose. Every other lower third is inset by the zone's
//     horizontal safe margin. A band that stopped short of the edges would read as a very wide
//     plate, not as a band - the edge contact IS the silhouette. Broadcast practice agrees: the
//     safe area is a promise about TEXT, not about a bar, so the band spans edge to edge and the
//     words inside it keep the full inset. The zone's horizontal half is therefore overridden
//     below; its VERTICAL half (top / mid / bottom) still decides where the band sits.
//     The CONTENT keeps the leading edge in all nine zones too, and that is the same decision
//     rather than an oversight: the lines are laid out as a flex row so they can share one
//     baseline, and a flex row does not read `text-align`. A band is programme furniture whose
//     words start where the reader's eye starts; there is no version of it whose name floats in
//     the middle of the picture. So the horizontal third of the zone picker genuinely has
//     nothing to say to this design, in either half.
//  2. THE LINES SHARE ONE ROW. The structure contract gives each line its own mask; a flex row
//     lays those masks side by side instead of stacking them, and each mask after the first
//     carries the printed rule that separates it from the one before. That is what a band is
//     for - it is wide and it is thin, so hierarchy has to run across it rather than down it.
//
// The palette is Broadsheet: near-white paper, ink-dark type, a navy accent. Seven of the
// catalog's 103 lower thirds carry a light backdrop, so a light band is a second axis of variety
// riding along with the shape - and Broadsheet's dimmed ink clears AA on its own paper
// (docs/CATALOG_VARIETY.md §5.2 is about WHITE dim text on a light panel, the other direction).

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt63: TemplateVariant = defineVariant(
  {
    id: 'lt63',
    category: 'lower-third',
    name: 'Broadsheet Band',
    styleTag: 'editorial',
    description: 'A full-width paper band: name and role on one row, separated by printed rules.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Name', sample: 'Aino Virtanen' },
      { title: 'Role', sample: 'Political Editor' },
      { title: 'Location', sample: 'Helsinki' },
    ],
    // No mark slot. The lower-third rule is that a mark goes BESIDE the words, and on a single
    // shared row "beside" is where the next LINE already is - a mark there would read as a
    // fourth column of content rather than as an identity.
    logo: 'none',
    animationPresets: ['mask-wipe', 'slide-up', 'line-reveal', 'fade', 'blur-in', 'slide-down'],
    defaultPalette: paletteById('broadsheet'),
    defaultFontId: 'libre-franklin',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Broadsheet Band',
    description:
      'The newspaper band: a paper-white bar reaching both edges of the frame under a navy ' +
      'hairline, with the name and its role set on one row and divided by printed rules. The ' +
      'first lower third in the catalog whose silhouette is the whole width of the picture.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Broadsheet Band: a hairline rule over a full-width paper band; the lines share one row. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${lineMasks(o, '      ')}
    </div>`,
    css: `/* THE BAND'S OWN WIDTH. This overrides the anchor zone's horizontal half, which is the
   design's one structural departure and is explained at the top of this file: a band that
   stopped at the safe margin would read as a wide plate, and the edge contact is the shape.
   The zone still decides the VERTICAL position, so top / mid / bottom all work. */
.lower-third {
  left: 0;                         /* the band starts at the picture's left edge */
  right: 0;                        /* …and ends at its right one */
  transform: none;                 /* a centre zone's translate would slide a full-width bar off */
}

/* The paper. Its height comes from the type inside it, so the band stays thin however tall the
   operator's text is set - the shape survives a larger --type-scale. */
.lower-third-box {
  display: flex;                   /* the lines run ACROSS the band, not down it */
  align-items: baseline;           /* one printed row: every line sits on the same baseline */
  width: 100%;                     /* the whole width, not the text's width */
  max-width: none;                 /* the category's wrap cap is about a plate, not about a band */
  box-sizing: border-box;          /* the safe-area padding is inside the band's own width */
  padding: calc(15px * var(--scale)) calc(120px * var(--scale));  /* the words keep the full safe inset the band gives up */
  background: var(--panel-bg);     /* paper - the family's panel surface, so a palette repaints it */
  box-shadow: 0 calc(-1px * var(--scale)) calc(28px * var(--scale)) rgba(0, 0, 0, 0.28);  /* the band lifts off the picture without a keyline */
}

/* The navy hairline that opens the band, fused to its top edge and running the same full width.
   It is a SIBLING of the box rather than a child so it cannot become a flex item on the row. */
.lower-third-accent {
  /* A RULE'S WEIGHT HAS TO ANSWER ITS LENGTH, which is why this is the one place the design
     leaves the family token behind. Editorial sets --accent-weight at 2px, drawn for a rule a
     few hundred pixels long across an inset plate; this one runs the whole 1920, so at the
     family value it is a 1:960 hairline - proportionally four times thinner than anything else
     the family ships, and it disappears rather than reading as restraint. Measured on the
     rendered card (scripts/card-look-sweep.mjs), the band at 2px registered NO accent colour at
     all: the catalog's own instrument could not find the navy. A masthead rule is a heavy rule,
     and 6px over 1920 is still 1:320. */
  height: calc(6px * var(--scale));  /* the masthead rule, weighted for the width it crosses */
  background: var(--accent);       /* the one accent dose */
  transform-origin: left center;   /* the entrance draws the rule from the leading edge */
  will-change: transform;          /* hints the exact property the entrance animates */
}

/* Every line after the first carries the rule that divides it from the line before - a printed
   band separates its columns with a rule, not with a bullet.
   ON THE LINE ITSELF, not on its mask, and that is the half of this that is not cosmetic: an
   emptied line has to take its own divider with it, so a name-only band is a name-only band
   rather than a name followed by two empty ruled columns. Hanging the rule on the mask would
   need :has() to hide it, and :has() is Chromium 105 while OBS 30 and vMix 27 render on a
   Chromium 103 CEF - it would simply not apply on two of the engines we ship to. Setting it here
   and hiding the empty span (below) works on every one of them. */
.lower-third-title,
.lower-third-extra {
  margin-left: calc(22px * var(--scale));   /* air before the rule */
  padding-left: calc(22px * var(--scale));  /* …and after it */
  border-left: 1px solid color-mix(in srgb, var(--text-color) 28%, transparent);  /* the printed divider */
}

/* A cleared line, and its divider with it. The mask around it stays, at zero width - the presets
   still address it, and it draws nothing. */
.lower-third-title:empty,
.lower-third-extra:empty {
  display: none;                   /* the operator can clear any line without leaving a ruled gap */
}

/* The name - the band's one piece of display type, and deliberately not much bigger than the
   role: a band reads across, so the hierarchy is weight and colour rather than size. */
.lower-third-name {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* sized so the band stays thin */
  font-weight: var(--display-weight);  /* the family's heading weight */
  line-height: 1.1;                /* a single row */
  letter-spacing: var(--display-tracking);  /* the family's heading tracking */
  color: var(--text-color);        /* ink */
}

/* The role, and any line after it: the same row, one step quieter. */
.lower-third-title,
.lower-third-extra {
  font-size: calc(27px * var(--scale) * var(--type-scale));  /* above the secondary floor, clearly under the name */
  font-weight: 500;                /* the reading weight */
  line-height: 1.2;                /* still one row */
  letter-spacing: 0.01em;          /* text this size needs no help */
  color: var(--text-dim);          /* dimmed ink on paper - AA at this size (see the file head) */
}

/* The last line is the standing detail - a place, a programme - so it is set as a tracked label
   the way a newspaper sets its dateline. */
.lower-third-extra {
  font-family: var(--font-label);  /* the design-owned label face */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* the smallest type here, above the floor */
  letter-spacing: var(--label-tracking);  /* a dateline tracks wide */
  text-transform: uppercase;       /* …and is set in caps whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
}`,
    hasAccent: true,
  }),
);
