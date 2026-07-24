// COMMUNITY REQUEST — a prayer or community request, with who sent it and from where.
//
// The church and community-broadcast shape. It looks like the viewer-question card and is NOT
// the same graphic: a request is not a question, it carries a place rather than a platform, and
// it wants a quieter voice than a talk show's. Its own type exists for that reason — the fields
// mean different things, and the control page has to say so.
//
// The four designs are the four style families, so a service's request card is the sibling of
// its lower third. The sport family is included with a lighter hand than usual: churches and
// community stations run bold, high-contrast looks too, and leaving the cell empty would have
// meant a bold-brand show could not have this graphic at all.

import { paletteById, type ResolvedOptions, type TemplateVariant } from '../../model/wizard';
import type { StyleTag } from '../../model/fonts';
import { bylineCss, kickerCss, labelFace, panelCss } from './familyCss';
import { defineAudienceVariant, formLines, REQUEST_FORM } from './shared';

const FORM = REQUEST_FORM;
const S = FORM.lines;

function requestHtml(family: StyleTag, o: ResolvedOptions): string {
  const accent =
    family === 'noacg'
      ? `
      <!-- The accent edge — the house amber bar, fused to the panel's left side. -->
      <div class="audience-accent"></div>`
      : '';
  return `    <!-- Community request: the label, the request, and who sent it. -->
    <div class="audience-box">${accent}
      <!-- What kind of request this is — an operator FIELD, so a congregation can say "PRAYER
           REQUEST", "THANKSGIVING" or "PRAYER FOR THE WEEK" in its own words and language. -->
      <div class="audience-kicker"><span id="f0">${o.lines[0]?.sample ?? S[0].sample}</span></div>
      <!-- The request — slides up from behind this overflow mask on entrance, and clamps to
           --message-lines if somebody wrote at length. -->
      <div class="audience-mask"><span class="audience-question" id="f1">${o.lines[1]?.sample ?? S[1].sample}</span></div>
      <!-- Who sent it, and where from. Requests are often sent WITHOUT a name — the runtime
           swaps in the .audience-anon stand-in, which is why that element exists. -->
      <div class="audience-by">
        <span class="audience-asker" id="f2">${o.lines[2]?.sample ?? S[2].sample}</span>
        <span class="audience-anon">Anonymous</span>
        <span class="audience-sep"></span>
        <span class="audience-source" id="f3">${o.lines[3]?.sample ?? S[3].sample}</span>
      </div>
    </div>`;
}

/** The request's own type. Quieter and more generously led than a question card: this text is
 *  read slowly, often aloud, and sometimes by a congregation rather than a presenter. */
function requestTypeCss(family: StyleTag): string {
  const size = family === 'sport' ? 30 : 28;
  return `/* The request — read slowly, often aloud. Lighter and more generously led than a talk
   show's question, and clamped so a long request cannot grow the card off the frame. */
.audience-question {
  --message-lines: 4;              /* a very long request ends in an ellipsis after four lines */
  font-size: calc(${size}px * var(--scale) * var(--type-scale));
  font-weight: ${family === 'sport' ? 'var(--display-weight)' : '400'};
  line-height: 1.4;                /* generous leading — this is prose, not a headline */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text */
}`;
}

function requestCss(family: StyleTag): string {
  const pad =
    family === 'sport'
      ? 'calc(26px * var(--scale)) calc(44px * var(--scale)) calc(24px * var(--scale)) calc(48px * var(--scale))'
      : family === 'noacg'
        ? 'calc(24px * var(--scale)) calc(38px * var(--scale)) calc(22px * var(--scale)) calc(42px * var(--scale))'
        : 'calc(28px * var(--scale)) calc(36px * var(--scale)) calc(26px * var(--scale))';
  return `${labelFace(family)}${panelCss(family, pad)}

${kickerCss(family)}

${requestTypeCss(family)}

${bylineCss(family)}

/* The place, not a platform. A request comes from a person somewhere, so this line reads as a
   quiet location rather than as the loud source chip a chat highlight carries. */
.audience-source {
  text-transform: none;            /* a place name is not a broadcast source label */
  letter-spacing: 0;               /* …so it does not take the label tracking either */
  font-weight: 500;                /* and sits at a reading weight */
  color: var(--text-dim);          /* quieter than the name it follows */
}`;
}

interface Spec {
  id: string;
  name: string;
  family: StyleTag;
  palette: string;
  fontId: string;
  uicolor: string;
  blurb: string;
}

const SPECS: Spec[] = [
  {
    id: 'rq01',
    name: 'House Request',
    family: 'noacg',
    palette: 'noacg',
    fontId: 'space-grotesk',
    uicolor: '4',
    blurb: 'The house request card: a void panel with an amber edge, the request, and who sent it.',
  },
  {
    id: 'rq02',
    name: 'Volt Request',
    family: 'sport',
    palette: 'volt',
    fontId: 'oswald',
    uicolor: '5',
    blurb: 'A bold leaning request card for high-contrast community brands, with an accent label and edge.',
  },
  {
    id: 'rq03',
    name: 'Frost Request',
    family: 'glass',
    palette: 'frost',
    fontId: 'manrope',
    uicolor: '3',
    blurb: 'A frosted request card: a soft pill label over a generously led request, with the sender beneath.',
  },
  {
    id: 'rq04',
    name: 'Clean Request',
    family: 'minimal',
    palette: 'ivory',
    fontId: 'inter',
    uicolor: '1',
    blurb: 'A quiet request card: a small accent label, a calmly led request, and the sender and place beneath.',
  },
];

const VARIANTS = SPECS.map((spec) =>
  defineAudienceVariant(
    {
      id: spec.id,
      category: 'audience',
      name: spec.name,
      styleTag: spec.family,
      description: spec.blurb,
      maxLines: FORM.lines.length,
      suggestedLines: formLines(FORM),
      logo: 'none',
      animationPresets: ['audience-rise', 'audience-slide'],
      defaultPalette: paletteById(spec.palette),
      defaultFontId: spec.fontId,
      defaultZone: 'bottom-left',
    },
    { name: spec.name, description: spec.blurb, uicolor: spec.uicolor },
    FORM,
    (o) => ({
      html: requestHtml(spec.family, o),
      css: requestCss(spec.family),
      hasAccent: spec.family === 'noacg',
      ...(spec.family === 'sport' ? { tokens: { displayTracking: '0.01em' } } : {}),
    }),
  ),
);

export const [rq01, rq02, rq03, rq04] = VARIANTS as [
  TemplateVariant,
  TemplateVariant,
  TemplateVariant,
  TemplateVariant,
];
