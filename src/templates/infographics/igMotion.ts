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
    suffix: text.replace(/^\\s*[-+]?[0-9.,]+/, '') // what follows the number: '%', ' pts'…
  };
}

// infographicCountUp(): the headline number rolls from zero up to the operator's figure. The
// target is their data, so it cannot be a keyframe — it is read here, at play time. A design
// that pairs a progress bar with the stat grows it once the number lands.
function infographicCountUp(target, opts) {
  var el = document.querySelector(target);
  var stat = infographicStat(el);
  if (!stat) return null;
  var speed = motionSpeed();
  var counter = { value: 0 };                    // a plain object GSAP can tween

  var tl = gsap.timeline();
  tl.set(el, { textContent: '0' + stat.suffix });
  tl.to(counter, {
    value: stat.value,
    duration: 1.6 / speed,
    ease: (opts && opts.ease) || 'expo.out',
    onUpdate: function () {
      el.textContent = Math.round(counter.value) + stat.suffix;  // whole numbers read best
    },
    onComplete: function () {
      el.textContent = stat.text;                // restore the exact text (keeps decimals)
    }
  });

  var bars = infographicBarsGrow('.infographic-bar-fill', opts);  // harmless when there are none
  if (bars) tl.add(bars);                        // the bar fills once the figure has landed
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
    0                                            // explicit position — the counts below share the clock
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
      tl.set(el, { textContent: '0' + figure.suffix }, at);
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
    })(num, stat, i * stagger);                  // aligned with this bar's stagger slot
  }
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
  var ease = (opts && opts.ease) || 'power3.out';
  // A ring can only draw 0-100. The NUMBER still counts to the figure they typed — a clamped
  // ring is a drawing limit, not a licence to show a different value than the operator entered.
  var percent = Math.max(0, Math.min(100, stat ? stat.value : 0));

  var tl = gsap.timeline();
  tl.fromTo(ring,
    { strokeDashoffset: 100 },                   // replay-safe: always starts empty
    { strokeDashoffset: 100 - percent, duration: 1.4 / speed, ease: ease },
    0
  );
  if (stat) {
    var counter = { value: 0 };
    tl.set(el, { textContent: '0' + stat.suffix }, 0);
    tl.to(counter, {
      value: stat.value,
      duration: 1.4 / speed,                     // the same length as the draw — they land together
      ease: ease,
      onUpdate: function () {
        el.textContent = Math.round(counter.value) + stat.suffix;
      },
      onComplete: function () {
        el.textContent = stat.text;
      }
    }, 0);
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
