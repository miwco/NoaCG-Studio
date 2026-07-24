// The audience category's SHARED CSS, per style family.
//
// Every graphic in this category is the same object seen from a different angle: a panel, a
// kicker, a piece of audience text, and an attribution line saying who sent it and where from.
// Twenty designs restating the same four blocks by hand would guarantee they drift apart — and
// DESIGN_LANGUAGE §8's rule for exactly this is "reuse the exact token values, don't improvise
// new ones per category". So the blocks are written ONCE here, per family, and each design
// composes them and adds only what makes it that graphic.
//
// This is a source-level factoring, not a runtime one: the emitted stylesheet is the same rich,
// commented CSS the rest of the catalog ships, and the user can edit every line of it. What is
// shared is the AUTHORING, so a fix to the byline lands in all twenty designs at once.

import { fontById, labelFontFaceCss } from '../../model/fonts';
import type { StyleTag } from '../../model/fonts';

/** The house family's second typeface. Only noacg carries one (model/themeTokens.ts). */
export function labelFace(family: StyleTag): string {
  return family === 'noacg' ? `${labelFontFaceCss(fontById('jetbrains-mono'))}\n\n` : '';
}

/**
 * The PANEL — the surface every audience graphic sits on. Each family's own treatment, drawn
 * with the shape tokens rather than with numbers typed out per design.
 *
 * The sport family paints its slab on a ::before layer, because the -8deg lean has to survive
 * every preset tween of `.audience-box` (the same doctrine as lt05 and qz01).
 */
export function panelCss(family: StyleTag, pad: string): string {
  if (family === 'sport') {
    return `/* The slab: the preset tweens THIS element (y + opacity), so it carries no lean of its
   own — the panel and the accent edge are painted on pseudo-layers below. */
.audience-box {
  position: relative;              /* anchors the painted slab (::before) and edge (::after) */
  padding: ${pad};
}

/* The painted slab: the sport lean lives HERE, on a background layer no preset ever tweens. */
.audience-box::before {
  content: '';                     /* pseudo-elements render only with content set */
  position: absolute;              /* fills the box exactly… */
  inset: 0;                        /* …edge to edge */
  z-index: -1;                     /* paints behind everything on the slab */
  background: var(--panel-bg);     /* near-black slab */
  border-radius: var(--panel-radius);  /* the family's panel corner radius */
  box-shadow: var(--panel-shadow); /* the family's hard offset shadow */
  transform: skewX(-8deg);         /* SKEW: the whole card leans forward */
}

/* The accent edge: a chunky slab fused to the card's leaning left side. */
.audience-box::after {
  content: '';                     /* second painted layer on the same box */
  position: absolute;              /* pinned over the slab's left edge… */
  left: 0;                         /* …flush with the box's left side */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  z-index: -1;                     /* behind the text, above ::before (later layer wins) */
  width: var(--accent-weight);     /* the family's accent edge weight */
  background: var(--accent);       /* the family's loud color moment */
  transform: skewX(-8deg);         /* leans with the slab so the two fuse into one shape */
}`;
  }
  if (family === 'noacg') {
    return `/* The card — the house void panel; presets tween this element (y + opacity). */
.audience-box {
  position: relative;              /* anchors the accent edge */
  padding: ${pad};
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
  border-top: calc(2px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);  /* the house strip's amber top edge */
}

/* The accent edge — the house amber bar, fused to the card's left side with the house glow. */
.audience-accent {
  position: absolute;              /* pinned over the card's left edge */
  left: 0;                         /* flush with the box's left side */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);       /* the one accent surface */
  box-shadow: var(--accent-glow);  /* the family's glow — follows the accent color */
}`;
  }
  if (family === 'glass') {
    return `/* The card — the frosted glass panel; presets tween this element (y + opacity). */
.audience-box {
  position: relative;              /* anchors anything a design pins to the card */
  padding: ${pad};
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}`;
  }
  return `/* The card — restrained and near-black, the minimal family's quiet slab. */
.audience-box {
  position: relative;              /* anchors anything a design pins to the card */
  padding: ${pad};
  background: var(--panel-bg);     /* the palette's near-black panel — retints via the :root contract */
  border-radius: var(--panel-radius);  /* the family's near-square radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the authored edge and family lift */
}`;
}

/**
 * The KICKER — the small caps label that says what kind of graphic this is ("VIEWER QUESTION",
 * "PRAYER REQUEST", "AUDIENCE Q&A"). It is an operator FIELD, never baked-in copy: the same
 * card serves a church, a webinar and a talk show, and it has to be able to say so in their
 * words and their language.
 */
export function kickerCss(family: StyleTag): string {
  const chip =
    family === 'noacg'
      ? `  padding: calc(4px * var(--scale)) calc(10px * var(--scale));
  border-radius: calc(6px * var(--scale));  /* the house chip radius */
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent);  /* a thin accent keyline */
`
      : family === 'glass'
        ? `  padding: calc(4px * var(--scale)) calc(12px * var(--scale));
  border-radius: 999px;            /* a true pill — the glass family's soft shape */
  background: rgba(255, 255, 255, 0.08);  /* a faint second layer of glass */
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);  /* a soft keyline */
`
        : family === 'sport'
          ? `  padding: calc(4px * var(--scale)) calc(12px * var(--scale));
  background: var(--accent);       /* a small, loud accent dose — sport marks with fill */
`
          : '';
  const ink =
    family === 'sport' ? 'var(--accent-ink)' : family === 'minimal' ? 'var(--accent)' : 'var(--label-color)';
  return `/* The kicker — what kind of graphic this is, in the operator's own words (field f0). */
.audience-kicker {
  display: inline-block;           /* the label hugs its own text */
  margin-bottom: calc(12px * var(--scale));  /* air under the kicker */
${chip}  will-change: transform, opacity; /* it arrives with the card */
}
.audience-kicker > span {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(13px * var(--scale) * var(--type-scale));  /* kicker scale */
  font-weight: 700;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* a broadcast kicker is always caps */
  color: ${ink};                   /* the family's label colour */
}`;
}

/**
 * The ATTRIBUTION line — who sent this, and where from.
 *
 * TWO THINGS IT HAS TO SURVIVE, both of which happen constantly on air:
 *
 * 1. **No name.** Webinar and church tools let people submit anonymously, and a card reading
 *    "— · YouTube" is a bug the viewer can see. The runtime marks the root `.audience-no-asker`
 *    when the name field is empty, and that swaps in the `.audience-anon` element instead. The
 *    fallback word lives in the MARKUP, not in the JavaScript, so it can be translated and
 *    restyled like any other text on the card.
 * 2. **No source.** Not every question comes from a platform — some are handed up on cards in
 *    the room. `.audience-no-source` hides the source AND the separator, so the line ends
 *    cleanly instead of trailing a dot.
 *
 * The source is deliberately plain TEXT rather than a platform logo. A baked-in icon set would
 * make the graphic wrong for every tool it did not ship, would date badly, and would carry a
 * trademark into a template the user is meant to own.
 */
export function bylineCss(family: StyleTag): string {
  const sourceColor = family === 'minimal' ? 'var(--text-dim)' : 'var(--label-color)';
  return `/* The attribution line — who asked, and where it came from. */
.audience-by {
  display: flex;                   /* name, separator and source on one line… */
  align-items: baseline;           /* …sharing a baseline */
  flex-wrap: wrap;                 /* a long handle wraps rather than overflowing the card */
  gap: calc(8px * var(--scale));   /* even air between the parts */
  margin-top: calc(16px * var(--scale));  /* clear break from the text above */
}
.audience-asker,
.audience-anon {
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* under the message, above the source */
  font-weight: 600;                /* the name is the second-loudest thing on the card */
  color: var(--text-color);        /* primary text */
  overflow-wrap: break-word;       /* break a very long unbroken handle */
}

/* The anonymous fallback — hidden until the runtime says the name field is empty. Its text is
   ordinary markup, so it can be translated and restyled like anything else on the card. */
.audience-anon {
  display: none;                   /* the default: there IS a name */
  font-style: italic;              /* it reads as a stand-in, not as someone called Anonymous */
  color: var(--text-dim);          /* quieter than a real name */
}
.audience-no-asker .audience-asker { display: none; }
.audience-no-asker .audience-anon { display: inline; }

/* The separator — a dot between the name and the source. It goes with the source. */
.audience-sep {
  font-size: calc(15px * var(--scale) * var(--type-scale));  /* small — it is punctuation */
  color: var(--text-dim);          /* the quietest thing on the line */
}
.audience-sep::before { content: '\\00B7'; }   /* a middle dot, drawn by CSS so no field holds it */

/* The source — WHERE the question came from, as plain operator text: "YouTube live chat",
   "Zoom Q&A", "the room". Never a platform logo: a baked-in icon set would be wrong for every
   tool it did not ship with, and would put someone else's trademark in the user's template. */
.audience-source {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* the quietest text on the card */
  font-weight: 600;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* a broadcast source line is caps */
  color: ${sourceColor};           /* the family's label colour */
  overflow-wrap: break-word;       /* break a very long unbroken source */
}

/* No source: the separator goes with it, so the line ends cleanly instead of trailing a dot. */
.audience-no-source .audience-sep,
.audience-no-source .audience-source { display: none; }`;
}
