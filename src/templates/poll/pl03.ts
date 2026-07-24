// pl03 "Frost Vote" — the GLASS live-vote board, sibling of lt08 "Frosted Card" and ig02
// "Glass Bars". A frosted panel with a soft accent-keyline VOTE NOW pill, the question above,
// and rounded glass bar grooves that fill to each share when the result is shown.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { definePollVariant, POLL_CONTENT } from './shared';

export const pl03: TemplateVariant = definePollVariant(
  {
    id: 'pl03',
    category: 'poll',
    name: 'Frost Vote',
    styleTag: 'glass',
    description: 'A frosted live-vote board: a soft VOTE NOW pill over rounded glass bars.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Question', sample: POLL_CONTENT.question },
      { title: 'Options', sample: POLL_CONTENT.options },
      { title: 'Vote count', sample: POLL_CONTENT.footnote },
    ],
    logo: 'none',
    animationPresets: ['poll-open'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-left',
  },
  {
    name: 'Frost Vote',
    description:
      'The glass live-vote board, sibling of lt08 Frosted Card and ig02 Glass Bars: a frosted ' +
      'panel with a soft accent-keyline VOTE NOW pill that leaves when the vote closes, the ' +
      'question above, and rounded glass grooves whose fills grow to each share. The called ' +
      'leader takes an accent ring and a stepped-up figure.',
    uicolor: '3',
  },
  (o) => ({
    // Structure: the frosted card holds the pill, the masked question, the rendered option rows
    // and the count line. The rows come from the hidden #f1 source at runtime.
    html: `    <!-- Frost Vote: frosted card — VOTE NOW pill, question, glass bars, count line. -->
    <div class="poll-box">
      <!-- The vote pill — it LEAVES when voting closes (a keyframed opacity, not a class). -->
      <div class="poll-cue"><span class="poll-cue-text">VOTE NOW</span></div>
      <!-- The question — slides up from behind this overflow mask on entrance. -->
      <div class="poll-mask"><span id="f0">${o.lines[0]?.sample || POLL_CONTENT.question}</span></div>
      <!-- The option rows — rendered by pollRebuild() from the hidden source below the box. -->
      <div id="poll-rows"></div>
      <!-- The count line: how many votes, how much is in. Plain operator text. -->
      <div class="poll-foot"><span id="f2">${o.lines[2]?.sample || POLL_CONTENT.footnote}</span></div>
    </div>`,
    css: `/* The card — the frosted glass panel; presets tween this element (y + opacity). */
.poll-box {
  padding: calc(40px * var(--scale)) calc(58px * var(--scale)) calc(37px * var(--scale));
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
  min-width: calc(708px * var(--scale));  /* bars need a measure — a short label never shrinks the chart */
}

/* The vote pill — a soft accent-keyline chip, the glass family's kicker shape. */
.poll-cue {
  display: inline-block;           /* the pill hugs its own text */
  margin-bottom: calc(18px * var(--scale));  /* air under the pill */
  padding: calc(8px * var(--scale)) calc(22px * var(--scale));
  border-radius: 999px;            /* a true pill — the glass family's soft shape */
  background: rgba(255, 255, 255, 0.08);  /* a faint second layer of glass */
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent);  /* a soft accent keyline */
  will-change: transform, opacity; /* it pops in, and leaves when voting closes */
}
.poll-cue-text {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* kicker scale */
  font-weight: 700;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* a broadcast cue is always caps */
  color: var(--label-color);       /* the family's label colour — the accent */
}

/* The question — the family's heavier weight, the loudest thing on the card. */
.poll-mask > span {
  font-size: calc(48px * var(--scale) * var(--type-scale));  /* headline scale over a chart */
  font-weight: var(--display-weight);  /* the glass families run heavier weights */
  line-height: 1.15;               /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}

/* The chart — one row per option, rendered at runtime. */
#poll-rows {
  margin-top: calc(31px * var(--scale));  /* clear break between question and bars */
  display: flex;                   /* a simple vertical stack… */
  flex-direction: column;          /* …one row per option */
  gap: calc(20px * var(--scale));  /* even air between the rows */
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
  font-size: calc(29px * var(--scale) * var(--type-scale));  /* list scale — under the question */
  font-weight: 500;                /* readable at a glance */
  line-height: 1.2;                /* leading if a long option wraps */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken options */
}
.poll-row-value {
  flex-shrink: 0;                  /* the figure never wraps or squeezes */
  font-size: calc(29px * var(--scale) * var(--type-scale));  /* the same size as its label */
  font-weight: 700;                /* the number carries the row */
  font-variant-numeric: tabular-nums;  /* the figures line up as they count */
  color: var(--accent);            /* the share wears the accent */
}

/* The bar track — a rounded glass groove the fill grows along. */
.poll-bar {
  height: calc(18px * var(--scale));  /* a soft, readable bar */
  border-radius: 999px;            /* fully rounded — the glass family's shape */
  background: rgba(255, 255, 255, 0.10);  /* a faint layer of glass */
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);  /* a soft keyline */
  overflow: hidden;                /* the fill's cap never escapes the groove */
}
.poll-bar-fill {
  height: 100%;                    /* the fill is the full height of its groove */
  border-radius: 999px;            /* the fill keeps its own rounded cap */
  background: var(--accent);       /* the one accent surface */
}

/* The count line — quiet, under the bars. */
.poll-foot {
  margin-top: calc(28px * var(--scale));  /* air under the chart */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the quietest text on the card */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* a broadcast footnote is caps */
  color: var(--text-dim);          /* secondary text — it is a note, not a headline */
}

/* ── The winner call ── */

/* The called leader — its groove takes an accent ring and its figure steps up. */
.poll-winner .poll-bar {
  box-shadow: inset 0 0 0 calc(3px * var(--scale)) var(--accent);  /* the winning groove is ringed */
}
.poll-winner .poll-row-label {
  color: var(--accent);            /* the winning option wears the accent */
  font-weight: 700;                /* and steps up a weight */
}
.poll-winner .poll-row-value {
  font-size: calc(34px * var(--scale) * var(--type-scale));  /* the winning figure grows */
}

/* Tied — nobody leads, so nobody is marked. The board says so instead of picking a row. */
.poll-tied .poll-foot::after {
  content: ' · too close to call';  /* appended to the operator's own count line */
  color: var(--accent);            /* the one thing on the card that is not their text */
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
    hasAccent: false, // the accent moments are the pill's keyline and the fills, not a .poll-accent element
  }),
);
