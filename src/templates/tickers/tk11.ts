// tk11 "Headline Crawl" — the classic lower news crawl with a SECTION cap. The label block
// on the left says what the strip is (News, Sport, Weather); the cap on the right says which
// desk or programme it is coming from, and stays put while the stories travel between them.
//
// The two fixed caps are what make a crawl readable rather than a river of words: the eye
// gets a fixed frame to read inside, and a viewer who looks up mid-story can tell in one
// glance what they are looking at.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineTickerVariant } from './shared';

export const tk11: TemplateVariant = defineTickerVariant(
  {
    id: 'tk11',
    category: 'ticker',
    name: 'Headline Crawl',
    styleTag: 'minimal',
    description: 'The classic news crawl framed by two fixed caps: a section label and a source.',
    maxLines: 3,
    suggestedLines: [
      {
        title: 'Headlines',
        sample: [
          'Budget talks continue into a third day as parties trade proposals',
          'Rail strike suspended after overnight agreement',
          'Coastal flood defences to be raised along the southern shore',
          'Unemployment falls for a fourth consecutive quarter',
        ].join('\n'),
      },
      { title: 'Section', sample: 'News' },
      { title: 'Source', sample: 'Newsdesk' },
    ],
    logo: 'none',
    animationPresets: ['ticker-marquee'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Headline Crawl',
    description:
      'A full-width crawl with a solid section label on the left and a quiet source cap on ' +
      'the right. The stories travel; the frame does not — which is what lets a viewer join ' +
      'the strip halfway through and still know what they are reading.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Headline Crawl: section label left, stories travelling, source cap right. -->
    <div class="ticker-box">
      <!-- The section label — the strip's single accent moment. -->
      <div class="ticker-label"><span id="f1">${o.lines[1]?.sample || 'News'}</span></div>
      <!-- The scrolling window — rebuildTicker() injects the items into the track. -->
      <div class="ticker-viewport">
        <div id="ticker-track"></div>
      </div>
      <!-- The source cap — fixed, quiet, and always visible. -->
      <div class="ticker-cap"><span id="f2">${o.lines[2]?.sample || 'Newsdesk'}</span></div>
    </div>`,
    css: `/* The strip — a flat dark bar edged by the accent along its top. */
.ticker-box {
  display: flex;                   /* label left, viewport filling, cap right */
  align-items: stretch;            /* the caps span the full strip height */
  width: calc(1680px * var(--scale));  /* near full-width, inside the safe areas */
  height: calc(104px * var(--scale));   /* the strip's fixed height */
  background: var(--panel-bg);     /* near-black bar — never pure #000 */
  border-top: var(--accent-weight) solid var(--accent);  /* the strip's authored accent weight */
  will-change: opacity;            /* hint the browser: the preset fades this */
}

/* The section label — solid accent, dark ink. */
.ticker-label {
  display: flex;                   /* center the label text inside the block */
  align-items: center;             /* vertical centering */
  flex-shrink: 0;                  /* never squeezed by the scrolling viewport */
  padding: 0 calc(40px * var(--scale));  /* generous horizontal breathing room */
  background: var(--accent);       /* the one solid accent surface */
  font-size: calc(25px * var(--scale) * var(--type-scale)); /* kicker scale — a label, not a headline */
  font-weight: 700;                /* bold so the small caps carry */
  letter-spacing: var(--label-tracking);  /* the label block's authored tracking */
  text-transform: uppercase;       /* reads as a tag, whatever the operator types */
  color: var(--accent-ink);        /* the family's ink on an accent-filled block */
}

/* The scrolling window — stories travel through it and clip at its edges. */
.ticker-viewport {
  flex-grow: 1;                    /* take all the strip width the caps leave */
  overflow: hidden;                /* the marquee window — items vanish at the edges */
  display: flex;                   /* so the track can be vertically centered */
  align-items: center;             /* items sit on the strip's centerline */
}

/* The track — one endless row of stories; the marquee preset slides its x. */
#ticker-track {
  display: inline-flex;            /* items in a single row, width = content */
  align-items: center;             /* items and separators share a baseline zone */
  white-space: nowrap;             /* never wrap — the track is one continuous line */
  padding-left: calc(48px * var(--scale)); /* air between the label and the first story */
  will-change: transform;          /* the marquee animates x every frame */
}

/* One story. */
.ticker-item {
  font-size: calc(32px * var(--scale) * var(--type-scale)); /* comfortable reading size at travel speed */
  font-weight: 500;                /* a touch of presence without shouting */
  color: var(--text-color);        /* primary text color */
}

/* The separator between stories — dimmed punctuation, never a second accent. */
.ticker-sep {
  margin: 0 calc(40px * var(--scale)); /* even air on both sides */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* small — a pause, not a bullet point */
  color: var(--text-dim);          /* dimmed so the stories stay the focus */
}

/* The source cap — fixed at the far end, separated by a keyline rather than a second colour:
   two accent blocks on one strip would leave the eye with no single entry point. */
.ticker-cap {
  display: flex;                   /* center the text inside the cap */
  align-items: center;             /* vertical centering */
  flex-shrink: 0;                  /* never squeezed by the scrolling viewport */
  padding: 0 calc(35px * var(--scale));  /* mirrors the label block's breathing room */
  border-left: 1px solid rgba(255, 255, 255, 0.16); /* the keyline that ends the crawl */
  font-size: calc(21px * var(--scale) * var(--type-scale)); /* the quietest voice on the strip */
  font-weight: 600;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as an attribution stamp */
  color: var(--label-color);       /* the family's label colour */
  white-space: nowrap;             /* the cap never wraps */
}`,
    rowBuilderJs: `// renderTickerItem(text): one story followed by a small dim dot separator.
function renderTickerItem(text) {
  return '<span class="ticker-item">' + text + '</span>' +
         '<span class="ticker-sep">\\u2022</span>';
}`,
    // Marquee design: the items render twice so sliding one set length loops seamlessly.
    doubleItems: true,
    tokens: { accentWeight: 'calc(3px * var(--scale))', labelTracking: '0.12em' },
  }),
);
