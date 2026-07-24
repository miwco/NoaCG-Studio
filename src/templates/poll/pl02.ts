// pl02 "Volt Vote" — the SPORT live-vote board, sibling of lt06 "Split Bar" and ig12 "Volt
// Poll". The results-night look: a solid slab, condensed caps labels, square-cut accent fills
// and a hard VOTE NOW tab. Where ig12 is a finished chart, this is the vote as it happens —
// the badge leaves when voting closes and the leader is CALLED, never merely drawn longest.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { definePollVariant } from './shared';

export const pl02: TemplateVariant = definePollVariant(
  {
    id: 'pl02',
    category: 'poll',
    name: 'Volt Vote',
    styleTag: 'sport',
    description: 'A results-night slab: condensed caps options, square accent bars, a called winner.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Question', sample: 'WHO TAKES THE FINAL?' },
      { title: 'Options', sample: 'NORTH SIDE | 2140\nSOUTH SIDE | 1780' },
      { title: 'Vote count', sample: '3,920 VOTES · 74% REPORTING' },
    ],
    logo: 'none',
    animationPresets: ['poll-open'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-left',
  },
  {
    name: 'Volt Vote',
    description:
      'The sport live-vote board, sibling of lt06 Split Bar and ig12 Volt Poll: a solid leaning ' +
      'slab with condensed caps options, square-cut accent fills that grow to each share, and a ' +
      'hard VOTE NOW tab that leaves when the vote closes. The called leader takes the accent ' +
      'flood and a leading marker.',
    uicolor: '5',
  },
  (o) => ({
    // Structure: the leaning slab holds the tab, the masked question, the rendered option rows
    // and the reporting line. The slab and the accent edge are painted ::before/::after layers,
    // so the preset can tween .poll-box without ever touching the family's lean.
    html: `    <!-- Volt Vote: leaning sport slab — VOTE NOW tab, question, bars, reporting line. -->
    <div class="poll-box">
      <!-- The vote tab — it LEAVES when voting closes (a keyframed opacity, not a class). -->
      <div class="poll-cue"><span class="poll-cue-text">VOTE NOW</span></div>
      <!-- The question — slides up from behind this overflow mask on entrance. -->
      <div class="poll-mask"><span id="f0">${o.lines[0]?.sample || 'WHO TAKES THE FINAL?'}</span></div>
      <!-- The option rows — rendered by pollRebuild() from the hidden source below the box. -->
      <div id="poll-rows"></div>
      <!-- The reporting line: how many votes, how much is in. Plain operator text. -->
      <div class="poll-foot"><span id="f2">${o.lines[2]?.sample || '3,920 VOTES · 74% REPORTING'}</span></div>
    </div>`,
    css: `/* The slab: the preset tweens THIS element (y + opacity), so it carries no lean of its
   own — the panel and the accent edge are painted on pseudo-layers below. */
.poll-box {
  position: relative;              /* anchors the painted slab (::before) and edge (::after) */
  padding: calc(37px * var(--scale)) calc(68px * var(--scale)) calc(34px * var(--scale)) calc(74px * var(--scale));
  min-width: calc(723px * var(--scale));  /* bars need a measure — a short label never shrinks the chart */
}

/* The painted slab: the sport lean lives HERE, on a background layer no preset ever tweens. */
.poll-box::before {
  content: '';                     /* pseudo-elements render only with content set */
  position: absolute;              /* fills the box exactly… */
  inset: 0;                        /* …edge to edge */
  z-index: -1;                     /* paints behind everything on the slab */
  background: var(--panel-bg);     /* near-black slab */
  border-radius: var(--panel-radius);  /* the family's panel corner radius */
  box-shadow: var(--panel-shadow); /* the family's hard offset shadow */
  transform: skewX(-8deg);         /* SKEW: the whole board leans forward */
}

/* The accent edge: a chunky slab fused to the board's leaning left side. */
.poll-box::after {
  content: '';                     /* second painted layer on the same box */
  position: absolute;              /* pinned over the slab's left edge… */
  left: 0;                         /* …flush with the box's left side */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  z-index: -1;                     /* behind the text, above ::before (later layer wins) */
  width: var(--accent-weight);     /* the family's accent edge weight */
  background: var(--accent);       /* the family's loud color moment */
  transform: skewX(-8deg);         /* leans with the slab so the two fuse into one shape */
}

/* The vote tab — a solid accent block, leaning like everything else. */
.poll-cue {
  position: relative;              /* anchors the painted tab (::before) */
  display: inline-block;           /* the tab hugs its own text */
  margin-bottom: calc(18px * var(--scale));  /* air under the tab */
  padding: calc(8px * var(--scale)) calc(22px * var(--scale));
  will-change: transform, opacity; /* it pops in, and leaves when voting closes */
}
.poll-cue::before {
  content: '';                     /* painted layer behind the tab's text */
  position: absolute;              /* fills the tab exactly… */
  inset: 0;                        /* …edge to edge */
  z-index: -1;                     /* behind the label */
  background: var(--accent);       /* a small, loud accent dose */
  transform: skewX(-8deg);         /* the family lean */
}
.poll-cue-text {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* kicker scale */
  font-weight: 700;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* a broadcast cue is always caps */
  color: var(--accent-ink);        /* the family's ink on an accent-filled tab */
}

/* The question — condensed heavy caps, the loudest thing on the slab. */
.poll-mask > span {
  font-size: calc(52px * var(--scale) * var(--type-scale));  /* headline scale over a chart */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.12;               /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* the whole board shouts */
  color: var(--text-color);        /* primary text on the dark slab */
}

/* The chart — one row per option, rendered at runtime. */
#poll-rows {
  margin-top: calc(31px * var(--scale));  /* clear break between question and bars */
  display: flex;                   /* a simple vertical stack… */
  flex-direction: column;          /* …one row per option */
  gap: calc(22px * var(--scale));  /* even air between the rows */
}

/* One option row — its label and share above, its bar below. */
.poll-row-top {
  display: flex;                   /* label on the left… */
  align-items: baseline;           /* …share on the right, on one baseline */
  justify-content: space-between;  /* the share sits at the far end of the measure */
  gap: calc(25px * var(--scale));  /* a long label never runs into its figure */
  margin-bottom: calc(9px * var(--scale));  /* air between the label row and its bar */
}
.poll-row-label {
  font-size: calc(32px * var(--scale) * var(--type-scale));  /* list scale — under the question */
  font-weight: 700;                /* heavy enough to read at a glance */
  letter-spacing: 0.04em;          /* slight air between the caps */
  line-height: 1.2;                /* leading if a long option wraps */
  text-transform: uppercase;       /* the whole board shouts */
  color: var(--text-color);        /* primary text on the dark slab */
  overflow-wrap: break-word;       /* break very long unbroken options */
}
.poll-row-value {
  flex-shrink: 0;                  /* the figure never wraps or squeezes */
  font-size: calc(35px * var(--scale) * var(--type-scale));  /* the number is the row's headline */
  font-weight: 700;                /* the number carries the row */
  font-variant-numeric: tabular-nums;  /* the figures line up as they count */
  color: var(--accent);            /* the share wears the accent */
}

/* The bar track — a square-cut groove the fill grows along. */
.poll-bar {
  height: calc(22px * var(--scale));  /* a chunky, readable bar */
  background: color-mix(in srgb, var(--text-color) 10%, transparent);  /* faint on-palette groove */
  overflow: hidden;                /* the fill never escapes the groove */
}
.poll-bar-fill {
  height: 100%;                    /* the fill is the full height of its groove */
  background: var(--accent);       /* the one accent surface — square cut, sport shape language */
}

/* The reporting line — quiet, under the bars. */
.poll-foot {
  margin-top: calc(28px * var(--scale));  /* air under the chart */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the quietest text on the slab */
  font-weight: 700;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* a broadcast footnote is caps */
  color: var(--text-dim);          /* secondary text — it is a note, not a headline */
}

/* ── The winner call ── */

/* The called leader — a leading marker on the row and the figure stepped up. The marker is
   how results night says "projected winner"; the longest bar alone never says it. */
.poll-winner .poll-row-label::before {
  content: '▸\\00A0';               /* a small leading triangle, then a non-breaking space */
  color: var(--accent);            /* the marker wears the accent */
}
.poll-winner .poll-row-label {
  color: var(--accent);            /* the winning option wears the accent */
}
.poll-winner .poll-row-value {
  font-size: calc(42px * var(--scale) * var(--type-scale));  /* the winning figure grows */
}
.poll-winner .poll-bar {
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) var(--accent);  /* the winning groove is ringed */
}

/* Tied — nobody leads, so nobody is marked. The board says so instead of picking a row. */
.poll-tied .poll-foot::after {
  content: ' · TOO CLOSE TO CALL';  /* appended to the operator's own reporting line */
  color: var(--accent);            /* the one thing on the slab that is not their text */
}`,
    rowBuilderJs: `// renderPollRow(row): one option — its label and share, then its bar.
// The fill's data-value is the share the growth builder tweens to; the figure's data-target is
// the exact text restored when its count-up lands.
function renderPollRow(row) {
  return '<div class="poll-row">'
       +   '<div class="poll-row-top">'
       +     '<span class="poll-row-label">' + escapeHtml(row.label) + '</span>'
       +     '<span class="poll-row-value" data-target="' + escapeHtml(row.percentText) + '">' + escapeHtml(row.percentText) + '</span>'
       +   '</div>'
       +   '<div class="poll-bar"><div class="poll-bar-fill" data-value="' + row.percent + '"></div></div>'
       + '</div>';
}`,
    hasAccent: false, // the accent edge is a painted ::after layer, not a .poll-accent element
    tokens: {
      displayTracking: '0.01em',
    },
  }),
);
