// QUESTION QUEUE — the moderator's running order, with one question live.
//
// Conference and webinar Q&A tools give a moderator a sorted list and a "we are on this one"
// marker; this is that list, on air. It is also the general-purpose PUBLIC-COMMENT queue: a
// council meeting's speaker list, a church's request wall, a phone-in's caller queue. Nothing
// in it is platform-specific, and every row is typed by hand into one textarea.
//
// WHICH question is live is an INDEX, held as runtime data (audienceRuntime.ts). A twelve-row
// queue therefore has exactly the same two states as a two-row one — the model's "parameterize
// with data, not states" rule, at the place it would be most tempting to break.

import { paletteById, type ResolvedOptions, type TemplateVariant } from '../../model/wizard';
import type { StyleTag } from '../../model/fonts';
import { kickerCss, labelFace, panelCss } from './familyCss';
import { defineAudienceVariant, formLines, QUEUE_FORM } from './shared';

const FORM = QUEUE_FORM;
const S = FORM.lines;

function queueHtml(family: StyleTag, o: ResolvedOptions): string {
  const accent =
    family === 'noacg'
      ? `
      <!-- The accent edge — the house amber bar, fused to the panel's left side. -->
      <div class="audience-accent"></div>`
      : '';
  return `    <!-- Question queue: the heading, the rows, and the position readout. -->
    <div class="audience-box">${accent}
      <!-- The heading — an operator FIELD, so a conference, a council meeting and a church can
           each call this list what they call it, in their own language. -->
      <div class="audience-kicker"><span id="f1">${o.lines[1]?.sample ?? S[1].sample}</span></div>
      <!-- The rows — rendered by audienceQueueRebuild() from the hidden source below the box.
           One row per line the moderator typed; the live one carries .audience-queue-live. -->
      <div id="audience-queue"></div>
      <!-- The position readout. The two numbers are written by the runtime; the word between
           them stays here in the markup so it can be translated like any other text. -->
      <div class="audience-queue-count">
        <span class="audience-queue-at">1</span>
        <span class="audience-queue-word">of</span>
        <span class="audience-queue-of">4</span>
      </div>
    </div>`;
}

/** The rows, the live marker, and the readout — the queue's own block. */
function queueCss(family: StyleTag): string {
  const liveMark =
    family === 'sport'
      ? `.audience-queue-live::before {
  content: '';                     /* painted layer — safe from every tween */
  position: absolute;              /* pinned to the row's leading edge */
  left: 0;                         /* the gutter the row's own padding-left leaves for it */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: calc(8px * var(--scale));
  background: var(--accent);       /* a solid accent edge on the live row */
}`
      : family === 'noacg'
        ? `.audience-queue-live::before {
  content: '';                     /* painted layer — safe from every tween */
  position: absolute;              /* pinned to the row's leading edge */
  left: 0;                         /* the gutter the row's own padding-left leaves for it */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: calc(5px * var(--scale));
  background: var(--accent);       /* a solid amber edge on the live row */
  box-shadow: var(--accent-glow);  /* the family's glow — follows the accent color */
}`
        : `.audience-queue-live::before {
  content: '';                     /* painted layer — safe from every tween */
  position: absolute;              /* pinned to the row's leading edge */
  left: 0;                         /* the gutter the row's own padding-left leaves for it */
  top: calc(8px * var(--scale));   /* a dot, centred on the first line of the row */
  width: calc(10px * var(--scale));
  height: calc(10px * var(--scale));
  border-radius: 50%;              /* a round marker — the quieter families mark with a dot */
  background: var(--accent);       /* the card's one accent dose */
}`;
  return `/* The queue — one row per question the moderator typed. The rows read left whatever edge
   the card is anchored to; that rule is the category's, in shared.ts. */
#audience-queue {
  margin-top: calc(5px * var(--scale));  /* the heading already carries its own air */
  display: flex;                   /* a simple vertical stack… */
  flex-direction: column;          /* …one row per question */
  gap: calc(15px * var(--scale));  /* even air between the rows */
  will-change: transform, opacity; /* the list arrives as one block */
}

/* One queued question — its text, then who asked and from where. */
.audience-queue-row {
  position: relative;              /* anchors the live marker (::before) */
  padding-left: calc(20px * var(--scale));  /* the gutter the live marker sits in */
  opacity: 0.62;                   /* waiting rows sit back; the live one comes forward */
}
.audience-queue-text {
  display: -webkit-box;            /* the clamp below needs the box layout mode… */
  -webkit-box-orient: vertical;    /* …stacking the lines */
  -webkit-line-clamp: 2;           /* a long question ends in an ellipsis after two lines */
  line-clamp: 2;                   /* the standard spelling, for browsers that have it */
  overflow: hidden;                /* what the clamp cuts is hidden, ellipsis and all */
  font-size: calc(25px * var(--scale) * var(--type-scale));  /* list scale */
  font-weight: ${family === 'sport' ? '700' : '500'};
  line-height: 1.25;               /* room between the two lines */
  color: var(--text-color);        /* primary text */
  overflow-wrap: break-word;       /* break a very long unbroken word */
}

/* The row's own attribution — quieter than the question, and gone entirely when the moderator
   pasted a bare list with no names in it. */
.audience-queue-meta {
  margin-top: calc(4px * var(--scale));
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 600;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* a broadcast source line is caps */
  color: var(--text-dim);          /* the quietest text in the row */
}
.audience-queue-meta:empty { display: none; }  /* no name and no source: no line at all */

/* The LIVE row — the one being answered right now. */
.audience-queue-live {
  opacity: 1;                      /* it comes forward from the waiting rows */
}
.audience-queue-live .audience-queue-text {
  color: var(--text-color);        /* full-strength text */
  font-weight: ${family === 'sport' ? '700' : '600'};  /* and a step up in weight */
}
${liveMark}

/* Rows ALREADY answered — a moderator reads this list as a running order, so the ones behind
   the live row have to look done rather than merely un-highlighted. */
.audience-queue-done .audience-queue-text {
  opacity: 0.55;                   /* fainter than waiting */
  text-decoration: line-through;   /* and struck through: answered, not skipped */
}

/* The position readout — "3 of 12", under the list. */
.audience-queue-count {
  margin-top: calc(20px * var(--scale));  /* air under the list */
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 700;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* a broadcast readout is caps */
  color: var(--text-dim);          /* it is a note, not a headline */
}
.audience-queue-at {
  color: var(--accent);            /* the live number wears the accent */
}`;
}

function css(family: StyleTag): string {
  const pad =
    family === 'sport'
      ? 'calc(30px * var(--scale)) calc(50px * var(--scale)) calc(28px * var(--scale)) calc(55px * var(--scale))'
      : family === 'noacg'
        ? 'calc(28px * var(--scale)) calc(43px * var(--scale)) calc(25px * var(--scale)) calc(48px * var(--scale))'
        : 'calc(30px * var(--scale)) calc(40px * var(--scale)) calc(28px * var(--scale))';
  return `${labelFace(family)}${panelCss(family, pad)}

${kickerCss(family)}

${queueCss(family)}`;
}

/** One row's markup — design-owned, like a ticker's item builder. */
const ROW_BUILDER_JS = `// renderQueueRow(entry, index): one queued question — its text, then who asked and where
// from. A missing name or source simply contributes nothing: .audience-queue-meta:empty is
// hidden, so a bare list of questions renders as a bare list rather than as rows of dots.
function renderQueueRow(entry, index) {
  var meta = '';
  if (entry.asker) meta += escapeHtml(entry.asker);
  if (entry.asker && entry.source) meta += ' \\u00B7 ';
  if (entry.source) meta += escapeHtml(entry.source);
  return '<div class="audience-queue-row">'
       +   '<div class="audience-queue-text">' + escapeHtml(entry.question) + '</div>'
       +   '<div class="audience-queue-meta">' + meta + '</div>'
       + '</div>';
}`;

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
    id: 'qq01',
    name: 'House Queue',
    family: 'noacg',
    palette: 'noacg',
    fontId: 'space-grotesk',
    uicolor: '4',
    blurb: 'The house question queue: a void panel with an amber edge marking the question being answered now.',
  },
  {
    id: 'qq02',
    name: 'Volt Queue',
    family: 'sport',
    palette: 'volt',
    fontId: 'oswald',
    uicolor: '5',
    blurb: 'A leaning sport running order: condensed caps questions with a solid accent edge on the live one.',
  },
  {
    id: 'qq03',
    name: 'Frost Queue',
    family: 'glass',
    palette: 'frost',
    fontId: 'manrope',
    uicolor: '3',
    blurb: 'A frosted question queue: soft rows with an accent dot against the one being answered.',
  },
  {
    id: 'qq04',
    name: 'Clean Queue',
    family: 'minimal',
    palette: 'ivory',
    fontId: 'inter',
    uicolor: '1',
    blurb: 'A quiet question queue: hairline-quiet rows with an accent dot against the live one.',
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
      defaultZone: 'mid-right',
    },
    { name: spec.name, description: spec.blurb, uicolor: spec.uicolor },
    FORM,
    (o) => ({
      html: queueHtml(spec.family, o),
      css: css(spec.family),
      rowBuilderJs: ROW_BUILDER_JS,
      hasAccent: spec.family === 'noacg',
      ...(spec.family === 'sport' ? { tokens: { displayTracking: '0.01em' } } : {}),
    }),
  ),
);

export const [qq01, qq02, qq03, qq04] = VARIANTS as [
  TemplateVariant,
  TemplateVariant,
  TemplateVariant,
  TemplateVariant,
];
