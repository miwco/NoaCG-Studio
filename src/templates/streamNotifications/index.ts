import type { ResolvedOptions, TemplateVariant } from '../../model/wizard';
import { defineStreamNotification, type StreamNotificationDesign } from './shared';

function eventMarkup(icon: string): string {
  return `    <div class="stream-notification-box">
      <div class="stream-notification-accent"></div>
      <div class="stream-notification-avatar">
        <span class="stream-notification-glyph" aria-hidden="true">${icon}</span>
        <img id="f4" alt="" />
      </div>
      <div class="stream-notification-copy">
        <div class="stream-notification-meta">
          <div class="stream-notification-mask"><span class="stream-notification-label" id="f0">NEW MEMBER</span></div>
          <div class="stream-notification-mask"><span class="stream-notification-amount" id="f2">12 MONTHS</span></div>
        </div>
        <div class="stream-notification-mask"><span class="stream-notification-actor" id="f1">NovaRider</span></div>
        <div class="stream-notification-mask"><span class="stream-notification-message" id="f3">Welcome back to the crew - thank you for the support.</span></div>
      </div>
    </div>`;
}

function noacgDesign(_o: ResolvedOptions): StreamNotificationDesign {
  return {
    html: eventMarkup('N'),
    hasAccent: true,
    css: `/* House signal card: avatar radar, hard amber rail and compact data readout. */
.stream-notification-box {
  position: relative;              /* owns the scan line and rail */
  display: grid;                   /* avatar and text form one instrument panel */
  grid-template-columns: calc(104px * var(--scale)) minmax(0, auto); /* fixed radar beside fluid copy */
  gap: calc(22px * var(--scale));  /* deliberate control-room spacing */
  align-items: center;             /* vertically lock the two columns */
  min-width: calc(560px * var(--scale)); /* preserve the panel's horizontal silhouette */
  padding: calc(20px * var(--scale)) calc(28px * var(--scale)) calc(20px * var(--scale)) calc(24px * var(--scale)); /* compact broadcast padding */
  background: var(--panel-bg);     /* dark control-room surface */
  border-radius: var(--panel-radius); /* house shape token */
  box-shadow: var(--panel-shadow), var(--panel-keyline); /* lift plus precise inner edge */
  backdrop-filter: var(--panel-blur); /* family-owned blur, safe when set to none */
}
.stream-notification-box::after {
  content: "";                     /* faint telemetry rule */
  position: absolute;              /* placed inside the panel */
  right: calc(28px * var(--scale)); /* align with the copy edge */
  bottom: calc(12px * var(--scale)); /* sit below the message */
  width: calc(128px * var(--scale)); /* short signal trace */
  height: 1px;                     /* hairline only */
  background: linear-gradient(90deg, transparent, var(--accent)); /* directional trace */
  opacity: 0.42;                   /* restrained, not decorative noise */
}
.stream-notification-accent {
  position: absolute;              /* one sharp on-air dose */
  left: 0;                         /* attach to the panel edge */
  top: calc(16px * var(--scale));  /* inset from the corner */
  bottom: calc(16px * var(--scale)); /* inset from the corner */
  width: var(--accent-weight);     /* family accent weight */
  background: var(--accent);       /* on-air amber */
  box-shadow: var(--accent-glow);  /* glow only belongs to the accent */
}
.stream-notification-avatar {
  width: calc(104px * var(--scale)); /* large enough to read as an avatar */
  height: calc(104px * var(--scale)); /* circular radar frame */
  border: 1px solid color-mix(in srgb, var(--accent) 52%, transparent); /* signal ring */
  border-radius: 50%;              /* radar geometry */
  background: radial-gradient(circle, color-mix(in srgb, var(--accent) 16%, transparent), transparent 68%); /* soft radar field */
  box-shadow: var(--panel-keyline); /* precise inner radar edge */
}
.stream-notification-glyph {
  color: var(--accent);            /* fallback stays on brand */
  font: 700 calc(38px * var(--scale)) / 1 var(--font-label); /* compact monogram */
  letter-spacing: -0.08em;         /* optically center the monogram */
}
.stream-notification-copy {
  min-width: 0;                    /* allow the message to wrap */
  padding-right: calc(8px * var(--scale)); /* air before the edge */
}
.stream-notification-meta {
  display: flex;                   /* label and amount share the status row */
  gap: calc(18px * var(--scale));  /* separate status values */
  align-items: center;             /* baseline the two labels */
  margin-bottom: calc(5px * var(--scale)); /* separate status from actor */
}
.stream-notification-label,
.stream-notification-amount {
  color: var(--label-color);       /* family label colour */
  font: 600 calc(20px * var(--type-scale) * var(--scale)) / 1.1 var(--font-label); /* technical label face */
  letter-spacing: var(--label-tracking); /* house tracking */
  text-transform: uppercase;       /* labels read as states */
}
.stream-notification-amount {
  color: var(--text-dim);          /* amount is secondary to the event */
}
.stream-notification-actor {
  display: block;                  /* give the name its own line */
  color: var(--text-color);        /* strongest hierarchy */
  font-size: calc(48px * var(--type-scale) * var(--scale)); /* primary read */
  font-weight: var(--display-weight); /* family display weight */
  line-height: 1.02;               /* dense broadcast setting */
  letter-spacing: var(--display-tracking); /* family display tracking */
}
.stream-notification-message {
  margin-top: calc(6px * var(--scale)); /* small air below the name */
  color: var(--text-dim);          /* supportive copy */
  font-size: calc(23px * var(--type-scale) * var(--scale)); /* readable secondary line */
  line-height: 1.28;               /* compact two-line rhythm */
}`,
  };
}

function minimalDesign(_o: ResolvedOptions): StreamNotificationDesign {
  return {
    html: eventMarkup('+'),
    hasAccent: true,
    css: `/* Minimal notice: no panel mass, a typographic rule, and the image parked at the far edge. */
.stream-notification-box {
  display: grid;                   /* type first, image second */
  grid-template-columns: minmax(calc(430px * var(--scale)), auto) calc(72px * var(--scale)); /* quiet wide measure */
  grid-template-areas: "copy avatar"; /* reverse the usual avatar-first order */
  column-gap: calc(22px * var(--scale)); /* generous white space */
  align-items: end;                /* align to the text baseline */
  min-width: calc(540px * var(--scale)); /* preserve the long editorial silhouette */
  padding: calc(18px * var(--scale)) 0 calc(17px * var(--scale)); /* open top and bottom */
  border-bottom: 1px solid color-mix(in srgb, var(--text-color) 22%, transparent); /* one hairline container */
  background: transparent;        /* no card mass */
}
.stream-notification-accent {
  position: absolute;              /* short leading marker */
  left: 0;                         /* anchor to the type column */
  bottom: -1px;                    /* sit over the hairline */
  width: calc(86px * var(--scale)); /* brief emphasis only */
  height: 2px;                     /* quieter than a slab */
  background: var(--accent);       /* the sole accent dose */
}
.stream-notification-copy {
  grid-area: copy;                 /* place words first */
  min-width: 0;                    /* allow wrapping */
}
.stream-notification-avatar {
  grid-area: avatar;               /* park the optional image at the right */
  width: calc(72px * var(--scale)); /* compact identity cue */
  height: calc(72px * var(--scale)); /* square portrait */
  border-radius: var(--panel-radius); /* minimal family radius */
  background: color-mix(in srgb, var(--text-color) 5%, transparent); /* barely-there image well */
  box-shadow: var(--panel-keyline); /* single precise edge */
}
.stream-notification-glyph {
  color: var(--accent);            /* simple plus sign */
  font-size: calc(30px * var(--scale)); /* clear but subordinate */
  font-weight: 400;                /* light editorial mark */
}
.stream-notification-meta {
  display: flex;                   /* metadata stays on one restrained line */
  gap: calc(14px * var(--scale));  /* separate label and amount */
  margin-bottom: calc(8px * var(--scale)); /* air before the name */
}
.stream-notification-label,
.stream-notification-amount {
  color: var(--label-color);       /* family label colour */
  font: 600 calc(20px * var(--type-scale) * var(--scale)) / 1 var(--font-label); /* small but broadcast-safe */
  letter-spacing: var(--label-tracking); /* clean family tracking */
  text-transform: uppercase;       /* metadata convention */
}
.stream-notification-amount::before {
  content: " / ";                  /* typographic separator, not another box */
  color: var(--text-dim);          /* quiet separator */
}
.stream-notification-actor {
  display: block;                  /* main line */
  color: var(--text-color);        /* primary read */
  font-size: calc(44px * var(--type-scale) * var(--scale)); /* calm display size */
  font-weight: var(--display-weight); /* family display weight */
  line-height: 1.06;               /* composed vertical rhythm */
  letter-spacing: var(--display-tracking); /* family display tracking */
}
.stream-notification-message {
  margin-top: calc(7px * var(--scale)); /* measured gap */
  max-width: calc(560px * var(--scale)); /* editorial line length */
  color: var(--text-dim);          /* supportive copy */
  font-size: calc(22px * var(--type-scale) * var(--scale)); /* readable without competing */
  line-height: 1.32;               /* comfortable two-line read */
}`,
  };
}

function sportDesign(_o: ResolvedOptions): StreamNotificationDesign {
  return {
    html: eventMarkup('GG'),
    hasAccent: true,
    css: `/* Gaming event slab: offset avatar badge, clipped label wedge and hard depth. */
.stream-notification-box {
  position: relative;              /* owns the offset badge and wedge */
  display: grid;                   /* badge column plus copy slab */
  grid-template-columns: calc(116px * var(--scale)) minmax(0, auto); /* oversized badge beside copy */
  gap: calc(18px * var(--scale));  /* tight energetic spacing */
  align-items: center;             /* lock the badge to the slab */
  min-width: calc(600px * var(--scale)); /* broad score-card silhouette */
  padding: calc(16px * var(--scale)) calc(28px * var(--scale)) calc(18px * var(--scale)) calc(18px * var(--scale)); /* hard packed padding */
  background: var(--panel-bg);     /* solid competitive panel */
  border-radius: var(--panel-radius); /* sport family edge */
  box-shadow: var(--panel-shadow), var(--panel-keyline); /* sticker-like offset and keyline */
  clip-path: polygon(0 0, 96% 0, 100% 28%, 100% 100%, 4% 100%, 0 72%); /* angular gaming silhouette */
}
.stream-notification-accent {
  position: absolute;              /* diagonal energy stripe */
  right: calc(16px * var(--scale)); /* sit against the cut corner */
  top: 0;                          /* span the panel */
  width: calc(48px * var(--scale)); /* visible wedge */
  height: 100%;                    /* full card height */
  background: var(--accent);       /* saturated team accent */
  opacity: 0.16;                   /* keep text dominant */
  transform: skewX(-12deg);        /* literal sport lean */
}
.stream-notification-avatar {
  width: calc(116px * var(--scale)); /* emblem scale */
  height: calc(116px * var(--scale)); /* emblem scale */
  border: calc(4px * var(--scale)) solid var(--accent); /* badge rim */
  border-radius: 18%;              /* shield-like, not circular */
  background: color-mix(in srgb, var(--accent) 18%, var(--panel-bg)); /* team-tinted well */
  box-shadow: calc(8px * var(--scale)) calc(8px * var(--scale)) 0 color-mix(in srgb, var(--accent) 28%, transparent); /* hard sticker offset */
  transform: rotate(-3deg);        /* independent badge attitude */
}
.stream-notification-glyph {
  color: var(--accent);            /* fallback team mark */
  font: 800 calc(32px * var(--scale)) / 1 var(--font-heading); /* condensed emblem */
  letter-spacing: 0.02em;          /* sport display spacing */
}
.stream-notification-copy {
  min-width: 0;                    /* let the slab wrap */
  transform: skewX(-3deg);         /* text block shares a restrained lean */
}
.stream-notification-meta {
  display: flex;                   /* wedge label and count read together */
  gap: calc(10px * var(--scale));  /* tight scoreboard spacing */
  align-items: center;             /* center chips */
  margin-bottom: calc(6px * var(--scale)); /* separate chips from actor */
}
.stream-notification-label,
.stream-notification-amount {
  display: inline-block;           /* chip geometry */
  padding: calc(5px * var(--scale)) calc(10px * var(--scale)); /* strong label block */
  color: var(--accent-ink);        /* readable on accent */
  background: var(--accent);       /* filled sport chip */
  font-size: calc(20px * var(--type-scale) * var(--scale)); /* broadcast-safe chip text */
  font-weight: 800;                /* shouted metadata */
  line-height: 1;                  /* dense chip */
  letter-spacing: var(--label-tracking); /* sport tracking */
  text-transform: uppercase;       /* competition language */
}
.stream-notification-amount {
  color: var(--text-color);        /* secondary chip reverses */
  background: color-mix(in srgb, var(--text-color) 12%, transparent); /* quiet counter block */
}
.stream-notification-actor {
  display: block;                  /* main score-card line */
  color: var(--text-color);        /* strongest read */
  font-size: calc(52px * var(--type-scale) * var(--scale)); /* loud gamer name */
  font-weight: 800;                /* competitive display */
  line-height: 0.96;               /* compressed slab */
  letter-spacing: 0.015em;         /* open condensed capitals */
  text-transform: uppercase;       /* gamer-tag impact */
}
.stream-notification-message {
  margin-top: calc(8px * var(--scale)); /* separate message from actor */
  color: var(--text-dim);          /* secondary copy */
  font-size: calc(23px * var(--type-scale) * var(--scale)); /* readable supporting line */
  font-weight: 600;                /* survive busy stream footage */
  line-height: 1.22;               /* compact card rhythm */
}`,
  };
}

function glassDesign(_o: ResolvedOptions): StreamNotificationDesign {
  return {
    html: eventMarkup('◇'),
    hasAccent: true,
    css: `/* Glass bloom: floating circular portrait, layered translucent card and pill metadata. */
.stream-notification-box {
  position: relative;              /* owns the floating portrait halo */
  display: grid;                   /* portrait overlaps the glass copy panel */
  grid-template-columns: calc(126px * var(--scale)) minmax(0, auto); /* halo plus text */
  gap: calc(10px * var(--scale));  /* overlap reads as one object */
  align-items: center;             /* vertically center the halo */
  min-width: calc(570px * var(--scale)); /* preserve the elegant card proportion */
  padding: calc(18px * var(--scale)) calc(30px * var(--scale)) calc(18px * var(--scale)) calc(16px * var(--scale)); /* soft asymmetrical padding */
  background: linear-gradient(135deg, color-mix(in srgb, var(--panel-bg) 94%, white 6%), color-mix(in srgb, var(--panel-bg) 82%, transparent)); /* layered glass surface */
  border-radius: var(--panel-radius); /* glass family roundness */
  box-shadow: var(--panel-shadow), var(--panel-keyline); /* floating lift and rim */
  backdrop-filter: var(--panel-blur); /* frosted broadcast layer */
}
.stream-notification-accent {
  position: absolute;              /* luminous bottom edge */
  left: calc(142px * var(--scale)); /* begin after the portrait */
  right: calc(34px * var(--scale)); /* taper before the far corner */
  bottom: 0;                       /* sit on the card edge */
  height: var(--accent-weight);    /* family accent weight */
  background: linear-gradient(90deg, var(--accent), transparent); /* fading light edge */
  box-shadow: var(--accent-glow);  /* glow stays on the accent */
}
.stream-notification-avatar {
  width: calc(126px * var(--scale)); /* generous portrait */
  height: calc(126px * var(--scale)); /* circular portrait */
  margin-left: calc(-8px * var(--scale)); /* float beyond the glass edge */
  border: 1px solid color-mix(in srgb, white 42%, transparent); /* glass rim */
  border-radius: 50%;              /* halo portrait */
  background: radial-gradient(circle at 32% 28%, color-mix(in srgb, white 18%, transparent), color-mix(in srgb, var(--accent) 12%, transparent)); /* luminous fallback */
  box-shadow: 0 0 0 calc(8px * var(--scale)) color-mix(in srgb, var(--accent) 8%, transparent), inset 0 0 calc(22px * var(--scale)) color-mix(in srgb, white 10%, transparent); /* halo plus inner sheen */
}
.stream-notification-glyph {
  color: var(--accent);            /* gem fallback */
  font-size: calc(48px * var(--scale)); /* elegant central mark */
  font-weight: 400;                /* light glass character */
}
.stream-notification-copy {
  min-width: 0;                    /* let copy wrap inside the glass */
  padding-left: calc(10px * var(--scale)); /* air after the halo */
}
.stream-notification-meta {
  display: flex;                   /* two floating pills */
  gap: calc(8px * var(--scale));   /* narrow pill spacing */
  align-items: center;             /* align pill centers */
  margin-bottom: calc(7px * var(--scale)); /* separate pills from actor */
}
.stream-notification-label,
.stream-notification-amount {
  display: inline-block;           /* pill geometry */
  padding: calc(5px * var(--scale)) calc(11px * var(--scale)); /* soft capsule */
  border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent); /* translucent rim */
  border-radius: 999px;            /* glass pill */
  color: var(--label-color);       /* family label colour */
  background: color-mix(in srgb, var(--accent) 10%, transparent); /* tinted glass */
  font: 600 calc(20px * var(--type-scale) * var(--scale)) / 1 var(--font-label); /* compact pill face */
  letter-spacing: var(--label-tracking); /* family label tracking */
  text-transform: uppercase;       /* metadata convention */
}
.stream-notification-amount {
  border-color: color-mix(in srgb, white 18%, transparent); /* quieter secondary rim */
  color: var(--text-dim);          /* amount remains secondary */
  background: color-mix(in srgb, white 6%, transparent); /* neutral glass pill */
}
.stream-notification-actor {
  display: block;                  /* main line */
  color: var(--text-color);        /* primary read */
  font-size: calc(46px * var(--type-scale) * var(--scale)); /* elegant display scale */
  font-weight: var(--display-weight); /* glass family display weight */
  line-height: 1.04;               /* calm but compact */
  letter-spacing: var(--display-tracking); /* family display tracking */
}
.stream-notification-message {
  margin-top: calc(7px * var(--scale)); /* measured space below actor */
  color: var(--text-dim);          /* soft secondary read */
  font-size: calc(23px * var(--type-scale) * var(--scale)); /* comfortable viewer copy */
  line-height: 1.3;                /* polished two-line rhythm */
}`,
  };
}

export const sn01 = defineStreamNotification({
  id: 'sn01',
  // The stage: the width this card holds a full-length event at, so the panel stops
  // re-sizing itself between one notification and the next.
  stageWidth: 890,
  name: 'House Signal',
  description: 'A NoaCG control-room notification with a radar portrait, amber signal rail and compact telemetry hierarchy.',
  styleTag: 'noacg',
  paletteId: 'noacg',
  fontId: 'space-grotesk',
  uicolor: '1',
  animationPresets: ['fade', 'line-reveal', 'mask-wipe', 'slide-up'],
  build: noacgDesign,
});

export const sn02 = defineStreamNotification({
  id: 'sn02',
  // The stage: the width this card holds a full-length event at, so the panel stops
  // re-sizing itself between one notification and the next.
  stageWidth: 800,
  name: 'Quiet Activity',
  description: 'A minimal type-led notification with open space, one hairline and the optional image parked at the far edge.',
  styleTag: 'minimal',
  paletteId: 'ivory',
  fontId: 'inter',
  uicolor: '2',
  animationPresets: ['line-reveal', 'slide-up', 'fade'],
  build: minimalDesign,
});

export const sn03 = defineStreamNotification({
  id: 'sn03',
  // The stage: the width this card holds a full-length event at, so the panel stops
  // re-sizing itself between one notification and the next.
  stageWidth: 890,
  name: 'Arena Event',
  description: 'A sport and gaming event slab with an offset badge, angular silhouette, filled metadata chips and hard depth.',
  styleTag: 'sport',
  paletteId: 'volt',
  fontId: 'oswald',
  uicolor: '3',
  animationPresets: ['snap-stinger', 'slide-right', 'mask-wipe', 'fade'],
  build: sportDesign,
});

export const sn04 = defineStreamNotification({
  id: 'sn04',
  // The stage: the width this card holds a full-length event at, so the panel stops
  // re-sizing itself between one notification and the next.
  stageWidth: 890,
  name: 'Glass Bloom',
  description: 'A floating glass notification with a halo portrait, luminous edge and layered translucent pills.',
  styleTag: 'glass',
  paletteId: 'frost',
  fontId: 'manrope',
  uicolor: '4',
  animationPresets: ['pop-spring', 'blur-in', 'slide-up', 'fade'],
  build: glassDesign,
});

export const STREAM_NOTIFICATIONS: TemplateVariant[] = [sn01, sn02, sn03, sn04];

export function streamNotificationById(id: string): TemplateVariant | undefined {
  return STREAM_NOTIFICATIONS.find((variant) => variant.id === id);
}
