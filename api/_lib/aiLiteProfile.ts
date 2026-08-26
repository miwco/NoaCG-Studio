import type { GatewayRoutingPolicy, ModelPrice } from './aiGateway.js';
import { approvedModelPrices } from './aiModelCatalog.js';
import type { AiProviderId, ModelRoute } from '../../src/ai/modelTypes.js';
import { LITE_AI_CATEGORIES } from '../../src/ai/lite/contract.js';
import type { LitePublicLimits } from '../../src/ai/lite/types.js';

// Shared AI-profile env readers: exported because every managed task profile
// (aiImportAnalysisProfile.ts is the second) parses its knobs the same clamped,
// typo-tolerant way - a malformed value falls back rather than removing a guard.
export const intEnv = (name: string, fallback: number, min: number, max: number): number => {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
};

export const numberEnv = (name: string, fallback: number, min: number, max: number): number => {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

export const boolEnv = (name: string, fallback = false): boolean => {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
};

export function envRoute(providerName: string | undefined, modelName: string | undefined, fallback: ModelRoute): ModelRoute {
  const provider = providerName?.trim() as AiProviderId | undefined;
  const model = modelName?.trim();
  return provider && ['anthropic', 'openai', 'vercel'].includes(provider) && model
    ? { provider, model }
    : fallback;
}

/** The audited PROVIDER SLUGS a managed call may be served by (`google`, `vertex`, `bedrock`,
 *  …). Vercel AI Gateway's `only` filter takes provider slugs where OpenRouter's took endpoint
 *  names, so the list is shorter and coarser - but it still answers the question the audit is
 *  about, which is who runs the weights and at what precision. Retention is no longer part of
 *  this list's job: `zeroDataRetention` covers it, gateway-side. */
function providerSlugs(): string[] {
  return (process.env.AI_LITE_GATEWAY_PROVIDERS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function priceOverrides(): Record<string, ModelPrice> {
  try {
    const parsed = JSON.parse(process.env.AI_LITE_PRICING_JSON ?? '{}') as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const prices: Record<string, ModelPrice> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      const entry = value as Record<string, unknown>;
      const input = Number(entry.inputPerMillion);
      const output = Number(entry.outputPerMillion);
      if (
        key.length <= 240
        && Number.isFinite(input) && input >= 0 && input <= 100
        && Number.isFinite(output) && output >= 0 && output <= 100
      ) prices[key] = { inputPerMillion: input, outputPerMillion: output };
    }
    return prices;
  } catch {
    return {};
  }
}

export interface LiteProfile {
  id: 'lite';
  enabled: boolean;
  promptVersion: string;
  primary: ModelRoute;
  fallback: ModelRoute;
  prices: Record<string, ModelPrice>;
  gatewayProviders: string[];
  requireZdr: boolean;
  structuredMode: 'json-schema' | 'tool';
  /** `off` switches a hybrid-inference route (Ling/Qwen family) to its non-thinking mode.
   *  Unset sends nothing, so the incumbent's request body stays byte-identical. */
  thinkingMode: 'default' | 'off';
  maxProviderCostUsd: number;
  dailySuccesses: number;
  monthlySuccesses: number;
  dailyStarts: number;
  monthlyStarts: number;
  maxConcurrentPerUser: number;
  maxConcurrentFleet: number;
  dailyFleetSpendUsd: number;
  maxAttempts: 2;
  outputTokens: number;
  repairOutputTokens: number;
  estimatedInputTokens: number;
  timeoutMs: number;
  expiryMs: number;
  qualityPriorMinSamples: number;
  qualityPriorWindowDays: number;
  limits: LitePublicLimits;
  supportedCategories: string[];
  overrideUserIds: string[];
  /** The skin experiment: the model may restyle the neutral canvas chassis with bounded
   *  CSS. Off by default — turning it on widens the schema, teaches it in the prompt, and
   *  needs the larger output budget below. The browser reverts a failing skin on its own. */
  skinEnabled: boolean;
  /** The skin VISION JUDGE: one server-owned vision call scoring the rendered hold frame.
   *  Off by default; independent of skinEnabled so the judge can be staged separately. */
  judgeEnabled: boolean;
  judgeRoute: ModelRoute;
  judgeMaxCostUsd: number;
  /** How many judgements ONE generation may book. The judge spends real money against a
   *  record the caller already owns, so without a cap a single old generation id is an
   *  unbounded spend handle - the per-IP burst limiter is not an entitlement. */
  judgeMaxPerGeneration: number;
  judgeOutputTokens: number;
  judgeEstimatedInputTokens: number;
  /** Minimum every judge axis must reach for a pass (1-5). Calibrate against blind review
   *  before trusting it in production - see docs/AI_LITE_BENCHMARK.md. */
  judgeThreshold: number;
}

export function liteProfile(): LiteProfile {
  const skinEnabled = boolEnv('AI_LITE_SKIN_ENABLED');
  const primary = envRoute(
    process.env.AI_LITE_PRIMARY_PROVIDER,
    process.env.AI_LITE_PRIMARY_MODEL,
    { provider: 'vercel', model: 'google/gemini-2.5-flash-lite' },
  );
  // THE SECOND ATTEMPT GOES TO THE SAME MODEL, and that is a measurement rather than an
  // oversight. Lite's session ceiling is a hard TWO attempts (src/ai/AGENTS.md), so the second
  // one is spent either re-rolling the primary or moving to another model - it cannot do both.
  //
  // Measured 2026-08-08 (benchmarks/lite/ROUND-2026-08-08-GATEWAY.md): pointed at the same
  // briefs as a primary, `openai/gpt-oss-20b` produced the Lite contract 2 times in 4, while
  // this primary produced it 27 times in 30 and 3 of 3 on the brief that actually failed. A
  // second attempt on the weaker model turns a recoverable stochastic miss into a user-visible
  // failure roughly half the time - which is exactly what happened to the `multilingual`
  // fixture in that round. Two rolls of a model that works beats one roll each of a good model
  // and a coin flip.
  //
  // Two things this deliberately trades away, so they can be traded back knowingly:
  //   - PROVIDER-OUTAGE resilience. If the primary is down, the retry is down too. That
  //     failure has not been observed here; the schema miss has, three times in thirty.
  //   - The open-weight preference (§15.1), which only applies at benchmark PARITY. There is
  //     no parity: 2/4 against 27/30.
  //
  // Repointing this at a different model is a route decision needing its own measurement -
  // and the candidate must be served by a provider in AI_LITE_GATEWAY_PROVIDERS, or the
  // gateway refuses it with `route_not_permitted` before any model is called.
  const fallback = envRoute(
    process.env.AI_LITE_FALLBACK_PROVIDER,
    process.env.AI_LITE_FALLBACK_MODEL,
    { provider: 'vercel', model: 'google/gemini-2.5-flash-lite' },
  );
  const judgeRoute = envRoute(
    process.env.AI_LITE_JUDGE_PROVIDER,
    process.env.AI_LITE_JUDGE_MODEL,
    { provider: 'vercel', model: 'google/gemini-2.5-flash' },
  );
  // The base table IS the approved-route catalog's audited price snapshot. Env
  // overrides may adjust a price, but they cannot approve a route - approval is the
  // task registry's catalog gate (aiTaskRegistry.taskConfigured).
  const prices: Record<string, ModelPrice> = {
    ...approvedModelPrices(),
    ...priceOverrides(),
  };
  return {
    id: 'lite',
    enabled: boolEnv('AI_LITE_ENABLED'),
    // v3: the strap contract restated as shape rather than prohibition (see skinPromptLines).
    // v4: the catalog digest states the supporting line's MEASURED character capacity instead
    //     of an adjective that ranked the designs backwards, and the capacity clause names it.
    // v5: typography.scaleRatio carries the bounds its compile clamps to, and the supporting
    //     line can no longer be enlarged past the size its design authored - measured as the
    //     cause of eleven wrapped identity lines in eighteen (docs/AI_LITE_PLAN.md §1a).
    // v6: scaleRatio goes back to UNBOUNDED on the wire - the gateway rejects an out-of-range
    //     number, and on a clamped field that spends an attempt to do what the clamp does free.
    // v7: animation.speed stops being a NUMERIC ENUM. Google's structured-output schema allows
    //     `enum` only on a string, so Gemini refused the entire request - a 400 before any
    //     generation, which took every Lite call down the moment the managed transport routed
    //     this model to Google. Bounds replace it and the three legal values moved into the
    //     property description; designSpec.ts already dropped anything outside them.
    // v8: animation.presetId carries "omit this field" as its DESCRIPTION. The quality round
    //     of 2026-08-08 measured it invalid on 9 of 29 generations - each one the chosen
    //     chassis's own motion prose read back - all silently clamped away. The property stays
    //     in the schema on purpose: this object is additionalProperties:false, so deleting it
    //     would turn those nine emissions into rejections rather than into nothing.
    // v9: deleted BOTH dead axes, and one of the two deletions was wrong. `animation.presetId`
    //     was safe - v8 had already driven its emission rate to 0 of 29. `zone` was not: the
    //     model emitted it on 47 generations of 47, and this schema refuses unknown properties,
    //     so removing it turned an emission into a rejection. Measured: 29/30 -> 26/30, three
    //     `malformed_response` where v7 and v8 had none.
    // v10: `zone` back on the wire with "omit this field" in its DESCRIPTION - the treatment
    //     that worked for `presetId` - while the COMPILE stopped reading it (`keepChassisZone`).
    //     Recovered two of the three rejections; 27/30, with one `malformed_response` left.
    // v11: `presetId` back too, same treatment. The residual could not be attributed from one
    //     roll each, and "0 of 29 emissions" is not a measured rate of zero - so NEITHER dead
    //     axis is deleted. Both stay on the wire, instructed, and ignored by the compile: a few
    //     output tokens against a refused request and a user's whole generation.
    //     The rule, paid for twice: **a property under `additionalProperties: false` cannot be
    //     deleted while the model still emits it.** Teach it away, measure the rate reach zero
    //     across more than one round, then delete - or simply leave it instructed.
    // v12: the `promotion` and `team` intent kinds each had exactly ONE chassis able to serve
    //     them, and it was the loud sport slab both times. A `call-to-action` line forces
    //     `kind: 'promotion'`, so the `call-to-action` fixture could only be answered by the one
    //     design its own brief argued against - five rounds of five, `intent_variant_mismatch`
    //     on both attempts. Four more chassis now declare both kinds, and
    //     `api/_lib/aiLite.test.ts` refuses any intent kind with a single home.
    // v13: `intentMatchesRoles` judged the kind against whichever emitted role its fixed scan
    //     order reached first, so a SUPPORTING line decided what the graphic had to claim to
    //     be - a team strap with a competition kicker (roles team-name then event-name) was
    //     refused `intent_role_mismatch` unless it declared itself an `event` graphic. It now
    //     judges `emittedRoles[0]` alone, which the schema already pins to
    //     `intent.primaryRole`. The `intent_role_mismatch` repair message is model-facing text
    //     and changed with it, which is why this is a version and not a silent fix.
    //     Measured 2026-08-09: 30 of 30, no rejections of any kind, `bench-line-wrap` unchanged
    //     at 3, $0.0103 (benchmarks/lite/ROUND-2026-08-09-V13.md). First clean bank in the
    //     ledger's history.
    // The ledger records this per generation, so outcomes stay attributable to the prompt that
    // produced them - bump it whenever the teaching changes, and never silently.
    //
    // **Bump it HERE only.** The literal below IS the version; `.env.example` ships the variable
    // COMMENTED OUT and unset resolves to this string, so there is one source of truth and
    // nothing to keep in sync. It used to ship a concrete value, and the two-places rule that
    // required was the hazard rather than the guard: a partial bump once ran v5 text under a v4
    // label, and any deployment configured by copying the example was pinned to whatever version
    // was current the day it was copied - new prompt text ledgered under an old label, with
    // nobody having made a mistake.
    //
    // The env override survives for the one job that needs it: holding a benchmark to an older
    // prompt on purpose. Setting it in a real deployment is how the label starts lying.
    //
    // v14 (2026-08-09): the six audited chassis carry a BRAND SLOT, so the digest's `logo:` line
    // reads `yes` where all six read `no`. That is a real change to the text the model is given -
    // `useLogoSlot` was an automatic refusal on every chassis before it and is legal on every
    // chassis after it - so the label has to move with it, or v13's numbers get read as
    // describing a prompt that no longer exists (§4's rule: a pass COUNT is not a diagnosis, and
    // the ledger's grouping is by `prompt_version`).
    promptVersion: (process.env.AI_LITE_PROMPT_VERSION ?? 'lite-lower-third-v14').trim().slice(0, 64) || 'lite-lower-third-v14',
    primary,
    fallback,
    prices,
    gatewayProviders: providerSlugs(),
    // Still true by default, and now with teeth of a different kind: the gateway refuses a ZDR
    // request outright on a plan without the feature, so leaving this on makes Lite fail closed
    // rather than serve to a retaining provider. Turning it off stays what it always was - an
    // explicit, audited, per-deployment decision (docs/AI_PROVIDER_GATEWAY.md).
    requireZdr: boolEnv('AI_LITE_REQUIRE_ZDR', true),
    structuredMode: process.env.AI_LITE_GATEWAY_STRUCTURED_MODE?.trim() === 'tool'
      ? 'tool'
      : 'json-schema',
    thinkingMode: process.env.AI_LITE_GATEWAY_THINKING?.trim() === 'off' ? 'off' : 'default',
    maxProviderCostUsd: numberEnv('AI_LITE_MAX_COST_USD', 0.007, 0.0001, 0.1),
    dailySuccesses: intEnv('AI_LITE_DAILY_SUCCESSES', 3, 0, 1000),
    monthlySuccesses: intEnv('AI_LITE_MONTHLY_SUCCESSES', 20, 0, 10_000),
    dailyStarts: intEnv('AI_LITE_DAILY_STARTS', 6, 0, 2000),
    monthlyStarts: intEnv('AI_LITE_MONTHLY_STARTS', 30, 0, 20_000),
    maxConcurrentPerUser: intEnv('AI_LITE_USER_CONCURRENCY', 1, 1, 10),
    maxConcurrentFleet: intEnv('AI_LITE_FLEET_CONCURRENCY', 20, 1, 1000),
    dailyFleetSpendUsd: numberEnv('AI_LITE_FLEET_DAILY_SPEND_USD', 25, 0.01, 100_000),
    maxAttempts: 2,
    // A skin rides as CSS in the same structured call, so the output budget grows with it.
    outputTokens: intEnv('AI_LITE_OUTPUT_TOKENS', skinEnabled ? 3500 : 1500, 200, 8000),
    repairOutputTokens: intEnv('AI_LITE_REPAIR_OUTPUT_TOKENS', skinEnabled ? 2500 : 1000, 200, 4000),
    estimatedInputTokens: intEnv('AI_LITE_MAX_INPUT_TOKENS', 12_000, 1000, 50_000),
    timeoutMs: intEnv('AI_LITE_TIMEOUT_MS', 30_000, 5000, 120_000),
    expiryMs: intEnv('AI_LITE_EXPIRY_MINUTES', 15, 5, 120) * 60_000,
    qualityPriorMinSamples: intEnv('AI_LITE_PRIOR_MIN_SAMPLES', 8, 4, 1000),
    qualityPriorWindowDays: intEnv('AI_LITE_PRIOR_WINDOW_DAYS', 90, 7, 365),
    limits: {
      promptCharacters: intEnv('AI_LITE_PROMPT_CHARACTERS', 2000, 100, 10_000),
      conversationTurns: intEnv('AI_LITE_CONVERSATION_TURNS', 6, 0, 20),
      conversationCharacters: intEnv('AI_LITE_CONVERSATION_CHARACTERS', 6000, 0, 30_000),
      // CATEGORY_CONTRACTS owns the visible-field ceiling. Lower thirds now support four
      // named slots, so retaining the old two-field profile cap rejects valid semantic
      // requests before retrieval or the model can see them.
      fields: intEnv('AI_LITE_FIELDS', 4, 1, 4),
      // ONE mark, since 2026-08-09. It was a hard-coded 0, and that was correct for exactly as
      // long as it was true: every audited chassis declared `logo: 'none'`, so accepting a logo
      // would have promised a slot that did not exist anywhere. All six carry a measured brand
      // slot now (`LiteCatalogEntry.logoSlot`), so the 0 had become the one thing refusing the
      // feature the rest of the profile can serve - `validateRequest` rejects both `hasLogo` and
      // `mark` while it stands. Bounded 0..1 rather than left open: Lite is a one-mark profile by
      // construction (`lite/client.ts` sends `hasLogo` only for exactly one image), and 0 stays
      // reachable so the door can be shut without a deploy.
      logos: intEnv('AI_LITE_LOGOS', 1, 0, 1),
      logoBytes: intEnv('AI_LITE_LOGO_BYTES', 2_000_000, 100_000, 5_000_000),
    },
    supportedCategories: [...LITE_AI_CATEGORIES],
    skinEnabled,
    judgeEnabled: boolEnv('AI_LITE_JUDGE_ENABLED'),
    judgeRoute,
    judgeMaxCostUsd: numberEnv('AI_LITE_JUDGE_MAX_COST_USD', 0.004, 0.0001, 0.1),
    // Three: one judgement plus room for two transient provider retries. Attempts count,
    // not successes - a retry loop must not be able to spin the spend up.
    judgeMaxPerGeneration: intEnv('AI_LITE_JUDGE_MAX_PER_GENERATION', 3, 1, 20),
    judgeOutputTokens: intEnv('AI_LITE_JUDGE_OUTPUT_TOKENS', 400, 100, 2000),
    // One downscaled PNG plus the brief; vision tiles dominate, so keep the estimate fat.
    judgeEstimatedInputTokens: intEnv('AI_LITE_JUDGE_INPUT_TOKENS', 4000, 1000, 20_000),
    judgeThreshold: intEnv('AI_LITE_JUDGE_THRESHOLD', 3, 1, 5),
    overrideUserIds: (process.env.AI_LITE_OVERRIDE_USER_IDS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 100),
  };
}

/** Development/evaluation overrides require a server-validated user id from private config. */
export function liteProfileForUser(profile: LiteProfile, userId: string): LiteProfile {
  if (!profile.overrideUserIds.includes(userId)) return profile;
  return {
    ...profile,
    dailySuccesses: 10_000,
    monthlySuccesses: 10_000,
    dailyStarts: 10_000,
    monthlyStarts: 10_000,
    maxConcurrentPerUser: Math.max(profile.maxConcurrentPerUser, 2),
  };
}

export function routePrice(profile: LiteProfile, routeValue: ModelRoute): ModelPrice | null {
  return profile.prices[`${routeValue.provider}:${routeValue.model}`] ?? null;
}

/**
 * The gateway routing policy for a managed Lite call.
 *
 * The per-request PRICE CAP is gone, and that is the one real loss in the OpenRouter move:
 * `max_price` let the provider itself refuse a route that had become expensive, and Vercel AI
 * Gateway has no equivalent field. What replaces it is `sort: 'cost'` - cheapest eligible
 * provider first, a preference not a cap - plus the three server-side controls that were
 * always there and are now load-bearing on their own: the approved-catalog price snapshot this
 * profile is priced against, `fundedRoutePrice`'s ceiling, and `maxProviderCostUsd`, which is
 * BOOKED before the call and reconciled after it. A price that moves under us now shows up as
 * a ledger overrun rather than a refused request, so the catalog snapshot has to be refreshed
 * deliberately rather than trusted to expire.
 */
export function liteGatewayPolicy(profile: LiteProfile, routeValue: ModelRoute): GatewayRoutingPolicy | undefined {
  if (routeValue.provider !== 'vercel') return undefined;
  if (!routePrice(profile, routeValue) || profile.gatewayProviders.length === 0) return undefined;
  return {
    zeroDataRetention: profile.requireZdr,
    // Pinned on, never configurable - the direct successor to OpenRouter's
    // `data_collection: 'deny'`, which was pinned the same way. It costs nothing on any plan,
    // and it is what a Hobby deployment still gets when the ZDR flag above cannot be honoured:
    // no training on a student's brief, even where zero retention is out of reach.
    disallowPromptTraining: true,
    only: profile.gatewayProviders,
    sort: 'cost',
    tags: ['surface:lite'],
    structuredOutputMode: profile.structuredMode,
    ...(profile.thinkingMode === 'off' ? { thinking: 'off' as const } : {}),
  };
}

export function liteProfileConfigured(profile: LiteProfile): boolean {
  const routes = [profile.primary, profile.fallback];
  return routes.every((item) => {
    if (item.provider !== 'vercel') return true;
    return Boolean(routePrice(profile, item)) && profile.gatewayProviders.length > 0;
  });
}

/** The judge fails closed exactly like the generation routes: enabled + priced + (for the
 *  managed gateway) allowlisted, or it does not run at all. */
export function liteJudgeConfigured(profile: LiteProfile): boolean {
  if (!profile.judgeEnabled) return false;
  if (profile.judgeRoute.provider !== 'vercel') return true;
  return Boolean(routePrice(profile, profile.judgeRoute)) && profile.gatewayProviders.length > 0;
}

/** The judge route's gateway policy. It carries its own tag so vision-judge spend separates
 *  from generation spend in the AI Gateway report, which is what the per-route price caps used
 *  to distinguish before the gateway dropped them. */
export function liteJudgePolicy(profile: LiteProfile): GatewayRoutingPolicy | undefined {
  if (profile.judgeRoute.provider !== 'vercel') return undefined;
  if (!routePrice(profile, profile.judgeRoute) || profile.gatewayProviders.length === 0) return undefined;
  return {
    zeroDataRetention: profile.requireZdr,
    disallowPromptTraining: true,
    only: profile.gatewayProviders,
    sort: 'cost',
    tags: ['surface:lite-judge'],
    structuredOutputMode: profile.structuredMode,
  };
}
