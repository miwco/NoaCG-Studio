// THE BEHAVIOUR SEAM for imported artwork (docs/GRAPHIC_BEHAVIOUR_PLAN.md §12).
//
// WHY THIS FILE EXISTS NOW AND NOT BEFORE. The 2026-08-22 pilot built ONE behaviour, hard-coded,
// and wrote down the reason: "the third behaviour is what would tell us the right abstraction,
// and it does not exist yet" (plan §6). The poll IS that third case - it arrived from a real
// production rather than from a plan - and what it says is narrower and duller than the
// "behaviour registry" the plan deferred:
//
//   * The MACHINE and the BUTTONS were generic before either behaviour existed. Both reuse a
//     catalog type's declaration through `attachMachine`; neither needed a line of new engine.
//   * The BINDING is pickers over the same candidate inventory, twice.
//   * The PAINT is different IN KIND every time, and no interface can flatten that - the quiz
//     turns drawn layers on and off, the poll interpolates a drawn bar between two poses it was
//     never drawn in. A plugin shape that assumed one of those would have excluded the other.
//
// So the abstraction the third case earns is not a registry of behaviours. It is this: ONE
// MODULE INTERFACE, listing the seven things `assembleImportedSvg` needs from a behaviour, with
// one implementation per behaviour and nothing shared but the mechanism they demonstrably share
// (drawnState.ts). svg.ts asks for a bound module and stops caring which one
// it got; each module stays free to paint however its graphic actually behaves.
//
// What is deliberately still NOT here: a way to DECLARE a behaviour from data, a way to combine
// two on one graphic, and any customization of the arc. Those are the north-star questions
// (docs/GOALS.md), and three cases is still not enough to design them against.

import type { SpxField } from '../../model/types';
import type { DesignSvg, DesignSvgBehaviour, DesignSvgPollBehaviour, DesignSvgQuizBehaviour } from '../../model/wizard';
import type { AnimData } from '../../blocks/animData';
import type { GraphicType } from '../types/graphicType';
import {
  behaviourLayerIds as quizLayerIds,
  importedQuizType,
  markQuizLayers,
  quizBehaviourCss,
  quizBehaviourFields,
  quizBehaviourHtml,
  quizBehaviourJs,
  withQuizSteps,
} from './quizBehaviour';
import {
  importedPollType,
  markPollLayers,
  pollBehaviourCss,
  pollBehaviourFields,
  pollBehaviourHtml,
  pollBehaviourJs,
  pollLayerIds,
  withPollSteps,
} from './pollBehaviour';

// The one mechanism they demonstrably share - a layer the designer drew, shown and hidden by the
// machine - lives in `drawnState.ts`, where a behaviour module can use it without importing the
// table that lists the modules.

// ── The module interface ─────────────────────────────────────────────────────────────────────

/**
 * Everything `assembleImportedSvg` needs from a behaviour, with the binding already applied.
 *
 * `from` is the index the behaviour's own fields start at - always the artwork's field count,
 * because the behaviour's fields sit AFTER the artwork's. That order is load-bearing: the type
 * shim mirrors it so a control's payload resolves to the right `fN`.
 */
export interface BoundBehaviour {
  /** Every id the behaviour stamps, so the binder moves a designer's colliding id aside. */
  layerIds: string[];
  /**
   * How many operator fields it adds after the artwork's own.
   *
   * DERIVE IT, NEVER TYPE IT. This number reserves the behaviour's `fN` ids in the binder's
   * `taken` set (svg.ts), which is what moves a designer's colliding layer id aside - an
   * Illustrator file may already carry `id="f5"`, and the rename pass exists because it does.
   * Written by hand it goes stale the moment a behaviour appends a field, and the failure is
   * silent and on air: the artwork layer keeps the id, the hidden holder is emitted with the
   * same one, and `getElementById` hands the runtime the designer's drawing - so the wire's
   * token PAINTS and the runtime reads the designer's text back. Counting the fields the
   * behaviour actually emits is the only version that cannot drift.
   */
  fieldCount: number;
  /** Stamp the picked drawings. Called from the markup bind, while the candidate markers are
   *  still in place - that is what they are for. */
  markLayers(root: Element): void;
  /** The stylesheet part the behaviour needs, or '' for none. */
  css: string;
  fields(from: number): SpxField[];
  /** Hidden holders SPX writes into. Input-only values, never drawn. */
  html(from: number): string;
  js(from: number): string;
  /** The line update() runs after writing the fields, so a data write never erases a state the
   *  machine still holds and a snap recovery repaints from the machine rather than the screen. */
  updateHook: string;
  /** The extra step the arc needs on the DEFAULT PATH - a lifecycle call has to be authored as
   *  data, or SPX's `steps` would say one and stop sending Continue. */
  steps(data: AnimData): AnimData;
  /** The type `attachMachine` compiles onto the finished template. */
  type(svg: DesignSvg): GraphicType;
}

/**
 * The bound module for a binding, or null when the artwork carries no behaviour - which is the
 * ordinary in/out graphic the importer has always produced, and still the common case.
 */
export function boundBehaviour(behaviour: DesignSvgBehaviour | undefined): BoundBehaviour | null {
  if (!behaviour) return null;
  return behaviour.kind === 'quiz' ? quizModule(behaviour) : pollModule(behaviour);
}

function quizModule(quiz: DesignSvgQuizBehaviour): BoundBehaviour {
  return {
    layerIds: quizLayerIds(quiz),
    fieldCount: quizBehaviourFields(quiz, 0).length,
    markLayers: (root) => markQuizLayers(root, quiz),
    css: quizBehaviourCss,
    fields: (from) => quizBehaviourFields(quiz, from),
    html: (from) => quizBehaviourHtml(quiz, from),
    js: (from) => quizBehaviourJs(quiz, from),
    updateHook: `  if (typeof paintQuizState === 'function') paintQuizState();  // the drawn quiz states (below)`,
    steps: withQuizSteps,
    type: (svg) => importedQuizType(svg),
  };
}

function pollModule(poll: DesignSvgPollBehaviour): BoundBehaviour {
  return {
    layerIds: pollLayerIds(poll),
    fieldCount: pollBehaviourFields(0).length,
    markLayers: (root) => markPollLayers(root, poll),
    css: pollBehaviourCss,
    fields: (from) => pollBehaviourFields(from),
    html: (from) => pollBehaviourHtml(from),
    js: (from) => pollBehaviourJs(poll, from),
    updateHook: `  if (typeof paintPollState === 'function') paintPollState();  // the live vote's tally (below)`,
    steps: withPollSteps,
    type: (svg) => importedPollType(svg),
  };
}
