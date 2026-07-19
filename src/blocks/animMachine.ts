// The state machine's editor-side seam (docs/STATE_MACHINE_SCHEMA.md). animData.ts is the
// literal's contract; this module answers GRAPH questions about it: derive the implicit
// machine for machine-less data, count the SPX Continue presses, query legal events (the
// operator's "Action"), compute the canonical snap path, and judge a machine semantically
// for validateTemplate. Everything is pure. The emitted runtime interpreter
// (templates/shared/animRuntime.ts) re-implements the derivation and the canonical path in
// ES5 — the two must stay in agreement, exactly like animEval mirrors the playback math.

import {
  RESERVED_EVENTS,
  type AnimData,
  type AnimGroup,
  type AnimMachine,
  type AnimState,
  type AnimTransition,
} from './animData';

export { RESERVED_EVENTS };

/** The derived machine's one group id — and the id every v1-era template's group answers to
 *  in noacgMachineState()/noacgSnap(). */
export const MAIN_GROUP_ID = 'main';

/** The derived machine's synthesized off-air initial state. */
export const OFF_STATE_ID = 'off';

/** A step name as a state id: lowercased, non-alphanumerics folded to '-'. The interpreter
 *  applies the identical fold, so editor and runtime name the same states. */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'state'
  );
}

/** The machine a graphic ANSWERS TO: the explicit one when authored, else the implicit
 *  one-group linear machine derived from the step chain — states named after the steps, the
 *  synthesized pose-only `off` as initial, an operator `next` edge along the path, and (v1
 *  parity) NO next edge into the final Out: next() no-ops when only Out remains, stop()
 *  takes the graphic out. Derived on every read, never persisted. */
export function deriveMachine(data: AnimData): AnimMachine {
  if (data.machine) return data.machine;
  const used = new Set<string>([OFF_STATE_ID]);
  const states: AnimState[] = [{ id: OFF_STATE_ID, name: 'Off' }];
  const defaultPath: string[] = [];
  for (const step of data.steps) {
    let id = slugify(step.name);
    for (let n = 2; used.has(id); n++) id = `${slugify(step.name)}-${n}`;
    used.add(id);
    states.push({ id, name: step.name });
    defaultPath.push(id);
  }
  const transitions: AnimTransition[] = [];
  for (let i = 0; i + 2 < defaultPath.length; i++) {
    transitions.push({
      from: defaultPath[i],
      to: defaultPath[i + 1],
      trigger: 'operator',
      event: 'next',
    });
  }
  return { groups: [{ id: MAIN_GROUP_ID, initial: OFF_STATE_ID, defaultPath, states, transitions }] };
}

/** THE `settings.steps` rule: the SPX steps number is derived from the default path's
 *  length (numerically identical to the historical `steps.length - 1` by the positional-
 *  binding invariant). This function exists so the rule lives once — every site that
 *  re-syncs `settings.steps` calls it. */
export function spxSteps(data: AnimData): number {
  const path = data.machine?.groups[0]?.defaultPath;
  return (path ? path.length : data.steps.length) - 1;
}

export function stateById(group: AnimGroup, id: string): AnimState | null {
  return group.states.find((s) => s.id === id) ?? null;
}

export function transitionsFrom(group: AnimGroup, stateId: string): AnimTransition[] {
  return group.transitions.filter((t) => t.from === stateId);
}

/** The spec's "Action": the distinct operator events legal from this state — what a control
 *  surface should offer right now. Structural guarding IS this list: an event not on it is
 *  dropped. */
export function operatorEvents(group: AnimGroup, stateId: string): string[] {
  const events: string[] = [];
  for (const t of transitionsFrom(group, stateId)) {
    if (t.trigger === 'operator' && t.event && !events.includes(t.event)) events.push(t.event);
  }
  return events;
}

/** The state's single auto-advance, or null (the validator caps timers at one per state). */
export function timerTransition(group: AnimGroup, stateId: string): AnimTransition | null {
  return transitionsFrom(group, stateId).find((t) => t.trigger === 'timer') ?? null;
}

/** Every distinct authored operator event across the machine — the simulator's event strip. */
export function allOperatorEvents(machine: AnimMachine): string[] {
  const events: string[] = [];
  for (const group of machine.groups) {
    for (const t of group.transitions) {
      if (t.trigger === 'operator' && t.event && !events.includes(t.event)) events.push(t.event);
    }
  }
  return events;
}

/** The group's traversal edges: the default-path walk's own edges first (they model the
 *  play/next built-ins), then authored operator + timer transitions (data-condition never
 *  fires). Shared by reachability and the canonical snap path. */
function traversalEdges(group: AnimGroup, isMain: boolean): Array<{ from: string; to: string }> {
  const edges: Array<{ from: string; to: string }> = [];
  if (isMain && group.defaultPath && group.defaultPath.length > 0) {
    edges.push({ from: group.initial, to: group.defaultPath[0] });
    for (let w = 0; w + 1 < group.defaultPath.length; w++) {
      edges.push({ from: group.defaultPath[w], to: group.defaultPath[w + 1] });
    }
  }
  for (const t of group.transitions) {
    if (t.trigger !== 'data-condition') edges.push(t);
  }
  return edges;
}

/** The CANONICAL path to a state: for a main-group waypoint, the default-path prefix; else
 *  BFS shortest path from the group's initial, ties broken by edge declaration order (the
 *  walk's own edges first). Snap replays the entered states' timelines along this path with
 *  suppressed callbacks. Returns the entered state ids in order (initial excluded), or null
 *  when the state is unreachable. Mirrored by the interpreter's noacgCanonicalPath — keep
 *  them in agreement. */
export function canonicalPath(group: AnimGroup, isMain: boolean, targetId: string): string[] | null {
  if (targetId === group.initial) return [];
  if (isMain && group.defaultPath) {
    const pi = group.defaultPath.indexOf(targetId);
    if (pi >= 0) return group.defaultPath.slice(0, pi + 1);
  }
  const edges = traversalEdges(group, isMain);
  const cameFrom = new Map<string, string>();
  const queue: string[] = [group.initial];
  const seen = new Set<string>([group.initial]);
  while (queue.length > 0) {
    const at = queue.shift()!;
    for (const edge of edges) {
      if (edge.from !== at || seen.has(edge.to)) continue;
      seen.add(edge.to);
      cameFrom.set(edge.to, at);
      if (edge.to === targetId) {
        const path: string[] = [];
        for (let id = targetId; id !== group.initial; id = cameFrom.get(id)!) path.unshift(id);
        return path;
      }
      queue.push(edge.to);
    }
  }
  return null;
}

/** Semantic judgement for validateTemplate — runs only on a machine that already passed the
 *  shape gate (isAnimData). Errors block export; warnings advise. */
export function validateMachine(data: AnimData): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const machine = data.machine;
  if (!machine) return { errors, warnings };
  machine.groups.forEach((group, gi) => {
    const isMain = gi === 0;
    // The default path must be an AUTHORED walk: consecutive waypoints connected by a
    // transition, so the graph the node editor will draw is honest about what next() does.
    // (The runtime walks the path positionally either way — this keeps authors truthful.)
    if (isMain && group.defaultPath) {
      const start = group.defaultPath[0];
      for (let i = 0; i + 1 < group.defaultPath.length; i++) {
        const from = group.defaultPath[i];
        const to = group.defaultPath[i + 1];
        const connected = group.transitions.some((t) => t.from === from && t.to === to && t.trigger !== 'data-condition');
        // v1 parity: the edge INTO the final exit waypoint is optional (stop() plays it;
        // an authored next edge is how a template opts into next-drives-out).
        if (!connected && i + 2 < group.defaultPath.length) {
          errors.push(`Group "${group.id}": default path is not connected — no transition from "${from}" to "${to}".`);
        }
      }
      if (start === group.initial) {
        warnings.push(`Group "${group.id}": the initial state sits on the default path — Off is usually a rest outside it.`);
      }
    }
    // Unreachable states can never be entered by any event — usually a leftover.
    for (const state of group.states) {
      if (state.id === group.initial) continue;
      if (canonicalPath(group, isMain, state.id) === null) {
        warnings.push(`Group "${group.id}": state "${state.id}" is unreachable from "${group.initial}".`);
      }
    }
    for (const t of group.transitions) {
      if (t.trigger === 'data-condition') {
        warnings.push(`Group "${group.id}": "${t.from}" → "${t.to}" uses the reserved data-condition trigger — it never fires in this version.`);
      }
    }
  });
  return { errors, warnings };
}
