import { useEffect, useState, type ReactNode } from 'react';
import { isAuthRequired } from '../../backend/config';
import { subscribeAuth, type AuthState } from '../../backend/auth';
import LoginScreen from './LoginScreen';

/**
 * Gates the app behind login — but ONLY when a backend is configured AND VITE_REQUIRE_AUTH is set
 * (a hosted closed beta). Self-hosted / offline builds return the app immediately with no login UI
 * and without loading the Supabase library, exactly like today.
 *
 * isAuthRequired() is env-derived and constant for the app's lifetime, so the hooks below always
 * run (rules-of-hooks safe) — the early returns only branch on already-computed state.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const authRequired = isAuthRequired();
  const [state, setState] = useState<AuthState>(
    authRequired ? { status: 'loading', user: null } : { status: 'signed-in', user: null },
  );

  useEffect(() => {
    if (!authRequired) return;
    return subscribeAuth(setState);
  }, [authRequired]);

  if (!authRequired) return <>{children}</>;
  if (state.status === 'loading') {
    return (
      <div className="auth-gate">
        <div className="auth-card">
          <p className="muted">Checking your session…</p>
        </div>
      </div>
    );
  }
  if (state.status === 'signed-out') return <LoginScreen />;
  return <>{children}</>;
}
