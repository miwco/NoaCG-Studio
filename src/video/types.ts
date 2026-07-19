// Shared types for the video compile/validate/preview pipeline. Pure types only - the
// implementations live in compile.ts / validate.ts / playerBridge.ts (slice: player host).

import type { ValidationIssue } from '../validation/validateTemplate';
import type { AssetFile } from '../model/types';
import { uniqueAssetPath } from '../assets/assetUtils';

/** The composition settings the player and renderer need (a VideoProject subset). */
export interface VideoCompSettings {
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  transparent: boolean;
}

/** Structured info about one project asset, as the AI and the player host see it. */
export interface VideoAssetInfo {
  /** Logical name generated code uses: `assets.<name>` / `assets['<name>']`. */
  name: string;
  /** The AssetFile path this maps to (e.g. "images/logo.png"). */
  path: string;
  mime: string;
  width?: number;
  height?: number;
}

/** Result of the full compile -> static checks -> live probe pipeline. */
export interface VideoValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  /** The sucrase CJS output when compilation succeeded (the preview/render module). */
  compiledJs: string | null;
  /**
   * Did the LIVE probe actually run? The runtime findings - frame errors, clipped text,
   * occlusion - exist ONLY when a preview bridge was mounted to measure them, so `ok: true`
   * with `probed: false` means "nothing was checked", NOT "nothing is wrong". They are not
   * interchangeable and the difference is not cosmetic: a validator that reported the two
   * identically is what let a composition with permanently off-frame text through the AI
   * gate untouched, because the repair loop only runs on `!ok`. Anything gating quality on
   * a clean result must require this flag too.
   */
  probed: boolean;
}

/**
 * Derive an asset's logical name from its path: the file stem, kebab-safe. Generated code
 * reads `assets['<name>']` (or `assets.<name>` when it's an identifier). One place so the
 * AI prompt, the props builder, and the validator always agree.
 */
export function assetLogicalName(path: string): string {
  const file = path.split('/').pop() ?? path;
  const stem = file.replace(/\.[^.]+$/, '');
  return stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asset';
}

/** MIME type from a data-URL asset ('' when the data isn't a data URL). */
export function assetMime(asset: AssetFile): string {
  if (typeof asset.data !== 'string') return asset.data.type;
  const m = /^data:([^;,]+)/.exec(asset.data);
  return m ? m[1] : '';
}

/**
 * The path to store a newly uploaded VIDEO asset at: unique, and with a unique LOGICAL NAME.
 *
 * An asset's name is what the composition's code and an image input's value point at, so it
 * must never change under an asset the user didn't touch. uniqueAssetPath only guarantees the
 * PATH is unique - `logo.png` and `logo.jpg` both keep the stem `logo` - which used to leave
 * describeAssets to break the tie by position, so deleting the first silently renamed the
 * second. Uniqueness belongs at upload instead: settle the name once, into the path (which is
 * immutable and already persisted), and no later add or delete can disturb it.
 */
export function uniqueVideoAssetPath(fileName: string, existing: AssetFile[]): string {
  const taken = new Set(existing.map((a) => assetLogicalName(a.path)));
  const dot = fileName.lastIndexOf('.');
  const stem = dot >= 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot >= 0 ? fileName.slice(dot) : '';
  let candidate = fileName;
  for (let n = 2; taken.has(assetLogicalName(candidate)); n++) candidate = `${stem}-${n}${ext}`;
  return uniqueAssetPath(candidate, existing);
}

/**
 * Build the AI/player view of a project's assets. The name comes from the path alone, so it is
 * stable across every add and delete (uniqueVideoAssetPath settled it at upload). The tie-break
 * loop only ever fires for a project whose assets predate that rule - never for new uploads.
 */
export function describeAssets(assets: AssetFile[]): VideoAssetInfo[] {
  const seen = new Set<string>();
  return assets.map((a) => {
    let name = assetLogicalName(a.path);
    let i = 2;
    while (seen.has(name)) name = `${assetLogicalName(a.path)}-${i++}`;
    seen.add(name);
    return { name, path: a.path, mime: assetMime(a) };
  });
}
