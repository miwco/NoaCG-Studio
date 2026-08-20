// Auth (Era 5.1) — a thin, framework-agnostic wrapper over Supabase Auth: Google OAuth +
// email/password. Everything no-ops when no backend is configured, so the offline app never calls
// it. The invite-only gate is enforced SERVER-side (the enforce_allowlist hook, see
// supabase/migrations/0002_auth_allowlist.sql); this module just surfaces the resulting 403 to the
// user. The UI gate is UX only — RLS + the hook are the real security boundary.

import type { Session, User } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { resetSyncBookmark } from './sync';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

export interface AuthState {
  status: AuthStatus;
  user: User | null;
}

/**
 * `getSession()` is not the local read it looks like: for a returning user whose access token
 * has expired, supabase-js refreshes it OVER THE NETWORK inside the call, with no timeout of
 * its own. On a network that silently black-holes `*.supabase.co` (corporate filtering - the
 * Yle-demo failure class) that promise hangs for the browser's own connect timeout, and
 * everything chained on it (sync status, entitlement, AI status) sits in 'loading' meanwhile.
 * So every boot-path read goes through this bounded wrapper: on timeout the caller proceeds
 * signed-out, and if the refresh does land later, onAuthStateChange corrects the state - the
 * subscription is already how every later change arrives.
 */
const SESSION_READ_TIMEOUT_MS = 6000;
async function readSessionBounded(
  sb: NonNullable<Awaited<ReturnType<typeof getSupabase>>>,
): Promise<Session | null> {
  try {
    const result = await Promise.race([
      sb.auth.getSession(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), SESSION_READ_TIMEOUT_MS)),
    ]);
    return result ? result.data.session : null;
  } catch {
    return null;
  }
}

// Return to wherever the app itself is served from (/app hosted, /app.html raw self-host) —
// NOT the bare origin: that is the public landing page, which runs no Supabase client.
const OAUTH_REDIRECT =
  typeof window !== 'undefined' ? window.location.origin + window.location.pathname : undefined;

/** Start Google OAuth. On success the page redirects, so a resolved value with no error means
 * "redirecting"; an error means it never left. */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  const sb = await getSupabase();
  if (!sb) return { error: 'No backend configured.' };
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: OAUTH_REDIRECT },
  });
  return { error: error?.message ?? null };
}

/** Sign in with email + password (existing account). */
export async function signInWithEmail(email: string, password: string): Promise<{ error: string | null }> {
  const sb = await getSupabase();
  if (!sb) return { error: 'No backend configured.' };
  const { error } = await sb.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

/**
 * Create an account with email + password. Signup is open (migration 0006); the server-side
 * Before-User-Created hook is the switch if it ever needs to re-close to the allowlist — any
 * rejection message it returns surfaces here.
 */
export async function signUpWithEmail(email: string, password: string): Promise<{ error: string | null }> {
  const sb = await getSupabase();
  if (!sb) return { error: 'No backend configured.' };
  const { error } = await sb.auth.signUp({ email, password });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  // Mark this as the USER's choice before the SIGNED_OUT event can land, so the session-expiry
  // prompt (syncController) never mistakes a deliberate sign-out for a dead session.
  deliberateSignOut = true;
  const sb = await getSupabase();
  await sb?.auth.signOut();
  // The next sign-in may be a DIFFERENT account: its first pass must re-reconcile from scratch,
  // not inherit this account's bookmark or per-record pending debts.
  resetSyncBookmark();
}

/** Whether the most recent transition to signed-out was the user's own Sign out. Reading it
 *  CONSUMES it — the flag describes one transition, never a standing state. */
let deliberateSignOut = false;
export function consumeDeliberateSignOut(): boolean {
  const was = deliberateSignOut;
  deliberateSignOut = false;
  return was;
}

/**
 * Ask for a password-reset email. The link returns to the app (OAUTH_REDIRECT), where Supabase
 * establishes a RECOVERY session and fires PASSWORD_RECOVERY — see onPasswordRecovery.
 */
export async function requestPasswordReset(email: string): Promise<{ error: string | null }> {
  const sb = await getSupabase();
  if (!sb) return { error: 'No backend configured.' };
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: OAUTH_REDIRECT });
  return { error: error?.message ?? null };
}

/** Set a new password for the signed-in user (a normal session, or the recovery session the
 *  reset link establishes). */
export async function updatePassword(password: string): Promise<{ error: string | null }> {
  const sb = await getSupabase();
  if (!sb) return { error: 'No backend configured.' };
  const { error } = await sb.auth.updateUser({ password });
  return { error: error?.message ?? null };
}

/**
 * Fire when the user arrives on a password-reset link: Supabase reads the token from the URL,
 * establishes the recovery session, and emits PASSWORD_RECOVERY. The subscriber opens the
 * set-a-new-password dialog (components/auth/PasswordRecoveryDialog). Returns an unsubscribe fn;
 * no-op with no backend.
 */
export function onPasswordRecovery(cb: () => void): () => void {
  let unsub = () => {};
  let cancelled = false;
  void (async () => {
    const sb = await getSupabase();
    if (cancelled || !sb) return;
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') cb();
    });
    unsub = () => sub.subscription.unsubscribe();
  })();
  return () => {
    cancelled = true;
    unsub();
  };
}

/**
 * The current user's access token (JWT), or null. Used to authorize the metered AI gateway —
 * The AI gateway client attaches it as a Bearer header for managed server-key mode. Reads the live session so the client
 * refreshes an expired token first. Returns null offline / logged out, so self-hosters with their
 * own proxy (and no login) are unaffected.
 */
export async function getAccessToken(): Promise<string | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const session = await readSessionBounded(sb);
  return session?.access_token ?? null;
}

/**
 * Subscribe to auth state. Calls back once with the initial state (after reading the stored
 * session / completing an OAuth redirect), then on every change. Returns an unsubscribe fn. With
 * no backend it reports 'signed-in' so a misconfigured gate can never trap the user.
 */
export function subscribeAuth(cb: (state: AuthState) => void): () => void {
  let unsub = () => {};
  let cancelled = false;
  void (async () => {
    const sb = await getSupabase();
    if (cancelled) return;
    if (!sb) {
      cb({ status: 'signed-in', user: null });
      return;
    }
    const session = await readSessionBounded(sb);
    if (cancelled) return;
    cb(session ? { status: 'signed-in', user: session.user } : { status: 'signed-out', user: null });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      cb(session ? { status: 'signed-in', user: session.user } : { status: 'signed-out', user: null });
    });
    unsub = () => sub.subscription.unsubscribe();
  })();
  return () => {
    cancelled = true;
    unsub();
  };
}
