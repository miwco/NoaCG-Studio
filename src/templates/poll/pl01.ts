// pl01 "House Vote" — the NoaCG live-vote board, sibling of lt11 "House Strap" and ig11 "House
// Poll". Where ig11 is a finished chart, this is the vote as it happens: the house void panel
// with its amber accent edge, a mono VOTE NOW badge that leaves when the vote closes, the
// options with their shares, and a count line under the bars.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { definePollVariant, POLL_CONTENT } from './shared';

export const pl01: TemplateVariant = definePollVariant(
  {
    id: 'pl01',
    category: 'poll',
    name: 'House Vote',
    styleTag: 'noacg',
    description: 'The house live-vote board: a void panel, amber edge, a VOTE NOW badge and growing amber bars.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Question', sample: POLL_CONTENT.question },
      { title: 'Options', sample: POLL_CONTENT.options },
      { title: 'Vote count', sample: POLL_CONTENT.footnote },
    ],
    logo: 'none',
    animationPresets: ['poll-open'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-left',
  },
  {
    name: 'House Vote',
    description:
      'The NoaCG live-vote board, sibling of lt11 House Strap: the house void panel with an amber ' +
      'accent edge, a mono VOTE NOW badge, the question in display type, and amber bars that grow ' +
      'to each share when the result is shown. The called winner takes the amber flood.',
    uicolor: '4',
  },
  (o) => ({
    // Structure: the void card holds the badge, the masked question, the rendered option rows,
    // and the count line. The rows come from the hidden #f1 source at runtime.
    html: `    <!-- House Vote: void card — accent edge, VOTE NOW badge, question, bars, count line. -->
    <div class="poll-box">
      <!-- The accent edge — the house amber bar, fused to the panel's left side. -->
      <div class="poll-accent"></div>
      <!-- The vote badge — it LEAVES when voting closes (a keyframed opacity, not a class). -->
      <div class="poll-cue"><span class="poll-cue-text">VOTE NOW</span></div>
      <!-- The question — slides up from behind this overflow mask on entrance. -->
      <div class="poll-mask"><span id="f0">${o.lines[0]?.sample || POLL_CONTENT.question}</span></div>
      <!-- The option rows — rendered by pollRebuild() from the hidden source below the box. -->
      <div id="poll-rows"></div>
      <!-- The count line: how many votes, how much is in. Plain operator text. -->
      <div class="poll-foot"><span id="f2">${o.lines[2]?.sample || POLL_CONTENT.footnote}</span></div>
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The card — the house void panel; presets tween this element (y + opacity). */
.poll-box {
  position: relative;              /* anchors the accent edge */
  padding: calc(40px * var(--scale)) calc(62px * var(--scale)) calc(37px * var(--scale)) calc(68px * var(--scale));
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
  border-top: calc(3px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);  /* the house strip's amber top edge */
  min-width: calc(708px * var(--scale));  /* bars need a measure — a short label never shrinks the chart */
}

/* The accent edge — the house amber bar, fused to the card's left side with the house glow. */
.poll-accent {
  position: absolute;              /* pinned over the card's left edge */
  left: 0;                         /* flush with the box's left side */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);       /* the one accent surface */
  box-shadow: var(--accent-glow);  /* the family's glow — follows the accent color */
}

/* The vote badge — the house mono label in an accent-keyline chip. */
.poll-cue {
  display: inline-block;           /* the chip hugs its own text */
  margin-bottom: calc(18px * var(--scale));  /* air under the badge */
  padding: calc(8px * var(--scale)) calc(17px * var(--scale));
  border-radius: calc(9px * var(--scale));  /* the house chip radius */
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 60%, transparent);  /* a thin accent keyline */
  will-change: transform, opacity; /* it pops in, and leaves when voting closes */
}
.poll-cue-text {
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* kicker scale */
  font-weight: 700;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* a broadcast cue is always caps */
  color: var(--label-color);       /* the family's label colour — amber */
}

/* The question — house display type, the loudest thing on the card. */
.poll-mask > span {
  font-size: calc(49px * var(--scale) * var(--type-scale));  /* headline scale over a chart */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text on the void */
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
  color: var(--text-color);        /* primary text on the void */
  overflow-wrap: break-word;       /* break very long unbroken options */
}
.poll-row-value {
  flex-shrink: 0;                  /* the figure never wraps or squeezes */
  font-family: var(--font-label);  /* the house mono label face — figures line up */
  font-size: calc(29px * var(--scale) * var(--type-scale));  /* the same size as its label */
  font-weight: 700;                /* the number carries the row */
  color: var(--accent);            /* the share wears the accent */
}

/* The bar track — a faint on-palette groove the fill grows along. */
.poll-bar {
  height: calc(18px * var(--scale));  /* a chunky, readable bar */
  border-radius: calc(9px * var(--scale));  /* the house chip radius */
  background: color-mix(in srgb, var(--text-color) 9%, transparent);  /* faint on-palette groove */
  overflow: hidden;                /* the fill's square end never escapes the groove */
}
.poll-bar-fill {
  height: 100%;                    /* the fill is the full height of its groove */
  border-radius: calc(9px * var(--scale));  /* matches the groove */
  background: var(--accent);       /* the one accent surface */
}

/* The count line — quiet, under the bars. */
.poll-foot {
  margin-top: calc(28px * var(--scale));  /* air under the chart */
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the quietest text on the card */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* a broadcast footnote is caps */
  color: var(--text-dim);          /* secondary text — it is a note, not a headline */
}

/* ── The winner call ── */

/* The called leader — its bar floods with the house glow and its figure steps up. */
.poll-winner .poll-bar-fill {
  box-shadow: var(--accent-glow);  /* the house glow, on the winning row */
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
    hasAccent: true,
  }),
);
