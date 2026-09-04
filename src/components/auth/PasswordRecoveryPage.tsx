import { useEffect, useState, type FormEvent } from 'react';
import { requestPasswordReset, updatePassword } from '../../backend/auth';
import { isBackendConfigured } from '../../backend/config';
import { arrivingRecoveryLink } from '../../backend/recoveryLink';
import BrandLogo from '../BrandLogo';
import { useAuthState } from './useAuthState';

/**
 * The route-owned password recovery surface. Keeping it outside the studio gives valid and failed
 * links one clear destination, including an honest way forward when the provider rejects a link.
 *
 * App.tsx renders it INSTEAD of the studio on two keys: `?recovery=1` (what RECOVERY_REDIRECT
 * asks for) and a `type=recovery` fragment (what Supabase itself puts on every reset link,
 * including every one already in somebody's inbox). See the branch there.
 */
export default function PasswordRecoveryPage() {
  // Offline builds have no account surface at all. Split the configured body into its own
  // component so no auth-state hook or element is created on this path.
  if (!isBackendConfigured()) return null;
  return <ConfiguredPasswordRecoveryPage />;
}

/** Back to the plain studio, dropping `?recovery=1` and whatever the provider left in the
 *  fragment. Every card carries it: this surface covers the whole window, and a reader who
 *  arrived by a stale link (or a bookmark of one) must never be stranded on it. */
function StudioLink() {
  return (
    <a
      className="auth-toggle"
      href={typeof window === 'undefined' ? '/app' : window.location.origin + window.location.pathname}
      data-testid="recovery-to-studio"
    >
      Back to the studio
    </a>
  );
}

function ConfiguredPasswordRecoveryPage() {
  const { status } = useAuthState();
  const link = arrivingRecoveryLink();

  // The tab says what this page is. A reset link opens a new tab in most mail clients, so
  // "NoaCG Studio - Editor" would be the only label the reader ever got for it.
  useEffect(() => {
    document.title = 'NoaCG - reset your password';
  }, []);

  if (status === 'loading') {
    return (
      <div className="auth-gate" data-testid="password-recovery-page">
        <div className="auth-card">
          <div className="auth-logo"><BrandLogo size={44} stacked /></div>
          <p className="auth-sub" data-testid="recovery-checking">Checking your reset link...</p>
        </div>
      </div>
    );
  }

  if (link.kind === 'error') return <ExpiredRecoveryCard message={link.message} />;
  if (status === 'signed-in') return <NewPasswordCard />;
  return <ExpiredRecoveryCard message={null} />;
}

function NewPasswordCard() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setBusy(true);
    setError(null);
    const result = await updatePassword(password);
    setBusy(false);
    if (result.error) setError(result.error);
    else setDone(true);
  };

  return (
    <div className="auth-gate" data-testid="password-recovery-page">
      <div className="auth-card">
        <div className="auth-logo"><BrandLogo size={44} stacked /></div>
        {done ? (
          <>
            <p className="auth-note">Password changed. You are signed in.</p>
            <button
              type="button"
              className="primary auth-submit"
              data-testid="recovery-continue"
              onClick={() => window.location.replace(window.location.origin + window.location.pathname)}
            >
              Continue to the studio
            </button>
          </>
        ) : (
          <>
            <p className="auth-tag">Set a new password for your account.</p>
            <form onSubmit={submit}>
              <label htmlFor="recovery-password">New password</label>
              <input
                id="recovery-password"
                data-testid="recovery-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                autoFocus
              />
              <label htmlFor="recovery-confirm" style={{ marginTop: 10 }}>Repeat it</label>
              <input
                id="recovery-confirm"
                data-testid="recovery-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
                minLength={6}
              />
              <button
                type="submit"
                className="primary auth-submit"
                disabled={busy}
                data-testid="recovery-submit"
              >
                Save new password
              </button>
            </form>
            {error && <p className="auth-error">{error}</p>}
            <StudioLink />
          </>
        )}
      </div>
    </div>
  );
}

function ExpiredRecoveryCard({ message }: { message: string | null }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const resend = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResent(false);
    const result = await requestPasswordReset(email.trim());
    setBusy(false);
    if (result.error) setError(result.error);
    else setResent(true);
  };

  return (
    <div className="auth-gate" data-testid="password-recovery-page">
      <div className="auth-card" data-testid="recovery-expired">
        <div className="auth-logo"><BrandLogo size={44} stacked /></div>
        <p className="auth-tag">This reset link cannot be used.</p>
        {message !== null && <p className="auth-sub">{message}</p>}
        <p className="auth-sub">
          It may have expired, been used already, or been opened after a newer reset link was
          requested. Nothing about your account has changed.
        </p>
        <form onSubmit={resend}>
          <label htmlFor="recovery-resend-email">Email</label>
          <input
            id="recovery-resend-email"
            data-testid="recovery-resend-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <button
            type="submit"
            className="primary auth-submit"
            disabled={busy}
            data-testid="recovery-resend"
          >
            Send a new reset link
          </button>
        </form>
        {error && <p className="auth-error">{error}</p>}
        {resent && (
          <p className="auth-note" data-testid="recovery-resent">
            If that address has an account, a new link is on its way.
          </p>
        )}
        <StudioLink />
      </div>
    </div>
  );
}
