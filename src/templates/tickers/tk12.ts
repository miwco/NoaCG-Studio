// tk12 "Upper Crawl" — the ticker that lives at the TOP of the frame.
//
// An upper ticker is not a bottom ticker moved upward. Three things change, and all three are
// about what it sits against: the accent edge goes on the BOTTOM (the strip's edge should face
// the picture, not the frame edge it is tucked into); the strip is slimmer, because the top of
// frame is where channel bugs, clocks and platform chrome already live; and the type is a
// notch smaller for the same reason. The zone default is the visible half of the difference,
// but the design is the rest of it.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineTickerVariant } from './shared';

export const tk12: TemplateVariant = defineTickerVariant(
  {
    id: 'tk12',
    category: 'ticker',
    name: 'Upper Crawl',
    styleTag: 'minimal',
    description: 'A slim crawl for the TOP of frame — accent edge below, tuned to sit under chrome.',
    maxLines: 2,
    suggestedLines: [
      {
        title: 'Items',
        sample: [
          'Live coverage continues throughout the afternoon',
          'Results from every constituency as they are declared',
          'Turnout figures updated on the hour',
        ].join('\n'),
      },
      { title: 'Label', sample: 'Live' },
    ],
    logo: 'none',
    animationPresets: ['ticker-marquee'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'top-center',
  },
  {
    name: 'Upper Crawl',
    description:
      'The upper ticker: slimmer than a bottom strip, quieter type, and its accent edge on ' +
      'the underside so the strip reads as hanging from the top of frame rather than floating ' +
      'in it. Built to coexist with a channel bug and a clock.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Upper Crawl: label left, items travelling right. Accent edge on the UNDERSIDE. -->
    <div class="ticker-box">
      <!-- The label block — the strip's single accent moment. -->
      <div class="ticker-label"><span id="f1">${o.lines[1]?.sample || 'Live'}</span></div>
      <!-- The scrolling window — rebuildTicker() injects the items into the track. -->
      <div class="ticker-viewport">
        <div id="ticker-track"></div>
      </div>
    </div>`,
    css: `/* The strip — slim, and edged along the BOTTOM: the accent faces the picture, which is
   what makes an upper strip read as attached to the frame rather than floating over it. */
.ticker-box {
  display: flex;                   /* label left, viewport filling the rest */
  align-items: stretch;            /* the label block spans the full strip height */
  width: calc(2585px * var(--scale));  /* near full-width, inside the safe areas */
  height: calc(89px * var(--scale));   /* slimmer than a bottom strip — the top of frame is busy */
  background: var(--panel-bg);     /* near-black bar — never pure #000 */
  border-bottom: var(--accent-weight) solid var(--accent);  /* the edge faces the picture */
  will-change: opacity;            /* hint the browser: the preset fades this */
}

/* The label block — solid accent, dark ink. */
.ticker-label {
  display: flex;                   /* center the label text inside the block */
  align-items: center;             /* vertical centering */
  flex-shrink: 0;                  /* never squeezed by the scrolling viewport */
  padding: 0 calc(37px * var(--scale));  /* tighter than a bottom strip's — less height to fill */
  background: var(--accent);       /* the one solid accent surface */
  font-size: calc(25px * var(--scale) * var(--type-scale)); /* small: an upper strip whispers */
  font-weight: 700;                /* bold so the small caps carry */
  letter-spacing: var(--label-tracking);  /* the label block's authored tracking */
  text-transform: uppercase;       /* reads as a tag, whatever the operator types */
  color: var(--accent-ink);        /* the family's ink on an accent-filled block */
}

/* The scrolling window — items travel through it and clip at its edges. */
.ticker-viewport {
  flex-grow: 1;                    /* take all the strip width the label leaves */
  overflow: hidden;                /* the marquee window — items vanish at the edges */
  display: flex;                   /* so the track can be vertically centered */
  align-items: center;             /* items sit on the strip's centerline */
}

/* The track — one endless row of items; the marquee preset slides its x. */
#ticker-track {
  display: inline-flex;            /* items in a single row, width = content */
  align-items: center;             /* items and separators share a baseline zone */
  white-space: nowrap;             /* never wrap — the track is one continuous line */
  padding-left: calc(43px * var(--scale)); /* air between the label and the first item */
  will-change: transform;          /* the marquee animates x every frame */
}

/* One item — a notch smaller than a bottom strip's, on purpose. */
.ticker-item {
  font-size: calc(29px * var(--scale) * var(--type-scale)); /* readable, deliberately unassertive */
  font-weight: 500;                /* weight, not size, keeps small text legible */
  color: var(--text-color);        /* primary text color */
}

/* The separator between items. */
.ticker-sep {
  margin: 0 calc(37px * var(--scale)); /* even air on both sides */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* small — a pause, not a bullet point */
  color: var(--text-dim);          /* dimmed so the items stay the focus */
}`,
    rowBuilderJs: `// renderTickerItem(text): one item followed by a small dim dot separator.
function renderTickerItem(text) {
  return '<span class="ticker-item">' + text + '</span>' +
         '<span class="ticker-sep">\\u2022</span>';
}`,
    doubleItems: true,
    tokens: { accentWeight: 'calc(3px * var(--scale))', labelTracking: '0.12em' },
  }),
);
