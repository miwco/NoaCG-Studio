import { useEffect, useState, type FormEvent } from 'react';
import { onPasswordRecovery, updatePassword } from '../../backend/auth';
import { isBackendConfigured } from '../../backend/config';
import BrandLogo from '../BrandLogo';
import { useModalGate } from '../spaceKey';

/**
 * The set-a-new-password dialog (docs/GOALS_ARCHIVE.md "Student release" step 9). A password-reset
 * email's link returns to the app, where Supabase establishes a RECOVERY session and fires
 * PASSWORD_RECOVERY — before this dialog, that event was ignored (backend/auth.ts), so the
 * link signed the user in and silently never offered the one thing it promised.
 *
 * Mounted ONCE in App.tsx: the link can land on any route, so the listener must not belong to
 * one surface. Renders nothing offline (no backend → no recovery events, and the offline app
 * grows zero auth UI). Closing without saving is fine — the recovery session is a real
 * session, and Settings → Account can change the password later.
 */
export default function PasswordRecoveryDialog() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  useModalGate(open);

  useEffect(() => {
    if (!isBackendConfigured()) return;
    return onPasswordRecovery(() => {
      setPassword('');
      setConfirm('');
      setError(null);
      setDone(false);
      setOpen(true);
    });
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
          <button className="gallery-close" onClick={() => setOpen(false)} title="Close">✕</button>
        </div>
        <div className="auth-logo"><BrandLogo size={44} stacked /></div>
        {done ? (
          <>
            <p className="auth-tag">✓ Password changed. You are signed in.</p>
            <button className="primary auth-submit" onClick={() => setOpen(false)} data-testid="recovery-done">
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
