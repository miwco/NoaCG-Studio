// tk17 "Bilingual Crawl" — one crawl carrying both languages. Each line is written with a
// pipe between the versions, "English text | Toinen kieli", and the runtime splits it into two
// spans divided by a thin rule.
//
// Both halves are set at the same size and the same contrast. The rule between them is
// neutral, not the accent. This is the same editorial position the bilingual panel (pi07)
// takes, for the same reason: dimming the second language is the usual way a bilingual graphic
// tells half its audience it is an afterthought, and it costs nothing to not do it.
//
// A line with no pipe renders whole, so mixing single-language and bilingual items in one
// strip works — which is what actually happens when only some notices have been translated.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineTickerVariant } from './shared';

export const tk17: TemplateVariant = defineTickerVariant(
  {
    id: 'tk17',
    category: 'ticker',
    name: 'Bilingual Crawl',
    styleTag: 'minimal',
    description: 'A crawl carrying both languages per item, split by a neutral rule and equally weighted.',
    maxLines: 3,
    suggestedLines: [
      {
        title: 'Items (use | between the two languages)',
        sample: [
          'Polling stations close at 20:00 | Vaalihuoneistot sulkeutuvat klo 20.00',
          'Bring photo identification | Ota mukaan kuvallinen henkilöllisyystodistus',
          'Results from 21:00 on this channel | Tulokset klo 21.00 alkaen tällä kanavalla',
        ].join('\n'),
      },
      { title: 'Label', sample: 'Information' },
      { title: 'Source', sample: 'Electoral Commission' },
    ],
    logo: 'none',
    animationPresets: ['ticker-marquee'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Bilingual Crawl',
    description:
      'One strip, two languages: each item splits at a pipe into two equally weighted halves ' +
      'divided by a neutral keyline. Items with no pipe pass through whole, so a partly ' +
      'translated list still runs.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Bilingual Crawl: label left, two-language items travelling, source cap right. -->
    <div class="ticker-box">
      <!-- The label block — the strip's single accent moment. -->
      <div class="ticker-label"><span id="f1">${o.lines[1]?.sample || 'Information'}</span></div>
      <!-- The scrolling window — rebuildTicker() injects the items into the track. -->
      <div class="ticker-viewport">
        <div id="ticker-track"></div>
      </div>
      <!-- The source cap — one attribution for both languages. -->
      <div class="ticker-cap"><span id="f2">${o.lines[2]?.sample || 'Electoral Commission'}</span></div>
    </div>`,
    css: `/* The strip — a flat dark bar edged by the accent along its top. Taller than a plain
   crawl: two languages per item means each item is long, and a cramped strip makes a long
   item harder to follow. */
.ticker-box {
  display: flex;                   /* label left, viewport filling, cap right */
  align-items: stretch;            /* the caps span the full strip height */
  width: calc(1680px * var(--scale));  /* near full-width, inside the safe areas */
  height: calc(82px * var(--scale));   /* the strip's fixed height */
  background: var(--panel-bg);     /* near-black bar — never pure #000 */
  border-top: var(--accent-weight) solid var(--accent);  /* the strip's authored accent weight */
  will-change: opacity;            /* hint the browser: the preset fades this */
}

/* The label block — solid accent, dark ink. */
.ticker-label {
  display: flex;                   /* center the label text inside the block */
  align-items: center;             /* vertical centering */
  flex-shrink: 0;                  /* never squeezed by the scrolling viewport */
  padding: 0 calc(30px * var(--scale));  /* generous horizontal breathing room */
  background: var(--accent);       /* the one solid accent surface */
  font-size: calc(18px * var(--scale) * var(--type-scale)); /* kicker scale */
  font-weight: 700;                /* bold so the small caps carry */
  letter-spacing: var(--label-tracking);  /* the label block's authored tracking */
  text-transform: uppercase;       /* reads as a tag, whatever the operator types */
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

/* The track — one endless row of items. */
#ticker-track {
  display: inline-flex;            /* items in a single row, width = content */
  align-items: center;             /* items and separators share a baseline zone */
  white-space: nowrap;             /* never wrap — the track is one continuous line */
  padding-left: calc(34px * var(--scale)); /* air between the label and the first item */
  will-change: transform;          /* the marquee animates x every frame */
}

/* One item — both languages, on one line. */
.ticker-item {
  display: inline-flex;            /* the two halves and their divider sit on one line */
  align-items: center;             /* the divider centres against the text */
  gap: calc(18px * var(--scale));  /* air on both sides of the divider */
  font-size: calc(23px * var(--scale) * var(--type-scale)); /* comfortable at travel speed */
  font-weight: 500;                /* a touch of presence without shouting */
  color: var(--text-color);        /* primary text color — in BOTH languages */
}

/* The divider between the two languages: a neutral keyline, deliberately NOT the accent.
   An accent here would read as a hierarchy, and there is not one. */
.ticker-divider {
  display: inline-block;           /* so it can be given a height */
  width: 1px;                      /* a hairline */
  height: calc(24px * var(--scale)); /* short of the cap height — a divider, not a bar */
  background: rgba(255, 255, 255, 0.28); /* neutral */
}

/* The separator between ITEMS — distinct from the divider inside one, so a viewer can tell
   "next language" from "next item" at a glance. */
.ticker-sep {
  margin: 0 calc(30px * var(--scale)); /* even air on both sides */
  font-size: calc(15px * var(--scale) * var(--type-scale)); /* small — a pause, not a bullet point */
  color: var(--text-dim);          /* dimmed so the items stay the focus */
}

/* The source cap — one attribution for both languages, behind a keyline. */
.ticker-cap {
  display: flex;                   /* center the text inside the cap */
  align-items: center;             /* vertical centering */
  flex-shrink: 0;                  /* never squeezed by the scrolling viewport */
  padding: 0 calc(26px * var(--scale));  /* mirrors the label block's breathing room */
  border-left: 1px solid rgba(255, 255, 255, 0.16); /* the keyline that ends the crawl */
  font-size: calc(16px * var(--scale) * var(--type-scale)); /* the quietest voice on the strip */
  font-weight: 600;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as an attribution stamp */
  color: var(--label-color);       /* the family's label colour */
  white-space: nowrap;             /* the cap never wraps */
}`,
    // renderTickerItem(text): split at the FIRST pipe only, so a pipe inside the second
    // language's text does not produce a third column.
    rowBuilderJs: `// renderTickerItem(text): one item — the two languages split at the first "|".
function renderTickerItem(text) {
  var at = text.indexOf('|');
  var body;
  if (at < 0) {
    // No pipe: a single-language item. It runs whole rather than being dropped, so a partly
    // translated list still airs.
    body = text;
  } else {
    body = text.slice(0, at).trim() +
           '<span class="ticker-divider"></span>' +
           text.slice(at + 1).trim();
  }
  return '<span class="ticker-item">' + body + '</span>' +
         '<span class="ticker-sep">\\u2022</span>';
}`,
    doubleItems: true,
    tokens: { accentWeight: 'calc(2px * var(--scale))', labelTracking: '0.12em' },
  }),
);
