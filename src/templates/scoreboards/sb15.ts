// sb15 "Frost Status Card" — the glass match-status and final-score card, sibling of sb11
// "Frost Match Board" and lt08 "Frosted Card". A centred frosted card: a status pill at the
// top, the two competitors stacked with their scores in a right-hand column, and the note
// beneath.
//
// Centred and stacked because this card most often shows a completed individual event — a
// bout, a final, a race classification — where the two names are read one after the other
// rather than compared side by side.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineScoreboardVariant } from './shared';
import { teamColoursRuntimeJs } from './boardRuntimes';
import { clipOneLineCss, colourHoldersHtml, matchStatusFields } from './scorebugShared';

export const sb15: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb15',
    category: 'scoreboard',
    name: 'Frost Status Card',
    styleTag: 'glass',
    description: 'A frosted result card: a status pill, competitors stacked with scores, and a note.',
    maxLines: 1,
    suggestedLines: [{ title: 'Team A', sample: 'Adesanya' }],
    logo: 'none',
    animationPresets: ['pop-spring', 'blur-in', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Status Card',
    description:
      'The glass match-status and final-score card, sibling of sb11 Frost Match Board and lt08 ' +
      'Frosted Card: a centred frosted card with a status pill, the two competitors stacked as ' +
      'rows with a colour dot and their score in a right-hand column, and a quiet note beneath. ' +
      'Drawn for the individual sports, where two names are read in turn rather than compared.',
    uicolor: '5',
  },
  () => ({
    html: `    <!-- Frost Status Card: frosted card — status pill, two stacked competitor rows, note. -->
    <div class="scoreboard-box">
      <!-- The accent bar — a soft glass edge, and the flag marker the machine pulses. -->
      <div class="scoreboard-accent"></div>
      <!-- The status pill — a live pip and the status line, inside one soft chip. -->
      <div class="scoreboard-statusrow">
        <span class="scoreboard-pip"></span>
        <div class="scoreboard-mask"><span id="f4" class="scoreboard-status">DECISION</span></div>
      </div>
      <!-- The competitors, stacked: colour dot, name, score. -->
      <div class="scoreboard-main">
        <div class="scoreboard-side scoreboard-side-a">
          <span class="scoreboard-colour-chip"></span>
          <div class="scoreboard-mask scoreboard-team-mask"><span id="f0" class="scoreboard-team">Adesanya</span></div>
          <div class="scoreboard-mask"><span id="f1" class="scoreboard-score">48</span></div>
        </div>
        <div class="scoreboard-side scoreboard-side-b">
          <span class="scoreboard-colour-chip"></span>
          <div class="scoreboard-mask scoreboard-team-mask"><span id="f2" class="scoreboard-team">Pereira</span></div>
          <div class="scoreboard-mask"><span id="f3" class="scoreboard-score">47</span></div>
        </div>
      </div>
      <!-- The note — the event, the round, the venue. -->
      <div class="scoreboard-mask"><span id="f5" class="scoreboard-note">Middleweight title · 5 rounds</span></div>
${colourHoldersHtml('f6', 'f7', '#c084fc', '#7dd3fc')}
    </div>`,
    css: `${labelFontFaceCss(fontById('manrope'))}

/* The card — one frosted surface, centred content, generous air. */
.scoreboard-box {
  position: relative;              /* anchors the accent bar */
  min-width: calc(500px * var(--scale));  /* a card, not a strip */
  box-sizing: border-box;          /* padding stays inside the measured width */
  display: flex;                   /* status, competitors and note… */
  flex-direction: column;          /* …stacked as one column */
  align-items: center;             /* everything centred on the card's axis */
  padding: calc(24px * var(--scale)) calc(30px * var(--scale)) calc(22px * var(--scale));
  border-radius: var(--panel-radius);  /* the family's soft radius — a pane, not a slab */
  background: var(--panel-bg);     /* the frosted white wash */
  backdrop-filter: var(--panel-blur);  /* the family's real blur — this is the whole look */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* the lift, plus the glass keyline */
  overflow: hidden;                /* the accent bar is clipped to the card's radius */
}

/* The accent bar — a soft edge across the card's top, and the flag marker. */
.scoreboard-accent {
  position: absolute;              /* pinned across the card's top edge */
  left: 0;                         /* full width, left… */
  right: 0;                        /* …to right */
  top: 0;                          /* along the top */
  height: var(--accent-weight);    /* the family's bar weight */
  background: var(--accent);       /* the one accent surface */
  opacity: 0.9;                    /* the glass family softens its accents rather than glowing */
}

/* The status pill — a soft chip holding the pip and the status line. */
.scoreboard-statusrow {
  display: flex;                   /* pip and status in one row */
  align-items: center;             /* both on the pill's centre line */
  gap: calc(10px * var(--scale));  /* air between them */
  padding: calc(6px * var(--scale)) calc(16px * var(--scale));  /* the pill's own frame */
  border-radius: calc(999px * var(--scale));  /* a true pill at any scale */
  background: rgba(255, 255, 255, 0.14);  /* a second, lighter layer of glass */
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);  /* the glass keyline */
}
.scoreboard-pip {
  flex-shrink: 0;                  /* the pip keeps its size whatever the text does */
  width: calc(9px * var(--scale)); /* small on purpose — a marker, not a badge */
  height: calc(9px * var(--scale));  /* same as the width — a true circle */
  border-radius: 50%;              /* a ratio cap, not a size — stays round at any scale */
  background: var(--accent);       /* the live signal wears the accent */
}
.scoreboard-status {
  font-size: calc(15px * var(--scale) * var(--type-scale));  /* a label, not a headline */
  font-weight: 700;                /* solid at label size */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
}

/* The competitors, stacked as rows. */
.scoreboard-main {
  display: flex;                   /* the two competitor rows… */
  flex-direction: column;          /* …stacked as one column */
  align-self: stretch;             /* the rows span the card's full width */
  margin: calc(18px * var(--scale)) 0 calc(14px * var(--scale));  /* air above and below */
}
.scoreboard-side {
  display: flex;                   /* dot, name and score share one row */
  align-items: center;             /* on the row's centre line */
  gap: calc(14px * var(--scale));  /* air inside the row */
  padding: calc(10px * var(--scale)) 0;  /* the stack's vertical rhythm */
  min-width: 0;                    /* lets a long name shrink, not overflow */
}
.scoreboard-side + .scoreboard-side {
  border-top: 1px solid rgba(255, 255, 255, 0.16);  /* the glass keyline between competitors */
}

/* The colour dot — small and soft, ringed in glass. */
.scoreboard-colour-chip {
  flex-shrink: 0;                  /* the dot keeps its size whatever the text does */
  width: calc(11px * var(--scale));  /* small on purpose — a marker, not a badge */
  height: calc(11px * var(--scale));  /* same as the width — a true circle */
  border-radius: 50%;              /* a ratio cap, not a size — stays round at any scale */
  background: var(--team-a, var(--accent));  /* the competitor's colour, or the accent */
  box-shadow: 0 0 0 calc(2px * var(--scale)) rgba(255, 255, 255, 0.18);  /* a soft glass ring */
}
.scoreboard-side-b .scoreboard-colour-chip { background: var(--team-b, var(--text-dim)); }

/* The name — the glass family's rounded sans, taking the row's spare width. */
.scoreboard-team {
  font-size: calc(28px * var(--scale) * var(--type-scale));  /* the row's anchor */
  font-weight: 600;                /* semibold — present without shouting */
  line-height: 1.2;                /* comfortable for a mixed-case name */
  color: var(--text-color);        /* primary text on the frost */
}
.scoreboard-team-mask {
  min-width: 0;                    /* flex items refuse to shrink without this */
  flex: 1;                         /* the name takes the row's spare width */
}

${clipOneLineCss('.scoreboard-team', 280)}

/* The score — one figure per row, in a shared right-hand column. */
.scoreboard-score {
  flex-shrink: 0;                  /* scores never squeeze — names give up width instead */
  min-width: calc(52px * var(--scale));  /* a shared column, so both rows line up */
  text-align: right;               /* two-digit scores stay aligned with single ones */
  font-size: calc(34px * var(--scale) * var(--type-scale));  /* the loudest figure in the row */
  font-weight: 800;                /* the heaviest thing on the card */
  line-height: 1;                  /* sits tight on the row */
  color: var(--accent);            /* the scores wear the accent */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter as scores tick */
}

/* The note — the event and the round, the quietest row on the card. */
.scoreboard-note {
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* reference type, not display */
  font-weight: 500;                /* medium — contrast comes from the names above */
  line-height: 1.35;               /* relaxed leading in case it wraps */
  color: var(--text-dim);          /* dimmed — never full white twice on one card */
  text-align: center;              /* centred with the pill above it */
  overflow-wrap: break-word;       /* break a very long unbroken event name */
}

/* ── Match state (the machine's status group adds these to the root) ── */

/* A break: the pip loses the accent and the pill quietens — held, not live. */
.scoreboard-break .scoreboard-pip { background: var(--text-dim); }
.scoreboard-break .scoreboard-statusrow { opacity: 0.8; }

/* Result — the pip goes entirely, and the pill takes the accent as a solid chip. */
.scoreboard-final .scoreboard-pip { display: none; }
.scoreboard-final .scoreboard-statusrow { background: color-mix(in srgb, var(--accent) 30%, transparent); }
.scoreboard-final .scoreboard-status { color: var(--text-color); }`,
    hasAccent: true,
    fields: matchStatusFields({
      teamA: 'Adesanya', scoreA: '48', teamB: 'Pereira', scoreB: '47',
      status: 'DECISION', note: 'Middleweight title · 5 rounds',
      colourA: '#c084fc', colourB: '#7dd3fc',
    }),
    popFields: ['f1', 'f3'],
    lineCount: 6, // f0 name · f1 score · f2 name · f3 score · f4 status · f5 note
    runtimeExtraJs: teamColoursRuntimeJs(),
  }),
);
