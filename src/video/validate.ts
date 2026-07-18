// The full validate pipeline for a composition module: compile -> static contract checks
// -> live probe in the player host (mount + render frames [0, mid, last], catching real
// runtime errors with their frame numbers) -> the READABILITY pass at the hold frames,
// where the host measures the mounted DOM (player-host/src/textChecks.ts) and reports text
// the frame or an overflow-clipping ancestor cuts off. The AI repair loop feeds these exact
// issues back to the model; the UI shows the same list. Duration/fps/resolution are never
// validated against the AI - they come from project settings and are injected at load.

import type { ValidationIssue } from '../validation/validateTemplate';
import { compileTsx, staticValidate, WARNING_RULES } from './compile';
import type { PlayerBridge } from './playerBridge';
import { getActivePlayerBridge } from './bridgeRegistry';
import type { AssetFile } from '../model/types';
import type { ProbeTextIssue } from './playerBridge';
import { describeAssets, type VideoCompSettings, type VideoValidationResult } from './types';

/**
 * The frames the readability checks run on: two points inside the HOLD, where the hero must
 * be legible. Never frame 0 or the last frame - an entrance sliding out of a mask and an
 * exit wiping away are legitimately mid-clip, and flagging them would reject good work.
 */
function holdFrames(durationInFrames: number): number[] {
  if (durationInFrames < 4) return [];
  const mid = Math.floor(durationInFrames / 2);
  const later = Math.min(durationInFrames - 2, mid + Math.max(1, Math.round(durationInFrames * 0.15)));
  return [...new Set([mid, later])];
}

/**
 * Keep only findings present at EVERY checked hold frame. A composition still animating
 * through the first sample (a reveal that lands late, type still settling) clears itself by
 * the second one; a genuinely cropped headline is cut at both. This is the main defence
 * against burning a repair round on a false positive.
 */
function persistentTextIssues(issues: ProbeTextIssue[], frames: number[]): string[] {
  if (frames.length === 0 || issues.length === 0) return [];
  const seen = new Map<string, { frames: Set<number>; message: string }>();
  for (const i of issues) {
    const entry = seen.get(i.key) ?? { frames: new Set<number>(), message: i.message };
    entry.frames.add(i.frame);
    seen.set(i.key, entry);
  }
  return [...seen.values()].filter((e) => e.frames.size >= frames.length).map((e) => e.message);
}

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
  // A disposed bridge (the player remounted mid-validation - dev StrictMode, layout
  // changes) retries once on the CURRENT bridge instead of failing the module.
  let probeBridge = bridge;
  for (let attempt = 0; probeBridge && attempt < 2; attempt++) {
    const loaded = await probeBridge.load(compiled.js, settings, {}, assets, { autoplay: false });
    if (!loaded.ok && loaded.disposed) {
      const fresh = getActivePlayerBridge();
      probeBridge = fresh && fresh !== probeBridge ? fresh : null;
      continue;
    }
    if (!loaded.ok) {
      errors.push({ rule: 'runtime', message: loaded.message });
      return { ok: false, errors, warnings, compiledJs: compiled.js };
    }
    const d = settings.durationInFrames;
    const probe = await probeBridge.probe(
      [0, Math.floor(d / 2), Math.max(0, d - 1)],
      holdFrames(d),
    );
    for (const e of probe.errors) {
      errors.push({ rule: 'runtime', message: `frame ${e.frame}: ${e.message}` });
    }
    for (const issue of persistentTextIssues(probe.textIssues ?? [], holdFrames(d))) {
      errors.push({ rule: 'text-clip', message: issue });
    }
    break;
  }

  return { ok: errors.length === 0, errors, warnings, compiledJs: compiled.js };
}
