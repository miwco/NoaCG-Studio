// ig37 "Club Head to Head" — the minimal stat comparison, and the pack's amateur one. Sibling
// of ig13 "Clean Poll" and ig33 "Club Table".
//
// A club records its stats by hand on a clipboard, so this cell keeps the figures large and the
// bars thin: the numbers are the fact, the bars are only there to say which way round they go.
// Flat panel, one keyline, no blur — the same reasoning as the rest of the amateur column.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineInfographicVariant } from './shared';
import { compareRowsRuntimeJs } from './sportsRuntimes';
import { compareBoardHtml, compareFields } from './sportsFields';

const ROWS = [
  'Shots | 12 | 7',
  'Corners | 6 | 3',
  'Fouls | 9 | 11',
  'Offsides | 2 | 4',
].join('\n');

export const ig37: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig37',
    category: 'infographic',
    name: 'Club Head to Head',
    styleTag: 'minimal',
    description: 'The amateur stat board: big figures, thin bars, full club names, a flat panel.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Stats', sample: ROWS },
      { title: 'Heading', sample: 'MATCH STATS' },
      { title: 'Side A', sample: 'Ashton United' },
      { title: 'Side B', sample: 'Marske Town' },
    ],
    logo: 'none',
    animationPresets: ['bars-grow', 'rows-cascade'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Club Head to Head',
    description:
      'The local and amateur stat comparison, sibling of ig13 Clean Poll and ig33 Club Table: a ' +
      'flat panel with full club names either side of a small heading, big figures, and thin ' +
      'bars that only say which way round the numbers go. Drawn for stats recorded by hand on ' +
      'a clipboard, where the figure is the fact.',
    uicolor: '1',
  },
  (o) => {
    const rowsText = o.lines[0]?.sample || ROWS;
    const headingText = o.lines[1]?.sample || 'MATCH STATS';
    const sideAText = o.lines[2]?.sample || 'Ashton United';
    const sideBText = o.lines[3]?.sample || 'Marske Town';

    return {
      html: compareBoardHtml({
        note: 'Club Head to Head: flat panel — full club names, big figures, thin bars.',
        heading: headingText,
        sideA: sideAText,
        sideB: sideBText,
        rows: rowsText,
      }),

      css: `${labelFontFaceCss(fontById('inter'))}

/* The panel — flat and solid. No blur: a club stream's bitrate cannot afford one. */
.infographic-box {
  min-width: calc(520px * var(--scale));  /* a board — the two bars need room to read */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(20px * var(--scale)) calc(24px * var(--scale)) calc(18px * var(--scale));
  background: var(--panel-bg);     /* the family's solid dark panel */
  box-shadow: var(--panel-shadow); /* the family's lift */
  border-left: var(--accent-weight) solid var(--accent);  /* the family's one accent rule */
}

/* The header — the two clubs either side of a small heading. */
.infographic-header {
  display: flex;                   /* club, heading, club in one row */
  align-items: baseline;           /* all three on one text baseline */
  justify-content: space-between;  /* the clubs at the edges, the heading between them */
  gap: calc(14px * var(--scale));  /* air between them */
}
.infographic-heading {
  flex-shrink: 0;                  /* the heading keeps its width */
  font-size: calc(13px * var(--scale) * var(--type-scale));  /* small: this line is reference */
  font-weight: 600;                /* semibold keeps small caps legible */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
  text-align: center;              /* centred between the two clubs */
}
.infographic-side {
  flex: 1;                         /* the two clubs share the spare width evenly */
  min-width: 0;                    /* allow a long club name to shrink and wrap */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* the header's biggest text */
  font-weight: 600;                /* semibold — present, not shouted */
  line-height: 1.25;               /* comfortable for a long mixed-case club name */
  color: var(--text-color);        /* primary text on the panel */
  overflow-wrap: break-word;       /* break a very long unbroken club name */
}
.infographic-side-b { text-align: right; }  /* the visiting club reads toward its own edge */

/* The rule — the family's one divider. */
.infographic-rule {
  height: 1px;                     /* a true keyline — 1px at every resolution */
  margin-top: calc(12px * var(--scale));  /* air between the header and the rule */
  background: rgba(255, 255, 255, 0.20);  /* the family's divider */
}

/* The board — stat rows stacked. */
#infographic-rows {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* one stat row under another */
  gap: calc(13px * var(--scale));  /* air between the stats */
  padding-top: calc(15px * var(--scale));  /* air under the rule */
}

/* One stat row: big figures with the name between them, then the thin bars. */
.infographic-compare-head {
  display: flex;                   /* home figure, stat name, away figure in one row */
  align-items: baseline;           /* all three on one text baseline */
  justify-content: space-between;  /* the figures at the edges, the name between them */
  gap: calc(14px * var(--scale));  /* air between them */
  margin-bottom: calc(5px * var(--scale));  /* air above the bars */
}
.infographic-compare-home,
.infographic-compare-away {
  flex-shrink: 0;                  /* the figures never squeeze — the name gives up width */
  min-width: calc(50px * var(--scale));  /* a shared column, so both sides' figures align */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* BIG: on this board the figure is the fact */
  font-weight: 700;                /* bold — the numbers lead */
  line-height: 1.15;               /* on the row's baseline */
  color: var(--text-color);        /* primary text on the panel */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter as stats update */
}
.infographic-compare-away { text-align: right; }  /* the away figure reads toward its own edge */
.infographic-compare-label {
  font-size: calc(13px * var(--scale) * var(--type-scale));  /* the smallest type in the row */
  font-weight: 500;                /* medium — a stat name is a plain label here */
  color: var(--text-dim);          /* dimmed — the figures carry the row */
  text-align: center;              /* centred between the two figures */
}

/* The bar pair — deliberately thin: they say which way round the figures go, nothing more. */
.infographic-compare-track {
  display: flex;                   /* the two halves side by side */
  gap: calc(4px * var(--scale));   /* a small gap AT the centre, so the bars read as two */
  height: calc(5px * var(--scale));  /* a hairline bar — the family's quietest register */
}
.infographic-compare-side {
  flex: 1;                         /* each side owns exactly half the track */
  display: flex;                   /* so the fill can be anchored inside it */
  background: rgba(255, 255, 255, 0.10);  /* the unfilled track */
  overflow: hidden;                /* the fill is clipped to the track */
}
/* Side A grows LEFTWARD from the centre — the fill is anchored to the track's right edge. */
.infographic-compare-side-a { justify-content: flex-end; }
.infographic-bar-fill {
  height: 100%;                    /* the fill is the full height of its track */
  background: var(--accent);       /* the one accent surface */
}
/* The visiting club is the quieter of the two, so the sides read apart without labels. */
.infographic-compare-side-b .infographic-bar-fill {
  background: rgba(255, 255, 255, 0.50);  /* white against the accent — a flat, printable pairing */
}`,
      fields: compareFields(rowsText, headingText, sideAText, sideBText),

      // The shared comparison rebuild — one "stat | home | away" per line (sportsRuntimes.ts).
      runtimeExtraJs: compareRowsRuntimeJs(),
    };
  },
);
