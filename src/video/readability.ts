// How the two engines' validators READ the runtime readability findings their probes bring
// back (the checks themselves are shared too - src/video/textChecks.js, inlined into both
// isolated runtimes). Both engines pick the same frames and apply the same persistence
// rule, so a composition is judged identically whichever way it was authored.

import type { ProbeTextIssue } from './playerBridge';

/**
 * The frames the readability checks run on: two points inside the HOLD, where the hero must
 * be legible. Never frame 0 or the last frame - an entrance sliding out of a mask and an
 * exit wiping away are legitimately mid-clip, and flagging them would reject good work.
 */
export function holdFrames(durationInFrames: number): number[] {
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
export function persistentTextIssues(issues: ProbeTextIssue[], frames: number[]): string[] {
  if (frames.length === 0 || issues.length === 0) return [];
  const seen = new Map<string, { frames: Set<number>; message: string }>();
  for (const i of issues) {
    const entry = seen.get(i.key) ?? { frames: new Set<number>(), message: i.message };
    entry.frames.add(i.frame);
    seen.set(i.key, entry);
  }
  return [...seen.values()].filter((e) => e.frames.size >= frames.length).map((e) => e.message);
}
