// al13 "Bulletin Band" - the full-width breaking band with its own METADATA END: a solid
// kicker block driven forward by chevrons, the headline across the middle, and the desk and the
// time of the update boxed off at the far end. Sport family, sibling of lt05 "Angle Slab" and
// al04 "Volt Alert".
//
// Why it is a different alert from al09 "Breaking Banner": al09 is a two-row strap - kicker,
// headline, attribution stacked - which is the newsroom's quiet form. This is the rolling-news
// BAND, and its shape carries two things al09 has no place for. The chevrons are direction: a
// band that drives left-to-right reads as a bulletin arriving rather than as a caption sitting
// there. And the two cells at the end are the pair every rolling channel puts there - which
// desk the line belongs to, and when it was last true - so a viewer joining mid-story can date
// what they are reading without waiting for the presenter to say it.
//
// Four fields, positional in the standard contract: f0 the kicker, f1 the headline, f2 the desk,
// f3 the stamp. The time is TYPED rather than a live clock on purpose - it is the moment the
// line was last updated, not the moment the viewer is watching, and a running clock would
// quietly claim the second one.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { alertLineMasks, defineAlertVariant } from './shared';

export const al13: TemplateVariant = defineAlertVariant(
  {
    id: 'al13',
    category: 'alert',
    name: 'Bulletin Band',
    styleTag: 'sport',
    description: 'The rolling-news band: a chevron-driven kicker, the headline, then desk and time cells.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Kicker', sample: 'Breaking' },
      { title: 'Headline', sample: 'City council approves new waterfront development plan after late-night vote' },
      { title: 'Desk', sample: 'Politics' },
      { title: 'Updated', sample: '21:45' },
    ],
    logo: 'none',
    animationPresets: ['snap-stinger', 'slide-up', 'mask-wipe', 'fade'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Bulletin Band',
    description:
      'The rolling-news band: a solid kicker block driven forward by three chevrons, the ' +
      'headline across the middle of the band, and two cells closing it - the desk the line ' +
      'belongs to, and the time it was last updated. The kicker word is the operator\'s ' +
      '(Breaking, Urgent, Developing), and the stamp is typed rather than ticking, because it ' +
      'dates the line rather than the broadcast.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Bulletin Band: kicker block + chevrons, headline, then the desk and stamp cells. -->
    <div class="alert-box">
      <div class="alert-lines">
${alertLineMasks(o)}
      </div>
    </div>`,
    css: `${labelFontFaceCss(fontById('archivo'))}

/* The band - full width across the foot of the frame, flat and opaque, edged by the accent. */
.alert-box {
  display: flex;                   /* one row: the four cells of the band */
  align-items: stretch;            /* every cell spans the band's height */
  width: calc(1728px * var(--scale));  /* full width inside the 5% safe areas */
  min-height: calc(104px * var(--scale));  /* the band grows only if the headline wraps */
  max-width: none;                 /* this design sets its own width, not the auto-fit cap */
  background: var(--panel-bg);     /* near-black - never pure #000 */
  border-top: var(--accent-weight) solid var(--accent);  /* the band's accent edge */
  box-shadow: var(--panel-shadow); /* the family's hard offset lift */
  overflow: hidden;                /* the chevrons and cells stop at the band's edge */
}

/* The four cells are laid out as a GRID, and the placement rules belong to the MASKS: every
   line the assembler emits is wrapped in an .alert-mask reveal wrapper, so a grid-column on a
   span would place nothing at all. */
.alert-lines {
  display: grid;                   /* kicker | headline | desk | stamp */
  /* THE HEADLINE KEEPS A FLOOR and every other column may shrink. A row of auto tracks beside a
     flexible one looks safe and is not: with a long desk name the flexible track collapses
     to zero and the headline paints straight across the cell beside it (the runtime bench
     measured an 88% overlap at doubled text). The floor keeps the headline a real column, and
     each end cell trims its own token below. */
  grid-template-columns:
    minmax(0, auto)                          /* the kicker, trimmed by its own span */
    minmax(calc(540px * var(--scale)), 1fr)  /* the headline's floor - it never collapses */
    minmax(0, auto)                          /* the desk, trimmed by its own span */
    minmax(0, auto);                         /* the stamp, trimmed by its own span */
  align-items: stretch;            /* each cell runs the band's full height */
  width: 100%;                     /* the grid fills the band */
  min-width: 0;                    /* let a long headline wrap instead of stretching the grid */
  text-align: left;                /* a band reads left to right, whatever the zone */
}

/* The kicker's cell - the one solid accent surface, and where the chevrons come from. */
.alert-lines > .alert-mask:nth-child(1) {
  position: relative;              /* anchors the chevrons at its trailing edge */
  grid-column: 1;                  /* the reading edge */
  display: flex;                   /* centre the word inside the block */
  align-items: center;             /* vertical centring */
  padding: 0 calc(96px * var(--scale)) 0 calc(40px * var(--scale));  /* room for the chevrons */
  background: var(--accent);       /* the one solid accent surface */
}
/* The chevrons - three arrowheads cut out of the kicker block's trailing edge. They are drawn
   as one repeating gradient inside a skewed strip rather than as three elements, because they
   are one motif: the band's direction of travel. */
.alert-lines > .alert-mask:nth-child(1)::after {
  content: "";                     /* the drawn chevron run */
  position: absolute;              /* against the block's trailing edge */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  right: 0;                        /* flush with the block's end */
  width: calc(84px * var(--scale)); /* the run of three */
  background: repeating-linear-gradient(
    115deg,
    var(--panel-bg) 0 calc(9px * var(--scale)),          /* the cut… */
    transparent calc(9px * var(--scale)) calc(28px * var(--scale))  /* …and the arrowhead after it */
  );
}
/* The headline's cell. */
.alert-lines > .alert-mask:nth-child(2) {
  grid-column: 2;                  /* the text column */
  display: flex;                   /* the headline sits on the band's centre line */
  align-items: center;             /* vertical centring */
  padding: calc(14px * var(--scale)) calc(38px * var(--scale));
  min-width: 0;                    /* wrap rather than widen the band */
}
/* The desk's cell - the first of the two closing cells, one step off the band. */
.alert-lines > .alert-mask:nth-child(3) {
  grid-column: 3;                  /* after the headline */
  display: flex;                   /* centre the word in its cell */
  align-items: center;             /* vertical centring */
  padding: 0 calc(34px * var(--scale));
  background: color-mix(in srgb, var(--accent) 22%, transparent);  /* a tint, not a second fill */
  box-shadow: inset calc(2px * var(--scale)) 0 0 0 rgba(255, 255, 255, 0.18);  /* the seam */
}
/* The stamp's cell - the band's last word, on the darkest ground of the four. */
.alert-lines > .alert-mask:nth-child(4) {
  grid-column: 4;                  /* the far end */
  display: flex;                   /* centre the figures in the cell */
  align-items: center;             /* vertical centring */
  padding: 0 calc(34px * var(--scale));
  background: rgba(0, 0, 0, 0.42); /* a hard dark cell closing the band */
  box-shadow: inset calc(2px * var(--scale)) 0 0 0 rgba(255, 255, 255, 0.18);  /* the seam */
}

/* The kicker word - heavy caps on the accent block, read before anything else. */
.alert-name {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* read before the headline */
  font-weight: 800;                /* heavy caps carry at a distance */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as a stamp, whatever the operator types */
  font-style: italic;              /* the rolling-news lean, on the word rather than the block */
  color: var(--accent-ink);        /* the family's ink on an accent-filled block */
  /* The trim is the SPAN's own, never the cell's: a parent clipping its child is a graphic
     cutting text it did not measure, and the runtime bench refuses it. Bounding the token here
     makes an over-long kicker read as trimmed instead of shoving the headline off the band. */
  display: inline-block;           /* so the bound applies to the word's own box */
  max-width: calc(340px * var(--scale));  /* the width a kicker word may take */
  overflow: hidden;                /* a longer word is trimmed… */
  text-overflow: ellipsis;         /* …and the trim is marked */
  white-space: nowrap;             /* the kicker never wraps */
}

/* The headline - the largest type the band will hold, and the only part that wraps. */
.alert-title {
  font-size: calc(36px * var(--scale) * var(--type-scale));  /* the loudest text in the graphic */
  font-weight: var(--display-weight);  /* the family's heading weight */
  letter-spacing: var(--display-tracking);  /* big text tightens */
  line-height: 1.14;               /* a wrapped headline stays one block */
  color: var(--text-color);        /* primary text colour */
}

/* The desk - which part of the newsroom this line belongs to. */
.alert-extra {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* label scale, above the type floor */
  font-weight: 700;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as a section stamp */
  color: var(--text-color);        /* full strength on its tinted cell */
  /* The same span-owned trim as the kicker: the desk and the stamp are atomic tokens, so each
     bounds itself rather than letting its cell grow into the headline's column. */
  display: inline-block;           /* so the bound applies to the token's own box */
  max-width: calc(300px * var(--scale));  /* the width a desk name may take */
  overflow: hidden;                /* a longer name is trimmed… */
  text-overflow: ellipsis;         /* …and the trim is marked */
  white-space: nowrap;             /* the desk never wraps */
}

/* The stamp - when the line was last true. Tabular, so a band that is updated on air never
   changes width as the minutes tick past. */
.alert-lines > .alert-mask:nth-child(4) .alert-extra {
  font-family: var(--font-numeric);  /* a face whose digits are all one width */
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* a figure, not a label */
  font-weight: 700;                /* solid at figure size */
  letter-spacing: 0;               /* figures are not tracked */
  font-variant-numeric: tabular-nums;  /* the cell's width never moves */
  color: var(--text-color);        /* primary text colour */
  max-width: calc(220px * var(--scale));  /* a stamp is a time, never a sentence */
}`,
    hasAccent: false,
    // The stage: the width this design holds a full-length value at, so the panel
    // stops re-sizing itself between one piece of content and the next.
    stageWidth: 1730,
  }),
);
