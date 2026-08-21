// ss20 "Marquee Card" - the coming-up slate for an event with a PROGRAMME: a summit, a
// conference day, a festival stage, a school open evening. Glass family, sibling of ss03
// "Frost Hold" and lt08 "Frosted Card", and deliberately a different card from ss03 rather
// than a re-skin of it.
//
// THE COMPOSITION is a LAYERED BADGE, not a panel with text on it. Four pieces are stacked and
// each one is narrower or wider than the one it sits against: a tab strap carrying the kicker
// pokes out above the plaque, the plaque holds the event's name, a bright strap crosses its
// foot carrying the wait and the countdown together, and a ribbon runs out below the whole
// thing with the room on it. That silhouette is the graphic - every other holding screen in
// the catalog is a single rectangle, centred, with rows inside it.
//
// The countdown sits INSIDE the bright strap rather than under the card as a big figure,
// because on this card the wait is a sentence ("Doors in 04:20"), not a stadium clock. ss11
// "Doors Open" is the design for when it is the other way round.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineStartingSoonVariant } from './shared';

export const ss20: TemplateVariant = defineStartingSoonVariant(
  {
    id: 'ss20',
    category: 'starting-soon',
    name: 'Marquee Card',
    styleTag: 'glass',
    description: 'A layered event badge: a kicker tab, the event plaque, a countdown strap and a room ribbon.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Kicker', sample: 'COMING UP' },
      { title: 'Event', sample: 'Media Futures Summit' },
      { title: 'Wait', sample: 'Panel starts in' },
      { title: 'Room', sample: 'STUDIO B' },
    ],
    logo: 'none',
    animationPresets: ['hold-loop'],
    defaultPalette: paletteById('mint'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Marquee Card',
    description:
      'The layered event badge: a kicker tab above the plaque, the event name on the plaque ' +
      'itself, a bright strap across its foot carrying the wait and the countdown as one ' +
      'sentence, and a ribbon below with the room or stage on it. Built for a programme with ' +
      'several items in it, where the audience needs to know which one is next and where.',
    uicolor: '5',
  },
  (o) => ({
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 1010,
    lineCount: 4,
    clock: 'minutes',
    clockMinutes: '10',
    lineDefaults: [
      { title: 'Kicker', sample: 'COMING UP' },
      { title: 'Event', sample: 'Media Futures Summit' },
      { title: 'Wait', sample: 'Panel starts in' },
      { title: 'Room', sample: 'STUDIO B' },
    ],
    // The TAB breathes rather than the plaque: the hold loop's scale on a full card reads as a
    // wobble at this size, and on the smallest piece it reads as a pulse.
    html: `    <!-- Marquee Card: kicker tab over the event plaque, countdown strap, room ribbon. -->
    <div class="starting-soon-box">
      <!-- The tab - the kicker (f0), poking out above the plaque it belongs to. -->
      <div class="starting-soon-tab starting-soon-pulse">
        <span id="f0" class="starting-soon-kicker">${o.lines[0]?.sample || 'COMING UP'}</span>
      </div>
      <!-- The plaque - the event's name (f1), the one thing read from across a foyer. -->
      <div class="starting-soon-plaque">
        <div class="starting-soon-mask"><span id="f1" class="starting-soon-show">${o.lines[1]?.sample || 'Media Futures Summit'}</span></div>
      </div>
      <!-- The strap - the wait (f2) and the countdown, set as one sentence on a bright ground. -->
      <div class="starting-soon-strap">
        <span id="f2" class="starting-soon-wait">${o.lines[2]?.sample || 'Panel starts in'}</span>
        <div class="starting-soon-clock">10:00</div>
      </div>
      <!-- The ribbon - where it happens (f3). Runs wider than the strap above it. -->
      <div class="starting-soon-ribbon">
        <span id="f3" class="starting-soon-room">${o.lines[3]?.sample || 'STUDIO B'}</span>
      </div>
    </div>`,
    css: `/* The badge - four stacked pieces on one centre line, each sized by its own content. */
.starting-soon-box {
  display: flex;                   /* the pieces stack… */
  flex-direction: column;          /* …top to bottom */
  align-items: center;             /* every piece centred on the badge's axis */
  max-width: calc(1180px * var(--scale));  /* the badge stays inside the title-safe area */
}

/* The tab - the kicker's own chip, sitting ON the plaque's top edge. The negative margin is
   what makes the badge read as layered rather than as four stacked bars. */
.starting-soon-tab {
  position: relative;              /* lifted above the plaque in the stacking order */
  z-index: 1;                      /* the tab overlaps the plaque, never the other way round */
  margin-bottom: calc(-14px * var(--scale));  /* the plaque's top edge runs under the tab */
  padding: calc(12px * var(--scale)) calc(46px * var(--scale)) calc(22px * var(--scale));
  background: var(--accent);       /* the badge's one accent surface */
  border-radius: var(--panel-radius) var(--panel-radius) 0 0;  /* the family's radius, top corners only */
  will-change: transform;          /* hint the browser: the hold loop breathes this piece */
}

/* The kicker - tracked caps on the accent chip, in the dark-on-accent ink. */
.starting-soon-kicker {
  font-size: calc(28px * var(--scale) * var(--type-scale));  /* label scale on a wide chip */
  font-weight: 700;                /* solid caps on a filled chip */
  line-height: 1.2;                /* one tight label row */
  letter-spacing: var(--label-tracking);  /* the family's label tracking - small caps breathe */
  text-transform: uppercase;       /* a kicker is always caps */
  color: var(--accent-ink);        /* the dark-on-accent ink token */
}

/* The plaque - the card itself: translucent, blurred, keylined. The glass family's panel. */
.starting-soon-plaque {
  position: relative;              /* sits above the ribbon in the stacking order */
  z-index: 1;                      /* the ribbon runs out from behind it */
  padding: calc(46px * var(--scale)) calc(66px * var(--scale)) calc(38px * var(--scale));
  background: var(--panel-bg);     /* the family's translucent panel */
  border-radius: var(--panel-radius);  /* the family's radius */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* soft wide lift + the 1px inner edge */
  backdrop-filter: var(--panel-blur);  /* the family's blur, safe when a theme sets none */
  text-align: center;              /* a centre-anchored composition centres its type */
}

/* The event name - the badge's headline, at the size a foyer screen is read at. */
.starting-soon-show {
  font-size: calc(96px * var(--scale) * var(--type-scale));  /* the loudest thing on the card */
  font-weight: 800;                /* the glass family's heavy end */
  line-height: 1.04;               /* tight for a wrapping display line */
  letter-spacing: -0.015em;        /* big text tightens */
  color: var(--text-color);        /* primary text colour */
  text-wrap: balance;              /* a wrapped name gets even rows */
}

/* The strap - the bright band across the plaque's foot. It overlaps upward, so the plaque's
   bottom edge disappears behind it and the two read as one moulded piece. */
.starting-soon-strap {
  position: relative;              /* above the plaque in the stacking order */
  z-index: 2;                      /* the strap is the topmost piece of the badge */
  display: flex;                   /* the sentence and the clock in one row */
  align-items: baseline;           /* the words and the figures sit on one baseline */
  justify-content: center;         /* centred under the name */
  gap: calc(16px * var(--scale));  /* the wait and the count read as one sentence */
  margin-top: calc(-26px * var(--scale));  /* ride up over the plaque's foot */
  padding: calc(16px * var(--scale)) calc(52px * var(--scale));
  background: rgba(255, 255, 255, 0.94);  /* the one bright surface - a lit strap on a dark stage */
  border-radius: var(--panel-radius);  /* the family's radius */
  box-shadow: var(--panel-shadow); /* the family's soft wide lift */
}

/* The wait - a sentence, not a label: sentence case, no tracking, the type it would be set in. */
.starting-soon-wait {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* readable beside the count */
  font-weight: 600;                /* firm, but under the figures */
  line-height: 1.2;                /* one row */
  color: #12161c;                  /* dark ink on the bright strap */
}

/* The countdown - inside the strap, so the wait reads as one phrase. */
.starting-soon-clock {
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* the sentence's stressed word */
  font-weight: 800;                /* the figures carry the line */
  line-height: 1.1;                /* sits on the strap's baseline */
  color: #12161c;                  /* the same ink as the words beside it */
  font-variant-numeric: tabular-nums;  /* every digit one width - the strap never twitches */
  font-family: var(--font-numeric);  /* a face whose digits are all one width */
}

/* The ribbon - the room, running out below and WIDER than the strap above it. Tinted with the
   accent rather than filled, so the badge keeps exactly one solid accent surface (the tab). */
.starting-soon-ribbon {
  align-self: stretch;             /* the badge's full width… */
  margin: calc(-18px * var(--scale)) calc(-42px * var(--scale)) 0;  /* …and out past it on both sides */
  padding: calc(28px * var(--scale)) calc(74px * var(--scale)) calc(16px * var(--scale));
  text-align: center;              /* the room sits on the badge's axis */
  background: color-mix(in srgb, var(--accent) 26%, transparent);  /* an accent tint, not a fill */
  border-radius: 0 0 var(--panel-radius) var(--panel-radius);  /* the family's radius, foot corners */
  backdrop-filter: var(--panel-blur);  /* the family's blur, so the tint stays glass */
}

/* The room - a tracked-caps chip line: the smallest type on the card, still well over the floor. */
.starting-soon-room {
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* label scale */
  font-weight: 700;                /* solid at label size */
  line-height: 1.2;                /* one row */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* a room or stage name is set as a label */
  color: var(--text-color);        /* primary text - the tint behind it is quiet enough */
}

/* Time is up - the strap takes the accent, which on this card is the doors opening. */
.starting-soon-done .starting-soon-strap { background: var(--accent); }
.starting-soon-done .starting-soon-wait,
.starting-soon-done .starting-soon-clock { color: var(--accent-ink); }`,
  }),
);
