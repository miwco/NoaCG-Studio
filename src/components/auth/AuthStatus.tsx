import { useEffect, useRef, useState } from 'react';
import { signOut } from '../../backend/auth';
import { useAuthState } from './useAuthState';
import { useAuthUi } from './authUi';
import { useRouter } from '../../app/router';
import SettingsDialog from '../SettingsDialog';

/**
 * Topbar account control. Renders nothing in offline / self-host mode (no backend, no login
 * UI — the 🏠 Home button next to it is the always-available door to saved work). In hosted
 * mode: signed out → a "Sign in" button opening the SignInDialog; signed in → an avatar chip
 * (Google avatar, or an initials fallback) opening the account menu (Home · Settings · Sign
 * out). The app itself is never gated — this is the only always-visible entry point into an
 * account.
 */
export default function AuthStatus() {
  const { backendConfigured, status, user } = useAuthState();
  const openSignIn = useAuthUi((s) => s.openSignIn);
  const navigate = useRouter((s) => s.navigate);

  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  // The dropdown closes on an outside click or Escape (standard menu behavior).
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  if (!backendConfigured || status === 'loading') return null;

  if (status === 'signed-out') {
    return (
      <button className="auth-signin" onClick={() => openSignIn()} title="Sign in to save your work, share to the community, and use AI">
        Sign in
      </button>
    );
  }

  const email = user?.email ?? null;
  // Google accounts carry an avatar; email/password accounts get an initials chip.
  const meta = (user?.user_metadata ?? {}) as { avatar_url?: string; full_name?: string };
  const initials = (meta.full_name || email || '?')
    .trim()
    .split(/[\s.@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('') || '?';

  return (
    <span className="auth-status" ref={wrapRef}>
      <button
        className="avatar-btn"
        onClick={() => setMenuOpen((o) => !o)}
        title={email ? `${email} — Home, profile & settings` : 'Account'}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        data-testid="account-button"
      >
        {meta.avatar_url ? (
          <img className="avatar-img" src={meta.avatar_url} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="avatar-initial">{initials}</span>
        )}
      </button>

      {menuOpen && (
        <div className="account-menu" role="menu" data-testid="account-menu">
          <div className="account-menu-head" title={email ?? undefined}>{email ?? 'Signed in'}</div>
          <button
            role="menuitem"
            onClick={() => { setMenuOpen(false); navigate({ view: 'home', section: null }); }}
            data-testid="menu-home"
          >
            🏠 Home — your work
          </button>
          <button role="menuitem" onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}>
            ⚙ Settings
          </button>
          <div className="account-menu-sep" />
          <button role="menuitem" onClick={() => { setMenuOpen(false); void signOut(); }}>
            Sign out
          </button>
        </div>
      )}

      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </span>
  );
}
