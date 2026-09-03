// The infographic's MEASURED motion — the values a keyframe cannot describe.
//
// Every infographic moves by a magnitude that only exists once the operator's DATA is in the
// DOM: the stat counts to whatever number they typed, a bar grows to its own data-value, the
// ring draws to that percent, and a list cascades one row per line they wrote. None of those
// are numbers a static keyframe can hold — they change the moment the data does
// (docs/DYNAMIC_MOTION_SCOPE.md). So each one is a named BUILDER: a plain function that reads
// the DOM and returns a GSAP object. The animation data only references it by name
// (`"dynamics": [{ "build": "infographicCountUp", … }]`) and the interpreter adds what it returns.
//
// These ship OUTSIDE the marked ANIMATION region — design-owned runtime, like the countdown
// clock engine — so the timeline never rewrites them and you can tune the count or the growth
// right here. Every builder ships in every infographic: the data names the live one, and
// swapping the motion preset just swaps that name.

import { motionSpeedJs } from '../shared/base';

/** The infographic motion builders, emitted before the marked region in every infographic. */
export const IG_MOTION_JS = `// ---- Measured motion (the animation data references these by name) ----
${motionSpeedJs}

// infographicStat(): read a stat element's REAL value — the number the operator typed, plus
// whatever trails it ('%', ' pts', ' goals'). Always from data-target, which update() keeps
// current, never from the live textContent: mid-count that reads "43%" and an interrupted
// replay would then count up to the wrong number. Returns null when the text isn't numeric.
function infographicStat(el) {
  if (!el) return null;
  var text = el.getAttribute('data-target');
  if (text === null) {                           // first play, before any update():
    text = el.textContent;                       // seed it from the markup once
    el.setAttribute('data-target', text);
  }
  var value = parseFloat(text.replace(/,/g, '')); // leading number: "1,234%" -> 1234
  if (isNaN(value)) return null;                 // not a stat — leave the text alone
  return {
    text: text,                                  // the exact text, restored when the count lands
    value: value,
    suffix: text.replace(/^\\s*[-+]?[0-9.,]+/, ''), // what follows the number: '%', ' pts'…
    // Does the operator's own figure carry thousand separators? Every count below renders in
    // the notation its figure LANDS in, so the number never changes shape as it arrives: a
    // grouped figure counts grouped, a plain one counts plain. Reading it off their text is
    // what keeps that true both ways - grouping "1200" would be as wrong as counting "124213"
    // up to "124,213".
    grouped: text.indexOf(',') >= 0
  };
}

// ---- THE SETTLE RULE: a readout's final value is a SET, never only a callback ----
//
// Every count below is a tween over a plain counter object whose digits reach the screen from
// an onUpdate/onComplete. That is right for playback and WRONG for a jump: a surface that shows
// a graphic without a playback gesture (a Home card, a library thumbnail, the operator's
// preview before the first take, the editor canvas) parks the entrance at its end with
// callbacks SUPPRESSED - preview/settleGraphic.ts. Under suppression a tween still writes its
// target, but no callback fires, so the digits never leave the '0' the opening set wrote.
// Measured 2026-08-26: seventeen catalog readouts across ig01, ig04, ig05, ig07, ig22, ig23,
// ig30, ig31, ig34, ig35 and ig36 settled reading 0 against their own data-target.
//
// So every count ENDS ON A SET of the real text, positioned at the count's own end. A set() is
// a zero-duration tween: it renders under suppression, which is the same property that caused
// the bug, used the other way. Under normal playback it writes exactly what the onComplete
// beside it already wrote and changes nothing; under a jump it is the only thing that writes.
// (The onComplete stays: it is what restores the figure mid-flight when a replay is
// interrupted, and a settle never runs it.)
//
// THE AUDIT THIS BELONGS TO IS "does this readout depend on a callback firing", not "is it a
// number". A width, a dashoffset and an opacity are tween TARGETS and settle correctly on
// their own; anything a callback types into the DOM does not. Add a readout, add its set.

// ---- THE ZERO RULE: a readout empties when the GRAPHIC appears, not when its count starts ----
//
// The other end of the same timeline, and the other half of the same bug. Every preset opens by
// revealing the graphic and emptying what the entrance is about to fill - the bars to 0%, the
// ring to a full dashoffset - and then adds the measured builder a few tenths later, so the
// count starts once the panel has settled. The FIGURES were not in that opening: each count
// emptied its own readout at the moment the count began.
//
// A played graphic gets its data BEFORE it is taken: SPX, CasparCG and the playout dashboard all
// call update() and then play(). So for the whole head start the readout sat on screen showing
// the operator's real figure, and the count then snapped it back to zero and counted up to the
// number it had just been showing. Reproduced 2026-08-27 in that order: ig01 painted 87% through
// 400 ms of its 600 ms panel rise, and twelve readouts across ten designs did the same.
//
// So a builder takes that head start as opts.lead and positions its own contents from it: the
// opening zero at 0, the count at the lead, the settle set at the lead plus the count's length.
// It says it did so by marking the timeline it returns noacgLeadApplied, and the interpreter
// (templates/shared/animRuntime.ts) then adds that timeline at 0 rather than at the offset.
// Absolute timings are unchanged - the count starts and lands exactly where it did. Only the
// emptying moved, onto the entrance's first frame, where the panel is still fully transparent.
//
// A builder that owns no readout ignores the lead, returns an unmarked timeline and is added at
// the offset exactly as before - which is every measured motion in every other category.

// infographicCountUp(): the headline number rolls from zero up to the operator's figure. The
// target is their data, so it cannot be a keyframe — it is read here, at play time. A design
// that pairs a progress bar with the stat grows it once the number lands.
function infographicCountUp(target, opts) {
  var el = document.querySelector(target);
  var stat = infographicStat(el);
  if (!stat) return null;
  var speed = motionSpeed();
  var lead = (opts && opts.lead) || 0;           // the head start the entrance gives this count
  var count = 1.6 / speed;                       // how long the figure takes to arrive
  var counter = { value: 0 };                    // a plain object GSAP can tween

  var tl = gsap.timeline();
  tl.set(el, { textContent: '0' + stat.suffix }, 0);  // the zero rule - the entrance's first frame
  tl.to(counter, {
    value: stat.value,
    duration: count,
    ease: (opts && opts.ease) || 'expo.out',
    onUpdate: function () {
      // Whole numbers read best, in the operator's own notation: a fundraising total that
      // counts "8807", "16041", "124213" and only puts its commas back on the last frame reads
      // as a different order of magnitude every few frames and then jumps width when it lands.
      // infographicGoalRing() below has always grouped; this is the same figure through the
      // other builder, and it was the one the owner caught on ig05 "Rising Total".
      el.textContent = infographicCountText(Math.round(counter.value), stat);
    },
    onComplete: function () {
      el.textContent = stat.text;                // restore the exact text (keeps decimals)
    }
  }, lead);
  tl.set(el, { textContent: stat.text }, lead + count);  // the settle rule, at the count's end

  // The bar fills once the figure has landed (harmless when there are none). Its own lead
  // carries this count's, so a readout cap it owns empties on the same first frame this
  // figure does instead of waiting for its bar's turn.
  var bars = infographicBarsGrow('.infographic-bar-fill', { lead: lead + count });
  if (bars) tl.add(bars, 0);
  tl.noacgLeadApplied = true;                    // positioned from opts.lead (the zero rule)
  return tl;
}

// infographicBarsGrow(): every bar grows to its OWN data-value percent, one after another.
// The rebuild writes that attribute from the operator's lines, so both the widths and the
// number of bars are theirs — a keyframe track could hold neither. A design may anchor a
// readout cap to a fill's end (ig07's election figures): the cap is positioned at the
// fill's tip in CSS, so it rides the width tween for free, and its .infographic-bar-num
// counts from 0 to its own figure in step with the growth.
function infographicBarsGrow(target, opts) {
  var fills = document.querySelectorAll(target);
  if (!fills.length) return null;
  var speed = motionSpeed();
  var lead = (opts && opts.lead) || 0;           // the head start the entrance gives this growth
  var grow = 0.9 / speed;                        // one bar's growth time
  var stagger = 0.12 / speed;                    // bars arrive one after another
  var tl = gsap.timeline();
  // Deliberate width tween (not scaleX): scaling would squash the fill's rounded cap. And the
  // fills keep power3.out whatever the entrance ease — a data bar must land exactly on its
  // value, so a back.out overshoot never applies to it (it would read as the wrong figure).
  tl.fromTo(fills,
    { width: '0%' },                             // fromTo = replay-safe (always starts empty)
    {
      width: function (i, bar) { return bar.getAttribute('data-value') + '%'; },
      duration: grow,
      ease: 'power3.out',
      stagger: stagger
    },
    lead                                         // explicit position — the counts below share the clock
  );
  // The readout numbers: a bar's cap counts to its own figure over the same curve and length
  // as the growth, so number and bar land together. infographicStat() reads the real target
  // from data-target (the rebuild keeps it current), never the mid-count text.
  for (var i = 0; i < fills.length; i++) {
    var num = fills[i].querySelector('.infographic-bar-num');
    var stat = infographicStat(num);             // null when the design has no readout caps
    if (!stat) continue;
    (function (el, figure, at) {
      var counter = { value: 0 };                // a plain object GSAP can tween
      tl.set(el, { textContent: '0' + figure.suffix }, 0);  // the zero rule - the first frame, not
                                                 // this bar's turn: a cap emptied at its own
                                                 // stagger slot shows the real figure until then
      tl.to(counter, {
        value: figure.value,
        duration: grow,                          // the bar's exact length — they land together
        ease: 'power3.out',
        onUpdate: function () {
          el.textContent = Math.round(counter.value) + figure.suffix;  // whole numbers read best
        },
        onComplete: function () {
          el.textContent = figure.text;          // restore the exact figure (keeps decimals)
        }
      }, at);
      tl.set(el, { textContent: figure.text }, at + grow);  // the settle rule, at THIS bar's end
    })(num, stat, lead + i * stagger);           // aligned with this bar's stagger slot
  }
  tl.noacgLeadApplied = true;                    // positioned from opts.lead (the zero rule)
  return tl;
}

// infographicRingFill(): the ring draws around the stat while the number counts up with it —
// one measured motion, because both are the same figure. The ring is an SVG circle with
// pathLength="100", so dashoffset 100 = empty and dashoffset (100 - percent) = filled.
function infographicRingFill(target, opts) {
  var ring = document.querySelector(target);
  if (!ring) return null;
  var el = document.getElementById('f0');        // the stat the ring is drawn around
  var stat = infographicStat(el);
  var speed = motionSpeed();
  var lead = (opts && opts.lead) || 0;           // the head start the entrance gives this draw
  var draw = 1.4 / speed;                        // how long the ring takes to come round
  var ease = (opts && opts.ease) || 'power3.out';
  // A ring can only draw 0-100. The NUMBER still counts to the figure they typed — a clamped
  // ring is a drawing limit, not a licence to show a different value than the operator entered.
  var percent = Math.max(0, Math.min(100, stat ? stat.value : 0));

  var tl = gsap.timeline();
  tl.fromTo(ring,
    { strokeDashoffset: 100 },                   // replay-safe: always starts empty
    { strokeDashoffset: 100 - percent, duration: draw, ease: ease },
    lead
  );
  if (stat) {
    var counter = { value: 0 };
    tl.set(el, { textContent: '0' + stat.suffix }, 0);  // the zero rule - the first frame
    tl.to(counter, {
      value: stat.value,
      duration: draw,                            // the same length as the draw — they land together
      ease: ease,
      onUpdate: function () {
        el.textContent = Math.round(counter.value) + stat.suffix;
      },
      onComplete: function () {
        el.textContent = stat.text;
      }
    }, lead);
    tl.set(el, { textContent: stat.text }, lead + draw);  // the settle rule, at the draw's end
  }
  tl.noacgLeadApplied = true;                    // positioned from opts.lead (the zero rule)
  return tl;
}

// infographicGoalRing(): the goal ring's twin of infographicRingFill().
//
// Why it is a SECOND builder rather than a flag on the first: ring-fill draws to the figure in
// #f0, because on a poll or a completion stat that figure IS the percent. A goal meter's #f0 is
// money — €124,213 raised — and the ring's angle is raised/target, a different number entirely.
// Feeding the raised total to ring-fill would clamp it to 100 and draw a full ring at 3% of the
// appeal. So the RING carries its own data-value (the rebuild writes it from both fields) and
// the NUMBER counts to what the operator actually typed. Two values, one motion.
function infographicGoalRing(target, opts) {
  var ring = document.querySelector(target);
  if (!ring) return null;
  var speed = motionSpeed();
  var lead = (opts && opts.lead) || 0;           // the head start the entrance gives this draw
  var draw = 1.4 / speed;                        // how long the ring takes to come round
  var ease = (opts && opts.ease) || 'power3.out';
  // The ring's own percent, written by rebuildInfographic() — never parsed out of #f0.
  var percent = Math.max(0, Math.min(100, parseFloat(ring.getAttribute('data-value')) || 0));

  var tl = gsap.timeline();
  tl.fromTo(ring,
    { strokeDashoffset: 100 },                   // replay-safe: always starts empty
    { strokeDashoffset: 100 - percent, duration: draw, ease: ease },
    lead
  );
  // The headline figure counts to the operator's total over the ring's exact length, so the
  // number lands the moment the ring stops.
  var el = document.getElementById('f0');
  var stat = infographicStat(el);
  if (stat) {
    var counter = { value: 0 };                  // a plain object GSAP can tween
    tl.set(el, { textContent: '0' + stat.suffix }, 0);  // the zero rule - the first frame
    tl.to(counter, {
      value: stat.value,
      duration: draw,                            // the same length as the draw — they land together
      ease: ease,
      onUpdate: function () {
        el.textContent = infographicCountText(Math.round(counter.value), stat);
      },
      onComplete: function () {
        el.textContent = stat.text;              // restore the exact text the rebuild formatted
      }
    }, lead);
    tl.set(el, { textContent: stat.text }, lead + draw);  // the settle rule, at the draw's end
  }
  tl.noacgLeadApplied = true;                    // positioned from opts.lead (the zero rule)
  return tl;
}

// infographicGroupDigits(): 124213 -> "124,213". A money figure counting up without thousand
// separators reads as a different order of magnitude every few frames, so the count formats
// as it goes and the rebuild's exact text is restored at the end.
function infographicGroupDigits(n) {
  return String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
}

// infographicCountText(): one frame of a count, in the notation the figure LANDS in.
//
// THE ONE FORMATTER EVERY COUNT SHARES. Two builders count a headline figure, the stat count
// and the goal ring, and until 2026-09-03 they disagreed: the ring grouped its digits and the
// count did not, so ig05 "Rising Total" ran 8807 → 16041 → 124213 and only put its commas back
// on the final frame, while ig04 "Poll Ring" beside it read correctly. Whether to group is not
// a per-builder taste call, it is the operator's: infographicStat() reads it off their own
// figure, so a grouped total counts grouped and a plain one is left alone.
function infographicCountText(n, stat) {
  return (stat.grouped ? infographicGroupDigits(n) : String(n)) + stat.suffix;
}

// infographicMilestoneRun(): the progress line grows along the milestone track, and each node
// the operator has already passed pops as the line reaches it.
//
// MEASURED for two reasons at once: the line's length is current/last-target (their data), and
// the number of nodes is however many milestones they wrote. The rebuild marks the passed ones
// with .is-reached and writes the fill's data-value; this reads both at play time. A node that
// has NOT been reached is deliberately left alone — it stays in its CSS rest state, because a
// milestone track that animates every node identically stops saying which ones are done.
function infographicMilestoneRun(target, opts) {
  var fill = document.querySelector(target);
  if (!fill) return null;
  var speed = motionSpeed();
  var percent = Math.max(0, Math.min(100, parseFloat(fill.getAttribute('data-value')) || 0));
  var reached = document.querySelectorAll('.infographic-node.is-reached');
  var grow = 1.2 / speed;                        // the line's travel time

  var tl = gsap.timeline();
  // Deliberate width tween (not scaleX): scaling would squash the line's rounded cap and drag
  // the nodes sitting on it out of position.
  tl.fromTo(fill,
    { width: '0%' },                             // fromTo = replay-safe (always starts empty)
    { width: percent + '%', duration: grow, ease: (opts && opts.ease) || 'power3.out' },
    0
  );
  // Each reached node pops as the line passes it: its own position along the track decides
  // when, so the pops track the growth instead of running on a fixed stagger.
  for (var i = 0; i < reached.length; i++) {
    var at = percent > 0 ? Math.min(1, (parseFloat(reached[i].getAttribute('data-at')) || 0) / percent) : 0;
    tl.fromTo(reached[i],
      { scale: 0.6, opacity: 0.35 },
      { scale: 1, opacity: 1, duration: 0.34 / speed, ease: 'back.out(2)' },
      at * grow                                  // the moment the line arrives at this node
    );
  }
  return tl;
}

// infographicRowsCascade(): the rows rise in one after another. The rebuild makes one row per
// line the operator wrote, so the sequence's length is their content — the other thing a
// keyframe model cannot express (there is no fixed number of rows to key).
function infographicRowsCascade(target, opts) {
  var list = document.querySelector(target);
  if (!list) return null;
  var rows = list.children;                      // every direct child is one row
  if (!rows.length) return null;
  var speed = motionSpeed();

  return gsap.fromTo(rows,
    { y: 16, opacity: 0 },                       // fromTo = replay-safe (rows always start hidden)
    {
      y: 0,
      opacity: 1,
      duration: 0.4 / speed,
      ease: (opts && opts.ease) || 'power3.out',
      stagger: 0.08 / speed                      // rows arrive one after another
    }
  );
}`;
