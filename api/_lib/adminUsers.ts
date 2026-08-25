// Reading the account directory for the admin surface.
//
// SCALE, stated honestly up front: GoTrue's admin API has no search and no server-side
// filter, so listing users means paging the directory and filtering in memory, and the AI
// aggregates are computed by reading the 30-day ledger slice and summing in JavaScript
// rather than by a GROUP BY the client library cannot express. That is the right trade at
// this instance's size (tens of accounts, tens of generations) and the wrong one at ten
// thousand. `truncated` in the response is the tripwire: when it starts coming back true,
// the fix is a database-side view, not a bigger page size.
//
// Everything here runs behind requireAdmin. Nothing in this module authorizes anything.

import { adminDb } from './adminAuth.js';
import { loadEntitlementRows } from './entitlements.js';
import { resolveEntitlement } from '../../src/entitlements/contract.js';
import type {
  AdminAccess,
  AdminActivityEntry,
  AdminGrant,
  AdminRole,
  AdminUsage,
  AdminUserDetail,
  AdminUserSummary,
} from '../../src/admin/types.js';
import type { LimitKey } from '../../src/entitlements/contract.js';

/** How much of the account directory one list call will walk. Above this the answer is
 *  marked truncated rather than silently short - a list that quietly stops is a list that
 *  hides the account you were looking for. */
const MAX_DIRECTORY = 2000;
const PAGE = 200;

/** Where a user's externalized fonts and images actually live: one flat folder per account, keyed
 *  `${uid}/${contentHash}` by src/backend/assets.ts. The `public.assets` table this figure used to
 *  read was a back-reference nothing ever wrote (0 rows against 294 documents), so "Cloud storage"
 *  was structurally 0 for every account; migration 0052 removed the table and this reads the
 *  bucket. The 50 MB ceiling has always been enforced elsewhere - `storage_within_quota` (0039)
 *  sums these same objects - so this is the operator's view, not a limit. */
const ASSET_BUCKET = 'user-assets';
/** A 50 MB account at a few hundred kB per font or image cannot approach this; the cap only exists
 *  so a corrupted folder cannot turn one admin page view into an unbounded listing. */
const MAX_ASSET_OBJECTS = 1000;

interface DirectoryUser {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  pendingInvite: boolean;
}

async function directory(): Promise<{ users: DirectoryUser[]; truncated: boolean }> {
  const db = await adminDb();
  const users: DirectoryUser[] = [];
  for (let page = 1; users.length < MAX_DIRECTORY; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: PAGE });
    if (error) throw new Error(error.message);
    for (const user of data.users) {
      users.push({
        id: user.id,
        email: user.email ?? '',
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        // An invited account exists but has never been used. Worth showing distinctly, so
        // "invited three days ago and never signed in" is visible without a second query.
        pendingInvite: Boolean(user.invited_at) && !user.last_sign_in_at,
      });
    }
    if (data.users.length < PAGE) return { users, truncated: false };
  }
  return { users, truncated: true };
}

interface LedgerRow {
  user_id: string;
  status: string;
  provider_cost_usd: number | string;
  created_at: string;
  rejection_reason: string | null;
}

const SUCCESS_STATES = new Set(['usable', 'accepted']);
const FAILURE_STATES = new Set(['failed', 'unsupported', 'expired']);

async function ledgerSince(sinceIso: string): Promise<LedgerRow[]> {
  const db = await adminDb();
  const { data, error } = await db
    .from('ai_generations')
    .select('user_id, status, provider_cost_usd, created_at, rejection_reason')
    .gte('created_at', sinceIso);
  if (error) throw new Error(error.message);
  return (data ?? []) as LedgerRow[];
}

function costOf(row: LedgerRow): number {
  // numeric() arrives as a string through PostgREST; adding it as one would concatenate.
  const value = typeof row.provider_cost_usd === 'string' ? Number(row.provider_cost_usd) : row.provider_cost_usd;
  return Number.isFinite(value) ? value : 0;
}

/** The user list, newest account first, optionally filtered by an email substring. */
export async function listUsers(query: string): Promise<{ users: AdminUserSummary[]; truncated: boolean; total: number }> {
  const db = await adminDb();
  const [dir, states, assignments, admins] = await Promise.all([
    directory(),
    db.from('user_accounts').select('user_id, state, internal'),
    db.from('user_plans').select('user_id, expires_at, plans!inner(name)'),
    db.from('admin_users').select('user_id, role'),
  ]);

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const ledger = await ledgerSince(since);

  const stateOf = new Map((states.data ?? []).map((row) => [row.user_id as string, row.state as string]));
  // The internal mark rides the same read as the account state - it lives on the same row, and
  // a second query for one boolean would be a second thing to keep in step.
  const internalOf = new Set((states.data ?? []).filter((row) => row.internal).map((row) => row.user_id as string));
  const planOf = new Map<string, string>();
  for (const row of (assignments.data ?? []) as { user_id: string; expires_at: string | null; plans: { name: string } | { name: string }[] }[]) {
    if (row.expires_at && Date.parse(row.expires_at) <= Date.now()) continue; // an expired assignment is none
    const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
    if (plan) planOf.set(row.user_id, plan.name);
  }
  const roleOf = new Map((admins.data ?? []).map((row) => [row.user_id as string, row.role as AdminRole]));

  const counts = new Map<string, { n: number; cost: number }>();
  for (const row of ledger) {
    const entry = counts.get(row.user_id) ?? { n: 0, cost: 0 };
    entry.n += 1;
    entry.cost += costOf(row);
    counts.set(row.user_id, entry);
  }

  const needle = query.trim().toLowerCase();
  const users = dir.users
    .filter((user) => !needle || user.email.toLowerCase().includes(needle) || user.id === needle)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map<AdminUserSummary>((user) => ({
      ...user,
      state: stateOf.get(user.id) === 'suspended' ? 'suspended' : 'active',
      internal: internalOf.has(user.id),
      planName: planOf.get(user.id) ?? 'Default',
      isAdmin: roleOf.get(user.id) ?? null,
      aiGenerations30d: counts.get(user.id)?.n ?? 0,
      aiCostUsd30d: Number((counts.get(user.id)?.cost ?? 0).toFixed(6)),
    }));

  return { users, truncated: dir.truncated, total: dir.users.length };
}

function toGrant(row: Record<string, unknown>): AdminGrant {
  const wrapped = (row.value && typeof row.value === 'object' ? row.value : {}) as { value?: unknown };
  const raw = wrapped.value;
  return {
    id: String(row.id),
    kind: row.kind === 'quota' ? 'quota' : 'feature',
    key: String(row.key),
    value: typeof raw === 'boolean' || typeof raw === 'number' ? raw : null,
    reason: String(row.reason ?? ''),
    startsAt: (row.starts_at as string | null) ?? null,
    expiresAt: (row.expires_at as string | null) ?? null,
    createdAt: String(row.created_at),
    revokedAt: (row.revoked_at as string | null) ?? null,
  };
}

/** Which allowances this user is currently at or over. Only enforceable numbers appear:
 *  reporting the observe-only ones as "at limit" would imply something is being blocked. */
function atLimit(access: AdminAccess, usage: Omit<AdminUsage, 'atLimit'>): LimitKey[] {
  const hit: LimitKey[] = [];
  const daily = access.limits.aiDailyStarts.value;
  if (daily !== null && usage.aiGenerationsToday >= daily) hit.push('aiDailyStarts');
  const monthly = access.limits.aiMonthlyStarts.value;
  if (monthly !== null && usage.aiGenerations30d >= monthly) hit.push('aiMonthlyStarts');
  const monthlyWins = access.limits.aiMonthlySuccesses.value;
  if (monthlyWins !== null && usage.aiSuccesses30d >= monthlyWins) hit.push('aiMonthlySuccesses');
  return hit;
}

/** Everything the detail view shows for one account. */
export async function getUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const db = await adminDb();
  const { data: found } = await db.auth.admin.getUserById(userId);
  if (!found?.user) return null;

  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const since1 = new Date(Date.now() - 86_400_000).toISOString();

  const [rows, generations, renders, documents, assets, role, audit] = await Promise.all([
    loadEntitlementRows(userId),
    db
      .from('ai_generations')
      .select('user_id, status, provider_cost_usd, created_at, rejection_reason')
      .eq('user_id', userId)
      .gte('created_at', since30)
      .order('created_at', { ascending: false }),
    db
      .from('render_jobs')
      .select('format, status, created_at')
      .eq('user_id', userId)
      .gte('created_at', since30)
      .order('created_at', { ascending: false }),
    db.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    db.storage.from(ASSET_BUCKET).list(userId, { limit: MAX_ASSET_OBJECTS }),
    db.from('admin_users').select('role').eq('user_id', userId).maybeSingle(),
    db
      .from('admin_audit_log')
      .select('created_at, action, summary')
      .eq('target_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const entitlement = resolveEntitlement({ userId, ...rows, now: new Date().toISOString() });
  const access: AdminAccess = {
    planKey: entitlement.planKey,
    planName: entitlement.planName,
    planExpiresAt: null,
    features: entitlement.features,
    limits: entitlement.limits,
    renderTier: entitlement.renderTier,
  };

  const ledger = (generations.data ?? []) as LedgerRow[];
  const usageBase = {
    aiGenerations30d: ledger.length,
    aiSuccesses30d: ledger.filter((row) => SUCCESS_STATES.has(row.status)).length,
    aiFailures30d: ledger.filter((row) => FAILURE_STATES.has(row.status)).length,
    aiCostUsd30d: Number(ledger.reduce((sum, row) => sum + costOf(row), 0).toFixed(6)),
    aiGenerationsToday: ledger.filter((row) => row.created_at >= since1).length,
    renderJobs30d: renders.data?.length ?? 0,
    documents: documents.count ?? 0,
    // `list()` returns a `.emptyFolderPlaceholder` entry with no metadata for a folder that has
    // been emptied, so sum only the entries that describe a real object.
    storageBytes: (assets.data ?? []).reduce(
      (sum, row) => sum + Number((row as { metadata?: { size?: number } }).metadata?.size ?? 0),
      0,
    ),
  };
  const usage: AdminUsage = { ...usageBase, atLimit: atLimit(access, usageBase) };

  // The three activity sources interleaved by time, so "what happened to this account" is
  // one list rather than three the operator has to merge by eye.
  const activity: AdminActivityEntry[] = [
    ...ledger.slice(0, 10).map((row) => ({
      at: row.created_at,
      kind: 'ai' as const,
      summary: `AI generation ${row.status}${row.rejection_reason ? ` (${row.rejection_reason})` : ''}`,
    })),
    ...((renders.data ?? []) as { format: string; status: string; created_at: string }[])
      .slice(0, 10)
      .map((row) => ({ at: row.created_at, kind: 'render' as const, summary: `Render ${row.format} ${row.status}` })),
    ...((audit.data ?? []) as { created_at: string; action: string; summary: string }[]).map((row) => ({
      at: row.created_at,
      kind: 'admin' as const,
      summary: row.summary || row.action,
    })),
  ]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 15);

  const { data: grantRows } = await db
    .from('user_grants')
    .select('id, kind, key, value, reason, starts_at, expires_at, revoked_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const stateRow = await db.from('user_accounts').select('state, internal').eq('user_id', userId).maybeSingle();
  const assignment = await db.from('user_plans').select('expires_at').eq('user_id', userId).maybeSingle();
  access.planExpiresAt = assignment.data?.expires_at ?? null;

  return {
    user: {
      id: userId,
      email: found.user.email ?? '',
      createdAt: found.user.created_at,
      lastSignInAt: found.user.last_sign_in_at ?? null,
      pendingInvite: Boolean(found.user.invited_at) && !found.user.last_sign_in_at,
      state: stateRow.data?.state === 'suspended' ? 'suspended' : 'active',
      internal: Boolean(stateRow.data?.internal),
      planName: entitlement.planName,
      isAdmin: (role.data?.role as AdminRole | undefined) ?? null,
      aiGenerations30d: usage.aiGenerations30d,
      aiCostUsd30d: usage.aiCostUsd30d,
    },
    access,
    usage,
    grants: ((grantRows ?? []) as Record<string, unknown>[]).map(toGrant),
    recentActivity: activity,
  };
}
