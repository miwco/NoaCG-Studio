// dc01 "Debate Floor" — the two-speaker speaking clock, and the first design of the
// speaking-timer type (types/speakingTimer.ts).
//
// It is a scoreboard in the sense this assembler means: a strip that says where the contest
// stands. What it says is not a score but WHO HAS THE FLOOR and how much of their allowance is
// left — so it runs two clocks, alternating, and brings its own engine (debateFloor.ts) instead
// of the shared single match clock.
//
// THE TWO SIDES ARE STRUCTURALLY EQUAL, and that is the design's one non-negotiable. The
// columns are `flex: 1 1 0`, so PROPOSITION and OPPOSITION get exactly half the board each
// whatever their speakers are called; a long name wraps inside its own half rather than
// borrowing width from the other. That is the owner's ruling on two-sided boards, written down
// on 2026-08-23 after a scoreboard sized itself by the longer team name
// (benchmarks/agent/rounds/2026-08-22/VERDICT.md).

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { NUMERIC_FIGURES } from '../shared/numerals';
import { defineScoreboardVariant } from './shared';
import { debateFloorRuntimeJs, debateFloorSpxFields } from './debateFloor';

export const dc01: TemplateVariant = defineScoreboardVariant(
  {
    id: 'dc01',
    category: 'scoreboard',
    name: 'Debate Floor',
    styleTag: 'minimal',
    description: 'The debating board: two speakers, two clocks, and the floor passing between them.',
    // The five text lines the wizard offers: the round, and each side's label and speaker.
    maxLines: 5,
    suggestedLines: [
      { title: 'Round label', sample: 'OPENING STATEMENTS' },
      { title: 'Side A', sample: 'PROPOSITION' },
      { title: 'Speaker A', sample: 'MAYA OKONKWO' },
      { title: 'Side B', sample: 'OPPOSITION' },
      { title: 'Speaker B', sample: 'LUCAS BERG' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Debate Floor',
    description:
      'The two-speaker debating board: a round label over two equal halves, each with its ' +
      'side, its speaker and its own clock. The floor passes with one press — the running ' +
      'clock takes the accent, the other stops exactly where it was — and a penalty docks ' +
      'seconds from whoever is speaking without stopping them.',
    uicolor: '5',
  },
  (o) => ({
    // A BOARD, not a strip: it is on air all evening with different names in it, so it holds
    // one width and the text fits inside (see stageWidth below).
    stageWidth: 1320,
    // Nothing pops. A score bump is a number arriving; here the numbers are a countdown the
    // engine repaints four times a second, and popping that would be a permanent twitch.
    popFields: [],
    // The masked lines the entrance choreographs: #f0…#f8, every field with a visible span.
    // #f9 (the penalty size) is input-only and lives in a hidden holder, so it is not one.
    lineCount: 9,
    hasAccent: true,
    fields: debateFloorSpxFields(),
    matchClock: false,          // this board runs its own two clocks — see debateFloor.ts
    runtimeExtraJs: `${debateFloorRuntimeJs()}
// A retyped clock, a resend of the cue's own allowance and the wire's origin-stamped running
// time all arrive through update(), and the engine tells them apart per FIELD — so this board
// needs no rebuildScoreboard() hook; speakingClockUpdate() is the one it answers.

// This one runs when the board goes off air. Nobody holds the floor once the graphic is down,
// and the tick must not outlive the thing it paints.
function boardOffAir() { holdClocks(); }
`,
    html: `    <!-- Debate Floor: round label over two EQUAL halves, each with a side, a speaker and a clock. -->
    <div class="scoreboard-box">
      <!-- The round: what is being spoken, and how long each speaker gets. -->
      <div class="scoreboard-head">
        <!-- The pip travels WITH the label: one flex item, so a round title that wraps to two
             rows does not leave the mark stranded at the far edge of the board. -->
        <div class="scoreboard-roundgroup">
          <span class="scoreboard-pip"></span>
          <div class="scoreboard-mask"><span id="f0" class="scoreboard-round">${o.lines[0]?.sample || 'OPENING STATEMENTS'}</span></div>
        </div>
        <!-- The allowance chip — the figure the clocks reset TO, so the audience reads the
             same number the chair typed and nobody has to be told what Reset will do. -->
        <div class="scoreboard-allowance">
          <div class="scoreboard-mask"><span id="f7" class="scoreboard-allowance-time" data-speaking="allowance">05:00</span></div>
          <div class="scoreboard-mask"><span id="f8" class="scoreboard-allowance-word">EACH</span></div>
        </div>
      </div>

      <div class="scoreboard-body">
        <!-- Side A. The rail above the column is the floor marker: it grows for whoever is
             speaking and shrinks back for whoever is not. -->
        <div class="scoreboard-side scoreboard-side-a">
          <div class="scoreboard-rail scoreboard-rail-a"></div>
          <div class="scoreboard-mask"><span id="f1" class="scoreboard-role">${o.lines[1]?.sample || 'PROPOSITION'}</span></div>
          <div class="scoreboard-mask"><span id="f2" class="scoreboard-name">${o.lines[2]?.sample || 'MAYA OKONKWO'}</span></div>
          <!-- data-speaking is the wire's whole contract for a two-clock board: it is how
               control/matchClockWire.ts finds these clocks without knowing anything about the
               type registry or the machine. -->
          <div class="scoreboard-mask"><span id="f5" class="scoreboard-time" data-speaking="a">05:00</span></div>
        </div>

        <!-- The centre line, and the penalty badge that flashes on it. -->
        <div class="scoreboard-split">
          <span class="scoreboard-penalty">-10</span>
        </div>

        <div class="scoreboard-side scoreboard-side-b">
          <div class="scoreboard-rail scoreboard-rail-b"></div>
          <div class="scoreboard-mask"><span id="f3" class="scoreboard-role">${o.lines[3]?.sample || 'OPPOSITION'}</span></div>
          <div class="scoreboard-mask"><span id="f4" class="scoreboard-name">${o.lines[4]?.sample || 'LUCAS BERG'}</span></div>
          <div class="scoreboard-mask"><span id="f6" class="scoreboard-time" data-speaking="b">05:00</span></div>
        </div>
      </div>
    </div>

    <!-- The accent rule under the board — the type's required accent part, drawn in first. -->
    <div class="scoreboard-accent"></div>

    <!-- Input only: how many seconds one penalty costs. Nothing paints it. -->
    <div id="f9" class="noacg-data-source" data-speaking="penalty">10</div>`,
    css: `/* The board itself — a flat panel, no blur: a school hall's camera has enough to do. */
.scoreboard {
  /* A PENALTY IS A SEMANTIC COLOUR, not a palette one. It has to read as "seconds were taken
     away" in every palette this design can be retinted into, so it is declared here on the
     design's own root rather than mixed from --accent, exactly as the alert levels are
     (templates/alerts/shared.ts). It is scoped to .scoreboard, never to :root, because the
     :root contract is the Style panel's and this is not one of its knobs. */
  --penalty-color: #ff5b52;
  /* One hairline weight, mixed from the text colour so it follows a retint. */
  --debate-hairline: color-mix(in srgb, var(--text-color) 16%, transparent);
}

.scoreboard-box {
  padding: calc(24px * var(--scale)) calc(44px * var(--scale)) calc(30px * var(--scale));
  background: var(--panel-bg);     /* the one panel behind everything */
  display: flex;
  flex-direction: column;
}

/* ── The round line ───────────────────────────────────────────────────────── */
/* Spacing is MARGINS, not flex \`gap\`: an older playout engine drops the gap declaration
   outright and the head would come up with everything touching. */
.scoreboard-head {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;                 /* a long round label takes a second row rather than pushing */
  margin-bottom: calc(12px * var(--scale));
  max-width: 100%;
}

.scoreboard-head > * {
  margin: calc(5px * var(--scale)) calc(9px * var(--scale));
}

.scoreboard-roundgroup {
  display: flex;
  align-items: center;
  min-width: 0;                    /* let the label wrap inside the group rather than push it */
}

/* The pip — a small turned square, the board's one drawn mark. */
.scoreboard-pip {
  flex: none;
  width: calc(12px * var(--scale));
  height: calc(12px * var(--scale));
  margin-right: calc(14px * var(--scale));
  background: var(--accent);
  transform: rotate(45deg);
}

.scoreboard-round {
  font-size: calc(26px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: 0.2em;           /* tracked wide — it reads as a label, not a headline */
  text-transform: uppercase;
  color: var(--text-dim);
  max-width: calc(760px * var(--scale));
  /* LEFT, against the centred head, because the pip is the label's left anchor. A long motion
     that reaches the max-width above would otherwise centre itself inside a full-width box and
     drift away from the mark, leaving the pip stranded at the edge of the board. A short label
     shrinks to its own text, so the two read as one lockup either way. */
  text-align: left;
}

/* CENTRED, not baseline-aligned, and that is a real CSS trap rather than a taste call: a block
   with \`overflow: hidden\` — which every .scoreboard-mask is, so the presets can slide their
   lines in from behind one — synthesizes its baseline from its BOTTOM MARGIN EDGE instead of
   from the text inside it. Two masks of different type sizes therefore line up bottom-edge to
   bottom-edge, which drops the smaller word below the chip's border and clips it. Centring the
   two masks is immune to that, because it never asks either box for a baseline. */
.scoreboard-allowance {
  display: flex;
  align-items: center;
  padding: calc(4px * var(--scale)) calc(14px * var(--scale)) calc(6px * var(--scale));
  border: calc(2px * var(--scale)) solid var(--debate-hairline);
  max-width: 100%;
}

.scoreboard-allowance .scoreboard-mask + .scoreboard-mask {
  margin-left: calc(8px * var(--scale));
}

/* The second half of the same trap. The assembler makes every masked line an inline-block, and
   an inline-block sits on its line's BASELINE — so the mask's own strut (inherited font size,
   not the span's) pushes a smaller word down inside a box sized to the word, and \`overflow:
   hidden\` then cuts the descenders off. \`vertical-align: top\` puts the span at the top of its
   line box instead, where the mask's height already is. */
.scoreboard-allowance .scoreboard-mask > span {
  vertical-align: top;
}

.scoreboard-allowance-time {
  ${NUMERIC_FIGURES}
  font-size: calc(26px * var(--scale) * var(--type-scale));
  font-weight: 700;
  color: var(--text-color);
}

.scoreboard-allowance-word {
  font-size: calc(24px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* ── The two sides ────────────────────────────────────────────────────────── */
.scoreboard-body {
  display: flex;
  align-items: stretch;
}

/* \`flex: 1 1 0\` — not \`1 1 auto\` and not a basis in px. The halves are equal because the
   basis is ZERO for both, so neither speaker's name can buy width from the other; \`min-width: 0\`
   is what lets a long name actually wrap inside its own half instead of forcing the column
   wider (a flex item's default min-width is its content). */
.scoreboard-side {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  /* The whole column agrees: side, speaker and clock all read from the same edge. Without this
     a wrapped speaker name centres itself (the head's alignment is inherited) while the label
     above and the clock below stay flush, and the half reads as three loose parts. */
  text-align: left;
  padding-top: calc(16px * var(--scale));
}

.scoreboard-side .scoreboard-mask + .scoreboard-mask {
  margin-top: calc(6px * var(--scale));
}

/* Side B mirrors: the two halves read outward from the centre line. */
.scoreboard-side-b {
  align-items: flex-end;
  text-align: right;
}

/* The floor marker. It rests at a stub and grows to full width for whoever is speaking — the
   machine's floor group animates scaleX, so the board says who has the floor without a word. */
.scoreboard-rail {
  width: 100%;
  height: calc(6px * var(--scale));
  margin-bottom: calc(12px * var(--scale));
  background: var(--accent);
  transform-origin: left center;
  transform: scaleX(0.14);
  opacity: 0.3;
}

.scoreboard-rail-b { transform-origin: right center; }

.scoreboard-role {
  font-size: calc(25px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.scoreboard-name {
  font-size: calc(46px * var(--scale) * var(--type-scale));
  font-weight: 700;
  line-height: 1.06;
  letter-spacing: -0.005em;
}

/* The clocks. Tabular figures so the half does not twitch four times a second, and the colour
   is set by the engine (accent while running, --penalty-color when docked or spent). */
.scoreboard-time {
  ${NUMERIC_FIGURES}
  /* The tight leading below means the mask hides ~3px of the line box's descent space, which the
     overflow sweep records as a self-clip — correctly, and by design here: this mask only ever
     holds digits and a colon, none of which put ink below the baseline. The reveal masks are
     what the sweep's own header calls the by-design case, and the row is in its baseline. */
  font-size: calc(96px * var(--scale) * var(--type-scale));
  font-weight: 700;
  line-height: 1.04;
  color: var(--text-color);
  transition: color 0.2s linear;
}

/* ── The centre ───────────────────────────────────────────────────────────── */
.scoreboard-split {
  position: relative;
  flex: none;                      /* the divider is a fixed rule — it never takes half's width */
  width: calc(3px * var(--scale));
  margin: 0 calc(44px * var(--scale));
  background: var(--debate-hairline);
}

/* The penalty badge — the machine's penalty group flashes it on the centre line, so it belongs
   to neither side while naming what just happened to one of them. */
.scoreboard-penalty {
  position: absolute;
  top: calc(96px * var(--scale));
  left: 50%;
  transform: translateX(-50%);
  padding: calc(6px * var(--scale)) calc(18px * var(--scale));
  border: calc(2px * var(--scale)) solid var(--penalty-color);
  border-radius: calc(999px * var(--scale));
  background: var(--panel-bg);
  ${NUMERIC_FIGURES}
  font-size: calc(30px * var(--scale) * var(--type-scale));
  font-weight: 700;
  color: var(--penalty-color);
  white-space: nowrap;
  opacity: 0;                      /* the penalty group fades it in and back out */
}

/* The accent rule under the whole board — the line-reveal preset draws this in first. */
.scoreboard-accent {
  width: 100%;
  height: calc(7px * var(--scale));
  background: var(--accent);
  transform-origin: left center;
}
`,
  }),
);
