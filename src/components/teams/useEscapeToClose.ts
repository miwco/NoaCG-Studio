// Escape closes THE TOPMOST surface, written once because both team dialogs need exactly it and
// the reason is too easy to leave out of a second copy.
//
// The sign-in card paints over both of them - `.auth-gate` is z-index 200 to the dialog
// backdrop's 100 - and it closes itself on Escape without stopping the event. So an unguarded
// listener answers the same keypress the sign-in card just answered. On the join route that is
// not a cosmetic double-close: the student who opened their teacher's link signed out, pressed
// "Create a free account" and then Escape would have the sign-in card closed AND the join route
// navigated away, taking the code with it - it lives only in the fragment they just left.
//
// Same shape as LibMenu's `!document.querySelector('[aria-modal="true"]')` guard, narrowed to the
// one overlay that can actually sit on top: these dialogs ARE `aria-modal`, so the generic test
// would match themselves and never fire.

import { useEffect } from 'react';

export function useEscapeToClose(close: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.auth-gate')) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
}
