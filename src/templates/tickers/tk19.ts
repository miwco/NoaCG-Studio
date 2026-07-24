// tk19 "Advisory Rotator" — the house public-information strip: one advisory at a time, held
// long enough to read properly, advanced by the graphic's own timer and pausable on air.
//
// This is the rotating counterpart of tk15's crawl, and the choice between them is a real
// editorial one rather than a taste one. A crawl is right when the notices are a background
// service a viewer dips into; a rotator is right when each notice has to be read in full, by
// everybody, and the operator has to be able to hold one because somebody is asking about it.
// Emergency communications use both, for exactly those two jobs.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineTickerVariant } from './shared';

export const tk19: TemplateVariant = defineTickerVariant(
  {
    id: 'tk19',
    category: 'ticker',
    name: 'Advisory Rotator',
    styleTag: 'noacg',
    description: 'Public advisories one at a time — timed, holdable, and read in full.',
    maxLines: 2,
    suggestedLines: [
      {
        title: 'Advisories',
        sample: [
          'Residents of the harbour district should stay indoors until further notice',
          'The coast road is closed between the ferry terminal and the north pier',
          'Emergency shelters are open at the sports hall and the community centre',
          'Keep emergency lines free — call 116 117 for health advice',
        ].join('\n'),
      },
      { title: 'Label', sample: 'Advisory' },
    ],
    logo: 'none',
    animationPresets: ['ticker-rotate'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Advisory Rotator',
    description:
      'The house advisory strip: the void panel and mono label block of the news wire, but ' +
      'holding one notice at a time in full-size type instead of running them past. The ' +
      'operator can pause it on whichever advisory is being asked about.',
    uicolor: '4',
  },
  (o) => ({
    html: `    <!-- Advisory Rotator: mono label left, one advisory at a time in the slot. -->
    <div class="ticker-box">
      <!-- The label block — the strip's one solid accent surface. -->
      <div class="ticker-label"><span id="f1">${o.lines[1]?.sample || 'Advisory'}</span></div>
      <!-- The slot. The rotator replaces its contents on each beat of the machine. -->
      <div class="ticker-viewport">
        <div id="ticker-track"></div>
      </div>
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The strip — the house void turned horizontal, with a half-strength accent top edge. */
.ticker-box {
  display: flex;                   /* label left, slot filling the rest */
  align-items: stretch;            /* the label block spans the full strip height */
  width: calc(1560px * var(--scale));  /* wide, inside the safe areas */
  min-height: calc(96px * var(--scale)); /* a floor: a long advisory wraps and the strip grows */
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);      /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-top: calc(3px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);
  will-change: opacity;            /* hint the browser: the preset fades this */
}

/* The label block — solid accent, dark mono ink, the house glow. */
.ticker-label {
  display: flex;                   /* center the label text inside the block */
  align-items: center;             /* vertical centering */
  flex-shrink: 0;                  /* never squeezed by the slot */
  padding: 0 calc(34px * var(--scale));  /* generous horizontal breathing room */
  background: var(--accent);       /* the one solid accent surface */
  box-shadow: var(--accent-glow);  /* the house glow around the accent block */
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(21px * var(--scale) * var(--type-scale)); /* label scale */
  font-weight: 700;                /* bold mono caps read as a stamp */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as a tag, whatever the operator types */
  color: var(--accent-ink);        /* dark ink on the accent block */
  white-space: nowrap;             /* the label never wraps */
}

/* The slot. The rotate preset's shared CSS (templates/tickers/shared.ts) already turns the
   track into an ordinary wrapping block; this just gives it its padding and centreline. */
.ticker-viewport {
  flex-grow: 1;                    /* take all the strip width the label leaves */
  display: flex;                   /* so the current advisory can be vertically centered */
  align-items: center;             /* the advisory sits on the strip's centerline */
  padding: calc(16px * var(--scale)) calc(36px * var(--scale));
  /* Flush LEFT, whatever anchor zone the graphic is placed in. The root's zone rule sets
     text-align from the anchor, and a centred advisory that wraps to two lines gives the
     reader a ragged left edge to find on every line — the wrong trade for a notice people
     have to read once, quickly, and act on. */
  text-align: left;
}

/* One advisory — larger than a crawl item, because this one is meant to be read in full
   rather than caught in passing. */
.ticker-item {
  font-size: calc(28px * var(--scale) * var(--type-scale)); /* full reading size */
  font-weight: 500;                /* a touch of presence without shouting */
  line-height: 1.26;               /* comfortable across a wrap */
  color: var(--text-color);        /* primary text color */
}`,
    rowBuilderJs: `// renderTickerItem(text): one advisory. The rotator shows a single item, so there is
// no separator to draw — the strip's own edges are the punctuation.
function renderTickerItem(text) {
  return '<span class="ticker-item">' + text + '</span>';
}`,
    doubleItems: false,
    tokens: { labelTracking: '0.16em', accentInk: 'rgba(10, 12, 16, 0.95)' },
  }),
);
