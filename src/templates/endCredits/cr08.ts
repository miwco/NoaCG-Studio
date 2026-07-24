// cr08 "Donor Wall" - the giving board for a telethon, a gala, a capital campaign or a
// church appeal. Glass family, sibling of cr02 (Column Roll) and lt08 (Frosted Card).
//
// A donor wall is a THANK YOU WALL WITH TIERS, and the tiers are the whole etiquette of it:
// people gave at a level and the level is named, in order, with the largest first. The
// credits parser already models exactly that - a blank line starts a group, the group's first
// line names it - so a tier is typed as a heading and its donors as plain lines under it.
//
// It loops rather than holding, because a real donor list is longer than one screen and every
// name on it was paid for. cr07 (Thank You Wall) is the held-board answer for a short list.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCreditsVariant } from './shared';

const DONOR_SAMPLE = [
  'PRINCIPAL BENEFACTORS',
  'The Halvorsen Family Foundation',
  'Meridian Community Trust',
  '',
  'PATRONS',
  'Alex & Sam Rivera',
  'Dr. Ada Fenwick',
  'Okafor Brothers Ltd',
  'Anonymous',
  '',
  'SUPPORTERS',
  'Priya Raman',
  'Jonas Berg',
  'Elin Kristiansen',
  'Ruth Adeyemi',
  'Tomas Halvorsen',
  'Ingrid Vasquez',
].join('\n');

export const cr08: TemplateVariant = defineCreditsVariant(
  {
    id: 'cr08',
    category: 'end-credits',
    name: 'Donor Wall',
    styleTag: 'glass',
    description: 'Giving levels and their donors, looping seamlessly — the gala and telethon wall.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Donors by level', sample: DONOR_SAMPLE },
      { title: 'Footer', sample: 'With gratitude — the 2026 Appeal' },
    ],
    logo: 'built-in',
    animationPresets: ['credits-loop', 'credits-roll'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Donor Wall',
    description:
      'A frosted giving board: each tier is a heading with a soft accent rule, its donors ' +
      'listed beneath in even weight — nobody within a level is set larger than anyone else. ' +
      'Loops seamlessly, so a long list plays for as long as the appeal runs.',
    uicolor: '2',
  },
  () => ({
    html: `    <!-- Donor Wall: .credits-box is the frosted viewport; tiers go into #credits-track. -->
    <div class="credits-box">
      <div id="credits-track"></div>
    </div>`,
    css: `/* The frosted viewport — the window the wall travels through. */
.credits-box {
  width: calc(1307px * var(--scale));   /* a comfortable column for organisation-length names */
  height: calc(1120px * var(--scale));  /* the window height; the loop travels behind it */
  padding: 0 calc(75px * var(--scale));  /* side air inside the glass */
  overflow: hidden;                /* the rows above and below the window are not drawn */
  text-align: center;              /* a wall is a centered column */
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* The track — the shared runtime injects tiers here; creditsLoop() moves it. */
#credits-track {
  will-change: transform;          /* hint the browser: the loop tweens this element's y */
}

/* One giving level. Levels stack in normal flow, largest first, as typed. */
.credits-page {
  padding: calc(40px * var(--scale)) 0;  /* even air around each level */
}

/* The level's name — a tracked caps label between two soft accent rules. The rules are
   drawn with pseudo-elements so the label sits INSIDE a line, the way a printed programme
   sets a section: it reads as a division of the list, not as another entry in it. */
.credits-heading {
  display: flex;                   /* rule · label · rule on one row */
  align-items: center;             /* the rules meet the label's centerline */
  gap: calc(27px * var(--scale));  /* air between the label and each rule */
  margin-bottom: calc(29px * var(--scale));  /* clear air before the first donor */
  font-size: calc(28px * var(--scale) * var(--type-scale));  /* label scale — it divides, it does not compete */
  font-weight: 600;                /* semibold keeps small caps legible */
  letter-spacing: var(--label-tracking);  /* the label's authored tracking */
  text-transform: uppercase;       /* reads as a level, whatever the operator types */
  color: var(--label-color);       /* the family's label color */
  white-space: nowrap;             /* the level name holds one row; the rules give way */
}
.credits-heading::before,
.credits-heading::after {
  content: '';                     /* pseudo-elements render only with content set */
  flex: 1;                         /* the two rules share whatever width is left */
  height: 1px;                     /* a true hairline — this is punctuation, not an accent bar */
  background: color-mix(in srgb, var(--accent) 45%, transparent);  /* a softened accent line */
}

/* A donor. Every name inside a level is set identically — the level is the distinction,
   and setting one giver larger than their neighbour inside a tier is the way to offend both. */
.credits-entry {
  padding: calc(11px * var(--scale)) 0;  /* the wall's reading rhythm */
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* readable at a distance across a room */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.25;               /* an organisation's full name may wrap */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken names */
}

/* A "Role | Name" line, if the operator writes one (a named gift, a dedication). */
.credits-row {
  padding: calc(11px * var(--scale)) 0;  /* the same rhythm as a plain donor */
}
.credits-role {
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* a small label above the name */
  font-weight: 500;                /* medium keeps small caps crisp */
  letter-spacing: 0.1em;           /* small caps breathe */
  text-transform: uppercase;       /* label voice */
  color: var(--text-dim);          /* secondary text color */
}
.credits-name {
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* level with the plain donors */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.25;               /* shares the wall's rhythm */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken names */
}

/* The gratitude block — the seam the loop comes round through. */
.credits-end {
  display: flex;                   /* the pieces stack… */
  flex-direction: column;          /* …top to bottom */
  align-items: center;             /* centered in the wall's column */
  gap: calc(27px * var(--scale));  /* even air between mark and words */
  padding: calc(69px * var(--scale)) 0;  /* a long breath before and after the sign-off */
}

/* The logo, when one is picked. Capped by height so any aspect ratio behaves. */
.credits-logo {
  height: calc(72px * var(--scale));  /* the appeal's mark, at sign-off size */
  width: auto;                     /* keep the logo's own proportions */
  object-fit: contain;             /* never crop or stretch the mark */
}

/* No logo picked yet — a dashed slot so the space is visibly reserved, not broken. */
.credits-logo-slot {
  padding: calc(17px * var(--scale)) calc(35px * var(--scale));  /* a chip the size of a real mark */
  border: 1px dashed rgba(255, 255, 255, 0.3);  /* clearly a placeholder */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the smallest type on the wall */
  letter-spacing: 0.1em;           /* small caps breathe */
  text-transform: uppercase;       /* placeholder voice */
  color: var(--text-dim);          /* secondary text color */
}

/* The closing line — the year/copyright field, used here for the appeal's thanks. */
.credits-year {
  font-size: calc(29px * var(--scale) * var(--type-scale));  /* small print, but readable */
  font-weight: 400;                /* conversational weight */
  color: var(--text-dim);          /* secondary text color */
}`,
    rowBuilderJs: `// ── Donor Wall row builders — rebuildCredits() calls these for every parsed line ──

// renderCreditRow(entry): a giving level, a donor, or a "Role | Name" dedication.
function renderCreditRow(entry) {
  if (entry.type === 'heading') {
    // The line that opens a group — the giving level ("PATRONS", "SUPPORTERS").
    return '<div class="credits-heading">' + entry.text + '</div>';
  }
  if (entry.type === 'entry') {
    // A plain line inside the level: one donor. This is the wall's normal row.
    return '<div class="credits-entry">' + entry.text + '</div>';
  }
  // "In memory of | The Halvorsen Family" — a dedication, label above the name.
  return '<div class="credits-row">' +
           '<div class="credits-role">' + entry.role + '</div>' +
           '<div class="credits-name">' + entry.name + '</div>' +
         '</div>';
}

// renderEndBlock(noteHtml, logoSrc): the gratitude block — the appeal's mark and its thanks.
function renderEndBlock(noteHtml, logoSrc) {
  var logo = logoSrc
    ? '<img class="credits-logo" src="' + logoSrc + '" alt="Logo">'
    : '<div class="credits-logo-slot">Your logo</div>';
  return '<div class="credits-end">' +
           logo +
           '<div class="credits-year">' + noteHtml + '</div>' +
         '</div>';
}`,
    tokens: { labelTracking: '0.2em' },
  }),
);
