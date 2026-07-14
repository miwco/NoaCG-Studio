// The modular control-panel engine. ONE generator turns any template's SPX DataFields into
// an operator panel — there is no per-template code. A number field becomes a stepper, a
// textarea a line-list editor, an image field a picker, and so on. The same descriptors
// drive both the in-app Control tab (React) and the standalone controlpanel.html export.

import type { SpxField } from '../model/types';
import type { FieldKind } from '../model/fieldModel';
import { slug } from '../export/slug';

/** The kind of control a field gets, decided purely from its ftype. One vocabulary shared
 *  with the video Template Definition (model/fieldModel.ts) so the two never drift. */
export type ControlKind = FieldKind;

export interface ControlDescriptor {
  field: string; // f0, f1, …
  title: string;
  kind: ControlKind;
  /** dropdown options (select kind only). */
  options?: { text: string; value: string }[];
}

/** Map an SPX ftype to a control kind. Hidden/instruction/etc. carry no operator control. */
function kindForField(f: SpxField): ControlKind | null {
  switch (f.ftype) {
    case 'textfield':
      return 'text';
    case 'textarea':
      return 'lines'; // our data-driven fields are line lists (ticker items, credits, schedule…)
    case 'number':
      return 'number';
    case 'filelist':
      return 'image';
    case 'dropdown':
      return 'select';
    case 'checkbox':
      return 'toggle';
    case 'color':
      return 'color';
    default:
      return null; // hidden, instruction, caption, button, divider, spacer
  }
}

/** The operator controls for a template's fields (skips non-data ftypes). */
export function controlsForFields(fields: SpxField[]): ControlDescriptor[] {
  const out: ControlDescriptor[] = [];
  for (const f of fields) {
    const kind = kindForField(f);
    if (!kind) continue;
    out.push({ field: f.field, title: f.title || f.field, kind, options: f.items });
  }
  return out;
}

// ── The control ⇄ graphic message protocol ──────────────────────────────────
// A control panel and the graphic it drives talk over a BroadcastChannel (same browser,
// same origin — local, Era 4). Era 5 swaps the transport for a Supabase Realtime channel
// with the SAME message shape, so nothing above the transport changes.

export type ControlMessage =
  | { t: 'update'; data: Record<string, string> }
  | { t: 'play' }
  | { t: 'stop' }
  | { t: 'next' };

/** The channel name a template's control panel and graphic share (derived from its name). */
export function controlChannelName(templateName: string): string {
  return `spx-control-${slug(templateName)}`;
}
