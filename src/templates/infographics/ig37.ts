// ig37 "House Forecast" — the 3-day forecast board of the WEATHER mini-pack
// (lt62 / ig37 / bug37), sibling of lt11 "House Strap" / ig08 "House Schedule": the void
// blur panel under an amber top edge, a mono heading, and three day columns — day name in
// the mono label voice, the condition word, and the high over the low in tabular figures.
//
// THE FIELD TITLES ARE AN API. The Production Data API (docs/DATA_API.md) addresses fields
// by their titles, and scripts/weather-feed.mjs — the Open-Meteo connector — posts exactly
// these labels: "Day 1 name", "Day 1 high", "Day 1 low", "Day 1 condition", and the same
// four for days 2 and 3. "Heading" stays the operator's own. Retitling a field here breaks
// the live feed of every production using it. The template stays dumb: it renders whatever
// strings arrive — the WMO-code wording and the weekday names live in the connector.
//
// A FIXED contract (13 discrete fields), deliberately not a lines textarea: three days is
// the board's drawn shape (like a scoreboard's four fields), and discrete titled fields are
// exactly what makes each value addressable by a feed.

import type { SpxField } from '../../model/types';
import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineInfographicVariant } from './shared';

/** One forecast day's sample content: [name, high, low, condition]. */
const SAMPLE_DAYS: Array<[string, string, string, string]> = [
  ['TUE', '21°', '12°', 'Sunny'],
  ['WED', '18°', '11°', 'Light rain'],
  ['THU', '16°', '9°', 'Overcast'],
];

export const ig37: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig37',
    category: 'infographic',
    name: 'House Forecast',
    styleTag: 'noacg',
    description: 'The house 3-day weather forecast board: day, condition, high over low.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Heading', sample: '3-DAY FORECAST' },
      { title: 'Day 1 name', sample: 'TUE' },
    ],
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'House Forecast',
    description:
      'The house 3-day weather forecast: a void blur panel under an amber top edge, a tracked ' +
      'mono heading, and three day columns cascading in — day name, condition word, and the ' +
      'high over the low in tabular figures. Drive it by hand or live from a feed through the ' +
      'Production Data API.',
    uicolor: '4',
  },
  () => {
    // One column of markup per forecast day. Field ids follow the API contract's order —
    // name, high, low, condition — so day N occupies f(4N-3)…f(4N) after the f0 heading.
    const dayColumn = (day: number): string => {
      const base = 1 + (day - 1) * 4; // f1/f5/f9 — the day's first field id
      const [name, high, low, cond] = SAMPLE_DAYS[day - 1];
      return `        <!-- Day ${day} — name (f${base}), high (f${base + 1}), low (f${base + 2}), condition (f${base + 3}). -->
        <div class="infographic-day">
          <div class="infographic-day-name" id="f${base}">${name}</div>
          <div class="infographic-day-cond" id="f${base + 3}">${cond}</div>
          <div class="infographic-day-temps">
            <span class="infographic-day-high" id="f${base + 1}">${high}</span>
            <span class="infographic-day-low" id="f${base + 2}">${low}</span>
          </div>
        </div>`;
    };

    // The design's own SPX fields — the titles ARE the data-API labels (see the header).
    const dayFields = (day: number): SpxField[] => {
      const base = 1 + (day - 1) * 4;
      const [name, high, low, cond] = SAMPLE_DAYS[day - 1];
      return [
        { field: `f${base}`, ftype: 'textfield', title: `Day ${day} name`, value: name },
        { field: `f${base + 1}`, ftype: 'textfield', title: `Day ${day} high`, value: high },
        { field: `f${base + 2}`, ftype: 'textfield', title: `Day ${day} low`, value: low },
        { field: `f${base + 3}`, ftype: 'textfield', title: `Day ${day} condition`, value: cond },
      ];
    };

    return {

      // The stage: the width this design holds a full-length value at, so the panel

      // stops re-sizing itself between one piece of content and the next.

      stageWidth: 1060,
      html: `    <!-- House Forecast: [void panel: mono heading over three cascading day columns]. -->
    <div class="infographic-box">
      <div class="infographic-heading" id="f0">3-DAY FORECAST</div>
      <!-- The day columns — direct children of #infographic-rows, so rows-cascade staggers them. -->
      <div id="infographic-rows" class="infographic-days">
${[1, 2, 3].map(dayColumn).join('\n')}
      </div>
    </div>`,
      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The panel — the house void with the strip family's amber top edge. */
.infographic-box {
  position: relative;               /* the amber edge positions against this */
  padding: calc(26px * var(--scale)) calc(44px * var(--scale)) calc(30px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);       /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* one deep lifting shadow */
}
.infographic-box::before {
  content: '';                      /* the amber top edge — the house strip signature */
  position: absolute;               /* pinned to the panel… */
  left: 0;                          /* …edge to edge… */
  right: 0;                         /* …across the top */
  top: 0;                           /* flush with the panel's top */
  height: calc(3px * var(--scale)); /* a hairline edge, not a bar */
  background: var(--accent);        /* the one accent surface */
  box-shadow: var(--accent-glow);   /* the family's restrained glow */
}

/* The heading (f0) — the house label voice: mono, caps, tracked wide. */
.infographic-heading {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* label scale (1080p reference) */
  font-weight: 500;                 /* medium keeps tracked caps crisp */
  line-height: 1.2;                 /* tight — it is a kicker, not a paragraph */
  letter-spacing: var(--label-tracking);  /* wide tracking — the label breathes */
  text-transform: uppercase;        /* reads as a technical label */
  color: var(--label-color);        /* the label carries the accent */
  text-align: center;               /* the board is a centre-anchored, symmetric composition */
  margin-bottom: calc(22px * var(--scale));  /* heading → days: a real break */
}

/* The day columns — three equal columns divided by hairline keylines. */
.infographic-days {
  display: flex;                    /* the days sit side by side */
}
.infographic-day {
  min-width: calc(200px * var(--scale));  /* each day reserves a real column */
  padding: 0 calc(30px * var(--scale));   /* air between a column and its keylines */
  text-align: center;               /* each column is its own symmetric stack */
}
.infographic-day + .infographic-day {
  border-left: 1px solid rgba(255, 255, 255, 0.14);  /* a quiet keyline between days */
}

/* The day name (f1/f5/f9) — the mono label voice again, accented. */
.infographic-day-name {
  font-family: var(--font-label);   /* the house mono label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* small tracked caps */
  font-weight: 500;                 /* medium keeps tracked caps crisp */
  line-height: 1.2;                 /* tight */
  letter-spacing: var(--label-tracking);  /* the house label tracking */
  text-transform: uppercase;        /* weekday names read as labels */
  color: var(--label-color);        /* the accent's label appearance */
}

/* The condition (f4/f8/f12) — the day's word, quiet under the name. */
.infographic-day-cond {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* clearly subordinate to the figures */
  font-weight: 500;                 /* medium — present without competing */
  line-height: 1.25;                /* air if a longer word wraps */
  color: var(--text-dim);           /* dimmed — the figures carry the column */
  margin-top: calc(8px * var(--scale));  /* name → condition: one unit */
}

/* The temperatures — high over the numerals contract; the feed repaints these. */
.infographic-day-temps {
  margin-top: calc(12px * var(--scale));  /* condition → figures: a real break */
  display: flex;                    /* high and low share one baseline… */
  align-items: baseline;            /* …aligned on it */
  justify-content: center;          /* centred in the column */
  gap: calc(12px * var(--scale));   /* air between the two figures */
}
.infographic-day-high {
  font-family: var(--font-numeric); /* a face whose digits are all one width */
  font-variant-numeric: tabular-nums;  /* ask that face for its tabular figures */
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* the column's big figure */
  font-weight: var(--display-weight);  /* full display weight */
  line-height: 1;                   /* a lone figure sits tight */
  color: var(--text-color);         /* primary text color */
}
.infographic-day-low {
  font-family: var(--font-numeric); /* the same even-digit face */
  font-variant-numeric: tabular-nums;  /* tabular figures here too */
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* clearly under the high */
  font-weight: 500;                 /* medium — the high carries the weight */
  line-height: 1;                   /* tight beside the high */
  color: var(--text-dim);           /* dimmed — the overnight low is the second read */
}`,
      fields: [
        { field: 'f0', ftype: 'textfield', title: 'Heading', value: '3-DAY FORECAST' },
        ...dayFields(1),
        ...dayFields(2),
        ...dayFields(3),
      ],
      runtimeExtraJs: '', // stat shape: update() writes fields straight in — no rebuild needed
    };
  },
);
