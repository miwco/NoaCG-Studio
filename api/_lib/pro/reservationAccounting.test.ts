// The release rule for unspent Pro reservations, tested in both directions.
//
// The defect this guards: a Pro reservation books its whole cost ceiling, only the first
// SETTLED call replaces that worst case with real spend, and a run whose calls never settled
// (a 503, a timeout, an abandoned tab) kept the booking in the daily sums for 24 h - so ~33
// failed starts disabled the tier fleet-wide at $0 real spend, and every infra failure burned
// one of a student's three daily starts. The rule: a start and the fleet's money are consumed
// IFF provider spend occurred (>= 1 settled call). Mirrored in SQL by migration 0049.
//
// Every claim is asserted with its mutation: a released row must stop counting AND a
// counted row must still count, or the predicate could release everything and pass.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MemoryLiteGenerationStore, type LedgerQuotaProfile } from '../aiLiteStore.js';
import { proOutcomePatch } from './outcome.js';
import { ModelGatewayError, shouldRetryModelCall } from '../../../src/ai/modelTypes.js';
import type { ProOutcomeRequest } from '../../../src/ai/pro/types.js';

const PROFILE: LedgerQuotaProfile = {
  id: 'pro',
  promptVersion: 'test',
  maxProviderCostUsd: 0.15,
  dailyStarts: 3,
  monthlyStarts: 20,
  dailySuccesses: 2,
  monthlySuccesses: 12,
  maxConcurrentPerUser: 1,
  maxConcurrentFleet: 4,
  dailyFleetSpendUsd: 5,
  expiryMs: 240_000,
};

const USER = 'user-1';
let keySeq = 0;

async function reservePro(store: MemoryLiteGenerationStore, now: number) {
  const reservation = await store.reserve({
    userId: USER,
    ipHash: 'test-hash',
    idempotencyKey: `key-${keySeq += 1}-abcdefghijklmnop`,
    requestedCategory: null,
    now,
    profile: PROFILE,
  });
  assert.equal(reservation.status, 'created');
  if (reservation.status !== 'created') throw new Error('unreachable');
  return reservation.record;
}

const failedOutcome: ProOutcomeRequest = {
  generationId: 'ignored',
  status: 'failed',
  reason: 'provider_unavailable',
} as ProOutcomeRequest;

test('a live zero-call reservation counts its start and its full booking', async () => {
  const store = new MemoryLiteGenerationStore();
  const now = Date.now();
  await reservePro(store, now);
  const usage = await store.usage('pro', USER, now);
  assert.equal(usage.dailyStarts, 1);
  assert.equal(usage.dailyFleetSpendUsd, PROFILE.maxProviderCostUsd);
});

test('a failed run with zero settled calls releases its start and its booking', async () => {
  const store = new MemoryLiteGenerationStore();
  const now = Date.now();
  const record = await reservePro(store, now);

  await store.update(record.id, proOutcomePatch(record, failedOutcome, now));

  const usage = await store.usage('pro', USER, now);
  assert.equal(usage.dailyStarts, 0, 'an infra failure must not consume a start');
  assert.equal(usage.dailyFleetSpendUsd, 0, 'an unspent booking must be released');

  // The ROW is zeroed too, not only excluded from the sums - anything reading the ledger row
  // directly must see what was spent ($0), never the booked worst case.
  const row = await store.get(record.id);
  assert.equal(row?.providerCostUsd, 0, 'the row must not claim the booking as cost');

  // Terminal: the reservation can pay for nothing further.
  const admission = await store.admitProCall({
    generationId: record.id,
    userId: USER,
    now: now + 1,
    maxCalls: 4,
    generationCeilingUsd: PROFILE.maxProviderCostUsd,
  });
  assert.equal(admission.status, 'expired');
});

test('a failed run WITH a settled call keeps its start and its real cost', async () => {
  const store = new MemoryLiteGenerationStore();
  const now = Date.now();
  const record = await reservePro(store, now);
  // The proxy settled one real call: the first settlement replaces the booked worst case.
  await store.recordProCall({ generationId: record.id, userId: USER, costUsd: 0.004, leaseMs: 240_000 });

  const settled = await store.get(record.id);
  assert.ok(settled);
  await store.update(record.id, proOutcomePatch(settled, failedOutcome, now));

  const usage = await store.usage('pro', USER, now);
  assert.equal(usage.dailyStarts, 1, 'real provider spend consumed the start');
  assert.ok(Math.abs(usage.dailyFleetSpendUsd - 0.004) < 1e-9,
    `the settled cost must survive the failure untouched, saw ${usage.dailyFleetSpendUsd}`);
});

test('an abandoned reservation releases itself when its lease runs out - no sweep, no report', async () => {
  const store = new MemoryLiteGenerationStore();
  const now = Date.now();
  await reservePro(store, now);

  // Still counted while the lease is live (the mutation direction of the release predicate).
  const before = await store.usage('pro', USER, now + PROFILE.expiryMs - 1);
  assert.equal(before.dailyStarts, 1);
  assert.equal(before.dailyFleetSpendUsd, PROFILE.maxProviderCostUsd);

  // Released the moment the lease is over, with nothing having written to the row.
  const after = await store.usage('pro', USER, now + PROFILE.expiryMs + 1);
  assert.equal(after.dailyStarts, 0);
  assert.equal(after.dailyFleetSpendUsd, 0);
});

test('the release rule is pro-only: a failed pre-call Lite run keeps Lite semantics', async () => {
  const store = new MemoryLiteGenerationStore();
  const now = Date.now();
  const reservation = await store.reserve({
    userId: USER,
    ipHash: 'test-hash',
    idempotencyKey: `key-${keySeq += 1}-abcdefghijklmnop`,
    requestedCategory: null,
    now,
    profile: { ...PROFILE, id: 'lite', maxProviderCostUsd: 0.007 },
  });
  assert.equal(reservation.status, 'created');
  if (reservation.status !== 'created') return;
  await store.update(reservation.record.id, { status: 'failed' });

  const usage = await store.usage('lite', USER, now);
  assert.equal(usage.dailyStarts, 1, 'Lite quota semantics move on their own evidence, not here');
  assert.ok(usage.dailyFleetSpendUsd > 0);
});

// ---------------------------------------------------------------------------------------------
// Idempotency: what a RETRY can and cannot create. The client retry (modelGateway) retries at
// the CALL level inside one reservation; these pin why that is safe and why a generation-level
// re-POST is not the retry mechanism.

test('re-POSTing a reservation with the same idempotency key returns the same record - one start, one booking', async () => {
  const store = new MemoryLiteGenerationStore();
  const now = Date.now();
  const key = `key-repost-abcdefghijklmnop`;
  const input = {
    userId: USER, ipHash: 'test-hash', idempotencyKey: key,
    requestedCategory: null, now, profile: PROFILE,
  };
  const first = await store.reserve(input);
  const second = await store.reserve(input);
  assert.equal(first.status, 'created');
  assert.equal(second.status, 'duplicate');
  if (first.status !== 'created' || second.status !== 'duplicate') return;
  assert.equal(second.record.id, first.record.id);
  const usage = await store.usage('pro', USER, now);
  assert.equal(usage.dailyStarts, 1, 'a re-POST must never create a second start');
  assert.equal(usage.dailyFleetSpendUsd, PROFILE.maxProviderCostUsd, 'or a second booking');
});

test('a call that failed before settling leaves the reservation admissible - the retry pays from the SAME booking', async () => {
  const store = new MemoryLiteGenerationStore();
  const now = Date.now();
  const record = await reservePro(store, now);
  const admit = () => store.admitProCall({
    generationId: record.id, userId: USER, now,
    maxCalls: 4, generationCeilingUsd: PROFILE.maxProviderCostUsd,
  });

  // First call admitted, then it 503s: the proxy skips settlement on a null result
  // (managedCall.ts), so nothing was counted and nothing was charged.
  const first = await admit();
  assert.equal(first.status, 'admitted');

  // The in-session retry is admitted against the SAME reservation - no new start, no new
  // booking, and the settled-call ledger is still empty.
  const retry = await admit();
  assert.equal(retry.status, 'admitted');
  assert.equal(retry.calls, 0, 'an unsettled call must not consume the call budget');
  const usage = await store.usage('pro', USER, now);
  assert.equal(usage.dailyStarts, 1);
  assert.equal(usage.dailyFleetSpendUsd, PROFILE.maxProviderCostUsd, 'still the one booking, not two');

  // When the retry SUCCEEDS it settles once - one real cost replaces the booking.
  await store.recordProCall({ generationId: record.id, userId: USER, costUsd: 0.004, leaseMs: 240_000 });
  const settled = await store.usage('pro', USER, now);
  assert.ok(Math.abs(settled.dailyFleetSpendUsd - 0.004) < 1e-9);
});

test('the settled-call cap still ends a run - retries cannot loop past maxCalls once calls settle', async () => {
  const store = new MemoryLiteGenerationStore();
  const now = Date.now();
  const record = await reservePro(store, now);
  for (let i = 0; i < 4; i += 1) {
    await store.recordProCall({ generationId: record.id, userId: USER, costUsd: 0.004, leaseMs: 240_000 });
  }
  const admission = await store.admitProCall({
    generationId: record.id, userId: USER, now,
    maxCalls: 4, generationCeilingUsd: PROFILE.maxProviderCostUsd,
  });
  assert.equal(admission.status, 'call-limit');
});

test('a re-POST that lands on a FAILED record gets the dead record back - a new generation needs a new key', async () => {
  const store = new MemoryLiteGenerationStore();
  const now = Date.now();
  const key = `key-dead-abcdefghijklmnopq`;
  const input = {
    userId: USER, ipHash: 'test-hash', idempotencyKey: key,
    requestedCategory: null, now, profile: PROFILE,
  };
  const first = await store.reserve(input);
  assert.equal(first.status, 'created');
  if (first.status !== 'created') return;
  await store.update(first.record.id, proOutcomePatch(first.record, failedOutcome, now));

  const again = await store.reserve(input);
  assert.equal(again.status, 'duplicate', 'the key still pins the dead record');
  if (again.status !== 'duplicate') return;
  const admission = await store.admitProCall({
    generationId: again.record.id, userId: USER, now: now + 1,
    maxCalls: 4, generationCeilingUsd: PROFILE.maxProviderCostUsd,
  });
  assert.equal(admission.status, 'expired', 'the dead record pays for nothing - the client must mint a fresh key');
});

test('the in-session retry fires on a provider outage, once, and on nothing else', () => {
  const outage = new ModelGatewayError('unavailable', 'blip', true, 503);
  assert.equal(shouldRetryModelCall(outage, 0), true);
  assert.equal(shouldRetryModelCall(outage, 1), false, 'ONE retry - never a loop');
  // Durable answers are never retried, whatever the server marked them.
  assert.equal(shouldRetryModelCall(new ModelGatewayError('rate_limited', 'slow down', true, 429), 0), false);
  assert.equal(shouldRetryModelCall(new ModelGatewayError('unavailable', 'off', false, 503), 0), false);
  assert.equal(shouldRetryModelCall(new ModelGatewayError('authentication_required', 'no', false, 401), 0), false);
  assert.equal(shouldRetryModelCall(new Error('The AI provider is temporarily unavailable.'), 0), false,
    'prose never qualifies - only the typed refusal carries the decision');
});

test('a fresh reservation after an infra failure is admitted within the same day', async () => {
  // The user-facing consequence the whole rule exists for: three infra failures must not
  // exhaust a student's day.
  const store = new MemoryLiteGenerationStore();
  let now = Date.now();
  for (let i = 0; i < PROFILE.dailyStarts + 2; i += 1) {
    const record = await reservePro(store, now);
    await store.update(record.id, proOutcomePatch(record, failedOutcome, now));
    now += 1000;
  }
  // More reservations than dailyStarts succeeded - each failure released its start.
  const usage = await store.usage('pro', USER, now);
  assert.equal(usage.dailyStarts, 0);
});
