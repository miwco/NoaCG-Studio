// pl04 "Clean Vote" — the MINIMAL live-vote board, sibling of lt01 "Hairline" and ig13 "Clean
// Poll". A restrained near-black panel: a small accent VOTE NOW label over the question, a dim
// keyline, then slim bars on hairline grooves. Whitespace does the work; the winner call is the
// one loud moment.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { definePollVariant, POLL_CONTENT } from './shared';

export const pl04: TemplateVariant = definePollVariant(
  {
    id: 'pl04',
    category: 'poll',
    name: 'Clean Vote',
    styleTag: 'minimal',
    description: 'A quiet live-vote board: an accent VOTE NOW label, a keyline, and slim growing bars.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Question', sample: POLL_CONTENT.question },
      { title: 'Options', sample: POLL_CONTENT.options },
      { title: 'Vote count', sample: POLL_CONTENT.footnote },
    ],
    logo: 'none',
    animationPresets: ['poll-open'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-left',
  },
  {
    name: 'Clean Vote',
    description:
      'The minimal live-vote board, sibling of lt01 Hairline and ig13 Clean Poll: a restrained ' +
      'near-black panel with a small accent VOTE NOW label that leaves when the vote closes, the ' +
      'question over a dim keyline, and slim bars that grow to each share. The called leader is ' +
      'marked with an accent rule and a stepped-up figure.',
    uicolor: '1',
  },
  (o) => ({
    // Structure: the quiet card holds the label, the masked question, a keyline, the rendered
    // option rows and the count line. The rows come from the hidden #f1 source at runtime.
    html: `    <!-- Clean Vote: quiet card — VOTE NOW label, question, keyline, slim bars, count line. -->
    <div class="poll-box">
      <!-- The vote label — it LEAVES when voting closes (a keyframed opacity, not a class). -->
      <div class="poll-cue"><span class="poll-cue-text">VOTE NOW</span></div>
      <!-- The question — slides up from behind this overflow mask on entrance. -->
      <div class="poll-mask"><span id="f0">${o.lines[0]?.sample || POLL_CONTENT.question}</span></div>
      <!-- The keyline — a dim rule closing the question block. -->
      <div class="poll-rule"></div>
      <!-- The option rows — rendered by pollRebuild() from the hidden source below the box. -->
      <div id="poll-rows"></div>
      <!-- The count line: how many votes, how much is in. Plain operator text. -->
      <div class="poll-foot"><span id="f2">${o.lines[2]?.sample || POLL_CONTENT.footnote}</span></div>
    </div>`,
    css: `/* The card — restrained and near-black, the minimal family's quiet slab. */
.poll-box {
  padding: calc(35px * var(--scale)) calc(48px * var(--scale)) calc(30px * var(--scale));
  background: var(--panel-bg);     /* the palette's near-black panel — retints via the :root contract */
  border-radius: var(--panel-radius);  /* the family's near-square radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the authored edge and family lift */
  min-width: calc(563px * var(--scale));  /* bars need a measure — a short label never shrinks the chart */
}

/* The vote label — no chip at all; the minimal family marks with type, not with boxes. */
.poll-cue {
  display: inline-block;           /* the label sits on its own line */
  margin-bottom: calc(13px * var(--scale));  /* air under the label */
  will-change: transform, opacity; /* it pops in, and leaves when voting closes */
}
.poll-cue-text {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* kicker scale */
  font-weight: 700;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* a broadcast cue is always caps */
  color: var(--accent);            /* the label is the card's first accent dose */
}

/* The question — confident display type, the loudest thing on the card. */
.poll-mask > span {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* headline scale over a chart */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}

/* The keyline — a thin dim rule under the question. */
.poll-rule {
  height: 1px;                     /* a true keyline — 1px at every resolution */
  margin: calc(23px * var(--scale)) 0 calc(5px * var(--scale));  /* air above and below the rule */
  background: rgba(255, 255, 255, 0.16);  /* dim, not accent — the color stays in the bars */
}

/* The chart — one row per option, rendered at runtime. */
#poll-rows {
  margin-top: calc(20px * var(--scale));  /* clear break between keyline and bars */
  display: flex;                   /* a simple vertical stack… */
  flex-direction: column;          /* …one row per option */
  gap: calc(19px * var(--scale));  /* generous air — the minimal family breathes */
}

/* One option row — its label and share above, its bar below. */
.poll-row-top {
  display: flex;                   /* label on the left… */
  align-items: baseline;           /* …share on the right, on one baseline */
  justify-content: space-between;  /* the share sits at the far end of the measure */
  gap: calc(20px * var(--scale));  /* a long label never runs into its figure */
  margin-bottom: calc(9px * var(--scale));  /* air between the label row and its bar */
}
.poll-row-label {
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* list scale — under the question */
  font-weight: 400;                /* regular — the minimal family is quiet */
  line-height: 1.2;                /* leading if a long option wraps */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken options */
}
.poll-row-value {
  flex-shrink: 0;                  /* the figure never wraps or squeezes */
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* the same size as its label */
  font-weight: 600;                /* the number carries the row */
  font-variant-numeric: tabular-nums;  /* the figures line up as they count */
  color: var(--accent);            /* the share wears the accent */
}

/* The bar track — a hairline groove the fill grows along. */
.poll-bar {
  height: calc(8px * var(--scale));  /* slim — the minimal family draws thin */
  border-radius: calc(4px * var(--scale));  /* just enough to soften the ends */
  background: rgba(255, 255, 255, 0.10);  /* a quiet groove */
  overflow: hidden;                /* the fill's cap never escapes the groove */
}
.poll-bar-fill {
  height: 100%;                    /* the fill is the full height of its groove */
  border-radius: calc(4px * var(--scale));  /* matches the groove */
  background: var(--accent);       /* the one accent surface */
}

/* The count line — quiet, under the bars. */
.poll-foot {
  margin-top: calc(25px * var(--scale));  /* air under the chart */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the quietest text on the card */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* a broadcast footnote is caps */
  color: var(--text-dim);          /* secondary text — it is a note, not a headline */
}

/* ── The winner call ── */

/* The called leader — its bar thickens and its figure steps up. The minimal family calls a
   winner by weight and measure, never by adding a second colour. */
.poll-winner .poll-bar {
  height: calc(13px * var(--scale));  /* the winning bar is the thickest on the card */
  border-radius: calc(6px * var(--scale));  /* matches its new height */
}
.poll-winner .poll-row-label {
  color: var(--accent);            /* the winning option wears the accent */
  font-weight: 600;                /* and steps up a weight */
}
.poll-winner .poll-row-value {
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* the winning figure grows */
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
    hasAccent: false, // the accent moments are the label, the fills and the call — not a .poll-accent element
  }),
);
