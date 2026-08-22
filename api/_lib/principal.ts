// WHO IS CALLING, and what may this credential do of what the account may do.
//
// `resolvePrincipal(req)` is the one door every permission-gated server path walks through
// (docs/AGENT_SAVE.md). It accepts two credentials today and is shaped so a third is one more
// branch:
//
//   Authorization: Bearer <Supabase JWT>     -> a SESSION: verifyUser() -> the account's full
//                                               entitlement, `granted: null` (everything the
//                                               account may do).
//   Authorization: Bearer noacg_ak_…          -> an AGENT KEY (migration 0050): hash lookup ->
//                                               the account's entitlement, `granted` = the
//                                               key's scopes, `keyId` for self-description.
//   anything else / nothing                   -> ANONYMOUS: the anonymous defaults, no grants.
//
// The decision itself lives in src/entitlements/permissions.ts `permits()` - pure, shared with
// the browser and the tests. This module only RESOLVES; it never decides. A future OAuth access
// token resolves here too, and reaches the same `permits` downstream.
//
// FAILURE POSTURE: every lookup failure degrades to ANONYMOUS (fail closed), exactly as
// verifyUser() does - a database hiccup must never widen access, and a refused save is
// retryable while a wrongly admitted one is not.

import { resolveUserEntitlement } from './entitlements.js';
import { bearerToken, sha256 } from './http.js';
import { verifyUser } from './auth.js';
import { agentAccessConfigured, supabaseAgentAccessStore, type AgentAccessStore } from './agentAccessStore.js';
import {
  anonymousPrincipal,
  isAgentKeyToken,
  isPermissionKey,
  type PermissionKey,
  type Principal,
} from '../../src/entitlements/permissions.js';

export interface PrincipalDeps {
  /** The key store; the Supabase one by default, an in-memory one under test. */
  store?: AgentAccessStore;
  /** Whether agent keys can be honoured on this deployment at all (service key configured). */
  configured?: () => boolean;
}

/** Resolve the caller of `req`. Never throws. */
export async function resolvePrincipal(req: Request, deps: PrincipalDeps = {}): Promise<Principal> {
  const token = bearerToken(req);

  if (isAgentKeyToken(token)) {
    const configured = deps.configured ?? agentAccessConfigured;
    if (!configured()) return anonymousPrincipal(await resolveUserEntitlement(null));
    try {
      const store = deps.store ?? supabaseAgentAccessStore();
      const key = await store.resolveKey(sha256(token));
      if (!key) return anonymousPrincipal(await resolveUserEntitlement(null));
      const granted: PermissionKey[] = key.scopes.filter(isPermissionKey);
      return {
        kind: 'agent-key',
        userId: key.userId,
        entitlement: await resolveUserEntitlement(key.userId),
        granted,
        keyId: key.id,
      };
    } catch {
      return anonymousPrincipal(await resolveUserEntitlement(null));
    }
  }

  const user = await verifyUser(token);
  if (user) {
    return { kind: 'session', userId: user.userId, entitlement: await resolveUserEntitlement(user.userId), granted: null };
  }
  return anonymousPrincipal(await resolveUserEntitlement(null));
}
