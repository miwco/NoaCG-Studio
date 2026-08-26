import { bearerToken, json, methodGuard, readJson } from '../http.js';
import { verifyUser } from '../auth.js';
import { liteError } from '../aiLiteHttp.js';
import { getLiteGenerationStore, liteLedgerConfigured } from '../aiLiteStore.js';
import { LITE_DISCARD_REASONS } from '../../../src/feedback/contract.js';
import type { LiteOutcomeRequest, LiteOutcomeResponse } from '../../../src/ai/lite/types.js';

const ID = /^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i;
const RULE = /^[a-z0-9][a-z0-9_.:-]{0,79}$/i;
// The SAME list the browser type and migration 0011's CHECK constraint express, imported
// rather than repeated. Three copies of one enumeration is how a value ends up accepted here
// and refused by the database.
const DISCARD_REASONS = new Set<string>(LITE_DISCARD_REASONS);

function validate(value: unknown): LiteOutcomeRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('object');
  const body = value as Record<string, unknown>;
  if (typeof body.generationId !== 'string' || !ID.test(body.generationId)) throw new Error('id');
  if (!['usable', 'validation-failed', 'accepted', 'discarded'].includes(String(body.action))) throw new Error('action');
  if (body.resolvedCategory !== undefined && (typeof body.resolvedCategory !== 'string' || body.resolvedCategory.length > 80)) {
    throw new Error('category');
  }
  if (body.validationRuleCodes !== undefined) {
    if (!Array.isArray(body.validationRuleCodes) || body.validationRuleCodes.length > 30 || !body.validationRuleCodes.every((code) =>
      typeof code === 'string' && RULE.test(code)
    )) throw new Error('rules');
  }
  if (body.runtimeMs !== undefined && (!Number.isInteger(body.runtimeMs) || Number(body.runtimeMs) < 0 || Number(body.runtimeMs) > 300_000)) {
    throw new Error('runtime');
  }
  if (
    body.discardReason !== undefined
    && (body.action !== 'discarded' || typeof body.discardReason !== 'string' || !DISCARD_REASONS.has(body.discardReason))
  ) throw new Error('discard reason');
  return body as unknown as LiteOutcomeRequest;
}

export default {
  async fetch(req: Request): Promise<Response> {
    const guard = methodGuard(req, 'POST');
    if (guard) return guard;
    if (!liteLedgerConfigured()) {
      return liteError('profile_not_configured', 'NoaCG Lite is not fully configured.', 503);
    }
    const user = await verifyUser(bearerToken(req));
    if (!user) return liteError('authentication_required', 'Sign in to record a Lite outcome.', 401);
    let body: LiteOutcomeRequest;
    try {
      body = validate(await readJson<unknown>(req, 8_000));
    } catch {
      return liteError('invalid_request', 'The Lite outcome is invalid.', 400);
    }
    const store = await getLiteGenerationStore();
    const record = await store.get(body.generationId);
    if (!record || record.userId !== user.userId) return liteError('not_found', 'Lite generation not found.', 404);
    if (record.expiresAt <= Date.now() && !['usable', 'accepted', 'failed', 'unsupported', 'expired'].includes(record.status)) {
      await store.update(record.id, { status: 'expired', rejectionReason: 'outcome_timeout' });
      return liteError('invalid_request', 'This Lite generation outcome has expired.', 409);
    }

    if (body.action === 'usable' && record.status !== 'spec_ready') {
      return liteError('invalid_request', 'This Lite generation is not waiting for validation.', 409);
    }
    if (body.action === 'accepted' && record.status !== 'usable' && record.status !== 'accepted') {
      return liteError('invalid_request', 'Only a usable Lite graphic can be accepted.', 409);
    }
    if ((body.action === 'validation-failed' || body.action === 'discarded') && !['spec_ready', 'usable'].includes(record.status)) {
      return liteError('invalid_request', 'This Lite generation can no longer be rejected.', 409);
    }
    const status = body.action === 'usable' || body.action === 'discarded'
      ? 'usable'
      : body.action === 'accepted'
        ? 'accepted'
        : 'failed';
    await store.update(record.id, {
      status,
      resolvedCategory: body.resolvedCategory ?? record.resolvedCategory,
      validationRuleCodes: body.validationRuleCodes?.slice(0, 30) ?? record.validationRuleCodes,
      runtimeMs: body.runtimeMs ?? record.runtimeMs,
      feedbackReason: body.action === 'discarded'
        ? body.discardReason ?? 'other'
        : record.feedbackReason,
      rejectionReason: body.action === 'validation-failed'
        ? 'platform_validation'
        : body.action === 'discarded'
          ? 'user_discarded'
          : body.action === 'accepted'
            ? null
            : record.rejectionReason,
    });
    return json({ recorded: true } satisfies LiteOutcomeResponse);
  },
};
