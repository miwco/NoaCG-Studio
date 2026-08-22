// The modular control-panel engine. ONE generator turns any template's SPX DataFields into
// field descriptors (model/fieldModel.ts) — there is no per-template code. A number field
// becomes a stepper, a textarea a line list, an image field a picker, and so on. The same
// descriptors drive every surface that edits a field: the in-app Data and Control panels
// (through the shared components/fields control), and the standalone controlpanel.html export.

import type { SpxField } from '../model/types';
import type { FieldDescriptor, FieldKind } from '../model/fieldModel';
import { parseAnimData } from '../blocks/animData';
import { deriveMachine, machineControls, type ControlButton } from '../blocks/animMachine';
import { slug } from '../export/slug';

/** Map an SPX ftype to a control kind. The non-data ftypes carry no control at all.
 *  Exported for the OGraf exporter, which records the kind as a per-property vendor hint so
 *  the standard's 3-way type collapse (string/number/boolean) can be undone on the way back
 *  (control/ografContract.ts) - one mapping, read from both directions. */
export function kindForField(f: SpxField): FieldKind | null {
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
    // An input-only value (a countdown's duration). SPX hides it from the operator, but the
    // Data panel still edits it — see includeHidden below.
    case 'hidden':
      return 'text';
    default:
      return null; // instruction, caption, button, divider, spacer
  }
}

/**
 * The descriptors for a template's editable fields.
 *
 * `includeHidden` is what separates the two SPX surfaces: the operator panels (the Control tab
 * and the exported controlpanel.html) show what SPX shows and so skip `hidden` fields, while
 * the Data panel edits them too — a hidden field carries a real input value (a countdown's
 * duration) that has to be testable in the editor.
 */
export function fieldDescriptors(
  fields: SpxField[],
  { includeHidden = false }: { includeHidden?: boolean } = {},
): FieldDescriptor[] {
  const out: FieldDescriptor[] = [];
  for (const f of fields) {
    if (f.ftype === 'hidden' && !includeHidden) continue;
    const kind = kindForField(f);
    if (!kind) continue;
    out.push({
      key: f.field,
      label: f.title || f.field,
      kind,
      defaultValue: f.value, // the definition default — the per-field Reset target
      options: f.items?.map((it) => ({ label: it.text, value: it.value })),
    });
  }
  return out;
}

// ── Event buttons (Phase 5) ─────────────────────────────────────────────────
// The state machine's side of the panel: every authored operator event renders as a button
// (blocks/animMachine.ts machineControls — labels/sections/payloads come from the machine's
// own `controls` metadata, so the list travels inside the template). Only an EXPLICIT
// machine offers buttons: the derived linear machine's one event is `next`, which the
// lifecycle row already carries.

export type { ControlButton } from '../blocks/animMachine';

/** The event buttons a template's control surfaces render (empty without an explicit machine). */
export function eventButtons(js: string): ControlButton[] {
  const machine = parseAnimData(js)?.machine;
  return machine ? machineControls(machine) : [];
}

/**
 * The buttons grouped by their author-declared SECTION, in first-seen order, with everything
 * undeclared under "Actions".
 *
 * Shared because it decides what an operator sees: the in-app page grouped and the hosted page
 * rendered one flat wall of buttons, so a quiz's eight actions arrived unsorted on the smallest
 * screen of the three. Grouping is the author's own metadata (`machine.controls`) and belongs to
 * every surface that draws the buttons.
 */
export function controlSections(buttons: ControlButton[]): [string, ControlButton[]][] {
  const sections: [string, ControlButton[]][] = [];
  for (const b of buttons) {
    const key = b.section ?? 'Actions';
    const bucket = sections.find(([s]) => s === key);
    if (bucket) bucket[1].push(b);
    else sections.push([key, [b]]);
  }
  return sections;
}

/** One group's states, for the recovery snap picker: every state is enterable by SNAP by
 *  design (recovery, emergency jumps), so the list is the whole group, worn with the state
 *  NAMES the author gave them. Empty without an explicit machine — same gate as the buttons:
 *  on a plain linear template the picker would only duplicate ▶/»/■. */
export interface MachineStateGroup {
  id: string;
  states: { id: string; name: string }[];
}

/** The machine's groups and states, for surfaces that offer a snap-to-state control. */
export function machineStateGroups(js: string): MachineStateGroup[] {
  const machine = parseAnimData(js)?.machine;
  if (!machine) return [];
  return machine.groups.map((g) => ({
    id: g.id,
    states: g.states.map((s) => ({ id: s.id, name: s.name ?? s.id })),
  }));
}

/**
 * Every state's NAME, by group then by state id — what a surface needs to say where the
 * graphic is in words.
 *
 * Deliberately not `machineStateGroups` above: that one is the SNAP PICKER's list and is
 * empty without an explicit machine on purpose (a plain linear template's picker would only
 * duplicate ▶/»/■). Naming is the opposite question — a lower third's `enter` should read
 * "Enter" exactly as a quiz's `sealed` should read "Locked, choice hidden" — so this falls
 * back to the DERIVED machine, which names its states after the steps. Nothing is fetched:
 * the names travel inside the template's own data block.
 */
export function machineStateNames(js: string): Record<string, Record<string, string>> {
  const data = parseAnimData(js);
  if (!data) return {};
  const machine = data.machine ?? deriveMachine(data);
  const out: Record<string, Record<string, string>> = {};
  for (const group of machine.groups) {
    const names: Record<string, string> = {};
    for (const s of group.states) names[s.id] = s.name ?? s.id;
    out[group.id] = names;
  }
  return out;
}

/**
 * The graphic's current state as one operator-readable line, or null before it has answered.
 *
 * THE STATE CHIP IS THE FACT EVERY GREYED BUTTON IS JUDGED AGAINST, so it is the one string on
 * an operator surface that has to read as English. The runtime reports state IDS
 * (`noacgMachineState()` keys pointers by id), and three surfaces used to print them raw -
 * "sealed", "main:enter · clock:running" - from two hand-rolled copies of this map. Ids are
 * the author's vocabulary; an operator has seen only the names.
 *
 * One group prints its state alone; several prefix the GROUP id, because with a clock and a
 * flag and a walk running at once the name by itself does not say which of them moved.
 */
export function formatMachineState(
  names: Record<string, Record<string, string>>,
  state: { groups?: Record<string, string> } | null | undefined,
): string | null {
  // `state` is whatever the GRAPHIC's own noacgMachineState() returned, and an emitted or
  // imported template may hand-write that function with a shape of its own - the 2026-08-19
  // drive proof found one returning `{ stepsPlayed: 1 }`, which crashed this formatter and
  // painted the whole control page white. A shape this surface does not know reads as "the
  // graphic has not answered", never as a crash.
  if (!state || !state.groups) return null;
  const entries = Object.entries(state.groups);
  if (entries.length === 0) return null;
  return entries
    .map(([groupId, stateId]) => {
      const name = names[groupId]?.[stateId] ?? stateId;
      return entries.length > 1 ? `${groupId}: ${name}` : name;
    })
    .join(' · ');
}

/** Which states each event fires from, per group — a control surface greys a button the
 *  machine would drop (the same structural guard, precomputed so no graph code ships). */
export function eventLegality(js: string): Record<string, Record<string, string[]>> {
  const machine = parseAnimData(js)?.machine;
  const legal: Record<string, Record<string, string[]>> = {};
  if (!machine) return legal;
  for (const group of machine.groups) {
    for (const t of group.transitions) {
      if (t.trigger !== 'operator' || !t.event) continue;
      const perGroup = (legal[t.event] ??= {});
      (perGroup[group.id] ??= []).push(t.from);
    }
  }
  return legal;
}

/**
 * Would this event fire RIGHT NOW? The structural guard, asked from outside the graphic: an
 * event is legal when some group's current state has an arrow carrying it. `state` null means
 * nothing has reported yet — treat every button as live rather than greying the whole panel
 * out on a graphic that simply has not answered.
 *
 * Every surface that shows event buttons asks THIS, so the editor's strip and a hosted
 * control page can never disagree about what an operator may press. (controlPanelHtml.ts
 * keeps its own inline copy: it ships dependency-free vanilla JS and is the one deliberate
 * second renderer.)
 */
export function isEventLegal(
  legality: Record<string, Record<string, string[]>>,
  event: string,
  state: { groups?: Record<string, string> } | null | undefined,
): boolean {
  // A state without `groups` (a template's own hand-written noacgMachineState) is treated
  // exactly like no answer yet - every button live, the structural guard decides.
  if (!state || !state.groups) return true;
  const groups = state.groups;
  const perGroup = legality[event];
  if (!perGroup) return false;
  return Object.entries(perGroup).some(([groupId, froms]) => froms.includes(groups[groupId]));
}

// ── The control ⇄ graphic message protocol ──────────────────────────────────
// A control panel and the graphic it drives talk over a BroadcastChannel (same browser,
// same origin — local, Era 4). Era 5.3 added a Supabase Realtime transport with the SAME
// message shape, so nothing above the transport changes. Phase 5 adds the machine cues:
// `event` rides the serial queue (noacgDispatch — the payload lands only if the machine
// accepts the event), `snap` enters states instantly (noacgSnap — recovery, emergency
// jumps), and `hello` asks the graphic to answer with its current machine state.

export type ControlMessage =
  | { t: 'update'; data: Record<string, string> }
  | { t: 'play' }
  | { t: 'stop' }
  | { t: 'next' }
  | { t: 'event'; event: string; payload?: Record<string, string> }
  | { t: 'snap'; snap: Record<string, string> | null }
  | { t: 'hello' };

/** What the graphic sends back on the same channel: its machine state after every handled
 *  message (and on `hello`), so a panel can show the current state and grey illegal buttons —
 *  and `graphic-online` once at boot, so a panel can rebuild a refreshed graphic from its
 *  event log (send the latest data, then snap to the last known state). */
export type ControlReply =
  | { t: 'state'; state: { groups?: Record<string, string> } }
  | { t: 'graphic-online' };

/** The channel name a template's control panel and graphic share (derived from its name). */
export function controlChannelName(templateName: string): string {
  return `spx-control-${slug(templateName)}`;
}
