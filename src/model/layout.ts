// Desktop layout preferences (Era 5.5+). The first PERSISTED UI preference in the app — everything
// else in localStorage is content (project/brand/packets/looks). Mirrors the load/save-over-a-key
// shape of ai/settings.ts and brand.ts. Only the desktop workspace reads this; the mobile layout
// ignores it. See src/components/AppShell.tsx.

const STORAGE_KEY = 'spx-gfx-layout';

export interface LayoutPrefs {
  /** Whether the left code-editor pane is collapsed (desktop only), giving the preview full width. */
  codeCollapsed: boolean;
  /** The code column's width as a fraction of the workspace (0..1), clamped to [MIN, MAX]. */
  codeRatio: number;
}

export const CODE_RATIO_MIN = 0.2;
export const CODE_RATIO_MAX = 0.7;
// 0.5 ≈ today's `1.05fr / 1fr` grid split.
export const DEFAULT_LAYOUT: LayoutPrefs = { codeCollapsed: false, codeRatio: 0.5 };

/** Keep the code column within usable bounds (both panes stay legible). Exported so the drag handler
 *  uses the exact same limits as the stored value. */
export function clampRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return DEFAULT_LAYOUT.codeRatio;
  return Math.min(CODE_RATIO_MAX, Math.max(CODE_RATIO_MIN, ratio));
}

/** Load the saved layout, merged over defaults; falls back to defaults on missing/corrupt storage. */
export function loadLayout(): LayoutPrefs {
  let saved: Partial<LayoutPrefs> = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<LayoutPrefs>;
  } catch {
    // Corrupt storage — fall back to defaults.
  }
  return {
    codeCollapsed: saved.codeCollapsed ?? DEFAULT_LAYOUT.codeCollapsed,
    codeRatio: typeof saved.codeRatio === 'number' ? clampRatio(saved.codeRatio) : DEFAULT_LAYOUT.codeRatio,
  };
}

/** Persist a partial update, merged over the current stored value. */
export function saveLayout(prefs: Partial<LayoutPrefs>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadLayout(), ...prefs }));
  } catch {
    // Storage full / unavailable — non-fatal (the live layout still works this session).
  }
}
