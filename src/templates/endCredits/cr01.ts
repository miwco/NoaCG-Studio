// cr01 "Classic Roll" — the archetypal end-credits roll, and lt01 "Hairline"'s credits
// sibling (DESIGN_LANGUAGE.md §8, minimal family). No panel, no ornament: centered blocks of
// a role over the people credited with it, department headings in quiet accent caps, and one
// short gold hairline (the lt01 motif) above the logo at the very end. Whitespace does all
// the work.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCreditsVariant } from './shared';

// The whole credit list is one pasted field. A line ending in a colon is a role; every line
// beneath it is one of that role's names, which is how "Camera:" credits three people without
// repeating itself. "# Heading" opens a department, a blank line starts a new section.
// Full rule set: parseCredits in shared.ts, and docs/END_CREDITS.md.
const SAMPLE = [
  '# PRODUCTION',
  'Director: Alex Rivera',
  'Producer: Sam Chen',
  '',
  '# CAMERA',
  'Director of Photography: Maria Santos',
  'Camera Operators:',
  'Jonas Berg',
  'Lena Fors',
  'Petri Salo',
  '',
  'Special thanks to everyone who made this show possible',
].join('\n');

export const cr01: TemplateVariant = defineCreditsVariant(
  {
    id: 'cr01',
    category: 'end-credits',
    name: 'Classic Roll',
    styleTag: 'minimal',
    description: 'The classic down-scrolling roll - a bold role over the people credited with it, nothing else.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Credits', sample: SAMPLE },
      { title: 'Year / copyright', sample: '© 2026 Your Production' },
    ],
    // A credit is a role and the people who did it, and only one of them can be the headline.
    // Both answers are right for different shows, and neither is a different design - so it is
    // the user's pick in the Style step rather than two near-identical cards in Browse.
    styleChoices: [
      {
        key: 'emphasis',
        title: 'Emphasis',
        help: 'which line is the loud one',
        options: [
          { value: 'role', label: 'Role' },
          { value: 'name', label: 'Name' },
        ],
        value: 'role',
      },
    ],
    // OPTIONAL, defaulting on. A closing roll conventionally ends on a mark, so an untouched
    // build still carries one - but a broadcaster who does not want a logo slot must be able to
    // switch it off, and 'built-in' renders that checkbox checked AND disabled.
    logo: 'optional',
    defaultLogo: true,
    animationPresets: ['credits-roll'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Classic Roll',
    description:
      'The end-credits everyone knows: a steady upward roll of centered blocks, each one a ' +
      'role over the people credited with it - one name or five - department headings in ' +
      'quiet accent caps, and a single short hairline above the closing logo. lt01 ' +
      'Hairline’s credits sibling - restraint everywhere.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Classic Roll structure: one masked viewport; rebuildCredits() fills the track.
         The second class on the box picks which line is the loud one — swap it for the other
         one to flip the whole roll (see the CSS below). -->
    <div class="credits-box credits-box--emph-${o.styleChoices.emphasis}"><div id="credits-track"></div></div>`,
    css: `/* The viewport — a tall centered column the track rolls through. Its height is what
   the roll preset measures, so all travel math keys off this box. */
.credits-box {
  width: calc(1125px * var(--scale));   /* a comfortable reading column (~47% of 1920) */
  height: calc(1075px * var(--scale));  /* tall window — most of the frame, inside safe area */
  overflow: hidden;                    /* the mask: rows appear at the bottom, exit at the top */
}

/* The track — every row lives here; the preset animates its transform. */
#credits-track {
  text-align: center;                  /* the classic roll is centered — every stack aligns */
  will-change: transform;              /* hint the browser: this element travels every frame */
}

/* One section per .credits-page (rebuildCredits() wraps each parsed section). */
.credits-page {
  margin-bottom: calc(70px * var(--scale));  /* clear air between sections — bigger than any row gap */
}

/* Section heading — a quiet accent label, never louder than the names it introduces. */
.credits-heading {
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* kicker-sized (values are 1080p reference) */
  font-weight: 600;                    /* semibold — presence without weight */
  text-transform: uppercase;           /* small caps read as structure, not content */
  letter-spacing: 0.2em;               /* wide tracking — small caps breathe */
  color: var(--accent);                /* the one small, sharp dose of accent color */
  margin-top: calc(50px * var(--scale));     /* extra space above — a heading opens a chapter */
  margin-bottom: calc(35px * var(--scale));  /* then settles before its first credit */
}

/* ── Emphasis ──────────────────────────────────────────────────────────────────────
   A credit is a role and the people who did it, and only one of the two can be the
   headline. Which one is the single design decision in this template, so it is a single
   class on .credits-box in the HTML above — swap it and nothing else changes:

     credits-box--emph-role   ROLE loud, its names quieter beneath it. The department-list
                              shape: it stays right when one role credits five people,
                              because the role is the heading of its own little block.
     credits-box--emph-name   NAME loud, role a small dim label above it. The film
                              convention — the better read when nearly every role has
                              exactly one person and the names are what the audience came for.

   Both write the same six custom properties, so the rules further down never branch. */
.credits-box--emph-role {
  --credit-role-size: 34px;            /* the loud line — bigger than its names */
  --credit-role-weight: 700;           /* bold: the weight is what makes it the headline */
  --credit-role-color: var(--text-color);  /* full-strength; the dimming happens below it */
  --credit-name-size: 30px;            /* quieter, but never small — these are people's names */
  --credit-name-weight: 400;           /* regular against the role's bold */
  --credit-name-color: var(--text-color);  /* still full-strength: a name must always read */
}

.credits-box--emph-name {
  --credit-role-size: 25px;            /* the label — clearly subordinate to the name below */
  --credit-role-weight: 400;           /* regular; contrast comes from the name */
  --credit-role-color: var(--label-color);  /* the family's label color — dimmed */
  --credit-name-size: 43px;            /* ~1.7:1 over the role — the classic film hierarchy */
  --credit-name-weight: var(--display-weight);  /* the names' authored display weight */
  --credit-name-color: var(--text-color);  /* primary text color */
}

/* One credit — a centered block: the role, then every name credited with it. A role with
   five names is ONE of these, which is why the beat below sits on the group, not the name. */
.credits-group {
  margin-bottom: calc(40px * var(--scale));  /* the beat between roles — steady reading rhythm */
}

/* Role line. */
.credits-role {
  font-size: calc(var(--credit-role-size) * var(--scale) * var(--type-scale));
  font-weight: var(--credit-role-weight);
  text-transform: uppercase;           /* caps mark it as a label, loud or quiet */
  letter-spacing: var(--label-tracking);  /* the role label's authored tracking */
  color: var(--credit-role-color);
  line-height: 1.2;                    /* a long role may wrap; keep the two lines tight */
  margin-bottom: calc(8px * var(--scale));   /* small gap: a role and its names are one unit */
}

/* Name line — one per person credited with the role above. */
.credits-name {
  font-size: calc(var(--credit-name-size) * var(--scale) * var(--type-scale));
  font-weight: var(--credit-name-weight);
  line-height: 1.15;                   /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* large display type tightens slightly */
  color: var(--credit-name-color);
  overflow-wrap: break-word;           /* break a very long unbroken name */
}

/* Names under one role sit closer to each other than a role sits to the next role — that
   spacing is the only thing telling the audience these five people share one credit. */
.credits-name + .credits-name {
  margin-top: calc(8px * var(--scale));
}

/* A plain line belonging to no role — a name on its own, a line of thanks. It speaks in the
   same voice as a credited name so the column stays one design, with its own rhythm: rows of
   these are a list, so they sit tighter than a role and its names do. */
.credits-entry {
  padding: calc(8px * var(--scale)) 0;  /* the list rhythm — tighter than a .credits-group */
  font-size: calc(var(--credit-name-size) * var(--scale) * var(--type-scale));
  font-weight: var(--credit-name-weight);
  line-height: 1.2;                     /* comfortable for a long column of names */
  letter-spacing: var(--display-tracking);  /* matches the credited names above it */
  color: var(--credit-name-color);
  overflow-wrap: break-word;            /* break very long unbroken names */
}

/* The end block — hairline, logo, year. The roll preset stops with this centered. */
.credits-end {
  padding-top: calc(60px * var(--scale));    /* a long breath before the sign-off */
  padding-bottom: calc(15px * var(--scale)); /* small tail so the measurement isn't flush */
}

/* The hairline — lt01's 3px accent motif, laid horizontal and kept short. */
.credits-rule {
  width: calc(90px * var(--scale));    /* short on purpose — a mark, not a divider */
  height: var(--accent-weight);        /* the family's accent-rule weight */
  background: var(--accent);           /* same sharp accent dose as the headings */
  margin: 0 auto calc(40px * var(--scale));  /* centered, with air before the logo */
}

${o.logoEnabled ? `/* Delivered logo — kept modest; the credits end quietly, not with a billboard. */
.credits-logo {
  max-width: calc(375px * var(--scale));   /* wide logos shrink to fit the column's core */
  max-height: calc(138px * var(--scale));  /* tall logos cap here — proportions preserved */
  margin-bottom: calc(30px * var(--scale)); /* air between the logo and the year line */
}

/* Logo placeholder — an intentional, quietly framed box until a real logo is imported. */
.credits-logo-slot {
  display: inline-flex;                /* shrinks to its frame; centers its label */
  align-items: center;                 /* label sits in the vertical middle */
  justify-content: center;             /* …and the horizontal middle */
  width: calc(275px * var(--scale));   /* a believable logo footprint */
  height: calc(120px * var(--scale));   /* roughly 2.3:1 — generic mark proportions */
  border: 1px dashed var(--text-dim);  /* dashed keyline says "drop your logo here" */
  border-radius: calc(3px * var(--scale)); /* minimal family: 0-2px radius, nothing rounder */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* small caps label inside the frame */
  letter-spacing: 0.18em;              /* the same airy tracking as the headings */
  text-transform: uppercase;           /* label, not content */
  color: var(--text-dim);              /* dimmed — the placeholder never competes */
  margin-bottom: calc(30px * var(--scale)); /* same air as the real logo would get */
}` : ''}

/* Year / copyright — the very last line; quiet and dimmed. */
.credits-year {
  font-size: calc(25px * var(--scale) * var(--type-scale));  /* matches the role lines — closes the loop */
  font-weight: 400;                    /* regular — nothing shouts on the way out */
  letter-spacing: 0.04em;              /* a touch of air for the short closing line */
  color: var(--text-dim);              /* dimmed sign-off */
}`,
    tokens: {
      labelTracking: '0.14em',
      displayWeight: '600',
    },
    rowBuilderJs: `// ── Classic Roll row builders — rebuildCredits() calls these for every parsed entry ──

// renderCreditGroup(group): one role and EVERY name credited with it, as one centered block.
// This is the builder that matters: "Camera:" over five operators is a single block here, so
// the five names keep one role between them instead of repeating it five times.
function renderCreditGroup(group) {
  var names = '';
  group.names.forEach(function (name) {
    names += '<div class="credits-name">' + name + '</div>';
  });
  return '<div class="credits-group">' +
           '<div class="credits-role">' + group.role + '</div>' +
           names +
         '</div>';
}

// renderCreditRow(entry): everything that is not a group — a department heading, or a line
// belonging to no role at all.
function renderCreditRow(entry) {
  if (entry.type === 'heading') {
    // "# PRODUCTION" — a department, in quiet accent caps above the roles it collects.
    return '<div class="credits-heading">' + entry.text + '</div>';
  }
  if (entry.type === 'entry') {
    // A line with no role above it: a name on its own, a line of thanks.
    return '<div class="credits-entry">' + entry.text + '</div>';
  }
  // One role paired with one name — the same block a group draws, holding a single name.
  return renderCreditGroup({ role: entry.role, names: [entry.name] });
}

// renderEndBlock(yearHtml${o.logoEnabled ? ', logoSrc' : ''}): the sign-off the roll stops on —
// a short accent hairline${o.logoEnabled ? ', then the logo,' : ' and'} then the year line.${o.logoEnabled ? '' : `
// This project asked for no logo slot, so there is no f2 field and no mark to draw - the
// roll signs off on its hairline and its year alone.`}
function renderEndBlock(yearHtml${o.logoEnabled ? ', logoSrc' : ''}) {${o.logoEnabled ? `
  // With a delivered logo we show the image; without one, a styled placeholder
  // frame marks the slot (drop a file in via the import flow to fill it).
  var logo = logoSrc
    ? '<img class="credits-logo" src="' + logoSrc + '" alt="Logo">'
    : '<div class="credits-logo-slot">Your logo</div>';` : ''}
  return '<div class="credits-end">' +
           '<div class="credits-rule"></div>' +   // the lt01 hairline motif, laid flat${o.logoEnabled ? `
           logo +` : ''}
           '<div class="credits-year">' + yearHtml + '</div>' +
         '</div>';
}`,
  }),
);
