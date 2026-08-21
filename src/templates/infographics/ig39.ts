// ig39 "Key Figures" - the catalog's first TWO-COLUMN STAT LIST: a header band, one
// "label | figure" row under the next, and a footer naming the source and the date the numbers
// are good for. Editorial family, sibling of lt25 "Masthead" and card64 "Results Table".
//
// WHY IT IS NOT ANOTHER FACTS BOARD. ig14-ig17 already do rows of typed text, but they set the
// term OVER its explanation: a reading shape, for a sentence that has to be understood. This is
// the shape a viewer SCANS - a results announcement, a budget line, a season's totals - where
// every row is one word and one number, the numbers are compared down the column, and the label
// is only there to say which number this is. That comparison is what needs a real second
// column, and the catalog had no design that drew one.
//
// The rows are the canonical repeating field ("Label | figure" per line, dataRuntimes.ts), so a
// figure is added, removed or reordered by typing. `statListRuntimeJs` is a runtime of its own
// rather than a reuse of the bar shapes, and its header says why: those nest the readout inside
// a growing bar, which is exactly what stops a figure being a grid column (ig38 pays that price
// in full). Here label and figure are siblings, so the row IS two tracks and every figure lands
// on one right edge because they share a column - not because a padding cleared the room.
//
// The figures are typed text, never parsed: "€4.21bn", "12.4 %" and "1,203" all render exactly
// as written. Nothing derives a share from them, so nothing needs to read them as numbers - and
// the entrance is the row cascade rather than a count, because a list of unlike units (money,
// people, percentages) counting up together would read as one moving total.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { statListRuntimeJs } from './dataRuntimes';
import { defineInfographicVariant } from './shared';

// One line per figure, in the order the desk wants them read - the runtime keeps that order.
const FIGURES_SAMPLE = [
  'Revenue | €4.21bn',
  'Operating profit | €612m',
  'Employees | 18,400',
  'Markets served | 42',
].join('\n');

export const ig39: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig39',
    category: 'infographic',
    name: 'Key Figures',
    styleTag: 'editorial',
    description: 'A printed two-column stat list: one "label | figure" row per line, on paper.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Figures', sample: FIGURES_SAMPLE },
      { title: 'Title', sample: 'Key figures' },
      { title: 'Period', sample: 'Full year 2026' },
      { title: 'Source', sample: 'Source: annual report' },
      { title: 'Date', sample: 'As of 31 December 2026' },
    ],
    logo: 'none',
    animationPresets: ['rows-cascade'],
    // The one light palette in the editorial set. A stat list is the printed page this family
    // is named after, and paper is where a table of figures has always been read.
    defaultPalette: paletteById('broadsheet'),
    // A serif whose own digits are already even (fonts.ts tabularFigures), so the figures hold
    // their width without the export carrying a second face for the numbers alone.
    defaultFontId: 'source-serif-4',
    defaultZone: 'mid-center',
  },
  {
    name: 'Key Figures',
    description:
      'The printed key-figures sheet: a solid header band carrying the title and the period, ' +
      'then one row per figure - the label set on the left, the figure large and right-aligned ' +
      'so the whole column shares an edge - and a footer rule under which the source and the ' +
      'date sit. Type one "Label | figure" line per row; add, remove or reorder them freely. ' +
      'The figures are written exactly as you type them, currency marks and units included.',
    uicolor: '6',
  },
  (o) => {
    const figures = o.lines[0]?.sample || FIGURES_SAMPLE;
    const title = o.lines[1]?.sample || 'Key figures';
    const period = o.lines[2]?.sample || 'Full year 2026';
    const source = o.lines[3]?.sample || 'Source: annual report';
    const date = o.lines[4]?.sample || 'As of 31 December 2026';

    return {

      // The stage: the width this design holds a full-length value at, so the panel

      // stops re-sizing itself between one piece of content and the next.

      stageWidth: 980,
      html: `    <!-- Key Figures: [band: title + period] / one "label | figure" row per line / [source + date]. -->
    <div class="infographic-box">
      <!-- The header band - the sheet's masthead, printed on the accent across its full width. -->
      <div class="infographic-band">
        <div class="infographic-title" id="f1">${title}</div>
        <!-- The period the figures cover. Cleared, it removes itself (:empty) rather than
             leaving a hole in the band. -->
        <div class="infographic-period" id="f2">${period}</div>
      </div>
      <!-- The rows - rendered by rebuildInfographic() from the hidden source below. -->
      <div id="infographic-rows"></div>
      <!-- The footer - what the figures are and when they were true. Both are FIELDS rather
           than furniture: a table of numbers with no date on it is a table nobody can check,
           and the wording belongs to the channel broadcasting it. -->
      <div class="infographic-foot">
        <div class="infographic-source" id="f3">${source}</div>
        <div class="infographic-date" id="f4">${date}</div>
      </div>
    </div>
    <!-- Hidden figures source - SPX writes field f0 here; JS renders it.
         One "Label | figure" per line. -->
    <div id="f0" class="noacg-data-source">${figures}</div>`,

      css: `/* The sheet - a flat printed surface with square corners. Its width is STATED rather than
   hugged, because the figure column's right edge is the design: a sheet that resized itself as
   a longer label came in would move every figure on the board while it was on air. */
.infographic-box {
  width: calc(980px * var(--scale));  /* the stated measure - one right edge for every figure */
  box-sizing: border-box;          /* the band's own padding stays inside that width */
  background: var(--panel-bg);     /* the editorial paper (or ink) surface */
  border-radius: var(--panel-radius);  /* the family token is exactly zero */
  overflow: hidden;                /* the band is full-bleed, so it takes the panel's corners */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* the family's lift and inner edge */
  text-align: left;                /* a table reads from its own left edge, never centred */
}

/* The header band - the one solid accent area. It runs the full width rather than sitting in
   the sheet's margin: a printed table's head is a band across the page, not a line inside it. */
.infographic-band {
  display: flex;                   /* title left, period right… */
  justify-content: space-between;  /* …pushed to the band's own edges */
  align-items: baseline;           /* both sit on one baseline whatever their sizes */
  gap: calc(32px * var(--scale));  /* the two never touch */
  padding: calc(20px * var(--scale)) calc(40px * var(--scale));  /* the sheet's printed margin */
  background: var(--accent);       /* the single accent surface */
}

/* The title - set in the family's display weight, in whatever case the operator types. Caps
   would collide with the tracked period beside it; two label voices in one band read as one. */
.infographic-title {
  min-width: 0;                    /* a long title shrinks and wraps rather than pushing out */
  font-size: calc(36px * var(--scale) * var(--type-scale));  /* the masthead - the rows still lead */
  font-weight: var(--display-weight);  /* the exact editorial 600 */
  line-height: 1.1;                /* tight for a display line that may wrap */
  letter-spacing: var(--display-tracking);  /* the exact -0.015em editorial setting */
  color: var(--accent-ink);        /* the on-accent ink token - the paper colour, reversed out */
}

/* The period - the band's tracked caps label, printed in the same reversed ink one step back. */
.infographic-period {
  flex: none;                      /* the period keeps its width; the title gives way first */
  font-family: var(--font-label);  /* the family's label face (its own heading serif) */
  /* LINING figures, not the serif's default old-style ones: "2026" set beside all-caps letters
     has to stand at cap height, or the year reads as lowercase inside its own label. */
  font-variant-numeric: lining-nums tabular-nums;
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* label scale, above the type floor */
  font-weight: 700;                /* solid at label size, over a moving picture */
  line-height: 1.2;                /* one tight label row */
  letter-spacing: var(--label-tracking);  /* the exact 0.24em editorial tracking */
  text-transform: uppercase;       /* a period label is always caps */
  color: var(--accent-ink);        /* reversed out of the band, like the title */
  opacity: 0.78;                   /* one step behind the title without a second colour */
}
.infographic-period:empty { display: none; }  /* cleared, it leaves no hole in the band */

/* The rows - the table itself, inside the sheet's printed margin. */
#infographic-rows {
  padding: calc(6px * var(--scale)) calc(40px * var(--scale)) 0;  /* the margin the band bleeds past */
}

/* One figure row: [label][figure] - a real two-column grid, which is what a stat list is for.
   The label track takes what is left, the figure track takes exactly what it needs, and every
   figure ends on the same edge because they are in one column. A hairline between rows is the
   editorial way to separate them; the last row leaves it off, since the footer's accent rule
   already closes the table. */
.infographic-row {
  display: grid;                   /* the row's two tracks */
  grid-template-columns: minmax(0, 1fr) auto;  /* label takes the rest, figure takes its own width */
  align-items: baseline;           /* label and figure sit on one baseline, however unlike their sizes */
  column-gap: calc(36px * var(--scale));  /* the label never runs into the figure */
  padding: calc(18px * var(--scale)) 0;  /* the row's own air, above and below */
  border-bottom: 1px solid color-mix(in srgb, var(--text-color) 20%, transparent);  /* the printed hairline */
}
#infographic-rows > .infographic-row:last-child {
  border-bottom: none;             /* the footer rule closes the table instead */
}

/* The label - the quiet half. It says which number this is and then gets out of the way. */
.infographic-stat-label {
  min-width: 0;                    /* a long label wraps inside its track instead of pushing out */
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* the row's reading size */
  font-weight: 400;                /* running weight - the figure carries the emphasis */
  line-height: 1.25;               /* comfortable for a label that may wrap to two lines */
  color: var(--text-color);        /* primary text - a label nobody can read names nothing */
  overflow-wrap: break-word;       /* break a very long unbroken word rather than overflow */
}

/* The figure - the loud half, and the reason the row is a grid: right-aligned in its own track,
   in a face whose digits are all one width, so the column lines up down the sheet and a
   corrected number never moves the one below it. */
.infographic-stat-figure {
  font-family: var(--font-numeric);  /* a face whose digits are all one width */
  /* Tabular AND lining. Tabular is what holds the column; lining is what makes it a column of
     figures at all - a text serif's default old-style digits ride at x-height with 3, 4, 7 and 9
     hanging below the line, so "42" would sit lower than "18,400" beside it and every figure
     would break the baseline it shares with its label. */
  font-variant-numeric: lining-nums tabular-nums;
  font-size: calc(54px * var(--scale) * var(--type-scale));  /* the figure leads every row */
  font-weight: var(--display-weight);  /* the exact editorial 600 */
  line-height: 1;                  /* the figure sits on the row's baseline */
  letter-spacing: var(--display-tracking);  /* the exact -0.015em editorial setting */
  color: var(--text-color);        /* primary text - the accent belongs to the band and the rule */
  text-align: right;               /* every figure ends on the column's edge */
  white-space: nowrap;             /* "€4.21bn" is one thing and never breaks in half */
}

/* The footer - the family's 2px printed rule, then what the figures are and when they were true. */
.infographic-foot {
  display: flex;                   /* source left, date right… */
  align-items: baseline;           /* …on one baseline */
  gap: calc(32px * var(--scale));  /* the two never touch */
  margin: 0 calc(40px * var(--scale));  /* the rule stops at the printed margin, like the rows */
  padding: calc(18px * var(--scale)) 0 calc(26px * var(--scale));  /* air under the rule and to the edge */
  border-top: var(--accent-weight) solid var(--accent);  /* the family's exact 2px printed rule */
}

/* Source and date - one tracked caps voice, stepped back from every row above them. */
.infographic-source,
.infographic-date {
  font-family: var(--font-label);  /* the family's label face */
  font-variant-numeric: lining-nums tabular-nums;  /* a date's digits stand at cap height too */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* the smallest type on the sheet */
  font-weight: 700;                /* solid at label size, over a moving picture */
  line-height: 1.3;                /* tracked caps need air */
  letter-spacing: var(--label-tracking);  /* the exact 0.24em editorial tracking */
  text-transform: uppercase;       /* reads as a caption, whatever the operator types */
  color: var(--text-dim);          /* subordinate to the table */
}
.infographic-date {
  margin-left: auto;               /* the date holds the right edge even with the source cleared */
  text-align: right;               /* …and sets under the figure column it dates */
}
.infographic-source:empty,
.infographic-date:empty { display: none; }  /* either one cleared costs a deletion, not a gap */`,

      fields: [
        { field: 'f0', ftype: 'textarea', title: o.lines[0]?.title || 'Figures', value: figures },
        { field: 'f1', ftype: 'textfield', title: o.lines[1]?.title || 'Title', value: title },
        { field: 'f2', ftype: 'textfield', title: o.lines[2]?.title || 'Period', value: period },
        { field: 'f3', ftype: 'textfield', title: o.lines[3]?.title || 'Source', value: source },
        { field: 'f4', ftype: 'textfield', title: o.lines[4]?.title || 'Date', value: date },
      ],

      runtimeExtraJs: statListRuntimeJs(),
    };
  },
);
