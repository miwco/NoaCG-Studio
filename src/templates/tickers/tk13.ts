// tk13 "Results Rail" — the results ticker. Items are written the way a results service
// writes them, "HOME 2 - 1 AWAY", and the runtime pulls the SCORE out of the middle and puts
// it in a chip of its own.
//
// That split is the entire design. A results crawl is scanned, not read: a viewer is looking
// for one fixture and one number, and a run of undifferentiated words makes them read every
// character to find it. Boxing the score gives the eye a rhythm to skip along.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineTickerVariant } from './shared';

export const tk13: TemplateVariant = defineTickerVariant(
  {
    id: 'tk13',
    category: 'ticker',
    name: 'Results Rail',
    styleTag: 'sport',
    description: 'A results crawl that boxes the score out of each fixture so the strip can be scanned.',
    maxLines: 3,
    suggestedLines: [
      {
        title: 'Results',
        sample: [
          'NORTHERN UNITED 2 - 1 CITY ROVERS',
          'HARBOUR TOWN 0 - 0 EASTFIELD',
          'RIVERSIDE 3 - 2 KINGSPORT',
          'OLD MILL 1 - 4 LAKESIDE ATHLETIC',
        ].join('\n'),
      },
      { title: 'Label', sample: 'Results' },
      { title: 'Round', sample: 'Matchday 14' },
    ],
    logo: 'none',
    animationPresets: ['ticker-marquee'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Results Rail',
    description:
      'The results crawl: fixtures travel past a leaning accent label, each one with its ' +
      'score lifted into a chip so the strip can be scanned rather than read. A fixed round ' +
      'cap holds the far end.',
    uicolor: '3',
  },
  (o) => ({
    html: `    <!-- Results Rail: leaning label left, fixtures travelling, round cap right. -->
    <div class="ticker-box">
      <!-- The label block — the strip's single accent moment. -->
      <div class="ticker-label"><span id="f1">${o.lines[1]?.sample || 'Results'}</span></div>
      <!-- The scrolling window — rebuildTicker() injects the fixtures into the track. -->
      <div class="ticker-viewport">
        <div id="ticker-track"></div>
      </div>
      <!-- The round cap — fixed, so a viewer always knows which matchday this is. -->
      <div class="ticker-cap"><span id="f2">${o.lines[2]?.sample || 'Matchday 14'}</span></div>
    </div>`,
    css: `/* The rail — square-cut and flat, the family's shape. */
.ticker-box {
  display: flex;                   /* label left, viewport filling, cap right */
  align-items: stretch;            /* the caps span the full rail height */
  width: calc(2075px * var(--scale));  /* near full-width, inside the safe areas */
  height: calc(105px * var(--scale));   /* the rail's fixed height */
  background: var(--panel-bg);     /* flat near-black slab */
  border-radius: var(--panel-radius);  /* the family's radius — square */
  box-shadow: var(--panel-shadow); /* the family's hard offset */
  will-change: opacity;            /* hint the browser: the preset fades this */
}

/* The label block — solid accent with the family's lean, the word stood back up inside it. */
.ticker-label {
  display: flex;                   /* center the label text inside the block */
  align-items: center;             /* vertical centering */
  flex-shrink: 0;                  /* never squeezed by the scrolling viewport */
  padding: 0 calc(43px * var(--scale));  /* the lean eats horizontal room — give it back */
  margin-right: calc(10px * var(--scale)); /* the lean must not touch the first fixture */
  background: var(--accent);       /* the one solid accent surface */
  transform: skewX(-9deg);         /* the family's lean */
  font-size: calc(25px * var(--scale) * var(--type-scale)); /* kicker scale */
  font-weight: 700;                /* bold so the caps carry */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as a tag, whatever the operator types */
  color: var(--accent-ink);        /* the family's ink on an accent-filled block */
}
.ticker-label > span {
  transform: skewX(9deg);          /* stand the word back up inside the leaning block */
}

/* The scrolling window — fixtures travel through it and clip at its edges. */
.ticker-viewport {
  flex-grow: 1;                    /* take all the rail width the caps leave */
  overflow: hidden;                /* the marquee window — items vanish at the edges */
  display: flex;                   /* so the track can be vertically centered */
  align-items: center;             /* items sit on the rail's centerline */
}

/* The track — one endless row of fixtures; the marquee preset slides its x. */
#ticker-track {
  display: inline-flex;            /* fixtures in a single row, width = content */
  align-items: center;             /* fixtures share a baseline zone */
  white-space: nowrap;             /* never wrap — the track is one continuous line */
  padding-left: calc(38px * var(--scale)); /* air between the label and the first fixture */
  will-change: transform;          /* the marquee animates x every frame */
}

/* One fixture — the two team names. Condensed caps, the family's voice. */
.ticker-item {
  display: inline-flex;            /* the score chip sits inline with the names */
  align-items: center;             /* names and chip share a centreline */
  gap: calc(18px * var(--scale));  /* air around the score chip */
  margin-right: calc(58px * var(--scale)); /* generous air between fixtures */
  font-size: calc(30px * var(--scale) * var(--type-scale)); /* the rail's main voice */
  font-weight: var(--display-weight);  /* the family's heavy weight */
  letter-spacing: var(--display-tracking); /* condensed caps sit close */
  text-transform: uppercase;       /* the family shouts in caps */
  color: var(--text-color);        /* primary text color */
}

/* The score, lifted out of the fixture and boxed. This is the thing being scanned for, so it
   gets the contrast, the tabular figures and the only fill on the item. */
.ticker-score {
  padding: calc(4px * var(--scale)) calc(15px * var(--scale));
  background: rgba(255, 255, 255, 0.14); /* a lifted surface, not a second accent */
  font-variant-numeric: tabular-nums;   /* every digit same width — the column scans straight */
  color: var(--text-color);        /* full contrast: this is the fact people came for */
}

/* The round cap — fixed at the far end, behind a keyline. */
.ticker-cap {
  display: flex;                   /* center the text inside the cap */
  align-items: center;             /* vertical centering */
  flex-shrink: 0;                  /* never squeezed by the scrolling viewport */
  padding: 0 calc(33px * var(--scale));  /* mirrors the label block's breathing room */
  border-left: 1px solid rgba(255, 255, 255, 0.16); /* the keyline that ends the crawl */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* the quietest voice on the rail */
  font-weight: 600;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as a stamp */
  color: var(--label-color);       /* the family's label colour */
  white-space: nowrap;             /* the cap never wraps */
}`,
    // renderTickerItem(text): "HOME 2 - 1 AWAY" — the middle "n-n" becomes the score chip.
    // A fixture written any other way renders whole, which is the honest fallback: an
    // operator's typo must never make a result disappear.
    rowBuilderJs: `// renderTickerItem(text): a fixture — the "n - n" in the middle is lifted into a chip.
// Accepts a hyphen, an en dash or an em dash between the numbers, with or without spaces.
function renderTickerItem(text) {
  var m = text.match(/^(.*\\S)\\s+(\\d+\\s*[-\\u2013\\u2014:]\\s*\\d+)\\s+(\\S.*)$/);
  if (m) {
    return '<span class="ticker-item">' + m[1] +
           '<span class="ticker-score">' + m[2] + '</span>' + m[3] + '</span>';
  }
  return '<span class="ticker-item">' + text + '</span>';
}`,
    doubleItems: true,
  }),
);
