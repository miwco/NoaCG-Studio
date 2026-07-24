// ig36 "Frost Head to Head" — the glass stat comparison, sibling of ig02 "Glass Bars" and
// ig32 "Frost Table". A frosted card with the two competitors named over rounded centre-out
// bars.
//
// This is the pack's PLAYER stat cell as much as its team one: the two sides are as happily a
// pair of boxers, a pair of tennis players or a rider against the field as they are two clubs,
// which is why the header names them plainly rather than as HOME and AWAY.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineInfographicVariant } from './shared';
import { compareRowsRuntimeJs } from './sportsRuntimes';
import { compareBoardHtml, compareFields } from './sportsFields';

const ROWS = [
  'Significant strikes | 84 | 61',
  'Takedowns | 3 | 1',
  'Control time (min) | 9 | 4',
  'Knockdowns | 1 | 0',
].join('\n');

export const ig36: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig36',
    category: 'infographic',
    name: 'Frost Head to Head',
    styleTag: 'glass',
    description: 'A frosted comparison card: two named competitors over rounded centre-out bars.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Stats', sample: ROWS },
      { title: 'Heading', sample: 'FIGHT STATS' },
      { title: 'Side A', sample: 'Adesanya' },
      { title: 'Side B', sample: 'Pereira' },
    ],
    logo: 'none',
    animationPresets: ['bars-grow', 'rows-cascade'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Head to Head',
    description:
      'The glass stat comparison, sibling of ig02 Glass Bars and ig32 Frost Table: a frosted ' +
      'card with the two competitors named either side of a soft heading, then rounded bars ' +
      'growing out from the centre with the figures above them. Serves player stats as readily ' +
      'as team stats — two boxers, two players, a rider against the field.',
    uicolor: '5',
  },
  (o) => {
    const rowsText = o.lines[0]?.sample || ROWS;
    const headingText = o.lines[1]?.sample || 'FIGHT STATS';
    const sideAText = o.lines[2]?.sample || 'Adesanya';
    const sideBText = o.lines[3]?.sample || 'Pereira';

    return {
      html: compareBoardHtml({
        note: 'Frost Head to Head: frosted card — two named competitors over rounded bars.',
        heading: headingText,
        sideA: sideAText,
        sideB: sideBText,
        rows: rowsText,
      }),

      css: `${labelFontFaceCss(fontById('manrope'))}

/* The card — one frosted surface holding the whole comparison. */
.infographic-box {
  min-width: calc(540px * var(--scale));  /* a board — the two bars need room to read */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(22px * var(--scale)) calc(26px * var(--scale)) calc(20px * var(--scale));
  border-radius: var(--panel-radius);  /* the family's soft radius — a pane, not a slab */
  background: var(--panel-bg);     /* the frosted white wash */
  backdrop-filter: var(--panel-blur);  /* the family's real blur — this is the whole look */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* the lift, plus the glass keyline */
}

/* The header — the two competitors either side of a soft heading. */
.infographic-header {
  display: flex;                   /* side, heading, side in one row */
  align-items: baseline;           /* all three on one text baseline */
  justify-content: space-between;  /* the sides at the edges, the heading between them */
  gap: calc(16px * var(--scale));  /* air between them */
}
.infographic-heading {
  flex-shrink: 0;                  /* the heading keeps its width */
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* a label between two names */
  font-weight: 700;                /* solid at label size */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
  text-align: center;              /* centred between the two competitors */
}
.infographic-side {
  flex: 1;                         /* the two sides share the spare width evenly */
  min-width: 0;                    /* allow a long name to shrink and wrap */
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* the header's biggest text */
  font-weight: 700;                /* bold — the competitors lead the card */
  line-height: 1.2;                /* comfortable if a name wraps */
  color: var(--text-color);        /* primary text on the frost */
  overflow-wrap: break-word;       /* break a very long unbroken name */
}
.infographic-side-b { text-align: right; }  /* the second competitor reads toward their edge */

/* The rule — a glass keyline under the header. */
.infographic-rule {
  height: 1px;                     /* a true keyline — 1px at every resolution */
  margin-top: calc(13px * var(--scale));  /* air between the header and the rule */
  background: rgba(255, 255, 255, 0.22);  /* the glass keyline */
}

/* The board — stat rows stacked, with the family's generous spacing. */
#infographic-rows {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* one stat row under another */
  gap: calc(15px * var(--scale));  /* air between the stats */
  padding-top: calc(16px * var(--scale));  /* air under the rule */
}

/* One stat row: the figures and the name, then the pair of bars. */
.infographic-compare-head {
  display: flex;                   /* first figure, stat name, second figure in one row */
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
  font-weight: 800;                /* the heaviest thing in the row */
  line-height: 1.2;                /* on the row's baseline */
  color: var(--text-color);        /* primary text on the frost */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter as stats update */
}
.infographic-compare-away { text-align: right; }  /* the second figure reads toward its edge */
.infographic-compare-label {
  font-size: calc(13px * var(--scale) * var(--type-scale));  /* the smallest type in the row */
  font-weight: 600;                /* semibold keeps a small label legible */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--text-dim);          /* dimmed — the figures carry the row */
  text-align: center;              /* centred between the two figures */
}

/* The bar pair — rounded, meeting at the row's centre line. */
.infographic-compare-track {
  display: flex;                   /* the two halves side by side */
  gap: calc(6px * var(--scale));   /* a soft gap AT the centre, so the bars read as two */
  height: calc(10px * var(--scale));  /* slim, in keeping with the family's quiet register */
}
.infographic-compare-side {
  flex: 1;                         /* each side owns exactly half the track */
  display: flex;                   /* so the fill can be anchored inside it */
  background: rgba(255, 255, 255, 0.12);  /* the unfilled track, as a lighter pane of glass */
  border-radius: calc(999px * var(--scale));  /* fully rounded ends, the family's shape */
  overflow: hidden;                /* the fill is clipped to the track's radius */
}
/* Side A grows LEFTWARD from the centre — the fill is anchored to the track's right edge. */
.infographic-compare-side-a { justify-content: flex-end; }
.infographic-bar-fill {
  height: 100%;                    /* the fill is the full height of its track */
  border-radius: calc(999px * var(--scale));  /* the fill is rounded too, at any width */
  background: var(--accent);       /* the one accent surface */
}
/* The second competitor is the quieter of the two, so the sides read apart without labels. */
.infographic-compare-side-b .infographic-bar-fill {
  background: rgba(255, 255, 255, 0.55);  /* white against the accent — the glass pairing */
}`,
      fields: compareFields(rowsText, headingText, sideAText, sideBText),

      // The shared comparison rebuild — one "stat | home | away" per line (sportsRuntimes.ts).
      runtimeExtraJs: compareRowsRuntimeJs(),
    };
  },
);
