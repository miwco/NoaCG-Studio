// The full validate pipeline for a composition module: compile -> static contract checks
// -> live probe in the player host (mount + render frames [0, mid, last], catching real
// runtime errors with their frame numbers). The AI repair loop feeds these exact issues
// back to the model; the UI shows the same list. Duration/fps/resolution are never
// validated against the AI - they come from project settings and are injected at load.

import type { ValidationIssue } from '../validation/validateTemplate';
import { compileTsx, staticValidate, WARNING_RULES } from './compile';
import type { PlayerBridge } from './playerBridge';
import type { AssetFile } from '../model/types';
import { describeAssets, type VideoCompSettings, type VideoValidationResult } from './types';

export async function validateVideoModule(
  tsx: string,
  settings: VideoCompSettings,
  assets: AssetFile[],
  bridge: PlayerBridge | null,
): Promise<VideoValidationResult> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const compiled = compileTsx(tsx);
  if (!compiled.ok) {
    errors.push({ rule: 'compile', message: compiled.error });
    return { ok: false, errors, warnings, compiledJs: null };
  }

  for (const issue of staticValidate(tsx, describeAssets(assets))) {
    (WARNING_RULES.has(issue.rule) ? warnings : errors).push(issue);
  }
  if (errors.length > 0) {
    return { ok: false, errors, warnings, compiledJs: compiled.js };
  }

  // Live probe (skipped when no player is mounted - e.g. the offline stub in tests).
  if (bridge) {
    const loaded = await bridge.load(compiled.js, settings, {}, assets, { autoplay: false });
    if (!loaded.ok) {
      if (loaded.superseded) {
        // A newer load took over mid-validation (fast follow-up edit) - report honestly
        // without inventing a module error.
        errors.push({ rule: 'runtime', message: 'validation was interrupted by a newer change - try again' });
        return { ok: false, errors, warnings, compiledJs: compiled.js };
      }
      errors.push({ rule: 'runtime', message: loaded.message });
      return { ok: false, errors, warnings, compiledJs: compiled.js };
    }
    const d = settings.durationInFrames;
    const probe = await bridge.probe([0, Math.floor(d / 2), Math.max(0, d - 1)]);
    for (const e of probe.errors) {
      errors.push({ rule: 'runtime', message: `frame ${e.frame}: ${e.message}` });
    }
  }

  return { ok: errors.length === 0, errors, warnings, compiledJs: compiled.js };
}
