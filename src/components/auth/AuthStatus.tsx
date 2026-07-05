import { useEffect, useState } from 'react';
import { isAuthRequired } from '../../backend/config';
import { signOut, subscribeAuth, type AuthState } from '../../backend/auth';

/**
 * Topbar "signed in as … · Sign out" indicator. Renders nothing in offline / self-host mode (no
 * backend, no login), so the offline UI is unchanged. In hosted mode AppShell only mounts once
 * signed in, so this shows the current user and a sign-out button.
 */
export default function AuthStatus() {
  const authRequired = isAuthRequired();
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  useEffect(() => {
    if (!authRequired) return;
    return subscribeAuth(setState);
  }, [authRequired]);

  if (!authRequired || state.status !== 'signed-in') return null;

  const label = state.user?.email ?? 'Signed in';
  return (
    <span className="auth-status">
      <span className="muted" title={label}>{label}</span>
      <button className="auth-signout" onClick={() => void signOut()}>Sign out</button>
    </span>
  );
}
