// cr07 "Thank You Wall" - the board of names that goes up at the end of a fundraiser, a
// community stream, a school production or a volunteer day. Minimal family, sibling of cr01
// and lt01.
//
// The format decision is the whole design: a wall is a BOARD, not a roll. People want to find
// their own name, and you cannot find your name in something that is moving. So it holds
// still and uses CSS columns to fit many names in one screen - which is also why the names
// here are plain lines rather than "Role | Name" pairs. The credits parser reads a pipe-less
// line inside a section as an ENTRY, so a wall is typed exactly the way you would write it:
// a heading, then one name per line.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCreditsVariant } from './shared';

const WALL_SAMPLE = [
  'WITH THANKS TO',
  'Alex Rivera',
  'Sam Chen',
  'Maria Santos',
  'Jonas Berg',
  'Priya Raman',
  'Wren Okafor',
  'Dara Nkemelu',
  'Elin Kristiansen',
  'Tomas Halvorsen',
  'Ruth Adeyemi',
  'Ingrid Vasquez',
  'Noah Lindqvist',
].join('\n');

export const cr07: TemplateVariant = defineCreditsVariant(
  {
    id: 'cr07',
    category: 'end-credits',
    name: 'Thank You Wall',
    styleTag: 'minimal',
    description: 'A held board of names in columns — a wall you can read, because nothing on it moves.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Names', sample: WALL_SAMPLE },
      { title: 'Footer', sample: 'Thank you — every one of you made this happen' },
    ],
    logo: 'built-in',
    animationPresets: ['credits-board'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Thank You Wall',
    description:
      'A wall of names, held still and set in balanced columns so a long list fits one ' +
      'screen: a tracked caps heading over its accent rule, then the names. Type one name ' +
      'per line; a blank line starts a new group with its own heading.',
    uicolor: '1',
  },
  () => ({
    html: `    <!-- Thank You Wall: .credits-box is the board; names are injected into #credits-track. -->
    <div class="credits-box credits-board">
      <div id="credits-track"></div>
    </div>`,
    css: `/* The board — a wide measure, because the names run in columns across it. */
.credits-box {
  width: calc(1760px * var(--scale));  /* wide: the wall is horizontal, unlike a roll */
  padding: calc(59px * var(--scale)) calc(75px * var(--scale));  /* generous board padding */
  text-align: center;              /* the heading centers over its columns */
  will-change: transform, opacity; /* hint the browser: the board fades and lifts on entry */
}

/* One group of names. Groups stack down the board — they are not pages. */
.credits-page + .credits-page {
  margin-top: calc(53px * var(--scale));  /* a clear break between groups */
}

/* Section heading — the tracked caps label with its accent rule beneath.
   It must stay a BLOCK: column-span only applies to block-level children of the multicol
   container, and an inline-block heading drops into column one and the names flow round it. */
.credits-heading {
  display: block;                  /* required for column-span below */
  width: fit-content;              /* so the rule underneath is only as wide as the words */
  margin-left: auto;               /* centred over the columns… */
  margin-right: auto;              /* …on both sides */
  padding-bottom: calc(13px * var(--scale));  /* air between the label and its rule */
  margin-bottom: calc(35px * var(--scale));   /* clear air before the columns begin */
  border-bottom: var(--accent-weight) solid var(--accent);  /* the group's one accent dose */
  font-size: calc(32px * var(--scale) * var(--type-scale));  /* label scale — it titles the wall */
  font-weight: 600;                /* firm enough for small caps to carry */
  letter-spacing: var(--label-tracking);  /* the label's authored tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label color */
}

/* A name on the wall. Three balanced columns: the list flows down one and into the next,
   which is what lets a wall hold thirty names on one readable screen. */
.credits-page {
  columns: 3;                      /* the wall's columns — CSS balances their heights */
  column-gap: calc(75px * var(--scale));  /* a clear gutter, so the columns read as separate */
}
/* The heading must span the columns rather than sitting inside the first one. */
.credits-page > .credits-heading {
  column-span: all;                /* the label titles the whole group, not one column */
}

.credits-entry {
  break-inside: avoid;             /* a name is never split across two columns */
  padding: calc(9px * var(--scale)) 0;  /* the wall's reading rhythm */
  font-size: calc(36px * var(--scale) * var(--type-scale));  /* comfortable at a distance, still fits three columns */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.25;               /* a long name may take two rows */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken names */
}

/* A "Role | Name" line, if the operator writes one — the wall still handles it. */
.credits-row {
  break-inside: avoid;             /* keep the pair together in one column */
  padding: calc(9px * var(--scale)) 0;  /* the same rhythm as a plain name */
}
.credits-role {
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* a small label above the name */
  font-weight: 500;                /* medium keeps small caps crisp */
  letter-spacing: 0.1em;           /* small caps breathe */
  text-transform: uppercase;       /* role labels are set in caps */
  color: var(--text-dim);          /* secondary text color */
}
.credits-name {
  font-size: calc(36px * var(--scale) * var(--type-scale));  /* level with the plain names */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.25;               /* shares the wall's rhythm */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken names */
}

/* The footer — the logo mark beside the closing line, under a dividing keyline. */
.credits-end {
  display: flex;                   /* mark and words on one row */
  align-items: center;             /* sharing one centerline */
  justify-content: center;         /* centered under the columns */
  gap: calc(27px * var(--scale));  /* air between the mark and the words */
  margin-top: calc(59px * var(--scale));  /* clear of the last column */
  padding-top: calc(32px * var(--scale));  /* air below the dividing keyline */
  border-top: 1px solid rgba(255, 255, 255, 0.14);  /* the minimal family's keyline value */
}

/* The logo, when one is picked. Capped by height so any aspect ratio behaves. */
.credits-logo {
  height: calc(53px * var(--scale));  /* a modest mark — the names are the content */
  width: auto;                     /* keep the logo's own proportions */
  object-fit: contain;             /* never crop or stretch the mark */
}

/* No logo picked yet — a quiet dashed slot, so the space is visibly reserved. */
.credits-logo-slot {
  padding: calc(9px * var(--scale)) calc(21px * var(--scale));  /* a small chip */
  border: 1px dashed rgba(255, 255, 255, 0.28);  /* clearly a placeholder */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the smallest type on the board */
  letter-spacing: 0.08em;          /* small caps breathe */
  text-transform: uppercase;       /* placeholder voice */
  color: var(--text-dim);          /* secondary text color */
}

/* The closing line — the year/copyright field, used here for a sentence of thanks. */
.credits-year {
  font-size: calc(28px * var(--scale) * var(--type-scale));  /* small print, but readable */
  font-weight: 400;                /* conversational weight */
  color: var(--text-dim);          /* secondary text color */
}`,
    rowBuilderJs: `// ── Thank You Wall row builders — rebuildCredits() calls these for every parsed line ──

// renderCreditRow(entry): a group heading, a plain name, or a "Role | Name" pair.
function renderCreditRow(entry) {
  if (entry.type === 'heading') {
    // The line that opens a group — "WITH THANKS TO", a giving level, a department.
    return '<div class="credits-heading">' + entry.text + '</div>';
  }
  if (entry.type === 'entry') {
    // A plain line inside the group: one name on the wall. This is the wall's normal row.
    return '<div class="credits-entry">' + entry.text + '</div>';
  }
  // "Role | Name" — still supported, set as a small label above the name.
  return '<div class="credits-row">' +
           '<div class="credits-role">' + entry.role + '</div>' +
           '<div class="credits-name">' + entry.name + '</div>' +
         '</div>';
}

// renderEndBlock(noteHtml, logoSrc): the board's footer — logo beside the closing line.
function renderEndBlock(noteHtml, logoSrc) {
  var logo = logoSrc
    ? '<img class="credits-logo" src="' + logoSrc + '" alt="Logo">'
    : '<div class="credits-logo-slot">Your logo</div>';
  return '<div class="credits-end">' +
           logo +
           '<div class="credits-year">' + noteHtml + '</div>' +
         '</div>';
}`,
    tokens: {
      accentWeight: 'calc(3px * var(--scale))',
      displayWeight: '500',
    },
  }),
);
