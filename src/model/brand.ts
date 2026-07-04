// The project brand: the light "broadcast package" mechanism. Every wizard Create captures
// the chosen style family + palette + font (custom colors and imported fonts included) and
// persists it in localStorage. The wizard's "Match current project" toggle (on by default)
// preselects it for the next graphic, so everything made in a project looks like one show.
// (A full named-package manager is deferred — see docs/GOALS.md.)

import type { Palette } from './wizard';
import type { CustomFont, StyleTag } from './fonts';
import { registerAppFont } from './fonts';

export interface ProjectBrand {
  /** The style family of the last created graphic (used to sort its siblings first). */
  styleTag: StyleTag;
  /** The chosen palette — may be a custom one (id 'custom'). */
  palette: Palette;
  /** Bundled font id, or null when an imported font is in use. */
  fontId: string | null;
  /** The imported font (with its embedded data-URL asset), if one is in use. */
  customFont: CustomFont | null;
}

const STORAGE_KEY = 'spx-gfx-brand';

export function saveBrand(brand: ProjectBrand): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(brand));
  } catch {
    // Storage full or unavailable — the brand just won't persist. Non-fatal.
  }
}

export function loadBrand(): ProjectBrand | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const brand = JSON.parse(raw) as ProjectBrand;
    if (!brand.palette || !brand.styleTag) return null;
    // Make the imported font renderable in the builder UI again after a reload.
    if (brand.customFont && typeof brand.customFont.asset?.data === 'string') {
      registerAppFont(brand.customFont.family, brand.customFont.asset.data);
    }
    return brand;
  } catch {
    return null;
  }
}
