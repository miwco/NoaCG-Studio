// tk15 "Public Notice Crawl" — the emergency-information strip: the crawl a broadcaster
// leaves running under normal programming while a situation develops.
//
// It is drawn against a different brief from every other crawl in the pack. It is on screen
// for hours, over content nobody chose to interrupt, and it will be watched on bad screens by
// people who are worried. So: no blur and no transparency (the text must never depend on the
// picture), the largest type of any strip here, a slower default travel, and a permanent
// SOURCE cap — an unattributed emergency crawl is a rumour with a broadcaster's logo on it.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineTickerVariant } from './shared';

export const tk15: TemplateVariant = defineTickerVariant(
  {
    id: 'tk15',
    category: 'ticker',
    name: 'Public Notice Crawl',
    styleTag: 'minimal',
    description: 'A high-contrast emergency crawl with a permanent source cap, built to run for hours.',
    maxLines: 3,
    suggestedLines: [
      {
        title: 'Notices',
        sample: [
          'Residents of the harbour district should stay indoors until further notice',
          'The coast road is closed between the ferry terminal and the north pier',
          'Emergency shelters are open at the sports hall and the community centre',
          'Call 116 117 for health advice — keep emergency lines free for emergencies',
        ].join('\n'),
      },
      { title: 'Label', sample: 'Public information' },
      { title: 'Source', sample: 'Civil Protection Authority' },
    ],
    logo: 'none',
    animationPresets: ['ticker-marquee'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Public Notice Crawl',
    description:
      'The emergency-information strip: fully opaque, the largest type in the ticker set, ' +
      'and a permanent source cap. Built to run for hours over ordinary programming without ' +
      'ever depending on what is behind it.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Public Notice Crawl: label left, notices travelling, source cap right. -->
    <div class="ticker-box">
      <!-- The label block — says what KIND of message the strip is carrying. -->
      <div class="ticker-label"><span id="f1">${o.lines[1]?.sample || 'Public information'}</span></div>
      <!-- The scrolling window — rebuildTicker() injects the notices into the track. -->
      <div class="ticker-viewport">
        <div id="ticker-track"></div>
      </div>
      <!-- The source cap. Permanent, and deliberately not optional. -->
      <div class="ticker-cap"><span id="f2">${o.lines[2]?.sample || 'Civil Protection Authority'}</span></div>
    </div>`,
    css: `/* The strip — FULLY opaque, taller than a news crawl, with a heavy accent top edge.
   Nothing here is translucent: an emergency notice must be legible over any picture, in any
   encode, on any screen. */
.ticker-box {
  display: flex;                   /* label left, viewport filling, cap right */
  align-items: stretch;            /* the caps span the full strip height */
  width: calc(1976px * var(--scale));  /* near full-width, inside the safe areas */
  height: calc(113px * var(--scale));   /* the tallest crawl in the set — bigger type needs room */
  background: #0b0d11;             /* a fixed near-black floor, not the palette's translucent panel */
  border-top: calc(6px * var(--scale)) solid var(--accent);  /* a heavier edge than a news strip's */
  will-change: opacity;            /* hint the browser: the preset fades this */
}

/* The label block — solid accent, dark ink. */
.ticker-label {
  display: flex;                   /* center the label text inside the block */
  align-items: center;             /* vertical centering */
  flex-shrink: 0;                  /* never squeezed by the scrolling viewport */
  padding: 0 calc(38px * var(--scale));  /* generous horizontal breathing room */
  background: var(--accent);       /* the one solid accent surface */
  font-size: calc(24px * var(--scale) * var(--type-scale)); /* read before the notices */
  font-weight: 700;                /* bold so the caps carry */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as a category stamp */
  color: var(--accent-ink);        /* the family's ink on an accent-filled block */
  white-space: nowrap;             /* the label never wraps */
}

/* The scrolling window. */
.ticker-viewport {
  flex-grow: 1;                    /* take all the strip width the caps leave */
  overflow: hidden;                /* the marquee window — items vanish at the edges */
  display: flex;                   /* so the track can be vertically centered */
  align-items: center;             /* items sit on the strip's centerline */
}

/* The track — one endless row of notices. */
#ticker-track {
  display: inline-flex;            /* notices in a single row, width = content */
  align-items: center;             /* notices and separators share a baseline zone */
  white-space: nowrap;             /* never wrap — the track is one continuous line */
  padding-left: calc(47px * var(--scale)); /* air between the label and the first notice */
  will-change: transform;          /* the marquee animates x every frame */
}

/* One notice — the largest crawl type in the pack, at full contrast. */
.ticker-item {
  font-size: calc(35px * var(--scale) * var(--type-scale)); /* sized for a bad screen across a room */
  font-weight: 500;                /* a touch of presence without shouting */
  color: #ffffff;                  /* a fixed full-contrast ink, not a palette value */
}

/* The separator — a slash rather than a dot: at this size a dot reads as a full stop, and a
   notice that appears to end mid-sentence is worse than no separator at all. */
.ticker-sep {
  margin: 0 calc(40px * var(--scale)); /* even air on both sides */
  font-size: calc(28px * var(--scale) * var(--type-scale)); /* scaled to the larger notices */
  color: var(--accent);            /* the accent as punctuation, chaining the notices */
}

/* The source cap — permanent attribution, behind a keyline. */
.ticker-cap {
  display: flex;                   /* center the text inside the cap */
  align-items: center;             /* vertical centering */
  flex-shrink: 0;                  /* never squeezed by the scrolling viewport */
  padding: 0 calc(33px * var(--scale));  /* mirrors the label block's breathing room */
  border-left: 1px solid rgba(255, 255, 255, 0.22); /* the keyline that ends the crawl */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* small, but never small print */
  font-weight: 600;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as an attribution stamp */
  color: rgba(255, 255, 255, 0.82); /* fixed, like the rest of this strip's ink */
  white-space: nowrap;             /* the cap never wraps */
}`,
    rowBuilderJs: `// renderTickerItem(text): one notice followed by an accent slash separator.
function renderTickerItem(text) {
  return '<span class="ticker-item">' + text + '</span>' +
         '<span class="ticker-sep">/</span>';
}`,
    doubleItems: true,
    tokens: { labelTracking: '0.12em' },
  }),
);
