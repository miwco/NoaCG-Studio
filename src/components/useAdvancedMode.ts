// ADVANCED MODE - the one live source for the editor-visibility preference
// (docs/GOALS_ARCHIVE.md "Student release" step 4). model/prefs.ts is the persistence; this
// micro-store is the subscription surface, because prefs.ts has no change event and every
// gated door (Home rows, the wizard's Entry and Finish steps, the topbar) must react to the
// Settings toggle without a reload.
//
// Off (the default) the studio shows no editor doors: the wizard ends at a production or an
// export, a graphic opens onto its control page, and the canvas/code workspace is reached
// only by a direct #/graphic/<id> link. On restores every door. The editor CODE is never
// gated - this is a view preference, not a capability.

import { create } from 'zustand';
import { loadPrefs, savePrefs } from '../model/prefs';

interface AdvancedModeState {
  advanced: boolean;
  setAdvanced: (on: boolean) => void;
}

export const useAdvancedMode = create<AdvancedModeState>((set) => ({
  advanced: typeof window !== 'undefined' ? loadPrefs().advancedMode : false,
  setAdvanced: (on) => {
    savePrefs({ advancedMode: on });
    set({ advanced: on });
  },
}));

/** Non-hook read for boot-time decisions (App.tsx's default-route redirect). */
export function isAdvancedMode(): boolean {
  return useAdvancedMode.getState().advanced;
}
