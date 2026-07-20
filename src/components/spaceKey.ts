import { useEffect } from 'react';
import { useTemplateStore } from '../store/templateStore';

// Who owns a keystroke, in ONE place.
//
// Space is claimed by two surfaces — PreviewFrame's canvas pan and StepTimeline's play — and
// they used to settle it with a handshake: the pan called preventDefault, the timeline stood
// down on `defaultPrevented`. That was wrong twice over. Both listeners sit on `window` in the
// capture phase, so they are SIBLINGS on one node: stopPropagation cannot reach across, and the
// order they fire in is merely the order they subscribed. Worse, a claim only covers the events
// it actually sees — the pan ignored auto-repeat keydowns, so every repeat of a HELD Space (the
// real gesture) slipped through and replayed the graphic under the pan.
//
// So neither side claims any more. Both ask the same question and get the same answer, on every
// keydown including repeats: does the canvas own Space right now? There is nothing to order and
// nothing to leak.

/** The activatable controls Space belongs to — Space is the button key, and taking it would
 *  make the editor unusable without a mouse. Enter is not a substitute: a keyboard user reaches
 *  for Space on a focused button, and silence there reads as a broken control. */
const ACTIVATABLE = 'button, [role="button"], a[href], summary';

/** Fields that eat every key while focused: Space types a space, Delete deletes a character. */
const TYPING = 'input, textarea, select, [contenteditable="true"], .monaco-editor';

const focusIn = (sel: string, el: Element | null = document.activeElement) =>
  el instanceof HTMLElement && !!el.closest(sel);

/** True while the caret is in a text field, a select, or the code editor. */
export const typingFocus = (target?: EventTarget | null) =>
  focusIn(TYPING, target instanceof HTMLElement ? target : document.activeElement);

/** True while a modal surface is mounted. */
export const modalOpen = () => useTemplateStore.getState().modalCount > 0;

/**
 * Does Space pan the canvas right now (rather than play the graphic)?
 *
 * Three conditions, all required: the CANVAS is the active surface (a pointerdown on the stage
 * makes it so; one on the timeline strip hands it back — panels and dialogs deliberately change
 * nothing, so a trip to the Inspector keeps whichever you were in), the pointer is OVER the
 * stage, and nothing is being typed into. A modal takes it from both.
 *
 * Note the deliberate asymmetry with `ACTIVATABLE`: a focused BUTTON does yield Space to the
 * pan, because clicking a stage tool leaves that button focused and a pan that stopped working
 * until you clicked elsewhere would be the more surprising rule. It does NOT yield Space to
 * play — that half was never a decision, just a missing guard.
 */
export function spacePansCanvas(target?: EventTarget | null): boolean {
  if (typingFocus(target) || modalOpen()) return false;
  const s = useTemplateStore.getState();
  return s.activeSurface === 'canvas' && s.pointerOverStage;
}

/**
 * Does a global editor shortcut get to act at all? False while a modal is up (a keystroke aimed
 * at a dialog must never edit the document behind it) or while the user is typing.
 */
export function editorShortcutsLive(target?: EventTarget | null): boolean {
  return !modalOpen() && !typingFocus(target);
}

/** True while focus sits on something Space/Enter would activate. */
export const activatableFocus = () => focusIn(ACTIVATABLE);

/**
 * Every modal surface calls this. Counted rather than flagged so stacked modals close correctly,
 * and so unmounting can never leave the gate stuck open — which a hand-set flag eventually does.
 *
 * `open` is REQUIRED for a surface that stays mounted and returns null when closed (the wizard
 * and the sign-in dialog both do). Keying the gate on mount alone would hold it down for the
 * whole session and silently disable every editor shortcut in the app.
 */
export function useModalGate(open = true): void {
  const push = useTemplateStore((s) => s.pushModal);
  const pop = useTemplateStore((s) => s.popModal);
  useEffect(() => {
    if (!open) return;
    push();
    return pop;
  }, [open, push, pop]);
}
