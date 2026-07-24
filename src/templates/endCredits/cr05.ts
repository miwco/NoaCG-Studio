// cr05 "Schedule Hold" - the running order as a holding screen: a conference track, a
// festival stage, a church programme, a telethon's hour-by-hour. Minimal family, sibling of
// cr01 (Classic Roll) and lt01 (Hairline).
//
// It is built on the credits list because a schedule IS a credit list with different nouns:
// one line per item, "19:30 | Doors open", sections separated by blank lines. Everything the
// credits runtime already does - parsing, rebuilding on update(), the section model - is
// exactly what a schedule needs, so nothing new had to be invented for it.
//
// It ships on the STATIC BOARD preset, and that is the design decision that matters. Rolling
// a schedule past the audience means the line they are looking for is the one that just left
// the screen. A board holds every line until stop().

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCreditsVariant } from './shared';

const SCHEDULE_SAMPLE = [
  'TODAY',
  '09:30 | Doors open',
  '10:00 | Keynote — Designing for Live',
  '11:15 | Workshop: Motion in the Gallery',
  '13:00 | Lunch, foyer',
  '14:00 | Panel: The Control Room in 2030',
  '16:30 | Closing remarks',
].join('\n');

export const cr05: TemplateVariant = defineCreditsVariant(
  {
    id: 'cr05',
    category: 'end-credits',
    name: 'Schedule Hold',
    styleTag: 'minimal',
    description: 'The running order as a holding board — time on the left, item on the right, nothing moving.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Schedule', sample: SCHEDULE_SAMPLE },
      { title: 'Footer', sample: 'All times local' },
    ],
    logo: 'built-in',
    animationPresets: ['credits-board'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Schedule Hold',
    description:
      'A running-order board: each line is "time | item", set as a two-column list with the ' +
      'times right-aligned in tabular figures so they form a clean edge. Sections (blank-line ' +
      'separated) get a tracked caps heading. The board fades up once and holds.',
    uicolor: '1',
  },
  () => ({
    // Structure: the viewport plus the track. The board preset never travels, so the track
    // sits in normal flow and the sections stack down the page.
    html: `    <!-- Schedule Hold: .credits-box is the board; rows are injected into #credits-track. -->
    <div class="credits-box credits-board">
      <div id="credits-track"></div>
    </div>`,
    css: `/* The board — a fixed measure so the time column and the item column stay aligned
   whatever the operator types. No fixed HEIGHT: the board is as tall as the day is long. */
.credits-box {
  width: calc(1080px * var(--scale));  /* the board's measure — wide enough for a real item title */
  padding: calc(50px * var(--scale)) calc(65px * var(--scale));  /* generous board padding */
  text-align: left;                /* a running order is read down a left edge — the anchor
                                      zone's own text-align would centre it, which turns the
                                      item column into a ragged shape instead of a list */
  box-shadow: var(--panel-keyline);  /* the minimal family's 1px keyline, no fill behind it */
  will-change: transform, opacity; /* hint the browser: the board fades and lifts on entry */
}

/* One section of the day. On a board these stack in normal flow — they are not pages. */
.credits-page {
  display: block;                  /* normal flow: every section is visible at once */
}
.credits-page + .credits-page {
  margin-top: calc(43px * var(--scale));  /* a clear break between sections of the day */
}

/* Section heading — "TODAY", "MORNING", a stage name: a tracked caps label with a rule. */
.credits-heading {
  padding-bottom: calc(13px * var(--scale));  /* air between the label and its rule */
  margin-bottom: calc(20px * var(--scale));   /* air between the rule and the first row */
  border-bottom: var(--accent-weight) solid var(--accent);  /* the section's one accent dose */
  font-size: calc(28px * var(--scale) * var(--type-scale));  /* label scale — it titles, it does not compete */
  font-weight: 600;                /* firm enough for small caps to carry */
  letter-spacing: var(--label-tracking);  /* the label's authored tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label color */
}

/* One scheduled item: time on the left, item on the right, on one baseline. */
.credits-row {
  display: grid;                   /* two columns, so every time lines up under the last */
  grid-template-columns: calc(188px * var(--scale)) 1fr;  /* a fixed time column; the item takes the rest */
  column-gap: calc(43px * var(--scale));  /* the gutter between the time and its item */
  align-items: baseline;           /* time and item share a baseline, like a printed programme */
  padding: calc(11px * var(--scale)) 0;  /* the list rhythm */
}

/* The time — right-aligned tabular figures, which is what makes the column an edge. */
.credits-role {
  text-align: right;               /* every time ends on the same vertical line */
  font-size: calc(35px * var(--scale) * var(--type-scale));  /* level with the item it belongs to */
  font-weight: 500;                /* medium: the time is data, the item is the message */
  line-height: 1.3;                /* shares the row's rhythm */
  font-variant-numeric: tabular-nums;  /* fixed-width digits — the column cannot wobble */
  color: var(--accent);            /* the times carry the accent: they are what people scan for */
}

/* The item — the message of the row. */
.credits-name {
  font-size: calc(35px * var(--scale) * var(--type-scale));  /* the running text of the board */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.3;                /* comfortable for an item title that wraps */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken words */
}

/* A pipe-less line inside a section — a note between items ("Lunch, foyer"), no time. */
.credits-entry {
  padding: calc(11px * var(--scale)) 0;  /* the same list rhythm as a timed row */
  padding-left: calc(230px * var(--scale));  /* aligned to the item column, not the time column */
  font-size: calc(33px * var(--scale) * var(--type-scale));  /* a shade under a timed item */
  font-weight: 400;                /* conversational — it is an aside, not a slot */
  line-height: 1.3;                /* shares the board's rhythm */
  color: var(--text-dim);          /* secondary text color */
}

/* The footer block — the credits end block, used here as the board's small print + logo. */
.credits-end {
  display: flex;                   /* logo and note on one row */
  align-items: center;             /* sharing one centerline */
  gap: calc(23px * var(--scale));  /* air between the mark and the words */
  margin-top: calc(45px * var(--scale));  /* clear of the last item */
  padding-top: calc(25px * var(--scale));  /* air below the dividing keyline */
  border-top: 1px solid rgba(255, 255, 255, 0.14);  /* the minimal family's keyline value */
}

/* The logo, when one is picked. Capped by height so any aspect ratio behaves. */
.credits-logo {
  height: calc(43px * var(--scale));  /* a small mark — the schedule is the content */
  width: auto;                     /* keep the logo's own proportions */
  object-fit: contain;             /* never crop or stretch the mark */
}

/* No logo picked yet — a quiet dashed slot, so the space is visibly reserved, not broken. */
.credits-logo-slot {
  padding: calc(8px * var(--scale)) calc(18px * var(--scale));  /* a small chip */
  border: 1px dashed rgba(255, 255, 255, 0.28);  /* clearly a placeholder, not a design element */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the smallest type on the board */
  letter-spacing: 0.08em;          /* small caps breathe */
  text-transform: uppercase;       /* placeholder voice */
  color: var(--text-dim);          /* secondary text color */
}

/* The footer note — the year/copyright field, used here for "All times local". */
.credits-year {
  font-size: calc(25px * var(--scale) * var(--type-scale));  /* small print */
  font-weight: 400;                /* conversational weight */
  color: var(--text-dim);          /* secondary text color */
}`,
    rowBuilderJs: `// ── Schedule Hold row builders — rebuildCredits() calls these for every parsed line ──

// renderCreditRow(entry): a timed item, a section heading, or an untimed note.
function renderCreditRow(entry) {
  if (entry.type === 'heading') {
    // The line that opens a section — the day, the stage, the part of the programme.
    return '<div class="credits-heading">' + entry.text + '</div>';
  }
  if (entry.type === 'entry') {
    // A pipe-less line inside a section: a note with no time of its own.
    return '<div class="credits-entry">' + entry.text + '</div>';
  }
  // "09:30 | Doors open" — the time is the role column, the item is the name column.
  return '<div class="credits-row">' +
           '<div class="credits-role">' + entry.role + '</div>' +
           '<div class="credits-name">' + entry.name + '</div>' +
         '</div>';
}

// renderEndBlock(noteHtml, logoSrc): the board's footer — the logo mark beside the small print.
function renderEndBlock(noteHtml, logoSrc) {
  // With a delivered logo we show the image; without one, a dashed slot marks the space.
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
      displayWeight: '600',
    },
  }),
);
