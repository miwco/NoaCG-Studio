// CHAT HIGHLIGHT — a comment pulled out of the chat and put on screen.
//
// The livestream shape, and the one that leads with WHO said it: a handle, where they said it,
// then what they said. It is a strap rather than a card — it arrives from the edge, sits over
// the action, and takes ITSELF off after a few seconds unless the operator holds it (the
// machine is in types/audience.ts).
//
// The source is plain text, never a platform logo: this graphic has to be as right for a church
// app or a webinar chat as it is for Twitch, and a baked-in mark would make it wrong for all but
// one of them.

import { paletteById, type ResolvedOptions, type TemplateVariant } from '../../model/wizard';
import type { StyleTag } from '../../model/fonts';
import { bylineCss, labelFace, panelCss } from './familyCss';
import { CHAT_FORM, defineAudienceVariant, formLines } from './shared';

const FORM = CHAT_FORM;
const S = FORM.lines;

function chatHtml(family: StyleTag, o: ResolvedOptions): string {
  const accent =
    family === 'noacg'
      ? `
      <!-- The accent edge — the house amber bar, fused to the strap's left side. -->
      <div class="audience-accent"></div>`
      : '';
  return `    <!-- Chat highlight: who said it and where, then what they said. -->
    <div class="audience-box">${accent}
      <!-- The attribution leads here, not trails: a chat highlight is somebody speaking, and
           the viewer needs the name before the words. An EMPTY handle swaps in the
           .audience-anon stand-in rather than leaving a dangling dot. -->
      <div class="audience-by">
        <span class="audience-asker" id="f0">${o.lines[0]?.sample ?? S[0].sample}</span>
        <span class="audience-anon">Anonymous</span>
        <span class="audience-sep"></span>
        <span class="audience-source" id="f1">${o.lines[1]?.sample ?? S[1].sample}</span>
      </div>
      <!-- The comment — slides up from behind this overflow mask on entrance, and clamps to
           --message-lines if somebody wrote a paragraph into chat. -->
      <div class="audience-mask"><span class="audience-question" id="f2">${o.lines[2]?.sample ?? S[2].sample}</span></div>
    </div>`;
}

function chatCss(family: StyleTag): string {
  const pad =
    family === 'sport'
      ? 'calc(20px * var(--scale)) calc(38px * var(--scale)) calc(20px * var(--scale)) calc(42px * var(--scale))'
      : family === 'noacg'
        ? 'calc(18px * var(--scale)) calc(32px * var(--scale)) calc(18px * var(--scale)) calc(36px * var(--scale))'
        : 'calc(20px * var(--scale)) calc(30px * var(--scale))';
  const size = family === 'sport' ? 26 : 25;
  const caps = family === 'sport' ? '\n  text-transform: uppercase;       /* the sport family shouts */' : '';
  return `${labelFace(family)}${panelCss(family, pad)}

/* The comment — a strap carries less text than a card, so it clamps sooner and sits smaller. */
.audience-question {
  --message-lines: 2;              /* two lines is a strap; more is a card */
  font-size: calc(${size}px * var(--scale) * var(--type-scale));
  font-weight: ${family === 'sport' ? 'var(--display-weight)' : '500'};
  line-height: 1.3;                /* room between the two lines */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */${caps}
  color: var(--text-color);        /* primary text */
}

${bylineCss(family)}

/* The attribution LEADS on this graphic, so it sits above the comment rather than below it. */
.audience-by {
  margin-top: 0;                   /* it is the first thing on the strap */
  margin-bottom: calc(8px * var(--scale));  /* air between the name and what they said */
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
    id: 'ch01',
    name: 'House Comment',
    family: 'noacg',
    palette: 'noacg',
    fontId: 'space-grotesk',
    uicolor: '4',
    blurb: 'The house chat strap: a void panel with an amber edge, the handle and source above the comment.',
  },
  {
    id: 'ch02',
    name: 'Volt Comment',
    family: 'sport',
    palette: 'volt',
    fontId: 'oswald',
    uicolor: '5',
    blurb: 'A leaning sport strap: the handle and source in caps above the comment, with an accent edge.',
  },
  {
    id: 'ch03',
    name: 'Frost Comment',
    family: 'glass',
    palette: 'frost',
    fontId: 'manrope',
    uicolor: '3',
    blurb: 'A frosted chat strap: the handle and source above a soft, readable comment.',
  },
  {
    id: 'ch04',
    name: 'Clean Comment',
    family: 'minimal',
    palette: 'ivory',
    fontId: 'inter',
    uicolor: '1',
    blurb: 'A quiet chat strap: the handle and source in a hairline byline above the comment.',
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
      // A strap arrives from the edge; the rise reads as a card and is offered second.
      animationPresets: ['audience-slide', 'audience-rise'],
      defaultPalette: paletteById(spec.palette),
      defaultFontId: spec.fontId,
      defaultZone: 'bottom-left',
    },
    { name: spec.name, description: spec.blurb, uicolor: spec.uicolor },
    FORM,
    (o) => ({
      html: chatHtml(spec.family, o),
      css: chatCss(spec.family),
      hasAccent: spec.family === 'noacg',
      ...(spec.family === 'sport' ? { tokens: { displayTracking: '0.01em' } } : {}),
    }),
  ),
);

export const [ch01, ch02, ch03, ch04] = VARIANTS as [
  TemplateVariant,
  TemplateVariant,
  TemplateVariant,
  TemplateVariant,
];
