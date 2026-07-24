// sb17 "House Event Card" — the NoaCG match-event card: substitutions, cards, penalties and
// goals. Sibling of sb05 "House Scorebug" and lt11 "House Strap".
//
// One card for every in-match event, because they all have the same shape: a KIND, a minute, a
// team, and two facts. A substitution is "off" and "on"; a booking is the player and the
// offence; a hockey penalty is the player and the sanction; a goal is the scorer and the
// assist. Four graphics collapsed into one is not a shortcut — it means an operator learns one
// card and can put anything on air with it mid-move, which is the only speed that matters here.
//
// The two role marks are deliberately NOT directional arrows. An arrow reads correctly for a
// substitution and wrongly for everything else; a neutral mark with the accent on the second
// row emphasises the right thing in every case (the player coming on, the player booked).

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineScoreboardVariant } from './shared';
import { teamColoursRuntimeJs } from './boardRuntimes';
import { clipOneLineCss, colourHolderHtml, matchEventFields } from './scorebugShared';

export const sb17: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb17',
    category: 'scoreboard',
    name: 'House Event Card',
    styleTag: 'noacg',
    description: 'The house event card: substitutions, bookings and penalties, with a minute stamp.',
    maxLines: 1,
    suggestedLines: [{ title: 'Event', sample: 'SUBSTITUTION' }],
    logo: 'none',
    animationPresets: ['slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'House Event Card',
    description:
      'The NoaCG match-event card, sibling of sb05 House Scorebug: a void panel with an amber ' +
      'edge, the event kind and minute on a mono header row, the club beneath, and the two ' +
      'people or facts as marked rows. Serves substitutions, bookings, penalties and goals — ' +
      'and clears itself on a timer so it can never be left on air.',
    uicolor: '4',
  },
  () => ({
    html: `    <!-- House Event Card: void panel — kind + minute, club, then the two marked rows. -->
    <div class="scoreboard-box">
      <!-- The accent edge — the amber left bar, and the flag marker the machine pulses. -->
      <div class="scoreboard-accent"></div>
      <!-- The header row: what happened, and when. -->
      <div class="scoreboard-eventhead">
        <div class="scoreboard-mask"><span id="f0" class="scoreboard-event">SUBSTITUTION</span></div>
        <div class="scoreboard-mask"><span id="f1" class="scoreboard-minute">67'</span></div>
      </div>
      <!-- The club it happened to. -->
      <div class="scoreboard-mask scoreboard-club-mask"><span id="f2" class="scoreboard-club">ARSENAL</span></div>
      <!-- The two facts: off/on for a substitution, player/offence for a booking. -->
      <div class="scoreboard-people">
        <div class="scoreboard-person scoreboard-person-a">
          <span class="scoreboard-rolemark"></span>
          <div class="scoreboard-mask scoreboard-name-mask"><span id="f3" class="scoreboard-name">M. ØDEGAARD</span></div>
        </div>
        <div class="scoreboard-person scoreboard-person-b">
          <span class="scoreboard-rolemark"></span>
          <div class="scoreboard-mask scoreboard-name-mask"><span id="f4" class="scoreboard-name">K. HAVERTZ</span></div>
        </div>
      </div>
${colourHolderHtml('f5', '#ef0107')}
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The card — the house void, with the family's amber top edge. */
.scoreboard-box {
  position: relative;              /* anchors the accent edge */
  min-width: calc(440px * var(--scale));  /* a card, not a strap */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(16px * var(--scale)) calc(28px * var(--scale)) calc(16px * var(--scale)) calc(34px * var(--scale));
  background: var(--panel-bg);     /* the house void — retints through the :root contract */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
  border-top: calc(2px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);
}

/* The accent edge — the amber bar down the left, doubling as the flag marker. */
.scoreboard-accent {
  position: absolute;              /* pinned over the card's left edge */
  left: 0;                         /* flush with the box's left side */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);       /* the one accent surface */
  box-shadow: var(--accent-glow);  /* the family's glow — follows the accent color */
}

/* The header row — the event kind on the left, the minute stamp on the right. */
.scoreboard-eventhead {
  display: flex;                   /* the two ends of the row… */
  align-items: baseline;           /* …on one text baseline */
  justify-content: space-between;  /* pushed to opposite ends */
  gap: calc(20px * var(--scale));  /* the minute never crowds a long event word */
}
.scoreboard-event {
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* a label, not a headline */
  font-weight: 500;                /* medium keeps tracked mono caps crisp */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the house's wide label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the label carries the accent */
}
.scoreboard-minute {
  font-family: var(--font-label);  /* mono: the minute is data, not display type */
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* level with the event word */
  font-weight: 500;                /* one mono voice across the header */
  line-height: 1.2;                /* on the header's baseline */
  color: var(--text-dim);          /* dimmed — the minute is a stamp, not the headline */
  font-variant-numeric: tabular-nums;  /* digits share one width across successive cards */
  white-space: nowrap;             /* "90+4'" stays on one line */
}

/* The club — the card's biggest line, in house display type. */
.scoreboard-club {
  font-size: calc(28px * var(--scale) * var(--type-scale));  /* the card's anchor */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text on the void */
}
.scoreboard-club-mask {
  display: block;                  /* the club owns its own row */
  margin-top: calc(6px * var(--scale));  /* air under the header row */
}

${clipOneLineCss('.scoreboard-club', 340)}

/* The two facts — marked rows under a dim keyline. */
.scoreboard-people {
  display: flex;                   /* the two rows… */
  flex-direction: column;          /* …stacked as one column */
  gap: calc(6px * var(--scale));   /* the rows read as a pair */
  margin-top: calc(12px * var(--scale));  /* air above the keyline */
  padding-top: calc(12px * var(--scale));  /* air under the keyline */
  border-top: 1px solid rgba(255, 255, 255, 0.12);  /* the house keyline */
}
.scoreboard-person {
  display: flex;                   /* mark and name in one row */
  align-items: center;             /* both on the row's centre line */
  gap: calc(12px * var(--scale));  /* air between them */
  min-width: 0;                    /* lets a long name shrink, not overflow */
}

/* The role mark — the club's colour on the first row, the accent on the second. Neutral
   squares rather than arrows: an arrow is right for a substitution and wrong for a booking. */
.scoreboard-rolemark {
  flex-shrink: 0;                  /* the mark never gives up width */
  width: calc(10px * var(--scale));  /* small — it marks the row, it does not label it */
  height: calc(10px * var(--scale));  /* square, in keeping with the house chips */
  border-radius: calc(2px * var(--scale));  /* the house's small-chip radius */
  background: var(--team-a, var(--text-dim));  /* the club's own colour */
}
.scoreboard-person-b .scoreboard-rolemark {
  background: var(--accent);       /* the second row is the emphasised one, in every reading */
  box-shadow: var(--accent-glow);  /* the house glow, on the marked row */
}

/* The name — clearly subordinate to the club, still readable in a single frame. */
.scoreboard-name {
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* a step under the club */
  font-weight: 500;                /* medium — the club above carries the weight */
  line-height: 1.25;               /* comfortable at this size */
  color: var(--text-color);        /* primary text — these are the people the card is about */
}
.scoreboard-person-a .scoreboard-name { color: var(--text-dim); }  /* the first row is the quieter one */
.scoreboard-name-mask { min-width: 0; }  /* flex items refuse to shrink without this */

${clipOneLineCss('.scoreboard-name', 330)}`,
    hasAccent: true,
    fields: matchEventFields({
      event: 'SUBSTITUTION', minute: "67'", team: 'ARSENAL',
      detail: 'M. ØDEGAARD', player: 'K. HAVERTZ', colour: '#ef0107',
    }),
    // Nothing pops on an event card: every field changes at once when a new event is staged,
    // and four simultaneous pops read as a glitch rather than as emphasis.
    popFields: [],
    lineCount: 5, // f0 event · f1 minute · f2 club · f3 detail · f4 player
    runtimeExtraJs: teamColoursRuntimeJs(),
  }),
);
