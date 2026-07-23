// ig23 "Volt Head to Head" — the sport stat comparison, sibling of ig12 "Volt Poll" and ig19
// "Volt Table". A hard slab with the two sides on an accent bar and heavy centre-out bars.
//
// The bars are thicker here than in the other three cells and the figures sit inside the track
// rather than above it: a sport stat board is often shown full-frame during a break, where the
// bar itself is the graphic and the numbers are confirmation.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineInfographicVariant } from './shared';
import { compareRowsRuntimeJs } from './sportsRuntimes';
import { compareBoardHtml, compareFields } from './sportsFields';

const ROWS = [
  'FIELD GOAL % | 48 | 41',
  'REBOUNDS | 44 | 38',
  'ASSISTS | 27 | 19',
  'TURNOVERS | 9 | 15',
].join('\n');

export const ig23: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig23',
    category: 'infographic',
    name: 'Volt Head to Head',
    styleTag: 'sport',
    description: 'A sport slab stat board: an accent header bar and heavy centre-out comparison bars.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Stats', sample: ROWS },
      { title: 'Heading', sample: 'TEAM STATS' },
      { title: 'Side A', sample: 'LAKERS' },
      { title: 'Side B', sample: 'CELTICS' },
    ],
    logo: 'none',
    animationPresets: ['bars-grow', 'rows-cascade'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-center',
  },
  {
    name: 'Volt Head to Head',
    description:
      'The sport stat comparison, sibling of ig12 Volt Poll and ig19 Volt Table: a hard slab ' +
      'with the two sides named on a solid accent bar either side of the heading, then heavy ' +
      'centre-out bars with the figures set inside the track. Built for the full-frame stat ' +
      'break, where the bar is the graphic and the numbers confirm it.',
    uicolor: '2',
  },
  (o) => {
    const rowsText = o.lines[0]?.sample || ROWS;
    const headingText = o.lines[1]?.sample || 'TEAM STATS';
    const sideAText = o.lines[2]?.sample || 'LAKERS';
    const sideBText = o.lines[3]?.sample || 'CELTICS';

    return {
      html: compareBoardHtml({
        note: 'Volt Head to Head: sport slab — accent header bar, then heavy centre-out bars.',
        heading: headingText,
        sideA: sideAText,
        sideB: sideBText,
        rows: rowsText,
      }),

      css: `${labelFontFaceCss(fontById('archivo'))}

/* The slab — flat, hard-edged and opaque. Contrast, not blur, carries this family. */
.infographic-box {
  min-width: calc(600px * var(--scale));  /* a full-frame stat board */
  box-sizing: border-box;          /* padding stays inside the measured width */
  background: var(--panel-bg);     /* the near-black sport panel */
  box-shadow: var(--panel-shadow); /* the family's lift */
  overflow: hidden;                /* the accent bar stops at the slab's edge */
}

/* The header — a solid accent bar carrying both side names and the heading. */
.infographic-header {
  display: flex;                   /* side, heading, side in one row */
  align-items: baseline;           /* all three on one text baseline */
  justify-content: space-between;  /* the sides at the edges, the heading between them */
  gap: calc(16px * var(--scale));  /* air between them */
  padding: calc(12px * var(--scale)) calc(24px * var(--scale));  /* the bar's height */
  background: var(--accent);       /* the one big accent surface */
}
.infographic-heading {
  flex-shrink: 0;                  /* the heading keeps its width */
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* a label between two names */
  font-weight: 700;                /* solid: a sport label is never light */
  letter-spacing: var(--label-tracking);  /* the family's wide label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: color-mix(in srgb, var(--accent-ink) 75%, transparent);  /* the ink, stepped back */
}
.infographic-side {
  flex: 1;                         /* the two sides share the spare width evenly */
  min-width: 0;                    /* allow a long club name to shrink and wrap */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* the header's biggest text */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.1;                /* tight — condensed caps need little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* a sport board runs in caps */
  color: var(--accent-ink);        /* dark on accent — the family's contrast pairing */
  overflow-wrap: break-word;       /* break a very long unbroken club name */
}
.infographic-side-b { text-align: right; }  /* the away side reads toward its own edge */

/* No separate rule: the accent bar IS the header's edge. */
.infographic-rule { display: none; }

/* The board — stat rows stacked. */
#infographic-rows {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* one stat row under another */
  gap: calc(12px * var(--scale));  /* air between the stats */
  padding: calc(18px * var(--scale)) calc(24px * var(--scale)) calc(20px * var(--scale));
}

/* The stat name sits alone above its bar; the FIGURES ride inside the track below. */
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
  min-width: calc(56px * var(--scale));  /* a shared column, so both sides' figures align */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* the row's anchor */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.1;                /* on the row's baseline */
  color: var(--text-color);        /* paper white on the slab */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter as stats update */
}
.infographic-compare-away { text-align: right; }  /* the away figure reads toward its own edge */
.infographic-compare-label {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(13px * var(--scale) * var(--type-scale));  /* the smallest type in the row */
  font-weight: 700;                /* solid at label size */
  letter-spacing: var(--label-tracking);  /* the family's wide label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--text-dim);          /* dimmed — the figures carry the row */
  text-align: center;              /* centred between the two figures */
}

/* The bar pair — heavy, meeting at the row's centre line with a hard gap between them. */
.infographic-compare-track {
  display: flex;                   /* the two halves side by side */
  gap: calc(6px * var(--scale));   /* a hard gap AT the centre, so the bars read as two */
  height: calc(16px * var(--scale));  /* heavy — on this board the bar IS the graphic */
}
.infographic-compare-side {
  flex: 1;                         /* each side owns exactly half the track */
  display: flex;                   /* so the fill can be anchored inside it */
  background: rgba(255, 255, 255, 0.08);  /* the unfilled track */
  overflow: hidden;                /* the fill is clipped to the track */
}
/* Side A grows LEFTWARD from the centre — the fill is anchored to the track's right edge. */
.infographic-compare-side-a { justify-content: flex-end; }
.infographic-bar-fill {
  height: 100%;                    /* the fill is the full height of its track */
  background: var(--accent);       /* the one accent surface */
}
/* Side B is the quieter of the two, so the sides are distinguishable without reading labels. */
.infographic-compare-side-b .infographic-bar-fill {
  background: rgba(255, 255, 255, 0.55);  /* white rather than a tinted accent — hard contrast */
}`,
      fields: compareFields(rowsText, headingText, sideAText, sideBText),

      // The shared comparison rebuild — one "stat | home | away" per line (sportsRuntimes.ts).
      runtimeExtraJs: compareRowsRuntimeJs(),
    };
  },
);
