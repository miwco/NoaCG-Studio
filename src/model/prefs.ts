// Small persisted user preferences (this browser's localStorage — not synced; they are
// device-level workflow defaults, not project data). Kept intentionally tiny: every entry
// must be a genuine default someone sets once, not hidden app state.

import type { CommentVisibility } from '../editor/commentVisibility';

const PREFS_KEY = 'spx-gfx-prefs';

export interface UserPrefs {
  /** The export target preselected in the Export tab (also updated on every manual pick). */
  defaultExportTarget: string;
  /** The preview timeline strip's collapsed state. null = auto (expanded desktop, collapsed mobile). */
  timelineCollapsed: boolean | null;
  /** Last-used video/image render settings (Export tab). null = the panel's defaults. */
  renderSettings: { format: string; scale: number; fps: number | null; durationSec: number } | null;
  /** How the code editors render comments — a VIEW preference; the code itself never changes. */
  commentVisibility: CommentVisibility;
  /** ADVANCED MODE (docs/GOALS_ARCHIVE.md "Student release" step 4): show the code editor's doors.
   *  Off (the default), the studio is wizard -> production -> playout; the editor stays
   *  reachable only by a direct #/graphic link. Device-level on purpose - it is a UI
   *  complexity preference, not project data. Read live via components/useAdvancedMode. */
  advancedMode: boolean;
  /** How the graphics library is laid out: cards you can SEE, or a dense table you can scan.
   *  Per device and remembered, because which one is right depends on the library's size and
   *  on the screen, not on the graphic (re-design/handoff.md §5b/§5c). */
  libraryView: 'grid' | 'list';
}

const DEFAULTS: UserPrefs = {
  defaultExportTarget: '', // empty = the registry's first target
  timelineCollapsed: null,
  renderSettings: null,
  commentVisibility: 'normal',
  advancedMode: false,
  // Grid by default: a graphic is a picture, and the thing that identifies it is what it
  // looks like, not its name.
  libraryView: 'grid',
};

export function loadPrefs(): UserPrefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<UserPrefs>) };
  } catch {
    return { ...DEFAULTS }; // corrupt storage — fall back to defaults
  }
}

export function savePrefs(patch: Partial<UserPrefs>): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...loadPrefs(), ...patch }));
  } catch {
    // Storage full or unavailable. A preference is a CONVENIENCE - the remembered export
    // target, a panel's visibility - and losing one costs a click; throwing costs the whole
    // app, because this is called from render-adjacent paths with no error boundary above
    // them. Measured 2026-08-06: with the quota exhausted, opening the export window threw
    // here and unmounted the entire React tree, so the "storage is full" dialog that had just
    // been raised went down with it.
  }
}
