// cr06 "Credit Reel" - production credits that REPEAT. House style, sibling of cr01 and lt11.
//
// The end credits of a film run once and stop. A credit reel does not: it is the thing on
// screen for the twenty minutes after a service, a conference day or a charity stream, while
// the room empties and the chat says goodbye. So it loops, and the loop has to be invisible -
// a reel that snaps back to the top every ninety seconds looks broken, and everyone watching
// a wall of names is watching closely enough to see it.
//
// The seam is solved by cloning: creditsLoop() (endCredits/creditsMotion.ts) measures one run
// of the list, appends as many copies as the viewport needs, and travels exactly one run's
// height. When the tween repeats, copy two is already sitting where copy one began.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineCreditsVariant } from './shared';

const REEL_SAMPLE = [
  'PRODUCTION',
  'Director | Alex Rivera',
  'Producer | Sam Chen',
  'Line Producer | Priya Raman',
  '',
  'GALLERY',
  'Vision Mixer | Jonas Berg',
  'Sound Supervisor | Maria Santos',
  'Graphics | Wren Okafor',
  '',
  'THANK YOU',
  'Every volunteer who gave a Saturday to this',
].join('\n');

export const cr06: TemplateVariant = defineCreditsVariant(
  {
    id: 'cr06',
    category: 'end-credits',
    name: 'Credit Reel',
    styleTag: 'noacg',
    description: 'Production credits that loop seamlessly — for the long tail after a show, not a one-shot roll.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Credits', sample: REEL_SAMPLE },
      { title: 'Year / copyright', sample: '© 2026 Your Production' },
    ],
    logo: 'built-in',
    animationPresets: ['credits-loop', 'credits-roll'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'Credit Reel',
    description:
      'The house credit reel: mono section labels in the accent color, role above name in ' +
      'display type, and an amber-ruled sign-off block — all running as a seamless loop for ' +
      'the long tail after a show. Switch it to Rolling credits for a one-shot ending.',
    uicolor: '4',
  },
  () => ({
    html: `    <!-- Credit Reel: .credits-box is the viewport; rows are injected into #credits-track. -->
    <div class="credits-box">
      <div id="credits-track"></div>
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The viewport — the window the reel travels through. Presets fade THIS on out. */
.credits-box {
  width: calc(1125px * var(--scale));   /* the reel's measure — a comfortable column of names */
  height: calc(1025px * var(--scale));  /* the window height; the loop travels behind it */
  overflow: hidden;                /* the rows above and below the window are not drawn */
  text-align: center;              /* the reel is a centered column, like a film's */
}

/* The track — the shared runtime injects rows here; creditsLoop() moves it. */
#credits-track {
  will-change: transform;          /* hint the browser: the loop tweens this element's y */
}

/* One section of the reel. On a loop these stack in normal flow, one after another. */
.credits-page + .credits-page {
  margin-top: calc(48px * var(--scale));  /* a clear break between sections */
}

/* Section heading — the house mono label in the accent color. */
.credits-heading {
  margin-bottom: calc(25px * var(--scale));  /* air before the section's first credit */
  font-family: var(--font-label);  /* the family's mono label face */
  font-size: calc(25px * var(--scale) * var(--type-scale));  /* label scale — it titles the section */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  letter-spacing: var(--label-tracking);  /* wide tracking — the label breathes */
  text-transform: uppercase;       /* label voice, whatever the operator types */
  color: var(--label-color);       /* the label carries the accent */
}

/* One credit — role above name, the classic reel stack. */
.credits-row {
  padding: calc(14px * var(--scale)) 0;  /* the reel's reading rhythm */
}

/* The role — the quiet half of the pair. */
.credits-role {
  font-family: var(--font-label);  /* mono, so roles read as data and names as people */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* ~1:2 under the name */
  font-weight: 400;                /* light — this line labels, it does not announce */
  letter-spacing: 0.08em;          /* small mono caps need a little air */
  text-transform: uppercase;       /* role labels are set in caps */
  color: var(--text-dim);          /* secondary text color */
}

/* The name — the person. The loud half of every pair. */
.credits-name {
  margin-top: calc(5px * var(--scale));  /* role and name read as one unit */
  font-size: calc(43px * var(--scale) * var(--type-scale));  /* ~2:1 over the role */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken names */
}

/* A pipe-less line inside a section — a name with no role, or a line of thanks. */
.credits-entry {
  padding: calc(10px * var(--scale)) 0;  /* tighter than a role-above-name stack */
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* a shade under a credited name */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.25;               /* comfortable for a run of names */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken names */
}

/* The sign-off block — amber rule, logo, year. On a loop it comes round again, by design. */
.credits-end {
  display: flex;                   /* the three pieces stack… */
  flex-direction: column;          /* …top to bottom */
  align-items: center;             /* centered in the reel's column */
  gap: calc(25px * var(--scale));  /* even air between rule, mark and year */
  padding: calc(70px * var(--scale)) 0;  /* a long breath before and after the sign-off */
}

/* The amber rule — the house accent, laid flat as the reel's punctuation. */
.credits-rule {
  width: calc(113px * var(--scale));  /* a short stroke — a mark, not a divider */
  height: var(--accent-weight);    /* the family's accent weight */
  background: var(--accent);       /* the one sharp dose of accent color */
  box-shadow: var(--accent-glow);  /* the house glow, on the accent element only */
}

/* The logo, when one is picked. Capped by height so any aspect ratio behaves. */
.credits-logo {
  height: calc(73px * var(--scale));  /* the sign-off's mark, clearly bigger than a footer logo */
  width: auto;                     /* keep the logo's own proportions */
  object-fit: contain;             /* never crop or stretch the mark */
}

/* No logo picked yet — a dashed slot so the space is visibly reserved, not broken. */
.credits-logo-slot {
  padding: calc(18px * var(--scale)) calc(33px * var(--scale));  /* a chip the size of a real mark */
  border: 1px dashed color-mix(in srgb, var(--accent) 45%, transparent);  /* clearly a placeholder */
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the smallest type in the reel */
  letter-spacing: 0.12em;          /* small caps breathe */
  text-transform: uppercase;       /* placeholder voice */
  color: var(--text-dim);          /* secondary text color */
}

/* The year / copyright line. */
.credits-year {
  font-family: var(--font-label);  /* mono, like every piece of house small print */
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* small print scale */
  letter-spacing: 0.06em;          /* a little air at small size */
  color: var(--text-dim);          /* secondary text color */
}`,
    rowBuilderJs: `// ── Credit Reel row builders — rebuildCredits() calls these for every parsed line ──

// renderCreditRow(entry): a mono section label, a role-above-name credit, or a plain name.
function renderCreditRow(entry) {
  if (entry.type === 'heading') {
    // The line that opens a section — the house mono label, in the accent color.
    return '<div class="credits-heading">' + entry.text + '</div>';
  }
  if (entry.type === 'entry') {
    // A plain line inside a section: a name with no role, a line of thanks.
    return '<div class="credits-entry">' + entry.text + '</div>';
  }
  // "Role | Name" — the reel's stack: mono role label above the person's name.
  return '<div class="credits-row">' +
           '<div class="credits-role">' + entry.role + '</div>' +
           '<div class="credits-name">' + entry.name + '</div>' +
         '</div>';
}

// renderEndBlock(yearHtml, logoSrc): the sign-off — amber rule, logo, year. On the looping
// preset this is not an ending: it is the seam the reel comes round through.
function renderEndBlock(yearHtml, logoSrc) {
  var logo = logoSrc
    ? '<img class="credits-logo" src="' + logoSrc + '" alt="Logo">'
    : '<div class="credits-logo-slot">Your logo</div>';
  return '<div class="credits-end">' +
           '<div class="credits-rule"></div>' +
           logo +
           '<div class="credits-year">' + yearHtml + '</div>' +
         '</div>';
}`,
    tokens: {
      accentWeight: 'calc(4px * var(--scale))',
      labelTracking: '0.24em',
    },
  }),
);
