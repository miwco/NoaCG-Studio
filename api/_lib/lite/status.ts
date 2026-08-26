import { bearerToken, json, methodGuard } from '../http.js';
import { serverAuthConfigured, verifyUser } from '../auth.js';
import { managedAiKey } from '../aiCredentials.js';
import { getLiteGenerationStore, liteLedgerConfigured } from '../aiLiteStore.js';
import { liteJudgeConfigured, liteProfile, liteProfileForUser } from '../aiLiteProfile.js';
import { liteTaskProfile, taskConfigured } from '../aiTaskRegistry.js';
import { approvedModelRoute } from '../aiModelCatalog.js';
import { applyEntitlementToLiteProfile, resolveUserEntitlement } from '../entitlements.js';
import { allows } from '../../../src/entitlements/contract.js';
import type { LiteStatusResponse } from '../../../src/ai/lite/types.js';

export default {
  async fetch(req: Request): Promise<Response> {
    const guard = methodGuard(req, 'GET');
    if (guard) return guard;

    const profile = liteProfile();
    const requiresSignIn = serverAuthConfigured();
    const user = requiresSignIn ? await verifyUser(bearerToken(req)) : null;
    const routesConfigured = [profile.primary, profile.fallback].every((route) => Boolean(managedAiKey(route.provider)));
    const configured = requiresSignIn
      && taskConfigured(liteTaskProfile(profile))
      && liteLedgerConfigured()
      && routesConfigured;
    // The entitlement is resolved ONCE and used for both the availability answer and the
    // allowance below, so the panel can never say "available" while the reservation refuses.
    const entitlement = user ? await resolveUserEntitlement(user.userId) : null;
    const entitled = entitlement ? allows(entitlement, 'ai.lite') : false;
    const available = profile.enabled && configured && Boolean(user) && entitled;
    const response: LiteStatusResponse = {
      profile: 'lite',
      enabled: profile.enabled,
      available,
      requiresSignIn: requiresSignIn && !user,
      ...(!profile.enabled
        ? { reason: 'disabled' as const }
        : !configured
          ? { reason: 'not-configured' as const }
          : !user
            ? { reason: 'sign-in' as const }
            : !entitled
              // An account whose plan does not include Lite reads the same as the feature
              // being off. There is no upgrade prompt to show - there is nothing to buy.
              ? { reason: 'disabled' as const }
              : {}),
      supportedCategories: profile.supportedCategories,
      skinEnabled: profile.skinEnabled,
      // Only claim the judge when it would actually run: enabled, priced, allowlisted,
      // catalog-approved, keyed - the same gate the judge endpoint itself applies.
      skinJudgeEnabled: liteJudgeConfigured(profile)
        && approvedModelRoute(profile.judgeRoute)
        && Boolean(managedAiKey(profile.judgeRoute.provider)),
      limits: profile.limits,
    };
    if (available && user && entitlement) {
      // The SAME two steps the generation endpoint applies, in the same order. If this
      // drifts, the panel promises an allowance the reservation will not honour.
      const effectiveProfile = applyEntitlementToLiteProfile(
        liteProfileForUser(profile, user.userId),
        entitlement,
      );
      const usage = await (await getLiteGenerationStore()).usage('lite', user.userId, Date.now());
      response.allowance = {
        dailyStartsRemaining: Math.max(0, effectiveProfile.dailyStarts - usage.dailyStarts),
        monthlyStartsRemaining: Math.max(0, effectiveProfile.monthlyStarts - usage.monthlyStarts),
        dailySuccessesRemaining: Math.max(0, effectiveProfile.dailySuccesses - usage.dailySuccesses),
        monthlySuccessesRemaining: Math.max(0, effectiveProfile.monthlySuccesses - usage.monthlySuccesses),
      };
    }
    return json(response);
  },
};
