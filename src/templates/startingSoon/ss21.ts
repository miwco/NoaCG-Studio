// ss21 "Minute Rule" — the holding screen as a MEASURING INSTRUMENT, and the one thing in this
// category that shows the wait rather than only counting it.
//
// Every other holding screen states a number. A number is precise and tells an audience almost
// nothing: "14:52" and "04:52" look the same from across a lecture hall, and neither says how
// much of the wait is already behind them. So this one graduates the frame. One tick per minute
// the operator set, every fifth one taller the way a rule is graduated, and a traveller that
// walks the rule as the minutes go. Somebody glancing up reads the SHAPE — nearly there, or
// long enough to fetch a coffee — without reading a digit.
//
// That device is why this design is in the catalog. It came in from the agent round of
// 2026-08-22 (benchmarks/agent/rounds/2026-08-22), where it was the one candidate carrying
// something the twenty screens already here do not: they are all a centred stack of words over
// figures, and this is a board with an instrument along the bottom of it.
//
// The composition follows from that. The clock sits on the RIGHT of the label rather than under
// it, because the rule needs the full width of the frame and a centred stack would leave it
// nothing to span; the kicker and the note take the frame's top and bottom margins, so the
// middle belongs to the two things that change.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { NUMERIC_FIGURES } from '../shared/numerals';
import { defineStartingSoonVariant } from './shared';

export const ss21: TemplateVariant = defineStartingSoonVariant(
  {
    id: 'ss21',
    category: 'starting-soon',
    name: 'Minute Rule',
    styleTag: 'noacg',
    description:
      'A holding screen graduated like a rule: one tick per minute, and a traveller walking them as the wait goes.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Label', sample: 'Introduction to Broadcast Graphics begins in' },
      { title: 'Kicker', sample: 'University stream' },
      { title: 'Note', sample: 'Please take your seats' },
    ],
    logo: 'none',
    animationPresets: ['hold-loop'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'sora',
    defaultZone: 'mid-center',
  },
  {
    name: 'Minute Rule',
    description:
      'The holding screen as a measuring instrument: a mono kicker on the top margin, what is '
      + 'starting on the left with the countdown large on the right, and a minute rule across '
      + 'the frame — one tick per minute the operator set, every fifth one taller, with a '
      + 'traveller walking them as the wait goes. The note sits on the bottom margin.',
    uicolor: '4',
  },
  (o) => ({
    lineCount: 3,
    clock: 'minutes',
    clockMinutes: '15',
    lineDefaults: [
      { title: 'Label', sample: 'Introduction to Broadcast Graphics begins in' },
      { title: 'Kicker', sample: 'University stream' },
      { title: 'Note', sample: 'Please take your seats' },
    ],
    // The ruler is DRAWN from the operator's duration, so it is rebuilt whenever that changes
    // and repainted whenever the clock is. Playout, not motion — it lives outside the marked
    // ANIMATION region and a preset swap can never rewrite it.
    runtimeExtraJs: `// ---- The minute rule (design-owned playout; the shared clock runtime calls in) ----
// The rule is a picture of the SAME truth the digits carry, so it is never counted separately:
// clockPainted() hands over the seconds left and the full length on every paint — the idle
// preview, each tick, a pause and a resume alike — and everything here is derived from those.
var ruleTicks = [];              // the tick elements, in order, oldest minute first
var ruleSpent = [];              // whether each has been walked past (so we only touch it on the turn)
var ruleBuiltFor = -1;           // the length the current graduation was drawn for, in seconds

// One tick per whole minute, every fifth one taller, the last one the start line. Capped at
// three hours: past that a per-minute graduation is a grey smear rather than a reading.
function buildMinuteRule(totalSeconds) {
  var holder = document.querySelector('.starting-soon-ticks');
  if (!holder) return;
  while (holder.firstChild) holder.removeChild(holder.firstChild);
  ruleTicks = [];
  ruleSpent = [];
  var minutes = Math.round(totalSeconds / 60);
  if (minutes < 1) minutes = 1;
  if (minutes > 180) minutes = 180;
  for (var i = 0; i <= minutes; i++) {
    var tick = document.createElement('div');
    tick.className = minuteTickClass(i, minutes);
    tick.style.left = (i / minutes * 100) + '%';
    holder.appendChild(tick);
    ruleTicks.push(tick);
    ruleSpent.push(false);
  }
  ruleBuiltFor = totalSeconds;
}

function minuteTickClass(index, last) {
  if (index === last) return 'starting-soon-tick starting-soon-tick-start';
  if (index % 5 === 0) return 'starting-soon-tick starting-soon-tick-major';
  return 'starting-soon-tick';
}

// The shared clock runtime's paint hook. Redraw the graduation when the operator changes the
// duration, then move the traveller and dim the minutes already waited out.
function clockPainted(secondsLeft, totalSeconds) {
  if (totalSeconds !== ruleBuiltFor) buildMinuteRule(totalSeconds);
  var gone = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;
  if (gone < 0) gone = 0;
  if (gone > 1) gone = 1;

  var cursor = document.querySelector('.starting-soon-cursor');
  if (cursor) cursor.style.left = (gone * 100) + '%';

  var last = ruleTicks.length - 1;
  for (var i = 0; i <= last; i++) {
    // The start line is never spent: it is the minute the show begins, not one that passed.
    var spent = i < last && (i / last) < gone - 0.0005;
    if (spent === ruleSpent[i]) continue;
    ruleSpent[i] = spent;
    ruleTicks[i].className = minuteTickClass(i, last) + (spent ? ' starting-soon-tick-spent' : '');
  }
}
`,
    html: `    <!-- Minute Rule: kicker on the top margin, the board in the middle, the note at the foot. -->
    <div class="starting-soon-box">
      <!-- The accent rule along the top edge, and the pool of light the hold-loop breathes. -->
      <div class="starting-soon-edge"></div>
      <div class="starting-soon-pool starting-soon-pulse"></div>

      <!-- The top margin: whose stream this is. -->
      <div class="starting-soon-mask starting-soon-kicker-mask"><span id="f1" class="starting-soon-kicker">${o.lines[1]?.sample || 'University stream'}</span></div>

      <!-- The board: what is starting on the left, how long on the right. -->
      <div class="starting-soon-board">
        <div class="starting-soon-mask starting-soon-label-mask"><span id="f0" class="starting-soon-label">${o.lines[0]?.sample || 'Introduction to Broadcast Graphics begins in'}</span></div>
        <div class="starting-soon-mask starting-soon-clock-mask"><span class="starting-soon-clock">15:00</span></div>
      </div>

      <!-- The instrument. The ticks and the traveller are drawn by the runtime above, because
           how many there are is the operator's duration and nothing the markup can know. -->
      <div class="starting-soon-rule">
        <div class="starting-soon-track"></div>
        <div class="starting-soon-ticks"></div>
        <div class="starting-soon-cursor"></div>
      </div>

      <!-- The bottom margin: what the room should do. -->
      <div class="starting-soon-mask starting-soon-note-mask"><span id="f2" class="starting-soon-note">${o.lines[2]?.sample || 'Please take your seats'}</span></div>
    </div>`,
    css: `/* The frame, used top to bottom — a screen that sits on air for twenty minutes has no
   business crowding everything into the middle third. */
/* THE BOX IS THE WHOLE FRAME here, which means overriding four of the category's defaults on
   purpose. Every other holding screen is a centred column that hugs its text, and the assembler
   sizes and anchors it for exactly that — but this design's instrument has to SPAN the frame,
   and a rule graduated across 1344px inside a 1920px picture reads as a cropped ruler. So the
   anchor, the transform, the hug cap and the centred text all give way, and the box takes the
   programme's own dimensions. */
.starting-soon-box {
  position: absolute;
  left: 0;                         /* not the category's 50% anchor: this box IS the frame */
  top: 0;
  transform: none;                 /* …so there is nothing to translate back from */
  width: ${o.resolution.width}px;
  height: ${o.resolution.height}px;
  max-width: none;                 /* the hug cap is for a column, and this is not one */
  text-align: left;                /* the frame reads from its left margin, not from a centre */
  display: flex;
  flex-direction: column;
  padding: calc(62px * var(--scale)) calc(140px * var(--scale)) calc(84px * var(--scale));
}

/* The accent rule along the top edge — the family's one bar, run full width. */
.starting-soon-edge {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: var(--accent-weight);
  background: var(--accent);
  box-shadow: var(--accent-glow);
  transform-origin: left center;
}

/* The pool of light UNDER THE FIGURES, and the hold-loop's pulse element: the one thing that
   moves while the screen holds. Kept deliberately weak, and centred on the digits rather than
   thrown at the corner, because the category already paints its own ambient light in the top
   right — two accent pools in one frame is a wash, not a light. */
.starting-soon-pool {
  position: absolute;
  left: 52%;
  top: 26%;
  width: calc(900px * var(--scale));
  height: calc(560px * var(--scale));
  margin: calc(-280px * var(--scale)) 0 0 calc(-450px * var(--scale));  /* centre it on that point */
  background: radial-gradient(closest-side, color-mix(in srgb, var(--accent) 9%, transparent), transparent);
  pointer-events: none;
}

/* Every field line sits in its own mask, so it can slide in from behind its own edge. */
.starting-soon-mask { overflow: hidden; }
.starting-soon-mask > span { display: inline-block; overflow-wrap: break-word; }

/* ── The margins ── */
.starting-soon-kicker-mask { flex: none; }

.starting-soon-kicker {
  font-family: var(--font-label);
  font-size: calc(26px * var(--scale) * var(--type-scale));
  font-weight: 500;
  letter-spacing: calc(0.3em * var(--type-scale));
  text-transform: uppercase;
  color: var(--label-color);
  max-width: calc(1100px * var(--scale));
  line-height: 1.2;
}

/* The note is pushed to the foot by the board's auto margin below, not by a fixed position:
   a longer note grows upward into the frame's own air instead of off the bottom of it. */
.starting-soon-note-mask { flex: none; }

.starting-soon-note {
  font-family: var(--font-label);
  font-size: calc(26px * var(--scale) * var(--type-scale));
  font-weight: 400;
  letter-spacing: calc(0.16em * var(--type-scale));
  text-transform: uppercase;
  color: var(--text-dim);
  max-width: calc(1200px * var(--scale));
  line-height: 1.3;
}

/* ── The board ── */
/* \`margin-top: auto\` sits the board and its rule in the frame's lower middle and keeps the
   kicker on the top margin, whatever the label wraps to. */
.starting-soon-board {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  width: 100%;
  margin-top: auto;
}

.starting-soon-label-mask {
  flex: 1 1 auto;
  min-width: 0;                    /* let the label WRAP rather than shove the clock off-frame */
  margin-right: calc(72px * var(--scale));
  padding-bottom: calc(18px * var(--scale));  /* sits the label on the digits' baseline */
}

.starting-soon-label {
  font-size: calc(58px * var(--scale) * var(--type-scale));
  font-weight: 400;
  line-height: 1.16;
  letter-spacing: calc(-0.005em * var(--type-scale));
  color: var(--text-color);
  max-width: calc(1000px * var(--scale));
}

.starting-soon-clock-mask { flex: 0 0 auto; }

/* The countdown repaints every second, so it carries BOTH halves of the numerals contract. */
.starting-soon-clock {
  ${NUMERIC_FIGURES}
  font-size: calc(208px * var(--scale) * var(--type-scale));
  font-weight: 600;
  line-height: 0.92;
  letter-spacing: calc(-0.028em * var(--type-scale));
  color: var(--text-color);
  white-space: nowrap;             /* the figures are one row or the board is broken */
}

/* The moment it begins — the figures take the accent, and only then. */
.starting-soon-done .starting-soon-clock { color: var(--accent); }

/* ── The instrument ── */
.starting-soon-rule {
  position: relative;
  width: 100%;
  height: calc(44px * var(--scale));
  margin-top: calc(110px * var(--scale));
  margin-bottom: auto;             /* the note keeps the bottom margin to itself */
}

.starting-soon-track {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: calc(3px * var(--scale));
  background: color-mix(in srgb, var(--text-color) 16%, transparent);
  transform-origin: left center;
}

.starting-soon-ticks {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

/* One tick per minute; every fifth one reads taller, the way a rule is graduated. Each is
   placed by a percentage the runtime sets, so the graduation always spans the full frame
   whether the operator set four minutes or ninety. */
.starting-soon-tick {
  position: absolute;
  bottom: 0;
  width: calc(3px * var(--scale));
  height: calc(20px * var(--scale));
  margin-left: calc(-1.5px * var(--scale));  /* centre the tick ON its minute, not after it */
  background: var(--text-color);
}

.starting-soon-tick-major {
  height: calc(34px * var(--scale));
  width: calc(4px * var(--scale));
  margin-left: calc(-2px * var(--scale));
}

/* A minute already waited out drops back to the track's own weight. */
.starting-soon-tick-spent { background: color-mix(in srgb, var(--text-color) 20%, transparent); }

/* The last tick is the START LINE — the minute the lecture begins. It sits fully inside the
   frame (a full negative margin), because a graduation that runs off the edge reads as clipped. */
.starting-soon-tick-start {
  width: calc(6px * var(--scale));
  height: 100%;
  margin-left: calc(-6px * var(--scale));
  background: var(--text-color);
}

/* The traveller: where the wait has got to. It rides above the graduations in the accent. */
.starting-soon-cursor {
  position: absolute;
  bottom: 0;
  left: 0;
  width: calc(6px * var(--scale));
  height: calc(62px * var(--scale));
  margin-left: calc(-3px * var(--scale));
  background: var(--accent);
  transform-origin: center bottom; /* it grows up out of the rule on the entrance */
}

/* Its head — a plumb marker, so where it stands on the rule reads at a glance. */
.starting-soon-cursor::before {
  content: "";
  position: absolute;
  left: calc(-9px * var(--scale));
  top: 0;
  width: calc(24px * var(--scale));
  height: calc(6px * var(--scale));
  background: var(--accent);
}
`,
  }),
);
