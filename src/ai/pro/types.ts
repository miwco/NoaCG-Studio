// The wire vocabulary of HOSTED NoaCG Pro - what the browser and api/ both compile against.
//
// Dependency-light on purpose, exactly like lite/types.ts: both TypeScript trees import it, so
// nothing catalog-bearing or DOM-bearing may enter. It describes the ALLOWANCE and the
// RESERVATION, never the pipeline - docs/NOACG_PRO_PLAN.md §15 replaces the engine, and a wire
// contract that named its stages would have to be rewritten with it.

/** Why hosted Pro is not available to this caller right now. */
export type ProUnavailableReason = 'disabled' | 'not-configured' | 'sign-in';

export interface ProAllowance {
  dailyStartsRemaining: number;
  monthlyStartsRemaining: number;
  dailySuccessesRemaining: number;
  monthlySuccessesRemaining: number;
}

export interface ProStatusResponse {
  profile: 'pro';
  /** Is hosted Pro switched on for this deployment at all? */
  enabled: boolean;
  /** Can THIS caller start a hosted generation right now (enabled + configured + signed in +
   *  entitled)? The one flag the UI should branch on. */
  available: boolean;
  requiresSignIn: boolean;
  reason?: ProUnavailableReason;
  /** What one generation may cost NoaCG, both figures in USD. Reported so the wizard can be
   *  honest about the tier without the browser having to know a price table. */
  maxGenerationCostUsd: number;
  /**
   * Does this deployment offer the CUSTOM lane (the fail-closed iterate engine,
   * src/ai/pro/custom/loop.ts)? Additive optional so an older server reads as "no". The
   * server flag is `AI_PRO_CUSTOM_ENABLED`, default off - the lane is productized for
   * validation and its ship decision belongs to the P4 confirmation round's read.
   */
  customLane?: boolean;
  allowance?: ProAllowance;
}

/** The failure vocabulary. Deliberately the same shapes Lite uses, because the two surfaces
 *  fail for the same reasons and one set of strings is one set of UI branches. */
export type ProErrorCode =
  | 'authentication_required'
  | 'profile_disabled'
  | 'profile_not_configured'
  | 'invalid_request'
  | 'duplicate_request'
  | 'already_running'
  | 'allowance_exhausted'
  | 'shared_capacity'
  | 'fleet_spend_ceiling'
  | 'rate_limited'
  | 'cost_ceiling'
  | 'generation_failed';

export interface ProErrorBody {
  error: { code: ProErrorCode; message: string; retryable: boolean };
}

export interface ProReservationRequest {
  /** Client-minted, 16-128 url-safe characters. The same key returns `duplicate_request`
   *  rather than a second reservation, so a retried POST cannot spend twice. */
  idempotencyKey: string;
}

export interface ProReservationResponse {
  generationId: string;
  /** ISO. After this the reservation admits no further model call. */
  expiresAt: string;
  /** How many model calls this reservation will pay for, and the ceiling on their total. */
  maxCalls: number;
  maxGenerationCostUsd: number;
}

/** What happened to a reservation, reported once the browser pipeline finishes with it.
 *  Cost is NOT reported here - the server that spent the money records it (see
 *  api/ai/generate.ts), because a number the client supplies is not accounting. */
export type ProOutcomeStatus = 'accepted' | 'usable' | 'failed';

export interface ProOutcomeRequest {
  generationId: string;
  status: ProOutcomeStatus;
  /** An enumerated failure code, never a message, a prompt or any generated content. */
  reason?: string;
  /** Validation rule codes the platform's gate reported, for quality attribution. */
  ruleCodes?: string[];
  /** How long the whole generation took, end to end. Not accounting - it is what lets Pro's
   *  admission retry spacing stop being an unmeasured default (api/_lib/aiProProfile.ts). */
  runtimeMs?: number;
}
