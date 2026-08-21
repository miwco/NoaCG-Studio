import { useEffect } from 'react';

/**
 * THE VERB KEYS of the playout dashboard (docs/PLAYOUT_DASHBOARD.md §2), as one implementation.
 *
 * The dashboard ships three times - the in-app production page, the hosted control page and the
 * exported controller - and the contract says they must not diverge. The exported controller is
 * vanilla JS and carries its own copy by necessity (`control/productionControllerHtml.ts`); the
 * two React surfaces share THIS one, because a second keymap written by hand is exactly how the
 * hosted page ended up with no keys at all: an operator who learned the app could not walk the
 * rundown on the page a class actually operates from.
 */
export type PlayoutVerb =
  | 'preview'
  | 'take'
  | 'retake'
  | 'update'
  | 'next'
  | 'out'
  | 'select-prev'
  | 'select-next';

/** True when the keystroke belongs to whatever the operator is typing into, not to the verbs. */
export function typingInto(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return (
    el.isContentEditable ||
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT'
  );
}

/** key -> verb. `arrowup`/`arrowdown` walk the rundown; SPACE is the take TOGGLE. */
const KEY_MAP: Record<string, PlayoutVerb> = {
  p: 'preview',
  ' ': 'take',
  // RE-TAKE is a key of its own, never the toggle wearing a second meaning. It replays a live
  // cue's entrance, which is a different intention from "put this on" and from "take it off",
  // and an operator with a finger on SPACE must never discover which of the three they got.
  r: 'retake',
  u: 'update',
  n: 'next',
  '0': 'out',
  // Walking the rundown from the keyboard is what makes the whole surface operable without a
  // mouse - and, since a Stream Deck is a keyboard emulator, what makes these verbs reachable
  // from one. Form controls keep their own arrows (`typingInto` covers input, textarea, select
  // and contenteditable), so a layer number still steps normally.
  arrowup: 'select-prev',
  arrowdown: 'select-next',
};

/**
 * Bind the verb keys while the playout surface is the one ON SCREEN. Never while typing - the
 * cue title and the fields live on these same surfaces, and SPACE inside a name must stay a
 * space.
 *
 * `enabled` exists because "mounted" was the wrong condition, and the difference put a graphic
 * on air by accident. The production page's SHELL renders on the Data and Audience workspaces
 * too, with the playout column hidden behind them rather than unmounted (which is right - see
 * ProductionPage, unmounting restarts every live graphic). So the keys stayed bound on a screen
 * with no monitors on it: standing on the Data tab with focus anywhere but an input, SPACE ran
 * Take and a cue went to air with nothing visible saying so. Measured 2026-08-21 - three rows
 * on the wire and the chip reading "on air" - and it is the concrete hazard behind the owner's
 * read of these workspaces the same day: "the buttons that we have and the side pages we have
 * feel a bit dangerous to swap between."
 *
 * A verb acts on what the operator can SEE. When they cannot see PROGRAM, the keys are not
 * theirs to press.
 */
export function usePlayoutVerbKeys(onKey: (verb: PlayoutVerb) => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typingInto(e.target)) return;
      const verb = KEY_MAP[e.key.toLowerCase()];
      if (!verb) return;
      e.preventDefault();
      onKey(verb);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKey, enabled]);
}

/**
 * Walk a rundown by one step and reveal the row. Shared for the same reason the map is: the two
 * React surfaces disagreed about what Up does from nothing selected, which is the one case an
 * operator meets first.
 */
export function stepSelection<T extends { id: string }>(
  cues: T[],
  selectedId: string | null,
  step: 1 | -1,
): T | null {
  if (!cues.length) return null;
  const at = cues.findIndex((c) => c.id === (selectedId ?? ''));
  // From nothing selected, Down lands on the first cue and Up on the last.
  const next = at < 0 ? (step > 0 ? 0 : cues.length - 1) : Math.min(cues.length - 1, Math.max(0, at + step));
  return cues[next] ?? null;
}

/** Scroll a rundown row into view after the keys moved the selection there. */
export function revealCue(testId: string): void {
  document.querySelector(`[data-testid="${testId}"]`)?.scrollIntoView({ block: 'nearest' });
}
