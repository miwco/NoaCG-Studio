import { useEffect, useRef, useState, type FormEvent } from 'react';
import { onPasswordRecovery, updatePassword } from '../../backend/auth';
import { isBackendConfigured } from '../../backend/config';
import { arrivingRecoveryLink } from '../../backend/recoveryLink';
import BrandLogo from '../BrandLogo';
import { useModalGate } from '../spaceKey';

/**
 * Password reset links now point at `?recovery=1`, which PasswordRecoveryPage owns. This dialog
 * remains the fallback for links sent before that route existed and self-hosted links that still
 * land on `/app` without the query.
 *
 * Mounted once in App.tsx so the fallback is available on every studio surface. It reads the
 * arriving URL as well as listening for a live PASSWORD_RECOVERY event because Supabase may emit
 * that event while constructing its client, before React effects subscribe. Renders nothing
 * offline. Closing without saving is fine because Settings can change the password later.
 */
export default function PasswordRecoveryDialog() {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  useModalGate(open);

  useEffect(() => {
    if (!isBackendConfigured()) return;

    const openRecovery = () => {
      // The URL read and the auth event can arrive together. Mark the dialog open before the
      // state updates so the second signal cannot erase a password the user has begun typing.
      if (openRef.current) return;
      openRef.current = true;
      setPassword('');
      setConfirm('');
      setError(null);
      setDone(false);
      setOpen(true);
    };

    if (arrivingRecoveryLink().kind === 'token') openRecovery();
    return onPasswordRecovery(openRecovery);
  }, []);

  if (!open) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) setError(error);
    else setDone(true);
  };

  return (
    <div className="auth-gate auth-overlay">
      <div className="auth-card" role="dialog" aria-modal="true" aria-label="Set a new password" data-testid="password-recovery">
        <div className="auth-head">
          <div className="spacer" />
          <button
            className="gallery-close"
            onClick={() => { openRef.current = false; setOpen(false); }}
            title="Close"
          >✕</button>
        </div>
        <div className="auth-logo"><BrandLogo size={44} stacked /></div>
        {done ? (
          <>
            <p className="auth-tag">✓ Password changed. You are signed in.</p>
            <button
              className="primary auth-submit"
              onClick={() => { openRef.current = false; setOpen(false); }}
              data-testid="recovery-done"
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <p className="auth-tag">Set a new password for your account.</p>
            <form onSubmit={submit}>
              <label htmlFor="recovery-pass">New password</label>
              <input
                id="recovery-pass"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoFocus
                data-testid="recovery-password"
              />
              <label htmlFor="recovery-confirm" style={{ marginTop: 10 }}>Repeat it</label>
              <input
                id="recovery-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                data-testid="recovery-confirm"
              />
              <button type="submit" className="primary auth-submit" disabled={busy} data-testid="recovery-submit">
                Save new password
              </button>
            </form>
            {error && <p className="auth-error">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
