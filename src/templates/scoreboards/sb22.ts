// sb22 "House Podiums" — the NoaCG game-show score strip, sibling of sb03 House Score and
// lt11 House Strap: the void blur panel with the amber top edge and the amber accent bar on
// the left, four contestant columns of name-over-chip, amber figures in void chips. The
// spotlight state gives one column the amber keyline and dims the rest; an empty name
// collapses its column, so two, three or four contestants are all this one design.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineScoreboardVariant } from './shared';
import { podiumColumnsHtml, podiumFields, podiumRuntimeJs, spotlightHolderHtml } from './scorebugShared';

const NAMES = ['MAYA', 'JONAS', 'PRIYA', 'SAM'] as const;
const SCORES = ['0', '0', '0', '0'] as const;

export const sb22: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb22',
    category: 'scoreboard',
    name: 'House Podiums',
    styleTag: 'noacg',
    description: 'Four-contestant game-show scores on the house void strip: amber figures, a movable spotlight.',
    maxLines: 9,
    suggestedLines: [
      { title: 'Heading', sample: 'SCORES' },
      { title: 'Player 1', sample: NAMES[0] },
      { title: 'Score 1', sample: SCORES[0] },
      { title: 'Player 2', sample: NAMES[1] },
      { title: 'Score 2', sample: SCORES[1] },
      { title: 'Player 3', sample: NAMES[2] },
      { title: 'Score 3', sample: SCORES[2] },
      { title: 'Player 4', sample: NAMES[3] },
      { title: 'Score 4', sample: SCORES[3] },
    ],
    logo: 'none',
    animationPresets: ['slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-center',
  },
  {
    name: 'House Podiums',
    description:
      'The house game-show score strip, sibling of sb03 House Score: the void blur panel with ' +
      'the amber top edge, four name-over-chip contestant columns, amber tabular figures. The ' +
      'spotlight keylines one column and dims the rest; scores pop on air; a cleared name ' +
      'removes its column.',
    uicolor: '4',
  },
  () => ({
    html: `    <!-- House Podiums: void strip — [amber edge] HEADING, four name-over-chip columns. -->
    <div class="scoreboard-box">
      <!-- The accent edge — the design's accent, on the house strip's left. -->
      <div class="scoreboard-accent"></div>
      <div class="scoreboard-mask scoreboard-head-mask"><span id="f0" class="scoreboard-heading">SCORES</span></div>
      <div class="scoreboard-podiums">
${podiumColumnsHtml(NAMES, SCORES)}
      </div>
${spotlightHolderHtml('f9')}
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The strip — the house void, with the amber top edge (the house strip). */
.scoreboard-box {
  position: relative;              /* anchors the accent edge */
  display: flex;                   /* heading, then the podium row */
  align-items: center;             /* heading and columns share the strip's center line */
  gap: calc(26px * var(--scale));  /* air between the heading and the columns */
  padding: calc(14px * var(--scale)) calc(30px * var(--scale)) calc(14px * var(--scale)) calc(40px * var(--scale));
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
  border-top: calc(2px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);  /* the house top edge */
}

/* The accent edge — the amber bar fused to the left, with the house glow. */
.scoreboard-accent {
  position: absolute;              /* pinned over the strip's left edge */
  left: 0;                         /* flush */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);       /* the one accent surface */
  box-shadow: var(--accent-glow);  /* the family's glow */
}

/* The heading — the house mono kicker, quiet beside the figures. */
.scoreboard-heading {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* a kicker — at the 20px type floor */
  font-weight: var(--label-weight, 500);  /* the label voice */
  line-height: 1;                  /* one tight line */
  letter-spacing: var(--label-tracking, 0.16em);  /* the house mono spacing */
  font-family: var(--font-label, var(--font-heading));  /* the family's label face */
  color: var(--text-dim);          /* secondary ink */
  text-transform: uppercase;       /* a label, whatever the operator types */
}

/* The podium row — four columns on one center line. */
.scoreboard-podiums {
  display: flex;                   /* the four columns in one row */
  align-items: center;             /* names and chips share the strip's line */
  gap: calc(28px * var(--scale));  /* air between contestants */
}

/* One podium: the name over its chip. */
.scoreboard-podium {
  display: flex;                   /* name over chip */
  flex-direction: column;          /* stacked */
  align-items: center;             /* centered column */
  gap: calc(5px * var(--scale));   /* a tight stack */
  min-width: 0;                    /* long names shrink, never overflow */
  transition: opacity 0.25s ease;  /* the spotlight dim */
}
/* A cleared name removes the whole column — contestant count is content. */
.scoreboard-podium-empty { display: none; }
/* The spotlight: the named column's chip takes the full amber keyline; the rest step back. */
.scoreboard-podium-spot .scoreboard-chip {
  box-shadow: inset 0 0 0 calc(2px * var(--scale)) var(--accent);  /* a solid amber frame */
}
.scoreboard-podium-dim { opacity: 0.45; }

/* The contestant name — house display type, a step under the figures. */
.scoreboard-team {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* under the scores */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.1;                /* tight */
  letter-spacing: var(--display-tracking);  /* the family's tracking */
  color: var(--text-color);        /* primary ink on the void */
}

/* The chip — the denser void tile (house chip radius 6) holding the amber figure. */
.scoreboard-chip {
  display: flex;                   /* centers the figure… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally */
  min-width: calc(58px * var(--scale));   /* single digits still get a solid chip */
  padding: calc(5px * var(--scale)) calc(14px * var(--scale));  /* snug frame */
  border-radius: calc(6px * var(--scale));  /* the house chip radius */
  background: rgba(10, 12, 16, 0.6);  /* a second, denser layer of the void */
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent);  /* thin amber keyline */
}

/* The figure — amber, tabular, the loudest scale on the strip. */
.scoreboard-score {
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* scores lead */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1;                  /* fills its chip */
  color: var(--accent);            /* the figures wear the amber */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter */
  font-family: var(--font-numeric);  /* a face whose digits are even */
}

/* Final scores — the result group adds .scoreboard-final; figures settle to white. */
.scoreboard-final .scoreboard-score {
  color: var(--text-color);        /* decided */
}`,
    hasAccent: true,
    // The stage: the width this board holds a full match at (two long club names, two-digit
    // scores) without giving any of them up. Short names leave the room where the anchor is.
    stageWidth: 960,
    fields: podiumFields({ heading: 'SCORES', names: [...NAMES], scores: [...SCORES] }),
    popFields: ['f2', 'f4', 'f6', 'f8'],
    lineCount: 9,
    runtimeExtraJs: podiumRuntimeJs(),
  }),
);
