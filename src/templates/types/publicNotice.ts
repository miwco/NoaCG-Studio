// PUBLIC NOTICE (two-language) — the type whose states are the LANGUAGE the message is
// currently in.
//
// The same argument as the alert type's severity, one step further: the state is not a pose
// on the way somewhere, it is what the graphic is saying. And unlike severity, the language
// changes BY ITSELF — a viewer who arrives mid-notice has to get their language within a few
// seconds without anybody pressing anything — while still answering to an operator who is
// asked "can you leave the Spanish up".
//
// So: a timed cycle with operator override and a real hold. The cycle is a machine and not a
// looping animation, which is the difference between a graphic you watch and a graphic you
// drive (docs/STATE_MACHINE_SCHEMA.md).
//
// ── Why this one CROSS-FADES where the alert type cuts ───────────────────────────────────
//
// Because the from-pose is knowable here and is not there.
//
// A state's entry timeline applies each track's first keyframe as a hard set at time 0
// (shared/animRuntime.ts). A fade is therefore only honest when every route into the state
// leaves the layers at the same starting values. With four severity levels there are three
// possible predecessors and no single truthful "from", so the alert type cuts. With two
// languages there is exactly one: `language-2` is only ever entered while language 1 is up,
// and `language-1` only ever while language 2 is. The fade is correct by construction, and
// the graph is authored to KEEP it correct — there is deliberately no `language-1` arrow out
// of the entrance, because language 1 is already showing there and re-entering the state
// would blink it out and back.
//
// That guard is structural, so the control page gets it for free: the Language 1 button is
// greyed exactly while language 1 is up, and the greying is the truth rather than a rule
// somebody remembered to mirror.
//
// ── Why there are TWO hold states ────────────────────────────────────────────────────────
//
// Holding has to remember which language it froze, or resuming cannot know which one to fade
// to — and a wrong guess is the blink the whole design is arranged to avoid. `hold-1` and
// `hold-2` are pose-only states (entering them plays nothing, which is exactly what "hold"
// means), and each resumes into the OTHER language. Both are driven by the same two events,
// so the operator still sees exactly two buttons: Hold and Resume.
//
// (The state ids read `language-1` / `language-2`, but the EVENTS are `lang1` / `lang2`: an
// operator event has to be a bare JS identifier, because the runtime resolves it without an
// expression evaluator, and the shape gate enforces that. The labels an operator actually
// reads come from `controls` below, so nothing hyphenated is lost.)

import { paletteById } from '../../model/wizard';
import { pi08 } from '../publicInfo/pi08';
import { pi09 } from '../publicInfo/pi09';
import type { GraphicType, TypeBranch, TypeTimeline } from './graphicType';

/** How long each language holds before the other takes over (speed-relative seconds).
 *  Long enough to read two lines of prose, short enough that a viewer who arrives on the
 *  wrong language does not give up. */
const HOLD = 7;

/** The cross-fade between the two languages. `to` is the language arriving. */
function swapTimeline(to: 1 | 2): TypeTimeline {
  const arriving = to === 1 ? 'lang1' : 'lang2';
  const leaving = to === 1 ? 'lang2' : 'lang1';
  return {
    name: `Language ${to}`,
    duration: 0.5,
    ease: 'out',
    layers: {
      // The leaving language goes first and a touch faster, so the two are never both at
      // half opacity over each other — overlapping translations are unreadable.
      [leaving]: {
        opacity: [
          { time: 0, value: 1 },
          { time: 0.22, value: 0 },
        ],
      },
      [arriving]: {
        opacity: [
          { time: 0, value: 0 },
          { time: 0.22, value: 0 },
          { time: 0.5, value: 1 },
        ],
      },
    },
  };
}

const branches: TypeBranch[] = [
  {
    id: 'language-2',
    name: 'Language 2',
    timeline: swapTimeline(2),
    edges: [
      // The cycle: language 1 is up when the graphic arrives, so the first swap is timed off
      // the entrance itself.
      { from: { waypoint: 0 }, to: 'language-2', trigger: 'timer', after: HOLD },
      { from: 'language-1', to: 'language-2', trigger: 'timer', after: HOLD },
      // Operator override — legal only where language 2 is NOT already up.
      { from: { waypoint: 0 }, to: 'language-2', trigger: 'operator', event: 'lang2' },
      { from: 'language-1', to: 'language-2', trigger: 'operator', event: 'lang2' },
      // Resuming from a hold always moves to the language that was NOT frozen.
      { from: 'hold-1', to: 'language-2', trigger: 'operator', event: 'resume' },
    ],
  },
  {
    id: 'language-1',
    name: 'Language 1',
    timeline: swapTimeline(1),
    edges: [
      { from: 'language-2', to: 'language-1', trigger: 'timer', after: HOLD },
      { from: 'language-2', to: 'language-1', trigger: 'operator', event: 'lang1' },
      { from: 'hold-2', to: 'language-1', trigger: 'operator', event: 'resume' },
    ],
  },
  {
    // Pose-only: entering plays nothing, so whatever language is up stays up. The machine
    // cancels the armed timer on the way out of the cycling state and nothing re-arms it —
    // which IS the hold.
    id: 'hold-1',
    name: 'Holding language 1',
    timeline: null,
    edges: [
      { from: { waypoint: 0 }, to: 'hold-1', trigger: 'operator', event: 'hold' },
      { from: 'language-1', to: 'hold-1', trigger: 'operator', event: 'hold' },
    ],
  },
  {
    id: 'hold-2',
    name: 'Holding language 2',
    timeline: null,
    edges: [{ from: 'language-2', to: 'hold-2', trigger: 'operator', event: 'hold' }],
  },
];

export const publicNoticeType: GraphicType = {
  id: 'public-notice',
  name: 'Two-language notice',
  description: 'A public notice that alternates between two languages on its own timer.',
  structure: {
    prefix: 'public-info',
    category: 'public-info',
    parts: [
      { id: 'box', selector: '.public-info-box', kind: 'panel', required: true },
      { id: 'lang1', selector: '.public-info-lang-1', kind: 'block', required: true },
      { id: 'lang2', selector: '.public-info-lang-2', kind: 'block', required: true },
    ],
  },
  fields: [
    { key: 'heading1', label: 'Heading (language 1)', kind: 'text', value: 'Public notice', role: 'line' },
    { key: 'notice1', label: 'Notice (language 1)', kind: 'text', value: 'The ferry terminal closes at 22:00 tonight for maintenance.', role: 'line' },
    { key: 'heading2', label: 'Heading (language 2)', kind: 'text', value: 'Yleinen tiedote', role: 'line' },
    { key: 'notice2', label: 'Notice (language 2)', kind: 'text', value: 'Lauttaterminaali suljetaan tänään klo 22.00 huoltotöiden vuoksi.', role: 'line' },
    { key: 'source', label: 'Issued by', kind: 'text', value: 'Port Authority', role: 'line' },
  ],
  machine: { main: { branches } },
  controls: [
    { event: 'lang1', label: 'Language 1', section: 'Language', order: 1 },
    { event: 'lang2', label: 'Language 2', section: 'Language', order: 2 },
    { event: 'hold', label: 'Hold', section: 'Language', order: 3 },
    { event: 'resume', label: 'Resume', section: 'Language', order: 4 },
  ],
  capabilities: {
    maxLines: 5,
    logo: 'none',
    animationPresets: ['fade', 'slide-up', 'blur-in'],
    defaultZone: 'bottom-center',
  },
  designs: [
    {
      id: 'pi08',
      name: 'Language Rotator',
      description: 'One notice, two languages taking turns in one block — timed, and holdable on air.',
      styleTag: 'noacg',
      palette: paletteById('noacg'),
      fontId: 'space-grotesk',
      create: (_type, options) => pi08.create(options),
    },
    {
      id: 'pi09',
      name: 'Notice Rotator',
      description: 'A plain two-language notice whose languages take turns — timed, and holdable.',
      styleTag: 'minimal',
      palette: paletteById('ivory'),
      fontId: 'inter',
      samples: {
        heading1: 'Voting information',
        notice1: 'Polling stations are open until 20:00. Bring photo identification.',
        heading2: 'Información electoral',
        notice2: 'Los colegios electorales abren hasta las 20:00. Traiga identificación con foto.',
        source: 'Electoral Commission',
      },
      animationPresets: ['fade', 'slide-up', 'mask-wipe', 'blur-in'],
      create: (_type, options) => pi09.create(options),
    },
  ],
};
