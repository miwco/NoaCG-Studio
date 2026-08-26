// POST /api/ai/pro-outcome - what became of a hosted Pro reservation.
//
// It records the OUTCOME, and the client supplies nothing about money: the cost is written by
// the server that spent it (api/ai/generate.ts settles each call through record_ai_pro_call),
// because a figure the client supplies is not accounting. What the browser knows and the server
// cannot is whether the finished graphic was usable, so that is all it reports. The ONE money
// effect here is derived from server state alone: a failed run with zero settled calls releases
// its booked worst case (see the update below).
//
// Content-free, like every other ledger write: an enumerated status, an enumerated failure
// code, and validation rule codes. No prompt, no concept image, no generated code.

import { bearerToken, json, methodGuard, readJson } from '../http.js';
import { verifyUser } from '../auth.js';
import { proError } from './http.js';
import { liteLedgerConfigured, getLiteGenerationStore, type LiteGenerationRecord } from '../aiLiteStore.js';
import type { ProOutcomeRequest } from '../../../src/ai/pro/types.js';

const ID = /^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i;
const CODE = /^[a-z0-9][a-z0-9_.:-]{0,79}$/i;
const STATUSES = new Set(['accepted', 'usable', 'failed']);

function validate(value: unknown): ProOutcomeRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('object');
  const body = value as Record<string, unknown>;
  if (typeof body.generationId !== 'string' || !ID.test(body.generationId)) throw new Error('id');
  if (typeof body.status !== 'string' || !STATUSES.has(body.status)) throw new Error('status');
  if (body.reason !== undefined && (typeof body.reason !== 'string' || !CODE.test(body.reason))) {
    throw new Error('reason');
  }
  if (body.ruleCodes !== undefined) {
    if (!Array.isArray(body.ruleCodes) || body.ruleCodes.length > 30
      || !body.ruleCodes.every((code) => typeof code === 'string' && CODE.test(code))) {
      throw new Error('rules');
    }
  }
  if (body.runtimeMs !== undefined
    && (!Number.isInteger(body.runtimeMs) || Number(body.runtimeMs) < 0 || Number(body.runtimeMs) > 1_800_000)) {
    throw new Error('runtime');
  }
  return body as unknown as ProOutcomeRequest;
}

/**
 * The ledger patch one outcome report produces - exported so the accounting rule is testable
 * at the seam, with the HTTP shell (auth, ownership, validation) around it and not inside it.
 */
export function proOutcomePatch(
  record: Pick<LiteGenerationRecord, 'proCallCount' | 'validationRuleCodes' | 'runtimeMs'>,
  body: ProOutcomeRequest,
  now: number,
): Partial<LiteGenerationRecord> {
  const failed = body.status === 'failed';
  return {
    status: body.status,
    validationRuleCodes: body.ruleCodes?.slice(0, 30) ?? record.validationRuleCodes,
    // How long the whole generation took, end to end. The admission retry spacing
    // (aiProProfile.ts) was retuned off the first measured turnover; this column is what lets
    // it keep following the fleet's real behaviour instead of staying a chosen number.
    runtimeMs: body.runtimeMs ?? record.runtimeMs,
    rejectionReason: failed ? body.reason ?? 'generation_failed' : null,
    // A failed generation that never settled a call spent NOTHING - the row still carries the
    // reservation's booked worst case, and leaving it there let ~33 failed starts consume the
    // whole fleet's daily budget at $0 real spend. `proCallCount` is SERVER truth (the proxy
    // settles every billed call), so releasing on it never takes a client's word about money;
    // a run with any settled call keeps its settled figure untouched. migration 0049 applies
    // the same rule inside `ai_task_usage`, which also covers runs that never report at all.
    ...(failed && record.proCallCount === 0 ? { providerCostUsd: 0 } : {}),
    // 'failed' is TERMINAL: expire the reservation so it can pay for nothing further. Without
    // this, a caller could report failure (releasing the booking above) and keep drawing
    // admitted calls against a reservation the ledger now says spent nothing.
    ...(failed ? { expiresAt: now } : {}),
  };
}

export default {
  async fetch(req: Request): Promise<Response> {
    const guard = methodGuard(req, 'POST');
    if (guard) return guard;
    if (!liteLedgerConfigured()) {
      return proError('profile_not_configured', 'NoaCG Pro is not fully configured.', 503);
    }
    const user = await verifyUser(bearerToken(req));
    if (!user) return proError('authentication_required', 'Sign in to record a Pro outcome.', 401);

    let body: ProOutcomeRequest;
    try {
      body = validate(await readJson<unknown>(req, 8_000));
    } catch {
      return proError('invalid_request', 'The Pro outcome is invalid.', 400);
    }

    const store = await getLiteGenerationStore();
    const record = await store.get(body.generationId);
    // A missing record and one owned by somebody else answer identically, so this cannot
    // become a generation-id oracle.
    if (!record || record.userId !== user.userId || record.profile !== 'pro') {
      return proError('invalid_request', 'Pro generation not found.', 404);
    }

    await store.update(record.id, proOutcomePatch(record, body, Date.now()));
    return json({ recorded: true });
  },
};
