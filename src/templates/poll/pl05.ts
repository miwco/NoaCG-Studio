// pl05 "Floor Vote" — the live vote as a WIDE BAND across the bottom of frame, and the one
// board in this category that is not a card in the corner.
//
// pl01-pl04 are all the same information system in four looks: a panel at mid-left, the question
// over a vertical stack of rows, each row's label and share above its bar. That shape puts a
// four-option vote in a tall column beside the presenter and makes the picture work around it.
// This one turns the whole thing ninety degrees. The ask lives in a left column — badge,
// question, count — and the options run as HORIZONTAL rows on the right, label and track and
// figure on one line each, so the board is short enough to sit under the action instead of
// beside it. That is the variation worth having: not another palette on the same chart, but a
// different answer to where a vote goes while people are still voting.
//
// From the agent round of 2026-08-22 (benchmarks/agent/rounds/2026-08-22), where it was the
// live-vote candidate furthest from anything in this category — 0.36 on the look vector alone
// against a category whose designs sit a median 0.17 from each other.
//
// One thing changed in the re-authoring, and it is an improvement rather than a compromise: the
// round's design carried a decorative "AUDIENCE VOTE" kicker AND a separate "voting closes
// after the break" note. Here the kicker IS the type's vote badge, so the words the broadcaster
// chose leave the screen the moment the vote closes. A label that says a vote is running should
// stop saying it when the vote stops.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { NUMERIC_FIGURES } from '../shared/numerals';
import { definePollVariant } from './shared';

const SAMPLE = {
  question: 'Which ending should we film?',
  options: 'Send her back to Earth | 8462\nLet the signal go dark | 4970\nOpen the second door | 3314\nWake the crew early | 1656',
  footnote: '18,402 votes counted',
  cue: 'AUDIENCE VOTE',
};

export const pl05: TemplateVariant = definePollVariant(
  {
    id: 'pl05',
    category: 'poll',
    name: 'Floor Vote',
    styleTag: 'noacg',
    description: 'The live vote as a wide band: the ask on the left, the options running across on the right.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Question', sample: SAMPLE.question },
      { title: 'Options', sample: SAMPLE.options },
      { title: 'Vote count', sample: SAMPLE.footnote },
      { title: 'Vote badge', sample: SAMPLE.cue },
    ],
    logo: 'none',
    animationPresets: ['poll-open'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'inter',
    // A BAND, not a card: it belongs under the action, not beside it. The whole point of the
    // horizontal rows is that the board is short enough to live down here.
    defaultZone: 'bottom-center',
  },
  {
    name: 'Floor Vote',
    description:
      'The live vote as a wide band across the foot of frame: an amber rule, then the ask on '
      + 'the left — vote badge, question and running count — with the options as horizontal '
      + 'rows on the right, each one a label, a track that grows to its share and a figure that '
      + 'counts up to it. The badge leaves when voting closes; the called leader takes the '
      + 'accent and steps up.',
    uicolor: '4',
  },
  (o) => ({
    // The stage: the width this band holds a full-length option at, so it stops re-sizing
    // itself between one vote and the next.
    stageWidth: 1560,
    html: `    <!-- Floor Vote: an amber rule over a band — the ask on the left, the options across on the right. -->
    <div class="poll-box">
      <!-- The one accent flourish: a rule along the top edge of the band. -->
      <div class="poll-accent"></div>
      <div class="poll-split">
        <!-- Left: what is being asked, who is asking it, and how many have answered. -->
        <div class="poll-ask">
          <!-- The vote badge — it LEAVES when voting closes (a keyframe, not a class). -->
          <div class="poll-cue"><span id="f3" class="poll-cue-text">${o.lines[3]?.sample || SAMPLE.cue}</span></div>
          <!-- The question — slides up from behind this overflow mask on entrance. -->
          <div class="poll-mask"><span id="f0">${o.lines[0]?.sample || SAMPLE.question}</span></div>
          <!-- The count line: how many have voted. Plain operator text. -->
          <div class="poll-foot"><span id="f2">${o.lines[2]?.sample || SAMPLE.footnote}</span></div>
        </div>
        <!-- Right: the options, rendered by pollRebuild() from the hidden source below. -->
        <div id="poll-rows"></div>
      </div>
    </div>`,
    css: `/* The band — a flat void panel run wide, with no radius: it reads as a strip laid on the
   picture rather than a card floating over it. */
.poll-box {
  /* THE CATEGORY'S WRAP CAP IS FOR A CARD, and this is a band. The assembler caps every poll
     panel at 46% of frame — right for the four mid-left cards, and it silently beat the 1560px
     stage declared above, which left the chart column with no width and no visible bars at all.
     Lifted to the stage's own width here, keeping the 1680px safe-area limit that cap also
     carries. \`--stage-width\` is the assembler's own variable, so the two cannot drift. */
  max-width: 1680px;  /* fallback: no CSS min() before Chromium 79 (older CasparCG) */
  max-width: min(calc(var(--stage-width) * var(--scale)), 1680px);
  text-align: left;                /* the band reads from its left edge, not from a centre */
  padding: calc(30px * var(--scale)) calc(52px * var(--scale)) calc(32px * var(--scale));
  background: var(--panel-bg);     /* the house void — near-black, translucent */
  backdrop-filter: var(--panel-blur);          /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
  position: relative;              /* the accent rule is pinned to its top edge */
}

/* The accent rule — the house bar, run along the top of the band. */
.poll-accent {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: var(--accent-weight);
  background: var(--accent);
  box-shadow: var(--accent-glow);  /* follows the accent colour, so a retint stays coherent */
  transform-origin: left center;   /* the entrance draws it in from the left */
}

/* ── The two halves ── */
/* The ask column is FIXED and the options take the rest. Not \`1fr 1fr\`: a question is one or
   two lines whatever the vote is, while the rows carry the operator's own labels and are the
   half that has to absorb a long one. Giving the ask a share of the width would let a short
   question leave the chart starved and a long one squeeze it. */
.poll-split {
  display: grid;
  grid-template-columns: calc(480px * var(--scale)) minmax(0, 1fr);
  align-items: start;
}

.poll-ask {
  padding-right: calc(48px * var(--scale));
  /* The one drawn division between the halves — dim, not accent: the colour stays in the bars. */
  border-right: 1px solid color-mix(in srgb, var(--text-color) 16%, transparent);
}

/* The vote badge — mono caps in the accent, the house label voice. */
.poll-cue {
  display: inline-block;
  margin-bottom: calc(14px * var(--scale));
  will-change: transform, opacity; /* it pops in, and leaves when voting closes */
}
.poll-cue-text {
  font-family: var(--font-label);  /* the family's mono label face */
  font-size: calc(21px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;       /* a broadcast cue is always caps */
  color: var(--accent);
}

/* The question — the loudest thing on the band. */
.poll-mask > span {
  font-size: calc(40px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.14;               /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* The count line — the quietest text on the band, under the question. */
.poll-foot {
  margin-top: calc(18px * var(--scale));
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;       /* a broadcast footnote is caps */
  color: var(--text-dim);
}

/* ── The chart ── */
#poll-rows {
  padding-left: calc(48px * var(--scale));
  display: flex;
  flex-direction: column;
  gap: calc(14px * var(--scale));
}

/* ONE ROW IS ONE LINE — label, track, figure — which is the whole reason this board is a band.
   The label column is fixed so every track starts at the same x: a chart whose bars begin in
   different places cannot be compared at a glance, which is the only thing a vote board is for. */
.poll-row {
  display: grid;
  grid-template-columns: calc(320px * var(--scale)) minmax(0, 1fr) calc(92px * var(--scale));
  align-items: center;
  column-gap: calc(20px * var(--scale));
}

.poll-row-label {
  min-width: 0;                    /* a grid item defaults to its content's width — this is what
                                      lets a long option WRAP in its column instead of pushing
                                      the track out of the band */
  font-size: calc(24px * var(--scale) * var(--type-scale));
  font-weight: 500;
  line-height: 1.2;                /* leading if a long option wraps */
  color: var(--text-color);
  overflow-wrap: break-word;       /* break a very long unbroken option */
}

/* The track — a quiet groove the fill grows along. */
.poll-bar {
  height: calc(14px * var(--scale));
  background: color-mix(in srgb, var(--text-color) 10%, transparent);
  overflow: hidden;                /* the fill never escapes its groove */
}
.poll-bar-fill {
  height: 100%;
  background: color-mix(in srgb, var(--text-color) 42%, transparent);  /* the field, not the leader */
}

/* The leading option is the ONE amber bar. A chart where every bar is the accent has told the
   viewer nothing; one that marks the leader has told them the result. */
.poll-row:first-child .poll-bar-fill {
  background: var(--accent);
  box-shadow: var(--accent-glow);
}

.poll-row-value {
  ${NUMERIC_FIGURES}
  text-align: right;               /* the figures line up on their right edge as they count */
  font-size: calc(30px * var(--scale) * var(--type-scale));
  font-weight: 700;
  color: var(--text-dim);
}
.poll-row:first-child .poll-row-value { color: var(--accent); }

/* ── The winner call ── */

/* The called leader — its track thickens, its label steps up and its figure takes the accent.
   The house family calls a winner with its own amber and with weight, never a second colour. */
.poll-winner .poll-bar { height: calc(20px * var(--scale)); }
.poll-winner .poll-bar-fill {
  background: var(--accent);
  box-shadow: var(--accent-glow);
}
.poll-winner .poll-row-label {
  color: var(--accent);
  font-weight: 700;
}
.poll-winner .poll-row-value {
  color: var(--accent);
  font-size: calc(34px * var(--scale) * var(--type-scale));
}

/* Tied — nobody leads, so nobody is marked. The board says so rather than picking a row. */
.poll-tied .poll-foot::after {
  content: ' · too close to call';  /* appended to the operator's own count line */
  color: var(--accent);            /* the one thing on the band that is not their text */
}`,
    rowBuilderJs: `// renderPollRow(row): one option on ONE line — its label, its track, its share.
// The fill's data-value is the share the growth builder tweens to; the figure's data-target is
// the exact text restored when its count-up lands.
function renderPollRow(row) {
  return '<div class="poll-row">'
       +   '<span class="poll-row-label">' + escapeHtml(row.label) + '</span>'
       +   '<div class="poll-bar"><div class="poll-bar-fill" data-value="' + row.percent + '"></div></div>'
       +   '<span class="poll-row-value" data-target="' + escapeHtml(row.percentText) + '">' + escapeHtml(row.percentText) + '</span>'
       + '</div>';
}`,
    hasAccent: true,
  }),
);

// The type's own starting content is a three-option question in a mid-left card; this board is
// drawn around a four-option vote in a band, so it carries its own. Exported for the type entry,
// which must show the same strings the fields above carry.
export const PL05_SAMPLES = SAMPLE;
