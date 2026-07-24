// pi02 "Emergency Instructions" — the numbered action list. What to do, in order, in as few
// words as each step can be written in.
//
// The numbers are drawn by a CSS counter rather than typed into the fields, so an operator
// who deletes the middle instruction on air gets 1-2 rather than 1-3. The steps are ordinary
// SPX fields, which means the wizard's step mode reveals them one press at a time — the
// existing Continue machinery, used for the thing it is actually good at: pacing an
// instruction so a viewer finishes one before the next arrives.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { definePublicInfoVariant, piMasks } from './shared';

export const pi02: TemplateVariant = definePublicInfoVariant(
  {
    id: 'pi02',
    category: 'public-info',
    name: 'Emergency Instructions',
    styleTag: 'minimal',
    description: 'A numbered what-to-do list, revealable one instruction at a time.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Heading', sample: 'What to do now' },
      { title: 'Step 1', sample: 'Go indoors and stay there' },
      { title: 'Step 2', sample: 'Close all windows, doors and vents' },
      { title: 'Step 3', sample: 'Tune to this channel for the all-clear' },
      { title: 'Issued by', sample: 'Civil Protection Authority' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'fade', 'slide-up', 'mask-wipe'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Emergency Instructions',
    description:
      'The numbered action list: a heading, up to three instructions carrying automatic ' +
      'numbers, and the issuing authority. Turn on step mode and each instruction arrives on ' +
      'its own Continue press, so a viewer finishes one before the next appears.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Emergency Instructions: heading, numbered steps, issuing authority. -->
    <div class="public-info-box">
${piMasks(o, [[0, 'public-info-kicker']])}
      <!-- The instruction list. The numbers come from a CSS counter on these masks, so
           removing an instruction renumbers the rest instead of leaving a gap. -->
      <div class="public-info-steps">
${piMasks(o, [[1, 'public-info-step'], [2, 'public-info-step'], [3, 'public-info-step']], '        ')}
      </div>
${piMasks(o, [[4, 'public-info-source']])}
    </div>`,
    css: `/* The panel — a centred block, flat and opaque. */
.public-info-box {
  display: flex;                   /* stack the sections */
  flex-direction: column;          /* heading, steps, issuer */
  gap: calc(24px * var(--scale));  /* the three sections are distinct */
  width: calc(1020px * var(--scale));  /* wide enough that no instruction wraps twice */
  max-width: none;                 /* this design sets its own width, not the auto-fit cap */
  padding: calc(45px * var(--scale)) calc(53px * var(--scale));
  border-top: var(--accent-weight) solid var(--accent);  /* the official mark */
  background: var(--panel-bg);     /* near-black — never pure #000 */
  box-shadow: var(--panel-shadow); /* the family's lift off the picture */
  text-align: left;                /* an instruction reads left to right, whatever the zone */
}

/* The heading — what this list is for. */
.public-info-kicker {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(23px * var(--scale) * var(--type-scale)); /* small: it labels, it does not shout */
  font-weight: 700;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as a category stamp */
  color: var(--label-color);       /* the family's label colour */
}

/* The list. The counter is reset here and incremented by each step's own mask, so the
   numbering follows whatever instructions actually exist. */
.public-info-steps {
  display: flex;                   /* stack the instructions */
  flex-direction: column;          /* one per row */
  gap: calc(19px * var(--scale));  /* each instruction is its own act */
  counter-reset: instruction;      /* the automatic numbering starts here */
}

/* One instruction. The number is drawn on the SPAN, not on its mask: the span is what a step
   reveal hides and what the line presets slide, so a number attached to the mask would sit
   there alone beside an instruction that has not arrived yet. Chip and words travel together.
   The selector is deliberately two classes deep — it has to outrank the assembler's own
   "mask > span" inline-block rule to make the row a block. */
.public-info-mask > .public-info-step {
  display: block;                  /* the row is a block, so the number column holds */
  position: relative;              /* the counter chip is positioned against this */
  padding-left: calc(80px * var(--scale)); /* the hanging column the numbers live in */
  counter-increment: instruction;  /* this row takes the next number */
}
.public-info-step::before {
  content: counter(instruction);   /* the automatic number */
  position: absolute;              /* held in the hanging column */
  left: 0;                         /* flush with the panel's text edge */
  top: 0;                          /* aligned with the first line of the instruction */
  width: calc(56px * var(--scale));   /* the number chip's width */
  height: calc(56px * var(--scale));  /* a square chip */
  display: flex;                   /* centre the digit */
  align-items: center;             /* vertical centring */
  justify-content: center;         /* horizontal centring */
  border-radius: var(--panel-radius);  /* the family's corner treatment */
  background: var(--accent);       /* the one solid accent surface per row */
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(29px * var(--scale) * var(--type-scale)); /* the digit reads at a glance */
  font-weight: 800;                /* heavy: the number is a landmark, not a footnote */
  color: var(--accent-ink);        /* the family's ink on an accent-filled chip */
}

/* The instruction itself — short sentences, undimmed. This is the line that asks the viewer
   to act, so it is never secondary text. */
.public-info-step {
  font-size: calc(40px * var(--scale) * var(--type-scale)); /* large enough to act on at a glance */
  font-weight: 500;                /* a touch of presence without shouting */
  line-height: 1.28;               /* comfortable across a wrap */
  color: var(--text-color);        /* primary text color — never dimmed */
}

/* The hairline above the attribution, drawn on the MASK rather than on the span — a span is
   inline-block, so a rule on it would only be as wide as the words. */
.public-info-box > .public-info-mask:last-child {
  padding-top: calc(21px * var(--scale)); /* room under the rule */
  border-top: 1px solid rgba(255, 255, 255, 0.12); /* divides instruction from attribution */
}

/* The issuing authority — who is telling you to do this. */
.public-info-source {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* the quietest voice in the panel */
  font-weight: 600;                /* small caps need weight to hold */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as an attribution stamp */
  color: var(--label-color);       /* the family's label colour */
}`,
    hasAccent: false,
  }),
);
