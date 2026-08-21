// al12 "Quiet Warning" - the cinematic alert and sibling of lt32 "Scrim".
// The alert-level type remains genuine: all four severity words and controls still exist.
// Outside that semantic flag, the family draws only one hairline over a soft scrim.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import {
  ALERT_LEVEL_CSS,
  alertLevelFields,
  alertLevelStackHtml,
  alertLineMasks,
  defineAlertVariant,
} from './shared';

export const al12: TemplateVariant = defineAlertVariant(
  {
    id: 'al12',
    category: 'alert',
    name: 'Quiet Warning',
    styleTag: 'cinematic',
    description: 'Restrained alert on a soft scrim with a genuine severity flag and one hairline.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Headline', sample: 'Strong winds expected along the western coast' },
      { title: 'Detail', sample: 'Conditions deteriorate after 21:00 · Avoid exposed routes' },
      { title: 'Source', sample: 'Coastal Safety Service' },
    ],
    logo: 'none',
    animationPresets: ['fade', 'line-reveal', 'slide-up'],
    defaultPalette: paletteById('noir'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Quiet Warning',
    description:
      'The restrained alert in the lt32 Scrim family: the genuine semantic severity flag sits ' +
      'beside one 1 px hairline and light wide type on an edge-free scrim. The default fade uses sine easing.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Quiet Warning: severity flag, hairline, message and source on a soft scrim. -->
    <div class="alert-box">
${alertLevelStackHtml(o, '      ')}
      <div class="alert-accent"></div>
      <div class="alert-lines">
${alertLineMasks(o)}
      </div>
    </div>`,
    css: `/* The alert scrim - no visible panel edge. */
.alert-box {
  display: flex;                   /* severity, hairline and message */
  align-items: stretch;            /* rule and flag follow the message height */
  width: calc(1520px * var(--scale)); /* broad enough for one-glance reading */
  max-width: none;                 /* deliberate wide alert inside the safe area */
  min-height: calc(170px * var(--scale)); /* alert remains readable at distance */
  padding-right: calc(210px * var(--scale)); /* room for the scrim to dissolve */
  background: linear-gradient(90deg,
              var(--panel-bg) 0%,
              color-mix(in srgb, var(--panel-bg) 68%, transparent) 62%,
              transparent 100%);  /* edge-free separation from the shot */
  border-radius: var(--panel-radius); /* exact cinematic zero */
  filter: drop-shadow(0 calc(2px * var(--scale)) calc(14px * var(--scale)) rgba(0, 0, 0, 0.50));
}

${ALERT_LEVEL_CSS}

/* The semantic severity slab stays compact and square. It is the alert's meaning, not a
   second style accent, so the fixed public-warning colours remain authoritative. */
.alert-flag {
  min-width: calc(220px * var(--scale) * var(--type-scale)); /* fits Emergency */
}
.alert-flag > div {
  padding: 0 calc(18px * var(--scale)); /* keeps the word off the edges */
  font-size: calc(22px * var(--scale) * var(--type-scale)); /* restrained but above floor */
  font-weight: 600;                /* quieter than the standard alert flag */
  letter-spacing: 0.12em;          /* semantic stamp stays compact */
}
.alert-level-1,
.alert-level-2,
.alert-level-3,
.alert-level-4 {
  box-shadow: none;                /* no warning glow in the cinematic family */
}

.alert-accent {
  width: var(--accent-weight);     /* exact cinematic 1 px hairline */
  margin: calc(27px * var(--scale)) calc(31px * var(--scale)); /* air around the rule */
  background: var(--accent);       /* the only family accent element */
  opacity: 0.72;                   /* restrained against the picture */
  flex: none;                      /* never squeezed by long copy */
  transform-origin: center top;    /* rule draws downward */
  will-change: transform;          /* animated by line-reveal */
}

.alert-lines {
  display: flex;                   /* message stack */
  flex-direction: column;          /* headline, action, source */
  justify-content: center;         /* centred against the severity flag */
  min-width: 0;                    /* long copy wraps inside the strip */
  padding: calc(28px * var(--scale)) 0; /* quiet vertical air */
  text-align: left;                /* fixed reading edge */
}

.alert-name {
  font-size: calc(43px * var(--scale) * var(--type-scale)); /* primary warning */
  font-weight: var(--display-weight); /* exact cinematic 400 */
  line-height: 1.18;               /* light type needs air */
  letter-spacing: var(--display-tracking); /* exact +0.06em cinematic opening */
  color: var(--text-color);        /* primary text */
}

.alert-title {
  margin-top: calc(10px * var(--scale)); /* tied to the headline */
  font-size: calc(25px * var(--scale) * var(--type-scale)); /* action/detail line */
  font-weight: 400;                /* regular */
  line-height: 1.35;               /* supports wrapping */
  letter-spacing: 0.03em;          /* restrained openness */
  color: var(--text-color);        /* action is never dimmed */
}

.alert-extra {
  margin-top: calc(15px * var(--scale)); /* source is its own beat */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* broadcast floor */
  font-weight: 500;                /* light but legible */
  line-height: 1.4;                /* wide caps need room */
  letter-spacing: var(--label-tracking); /* exact cinematic 0.34em */
  text-transform: uppercase;       /* source stamp */
  color: var(--label-color);       /* dimmed, never accented */
}`,
    hasLevels: true,
    // The four severity words are operator fields — see alertLevelStackHtml.
    extraFields: alertLevelFields(o),
    hasAccent: true,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 1520,
  }),
);
