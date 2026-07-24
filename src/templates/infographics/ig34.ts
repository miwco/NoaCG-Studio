// ig34 "House Head to Head" — the NoaCG stat comparison, sibling of ig11 "House Poll" and
// ig30 "House Table". Team stats, player stats, a head-to-head: one row per stat, with the two
// sides' bars growing out from a centre line.
//
// The bars are each side's SHARE of the pair rather than its raw figure, which is what lets one
// board carry both "Possession | 62 | 38" (already a split) and "Shots | 14 | 9" (a pair of
// counts) without the operator converting anything. The figures PRINTED are always exactly what
// they typed — the drawing is derived, the text never is.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineInfographicVariant } from './shared';
import { compareRowsRuntimeJs } from './sportsRuntimes';
import { compareBoardHtml, compareFields } from './sportsFields';

const ROWS = [
  'Possession % | 62 | 38',
  'Shots | 17 | 8',
  'On target | 7 | 3',
  'Corners | 9 | 2',
  'Fouls | 8 | 14',
].join('\n');

export const ig34: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig34',
    category: 'infographic',
    name: 'House Head to Head',
    styleTag: 'noacg',
    description: 'The house stat comparison: one row per stat, bars growing out from the centre.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Stats', sample: ROWS },
      { title: 'Heading', sample: 'MATCH STATS' },
      { title: 'Side A', sample: 'HOME' },
      { title: 'Side B', sample: 'AWAY' },
    ],
    logo: 'none',
    animationPresets: ['bars-grow', 'rows-cascade'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'House Head to Head',
    description:
      'The NoaCG stat comparison, sibling of ig11 House Poll and ig30 House Table: a void panel ' +
      'with the two sides named either side of a mono heading, then one row per stat — the two ' +
      'figures and the stat name above a pair of bars that grow out from the centre. Serves team ' +
      'stats, player stats and a head-to-head; type one "stat | home | away" line per row.',
    uicolor: '4',
  },
  (o) => {
    const rowsText = o.lines[0]?.sample || ROWS;
    const headingText = o.lines[1]?.sample || 'MATCH STATS';
    const sideAText = o.lines[2]?.sample || 'HOME';
    const sideBText = o.lines[3]?.sample || 'AWAY';

    return {
      html: compareBoardHtml({
        note: 'House Head to Head: void panel — two named sides, then centre-out stat bars.',
        heading: headingText,
        sideA: sideAText,
        sideB: sideBText,
        rows: rowsText,
      }),

      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The panel — the house void, with the family's amber top edge. */
.infographic-box {
  min-width: calc(560px * var(--scale));  /* a board — the two bars need room to read */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(24px * var(--scale)) calc(30px * var(--scale)) calc(20px * var(--scale));
  background: var(--panel-bg);     /* the house void — retints through the :root contract */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
  border-top: calc(2px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);
}

/* The header — the two side names either side of the heading. */
.infographic-header {
  display: flex;                   /* side, heading, side in one row */
  align-items: baseline;           /* all three on one text baseline */
  justify-content: space-between;  /* the sides at the edges, the heading between them */
  gap: calc(16px * var(--scale));  /* air between them */
}
.infographic-heading {
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* a label, not a headline */
  font-weight: 500;                /* medium keeps tracked mono caps crisp */
  line-height: 1.25;               /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the house's wide label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the label carries the accent */
  text-align: center;              /* centred between the two sides */
}
/* The two side names — the row's anchors, in house display type. */
.infographic-side {
  flex: 1;                         /* the two sides share the spare width evenly */
  min-width: 0;                    /* allow a long team name to shrink and wrap */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* the header's biggest text */
  font-weight: var(--display-weight);  /* the house display weight */
  line-height: 1.2;                /* comfortable if a name wraps */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text on the void */
  overflow-wrap: break-word;       /* break a very long unbroken club name */
}
.infographic-side-b { text-align: right; }  /* the away side reads toward its own edge */

/* The rule — a dim keyline under the header. */
.infographic-rule {
  height: 1px;                     /* a true keyline — 1px at every resolution */
  margin-top: calc(14px * var(--scale));  /* air between the header and the rule */
  background: rgba(255, 255, 255, 0.14);  /* dim, not accent — the colour stays in the bars */
}

/* The board — stat rows stacked. */
#infographic-rows {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* one stat row under another */
  gap: calc(14px * var(--scale));  /* air between the stats */
  padding-top: calc(16px * var(--scale));  /* air under the rule */
}

/* One stat row: the figures and the name, then the pair of bars. */
.infographic-compare-head {
  display: flex;                   /* home figure, stat name, away figure in one row */
  align-items: baseline;           /* all three on one text baseline */
  justify-content: space-between;  /* the figures at the edges, the name between them */
  gap: calc(14px * var(--scale));  /* air between them */
  margin-bottom: calc(6px * var(--scale));  /* air above the bars */
}
.infographic-compare-home,
.infographic-compare-away {
  flex-shrink: 0;                  /* the figures never squeeze — the name gives up width */
  min-width: calc(52px * var(--scale));  /* a shared column, so both sides' figures align */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* the row's anchor */
  font-weight: var(--display-weight);  /* the house display weight */
  line-height: 1.2;                /* on the row's baseline */
  color: var(--text-color);        /* primary text on the void */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter as stats update */
}
.infographic-compare-away { text-align: right; }  /* the away figure reads toward its own edge */
.infographic-compare-label {
  font-family: var(--font-label);  /* mono: a stat name is a label, not display type */
  font-size: calc(13px * var(--scale) * var(--type-scale));  /* the smallest type in the row */
  font-weight: 500;                /* medium keeps tracked mono caps crisp */
  letter-spacing: var(--label-tracking);  /* the house's wide label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--text-dim);          /* dimmed — the figures carry the row */
  text-align: center;              /* centred between the two figures */
}

/* The bar pair — two halves meeting at the row's centre line. */
.infographic-compare-track {
  display: flex;                   /* the two halves side by side */
  gap: calc(4px * var(--scale));   /* a small gap AT the centre, so the bars read as two */
  height: calc(8px * var(--scale));  /* a slim bar — this board is figures first, bars second */
}
.infographic-compare-side {
  flex: 1;                         /* each side owns exactly half the track */
  display: flex;                   /* so the fill can be anchored inside it */
  background: rgba(255, 255, 255, 0.08);  /* the unfilled track */
  border-radius: calc(2px * var(--scale));  /* barely softened, in keeping with the house chips */
  overflow: hidden;                /* the fill is clipped to the track's radius */
}
/* Side A grows LEFTWARD from the centre — the fill is anchored to the track's right edge. */
.infographic-compare-side-a { justify-content: flex-end; }
.infographic-bar-fill {
  height: 100%;                    /* the fill is the full height of its track */
  background: var(--accent);       /* the one accent surface */
  box-shadow: var(--accent-glow);  /* the family's glow — follows the accent colour */
}
/* Side B is the quieter of the two, so a viewer can tell the sides apart without the labels. */
.infographic-compare-side-b .infographic-bar-fill {
  background: color-mix(in srgb, var(--accent) 45%, transparent);  /* the accent, stepped back */
  box-shadow: none;                /* only the leading side glows */
}`,

      tokens: {
        labelTracking: '0.2em',
      },
      fields: compareFields(rowsText, headingText, sideAText, sideBText),

      // The shared comparison rebuild — one "stat | home | away" per line (sportsRuntimes.ts).
      runtimeExtraJs: compareRowsRuntimeJs(),
    };
  },
);
