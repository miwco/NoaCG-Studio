// The burst gate in front of POST /api/render/start.
//
// Three guards now sit on that route, and they stop different things:
//   WAF rate-limit rule  — refuses a flood at the edge, before a function is invoked at
//                          all (docs/RENDER.md; configured on Vercel, not in this repo).
//   THIS                 — refuses one hammering client before the handler reads a body
//                          of up to 4 MB and makes four ledger queries.
//   admission.ts         — caps how many renders actually RUN, fleet-wide.
// The tier quotas in src/render/limits.ts are none of these: they are the per-visitor
// entitlement, checked after the request has already been parsed.
//
// Counting is IN PROCESS and therefore PER INSTANCE — no Redis, no extra round trip, and
// nothing to configure for a self-hosted deployment. Fluid Compute reuses instances, so a
// hammering client keeps meeting the same counter, but N instances mean the effective
// ceiling is up to N× the number below. That is fine for what this layer is for (making
// abuse cheap to refuse); the globally-exact limit is the WAF rule, and the guarantee that
// actually bounds cost is the fleet ceiling.

import { RENDER_CONFIG } from '../../src/render/limits.js';
import { envInt } from './env.js';
import { ipHash } from './http.js';

export interface RateLimitCaps {
  windowMs: number;
  /** Requests allowed per window per key. 0 disables the gate. */
  max: number;
}

export function startRateLimitCaps(): RateLimitCaps {
  const d = RENDER_CONFIG.startRateLimit;
  return {
    windowMs: Math.max(1, envInt('RENDER_START_RATE_WINDOW_SEC', d.windowSec)) * 1000,
    max: envInt('RENDER_START_RATE_MAX', d.maxRequests),
  };
}

interface Bucket {
  /** Index of the window this bucket's `count` belongs to. */
  window: number;
  count: number;
  /** The immediately previous window's count, for the weighted estimate below. */
  prevCount: number;
}

/** Keys are salted IP hashes, so this map is bounded by distinct clients in a window.
 *  Stashed on globalThis so Vite HMR of the api modules in dev doesn't reset the counters. */
function buckets(): Map<string, Bucket> {
  const g = globalThis as { __noacgRenderRate?: Map<string, Bucket> };
  g.__noacgRenderRate ??= new Map();
  return g.__noacgRenderRate;
}

/** Past this many tracked clients, drop the ones that can no longer influence an estimate.
 *  A long-lived Fluid instance must not accumulate a key per IP it has ever seen. */
const SWEEP_ABOVE = 5000;

function sweep(map: Map<string, Bucket>, window: number): void {
  for (const [key, b] of map) if (b.window < window - 1) map.delete(key);
}

export interface RateLimitDecision {
  allowed: boolean;
  /** Seconds until the pressure eases — the Retry-After on a refusal. */
  retryAfterSec: number;
}

/** Count one request against `key` and decide. Exported for testing; the handler calls
 *  checkStartRateLimit.
 *
 *  A sliding window approximated by two fixed ones: the previous window's count decays
 *  linearly as the current one fills. That costs O(1) memory per client (a plain fixed
 *  window is cheaper still, but lets a client fire 2× the limit across the boundary —
 *  precisely the burst this gate exists to flatten). A refused request is still counted,
 *  so hammering keeps the client refused rather than resetting the pressure. */
export function hitRateLimit(key: string, caps: RateLimitCaps, nowMs: number): RateLimitDecision {
  if (caps.max <= 0) return { allowed: true, retryAfterSec: 0 };

  const map = buckets();
  const window = Math.floor(nowMs / caps.windowMs);
  const intoWindow = nowMs % caps.windowMs;
  const remainingSec = Math.max(1, Math.ceil((caps.windowMs - intoWindow) / 1000));

  let b = map.get(key);
  if (!b || b.window < window - 1) b = { window, count: 0, prevCount: 0 };
  else if (b.window === window - 1) b = { window, count: 0, prevCount: b.count };

  // The question is whether ADMITTING this request would exceed the budget, not whether
  // the budget is already gone: asking it the second way leaves exactly one request of
  // slack at a window boundary, where a decayed previous count lands a hair under max.
  const decayedPrev = b.prevCount * (1 - intoWindow / caps.windowMs);
  const wouldExceed = decayedPrev + b.count + 1 > caps.max;

  b.count += 1;
  map.set(key, b);
  if (map.size > SWEEP_ABOVE) sweep(map, window);

  return wouldExceed ? { allowed: false, retryAfterSec: remainingSec } : { allowed: true, retryAfterSec: 0 };
}

/** The gate as the handler uses it: null when the request may proceed. Keyed on the same
 *  salted IP hash as the anonymous render quota — raw IPs are never stored. */
export function checkStartRateLimit(req: Request): RateLimitDecision | null {
  const decision = hitRateLimit(`start:${ipHash(req)}`, startRateLimitCaps(), Date.now());
  return decision.allowed ? null : decision;
}
