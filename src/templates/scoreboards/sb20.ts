// sb20 "Club Event Card" — the minimal match-event card, and the pack's amateur one. Sibling
// of sb08 "Club Scorebug" and lt01 "Hairline".
//
// Drawn on the assumption that whoever operates it is also filming, so it says everything on
// three quiet rows and needs no colour vocabulary to be understood: the minute reads as a
// minute, the event word reads as itself, and the two names are just names. Flat panel, one
// hairline, no blur — the same reasoning as sb08.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineScoreboardVariant } from './shared';
import { teamColoursRuntimeJs } from './boardRuntimes';
import { clipOneLineCss, colourHolderHtml, matchEventFields } from './scorebugShared';

export const sb20: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb20',
    category: 'scoreboard',
    name: 'Club Event Card',
    styleTag: 'minimal',
    description: 'The amateur event card: minute, event and club on one row, the two names below.',
    maxLines: 1,
    suggestedLines: [{ title: 'Event', sample: 'Substitution' }],
    logo: 'none',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Club Event Card',
    description:
      'The local and amateur match-event card, sibling of sb08 Club Scorebug and lt01 Hairline: ' +
      'a flat panel with the minute, the event and the club on one header row, and the two ' +
      'names beneath a keyline. No colour vocabulary to learn — it reads correctly for a ' +
      'substitution, a booking or a goal on sight. Clears itself on a timer.',
    uicolor: '1',
  },
  () => ({
    html: `    <!-- Club Event Card: flat panel — minute · event · club, then the two names. -->
    <div class="scoreboard-box">
      <!-- The accent rule — the left edge of the card, and the flag marker. -->
      <div class="scoreboard-accent"></div>
      <!-- The header row: when, what, and to whom. -->
      <div class="scoreboard-eventhead">
        <div class="scoreboard-mask"><span id="f1" class="scoreboard-minute">58'</span></div>
        <div class="scoreboard-mask"><span id="f0" class="scoreboard-event">Substitution</span></div>
      </div>
      <div class="scoreboard-mask scoreboard-club-mask"><span id="f2" class="scoreboard-club">Ashton United</span></div>
      <!-- The two names, under a keyline. -->
      <div class="scoreboard-people">
        <div class="scoreboard-person scoreboard-person-a">
          <span class="scoreboard-rolemark"></span>
          <div class="scoreboard-mask scoreboard-name-mask"><span id="f3" class="scoreboard-name">Dan Whitehead</span></div>
        </div>
        <div class="scoreboard-person scoreboard-person-b">
          <span class="scoreboard-rolemark"></span>
          <div class="scoreboard-mask scoreboard-name-mask"><span id="f4" class="scoreboard-name">Joe Ferguson</span></div>
        </div>
      </div>
${colourHolderHtml('f5', '#d92b2b')}
    </div>`,
    css: `${labelFontFaceCss(fontById('inter'))}

/* The card — flat and solid, so it stays legible over a handheld shot at a low bitrate. */
.scoreboard-box {
  position: relative;              /* anchors the accent rule */
  min-width: calc(400px * var(--scale));  /* a card, not a strap */
  box-sizing: border-box;          /* padding stays inside the measured width */
  padding: calc(15px * var(--scale)) calc(24px * var(--scale)) calc(15px * var(--scale)) calc(28px * var(--scale));
  background: var(--panel-bg);     /* the family's solid dark panel */
  box-shadow: var(--panel-shadow); /* the family's lift */
}

/* The accent rule — a thin left edge, and the machine's flag marker. Flat, never glowing. */
.scoreboard-accent {
  position: absolute;              /* pinned down the card's left side */
  left: 0;                         /* flush with the box's left edge */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: var(--accent-weight);     /* the family's rule weight */
  background: var(--accent);       /* the one accent surface */
}

/* The header row — the minute and the event word on one line. */
.scoreboard-eventhead {
  display: flex;                   /* minute and event in one row */
  align-items: baseline;           /* both on one text baseline */
  gap: calc(12px * var(--scale));  /* air between them */
}
.scoreboard-minute {
  font-size: calc(15px * var(--scale) * var(--type-scale));  /* small: the header is reference */
  font-weight: 700;                /* bold — the minute is the row's anchor */
  line-height: 1.2;                /* compact header leading */
  color: var(--accent);            /* the minute wears the accent */
  font-variant-numeric: tabular-nums;  /* digits share one width across successive cards */
  white-space: nowrap;             /* "90+4'" stays on one line */
}
.scoreboard-event {
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* level with the minute */
  font-weight: 600;                /* semibold keeps small caps legible */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
}

/* The club — the card's biggest line, in sentence case. */
.scoreboard-club {
  font-size: calc(25px * var(--scale) * var(--type-scale));  /* the card's anchor */
  font-weight: 600;                /* semibold — present, not shouted */
  line-height: 1.22;               /* comfortable for a long mixed-case club name */
  color: var(--text-color);        /* primary text on the panel */
}
.scoreboard-club-mask {
  display: block;                  /* the club owns its own row */
  margin-top: calc(4px * var(--scale));  /* air under the header row */
}

${clipOneLineCss('.scoreboard-club', 320)}

/* The two names — under the family's one keyline. */
.scoreboard-people {
  display: flex;                   /* the two rows… */
  flex-direction: column;          /* …stacked as one column */
  gap: calc(5px * var(--scale));   /* the rows read as a pair */
  margin-top: calc(11px * var(--scale));  /* air above the keyline */
  padding-top: calc(11px * var(--scale));  /* air under the keyline */
  border-top: 1px solid rgba(255, 255, 255, 0.20);  /* the family's one divider */
}
.scoreboard-person {
  display: flex;                   /* mark and name in one row */
  align-items: center;             /* both on the row's centre line */
  gap: calc(11px * var(--scale));  /* air between them */
  min-width: 0;                    /* lets a long name shrink, not overflow */
}

/* The role mark — a short rule, not a dot: this family marks with lines. */
.scoreboard-rolemark {
  flex-shrink: 0;                  /* the mark never gives up width */
  width: calc(12px * var(--scale));  /* a short horizontal rule */
  height: calc(2px * var(--scale));  /* hairline weight, in keeping with the family */
  background: var(--text-dim);     /* neutral on the first row */
}
.scoreboard-person-b .scoreboard-rolemark {
  background: var(--accent);       /* the second row is the emphasised one, in every reading */
  height: calc(3px * var(--scale));  /* a touch heavier, so the emphasis reads without colour */
}

/* The names — clearly subordinate to the club. */
.scoreboard-name {
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* a step under the club */
  font-weight: 500;                /* medium — the club above carries the weight */
  line-height: 1.3;                /* comfortable at this size */
  color: var(--text-dim);          /* dimmed on the first row */
}
.scoreboard-person-b .scoreboard-name { color: var(--text-color); }  /* the emphasised row is white */
.scoreboard-name-mask { min-width: 0; }  /* flex items refuse to shrink without this */

${clipOneLineCss('.scoreboard-name', 300)}`,
    hasAccent: true,
    fields: matchEventFields({
      event: 'Substitution', minute: "58'", team: 'Ashton United',
      detail: 'Dan Whitehead', player: 'Joe Ferguson', colour: '#d92b2b',
    }),
    // Nothing pops: every field changes at once when a new event is staged, and four
    // simultaneous pops read as a glitch rather than as emphasis.
    popFields: [],
    lineCount: 5, // f0 event · f1 minute · f2 club · f3 detail · f4 player
    runtimeExtraJs: teamColoursRuntimeJs(),
  }),
);
