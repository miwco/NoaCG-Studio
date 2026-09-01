// The teams UI store - which production's share dialog is open, if any.
//
// A MODULE STORE rather than props, for the same reason the save dialogs use one: the door is
// reached from two places that are siblings, not ancestors (Home's production card menu and the
// production page's header), and the dialog itself mounts ONCE at App level. Two mount points
// would put two dialogs on screen at once.
//
// This store holds no team data. Teams live on the server and are fetched by the dialog when it
// opens, because a team's member list and join code can change from another member's browser -
// caching them here would show a stale code to the one person about to read it out loud.

import { create } from 'zustand';

interface ShareRequest {
  /** The production the dialog was opened from - named in the title so the door says what it
   *  is about. Stage 3 does not move it (docs/TEAMS_PLAN.md §7 stage 4 owns the move). */
  showId: string;
  showName: string;
}

interface TeamsUiState {
  share: ShareRequest | null;
  openShare: (showId: string, showName: string) => void;
  closeShare: () => void;
}

export const useTeamsUi = create<TeamsUiState>((set) => ({
  share: null,
  openShare: (showId, showName) => set({ share: { showId, showName } }),
  closeShare: () => set({ share: null }),
}));
