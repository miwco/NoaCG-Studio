// The ONE "appears on press" transition — shared by every surface that changes when a part
// appears (the timeline's layer-block drag and its gutter menu, the canvas selection chip).
// Pure: takes the template, returns the patch (or null when the change is a no-op).
// Keeping the decision tree here means the canvas and the timeline can never drift apart on
// what an assign/unassign/move actually writes.
//
// Phase 8: this used to carry three code paths — two legacy re-emits and a literal array patch.
// A press is now just data (a step's `reveals`), so there is ONE path, and it is a data edit.

import type { SpxTemplate } from '../model/types';
import type { TemplatePart } from '../model/structure';
import { parseAnimData, spliceAnimData } from './animData';
import { setLayerActivation } from './animEdit';
import { replaceDefinitionInHtml } from '../model/spxDefinition';

export interface PressChange {
  /** The template fields to apply (spread over the current template). */
  patch: Pick<SpxTemplate, 'js' | 'html' | 'settings'>;
  /** The » press whose segment should be revealed after the apply (null: none — e.g. the
   *  part went back to the entrance). */
  destStep: number | null;
  /** How many » presses the chain has AFTER the change (0 = steps turned off). */
  stepsAfter: number;
}

/**
 * Change WHEN a part appears. Press indices are 0-based; -1 means "appears with ▶ Play" (the
 * entrance). The press chain is the middle steps' `reveals` lists: moving between presses
 * carries the layer's tuned reveal keyframes, entering or leaving the press world writes the
 * channel's default motion, and an emptied press disappears (blocks/animEdit setLayerActivation).
 * The SPX `steps` setting stays DERIVED from the step count, as everywhere else.
 */
export function changePartPress(
  template: SpxTemplate,
  parts: TemplatePart[],
  selector: string,
  fromPress: number,
  toPress: number,
): PressChange | null {
  if (toPress === fromPress) return null;
  const data = parseAnimData(template.js);
  if (!data) return null; // a legacy region is read-only (Phase 8) — nothing to write

  const channel = parts.find((p) => p.selector === selector)?.channel ?? 'rise';
  const next = setLayerActivation(data, selector, toPress, channel);
  if (!next) return null;
  const js = spliceAnimData(template.js, next);
  if (!js) return null;

  const settings = { ...template.settings, steps: String(next.steps.length - 1) };
  const html = replaceDefinitionInHtml(template.html, settings, template.fields);
  const pressesAfter = next.steps.length - 2;
  return {
    patch: { js, html, settings },
    destStep: toPress === -1 ? null : Math.min(toPress, pressesAfter - 1),
    stepsAfter: pressesAfter,
  };
}
