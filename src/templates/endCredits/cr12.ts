// cr12 "Sponsor Crawl" - the acknowledgement strip that runs along the bottom of the picture
// while the show continues. Sport family, sibling of cr04 (Crawl) and lt05 (Angle Slab).
//
// This is the other half of the sponsor problem. cr09 (Sponsor Board) is what you cut to; this
// is what you leave up. A crawl buys a sponsor a long, cheap presence without taking the frame
// away from the action - which is exactly why it is anchored at the bottom rather than centred,
// and why the strip is a solid slab: over a moving picture, text with no ground under it is
// unreadable the moment the shot brightens.
//
// The crawl is a seamless linear travel measured from the rendered strip (creditsCrawl in
// endCredits/creditsMotion.ts), so it runs at a constant readable speed however many sponsors
// the operator lists.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCreditsVariant } from './shared';

const SPONSOR_CRAWL_SAMPLE = [
  'OUR PARTNERS',
  'Meridian Broadcast Systems',
  'Halvorsen Optics',
  'Northlight Studios',
  'City Arena',
  'Okafor Brothers Ltd',
  'Kristiansen & Co',
].join('\n');

export const cr12: TemplateVariant = defineCreditsVariant(
  {
    id: 'cr12',
    category: 'end-credits',
    name: 'Sponsor Crawl',
    styleTag: 'sport',
    description: 'A bottom-of-frame acknowledgement strip that crawls while the show keeps running.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Partners', sample: SPONSOR_CRAWL_SAMPLE },
      { title: 'Tail line', sample: 'Thank you to our partners' },
    ],
    logo: 'built-in',
    animationPresets: ['credits-crawl'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Sponsor Crawl',
    description:
      'A solid bottom strip that crawls partner names past at a constant reading speed: a ' +
      'leaning accent slab carries the group label, names run in condensed caps separated by ' +
      'accent bullets, and your own mark rides the tail. Sits over live action without ' +
      'covering it.',
    uicolor: '5',
  },
  () => ({
    html: `    <!-- Sponsor Crawl: .credits-box is the strip; items are injected into #credits-track. -->
    <div class="credits-box">
      <div id="credits-track"></div>
    </div>`,
    css: `/* The strip — a full-width solid slab. Width is set here rather than left to fit-content
   because a crawl's viewport IS the frame: the travel distance is measured from it. */
.credits-box {
  width: calc(1680px * var(--scale));  /* the frame's action-safe width at 1080p */
  height: calc(90px * var(--scale));   /* one strip row — sized to the caps inside it */
  overflow: hidden;                /* the items outside the strip are not drawn */
  background: var(--panel-bg);     /* a solid ground, so text stays readable over any shot */
  border-top: var(--accent-weight) solid var(--accent);  /* the sport family's accent edge */
  box-shadow: var(--panel-shadow); /* the family's hard offset shadow */
}

/* The track — one long inline row; creditsCrawl() travels it along x. */
#credits-track {
  display: inline-flex;            /* every item on one row, in document order */
  align-items: center;             /* all items share the strip's centerline */
  gap: calc(25px * var(--scale));  /* the base rhythm between items */
  height: 100%;                    /* fill the strip so vertical centering is exact */
  white-space: nowrap;             /* the crawl is one unbroken line — never wraps */
  will-change: transform;          /* hint the browser: the crawl tweens this element's x */
}

/* A section on the strip. On a crawl a "page" is just a run of items, laid out inline. */
.credits-page {
  display: inline-flex;            /* sections do not break the single row */
  align-items: center;             /* shared centerline with everything else */
  gap: calc(25px * var(--scale));  /* the same rhythm inside a section */
}

/* The group label — a leaning accent slab, lt05's motif shrunk to strip height. */
.credits-heading {
  display: inline-block;           /* a chip, sized by its own text */
  padding: calc(8px * var(--scale)) calc(25px * var(--scale));  /* tight chip, wide sides */
  background: var(--accent);       /* the sport family uses accent as a solid shape */
  transform: skewX(-8deg);         /* SKEW: the chip leans forward, sport shape language */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* label scale on the strip */
  font-weight: 700;                /* bold caps on a solid chip */
  line-height: 1.2;                /* one tight label row */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* sport labels are always caps */
  color: var(--accent-ink);        /* the dark-on-accent ink token */
}

/* A partner name — the strip's running text. */
.credits-entry {
  font-size: calc(35px * var(--scale) * var(--type-scale));  /* the strip's headline size */
  font-weight: var(--display-weight);  /* the family's display weight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* condensed caps read fastest in motion */
  color: var(--text-color);        /* primary text color */
}

/* A "Category | Name" line, if the operator writes one — category first, then the name. */
.credits-row {
  display: inline-flex;            /* stays on the crawl line */
  align-items: baseline;           /* the category sits on the name's baseline */
  gap: calc(15px * var(--scale));  /* a small gap inside the pair */
}
.credits-role {
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* a small label before the name */
  font-weight: 600;                /* semibold keeps small caps crisp in motion */
  letter-spacing: 0.12em;          /* small caps breathe */
  text-transform: uppercase;       /* label voice */
  color: var(--text-dim);          /* secondary text color */
}
.credits-name {
  font-size: calc(35px * var(--scale) * var(--type-scale));  /* level with a plain partner name */
  font-weight: var(--display-weight);  /* the family's display weight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* condensed caps, like every name on the strip */
  color: var(--text-color);        /* primary text color */
}

/* The bullet between items — a small accent square, the sport family's punctuation. */
.credits-sep {
  display: inline-block;           /* a shape, not a glyph: it never depends on the typeface */
  width: calc(9px * var(--scale)); /* small and definite */
  height: calc(9px * var(--scale));
  background: var(--accent);       /* the one accent dose per gap */
  transform: rotate(45deg);        /* a diamond — sport punctuation, not a bullet point */
}

/* The tail — your own mark and the closing line, riding the end of the crawl. */
.credits-end {
  display: inline-flex;            /* stays on the crawl line */
  align-items: center;             /* shares the strip's centerline */
  gap: calc(20px * var(--scale));  /* air between the mark and the words */
  padding-left: calc(35px * var(--scale));  /* a clear break after the last partner */
}

/* The logo, when one is picked. Capped by height to the strip's inner height. */
.credits-logo {
  height: calc(48px * var(--scale));  /* fits inside the 72px strip with air above and below */
  width: auto;                     /* keep the logo's own proportions */
  object-fit: contain;             /* never crop or stretch the mark */
}

/* No logo picked yet — a dashed slot so the space is visibly reserved, not broken. */
.credits-logo-slot {
  padding: calc(6px * var(--scale)) calc(18px * var(--scale));  /* a small chip inside the strip */
  border: 1px dashed rgba(255, 255, 255, 0.3);  /* clearly a placeholder */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the smallest type on the strip */
  letter-spacing: 0.1em;           /* small caps breathe */
  text-transform: uppercase;       /* placeholder voice */
  color: var(--text-dim);          /* secondary text color */
}

/* The tail line — the year/copyright field, used here for the closing thanks. */
.credits-year {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* small print on the strip */
  font-weight: 500;                /* medium so it holds up in motion */
  letter-spacing: 0.06em;          /* a little air at small size */
  color: var(--text-dim);          /* secondary text color */
}`,
    rowBuilderJs: `// ── Sponsor Crawl row builders — rebuildCredits() calls these for every parsed line ──

// renderCreditRow(entry): a leaning group chip, a partner name, or a categorized pair.
// Every item is followed by a diamond so the strip has a steady rhythm in motion.
function renderCreditRow(entry) {
  if (entry.type === 'heading') {
    // The line that opens a group — the leaning accent chip.
    return '<span class="credits-heading">' + entry.text + '</span>' +
           '<span class="credits-sep"></span>';
  }
  if (entry.type === 'entry') {
    // A plain line inside the group: one partner. This is the strip's normal item.
    return '<span class="credits-entry">' + entry.text + '</span>' +
           '<span class="credits-sep"></span>';
  }
  // "Official timing partner | Halvorsen Optics" — the category, then the name.
  return '<span class="credits-row">' +
           '<span class="credits-role">' + entry.role + '</span>' +
           '<span class="credits-name">' + entry.name + '</span>' +
         '</span>' +
         '<span class="credits-sep"></span>';
}

// renderEndBlock(tailHtml, logoSrc): the tail of the crawl — your mark, then the closing line.
function renderEndBlock(tailHtml, logoSrc) {
  var logo = logoSrc
    ? '<img class="credits-logo" src="' + logoSrc + '" alt="Logo">'
    : '<div class="credits-logo-slot">Your logo</div>';
  return '<span class="credits-end">' +
           logo +
           '<span class="credits-year">' + tailHtml + '</span>' +
         '</span>';
}`,
    tokens: {
      accentWeight: 'calc(5px * var(--scale))',
      labelTracking: '0.14em',
    },
  }),
);
