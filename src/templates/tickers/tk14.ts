// tk14 "Market Board" — the index ticker in the minimal newsroom face. Items are written
// "SYMBOL 4218.60 +1.24%" and the runtime splits them into symbol, level and delta, giving
// the delta a direction ARROW as well as a colour.
//
// The arrow is not decoration. Red and green are the two colours a large minority of viewers
// cannot tell apart, and a market strip that carries the direction only in the hue is unusable
// for them — so the sign character and the triangle both stay, and the colour is the third
// signal rather than the only one. tk06 (House Markets) is the sibling that carries the same
// data in the brand's mono voice.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineTickerVariant } from './shared';

export const tk14: TemplateVariant = defineTickerVariant(
  {
    id: 'tk14',
    category: 'ticker',
    name: 'Market Board',
    styleTag: 'minimal',
    description: 'An index crawl with symbol, level and a delta carrying an arrow as well as a colour.',
    maxLines: 3,
    suggestedLines: [
      {
        title: 'Instruments',
        sample: [
          'OMXH25 4218.60 +1.24%',
          'DAX 18422.15 -0.31%',
          'FTSE 100 8104.88 +0.62%',
          'S&P 500 5488.21 +0.18%',
          'BRENT 82.40 -1.05%',
          'EUR/USD 1.0842 +0.09%',
        ].join('\n'),
      },
      { title: 'Label', sample: 'Markets' },
      { title: 'Session', sample: 'Close' },
    ],
    logo: 'none',
    animationPresets: ['ticker-marquee'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Market Board',
    description:
      'The index crawl: each instrument shows its symbol, its level in tabular figures, and ' +
      'a delta that carries an arrow, a sign and a colour — three signals, so the direction ' +
      'survives colour blindness and a washed-out encode alike.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Market Board: label left, instruments travelling, session cap right. -->
    <div class="ticker-box">
      <!-- The label block — the strip's single accent moment. -->
      <div class="ticker-label"><span id="f1">${o.lines[1]?.sample || 'Markets'}</span></div>
      <!-- The scrolling window — rebuildTicker() injects the instruments into the track. -->
      <div class="ticker-viewport">
        <div id="ticker-track"></div>
      </div>
      <!-- The session cap — which snapshot these numbers are. -->
      <div class="ticker-cap"><span id="f2">${o.lines[2]?.sample || 'Close'}</span></div>
    </div>`,
    css: `/* The strip — a flat dark bar edged by the accent along its top. */
.ticker-box {
  display: flex;                   /* label left, viewport filling, cap right */
  align-items: stretch;            /* the caps span the full strip height */
  width: calc(1680px * var(--scale));  /* near full-width, inside the safe areas */
  height: calc(93px * var(--scale));   /* the strip's fixed height */
  background: var(--panel-bg);     /* near-black bar — never pure #000 */
  border-top: var(--accent-weight) solid var(--accent);  /* the strip's authored accent weight */
  will-change: opacity;            /* hint the browser: the preset fades this */
}

/* The label block — solid accent, dark ink. */
.ticker-label {
  display: flex;                   /* center the label text inside the block */
  align-items: center;             /* vertical centering */
  flex-shrink: 0;                  /* never squeezed by the scrolling viewport */
  padding: 0 calc(35px * var(--scale));  /* generous horizontal breathing room */
  background: var(--accent);       /* the one solid accent surface */
  font-size: calc(23px * var(--scale) * var(--type-scale)); /* kicker scale */
  font-weight: 700;                /* bold so the small caps carry */
  letter-spacing: var(--label-tracking);  /* the label block's authored tracking */
  text-transform: uppercase;       /* reads as a tag, whatever the operator types */
  color: var(--accent-ink);        /* the family's ink on an accent-filled block */
}

/* The scrolling window. */
.ticker-viewport {
  flex-grow: 1;                    /* take all the strip width the caps leave */
  overflow: hidden;                /* the marquee window — items vanish at the edges */
  display: flex;                   /* so the track can be vertically centered */
  align-items: center;             /* items sit on the strip's centerline */
}

/* The track — one endless row of instruments. */
#ticker-track {
  display: inline-flex;            /* instruments in a single row, width = content */
  align-items: center;             /* instruments share a baseline zone */
  white-space: nowrap;             /* never wrap — the track is one continuous line */
  padding-left: calc(43px * var(--scale)); /* air between the label and the first instrument */
  will-change: transform;          /* the marquee animates x every frame */
}

/* One instrument — symbol, level, delta. */
.ticker-item {
  display: inline-flex;            /* the three parts sit on one line */
  align-items: baseline;           /* symbol, level and delta share a baseline */
  gap: calc(15px * var(--scale));  /* air between the three parts */
  margin-right: calc(58px * var(--scale)); /* generous air between instruments */
  font-size: calc(28px * var(--scale) * var(--type-scale)); /* the strip's main voice */
  font-variant-numeric: tabular-nums;   /* even digits across every instrument */
  color: var(--text-color);        /* primary text color */
}

/* The symbol — the name being quoted. */
.ticker-symbol {
  font-weight: 700;                /* the symbol anchors the group */
  letter-spacing: 0.02em;          /* short all-caps tickers need a little air */
}

/* The level — the number itself, quieter than the symbol. */
.ticker-level {
  font-weight: 400;                /* regular — read, not scanned */
  color: var(--text-dim);          /* secondary: the delta is what people look for */
}

/* The delta — the direction. FIXED semantic market colours (BRAND-MANUAL §3), NOT the accent:
   green must stay green and red must stay red whatever the project palette is. The arrow and
   the sign carry the same information, so the colour is never the only signal. */
.ticker-up   { color: #4ac47a; font-weight: 600; }  /* gains */
.ticker-down { color: #e57a7d; font-weight: 600; }  /* losses */
.ticker-flat { color: var(--text-dim); font-weight: 600; }  /* unchanged */

/* The session cap — fixed at the far end, behind a keyline. */
.ticker-cap {
  display: flex;                   /* center the text inside the cap */
  align-items: center;             /* vertical centering */
  flex-shrink: 0;                  /* never squeezed by the scrolling viewport */
  padding: 0 calc(33px * var(--scale));  /* mirrors the label block's breathing room */
  border-left: 1px solid rgba(255, 255, 255, 0.16); /* the keyline that ends the crawl */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* the quietest voice on the strip */
  font-weight: 600;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as a stamp */
  color: var(--label-color);       /* the family's label colour */
  white-space: nowrap;             /* the cap never wraps */
}`,
    // renderTickerItem(text): "SYMBOL LEVEL +D%" — the trailing signed token becomes the
    // delta; whatever is before it splits into symbol and level at the last space. An item
    // written any other way renders whole, so a typo never makes a quote disappear.
    rowBuilderJs: `// renderTickerItem(text): one instrument — symbol, level, and a signed delta with an arrow.
function renderTickerItem(text) {
  var m = text.match(/^(.*\\S)\\s+([+\\-\\u2212]?[\\d.,]+%?)$/);
  if (!m) return '<span class="ticker-item">' + text + '</span>';
  var delta = m[2];
  var head = m[1];
  var sign = delta.charAt(0);
  var dir = sign === '+' ? 'ticker-up' : (sign === '-' || sign === '\\u2212') ? 'ticker-down' : 'ticker-flat';
  // The arrow duplicates the sign on purpose: direction must survive a viewer who cannot
  // tell the two colours apart.
  var arrow = dir === 'ticker-up' ? '\\u25B2' : dir === 'ticker-down' ? '\\u25BC' : '\\u2013';
  // Split the head into symbol and level at the LAST space, so "FTSE 100 8104.88" keeps its
  // two-word symbol.
  var cut = head.lastIndexOf(' ');
  var symbol = cut > 0 ? head.slice(0, cut) : head;
  var level = cut > 0 ? head.slice(cut + 1) : '';
  return '<span class="ticker-item">' +
         '<span class="ticker-symbol">' + symbol + '</span>' +
         (level ? '<span class="ticker-level">' + level + '</span>' : '') +
         '<span class="' + dir + '">' + arrow + ' ' + delta + '</span>' +
         '</span>';
}`,
    doubleItems: true,
    tokens: { accentWeight: 'calc(3px * var(--scale))', labelTracking: '0.12em' },
  }),
);
