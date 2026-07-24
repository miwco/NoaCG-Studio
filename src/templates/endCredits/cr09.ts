// cr09 "Sponsor Board" - the acknowledgement board: who paid for this broadcast. House style,
// sibling of cr06 (Credit Reel) and lt11 (House Strap).
//
// Sponsor acknowledgement has one rule the other list formats do not: the TIER is contractual.
// A headline sponsor bought a bigger name than a supporting one, and the difference has to be
// visible at a glance from across a room. So unlike the donor wall - where every giver inside
// a level is set identically out of etiquette - this board sizes each level differently, and
// the first level typed is the largest.
//
// Held, not rolled: an acknowledgement that scrolls past is an acknowledgement nobody read,
// and a sponsor is buying the seconds it is on screen.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineCreditsVariant } from './shared';

const SPONSOR_SAMPLE = [
  'PRESENTED BY',
  'Meridian Broadcast Systems',
  '',
  'IN ASSOCIATION WITH',
  'Halvorsen Optics',
  'Northlight Studios',
  '',
  'WITH SUPPORT FROM',
  'City Arena',
  'Okafor Brothers Ltd',
  'Kristiansen & Co',
].join('\n');

export const cr09: TemplateVariant = defineCreditsVariant(
  {
    id: 'cr09',
    category: 'end-credits',
    name: 'Sponsor Board',
    styleTag: 'noacg',
    description: 'A held acknowledgement board where each tier is visibly a tier — the contract made legible.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Sponsors by tier', sample: SPONSOR_SAMPLE },
      { title: 'Footer', sample: 'Thank you to our partners' },
    ],
    logo: 'built-in',
    animationPresets: ['credits-board'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'Sponsor Board',
    description:
      'The house sponsor board: mono tier labels in the accent color, and each tier set a ' +
      'step smaller than the one above it — the first tier you type is the headline, the ' +
      'next is secondary, the rest are supporting. Held on screen, never scrolled past.',
    uicolor: '4',
  },
  () => ({
    html: `    <!-- Sponsor Board: .credits-box is the board; tiers are injected into #credits-track. -->
    <div class="credits-box credits-board">
      <div id="credits-track"></div>
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The board — the house void panel, sized as a full acknowledgement card. */
.credits-box {
  width: calc(1120px * var(--scale));  /* wide enough for a long company name at headline size */
  padding: calc(69px * var(--scale)) calc(91px * var(--scale));  /* front-door air */
  text-align: center;              /* an acknowledgement board is centered */
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
  border-top: calc(3px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);  /* the house amber top edge */
  will-change: transform, opacity; /* hint the browser: the board fades and lifts on entry */
}

/* One tier. Tiers stack down the board in the order the operator typed them. */
.credits-page + .credits-page {
  margin-top: calc(49px * var(--scale));  /* a clear break between tiers */
}

/* The tier label — the house mono voice, in the accent color. */
.credits-heading {
  margin-bottom: calc(20px * var(--scale));  /* air before the tier's first name */
  font-family: var(--font-label);  /* the family's mono label face */
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* label scale — it names the tier */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  letter-spacing: var(--label-tracking);  /* wide tracking — the label breathes */
  text-transform: uppercase;       /* label voice, whatever the operator types */
  color: var(--label-color);       /* the label carries the accent */
}

/* A sponsor name. This is the base size — the tier rules below step it up or down. */
.credits-entry {
  padding: calc(9px * var(--scale)) 0;  /* the board's reading rhythm */
  font-size: calc(43px * var(--scale) * var(--type-scale));  /* the supporting tier's size */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.2;                /* a company's full name may wrap */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken names */
}

/* THE TIER LADDER. The first tier on the board is the headline sponsor and is set biggest;
   the second is secondary; everything after it is supporting and shares the base size above.
   :nth-child on the tier blocks is what makes the ladder automatic — the operator orders the
   tiers by typing them in order, and never has to touch the CSS to get the sizes right. */
.credits-page:nth-child(1) .credits-entry {
  font-size: calc(74px * var(--scale) * var(--type-scale));  /* headline tier — read from the back of the room */
  padding: calc(11px * var(--scale)) 0;  /* a little more air around the biggest names */
}
.credits-page:nth-child(2) .credits-entry {
  font-size: calc(54px * var(--scale) * var(--type-scale));  /* secondary tier — clearly a step down */
}

/* A "Role | Name" line, if the operator writes one (a category sponsor, a naming right). */
.credits-row {
  padding: calc(9px * var(--scale)) 0;  /* the same rhythm as a plain name */
}
.credits-role {
  font-family: var(--font-label);  /* mono, like every house label */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* a small label above the name */
  font-weight: 400;                /* light — it categorizes, it does not announce */
  letter-spacing: 0.1em;           /* small mono caps need air */
  text-transform: uppercase;       /* label voice */
  color: var(--text-dim);          /* secondary text color */
}
.credits-name {
  font-size: calc(43px * var(--scale) * var(--type-scale));  /* level with a supporting-tier name */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.2;                /* shares the board's rhythm */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken names */
}

/* The footer — the amber rule, the broadcaster's own mark, and the closing line. */
.credits-end {
  display: flex;                   /* the pieces stack… */
  flex-direction: column;          /* …top to bottom */
  align-items: center;             /* centered on the board */
  gap: calc(23px * var(--scale));  /* even air between rule, mark and words */
  margin-top: calc(60px * var(--scale));  /* clear of the last tier */
}

/* The amber rule — the house accent, closing the board. */
.credits-rule {
  width: calc(114px * var(--scale));  /* a short stroke — a mark, not a divider */
  height: var(--accent-weight);    /* the family's accent weight */
  background: var(--accent);       /* the one sharp dose of accent color */
  box-shadow: var(--accent-glow);  /* the house glow, on the accent element only */
}

/* The logo, when one is picked. Capped by height so any aspect ratio behaves. */
.credits-logo {
  height: calc(63px * var(--scale));  /* the broadcaster's mark, not a sponsor's */
  width: auto;                     /* keep the logo's own proportions */
  object-fit: contain;             /* never crop or stretch the mark */
}

/* No logo picked yet — a dashed slot so the space is visibly reserved, not broken. */
.credits-logo-slot {
  padding: calc(16px * var(--scale)) calc(31px * var(--scale));  /* a chip the size of a real mark */
  border: 1px dashed color-mix(in srgb, var(--accent) 45%, transparent);  /* clearly a placeholder */
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the smallest type on the board */
  letter-spacing: 0.12em;          /* small caps breathe */
  text-transform: uppercase;       /* placeholder voice */
  color: var(--text-dim);          /* secondary text color */
}

/* The closing line — the year/copyright field, used here for the thanks. */
.credits-year {
  font-family: var(--font-label);  /* mono, like every piece of house small print */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* small print scale */
  letter-spacing: 0.06em;          /* a little air at small size */
  color: var(--text-dim);          /* secondary text color */
}`,
    rowBuilderJs: `// ── Sponsor Board row builders — rebuildCredits() calls these for every parsed line ──

// renderCreditRow(entry): a tier label, a sponsor name, or a categorized "Role | Name".
function renderCreditRow(entry) {
  if (entry.type === 'heading') {
    // The line that opens a tier — "PRESENTED BY", "IN ASSOCIATION WITH".
    return '<div class="credits-heading">' + entry.text + '</div>';
  }
  if (entry.type === 'entry') {
    // A plain line inside the tier: one sponsor. The CSS ladder sizes it by which tier
    // it is in, so the running order in the text IS the running order on the board.
    return '<div class="credits-entry">' + entry.text + '</div>';
  }
  // "Official timing partner | Halvorsen Optics" — a category above the name.
  return '<div class="credits-row">' +
           '<div class="credits-role">' + entry.role + '</div>' +
           '<div class="credits-name">' + entry.name + '</div>' +
         '</div>';
}

// renderEndBlock(noteHtml, logoSrc): the board's footer — amber rule, your own mark, thanks.
function renderEndBlock(noteHtml, logoSrc) {
  var logo = logoSrc
    ? '<img class="credits-logo" src="' + logoSrc + '" alt="Logo">'
    : '<div class="credits-logo-slot">Your logo</div>';
  return '<div class="credits-end">' +
           '<div class="credits-rule"></div>' +
           logo +
           '<div class="credits-year">' + noteHtml + '</div>' +
         '</div>';
}`,
    tokens: {
      accentWeight: 'calc(4px * var(--scale))',
      labelTracking: '0.24em',
    },
  }),
);
