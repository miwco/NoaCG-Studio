// cr11 "Roll of Remembrance" - the names read at a memorial, a remembrance service, an
// in-memoriam segment or an awards show's obituary sequence. Glass family, sibling of cr02
// (Column Roll) and lt08 (Frosted Card).
//
// Everything about this one is a subtraction. There is no accent bar, no keyline chip, no
// logo badge, and the section headings are set smaller than the names rather than louder.
// The only colour is a single soft rule at the very end. The names travel slowly - the roll
// speed is a property of the motion builder and stays the same, but the type is set large
// enough that the same speed reads as unhurried rather than brisk.
//
// A "Name | Years" line is supported for the common "Ada Fenwick | 1948 - 2026" form; a bare
// name is equally correct and is not treated as a lesser row.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCreditsVariant } from './shared';

const REMEMBRANCE_SAMPLE = [
  'IN REMEMBRANCE',
  'Ada Fenwick | 1948 – 2026',
  'Jonas Berg | 1955 – 2026',
  'Maria Santos | 1961 – 2026',
  'Tomas Halvorsen | 1939 – 2026',
  '',
  'AND ALL THOSE HELD IN OUR THOUGHTS',
  'Remembered by their families and this community',
].join('\n');

export const cr11: TemplateVariant = defineCreditsVariant(
  {
    id: 'cr11',
    category: 'end-credits',
    name: 'Roll of Remembrance',
    styleTag: 'glass',
    description: 'A memorial name roll — large quiet names, no accent, no badge, nothing competing.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Names', sample: REMEMBRANCE_SAMPLE },
      { title: 'Closing line', sample: 'We remember them' },
    ],
    logo: 'built-in',
    animationPresets: ['credits-roll'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Roll of Remembrance',
    description:
      'A memorial roll stripped of every decoration the other credit formats carry: names ' +
      'set large and light, dates beside them in the secondary voice, headings smaller than ' +
      'the names rather than louder, and one soft rule above the closing line. Nothing else.',
    uicolor: '2',
  },
  () => ({
    html: `    <!-- Roll of Remembrance: .credits-box is the viewport; names go into #credits-track. -->
    <div class="credits-box">
      <div id="credits-track"></div>
    </div>`,
    css: `/* The viewport — the window the roll travels through. No panel, no glass fill: over a
   still or a candle shot, a frosted slab would be an object between the viewer and the name. */
.credits-box {
  width: calc(1429px * var(--scale));  /* a comfortable measure for a name and its dates */
  height: calc(1229px * var(--scale));  /* the window height; the roll travels behind it */
  overflow: hidden;                /* the rows above and below the window are not drawn */
  text-align: center;              /* a roll of names is a centered column */
}

/* The track — the shared runtime injects rows here; creditsRoll() moves it. */
#credits-track {
  will-change: transform;          /* hint the browser: the roll tweens this element's y */
}

/* One group. Groups stack in normal flow as the roll passes through them. */
.credits-page {
  padding: calc(43px * var(--scale)) 0;  /* even, unhurried air around each group */
}

/* The heading — SMALLER than the names it introduces, which is the whole point: on this
   card nothing is allowed to be louder than a person's name. */
.credits-heading {
  margin-bottom: calc(49px * var(--scale));  /* a long breath before the first name */
  font-size: calc(27px * var(--scale) * var(--type-scale));  /* deliberately below the names */
  font-weight: 500;                /* medium — quiet, but legible in small caps */
  letter-spacing: var(--label-tracking);  /* the label's authored tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--text-dim);          /* secondary voice — NOT the family's accent label colour */
}

/* One person: the name, with the dates beside it on the same line. */
.credits-row {
  display: flex;                   /* name and dates share one row… */
  align-items: baseline;           /* …and one baseline, like a printed order of service */
  justify-content: center;         /* centered as a pair on the column's axis */
  flex-wrap: wrap;                 /* a very long name pushes the dates to the next row */
  gap: calc(26px * var(--scale));  /* the space between a name and its dates */
  padding: calc(21px * var(--scale)) 0;  /* an unhurried rhythm */
}

/* THE NAME. entry.role is the first half of the typed line — here, the person. */
.credits-role {
  font-size: calc(60px * var(--scale) * var(--type-scale));  /* the largest type on the card */
  font-weight: 400;                /* LIGHT on purpose: this is not an announcement */
  line-height: 1.2;                /* comfortable for a name that wraps */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken names */
}

/* THE DATES. The second half of the line, in the secondary voice. */
.credits-name {
  font-size: calc(34px * var(--scale) * var(--type-scale));  /* ~1.75:1 under the name */
  font-weight: 400;                /* the same light weight — nothing here is emphasised */
  line-height: 1.3;                /* shares the row's rhythm */
  font-variant-numeric: tabular-nums;  /* years line up down the column */
  color: var(--text-dim);          /* secondary text color */
}

/* A bare name, or a line of dedication. Set exactly like a name with dates: a person
   without recorded years is not a lesser row. */
.credits-entry {
  padding: calc(19px * var(--scale)) 0;  /* the same unhurried rhythm */
  font-size: calc(60px * var(--scale) * var(--type-scale));  /* level with a dated name */
  font-weight: 400;                /* the card's one weight */
  line-height: 1.25;               /* comfortable for a run of names */
  letter-spacing: var(--display-tracking);  /* matches the dated names above */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken names */
}

/* The closing block — one soft rule, the mark if there is one, and the closing line. */
.credits-end {
  display: flex;                   /* the pieces stack… */
  flex-direction: column;          /* …top to bottom */
  align-items: center;             /* centered in the column */
  gap: calc(40px * var(--scale));  /* long, even air — the ending is not hurried either */
  padding: calc(103px * var(--scale)) 0;  /* the longest breath on the card */
}

/* The one rule — softened well below the accent's full strength. It is punctuation. */
.credits-rule {
  width: calc(103px * var(--scale));  /* a short stroke */
  height: 1px;                     /* a true hairline, not the family's accent bar */
  background: color-mix(in srgb, var(--accent) 40%, transparent);  /* barely there */
}

/* The logo, when one is picked — smaller than any other credits design's. */
.credits-logo {
  height: calc(63px * var(--scale));  /* a modest mark; the names are the content */
  width: auto;                     /* keep the logo's own proportions */
  object-fit: contain;             /* never crop or stretch the mark */
  opacity: 0.8;                    /* softened, like everything else on this card */
}

/* No logo picked yet — a quiet dashed slot, so the space is visibly reserved. */
.credits-logo-slot {
  padding: calc(16px * var(--scale)) calc(31px * var(--scale));  /* a small chip */
  border: 1px dashed rgba(255, 255, 255, 0.24);  /* clearly a placeholder */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the smallest type on the card */
  letter-spacing: 0.1em;           /* small caps breathe */
  text-transform: uppercase;       /* placeholder voice */
  color: var(--text-dim);          /* secondary text color */
}

/* The closing line — the year/copyright field, used here for the final sentence. */
.credits-year {
  font-size: calc(37px * var(--scale) * var(--type-scale));  /* readable, still quieter than a name */
  font-weight: 400;                /* the card's one weight */
  letter-spacing: 0.03em;          /* a touch of air */
  color: var(--text-dim);          /* secondary text color */
}`,
    rowBuilderJs: `// ── Roll of Remembrance row builders — rebuildCredits() calls these for every line ──

// renderCreditRow(entry): a quiet heading, a "Name | Years" pair, or a bare name.
//
// entry.role is the first half of the typed line, which on THIS design is the PERSON, and
// entry.name is the dates. The field is labelled so the operator types them in that order.
function renderCreditRow(entry) {
  if (entry.type === 'heading') {
    // The line that opens a group — set smaller than the names it introduces.
    return '<div class="credits-heading">' + entry.text + '</div>';
  }
  if (entry.type === 'entry') {
    // A plain line: a name with no recorded dates, or a line of dedication.
    return '<div class="credits-entry">' + entry.text + '</div>';
  }
  return '<div class="credits-row">' +
           '<div class="credits-role">' + entry.role + '</div>' +   // the person
           '<div class="credits-name">' + entry.name + '</div>' +   // the dates
         '</div>';
}

// renderEndBlock(closingHtml, logoSrc): one soft rule, the mark, and the closing line.
function renderEndBlock(closingHtml, logoSrc) {
  var logo = logoSrc
    ? '<img class="credits-logo" src="' + logoSrc + '" alt="Logo">'
    : '<div class="credits-logo-slot">Your logo</div>';
  return '<div class="credits-end">' +
           '<div class="credits-rule"></div>' +
           logo +
           '<div class="credits-year">' + closingHtml + '</div>' +
         '</div>';
}`,
    tokens: { labelTracking: '0.2em' },
  }),
);
