import { json, methodGuard } from '../http.js';
import { getLiteGenerationStore } from '../aiLiteStore.js';
import { resolveProGate } from './gate.js';
import type { ProStatusResponse } from '../../../src/ai/pro/types.js';

/** GET /api/ai/pro-status - is hosted Pro available to this caller, and what is left of the
 *  allowance? The wizard branches on `available` alone; every other field is read-back. */
export default {
  async fetch(req: Request): Promise<Response> {
    const guard = methodGuard(req, 'GET');
    if (guard) return guard;

    const gate = await resolveProGate(req);
    const response: ProStatusResponse = {
      profile: 'pro',
      enabled: gate.profile.enabled,
      available: gate.available,
      requiresSignIn: gate.requiresSignIn,
      ...(gate.reason ? { reason: gate.reason } : {}),
      maxGenerationCostUsd: gate.profile.maxProviderCostUsd,
      // The custom lane is offered only where hosted Pro is AND its own flag is on - a lane
      // reported on a deployment that cannot serve it is a door the wizard would draw and the
      // server would refuse.
      ...(gate.available && gate.profile.customEnabled ? { customLane: true } : {}),
    };
    if (gate.available && gate.user) {
      // Measured against the SAME profile the reservation will use, which is why the gate
      // returns it rather than leaving each caller to re-derive it.
      const usage = await (await getLiteGenerationStore()).usage('pro', gate.user.userId, Date.now());
      const left = gate.effectiveProfile;
      response.allowance = {
        dailyStartsRemaining: Math.max(0, left.dailyStarts - usage.dailyStarts),
        monthlyStartsRemaining: Math.max(0, left.monthlyStarts - usage.monthlyStarts),
        dailySuccessesRemaining: Math.max(0, left.dailySuccesses - usage.dailySuccesses),
        monthlySuccessesRemaining: Math.max(0, left.monthlySuccesses - usage.monthlySuccesses),
      };
    }
    return json(response);
  },
};
