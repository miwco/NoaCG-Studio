// al08 "Service Status" — the operations notice: which service, what state it is in, and
// when that was last confirmed. The graphic a transport feed, a utility channel or a
// conference stream puts up between items.
//
// Like al07 it carries no severity flag: a service status is written by the operator in
// words ("Delayed", "Restored"), not chosen from a fixed ladder, so there is no state machine
// to claim. What it does carry is the TIME — because a status with no timestamp is worthless,
// and a timestamp typed by hand goes stale the moment it is typed. The clock is design-owned
// runtime, emitted outside the marked animation region exactly like the ticker's clock cap.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { alertLineMasks, defineAlertVariant } from './shared';

export const al08: TemplateVariant = defineAlertVariant(
  {
    id: 'al08',
    category: 'alert',
    name: 'Service Status',
    styleTag: 'glass',
    description: 'A status panel: the service, its state in the operator’s own words, and a live time.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Service', sample: 'Northern line' },
      { title: 'Status', sample: 'Delays of up to 20 minutes — replacement buses running' },
    ],
    logo: 'none',
    animationPresets: ['slide-left', 'fade', 'pop-spring', 'blur-in'],
    defaultPalette: paletteById('mint'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Service Status',
    description:
      'A frosted status panel: the service name, its state in the operator’s own words, and ' +
      'a live "as of HH:MM" stamp that repaints itself every minute — so the notice can sit ' +
      'on air for an hour without becoming a lie.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Service Status: the service and its state, with a live confirmation time. -->
    <div class="alert-box">
      <div class="alert-lines">
${alertLineMasks(o)}
      </div>
      <!-- The stamp — paintAlertStamp() (in the JS) repaints this every 30 seconds. -->
      <div class="alert-stamp" id="alert-stamp">As of 20:14</div>
    </div>`,
    css: `/* The panel — frosted glass over an opaque floor, so the status stays readable on any
   picture. */
.alert-box {
  display: flex;                   /* the lines stack, the stamp sits under them */
  flex-direction: column;          /* text column, then the stamp */
  gap: calc(20px * var(--scale));  /* air above the stamp */
  width: calc(1086px * var(--scale));   /* a contained panel, not a band */
  max-width: none;                 /* this design sets its own width, not the auto-fit cap */
  padding: calc(34px * var(--scale)) calc(40px * var(--scale));
  border-radius: var(--panel-radius);  /* the family's corner radius */
  background: linear-gradient(var(--panel-bg), var(--panel-bg)), rgba(8, 12, 18, 0.80);
  backdrop-filter: var(--panel-blur);      /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* lift + the 1px inner edge */
}

/* The text column. */
.alert-lines {
  display: flex;                   /* stack the lines */
  flex-direction: column;          /* service, then status */
  gap: calc(9px * var(--scale));   /* the two lines are one statement */
  min-width: 0;                    /* let a long status wrap instead of stretching the row */
  text-align: left;                /* a status reads left to right, whatever the zone */
}

/* The service — the thing this notice is about. */
.alert-name {
  font-size: calc(43px * var(--scale) * var(--type-scale)); /* the panel's headline */
  font-weight: var(--display-weight);  /* the family's heading weight */
  letter-spacing: var(--display-tracking); /* big text tightens */
  line-height: 1.15;               /* a wrapped name stays one block */
  color: var(--text-color);        /* primary text color */
}

/* The status — the operator's own words. Not dimmed: this is the sentence people came for. */
.alert-title {
  font-size: calc(30px * var(--scale) * var(--type-scale)); /* subordinate to the name, not to the reader */
  font-weight: 400;                /* regular — this line is read, not scanned */
  line-height: 1.32;               /* comfortable across a wrap */
  color: var(--text-color);        /* primary text color */
}

/* The stamp — when this was last true. Tabular figures so the minute ticking over does not
   shuffle the line. */
.alert-stamp {
  padding-top: calc(17px * var(--scale)); /* room under the rule */
  border-top: 1px solid rgba(255, 255, 255, 0.16); /* a hairline divides the claim from its age */
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(20px * var(--scale) * var(--type-scale)); /* the quietest voice in the panel */
  font-weight: 600;                /* small caps need weight to hold */
  font-variant-numeric: tabular-nums;   /* every digit same width — no wobble on the minute */
  letter-spacing: var(--label-tracking);  /* tracked caps breathe */
  text-transform: uppercase;       /* reads as a stamp, not a sentence */
  color: var(--label-color);       /* the accent, in the glass family */
}`,
    hasAccent: false,
    // Design-owned runtime, emitted BEFORE the marked ANIMATION region — the Motion panel can
    // never rewrite it, and it survives the data-block conversion untouched.
    runtimeExtraJs: `// ── The "as of" stamp ────────────────────────────────────────────────────────
// A status notice can sit on air for a long time, so its timestamp has to keep itself
// honest. Repainted every 30 seconds; the minute is the resolution anyone cares about.
function paintAlertStamp() {
  var el = document.getElementById('alert-stamp');
  if (!el) return;
  var d = new Date();
  var pad = function (n) { return String(n).padStart(2, '0'); };
  el.textContent = 'As of ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}
// Start once the DOM exists (this file loads in <head> in exported packages).
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () { paintAlertStamp(); setInterval(paintAlertStamp, 30000); });
} else {
  paintAlertStamp(); setInterval(paintAlertStamp, 30000);
}`,
  }),
);
