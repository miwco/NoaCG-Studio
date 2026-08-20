// sb21 "Volt Podiums" — the sport game-show score strip: four contestant columns in one slab,
// names over point chips, the volt accent bar underneath the leader's chip family. Sibling of
// sb01 Match Strip, stretched from two teams to four podiums. The spotlight state lifts one
// column and dims the rest — the caster's "and CHRIS takes the lead" moment — and an empty
// name collapses its whole column, so a three-player show is content, not another design.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineScoreboardVariant } from './shared';
import { podiumColumnsHtml, podiumFields, podiumRuntimeJs, spotlightHolderHtml } from './scorebugShared';

const NAMES = ['MAYA', 'JONAS', 'PRIYA', 'SAM'] as const;
const SCORES = ['0', '0', '0', '0'] as const;

export const sb21: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb21',
    category: 'scoreboard',
    name: 'Volt Podiums',
    styleTag: 'sport',
    description: 'Four-contestant game-show scores: a volt slab of name-over-points columns with a movable spotlight.',
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
    animationPresets: ['snap-stinger', 'slide-up', 'mask-wipe', 'fade', 'slide-down'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Volt Podiums',
    description:
      'The sport game-show score strip: one volt slab holding four contestant columns, each a ' +
      'name over a point chip. The machine\'s spotlight lifts a column and dims the rest; ' +
      'scores pop as they change on air, and a cleared name removes its whole column.',
    uicolor: '2',
  },
  () => ({
    html: `    <!-- Volt Podiums: [accent bar] HEADING, then four name-over-points columns. -->
    <div class="scoreboard-box">
      <!-- The accent bar — the design's accent AND the flag the machine could pulse. -->
      <div class="scoreboard-accent"></div>
      <div class="scoreboard-mask scoreboard-head-mask"><span id="f0" class="scoreboard-heading">SCORES</span></div>
      <div class="scoreboard-podiums">
${podiumColumnsHtml(NAMES, SCORES)}
      </div>
${spotlightHolderHtml('f9')}
    </div>`,
    css: `/* The slab — the sport family's solid panel with the volt edge on top. */
.scoreboard-box {
  position: relative;              /* anchors the accent bar */
  display: flex;                   /* heading, then the podium row */
  align-items: stretch;            /* heading block and columns share the slab's height */
  gap: calc(26px * var(--scale));  /* air between the heading and the columns */
  padding: calc(14px * var(--scale)) calc(30px * var(--scale)) calc(16px * var(--scale)) calc(38px * var(--scale));
  background: var(--panel-bg);     /* the sport slab */
  box-shadow: var(--panel-shadow); /* one hard lift */
  transform: skewX(-6deg);         /* the sport lean */
}
/* Everything inside un-leans, so type stays upright on the leaning slab. */
.scoreboard-box > * { transform: skewX(6deg); }

/* The accent bar — fused to the slab's left edge, full height. */
.scoreboard-accent {
  position: absolute;              /* pinned over the slab's edge */
  left: 0;                         /* flush left */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);       /* the one accent surface */
  box-shadow: var(--accent-glow);  /* the family's halo */
  transform: none;                 /* the bar leans WITH the slab — it is part of the edge */
}

/* The heading — a vertical kicker block reading up the slab's left side. */
.scoreboard-head-mask {
  align-self: center;              /* centered on the slab's height */
}
.scoreboard-heading {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* a kicker, not a title */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1;                  /* one tight line */
  letter-spacing: 0.14em;          /* spaced caps — the sport kicker voice */
  color: var(--text-dim);          /* quiet beside the scores */
  text-transform: uppercase;       /* a label, whatever the operator types */
}

/* The podium row — four columns sharing one baseline. */
.scoreboard-podiums {
  display: flex;                   /* the four columns in one row */
  align-items: flex-end;           /* chips share the bottom line */
  gap: calc(30px * var(--scale));  /* air between contestants */
}

/* One podium: the name over its point chip. */
.scoreboard-podium {
  display: flex;                   /* name over chip */
  flex-direction: column;          /* stacked */
  align-items: center;             /* both centered on the column */
  gap: calc(6px * var(--scale));   /* a tight stack */
  min-width: 0;                    /* long names shrink, never overflow the slab */
  transition: opacity 0.25s ease, transform 0.25s ease;  /* the spotlight dim/lift */
}
/* A cleared name removes the whole column — three contestants is content, not a design. */
.scoreboard-podium-empty { display: none; }
/* The spotlight state: the named column lifts, the rest step back. */
.scoreboard-podium-spot { transform: translateY(calc(-6px * var(--scale))); }
.scoreboard-podium-dim { opacity: 0.45; }

/* The contestant name — sport display caps. */
.scoreboard-team {
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* under the scores */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.1;                /* tight */
  letter-spacing: var(--display-tracking);  /* the family's tracking */
  color: var(--text-color);        /* names read first after the points */
  text-transform: uppercase;       /* the sport board voice */
}

/* The point chip — a darker tile under each name holding the figure. */
.scoreboard-chip {
  display: flex;                   /* centers the figure… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally */
  min-width: calc(64px * var(--scale));   /* single digits still get a solid chip */
  padding: calc(4px * var(--scale)) calc(14px * var(--scale));  /* snug frame */
  background: rgba(0, 0, 0, 0.35); /* a denser layer of the slab */
  box-shadow: inset 0 calc(-3px * var(--scale)) 0 var(--accent);  /* the volt underline */
}

/* The points — the loudest thing on the board, tabular so they never jitter. */
.scoreboard-score {
  font-size: calc(44px * var(--scale) * var(--type-scale));  /* scores lead a score board */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1;                  /* fills its chip */
  color: var(--accent);            /* points wear the volt */
  font-variant-numeric: tabular-nums;  /* digits share one width */
  font-family: var(--font-numeric);  /* a face whose digits are even */
}

/* Final scores — the result group adds .scoreboard-final; points settle to white. */
.scoreboard-final .scoreboard-score {
  color: var(--text-color);        /* decided — the chase is over */
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
