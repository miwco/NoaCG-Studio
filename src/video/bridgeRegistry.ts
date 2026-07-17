// The mounted preview bridge, registered by VideoPlayerFrame so sibling surfaces (the AI
// chat's live validator) can reach it at call time. One video shell = at most one bridge;
// no reactivity needed - consumers look it up when they run. Which class is mounted
// follows the project's engine: PlayerBridge (Remotion player host) or HyperframesBridge
// (the composed srcdoc driver) - each validator narrows to its own kind.

import { PlayerBridge } from './playerBridge';
import { HyperframesBridge } from './hyperframes/bridge';

export type VideoBridge = PlayerBridge | HyperframesBridge;

let active: VideoBridge | null = null;

export function setActiveBridge(bridge: VideoBridge | null): void {
  active = bridge;
}

export function getActiveBridge(): VideoBridge | null {
  return active;
}

/** The mounted bridge when it is the Remotion player host (else null). */
export function getActivePlayerBridge(): PlayerBridge | null {
  return active instanceof PlayerBridge ? active : null;
}

/** The mounted bridge when it is the HyperFrames driver (else null). */
export function getActiveHyperframesBridge(): HyperframesBridge | null {
  return active instanceof HyperframesBridge ? active : null;
}
