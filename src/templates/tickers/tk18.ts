// tk18 "Status Rotator" — the technical/status strip. One service at a time, held long enough
// to read, advanced by the graphic's own timer and pausable on air.
//
// Items are written "Service — status" and the runtime splits them at the dash: the service
// name goes into a fixed-width column in caps, the status follows in ordinary sentence case.
// The column is what makes a rotating status list scannable — the eye learns where the name
// starts and stops re-reading it.
//
// Rotating, not crawling, and that is the point of the design: a status you might have to act
// on should not be something you have to wait for. The cycle is the ticker type's state
// machine, so an operator can hold it on the line someone is asking about
// (docs/STATE_MACHINE_SCHEMA.md).

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineTickerVariant } from './shared';

export const tk18: TemplateVariant = defineTickerVariant(
  {
    id: 'tk18',
    category: 'ticker',
    name: 'Status Rotator',
    styleTag: 'minimal',
    description: 'Service statuses one at a time — timed, pausable, and split into a name column.',
    maxLines: 2,
    suggestedLines: [
      {
        title: 'Statuses (use — between service and status)',
        sample: [
          'Northern line — delays of up to 20 minutes',
          'Harbour ferry — running to timetable',
          'Airport shuttle — suspended until 14:00',
          'City buses — running to timetable',
        ].join('\n'),
      },
      { title: 'Label', sample: 'Service status' },
    ],
    logo: 'none',
    // Only the rotate preset suits this graphic: the other two animate forever, and a state
    // machine's timer can never arm on a timeline that never ends.
    animationPresets: ['ticker-rotate'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Status Rotator',
    description:
      'The operations strip: one service status at a time, each held long enough to read, ' +
      'with the service name in a fixed column so the list can be scanned. The cycle is the ' +
      'graphic’s own timer, so an operator can hold it mid-list.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Status Rotator: label left, one status at a time in the slot on the right. -->
    <div class="ticker-box">
      <!-- The label block — the strip's single accent moment. -->
      <div class="ticker-label"><span id="f1">${o.lines[1]?.sample || 'Service status'}</span></div>
      <!-- The slot. The rotator replaces its contents on each beat of the machine. -->
      <div class="ticker-viewport">
        <div id="ticker-track"></div>
      </div>
    </div>`,
    css: `/* The strip — a flat dark bar edged by the accent along its top. */
.ticker-box {
  display: flex;                   /* label left, slot filling the rest */
  align-items: stretch;            /* the label block spans the full strip height */
  width: calc(1560px * var(--scale));  /* wide, inside the safe areas */
  min-height: calc(80px * var(--scale)); /* a floor: a long status wraps and the strip grows */
  background: var(--panel-bg);     /* near-black bar — never pure #000 */
  border-top: var(--accent-weight) solid var(--accent);  /* the strip's authored accent weight */
  will-change: opacity;            /* hint the browser: the preset fades this */
}

/* The label block — solid accent, dark ink. */
.ticker-label {
  display: flex;                   /* center the label text inside the block */
  align-items: center;             /* vertical centering */
  flex-shrink: 0;                  /* never squeezed by the slot */
  padding: 0 calc(28px * var(--scale));  /* generous horizontal breathing room */
  background: var(--accent);       /* the one solid accent surface */
  font-size: calc(18px * var(--scale) * var(--type-scale)); /* kicker scale */
  font-weight: 700;                /* bold so the small caps carry */
  letter-spacing: var(--label-tracking);  /* the label block's authored tracking */
  text-transform: uppercase;       /* reads as a tag, whatever the operator types */
  color: var(--accent-ink);        /* the family's ink on an accent-filled block */
  white-space: nowrap;             /* the label never wraps */
}

/* The slot. The rotate preset's shared CSS (templates/tickers/shared.ts) already turns the
   track into an ordinary wrapping block; this just gives it its padding and centreline. */
.ticker-viewport {
  flex-grow: 1;                    /* take all the strip width the label leaves */
  display: flex;                   /* so the current item can be vertically centered */
  align-items: center;             /* the item sits on the strip's centerline */
  padding: calc(14px * var(--scale)) calc(30px * var(--scale));
  /* Flush LEFT, whatever anchor zone the graphic is placed in. The root's zone rule sets
     text-align from the anchor (a bottom-CENTER strip inherits centred text), and a centred
     status turns the service-name column below into a ragged edge that lines up with nothing —
     which is the one thing the column exists to prevent. */
  text-align: left;
}

/* One status — the service name column plus the status text. */
.ticker-item {
  font-size: calc(24px * var(--scale) * var(--type-scale)); /* comfortable at reading distance */
  font-weight: 400;                /* regular — a status is read, not scanned */
  line-height: 1.28;               /* comfortable across a wrap */
  color: var(--text-color);        /* primary text color */
}

/* The service name — a fixed column in caps, so the eye always knows where the name ends and
   the status begins. Inline-block rather than a table cell: a long name should push its
   status along, not be truncated. */
.ticker-service {
  display: inline-block;           /* so it can hold a minimum width */
  min-width: calc(320px * var(--scale)); /* the name column */
  padding-right: calc(20px * var(--scale)); /* air before the status */
  font-weight: 700;                /* the name anchors the row */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* the column reads as labels */
  color: var(--label-color);       /* the family's label colour */
  vertical-align: baseline;        /* the name and the status share a baseline */
}`,
    // renderTickerItem(text): "Service — status". Accepts an em dash, an en dash or a plain
    // hyphen surrounded by spaces; an item written any other way renders whole, so a typo
    // never makes a status disappear.
    rowBuilderJs: `// renderTickerItem(text): one status — the service name is split into its own column.
function renderTickerItem(text) {
  var m = text.match(/^(.*\\S)\\s+[\\u2014\\u2013-]\\s+(\\S.*)$/);
  if (m) {
    return '<span class="ticker-item">' +
           '<span class="ticker-service">' + m[1] + '</span>' + m[2] +
           '</span>';
  }
  return '<span class="ticker-item">' + text + '</span>';
}`,
    // A rotating strip shows ONE item at a time — the assembler turns doubling off for the
    // rotate preset anyway, and this says the design never wanted it.
    doubleItems: false,
    tokens: { accentWeight: 'calc(2px * var(--scale))', labelTracking: '0.12em' },
  }),
);
