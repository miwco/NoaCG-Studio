// Q&A CARD — the question now, the answer on Continue.
//
// The webinar and conference shape: the moderator puts the question up, the speaker answers it,
// and the answer lands on screen as they finish. That second beat is a REAL step on the default
// path (shared.ts withAnswerStep), which is why a bare `next()` still drives the whole card in
// a playout server that has never heard of a control page.

import { paletteById, type ResolvedOptions, type TemplateVariant } from '../../model/wizard';
import type { StyleTag } from '../../model/fonts';
import { bylineCss, kickerCss, labelFace, panelCss } from './familyCss';
import { defineAudienceVariant, formLines, QA_FORM } from './shared';

const FORM = QA_FORM;
const S = FORM.lines;

function qaHtml(family: StyleTag, o: ResolvedOptions): string {
  const accent =
    family === 'noacg'
      ? `
      <!-- The accent edge — the house amber bar, fused to the panel's left side. -->
      <div class="audience-accent"></div>`
      : '';
  return `    <!-- Q&A card: the label, the question, the answer (on Continue), and the attribution. -->
    <div class="audience-box">${accent}
      <!-- What kind of message this is — an operator FIELD, so a conference, a webinar and a
           podcast can each call it what they call it, in their own language. -->
      <div class="audience-kicker"><span id="f0">${o.lines[0]?.sample ?? S[0].sample}</span></div>
      <!-- The question — slides up from behind this overflow mask on entrance. -->
      <div class="audience-mask"><span class="audience-question" id="f1">${o.lines[1]?.sample ?? S[1].sample}</span></div>
      <!-- The answer — hidden until the Answer step reveals it (SPX Continue). It is a real
           keyframed reveal rather than a scripted one, so snapping straight to the answered
           state shows the answer. -->
      <div class="audience-answer"><span class="audience-answer-text" id="f2">${o.lines[2]?.sample ?? S[2].sample}</span></div>
      <!-- Who asked, and from where. The name may be EMPTY: the runtime then swaps in the
           .audience-anon stand-in rather than leaving a dangling dot. -->
      <div class="audience-by">
        <span class="audience-asker" id="f3">${o.lines[3]?.sample ?? S[3].sample}</span>
        <span class="audience-anon">Anonymous</span>
        <span class="audience-sep"></span>
        <span class="audience-source" id="f4">${o.lines[4]?.sample ?? S[4].sample}</span>
      </div>
    </div>`;
}

/** The answer block — the second beat, and visibly a different voice from the question. */
function answerCss(family: StyleTag): string {
  const rule =
    family === 'sport'
      ? `  border-left: var(--accent-weight) solid var(--accent);  /* a solid accent edge leads the answer */
  padding-left: calc(18px * var(--scale));`
      : family === 'noacg'
        ? `  border-left: calc(3px * var(--scale)) solid var(--accent);  /* a thin amber edge leads the answer */
  padding-left: calc(18px * var(--scale));`
        : family === 'glass'
          ? `  padding: calc(16px * var(--scale)) calc(20px * var(--scale));
  border-radius: calc(12px * var(--scale));  /* a softly-rounded second layer of glass */
  background: rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);  /* a soft keyline */`
          : `  padding-top: calc(16px * var(--scale));
  border-top: 1px solid rgba(255, 255, 255, 0.16);  /* a dim keyline divides question from answer */`;
  return `/* The answer — the card's second beat. It starts hidden: the Answer step is what reveals
   it, and the interpreter pre-hides press-revealed layers from first paint. */
.audience-answer {
  margin-top: calc(18px * var(--scale));  /* clear break from the question */
${rule}
  will-change: transform, opacity; /* the reveal fades and lifts it */
}
.audience-answer-text {
  display: -webkit-box;            /* the clamp below needs the box layout mode… */
  -webkit-box-orient: vertical;    /* …stacking the lines */
  -webkit-line-clamp: 4;           /* a very long answer ends in an ellipsis after four lines */
  line-clamp: 4;                   /* the standard spelling, for browsers that have it */
  overflow: hidden;                /* what the clamp cuts is hidden, ellipsis and all */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* clearly under the question */
  font-weight: 400;                /* the answer is spoken, not shouted */
  line-height: 1.35;               /* an answer is prose — it needs leading */
  color: var(--text-dim);          /* a second voice, quieter than the question */
  overflow-wrap: break-word;       /* break a very long unbroken word */
}`;
}

function questionTypeCss(family: StyleTag): string {
  const size = family === 'sport' ? 32 : 30;
  const caps = family === 'sport' ? '\n  text-transform: uppercase;       /* the sport family shouts */' : '';
  return `/* The question — the loudest thing on the card, and the one piece of text nobody on the
   production controls the length of. */
.audience-question {
  --message-lines: 3;              /* the answer needs room, so the question clamps sooner */
  font-size: calc(${size}px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.25;               /* room between the lines of a wrapped question */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */${caps}
  color: var(--text-color);        /* primary text */
}`;
}

function qaCss(family: StyleTag): string {
  const pad =
    family === 'sport'
      ? 'calc(28px * var(--scale)) calc(46px * var(--scale)) calc(26px * var(--scale)) calc(50px * var(--scale))'
      : family === 'noacg'
        ? 'calc(26px * var(--scale)) calc(40px * var(--scale)) calc(24px * var(--scale)) calc(44px * var(--scale))'
        : 'calc(28px * var(--scale)) calc(38px * var(--scale)) calc(26px * var(--scale))';
  return `${labelFace(family)}${panelCss(family, pad)}

${kickerCss(family)}

${questionTypeCss(family)}

${answerCss(family)}

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
    id: 'qa01',
    name: 'House Q&A',
    family: 'noacg',
    palette: 'noacg',
    fontId: 'space-grotesk',
    uicolor: '4',
    blurb: 'The house Q&A card: a void panel with an amber edge, the question above, the answer revealed on Continue.',
  },
  {
    id: 'qa02',
    name: 'Volt Q&A',
    family: 'sport',
    palette: 'volt',
    fontId: 'oswald',
    uicolor: '5',
    blurb: 'A leaning sport slab: the question in condensed caps, the answer arriving behind a solid accent edge.',
  },
  {
    id: 'qa03',
    name: 'Frost Q&A',
    family: 'glass',
    palette: 'frost',
    fontId: 'manrope',
    uicolor: '3',
    blurb: 'A frosted card: the question above, the answer landing in its own softly-rounded glass block.',
  },
  {
    id: 'qa04',
    name: 'Clean Q&A',
    family: 'minimal',
    palette: 'ivory',
    fontId: 'inter',
    uicolor: '1',
    blurb: 'A quiet card: the question over a dim keyline, with the answer arriving beneath it on Continue.',
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
      defaultZone: 'mid-center',
    },
    { name: spec.name, description: spec.blurb, uicolor: spec.uicolor },
    FORM,
    (o) => ({
      html: qaHtml(spec.family, o),
      css: qaCss(spec.family),
      hasAccent: spec.family === 'noacg',
      ...(spec.family === 'sport' ? { tokens: { displayTracking: '0.01em' } } : {}),
    }),
  ),
);

export const [qa01, qa02, qa03, qa04] = VARIANTS as [
  TemplateVariant,
  TemplateVariant,
  TemplateVariant,
  TemplateVariant,
];
