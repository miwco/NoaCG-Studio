// cr10 "Graduation Roll" - the reading of names: a commencement, a prize-giving, an awards
// list, an ordination. Minimal family, sibling of cr01 (Classic Roll) and lt01 (Hairline).
//
// It inverts the credits stack on purpose. A credit roll leads with the ROLE because the job
// is the subject and the person filling it is the detail. A graduation is the opposite: the
// person is the entire subject and the award is what is said about them. So here the first
// half of each line is set large and the second half small, and the field label says so -
// the operator types "Ada Fenwick | BSc Computer Science, with Distinction".
//
// It rolls rather than paging because a name list has a rhythm the roll matches: the reader
// in the hall is working down the same list at the same pace.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCreditsVariant } from './shared';

const GRADUATION_SAMPLE = [
  'BACHELOR OF SCIENCE',
  'Ada Fenwick | Computer Science, with Distinction',
  'Jonas Berg | Electronic Engineering',
  'Priya Raman | Mathematics, with Honours',
  '',
  'MASTER OF ARTS',
  'Maria Santos | Broadcast Journalism',
  'Wren Okafor | Design for Performance',
  '',
  'WITH THE CONGRATULATIONS OF THE FACULTY',
  'Ruth Adeyemi',
  'Tomas Halvorsen',
].join('\n');

export const cr10: TemplateVariant = defineCreditsVariant(
  {
    id: 'cr10',
    category: 'end-credits',
    name: 'Graduation Roll',
    styleTag: 'minimal',
    description: 'The reading of names — graduate large, award beneath, rolling at a ceremony pace.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name | Award', sample: GRADUATION_SAMPLE },
      { title: 'Footer', sample: 'Class of 2026' },
    ],
    logo: 'built-in',
    animationPresets: ['credits-roll', 'credits-loop'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Graduation Roll',
    description:
      'A ceremony name roll: each line is "Name | Award", with the graduate set large and ' +
      'the award small beneath — the inverse of a credit roll, because here the person is ' +
      'the subject. Degree groups become tracked caps headings with an accent hairline.',
    uicolor: '1',
  },
  () => ({
    html: `    <!-- Graduation Roll: .credits-box is the viewport; names go into #credits-track. -->
    <div class="credits-box">
      <div id="credits-track"></div>
    </div>`,
    css: `/* The viewport — the window the roll travels through. Presets fade THIS on out. */
.credits-box {
  width: calc(1000px * var(--scale));  /* wide enough that an award line rarely wraps */
  height: calc(1120px * var(--scale));  /* the window height; the roll travels behind it */
  overflow: hidden;                /* the rows above and below the window are not drawn */
  text-align: center;              /* a name roll is a centered column */
}

/* The track — the shared runtime injects rows here; creditsRoll() moves it. */
#credits-track {
  will-change: transform;          /* hint the browser: the roll tweens this element's y */
}

/* One degree group. Groups stack in normal flow as the roll passes through them. */
.credits-page {
  padding: calc(35px * var(--scale)) 0;  /* even air around each group */
}

/* The degree heading — tracked caps over a short accent hairline. */
.credits-heading {
  display: inline-block;           /* so the hairline is only as wide as the words */
  padding-bottom: calc(13px * var(--scale));  /* air between the label and its rule */
  margin-bottom: calc(37px * var(--scale));   /* clear air before the first name */
  border-bottom: var(--accent-weight) solid var(--accent);  /* the group's one accent dose */
  font-size: calc(28px * var(--scale) * var(--type-scale));  /* label scale — the names lead */
  font-weight: 600;                /* firm enough for small caps to carry */
  letter-spacing: var(--label-tracking);  /* the label's authored tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label color */
}

/* One graduate: the name, then the award beneath it. */
.credits-row {
  padding: calc(19px * var(--scale)) 0;  /* an unhurried rhythm — this is a ceremony */
}

/* THE NAME. The credits parser calls the first half of a line the "role"; on this design it
   is the person, and it is set as the loudest thing in the frame. */
.credits-role {
  font-size: calc(53px * var(--scale) * var(--type-scale));  /* the subject of the line */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* large display type tightens slightly */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken names */
}

/* THE AWARD. The second half of the line, set small: it is what is said about the person. */
.credits-name {
  margin-top: calc(7px * var(--scale));  /* name and award read as one unit */
  font-size: calc(29px * var(--scale) * var(--type-scale));  /* ~1.8:1 under the name */
  font-weight: 400;                /* conversational weight */
  line-height: 1.3;                /* an award with honours may wrap */
  color: var(--text-dim);          /* secondary text color */
  overflow-wrap: break-word;       /* break very long unbroken words */
}

/* A name with no award after it — read at the same size as a graduate's name, because it
   is the same thing: a person being named. */
.credits-entry {
  padding: calc(15px * var(--scale)) 0;  /* slightly tighter — there is no second row */
  font-size: calc(53px * var(--scale) * var(--type-scale));  /* level with a graduate's name */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.2;                /* comfortable for a run of names */
  letter-spacing: var(--display-tracking);  /* matches the named graduates above */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken names */
}

/* The closing block — hairline, the institution's mark, the class line. */
.credits-end {
  display: flex;                   /* the pieces stack… */
  flex-direction: column;          /* …top to bottom */
  align-items: center;             /* centered in the roll's column */
  gap: calc(32px * var(--scale));  /* even air between rule, mark and words */
  padding: calc(85px * var(--scale)) 0;  /* a long breath before the sign-off */
}

/* The hairline — the minimal family's accent, laid flat as the roll's final punctuation. */
.credits-rule {
  width: calc(112px * var(--scale));  /* a short stroke — a mark, not a divider */
  height: var(--accent-weight);    /* the family's accent weight */
  background: var(--accent);       /* the one small dose of accent color */
}

/* The logo, when one is picked. Capped by height so any aspect ratio behaves. */
.credits-logo {
  height: calc(85px * var(--scale));  /* the institution's mark, at sign-off size */
  width: auto;                     /* keep the logo's own proportions */
  object-fit: contain;             /* never crop or stretch the mark */
}

/* No logo picked yet — a dashed slot so the space is visibly reserved, not broken. */
.credits-logo-slot {
  padding: calc(20px * var(--scale)) calc(37px * var(--scale));  /* a chip the size of a real mark */
  border: 1px dashed rgba(255, 255, 255, 0.28);  /* clearly a placeholder */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the smallest type in the roll */
  letter-spacing: 0.08em;          /* small caps breathe */
  text-transform: uppercase;       /* placeholder voice */
  color: var(--text-dim);          /* secondary text color */
}

/* The class line — the year/copyright field, used here for "Class of 2026". */
.credits-year {
  font-size: calc(32px * var(--scale) * var(--type-scale));  /* a dignified closing line */
  font-weight: 400;                /* conversational weight */
  letter-spacing: 0.04em;          /* a touch of air */
  color: var(--text-dim);          /* secondary text color */
}`,
    rowBuilderJs: `// ── Graduation Roll row builders — rebuildCredits() calls these for every parsed line ──

// renderCreditRow(entry): a degree heading, a "Name | Award" pair, or a bare name.
//
// NOTE the inversion: entry.role is the first half of the typed line, which on THIS design
// is the GRADUATE, and entry.name is the award. The field is labelled "Name | Award" so the
// operator types them in that order.
function renderCreditRow(entry) {
  if (entry.type === 'heading') {
    // The line that opens a group — the degree, the prize, the order of merit.
    return '<div class="credits-heading">' + entry.text + '</div>';
  }
  if (entry.type === 'entry') {
    // A plain line inside the group: a name with nothing said after it.
    return '<div class="credits-entry">' + entry.text + '</div>';
  }
  return '<div class="credits-row">' +
           '<div class="credits-role">' + entry.role + '</div>' +   // the graduate
           '<div class="credits-name">' + entry.name + '</div>' +   // the award
         '</div>';
}

// renderEndBlock(classHtml, logoSrc): the closing block — hairline, institution mark, class line.
function renderEndBlock(classHtml, logoSrc) {
  var logo = logoSrc
    ? '<img class="credits-logo" src="' + logoSrc + '" alt="Logo">'
    : '<div class="credits-logo-slot">Your logo</div>';
  return '<div class="credits-end">' +
           '<div class="credits-rule"></div>' +
           logo +
           '<div class="credits-year">' + classHtml + '</div>' +
         '</div>';
}`,
    tokens: {
      accentWeight: 'calc(3px * var(--scale))',
      labelTracking: '0.22em',
      displayWeight: '500',
    },
  }),
);
