// POST /api/ai/pro-generations - open ONE hosted Pro reservation.
//
// This endpoint spends nothing. It admits the caller and books the generation's worst case
// against the allowance; the model calls themselves go out through the generic gateway proxy
// (api/ai/generate.ts), which admits each one against this reservation and settles its real
// cost into it. That split is not incidental - it is what keeps the route ENGINE-AGNOSTIC.
// Whatever docs/NOACG_PRO_PLAN.md §15 replaces the current pipeline with, however many calls
// it makes and in whatever order, the allowance it spends against is this one.

import { ipHash, json, methodGuard, readJson } from '../http.js';
import { proError } from './http.js';
import { resolveProGate } from './gate.js';
import { admitTaskIp, jitteredCapacityDelay } from '../aiLiteRateLimit.js';
import { proCapacityRetryPlan, type ProCapacityRetryPlan } from '../aiProProfile.js';
import { PRO_TASK_ID } from '../aiTaskRegistry.js';
import { getLiteGenerationStore, type LiteGenerationStore, type LiteReservation } from '../aiLiteStore.js';
import type { ProReservationResponse } from '../../../src/ai/pro/types.js';

const MAX_BODY_BYTES = 2_000;
const IDEMPOTENCY = /^[A-Za-z0-9][A-Za-z0-9_-]{15,127}$/;

/** The refusal for every reservation verdict that is not `created`. Same vocabulary as Lite's,
 *  because the reasons are the same reasons. */
export function proReservationError(reservation: Exclude<LiteReservation, { status: 'created' }>): Response {
  if (reservation.status === 'duplicate') {
    return proError('duplicate_request', 'This Pro generation was already started.', 409);
  }
  if (reservation.status === 'user-concurrency') {
    return proError('already_running', 'Finish the current Pro generation before starting another.', 409, true);
  }
  if (reservation.status === 'fleet-concurrency') {
    return proError('shared_capacity', 'NoaCG Pro is temporarily busy. Please try again in a moment.', 503, true);
  }
  if (reservation.status === 'fleet-spend') {
    return proError('fleet_spend_ceiling', 'NoaCG Pro is temporarily unavailable.', 503, false);
  }
  return proError('allowance_exhausted', 'Your current NoaCG Pro allowance has been used.', 429);
}

interface CapacityRetryDependencies {
  now(): number;
  random(): number;
  sleep(ms: number): Promise<void>;
}

const CAPACITY_RETRY_DEFAULTS: CapacityRetryDependencies = {
  now: () => Date.now(),
  random: () => Math.random(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/**
 * Retry ONLY the shared fleet slot, exactly as Lite does.
 *
 * A class presses Create within a few seconds of each other and there are far fewer slots than
 * students, so answering `shared_capacity` on the first observation hands most of the room an
 * error instead of a queue. Every other verdict - a quota, the user's own overlap, the spend
 * ceiling, a duplicate - is a DURABLE answer and returns at once: retrying those would only
 * spend the classroom's request budget re-asking a question already answered.
 *
 * Each observation carries the identical user and idempotency key, so only the successful
 * reservation can consume a start however many times this loops.
 */
export async function reserveProCapacity(
  store: LiteGenerationStore,
  input: Parameters<LiteGenerationStore['reserve']>[0],
  plan: ProCapacityRetryPlan,
  dependencies: CapacityRetryDependencies = CAPACITY_RETRY_DEFAULTS,
): Promise<LiteReservation> {
  for (let attempt = 0; attempt < plan.maxAttempts; attempt += 1) {
    const reservation = await store.reserve({ ...input, now: dependencies.now() });
    if (reservation.status !== 'fleet-concurrency' || attempt === plan.maxAttempts - 1) {
      return reservation;
    }
    await dependencies.sleep(jitteredCapacityDelay(plan.retrySpacingMs, dependencies.random));
  }
  throw new Error('Pro capacity retry exhausted without a reservation result.');
}

export default {
  async fetch(req: Request): Promise<Response> {
    const guard = methodGuard(req, 'POST');
    if (guard) return guard;

    // Pre-body burst protection, before any Supabase round trip. Never an entitlement - the
    // allowance below is the authority (aiLiteRateLimit.ts).
    const callerIpHash = ipHash(req);
    const admission = admitTaskIp(PRO_TASK_ID, callerIpHash);
    if (!admission.allowed) {
      return proError('rate_limited', 'Too many Pro requests from this network. Try again shortly.', 429, true, {
        'retry-after': String(admission.retryAfterSeconds),
      });
    }

    const gate = await resolveProGate(req);
    if (!gate.available || !gate.user) {
      if (gate.reason === 'sign-in') {
        return proError('authentication_required', 'Sign in to use NoaCG Pro.', 401);
      }
      if (gate.reason === 'not-configured') {
        return proError('profile_not_configured', 'NoaCG Pro is not fully configured.', 503);
      }
      return proError('profile_disabled', 'NoaCG Pro is currently unavailable.', 503, true);
    }

    let idempotencyKey: string;
    try {
      const body = await readJson<{ idempotencyKey?: unknown }>(req, MAX_BODY_BYTES);
      if (typeof body.idempotencyKey !== 'string' || !IDEMPOTENCY.test(body.idempotencyKey)) {
        throw new Error('idempotency');
      }
      idempotencyKey = body.idempotencyKey;
    } catch {
      return proError('invalid_request', 'The Pro reservation request is invalid.', 400);
    }

    const profile = gate.effectiveProfile;
    const plan = proCapacityRetryPlan(profile);
    const now = Date.now();
    const reservation = await reserveProCapacity(await getLiteGenerationStore(), {
      userId: gate.user.userId,
      ipHash: callerIpHash,
      idempotencyKey,
      requestedCategory: null,
      now,
      profile: {
        id: 'pro',
        promptVersion: profile.promptVersion,
        // The WHOLE generation's ceiling is booked here, not one call's. Every call this
        // reservation pays for is admitted against that single booking, so a generation that
        // is abandoned halfway still cost the fleet its conservative figure - which is the
        // safe direction to be wrong in (api/_lib/lite/generations.ts carries the argument).
        maxProviderCostUsd: profile.maxProviderCostUsd,
        dailyStarts: profile.dailyStarts,
        monthlyStarts: profile.monthlyStarts,
        dailySuccesses: profile.dailySuccesses,
        monthlySuccesses: profile.monthlySuccesses,
        maxConcurrentPerUser: profile.maxConcurrentPerUser,
        maxConcurrentFleet: profile.maxConcurrentFleet,
        dailyFleetSpendUsd: profile.dailyFleetSpendUsd,
        // The SHORT lease, not the profile's whole expiry. A Pro reservation holds a fleet slot
        // (and the caller's own concurrency seat) for as long as it is unexpired, and Pro's
        // model calls run in the BROWSER - so booking fifteen minutes meant one abandoned tab
        // cost the class a seat for a quarter of an hour. Every settled call renews it
        // (migration 0046), so a live generation keeps its seat and a dead one frees it.
        expiryMs: plan.activeLeaseMs,
      },
    }, plan);
    if (reservation.status !== 'created') return proReservationError(reservation);

    const response: ProReservationResponse = {
      generationId: reservation.record.id,
      expiresAt: new Date(reservation.record.expiresAt).toISOString(),
      maxCalls: profile.maxCallsPerGeneration,
      maxGenerationCostUsd: profile.maxProviderCostUsd,
    };
    return json(response, 201);
  },
};
