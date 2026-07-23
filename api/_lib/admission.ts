// Fleet admission control: the ceiling on how many render jobs run AT ONCE across every
// visitor. The tier quotas in src/render/limits.ts bound one principal; this bounds the
// deployment. Without it, N simultaneous visitors mean N simultaneous 4-vCPU microVMs —
// the per-principal caps are satisfied by every single one of them, and the anonymous
// principal is an IP hash, so a rotating-IP flood clears them too.
//
// Defaults live with every other render number in src/render/limits.ts (RENDER_CONFIG.
// globalConcurrency). The env overrides live HERE because that module is pure and also
// runs in the browser, where process.env does not exist.

import { RENDER_CONFIG, type RenderTier } from '../../src/render/limits.js';
import type { JobStore } from './jobStore.js';

export interface GlobalCaps {
  max: number;
  anonymousMax: number;
  retryAfterSec: number;
}

function envInt(name: string, fallback: number): number {
  const raw = (process.env[name] ?? '').trim();
  if (!raw) return fallback;
  const n = Number(raw);
  // A malformed override must not silently uncap the fleet.
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

/** The caps for this deployment: the shared defaults, with optional env overrides so the
 *  ceiling can be raised (or dropped to 0 to close the service) without a code change. */
export function globalCaps(): GlobalCaps {
  const d = RENDER_CONFIG.globalConcurrency;
  const max = envInt('RENDER_MAX_CONCURRENT', d.max);
  return {
    max,
    // An anonymous ceiling above the hard ceiling would be dead config; clamp it.
    anonymousMax: Math.min(envInt('RENDER_ANONYMOUS_MAX_CONCURRENT', d.anonymousMax), max),
    retryAfterSec: envInt('RENDER_BUSY_RETRY_AFTER_SEC', d.retryAfterSec),
  };
}

export interface GlobalRejection {
  message: string;
  retryAfterSec: number;
}

/** Decide on an already-counted fleet. Pure — the branch the tests care about. */
export function judgeAdmission(activeJobs: number, tier: RenderTier, caps: GlobalCaps): GlobalRejection | null {
  if (activeJobs >= caps.max) {
    return {
      message: 'The render service is at capacity right now — try again in a minute.',
      retryAfterSec: caps.retryAfterSec,
    };
  }
  if (tier === 'anonymous' && activeJobs >= caps.anonymousMax) {
    return {
      message: 'The render service is busy — sign in to render now, or try again in a minute.',
      retryAfterSec: caps.retryAfterSec,
    };
  }
  return null;
}

/** Count the fleet and judge it. Returns null when the job may proceed.
 *
 *  CALL THIS AFTER the job row exists. Counting first is the obvious ordering and the
 *  wrong one: under a stampede every concurrent request reads the same pre-spike count
 *  and every one of them passes — precisely the case the ceiling exists for. Inserting
 *  first makes each request visible to its peers. The cost is that requests racing at the
 *  boundary can all bail; over-rejecting at the ceiling is the safe direction for a cost
 *  guard, and the caller deletes the row so a refusal never burns the caller's quota. */
export async function admitGlobally(store: JobStore, tier: RenderTier): Promise<GlobalRejection | null> {
  return judgeAdmission(await store.countActiveGlobal(), tier, globalCaps());
}
