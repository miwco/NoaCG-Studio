// tk20 "Split Deck" — the double-decker: a FIXED headline row above a CRAWLING row.
//
// This is the shape rolling-news channels settled on, and the reason is worth writing down.
// A crawl is unreadable as a headline — a viewer who looks up has to wait for the words to
// come round — and a fixed strap is useless as a wire, because it can only hold one thing. The
// double deck gives each job the row it is good at: the top deck holds the current story
// still, the bottom deck runs everything else past it.
//
// The top deck is the OPTIONAL third field (f2) the ticker assembler grew for exactly this
// kind of design.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineTickerVariant } from './shared';

export const tk20: TemplateVariant = defineTickerVariant(
  {
    id: 'tk20',
    category: 'ticker',
    name: 'Split Deck',
    styleTag: 'noacg',
    description: 'A double-decker: the current story held still on top, everything else crawling below.',
    maxLines: 3,
    suggestedLines: [
      {
        title: 'Crawl items',
        sample: [
          'Central bank leaves its main rate unchanged at 3.25%',
          'Port workers accept the revised pay offer',
          'Two new hospital wings approved in the capital region',
          'Storm warning remains in force along the southern coast',
        ].join('\n'),
      },
      { title: 'Label', sample: 'News' },
      { title: 'Top story', sample: 'Parliament passes the 2026 budget after an all-night session' },
    ],
    logo: 'none',
    animationPresets: ['ticker-marquee'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Split Deck',
    description:
      'The house double-decker: a top deck holding the current story still beside a mono ' +
      'label, and a lower deck running the rest of the wire past it. Each row does the job ' +
      'the other one is bad at.',
    uicolor: '4',
  },
  (o) => ({
    html: `    <!-- Split Deck: fixed top story over the crawling lower deck. -->
    <div class="ticker-box">
      <!-- The top deck — the story that is being covered right now, held still. -->
      <div class="ticker-deck">
        <div class="ticker-label"><span id="f1">${o.lines[1]?.sample || 'News'}</span></div>
        <div class="ticker-top"><span id="f2">${o.lines[2]?.sample || 'Top story'}</span></div>
      </div>
      <!-- The lower deck — everything else, travelling. -->
      <div class="ticker-viewport">
        <div id="ticker-track"></div>
      </div>
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The unit — two decks stacked, on the house void panel. */
.ticker-box {
  display: flex;                   /* the two decks */
  flex-direction: column;          /* top deck over lower deck */
  width: calc(1680px * var(--scale));  /* near full-width, inside the safe areas */
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);      /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-top: calc(3px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);
  will-change: opacity;            /* hint the browser: the preset fades this */
}

/* The top deck — label block plus the fixed story. */
.ticker-deck {
  display: flex;                   /* label left, story filling the rest */
  align-items: stretch;            /* the label block spans the deck's height */
  height: calc(78px * var(--scale));  /* the taller deck: it carries the biggest type */
}

/* The label block — solid accent, dark mono ink, the house glow. */
.ticker-label {
  display: flex;                   /* center the label text inside the block */
  align-items: center;             /* vertical centering */
  flex-shrink: 0;                  /* never squeezed by the story beside it */
  padding: 0 calc(30px * var(--scale));  /* generous horizontal breathing room */
  background: var(--accent);       /* the one solid accent surface */
  box-shadow: var(--accent-glow);  /* the house glow around the accent block */
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* label scale */
  font-weight: 700;                /* bold mono caps read as a stamp */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as a tag, whatever the operator types */
  color: var(--accent-ink);        /* dark ink on the accent block */
  white-space: nowrap;             /* the label never wraps */
}

/* The fixed story — the biggest text in the graphic, and the only still one. */
.ticker-top {
  display: flex;                   /* centre the story vertically in its deck */
  align-items: center;             /* vertical centering */
  flex-grow: 1;                    /* take the deck width the label leaves */
  min-width: 0;                    /* a long story ellipsizes rather than widening the deck */
  padding: 0 calc(32px * var(--scale)); /* air on both sides */
  font-size: calc(30px * var(--scale) * var(--type-scale)); /* the graphic's headline voice */
  font-weight: var(--display-weight);  /* the family's heading weight */
  letter-spacing: var(--display-tracking); /* big text tightens */
  color: var(--text-color);        /* primary text color */
}
/* The top deck is a fixed height, so an over-long story has to end somewhere visible: an
   ellipsis is honest, a second wrapped row would break the deck's height and push the crawl
   off the safe area. */
.ticker-top > span {
  overflow: hidden;                /* the clip the ellipsis needs */
  text-overflow: ellipsis;         /* say "there is more" rather than cutting mid-letter */
  white-space: nowrap;             /* one row, always */
}

/* The lower deck — the travelling wire, divided from the deck above by a keyline. */
.ticker-viewport {
  height: calc(56px * var(--scale)); /* slimmer: this row is scanned, not read */
  overflow: hidden;                /* the marquee window — items vanish at the edges */
  display: flex;                   /* so the track can be vertically centered */
  align-items: center;             /* items sit on the deck's centerline */
  border-top: 1px solid rgba(255, 255, 255, 0.14); /* the line between the decks */
}

/* The track — one endless row of items; the marquee preset slides its x. */
#ticker-track {
  display: inline-flex;            /* items in a single row, width = content */
  align-items: center;             /* items and separators share a baseline zone */
  white-space: nowrap;             /* never wrap — the track is one continuous line */
  padding-left: calc(32px * var(--scale)); /* air before the first item */
  will-change: transform;          /* the marquee animates x every frame */
}

/* One wire item — deliberately quieter than the story above it. */
.ticker-item {
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* subordinate to the top deck */
  font-weight: 500;                /* weight, not size, keeps it legible */
  color: var(--text-dim);          /* secondary: the top deck is the headline */
}

/* The separator between wire items. */
.ticker-sep {
  margin: 0 calc(28px * var(--scale)); /* even air on both sides */
  font-size: calc(14px * var(--scale) * var(--type-scale)); /* small — a pause, not a bullet point */
  color: var(--accent);            /* accent dots chain the items together */
}`,
    rowBuilderJs: `// renderTickerItem(text): one wire item followed by a small accent dot separator.
function renderTickerItem(text) {
  return '<span class="ticker-item">' + text + '</span>' +
         '<span class="ticker-sep">\\u2022</span>';
}`,
    doubleItems: true,
    tokens: { labelTracking: '0.16em', accentInk: 'rgba(10, 12, 16, 0.95)' },
  }),
);
