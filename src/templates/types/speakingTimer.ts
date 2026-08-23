// SPEAKING TIMER — the two-sided clock for a debate, a moderated discussion or a timed panel.
//
// It is the type the catalog did not have. Eighty-one others cover the graphics a show puts on
// screen; none of them covers a contest of TIME between two people, which is a different
// machine from every clock already here: `countdown` holds one clock that runs or is paused,
// and this one holds two that alternate, where starting either implies stopping the other.
//
// It came in from the agent round of 2026-08-22 (benchmarks/agent/rounds/2026-08-22), where a
// debate clock was the novel brief precisely because no category code existed for it, and every
// arm authored a working operator machine from scratch. This is that machine, ratified by the
// owner on 2026-08-23 and re-authored here in the type registry's own vocabulary; the behaviour
// is unchanged from what he approved.
//
// WHY IT PERSISTS A MACHINE (the types/AGENTS.md rule is "only when the derived one is wrong"):
// the derived machine is one linear group, and nothing about a linear walk can express "the
// floor is with A, or with B, or with nobody yet". Three things move independently here and each
// gets its own group, exactly as the scoreboard type argues:
//
//   1. THE FLOOR — who is speaking. Three states, not two: `armed` is the board before anyone
//      has begun and after a reset, which is a real on-air moment (the chair has re-armed the
//      clocks and is waiting for the first speaker) and NOT the same as A holding the floor
//      with the clock stopped.
//   2. THE PENALTY — whether seconds were just docked. Its own group because a penalty happens
//      TO whoever is speaking and changes nothing about who that is; folding it into the floor
//      group would double every floor state.
//   3. The lifecycle, which is the derived main group and carries no authored transitions: a
//      debate board comes on air and stays.
//
// WHICH SIDE IS PENALISED IS NOT A STATE — it is whichever clock is running, which the engine
// already knows. That is the same rule the scoreboard type states about which team scored.

import { paletteById } from '../../model/wizard';
import { dc01 } from '../scoreboards/dc01';
import { DEBATE_FLOOR_FIELDS } from '../scoreboards/debateFloor';
import type { GraphicType } from './graphicType';

export const speakingTimerType: GraphicType = {
  id: 'speaking-timer',
  name: 'Speaking timer',
  description: 'The debating board: two speakers, a clock each, and the floor passing between them.',
  // The name promises a timer, and a chair reading the catalog has to know which timer this is
  // before adapting a brief onto it (src/ai/structuralIntent.ts quotes this verbatim).
  structuralScope:
    'Two speakers or two sides, one clock each, one running at a time, with a per-speaker '
    + 'allowance and a seconds penalty. NOT a panel of three or more, not a single shared '
    + 'countdown (that is the Countdown type), and not a running order.',
  frequency: 2,
  structure: {
    prefix: 'scoreboard',
    category: 'scoreboard',
    parts: [
      { id: 'box', selector: '.scoreboard-box', kind: 'panel', required: true },
      { id: 'accent', selector: '.scoreboard-accent', kind: 'accent', required: true },
      { id: 'railA', selector: '.scoreboard-rail-a', kind: 'accent', required: true },
      { id: 'railB', selector: '.scoreboard-rail-b', kind: 'accent', required: true },
      { id: 'sideA', selector: '.scoreboard-side-a', kind: 'block', required: true },
      { id: 'sideB', selector: '.scoreboard-side-b', kind: 'block', required: true },
      { id: 'penalty', selector: '.scoreboard-penalty', kind: 'block', required: true },
      { id: 'round', selector: '#f0', kind: 'line', required: true },
      { id: 'clockA', selector: '#f5', kind: 'line', required: true },
      { id: 'clockB', selector: '#f6', kind: 'line', required: true },
    ],
  },
  // Declared once, in scoreboards/debateFloor.ts, because the DESIGN has to emit exactly these
  // ids and a second hand-kept copy is how the two come to disagree.
  fields: DEBATE_FLOOR_FIELDS,
  machine: {
    parallel: [
      // ── THE FLOOR ──────────────────────────────────────────────────────────────────────
      // One event, `switch`, from every state: passing the floor is ONE press whatever the
      // board is doing, because a chair mid-debate has no attention to spare for choosing
      // between two buttons. Where it goes is structural — A hands to B, B hands to A, and the
      // armed board hands to A because somebody has to open.
      {
        id: 'floor',
        // ARMED IS THE INITIAL STATE — the one place this machine differs from the round's own,
        // and the owner ratified it on 2026-08-23 against the alternative rendered beside it.
        //
        // The round pointed at `speakerA` and started A's clock from the entrance timeline. A
        // parallel group's initial state is where it RESTS — its timeline never plays at play()
        // — so that gave a board which came up claiming A had the floor with nothing running,
        // and whose first Switch press handed to B. Resting at `armed` says what is actually
        // true when a board goes up during the introductions: both clocks full, nobody
        // speaking. The chair opens the debate with the same Switch press used for every later
        // handover, which is one button to learn rather than two.
        //
        // What it buys, in the owner's terms: a board taken up thirty seconds early costs the
        // first speaker nothing. What it costs: Take alone does not start the debate, so a
        // chair expecting it to has one beat where the board looks inert. That trade was the
        // decision, and it was made on the frames — do not quietly re-point this at `speakerA`
        // because a machine "should" start on air.
        initial: 'armed',
        states: [
          {
            id: 'speakerA',
            name: 'Speaker A speaking',
            timeline: {
              name: 'Floor to A',
              duration: 0.45,
              ease: 'out',
              calls: [{ time: 0, call: 'runSpeakerA' }],
              layers: {
                sideA: { opacity: [{ time: 0, value: 0.62 }, { time: 0.35, value: 1 }] },
                sideB: { opacity: [{ time: 0, value: 1 }, { time: 0.35, value: 0.62 }] },
                railA: {
                  scaleX: [{ time: 0, value: 0.14 }, { time: 0.45, value: 1 }],
                  opacity: [{ time: 0, value: 0.3 }, { time: 0.3, value: 1 }],
                },
                railB: {
                  scaleX: [{ time: 0, value: 1 }, { time: 0.45, value: 0.14 }],
                  opacity: [{ time: 0, value: 1 }, { time: 0.3, value: 0.3 }],
                },
              },
            },
            edges: [
              { from: 'speakerB', to: 'speakerA', trigger: 'operator', event: 'switch' },
              { from: 'armed', to: 'speakerA', trigger: 'operator', event: 'switch' },
            ],
          },
          {
            id: 'speakerB',
            name: 'Speaker B speaking',
            timeline: {
              name: 'Floor to B',
              duration: 0.45,
              ease: 'out',
              calls: [{ time: 0, call: 'runSpeakerB' }],
              layers: {
                sideB: { opacity: [{ time: 0, value: 0.62 }, { time: 0.35, value: 1 }] },
                sideA: { opacity: [{ time: 0, value: 1 }, { time: 0.35, value: 0.62 }] },
                railB: {
                  scaleX: [{ time: 0, value: 0.14 }, { time: 0.45, value: 1 }],
                  opacity: [{ time: 0, value: 0.3 }, { time: 0.3, value: 1 }],
                },
                railA: {
                  scaleX: [{ time: 0, value: 1 }, { time: 0.45, value: 0.14 }],
                  opacity: [{ time: 0, value: 1 }, { time: 0.3, value: 0.3 }],
                },
              },
            },
            edges: [{ from: 'speakerA', to: 'speakerB', trigger: 'operator', event: 'switch' }],
          },
          {
            // ARMED: both clocks at the full allowance, nobody speaking. The self-arrow on
            // `reset` is deliberate — a chair who presses Reset twice must get two resets, not
            // a press that silently does nothing because the board was already armed.
            id: 'armed',
            name: 'Armed',
            timeline: {
              name: 'Arm the clocks',
              duration: 0.3,
              ease: 'in',
              calls: [{ time: 0, call: 'resetClocks' }],
              layers: {
                sideA: { opacity: [{ time: 0, value: 0.62 }, { time: 0.3, value: 1 }] },
                sideB: { opacity: [{ time: 0, value: 0.62 }, { time: 0.3, value: 1 }] },
                railA: { scaleX: [{ time: 0, value: 1 }, { time: 0.3, value: 0.14 }], opacity: [{ time: 0, value: 1 }, { time: 0.3, value: 0.3 }] },
                railB: { scaleX: [{ time: 0, value: 1 }, { time: 0.3, value: 0.14 }], opacity: [{ time: 0, value: 1 }, { time: 0.3, value: 0.3 }] },
              },
            },
            edges: [
              { from: 'speakerA', to: 'armed', trigger: 'operator', event: 'reset' },
              { from: 'speakerB', to: 'armed', trigger: 'operator', event: 'reset' },
              { from: 'armed', to: 'armed', trigger: 'operator', event: 'reset' },
            ],
          },
        ],
      },
      // ── THE PENALTY ────────────────────────────────────────────────────────────────────
      // The badge flashes, then clears ITSELF on a timer: a penalty is an announcement, not a
      // condition the chair has to remember to take down. The self-arrow on `docked` is what
      // makes a second penalty during the first one replay the flash and dock again, instead of
      // being dropped by the structural guard.
      {
        id: 'penalty',
        initial: 'clear',
        states: [
          {
            id: 'clear',
            name: 'No penalty',
            timeline: {
              name: 'Penalty clears',
              duration: 0.3,
              ease: 'out',
              calls: [{ time: 0, call: 'clearPenaltyMark' }],
              layers: { penalty: { opacity: [{ time: 0, value: 1 }, { time: 0.3, value: 0 }] } },
            },
            edges: [{ from: 'docked', to: 'clear', trigger: 'timer', after: 3.2 }],
          },
          {
            id: 'docked',
            name: 'Penalty',
            timeline: {
              name: 'Penalty',
              duration: 0.32,
              ease: 'in',
              calls: [{ time: 0, call: 'applyPenalty' }],
              layers: {
                penalty: {
                  opacity: [{ time: 0, value: 0 }, { time: 0.18, value: 1 }],
                  scale: [{ time: 0, value: 0.82 }, { time: 0.2, value: 1.08 }, { time: 0.32, value: 1 }],
                },
              },
            },
            edges: [
              { from: 'clear', to: 'docked', trigger: 'operator', event: 'penalty' },
              { from: 'docked', to: 'docked', trigger: 'operator', event: 'penalty' },
            ],
          },
        ],
      },
    ],
  },
  controls: [
    { event: 'switch', label: 'Switch speaker', section: 'Floor', order: 1 },
    // Both are marked destructive: each one takes time away that the chair cannot get back
    // with the same button, so a generated control page asks before firing it.
    { event: 'penalty', label: 'Penalty', section: 'Floor', order: 2, destructive: true },
    { event: 'reset', label: 'Reset clocks', section: 'Floor', order: 3, destructive: true },
  ],
  capabilities: {
    maxLines: 5,
    // No mark: the board is already two columns and a centre rule, and nobody has drawn a
    // place for one. The type PERMITS none rather than promising a slot its design lacks.
    logo: 'none',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down'],
    defaultZone: 'bottom-center',
  },
  designs: [
    {
      id: 'dc01',
      logo: 'none',
      name: 'Debate Floor',
      description: 'The debating board: two speakers, two clocks, and the floor passing between them.',
      styleTag: 'minimal',
      palette: paletteById('ivory'),
      fontId: 'inter',
      create: (_type, options) => dc01.create(options),
    },
  ],
};
