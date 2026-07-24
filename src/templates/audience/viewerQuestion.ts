// VIEWER QUESTION — one question on screen, with who asked it and where it came from.
//
// The workhorse of audience interaction: a talk show reading a viewer's question, a webinar
// putting an attendee's on the speaker's screen, a livestream pulling one out of chat. Four
// designs, one per style family, so a show's question card is the sibling of its lower third.
//
// The four live in one file rather than four, and that is deliberate for this category: they
// are the same object in four skins, and having them side by side is what makes a difference
// between them reviewable. The blocks they share come from familyCss.ts (see its header).

import { paletteById, type ResolvedOptions, type TemplateVariant } from '../../model/wizard';
import type { StyleTag } from '../../model/fonts';
import { bylineCss, kickerCss, labelFace, panelCss } from './familyCss';
import { defineAudienceVariant, formLines, QUESTION_FORM } from './shared';

const FORM = QUESTION_FORM;
const S = FORM.lines;

/** The markup, identical across the four apart from the families that draw an accent bar. */
function questionHtml(family: StyleTag, o: ResolvedOptions): string {
  const accent =
    family === 'noacg'
      ? `
      <!-- The accent edge — the house amber bar, fused to the panel's left side. -->
      <div class="audience-accent"></div>`
      : '';
  return `    <!-- Viewer question: the label, the question, and the attribution line. -->
    <div class="audience-box">${accent}
      <!-- What kind of message this is — an operator FIELD, so a church, a webinar and a talk
           show can each call it what they call it, in their own language. -->
      <div class="audience-kicker"><span id="f0">${o.lines[0]?.sample ?? S[0].sample}</span></div>
      <!-- The question — slides up from behind this overflow mask on entrance, and clamps to
           --message-lines if the viewer wrote an essay. -->
      <div class="audience-mask"><span class="audience-question" id="f1">${o.lines[1]?.sample ?? S[1].sample}</span></div>
      <!-- Who sent it, and from where. The name may be EMPTY: the runtime then swaps in the
           .audience-anon stand-in rather than leaving a dangling dot. -->
      <div class="audience-by">
        <span class="audience-asker" id="f2">${o.lines[2]?.sample ?? S[2].sample}</span>
        <span class="audience-anon">Anonymous</span>
        <span class="audience-sep"></span>
        <span class="audience-source" id="f3">${o.lines[3]?.sample ?? S[3].sample}</span>
      </div>
    </div>`;
}

/** The question's own type, per family — the one block each design does not share. */
function questionTypeCss(family: StyleTag): string {
  const size = family === 'sport' ? 34 : family === 'noacg' ? 33 : 32;
  const caps = family === 'sport' ? '\n  text-transform: uppercase;       /* the sport family shouts */' : '';
  const quote =
    family === 'minimal' || family === 'glass'
      ? `

/* The quote mark — a large accent glyph hung above the question. The quieter families mark a
   quotation with type rather than with a coloured bar. */
.audience-box::before {
  content: '\\201C';                /* a left double quotation mark */
  display: block;                  /* on its own line, above the question */
  margin-bottom: calc(-14px * var(--scale));  /* pulled tight against the text below it */
  font-size: calc(52px * var(--scale) * var(--type-scale));
  line-height: 1;                  /* the glyph's own box, nothing more */
  color: var(--accent);            /* the card's one accent dose */
}`
      : '';
  return `/* The question — the loudest thing on the card, and the one piece of text nobody on the
   production controls the length of. */
.audience-question {
  --message-lines: 4;              /* a very long question ends in an ellipsis after four lines */
  font-size: calc(${size}px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.25;               /* room between the lines of a wrapped question */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */${caps}
  color: var(--text-color);        /* primary text */
}${quote}`;
}

function questionCss(family: StyleTag): string {
  const pad =
    family === 'sport'
      ? 'calc(26px * var(--scale)) calc(44px * var(--scale)) calc(24px * var(--scale)) calc(48px * var(--scale))'
      : family === 'noacg'
        ? 'calc(24px * var(--scale)) calc(38px * var(--scale)) calc(22px * var(--scale)) calc(42px * var(--scale))'
        : 'calc(26px * var(--scale)) calc(36px * var(--scale)) calc(24px * var(--scale))';
  return `${labelFace(family)}${panelCss(family, pad)}

${kickerCss(family)}

${questionTypeCss(family)}

${bylineCss(family)}`;
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
    id: 'aq01',
    name: 'House Question',
    family: 'noacg',
    palette: 'noacg',
    fontId: 'space-grotesk',
    uicolor: '4',
    blurb: 'The house viewer-question card: a void panel with an amber edge, a mono label, and the asker under the question.',
  },
  {
    id: 'aq02',
    name: 'Volt Question',
    family: 'sport',
    palette: 'volt',
    fontId: 'oswald',
    uicolor: '5',
    blurb: 'A leaning sport slab: a filled accent label over the question in condensed caps, with the asker beneath.',
  },
  {
    id: 'aq03',
    name: 'Frost Question',
    family: 'glass',
    palette: 'frost',
    fontId: 'manrope',
    uicolor: '3',
    blurb: 'A frosted card with a soft pill label, a hanging quote mark, and the asker under the question.',
  },
  {
    id: 'aq04',
    name: 'Clean Question',
    family: 'minimal',
    palette: 'ivory',
    fontId: 'inter',
    uicolor: '1',
    blurb: 'A quiet card: a small accent label, a hanging quote mark, and the asker in a hairline-quiet byline.',
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
      html: questionHtml(spec.family, o),
      css: questionCss(spec.family),
      hasAccent: spec.family === 'noacg',
      ...(spec.family === 'sport' ? { tokens: { displayTracking: '0.01em' } } : {}),
    }),
  ),
);

export const [aq01, aq02, aq03, aq04] = VARIANTS as [
  TemplateVariant,
  TemplateVariant,
  TemplateVariant,
  TemplateVariant,
];
